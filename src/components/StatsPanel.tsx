// src/components/StatsPanel.tsx
import React from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  userId: string | null | undefined;
  lookbackDays?: number; // default 90
};

type Attempt = {
  id: string;
  correct: boolean;
  created_at: string;
};

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export default function StatsPanel({ userId, lookbackDays = 90 }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [gamesPlayed, setGamesPlayed] = React.useState(0);
  const [winRate, setWinRate] = React.useState(0);
  const [currentStreak, setCurrentStreak] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // ⬇️ If your table is named differently, update here.
        const since = addDays(new Date(), -lookbackDays).toISOString();
        const { data, error } = await supabase
          .from('vocab_attempts') // <-- table name
          .select('id, correct, created_at')
          .eq('user_id', userId)
          .gte('created_at', since)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const attempts = (data || []) as Attempt[];

        // Build a map of day => { played, correct }
        const byDay = new Map<string, { played: boolean; correct: boolean }>();
        for (const a of attempts) {
          const k = dateKey(new Date(a.created_at));
          const prev = byDay.get(k);
          if (!prev) {
            byDay.set(k, { played: true, correct: !!a.correct });
          } else {
            // if any attempt that day was correct, the day is a "win"
            byDay.set(k, { played: true, correct: prev.correct || !!a.correct });
          }
        }

        const playedDays = Array.from(byDay.keys());
        const wins = playedDays.filter((k) => byDay.get(k)?.correct).length;
        const played = playedDays.length;

        setGamesPlayed(played);
        setWinRate(played === 0 ? 0 : Math.round((wins / played) * 100));

        // Streaks
        // Build a set of correct days for quick membership checks
        const correctDays = new Set(
          playedDays.filter((k) => byDay.get(k)?.correct)
        );

        // Current streak: walk back from today by 1 day at a time
        let cs = 0;
        let cursor = new Date();
        while (correctDays.has(dateKey(cursor))) {
          cs += 1;
          cursor = addDays(cursor, -1);
        }
        setCurrentStreak(cs);

        // Best streak: scan through all days in window, counting contiguous corrects
        let bs = 0;
        let run = 0;
        for (let i = 0; i <= lookbackDays; i++) {
          const k = dateKey(addDays(addDays(new Date(), -lookbackDays), i));
          if (correctDays.has(k)) {
            run += 1;
            if (run > bs) bs = run;
          } else {
            run = 0;
          }
        }
        setBestStreak(bs);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, lookbackDays]);

  return (
    <section className="bg-card border rounded-2xl shadow-sm p-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span role="img" aria-label="trophy">🏆</span> Your Stats
      </h3>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-8 bg-muted rounded animate-pulse" />
        </div>
      ) : !userId ? (
        <p className="text-sm text-muted-foreground mt-3">
          Sign in to see your personalized stats.
        </p>
      ) : error ? (
        <p className="text-sm text-destructive mt-3">{error}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Stat label="Games Played" value={gamesPlayed} />
            <Stat label="Win Rate" value={`${winRate}%`} />
            <Stat label="Current Streak" value={currentStreak} />
            <Stat label="Best Streak" value={bestStreak} />
          </div>

          {currentStreak > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-4 py-2 text-sm">
              🔥 {currentStreak} day streak! Keep it up!
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
