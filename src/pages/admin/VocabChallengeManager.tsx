import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const VocabChallengeManager: React.FC = () => {
  const [form, setForm] = useState({
    date: '',
    word: '',
    definition: '',
    options: ['', '', '', ''],
    correct_option_index: 0,
    hint: '',
    points: 5
  });
  const [status, setStatus] = useState('');
  const [challenges, setChallenges] = useState<any[]>([]);

  const handleSubmit = async () => {
    const { error } = await supabase.from('vocab_daily_challenges').insert([form]);
    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus('Saved successfully!');
      fetchChallenges();
    }
  };

  const fetchChallenges = async () => {
    const start = new Date();
    start.setDate(start.getDate() - 3);
    const end = new Date();
    end.setDate(end.getDate() + 3);

    const { data, error } = await supabase
      .from('vocab_daily_challenges')
      .select('*')
      .gte('date', start.toISOString().split('T')[0])
      .lte('date', end.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (!error && data) {
      const enriched = await Promise.all(
        data.map(async (challenge: any) => {
          const { count } = await supabase
            .from('vocab_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('challenge_id', challenge.id);
          return { ...challenge, attempts: count || 0 };
        })
      );
      setChallenges(enriched);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Vocab Challenge</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label>Date</label>
          <input type="date" className="input" value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })} />

          <label>Word</label>
          <input type="text" className="input" value={form.word}
            onChange={e => setForm({ ...form, word: e.target.value })} />

          <label>Definition</label>
          <textarea className="input" value={form.definition}
            onChange={e => setForm({ ...form, definition: e.target.value })} />

          {form.options.map((opt, i) => (
            <div key={i}>
              <label>Option {i + 1}</label>
              <input type="text" className="input" value={opt}
                onChange={e => {
                  const newOptions = [...form.options];
                  newOptions[i] = e.target.value;
                  setForm({ ...form, options: newOptions });
                }} />
            </div>
          ))}

          <label>Correct Option Index (0–3)</label>
          <input type="number" className="input" min={0} max={3} value={form.correct_option_index}
            onChange={e => setForm({ ...form, correct_option_index: Number(e.target.value) })} />

          <label>Hint</label>
          <input type="text" className="input" value={form.hint}
            onChange={e => setForm({ ...form, hint: e.target.value })} />

          <label>Points</label>
          <input type="number" className="input" value={form.points}
            onChange={e => setForm({ ...form, points: Number(e.target.value) })} />

          <button onClick={handleSubmit} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Save Challenge</button>
          {status && <p className="mt-2 text-sm text-gray-700">{status}</p>}
        </div>

        <div className="overflow-x-auto mt-8">
          <h2 className="text-lg font-semibold mb-2">7-Day Challenge Overview</h2>
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 border">Date</th>
                <th className="px-2 py-1 border">Word</th>
                <th className="px-2 py-1 border">Hint</th>
                <th className="px-2 py-1 border">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map(c => (
                <tr key={c.id}>
                  <td className="px-2 py-1 border">{c.date}</td>
                  <td className="px-2 py-1 border">{c.word}</td>
                  <td className="px-2 py-1 border">{c.hint}</td>
                  <td className="px-2 py-1 border text-center">{c.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VocabChallengeManager;
