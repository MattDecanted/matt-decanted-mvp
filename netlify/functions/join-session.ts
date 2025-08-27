// netlify/functions/join-session.ts
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// --- env helpers ---
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Server-side Supabase (service role bypasses RLS; keep this on the server only)
const supabase = createClient(
  required('VITE_SUPABASE_URL'),
  required('SUPABASE_SERVICE_ROLE'),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Common CORS headers (relaxed for MVP)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const invite_code: string = String(body.invite_code || '').trim().toUpperCase();
    const user_id: string | null = body.user_id ?? null;           // allow anon
    const display_name: string = String(body.display_name || 'Guest').trim().slice(0, 64) || 'Guest';

    if (!invite_code) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'BAD_REQUEST', detail: 'Missing invite_code' }),
      };
    }

    // 1) Look up session by invite code
    const { data: session, error: sErr } = await supabase
      .from('game_sessions')
      .select('id, host_user_id, invite_code, status, is_open') // only real columns
      .eq('invite_code', invite_code)
      .single();

    if (sErr || !session) {
      return {
        statusCode: 404,
        headers: CORS,
        body: JSON.stringify({ error: 'NOT_FOUND', detail: 'Session not found' }),
      };
    }

    // 2) Only allow join if lobby is open
    if (session.status !== 'open' || session.is_open === false) {
      return {
        statusCode: 409,
        headers: CORS,
        body: JSON.stringify({ error: 'SESSION_CLOSED', detail: 'Session is not accepting players' }),
      };
    }

    // 3) Insert participant (score defaults to 0). Do NOT reference is_host (it’s derived on the client).
    const { data: participant, error: pErr } = await supabase
      .from('session_participants')
      .insert([
        {
          session_id: session.id,
          user_id,                 // may be null for anonymous
          display_name,
          score: 0,
        },
      ])
      .select('id, session_id, user_id, display_name, score, joined_at') // select only real columns
      .single();

    if (pErr || !participant) {
      throw new Error(`INSERT_PARTICIPANT: ${pErr?.message || 'Unknown error'}`);
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ session, participant }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        error: 'JOIN_SESSION_FAILED',
        detail: err?.message ?? String(err),
      }),
    };
  }
};
