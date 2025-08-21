// src/pages/Swirdle.tsx
import React, { useState, useEffect } from 'react';
import {
  Wine,
  Trophy,
  Target,
  Share2,
  Brain,
  Calendar,
  TrendingUp,
  Lightbulb,
  X,
  CheckCircle,
  Shield,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';
import { supabase } from '@/lib/supabase';

const HINT_COST = 5;        // cost to buy a hint
const WIN_POINTS = 15;      // points for a Swirdle win
const maxGuesses = 6;

// --- Inline service (replaces ../features/swirdle/swirdle.service) ---

export type SwirdleWord = {
  id: string;
  word: string;
  definition: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | string;
  category: 'grape_variety' | 'wine_region' | 'tasting_term' | 'production' | string;
  hints: string[];
  date_scheduled: string;   // YYYY-MM-DD
  is_published: boolean;
};

export type SwirdleAttempt = {
  id?: string;
  user_id: string;
  word_id: string;
  guesses: string[];
  attempts: number;
  completed: boolean;
  won?: boolean;
  hints_used: number[];
  completed_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserStats = {
  user_id: string;
  current_streak: number;
  max_streak: number;
  games_played: number;
  games_won: number;
  average_attempts: number;
  last_played: string | null;
  updated_at: string | null;
};

// Get today’s published word (scheduled for `date` AND is_published = true)
async function getWordForDate(date: string): Promise<{ data: SwirdleWord | null; error: any | null }> {
  const { data, error } = await supabase
    .from('swirdle_words')
    .select('id, word, definition, difficulty, category, hints, date_scheduled, is_published')
    .eq('date_scheduled', date)
    .eq('is_published', true)
    .maybeSingle();

  return { data: (data as SwirdleWord) ?? null, error };
}

// Load an existing attempt for a user & word (if any)
async function getAttempt(userId: string, wordId: string): Promise<{ data: SwirdleAttempt | null; error: any | null }> {
  const { data, error } = await supabase
    .from('swirdle_attempts')
    .select('id, user_id, word_id, guesses, attempts, completed, won, hints_used, completed_at, created_at, updated_at')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .maybeSingle();

  return { data: (data as SwirdleAttempt) ?? null, error };
}

// Upsert attempt (insert if none; update if exists)
async function recordAttempt(attempt: SwirdleAttempt): Promise<{ data: SwirdleAttempt | null; error: any | null }> {
  const { data, error } = await supabase
    .from('swirdle_attempts')
    .upsert(
      {
        id: attempt.id,
        user_id: attempt.user_id,
        word_id: attempt.word_id,
        guesses: attempt.guesses,
        attempts: attempt.attempts,
        completed: attempt.completed,
        won: attempt.won ?? null,
        hints_used: attempt.hints_used,
        completed_at: attempt.completed_at,
      },
      { onConflict: 'user_id,word_id', ignoreDuplicates: false }
    )
    .select()
    .maybeSingle();

  return { data: (data as SwirdleAttempt) ?? null, error };
}

// Read user stats row (if exists)
async function getUserStats(userId: string): Promise<{ data: UserStats | null; error: any | null }> {
  const { data, error } = await supabase
    .from('swirdle_user_stats')
    .select('user_id, current_streak, max_streak, games_played, games_won, average_attempts, last_played, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  return { data: (data as UserStats) ?? null, error };
}

// Update aggregate stats after a completed game
async function upsertUserStats(
  userId: string,
  params: { won: boolean; attempts: number }
): Promise<{ data: UserStats | null; error: any | null }> {
  // You can keep it simple on the client: call a Postgres function if you have one,
  // otherwise do a naive merge here.

  // If you already created a DB function, uncomment and use it:
  // const { data, error } = await supabase.rpc('swirdle_upsert_stats', {
  //   p_user: userId,
  //   p_won: params.won,
  //   p_attempts: params.attempts,
  // });
  // return { data, error };

  // Fallback client-side upsert:
  const { data: existing } = await getUserStats(userId);

  const next: UserStats = existing
    ? {
        ...existing,
        games_played: existing.games_played + 1,
        games_won: existing.games_won + (params.won ? 1 : 0),
        current_streak: params.won ? existing.current_streak + 1 : 0,
        max_streak: params.won ? Math.max(existing.max_streak, existing.current_streak + 1) : existing.max_streak,
        average_attempts:
          existing.games_played > 0
            ? Number(
                (
                  (existing.average_attempts * existing.games_played + params.attempts) /
                  (existing.games_played + 1)
                ).toFixed(2)
              )
            : params.attempts,
        last_played: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    : {
        user_id: userId,
        current_streak: params.won ? 1 : 0,
        max_streak: params.won ? 1 : 0,
        games_played: 1,
        games_won: params.won ? 1 : 0,
        average_attempts: params.attempts,
        last_played: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  const { data, error } = await supabase
    .from('swirdle_user_stats')
    .upsert(next, { onConflict: 'user_id', ignoreDuplicates: false })
    .select()
    .maybeSingle();

  return { data: (data as UserStats) ?? null, error };
}


// Minimal Wordle-style status computer to avoid external import
function computeStatuses(answer: string, guess: string): Array<'correct' | 'present' | 'absent'> {
  const A = answer.toUpperCase().split('');
  const G = guess.toUpperCase().split('');
  const out: Array<'correct' | 'present' | 'absent'> = Array(G.length).fill('absent');

  // mark correct first
  const remaining: Record<string, number> = {};
  for (let i = 0; i < A.length; i++) {
    if (G[i] === A[i]) {
      out[i] = 'correct';
    } else {
      remaining[A[i]] = (remaining[A[i]] ?? 0) + 1;
    }
  }

  // then present
  for (let i = 0; i < A.length; i++) {
    if (out[i] === 'correct') continue;
    const ch = G[i];
    if (remaining[ch] > 0) {
      out[i] = 'present';
      remaining[ch] -= 1;
    } else {
      out[i] = 'absent';
    }
  }
  return out;
}


const Spinner = () => (
  <div className="flex items-center justify-center p-6">
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"
      aria-label="Loading"
    />
  </div>
);

const Swirdle: React.FC = () => {
  // Local no-op translator so we don’t depend on LanguageProvider
  const t = (_key: string, fallback?: string) => fallback ?? '';

  const { user } = useAuth();
  const { refreshPoints } = usePoints();

  const [todaysWord, setTodaysWord] = useState<SwirdleWord | null>(null);
  const [dbWordAvailable, setDbWordAvailable] = useState(false);
  const [userAttempt, setUserAttempt] = useState<SwirdleAttempt | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState<string[]>(Array(maxGuesses).fill(''));
  const [gameComplete, setGameComplete] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const [hintsUsed, setHintsUsed] = useState<number[]>([]);
  const [showHintModal, setShowHintModal] = useState(false);
  const [availableHint, setAvailableHint] = useState<string>('');
  const [currentAttempt, setCurrentAttempt] = useState(0);

  const [error, setError] = useState<string>('');
  const [shareText, setShareText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  // Admin helpers
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const dashboardUrl = import.meta.env.VITE_SUPABASE_DASHBOARD_URL as string | undefined;

  // Guards to prevent duplicate actions
  const [awardBusy, setAwardBusy] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);

  useEffect(() => {
    loadTodaysGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadTodaysGame = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Safe mock for preview (if no DB word is scheduled/published)
    const mockWord: SwirdleWord = {
      id: 'mock-1',
      word: 'TERROIR',
      definition: 'The complete natural environment in which a wine is produced',
      difficulty: 'intermediate',
      category: 'tasting_term',
      hints: [
        'This French concept relates to wine character',
        'It includes soil, climate, and topography',
        'Essential for understanding wine regions',
      ],
      date_scheduled: today,
      is_published: true,
    };

    const mockStats: UserStats = {
      user_id: 'mock',
      current_streak: 7,
      max_streak: 15,
      games_played: 23,
      games_won: 18,
      average_attempts: 4.2,
      last_played: null,
      updated_at: null,
    };

    try {
      setLoading(true);

      // 1) Today’s published word
      const { data: wordData, error: wordErr } = await getWordForDate(today);
      if (wordErr) console.error('getWordForDate error:', wordErr);
      setDbWordAvailable(!!wordData);
      setTodaysWord(wordData ?? mockWord);

      // 2) Admin check
      if (user) {
        const { data: adminRow, error: adminErr } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (adminErr) console.error('admin check error:', adminErr);
        setIsAdmin(!!adminRow);
      } else {
        setIsAdmin(false);
      }

      // 3) User attempt + stats (only when signed in)
      if (user && wordData) {
        const { data: attempt } = await getAttempt(user.id, wordData.id);
        if (attempt) {
          setUserAttempt(attempt);
          setGuesses(attempt.guesses || Array(maxGuesses).fill(''));
          setCurrentAttempt(attempt.attempts || 0);
          setGameComplete(!!attempt.completed);
          setGameWon(!!attempt.completed && !!(attempt as any).won);
          setHintsUsed(attempt.hints_used || []);
        }

        const { data: stats } = await getUserStats(user.id);
        setUserStats(stats ?? mockStats);
      } else if (user) {
        // logged-in but no real word today → show mock stats
        setUserStats(mockStats);
      } else {
        // guest user → no stats
        setUserStats(null);
      }
    } catch (e) {
      console.error('Error loading Swirdle game:', e);
      setError("Failed to load today's game");
    } finally {
      setLoading(false);
    }
  };

  // Persist attempt (with override to avoid async state race)
  const saveAttempt = async (override?: { completed?: boolean; won?: boolean; attempts?: number }) => {
    if (!user || !todaysWord || !dbWordAvailable) return;

    const completed = override?.completed ?? gameComplete;
    const won = override?.won ?? gameWon;
    const attemptsToSave = override?.attempts ?? currentAttempt;

    try {
      const base: SwirdleAttempt = {
        id: userAttempt?.id,
        user_id: user.id,
        word_id: todaysWord.id,
        guesses: guesses.filter((g) => g.length > 0),
        attempts: attemptsToSave,
        completed,
        hints_used: hintsUsed,
        completed_at: completed ? new Date().toISOString() : null,
        // @ts-ignore allow won on your model if present
        won,
      };

      const { data: saved } = await recordAttempt(base);
      if (saved) setUserAttempt(saved);

      if (completed) {
        const { data: stats } = await upsertUserStats(user.id, { won, attempts: attemptsToSave });
        if (stats) setUserStats(stats);
      }
    } catch (e) {
      console.error('Error saving attempt:', e);
    }
  };

  // Award on win: event → +points → badges → refresh header
  const handleWinAward = async (guessesCount: number) => {
    if (!user?.id || awardBusy) return;
    setAwardBusy(true);
    try {
      await supabase.rpc('record_event', {
        p_user: user.id,
        p_type: 'SWIRDLE_WIN',
        p_meta: { guesses: guessesCount },
      });
      await supabase.rpc('add_points', { p_user: user.id, p_points: WIN_POINTS });
      await supabase.rpc('evaluate_badges', { p_user: user.id });
      await refreshPoints();
    } catch (e) {
      console.error('Swirdle award failed:', e);
    } finally {
      setAwardBusy(false);
    }
  };

  // Buy a hint with points
  async function buyHint(hintIndex: number) {
    if (!user?.id || purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      const { data: ok, error } = await supabase.rpc('spend_points', {
        p_user: user.id,
        p_cost: HINT_COST,
        p_reason: 'HINT_PURCHASE',
        p_meta: { game: 'SWIRDLE', hint_index: hintIndex, attempt: currentAttempt },
      });
      if (error) throw error;
      if (!ok) {
        alert('Not enough points to buy this hint.');
        return;
      }

      // Optional analytics event
      await supabase.rpc('record_event', {
        p_user: user.id,
        p_type: 'HINT_PURCHASED',
        p_meta: { game: 'SWIRDLE', hint_index: hintIndex, cost: HINT_COST },
      });

      // unlock and refresh header points
      useHint(hintIndex);
      await refreshPoints();
    } catch (e: any) {
      console.error('buyHint failed:', e);
      alert(e.message ?? 'Purchase failed.');
    } finally {
      setPurchaseBusy(false);
    }
  }

  // Input -> submit
  const handleSubmitGuess = () => {
    if (!todaysWord || currentGuess.length !== todaysWord.word.length || gameComplete) return;

    const guessUpper = currentGuess.toUpperCase();
    const answerUpper = todaysWord.word.toUpperCase();

    const newGuesses = [...guesses];
    newGuesses[currentAttempt] = guessUpper;
    setGuesses(newGuesses);

    const newAttemptCount = currentAttempt + 1;
    setCurrentAttempt(newAttemptCount);

    if (guessUpper === answerUpper) {
      setGameWon(true);
      setGameComplete(true);
      generateShareText(newAttemptCount, true);
      if (user) {
        saveAttempt({ completed: true, won: true, attempts: newAttemptCount });
        void handleWinAward(newAttemptCount);
      }
    } else if (newAttemptCount === maxGuesses) {
      setGameComplete(true);
      generateShareText(newAttemptCount, false);
      if (user) saveAttempt({ completed: true, won: false, attempts: newAttemptCount });
    } else {
      // Offer hints on attempts 3, 4, 5
      if ((newAttemptCount === 3 || newAttemptCount === 4 || newAttemptCount === 5) && todaysWord.hints?.length) {
        const hintIndex = newAttemptCount - 3; // 0, 1, 2
        if (hintIndex < todaysWord.hints.length && !hintsUsed.includes(hintIndex)) {
          setAvailableHint(todaysWord.hints[hintIndex]);
          setShowHintModal(true);
        }
      }
      if (user) saveAttempt({ completed: false, won: false, attempts: newAttemptCount });
    }

    setCurrentGuess('');
  };

  const useHint = (hintIndex: number) => {
    if (!hintsUsed.includes(hintIndex)) {
      setHintsUsed((prev) => [...prev, hintIndex]);
      setShowHintModal(false);
      if (user) saveAttempt(); // persist hints
    }
  };

  const generateShareText = (attempts: number, won: boolean) => {
    if (!todaysWord) return;

    const result = won ? `${attempts}/6` : 'X/6';
    const squares = guesses
      .slice(0, attempts)
      .map((guess) => {
        if (!guess) return '';
        return guess
          .split('')
          .map((letter, index) => {
            const status = getLetterStatus(letter, index, guess);
            if (status === 'correct' || status === 'correct-word') return '🟩';
            if (status === 'present') return '🟨';
            return '⬛';
          })
          .join('');
      })
      .join('\n');

    const hintsText = hintsUsed.length > 0 ? ` (${hintsUsed.length} hint${hintsUsed.length > 1 ? 's' : ''} used)` : '';
    const text = `Swirdle ${result}${hintsText}\n\n${squares}\n\nPlay at ${window.location.origin}/swirdle`;
    setShareText(text);
  };

  const shareResults = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Swirdle Results',
          text: shareText,
          url: `${window.location.origin}/swirdle`,
        });
      } catch {
        await navigator.clipboard.writeText(shareText);
        alert('Results copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert('Results copied to clipboard!');
    }
    setShowShareModal(false);
  };

  const getLetterStatus = (letter: string, position: number, word: string): string => {
    if (!todaysWord) return 'empty';

    const guess = word.toUpperCase();
    const answer = todaysWord.word.toUpperCase();

    if (guess === answer) return 'correct-word';

    const statuses = computeStatuses(answer, guess);
    return statuses[position]; // 'correct' | 'present' | 'absent'
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-amber-100 text-amber-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'grape_variety':
        return 'bg-purple-100 text-purple-800';
      case 'wine_region':
        return 'bg-blue-100 text-blue-800';
      case 'tasting_term':
        return 'bg-amber-100 text-amber-800';
      case 'production':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // === Admin actions ===
  const publishToday = async () => {
    if (!todaysWord) return;
    try {
      setAdminBusy(true);
      const { error } = await supabase
        .from('swirdle_words')
        .update({ is_published: true })
        .eq('id', todaysWord.id);
      if (error) throw error;
      setTodaysWord({ ...todaysWord, is_published: true });
    } catch (e: any) {
      alert(`Publish failed: ${e.message || e}`);
    } finally {
      setAdminBusy(false);
    }
  };

  const unpublishToday = async () => {
    if (!todaysWord) return;
    try {
      setAdminBusy(true);
      const { error } = await supabase
        .from('swirdle_words')
        .update({ is_published: false })
        .eq('id', todaysWord.id);
      if (error) throw error;
      setTodaysWord({ ...todaysWord, is_published: false });
    } catch (e: any) {
      alert(`Unpublish failed: ${e.message || e}`);
    } finally {
      setAdminBusy(false);
    }
  };

  const setTodayAndPublish = async () => {
    if (!todaysWord) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      setAdminBusy(true);
      const { error } = await supabase
        .from('swirdle_words')
        .update({ date_scheduled: today, is_published: true })
        .eq('id', todaysWord.id);
      if (error) throw error;
      setTodaysWord({ ...todaysWord, date_scheduled: today, is_published: true });
    } catch (e: any) {
      alert(`Set as today failed: ${e.message || e}`);
    } finally {
      setAdminBusy(false);
    }
  };

  // ===== Early returns (guards) =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Wine className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Game Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!todaysWord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Game Today</h1>
          <p className="text-gray-600">Check back tomorrow for a new Swirdle challenge!</p>
        </div>
      </div>
    );
  }

  // ===== Main render =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Wine className="w-8 h-8 text-purple-600 mr-2" />
            <h1 className="text-4xl font-bold text-gray-900">Swirdle</h1>
          </div>
          <p className="text-lg text-gray-600 mb-2">{t('swirdle.dailyChallenge', 'Daily Wine Word Challenge')}</p>
          <p className="text-sm text-gray-500">
            Guess the {todaysWord.word.length}-letter wine term in {maxGuesses} tries
          </p>

          {/* Word Info */}
          <div className="flex items-center justify-center space-x-4 mt-4">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(todaysWord.difficulty)}`}>
              {todaysWord.difficulty}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(todaysWord.category)}`}>
              {todaysWord.category.replace('_', ' ')}
            </span>
          </div>

          {/* Login prompt */}
          {!user && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Sign in to track your progress!</strong> You can play as a guest, but only registered users can save streaks and stats.
              </p>
            </div>
          )}
        </div>

        {/* Admin tools */}
        {isAdmin && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-purple-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Admin tools</h3>
              </div>
              <div className="text-sm text-gray-700 grid sm:grid-cols-2 gap-3">
                <div>
                  <div><span className="font-medium">Word:</span> {todaysWord.word}</div>
                  <div><span className="font-medium">Scheduled:</span> {todaysWord.date_scheduled}</div>
                  <div>
                    <span className="font-medium">Published:</span>{' '}
                    <span className={todaysWord.is_published ? 'text-green-700' : 'text-gray-600'}>
                      {String(todaysWord.is_published)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  <button
                    onClick={publishToday}
                    disabled={adminBusy || todaysWord.is_published}
                    className="px-3 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
                  >
                    Publish
                  </button>
                  <button
                    onClick={unpublishToday}
                    disabled={adminBusy || !todaysWord.is_published}
                    className="px-3 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                  <button
                    onClick={setTodayAndPublish}
                    disabled={adminBusy}
                    className="px-3 py-2 bg-purple-600 text-white rounded-md"
                  >
                    Set as today & publish
                  </button>
                  {dashboardUrl && (
                    <a
                      href={dashboardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 border border-purple-600 text-purple-700 rounded-md"
                    >
                      Open in Supabase
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Board */}
        <div className="max-w-lg mx-auto mb-8">
          <div className="grid gap-2 mb-6">
            {Array.from({ length: maxGuesses }, (_, i) => (
              <div key={i} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${todaysWord.word.length}, minmax(0, 1fr))` }}>
                {Array.from({ length: todaysWord.word.length }, (_, j) => {
                  const guess = guesses[i];
                  const letter = guess && guess[j] ? guess[j] : '';
                  const status = guess ? getLetterStatus(letter, j, guess) : '';

                  return (
                    <div
                      key={j}
                      className={`
                        w-12 h-12 border-2 rounded-lg flex items-center justify-center font-bold text-lg transition-all duration-500
                        ${
                          status === 'correct-word'
                            ? 'bg-green-500 text-white border-green-500 animate-pulse shadow-lg'
                            : status === 'correct'
                            ? 'bg-green-500 text-white border-green-500 shadow-md'
                            : status === 'present'
                            ? 'bg-yellow-500 text-white border-yellow-500 shadow-md'
                            : status === 'absent'
                            ? 'bg-gray-500 text-white border-gray-500'
                            : !gameComplete && i === currentAttempt
                            ? 'border-blue-400 bg-blue-50 shadow-sm'
                            : 'border-gray-300 bg-white'
                        }
                      `}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Input */}
          {!gameComplete && (
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentGuess}
                  onChange={(e) => setCurrentGuess(e.target.value.slice(0, todaysWord.word.length).toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitGuess()}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-lg text-center uppercase"
                  placeholder={`Enter ${todaysWord.word.length}-letter wine term`}
                  maxLength={todaysWord.word.length}
                />
                <button
                  onClick={handleSubmitGuess}
                  disabled={currentGuess.length !== todaysWord.word.length}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  {t('swirdle.guess', 'Guess')}
                </button>
              </div>

              {/* Attempts remaining */}
              <div className="text-center text-sm text-gray-500">{maxGuesses - currentAttempt} attempts remaining</div>
            </div>
          )}

          {/* Game Result */}
          {gameComplete && (
            <div className="text-center mb-8">
              {gameWon ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="text-xl font-semibold text-green-800 mb-2">
                    {t('swirdle.congratulations', 'Congratulations!')}
                  </h3>
                  <p className="text-green-700 mb-2">
                    <span className="font-semibold">{todaysWord.word}</span> is {todaysWord.definition}
                  </p>
                  <p className="text-green-600 text-sm">
                    You solved it in {currentAttempt} {currentAttempt === 1 ? 'try' : 'tries'}
                    {hintsUsed.length > 0 && <> ({hintsUsed.length} hint{hintsUsed.length > 1 ? 's' : ''} used)</>}
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <Target className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <h3 className="text-xl font-semibold text-red-800 mb-2">
                    {t('swirdle.badLuck', 'Bad luck!')}
                  </h3>
                  <p className="text-red-700 mb-2">
                    Today’s word is <span className="font-semibold">{todaysWord.word}</span> — {todaysWord.definition}
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowShareModal(true)}
                className="mt-6 flex items-center justify-center mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t('swirdle.shareResult', 'Share Result')}
              </button>
            </div>
          )}
        </div>

        {/* Hints */}
        <div className="max-w-lg mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Lightbulb className="w-5 h-5 text-amber-600 mr-2" />
              {t('swirdle.hints', 'Hints')}
            </h3>
            <span className="text-sm text-gray-500">{hintsUsed.length}/{todaysWord.hints.length} used</span>
          </div>

          <div className="space-y-3">
            {todaysWord.hints.map((hint, index) => {
              const isUnlocked = hintsUsed.includes(index);
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all ${
                    isUnlocked ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="font-medium">Hint {index + 1}:</span>
                      <span className="ml-2">{isUnlocked ? hint : '???'}</span>
                    </div>

                    {isUnlocked ? (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    ) : user ? (
                      <button
                        onClick={() => buyHint(index)}
                        disabled={purchaseBusy}
                        className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50"
                      >
                        {purchaseBusy ? '...' : `Buy (-${HINT_COST} pts)`}
                      </button>
                    ) : (
                      <a href="/signin" className="text-xs text-blue-600 underline">Sign in</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Stats */}
        {user && userStats && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Trophy className="w-5 h-5 text-amber-600 mr-2" />
                {t('swirdle.yourStats', 'Your Stats')}
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{userStats.games_played}</div>
                  <div className="text-sm text-gray-600">{t('swirdle.gamesPlayed', 'Games Played')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {userStats.games_played > 0 ? Math.round((userStats.games_won / userStats.games_played) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">{t('swirdle.winRate', 'Win Rate')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{userStats.current_streak}</div>
                  <div className="text-sm text-gray-600">{t('swirdle.currentStreak', 'Current Streak')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{userStats.max_streak}</div>
                  <div className="text-sm text-gray-600">{t('swirdle.bestStreak', 'Best Streak')}</div>
                </div>
              </div>

              {userStats.current_streak > 0 && (
                <div className="mt-4 text-center">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-amber-600 mr-2" />
                      <span className="text-amber-800 font-medium">{userStats.current_streak} day streak! Keep it up!</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guest prompt */}
        {!user && (
          <div className="max-w-lg mx-auto mt-8">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center">
              <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Want to Track Your Progress?</h3>
              <p className="text-gray-600 mb-4">Sign up to save your streaks, view detailed stats, and compete on the leaderboard!</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Sign Up Free
                </a>
                <a href="/signin" className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium transition-colors">
                  Sign In
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Hint Modal */}
        {showHintModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Need a Hint?</h3>
                <button onClick={() => setShowHintModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <Lightbulb className="w-5 h-5 text-amber-600 mb-2" />
                  <p className="text-amber-800 font-medium mb-2">Here's a hint:</p>
                  <p className="text-amber-700">{availableHint}</p>
                </div>
                <p className="text-gray-600 text-sm">Using hints will be noted in your results, but you can still win!</p>
              </div>

              <div className="flex space-x-3">
                {user ? (
                  <button
                    onClick={() => {
                      const hintIndex = currentAttempt - 3; // 0..2
                      buyHint(hintIndex);
                    }}
                    disabled={purchaseBusy}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {purchaseBusy ? 'Processing…' : `Buy Hint (-${HINT_COST} pts)`}
                  </button>
                ) : (
                  <a
                    href="/signin"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-lg font-medium text-center"
                  >
                    Sign in to buy hint
                  </a>
                )}
                <button
                  onClick={() => setShowHintModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  No Thanks
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Share Your Result</h3>
                <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">{shareText}</pre>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={shareResults}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Swirdle;
