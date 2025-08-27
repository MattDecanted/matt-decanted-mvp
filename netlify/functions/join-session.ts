// netlify/functions/join-session.ts
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const supabase = createClient(
  required('VITE_SUPABASE_URL'),
  required('SUPABASE_SERVICE_ROLE'),
  { auth: { persistSession: false } }
);

export const handler: Handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const invite_code: string = (body.invite_code || '').toUpperCase();
    const user_id: string | null = body.user_id ?? null;        // allow anon
    const display_name: string = body.display_name || 'Guest';

    if (!invite_code) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'BAD_REQUEST', detail: 'Missing invite_code' }) };
    }

    // Find session by code
    const { data: session, error: sErr } = await supabase
      .from('game_sessions')
      .select('id, invite_code, status, host_user_id')   // ⬅️ only known columns
      .eq('invite_code', invite_code)
      .single();

    if (sErr || !session) {
      return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'NOT_FOUND', detail: 'Session not found' }) };
    }

    // Insert participant (default score 0). ⛔️ do NOT reference is_host.
    const { data: participant, error: pErr } = await supabase
      .from('session_participants')
      .insert([{
        session_id: session.id,
        user_id,                 // may be null for anon
        display_name,
        score: 0,
      }])
      .select('id, session_id, user_id, display_name, score, joined_at')  // ⬅️ no is_host
      .single();

    if (pErr) {
      throw new Error(`INSERT_PARTICIPANT: ${pErr.message}`);
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ session, participant }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'JOIN_SESSION_FAILED', detail: err?.message ?? String(err) }),
    };
  }
};
