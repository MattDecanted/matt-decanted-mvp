// FILE: src/pages/VinoVocabPage.tsx
// Layout: banner + COLOUR chip + Ruby lesson + MCQ with "Which statement best applies to {TERM}"
// Points: uses existing PointsContext (user_points). Awards via vv_award_points() -> falls back to upserting user_points.
// Streak: fetch via vv_get_user_stats() -> falls back to localStorage-based streak per user.
// Imports are RELATIVE to avoid alias issues on Netlify.

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { usePoints as useVocabPoints } from "../context/PointsContext"; // singular 'context'
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, AlertTriangle } from "lucide-react";

// --- THEME: switch to "green" if you want a green banner/buttons
const THEME: "orange" | "green" = "orange";
const themeClasses = {
  orange: {
    banner: "bg-orange-50 border-orange-200 text-orange-900",
    chip: "bg-orange-100 text-orange-800",
    button: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  green: {
    banner: "bg-green-50 border-green-200 text-green-900",
    chip: "bg-green-100 text-green-800",
    button: "bg-green-600 hover:bg-green-700 text-white",
  },
}[THEME];

// --- Today's term (swap later to be dynamic)
const TERM = "Ruby";
const QUESTION = `Which statement best applies to ${TERM}?`;

const OPTIONS = [
  {
    id: "A",
    text:
      "Typically a medium to deep red hue seen in youthful red wines like Pinot Noir and Grenache.",
    correct: true,
    explain:
      "Ruby describes a clear, bright red core common in younger reds (e.g. Pinot Noir, Grenache); it fades toward garnet with age.",
  },
  { id: "B", text: "A pale onion-skin tint typical of aged rosé wines.", correct: false, explain: "That’s rosé development, not ruby reds." },
  { id: "C", text: "An amber-gold colour associated with mature white wines.", correct: false, explain: "Amber/gold = oxidative whites, not ruby reds." },
  { id: "D", text: "A deep purple-black shade most common in very old Cabernet Sauvignon.", correct: false, explain: "Old Cabs trend to garnet/brick, not purple-black." },
];

// ----- Local streak fallback (client-side) -----
type LocalStreak = { lastCorrectISO: string; count: number };
const localStreakKey = (uid?: string | null) => `vv_streak_${uid ?? "anon"}`;
const isoDate = (d = new Date()) => d.toISOString().slice(0, 10); // YYYY-MM-DD
const daysBetween = (aISO: string, bISO: string) => {
  const a = new Date(`${aISO}T00:00:00`), b = new Date(`${bISO}T00:00:00`);
  return Math.round((+b - +a) / (1000 * 60 * 60 * 24));
};

export default function VinoVocabPage() {
  const { user } = useAuth();
  const { totalPoints, refreshPoints } = useVocabPoints();

  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<null | { correct: boolean; explain: string }>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = useMemo(() => OPTIONS.find((o) => o.id === choice) || null, [choice]);

  // Try server streak first; if not available, fall back to localStorage
  const fetchStreak = async () => {
    try {
      const { data, error } = await supabase.rpc("vv_get_user_stats");
      if (!error && Array.isArray(data) && data.length > 0 && typeof data[0]?.current_streak === "number") {
        setCurrentStreak(data[0].current_streak);
        return;
      }
    } catch {
      // ignore and use local
    }
    // local fallback
    const raw = localStorage.getItem(localStreakKey(user?.id));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LocalStreak;
        const today = isoDate();
        const delta = daysBetween(parsed.lastCorrectISO, today);
        // If they haven't answered today, don't auto-increment; just show stored count if still contiguous
        setCurrentStreak(delta <= 1 ? parsed.count : 0);
      } catch {
        setCurrentStreak(0);
      }
    } else {
      setCurrentStreak(0);
    }
  };

  useEffect(() => { void fetchStreak(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  // Award points: try RPC; on failure, atomically upsert user_points as a fallback
  const awardPoints = async (wasCorrect: boolean, pointsToAward: number) => {
    // Primary: server RPC (tracks proper per-day progress if you've installed it)
    try {
      const { error } = await supabase.rpc("vv_award_points", {
        p_term: TERM,
        p_was_correct: wasCorrect,
        p_points: pointsToAward,
      });
      if (!error) return;
      // If RPC returns an error, fall through to fallback
      // eslint-disable-next-line no-empty
    } catch {}

    // Fallback: increment user_points.total_points client-side (no streak persistence)
    if (!user?.id || !wasCorrect || pointsToAward <= 0) return;

    // Ensure a row exists; then increment safely
    // 1) Upsert row if missing
    await supabase.from("user_points").upsert(
      { user_id: user.id, total_points: 0 },
      { onConflict: "user_id" }
    );
    // 2) Increment total_points
    await supabase.rpc("increment_user_points", {
      p_user_id: user.id,
      p_delta: pointsToAward,
    }).catch(async () => {
      // If increment function doesn't exist, do a direct update as a last resort
      const { data: row } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();
      const current = row?.total_points ?? 0;
      await supabase
        .from("user_points")
        .update({ total_points: current + pointsToAward })
        .eq("user_id", user.id);
    });
  };

  // Update local streak fallback on correct answer
  const bumpLocalStreak = () => {
    const key = localStreakKey(user?.id);
    const today = isoDate();
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify({ lastCorrectISO: today, count: 1 } as LocalStreak));
      return 1;
    }
    try {
      const parsed = JSON.parse(raw) as LocalStreak;
      const delta = daysBetween(parsed.lastCorrectISO, today);
      let next = 1;
      if (delta === 0) {
        next = parsed.count; // already answered today; keep the same
      } else if (delta === 1) {
        next = parsed.count + 1; // consecutive day
      } else {
        next = 1; // reset
      }
      localStorage.setItem(key, JSON.stringify({ lastCorrectISO: today, count: next } as LocalStreak));
      return next;
    } catch {
      localStorage.setItem(key, JSON.stringify({ lastCorrectISO: today, count: 1 } as LocalStreak));
      return 1;
    }
  };

  const onSubmit = async () => {
    if (!selected) return;
    setBusy(true);
    setErr(null);

    const wasCorrect = !!selected.correct;
    const pointsToAward = wasCorrect ? 10 : 0;

    try {
      await awardPoints(wasCorrect, pointsToAward);
      setSubmitted(true);
      setResult({ correct: wasCorrect, explain: selected.explain });

      // Refresh points (server)
      await refreshPoints();

      // Refresh streak: try server; if server not ready, bump + read local
      try {
        await fetchStreak();
      } catch {
        // use local fallback if fetch failed
        if (wasCorrect) {
          const s = bumpLocalStreak();
          setCurrentStreak(s);
        }
      }
    } catch (e: any) {
      setErr(e?.message ?? "Error submitting answer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      {/* Top banner with Points + Streak (theme via THEME) */}
      <div className={`mb-6 rounded-2xl border ${themeClasses.banner} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${themeClasses.chip}`}>
              COLOUR
            </span>
            <h1 className="text-xl sm:text-2xl font-bold">Vino Vocab Daily</h1>
          </div>
          <div className="flex items-center gap-4 text-sm sm:text-base">
            <div className="text-center">
              <div className="font-semibold">Points</div>
              <div className="text-2xl font-bold">{totalPoints}</div>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div className="text-center">
              <div className="font-semibold">Streak</div>
              <div className="text-2xl font-bold">{currentStreak}🔥</div>
            </div>
          </div>
        </div>
      </div>

      {/* Term header */}
      <div className="mb-2 text-sm uppercase tracking-wide font-bold">Colour</div>
      <div className="mb-6 text-3xl font-extrabold">{TERM}</div>
      <p className="mb-8 text-base text-black/70">
        Confidence in wine tasting often comes down to vocabulary. “{TERM}” describes a bright,
        youthful red core most common in younger red wines; with age it trends toward garnet at the rim.
      </p>

      {/* Question card */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-4 text-lg font-semibold">{QUESTION}</div>
        <div className="space-y-3">
          {OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition focus-within:ring-2 focus-within:ring-offset-2 ${
                choice === opt.id
                  ? "border-black/30 shadow-sm"
                  : "border-black/10 hover:border-black/20"
              }`}
            >
              <input
                type="radio"
                name={`vv-${TERM}-q`}
                className="mt-1"
                checked={choice === opt.id}
                onChange={() => setChoice(opt.id)}
                disabled={submitted}
              />
              <div>
                <div className="font-medium">
                  {opt.id}. {opt.text}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onSubmit}
            disabled={!choice || submitted || busy}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${themeClasses.button} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Submit
          </button>

          {submitted && result && (
            <div className="flex items-center gap-2 text-sm">
              {result.correct ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Correct!</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Not quite.</span>
                </>
              )}
              <span className="text-black/70">{result.explain}</span>
            </div>
          )}

          {err && <div className="text-sm text-red-600">{err}</div>}
        </div>
      </div>
    </div>
  );
}
