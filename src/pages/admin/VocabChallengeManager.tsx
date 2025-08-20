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
      .gte('date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date');
    if (!error) setChallenges(data);
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
      setForm({
        date: '', word: '', definition: '', options: ['', '', '', ''],
        correct_option_index: 0, hint: '', points: 5
      });
      fetchChallenges();
    }
  };

  const handleUpdate = async (id: string, updated: any) => {
    const { error } = await supabase.from('vocab_daily_challenges').update(updated).eq('id', id);
    if (!error) fetchChallenges();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;
    const { error } = await supabase.from('vocab_daily_challenges').delete().eq('id', id);
    if (!error) fetchChallenges();
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Manage Vocab Challenges</h1>

      {/* Upload CSV - Placeholder */}
      <div className="my-4">
        <input type="file" accept=".csv" className="mb-2" disabled />
        <p className="text-sm text-gray-500 italic">CSV upload coming soon</p>
      </div>

      {/* Create New Entry */}
      <div className="bg-gray-50 border p-4 rounded mb-8">
        <h2 className="text-lg font-semibold mb-2">Create New</h2>
        <div className="grid grid-cols-2 gap-4">
          <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <input type="text" className="input" placeholder="Word" value={form.word} onChange={e => setForm({ ...form, word: e.target.value })} />
          <textarea className="input" placeholder="Definition" value={form.definition} onChange={e => setForm({ ...form, definition: e.target.value })} />
          <input type="text" className="input" placeholder="Hint" value={form.hint} onChange={e => setForm({ ...form, hint: e.target.value })} />
          {form.options.map((opt, i) => (
            <input key={i} type="text" className="input" placeholder={`Option ${i + 1}`} value={opt}
              onChange={e => {
                const newOptions = [...form.options];
                newOptions[i] = e.target.value;
                setForm({ ...form, options: newOptions });
              }} />
          ))}
          <input type="number" min={0} max={3} className="input" value={form.correct_option_index}
            onChange={e => setForm({ ...form, correct_option_index: Number(e.target.value) })} />
          <input type="number" className="input" placeholder="Points" value={form.points}
            onChange={e => setForm({ ...form, points: Number(e.target.value) })} />
        </div>
        <button onClick={handleSubmit} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Save Challenge</button>
        {status && <p className="mt-2 text-sm text-gray-700">{status}</p>}
      </div>

      {/* Table of Challenges */}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2">Date</th>
            <th className="text-left p-2">Word</th>
            <th className="text-left p-2">Definition</th>
            <th className="text-left p-2">Hint</th>
            <th className="text-left p-2">Options</th>
            <th className="text-left p-2">Correct</th>
            <th className="text-left p-2">Points</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {challenges.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="p-2"><input type="date" value={item.date} onChange={e => handleUpdate(item.id, { date: e.target.value })} /></td>
              <td className="p-2"><input type="text" value={item.word} onChange={e => handleUpdate(item.id, { word: e.target.value })} /></td>
              <td className="p-2"><textarea value={item.definition} onChange={e => handleUpdate(item.id, { definition: e.target.value })} /></td>
              <td className="p-2"><input type="text" value={item.hint} onChange={e => handleUpdate(item.id, { hint: e.target.value })} /></td>
              <td className="p-2 whitespace-pre-wrap">
                {item.options.map((opt: string, idx: number) => (
                  <input
                    key={idx}
                    className="block w-full"
                    value={opt}
                    onChange={e => {
                      const newOpts = [...item.options];
                      newOpts[idx] = e.target.value;
                      handleUpdate(item.id, { options: newOpts });
                    }}
                  />
                ))}
              </td>
              <td className="p-2"><input type="number" min={0} max={3} value={item.correct_option_index} onChange={e => handleUpdate(item.id, { correct_option_index: Number(e.target.value) })} /></td>
              <td className="p-2"><input type="number" value={item.points} onChange={e => handleUpdate(item.id, { points: Number(e.target.value) })} /></td>
              <td className="p-2">
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VocabChallengeManager;
