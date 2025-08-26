// src/pages/SoloWineOptions.tsx
import React from 'react';
import {
  Share2, Wine, Search, Loader2, CheckCircle2, AlertTriangle,
  Camera, Upload, ClipboardCopy, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const TABLE_NAME = 'wine_index';
const FN_AWARD = '/.netlify/functions/award-points';
const FN_OCR = '/.netlify/functions/ocr-label';

type WineRow = {
  id: string;
  display_name: string;
  producer?: string | null;
  country?: string | null;
  region?: string | null;
  appellation?: string | null;
  variety?: string | null;
  vintage?: number | null;
  is_nv?: boolean | null;
  world?: 'old' | 'new' | null;
};

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null;
};

// ---- OCR helper ----
async function ocrLabel(file: File): Promise<{ text: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(FN_OCR, { method: 'POST', body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OCR failed: ${res.status} ${res.statusText} ${detail}`);
  }
  return res.json();
}

// ---- helpers ----
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
  if (/blanc\s+de\s+blancs/.test(t)) inferredVariety = 'Chardonnay';
  else if (/blanc\s+de\s+noirs/.test(t)) inferredVariety = 'Pinot Noir';
  else {
    const grapeList = [
      'chardonnay','pinot noir','pinot meunier','riesling','sauvignon','cabernet','merlot','syrah','shiraz','malbec',
      'tempranillo','nebbiolo','sangiovese','grenache','zinfandel','primitivo','chenin','viognier','gewurztraminer',
      'gruner','barbera','mencía','touriga','gamay','aligoté','semillon','cabernet franc','pinot gris','albariño'
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
function ensureFourOptions(opts: string[], fallback: string[]): string[] {
  const cleaned = uniqStrings(opts).slice(0, 4);
  if (cleaned.length >= 4) return shuffle(cleaned);
  const need = 4 - cleaned.length;
  const add = fallback.filter(x => !cleaned.map(c => c.toLowerCase()).includes(x.toLowerCase())).slice(0, need);
  return shuffle([...cleaned, ...add]);
}
function buildVintageChoices(wine: WineRow | null, hints: LabelHints | null): string[] {
  const now = new Date().getFullYear();
  if (hints?.is_non_vintage) {
    return ensureFourOptions(['NV', String(now), String(now - 1), String(now - 2)], [String(now - 3), String(now - 4)]);
  }
  const target = (typeof wine?.vintage === 'number' ? wine!.vintage : null) ?? (hints?.vintage_year ?? null);
  if (target) {
    const pool = [String(target), String(target - 1), String(target + 1), String(target - 2), String(target + 2), 'NV'];
    const unique = Array.from(new Set(pool));
    const shuffled = shuffle(unique);
    if (!shuffled.includes(String(target))) shuffled[0] = String(target);
    return shuffled.slice(0, 4);
  } else {
    const pool = ['NV', String(now), String(now - 1), String(now - 2), String(now - 3)];
    const unique = Array.from(new Set(pool));
    return shuffle(unique).slice(0, 4);
  }
}

const AnswerBadge: React.FC<{ ok: boolean; truth: string }> = ({ ok, truth }) => (
  <div className={`mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
    <CheckCircle2 className="w-3 h-3" />
    {ok ? 'Correct' : <>Answer: <span className="font-semibold">{truth}</span></>}
  </div>
);

// ---- scoring / awarding ----
function computeScore(
  guesses: { guessWorld: string; guessVariety: string; guessVintage: string; guessCountry: string; guessRegion: string; guessSubregion: string },
  truths:  { world: string | null | undefined; variety: string; vintage: string; country: string; region: string; subregion: string }
) {
  let score = 0;
  const eq = (a: string, b: string) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

  if (eq(guesses.guessWorld,  truths.world || '')) score += 1;
  if (eq(guesses.guessVariety, truths.variety))   score += 1;
  if (eq(guesses.guessVintage, truths.vintage))   score += 1;
  if (eq(guesses.guessCountry, truths.country))   score += 1;
  if (eq(guesses.guessRegion,  truths.region))    score += 1;
  if (truths.subregion && eq(guesses.guessSubregion, truths.subregion)) score += 1;

  return { score, max: truths.subregion ? 6 : 5 };
}
async function awardPointsSolo({ userId, score, max }: { userId: string; score: number; max: number }) {
  const res = await fetch(FN_AWARD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, mode: 'solo', score, max_score: max }),
  });
  return res.json();
}

// ---- Share Modal ----
const ShareModal: React.FC<{ open: boolean; onClose: () => void; text: string }> = ({ open, onClose, text }) => {
  if (!open) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); alert('Copied!'); } catch {}
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Share your picks</div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <textarea className="w-full border rounded p-2 text-sm h-40" readOnly value={text} />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={copy} className="px-3 py-2 rounded border inline-flex items-center gap-2">
            <ClipboardCopy className="w-4 h-4" /> Copy
          </button>
          <button onClick={onClose} className="px-3 py-2 rounded bg-black text-white">Close</button>
        </div>
      </div>
    </div>
  );
};

const SoloWineOptions: React.FC = () => {
  // OCR + hints
  const [labelText, setLabelText] = React.useState('');
  const [labelHints, setLabelHints] = React.useState<LabelHints | null>(null);
  const [uploadBusy, setUploadBusy] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState<string | null>(null);

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
  const [guessVintage, setGuessVintage] = React.useState<string>('');
  const [checked, setChecked] = React.useState(false);

  // MCQ choices
  const [countryChoices, setCountryChoices] = React.useState<string[]>([]);
  const [regionChoices, setRegionChoices] = React.useState<string[]>([]);
  const [subregionChoices, setSubregionChoices] = React.useState<string[]>([]);
  const [vintageChoices, setVintageChoices] = React.useState<string[]>([]);
  const [varietyChoices, setVarietyChoices] = React.useState<string[]>([]);

  // Share modal
  const [shareOpen, setShareOpen] = React.useState(false);

  const resetAll = () => {
    setLabelText('');
    setLabelHints(null);
    setWine(null);
    setError(null);
    setChecked(false);
    setGuessWorld('');
    setGuessVariety('');
    setGuessCountry('');
    setGuessRegion('');
    setGuessSubregion('');
    setGuessVintage('');
    setCountryChoices([]); setRegionChoices([]); setSubregionChoices([]);
    setVintageChoices([]); setVarietyChoices([]);
  };

  const onOCR = (text: string) => {
    setLabelText(text);
    const hints = extractLabelHints(text);
    setLabelHints(hints);
    setWine(null);
    setChecked(false);
    setGuessWorld('');
    setGuessVariety('');
    setGuessCountry('');
    setGuessRegion('');
    setGuessSubregion('');
    setGuessVintage('');
    setError(null);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploadErr(null);
    setUploadBusy(true);
    try {
      const { text } = await ocrLabel(file);
      onOCR(text || '');
    } catch (e: any) {
      setUploadErr(e?.message || 'OCR failed');
    } finally {
      setUploadBusy(false);
    }
  };

  const findMatch = async () => {
    setBusy(true);
    setError(null);
    setWine(null);
    try {
      const t = labelText.trim();
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

      // Countries
      try {
        const { data: countries } = await supabase.rpc('get_countries');
        if (countries) {
          const correct = wine.country || '';
          const distractors = pickDistractors(countries.map((c: { country: string }) => c.country), correct, 3);
          setCountryChoices(ensureFourOptions([correct, ...distractors], ['France','Italy','USA','Spain','Australia']));
        }
      } catch {
        setCountryChoices(uniqStrings([wine.country || '']));
      }

      // Regions
      try {
        if (wine.country) {
          const { data: regions } = await supabase.rpc('get_regions', { p_country: wine.country });
          if (regions) {
            const list = regions.map((r: { region: string }) => r.region);
            const correct = wine.region || wine.appellation || '';
            const distractors = pickDistractors(list, correct, 3);
            setRegionChoices(ensureFourOptions([correct, ...distractors], ['Bordeaux','Burgundy','Napa','Barossa']));
          }
        }
      } catch {
        setRegionChoices(uniqStrings([wine.region || wine.appellation || '']));
      }

      // Subregions (optional)
      try {
        if (wine.country && (wine.region || wine.appellation)) {
          const baseRegion = wine.region || wine.appellation!;
          const { data: subs } = await supabase.rpc('get_subregions', { p_country: wine.country, p_region: baseRegion });
          if (subs && subs.length) {
            const list = subs.map((s: { subregion: string }) => s.subregion);
            const correct = wine.appellation || '';
            if (correct) {
              const distractors = pickDistractors(list, correct, 3);
              setSubregionChoices(ensureFourOptions([correct, ...distractors], []));
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

      // Vintage
      setVintageChoices(buildVintageChoices(wine, labelHints));

      // Variety
      const correctVar = (wine.variety || '').trim() || (labelHints?.inferred_variety || '').trim();
      const commonGrapes = [
        'Chardonnay','Pinot Noir','Sauvignon Blanc','Riesling','Cabernet Sauvignon',
        'Merlot','Syrah','Shiraz','Grenache','Tempranillo','Nebbiolo','Sangiovese',
        'Chenin Blanc','Pinot Gris','Viognier','Malbec','Zinfandel','Primitivo','Gamay'
      ];
      const pool = uniqStrings([correctVar, ...commonGrapes]).filter(Boolean);
      const distract = pickDistractors(pool, correctVar, 3);
      const base = [correctVar, ...distract].filter(Boolean);
      const filled = ensureFourOptions(base, commonGrapes);
      setVarietyChoices(filled);
    };

    loadOptions().catch(() => {});
  }, [wine, labelHints]);

  // Compute truths once for consistent checks
  const truths = React.useMemo(() => ({
    world: wine?.world ?? worldFromCountry(wine?.country),
    variety: wine?.variety ? String(wine.variety) : '',
    vintage: wine?.vintage
      ? String(wine.vintage)
      : (labelHints?.is_non_vintage ? 'NV' : (labelHints?.vintage_year ? String(labelHints.vintage_year) : 'NV')),
    country: wine?.country ? String(wine.country) : '',
    region: (wine?.region || wine?.appellation) ? String(wine?.region || wine?.appellation) : '',
    subregion: wine?.appellation ? String(wine.appellation) : '',
  }), [wine, labelHints]);

  const checkAnswers = async () => {
    setChecked(true);

    const { score, max } = computeScore(
      { guessWorld, guessVariety, guessVintage, guessCountry, guessRegion, guessSubregion },
      truths
    );

    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;

    if (uid) {
      try {
        const result = await awardPointsSolo({ userId: uid, score, max });
        if (result?.ok) {
          alert(`You scored ${score}/${max}. +${result.points_awarded} point(s). Total: ${result.total_points}`);
        } else {
          alert(`You scored ${score}/${max}. (Points service unavailable)`);
        }
      } catch {
        alert(`You scored ${score}/${max}. (Points service error)`);
      }
    } else {
      alert(`You scored ${score}/${max}. Sign in to collect points!`);
    }
  };

  const shareText = `Wine Options — my picks:
World: ${guessWorld || '—'} • Variety: ${guessVariety || '—'} • Vintage: ${guessVintage || '—'} • Country: ${guessCountry || '—'} • Region: ${guessRegion || '—'} • Sub-region: ${guessSubregion || '—'}
${wine ? `Target: ${wine.display_name}` : ''}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Wine className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Wine Options — Solo</h1>
      </header>

      {/* Upload & OCR */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Camera className="w-4 h-4" />
          Upload a label (photo/screenshot)
        </div>

        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer w-fit">
          <Upload className="w-4 h-4" />
          <span>{uploadBusy ? 'Reading…' : 'Choose image'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            disabled={uploadBusy}
          />
        </label>

        {uploadErr && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {uploadErr}
          </div>
        )}

        {labelText && (
          <div className="text-xs text-gray-600">
            {labelHints?.is_non_vintage ? 'NV detected'
              : labelHints?.vintage_year ? `Vintage candidate: ${labelHints.vintage_year}`
              : 'No vintage found'} •
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

          <button onClick={resetAll} className="ml-2 px-3 py-2 rounded-md border">
            Reset
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </section>

      {/* Candidate */}
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
          </div>
        )}
      </section>

      {/* Questions */}
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
          {checked && <AnswerBadge ok={!!(guessWorld && truths.world && guessWorld.toLowerCase() === String(truths.world).toLowerCase())} truth={truths.world || '—'} />}
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
          {checked && <AnswerBadge ok={!!(guessVariety && truths.variety && guessVariety.toLowerCase() === truths.variety.toLowerCase())} truth={truths.variety || '—'} />}
        </div>

        {/* Vintage */}
        <div>
          <div className="text-xs text-gray-600 mb-1">Vintage</div>
          <div className="flex flex-wrap gap-2">
            {(vintageChoices.length ? vintageChoices :
              [wine?.vintage ? String(wine.vintage) : (labelHints?.vintage_year ? String(labelHints.vintage_year) : 'NV')]).map((opt) => (
              <button
                key={`vint-${opt}`}
                className={`px-3 py-2 rounded border ${guessVintage.toLowerCase() === opt.toLowerCase() ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                onClick={() => setGuessVintage(opt)}
              >{opt}</button>
            ))}
          </div>
          {checked && <AnswerBadge ok={!!(guessVintage && truths.vintage && guessVintage.toLowerCase() === truths.vintage.toLowerCase())} truth={truths.vintage} />}
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
          {checked && <AnswerBadge ok={!!(guessCountry && truths.country && guessCountry.toLowerCase() === truths.country.toLowerCase())} truth={truths.country || '—'} />}
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
          {checked && <AnswerBadge ok={!!(guessRegion && truths.region && guessRegion.toLowerCase() === truths.region.toLowerCase())} truth={truths.region || '—'} />}
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
            {checked && <AnswerBadge ok={!!(guessSubregion && truths.subregion && guessSubregion.toLowerCase() === truths.subregion.toLowerCase())} truth={truths.subregion || '—'} />}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={checkAnswers} className="px-4 py-2 rounded bg-black text-white">
            Check answers
          </button>
          <button
            onClick={() => {
              try {
                if (navigator.share) {
                  navigator.share({ title: 'Wine Options', text: shareText, url: window.location.href });
                } else {
                  setShareOpen(true);
                }
              } catch {
                setShareOpen(true);
              }
            }}
            className="px-4 py-2 rounded border flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </section>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} text={`${shareText}\n${window.location.href}`} />
    </div>
  );
};

export default SoloWineOptions;
