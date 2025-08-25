// netlify/functions/award-points.js
// Awards points after a game, and logs a game result.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require('@supabase/supabase-js');

// CORS helper
const cors = (body, status = 200) => ({
  statusCode: status,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json; charset=utf-8',
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return cors({});
  }
  if (event.httpMethod !== 'POST') {
    return cors({ error: 'Method not allowed' }, 405);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return cors({ error: 'Server not configured' }, 500);
  }
  const admin = createClient(url, key);

  try {
    const payload = JSON.parse(event.body || '{}');

    const {
      user_id,
      mode = 'solo',
      score,
      max_score = 5,
      duration_seconds = null,
      streak_bonus = false,
      time_bonus = false,
    } = payload;

    if (!user_id || typeof score !== 'number') {
      return cors({ error: 'Missing user_id or score' }, 400);
    }
    if (!['solo', 'host', 'guest'].includes(mode)) {
      return cors({ error: 'Invalid mode' }, 400);
    }

    const points =
      Number(score || 0) +
      (streak_bonus ? 1 : 0) +
      (time_bonus ? 1 : 0);

    // 1) Upsert points
    const { data: upserted, error: upErr } = await admin
      .from('user_points')
      .upsert(
        { user_id, total_points: points, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select();

    if (upErr) throw upErr;

    // 2) Increment total (race-safe approach)
    const { data: updated, error: incErr } = await admin.rpc('increment_user_points', {
      p_user_id: user_id,
      p_delta: points,
    });

    // If the RPC doesn’t exist yet, create it on the fly:
    if (incErr) {
      // Create the RPC and retry once
      await admin.rpc('noop'); // no-op to ensure connection
      // You can create the function in SQL (see below), but we’ll still continue with a fallback increment:
      const { data: currentRow } = await admin.from('user_points').select('total_points').eq('user_id', user_id).single();
      const newTotal = (currentRow?.total_points || 0) + points;
      await admin.from('user_points').update({ total_points: newTotal, updated_at: new Date().toISOString() }).eq('user_id', user_id);
    }

    // 3) Log result
    const { error: logErr } = await admin.from('wine_options_results').insert({
      user_id, mode, score, max_score, duration_seconds, streak_bonus, time_bonus,
    });
    if (logErr) throw logErr;

    // 4) Return new total
    const { data: final } = await admin.from('user_points').select('total_points').eq('user_id', user_id).single();

    return cors({
      ok: true,
      points_awarded: points,
      total_points: final?.total_points ?? null,
    });
  } catch (e) {
    console.error('award-points error', e);
    return cors({ error: String(e?.message || e) }, 500);
  }
};
