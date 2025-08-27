// netlify/functions/start-rounds.ts
import type { Handler } from '@netlify/functions';
import { supabase as sbServer } from './_supabaseClient'; // ⬅️ use the service-role client

export const handler: Handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
    }

    const { session_id, caller_user_id, payload, round_number } = JSON.parse(event.body || '{}');

    if (!session_id || !caller_user_id) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'BAD_REQUEST', detail: 'session_id and caller_user_id are required' }) };
    }

    // 1) Verify caller is the host
    const { data: s, error: sErr } = await sbServer
      .from('game_sessions')
      .select('id, host_user_id, status')
      .eq('id', session_id)
      .single();

    if (sErr || !s) {
      return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'NOT_FOUND', detail: 'Session not found' }) };
    }
    if (s.host_user_id !== caller_user_id) {
      return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'FORBIDDEN', detail: 'Only the host can start a round' }) };
    }

    // 2) Flip session to active (close lobby implicitly)
    const { error: upErr } = await sbServer
      .from('game_sessions')
      .update({ status: 'active' })
      .eq('id', session_id);

    if (upErr) throw new Error(`UPDATE_SESSION_FAILED: ${upErr.message}`);

    // 3) Start (or upsert) the round via RPC to bypass PostgREST table cache
    const { data: r, error: rpcErr } = await sbServer.rpc('fn_start_round', {
      p_session_id: session_id,
      p_round_number: round_number ?? 1,
      p_payload: (payload ?? {}) as any, // jsonb
    });

    if (rpcErr || !r) {
      throw new Error(`FN_START_ROUND_FAILED: ${rpcErr?.message || 'no data returned'}`);
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ round: r }) };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'START_ROUND_FAILED', detail: err?.message || String(err) }),
    };
  }
};
