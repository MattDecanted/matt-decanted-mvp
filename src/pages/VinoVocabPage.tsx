// src/pages/VinoVocabPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flame, Sparkles, Check, X, Lock, LogIn, LogOut, Info } from "lucide-react";

/**
 * Matt Decanted — Daily Vocab Page (Bolt-style)
 * ------------------------------------------------------------
 * • Tailwind for styling; light, clean, legible.
 * • Subtle motion via Framer Motion.
 * • Uses Supabase tables we designed together:
 *   - public.vocab_challenges (with description/explanation/category/difficulty/points)
 *   - public.member_profiles (user_id, subscription_tier)
 *   - public.user_vocab_progress + RPC award_vocab_points(p_vocab uuid, p_correct boolean)
 * • Saves points/streaks ONLY for subscribers ("free" counts as subscribed).
 * • Timezone: Australia/Adelaide — determines today’s lesson by date.
 */

// --- Utilities --------------------------------------------------------------
function formatDateAdelaide(date = new Date()) {
  // Get YYYY-MM-DD string in Australia/Adelaide time.
  const tz = "Australia/Adelaide";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {} as Record<string, string>);
  return `${parts.year}-${parts.month}-${parts.day}`; // en-CA yields 2-digit month/day
}

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

// Types mirroring DB shape
type Lesson = {
  id: string;
  word: string;
  description: string | null;
  explanation: string | null;
  options: string[] | null;
  correct: string | null;
  hint: string | null;
  date: string; // YYYY-MM-DD
  category: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  points: number | null;
};

type LeaderRow = { user_id: string; points_30d: number; correct_30d: number };
type TotalsRow = { user_id: string; total_points: number; lessons_correct: number };
type LatestCorrectRow = { user_id: string; streak_after: number; lesson_date: string; completed_at: string };

// Difficulty → Badge style
const diffStyle: Record<string, string> = {
  beginner: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  intermediate: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  advanced: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
};

// Category → subtle tag colour
const catStyle: Record<string, string> = {
  colour: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  primary: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
  secondary: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  tertiary: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  fault: "bg-red-50 text-red-700 ring-1 ring-red-200",
  structure: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
};

// --- Auth UI ---------------------------------------------------------------
function SignInGate({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const signInGoogle = async () => {
    setBusy(true);
    await supabase.auth.signInWithOAuth({ provider: "google" });
    setBusy(false);
    onDone?.();
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={signInGoogle}
        disabled={busy}
        className={classNames(
          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm",
          busy ? "opacity-60 cursor-not-allowed" : "bg-neutral-900 text-white hover:bg-neutral-800",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900"
        )}
      >
        <LogIn className="h-4 w-4" /> {busy ? "Opening…" : "Sign in with Google"}
      </button>
      <p className="text-xs text-neutral-500">Sign in to save points & streaks. Free tier counts.</p>
    </div>
  );
}

// --- Main Component --------------------------------------------------------
export default function DailyVocabPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileTier, setProfileTier] = useState<string | null>(null); // null = not subscribed
  const [today, setToday] = useState<string>(formatDateAdelaide());
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Quiz state
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<null | { correct: boolean; points: number; streak: number }>(null);
  const [saving, setSaving] = useState(false);

  // Totals / Leaderboard (optional flair)
  const [totals, setTotals] = useState<TotalsRow | null>(null);
  const [latest, setLatest] = useState<LatestCorrectRow | null>(null);
  const [leader, setLeader] = useState<LeaderRow[]>([]);

  const isSubscribed = !!profileTier; // non-null tier counts

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Auth
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id || null;
        setUserId(uid);

        // Member profile (free/premium)
        if (uid) {
          const { data: mp } = await supabase
            .from("member_profiles")
            .select("subscription_tier")
            .eq("user_id", uid)
            .maybeSingle();
          setProfileTier(mp?.subscription_tier ?? null);
        } else {
          setProfileTier(null);
        }

        // Today lesson
        const todayStr = formatDateAdelaide();
        setToday(todayStr);
        const { data: lc, error: lcErr } = await supabase
          .from("vocab_challenges")
          .select("id, word, description, explanation, options, correct, hint, date, category, difficulty, points")
          .eq("date", todayStr)
          .maybeSingle();
        if (lcErr) throw lcErr;
        setLesson((lc || null) as Lesson | null);

        // Optional flair: totals, streak, leaderboard (ignore errors silently)
        if (uid) {
          const { data: t } = await supabase
            .from("vocab_user_totals")
            .select("user_id, total_points, lessons_correct")
            .eq("user_id", uid)
            .maybeSingle();
          if (t) setTotals(t as TotalsRow);

          const { data: l } = await supabase
            .from("vocab_user_latest_correct")
            .select("user_id, streak_after, lesson_date, completed_at")
            .eq("user_id", uid)
            .maybeSingle();
          if (l) setLatest(l as LatestCorrectRow);
        }

        const { data: lb } = await supabase
          .from("vocab_leaderboard_30d")
          .select("user_id, points_30d, correct_30d")
          .limit(5);
        if (lb) setLeader(lb as LeaderRow[]);
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleJoinFree = async () => {
    if (!userId) {
      alert("Please sign in first.");
      return;
    }
    const { error } = await supabase
      .from("member_profiles")
      .upsert({ user_id: userId, subscription_tier: "free" }, { onConflict: "user_id" });
    if (error) {
      alert(error.message);
      return;
    }
    setProfileTier("free");
  };

  const handleAnswer = async (index: number) => {
    if (!lesson || !lesson.options) return;
    setSelected(index);
    const chosen = lesson.options[index];
    const isCorrect = chosen === lesson.correct;

    // Always show feedback locally
    let awarded = 0;
    let streak = result?.streak ?? 0;

    if (isSubscribed && userId) {
      try {
        setSaving(true);
        const { data, error } = await supabase.rpc("award_vocab_points", {
          p_vocab: lesson.id,
          p_correct: isCorrect,
        });
        if (error) throw error;
        const row = (data && (data as any[])[0]) || { points_awarded: 0, streak_after: 0 };
        awarded = row.points_awarded ?? 0;
        streak = row.streak_after ?? 0;

        // refresh totals after awarding
        const { data: t } = await supabase
          .from("vocab_user_totals")
          .select("user_id, total_points, lessons_correct")
          .eq("user_id", userId)
          .maybeSingle();
        if (t) setTotals(t as TotalsRow);

        const { data: l } = await supabase
          .from("vocab_user_latest_correct")
          .select("user_id, streak_after, lesson_date, completed_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (l) setLatest(l as LatestCorrectRow);
      } catch (e: any) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    }

    setResult({ correct: isCorrect, points: awarded, streak });
  };

  const resetSelection = () => {
    setSelected(null);
    setResult(null);
  };

  const Header = () => (
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-6 py-8 shadow-lg ring-1 ring-white/10">
      <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/20 to-fuchsia-400/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-400/20 to-emerald-400/10 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-white/90">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs tracking-widest uppercase">Matt Decanted</span>
          </div>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-white">Daily Wine Vocab</h1>
          <p className="mt-1 text-sm text-neutral-300">One tidy word a day. Learn it, nail it, bank it.</p>
        </div>
        <div className="flex items-center gap-3">
          {userId ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-white hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          ) : (
            <SignInGate />
          )}
        </div>
      </div>
    </div>
  );

  const MetaBadges = () => (
    <div className="flex flex-wrap items-center gap-2">
      {lesson?.difficulty && (
        <span
          className={classNames(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
            diffStyle[lesson.difficulty] || "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200"
          )}
        >
          {lesson.difficulty}
        </span>
      )}
      {lesson?.category && (
        <span
          className={classNames(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
            catStyle[lesson.category] || "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200"
          )}
        >
          {lesson.category}
        </span>
      )}
      {lesson?.points != null && (
        <span className="inline-flex items-center rounded-full bg-white text-neutral-700 ring-1 ring-neutral-200 px-3 py-1 text-xs font-medium">
          <Trophy className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> {lesson.points} pts
        </span>
      )}
    </div>
  );

  const LessonCard = () => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-neutral-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-400">{today}</div>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-900">
            {lesson?.word ?? "No lesson scheduled"}
          </h2>
          <div className="mt-2 text-neutral-600 leading-relaxed">
            {lesson?.description || "Check back tomorrow for the next word."}
          </div>
        </div>
        <MetaBadges />
      </div>

      {/* Hint */}
      {lesson?.hint && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600 ring-1 ring-neutral-200">
          <Info className="h-3.5 w-3.5" /> {lesson.hint}
        </div>
      )}

      {/* Options */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {lesson?.options?.map((opt, i) => {
          const isChosen = selected === i;
          const isRight = result?.correct && lesson?.correct === opt;
          const isWrong = isChosen && result && !result.correct;
          return (
            <button
              key={i}
              onClick={() => (result ? undefined : handleAnswer(i))}
              className={classNames(
                "group relative w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                "focus:outline-none focus-visible:ring-2",
                result
                  ? isRight
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 focus-visible:ring-emerald-400"
                    : isWrong
                    ? "border-rose-200 bg-rose-50 text-rose-800 focus-visible:ring-rose-400"
                    : "border-neutral-200 bg-white text-neutral-800"
                  : isChosen
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 hover:border-neutral-300"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold"
                  style={{ borderColor: result ? "transparent" : "rgba(0,0,0,0.2)" }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
                <span className="ml-auto">
                  {result && lesson?.correct === opt && <Check className="h-4 w-4" />}
                  {result && isWrong && <X className="h-4 w-4" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              {result.correct ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 text-sm font-semibold">
                  <Check className="h-4 w-4" /> Nice – locked in.
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-rose-800 text-sm font-semibold">
                  <X className="h-4 w-4" /> Not quite. Read the why, then try tomorrow.
                </span>
              )}

              {isSubscribed ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-200 text-sm font-semibold">
                  <Trophy className="h-4 w-4" /> +{result.points} pts
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-neutral-700 text-sm">
                  <Lock className="h-4 w-4" /> Sign in & join free to save points
                </span>
              )}

              {result.streak > 1 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-orange-700 ring-1 ring-orange-200 text-sm font-semibold">
                  <Flame className="h-4 w-4" /> Streak {result.streak}
                </span>
              )}
            </div>

            {lesson?.explanation && (
              <p className="mt-3 text-sm leading-relaxed text-neutral-700">{lesson.explanation}</p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={resetSelection}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Try again
              </button>
              {!isSubscribed &&
                (userId ? (
                  <button
                    onClick={handleJoinFree}
                    className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
                  >
                    Join free – save my streak
                  </button>
                ) : (
                  <div className="text-sm text-neutral-600">Sign in above to join free.</div>
                ))}
              {saving && <div className="text-sm text-neutral-500">Saving…</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const Sidebar = () => (
    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-neutral-200">
      <div className="flex items-center gap-2 text-neutral-800">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold">Your stats</h3>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Total points</div>
          <div className="mt-1 text-2xl font-semibold">{totals?.total_points ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 p-4">
          <div className="text-xs text-neutral-500">Current streak</div>
          <div className="mt-1 text-2xl font-semibold">{latest?.streak_after ?? 0}</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2 text-neutral-800">
          <Flame className="h-5 w-5 text-orange-500" />
          <h4 className="font-semibold">Leaderboard (30d)</h4>
        </div>
        <ol className="mt-3 space-y-2">
          {leader?.length ? (
            leader.map((row, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold">
                    {idx + 1}
                  </span>
                  <span className="text-neutral-700">{row.user_id.slice(0, 6)}…</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-500">{row.correct_30d}✔</span>
                  <span className="font-semibold text-neutral-800">{row.points_30d} pts</span>
                </div>
              </li>
            ))
          ) : (
            <li className="text-sm text-neutral-500">No entries yet.</li>
          )}
        </ol>
      </div>

      {!isSubscribed && (
        <div className="mt-6 rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200">
          <div className="text-sm text-neutral-800 font-semibold">Save your progress</div>
          <p className="mt-1 text-sm text-neutral-600">
            Join the free tier to bank points and keep your streak alive.
          </p>
          <div className="mt-3 flex items-center gap-2">
            {userId ? (
              <button
                onClick={handleJoinFree}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
              >
                <Trophy className="h-4 w-4" /> Join free
              </button>
            ) : (
              <SignInGate />
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <Header />

      <div className="mt-4 md:mt-6 rounded-2xl bg-white p-4 md:p-5 shadow ring-1 ring-neutral-200">
        <p className="text-sm md:text-base leading-relaxed text-neutral-700">
          Confidence in wine tasting often comes down to having the right vocabulary at your
          fingertips—to describe what you’re seeing, smelling and tasting (texture and structure
          included). I’ve put this program together to share 600+ words I reach for when I taste, so
          you can bank them one tidy word a day.
        </p>
      </div>

      {err && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* Main grid */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-neutral-200">
              <div className="h-5 w-28 animate-pulse rounded bg-neutral-200" />
              <div className="mt-3 h-7 w-64 animate-pulse rounded bg-neutral-200" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
                <div className="h-4 w-11/12 animate-pulse rounded bg-neutral-100" />
                <div className="h-4 w-10/12 animate-pulse rounded bg-neutral-100" />
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-2xl border border-neutral-200 bg-neutral-50" />
                ))}
              </div>
            </div>
          ) : (
            <LessonCard />
          )}
        </div>

        <Sidebar />
      </div>

      {/* Footer note */}
      <div className="mt-8 flex items-center justify-between text-xs text-neutral-500">
        <div>Built in the Matt Decanted vibe · Australia/Adelaide · {today}</div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" /> Keep it tidy. One word a day.
        </div>
      </div>
    </div>
  );
}
