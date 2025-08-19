// netlify/functions/merge-guest-progress.ts
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type GuestPayload = {
  points?: number;
  quiz?: {
    quiz_id?: string;
    for_date: string;          // YYYY-MM-DD
    correct_count: number;     // e.g. 2
    points_awarded?: number;   // optional if separate from `points`
    locale?: string;           // default 'en'
  };
};

function bearerFrom(event: any): string | null {
  const h = event.headers || {};
  const raw = (h.authorization || h.Authorization) as string | undefined;
  if (!raw) return null;
  const [, token] = raw.split(' ');
  return token || null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Server env missing' }) };
    }

    // 1) Auth: resolve user from Bearer
    const token = bearerFrom(event);
    if (!token) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const { data: userRes, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !userRes?.user) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid token' }) };
    }
    const user = userRes.user;

    // 2) Parse payload
    let payload: GuestPayload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Bad JSON' }) };
    }
    const points = Number(payload.points || payload.quiz?.points_awarded || 0) || 0;
    const quiz = payload.quiz;

    if (!points && !quiz) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No guest data provided' }) };
    }

    // 3) Ensure profile row, and start trial only if not already started
    //    a) ensure row exists
    const { error: upsertErr } = await admin
      .from('profiles')
      .upsert([{ user_id: user.id, locale: 'en' }], { onConflict: 'user_id' });
    if (upsertErr) throw upsertErr;

    //    b) set trial_started_at only if null
    const { error: trialErr } = await admin
      .from('profiles')
      .update({ trial_started_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('trial_started_at', null);
    if (trialErr) throw trialErr;

    // we’ll report whether the update above actually started the trial
    const { data: profileRow } = await admin
      .from('profiles')
      .select('trial_started_at')
      .eq('user_id', user.id)
      .maybeSingle();
    const trialStarted = !!profileRow?.trial_started_at;

    // 4) If quiz data exists, avoid duplicates: one attempt per user/day
    let quizInserted = false;
    if (quiz && quiz.for_date) {
      const locale = quiz.locale || 'en';
      // check existing attempt for this date
      const { data: existingAttempt } = await admin
        .from('trial_quiz_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('for_date', quiz.for_date)
        .maybeSingle();

      if (!existingAttempt) {
        const insertAttempt = await admin.from('trial_quiz_attempts').insert([
          {
            user_id: user.id,
            locale,
            for_date: quiz.for_date,
            correct_count: quiz.correct_count ?? 0,
            points_awarded: points > 0 ? points : (quiz.points_awarded ?? 0),
            source: 'guest_merge',
          },
        ]);
        if (insertAttempt.error) throw insertAttempt.error;
        quizInserted = true;
      }
    }

    // 5) Points ledger: only insert if >0 and not already logged for this quiz_id (if provided)
    if (points > 0) {
      let shouldInsert = true;

      if (quiz?.quiz_id) {
        const { data: existingPoints } = await admin
          .from('points_ledger')
          .select('id')
          .eq('user_id', user.id)
          .eq('reason', 'trial_quiz')
          .contains('meta', { quiz_id: quiz.quiz_id } as any)
          .maybeSingle();

        if (existingPoints) shouldInsert = false;
      }

      if (shouldInsert) {
        const ins = await admin.from('points_ledger').insert([
          {
            user_id: user.id,
            points,
            reason: quiz ? 'trial_quiz' : 'guest_data',
            meta: {
              source: 'guest_merge',
              merged_at: new Date().toISOString(),
              ...(quiz?.quiz_id ? { quiz_id: quiz.quiz_id } : {}),
              ...(quiz?.for_date ? { for_date: quiz.for_date } : {}),
            },
          },
        ]);
        if (ins.error) throw ins.error;
      }
    }

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        trial_started: trialStarted,
        quiz_inserted: quizInserted,
        points_merged: points || 0,
      }),
    };
  } catch (err: any) {
    console.error('merge-guest-progress error', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

export default handler;
