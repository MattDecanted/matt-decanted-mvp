// src/pages/DailyQuiz.tsx
import * as React from "react";
import { supabase } from "@/lib/supabase";

// DB row returned by dq_today_quiz (single question per day)
type DqQuiz = {
  id: string;
  locale: string;
  date_scheduled: string; // YYYY-MM-DD
  difficulty: "beginner" | "intermediate" | "advanced" | string;
  question: string;
  options: string[]; // exactly 4
  correct_index: number; // 0..3 (not shown to user)
  explanation: string | null;
  points_award: number;
  is_published: boolean;
};

type DqStats = {
  user_id: string;
  current_streak: number;
  max_streak: number;
  last_correct_date: string | null;
  total_correct: number;
  total_attempts: number;
  updated_at: string;
};

type RpcResult = {
  correct: boolean | null;
  points_awarded: number;
  streak_after: number | null;
  already_attempted: boolean;
};

const tzAdelaide = "Australia/Adelaide";
function formatDateAdelaide(isoDate: string) {
  // isoDate like "2025-08-30"
  const [y, m, d] = isoDate.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, (m - 1), d, 12, 0, 0)); // midday UTC to avoid TZ off-by-one
  return dt.toLocaleDateString("en-AU", { timeZone: tzAdelaide, weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function DailyQuizPage() {
  const [state, setState] = React.useState<"loading" | "ready" | "empty" | "error">("loading");
  const [quiz, setQuiz] = React.useState<DqQuiz | null>(null);

  const [selected, setSelected] = React.useState<number>(-1);
  const [message, setMessage] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [result, setResult] = React.useState<RpcResult | null>(null);

  // Optional streak display (requires sign-in)
  const [uid, setUid] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<DqStats | null>(null);

  // Load today's quiz (Adelaide time) + user + stats
  React.useEffect(() => {
    (async () => {
      try {
        setState("loading");
        setMessage("");

        // who’s signed in?
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id ?? null;
        setUid(userId);

        // fetch today's quiz from DB RPC
        const { data: q, error: qErr } = await supabase.rpc("dq_today_quiz", { p_locale: "en" });
        if (qErr) throw qErr;
        if (!q) {
          setQuiz(null);
          setState("empty");
          return;
        }
        setQuiz(q as DqQuiz);
        setState("ready");

        // fetch user’s streak if signed in
        if (userId) {
          const { data: s, error: sErr } = await supabase
            .from("user_daily_quiz_stats")
            .select("user_id,current_streak,max_streak,last_correct_date,total_correct,total_attempts,updated_at")
            .maybeSingle();
          if (!sErr && s) setStats(s as DqStats);
        }
      } catch (e) {
        console.error(e);
        setState("error");
      }
    })();
  }, []);

  async function refreshStats() {
    if (!uid) return;
    const { data: s } = await supabase
      .from("user_daily_quiz_stats")
      .select("user_id,current_streak,max_streak,last_correct_date,total_correct,total_attempts,updated_at")
      .maybeSingle();
    if (s) setStats(s as DqStats);
  }

  async function submit() {
    if (!quiz) return;
    if (selected < 0) {
      setMessage("Please select an option.");
      return;
    }

    // must be signed in (RPC enforces this)
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id ?? null;
    if (!userId) {
      setMessage("Please sign in to save your points and streak.");
      return;
    }

    setSubmitting(true);
    setMessage("Scoring…");

    try {
      const { data, error } = await supabase.rpc("dq_submit_answer", {
        p_quiz: quiz.id,
        p_selected_index: selected,
      });

      if (error) throw error;

      const row = (Array.isArray(data) ? data[0] : data) as RpcResult | undefined;
      if (!row) {
        setMessage("Unexpected response.");
        setSubmitting(false);
        return;
      }

      setResult(row);

      if (row.already_attempted) {
        setMessage("Already completed today.");
      } else {
        const ok = row.correct ? "Correct!" : "Not quite.";
        const pts = row.points_awarded ?? 0;
        const st = row.streak_after ?? 0;
        setMessage(`${ok} +${pts} points • Streak ${st}🔥`);
        // Pull fresh stats
        await refreshStats();
      }
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message ?? "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") return <main className="p-6">Loading…</main>;
  if (state === "empty") return <main className="p-6">No Quiz Available today — check back tomorrow!</main>;
  if (state === "error") return <main className="p-6">Something went wrong loading the quiz.</main>;
  if (!quiz) return null;

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Daily Quiz</h1>
      <p className="text-sm text-gray-500 mb-1">{formatDateAdelaide(quiz.date_scheduled)}</p>
      <p className="text-xs text-gray-500 mb-6 capitalize">
        Difficulty: <span className="font-medium">{quiz.difficulty}</span> • Locale: {quiz.locale}
      </p>

      {/* One question per day */}
      <ol className="space-y-6">
        <li>
          <div className="font-medium mb-2">
            1. {quiz.question}
          </div>
          <div className="space-y-2">
            {quiz.options.map((opt, oi) => (
              <label key={oi} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="q0"
                  checked={selected === oi}
                  onChange={() => setSelected(oi)}
                  disabled={submitting || (result?.already_attempted ?? false) || result?.correct !== undefined}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          {/* Explanation shown after answering (if provided) */}
          {result && quiz.explanation && (
            <div className="mt-3 text-sm text-gray-700">
              {quiz.explanation}
            </div>
          )}
        </li>
      </ol>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={submit}
          className="px-4 py-2 rounded border bg-black text-white disabled:opacity-50"
          disabled={submitting || (result?.already_attempted ?? false) || result?.correct !== undefined}
        >
          {submitting ? "Submitting…" : (result?.already_attempted || result?.correct !== undefined) ? "Submitted" : "Submit"}
        </button>
        {message && <span className="text-sm">{message}</span>}
      </div>

      {/* Streak + totals (signed-in users) */}
      {uid && (
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">Current streak</div>
            <div className="text-2xl font-semibold">{stats?.current_streak ?? 0}🔥</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">Best streak</div>
            <div className="text-2xl font-semibold">{stats?.max_streak ?? 0}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">Total correct</div>
            <div className="text-2xl font-semibold">{stats?.total_correct ?? 0}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">Total attempts</div>
            <div className="text-2xl font-semibold">{stats?.total_attempts ?? 0}</div>
          </div>
        </div>
      )}

      {!uid && (
        <p className="mt-6 text-sm text-gray-600">
          Sign in to start your 7-day trial, save points and track streaks.
        </p>
      )}
    </main>
  );
}
