// netlify/functions/create-session.ts
import type { Handler } from '@netlify/functions';
import { sbServer as supabase } from './_supabaseClient';

// CORS headers for Netlify Functions
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function randomCode(len = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid confusing chars
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

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
    const host_user_id: string | undefined = body.host_user_id;
    const display_name: string = String(body.display_name || 'Host').slice(0, 64) || 'Host';

    if (!host_user_id) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'BAD_REQUEST', detail: 'Missing host_user_id' }),
      };
    }

    // Try to create session with a unique invite code (retry a few times on collision)
    let session: { id: string; invite_code: string; status: 'open' | 'active' | 'finished' | 'cancelled'; host_user_id: string } | null = null;
    let lastErr: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const invite_code = randomCode(6);
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([{ host_user_id, invite_code, status: 'open' }]) // let DB default set is_open
        // Select only known columns (avoid schema-cache errors on is_open/updated_at)
        .select('id, invite_code, status, host_user_id')
        .single();

      if (!error && data) {
        session = data as typeof session;
        break;
      }

      // If unique constraint on invite_code fails, retry with a new code; otherwise stop
      if (error?.code === '23505' /* unique_violation */ || /duplicate key value/.test(error?.message || '')) {
        lastErr = error;
        continue;
      } else {
        lastErr = error;
        break;
      }
    }

    if (!session) {
      throw new Error(`INSERT_SESSION_FAILED: ${lastErr?.message || 'unknown error'}`);
    }

    // Insert host as a participant (no `is_host` column; hosted-ness is derived client-side)
    const { error: partErr } = await supabase.from('session_participants').insert([
      {
        session_id: session.id,
        user_id: host_user_id,
        display_name,
        score: 0,
      },
    ]);
    if (partErr) {
      throw new Error(`INSERT_HOST_PARTICIPANT_FAILED: ${partErr.message}`);
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ session }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        error: 'CREATE_SESSION_FAILED',
        detail: err?.message ?? String(err),
      }),
    };
  }
};
