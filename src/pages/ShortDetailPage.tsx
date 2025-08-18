import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Trophy, CheckCircle, ArrowLeft, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Short {
  id: string;
  slug: string;
  title: string;
  video_url: string;
  preview: boolean;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  points_award: number;
}

interface QuizState {
  currentQuestion: number;
  answers: number[];
  showResults: boolean;
  correctCount: number;
}

export default function ShortDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [short, setShort] = useState<Short | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoWatched, setVideoWatched] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: [],
    showResults: false,
    correctCount: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const { refreshPoints } = usePoints();
  const { track } = useAnalytics();

  useEffect(() => {
    if (slug) {
      loadShortAndQuestions();
    }
  }, [slug]);

  const loadShortAndQuestions = async () => {
    try {
      // Load short details
      const { data: shortData, error: shortError } = await supabase
        .from('shorts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (shortError) throw shortError;
      setShort(shortData);

      // Load quiz questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_bank')
        .select('*')
        .eq('kind', 'short')
        .eq('ref_id', shortData.id)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load video');
      navigate('/shorts');
    } finally {
      setLoading(false);
    }
  };

  const simulateVideoWatch = () => {
    const interval = setInterval(() => {
      setWatchProgress(prev => {
        const newProgress = prev + 2; // Simulate 2% progress every 100ms
        if (newProgress >= 100) {
          clearInterval(interval);
          setVideoWatched(true);
          return 100;
        }
        return newProgress;
      });
    }, 100);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestion] = answerIndex;
    setQuizState(prev => ({ ...prev, answers: newAnswers }));
  };

  const handleNext = () => {
    if (quizState.currentQuestion < questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1
      }));
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const correctCount = questions.reduce((count, question, index) => {
      return count + (quizState.answers[index] === question.correct_index ? 1 : 0);
    }, 0);

    setQuizState(prev => ({
      ...prev,
      showResults: true,
      correctCount,
    }));

    // Award points for correct answers
    if (correctCount > 0 && user) {
      setSubmitting(true);
      try {
        const pointsAwarded = correctCount * 5; // 5 points per correct answer

        await supabase
          .from('points_ledger')
          .insert([{
            user_id: user.id,
            points: pointsAwarded,
            reason: 'Video Quiz',
            meta: {
              short_id: short!.id,
              short_title: short!.title,
              correct_count: correctCount,
              total_questions: questions.length,
            },
          }]);

        toast.success(`Great job! You earned ${pointsAwarded} points!`);
        await refreshPoints();

        track('short_quiz_complete', {
          short_id: short!.id,
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
            <p className="text-muted-foreground mb-4">This video may have been removed or is not available.</p>
            <Button onClick={() => navigate('/shorts')}>
              Back to Shorts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>~5 min</span>
          </Badge>
          {short.preview && (
            <Badge variant="outline">Preview</Badge>
          )}
        </div>
      </div>

      {/* Video Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{short.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Video Player Placeholder */}
          <div className="relative w-full h-0" style={{ paddingBottom: '56.25%' }}>
            <div className="absolute inset-0 bg-black rounded-lg flex items-center justify-center">
              {watchProgress === 0 ? (
                <Button
                  size="lg"
                  onClick={simulateVideoWatch}
                  className="flex items-center space-x-2"
                >
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

          {/* Video description */}
          <div className="text-muted-foreground">
            <p>This is a placeholder video player. In a real implementation, you would integrate with a video service like YouTube, Vimeo, or host your own videos.</p>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Section */}
      {videoWatched && questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-primary" />
              <span>Quick Quiz</span>
              <Badge variant="secondary">{questions.length * 5} pts available</Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {!quizState.showResults ? (
              <>
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Question {quizState.currentQuestion + 1} of {questions.length}</span>
                  </div>
                  <Progress
                    value={((quizState.currentQuestion + 1) / questions.length) * 100}
                    className="h-2"
                  />
                </div>

                {/* Current Question */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {questions[quizState.currentQuestion].question}
                  </h3>

                  <div className="grid gap-3">
                    {questions[quizState.currentQuestion].options.map((option, index) => (
                      <Button
                        key={index}
                        variant={quizState.answers[quizState.currentQuestion] === index ? "default" : "outline"}
                        className="h-auto p-4 text-left justify-start"
                        onClick={() => handleAnswerSelect(index)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-end">
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
                    {quizState.correctCount * 5} points earned
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((quizState.correctCount / questions.length) * 100)}% accuracy
                  </div>
                </div>

                <Button
                  onClick={() => navigate('/shorts')}
                  size="lg"
                  disabled={submitting}
                >
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
            <Button onClick={() => navigate('/shorts')}>
              More Videos
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}