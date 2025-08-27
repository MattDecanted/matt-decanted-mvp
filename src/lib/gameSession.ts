// src/lib/gameSession.ts
// Multiplayer helpers — aligned with current DB schema & Netlify functions.
// No references to deprecated columns like `is_open`.

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

/* ========= Types (mirror your DB) ========= */

export type GameSession = {
  id: string;
  invite_code: string;
  status: "open" | "active" | "finished" | "cancelled";
  host_user_id: string | null;       // may be null for anonymous host
  created_at?: string;
  updated_at?: string | null;
};

export type Participant = {
  id: string;
  session_id: string;
  user_id: string | null;
  display_name: string;
  score: number;
  joined_at: string;
  is_host?: boolean | null;          // optional in DB; UI should not rely solely on it
};

export type GameRound = {
  id: string;
  session_id: string;
  round_number: number;
  status: "active" | "finished";
  payload: any;                      // { questions: StepQuestion[] }
  created_at: string;
};

/* ========= Session status ========= */

export async function setSessionStatus(
  sessionId: string,
  status: GameSession["status"]
): Promise<void> {
  const { error } = await supabase
    .from("game_sessions")
    .update({ status })
    .eq("id", sessionId);

  if (error) throw new Error(`SET_STATUS_FAILED: ${error.message}`);
}

/* ========= Rounds ========= */

export async function startRound(
  sessionId: string,
  roundNumber: number,
  payload: any
): Promise<GameRound> {
  const { data, error } = await supabase
    .from("game_rounds")
    .insert([{ session_id: sessionId, round_number: roundNumber, status: "active", payload }])
    .select("*")
    .single();

  if (error) throw new Error(`START_ROUND_FAILED: ${error.message}`);
  return data as GameRound;
}

export async function endRound(roundId: string): Promise<void> {
  const { error } = await supabase
    .from("game_rounds")
    .update({ status: "finished" })
    .eq("id", roundId);

  if (error) throw new Error(`END_ROUND_FAILED: ${error.message}`);
}

/* ========= Answers & scoring ========= */

export async function submitAnswer(
  roundId: string,
  participantId: string,
  selectedIndex: number,
  isCorrect: boolean
): Promise<void> {
  const { error } = await supabase.from("round_answers").insert([
    {
      round_id: roundId,
      participant_id: participantId,
      selected_index: selectedIndex,
      is_correct: isCorrect,
    },
  ]);
  if (error) throw new Error(`SUBMIT_ANSWER_FAILED: ${error.message}`);
}

/**
 * Atomically increment a participant's score using an RPC.
 * Create in SQL:
 *   create or replace function public.increment_participant_score(p_participant_id uuid, p_points int)
 *   returns void language plpgsql security definer as $$
 *   begin
 *     update public.session_participants set score = coalesce(score,0) + p_points
 *     where id = p_participant_id;
 *   end; $$;
 */
export async function awardPoints(participantId: string, points: number): Promise<void> {
  const { error } = await supabase.rpc("increment_participant_score", {
    p_participant_id: participantId,
    p_points: points,
  });
  if (error) throw new Error(`AWARD_POINTS_FAILED: ${error.message}`);
}

/* ========= Realtime ========= */

type SessionListeners = {
  onParticipantJoin?: (p: Participant) => void;
  onParticipantUpdate?: (p: Participant) => void;
  onRoundChange?: (r: GameRound | null) => void;
  onSessionChange?: (s: GameSession) => void;
};

export function listenToSession(sessionId: string, handlers: SessionListeners): RealtimeChannel {
  const channel = supabase
    .channel(`session:${sessionId}`, { config: { broadcast: { self: false } } })
    // Participants
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
      (payload) => handlers.onParticipantJoin?.(payload.new as Participant),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
      (payload) => handlers.onParticipantUpdate?.(payload.new as Participant),
    )
    // Session status
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
      (payload) => handlers.onSessionChange?.(payload.new as GameSession),
    )
    // Rounds: always provide the latest round
    .on(
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
        handlers.onRoundChange?.((data ?? null) as GameRound | null);
      },
    )
    .subscribe();

  return channel;
}

export function unsubscribe(ch: RealtimeChannel | null) {
  if (ch) supabase.removeChannel(ch);
}
