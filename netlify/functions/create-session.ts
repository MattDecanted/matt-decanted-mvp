// netlify/functions/create-session.ts
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Service-role client for server-side writes
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { host_user_id, display_name } = body;

    if (!host_user_id || !display_name) {
      return { statusCode: 400, body: 'Missing host_user_id or display_name' };
    }

    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // ✅ Do NOT reference `is_open` here — let the DB default set it.
    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert([{ host_user_id, invite_code, status: 'open' }])
      // ✅ Only select columns the cache already knows (avoid is_open)
      .select('id, invite_code, status, updated_at')
      .single();

    if (error) throw error;

    // Ensure there is a host participant row (idempotent insert)
    await supabase.from('session_participants').insert([
      {
        session_id: session.id,
        user_id: host_user_id,
        display_name,
        is_host: true,
        score: 0,
      },
    ]);

    return { statusCode: 200, body: JSON.stringify({ session }) };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'CREATE_SESSION_FAILED',
        detail: err?.message || String(err),
      }),
    };
  }
};
