// netlify/functions/create-session.ts
import type { Handler } from '@netlify/functions';
import { supabase } from './_supabaseClient';

// simple UUID v4-ish check (loose; good enough to avoid bad casts)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const handler: Handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: cors, body: '' };
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const rawHostId: string | null = body.host_user_id ?? null;
    const display_name: string = String(body.display_name || 'Host').trim() || 'Host';

    // If host_user_id is invalid or missing, use null (anonymous host)
    const host_user_id: string | null =
      rawHostId && UUID_RE.test(rawHostId) ? rawHostId : null;

    // Generate invite code
    const invite_code = Math.random().toString(36).slice(2, 8).toUpperCase();

    // Insert session (do NOT reference non-existent columns; let defaults apply)
    const { data: session, error: sErr } = await supabase
      .from('game_sessions')
      .insert([{ host_user_id, invite_code, status: 'open' }])
      .select('id, invite_code, status, host_user_id') // only known columns
      .single();

    if (sErr || !session) {
      throw new Error(`INSERT_SESSION_FAILED: ${sErr?.message || 'unknown error'}`);
    }

    // Insert a host participant row (no is_host column assumed; we infer host client-side)
    const { error: pErr } = await supabase
      .from('session_participants')
      .insert([
        {
          session_id: session.id,
          user_id: host_user_id, // may be null
          display_name,
          score: 0,
        },
      ]);

    if (pErr) {
      throw new Error(`INSERT_HOST_PARTICIPANT_FAILED: ${pErr.message}`);
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ session }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: 'CREATE_SESSION_FAILED',
        detail: err?.message ?? String(err),
      }),
    };
  }
};
