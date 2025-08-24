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
  producer?: string | null;
  country?: string | null;
  region?: string | null;        // e.g. "Burgundy", "Marlborough"
  appellation?: string | null;   // sub-region / AOC / AVA (e.g. "Chassagne-Montrachet")
  variety?: string | null;       // "Chardonnay", "Blend", "Cabernet Sauvignon/Merlot" etc.
  vintage?: number | null;       // 4-digit; null = NV
  is_nv?: boolean | null;
  world?: 'old' | 'new' | null;  // optional, inferred if missing
};

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null; // e.g. Chardonnay inferred from “blanc de blancs”
};

type QuizQ = { id: string; prompt: string; answer: string; options: string[] };

const TABLE_NAME = 'wine_index';

/* =========================
   Utilities
   ========================= */
function titleCase(s: string) {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}
function normalize(s: string) {
  return (s || '').toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '');
}
function eqi(a?: string | null, b?: string | null) {
  return normalize(String(a || '')) === normalize(String(b || ''));
}
function worldFromCountry(country?: string | null): 'old' | 'new' | null {
  if (!country) return null;
  const c = normalize(country);
  const OLD = ['france','italy','spain','germany','portugal','austria','greece','hungary'];
  const NEW = ['usa','united states','new zealand','australia','chile','argentina','south africa','canada'];
  if (OLD.includes(c)) return 'old';
  if (NEW.includes(c)) return 'new';
  return null;
}

/* =========================
   OCR → Label Hints
   ========================= */
function extractLabelHints(text: string): LabelHints {
  const t = text.toLowerCase();

  const years = Array.from(t.matchAll(/\b(19|20)\d{2}\b/g)).map(m => Number(m[0]));
  const possibleYear = years.find(y => y >= 1980 && y <= new Date().getFullYear());

  const isNV = /\bnv\b|\bnon\s*-?\s*vintage\b/.test(t);

  let inferredVariety: string | null = null;
  if (/blanc\s+de\s+blancs/.test(t)) inferredVariety = 'Chardonnay';
  else if (/blanc\s+de\s+noirs/.test(t)) inferredVariety = 'Pinot Noir';
  else {
    const grapeList = [
      'chardonnay','pinot noir','pinot meunier','riesling','sauvignon','cabernet',
      'merlot','syrah','shiraz','malbec','tempranillo','nebbiolo','sangiovese',
      'grenache','zinfandel','primitivo','chenin','viognier','gewurztraminer',
      'gruner','barbera','mencia','touriga','gamay','aligote'
    ];
    const found = grapeList.find(g => t.includes(g));
    inferredVariety = found ? titleCase(found) : null;
  }

  return {
    vintage_year: isNV ? null : (possibleYear ?? null),
    is_non_vintage: isNV,
    inferred_variety: inferredVariety,
  };
}

/* =========================
   Smart MCQ builders (per slot)
   ========================= */
// Pools for plausible distractors
const GRAPES = [
  'Chardonnay','Pinot Noir','Sauvignon Blanc','Riesling','Syrah','Shiraz','Merlot','Cabernet Sauvignon',
  'Grenache','Tempranillo','Nebbiolo','Sangiovese','Chenin Blanc','Viognier','Zinfandel','Pinot Meunier','Gamay','Barbera'
];
const COUNTRIES = ['France','Italy','Spain','Germany','USA','Australia','New Zealand','Chile','Argentina','Portugal','Austria','South Africa','Canada'];
const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  France: ['Burgundy','Bordeaux','Loire','Rhône','Champagne','Alsace','Languedoc'],
  Italy: ['Piedmont','Tuscany','Veneto','Sicily','Trentino-Alto Adige','Friuli'],
  Spain: ['Rioja','Ribera del Duero','Priorat','Rías Baixas','Rueda'],
  Germany: ['Mosel','Rheingau','Pfalz','Nahe'],
  USA: ['Napa Valley','Sonoma','Willamette Valley','Walla Walla'],
  Australia: ['Barossa Valley','Margaret River','Yarra Valley','Adelaide Hills'],
  'New Zealand': ['Marlborough','Central Otago','Hawke’s Bay'],
  Chile: ['Maipo Valley','Colchagua','Casablanca'],
  Argentina: ['Mendoza','Patagonia','Salta'],
  Portugal: ['Douro','Dão','Alentejo','Vinho Verde'],
  Austria: ['Wachau','Kamptal','Burgenland'],
  'South Africa': ['Stellenbosch','Swartland','Hemel-en-Aarde'],
  Canada: ['Okanagan','Niagara Peninsula']
};
function uniq<T>(arr: T[]) { return [...new Set(arr)]; }
function shuffle<T>(arr: T[]) { return [...arr].sort(() => Math.random() - 0.5); }

function makeWorldQ(country?: string | null): QuizQ {
  const world = worldFromCountry(country) === 'new' ? 'New World' : 'Old World';
  return { id: 'world', prompt: '1) Old World or New World?', answer: world, options: ['Old World','New World'] };
}

function parseBlend(variety?: string | null): string[] {
  if (!variety) return [];
  // split on / , + & or the word "blend"
  const raw = variety.replace(/blend/i, '').split(/[/,+&]| and /i).map(s => s.trim()).filter(Boolean);
  const cleaned = raw.map(v => titleCase(v));
  return uniq(cleaned);
}

function makeVarietyQ(variety?: string | null, inferred?: string | null): QuizQ {
  // Priority: explicit variety/blend from DB → inferred from OCR → fallback generic MCQ
  const isBlend = variety && /blend|\/|,| and /i.test(variety);
  const grapes = isBlend ? parseBlend(variety) : (variety ? [titleCase(variety)] : (inferred ? [inferred] : []));

  let answer = isBlend ? `${grapes.join(' / ')}` : (grapes[0] || 'Chardonnay');

  // Option set: if blend, include “Blend” variants and distractor single grapes
  let baseOptions: string[] = [];
  if (isBlend && grapes.length >= 2) {
    baseOptions = [
      `${grapes.join(' / ')}`,
      grapes[0],
      grapes[1],
      'Bordeaux Blend',
      ...shuffle(GRAPES).slice(0, 4)
    ];
  } else {
    baseOptions = [answer, ...shuffle(GRAPES.filter(g => g !== answer)).slice(0, 5)];
  }
  const options = shuffle(uniq(baseOptions)).slice(0, 4);

  return { id: 'variety', prompt: '2) Variety / Blend?', answer, options };
}

function makeVintageOptions(targetYear: number, now = new Date().getFullYear()): string[] {
  const min = 1980;
  const close = uniq([targetYear - 1, targetYear, targetYear + 1]).filter(y => y >= min && y <= now);
  const far = uniq([targetYear - 10, targetYear + 10, targetYear - 15, targetYear + 15]).filter(y => y >= min && y <= now);
  const pick = uniq([...close, ...far]).slice(0, 4);
  while (pick.length < 4) {
    const n = Math.max(min, Math.min(now, targetYear + (Math.random() > 0.5 ? 7 : -7)));
    if (!pick.includes(n)) pick.push(n);
  }
  return shuffle(pick.map(String));
}

function makeVintageQ(hints: LabelHints, matchedVintage?: number | null): QuizQ {
  if (matchedVintage) {
    return { id: 'vintage', prompt: '3) Vintage?', answer: String(matchedVintage), options: makeVintageOptions(matchedVintage) };
  }
  if (hints.is_non_vintage) {
    return { id: 'vintage', prompt: '3) Vintage?', answer: 'NV', options: shuffle(['NV','2020','2018','2015']) };
  }
  if (hints.vintage_year) {
    return { id: 'vintage', prompt: '3) Vintage?', answer: String(hints.vintage_year), options: makeVintageOptions(hints.vintage_year) };
  }
  // Fallback: gentle NV vs year
  return { id: 'vintage', prompt: '3) Vintage?', answer: 'NV', options: ['NV','2021','2019','2016'] };
}

function makeCountryQ(country?: string | null): QuizQ {
  const ans = country ? titleCase(country) : 'France';
  const options = shuffle(uniq([ans, ...COUNTRIES])).slice(0, 4);
  return { id: 'country', prompt: '4) Country?', answer: ans, options };
}

function makeRegionQ(region?: string | null, country?: string | null): QuizQ {
  const ans = region ? titleCase(region) : 'Burgundy';
  const pool = REGIONS_BY_COUNTRY[titleCase(country || '')] || Object.values(REGIONS_BY_COUNTRY).flat();
  const options = shuffle(uniq([ans, ...pool])).slice(0, 4);
  return { id: 'region', prompt: '5) Region?', answer: ans, options };
}

function makeSubRegionQ(appellation?: string | null, region?: string | null): QuizQ | null {
  const sub = appellation && !eqi(appellation, region) ? titleCase(appellation) : '';
  if (!sub) return null;
  // Build distractors from common sub-regions plus region name
  const commonSubs = [
    'Chassagne-Montrachet','Puligny-Montrachet','Meursault','Gevrey-Chambertin','Vosne-Romanée',
    'Chianti Classico','Barolo','Barbaresco','Ribera del Duero','Napa Valley','Marlborough'
  ];
  const options = shuffle(uniq([sub, titleCase(region || ''), ...commonSubs])).slice(0, 4);
  return { id: 'subregion', prompt: '6) Sub-region / Appellation?', answer: sub, options };
}

/** Build the 6-slot quiz in the fixed order */
function generateFixedOrderQuiz(labelText: string, hints: LabelHints, matched?: WineRow): QuizQ[] {
  const worldQ = makeWorldQ(matched?.country);
  const varietyQ = makeVarietyQ(matched?.variety, hints.inferred_variety);
  const vintageQ = makeVintageQ(hints, matched?.vintage ?? null);
  const countryQ = makeCountryQ(matched?.country);
  const regionQ = makeRegionQ(matched?.region, matched?.country);
  const subQ = makeSubRegionQ(matched?.appellation, matched?.region);

  const quiz: QuizQ[] = [worldQ, varietyQ, vintageQ, countryQ, regionQ];
  if (subQ) quiz.push(subQ);
  return quiz;
}

/* =========================
   Component
   ========================= */
const WineOptionsGame: React.FC = () => {
  // Label + hints
  const [labelText, setLabelText] = React.useState('');
  const [labelHints, setLabelHints] = React.useState<LabelHints | null>(null);

  // Supabase
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wine, setWine] = React.useState<WineRow | null>(null);

  // Display OCR text
  const [ocrText, setOcrText] = React.useState<string>('');

  // Fixed-order Quiz
  const [quiz, setQuiz] = React.useState<QuizQ[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [checked, setChecked] = React.useState(false);

  // Your manual picks (kept, if you still want them)
  const [guessWorld, setGuessWorld] = React.useState<'old' | 'new' | ''>('');
  const [guessVariety, setGuessVariety] = React.useState<string>('');
  const [guessCountry, setGuessCountry] = React.useState<string>('');
  const [guessRegion, setGuessRegion] = React.useState<string>('');
  const [guessVintage, setGuessVintage] = React.useState<string>('');

  const onOCR = (text: string) => {
    const trimmed = (text || '').trim();
    setOcrText(trimmed);
    setLabelText(trimmed);
    const hints = extractLabelHints(trimmed);
    setLabelHints(hints);

    // Build fixed-order quiz from OCR only (no match yet)
    setQuiz(generateFixedOrderQuiz(trimmed, hints, undefined));
    setAnswers({});
    setChecked(false);
    setWine(null);
    setGuessWorld(''); setGuessVariety(''); setGuessCountry(''); setGuessRegion(''); setGuessVintage('');
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

      // tokenization: words >= 3 letters
      const tokens = Array.from(t.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/g)).map(m => m[0].toLowerCase());
      const unique = Array.from(new Set(tokens));
      const strong = [...unique].sort((a, b) => b.length - a.length).slice(0, 4);

      let query = supabase.from(TABLE_NAME).select('*').limit(25);
      if (strong.length) {
        const ors: string[] = [];
        for (const tok of strong) {
          ors.push(`display_name.ilike.%${tok}%`);
          ors.push(`producer.ilike.%${tok}%`);
          ors.push(`appellation.ilike.%${tok}%`);
        }
        query = query.or(ors.join(','));
      }
      if (hints.inferred_variety) query = query.ilike('variety', `%${hints.inferred_variety}%`);
      if (hints.is_non_vintage) query = query.is('vintage', null);
      else if (hints.vintage_year) query = query.eq('vintage', hints.vintage_year);

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      const rows: WineRow[] = (data ?? []);
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
        // keep OCR-only quiz
        return;
      }

      if (!candidate.world) candidate.world = worldFromCountry(candidate.country);
      setWine(candidate);

      // Rebuild quiz with matched wine fields for higher confidence
      setQuiz(generateFixedOrderQuiz(labelText, hints, candidate));
    } catch (e: any) {
      setError(e?.message ?? 'Search failed');
    } finally {
      setBusy(false);
    }
  };

  const isQuizCorrect = (qid: string) => {
    const q = quiz.find(x => x.id === qid);
    if (!q) return false;
    const a = answers[qid] || '';
    return normalize(a) === normalize(q.answer);
  };

  const checkAnswers = () => setChecked(true);

  const doShare = async () => {
    const shareText =
      `Wine Options — my picks:\n` +
      quiz.map(q => `- ${q.prompt.replace(/^\d\)\s*/, '')} ${answers[q.id] || '—'} (answer: ${q.answer})`).join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Wine Options', text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        alert('Copied to clipboard!');
      }
    } catch { /* ignore */ }
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
        <OCRUpload onText={(txt) => onOCR(txt)} />

        {ocrText && (
          <pre className="text-xs bg-gray-100 p-2 mt-2 whitespace-pre-wrap max-h-40 overflow-auto">
            {ocrText}
          </pre>
        )}

        {labelText && labelHints && (
          <div className="text-xs text-gray-600">
            {labelHints.is_non_vintage ? 'NV detected' :
              labelHints.vintage_year ? `Vintage candidate: ${labelHints.vintage_year}` : 'No vintage found'}
            {labelHints.inferred_variety ? ` • Variety hint: ${labelHints.inferred_variety}` : ''}
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
              Variety: {wine.variety || '—'} • Country: {wine.country || '—'} • Region: {wine.region || '—'}
              {wine.appellation ? <> • Sub-region: {wine.appellation}</> : null}
              {typeof wine.vintage === 'number' ? <> • Vintage: {wine.vintage}</> : <> • Vintage: NV</>}
            </div>
          </div>
        )}
      </section>

      {/* 3) Fixed-order Quiz */}
      {quiz.length > 0 && (
        <section className="bg-white border rounded-lg p-4 space-y-4">
          <div className="font-semibold">Your quiz (Wine Options format)</div>
          <div className="space-y-3">
            {quiz.map(q => (
              <div key={q.id} className="border rounded p-3">
                <div className="text-sm font-medium mb-2">{q.prompt}</div>
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

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={checkAnswers} className="px-4 py-2 rounded bg-black text-white">
              Check answers
            </button>
            <button onClick={doShare} className="px-4 py-2 rounded border flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default WineOptionsGame;
