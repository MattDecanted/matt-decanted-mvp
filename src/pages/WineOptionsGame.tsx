// src/pages/WineOptionsGame.tsx
import React from 'react';
import { Share2, Wine, Search, Loader2, CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import OCRUpload from '@/components/OCRUpload';
import { supabase } from '@/lib/supabase';

/* ==================== Types ==================== */
type WineRow = {
  id: string;
  display_name: string;
  producer?: string | null;
  country?: string | null;
  region?: string | null;
  appellation?: string | null;   // e.g. “Chassagne-Montrachet”, “Rioja Alta”
  variety?: string | null;       // e.g. “Chardonnay”, “Blend”
  vintage?: number | null;       // 4-digit; null => NV
  is_nv?: boolean | null;
  world?: 'old' | 'new' | null;
};

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null;
};

const TABLE_NAME = 'wine_index';
const FN_AWARD = '/.netlify/functions/award-points';

/* ==================== Helpers ==================== */
function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function worldFromCountry(country?: string | null): 'old' | 'new' | null {
  if (!country) return null;
  const c = country.toLowerCase();
  const OLD = ['france','italy','spain','germany','portugal','austria','greece','hungary'];
  const NEW = ['usa','united states','new zealand','australia','chile','argentina','south africa','canada'];
  if (OLD.includes(c)) return 'old';
  if (NEW.includes(c)) return 'new';
  return null;
}

function extractLabelHints(text: string): LabelHints {
  const t = text.toLowerCase();

  const years = Array.from(t.matchAll(/\b(19|20)\d{2}\b/g)).map(m => Number(m[0]));
  const possibleYear = years.find(y => y >= 1980 && y <= new Date().getFullYear());
  const isNV = /\bnv\b|\bnon\s*-?\s*vintage\b/.test(t);

  let inferredVariety: string | null = null;
  if (/blanc\s+de\s+blancs/.test(t)) {
    inferredVariety = 'Chardonnay';
  } else if (/blanc\s+de\s+noirs/.test(t)) {
    inferredVariety = 'Pinot Noir';
  } else {
    const grapeList = [
      'chardonnay','pinot noir','pinot meunier','riesling','sauvignon','cabernet','merlot','syrah','shiraz','malbec',
      'tempranillo','nebbiolo','sangiovese','grenache','zinfandel','primitivo','chenin','viognier','gewurztraminer',
      'gruner','barbera','mencía','touriga','gamay','aligoté','semillon','cabernet franc'
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

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uniqStrings(items: (string | null | undefined)[]) {
  return Array.from(new Set(items.filter(Boolean).map(s => s!.trim()))).filter(s => s.length > 0);
}
function pickDistractors(pool: string[], correct: string, n: number) {
  const filtered = pool.filter(x => x && x.toLowerCase() !== (correct || '').toLowerCase());
  return shuffle(filtered).slice(0, n);
}

function buildVintageChoices(wine: WineRow | null, hints: LabelHints | null): string[] {
  // Prefer actual catalog vintage, fallback to OCR year
  const target = (typeof wine?.vintage === 'number' ? wine!.vintage : null)
              ?? (hints?.vintage_year ?? null);

  if (target) {
    const pool = [
      String(target),
      String(target - 1),
      String(target + 1),
      String(target - 2),
      String(target + 2),
      'NV',
    ];
    const unique = Array.from(new Set(pool));
    const shuffled = shuffle(unique);
    if (!shuffled.includes(String(target))) shuffled[0] = String(target);
    return shuffled.slice(0, 4);
  } else {
    const now = new Date().getFullYear();
    const pool = ['NV', String(now), String(now - 1), String(now - 2), String(now - 3)];
    const unique = Array.from(new Set(pool));
    return shuffle(unique).slice(0, 4);
  }
}

function computePoints({ score, maxScore, durationSeconds }: { score: number; maxScore: number; durationSeconds?: number | null }) {
  const streak = score === maxScore;                    // +1 if perfect
  const timeBonus = durationSeconds != null && durationSeconds <= 60; // +1 if done ≤ 60s
  const points = score + (streak ? 1 : 0) + (timeBonus ? 1 : 0);
  return { points, streak, timeBonus };
}

async function awardPointsToUser(params: {
  score: number;
  maxScore: number;
  durationSeconds?: number | null;
  mode: 'solo' | 'host' | 'guest';
}) {
  const { data } = await supabase.auth.getUser();
  const user_id = data?.user?.id;
  if (!user_id) return { ok: false }; // Not signed in → skip server award

  const res = await fetch(FN_AWARD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id,
      score: params.score,
      max_score: params.maxScore,
      duration_seconds: params.durationSeconds ?? null,
      streak_bonus: params.score === params.maxScore,
      time_bonus: params.durationSeconds != null && params.durationSeconds <= 60,
      mode: params.mode,
    }),
  });
  return res.json();
}

const AnswerBadge: React.FC<{ ok: boolean; truth: string }> = ({ ok, truth }) => (
  <div className={`mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
    <CheckCircle2 className="w-3 h-3" />
    {ok ? 'Correct' : <>Answer: <span className="font-semibold">{truth}</span></>}
  </div>
);

/* ==================== Component ==================== */
const WineOptionsGame: React.FC = () => {
  // OCR + hints
  const [labelText, setLabelText] = React.useState('');
  const [labelHints, setLabelHints] = React.useState<LabelHints | null>(null);

  // search / match
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wine, setWine] = React.useState<WineRow | null>(null);

  // user guesses
  const [guessWorld, setGuessWorld] = React.useState<'old' | 'new' | ''>('');
  const [guessVariety, setGuessVariety] = React.useState<string>('');
  const [guessCountry, setGuessCountry] = React.useState<string>('');
  const [guessRegion, setGuessRegion] = React.useState<string>('');
  const [guessSubregion, setGuessSubregion] = React.useState<string>('');
  const [guessVintage, setGuessVintage] = React.useState<string>(''); // keep EMPTY initially
  const [checked, setChecked] = React.useState(false);

  // MCQ choices
  const [countryChoices, setCountryChoices] = React.useState<string[]>([]);
  const [regionChoices, setRegionChoices] = React.useState<string[]>([]);
  const [subregionChoices, setSubregionChoices] = React.useState<string[]>([]);
  const [vintageChoices, setVintageChoices] = React.useState<string[]>([]);
  const [varietyChoices, setVarietyChoices] = React.useState<string[]>([]);

  // scoring/points
  const startRef = React.useRef<number | null>(null);
  const [score, setScore] = React.useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = React.useState<number | null>(null);
  const [awarded, setAwarded] = React.useState<number | null>(null);
  const [totalPoints, setTotalPoints] = React.useState<number | null>(null);

  // OCR callback
  const onOCR = (text: string) => {
    setLabelText(text);
    const hints = extractLabelHints(text);
    setLabelHints(hints);

    // full reset (no pre-seeding)
    setWine(null);
    setChecked(false);
    setScore(null);
    setAwarded(null);
    setTotalPoints(null);
    setDurationSeconds(null);
    startRef.current = null;

    setGuessWorld('');
    setGuessVariety('');
    setGuessCountry('');
    setGuessRegion('');
    setGuessSubregion('');
    setGuessVintage(''); // IMPORTANT: do not prefill
    setError(null);
  };

  // “Let’s play” (was: Find a likely match)
  const findMatch = async () => {
    setBusy(true);
    setError(null);
    setWine(null);
    try {
      const t = labelText;
      const hints = extractLabelHints(t);
      setLabelHints(hints);

      const tokens = Array.from(t.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/g)).map(m => m[0]);
      const unique = Array.from(new Set(tokens)).slice(0, 8);

      let query = supabase.from(TABLE_NAME).select('*').limit(10);

      if (unique.length) {
        const primary = unique.slice(0, 3);
        const ors = primary.map(tok => `display_name.ilike.%${tok}%`).join(',');
        query = query.or(ors);
      }

      if (hints.inferred_variety) query = query.ilike('variety', `%${hints.inferred_variety}%`);
      if (hints.is_non_vintage) query = query.is('vintage', null);
      else if (hints.vintage_year) query = query.eq('vintage', hints.vintage_year);

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      const candidate: WineRow | undefined = (data ?? [])[0];
      if (!candidate) {
        setError('No close match found. You can still play by choosing options manually.');
        setWine(null);
        return;
      }

      if (!candidate.world) candidate.world = worldFromCountry(candidate.country);
      setWine(candidate);

      // start timer on first round
      startRef.current = Date.now();
    } catch (e: any) {
      setError(e?.message ?? 'Search failed');
    } finally {
      setBusy(false);
    }
  };

  // Build MCQs after a match (and whenever hints update)
  React.useEffect(() => {
    const loadOptions = async () => {
      if (!wine) {
        setCountryChoices([]); setRegionChoices([]); setSubregionChoices([]);
        setVintageChoices([]); setVarietyChoices([]);
        return;
      }

      // Country choices
      try {
        const { data: countries } = await supabase.rpc('get_countries');
        if (countries) {
          const correct = wine.country || '';
          const distractors = pickDistractors(countries.map((c: { country: string }) => c.country), correct, 3);
          setCountryChoices(shuffle(uniqStrings([correct, ...distractors])));
        }
      } catch {
        setCountryChoices(uniqStrings([wine.country || '']));
      }

      // Region choices
      try {
        if (wine.country) {
          const { data: regions } = await supabase.rpc('get_regions', { p_country: wine.country });
          if (regions) {
            const list = regions.map((r: { region: string }) => r.region);
            const correct = wine.region || wine.appellation || '';
            const distractors = pickDistractors(list, correct, 3);
            setRegionChoices(shuffle(uniqStrings([correct, ...distractors])));
          }
        }
      } catch {
        setRegionChoices(uniqStrings([wine.region || wine.appellation || '']));
      }

      // Subregion choices (optional)
      try {
        if (wine.country && (wine.region || wine.appellation)) {
          const baseRegion = wine.region || wine.appellation!;
          const { data: subs } = await supabase.rpc('get_subregions', { p_country: wine.country, p_region: baseRegion });
          if (subs && subs.length) {
            const list = subs.map((s: { subregion: string }) => s.subregion);
            const correct = wine.appellation || '';
            if (correct) {
              const distractors = pickDistractors(list, correct, 3);
              setSubregionChoices(shuffle(uniqStrings([correct, ...distractors])));
            } else {
              setSubregionChoices([]);
            }
          } else {
            setSubregionChoices([]);
          }
        } else {
          setSubregionChoices([]);
        }
      } catch {
        setSubregionChoices([]);
      }

      // Vintage choices (key fix)
      setVintageChoices(buildVintageChoices(wine, labelHints));

      // Variety choices
      const correctVar = (wine.variety || '').trim() || (labelHints?.inferred_variety || '').trim();
      const commonGrapes = [
        'Chardonnay','Pinot Noir','Sauvignon Blanc','Riesling','Cabernet Sauvignon',
        'Merlot','Syrah','Shiraz','Grenache','Tempranillo','Nebbiolo','Sangiovese',
        'Chenin Blanc','Pinot Gris','Viognier','Malbec','Zinfandel','Primitivo','Gamay'
      ];
      const pool = uniqStrings([correctVar, ...commonGrapes]);
      const distract = pickDistractors(pool, correctVar, 3);
      setVarietyChoices(shuffle([correctVar, ...distract].filter(Boolean)));
    };

    loadOptions().catch(() => {});
  }, [wine, labelHints]);

  const correctWorld = wine?.world ?? worldFromCountry(wine?.country);
  const correctVariety = wine?.variety || '';
  const correctCountry = wine?.country || '';
  const correctRegion = wine?.region || wine?.appellation || '';
  const correctSubregion = wine?.appellation || '';
  const correctVintage = wine?.vintage
    ? String(wine.vintage)
    : (labelHints?.vintage_year ? String(labelHints.vintage_year) : 'NV');

  const isCorrect = (user: string | '', truth: string | null | undefined) => {
    if (!user || !truth) return false;
    return user.trim().toLowerCase() === String(truth).trim().toLowerCase();
  };

  // Reveal & score
  const checkAnswers = async () => {
    setChecked(true);

    const s = [
      isCorrect(guessWorld, correctWorld || ''),
      isCorrect(guessVariety, correctVariety || ''),
      isCorrect(guessVintage, correctVintage || ''),
      isCorrect(guessCountry, correctCountry || ''),
      isCorrect(guessRegion, correctRegion || ''),
      // subregion is optional; do NOT count it in base /5
    ].reduce((acc, ok) => acc + (ok ? 1 : 0), 0);

    setScore(s);
    const dur = startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : null;
    setDurationSeconds(dur);

    // local compute + server award (if signed in)
    const { points } = computePoints({ score: s, maxScore: 5, durationSeconds: dur });
    setAwarded(points);

    const res = await awardPointsToUser({
      score: s,
      maxScore: 5,
      durationSeconds: dur ?? undefined,
      mode: 'solo',
    });
    if (res?.ok) {
      setAwarded(res.points_awarded ?? points);
      setTotalPoints(res.total_points ?? null);
    }
  };

  const doShare = async () => {
    const shareText = `Wine Options — my picks:
World: ${guessWorld || '—'} • Variety: ${guessVariety || '—'} • Vintage: ${guessVintage || '—'} • Country: ${guessCountry || '—'} • Region: ${guessRegion || '—'} • Sub-region: ${guessSubregion || '—'}
${wine ? `Target: ${wine.display_name}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Wine Options', text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        alert('Copied to clipboard!');
      }
    } catch { /* no-op */ }
  };

  /* ==================== Render ==================== */
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

        <OCRUpload onText={onOCR} />

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
            {busy ? 'Working…' : `Let’s play`}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </section>

      {/* 2) Candidate (optional info) */}
      <section className="bg-white border rounded-lg p-4">
        <div className="text-sm font-semibold mb-2">Candidate (you can still choose different answers)</div>

        {!wine ? (
          <div className="text-sm text-gray-600">No candidate yet. Upload a label and click “Let’s play”.</div>
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

      {/* 3) Questions */}
      <section className="bg-white border rounded-lg p-4 space-y-6">
        <div className="font-semibold">Your picks</div>

        {/* World */}
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
          {checked && <AnswerBadge ok={isCorrect(guessWorld, correctWorld || '')} truth={correctWorld || '—'} />}
        </div>

        {/* Variety / Blend */}
        <div>
          <div className="text-xs text-gray-600 mb-1">Variety / Blend</div>
          <div className="flex flex-wrap gap-2">
            {(varietyChoices.length ? varietyChoices : [wine?.variety || labelHints?.inferred_variety || ''].filter(Boolean)).map((opt) => (
              <button
                key={`var-${opt}`}
                className={`px-3 py-2 rounded border ${guessVariety.toLowerCase() === opt.toLowerCase() ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                onClick={() => setGuessVariety(opt)}
              >{opt}</button>
            ))}
          </div>
          {checked && <AnswerBadge ok={isCorrect(guessVariety, correctVariety)} truth={correctVariety || '—'} />}
        </div>

        {/* Vintage */}
        <div>
          <div className="text-xs text-gray-600 mb-1">Vintage</div>
          <div className="flex flex-wrap gap-2">
            {(vintageChoices.length ? vintageChoices : [wine?.vintage ? String(wine.vintage) : (labelHints?.vintage_year ? String(labelHints.vintage_year) : 'NV')]).map((opt) => (
              <button
                key={`vint-${opt}`}
                className={`px-3 py-2 rounded border ${guessVintage.toLowerCase() === opt.toLowerCase() ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                onClick={() => setGuessVintage(opt)}
              >{opt}</button>
            ))}
          </div>
          {checked && <AnswerBadge ok={isCorrect(guessVintage, correctVintage)} truth={correctVintage} />}
        </div>

        {/* Country */}
        <div>
          <div className="text-xs text-gray-600 mb-1">Country</div>
          <div className="flex flex-wrap gap-2">
            {(countryChoices.length ? countryChoices : [wine?.country || ''].filter(Boolean)).map((opt) => (
              <button
                key={`country-${opt}`}
                className={`px-3 py-2 rounded border ${guessCountry.toLowerCase() === opt.toLowerCase() ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                onClick={() => setGuessCountry(opt)}
              >{opt}</button>
            ))}
          </div>
          {checked && <AnswerBadge ok={isCorrect(guessCountry, correctCountry)} truth={correctCountry || '—'} />}
        </div>

        {/* Region */}
        <div>
          <div className="text-xs text-gray-600 mb-1">Region</div>
          <div className="flex flex-wrap gap-2">
            {(regionChoices.length ? regionChoices : [wine?.region || wine?.appellation || ''].filter(Boolean)).map((opt) => (
              <button
                key={`region-${opt}`}
                className={`px-3 py-2 rounded border ${guessRegion.toLowerCase() === opt.toLowerCase() ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                onClick={() => setGuessRegion(opt)}
              >{opt}</button>
            ))}
          </div>
          {checked && <AnswerBadge ok={isCorrect(guessRegion, correctRegion)} truth={correctRegion || '—'} />}
        </div>

        {/* Sub-region (if applicable) */}
        {subregionChoices.length > 0 && (
          <div>
            <div className="text-xs text-gray-600 mb-1">Sub-region / Appellation</div>
            <div className="flex flex-wrap gap-2">
              {subregionChoices.map((opt) => (
                <button
                  key={`sub-${opt}`}
                  className={`px-3 py-2 rounded border ${guessSubregion.toLowerCase() === opt.toLowerCase() ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                  onClick={() => setGuessSubregion(opt)}
                >{opt}</button>
              ))}
            </div>
            {checked && <AnswerBadge ok={isCorrect(guessSubregion, correctSubregion)} truth={correctSubregion || '—'} />}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={checkAnswers} className="px-4 py-2 rounded bg-black text-white">
            Reveal & score
          </button>
          <button onClick={doShare} className="px-4 py-2 rounded border flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>

        {/* Results / Points */}
        {checked && score != null && (
          <div className="mt-4 p-3 rounded-md border bg-purple-50 text-purple-900 text-sm">
            <div><strong>Score:</strong> {score}/5</div>
            {durationSeconds != null && <div><strong>Time:</strong> {durationSeconds}s</div>}
            <div>
              <strong>Points:</strong> {awarded ?? score}
              {totalPoints != null && <> • <strong>Total:</strong> {totalPoints}</>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default WineOptionsGame;
