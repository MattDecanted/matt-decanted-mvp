import React from 'react';
import { useLocation } from 'react-router-dom';
import { Share2, Wine, Search, Loader2, CheckCircle2, AlertTriangle, Camera, Link as LinkIcon, Copy } from 'lucide-react';
import OCRUpload from '@/components/OCRUpload';
import { supabase } from '@/lib/supabase';

type WineRow = {
  id: string;
  display_name: string;
  producer?: string | null;
  country?: string | null;
  region?: string | null;        // e.g. "Burgundy" or "Marlborough"
  appellation?: string | null;   // e.g. "Chassagne-Montrachèt", "Rioja Alta"
  variety?: string | null;       // e.g. "Chardonnay" or "Blend"
  vintage?: number | null;       // 4-digit; null = NV
  is_nv?: boolean | null;
  world?: 'old' | 'new' | null;
};

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null;
};

type GameSession = {
  id: string;
  invite_code: string;
  host_user_id: string | null;
  is_active: boolean;
  created_at: string;
};

const TABLE_NAME = 'wine_index'; // adjust if needed
const SESSIONS_TABLE = 'game_sessions'; // make sure you've created this table in Supabase

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
      'chardonnay', 'pinot noir', 'pinot meunier', 'riesling', 'sauvignon', 'cabernet',
      'merlot', 'syrah', 'shiraz', 'malbec', 'tempranillo', 'nebbiolo', 'sangiovese',
      'grenache', 'zinfandel', 'primitivo', 'chenin', 'viognier', 'gewurztraminer',
      'gruner', 'barbera', 'mencía', 'touriga', 'gamay', 'aligoté', 'semillon', 'cabernet franc'
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

const AnswerBadge: React.FC<{ ok: boolean; truth: string }> = ({ ok, truth }) => (
  <div className={`mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
    <CheckCircle2 className="w-3 h-3" />
    {ok ? 'Correct' : <>Answer: <span className="font-semibold">{truth}</span></>}
  </div>
);

const WineOptionsGame: React.FC = () => {
  const location = useLocation();

  // OCR + hints
  const [labelText, setLabelText] = React.useState('');
  const [labelHints, setLabelHints] = React.useState<LabelHints | null>(null);

  // search/match state
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wine, setWine] = React.useState<WineRow | null>(null);

  // user guesses
  const [guessWorld, setGuessWorld] = React.useState<'old' | 'new' | ''>('');
  const [guessVariety, setGuessVariety] = React.useState<string>('');
  const [guessCountry, setGuessCountry] = React.useState<string>('');
  const [guessRegion, setGuessRegion] = React.useState<string>('');
  const [guessSubregion, setGuessSubregion] = React.useState<string>('');
  const [guessVintage, setGuessVintage] = React.useState<string>(''); // 'NV' or 'YYYY'
  const [checked, setChecked] = React.useState(false);

  // MCQ choices
  const [countryChoices, setCountryChoices] = React.useState<string[]>([]);
  const [regionChoices, setRegionChoices] = React.useState<string[]>([]);
  const [subregionChoices, setSubregionChoices] = React.useState<string[]>([]);
  const [vintageChoices, setVintageChoices] = React.useState<string[]>([]);
  const [varietyChoices, setVarietyChoices] = React.useState<string[]>([]);

  // Multiplayer
  const [session, setSession] = React.useState<GameSession | null>(null);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [creatingSession, setCreatingSession] = React.useState(false);

  // capture invite code from URL (join flow)
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (!code) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from<GameSession>(SESSIONS_TABLE)
          .select('*')
          .eq('invite_code', code)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setSession(data);
          setInviteUrl(`${window.location.origin}/play?code=${data.invite_code}`);
        } else {
          setSession(null);
        }
      } catch (e: any) {
        console.error(e);
      }
    })();
  }, [location.search]);

  async function handleCreateSession() {
    try {
      setCreatingSession(true);
      const { data: auth } = await supabase.auth.getUser();
      const host_user_id = auth?.user?.id ?? null;

      // Generate a short invite code (6-8 chars) — use Postgres gen_random_uuid() sliced or custom server function.
      // For client-side: quick random base36
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from<GameSession>(SESSIONS_TABLE)
        .insert([{ invite_code: code, host_user_id, is_active: true }])
        .select('*')
        .single();

      if (error) throw error;
      setSession(data);
      const url = `${window.location.origin}/play?code=${data.invite_code}`;
      setInviteUrl(url);
    } catch (e: any) {
      alert(e?.message ?? 'Could not create session');
    } finally {
      setCreatingSession(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert('Invite link copied!');
    } catch {
      // fallback
      prompt('Copy this link:', inviteUrl);
    }
  }

  // OCR callback
  const onOCR = (text: string) => {
    setLabelText(text);
    const hints = extractLabelHints(text);
    setLabelHints(hints);

    // reset state
    setWine(null);
    setChecked(false);
    setGuessWorld('');
    setGuessVariety(hints.inferred_variety ?? '');
    setGuessCountry('');
    setGuessRegion('');
    setGuessSubregion('');
    setGuessVintage(hints.is_non_vintage ? 'NV' : (hints.vintage_year ? String(hints.vintage_year) : ''));
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
        // @ts-ignore - Supabase .or accepts a raw OR filter string
        query = query.or(ors);
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

  // build MCQs once a wine is matched
  React.useEffect(() => {
    const loadOptions = async () => {
      if (!wine) {
        setCountryChoices([]); setRegionChoices([]); setSubregionChoices([]);
        setVintageChoices([]); setVarietyChoices([]);
        return;
      }

      // Countries
      try {
        const { data: countries, error } = await supabase.rpc('get_countries');
        if (!error && countries) {
          const correct = wine.country || '';
          const distractors = pickDistractors(countries.map((c: { country: string }) => c.country), correct, 3);
          setCountryChoices(shuffle(uniqStrings([correct, ...distractors])));
        } else {
          setCountryChoices(uniqStrings([wine.country || '']));
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
            setRegionChoices(shuffle(uniqStrings([correct, ...distractors])));
          } else {
            setRegionChoices(uniqStrings([wine.region || wine.appellation || '']));
          }
        }
      } catch {
        setRegionChoices(uniqStrings([wine.region || wine.appellation || '']));
      }

      // Subregions
      try {
        const baseRegion = wine.region || wine.appellation || '';
        if (wine.country && baseRegion) {
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

      // Vintage
      const correctYear = typeof wine.vintage === 'number' ? wine.vintage : null;
      if (correctYear) {
        const yearPool = uniqStrings([
          String(correctYear),
          String(correctYear - 1),
          String(correctYear + 1),
          String(correctYear - 2),
          String(correctYear + 2),
          'NV'
        ]);
        const pick = shuffle(yearPool).slice(0, 4);
        if (!pick.includes(String(correctYear))) pick[0] = String(correctYear);
        setVintageChoices(shuffle(Array.from(new Set(pick))));
      } else {
        const now = new Date().getFullYear();
        const years = [now, now - 1, now - 2].map(String);
        setVintageChoices(shuffle(Array.from(new Set(['NV', ...years]))).slice(0, 4));
      }

      // Variety
      const correctVar = (wine.variety || labelHints?.inferred_variety || '').trim();
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

  const checkAnswers = () => setChecked(true);

  const doShare = async () => {
    const shareText = `Wine Options — my picks:
World: ${guessWorld || '—'} • Variety: ${guessVariety || '—'} • Vintage: ${guessVintage || '—'} • Country: ${guessCountry || '—'} • Region: ${guessRegion || '—'} • Sub-region: ${guessSubregion || '—'}
${wine ? `Target: ${wine.display_name}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Wine Options', text: shareText, url: inviteUrl ?? window.location.href });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${inviteUrl ?? window.location.href}`);
        alert('Copied to clipboard!');
      }
    } catch {/* no-op */}
  };

  const correctWorld = wine?.world ?? worldFromCountry(wine?.country);
  const correctVariety = wine?.variety || '';
  const correctCountry = wine?.country || '';
  const correctRegion = wine?.region || wine?.appellation || '';
  const correctSubregion = wine?.appellation || '';
  const correctVintage = wine?.vintage ? String(wine.vintage) : 'NV';

  const isCorrect = (user: string | '', truth: string | null | undefined) => {
    if (!user || !truth) return false;
    return user.trim().toLowerCase() === String(truth).trim().toLowerCase();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Wine className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold">Wine Options</h1>
        </div>

        {/* Multiplayer: create or show invite */}
        <div className="flex items-center gap-2">
          {!session ? (
            <button
              onClick={handleCreateSession}
              disabled={creatingSession}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border"
              title="Create a multiplayer session and invite friends"
            >
              <LinkIcon className="w-4 h-4" />
              {creatingSession ? 'Creating…' : 'Start Multiplayer'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 hidden sm:inline">Invite:</span>
              <button
                onClick={copyInvite}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border"
                title={inviteUrl ?? 'Invite link'}
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
            </div>
          )}
        </div>
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
            {busy ? 'Working…' : `Let's play`}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </section>

      {/* 2) Candidate */}
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

      {/* 3) The Game */}
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

        {/* Variety */}
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
          {checked && <AnswerBadge ok={isCorrect(guessVariety, wine?.variety || '')} truth={wine?.variety || '—'} />}
        </div>

        {/* Vintage */}
        <div>
          <div className="text-xs text-gray-600 mb-1">Vintage</div>
          <div className="flex flex-wrap gap-2">
            {(vintageChoices.length ? vintageChoices : [wine?.vintage ? String(wine.vintage) : 'NV']).map((opt) => (
              <button
                key={`vint-${opt}`}
                className={`px-3 py-2 rounded border ${guessVintage.toLowerCase() === opt.toLowerCase() ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                onClick={() => setGuessVintage(opt)}
              >{opt}</button>
            ))}
          </div>
          {checked && <AnswerBadge ok={isCorrect(guessVintage, wine?.vintage ? String(wine.vintage) : 'NV')} truth={wine?.vintage ? String(wine.vintage) : 'NV'} />}
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
          {checked && <AnswerBadge ok={isCorrect(guessCountry, wine?.country || '')} truth={wine?.country || '—'} />}
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
          {checked && <AnswerBadge ok={isCorrect(guessRegion, wine?.region || wine?.appellation || '')} truth={wine?.region || wine?.appellation || '—'} />}
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
            {checked && <AnswerBadge ok={isCorrect(guessSubregion, wine?.appellation || '')} truth={wine?.appellation || '—'} />}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={checkAnswers} className="px-4 py-2 rounded bg-black text-white">
            Check answers
          </button>
          <button onClick={doShare} className="px-4 py-2 rounded border flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </section>
    </div>
  );
};

export default WineOptionsGame;
