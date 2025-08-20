// src/pages/VinoVocabPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import StatsPanel from '@/components/StatsPanel';

type Challenge = {
  id: string;
  for_date?: string | null;
  date?: string | null; // fallback if older seed used `date`
  term: string;
  question?: string | null;
  options: string[];
  correct_option_index: number;
  hint?: string | null;
  points?: number | null;
};

const VinoVocabPage: React.FC = () => {
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<{ correct: boolean; points: number } | null>(null);

  // ---- Load today's challenge ------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        // Prefer new `for_date` column. If none, try legacy `date`.
        let { data, error } = await supabase
          .from('vocab_daily_challenges')
          .select('id,for_date,date,term,question,options,correct_option_index,hint,points')
          .eq('for_date', today)
          .maybeSingle();

        if (!data) {
          const fallback = await supabase
            .from('vocab_daily_challenges')
            .select('id,for_date,date,term,question,options,correct_option_index,hint,points')
            .eq('date', today)
            .maybeSingle();
          data = fallback.data as any;
          error = fallback.error as any;
        }

        if (error) throw error;
        setChallenge(data as Challenge);
      } catch (e: any) {
        console.error('Failed to load vocab challenge:', e?.message || e);
        setStatus('Could not load today’s Vino Vocab.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayDate = useMemo(() => {
    const d = challenge?.for_date || challenge?.date;
    return d ? new Date(d).toDateString() : new Date().toDateString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge?.for_date, challenge?.date]);

  // If the author left `question` blank, create a helpful default.
  const displayQuestion = useMemo(() => {
    if (!challenge) return '';
    const q = (challenge.question || '').trim();
    if (q) return q;
    return `Choose the best description for “${challenge.term}”.`;
  }, [challenge]);

  // ---- Submit attempt (uses your Netlify function so points track) ----------
  const onSubmit = async () => {
    if (!challenge || pick === null) return;
    setSubmitted(true);

    // Not signed in? allow the reveal but explain why points won’t save
    if (!user?.id) {
      setStatus('Sign in with your magic link to save points.');
      // still show correctness feedback
      const correct = pick === challenge.correct_option_index;
      setResult({ correct, points: correct ? challenge.points ?? 5 : 0 });
      return;
    }

    try {
      setStatus('Scoring…');
      const res = await fetch('/.netlify/functions/vocab-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          selection: pick,
          challenge_id: challenge.id, // harmless if function ignores it
        }),
      });
      const data = await res.json();

      if (data?.error) {
        setStatus(`Error: ${data.error}`);
      } else if (data?.alreadyAttempted) {
        setStatus('You’ve already completed today’s Vino Vocab.');
        setResult({ correct: data.correct ?? false, points: data.points ?? 0 });
      } else {
        setResult({ correct: !!data.correct, points: Number(data.points ?? 0) });
        setStatus('Saved!');
      }
    } catch (e: any) {
      console.error(e);
      setStatus('Something went wrong saving your attempt.');
    }
  };

  // ---- UI -------------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 pt-10">
        <div className="animate-pulse h-6 w-40 bg-muted rounded mb-4" />
        <div className="animate-pulse h-9 w-64 bg-muted rounded" />
      </div>
    );
  }
  if (!challenge) {
    return (
      <div className="max-w-3xl mx-auto p-6 pt-10">
        <h1 className="text-2xl font-bold">Vino Vocab</h1>
        <p className="text-muted-foreground mt-2">No challenge is scheduled for today yet.</p>
      </div>
    );
  }

  const answered = submitted && result !== null;
  const correctIndex = challenge.correct_option_index;

  // Simple placeholder stats (replace with live stats later)
  const gamesPlayed = 3;
  const winRate = 100;
  const currentStreak = 3;
  const bestStreak = 3;

  return (
    <div className="max-w-3xl mx-auto p-6 pt-10 space-y-6">
      {/* Header + explainer (outside the card) */}
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-purple-700">Vino Vocab</h1>
        <p className="text-sm text-muted-foreground mt-1">{displayDate}</p>

        <p className="mt-4 text-base text-muted-foreground">
          A cornerstone of wine confidence is your vocabulary. It’s putting a word next to what you
          see, smell, and taste. Not everyone will choose the same word—one person’s “tropical” is
          another’s “pineapple”. Do this daily and watch your wine vocab (and confidence) grow.
        </p>
      </header>

      {/* Challenge card */}
      <section className="bg-card border rounded-2xl shadow-sm p-6">
        {/* Term as an H2 for context */}
        <h2 className="text-xl font-semibold mb-1">{challenge.term}</h2>
        <p className="text-sm text-muted-foreground mb-4">{displayQuestion}</p>

        <div className="space-y-3">
          {challenge.options?.map((opt, i) => {
            const selected = pick === i;
            const isCorrect = answered && i === correctIndex;
            const isWrong = answered && selected && i !== correctIndex;

            const base =
              'w-full px-4 py-3 rounded-xl text-left font-medium transition border focus:outline-none';
            const normal = selected
              ? 'bg-purple-600 text-white border-purple-700 hover:bg-purple-600'
              : 'bg-white hover:bg-purple-50 text-foreground border-border';
            const afterAnswer = isCorrect
              ? 'bg-green-100 text-green-800 border-green-300'
              : isWrong
              ? 'bg-red-100 text-red-800 border-red-300'
              : 'bg-white text-muted-foreground border-border opacity-70';

            return (
              <button
                key={i}
                className={`${base} ${answered ? afterAnswer : normal}`}
                disabled={answered}
                onClick={() => !answered && setPick(i)}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <button
          onClick={onSubmit}
          disabled={pick === null || answered}
          className={`mt-5 w-full px-5 py-3 rounded-xl font-semibold transition 
            ${pick === null || answered ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
        >
          Submit
        </button>

        {/* Feedback */}
        {answered && (
          <div className="mt-3 text-sm">
            {result?.correct ? (
              <span className="text-green-700 font-medium">
                You got it right — +{result.points} points
              </span>
            ) : (
              <span className="text-red-700 font-medium">Not quite this time.</span>
            )}
          </div>
        )}

        {/* Optional hint when wrong */}
        {answered && !result?.correct && challenge.hint && (
          <div className="mt-3 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-3">
            Hint: {challenge.hint}
          </div>
        )}

      {status && (
        <p className="mt-3 text-sm text-muted-foreground">{status}</p>
      )}
    </section>

    {/* Stats (dynamic now) */}
    <StatsPanel userId={user?.id} />
  </div>
);
};

export default VinoVocabPage;

