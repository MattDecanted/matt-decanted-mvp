// src/pages/ShortDetailPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Trophy, CheckCircle, ArrowLeft, Clock, Globe, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { useLocale } from '@/context/LocaleContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/** 🔒 Entitlements */
import { Gate, LockBadge } from '@/components/LockGate';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import PointsProgressChip from '@/components/PointsProgressChip';
import type { Tier } from '@/lib/entitlements';
import { useShortProgress } from '@/hooks/useLocalProgress';
import { useQuizKeyboard } from '@/hooks/useQuizKeyboard';
import PointsGainBubble from '@/components/PointsGainBubble';
import LevelUpBanner from '@/components/LevelUpBanner';

/* ---------- Types (DB-aligned) ---------- */
type Short = {
  id: string;
  slug: string;
  title: string;
  video_url: string | null;
  preview: boolean;
  is_published: boolean;
  created_at: string;
  /** optional, if you added this column */
  watch_points?: number | null;
};

type Question = {
  id: string;
  question: string;
  options: string[] | null;
  correct_index: number | null;
  points_award: number;
  order_index: number | null;
};

type QuizState = {
  currentQuestion: number;
  answers: number[]; // index per question
  showResults: boolean;
  correctCount: number;
};

type ShortMeta = {
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
};

type ShortI18n = {
  id: string;
  short_id: string;
  locale: string;
  title_i18n: string | null;
  blurb_i18n: string | null;
  video_url_alt: string | null;
  pdf_url_alt: string | null;
};

export default function ShortDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // 🌐 Global locale from provider
  const { resolvedLocale } = useLocale();

  const [short, setShort] = useState<Short | null>(null);
  const [i18nRow, setI18nRow] = useState<ShortI18n | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [videoWatched, setVideoWatched] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [watchAwarded, setWatchAwarded] = useState(false);
  const { setPercent: saveLocalPercent } = useShortProgress(slug);

  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: [],
    showResults: false,
    correctCount: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  /** 🎉 UI: “+points” bubble + level-up banner */
  const [justGained, setJustGained] = useState<number>(0);
  const [levelOpen, setLevelOpen] = useState(false);
  const [levelMsg, setLevelMsg] = useState<string>('You just crossed a points gate and unlocked more learning content.');

  /** 🔒 Entitlement state */
  const [meta, setMeta] = useState<ShortMeta>({
    required_points: 0,
    required_tier: 'free',
    is_active: true,
  });
  const [userPoints, setUserPoints] = useState<number>(0);

  const { user, profile } = useAuth() as any;
  const userTier: Tier = (profile?.membership_tier || 'free') as Tier;

  const { refreshPoints, totalPoints } = (usePoints() as any) || {};
  const { track } = useAnalytics();

  const optionsWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) {
      loadAll(slug).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, resolvedLocale]);

  async function loadAll(currSlug: string) {
    setLoading(true);
    try {
      // Short (published)
      const { data: shortData, error: shortError } = await supabase
        .from('shorts')
        .select('*')
        .eq('slug', currSlug)
        .eq('is_published', true)
        .single();
      if (shortError) throw shortError;
      setShort(shortData as Short);

      // Gate meta
      const { data: metaData } = await supabase
        .from('content_shorts')
        .select('required_points, required_tier, is_active')
        .eq('slug', currSlug)
        .single();
      if (metaData) {
        setMeta({
          required_points: Number(metaData.required_points ?? 0),
          required_tier: (metaData.required_tier ?? 'free') as Tier,
          is_active: Boolean(metaData.is_active ?? true),
        });
      } else {
        setMeta({ required_points: 0, required_tier: 'free', is_active: true });
      }

      // I18n row for the resolved locale
      const { data: tData } = await supabase
        .from('shorts_i18n')
        .select('*')
        .eq('short_id', (shortData as Short).id)
        .eq('locale', resolvedLocale)
        .maybeSingle();
      setI18nRow((tData as ShortI18n) || null);

      // Quiz bank for this short
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_bank')
        .select('*')
        .eq('kind', 'short')
        .eq('ref_id', (shortData as Short).id)
        .order('order_index', { ascending: true });
      if (questionsError) throw questionsError;
      setQuestions((questionsData || []) as Question[]);

      // Points snapshot
      let pointsNow = Number(totalPoints ?? 0);
      if (!pointsNow && user?.id) {
        const { data: pt } = await supabase
          .from('user_points_totals_v1')
          .select('total_points')
          .eq('user_id', user.id)
          .maybeSingle();
        if (pt) pointsNow = Number(pt.total_points ?? 0);
      }
      setUserPoints(pointsNow);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load video');
      navigate('/shorts');
    } finally {
      setLoading(false);
    }
  }

  /** Derived display fields (with i18n fallbacks) */
  const display = useMemo(() => {
    return {
      title: i18nRow?.title_i18n || short?.title || '',
      blurb: i18nRow?.blurb_i18n || '',
      videoUrl: i18nRow?.video_url_alt || short?.video_url || null,
      pdfUrl: i18nRow?.pdf_url_alt || null,
    };
  }, [i18nRow, short]);

  /** Fake player – simulate progress */
  const simulateVideoWatch = () => {
    const interval = setInterval(() => {
      setWatchProgress((prev) => {
        const newProgress = prev + 2;
        saveLocalPercent(newProgress);
        if (newProgress >= 100) {
          clearInterval(interval);
          setVideoWatched(true);
          return 100;
        }
        return newProgress;
      });
    }, 100);
  };

  // Award watch points once when video completes (if column exists / value > 0)
  useEffect(() => {
    (async () => {
      if (!videoWatched || watchAwarded || !short || !user) return;
      const pts = Number((short as any)?.watch_points ?? 0);
      if (pts > 0) {
        try {
          const prev = userPoints;

          await supabase.from('points_ledger').insert([{
            user_id: user.id,
            points: pts,
            reason: 'Video Watch',
            meta: { short_id: short.id, short_title: display.title }
          }]);

          setJustGained((n) => n + pts);

          if (typeof refreshPoints === 'function') {
            await refreshPoints();
          }
          const { data: pt } = await supabase
            .from('user_points_totals_v1')
            .select('total_points')
            .eq('user_id', user.id)
            .maybeSingle();
          const now = Number(pt?.total_points ?? prev + pts);
          setUserPoints(now);

          toast.success(`Nice! +${pts} for watching.`);
        } catch (e) {
          console.error('watch-points insert failed', e);
        } finally {
          setWatchAwarded(true);
        }
      } else {
        setWatchAwarded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoWatched, watchAwarded, short, user, display.title]);

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

  // Auto-focus the first (or selected) option when the question changes
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

  // Keyboard shortcuts: 1–9 to select, Enter/→ to Next
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
      const { data, error } = await supabase
        .from('content_shorts')
        .select('required_points')
        .gt('required_points', prevPoints)
        .order('required_points', { ascending: true })
        .limit(1);
      if (error || !data || data.length === 0) return;
      const nextGate = Number(data[0].required_points || 0);
      if (newPoints >= nextGate) {
        const mod = await import('canvas-confetti');
        mod.default({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        toast.success('New content unlocked! 🎉');
        setLevelMsg(`You reached ${newPoints} points and unlocked content (gate: ${nextGate}).`);
        setLevelOpen(true);
      }
    } catch {
      /* non-blocking */
    }
  }

  const finishQuiz = async () => {
    const correctCount = questions.reduce((count, question, index) => {
      return count + (quizState.answers[index] === question.correct_index ? 1 : 0);
    }, 0);

    setQuizState((prev) => ({
      ...prev,
      showResults: true,
      correctCount,
    }));

    // Award points = sum of points_award for correct answers
    if (correctCount > 0 && user && short) {
      setSubmitting(true);
      try {
        const pointsAwarded = questions.reduce((sum, q, i) => {
          return sum + (quizState.answers[i] === q.correct_index ? Number(q.points_award ?? 0) : 0);
        }, 0);

        const prev = userPoints;

        await supabase.from('points_ledger').insert([
          {
            user_id: user.id,
            points: pointsAwarded,
            reason: 'Video Quiz',
            meta: {
              short_id: short.id,
              short_title: display.title,
              correct_count: correctCount,
              total_questions: questions.length,
            },
          },
        ]);

        // Float-in chip
        setJustGained((n) => n + pointsAwarded);

        if (typeof refreshPoints === 'function') {
          await refreshPoints();
        }

        const { data: pt } = await supabase
          .from('user_points_totals_v1')
          .select('total_points')
          .eq('user_id', user.id)
          .maybeSingle();
        const now = Number(pt?.total_points ?? prev + pointsAwarded);
        setUserPoints(now);

        // 🎉 celebrate if you crossed a gate
        maybeConfettiOnUnlock(prev, now);

        toast.success(`Great job! You earned ${pointsAwarded} points!`);
        track('short_quiz_complete', {
          short_id: short.id,
          correct_count: correctCount,
          total_questions: questions.length,
          points_awarded: pointsAwarded,
        });
      } catch (error) {
        console.error('Error saving quiz results:', error);
        toast.error('Failed to save quiz results');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
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
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Video Not Found</h3>
            <p className="text-muted-foreground mb-4">This video may have been removed or is not available.</p>
            <Button onClick={() => navigate('/shorts')}>Back to Shorts</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/shorts')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Shorts</span>
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>5–15m</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            <span className="uppercase">{resolvedLocale}</span>
          </Badge>
          <LockBadge requiredTier={meta.required_tier} requiredPoints={meta.required_points} />
          {short.preview && <Badge variant="outline">Preview</Badge>}
        </div>
      </div>

      {/* Video Section (🔒 gated) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{display.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <Gate
            userTier={userTier}
            userPoints={userPoints}
            requiredTier={meta.required_tier}
            requiredPoints={meta.required_points}
            telemetry={{ kind: 'short', slug }}
            fallback={
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  This short is locked. Earn more points by playing Daily Quiz or upgrade your membership.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => navigate('/daily-quiz')}>
                    Earn Points
                  </Button>
                  <Button onClick={() => navigate('/pricing')}>Upgrade</Button>
                </div>
              </div>
            }
          >
            {/* Quick asset links (live) */}
            <div className="flex flex-wrap items-center gap-3 -mt-2">
              {display.videoUrl ? (
                <a
                  href={display.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm underline underline-offset-2"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Open video
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">No video link</span>
              )}
              {display.pdfUrl && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <a
                    href={display.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-sm underline underline-offset-2"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    PDF (locale)
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </>
              )}
            </div>

            {/* Placeholder Player (simulated watch) */}
            <div className="relative w-full h-0" style={{ paddingBottom: '56.25%' }}>
              <div className="absolute inset-0 bg-black rounded-lg flex items-center justify-center">
                {watchProgress === 0 ? (
                  <Button size="lg" onClick={simulateVideoWatch} className="flex items-center space-x-2">
                    <Play className="h-6 w-6" />
                    <span>Watch Video</span>
                  </Button>
                ) : watchProgress < 100 ? (
                  <div className="text-center text-white space-y-4">
                    <Play className="h-12 w-12 mx-auto animate-pulse" />
                    <div className="w-64">
                      <Progress value={watchProgress} className="h-2" />
                      <p className="text-sm mt-2">{Math.round(watchProgress)}% watched</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-white space-y-2">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                    <p>Video completed!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video description (optional blurb) */}
            {display.blurb ? (
              <div className="text-muted-foreground">
                <p>{display.blurb}</p>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <p>This is a placeholder video player. In a real implementation, integrate with YouTube/Vimeo or your own player.</p>
              </div>
            )}
          </Gate>
        </CardContent>
      </Card>

      {/* Quiz Section (🔒 gated) */}
      <Gate
        userTier={userTier}
        userPoints={userPoints}
        requiredTier={meta.required_tier}
        requiredPoints={meta.required_points}
        telemetry={{ kind: 'short', slug }}
      >
        {videoWatched && questions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-primary" />
                <span>Quick Quiz</span>
                <Badge variant="secondary">
                  {questions.reduce((sum, q) => sum + Number(q.points_award ?? 0), 0)} pts available
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {!quizState.showResults ? (
                <>
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Question {quizState.currentQuestion + 1} of {questions.length}
                      </span>
                      <span className="hidden sm:inline">
                        Tip: press <kbd className="px-1 border rounded">1</kbd>–<kbd className="px-1 border rounded">4</kbd>{' '}
                        to answer, <kbd className="px-1 border rounded">Enter</kbd> to continue
                      </span>
                    </div>
                    <Progress
                      value={((quizState.currentQuestion + 1) / questions.length) * 100}
                      className="h-2"
                    />
                  </div>

                  {/* Current Question */}
                  <div className="space-y-2">
                    <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
                      {questions[quizState.currentQuestion].question}
                    </h3>

                    <div className="space-y-2" ref={optionsWrapRef}>
                      {(questions[quizState.currentQuestion].options || ['True', 'False']).map((option, index) => {
                        const selected = quizState.answers[quizState.currentQuestion] === index;

                        const base =
                          'block w-full text-left px-4 py-3 rounded-lg border transition select-none h-auto justify-start';
                        const selectedCls = 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-600';
                        const unselectedCls = 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50';

                        return (
                          <button
                            key={index}
                            type="button"
                            data-opt-index={index}
                            data-opt-selected={selected ? 'true' : 'false'}
                            className={`${base} ${selected ? selectedCls : unselectedCls}`}
                            onClick={() => handleAnswerSelect(index)}
                          >
                            <span className="mr-2 text-xs opacity-60">{index + 1}.</span>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={handleNext}
                      disabled={quizState.answers[quizState.currentQuestion] === undefined}
                    >
                      {quizState.currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
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
                      You got {quizState.correctCount} out of {questions.length} questions correct
                    </p>
                  </div>

                  {/* Score */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {questions.reduce(
                        (sum, q, i) =>
                          sum + (quizState.answers[i] === q.correct_index ? Number(q.points_award ?? 0) : 0),
                        0
                      )}{' '}
                      points earned
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round((quizState.correctCount / questions.length) * 100)}% accuracy
                    </div>
                  </div>

                  <Button onClick={() => navigate('/shorts')} size="lg" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Continue Learning'}
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
              <p className="text-muted-foreground mb-4">You've completed this video. Check out more content to keep learning!</p>
              <Button onClick={() => navigate('/shorts')}>More Videos</Button>
            </CardContent>
          </Card>
        )}
      </Gate>

      {/* Float-in “+points” chip */}
      {justGained > 0 && <PointsGainBubble amount={justGained} onDone={() => setJustGained(0)} />}

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
