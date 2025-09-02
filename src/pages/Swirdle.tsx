// src/pages/Swirdle.tsx
import React, { useEffect, useState } from 'react';
import {
  Wine, Trophy, Target, Share2, Brain, Calendar,
  Lightbulb, X, CheckCircle
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';
import { supabase } from '@/lib/supabase';

// =================== Config ===================
const HINT_COST = 5;        // points to buy a hint
const WIN_POINTS = 15;      // points awarded on a win (used if award_points_v1 has no catalog default)
const MAX_GUESSES = 6;
const TZ = 'Australia/Adelaide';

// =================== Helpers ===================
const Spinner = () => (
  <div className="flex items-center justify-center p-6">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
  </div>
);

// Adelaide YYYY-MM-DD
function formatDateAdelaide(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d)
    .reduce((a: any, p: any) => (a[p.type] = p.value, a), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function addDays(dateStr: string, delta: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return formatDateAdelaide(d);
}
function cyrb53(str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = (Math.imul(h1 ^ (h1>>>16),2246822507)^Math.imul(h2 ^ (h2>>>13),3266489909))>>>0;
  h2 = (Math.imul(h2 ^ (h2>>>16),2246822507)^Math.imul(h1 ^ (h1>>>13),3266489909))>>>0;
  return (h2 & 2097151) * 4294967296 + h1;
}

// Minimal Wordle-like status calc
function computeStatuses(answer: string, guess: string): Array<'correct' | 'present' | 'absent'> {
  const A = answer.toUpperCase().split('');
  const G = guess.toUpperCase().split('');
  const out: Array<'correct' | 'present' | 'absent'> = Array(G.length).fill('absent');

  const remaining: Record<string, number> = {};
  for (let i = 0; i < A.length; i++) {
    if (G[i] === A[i]) out[i] = 'correct';
    else remaining[A[i]] = (remaining[A[i]] ?? 0) + 1;
  }
  for (let i = 0; i < A.length; i++) {
    if (out[i] === 'correct') continue;
    const ch = G[i];
    if ((remaining[ch] ?? 0) > 0) { out[i] = 'present'; remaining[ch] -= 1; }
  }
  return out;
}

function emojiGrid(answer: string, guesses: string[]) {
  return guesses
    .map((g) => computeStatuses(answer, g)
      .map(s => s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛').join(''))
    .join('\n');
}

// =================== Inline service (DB I/O) ===================
export type SwirdleWord = {
  id: string;
  word: string;
  definition: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | string;
  category: 'grape_variety' | 'wine_region' | 'tasting_term' | 'production' | string;
  hints: string[];
  date_scheduled: string; // YYYY-MM-DD
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
  games_played: number;
  wins: number;
  current_streak: number;
  max_streak: number;
  last_played: string | null; // YYYY-MM-DD
  updated_at: string | null;
};

async function getWordForDate(date: string): Promise<{ data: SwirdleWord | null; error: any | null }> {
  const { data, error } = await supabase
    .from('swirdle_words')
    .select('id, word, definition, difficulty, category, hints, date_scheduled, is_published')
    .eq('date_scheduled', date)
    .eq('is_published', true)
    .maybeSingle();
  return { data: (data as SwirdleWord) ?? null, error };
}

// fallback: deterministically pick any published word by date
async function getDeterministicWordForDate(date: string): Promise<SwirdleWord | null> {
  const { data, error } = await supabase
    .from('swirdle_words')
    .select('id, word, definition, difficulty, category, hints, is_published')
    .eq('is_published', true);
  if (error || !data?.length) return null;
  const list = data as any[];
  const idx = cyrb53(date) % list.length;
  const w = list[idx];
  return {
    id: w.id, word: w.word, definition: w.definition,
    difficulty: w.difficulty, category: w.category,
    hints: w.hints ?? [], date_scheduled: date, is_published: true
  };
}

async function getAttempt(userId: string, wordId: string): Promise<{ data: SwirdleAttempt | null; error: any | null }> {
  const { data, error } = await supabase
    .from('swirdle_attempts')
    .select('id, user_id, word_id, guesses, attempts, completed, won, hints_used, completed_at, created_at, updated_at')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .maybeSingle();
  return { data: (data as SwirdleAttempt) ?? null, error };
}

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

async function fetchUserStats(userId: string): Promise<{ data: UserStats | null; error: any | null }> {
  const { data, error } = await supabase
    .from('user_swirdle_stats')
    .select('user_id, games_played, wins, current_streak, max_streak, last_played, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  return { data: (data as UserStats) ?? null, error };
}

// ✅ streak is consecutive by Adelaide date
async function upsertUserStatsRow(userId: string, didWin: boolean, attempts: number): Promise<{ data: UserStats | null; error: any | null }> {
  const today = formatDateAdelaide();
  const yesterday = addDays(today, -1);
  const { data: existing } = await fetchUserStats(userId);

  let games_played = (existing?.games_played ?? 0) + 1;
  let wins = (existing?.wins ?? 0) + (didWin ? 1 : 0);

  let current_streak = existing?.current_streak ?? 0;
  if (didWin) {
    current_streak = existing?.last_played === yesterday ? current_streak + 1 : 1;
  } else {
    current_streak = 0;
  }
  const max_streak = didWin ? Math.max(existing?.max_streak ?? 0, current_streak) : (existing?.max_streak ?? 0);

  const row: UserStats = {
    user_id: userId,
    games_played,
    wins,
    current_streak,
    max_streak,
    last_played: today,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_swirdle_stats')
    .upsert(row, { onConflict: 'user_id', ignoreDuplicates: false })
    .select()
    .maybeSingle();

  return { data: (data as UserStats) ?? null, error };
}

// =================== Component ===================
const Swirdle: React.FC = () => {
  const t = (_key: string, fallback?: string) => fallback ?? '';

  const { user } = useAuth();
  const { refreshPoints } = usePoints();

  const [todaysWord, setTodaysWord] = useState<SwirdleWord | null>(null);
  const [dbWordAvailable, setDbWordAvailable] = useState(false);
  const [userAttempt, setUserAttempt] = useState<SwirdleAttempt | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState<string[]>(Array(MAX_GUESSES).fill(''));
  const [gameComplete, setGameComplete] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const [hintsUsed, setHintsUsed] = useState<number[]>([]);
  const [showHintModal, setShowHintModal] = useState(false);
  const [availableHint, setAvailableHint] = useState<string>('');
  const [pendingHintIndex, setPendingHintIndex] = useState<number | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState(0);

  const [error, setError] = useState<string>('');
  const [shareText, setShareText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const [awardBusy, setAwardBusy] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);

  // ---- Best-effort membership + trial (no-op if RPCs missing) ----
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        await supabase.rpc('join_member', {
          p_plan: 'free',
          p_start_trial: true,
          p_locale: (navigator.language || 'en').slice(0, 2),
        });
      } catch { /* ignore */ }
      try {
        await supabase.rpc('vv_start_trial', { p_days: 7 });
      } catch { /* ignore */ }
    })();
  }, [user?.id]);

  // -------- Load game + stats --------
  useEffect(() => {
    (async () => {
      const today = formatDateAdelaide();

      // safe mock if absolutely nothing in DB
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

      try {
        setLoading(true);
        setError('');

        // Today’s word (scheduled) or deterministic fallback
        let wordData: SwirdleWord | null = null;
        const scheduled = await getWordForDate(today);
        wordData = scheduled.data;
        if (!wordData) wordData = await getDeterministicWordForDate(today);
        setDbWordAvailable(!!wordData);
        setTodaysWord(wordData ?? mockWord);

        // Attempts + stats when signed in
        if (user?.id && wordData) {
          const { data: attempt } = await getAttempt(user.id, wordData.id);
          if (attempt) {
            setUserAttempt(attempt);
            setGuesses([...Array(MAX_GUESSES)].map((_, i) => attempt.guesses?.[i] ?? ''));
            setCurrentAttempt(attempt.attempts || 0);
            setGameComplete(!!attempt.completed);
            setGameWon(!!attempt.completed && !!attempt.won);
            setHintsUsed(attempt.hints_used || []);
          }

          const { data: stats } = await fetchUserStats(user.id);
          setUserStats(stats ?? null);
        } else if (user?.id) {
          const { data: stats } = await fetchUserStats(user.id);
          setUserStats(stats ?? null);
        } else {
          setUserStats(null); // guest
        }
      } catch (e) {
        console.error('Swirdle load error:', e);
        setError("Failed to load today's game");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  // -------- Persist attempt + leaderboard/badges --------
function calcPoints(won: boolean, hints: number) {
  if (!won) return 0;
  const raw = WIN_POINTS - HINT_COST * hints;
  return Math.max(0, raw);
}

async function saveAttempt(override?: { completed?: boolean; won?: boolean; attempts?: number }) {
  if (!user?.id || !todaysWord || !dbWordAvailable) return;

  const completed = override?.completed ?? gameComplete;
  const won = override?.won ?? gameWon;
  const attemptsToSave = override?.attempts ?? currentAttempt;

  try {
    // 1) Upsert gameplay attempt (guesses, completed state, etc.)
    const base: SwirdleAttempt = {
      id: userAttempt?.id,
      user_id: user.id,
      word_id: todaysWord.id,
      guesses: guesses.filter((g) => g.length > 0),
      attempts: attemptsToSave,
      completed,
      won,
      hints_used: hintsUsed,
      completed_at: completed ? new Date().toISOString() : null,
    };

    const { data: saved, error: upsertErr } = await recordAttempt(base);
    if (upsertErr) throw upsertErr;
    if (saved) setUserAttempt(saved);

    // 2) If completed, upsert stats to get the streak, then write leaderboard fields
    if (completed) {
      // Update per-user stats (your existing table/logic)
      const { data: stats, error: statsErr } = await upsertUserStatsRow(user.id, !!won, attemptsToSave);
      if (statsErr) console.warn('stats upsert warning:', statsErr?.message);
      if (stats) setUserStats(stats ?? null);

      // Compute points + streak_after
      const pointsAwarded = calcPoints(!!won, hintsUsed.length);
      const streakAfter = stats?.current_streak ?? (won ? 1 : 0);

      // 3) Update the same attempt row with leaderboard fields
      if (saved?.id) {
        const { error: updateErr } = await supabase
          .from('swirdle_attempts')
          .update({
            points: pointsAwarded,
            streak_after: streakAfter,
            played_at: new Date().toISOString(),
          })
          .eq('id', saved.id);
        if (updateErr) console.warn('attempt leaderboard update warning:', updateErr?.message);
      } else {
        // Fallback: set by compound key (user_id + word_id) if id missing
        const { error: updateErr2 } = await supabase
          .from('swirdle_attempts')
          .update({
            points: pointsAwarded,
            streak_after: streakAfter,
            played_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('word_id', todaysWord.id);
        if (updateErr2) console.warn('attempt leaderboard update (fallback) warning:', updateErr2?.message);
      }

      // 4) Badge award — idempotent (safe to call every completion)
      try {
        await supabase.rpc('award_badges_for_user', { p_user_id: user.id });
      } catch (e: any) {
        console.warn('award_badges_for_user warning:', e?.message ?? e);
      }
    }
  } catch (e) {
    console.error('saveAttempt error:', e);
  }
}

  // -------- Award on win (robust pipeline) --------
  async function handleWinAward(guessesCount: number) {
    if (!user?.id || awardBusy) return;
    setAwardBusy(true);
    try {
      // 1) Preferred: single generic points RPC
      const ap = await supabase.rpc('award_points_v1', {
        p_activity: 'swirdle',
        p_ref_id: String(todaysWord?.id ?? ''),
        p_points: null, // use catalog default if configured; fallback below if not
        p_meta: { guesses: guessesCount },
      });

      if (ap.error) {
        // 2) Fallback: old-style chain
        try { await supabase.rpc('record_event', { p_user: user.id, p_type: 'SWIRDLE_WIN', p_meta: { guesses: guessesCount } }); } catch {}
        try { await supabase.rpc('add_points', { p_user: user.id, p_points: WIN_POINTS }); } catch {}
        try { await supabase.rpc('evaluate_badges', { p_user: user.id }); } catch {}
      }

      await refreshPoints();
    } catch (e) {
      console.error('award RPC failed:', e);
    } finally {
      setAwardBusy(false);
    }
  }

  // -------- Buy a hint --------
  async function buyHint(hintIndex: number) {
    if (!user?.id || purchaseBusy || hintIndex == null) return;
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

      // unlock it locally
      useHint(hintIndex);

      // show the text now that it’s purchased
      if (todaysWord?.hints?.[hintIndex]) {
        setAvailableHint(todaysWord.hints[hintIndex]);
      }

      try {
        await supabase.rpc('record_event', {
          p_user: user.id,
          p_type: 'HINT_PURCHASED',
          p_meta: { game: 'SWIRDLE', hint_index: hintIndex, cost: HINT_COST },
        });
      } catch {/* ignore */}

      await refreshPoints();
    } catch (e: any) {
      console.error('buyHint failed:', e);
      alert(e?.message ?? 'Purchase failed.');
    } finally {
      setPurchaseBusy(false);
    }
  }

  // -------- Guess submission --------
  function handleSubmitGuess() {
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
      if (user?.id) {
        saveAttempt({ completed: true, won: true, attempts: newAttemptCount });
        void handleWinAward(newAttemptCount);
      }
    } else if (newAttemptCount === MAX_GUESSES) {
      setGameComplete(true);
      generateShareText(newAttemptCount, false);
      if (user?.id) saveAttempt({ completed: true, won: false, attempts: newAttemptCount });
    } else {
      // Offer hints on attempts 3,4,5 (0,1,2 indexes)
      if ((newAttemptCount === 3 || newAttemptCount === 4 || newAttemptCount === 5) && todaysWord.hints?.length) {
        const hintIndex = newAttemptCount - 3;
        if (hintIndex < todaysWord.hints.length && !hintsUsed.includes(hintIndex)) {
          setPendingHintIndex(hintIndex);
          setAvailableHint(''); // keep hidden until bought
          setShowHintModal(true);
        }
      }
      if (user?.id) saveAttempt({ completed: false, won: false, attempts: newAttemptCount });
    }

    setCurrentGuess('');
  }

  function useHint(hintIndex: number) {
    if (!hintsUsed.includes(hintIndex)) {
      setHintsUsed((prev) => [...prev, hintIndex]);
      if (user?.id) saveAttempt(); // persist
    }
  }

  // -------- Share text --------
  function generateShareText(attempts: number, won: boolean) {
    if (!todaysWord) return;
    const result = won ? `${attempts}/6` : 'X/6';
    const squares = emojiGrid(todaysWord.word, guesses.slice(0, attempts).filter(Boolean));
    const hintsText = hintsUsed.length > 0 ? ` (${hintsUsed.length} hint${hintsUsed.length > 1 ? 's' : ''} used)` : '';
    setShareText(`Swirdle ${formatDateAdelaide()} ${result}${hintsText}\n\n${squares}\n\n${window.location.origin}/swirdle`);
  }

  function getLetterStatus(letter: string, position: number, word: string): string {
    if (!todaysWord) return 'empty';
    const guess = word.toUpperCase();
    const answer = todaysWord.word.toUpperCase();
    if (guess === answer) return 'correct-word';
    const statuses = computeStatuses(answer, guess);
    return statuses[position];
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-amber-100 text-amber-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getCategoryColor(category: string) {
    switch (category) {
      case 'grape_variety': return 'bg-purple-100 text-purple-800';
      case 'wine_region': return 'bg-blue-100 text-blue-800';
      case 'tasting_term': return 'bg-amber-100 text-amber-800';
      case 'production': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // =================== Render ===================
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
            Guess the {todaysWord.word.length}-letter wine term in {MAX_GUESSES} tries
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

        {/* Game Board */}
        <div className="max-w-lg mx-auto mb-8">
          <div className="grid gap-2 mb-6">
            {Array.from({ length: MAX_GUESSES }, (_, i) => (
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

              <div className="text-center text-sm text-gray-500">{MAX_GUESSES - currentAttempt} attempts remaining</div>
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
                onClick={() => {
                  const attempts = currentAttempt;
                  const won = gameWon;
                  const squares = emojiGrid(todaysWord.word, guesses.slice(0, attempts).filter(Boolean));
                  const hintsText = hintsUsed.length ? ` (${hintsUsed.length} hint${hintsUsed.length > 1 ? 's' : ''} used)` : '';
                  const text = `Swirdle ${formatDateAdelaide()} ${won ? `${attempts}/6` : 'X/6'}${hintsText}\n\n${squares}\n\n${window.location.origin}/swirdle`;
                  setShareText(text);
                  setShowShareModal(true);
                }}
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
                        onClick={() => {
                          setPendingHintIndex(index);
                          setAvailableHint('');
                          setShowHintModal(true);
                        }}
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
                    {userStats.games_played > 0 ? Math.round((userStats.wins / userStats.games_played) * 100) : 0}%
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
                {pendingHintIndex !== null && hintsUsed.includes(pendingHintIndex) ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <Lightbulb className="w-5 h-5 text-amber-600 mb-2" />
                    <p className="text-amber-800 font-medium mb-2">Here’s your hint:</p>
                    <p className="text-amber-700">
                      {availableHint || (todaysWord?.hints?.[pendingHintIndex] ?? '')}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <Lightbulb className="w-5 h-5 text-gray-500 mb-2" />
                    <p className="text-gray-700 font-medium mb-2">Reveal a hint?</p>
                    <p className="text-gray-600 text-sm">
                      Spend <strong>{HINT_COST} points</strong> to unlock this hint for attempt <strong>{currentAttempt}</strong>.
                    </p>
                  </div>
                )}
                <p className="text-gray-600 text-sm">Using hints will be noted in your results, but you can still win!</p>
              </div>

              <div className="flex space-x-3">
                {pendingHintIndex !== null && !hintsUsed.includes(pendingHintIndex) ? (
                  user ? (
                    <button
                      onClick={() => buyHint(pendingHintIndex)}
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
                  )
                ) : (
                  <button
                    onClick={() => setShowHintModal(false)}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                )}
                <button
                  onClick={() => setShowHintModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {pendingHintIndex !== null && !hintsUsed.includes(pendingHintIndex) ? 'No Thanks' : 'Dismiss'}
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
                  onClick={async () => {
                    if (navigator.share) {
                      try { await navigator.share({ text: shareText }); }
                      catch { await navigator.clipboard.writeText(shareText); alert('Results copied to clipboard!'); }
                    } else {
                      await navigator.clipboard.writeText(shareText);
                      alert('Results copied to clipboard!');
                    }
                    setShowShareModal(false);
                  }}
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
