// src/pages/WineOptionsGame.tsx
import React, { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Users,
  Share2,
  Copy,
  Loader2,
  Trophy,
  ChevronRight,
  CheckCircle2,
  LogOut,
  Camera,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
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

/* ---------- OCR helpers (host uploads label to start a round) ---------- */

const FN_OCR = "/.netlify/functions/ocr-label";

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null;
};

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function extractLabelHints(text: string): LabelHints {
  const t = text.toLowerCase();
  const years = Array.from(t.matchAll(/\b(19|20)\d{2}\b/g)).map((m) => Number(m[0]));
  const possibleYear = years.find((y) => y >= 1980 && y <= new Date().getFullYear());
  const isNV = /\bnv\b|\bnon\s*-?\s*vintage\b/.test(t);

  let inferredVariety: string | null = null;
  if (/blanc\s+de\s+blancs/.test(t)) inferredVariety = "Chardonnay";
  else if (/blanc\s+de\s+noirs/.test(t)) inferredVariety = "Pinot Noir";
  else {
    const grapeList = [
      "chardonnay","pinot noir","pinot meunier","riesling","sauvignon","cabernet","merlot","syrah","shiraz","malbec",
      "tempranillo","nebbiolo","sangiovese","grenache","zinfandel","primitivo","chenin","viognier","gewurztraminer",
      "gruner","barbera","mencía","touriga","gamay","aligoté","semillon","cabernet franc","pinot gris","albariño"
    ];
    const found = grapeList.find((g) => t.includes(g));
    inferredVariety = found ? titleCase(found) : null;
  }

  return {
    vintage_year: isNV ? null : possibleYear ?? null,
    is_non_vintage: isNV,
    inferred_variety: inferredVariety,
  };
}

export type StepQuestion = {
  key: "vintage" | "colour" | "variety" | "hemisphere" | "country" | "region";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

async function buildRoundPayloadFromOCR(file: File): Promise<{ questions: StepQuestion[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(FN_OCR, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  const { text } = await res.json();
  const hints = extractLabelHints(text || "");

  // Vintage options
  const now = new Date().getFullYear();
  const vOpts = hints.is_non_vintage
    ? ["NV", String(now), String(now - 1), String(now - 2)]
    : hints.vintage_year
      ? [String(hints.vintage_year), String(hints.vintage_year - 1), String(hints.vintage_year + 1), "NV"]
      : ["NV", String(now), String(now - 1), String(now - 2)];

  // Variety options
  const varOpts = hints.inferred_variety
    ? [hints.inferred_variety, "Chardonnay", "Pinot Noir", "Sauvignon Blanc"]
    : ["Chardonnay", "Pinot Noir", "Sauvignon Blanc", "Riesling"];

  // Simple hemisphere guess based on classic Old-World keywords
  const isOld = /france|italy|spain|germany|portugal|austria|greece|hungary/i.test(text);
  const hemiCorrect = isOld ? 0 : 1;

  const questions: StepQuestion[] = [
    { key: "vintage", prompt: "Pick the vintage", options: vOpts.slice(0, 4), correctIndex: 0 },
    { key: "hemisphere", prompt: "Old World or New World?", options: ["Old World", "New World"], correctIndex: hemiCorrect },
    { key: "variety", prompt: "Pick the variety", options: varOpts.slice(0, 4), correctIndex: 0 },
  ];

  return { questions };
}

/* ------------------------------ UI pieces ------------------------------ */

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

/* ------------------------------ Page ------------------------------ */

export default function WineOptionsGame({ initialCode = "" }: { initialCode?: string }) {
  const [displayName, setDisplayName] = useState("Player");
  const [codeInput, setCodeInput] = useState(initialCode);
  const [session, setSession] = useState<GameSession | null>(null);
  const [me, setMe] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [round, setRound] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
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

  // Auto-join when /join/:code is used
  useEffect(() => {
    const run = async () => {
      if (!initialCode || session) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/.netlify/functions/join-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invite_code: initialCode.trim().toUpperCase(),
            user_id: null, // anonymous allowed
            display_name: displayName || "Guest",
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { session: s, participant } = await res.json();

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
      } catch (e: any) {
        setErr(e?.message || "Failed to join game.");
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function handleHost() {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) {
        setErr("Please sign in to host a game.");
        return;
      }

      const res = await fetch("/.netlify/functions/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host_user_id: uid,
          display_name: displayName || "Host",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session: s } = await res.json();

      const { data: ps } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", s.id)
        .order("joined_at", { ascending: true });

      setSession(s);
      // Identify host row without is_host: match user_id to host_user_id
      const hostRow = (ps || []).find((p: any) => p.user_id && s.host_user_id && p.user_id === s.host_user_id) as Participant | undefined;
      if (hostRow) setMe(hostRow);
      setParticipants((ps as Participant[]) ?? []);
      setCodeInput(s.invite_code);
      attachRealtime(s.id);
    } catch (e: any) {
      setErr(e?.message || "Failed to create game.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setLoading(true);
    setErr(null);
    try {
      const code = codeInput.trim().toUpperCase();
      if (!code) {
        setErr("Enter an invite code.");
        return;
      }
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;

      const res = await fetch("/.netlify/functions/join-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: code,
          user_id: uid,
          display_name: displayName || "Guest",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session: s, participant } = await res.json();

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
    } catch (e: any) {
      setErr(e?.message || "Failed to join game.");
    } finally {
      setLoading(false);
    }
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

        {err && (
          <div className="text-sm rounded-2xl border border-red-200 bg-red-50 text-red-700 p-2">
            {err}
          </div>
        )}

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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Host new game
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

        <div className="text-xs text-gray-500">Upload controls appear after you host or join a session.</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          Status: <span className="font-medium">{uiStatus}</span>
        </div>
        <div className="text-sm text-gray-500">Players: {participants.length}</div>
      </div>

      <InviteBar inviteCode={session.invite_code} />

      <div className="p-4 rounded-2xl border bg-white shadow-sm">
        <div className="font-medium mb-2">Players</div>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const isHost = !!(p.user_id && session?.host_user_id && p.user_id === session.host_user_id);
            return (
              <div key={p.id} className={`px-3 py-1 rounded-full border ${isHost ? "bg-gray-100" : ""}`}>
                {p.display_name} {isHost && <span className="text-xs">(host)</span>} — {p.score} pts
              </div>
            );
          })}
        </div>
      </div>

      {/* Host: upload a label to start a round */}
      {!round && uiStatus === "waiting" && me && session && (me.user_id === session.host_user_id) && (
        <div className="space-y-3 p-4 rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Camera className="h-4 w-4" />
            Upload a label to start the round
          </div>

          {uploadErr && (
            <div className="text-sm rounded-2xl border border-red-200 bg-red-50 text-red-700 p-2">
              {uploadErr}
            </div>
          )}

          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border cursor-pointer w-fit">
            <Upload className="h-4 w-4" />
            <span>{uploadBusy ? "Reading…" : "Choose image"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadBusy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadErr(null);
                setUploadBusy(true);
                try {
                  const payload = await buildRoundPayloadFromOCR(file);
                  await setSessionStatus(session.id, WRITE_STATUS["in_progress"]);
                  const r = await startRound(session.id, 1, payload);
                  setRound(r);
                } catch (er: any) {
                  setUploadErr(er?.message || "OCR failed");
                } finally {
                  setUploadBusy(false);
                }
              }}
            />
          </label>
        </div>
      )}

      {round && uiStatus !== "finished" && (
        <div className="p-4 rounded-2xl border bg-white shadow-sm">
          <QuestionStepper round={round} me={me!} onFinished={finishGame} />
        </div>
      )}

      {uiStatus === "finished" && (
        <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-3">
          <div className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" /> Results
          </div>
          <ul className="space-y-1">
            {[...participants].sort((a, b) => b.score - a.score).map((p, i) => (
              <li key={p.id} className="flex justify-between">
                <span>{i + 1}. {p.display_name}</span>
                <span className="font-medium">{p.score} pts</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button
              onClick={() => window.location.assign("/wine-options/multiplayer")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border"
            >
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
