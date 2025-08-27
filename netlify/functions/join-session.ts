// netlify/functions/join-session.ts
import type { Handler } from '@netlify/functions';
import { supabase } from './_supabaseClient';

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
    const invite_code: string = String(body.invite_code || '').trim().toUpperCase();
    const user_id: string | null = body.user_id ?? null; // allow anon
    const display_name: string = String(body.display_name || 'Guest').trim() || 'Guest';

    if (!invite_code) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'BAD_REQUEST', detail: 'Missing invite_code' }),
      };
    }

    // Look up the session by code (service role bypasses RLS)
    const { data: session, error: sErr } = await supabase
      .from('game_sessions')
      .select('id, invite_code, status, host_user_id')
      .eq('invite_code', invite_code)
      .single();

    if (sErr || !session) {
      return {
        statusCode: 404,
        headers: cors,
        body: JSON.stringify({ error: 'NOT_FOUND', detail: 'Session not found' }),
      };
    }

    // Optional: only allow joining open sessions
    if (session.status !== 'open') {
      return {
        statusCode: 409,
        headers: cors,
        body: JSON.stringify({ error: 'SESSION_CLOSED', detail: `Session status: ${session.status}` }),
      };
    }

    // Insert participant (score defaults to 0 server-side or we set it explicitly)
    const { data: participant, error: pErr } = await supabase
      .from('session_participants')
      .insert([
        {
          session_id: session.id,
          user_id,
          display_name,
          score: 0,
        },
      ])
      .select('id, session_id, user_id, display_name, score, joined_at')
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
      body: JSON.stringify({
        error: 'JOIN_SESSION_FAILED',
        detail: err?.message ?? String(err),
      }),
    };
  }
};
