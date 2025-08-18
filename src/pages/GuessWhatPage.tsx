import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Trophy, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PaywallModal from '@/components/PaywallModal';

interface GuessWhatItem {
  id: string;
  title: string;
  clues: string[];
}

interface GameSession {
  id: string;
  item_id: string;
  guesses: number;
  solved: boolean;
  points_awarded: number;
}

export default function GuessWhatPage() {
  const [currentItem, setCurrentItem] = useState<GuessWhatItem | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [cluesRevealed, setCluesRevealed] = useState(0);
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const { user } = useAuth();
  const { isTrialUser, refreshPoints } = usePoints();
  const { track } = useAnalytics();

  useEffect(() => {
    if (!user) {
      // Guest users see preview only
      loadPreviewItem();
    } else {
      loadRandomItem();
    }
  }, [user]);

  const loadPreviewItem = async () => {
    try {
      const { data, error } = await supabase
        .from('guess_what_items')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error) throw error;

      setCurrentItem(data);
      setCluesRevealed(1); // Show only first clue for preview
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRandomItem = async () => {
    try {
      // Get random item
      const { data: items, error: itemsError } = await supabase
        .from('guess_what_items')
        .select('*')
        .eq('is_active', true);

      if (itemsError) throw itemsError;

      const randomItem = items[Math.floor(Math.random() * items.length)];
      setCurrentItem(randomItem);

      // Check if user has an existing session for this item
      const { data: existingSession } = await supabase
        .from('guess_what_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('item_id', randomItem.id)
        .eq('solved', false)
        .single();

      if (existingSession) {
        setSession(existingSession);
        setCluesRevealed(Math.min(existingSession.guesses + 1, randomItem.clues.length));
      } else {
        // Create new session
        const { data: newSession, error: sessionError } = await supabase
          .from('guess_what_sessions')
          .insert([{
            user_id: user!.id,
            item_id: randomItem.id,
          }])
          .select()
          .single();

        if (sessionError) throw sessionError;

        setSession(newSession);
        setCluesRevealed(1);
      }
    } catch (error) {
      console.error('Error loading game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevealClue = () => {
    if (!user) {
      // Guest user trying to reveal more clues
      setShowPaywall(true);
      return;
    }

    if (!isTrialUser) {
      setShowPaywall(true);
      return;
    }

    if (cluesRevealed < currentItem!.clues.length) {
      setCluesRevealed(prev => prev + 1);
    }
  };

  const handleSubmitGuess = async () => {
    if (!guess.trim()) return;

    if (!user) {
      setShowPaywall(true);
      return;
    }

    if (!isTrialUser) {
      setShowPaywall(true);
      return;
    }

    setSubmitting(true);

    try {
      const isCorrect = guess.toLowerCase().trim() === currentItem!.title.toLowerCase();
      const newGuessCount = session!.guesses + 1;

      if (isCorrect) {
        // Calculate points based on clues used (fewer clues = more points)
        const basePoints = 25;
        const penaltyPerClue = 3;
        const pointsAwarded = Math.max(5, basePoints - (cluesRevealed - 1) * penaltyPerClue);

        // Update session
        await supabase
          .from('guess_what_sessions')
          .update({
            guesses: newGuessCount,
            solved: true,
            points_awarded: pointsAwarded,
          })
          .eq('id', session!.id);

        // Add points to ledger
        await supabase
          .from('points_ledger')
          .insert([{
            user_id: user.id,
            points: pointsAwarded,
            reason: 'Guess What Game',
            meta: {
              item_id: currentItem!.id,
              item_title: currentItem!.title,
              clues_used: cluesRevealed,
              guesses_made: newGuessCount,
            },
          }]);

        setGameComplete(true);
        toast.success(`Correct! You earned ${pointsAwarded} points!`);
        
        track('guesswhat_solved', {
          item_id: currentItem!.id,
          clues_used: cluesRevealed,
          guesses_made: newGuessCount,
          points_awarded: pointsAwarded,
        });

        await refreshPoints();
      } else {
        // Update session with new guess count
        await supabase
          .from('guess_what_sessions')
          .update({
            guesses: newGuessCount,
          })
          .eq('id', session!.id);

        setSession(prev => prev ? { ...prev, guesses: newGuessCount } : null);
        toast.error('Not quite right. Try again!');
      }

      setGuess('');
    } catch (error) {
      console.error('Error submitting guess:', error);
      toast.error('Failed to submit guess. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const startNewGame = () => {
    setGameComplete(false);
    setSession(null);
    setGuess('');
    setCluesRevealed(0);
    loadRandomItem();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading game...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Game Available</h3>
            <p className="text-muted-foreground">Check back later for new challenges!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Guess What?</h1>
        <p className="text-muted-foreground">
          Use the clues to figure out what we're thinking of!
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              <span>Mystery Item</span>
            </CardTitle>
            {session && (
              <div className="flex space-x-2">
                <Badge variant="outline">
                  Guesses: {session.guesses}
                </Badge>
                {gameComplete && (
                  <Badge className="bg-green-500">
                    <Trophy className="h-3 w-3 mr-1" />
                    {session.points_awarded} pts
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {gameComplete ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-500 mb-2">Correct!</h3>
                <p className="text-lg">The answer was: <strong>{currentItem.title}</strong></p>
                <p className="text-muted-foreground">
                  You used {cluesRevealed} clue{cluesRevealed !== 1 ? 's' : ''} and made {session!.guesses} guess{session!.guesses !== 1 ? 'es' : ''}
                </p>
              </div>
              <Button onClick={startNewGame} size="lg">
                Play Another
              </Button>
            </div>
          ) : (
            <>
              {/* Clues */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>Clues Revealed ({cluesRevealed}/{currentItem.clues.length})</span>
                </h3>
                
                {currentItem.clues.slice(0, cluesRevealed).map((clue, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                    <Badge variant="secondary" className="shrink-0">
                      {index + 1}
                    </Badge>
                    <p className="text-sm">{clue}</p>
                  </div>
                ))}
                
                {cluesRevealed < currentItem.clues.length && (
                  <Button
                    variant="outline"
                    onClick={handleRevealClue}
                    className="w-full"
                  >
                    Reveal Next Clue
                  </Button>
                )}
              </div>

              {/* Guess Input */}
              {user ? (
                <div className="space-y-3">
                  <h3 className="font-semibold">Your Guess</h3>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="What do you think it is?"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmitGuess()}
                      disabled={submitting}
                    />
                    <Button
                      onClick={handleSubmitGuess}
                      disabled={!guess.trim() || submitting}
                    >
                      {submitting ? 'Submitting...' : 'Guess'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Preview Mode</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign in to make guesses and earn points!
                  </p>
                  <Button onClick={() => setShowPaywall(true)}>
                    Sign In to Play
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Guess What Game"
      />
    </div>
  );
}