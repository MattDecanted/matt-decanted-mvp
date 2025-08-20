// src/pages/admin/TrialQuizManager.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Quiz = {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
};

const TrialQuizManager: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    const { data, error } = await supabase.from('trial_quizzes').select('*');
    if (error) console.error('Error loading quizzes:', error);
    else setQuizzes(data);
  };

  const handleAddQuiz = async () => {
    setLoading(true);
    const { error } = await supabase.from('trial_quizzes').insert([
      {
        question,
        options,
        correct_answer: correctAnswer,
      },
    ]);
    if (error) console.error('Error adding quiz:', error);
    else {
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('');
      fetchQuizzes();
    }
    setLoading(false);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">📊 Trial Quiz Manager</h1>

      {/* Add New Quiz */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Quiz</h2>
        <input
          className="w-full border p-2 mb-4"
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        {options.map((opt, i) => (
          <input
            key={i}
            className="w-full border p-2 mb-2"
            placeholder={`Option ${i + 1}`}
            value={opt}
            onChange={(e) => handleOptionChange(i, e.target.value)}
          />
        ))}
        <input
          className="w-full border p-2 mb-4"
          placeholder="Correct Answer"
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
        />
        <button
          onClick={handleAddQuiz}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Quiz'}
        </button>
      </div>

      {/* List Quizzes */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">All Quizzes</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Question</th>
              <th className="p-2 border">Options</th>
              <th className="p-2 border">Correct Answer</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((quiz) => (
              <tr key={quiz.id} className="border-t">
                <td className="p-2 border">{quiz.question}</td>
                <td className="p-2 border">{quiz.options.join(', ')}</td>
                <td className="p-2 border">{quiz.correct_answer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrialQuizManager;
