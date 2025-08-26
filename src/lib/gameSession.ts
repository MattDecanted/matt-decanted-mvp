// src/lib/gameSession.ts
// Minimal Supabase helpers for the Multiplayer MVP.
// Matches the DB schema we validated together.

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

/** ===== Types (align with your DB) ===== */
export type GameSession = {
  id: string;
  invite_code: string;
  status: "open" | "active" | "finished" | "cancelled";
  is_open: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Participant = {
  id: string;
  session_id: string;
  user_id: string | null;
  display_name: string;
  score: number;
  is_host: boolean;
  joined_at?: string;
  updated_at?: string;
};

export type GameRound = {
  id: string;
  session_id: string;
  round_number: number;
  state: string; // "pending" | "active" | "closed"
  payload: any;  // { questions: ... }
  created_at?: string;
  updated_at?: string;
};

/** ===== Utils ===== */
function assert<T>(val: T | null, msg: string): T {
  if (!val) throw new Error(msg);
  return val;
}

function codeFromInvite(invite?: string | null) {
  return (invite || "").toUpperCase().trim();
}

/** ===== Create Session (host) =====
 *  - Inserts game_sessions(status='open', is_open=true)
 *  - Inserts session_participants host row
 */
export async function createSession(
  userId: string | null,
  hostDisplayName: string
): Promise<{ session: GameSession; host: Participant }> {
  // 1) create session
  const { data: sess, error: sErr } = await supabase
    .from("game_sessions")
    .insert([{ status: "open", is_open: true }])
    .select("*")
    .single();
  if (sErr) throw sErr;

  // 2) host participant
  const { data: host, error: pErr } = await supabase
    .from("session_participants")
    .insert([
      {
        session_id: sess.id,
        user_id: userId,
        display_name: hostDisplayName || "Host",
        is_host: true,
        score: 0,
      },
    ])
    .select("*")
    .single();
  if (pErr) throw pErr;

  return { session: sess as GameSession, host: host as Participant };
}

/** ===== Join by Code (guest) =====
 *  - Looks up session by invite_code
 *  - Inserts guest row
 */
export async function joinSessionByCode(
  inviteCode: string,
  userId: string | null,
  displayName: string
): Promise<{ session: GameSession; participant: Participant }> {
  const code = codeFromInvite(inviteCode);
  const { data: sess, error: sErr } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("invite_code", code)
    .single();
  if (sErr || !sess) throw sErr ?? new Error("Session not found");

  // Optionally prevent joining finished/cancelled
  if (sess.status === "finished" || sess.status === "cancelled") {
    throw new Error("This game is not joinable");
  }

  const { data: part, error: pErr } = await supabase
    .from("session_participants")
    .insert([
      {
        session_id: sess.id,
        user_id: userId,
        display_name: displayName || "Guest",
        is_host: false,
        score: 0,
      },
    ])
    .select("*")
    .single();
  if (pErr) throw pErr;

  return { session: sess as GameSession, participant: part as Participant };
}

/** ===== Set Session Status (maps UI → DB) ===== */
export async function setSessionStatus(
  sessionId: string,
  status: GameSession["status"]
) {
  // Auto-toggle is_open for convenience
  const is_open =
    status === "open" ? true : status === "active" ? false : false;

  const { data, error } = await supabase
    .from("game_sessions")
    .update({ status, is_open })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error) throw error;
  return data as GameSession;
}

/** ===== Start Round =====
 *  - Upserts game_rounds(session_id, round_number) with state='active', payload
 */
export async function startRound(
  sessionId: string,
  roundNumber: number,
  payload: any
): Promise<GameRound> {
  // Insert then update-on-conflict via unique(session_id, round_number)
  const { data, error } = await supabase
    .from("game_rounds")
    .insert([
      {
        session_id: sessionId,
        round_number: roundNumber,
        state: "active",
        payload,
      },
    ])
    .select("*")
    .single();
  if (!error) return data as GameRound;

  // If already exists, update
  const { data: upd, error: uErr } = await supabase
    .from("game_rounds")
    .update({ state: "active", payload })
    .eq("session_id", sessionId)
    .eq("round_number", roundNumber)
    .select("*")
    .single();
  if (uErr) throw uErr;
  return upd as GameRound;
}

/** ===== End Round ===== */
export async function endRound(roundId: string) {
  const { data, error } = await supabase
    .from("game_rounds")
    .update({ state: "closed" })
    .eq("id", roundId)
    .select("*")
    .single();
  if (error) throw error;
  return data as GameRound;
}

/** ===== Submit Answer (upsert) ===== */
export async function submitAnswer(
  roundId: string,
  participantId: string,
  selectedIndex: number,
  isCorrect: boolean
) {
  // unique (round_id, participant_id)
  const { data, error } = await supabase
    .from("player_answers")
    .upsert(
      [
        {
          round_id: roundId,
          participant_id: participantId,
          selected_index: selectedIndex,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
        },
      ],
      { onConflict: "round_id,participant_id" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** ===== Award Points (+N) ===== */
export async function awardPoints(participantId: string, points: number) {
  const { data, error } = await supabase
    .rpc("sp_add_points_to_participant", { p_participant_id: participantId, p_points: points });
  // If you don't have an RPC, fallback to direct update:
  if (error) {
    const { data: upd, error: uErr } = await supabase
      .from("session_participants")
      .update({}) // no-op to use `from` .. `where` .. `set` via expression below
      .eq("id", participantId)
      .select("*")
      .single();
    if (uErr) throw uErr;

    // Actually increment score with a single statement
    const { data: inc, error: iErr } = await supabase
      .from("session_participants")
      .update({ score: (upd?.score ?? 0) + points })
      .eq("id", participantId)
      .select("*")
      .single();
    if (iErr) throw iErr;
    return inc as Participant;
  }
  return data as Participant;
}

/** ===== Realtime listeners for a session ===== */
type SessionListeners = {
  onParticipantJoin?: (p: Participant) => void;
  onParticipantUpdate?: (p: Participant) => void;
  onRoundChange?: (r: GameRound | null) => void;
  onSessionChange?: (s: GameSession) => void;
};

export function listenToSession(sessionId: string, handlers: SessionListeners): RealtimeChannel {
  const channel = supabase.channel(`room:${sessionId}`, {
    config: { broadcast: { self: false } },
  });

  // session_participants (insert/update)
  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
    (payload) => handlers.onParticipantJoin?.(payload.new as Participant)
  );
  channel.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
    (payload) => handlers.onParticipantUpdate?.(payload.new as Participant)
  );

  // game_rounds (latest round for this session)
  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "game_rounds", filter: `session_id=eq.${sessionId}` },
    async () => {
      const { data } = await supabase
        .from("game_rounds")
        .select("*")
        .eq("session_id", sessionId)
        .order("round_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      handlers.onRoundChange?.(data as GameRound | null);
    }
  );

  // game_sessions (status changes)
  channel.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
    (payload) => handlers.onSessionChange?.(payload.new as GameSession)
  );

  channel.subscribe();
  return channel;
}

export function unsubscribe(ch: RealtimeChannel | null) {
  if (!ch) return;
  try {
    supabase.removeChannel(ch);
  } catch {
    /* noop */
  }
}
