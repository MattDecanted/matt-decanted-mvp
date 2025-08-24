import React from 'react';
import { Share2, Wine, Search, Loader2, CheckCircle2, AlertTriangle, Camera, BookOpen } from 'lucide-react';
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
  appellation?: string | null;   // sub-region / AOC / AVA
  variety?: string | null;       // "Chardonnay" or "Cabernet Sauvignon / Merlot"
  vintage?: number | null;
  is_nv?: boolean | null;
  world?: 'old' | 'new' | null;
};

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null;
};

type QuizQ = { id: string; prompt: string; answer: string; options: string[] };

type Terroir = {
  id: string;
  country: string;
  region: string;
  subregion: string | null;
  varieties: string | null;
  style_notes: string | null;
  blend_rules: string | null;
  climate: string | null;
  typical_soil: string | null;
};

/* =========================
   Utils
   ========================= */
function titleCase(s: string) {
  return (s || '').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}
function normalize(s?: string | null) {
  return (s || '').toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '');
}
function eqi(a?: string | null, b?: string | null) {
  return normalize(a) === normalize(b);
}
function uniq<T>(arr: T[]) { return [...new Set(arr)]; }
function shuffle<T>(arr: T[]) { return [...arr].sort(() => Math.random() - 0.5); }

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
   Supabase helpers (wine_terroir)
   ========================= */
async function terroirByPlace(country?: string | null, region?: string | null, subregion?: string | null): Promise<Terroir[]> {
  let q = supabase.from('wine_terroir').select('*').limit(50);
  if (country) q = q.ilike('country', `%${country}%`);
  if (region) q = q.ilike('region', `%${region}%`);
  if (subregion) q = q.ilike('subregion', `%${subregion}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function terroirByGrape(grape: string): Promise<Terroir[]> {
  const { data, error } = await supabase
    .from('wine_terroir')
    .select('*')
    .ilike('varieties', `%${grape}%`)
    .limit(50);
  if (error) throw error;
  return data || [];
}

function parseBlend(variety?: string | null): string[] {
  if (!variety) return [];
  const raw = variety
    .replace(/\bblend\b/ig, '')
    .split(/[/,+&]| and /i)
    .map(s => s.trim())
    .filter(Boolean);
  return uniq(raw.map(titleCase));
}

/* =========================
   Fixed-order quiz builders (async; pulls from wine_terroir)
   ========================= */
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

async function buildWorldQ(country?: string | null): Promise<QuizQ> {
  const world = worldFromCountry(country) === 'new' ? 'New World' : 'Old World';
  return { id: 'world', prompt: '1) Old World or New World?', answer: world, options: ['Old World','New World'] };
}

async function buildVarietyQ(variety?: string | null, inferred?: string | null): Promise<QuizQ> {
  const isBlend = !!(variety && /blend|\/|,| and /i.test(variety));
  const grapes = isBlend ? parseBlend(variety) : (variety ? [titleCase(variety)] : (inferred ? [inferred] : []));
  const answer = isBlend && grapes.length >= 2 ? grapes.join(' / ') : (grapes[0] || 'Chardonnay');

  // Distractors from terroir table (grapes listed in varieties) if we can infer country/region later;
  // here we’ll just mix in common grapes as fallback.
  const COMMON = [
    'Chardonnay','Pinot Noir','Sauvignon Blanc','Riesling','Syrah','Shiraz','Merlot',
    'Cabernet Sauvignon','Grenache','Tempranillo','Nebbiolo','Sangiovese','Chenin Blanc','Viognier','Zinfandel','Gamay'
  ];
  let options = [answer];
  if (isBlend && grapes.length >= 2) {
    options.push(grapes[0], grapes[1], 'Bordeaux Blend', ...shuffle(COMMON).slice(0, 2));
  } else {
    options.push(...shuffle(COMMON.filter(g => normalize(g) !== normalize(answer))).slice(0, 5));
  }
  options = shuffle(uniq(options)).slice(0, 4);
  return { id: 'variety', prompt: '2) Variety / Blend?', answer, options };
}

async function buildVintageQ(hints: LabelHints, matchedVintage?: number | null): Promise<QuizQ> {
  if (matchedVintage) {
    return { id: 'vintage', prompt: '3) Vintage?', answer: String(matchedVintage), options: makeVintageOptions(matchedVintage) };
  }
  if (hints.is_non_vintage) {
    return { id: 'vintage', prompt: '3) Vintage?', answer: 'NV', options: shuffle(['NV','2020','2018','2015']) };
  }
  if (hints.vintage_year) {
    return { id: 'vintage', prompt: '3) Vintage?', answer: String(hints.vintage_year), options: makeVintageOptions(hints.vintage_year) };
  }
  return { id: 'vintage', prompt: '3) Vintage?', answer: 'NV', options: ['NV','2021','2019','2016'] };
}

async function buildCountryQ(country?: string | null): Promise<QuizQ> {
  const ans = country ? titleCase(country) : 'France';
  // Derive distractors from DB (top countries present)
  let options = [ans];
  try {
    const { data, error } = await supabase
      .from('wine_terroir')
      .select('country')
      .limit(200);
    if (error) throw error;
    const pool = uniq((data || []).map(r => titleCase(r.country))).filter(c => c);
    options.push(...shuffle(pool.filter(c => !eqi(c, ans))).slice(0, 6));
  } catch {
    // fallback if query fails
    options.push('Italy','Spain','Germany','USA','Australia','New Zealand');
  }
  options = shuffle(uniq(options)).slice(0, 4);
  return { id: 'country', prompt: '4) Country?', answer: ans, options };
}

async function buildRegionQ(region?: string | null, country?: string | null): Promise<QuizQ> {
  const ans = region ? titleCase(region) : 'Burgundy';
  let options = [ans];

  try {
    let q = supabase.from('wine_terroir').select('region,country').limit(200);
    if (country) q = q.ilike('country', `%${country}%`);
    const { data, error } = await q;
    if (error) throw error;
    const pool = uniq((data || []).map(r => titleCase(r.region))).filter(Boolean);
    options.push(...shuffle(pool.filter(r => !eqi(r, ans))).slice(0, 8));
  } catch {
    // safe fallback
    options.push('Bordeaux','Loire Valley','Rhône Valley','Champagne','Alsace','Piedmont','Tuscany');
  }

  options = shuffle(uniq(options)).slice(0, 4);
  return { id: 'region', prompt: '5) Region?', answer: ans, options };
}

async function buildSubRegionQ(appellation?: string | null, region?: string | null, country?: string | null): Promise<QuizQ | null> {
  const sub = appellation && !eqi(appellation, region) ? titleCase(appellation) : '';
  if (!sub) return null;
  let options = [sub];

  try {
    let q = supabase.from('wine_terroir').select('subregion,region,country').not('subregion','is','null').limit(200);
    if (country) q = q.ilike('country', `%${country}%`);
    if (region) q = q.ilike('region', `%${region}%`);
    const { data, error } = await q;
    if (error) throw error;
    const pool = uniq((data || []).map(r => titleCase(r.subregion || ''))).filter(Boolean);
    options.push(...shuffle(pool.filter(s => !eqi(s, sub))).slice(0, 8));
  } catch {
    // fallback
    options.push('Meursault','Puligny-Montrachet','Gevrey-Chambertin','Vosne-Romanée','Napa Valley','Marlborough');
  }

  options = shuffle(uniq(options)).slice(0, 4);
  return { id: 'subregion', prompt: '6) Sub-region / Appellation?', answer: sub, options };
}

async function buildFixedOrderQuiz(hints: LabelHints, matched?: WineRow): Promise<QuizQ[]> {
  const worldQ   = await buildWorldQ(matched?.country);
  const varietyQ = await buildVarietyQ(matched?.variety, hints.inferred_variety || undefined);
  const vintageQ = await buildVintageQ(hints, matched?.vintage ?? null);
  const countryQ = await buildCountryQ(matched?.country);
  const regionQ  = await buildRegionQ(matched?.region, matched?.country);
  const subQ     = await buildSubRegionQ(matched?.appellation, matched?.region, matched?.country);

  const quiz: QuizQ[] = [worldQ, varietyQ, vintageQ, countryQ, regionQ];
  if (subQ) quiz.push(subQ);
  return quiz;
}

/* =========================
   Component
   ========================= */
const TABLE_NAME = 'wine_index';

const WineOptionsGame: React.FC = () => {
  // OCR & hints
  const [labelText, setLabelText] = React.useState('');
  const [labelHints, setLabelHints] = React.useState<LabelHints | null>(null);
  const [ocrText, setOcrText] = React.useState<string>('');

  // Supabase search
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wine, setWine] = React.useState<WineRow | null>(null);

  // Quiz
  const [quiz, setQuiz] = React.useState<QuizQ[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [checked, setChecked] = React.useState(false);

  // Learn card
  const [learn, setLearn] = React.useState<Terroir | null>(null);

  const onOCR = async (text: string) => {
    const trimmed = (text || '').trim();
    setOcrText(trimmed);
    setLabelText(trimmed);
    const hints = extractLabelHints(trimmed);
    setLabelHints(hints);
    setError(null);
    setWine(null);
    setLearn(null);
    setAnswers({});
    setChecked(false);
    try {
      // Build OCR-only quiz (no matched wine yet)
      const q = await buildFixedOrderQuiz(hints, undefined);
      setQuiz(q);
    } catch (e: any) {
      // fallback to empty quiz if something odd happens
      setQuiz([]);
      setError(e?.message ?? 'Could not build quiz');
    }
  };

  const findMatch = async () => {
    setBusy(true);
    setError(null);
    setWine(null);
    setLearn(null);
    try {
      const t = labelText;
      const hints = extractLabelHints(t);
      setLabelHints(hints);

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
        // keep OCR-only quiz
        return;
      }

      if (!candidate.world) candidate.world = worldFromCountry(candidate.country);
      setWine(candidate);

      // Build quiz with matched wine (better answers/distractors)
      const q = await buildFixedOrderQuiz(hints, candidate);
      setQuiz(q);

      // Load "Learn" from terroir table (prefer exact subregion, else region)
      const terroirRows =
        (await terroirByPlace(candidate.country, candidate.region, candidate.appellation)) ||
        (await terroirByPlace(candidate.country, candidate.region || undefined, undefined));
      if (terroirRows.length) setLearn(terroirRows[0]);
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

      {/* 4) Learn card (from terroir DB) */}
      {learn && (
        <section className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <BookOpen className="w-4 h-4" />
            Learn about the region
          </div>
          <div className="text-sm text-gray-800">
            <div className="font-medium">
              {learn.country} • {learn.region}{learn.subregion ? ` • ${learn.subregion}` : ''}
            </div>
            {learn.style_notes && <div className="mt-1"><span className="text-gray-600">Style:</span> {learn.style_notes}</div>}
            {learn.blend_rules && <div className="mt-1"><span className="text-gray-600">Blend rules:</span> {learn.blend_rules}</div>}
            {learn.climate && <div className="mt-1"><span className="text-gray-600">Climate:</span> {learn.climate}</div>}
            {learn.typical_soil && <div className="mt-1"><span className="text-gray-600">Soils:</span> {learn.typical_soil}</div>}
          </div>
        </section>
      )}
    </div>
  );
};

export default WineOptionsGame;
