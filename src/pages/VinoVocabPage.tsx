// src/pages/VinoVocabPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import StatsPanel from '@/components/StatsPanel';

type ChallengeRow = {
  date: string;
  term?: string;              // e.g. "Acidity"
  word?: string;              // some tables use "word" instead of "term"
  question?: string;          // optional, when present we show it
  options: string[];
  correct_answer?: string;    // if you store plain text answer
  correct_option_index?: number;
};

const VinoVocabPage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ChallengeRow | null>(null);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Temporary (wired later to real stats)
  const gamesPlayed = 3;
  const winRate = 100;
  const currentStreak = 3;
  const bestStreak = 3;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('vocab_daily_challenges')
        .select('*')
        .eq('date', today)
        .maybeSingle<ChallengeRow>();

      if (error) {
        console.error('Error fetching vocab:', error);
      } else {
        setRow(data ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const term = row?.term || row?.word || ''; // support both column names

  // 1) Use explicit question if present
  // 2) Else fall back to a sensible prompt based on available data
  const prompt =
    row?.question ||
    (term
      ? `Choose the best description for “${term}”.`
      : 'Choose the best description:');

  const correctText =
    typeof row?.correct_option_index === 'number'
      ? row?.options?.[row.correct_option_index]
      : row?.correct_answer;

  const handleSubmit = async () => {
    if (!row || !selectedOption || submitted) return;

    const gotItRight =
      (typeof row.correct_option_index === 'number' &&
        selectedOption === row.options[row.correct_option_index]) ||
      (row.correct_answer && selectedOption === row.correct_answer);

    setIsCorrect(gotItRight);
    setSubmitted(true);

    // record (optional)
    if (user) {
      try {
        await supabase.from('user_vocab_logs').insert({
          user_id: user.id,
          word: term || '(unknown term)',
          correct: gotItRight,
          played_on: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not record user attempt:', e);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 pt-10">
        <div className="animate-pulse bg-white p-6 rounded-2xl shadow-md border border-gray-100">
          <div className="h-6 w-40 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-28 bg-gray-200 rounded mb-6" />
          <div className="h-5 w-64 bg-gray-200 rounded mb-2" />
          <div className="h-5 w-80 bg-gray-200 rounded mb-6" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl border border-gray-200" />
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded-xl mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pt-10">
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        {/* Title + onboarding blurb */}
        <h1 className="text-3xl font-extrabold text-purple-700 mb-2">Vino Vocab</h1>
        <p className="text-sm text-gray-500 mb-6">{new Date().toDateString()}</p>

        <p className="text-gray-700 leading-relaxed mb-6">
          A cornerstone of building confidence tasting wine is vocabulary—being able to put a word
          next to what you’re seeing, smelling, and tasting. Not everyone will be the same:
          one person’s “tropical” might be another’s “pineapple”. Do this every day and watch your
          wine vocab and confidence grow!
        </p>

        {/* Term heading if we have one */}
        {term && (
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{term}</h2>
        )}

        {/* Prompt (always shown, with fallback) */}
        <p className="text-md text-gray-800 mb-4">{prompt}</p>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {row?.options?.map((opt) => {
            const isRight = submitted && isCorrect && opt === selectedOption;
            const isWrong = submitted && isCorrect === false && opt === selectedOption;

            const base =
              'w-full px-4 py-3 rounded-xl text-left font-medium transition cursor-pointer border focus:outline-none focus:ring-2 focus:ring-purple-300';

            const classes = isRight
              ? `${base} bg-green-100 text-green-800 border-green-300`
              : isWrong
              ? `${base} bg-red-100 text-red-800 border-red-300`
              : selectedOption === opt
              ? `${base} bg-purple-600 text-white border-purple-700`
              : `${base} bg-white hover:bg-purple-50 text-gray-700 border-gray-200`;

            return (
              <button
                key={opt}
                className={classes}
                disabled={submitted}
                onClick={() => setSelectedOption(opt)}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <button
          className="bg-purple-600 text-white font-semibold px-5 py-3 rounded-xl w-full transition hover:bg-purple-700 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!row || !selectedOption || submitted}
        >
          Submit
        </button>

        {/* Feedback line */}
        {submitted && (
          <div className="mt-3 text-sm">
            {isCorrect ? (
              <span className="text-green-700 font-medium">Nice! +5 points</span>
            ) : (
              <span className="text-red-700">
                Not quite. {correctText ? <>Correct answer: <b>{correctText}</b></> : null}
              </span>
            )}
          </div>
        )}

        {/* Sign-in nudge */}
        {!user && (
          <p className="text-sm mt-3 text-center text-gray-400 italic">
            Please sign in (magic link) to save points.
          </p>
        )}
      </div>

      {/* Stats Panel (kept below the card) */}
      <StatsPanel
        gamesPlayed={gamesPlayed}
        winRate={winRate}
        currentStreak={currentStreak}
        bestStreak={bestStreak}
      />
    </div>
  );
};

export default VinoVocabPage;
