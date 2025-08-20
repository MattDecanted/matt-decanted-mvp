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

  const fetchChallenges = async () => {
    const { data, error } = await supabase
      .from('vocab_daily_challenges')
      .select('*')
      .order('date', { ascending: true });

    if (!error && data) {
      const today = new Date();
      const past = new Date(today);
      past.setDate(today.getDate() - 3);
      const future = new Date(today);
      future.setDate(today.getDate() + 3);
      setChallenges(
        data.filter(d => {
          const date = new Date(d.date);
          return date >= past && date <= future;
        })
      );
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handleSubmit = async () => {
    const { error } = await supabase.from('vocab_daily_challenges').insert([form]);
    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus('Saved successfully!');
      fetchChallenges();
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const rows = text.trim().split('\n');
      const entries = rows.slice(1).map(row => {
        const [date, word, definition, opt1, opt2, opt3, opt4, correctIndex, hint, points] = row.split(',');
        return {
          date,
          word,
          definition,
          options: [opt1, opt2, opt3, opt4],
          correct_option_index: Number(correctIndex),
          hint,
          points: Number(points)
        };
      });
      const { error } = await supabase.from('vocab_daily_challenges').insert(entries);
      if (error) {
        setStatus(`CSV Import Error: ${error.message}`);
      } else {
        setStatus('CSV import successful!');
        fetchChallenges();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Manage Vocab Challenges</h1>

      {/* Form for single entry */}
      <div className="bg-gray-50 p-4 rounded mb-6">
        <h2 className="text-xl font-semibold mb-2">Add New Challenge</h2>
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

      {/* CSV Upload */}
      <div className="mb-6">
        <h2 className="font-semibold mb-2">📁 Bulk Upload via CSV</h2>
        <input type="file" accept=".csv" onChange={handleCSVImport} />
      </div>

      {/* Challenge Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">Date</th>
              <th className="p-2">Word</th>
              <th className="p-2">Definition</th>
              <th className="p-2">Options</th>
              <th className="p-2">Correct</th>
              <th className="p-2">Hint</th>
              <th className="p-2">Points</th>
            </tr>
          </thead>
          <tbody>
            {challenges.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{c.date}</td>
                <td className="p-2 whitespace-nowrap">{c.word}</td>
                <td className="p-2">{c.definition}</td>
                <td className="p-2">{c.options?.join(', ')}</td>
                <td className="p-2">{c.options?.[c.correct_option_index]}</td>
                <td className="p-2">{c.hint}</td>
                <td className="p-2">{c.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VocabChallengeManager;
