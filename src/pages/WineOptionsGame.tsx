// src/pages/WineOptionsGame.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, Image as ImageIcon, Loader2, Share2, Copy, Check, RefreshCw } from 'lucide-react';

/**
 * ---------- IMPORTANT SETUP ----------
 * 1) OCR_ENDPOINT should point to your Google Vision proxy (serverless function).
 *    If you already have a function, just put its path here (Netlify/Cloudflare/AWS).
 *    Example Netlify function name: `/.netlify/functions/label-ocr`
 * 2) Supabase table assumed: `wines`
 *    Columns used (adapt to your schema):
 *      id (uuid)
 *      display_name (text)
 *      producer (text)
 *      country (text)
 *      region (text)
 *      subregion (text)          -- nullable
 *      appellation (text)        -- nullable
 *      variety (text)            -- e.g. "Chardonnay", "Cabernet", "Zinfandel"
 *      color (text)              -- e.g. "White", "Red", "Rosé", "Sparkling"
 *      is_sparkling (boolean)    -- e.g. Champagne/Traditional Method
 *      is_fortified (boolean)
 *      old_world (boolean)       -- simple flag for Old vs New
 *      style (text)              -- e.g. "Blanc de Blancs", "Brut", "Barrel-fermented"
 *      vintage (int)             -- nullable (use NULL for NV)
 *      alt_names (text[])        -- nullable (brand/alternate spellings)
 *
 * If you use different names, adjust the type + queries below.
 */

const OCR_ENDPOINT = '/.netlify/functions/label-ocr'; // <-- change to your existing Vision function path

type WineRow = {
  id: string;
  display_name: string;
  producer?: string | null;
  country?: string | null;
  region?: string | null;
  subregion?: string | null;
  appellation?: string | null;
  variety?: string | null;
  color?: string | null;
  is_sparkling?: boolean | null;
  is_fortified?: boolean | null;
  old_world?: boolean | null;
  style?: string | null;
  vintage?: number | null; // NV => null
  alt_names?: string[] | null;
};

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null;
  likely_origin?: string | null; // e.g., "Champagne", "Burgundy", "Mendoza"
  keywords_found: string[];
};

type MatchPayload = {
  rawText: string;
  cleanedText: string;
  labelHints: LabelHints;
};

type Question = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

const yearRegex = /\b(19[5-9]\d|20[0-4]\d)\b/; // 1950–2049 safety
const nvRegex = /\bN\.?\s?V\.?\b|\bNon[-\s]?Vintage\b/i;

const VARIETY_KEYWORDS = [
  'chardonnay',
  'pinot noir',
  'pinot meunier',
  'merlot',
  'cabernet',
  'nebbiolo',
  'sangiovese',
  'tempranillo',
  'riesling',
  'gewurztraminer',
  'zinfandel',
  'primitivo',
  'syrah',
  'shiraz',
  'gruner veltliner',
  'grenache',
  'malbec',
  'chenin',
  'barbera',
  'gamay',
  'fiano',
  'mencia',
  'touriga',
];

const ORIGIN_KEYWORDS = [
  'champagne',
  'epernay',
  'reims',
  'burgundy',
  'bourgogne',
  'bordeaux',
  'napa',
  'sonoma',
  'barossa',
  'tuscany',
  'rioja',
  'rheingau',
  'alsace',
  'mosel',
  'mendoza',
  'marlborough',
  'chianti',
  'barolo',
  'barbaresco',
  'loire',
  'rhone',
  'douro',
  'priorat',
];

function normalizeText(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function extractHints(text: string): LabelHints {
  const cleaned = text.replace(/\s+/g, ' ').toLowerCase();

  const yearMatch = cleaned.match(yearRegex);
  const vintage_year = yearMatch ? Number(yearMatch[0]) : null;

  const is_non_vintage = nvRegex.test(cleaned);

  // Variety inference — look for any known variety words
  const foundVar = VARIETY_KEYWORDS.find((k) => cleaned.includes(k));
  // If Champagne + "blanc de blancs" → chardonnay hint
  let inferred_variety: string | null = foundVar || null;
  if (!inferred_variety && cleaned.includes('blanc de blancs')) {
    inferred_variety = 'chardonnay';
  }

  // Origin inference — look for place words
  const foundOrigin = ORIGIN_KEYWORDS.find((k) => cleaned.includes(k));

  // Keep track of all matched keywords (debug)
  const keywords_found = [
    ...(foundVar ? [foundVar] : []),
    ...(foundOrigin ? [foundOrigin] : []),
    ...(is_non_vintage ? ['nv'] : []),
    ...(vintage_year ? [String(vintage_year)] : []),
    ...(cleaned.includes('blanc de blancs') ? ['blanc de blancs'] : []),
  ];

  return {
    vintage_year,
    is_non_vintage,
    inferred_variety,
    likely_origin: foundOrigin || null,
    keywords_found,
  };
}

function buildQuestions(w: WineRow, hints: LabelHints): Question[] {
  const qs: Question[] = [];
  const isChampagne =
    (w.region?.toLowerCase().includes('champagne') ||
      w.appellation?.toLowerCase().includes('champagne') ||
      hints.likely_origin === 'champagne') ??
    false;

  // 1) Old vs New World
  if (typeof w.old_world === 'boolean') {
    qs.push({
      id: 'old-world',
      prompt: 'Old world or new world?',
      options: ['Old world', 'New world'],
      correctIndex: w.old_world ? 0 : 1,
      explanation:
        'Old world generally refers to Europe (and nearby), while new world is places like the US, Australia, NZ, South America, South Africa.',
    });
  }

  // 2) Region or Country
  if (w.country) {
    const wrongs = ['France', 'Italy', 'Spain', 'USA', 'Australia', 'New Zealand', 'Argentina', 'Chile'].filter(
      (c) => c.toLowerCase() !== w.country?.toLowerCase()
    );
    const opts = shuffleUnique([w.country, ...pickN(wrongs, 3)]);
    qs.push({
      id: 'country',
      prompt: 'Which country is this wine from?',
      options: opts,
      correctIndex: opts.findIndex((x) => x === w.country),
      explanation: 'Country of origin appears on the label and is a core part of wine identity.',
    });
  }

  // 3) Variety (handle Champagne uncertainty)
  if (w.variety || isChampagne || w.is_sparkling) {
    let prompt = 'What is the primary grape variety?';
    if (isChampagne || w.is_sparkling) {
      prompt = 'For this Champagne, what is the most likely composition?';
    }

    const correct = (() => {
      if (isChampagne || w.is_sparkling) {
        if (w.style?.toLowerCase().includes('blanc de blancs')) return 'Chardonnay';
        // If style indeterminate, accept “Pinot Noir & Chardonnay blend” as likely
        return 'Pinot Noir & Chardonnay blend';
      }
      return properCase(w.variety || 'Chardonnay');
    })();

    const distractors = isChampagne || w.is_sparkling
      ? ['Pinot Meunier only', 'Sauvignon Blanc', 'Syrah']
      : ['Merlot', 'Riesling', 'Sauvignon Blanc', 'Syrah', 'Grenache'];

    const options = shuffleUnique([correct, ...pickN(distractors, 3)]);
    qs.push({
      id: 'variety',
      prompt,
      options,
      correctIndex: options.findIndex((x) => x === correct),
      explanation:
        isChampagne || w.is_sparkling
          ? 'Most non-vintage Champagne is a blend dominated by Pinot Noir and Chardonnay; Blanc de Blancs indicates 100% Chardonnay.'
          : 'Variety determines flavor, structure, and style; it’s often signaled on new-world labels.',
    });
  }

  // 4) Vintage vs NV
  {
    const isNV = w.vintage == null;
    const opts = isNV
      ? ['Non-Vintage (NV)', '2018', '2016', '2020']
      : [String(w.vintage), 'Non-Vintage (NV)', '2017', '2021'];

    qs.push({
      id: 'vintage',
      prompt: 'What is the vintage?',
      options: shuffleUnique(opts),
      correctIndex: isNV ? opts.indexOf('Non-Vintage (NV)') : opts.indexOf(String(w.vintage)),
      explanation:
        'Vintage on a bottle is the year the grapes were harvested. NV (non-vintage) is common in traditional sparkling wine where multiple years are blended for a house style.',
    });
  }

  // 5) Style/Color if we have it
  if (w.color) {
    const correct = properCase(w.color);
    const all = ['Red', 'White', 'Rosé', 'Sparkling', 'Orange', 'Fortified'];
    const distractors = all.filter((c) => c.toLowerCase() !== w.color?.toLowerCase());
    const options = shuffleUnique([correct, ...pickN(distractors, 3)]);
    qs.push({
      id: 'color',
      prompt: 'What is the wine style?',
      options,
      correctIndex: options.findIndex((x) => x === correct),
      explanation: 'Style refers to broad categories like red, white, rosé, sparkling, etc.',
    });
  }

  return qs.slice(0, 5);
}

function properCase(s?: string | null) {
  if (!s) return '';
  return s
    .split(/\s+/)
    .map((w) => w[0] ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)
    .join(' ');
}

function pickN<T>(arr: T[], n: number): T[] {
  const c = [...arr];
  const out: T[] = [];
  while (out.length < n && c.length) {
    const i = Math.floor(Math.random() * c.length);
    out.push(c.splice(i, 1)[0]);
  }
  return out;
}
function shuffleUnique<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

async function ocrFile(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(OCR_ENDPOINT, { method: 'POST', body });
  if (!res.ok) throw new Error(`OCR failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  // Expect { text: "..." } back from your function
  return String(json.text || '');
}

async function findWineCandidates(payload: MatchPayload): Promise<WineRow[]> {
  // Try progressively: alt_names, display_name, producer, region/appellation, variety
  const terms: string[] = [];

  // from hints
  if (payload.labelHints.likely_origin) terms.push(payload.labelHints.likely_origin);
  if (payload.labelHints.inferred_variety) terms.push(payload.labelHints.inferred_variety);

  // first line tokens
  const lines = payload.rawText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length) terms.push(lines[0]);

  // unique-ish tokens > 2 chars, from cleaned text
  const tokens = Array.from(
    new Set(
      payload.cleanedText
        .split(/[^a-z0-9]+/i)
        .filter((t) => t.length >= 3)
    )
  ).slice(0, 10);
  terms.push(...tokens);

  // Limit to 5 distinct terms for network sanity
  const queryTerms = Array.from(new Set(terms)).slice(0, 5);

  // 1) Try a single broad OR query with ilike on multiple fields
  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .or(
      queryTerms
        .map((t) =>
          [
            `display_name.ilike.%${t}%`,
            `producer.ilike.%${t}%`,
            `region.ilike.%${t}%`,
            `subregion.ilike.%${t}%`,
            `appellation.ilike.%${t}%`,
            `variety.ilike.%${t}%`,
          ].join(',')
        )
        .join(',')
    )
    .limit(25);

  if (error) {
    console.error('Wine search error:', error);
    return [];
  }

  // Simple score: count matched fields
  const scored = (data || []).map((w) => {
    const hay = [
      w.display_name,
      w.producer,
      w.region,
      w.subregion,
      w.appellation,
      w.variety,
      w.country,
      w.style,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const score =
      (payload.labelHints.inferred_variety && hay.includes(payload.labelHints.inferred_variety)) ? 3 : 0 +
      (payload.labelHints.likely_origin && hay.includes(payload.labelHints.likely_origin)) ? 2 : 0 +
      queryTerms.reduce((s, t) => (hay.includes(t.toLowerCase()) ? s + 1 : s), 0);

    return { wine: w as WineRow, score };
  });

  return scored.sort((a, b) => b.score - a.score).map((s) => s.wine);
}

const WineOptionsGame: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [payload, setPayload] = useState<MatchPayload | null>(null);
  const [wine, setWine] = useState<WineRow | null>(null);
  const [candidates, setCandidates] = useState<WineRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [shareDone, setShareDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const onPick = useCallback(async (f: File) => {
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
    setErrorMsg(null);
    setWine(null);
    setCandidates([]);
    setQuestions([]);
    setAnswers({});
    setPayload(null);

    setLoading(true);
    try {
      const text = await ocrFile(f);
      const cleanedText = normalizeText(text);
      const labelHints = extractHints(text);
      const p: MatchPayload = { rawText: text, cleanedText, labelHints };
      setPayload(p);

      const found = await findWineCandidates(p);
      setCandidates(found);
      setWine(found[0] || null);

      if (found[0]) {
        const qs = buildQuestions(found[0], labelHints);
        setQuestions(qs);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Label OCR failed. Try a clearer photo.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onShare = async () => {
    const url = window.location.href;
    const title = wine?.display_name ? `Wine Options: ${wine.display_name}` : 'Wine Options';
    const text = wine
      ? `I just played Wine Options on ${wine.display_name}! Think you can beat my score?`
      : 'I just played Wine Options! Think you can beat my score?';

    // Prefer native share if available
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setShareDone(true);
        return;
      } catch {
        // ignore and fall back to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // noop
    }
  };

  const score = useMemo(() => {
    let s = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correctIndex) s += 1;
    }
    return s;
  }, [answers, questions]);

  const reset = () => {
    setFile(null);
    setImageUrl(null);
    setPayload(null);
    setWine(null);
    setCandidates([]);
    setQuestions([]);
    setAnswers({});
    setErrorMsg(null);
    setShareDone(false);
    setCopied(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Wine Options</h1>
        <p className="text-gray-600">Snap a label. We’ll do the rest — identify the wine and quiz you like a pro.</p>
      </div>

      {/* Upload panel */}
      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white"
          >
            <ImageIcon className="w-4 h-4" />
            Upload label
          </button>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border">
            <Camera className="w-4 h-4" />
            <span>Take photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPick(f);
              }}
            />
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
            }}
          />

          {file && (
            <button
              onClick={reset}
              className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              New label
            </button>
          )}
        </div>

        {imageUrl && (
          <div className="mt-3">
            <img
              src={imageUrl}
              alt="Uploaded label"
              className="max-h-64 rounded-lg object-contain border"
            />
          </div>
        )}

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing label…
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 text-sm text-red-600">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Candidate chooser (if multiple) */}
      {candidates.length > 1 && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <div className="font-semibold mb-2">We found a few matches. Pick the right one:</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {candidates.slice(0, 6).map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setWine(c);
                  if (payload) setQuestions(buildQuestions(c, payload.labelHints));
                }}
                className={`border rounded-lg p-3 text-left hover:shadow transition ${
                  wine?.id === c.id ? 'ring-2 ring-purple-600' : ''
                }`}
              >
                <div className="font-medium">{c.display_name}</div>
                <div className="text-xs text-gray-600">
                  {[
                    c.producer,
                    [c.country, c.region].filter(Boolean).join(', '),
                    c.appellation,
                    c.variety,
                    typeof c.vintage === 'number' ? c.vintage : 'NV',
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matched + hints */}
      {wine && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <div className="mb-1 text-sm text-gray-700">
            <div>
              <span className="font-semibold">Matched:</span> {wine.display_name}
            </div>
            <div>
              Variety: {wine.variety || '—'} • Country: {wine.country || '—'} • Region: {wine.region || '—'}
              {typeof wine.vintage === 'number' ? <> • Vintage: {wine.vintage}</> : <> • Vintage: NV</>}
            </div>
            {payload?.labelHints && (
              <div className="text-xs text-gray-500 mt-1">
                Label signals:{' '}
                {payload.labelHints.is_non_vintage
                  ? 'NV detected'
                  : payload.labelHints.vintage_year
                  ? `Year ${payload.labelHints.vintage_year}`
                  : 'No vintage found'}
                {payload.labelHints.inferred_variety ? ` • Var hint: ${properCase(payload.labelHints.inferred_variety)}` : ''}
                {payload.labelHints.likely_origin ? ` • Origin hint: ${properCase(payload.labelHints.likely_origin)}` : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Questions */}
      {wine && questions.length > 0 && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <div className="mb-4">
            <div className="text-sm text-gray-500">Score: <span className="font-semibold">{score}</span> / {questions.length}</div>
          </div>

          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="border rounded-lg p-3">
                <div className="font-medium mb-2">{q.prompt}</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt, i) => {
                    const chosen = answers[q.id];
                    const isCorrect = i === q.correctIndex;
                    const selected = chosen === i;
                    const tone =
                      chosen != null
                        ? isCorrect
                          ? 'border-green-600 text-green-700 bg-green-50'
                          : selected
                          ? 'border-red-600 text-red-700 bg-red-50'
                          : 'border-gray-300'
                        : 'border-gray-300 hover:bg-gray-50';
                    return (
                      <button
                        key={i}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                        disabled={chosen != null}
                        className={`text-left border rounded-lg px-3 py-2 transition ${tone}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {answers[q.id] != null && q.explanation && (
                  <div className="text-xs text-gray-600 mt-2">{q.explanation}</div>
                )}
              </div>
            ))}
          </div>

          {/* Share */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={onShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white"
            >
              <Share2 className="w-4 h-4" />
              Share my run
            </button>
            {copied && (
              <span className="inline-flex items-center text-sm text-gray-600">
                <Check className="w-4 h-4 mr-1" /> Link copied
              </span>
            )}
            {shareDone && <span className="text-sm text-gray-600">Shared 🎉</span>}
          </div>
        </div>
      )}

      {/* Manual override / no match */}
      {!loading && !wine && imageUrl && (
        <div className="bg-white border rounded-xl p-4">
          <div className="font-semibold mb-2">Didn’t find the right bottle?</div>
          <p className="text-sm text-gray-600 mb-3">
            Try a clearer photo, or type a few key words from the label (producer / region / grape).
          </p>
          <ManualMatch
            onSelect={(w) => {
              setWine(w);
              if (payload) setQuestions(buildQuestions(w, payload.labelHints));
            }}
          />
        </div>
      )}
    </div>
  );
};

const ManualMatch: React.FC<{ onSelect: (w: WineRow) => void }> = ({ onSelect }) => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<WineRow[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .or(
          [
            `display_name.ilike.%${q}%`,
            `producer.ilike.%${q}%`,
            `region.ilike.%${q}%`,
            `appellation.ilike.%${q}%`,
            `variety.ilike.%${q}%`,
            `country.ilike.%${q}%`,
          ].join(',')
        )
        .limit(25);

      if (error) throw error;
      setRows((data || []) as WineRow[]);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g., 'Bollinger Brut NV', 'Epernay', 'Cabernet Napa'"
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <button onClick={search} className="px-3 py-2 rounded-lg border">
          Search
        </button>
      </div>

      {loading && <div className="text-sm text-gray-600 mt-2">Searching…</div>}

      {rows.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 mt-3">
          {rows.map((w) => (
            <button
              key={w.id}
              onClick={() => onSelect(w)}
              className="border rounded-lg p-3 text-left hover:shadow transition"
            >
              <div className="font-medium">{w.display_name}</div>
              <div className="text-xs text-gray-600">
                {[
                  w.producer,
                  [w.country, w.region].filter(Boolean).join(', '),
                  w.appellation,
                  w.variety,
                  typeof w.vintage === 'number' ? w.vintage : 'NV',
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WineOptionsGame;
