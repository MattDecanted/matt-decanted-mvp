// netlify/functions/award-points.js
// Awards points after a game and logs the result.
// ENV required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require('@supabase/supabase-js');

const cors = (status, body) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*', // tighten to your domain in prod
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  const dbg = {
    stage: 'start',
    method: event.httpMethod,
    hasUrl: !!process.env.SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    node: process.version,
  };

  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return cors(200, { ok: true, dbg });
    }
    if (event.httpMethod !== 'POST') {
      return cors(405, { error: 'Method not allowed', dbg });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return cors(500, { error: 'Server not configured', dbg });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (e) {
      return cors(400, { error: 'Invalid JSON body', detail: String(e?.message || e), dbg });
    }

    // Expected payload
    const {
      user_id,                   // REQUIRED
      mode = 'solo',             // 'solo' | 'host' | 'guest'
      score,                     // REQUIRED number
      max_score = 5,
      duration_seconds = null,   // number | null
      streak_bonus = false,      // boolean
      time_bonus = false,        // boolean
      session_id = null,         // optional game session id (if you track lobbies)
      invite_code = null,        // optional
    } = payload || {};

    // Validation
    if (!user_id || typeof user_id !== 'string') {
      return cors(400, { error: 'Missing or invalid user_id', dbg });
    }
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return cors(400, { error: 'Missing or invalid score (number required)', dbg });
    }
    if (!['solo', 'host', 'guest'].includes(mode)) {
      return cors(400, { error: 'Invalid mode', dbg: { ...dbg, mode } });
    }
    if (duration_seconds !== null && (typeof duration_seconds !== 'number' || duration_seconds < 0)) {
      return cors(400, { error: 'Invalid duration_seconds', dbg: { ...dbg, duration_seconds } });
    }

    const points =
      Number(score || 0) +
      (streak_bonus ? 1 : 0) +
      (time_bonus ? 1 : 0);

    dbg.points = points;

    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // --- Award points -------------------------------------------------------
    // First ensure a row exists, then increment using RPC (race-safe).
    // If the RPC is missing, we fallback to a read-update (not fully race-safe, but okay for MVP).
    // Suggested SQL for the RPC:
    // create or replace function increment_user_points(p_user_id uuid, p_delta int)
    // returns void language sql as $$
    //   insert into user_points (user_id, total_points)
    //   values (p_user_id, greatest(p_delta, 0))
    //   on conflict (user_id) do update
    //   set total_points = user_points.total_points + greatest(p_delta, 0),
    //       updated_at = now();
    // $$;

    // Ensure a row exists (no-op if it already does)
    const { error: seedErr } = await admin
      .from('user_points')
      .upsert(
        { user_id, total_points: 0, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (seedErr) {
      dbg.seedErr = seedErr.message || seedErr;
      // carry on; RPC may still succeed
    }

    // Try to increment via RPC
    const { error: incErr } = await admin.rpc('increment_user_points', {
      p_user_id: user_id,
      p_delta: points,
    });

    if (incErr) {
      // Fallback: read → update (may lose some increments under extreme concurrency)
      dbg.rpcFallback = true;
      const { data: currentRow, error: readErr } = await admin
        .from('user_points')
        .select('total_points')
        .eq('user_id', user_id)
        .single();

      if (readErr) {
        return cors(500, { error: 'Failed to read current points', detail: readErr.message || readErr, dbg });
      }

      const newTotal = (currentRow?.total_points || 0) + points;
      const { error: updErr } = await admin
        .from('user_points')
        .update({ total_points: newTotal, updated_at: new Date().toISOString() })
        .eq('user_id', user_id);

      if (updErr) {
        return cors(500, { error: 'Failed to update points', detail: updErr.message || updErr, dbg });
      }
    }

    // --- Log the game result ----------------------------------------------
    const { error: logErr } = await admin.from('wine_options_results').insert({
      user_id,
      mode,
      score,
      max_score,
      duration_seconds,
      streak_bonus,
      time_bonus,
      session_id,
      invite_code,
    });
    if (logErr) {
      // Not fatal for points; return warning
      dbg.logWarn = logErr.message || logErr;
    }

    // --- Return final total -------------------------------------------------
    const { data: final, error: finalErr } = await admin
      .from('user_points')
      .select('total_points')
      .eq('user_id', user_id)
      .single();

    if (finalErr) {
      return cors(200, {
        ok: true,
        points_awarded: points,
        total_points: null,
        warn: 'Points awarded, but failed to read final total',
        dbg: { ...dbg, finalErr: finalErr.message || finalErr },
      });
    }

    return cors(200, {
      ok: true,
      points_awarded: points,
      total_points: final?.total_points ?? null,
      dbg,
    });
  } catch (e) {
    console.error('award-points error', e);
    return cors(500, { error: 'Internal Server Error', detail: String(e?.message || e), dbg });
  }
};
