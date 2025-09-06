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
  Eye,
  Target,
  Users,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";
import { useAnalytics } from "@/context/AnalyticsContext";
import { useLocale } from "@/context/LocaleContext";

import PointsGainBubble from "@/components/PointsGainBubble";
import LevelUpBanner from "@/components/LevelUpBanner";
import VideoPlayer from "@/components/VideoPlayer";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import { awardPoints } from "@/lib/points";

/* ---------- DB types ---------- */
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
  reveal_video_url: string | null;
};

type AttemptInsert = {
  user_id: string;
  bank_id: string;
  selected_index: number;
  is_correct: boolean;
};

/* ---------- Helpers ---------- */
function bottlePlaceholder() {
  const w = 1200, h = 675;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffb26b"/><stop offset="100%" stop-color="#ff8c3b"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <g fill="rgba(255,255,255,0.12)"><circle cx="${w*0.23}" cy="${h*0.78}" r="160"/>
      <circle cx="${w*0.88}" cy="${h*0.22}" r="120"/></g>
    <g transform="translate(${w/2}, ${h/2})">
      <rect x="-55" y="-90" width="110" height="180" rx="10" fill="white" fill-opacity="0.85"/>
      <rect x="-10" y="-170" width="20" height="60" rx="5" fill="white" fill-opacity="0.85"/>
    </g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const shuffle = <T,>(arr: T[]) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ---------- Local, Bolt-style option row ---------- */
function OptionRow({
  letter,
  label,
  selected,
  onClick,
  index,
}: {
  letter: string;
  label: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-opt-index={index}
      data-opt-selected={selected ? "true" : undefined}
      className={[
        "w-full text-left rounded-md border px-4 py-3 transition-all",
        "bg-white hover:bg-gray-50",
        selected
          ? "border-blue-500 ring-2 ring-blue-500/40"
          : "border-gray-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
      ].join(" ")}
      aria-pressed={selected}
    >
      <span className="mr-2 font-semibold text-gray-600">{letter}.</span>
      <span className="text-gray-900">{label}</span>
    </button>
  );
}

/* ==================================================================== */
export default function GuessWhatPage() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const { resolvedLocale } = useLocale();
  const analytics = useAnalytics() as any;
  const pointsCtx = (usePoints() as any) || {};
  const refreshPoints: undefined | (() => Promise<void>) = pointsCtx?.refreshPoints;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BankRow[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [finished, setFinished] = useState(false);

  const [justGained, setJustGained] = useState(0);
  const [levelOpen, setLevelOpen] = useState(false);
  const [levelMsg, setLevelMsg] = useState("Nice work—content unlocked!");

  const optionsWrapRef = useRef<HTMLDivElement>(null);

  /* Load questions (prefer locale then en) */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const locales = Array.from(new Set([resolvedLocale, "en"].filter(Boolean)));
        const { data, error } = await supabase
          .from("guess_what_bank")
          .select("*")
          .eq("active", true)
          .in("locale", locales)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const prioritized = (data || []).sort((a: BankRow, b: BankRow) => {
          const as = a.locale === resolvedLocale ? 0 : 1;
          const bs = b.locale === resolvedLocale ? 0 : 1;
          return as - bs;
        });

        const pick = shuffle(prioritized).slice(0, Math.min(6, prioritized.length));
        setRows(pick);
        setAnswers(Array(pick.length).fill(undefined));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load Guess What");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedLocale]);

  /* Autofocus */
  useEffect(() => {
    if (!optionsWrapRef.current || finished) return;
    const selectedIdx = answers[current];
    const sel = optionsWrapRef.current.querySelector<HTMLButtonElement>(
      selectedIdx !== undefined
        ? `button[data-opt-selected="true"]`
        : `button[data-opt-index="0"]`
    );
    sel?.focus();
  }, [current, finished, answers]);

  const currentRow = rows[current];
  const optionsCount = currentRow?.options?.length ?? 0;

  useQuizKeyboard({
    enabled: !finished && optionsCount > 0,
    optionsCount,
    onSelect: (idx) => handleSelect(idx),
    onNext: () => handleNext(),
    allowNext: answers[current] !== undefined,
  });

  const correctCount = useMemo(
    () =>
      rows.reduce((n, r, i) => {
        const c = r.correct_index ?? -1;
        return n + (answers[i] === c ? 1 : 0);
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
        const ok = answers[i] === (r.correct_index ?? -1);
        return sum + (ok ? Number(r.points_award ?? 0) : 0);
      }, 0),
    [rows, answers]
  );

  const revealUrl = useMemo(
    () => rows.find((r) => r.reveal_video_url)?.reveal_video_url || null,
    [rows]
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
      const attempts: AttemptInsert[] = rows.map((r, i) => ({
        user_id: user.id,
        bank_id: r.id,
        selected_index: answers[i] as number,
        is_correct: (answers[i] as number) === (r.correct_index ?? -1),
      }));
      if (attempts.length) {
        const { error: aErr } = await supabase.from("guess_what_attempts").insert(attempts);
        if (aErr) throw aErr;
      }

      if (pointsEarned > 0) {
        const roundRef = `${Date.now()}::${rows.map((r) => r.id).join(",")}`;
        await awardPoints("guess_what", roundRef, {
          total_questions: rows.length,
          correct: correctCount,
          locale: resolvedLocale,
          bank_ids: rows.map((r) => r.id),
          detail: rows.map((r, i) => ({
            bank_id: r.id,
            selected_index: answers[i],
            correct_index: r.correct_index,
            awarded:
              answers[i] === (r.correct_index ?? -1) ? Number(r.points_award ?? 0) : 0,
          })),
        });
        setJustGained((n) => n + pointsEarned);
        if (typeof refreshPoints === "function") await refreshPoints();
        toast.success(`Nice! +${pointsEarned} points from Guess What`);
      }
    } catch (e) {
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
      analytics?.track?.("guess_what_complete", {
        total: rows.length,
        correct: correctCount,
        points_earned: pointsEarned,
      });
    }
  }

  /* ---------- Loading / empty ---------- */
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
          <CardHeader><CardTitle className="text-2xl">Guess What</CardTitle></CardHeader>
          <CardContent className="p-8 text-center">
            <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No questions found for your language yet. Try switching languages or check back soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Page ---------- */
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top bar */}
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

      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Guess What</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly blind tasting challenges where you guess alongside Matt. Make your picks and rack up points.
          </p>
        </CardHeader>
      </Card>

      {/* How it works (Bolt-style 4 tiles) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HowItWorksTile
            icon={<Eye className="w-4 h-4" />}
            title="Watch Matt"
            text="See Matt’s blind tasting notes and descriptors."
          />
          <HowItWorksTile
            icon={<Target className="w-4 h-4" />}
            title="Make Guesses"
            text="Answer questions about grape, style, and region."
          />
          <HowItWorksTile
            icon={<Users className="w-4 h-4" />}
            title="See Matt’s Guess"
            text="Compare your answers with Matt’s predictions."
          />
          <HowItWorksTile
            icon={<Play className="w-4 h-4" />}
            title="Big Reveal"
            text="Discover the actual wine and who got it right!"
          />
        </CardContent>
      </Card>

      {/* Game */}
      {!finished ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
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

            {/* Image */}
            <div className="rounded-lg overflow-hidden bg-muted/40 border">
              {currentRow?.image_url ? (
                <img src={currentRow.image_url} alt="Question illustration" className="w-full h-48 object-cover" loading="lazy" />
              ) : (
                <img src={bottlePlaceholder()} alt="Placeholder" className="w-full h-48 object-cover" loading="lazy" />
              )}
            </div>

            {/* Prompt */}
            <h3 className="text-[15px] font-semibold text-gray-900">{currentRow?.prompt}</h3>

            {/* Options (Bolt style) */}
            <div className="space-y-2" ref={optionsWrapRef}>
              {(currentRow?.options || ["True", "False"]).map((opt, idx) => {
                const selected = answers[current] === idx;
                return (
                  <OptionRow
                    key={idx}
                    letter={String.fromCharCode(65 + idx)}
                    label={opt}
                    selected={!!selected}
                    onClick={() => handleSelect(idx)}
                    index={idx}
                  />
                );
              })}
            </div>

            {/* Nav */}
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button onClick={handleNext} disabled={answers[current] === undefined}>
                {current === rows.length - 1 ? (
                  <>
                    Finish
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next Question
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Reveal video (optional) */}
          {revealUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reveal Video</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-xl overflow-hidden">
                  <VideoPlayer url={revealUrl} controls light />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                Results
                <Badge variant="secondary" className="ml-1">{pointsEarned} pts</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{correctCount}/{rows.length}</div>
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
                  const userIdx = answers[i];
                  const correctIdx = r.correct_index ?? -1;
                  const ok = userIdx === correctIdx;
                  return (
                    <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="font-medium text-gray-900 mb-3">{r.prompt}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className={`p-3 rounded-lg ${ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                          <div className="flex items-center mb-1">
                            {ok ? <CheckCircle className="w-4 h-4 text-green-600 mr-2" /> : <XCircle className="w-4 h-4 text-red-600 mr-2" />}
                            <span className="font-medium text-sm">Your Answer</span>
                          </div>
                          <div className={ok ? "text-green-800" : "text-red-800"}>
                            {r.options?.[userIdx as number] ?? "—"}
                          </div>
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
                <Button variant="outline" onClick={() => navigate("/play")} className="inline-flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Challenges
                </Button>
                <Button
                  onClick={() => {
                    const reshuffled = shuffle(rows);
                    setRows(reshuffled);
                    setAnswers(Array(reshuffled.length).fill(undefined));
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
        </>
      )}

      {justGained > 0 && <PointsGainBubble amount={justGained} onDone={() => setJustGained(0)} />}

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

/* ---------- small tile ---------- */
function HowItWorksTile({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-white p-3">
      <div className="mt-0.5 rounded-md bg-blue-50 text-blue-700 p-2">{icon}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-gray-600">{text}</div>
      </div>
    </div>
  );
}
