// src/pages/VinoVocabPage.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  Trophy, Flame, Sparkles, Check, X, Lock, LogIn, LogOut, Info, CheckCircle2, AlertTriangle, ArrowRight
} from "lucide-react";

/**
 * Vino Vocab (Daily) — single-file page + local PointsProvider.
 * Awards (in order): award_vocab_points -> vv_award_points(term,was_correct,points) -> vv_award_points(p_points,p_term,p_was_correct) -> REST fallback.
 * Totals/Streak now update optimistically (immediate UI) + then refresh from DB.
 */

const tzAdelaide = "Australia/Adelaide";
function formatDateAdelaide(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tzAdelaide, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d).reduce((acc: Record<string,string>, p) => ((acc[p.type]=p.value), acc), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function cn(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }

// ---------- Points Context ----------
interface PointsContextType {
  totalPoints: number;
  currentStreak: number;
  loading: boolean;
  refreshPoints: () => Promise<void>;
  applyDelta: (pointsDelta: number, nextStreak?: number) => void; // NEW: optimistic UI helper
  setTotals: (totals: number, streak: number) => void; // NEW: direct set helper
}
const PointsContext = createContext<PointsContextType | undefined>(undefined);

function PointsProvider({ children }: { children: React.ReactNode }) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshPoints = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("vv_get_user_stats");
    if (!error && Array.isArray(data) && data?.[0]) {
      const row = data[0] as { total_points?: number; current_streak?: number };
      setTotalPoints(row?.total_points ?? 0);
      setCurrentStreak(row?.current_streak ?? 0);
    } else {
      // best-effort synthesis if vv_get_user_stats() is absent
      const uid = (await supabase.auth.getUser()).data?.user?.id ?? null;
      if (uid) {
        const t = await supabase.from("vocab_user_totals").select("total_points").eq("user_id", uid).maybeSingle();
        if (!t.error && t.data) setTotalPoints(t.data.total_points ?? 0);
        const s = await supabase.from("vocab_user_latest_correct").select("streak_after").eq("user_id", uid).maybeSingle();
        if (!s.error && s.data) setCurrentStreak(s.data.streak_after ?? 0);
      }
    }
    setLoading(false);
  };

  // NEW: optimistic helpers
  const applyDelta: PointsContextType["applyDelta"] = (delta, nextStreak) => {
    setTotalPoints((p) => Math.max(0, p + (delta || 0)));
    if (typeof nextStreak === "number") setCurrentStreak(nextStreak);
  };
  const setTotals: PointsContextType["setTotals"] = (tot, streak) => {
    setTotalPoints(Math.max(0, tot || 0));
    setCurrentStreak(Math.max(0, streak || 0));
  };

  useEffect(() => { void refreshPoints(); }, []);

  return (
    <PointsContext.Provider value={{ totalPoints, currentStreak, loading, refreshPoints, applyDelta, setTotals }}>
      {children}
    </PointsContext.Provider>
  );
}
function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) throw new Error("usePoints must be used within a PointsProvider");
  return ctx;
}

// ---------- types ----------
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

// ---------- sign in gate ----------
function SignInGate() {
  const [busy, setBusy] = useState(false);
  const onGoogle = async () => { setBusy(true); await supabase.auth.signInWithOAuth({ provider: "google" }); setBusy(false); };
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onGoogle}
        disabled={busy}
        className={cn(
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

// ---------- theme labels ----------
const diffStyle: Record<string, string> = {
  beginner: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  intermediate: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  advanced: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
};
const catStyle: Record<string, string> = {
  colour: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  primary: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
  secondary: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  tertiary: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  fault: "bg-red-50 text-red-700 ring-1 ring-red-200",
  structure: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
};

// ---------- demo fallback ----------
const DEMO_TERM = "Ruby";
const DEMO_OPTIONS = [
  { id: "A", text: "Typically a medium to deep red hue seen in youthful red wines like Pinot Noir and Grenache.", correct: true,
    explain: "Ruby describes a clear, bright red core common in younger reds (e.g. Pinot Noir, Grenache); it fades toward garnet with age." },
  { id: "B", text: "A pale onion-skin tint typical of aged rosé wines.", correct: false, explain: "That’s rosé, not ruby." },
  { id: "C", text: "An amber-gold colour associated with mature white wines.", correct: false, explain: "Amber/gold = oxidative whites." },
  { id: "D", text: "A deep purple-black shade most common in very old Cabernet Sauvignon.", correct: false, explain: "Old Cabs trend to garnet/brick." },
];

// ---------- header ----------
function Header({ userId, onSignOut }: { userId: string | null; onSignOut: () => void; }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-6 py-8 shadow-lg ring-1 ring-white/10">
      <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/20 to-fuchsia-400/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-400/20 to-emerald-400/10 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-white/90"><Sparkles className="h-5 w-5" /><span className="text-xs tracking-widest uppercase">Matt Decanted</span></div>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-white">Daily Wine Vocab</h1>
          <p className="mt-1 text-sm text-neutral-300">One tidy word a day. Learn it, nail it, bank it.</p>
        </div>
        <div className="flex items-center gap-3">
          {userId ? (
            <button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-white hover:bg-white/20">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          ) : (<SignInGate />)}
        </div>
      </div>
    </div>
  );
}

function LessonMeta({ lesson }: { lesson: Lesson | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {lesson?.difficulty && <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        diffStyle[lesson.difficulty] || "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200")}>{lesson.difficulty}</span>}
      {lesson?.category && <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        catStyle[lesson.category] || "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200")}>{lesson.category}</span>}
      {lesson?.points != null && (
        <span className="inline-flex items-center rounded-full bg-white text-neutral-700 ring-1 ring-neutral-200 px-3 py-1 text-xs font-medium">
          <Trophy className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> {lesson.points} pts
        </span>
      )}
    </div>
  );
}

// ---------- Inner page ----------
function VinoVocabInner() {
  const { totalPoints, currentStreak, refreshPoints, applyDelta, setTotals } = usePoints();

  const [userId, setUserId] = useState<string | null>(null);
  const [profileTier, setProfileTier] = useState<string | null>(null);
  const [today, setToday] = useState<string>(formatDateAdelaide());
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<null | { correct: boolean; points: number; streak: number; explain?: string }>(null);
  const [saving, setSaving] = useState(false);

  const [totals, setTotalsLocal] = useState<TotalsRow | null>(null);
  const [latest, setLatest] = useState<LatestCorrectRow | null>(null);
  const [leader, setLeader] = useState<LeaderRow[]>([]);

  const isSubscribed = !!profileTier;

  // bootstrap
  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr(null);

        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id ?? null; setUserId(uid);

        if (uid) {
          const { data: mp } = await supabase.from("member_profiles").select("subscription_tier").eq("user_id", uid).maybeSingle();
          setProfileTier(mp?.subscription_tier ?? "free");
        } else setProfileTier(null);

        const todayStr = formatDateAdelaide(); setToday(todayStr);
        const { data: lc, error: lcErr } = await supabase
          .from("vocab_challenges")
          .select("id, word, description, explanation, options, correct, hint, date, category, difficulty, points")
          .eq("date", todayStr).maybeSingle();
        if (lcErr && lcErr.code !== "PGRST116") throw lcErr;
        setLesson((lc || null) as Lesson | null);

        if (uid) {
          const t = await supabase.from("vocab_user_totals").select("user_id, total_points, lessons_correct").eq("user_id", uid).maybeSingle();
          if (!t.error && t.data) setTotalsLocal(t.data as TotalsRow);
          const l = await supabase.from("vocab_user_latest_correct").select("user_id, streak_after, lesson_date, completed_at").eq("user_id", uid).maybeSingle();
          if (!l.error && l.data) setLatest(l.data as LatestCorrectRow);
          const lb = await supabase.from("vocab_leaderboard_30d").select("user_id, points_30d, correct_30d").limit(5);
          if (Array.isArray(lb.data)) setLeader(lb.data as LeaderRow[]);
        }
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally { setLoading(false); }
    })();
  }, []);

  const handleJoinFree = async () => {
    if (!userId) { alert("Please sign in first."); return; }
    const { error } = await supabase.from("member_profiles").upsert({ user_id: userId, subscription_tier: "free" }, { onConflict: "user_id" });
    if (error) { alert(error.message); return; }
    setProfileTier("free");
  };

  // --- Award points with RPCs + REST fallback + optimistic UI
  async function awardPoints({ isCorrect }: { isCorrect: boolean }) {
    const base = isCorrect ? (lesson?.points ?? 10) : 0;
    const term = lesson?.word ?? DEMO_TERM;

    // 1) award by vocab id
    if (lesson?.id) {
      const r1 = await supabase.rpc("award_vocab_points", { p_vocab: lesson.id, p_correct: isCorrect });
      if (!r1.error) {
        const row = (r1.data?.[0] ?? {}) as { points_awarded?: number; streak_after?: number };
        return { awarded: row.points_awarded ?? base, streak: row.streak_after ?? (isCorrect ? currentStreak + 1 : currentStreak) };
      }
    }

    // 2) canonical vv_award_points(term, was_correct, points)
    const r2 = await supabase.rpc("vv_award_points", { term, was_correct: isCorrect, points: base });
    if (!r2.error) {
      const row = (r2.data?.[0] ?? {}) as { points_awarded?: number; streak_after?: number };
      return { awarded: row.points_awarded ?? base, streak: row.streak_after ?? (isCorrect ? currentStreak + 1 : currentStreak) };
    }

    // 3) compatibility vv_award_points(p_points, p_term, p_was_correct)
    const r3 = await supabase.rpc("vv_award_points", { p_points: base, p_term: term, p_was_correct: isCorrect });
    if (!r3.error) {
      const row = (r3.data?.[0] ?? {}) as { points_awarded?: number; streak_after?: number };
      return { awarded: row.points_awarded ?? base, streak: row.streak_after ?? (isCorrect ? currentStreak + 1 : currentStreak) };
    }

    // 4) REST fallback — direct tables (requires permissive RLS for user_id = auth.uid())
    const uid = userId;
    if (!uid) return { awarded: base, streak: isCorrect ? currentStreak + 1 : currentStreak };

    // totals
    const t = await supabase.from("vocab_user_totals").select("total_points, lessons_correct").eq("user_id", uid).maybeSingle();
    if (!t.error) {
      const newTotals = (t.data?.total_points ?? 0) + base;
      const newCorrects = (t.data?.lessons_correct ?? 0) + (isCorrect ? 1 : 0);
      if (t.data) {
        await supabase.from("vocab_user_totals").update({ total_points: newTotals, lessons_correct: newCorrects }).eq("user_id", uid);
      } else {
        await supabase.from("vocab_user_totals").insert({ user_id: uid, total_points: newTotals, lessons_correct: newCorrects });
      }
    }

    // streak
    let streak = currentStreak;
    const s = await supabase.from("vocab_user_latest_correct").select("streak_after").eq("user_id", uid).maybeSingle();
    if (!s.error) streak = s.data?.streak_after ?? 0;
    if (isCorrect) streak = streak + 1;

    await supabase.from("vocab_user_latest_correct").upsert(
      { user_id: uid, streak_after: streak, lesson_date: formatDateAdelaide(), completed_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    return { awarded: base, streak };
  }

  const handleAnswer = async (idx: number) => {
    if (!lesson?.options) return;

    const chosen = lesson.options[idx];
    const isCorrect = !!lesson.correct && chosen === lesson.correct;

    setSelected(idx);
    setSaving(true);
    setErr(null);

    try {
      let awarded = 0;
      let streak = currentStreak;

      if (isSubscribed && userId) {
        const res = await awardPoints({ isCorrect });
        awarded = res.awarded;
        streak = res.streak;

        // ✅ Optimistic UI: bump context + sidebar immediately
        applyDelta(awarded, streak);
        setTotalsLocal(prev => {
          const baseTotals = prev?.total_points ?? totalPoints;
          const baseCorrect = prev?.lessons_correct ?? 0;
          return {
            user_id: userId,
            total_points: baseTotals + awarded,
            lessons_correct: baseCorrect + (isCorrect ? 1 : 0),
          } as TotalsRow;
        });
        setLatest({
          user_id: userId,
          streak_after: streak,
          lesson_date: today,
          completed_at: new Date().toISOString(),
        });

        // Then sync from server (ensures we match DB if policies/logic differ)
        void refreshPoints();
        const t = await supabase.from("vocab_user_totals").select("user_id, total_points, lessons_correct").eq("user_id", userId).maybeSingle();
        if (!t.error && t.data) setTotalsLocal(t.data as TotalsRow);
        const l = await supabase.from("vocab_user_latest_correct").select("user_id, streak_after, lesson_date, completed_at").eq("user_id", userId).maybeSingle();
        if (!l.error && l.data) setLatest(l.data as LatestCorrectRow);
      }

      setResult({
        correct: isCorrect,
        points: isSubscribed ? (awarded ?? 0) : 0,
        streak,
        explain: lesson?.explanation ?? (isCorrect ? "Nice – locked in." : "Not quite. Read the why, then try tomorrow."),
      });
    } catch (e: any) {
      setResult({
        correct: isCorrect,
        points: 0,
        streak: currentStreak,
        explain: lesson?.explanation ?? (isCorrect ? "Nice – locked in." : "Not quite. Read the why, then try tomorrow."),
      });
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const resetSelection = () => { setSelected(null); setResult(null); };

  const selectedDemo = useMemo(() => (selected == null ? null : DEMO_OPTIONS[selected] ?? null), [selected]);
  const termForPrompt = lesson?.word ?? DEMO_TERM;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <Header userId={userId} onSignOut={async () => { await supabase.auth.signOut(); window.location.reload(); }} />

      {/* Intro */}
      <div className="mt-4 md:mt-6 rounded-2xl bg-white p-4 md:p-5 shadow ring-1 ring-neutral-200">
        <p className="text-sm md:text-base leading-relaxed text-neutral-700">
          Confidence in wine tasting often comes down to having the right vocabulary at your
          fingertips—to describe what you’re seeing, smelling and tasting (texture and structure included).
          I’ve put this program together to share 600+ words I reach for when I taste, so you can bank them one tidy word a day.
        </p>
      </div>

      {err && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{err}</div>}

      {/* main grid */}
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
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded-2xl border border-neutral-200 bg-neutral-50" />)}
              </div>
            </div>
          ) : (
            <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
              className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-neutral-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-400">{today}</div>
                  <h2 className="mt-1 text-2xl font-semibold text-neutral-900">{(lesson?.word ?? DEMO_TERM) || "No lesson scheduled"}</h2>
                  <div className="mt-2 text-neutral-600 leading-relaxed">
                    {lesson?.description ?? `“${DEMO_TERM}” describes a bright, youthful red core most common in younger red wines; with age it trends toward garnet at the rim.`}
                  </div>

                  {/* points + streak mini (now reflect optimistic changes) */}
                  <div className="mt-4 flex items-center gap-6 text-sm sm:text-base">
                    <div className="text-center"><div className="font-semibold">Points</div><div className="text-2xl font-bold">{totalPoints}</div></div>
                    <div className="w-px h-8 bg-black/10" />
                    <div className="text-center"><div className="font-semibold">Streak</div><div className="text-2xl font-bold">{currentStreak}🔥</div></div>
                  </div>
                </div>
                <LessonMeta lesson={lesson} />
              </div>

              {/* hint */}
              {lesson?.hint && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600 ring-1 ring-neutral-200">
                  <Info className="h-3.5 w-3.5" /> {lesson.hint}
                </div>
              )}

              {/* prompt line */}
              <div className="mt-6 text-base font-semibold text-neutral-900">
                Which statement best represents <span className="italic">{termForPrompt}</span>?
              </div>

              {/* options */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(lesson?.options ?? DEMO_OPTIONS.map(o => o.text)).map((opt, i) => {
                  const isChosen = selected === i;
                  const isRight = result?.correct && (lesson?.correct ? lesson.correct === opt : DEMO_OPTIONS[i]?.correct);
                  const isWrong = isChosen && result && !result.correct;
                  return (
                    <button
                      key={i}
                      onClick={() => (result ? undefined : handleAnswer(i))}
                      className={cn(
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
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold"
                          style={{ borderColor: result ? "transparent" : "rgba(0,0,0,0.2)" }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt}</span>
                        <span className="ml-auto">
                          {result && (lesson?.correct ? lesson.correct === opt : DEMO_OPTIONS[i]?.correct) && <Check className="h-4 w-4" />}
                          {result && isWrong && <X className="h-4 w-4" />}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* feedback */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.25 }}
                    className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {result.correct ? (<><CheckCircle2 className="h-5 w-5" /><span className="font-semibold">Correct!</span></>) :
                        (<><AlertTriangle className="h-5 w-5" /><span className="font-semibold">Not quite.</span></>)}

                      {isSubscribed ? (
                        <span className="ml-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-200 text-sm font-semibold">
                          <Trophy className="h-4 w-4" /> +{result.points} pts
                        </span>
                      ) : (
                        <span className="ml-3 inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-neutral-700 text-sm">
                          <Lock className="h-4 w-4" /> Sign in & join free to save points
                        </span>
                      )}

                      {result.streak > 1 && (
                        <span className="ml-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-orange-700 ring-1 ring-orange-200 text-sm font-semibold">
                          <Flame className="h-4 w-4" /> Streak {result.streak}
                        </span>
                      )}
                    </div>

                    {lesson?.explanation && <p className="mt-3 text-sm leading-relaxed text-neutral-700">{lesson.explanation}</p>}
                    {!lesson?.explanation && selectedDemo && <p className="mt-3 text-sm leading-relaxed text-neutral-700">{selectedDemo.explain}</p>}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button onClick={resetSelection} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50">Try again</button>

                      {!isSubscribed && (userId ? (
                        <button onClick={handleJoinFree} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800">Join free – save my streak</button>
                      ) : (<div className="text-sm text-neutral-600">Sign in above to join free.</div>))}
                      {saving && <div className="text-sm text-neutral-500">Saving…</div>}
                    </div>

                    {/* NEW: Next challenge shortcuts */}
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <a href="/swirlde" className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
                        Play Swirlde <ArrowRight className="h-4 w-4" />
                      </a>
                      <a href="/daily-wine-quiz" className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
                        Daily Wine Quiz <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* sidebar */}
        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-neutral-200">
          <div className="flex items-center gap-2 text-neutral-800"><Trophy className="h-5 w-5 text-amber-500" /><h3 className="text-lg font-semibold">Your stats</h3></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-xs text-neutral-500">Total points</div>
              <div className="mt-1 text-2xl font-semibold">{(totals?.total_points ?? totalPoints)}</div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-xs text-neutral-500">Current streak</div>
              <div className="mt-1 text-2xl font-semibold">{(latest?.streak_after ?? currentStreak)}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 text-neutral-800"><Flame className="h-5 w-5 text-orange-500" /><h4 className="font-semibold">Leaderboard (30d)</h4></div>
            <ol className="mt-3 space-y-2">
              {leader?.length ? leader.map((row, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold">{idx + 1}</span>
                    <span className="text-neutral-700">{row.user_id.slice(0, 6)}…</span>
                  </div>
                  <div className="flex items-center gap-3"><span className="text-neutral-500">{row.correct_30d}✔</span><span className="font-semibold text-neutral-800">{row.points_30d} pts</span></div>
                </li>
              )) : <li className="text-sm text-neutral-500">No entries yet.</li>}
            </ol>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="mt-8 flex items-center justify-between text-xs text-neutral-500">
        <div>Built in the Matt Decanted vibe · {tzAdelaide} · {today}</div>
        <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Keep it tidy. One word a day.</div>
      </div>
    </div>
  );
}

// ---------- Default export ----------
export default function VinoVocabPage() {
  return (
    <PointsProvider>
      <VinoVocabInner />
    </PointsProvider>
  );
}
