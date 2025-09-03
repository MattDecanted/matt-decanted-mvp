// src/pages/ShortDetailPage.tsx
import React, { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, CheckCircle, ArrowLeft, Clock, FileDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";
import { useAnalytics } from "@/context/AnalyticsContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/** 🔒 Entitlements */
import { Gate, LockBadge } from "@/components/LockGate";
import type { Tier } from "@/lib/entitlements";

import { useShortProgress } from "@/hooks/useLocalProgress";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import PointsGainBubble from "@/components/PointsGainBubble";
import LevelUpBanner from "@/components/LevelUpBanner";
import { getLocaleCandidates } from "@/lib/locale";

// Lazy player + Suspense = avoids React error #310 in prod
import ReactPlayer from "react-player/lazy";

type Short = {
  id: string;
  slug: string;
  title: string;
  video_url: string;
  preview: boolean;
};

type ShortI18n = {
  locale: string;
  title: string | null;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
};

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  points_award: number;
};

type QuizState = {
  currentQuestion: number;
  answers: number[];
  showResults: boolean;
  correctCount: number;
};

type ShortMeta = {
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
};

export default function ShortDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [short, setShort] = useState<Short | null>(null);
  const [resolvedTitle, setResolvedTitle] = useState<string | null>(null);
  const [resolvedVideo, setResolvedVideo] = useState<string | null>(null);
  const [resolvedPdf, setResolvedPdf] = useState<string | null>(null);
  const [resolvedLocale, setResolvedLocale] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [videoWatched, setVideoWatched] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const { setPercent: saveLocalPercent } = useShortProgress(slug);

  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: [],
    showResults: false,
    correctCount: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  /** 🎉 UI bits */
  const [justGained, setJustGained] = useState<number>(0);
  const [levelOpen, setLevelOpen] = useState(false);
  const [levelMsg, setLevelMsg] = useState<string>(
    "You just crossed a points gate and unlocked more learning content."
  );

  /** 🔒 Gating */
  const [meta, setMeta] = useState<ShortMeta>({
    required_points: 0,
    required_tier: "free",
    is_active: true,
  });
  const [userPoints, setUserPoints] = useState<number>(0);

  const { user, profile } = useAuth() as any;
  const userTier: Tier = (profile?.membership_tier || "free") as Tier;

  const { refreshPoints, totalPoints } = (usePoints() as any) || {};
  const { track } = useAnalytics();

  const optionsWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) loadAll(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadAll(currSlug: string) {
    setLoading(true);
    try {
      // 1) Base short
      const { data: shortData, error: shortError } = await supabase
        .from("shorts")
        .select("*")
        .eq("slug", currSlug)
        .eq("is_published", true)
        .single();
      if (shortError) throw shortError;
      const base = shortData as Short;
      setShort(base);

      // 2) Meta gate
      const { data: metaData } = await supabase
        .from("content_shorts")
        .select("required_points, required_tier, is_active")
        .eq("slug", currSlug)
        .single();
      if (metaData) {
        setMeta({
          required_points: Number(metaData.required_points ?? 0),
          required_tier: (metaData.required_tier ?? "free") as Tier,
          is_active: Boolean(metaData.is_active ?? true),
        });
      }

      // 3) Locale resolution
      const candidates = getLocaleCandidates(profile?.locale ?? null);
      const { data: i18nRows } = await supabase
        .from("content_shorts_i18n")
        .select("locale, title, description, video_url, pdf_url")
        .eq("slug", currSlug)
        .in("locale", candidates);

      let chosen: ShortI18n | null = null;
      if (i18nRows && i18nRows.length) {
        i18nRows.sort(
          (a, b) => candidates.indexOf(a.locale) - candidates.indexOf(b.locale)
        );
        chosen = i18nRows[0] as ShortI18n;
      }

      const finalTitle = chosen?.title ?? base.title;
      const finalVideo = chosen?.video_url || base.video_url || null;
      const finalPdf = chosen?.pdf_url || null;
      setResolvedTitle(finalTitle);
      setResolvedVideo(finalVideo);
      setResolvedPdf(finalPdf);
      setResolvedLocale(chosen?.locale || null);

      // 4) Questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_bank")
        .select("*")
        .eq("kind", "short")
        .eq("ref_id", base.id)
        .order("created_at", { ascending: true });
      if (questionsError) throw questionsError;
      setQuestions((questionsData || []) as Question[]);

      // 5) Points for gating
      let pointsNow = Number(totalPoints ?? 0);
      if (!pointsNow && user?.id) {
        const { data: pt } = await supabase
          .from("user_points_totals_v1")
          .select("total_points")
          .eq("user_id", user.id)
          .maybeSingle();
        pointsNow = Number(pt?.total_points ?? 0);
      }
      setUserPoints(pointsNow);
    } catch (error) {
      console.error("Error loading content:", error);
      toast.error("Failed to load video");
      navigate("/shorts");
    } finally {
      setLoading(false);
    }
  }

  // Mark watched at >=95%
  useEffect(() => {
    if (!videoWatched && watchProgress >= 95) setVideoWatched(true);
  }, [watchProgress, videoWatched]);

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestion] = answerIndex;
    setQuizState((prev) => ({ ...prev, answers: newAnswers }));
  };

  const handleNext = () => {
    if (quizState.currentQuestion < questions.length - 1) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
      }));
    } else {
      finishQuiz();
    }
  };

  // Autofocus on question change
  useEffect(() => {
    if (!optionsWrapRef.current || quizState.showResults) return;
    const selectedIdx = quizState.answers[quizState.currentQuestion];
    const sel = optionsWrapRef.current.querySelector<HTMLButtonElement>(
      selectedIdx !== undefined
        ? `button[data-opt-selected="true"]`
        : `button[data-opt-index="0"]`
    );
    sel?.focus();
  }, [quizState.currentQuestion, quizState.showResults, quizState.answers]);

  // Keyboard shortcuts
  const optsCount = questions[quizState.currentQuestion]?.options?.length ?? 0;
  useQuizKeyboard({
    enabled: videoWatched && !quizState.showResults && optsCount > 0,
    optionsCount: optsCount,
    onSelect: handleAnswerSelect,
    onNext: handleNext,
    allowNext: quizState.answers[quizState.currentQuestion] !== undefined,
  });

  async function maybeConfettiOnUnlock(prevPoints: number, newPoints: number) {
    try {
      const { data } = await supabase
        .from("content_shorts")
        .select("required_points")
        .gt("required_points", prevPoints)
        .order("required_points", { ascending: true })
        .limit(1);
      if (!data || data.length === 0) return;
      const nextGate = Number(data[0].required_points || 0);
      if (newPoints >= nextGate) {
        const mod = await import("canvas-confetti");
        mod.default({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        toast.success("New content unlocked! 🎉");
        setLevelMsg(
          `You reached ${newPoints} points and unlocked content (gate: ${nextGate}).`
        );
        setLevelOpen(true);
      }
    } catch {
      /* noop */
    }
  }

  const finishQuiz = async () => {
    const correctCount = questions.reduce(
      (count, q, i) =>
        count + (quizState.answers[i] === q.correct_index ? 1 : 0),
      0
    );
    setQuizState((prev) => ({ ...prev, showResults: true, correctCount }));

    if (correctCount > 0 && user) {
      setSubmitting(true);
      try {
        const pointsAwarded = questions.reduce(
          (sum, q, i) =>
            sum +
            (quizState.answers[i] === q.correct_index
              ? Number(q.points_award ?? 0)
              : 0),
          0
        );

        const prev = userPoints;

        await supabase.from("points_ledger").insert([
          {
            user_id: user.id,
            points: pointsAwarded,
            reason: "Video Quiz",
            meta: {
              short_id: short!.id,
              short_title: resolvedTitle ?? short!.title,
              correct_count: correctCount,
              total_questions: questions.length,
              locale: resolvedLocale ?? undefined,
            },
          },
        ]);

        setJustGained(pointsAwarded);
        if (typeof refreshPoints === "function") await refreshPoints();

        const { data: pt } = await supabase
          .from("user_points_totals_v1")
          .select("total_points")
          .eq("user_id", user.id)
          .maybeSingle();
        const now = Number(pt?.total_points ?? prev + pointsAwarded);
        setUserPoints(now);

        maybeConfettiOnUnlock(prev, now);

        toast.success(`Great job! You earned ${pointsAwarded} points!`);
        track("short_quiz_complete", {
          short_id: short!.id,
          correct_count: correctCount,
          total_questions: questions.length,
          points_awarded: pointsAwarded,
          locale: resolvedLocale ?? undefined,
        });
      } catch (error) {
        console.error("Error saving quiz results:", error);
        toast.error("Failed to save quiz results");
      } finally {
        setSubmitting(false);
      }
    }
  };

  // ---- Player progress handlers ----
  const onPlayerProgress = useCallback(
    (state: { played: number; playedSeconds: number }) => {
      // state.played is 0..1
      const pct = Math.max(0, Math.min(100, Math.round(state.played * 100)));
      setWatchProgress(pct);
      saveLocalPercent(pct);
    },
    [saveLocalPercent]
  );

  const onPlayerEnded = useCallback(() => {
    setWatchProgress(100);
    saveLocalPercent(100);
    setVideoWatched(true);
  }, [saveLocalPercent]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading video...</p>
          </CardContent>
        </Card>
      </div>
    );
    }

  if (!short) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Video Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This video may have been removed or is not available.
            </p>
            <Button onClick={() => navigate("/shorts")}>Back to Shorts</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayTitle = resolvedTitle ?? short.title;
  const videoUrl = resolvedVideo ?? short.video_url ?? "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate("/shorts")}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Shorts</span>
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>~5–15 min</span>
          </Badge>
          <LockBadge
            requiredTier={meta.required_tier}
            requiredPoints={meta.required_points}
          />
          {short.preview && <Badge variant="outline">Preview</Badge>}
        </div>
      </div>

      {/* Video Section (🔒 gated) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{displayTitle}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Gate
            userTier={userTier}
            userPoints={userPoints}
            requiredTier={meta.required_tier}
            requiredPoints={meta.required_points}
            telemetry={{ kind: "short", slug }}
            fallback={
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  This short is locked. Earn more points by playing Daily Quiz
                  or upgrade your membership.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/daily-quiz")}
                  >
                    Earn Points
                  </Button>
                  <Button onClick={() => navigate("/pricing")}>Upgrade</Button>
                </div>
              </div>
            }
          >
            {/* Responsive 16:9 player */}
            <div className="relative w-full h-0" style={{ paddingBottom: "56.25%" }}>
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                  </div>
                }
              >
                <ReactPlayer
                  url={videoUrl}
                  width="100%"
                  height="100%"
                  playing={false}
                  controls
                  light
                  onProgress={onPlayerProgress}
                  onEnded={onPlayerEnded}
                  style={{ position: "absolute", top: 0, left: 0 }}
                />
              </Suspense>
            </div>

            {/* Progress + localized PDF */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <Progress value={watchProgress} className="h-2" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {watchProgress}% watched
                </p>
              </div>
              {resolvedPdf && (
                <a
                  href={resolvedPdf}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm underline underline-offset-2"
                >
                  <FileDown className="w-4 h-4" />
                  Download handout (PDF)
                  {resolvedLocale ? ` — ${resolvedLocale}` : ""}
                </a>
              )}
            </div>
          </Gate>
        </CardContent>
      </Card>

      {/* Quiz Section (🔒 gated) */}
      <Gate
        userTier={userTier}
        userPoints={userPoints}
        requiredTier={meta.required_tier}
        requiredPoints={meta.required_points}
        telemetry={{ kind: "short", slug }}
      >
        {videoWatched && questions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-primary" />
                <span>Quick Quiz</span>
                <Badge variant="secondary">
                  {questions.reduce(
                    (sum, q) => sum + Number(q.points_award ?? 0),
                    0
                  )}{" "}
                  pts available
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {!quizState.showResults ? (
                <>
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Question {quizState.currentQuestion + 1} of{" "}
                        {questions.length}
                      </span>
                      <span className="hidden sm:inline">
                        Tip: press{" "}
                        <kbd className="px-1 border rounded">1</kbd>–
                        <kbd className="px-1 border rounded">4</kbd> to answer,{" "}
                        <kbd className="px-1 border rounded">Enter</kbd> to
                        continue
                      </span>
                    </div>
                    <Progress
                      value={
                        ((quizState.currentQuestion + 1) / questions.length) *
                        100
                      }
                      className="h-2"
                    />
                  </div>

                  {/* Current Question */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      {questions[quizState.currentQuestion].question}
                    </h3>

                    <div className="grid gap-3" ref={optionsWrapRef}>
                      {questions[quizState.currentQuestion].options.map(
                        (option, index) => {
                          const selected =
                            quizState.answers[quizState.currentQuestion] ===
                            index;
                          return (
                            <Button
                              key={index}
                              data-opt-index={index}
                              data-opt-selected={selected ? "true" : "false"}
                              variant={selected ? "default" : "outline"}
                              className="h-auto p-4 text-left justify-start"
                              onClick={() => handleAnswerSelect(index)}
                            >
                              <span className="mr-2 text-xs opacity-60">
                                {index + 1}.
                              </span>
                              {option}
                            </Button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleNext}
                      disabled={
                        quizState.answers[quizState.currentQuestion] ===
                        undefined
                      }
                    >
                      {quizState.currentQuestion === questions.length - 1
                        ? "Finish"
                        : "Next"}
                    </Button>
                  </div>
                </>
              ) : (
                /* Results */
                <div className="text-center space-y-6">
                  <div className="space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">Quiz Complete!</h3>
                    <p className="text-muted-foreground">
                      You got {quizState.correctCount} out of {questions.length}{" "}
                      questions correct
                    </p>
                  </div>

                  {/* Score */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {questions.reduce(
                        (sum, q, i) =>
                          sum +
                          (quizState.answers[i] === q.correct_index
                            ? Number(q.points_award ?? 0)
                            : 0),
                        0
                      )}{" "}
                      points earned
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round(
                        (quizState.correctCount / questions.length) * 100
                      )}
                      % accuracy
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate("/shorts")}
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Continue Learning"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {videoWatched && questions.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Great Job!</h3>
              <p className="text-muted-foreground mb-4">
                You've completed this video. Check out more content to keep
                learning!
              </p>
              <Button onClick={() => navigate("/shorts")}>More Videos</Button>
            </CardContent>
          </Card>
        )}
      </Gate>

      {/* Float-in “+points” chip */}
      {justGained > 0 && (
        <PointsGainBubble amount={justGained} onDone={() => setJustGained(0)} />
      )}

      {/* 🎉 Level-up banner */}
      <LevelUpBanner
        open={levelOpen}
        onClose={() => setLevelOpen(false)}
        message={levelMsg}
        ctaText="Explore Shorts"
        ctaHref="/shorts"
      />
    </div>
  );
}
