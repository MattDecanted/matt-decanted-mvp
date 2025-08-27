import type { Handler } from '@netlify/functions';
import { sbServer } from './_supabaseClient';

export const handler: Handler = async (event) => {
  try {
    const { session_id, caller_user_id, payload, round_number } = JSON.parse(event.body || '{}');
    if (!session_id || !caller_user_id) return { statusCode: 400, body: 'Missing fields' };

    // Verify caller is the host
    const { data: s, error: sErr } = await sbServer
      .from('game_sessions')
      .select('id, host_user_id, status, is_open')
      .eq('id', session_id)
      .single();
    if (sErr || !s) return { statusCode: 404, body: 'Session not found' };
    if (s.host_user_id !== caller_user_id) return { statusCode: 403, body: 'Only host can start' };

    // Flip session to active; close lobby
    const { error: upErr } = await sbServer
      .from('game_sessions')
      .update({ status: 'active', is_open: false })
      .eq('id', session_id);
    if (upErr) throw upErr;

    // Create the round
    const { data: r, error: rErr } = await sbServer
      .from('game_rounds')
      .insert([{ session_id, round_number: round_number ?? 1, payload: payload ?? {} }])
      .select('*')
      .single();
    if (rErr || !r) throw rErr || new Error('INSERT round failed');

    return { statusCode: 200, body: JSON.stringify({ round: r }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: 'START_ROUND_FAILED', detail: err?.message || String(err) }) };
  }
};
