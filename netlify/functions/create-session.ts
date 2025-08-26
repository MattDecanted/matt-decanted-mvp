// netlify/functions/create-session.ts
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// ✅ Use service role for server-side writes; do NOT use the anon key here.
const SUPABASE_URL = required('VITE_SUPABASE_URL');          // you already have this in Netlify env
const SERVICE_ROLE  = required('SUPABASE_SERVICE_ROLE');      // you already have this in Netlify env
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

export const handler: Handler = async (event) => {
  // CORS (optional)
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { host_user_id, display_name } = body;

    if (!host_user_id || !display_name) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'BAD_REQUEST', detail: 'Missing host_user_id or display_name' }),
      };
    }

    // Create invite code
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Insert session — ⚠️ do NOT reference columns that may not exist in PostgREST cache
    const { data: session, error: insertErr } = await supabase
      .from('game_sessions')
      .insert([{ host_user_id, invite_code, status: 'open' }]) // let DB default set is_open=true
    .select('id, invite_code, status')  // ← drop updated_at
.single();

    if (insertErr) {
      console.error('create-session: insert session failed', insertErr);
      throw new Error(`INSERT_SESSION: ${insertErr.message}`);
    }

    // Ensure host participant row
    const { error: partErr } = await supabase.from('session_participants').insert([{
      session_id: session.id,
      user_id: host_user_id,     // must be NOT NULL in your schema
      display_name,
      is_host: true,
      score: 0,
    }]);

    if (partErr) {
      console.error('create-session: insert participant failed', partErr);
      throw new Error(`INSERT_PARTICIPANT: ${partErr.message}`);
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ session }),
    };
  } catch (err: any) {
    console.error('create-session: unhandled error', err);
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
