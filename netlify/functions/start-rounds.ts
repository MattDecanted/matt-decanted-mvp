// netlify/functions/start-rounds.ts
console.log('[start-rounds] USING_RPC', new Date().toISOString());

import type { Handler } from '@netlify/functions';
import { supabase as sbServer } from './_supabaseClient'; // service-role client

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  try {
    const { session_id, caller_user_id, payload, round_number } = JSON.parse(event.body || '{}');

    if (!session_id || !caller_user_id) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'BAD_REQUEST', detail: 'session_id and caller_user_id are required' }),
      };
    }

    // 1) Verify caller is the host
    const { data: s, error: sErr } = await sbServer
      .from('game_sessions')
      .select('id, host_user_id, status')
      .eq('id', session_id)
      .single();

    if (sErr || !s) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'NOT_FOUND', detail: 'Session not found' }) };
    }
    if (s.host_user_id !== caller_user_id) {
      return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'FORBIDDEN', detail: 'Only the host can start a round' }) };
    }

    // 2) Flip session to active
    const { error: upErr } = await sbServer
      .from('game_sessions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', session_id);

    if (upErr) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'UPDATE_SESSION_FAILED', detail: upErr.message }) };
    }

    // 3) Start (or upsert) the round via RPC
    const { data: r, error: rpcErr } = await sbServer.rpc('fn_start_round', {
      p_session_id: session_id,
      p_round_number: round_number ?? 1,
      p_payload: (payload ?? {}) as any, // jsonb
    });

    if (rpcErr || !r) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'FN_START_ROUND_FAILED', detail: rpcErr?.message || 'no data returned' }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ round: r }) };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'START_ROUND_FAILED', detail: err?.message || String(err) }),
    };
  }
};
