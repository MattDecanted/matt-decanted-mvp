import React from 'react';
import { Share2, Wine, Search, Loader2, CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import OCRUpload from '@/components/OCRUpload';
import { supabase } from '@/lib/supabase';

/* =========================
   Types
   ========================= */
type WineRow = {
  id: string;
  display_name: string;
  country?: string | null;
  region?: string | null;        // e.g. "Burgundy" or "Marlborough"
  appellation?: string | null;   // e.g. "Epernay", "Barolo DOCG"
  variety?: string | null;       // e.g. "Chardonnay" or "Blend"
  vintage?: number | null;       // 4-digit; null = NV
  is_nv?: boolean | null;        // optional flag if you store it
  world?: 'old' | 'new' | null;  // optional: precomputed
};

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null; // e.g. "Chardonnay" from "Blanc de Blancs"
};

type Hint = {
  grapes?: Array<{ name: string; confidence: number }>;
  color?: 'red' | 'white' | 'rosé';
  style?: string[]; // e.g. ['sparkling', 'dry']
  country?: string;
  region?: string;  // normalized region/family
};

type Q = { id: string; prompt: string; answer: string; options?: string[] };

const TABLE_NAME = 'wine_index'; // ← change to your actual catalog table/view

/* =========================
   Utilities
   ========================= */
function titleCase(s: string) {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}
function worldFromCountry(country?: string | null): 'old' | 'new' | null {
  if (!country) return null;
  const c = country.toLowerCase();
  const OLD = ['france', 'italy', 'spain', 'germany', 'portugal', 'austria', 'greece', 'hungary'];
  const NEW = ['usa', 'united states', 'new zealand', 'australia', 'chile', 'argentina', 'south africa', 'canada'];
  if (OLD.includes(c)) return 'old';
  if (NEW.includes(c)) return 'new';
  return null;
}
function normalizeForMatch(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* =========================
   OCR → Label Hints
   ========================= */
function extractLabelHints(text: string): LabelHints {
  const t = text.toLowerCase();

  // 1) Vintage year (19xx/20xx) in a sane range
  const years = Array.from(t.matchAll(/\b(19|20)\d{2}\b/g)).map(m => Number(m[0]));
  const possibleYear = years.find(y => y >= 1980 && y <= new Date().getFullYear());

  // 2) NV detection
  const isNV = /\bnv\b|\bnon\s*-?\s*vintage\b/.test(t);

  // 3) Variety inference (basic keywords)
  let inferredVariety: string | null = null;
  if (/blanc\s+de\s+blancs/.test(t)) {
    inferredVariety = 'Chardonnay';
  } else if (/blanc\s+de\s+noirs/.test(t)) {
    inferredVariety = 'Pinot Noir';
  } else {
    const grapeList = [
      'chardonnay', 'pinot noir', 'pinot meunier', 'riesling', 'sauvignon', 'cabernet',
      'merlot', 'syrah', 'shiraz', 'malbec', 'tempranillo', 'nebbiolo', 'sangiovese',
      'grenache', 'zinfandel', 'primitivo', 'chenin', 'viognier', 'gewurztraminer',
      'gruner', 'barbera', 'mencía', 'mencia', 'touriga', 'gamay', 'aligoté', 'aligote'
    ];
    const found = grapeList.find(g => t.includes(g));
    inferredVariety = found ? titleCase(found.normalize('NFKD').replace(/\p{Diacritic}/gu, '')) : null;
  }

  return {
    vintage_year: isNV ? null : (possibleYear ?? null),
    is_non_vintage: isNV,
    inferred_variety: inferredVariety,
  };
}

/* =========================
   Old World Inference Map
   (grow this over time)
   ========================= */
const OLD_WORLD_MAP: Record<string, Hint> = {
  // France / Burgundy
  'chassagne montrachet': { country: 'France', region: 'Burgundy', color: 'white', grapes: [{ name: 'Chardonnay', confidence: 0.9 }] },
  'puligny montrachet': { country: 'France', region: 'Burgundy', color: 'white', grapes: [{ name: 'Chardonnay', confidence: 0.95 }] },
  'meursault': { country: 'France', region: 'Burgundy', color: 'white', grapes: [{ name: 'Chardonnay', confidence: 0.9 }] },
  'gevrey chambertin': { country: 'France', region: 'Burgundy', color: 'red', grapes: [{ name: 'Pinot Noir', confidence: 0.98 }] },
  'vosne romanee': { country: 'France', region: 'Burgundy', color: 'red', grapes: [{ name: 'Pinot Noir', confidence: 0.98 }] },
  'beaune': { country: 'France', region: 'Burgundy', color: 'red', grapes: [{ name: 'Pinot Noir', confidence: 0.8 }] },

  // France / Loire
  'sancerre': { country: 'France', region: 'Loire', color: 'white', grapes: [{ name: 'Sauvignon Blanc', confidence: 0.98 }] },
  'vouvray': { country: 'France', region: 'Loire', color: 'white', grapes: [{ name: 'Chenin Blanc', confidence: 0.95 }] },

  // France / Rhône
  'cote rotie': { country: 'France', region: 'Northern Rhône', color: 'red', grapes: [{ name: 'Syrah', confidence: 0.95 }] },
  'hermitage': { country: 'France', region: 'Northern Rhône', color: 'red', grapes: [{ name: 'Syrah', confidence: 0.95 }] },

  // France / Champagne
  'champagne': { country: 'France', region: 'Champagne', style: ['sparkling', 'dry'], grapes: [
    { name: 'Pinot Noir', confidence: 0.4 }, { name: 'Chardonnay', confidence: 0.4 }, { name: 'Meunier', confidence: 0.2 }
  ]},

  // Italy
  'barolo': { country: 'Italy', region: 'Piedmont', color: 'red', grapes: [{ name: 'Nebbiolo', confidence: 0.98 }] },
  'barbaresco': { country: 'Italy', region: 'Piedmont', color: 'red', grapes: [{ name: 'Nebbiolo', confidence: 0.98 }] },
  'chianti': { country: 'Italy', region: 'Tuscany', color: 'red', grapes: [{ name: 'Sangiovese', confidence: 0.9 }] },
  'brunello di montalcino': { country: 'Italy', region: 'Tuscany', color: 'red', grapes: [{ name: 'Sangiovese', confidence: 0.98 }] },
  'soave': { country: 'Italy', region: 'Veneto', color: 'white', grapes: [{ name: 'Garganega', confidence: 0.8 }] },

  // Spain / Portugal
  'rioja': { country: 'Spain', region: 'Rioja', color: 'red', grapes: [{ name: 'Tempranillo', confidence: 0.8 }] },
  'rías baixas': { country: 'Spain', region: 'Galicia', color: 'white', grapes: [{ name: 'Albariño', confidence: 0.9 }] },
  'rias baixas': { country: 'Spain', region: 'Galicia', color: 'white', grapes: [{ name: 'Albariño', confidence: 0.9 }] },
  'priorat': { country: 'Spain', region: 'Catalonia', color: 'red', grapes: [{ name: 'Garnacha', confidence: 0.6 }] },
  'douro': { country: 'Portugal', region: 'Douro', color: 'red', grapes: [{ name: 'Touriga Nacional', confidence: 0.4 }] },

  // Germany / Austria
  'mosel': { country: 'Germany', region: 'Mosel', color: 'white', grapes: [{ name: 'Riesling', confidence: 0.9 }] },
  'wachau': { country: 'Austria', region: 'Wachau', color: 'white', grapes: [
    { name: 'Grüner Veltliner', confidence: 0.6 }, { name: 'Riesling', confidence: 0.4 }
  ] },
};

function inferOldWorld(text: string): Hint | null {
  const hay = normalizeForMatch(text);
  let best: { key: string; score: number } | null = null;

  for (const key of Object.keys(OLD_WORLD_MAP)) {
    const needle = normalizeForMatch(key);
    if (hay.includes(needle)) {
      const score = needle.length; // crude heuristic: longer match wins
      if (!best || score > best.score) best = { key, score };
    }
  }
  return best ? OLD_WORLD_MAP[best.key] : null;
}

/* =========================
   Question Generation
   ========================= */
type QuizQ = Q; // alias

function makeDistractors(correct: string, pool: string[], n = 3): string[] {
  const choices = pool.filter(x => normalizeForMatch(x) !== normalizeForMatch(correct));
  const shuffled = [...choices].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function generateQuestionsFromOldWorld(text: string): QuizQ[] {
  const hint = inferOldWorld(text) || {};
  const qs: QuizQ[] = [];

  // Q1: World (always solvable)
  qs.push({ id: 'world', prompt: 'Old World or New World?', answer: 'Old World', options: ['Old World', 'New World'] });

  // Q2: Country if we have it (else we’ll ask it as MCQ later)
  if (hint.country) {
    qs.push({ id: 'country', prompt: 'What country is this wine from?', answer: hint.country });
  }

  // Q3: Region/Appellation if we have it
  if (hint.region) {
    qs.push({ id: 'region', prompt: 'What region/appellation is it from?', answer: hint.region });
  }

  // Q4: Color if we know it
  if (hint.color) {
    qs.push({ id: 'color', prompt: 'Is this wine red, white, or rosé?', answer: titleCase(hint.color) });
  }

  // Q5: Style if applicable
  if (hint.style?.includes('sparkling')) {
    qs.push({ id: 'style', prompt: 'What is the style?', answer: 'Sparkling', options: ['Sparkling', 'Still', 'Fortified'] });
  }

  // Q6: Grape — ask when confident; otherwise MCQ with realistic distractors
  const topGrape = hint.grapes?.[0];
  if (topGrape) {
    if (topGrape.confidence >= 0.8) {
      qs.push({ id: 'grape', prompt: 'What grape is this wine made from?', answer: topGrape.name });
    } else {
      const regionPool = (hint.grapes || []).map(g => g.name);
      const basePool = regionPool.length >= 4 ? regionPool : [...regionPool, 'Merlot', 'Cabernet Sauvignon', 'Syrah', 'Pinot Noir'];
      const distractors = makeDistractors(topGrape.name, basePool);
      const options = [topGrape.name, ...distractors].sort(() => Math.random() - 0.5);
      qs.push({ id: 'grape_mcq', prompt: 'What grape is most likely used?', answer: topGrape.name, options });
    }
  }

  // If we didn’t recognize anything Old-Worldy, add a gentle fallback MCQ for country
  if (!hint.country) {
    qs.push({
      id: 'country_mcq',
      prompt: 'Which country is most likely?',
      answer: 'France',
      options: ['France', 'Italy', 'Spain', 'Germany'] // generic but fair fallback
    });
  }

  // Cap at 5 questions to keep it fun
  return qs.slice(0, 5);
}

/* =========================
   Component
   ========================= */
const WineOptionsGame: React.FC = () => {
  // Label + hints
  const [labelText, setLabelText] = React.useState('');
  const [labelHints, setLabelHints] = React.useState<LabelHints | null>(null);

  // Supabase search state
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wine, setWine] = React.useState<WineRow | null>(null);

  // OCR UI state (display only; OCRUpload handles network)
  const [ocrText, setOcrText] = React.useState<string>('');

  // Quiz state
  const [quiz, setQuiz] = React.useState<Q[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  // Your original manual-guess UI
  const [guessWorld, setGuessWorld] = React.useState<'old' | 'new' | ''>('');
  const [guessVariety, setGuessVariety] = React.useState<string>('');
  const [guessCountry, setGuessCountry] = React.useState<string>('');
  const [guessRegion, setGuessRegion] = React.useState<string>('');
  const [guessVintage, setGuessVintage] = React.useState<string>(''); // 'NV' or 'YYYY'
  const [checked, setChecked] = React.useState(false);

  // When OCR returns text, feed it into existing game logic + generate quiz
  const onOCR = (text: string) => {
    setOcrText((text || '').trim());
    setLabelText(text);
    const hints = extractLabelHints(text);
    setLabelHints(hints);
    setQuiz(generateQuestionsFromOldWorld(text));
    setAnswers({});
    // reset state
    setWine(null);
    setChecked(false);
    setGuessWorld('');
    setGuessVariety('');
    setGuessCountry('');
    setGuessRegion('');
    setGuessVintage('');
    setError(null);
  };

const findMatch = async () => {
  setBusy(true);
  setError(null);
  setWine(null);

  try {
    const t = labelText;
    const hints = extractLabelHints(t);
    setLabelHints(hints);

    // Words >= 3 letters (skip years)
    const tokens = Array.from(t.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/g)).map(m => m[0]);
    const unique = Array.from(new Set(tokens.map(x => x.toLowerCase())));

    // Narrow to ~4 “strong” tokens (longer words first)
    const strong = [...unique].sort((a, b) => b.length - a.length).slice(0, 4);

    let query = supabase.from(TABLE_NAME).select('*').limit(25);

    if (strong.length) {
      const ors: string[] = [];
      for (const tok of strong) {
        // search across multiple columns
        ors.push(`display_name.ilike.%${tok}%`);
        ors.push(`producer.ilike.%${tok}%`);
        ors.push(`appellation.ilike.%${tok}%`);
      }
      query = query.or(ors.join(','));
    }

    if (hints.inferred_variety) {
      query = query.ilike('variety', `%${hints.inferred_variety}%`);
    }
    if (hints.is_non_vintage) {
      query = query.is('vintage', null);
    } else if (hints.vintage_year) {
      query = query.eq('vintage', hints.vintage_year);
    }

    const { data, error: qErr } = await query;
    if (qErr) throw qErr;

    const rows: WineRow[] = (data ?? []);

    // Rank by "hits" — how many of our strong tokens appear across key fields
    const score = (row: WineRow) => {
      const hay = [
        row.display_name, row.producer, row.appellation, row.region, row.country
      ].join(' ').toLowerCase();
      return strong.reduce((acc, tok) => acc + (hay.includes(tok) ? 1 : 0), 0);
    };

    rows.sort((a, b) => score(b) - score(a));

    const candidate = rows[0];
    if (!candidate) {
      setError('No close match found. You can still play by choosing options manually.');
      setWine(null);
      return;
    }

    if (!candidate.world) {
      candidate.world = worldFromCountry(candidate.country);
    }
    setWine(candidate);

    // pre-seed guesses with hints
    if (!guessVintage) {
      if (hints.is_non_vintage) setGuessVintage('NV');
      else if (hints.vintage_year) setGuessVintage(String(hints.vintage_year));
    }
    if (!guessVariety && hints.inferred_variety) setGuessVariety(hints.inferred_variety);

  } catch (e: any) {
    setError(e?.message ?? 'Search failed');
  } finally {
    setBusy(false);
  }
};


  const checkAnswers = () => {
    setChecked(true);
  };

  const doShare = async () => {
    const shareText = `Wine Options — my picks:
World: ${guessWorld || '—'} • Variety: ${guessVariety || '—'} • Country: ${guessCountry || '—'} • Region: ${guessRegion || '—'} • Vintage: ${guessVintage || '—'}
${wine ? `Target: ${wine.display_name}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Wine Options', text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        alert('Copied to clipboard!');
      }
    } catch {
      // ignore
    }
  };

  const correctWorld = wine?.world ?? worldFromCountry(wine?.country);
  const correctVariety = wine?.variety || '';
  const correctCountry = wine?.country || '';
  const correctRegion = wine?.region || wine?.appellation || '';
  const correctVintage = wine?.vintage ? String(wine.vintage) : 'NV';

  const isCorrect = (user: string | '' , truth: string | null | undefined) => {
    if (!user || !truth) return false;
    return user.trim().toLowerCase() === String(truth).trim().toLowerCase();
  };

  const isQuizCorrect = (qid: string) => {
    const q = quiz.find(x => x.id === qid);
    if (!q) return false;
    const a = answers[qid] || '';
    return normalizeForMatch(a) === normalizeForMatch(q.answer);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Wine className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Wine Options</h1>
      </header>

      {/* 1) Upload & OCR */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Camera className="w-4 h-4" />
          Upload a label (photo/screenshot)
        </div>

        {/* Your OCR component — it should call onText(text) when done */}
        <OCRUpload onText={(txt) => onOCR(txt)} />

        {ocrText && (
          <pre className="text-xs bg-gray-100 p-2 mt-2 whitespace-pre-wrap max-h-40 overflow-auto">
            {ocrText}
          </pre>
        )}

        {labelText && (
          <div className="text-xs text-gray-600">
            {labelHints?.is_non_vintage ? 'NV detected' :
              labelHints?.vintage_year ? `Vintage candidate: ${labelHints.vintage_year}` : 'No vintage found'} •
            {labelHints?.inferred_variety ? ` Variety hint: ${labelHints.inferred_variety}` : ' No variety hint'}
          </div>
        )}

        <div>
          <button
            onClick={findMatch}
            disabled={!labelText || busy}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-black text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {busy ? 'Searching…' : 'Find a likely match'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </section>

      {/* 2) Candidate (optional) */}
      <section className="bg-white border rounded-lg p-4">
        <div className="text-sm font-semibold mb-2">Candidate (you can still choose different answers)</div>

        {!wine ? (
          <div className="text-sm text-gray-600">No candidate yet. Upload a label and click “Find a likely match”.</div>
        ) : (
          <div className="text-sm text-gray-800">
            <div><span className="font-medium">Matched:</span> {wine.display_name}</div>
            <div className="text-gray-700 mt-1">
              Variety: {wine.variety || '—'} • Country: {wine.country || '—'} • Region: {wine.region || wine.appellation || '—'}
              {typeof wine.vintage === 'number' ? <> • Vintage: {wine.vintage}</> : <> • Vintage: NV</>}
            </div>
            {labelHints && (
              <div className="text-xs text-gray-500 mt-1">
                Label signals: {labelHints.is_non_vintage ? 'NV' : (labelHints.vintage_year ? `Year ${labelHints.vintage_year}` : '—')}
                {labelHints.inferred_variety ? ` • Var hint: ${labelHints.inferred_variety}` : ''}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3) Old World Quiz (auto-generated) */}
      {quiz.length > 0 && (
        <section className="bg-white border rounded-lg p-4 space-y-4">
          <div className="font-semibold">Quiz (based on label/place clues)</div>
          <div className="space-y-3">
            {quiz.map(q => (
              <div key={q.id} className="border rounded p-3">
                <div className="text-sm font-medium mb-2">{q.prompt}</div>
                {q.options ? (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map(opt => (
                      <button
                        key={opt}
                        className={`px-3 py-1 rounded border ${
                          answers[q.id] === opt ? 'bg-purple-600 text-white border-purple-600' : ''
                        }`}
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                        type="button"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Type your answer"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  />
                )}
                {checked && (
                  <div className={`mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${
                    isQuizCorrect(q.id) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {isQuizCorrect(q.id) ? 'Correct' : <>Answer: <span className="font-semibold">{q.answer}</span></>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4) Your original manual Questions */}
      <section className="bg-white border rounded-lg p-4 space-y-4">
        <div className="font-semibold">Your picks</div>

        {/* World */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <div className="text-xs text-gray-600 mb-1">World</div>
            <div className="flex gap-2">
              <button
                className={`px-3 py-2 rounded border ${guessWorld === 'old' ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                onClick={() => setGuessWorld('old')}
              >Old World</button>
              <button
                className={`px-3 py-2 rounded border ${guessWorld === 'new' ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                onClick={() => setGuessWorld('new')}
              >New World</button>
            </div>
            {checked && (
              <AnswerBadge ok={isCorrect(guessWorld, correctWorld)} truth={correctWorld || '—'} />
            )}
          </div>

          {/* Variety */}
          <div>
            <div className="text-xs text-gray-600 mb-1">Variety</div>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g. Chardonnay"
              value={guessVariety}
              onChange={(e) => setGuessVariety(e.target.value)}
            />
            {checked && (
              <AnswerBadge ok={isCorrect(guessVariety, correctVariety)} truth={correctVariety || '—'} />
            )}
          </div>
        </div>

        {/* Country / Region */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <div className="text-xs text-gray-600 mb-1">Country</div>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g. France"
              value={guessCountry}
              onChange={(e) => setGuessCountry(e.target.value)}
            />
            {checked && (
              <AnswerBadge ok={isCorrect(guessCountry, correctCountry)} truth={correctCountry || '—'} />
            )}
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Region/Appellation</div>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g. Epernay, Burgundy, Marlborough"
              value={guessRegion}
              onChange={(e) => setGuessRegion(e.target.value)}
            />
            {checked && (
              <AnswerBadge ok={isCorrect(guessRegion, correctRegion)} truth={correctRegion || '—'} />
            )}
          </div>
        </div>

        {/* Vintage */}
        <div>
          <div className="text-xs text-gray-600 mb-1">Vintage</div>
          <div className="flex gap-2">
            <input
              type="text"
              className="px-3 py-2 border rounded w-36"
              placeholder="YYYY or NV"
              value={guessVintage}
              onChange={(e) => setGuessVintage(e.target.value.toUpperCase())}
            />
            <button
              className={`px-3 py-2 rounded border ${guessVintage === 'NV' ? 'bg-purple-600 text-white border-purple-600' : ''}`}
              onClick={() => setGuessVintage('NV')}
            >
              NV
            </button>
          </div>
          {checked && (
            <AnswerBadge ok={isCorrect(guessVintage, correctVintage)} truth={correctVintage} />
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={checkAnswers}
            className="px-4 py-2 rounded bg-black text-white"
          >
            Check answers
          </button>
          <button
            onClick={doShare}
            className="px-4 py-2 rounded border flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </section>
    </div>
  );
};

const AnswerBadge: React.FC<{ ok: boolean; truth: string }> = ({ ok, truth }) => {
  return (
    <div className={`mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
      <CheckCircle2 className="w-3 h-3" />
      {ok ? 'Correct' : <>Answer: <span className="font-semibold">{truth}</span></>}
    </div>
  );
};

export default WineOptionsGame;
