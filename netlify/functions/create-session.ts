// netlify/functions/create-session.ts
import type { Handler } from '@netlify/functions';
import { supabase } from './_supabaseClient';
// import { v4 as uuidv4 } from 'uuid'; // not used

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { host_user_id } = body;

    if (!host_user_id) {
      return { statusCode: 400, body: 'Missing host_user_id' };
    }

    // 6-char uppercase invite code
    const invite_code = Math.random().toString(36).slice(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('game_sessions')
      .insert([
        {
          host_user_id,
          invite_code,
          status: 'open',   // ensure valid enum
          is_open: true,    // open lobby
        },
      ])
      .select('*')
      .single();

    if (error) {
      // surface unique violations etc.
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'CREATE_SESSION_FAILED', detail: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ session: data }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CREATE_SESSION_FAILED', detail: err?.message ?? String(err) }),
    };
  }
};
