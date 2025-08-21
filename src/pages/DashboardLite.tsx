// src/pages/DashboardLite.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

type TodayVocab = {
  id: string;
  for_date: string;
  word: string;
  definition: string;
  options: string[];
  correct_option_index: number;
  hint?: string | null;
  points?: number | null;
  created_at?: string;
};

const DashboardLite: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<TodayVocab | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<null | 'correct' | 'incorrect'>(null);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch or seed today's vocab
        const { data: vocab, error: rpcErr } = await supabase.rpc('get_or_seed_today_vocab');
        if (rpcErr) throw rpcErr;
        setToday(vocab as TodayVocab);

        // Fetch points
        if (user?.id) {
          const { data: ptsRow, error: ptsErr } = await supabase
            .from('user_points')
            .select('total_points')
            .eq('user_id', user.id)
            .maybeSingle();
          // PGRST116 = no rows; ignore
          if (ptsErr && (ptsErr as any).code !== 'PGRST116') throw ptsErr;
          setTotalPoints(ptsRow?.total_points ?? 0);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!user?.id || !today || selected == null || answered) return;

    setSubmitting(true);
    try {
      const correct = selected === today.correct_option_index;

      if (correct) {
        await supabase.rpc('record_event', { p_user: user.id, p_type: 'VOCAB_CORRECT', p_meta: {} });
        const award = today.points ?? 10;
        await supabase.rpc('add_points', { p_user: user.id, p_points: award });
        await supabase.rpc('evaluate_badges', { p_user: user.id });

        const { data: ptsRow, error: ptsErr } = await supabase
          .from('user_points')
          .select('total_points')
          .eq('user_id', user.id)
          .maybeSingle();
        if (ptsErr && (ptsErr as any).code !== 'PGRST116') throw ptsErr;
        setTotalPoints(ptsRow?.total_points ?? 0);

        setAnswered('correct');
      } else {
        setAnswered('incorrect');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Welcome to Matt Decanted</h1>
        <p className="mb-4">Please sign in to access your dashboard.</p>
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={() => navigate('/signin')}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="text-sm">
          <span className="font-medium">Points:</span> {totalPoints}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link to="/swirdle" className="block rounded-2xl border p-4 hover:shadow transition">
          <div className="text-lg font-medium mb-1">Play Swirdle</div>
          <div className="text-sm text-gray-600">Wordle-style daily fun. Earn points on a win.</div>
        </Link>
        <Link to="/wine-options" className="block rounded-2xl border p-4 hover:shadow transition">
          <div className="text-lg font-medium mb-1">Play Wine Options</div>
          <div className="text-sm text-gray-600">Quick 6–8 questions. Clear-glass version for MVP.</div>
        </Link>
      </div>

      {/* Today’s Vocab */}
      <div className="rounded-2xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Today’s Vocab</div>
          {!!today?.points && (
            <div className="text-xs rounded-full border px-2 py-1">+{today.points} pts</div>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : today ? (
          <>
            <div className="mb-1">
              <span className="font-semibold">{today.word}</span>
            </div>
            <div className="mb-3 text-gray-700">{today.definition}</div>

            {today.hint && (
              <div className="mb-3 text-xs text-gray-500">Hint: {today.hint}</div>
            )}

            <div className="space-y-2 mb-4">
              {today.options?.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                    selected === idx ? 'bg-gray-50' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="vocab"
                    checked={selected === idx}
                    onChange={() => setSelected(idx)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={selected == null || submitting || !!answered}
                onClick={handleSubmit}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>

              {answered === 'correct' && (
                <span className="text-green-600 text-sm">Correct! Points awarded.</span>
              )}
              {answered === 'incorrect' && (
                <span className="text-red-600 text-sm">
                  Not quite—try a game and come back tomorrow.
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600">No vocab available today.</div>
        )}
      </div>
    </div>
  );
};

export default DashboardLite;
