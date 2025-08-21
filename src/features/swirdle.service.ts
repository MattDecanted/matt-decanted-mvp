// src/features/swirdle/swirdle.service.ts
import { supabase } from '@/lib/supabase';

export type SwirdleWord = {
  id: string;
  word: string;
  definition: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | string;
  category: string;
  hints: string[];
  date_scheduled: string | null;
  is_published: boolean;
};

export type SwirdleAttempt = {
  id?: string;
  user_id: string;
  word_id: string;
  guesses: string[];
  attempts: number;
  completed: boolean;
  won?: boolean | null;
  hints_used: number[];
  completed_at: string | null;
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

export async function getWordForDate(isoDate: string) {
  const { data, error } = await supabase
    .from('swirdle_words')
    .select('*')
    .eq('date_scheduled', isoDate)
    .eq('is_published', true)
    .maybeSingle();
  if (error) console.error('getWordForDate error:', error);
  return { data: data as SwirdleWord | null, error };
}

export async function getAttempt(userId: string, wordId: string) {
  const { data, error } = await supabase
    .from('swirdle_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .maybeSingle();
  if (error) console.error('getAttempt error:', error);
  return { data: data as SwirdleAttempt | null, error };
}

export async function recordAttempt(input: SwirdleAttempt) {
  const payload = {
    user_id: input.user_id,
    word_id: input.word_id,
    guesses: input.guesses,
    attempts: input.attempts,
    completed: input.completed,
    won: input.won ?? null,
    hints_used: input.hints_used,
    completed_at: input.completed_at,
  };
  const q = input.id
    ? supabase.from('swirdle_attempts').update(payload).eq('id', input.id).select('*').single()
    : supabase.from('swirdle_attempts').insert(payload).select('*').single();

  const { data, error } = await q;
  if (error) console.error('recordAttempt error:', error);
  return { data: data as SwirdleAttempt | null, error };
}

export async function getUserStats(userId: string) {
  const { data, error } = await supabase
    .from('swirdle_user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) console.error('getUserStats error:', error);
  return { data: (data as UserStats) ?? null, error };
}

export async function upsertUserStats(userId: string, opts: { won: boolean; attempts: number }) {
  // super-simple upsert; you can replace with a SQL function later
  const { data: curr } = await getUserStats(userId);
  const played = (curr?.games_played ?? 0) + 1;
  const won = (curr?.games_won ?? 0) + (opts.won ? 1 : 0);
  const avg =
    played > 0
      ? Math.round((((curr?.average_attempts ?? 0) * (played - 1)) + opts.attempts) * 100) / 100 / played
      : opts.attempts;

  const today = new Date().toISOString().slice(0, 10);

  const next = {
    user_id: userId,
    games_played: played,
    games_won: won,
    average_attempts: Number.isFinite(avg) ? avg : 0,
    current_streak: opts.won ? (curr?.current_streak ?? 0) + 1 : 0,
    max_streak: Math.max(curr?.max_streak ?? 0, opts.won ? (curr?.current_streak ?? 0) + 1 : curr?.max_streak ?? 0),
    last_played: today,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('swirdle_user_stats')
    .upsert(next, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) console.error('upsertUserStats error:', error);
  return { data: data as UserStats | null, error };
}
