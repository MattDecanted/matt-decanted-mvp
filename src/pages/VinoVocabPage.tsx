// FILE: src/pages/VinoVocabPage.tsx
// Minimal Vino Vocab page with:
// - Aliased usePoints import (useVocabPoints) to avoid name collisions
// - Points + Streak banner (themeable: orange/green)
// - Bold COLOUR label + Ruby lesson
// - MCQ: “Which statement best applies to Ruby?”
// - Supabase RPC calls: vv_award_points (awards 10 on correct), vv_get_user_stats via provider

import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePoints as useVocabPoints } from "@/contexts/PointsContext"; // <-- aliased to prevent conflicts
import { CheckCircle2, AlertTriangle } from "lucide-react";

// --- THEME: change to "green" to switch banner/button accents ---
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

// --- Demo content (edit later if needed) ---
const TERM = "Ruby";
const QUESTION = "Which statement best applies to Ruby?";
const OPTIONS = [
  {
    id: "A",
    text:
      "Typically a medium to deep red hue seen in youthful red wines like Pinot Noir and Grenache.",
    correct: true,
    explain:
      "Ruby describes a clear, bright red core common in younger reds (e.g. Pinot Noir, Grenache); it fades toward garnet with age.",
  },
  {
    id: "B",
    text: "A pale onion-skin tint typical of aged rosé wines.",
    correct: false,
    explain: "Onion-skin aligns with older rosé, not ruby reds.",
  },
  {
    id: "C",
    text: "An amber-gold colour associated with mature white wines.",
    correct: false,
    explain: "Amber/gold indicates oxidative development in whites, not ruby reds.",
  },
  {
    id: "D",
    text:
      "A deep purple-black shade most common in very old Cabernet Sauvignon.",
    correct: false,
    explain:
      "Very old Cabernets lose purple/black intensity, trending to garnet/brick rather than ruby.",
  },
];

export default function VinoVocabPage() {
  const { totalPoints, currentStreak, refreshPoints } = useVocabPoints(); // aliased hook
  const [choice, setChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<null | { correct: boolean; explain: string }>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = useMemo(
    () => OPTIONS.find((o) => o.id === choice) || null,
    [choice]
  );

  const onSubmit = async () => {
    if (!selected) return;
    setBusy(true);
    setErr(null);

    const wasCorrect = !!selected.correct;
    const pointsToAward = wasCorrect ? 10 : 0;

    const { error } = await supabase.rpc("vv_award_points", {
      p_term: TERM,
      p_was_correct: wasCorrect,
      p_points: pointsToAward,
    });

    if (error) {
      setErr(error.message);
    } else {
      setSubmitted(true);
      setResult({ correct: wasCorrect, explain: selected.explain });
      await refreshPoints();
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      {/* Top banner with Points + Streak (colours adjustable via THEME) */}
      <div className={`mb-6 rounded-2xl border ${themeClasses.banner} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${themeClasses.chip}`}
            >
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
                name="ruby-q"
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
