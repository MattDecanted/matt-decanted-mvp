// netlify/functions/start-rounds.js
// Starts a round after verifying the caller is the host.
// Expects JSON: { session_id, caller_user_id, payload, round_number }

const { createClient } = require("@supabase/supabase-js");

const json = (status, body) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Supabase env vars not set" });
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { session_id, caller_user_id, payload: roundPayload, round_number = 1 } = payload || {};
  if (!session_id || !caller_user_id || !roundPayload) {
    return json(400, { error: "Missing session_id, caller_user_id or payload" });
  }

  // 1) Verify session + host
  const { data: session, error: sErr } = await sb
    .from("game_sessions")
    .select("*")
    .eq("id", session_id)
    .single();

  if (sErr || !session) return json(404, { error: "Session not found" });
  if (session.host_user_id !== caller_user_id) {
    return json(403, { error: "Only the host can start a round" });
  }

  // 2) Insert round
  const roundRow = {
    session_id,
    round_number,
    status: "active",
    payload: roundPayload,
    started_at: new Date().toISOString(),
  };

  const { data: rounds, error: rErr } = await sb
    .from("game_rounds")
    .insert(roundRow)
    .select("*")
    .limit(1);

  if (rErr) return json(500, { error: "Failed to insert round", details: rErr.message });

  // 3) Mark session active
  const { error: uErr } = await sb
    .from("game_sessions")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", session_id);

  if (uErr) return json(500, { error: "Failed to update session", details: uErr.message });

  return json(200, { ok: true, round: rounds[0] });
};
