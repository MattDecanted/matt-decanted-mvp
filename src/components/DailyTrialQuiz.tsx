import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAnalytics } from '@/context/AnalyticsContext';
import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';
import { toast } from 'sonner';

interface Question {
  question: string;
  options: string[];
  correct: number;
}

interface Quiz {
  id: string;
  for_date: string;
  title: string;
  questions: Question[];
  points_award: number;
}

interface QuizState {
  currentQuestion: number;
  answers: number[];
  showResults: boolean;
  correctCount: number;
  completed: boolean;
}

export default function DailyTrialQuiz() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: [],
    showResults: false,
    correctCount: 0,
    completed: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const { track } = useAnalytics();
  const { user } = useAuth();
  const { refreshPoints } = usePoints();

  useEffect(() => {
    loadTodaysQuiz();
    track('tq_load');
  }, []);

  const loadTodaysQuiz = async () => {
    try {
      const response = await fetch(`/.netlify/functions/trial-quiz-today?locale=en`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
      } else {
        console.error('Failed to load quiz');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestion] = answerIndex;
    setQuizState(prev => ({ ...prev, answers: newAnswers }));
  };

  const handleNext = () => {
    if (quizState.currentQuestion < quiz!.questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1
      }));
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const correctCount = quiz!.questions.reduce((count, question, index) => {
      return count + (quizState.answers[index] === question.correct ? 1 : 0);
    }, 0);

    setQuizState(prev => ({
      ...prev,
      showResults: true,
      correctCount,
      completed: true
    }));

    track('tq_complete', {
      quiz_id: quiz!.id,
      correct_count: correctCount,
      total_questions: quiz!.questions.length,
      score_percentage: (correctCount / quiz!.questions.length) * 100
    });
  };

  const handleSaveProgress = async () => {
    if (!quiz) return;

    setSubmitting(true);

    try {
      if (user) {
        // Authenticated user - submit directly
        const response = await fetch('/.netlify/functions/trial-quiz-attempt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.session?.access_token}`,
          },
          body: JSON.stringify({
            quiz_id: quiz.id,
            correct_count: quizState.correctCount,
            source: 'web',
            utm: {},
            affiliate_code: null,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          toast.success(`Great job! You earned ${result.points_awarded} points!`);
          await refreshPoints();
        } else {
          throw new Error('Failed to save progress');
        }
      } else {
        // Guest user - save to localStorage
        const guestData = {
          points: quizState.correctCount * 5, // 5 points per correct answer
          quiz: {
            for_date: quiz.for_date,
            correct_count: quizState.correctCount,
          },
        };
        
        localStorage.setItem('mdTrialQuiz_guest', JSON.stringify(guestData));
        toast.success('Progress saved! Sign in to preserve your points.');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading today's quiz...</p>
        </CardContent>
      </Card>
    );
  }

  if (!quiz) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Quiz Available</h3>
          <p className="text-muted-foreground">Check back tomorrow for a new challenge!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-primary" />
              <span>{quiz.title}</span>
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              {new Date(quiz.for_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Trophy className="h-3 w-3" />
            <span>{quiz.points_award} pts</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!quizState.showResults ? (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Question {quizState.currentQuestion + 1} of {quiz.questions.length}</span>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>~2 min</span>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((quizState.currentQuestion + 1) / quiz.questions.length) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Current Question */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium leading-relaxed">
                {quiz.questions[quizState.currentQuestion].question}
              </h3>

              <div className="grid gap-3">
                {quiz.questions[quizState.currentQuestion].options.map((option, index) => (
                  <Button
                    key={index}
                    variant={quizState.answers[quizState.currentQuestion] === index ? "default" : "outline"}
                    className="h-auto p-4 text-left justify-start"
                    onClick={() => handleAnswerSelect(index)}
                  >
                    <span className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                        <div className={`w-3 h-3 rounded-full transition-all ${
                          quizState.answers[quizState.currentQuestion] === index ? 'bg-current' : ''
                        }`} />
                      </div>
                      <span>{option}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end">
              <Button
                onClick={handleNext}
                disabled={quizState.answers[quizState.currentQuestion] === undefined}
                className="min-w-[100px]"
              >
                {quizState.currentQuestion === quiz.questions.length - 1 ? 'Finish' : 'Next'}
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
                You got {quizState.correctCount} out of {quiz.questions.length} questions correct
              </p>
            </div>

            {/* Score Breakdown */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{quizState.correctCount}</div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">
                    {quiz.questions.length - quizState.correctCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Incorrect</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {Math.round((quizState.correctCount / quiz.questions.length) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
              </div>
            </div>

            {/* Answers Review */}
            <div className="space-y-3">
              <h4 className="font-semibold text-left">Review Answers:</h4>
              {quiz.questions.map((question, index) => (
                <div key={index} className="text-left p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium mb-2">{question.question}</div>
                  <div className="flex items-center space-x-2 text-sm">
                    {quizState.answers[index] === question.correct ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-muted-foreground">
                      Your answer: {question.options[quizState.answers[index]]}
                    </span>
                  </div>
                  {quizState.answers[index] !== question.correct && (
                    <div className="text-sm text-green-600 mt-1">
                      Correct: {question.options[question.correct]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Button */}
            {!user ? (
              <div className="space-y-3">
                <Button
                  onClick={handleSaveProgress}
                  disabled={submitting}
                  size="lg"
                  className="w-full"
                >
                  {submitting ? 'Saving...' : 'Save My Points'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sign in to preserve your progress and start your 7-day trial
                </p>
              </div>
            ) : (
              <Button
                onClick={handleSaveProgress}
                disabled={submitting}
                size="lg"
                className="w-full"
              >
                {submitting ? 'Saving...' : 'Points Saved!'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}