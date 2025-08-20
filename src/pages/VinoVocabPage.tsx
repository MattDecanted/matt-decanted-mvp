// src/pages/VinoVocabPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import StatsPanel from '@/components/StatsPanel';

const VinoVocabPage: React.FC = () => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Static stats for now — later link to Supabase
  const gamesPlayed = 3;
  const winRate = 100;
  const currentStreak = 3;
  const bestStreak = 3;

  useEffect(() => {
    const fetchVocab = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('vocab_daily_challenges')
        .select('*')
        .eq('date', today)
        .single();

      if (error) {
        console.error('Error fetching vocab:', error);
      } else if (data) {
        setQuestion(data.question);
        setCorrectAnswer(data.correct_answer);
        setOptions(data.options);
      }
    };

    fetchVocab();
  }, []);

  const handleSubmit = async () => {
    if (!selectedOption) return;

    setSubmitted(true);

    if (user && selectedOption === correctAnswer) {
      await supabase.from('user_vocab_logs').insert({
        user_id: user.id,
        word: question,
        correct: true,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 pt-10">
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h1 className="text-3xl font-extrabold text-purple-700 mb-1">Vino Vocab</h1>
        <p className="text-sm text-gray-500 mb-4">{new Date().toDateString()}</p>

        <h2 className="text-xl font-semibold text-gray-800 mb-2">{question}</h2>
        <p className="text-md text-gray-600 mb-4">Choose the best description:</p>

        <div className="space-y-3 mb-6">
          {options.map((opt) => {
            const isCorrect = submitted && opt === correctAnswer;
            const isWrong = submitted && selectedOption === opt && opt !== correctAnswer;
            const base =
              'w-full px-4 py-3 rounded-xl text-left font-medium transition cursor-pointer border';
            const classes = isCorrect
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
          disabled={!selectedOption || submitted}
        >
          Submit
        </button>

        {!user && (
          <p className="text-sm mt-3 text-center text-gray-400 italic">
            Please sign in (magic link) to save points.
          </p>
        )}
      </div>

      {/* Stats Panel */}
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
