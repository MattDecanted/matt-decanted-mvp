import React from 'react';
import { Share2, Wine, Search, Loader2, CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import OCRUpload from '@/components/OCRUpload';
import { supabase } from '@/lib/supabase';

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

const TABLE_NAME = 'wine_index'; // ← change to your actual catalog table/view

function extractLabelHints(text: string): LabelHints {
  const t = text.toLowerCase();

  // 1) Vintage year
  // we look for 19xx/20xx in a sane range
  const years = Array.from(t.matchAll(/\b(19|20)\d{2}\b/g)).map(m => Number(m[0]));
  const possibleYear = years.find(y => y >= 1980 && y <= new Date().getFullYear());

  // 2) NV detection
  const isNV = /\bnv\b|\bnon\s*-?\s*vintage\b/.test(t);

  // 3) Variety inference
  // Champagne: "blanc de blancs" -> Chardonnay
  // "blanc de noirs" -> Pinot Noir / Meunier (we'll say Pinot Noir)
  // Otherwise try a simple dictionary of common grapes.
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
      'gruner', 'barbera', 'mencía', 'touriga', 'gamay', 'aligoté'
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

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
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

const WineOptionsGame: React.FC = () => {
  const [labelText, setLabelText] = React.useState('');
  const [labelHints, setLabelHints] = React.useState<LabelHints | null>(null);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [wine, setWine] = React.useState<WineRow | null>(null);

  // user selections
  const [guessWorld, setGuessWorld] = React.useState<'old' | 'new' | ''>('');
  const [guessVariety, setGuessVariety] = React.useState<string>('');
  const [guessCountry, setGuessCountry] = React.useState<string>('');
  const [guessRegion, setGuessRegion] = React.useState<string>('');
  const [guessVintage, setGuessVintage] = React.useState<string>(''); // 'NV' or 'YYYY'

  const [checked, setChecked] = React.useState(false);

  const onOCR = (text: string) => {
    setLabelText(text);
    setLabelHints(extractLabelHints(text));
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
      // Simple matching heuristic:
      // 1) Gather search terms from label (brand-like words + hints).
      // 2) Do one or two ILIKE filters against your catalog table.
      //
      // ⚠️ Adjust `TABLE_NAME` and field names to match YOUR schema.
      const t = labelText;
      const hints = extractLabelHints(t);
      setLabelHints(hints);

      // naive tokenization: words >= 3 chars (skip years)
      const tokens = Array.from(t.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/g)).map(m => m[0]);
      const unique = Array.from(new Set(tokens)).slice(0, 8); // limit for safety

      // Build a filtered query:
      let query = supabase.from(TABLE_NAME).select('*').limit(10);

      // If you store producer/brand/display_name, try that first
      if (unique.length) {
        // Use the first 2–3 tokens to avoid overly broad search
        const primary = unique.slice(0, 3);
        // We’ll OR-chain with ilike over display_name
        // Supabase JS doesn’t have a direct "OR over same column" helper,
        // so we can concatenate a filter with .or() using raw filters:
        const ors = primary.map(tok => `display_name.ilike.%${tok}%`).join(',');
        query = query.or(ors);
      }

      // Refine by country/variety if we inferred something likely
      if (hints.inferred_variety) {
        query = query.ilike('variety', `%${hints.inferred_variety}%`);
      }
      // If we detected NV vs year, we can hint:
      if (hints.is_non_vintage) {
        query = query.is('vintage', null);
      } else if (hints.vintage_year) {
        query = query.eq('vintage', hints.vintage_year);
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      // Pick the first as the candidate (you can add ranking here)
      const candidate: WineRow | undefined = (data ?? [])[0];
      if (!candidate) {
        setError('No close match found. You can still play by choosing options manually.');
        setWine(null);
        return;
      }

      // fill blanks with world inference if not stored
      if (!candidate.world) {
        candidate.world = worldFromCountry(candidate.country);
      }

      setWine(candidate);

      // pre-seed guess with label hints (user can change)
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
        await navigator.share({
          title: 'Wine Options',
          text: shareText,
          url: window.location.href,
        });
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
        <OCRUpload
          onText={(txt) => onOCR(txt)}
        />
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

      {/* 3) Questions */}
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
