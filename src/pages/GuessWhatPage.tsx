// src/pages/GuessWhatPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Trophy,
  Globe,
  HelpCircle,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";
import { useAnalytics } from "@/context/AnalyticsContext";
import { useLocale } from "@/context/LocaleContext";

import ChoiceButton from "@/components/ui/ChoiceButton";
import BrandButton from "@/components/ui/BrandButton";
import PointsGainBubble from "@/components/PointsGainBubble";
import LevelUpBanner from "@/components/LevelUpBanner";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";

/** Optional: nice placeholder if a row has no image_url */
function bottlePlaceholder() {
  const w = 600,
    h = 400;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff8a00"/>
        <stop offset="100%" stop-color="#ff5e00"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <g fill="rgba(255,255,255,0.12)">
      <circle cx="${w * 0.2}" cy="${h * 0.8}" r="120"/>
      <circle cx="${w * 0.9}" cy="${h * 0.2}" r="90"/>
    </g>
    <g transform="translate(${w / 2}, ${h / 2})">
      <rect x="-45" y="-80" width="90" height="160" rx="8" fill="white" fill-opacity="0.85"/>
      <rect x="-8" y="-150" width="16" height="50" rx="4" fill="white" fill-opacity="0.85"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ========= Types aligned to your DB ========= */
type BankRow = {
  id: string;
  slug: string;
  locale: string;
  prompt: string;
  options: string[] | null;
  correct_index: number | null;
  image_url: string | null;
  points_award: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type AttemptInsert = {
  user_id: string;
  bank_id: string;
  selected_index: number;
  is_correct: boolean;
};

const shuffle = <T,>(arr: T[]) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function GuessWhatPage() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const { resolvedLocale } = useLocale();
  const { track } = useAnalytics();
  const { refreshPoints } = (usePoints() as any) || {};

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BankRow[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [finished, setFinished] = useState(false);

  const [justGained, setJustGained] = useState(0);
  const [levelOpen, setLevelOpen] = useState(false);
  const [levelMsg, setLevelMsg] = useState("Nice work—content unlocked!");

  const optionsWrapRef = useRef<HTMLDivElement>(null);

  /* -------- Load questions for locale with 'en' fallback -------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const locales = Array.from(new Set([resolvedLocale, "en"].filter(Boolean))) as string[];
        const { data, error } = await supabase
          .from("guess_what_bank")
          .select("*")
          .eq("active", true)
          .in("locale", locales)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const byLocaleFirst = (data || []).sort((a: BankRow, b: BankRow) => {
          const aScore = a.locale === resolvedLocale ? 0 : 1;
          const bScore = b.locale === resolvedLocale ? 0 : 1;
          return aScore - bScore;
        });

        // Shuffle and take up to 6 for a snappy round
        const pick = shuffle(byLocaleFirst).slice(0, Math.min(6, byLocaleFirst.length));
        setRows(pick);
        setAnswers(Array(pick.length).fill(null));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load Guess What");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedLocale]);

  /* -------- Auto-focus first (or selected) option on question change -------- */
  useEffect(() => {
    if (!optionsWrapRef.current || finished) return;
    const selectedIdx = answers[current];
    const sel = optionsWrapRef.current.querySelector<HTMLButtonElement>(
      selectedIdx != null ? `button[data-opt-selected="true"]` : `button[data-opt-index="0"]`
    );
    sel?.focus();
  }, [current, finished, answers]);

  const optionsCount = rows[current]?.options?.length ?? 0;

  useQuizKeyboard({
    enabled: !finished && optionsCount > 0,
    optionsCount,
    onSelect: (idx) => handleSelect(idx),
    onNext: () => handleNext(),
    allowNext: answers[current] != null,
  });

  const currentRow = rows[current];

  const correctCount = useMemo(
    () =>
      rows.reduce((n, r, i) => {
        const c = r.correct_index ?? -1;
        return n + ((answers[i] as number) === c ? 1 : 0);
      }, 0),
    [rows, answers]
  );

  const totalPotentialPoints = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.points_award ?? 0), 0),
    [rows]
  );

  const pointsEarned = useMemo(
    () =>
      rows.reduce((sum, r, i) => {
        const ok = (answers[i] as number) === (r.correct_index ?? -1);
        return sum + (ok ? Number(r.points_award ?? 0) : 0);
      }, 0),
    [rows, answers]
  );

  function handleSelect(index: number) {
    setAnswers((prev) => {
      const next = prev.slice();
      next[current] = index;
      return next;
    });
  }

  async function persistAttemptsAndPoints() {
    if (!user) return;

    try {
      // Save each attempt
      const payload: AttemptInsert[] = rows.map((r, i) => {
        const sel = answers[i] as number; // guaranteed by UI gating
        return {
          user_id: user.id,
          bank_id: r.id,
          selected_index: sel,
          is_correct: sel === (r.correct_index ?? -1),
        };
      });

      if (payload.length) {
        const { error: aErr } = await supabase.from("guess_what_attempts").insert(payload);
        if (aErr) throw aErr;
      }

      // Award points
      if (pointsEarned > 0) {
        await supabase.from("points_ledger").insert([
          {
            user_id: user.id,
            points: pointsEarned,
            reason: "Guess What",
            meta: {
              count: rows.length,
              correct: correctCount,
              locale: resolvedLocale,
            },
          },
        ]);
        setJustGained((n) => n + pointsEarned);
        if (typeof refreshPoints === "function") await refreshPoints();

        toast.success(`Nice! +${pointsEarned} points from Guess What`);
      }
    } catch (e: any) {
      console.error("persistAttemptsAndPoints", e);
      toast.error("Could not save your results, but you can still continue.");
    }
  }

  async function handleNext() {
    if (current < rows.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      setFinished(true);
      await persistAttemptsAndPoints();
      track("guess_what_complete", {
        total: rows.length,
        correct: correctCount,
        points_earned: pointsEarned,
      });
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading Guess What…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/play")} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Challenges</span>
          </Button>
          <Badge variant="outline" className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            <span className="uppercase">{resolvedLocale}</span>
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Guess What</CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No questions found for your language yet. Try switching languages or check back soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ================== GAME ================== */
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/play")} className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Challenges</span>
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            <span>{totalPotentialPoints} pts available</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            <span className="uppercase">{resolvedLocale}</span>
          </Badge>
        </div>
      </div>

      {/* Warm hero */}
      <div className="rounded-2xl overflow-hidden border shadow-card bg-white">
        <div className="bg-gradient-to-br from-brand-300 to-brand-100 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-brand-900">Guess What</h1>
          <p className="mt-2 text-brand-900/80">
            Quick-fire blind tasting questions. Pick the most likely answer and rack up points.
          </p>
          <div className="mt-3 text-xs text-brand-900/70">
            {rows.length} questions • {totalPotentialPoints} total points
          </div>
        </div>
      </div>

      {/* In-progress OR Finished */}
      {!finished ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Question {current + 1} of {rows.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.round(((current + 1) / rows.length) * 100)}% Complete</span>
              </div>
              <Progress value={((current + 1) / rows.length) * 100} className="h-2" />
            </div>

            {/* Image (optional) */}
            <div className="rounded-lg overflow-hidden bg-muted/40 border">
              {currentRow?.image_url ? (
                <img
                  src={currentRow.image_url}
                  alt="Question context"
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              ) : (
                <img src={bottlePlaceholder()} alt="Placeholder" className="w-full h-48 object-cover" loading="lazy" />
              )}
            </div>

            {/* Prompt */}
            <h3 className="text-[15px] font-semibold text-gray-900">{currentRow?.prompt}</h3>

            {/* Options */}
            <div className="space-y-2" ref={optionsWrapRef}>
              {(currentRow?.options || ["True", "False"]).map((opt, idx) => {
                const selected = answers[current] === idx;
                return (
                  <ChoiceButton
                    key={idx}
                    label={opt}
                    index={idx}
                    state={selected ? "selected" : "idle"}
                    onClick={() => handleSelect(idx)}
                    dataIndex={idx}
                    dataSelected={selected}
                    autoFocus={selected ? true : idx === 0}
                  />
                );
              })}
            </div>

            {/* Nav */}
            <div className="mt-3 flex justify-end">
              <BrandButton onClick={handleNext} disabled={answers[current] == null} className="inline-flex items-center">
                {current === rows.length - 1 ? (
                  <>
                    Finish
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </BrandButton>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Results
              <Badge variant="secondary" className="ml-1">
                {pointsEarned} pts
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {correctCount}/{rows.length}
                </div>
                <div className="text-green-800 font-medium">Correct</div>
              </div>
              <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-2xl font-bold text-amber-700">{pointsEarned}</div>
                <div className="text-amber-800 font-medium">Points Earned</div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-4">
              {rows.map((r, i) => {
                const userIdx = answers[i] as number;
                const correctIdx = r.correct_index ?? -1;
                const ok = userIdx === correctIdx;
                return (
                  <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="font-medium text-gray-900 mb-3">{r.prompt}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className={`p-3 rounded-lg ${ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                        <div className="flex items-center mb-1">
                          {ok ? (
                            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 mr-2" />
                          )}
                          <span className="font-medium text-sm">Your Answer</span>
                        </div>
                        <div className={ok ? "text-green-800" : "text-red-800"}>{r.options?.[userIdx] ?? "—"}</div>
                      </div>

                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          <span className="font-medium text-sm">Correct Answer</span>
                        </div>
                        <div className="text-gray-900">{r.options?.[correctIdx] ?? "—"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <BrandButton onClick={() => navigate("/play")} className="inline-flex items-center justify-center">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Challenges
              </BrandButton>
              <Button
                variant="outline"
                onClick={() => {
                  const reshuffled = shuffle(rows);
                  setRows(reshuffled);
                  setAnswers(Array(reshuffled.length).fill(null));
                  setCurrent(0);
                  setFinished(false);
                  setJustGained(0);
                }}
                className="inline-flex items-center justify-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Float-in “+points” chip */}
      {justGained > 0 && <PointsGainBubble amount={justGained} onDone={() => setJustGained(0)} />}

      {/* 🎉 Level-up banner (kept, you can trigger off real gates later) */}
      <LevelUpBanner
        open={levelOpen}
        onClose={() => setLevelOpen(false)}
        message={levelMsg}
        ctaText="Explore More"
        ctaHref="/play"
      />
    </div>
  );
}
