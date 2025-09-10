// src/pages/admin/SwirdleAdmin.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Brain, Calendar, Search, Eye, AlertCircle, RefreshCw, Download,
  Target, TrendingUp, X, Plus, Upload, LayoutGrid, Rows
} from 'lucide-react';

async function safeQuery<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  fallback: T
): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.error('safeQuery error:', error);
      return fallback;
    }
    return (data ?? fallback) as T;
  } catch (e) {
    console.error('safeQuery exception:', e);
    return fallback;
  }
}

type Category = 'grape_variety' | 'wine_region' | 'tasting_term' | 'production' | 'general';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface WordRow {
  id: string;
  word: string;
  definition: string;
  category: Category;
  difficulty: Difficulty;
  date_scheduled: string; // YYYY-MM-DD
  is_published: boolean;
  hints: string[];
  plays?: number;
  win_rate?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

const fmtYMD = (d: Date) => d.toISOString().slice(0, 10);
const parseYMD = (s: string) => new Date(`${s}T00:00:00`);

const getCategoryColor = (c: string) => {
  switch (c) {
    case 'grape_variety': return 'bg-purple-100 text-purple-800';
    case 'wine_region':   return 'bg-blue-100 text-blue-800';
    case 'tasting_term':  return 'bg-amber-100 text-amber-800';
    case 'production':    return 'bg-green-100 text-green-800';
    default:              return 'bg-gray-100 text-gray-800';
  }
};
const getDifficultyColor = (d: string) => {
  switch (d) {
    case 'beginner':     return 'bg-green-100 text-green-800';
    case 'intermediate': return 'bg-amber-100 text-amber-800';
    case 'advanced':     return 'bg-red-100 text-red-800';
    default:             return 'bg-gray-100 text-gray-800';
  }
};
const getWinRateColor = (wr: number) => (wr >= 80 ? 'text-green-600' : wr >= 60 ? 'text-amber-600' : 'text-red-600');

function useAdminGate(userId?: string) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingGate, setLoadingGate] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoadingGate(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!cancelled) {
        if (error) console.error('admins check error:', error);
        setIsAdmin(!!data);
        setLoadingGate(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { isAdmin, loadingGate };
}

const Inspector: React.FC<{
  word: WordRow | null;
  onClose: () => void;
  onSave: (patch: Partial<WordRow>) => Promise<void>;
  saving: boolean;
}> = ({ word, onClose, onSave, saving }) => {
  const [local, setLocal] = useState<WordRow | null>(word);
  useEffect(() => setLocal(word), [word]);
  if (!local) return null;

  const set = <K extends keyof WordRow>(k: K, v: WordRow[K]) =>
    setLocal((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    if (!local) return;
    const { id, ...rest } = local;
    await onSave(rest);
  };

  return (
    <div className="w-full lg:w-96 shrink-0 border-l bg-white">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="font-semibold">Inspector</div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-600">Word</label>
          <input
            value={local.word}
            onChange={(e) => set('word', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="text-xs text-gray-600">Definition</label>
          <textarea
            value={local.definition}
            onChange={(e) => set('definition', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Category</label>
            <select
              value={local.category}
              onChange={(e) => set('category', e.target.value as Category)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="grape_variety">Grape Variety</option>
              <option value="wine_region">Wine Region</option>
              <option value="tasting_term">Tasting Term</option>
              <option value="production">Production</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Difficulty</label>
            <select
              value={local.difficulty}
              onChange={(e) => set('difficulty', e.target.value as Difficulty)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600">Date scheduled</label>
          <input
            type="date"
            value={local.date_scheduled}
            onChange={(e) => set('date_scheduled', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="text-xs text-gray-600">Hints</label>
          <HintEditor
            hints={local.hints || []}
            onChange={(arr) => set('hints', arr)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="pub"
            type="checkbox"
            checked={!!local.is_published}
            onChange={(e) => set('is_published', e.target.checked)}
          />
          <label htmlFor="pub" className="text-sm">Published</label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">Close</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const HintEditor: React.FC<{ hints: string[]; onChange: (h: string[]) => void }> = ({ hints, onChange }) => {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (!v) return;
    onChange([...(hints || []), v]);
    setText('');
  };
  const remove = (i: number) => {
    const next = [...hints];
    next.splice(i, 1);
    onChange(next);
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a hint and press Add"
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <button onClick={add} className="px-3 py-2 rounded bg-amber-600 text-white">Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(hints || []).map((h, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 rounded px-2 py-0.5 text-xs">
            {h}
            <button onClick={() => remove(i)} className="opacity-70 hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {(!hints || hints.length === 0) && <span className="text-xs text-gray-400">No hints yet.</span>}
      </div>
    </div>
  );
};

type DateMode = 'window' | 'month' | 'all';

const SwirdleAdmin: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, loadingGate } = useAdminGate(user?.id);

  // dates
  const today = useMemo(() => new Date(), []);
  const [dateMode, setDateMode] = useState<DateMode>('window');
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  });
  const [toDate, setToDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d;
  });
  const curMonthStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const [monthValue, setMonthValue] = useState<string>(curMonthStr);
  const [includeUnpublished, setIncludeUnpublished] = useState<boolean>(true);

  // data
  const [words, setWords] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'schedule' | 'table'>('schedule');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<WordRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{type:'success'|'error', msg:string}|null>(null);

  const formatDateLong = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const { effFrom, effTo } = useMemo(() => {
    if (dateMode === 'all') return { effFrom: undefined as string|undefined, effTo: undefined as string|undefined };
    if (dateMode === 'month') {
      const [y, m] = monthValue.split('-').map(Number);
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);
      return { effFrom: fmtYMD(first), effTo: fmtYMD(last) };
    }
    return { effFrom: fmtYMD(fromDate), effTo: fmtYMD(toDate) };
  }, [dateMode, fromDate, toDate, monthValue]);

  async function tryRpcVariants(paramsList: Array<Record<string, any>>): Promise<any[] | null> {
    for (const params of paramsList) {
      const { data, error } = await supabase.rpc('get_swirdle_words_with_stats_api', params);
      if (error) {
        console.warn('[admin] RPC variant failed:', error?.message, params);
        continue;
      }
      if (Array.isArray(data)) return data as any[];
    }
    return null;
  }

const load = async () => {
  setLoading(true);
  try {
    const wantsCategory = categoryFilter !== 'all';
    const search = (searchTerm ?? '').trim();

    // Build direct SELECT (no RPC, no updated_at).
    let q = supabase
      .from('swirdle_words')
      .select('id, word, definition, category, difficulty, date_scheduled, is_published, hints');

    // Date filters from your current mode
    if (dateMode !== 'all') {
      if (dateMode === 'month') {
        const [y, m] = monthValue.split('-').map(Number);
        const first = new Date(y, m - 1, 1);
        const last = new Date(y, m, 0);
        q = q.gte('date_scheduled', first.toISOString().slice(0,10))
             .lte('date_scheduled', last.toISOString().slice(0,10));
      } else {
        q = q.gte('date_scheduled', fmtYMD(fromDate))
             .lte('date_scheduled', fmtYMD(toDate));
      }
    }

    if (wantsCategory) q = q.eq('category', categoryFilter);
    if (search) q = q.or(`word.ilike.%${search}%,definition.ilike.%${search}%`);

    q = q.order('date_scheduled', { ascending: true });

    const { data, error } = await q;
    if (error) throw error;

    let normalized = (data ?? []).map((r: any) => ({
      id: r.id,
      word: r.word,
      definition: r.definition,
      category: r.category,
      difficulty: r.difficulty,
      date_scheduled: r.date_scheduled,
      is_published: !!r.is_published,
      hints: Array.isArray(r.hints) ? r.hints : [],
      plays: 0,
      win_rate: 0,
    })) as WordRow[];

    if (!includeUnpublished) normalized = normalized.filter(w => w.is_published);

    setWords(normalized);
  } catch (e: any) {
    console.error('[admin] load failed:', e);
    setNotice({ type: 'error', msg: e.message || 'Failed to load' });
  } finally {
    setLoading(false);
  }
};

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access denied</h1>
          <p className="text-gray-600">Admins only.</p>
        </div>
      </div>
    );
  }

  const headerRangeLabel = dateMode === 'all'
    ? 'All time'
    : dateMode === 'month'
      ? `${monthValue}`
      : `${fmtYMD(fromDate)} → ${fmtYMD(toDate)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <div className="font-bold text-lg">Swirdle Admin</div>
            <div className="text-xs text-gray-500">
              {headerRangeLabel}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView('schedule')}
              className={`px-3 py-2 rounded border text-sm flex items-center gap-1 ${view==='schedule' ? 'bg-amber-600 text-white' : 'bg-white'}`}
              title="Schedule view"
            >
              <LayoutGrid className="w-4 h-4" /> Schedule
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2 rounded border text-sm flex items-center gap-1 ${view==='table' ? 'bg-amber-600 text-white' : 'bg-white'}`}
              title="Table view"
            >
              <Rows className="w-4 h-4" /> Table
            </button>
            <button onClick={load} className="px-3 py-2 rounded border text-sm flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {notice && (
          <div className={`mb-4 p-3 rounded border ${notice.type==='success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {notice.msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-9 pr-3 py-2 border rounded-lg"
              placeholder="Search word/definition…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">All categories</option>
              <option value="grape_variety">Grape Variety</option>
              <option value="wine_region">Wine Region</option>
              <option value="tasting_term">Tasting Term</option>
              <option value="production">Production</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="md:col-span-5 flex flex-wrap items-center gap-2">
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value as DateMode)}
              className="px-3 py-2 border rounded"
              title="Date mode"
            >
              <option value="window">Window</option>
              <option value="month">Month</option>
              <option value="all">All time</option>
            </select>

            {dateMode === 'window' && (
              <>
                <button onClick={() => shiftWindow(-7)} className="px-3 py-2 border rounded">← Prev 7</button>
                <button
                  onClick={() => {
                    setFromDate(new Date(new Date().setDate(new Date().getDate()-7)));
                    setToDate(new Date(new Date().setDate(new Date().getDate()+14)));
                  }}
                  className="px-3 py-2 border rounded"
                >
                  Today window
                </button>
                <button onClick={() => shiftWindow(7)} className="px-3 py-2 border rounded">Next 7 →</button>
              </>
            )}

            {dateMode === 'month' && (
              <input
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
                className="px-3 py-2 border rounded"
                title="Pick month"
              />
            )}

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 ml-auto">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={includeUnpublished}
                onChange={(e) => setIncludeUnpublished(e.target.checked)}
              />
              Include unpublished
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-3 flex items-center gap-3">
            <Brain className="w-5 h-5 text-purple-600" />
            <div><div className="text-xs text-gray-500">Total Words</div><div className="font-bold">{words.length}</div></div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 flex items-center gap-3">
            <Eye className="w-5 h-5 text-green-600" />
            <div><div className="text-xs text-gray-500">Published</div><div className="font-bold">{publishedWords}</div></div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-600" />
            <div><div className="text-xs text-gray-500">Total Attempts</div><div className="font-bold">{totalAttempts.toLocaleString()}</div></div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <div><div className="text-xs text-gray-500">Avg Win Rate</div><div className={`font-bold ${getWinRateColor(avgWinRate)}`}>{(Number.isFinite(avgWinRate)?avgWinRate:0).toFixed(1)}%</div></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="bg-white rounded-lg shadow overflow-hidden flex">
          <div className="flex-1">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading…</div>
            ) : view === 'schedule' ? (
              <div className="p-4 space-y-6">
                {groupedByWeek.map(([weekStart, rows]) => (
                  <div key={weekStart}>
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Week of {formatDateLong(weekStart)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {rows.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => setSelected(w)}
                          className={`text-left border rounded-lg p-3 bg-gray-50 hover:bg-white hover:shadow transition ${selected?.id===w.id ? 'ring-2 ring-amber-300' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-bold uppercase tracking-wide text-gray-900">{w.word}</div>
                            <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${getDifficultyColor(w.difficulty)}`}>{w.difficulty}</span>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">{w.date_scheduled && formatDateLong(w.date_scheduled)}</div>
                          <div className="text-sm text-gray-700 line-clamp-3">{w.definition}</div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${getCategoryColor(w.category)}`}>{w.category.replace('_',' ')}</span>
                            <div className="text-[11px] text-gray-500">{(w.hints||[]).length} hint{(w.hints||[]).length===1?'':'s'}</div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-[11px] text-gray-500">{w.plays ?? 0} attempts</div>
                            <div className={`text-[11px] font-medium ${getWinRateColor(w.win_rate || 0)}`}>{(w.win_rate || 0).toFixed(1)}%</div>
                          </div>
                          <div className="mt-2">
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded ${w.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {w.is_published ? 'Published' : 'Unpublished'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {groupedByWeek.length === 0 && (
                  <div className="p-12 text-center text-gray-500">No words in this window.</div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Word</th>
                      <th className="px-4 py-2 text-left">Definition</th>
                      <th className="px-4 py-2 text-left">Cat.</th>
                      <th className="px-4 py-2 text-left">Diff.</th>
                      <th className="px-4 py-2 text-left">Hints</th>
                      <th className="px-4 py-2 text-left">Attempts</th>
                      <th className="px-4 py-2 text-left">Win %</th>
                      <th className="px-4 py-2 text-left">Pub</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {words.map((w) => (
                      <tr key={w.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(w)}>
                        <td className="px-4 py-2">{w.date_scheduled}</td>
                        <td className="px-4 py-2 font-semibold text-gray-900">{w.word}</td>
                        <td className="px-4 py-2 max-w-md truncate text-gray-700">{w.definition}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-[11px] rounded ${getCategoryColor(w.category)}`}>{w.category.replace('_',' ')}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-[11px] rounded ${getDifficultyColor(w.difficulty)}`}>{w.difficulty}</span>
                        </td>
                        <td className="px-4 py-2">{(w.hints||[]).length}</td>
                        <td className="px-4 py-2">{w.plays ?? 0}</td>
                        <td className={`px-4 py-2 ${getWinRateColor(w.win_rate || 0)}`}>{(w.win_rate || 0).toFixed(1)}%</td>
                        <td className="px-4 py-2">
                          <label className="inline-flex items-center cursor-pointer" onClick={(e)=>e.stopPropagation()}>
                            <input type="checkbox" className="sr-only peer" checked={w.is_published} onChange={() => togglePublished(w)} />
                            <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-600 relative transition">
                              <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5" />
                            </div>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {words.length === 0 && <div className="p-12 text-center text-gray-500">No words in this window.</div>}
              </div>
            )}
          </div>

          {selected && (
            <Inspector
              word={selected}
              onClose={() => setSelected(null)}
              onSave={savePatch}
              saving={saving}
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelected({
              id: 'new',
              word: '',
              definition: '',
              category: 'general',
              difficulty: 'beginner',
              date_scheduled: fmtYMD(today),
              is_published: true,
              hints: []
            } as WordRow)}
            className="bg-amber-600 text-white px-3 py-2 rounded text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Word
          </button>
          <button
            onClick={() => document.getElementById('swirdle-import-input')?.click()}
            className="bg-gray-800 text-white px-3 py-2 rounded text-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Bulk Import
          </button>
          <input id="swirdle-import-input" type="file" accept=".csv" className="hidden" onChange={() => alert('Hook your existing CSV import here.')} />
          <button
            onClick={() => alert('Hook your existing export here.')}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwirdleAdmin;
