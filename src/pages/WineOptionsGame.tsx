// src/pages/WineOptionsGame.tsx
import React, { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Users, Share2, Copy, Loader2, Trophy, ChevronRight, CheckCircle2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  createSession,
  joinSessionByCode,
  listenToSession,
  unsubscribe,
  setSessionStatus,
  startRound,
  endRound,
  submitAnswer,
  awardPoints,
  type GameSession,
  type Participant,
  type GameRound,
} from "@/lib/gameSession";

/** DB ↔ UI status mapping */
const WRITE_STATUS: Record<string, GameSession["status"]> = {
  waiting: "open",
  in_progress: "active",
  finished: "finished",
  closed: "cancelled",
};
const READ_STATUS: Record<GameSession["status"], string> = {
  open: "waiting",
  active: "in_progress",
  finished: "finished",
  cancelled: "closed",
};

function InviteBar({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${base}/join/${inviteCode}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my Wine Options game",
          text: `Use code ${inviteCode}`,
          url: joinUrl,
        });
      } else {
        await copy();
      }
    } catch {}
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border bg-white shadow-sm">
      <div>
        <div className="text-xs text-gray-500">Invite code</div>
        <div className="font-mono text-2xl font-semibold tracking-wide">{inviteCode}</div>
      </div>
      <div className="flex-1" />
      <button onClick={copy} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:shadow">
        <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
      </button>
      <button onClick={share} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-black text-white hover:shadow">
        <Share2 className="h-4 w-4" /> Share
      </button>
    </div>
  );
}

export type StepQuestion = {
  key: "vintage" | "colour" | "variety" | "hemisphere" | "country" | "region";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

function QuestionStepper({
  round,
  me,
  onFinished,
}: {
  round: GameRound;
  me: Participant;
  onFinished: () => void;
}) {
  const questions: StepQuestion[] = round.payload?.questions ?? [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const q = questions[index];

  useEffect(() => {
    setIndex(0);
    setSelected(null);
  }, [round?.id]);

  async function handleNext() {
    if (selected == null) return;
    const isCorrect = selected === q.correctIndex;
    await submitAnswer(round.id, me.id, selected, isCorrect);
    if (isCorrect) await awardPoints(me.id, 10);

    const last = index >= questions.length - 1;
    if (!last) {
      setIndex((i) => i + 1);
      setSelected(null);
    } else {
      onFinished();
    }
  }

  if (!q) return null;

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">Question {index + 1} of {questions.length}</div>
      <div className="text-2xl font-semibold">{q.prompt}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`p-4 rounded-2xl border text-left hover:shadow-sm focus:outline-none focus:ring-2 ${active ? "ring-2 ring-black" : ""}`}
              aria-pressed={active}
            >
              <div className="flex items-center gap-2">
                {active ? <CheckCircle2 className="h-5 w-5" /> : <ChevronRight className="h-5 w-5 opacity-50" />}
                <span className="font-medium">{opt}</span>
              </div>
              {active && q.explanation && <div className="mt-2 text-xs text-gray-500">{q.explanation}</div>}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={selected == null}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-black text-white disabled:opacity-60"
        >
          {index < questions.length - 1 ? "Next" : "See Results"}
        </button>
      </div>
    </div>
  );
}

// Replace with your OCR-driven round generator later
async function buildRoundPayload(): Promise<{ questions: StepQuestion[] }> {
  return {
    questions: [
      { key: "vintage", prompt: "Pick the vintage", options: ["2019", "2020"], correctIndex: 1 },
      { key: "hemisphere", prompt: "Old World or New World?", options: ["Old World", "New World"], correctIndex: 1 },
      { key: "country", prompt: "Pick the country", options: ["France", "Australia", "USA", "Italy"], correctIndex: 1 },
    ],
  };
}

export default function WineOptionsGame({ initialCode = "" }: { initialCode?: string }) {
  const [displayName, setDisplayName] = useState("Player");
  const [codeInput, setCodeInput] = useState(initialCode);
  const [session, setSession] = useState<GameSession | null>(null);
  const [me, setMe] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [round, setRound] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => () => unsubscribe(channelRef.current), []);

  function attachRealtime(sessId: string) {
    channelRef.current = listenToSession(sessId, {
      onParticipantJoin: (p) => setParticipants((prev) => uniqBy([...prev, p], (x) => x.id)),
      onParticipantUpdate: (p) => setParticipants((prev) => prev.map((x) => (x.id === p.id ? p : x))),
      onRoundChange: setRound,
      onSessionChange: setSession,
    });
  }

  // auto-join if /join/:code used
  useEffect(() => {
    const run = async () => {
      if (!initialCode || session) return;
      setLoading(true);
      try {
        const { session: s, participant } = await joinSessionByCode(initialCode, null, displayName || "Guest");
        setSession(s);
        setMe(participant);
        setCodeInput(s.invite_code);
        const { data: ps } = await supabase
          .from("session_participants")
          .select("*")
          .eq("session_id", s.id)
          .order("joined_at", { ascending: true });
        setParticipants(ps ?? []);
        attachRealtime(s.id);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function handleHost() {
    try {
      setLoading(true);
      const { session: s, host } = await createSession(null, displayName || "Host");
      setSession(s);
      setMe(host);
      setParticipants([host]);
      setCodeInput(s.invite_code);
      attachRealtime(s.id);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    try {
      setLoading(true);
      const code = codeInput.trim();
      const { session: s, participant } = await joinSessionByCode(code, null, displayName || "Guest");
      setSession(s);
      setMe(participant);
      setCodeInput(s.invite_code);
      const { data: ps } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", s.id)
        .order("joined_at", { ascending: true });
      setParticipants(ps ?? []);
      attachRealtime(s.id);
    } finally {
      setLoading(false);
    }
  }

  async function startGame() {
    if (!session || !me?.is_host) return;
    await setSessionStatus(session.id, WRITE_STATUS["in_progress"]);
    const payload = await buildRoundPayload();
    const r = await startRound(session.id, 1, payload);
    setRound(r);
  }

  async function finishGame() {
    if (!session || !round) return;
    await endRound(round.id);
    await setSessionStatus(session.id, WRITE_STATUS["finished"]);
  }

  const uiStatus = session ? READ_STATUS[session.status] : "waiting";

  if (!session) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-semibold">Wine Options — Multiplayer</h1>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Display name</label>
          <input
            className="w-full border rounded-2xl p-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={loading}
            onClick={handleHost}
            className="px-4 py-2 rounded-2xl bg-black text-white inline-flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Host new game
          </button>
          <div className="flex-1" />
          <input
            placeholder="Invite code"
            className="border rounded-2xl p-2 w-40"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          />
          <button
            disabled={loading || codeInput.length < 4}
            onClick={handleJoin}
            className="px-4 py-2 rounded-2xl border"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm">Status: <span className="font-medium">{uiStatus}</span></div>
        <div className="text-sm text-gray-500">Players: {participants.length}</div>
      </div>

      <InviteBar inviteCode={session.invite_code} />

      <div className="p-4 rounded-2xl border bg-white shadow-sm">
        <div className="font-medium mb-2">Players</div>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <div key={p.id} className={`px-3 py-1 rounded-full border ${p.is_host ? "bg-gray-100" : ""}`}>
              {p.display_name} {p.is_host && <span className="text-xs">(host)</span>} — {p.score} pts
            </div>
          ))}
        </div>
      </div>

      {!round && me?.is_host && uiStatus === "waiting" && (
        <button onClick={startGame} className="px-5 py-2.5 rounded-2xl bg-black text-white">Start Round</button>
      )}

      {round && uiStatus !== "finished" && (
        <div className="p-4 rounded-2xl border bg-white shadow-sm">
          <QuestionStepper round={round} me={me!} onFinished={finishGame} />
        </div>
      )}

      {uiStatus === "finished" && (
        <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-3">
          <div className="text-xl font-semibold flex items-center gap-2"><Trophy className="h-5 w-5" /> Results</div>
          <ul className="space-y-1">
            {[...participants].sort((a, b) => b.score - a.score).map((p, i) => (
              <li key={p.id} className="flex justify-between">
                <span>{i + 1}. {p.display_name}</span>
                <span className="font-medium">{p.score} pts</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button onClick={() => window.location.assign('/multiplayer')} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border">
              <LogOut className="h-4 w-4" /> Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function uniqBy<T>(arr: T[], key: (t: T) => string) {
  const m = new Map<string, T>();
  for (const it of arr) m.set(key(it), it);
  return [...m.values()];
}
