// src/pages/GamePage.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import OCRUpload from '@/components/OCRUpload';
import {
  Loader2, Users, Share2, Play, Trophy, Lock, Unlock, Eye, Camera, Search, Wine,
} from 'lucide-react';

// NEW: start trial helper (idempotent + fire-and-forget)
import { startTrialBestEffort } from '@/lib/trial';

/** ─────────────────────────────────────────────────────────────────────────────
 * Config
 * ────────────────────────────────────────────────────────────────────────────*/
const SEQUENTIAL = false; // set true to ask one-at-a-time

/** ─────────────────────────────────────────────────────────────────────────────
 * Types (match DB)
 * ────────────────────────────────────────────────────────────────────────────*/
type GameSession = {
  id: string;
  slug: string;
  host_user: string | null;
  status: 'lobby' | 'active' | 'finished';
  created_at: string;
};

type GamePlayer = {
  game_id: string;
  user_id: string | null;
  name: string;
  joined_at: string;
};

type GameRound = {
  id: string;
  game_id: string;
  round_number: number;
  ocr_text: string | null;
  wine_id: string | null;
  correct_country: string | null;
  correct_region: string | null;
  correct_subregion: string | null;
  correct_variety: string | null;
  correct_vintage: string | null; // 'NV' or 'YYYY'
  created_at: string;
};

type GameAnswer = {
  round_id: string;
  player_name: string;
  guess_world: string | null;
  guess_variety: string | null;
  guess_vintage: string | null;
  guess_country: string | null;
  guess_region: string | null;
  guess_subregion: string | null;
  locked: boolean;
  score: number;
  submitted_at: string;
};

type GameScore = {
  game_id: string;
  player_name: string;
  total_score: number;
  updated_at: string;
};

/** ─────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────────*/
function makeNiceSlug() {
  const wordsA = ['oak','slate','river','granite','chalk','amber','sage','terra','mistral','cedar','copper','maple'];
  const wordsB = ['falcon','syrah','chard','pinot','merlot','tempranillo','nebbiolo','riesling','sangiovese','malbec','gamay'];
  const num = Math.floor(100 + Math.random() * 900);
  return `${wordsA[Math.floor(Math.random()*wordsA.length)]}-${wordsB[Math.floor(Math.random()*wordsB.length)]}-${num}`;
}
function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}
function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uniq(xs: (string | null | undefined)[]) {
  return Array.from(new Set(xs.filter(Boolean).map(s => s!.trim()))).filter(Boolean) as string[];
}
function inferWorld(country?: string | null): 'old' | 'new' | null {
  if (!country) return null;
  const c = country.toLowerCase();
  const OLD = ['france','italy','spain','germany','portugal','austria','greece','hungary'];
  const NEW = ['usa','united states','new zealand','australia','chile','argentina','south africa','canada'];
  if (OLD.includes(c)) return 'old';
  if (NEW.includes(c)) return 'new';
  return null;
}

const Choice: React.FC<{
  value: string;
  chosen: string;
  onPick: (v: string) => void;
  disabled?: boolean;
}> = ({ value, chosen, onPick, disabled }) => (
  <button
    disabled={disabled}
    className={cls(
      'px-3 py-2 rounded border text-sm disabled:opacity-50',
      chosen.toLowerCase() === value.toLowerCase()
        ? 'bg-purple-600 text-white border-purple-600'
        : 'hover:bg-gray-50'
    )}
    onClick={() => onPick(value)}
  >
    {value}
  </button>
);

/** ─────────────────────────────────────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────────────────────────────────────*/
const GamePage: React.FC = () => {
  const params = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const slugFromUrl = params.slug;

  const [mode, setMode] = React.useState<'solo' | 'host' | 'join'>(slugFromUrl ? 'join' : 'solo');
  const [myName, setMyName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [session, setSession] = React.useState<GameSession | null>(null);
  const [players, setPlayers] = React.useState<GamePlayer[]>([]);
  const [rounds, setRounds] = React.useState<GameRound[]>([]);
  const [scores, setScores] = React.useState<GameScore[]>([]);
  const [currentRound, setCurrentRound] = React.useState<GameRound | null>(null);

  const [answers, setAnswers] = React.useState<Partial<GameAnswer>>({});
  const [locked, setLocked] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false); // hide answers until reveal

  // OCR host-side quick match
  const [labelText, setLabelText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [matched, setMatched] = React.useState<{
    display_name: string;
    country?: string | null;
    region?: string | null;
    appellation?: string | null;
    variety?: string | null;
    vintage?: number | null;
    world?: 'old' | 'new' | null;
  } | null>(null);

  const inviteUrl = session ? `${window.location.origin}/game/${session.slug}` : '';

  /** Realtime */
  React.useEffect(() => {
    if (!session) return;
    const gameId = session.id;

    const channel = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players',  filter: `game_id=eq.${gameId}` }, reloadPlayers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rounds',   filter: `game_id=eq.${gameId}` }, () => { reloadRounds(); setRevealed(false); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_scores',   filter: `game_id=eq.${gameId}` }, reloadScores)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  async function reloadPlayers() {
    if (!session) return;
    const { data } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', session.id)
      .order('joined_at', { ascending: true });
    setPlayers(data || []);
  }
  async function reloadRounds() {
    if (!session) return;
    const { data } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', session.id)
      .order('round_number', { ascending: true });
    setRounds(data || []);
    setCurrentRound(data?.slice(-1)[0] || null);
  }
  async function reloadScores() {
    if (!session) return;
    const { data } = await supabase
      .from('game_scores')
      .select('*')
      .eq('game_id', session.id)
      .order('total_score', { ascending: false });
    setScores(data || []);
  }

  /** Create / Join */
  async function createGame() {
    setErr(null); setLoading(true);
    try {
      const slug = makeNiceSlug();
      const { data: s, error: se } = await supabase
        .from('game_sessions')
        .insert({ slug, status: 'lobby' })
        .select()
        .single();
      if (se) throw se;
      setSession(s);
      await reloadPlayers();
      await reloadRounds();
      await reloadScores();
      navigate(`/game/${slug}`);
    } catch (e: any) {
      setErr(e?.message || 'Create failed');
    } finally {
      setLoading(false);
    }
  }

  async function joinGame(slug: string, name: string) {
    setErr(null); setLoading(true);
    try {
      const { data: s, error: se } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('slug', slug)
        .single();
      if (se) throw se;
      setSession(s);

      if (name.trim()) {
        const { error: pe } = await supabase
          .from('game_players')
          .insert({ game_id: s.id, name });
        if (pe && !String(pe.message).includes('duplicate')) throw pe;
      }

      await reloadPlayers();
      await reloadRounds();
      await reloadScores();
    } catch (e: any) {
      setErr(e?.message || 'Join failed');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (slugFromUrl && !session && myName) {
      joinGame(slugFromUrl, myName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugFromUrl, myName]);

  /** Host actions */
  async function startRoundWithOCR() {
    if (!session) return;

    // NEW: start trial when the host actually starts a round
    void startTrialBestEffort();

    const nextNumber = (rounds.slice(-1)[0]?.round_number || 0) + 1;
    const correct_country   = matched?.country || null;
    const correct_region    = matched?.region || matched?.appellation || null;
    const correct_subregion = matched?.appellation || null;
    const correct_variety   = matched?.variety || null;
    const correct_vintage   = matched?.vintage ? String(matched.vintage) : 'NV';

    const { error } = await supabase.from('game_rounds').insert({
      game_id: session.id,
      round_number: nextNumber,
      ocr_text: labelText || null,
      wine_id: null,
      correct_country,
      correct_region,
      correct_subregion,
      correct_variety,
      correct_vintage
    });
    if (error) {
      setErr(error.message);
    } else {
      await reloadRounds();
      setLocked(false);
      setAnswers({});
      setRevealed(false);
    }
  }

  async function revealAndScore() {
    if (!currentRound) return;
    const { error } = await supabase.rpc('score_round', { p_round: currentRound.id });
    if (error) setErr(error.message);
    else {
      await reloadScores();
      setRevealed(true);
    }
  }

  /** Player actions */
  async function upsertAnswer(patch: Partial<GameAnswer>) {
    if (!currentRound || !myName) return;
    const row: Partial<GameAnswer> = {
      round_id: currentRound.id,
      player_name: myName,
      guess_world: answers.guess_world ?? null,
      guess_variety: answers.guess_variety ?? null,
      guess_vintage: answers.guess_vintage ?? null,
      guess_country: answers.guess_country ?? null,
      guess_region: answers.guess_region ?? null,
      guess_subregion: answers.guess_subregion ?? null,
      locked: false,
      ...patch
    };
    setAnswers(row);
    const { error } = await supabase.from('game_answers').upsert(row);
    if (error) setErr(error.message);
  }
  async function setLockedState(lock: boolean) {
    setLocked(lock);
    await upsertAnswer({ locked: lock });
  }

  /** Minimal quick match from OCR */
  async function quickMatchFromOCR() {
    // NEW: starting the “quick match” flow should also kick off the trial
    void startTrialBestEffort();

    setBusy(true);
    setErr(null);
    try {
      const tokens = Array.from((labelText || '').matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/g)).map(m => m[0]);
      const primary = Array.from(new Set(tokens)).slice(0, 3);
      let query = supabase.from('wine_index').select('*').limit(1);
      if (primary.length) {
        const ors = primary.map(tok => `display_name.ilike.%${tok}%`).join(',');
        query = query.or(ors);
      }
      const { data, error } = await query;
      if (error) throw error;
      const cand = (data ?? [])[0];
      if (!cand) {
        setMatched(null);
      } else {
        const world = inferWorld(cand.country);
        setMatched({
          display_name: cand.display_name,
          country: cand.country || null,
          region: cand.region || null,
          appellation: cand.appellation || null,
          variety: cand.variety || null,
          vintage: cand.vintage ?? null,
          world
        });
      }
    } catch (e: any) {
      setErr(e?.message || 'Match failed');
    } finally {
      setBusy(false);
    }
  }

  /** Mode selector */
  if (!slugFromUrl && !session) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-6">
        <header className="flex items-center gap-3">
          <Wine className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold">Wine Options — Play</h1>
        </header>

        <section className="grid sm:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">Solo</div>
            <p className="text-sm text-gray-600 mb-3">Play on your own device with OCR + MCQs.</p>
            <button className="px-3 py-2 rounded bg-black text-white" onClick={() => setMode('solo')}>
              Play Solo
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">Host</div>
            <p className="text-sm text-gray-600 mb-3">Create a room and invite friends.</p>
            <button className="px-3 py-2 rounded bg-black text-white" onClick={createGame} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Create Room'}
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">Join</div>
            <p className="text-sm text-gray-600 mb-3">Enter the room code link you got.</p>
            <JoinForm onJoin={(slug, name) => { setMode('join'); setMyName(name); joinGame(slug, name); }} />
          </div>
        </section>

        {err && <ErrorBox err={err} />}
      </div>
    );
  }

  /** In a room */
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Users className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Game Room</h1>
      </header>

      {!session && (
        <section className="border rounded-lg p-4">
          <div className="text-sm text-gray-700">Join this room:</div>
          <JoinForm initialSlug={slugFromUrl || ''} onJoin={(slug, name) => { setMyName(name); joinGame(slug, name); }} />
          {err && <ErrorBox err={err} />}
        </section>
      )}

      {session && (
        <>
          <section className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-semibold">Room: <span className="font-mono">{session.slug}</span></div>
                <div className="text-gray-600">Status: {session.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded border flex items-center gap-2"
                  onClick={async () => {
                    try {
                      if (navigator.share) {
                        await navigator.share({ title: 'Join my Wine Options game', url: inviteUrl });
                      } else {
                        await navigator.clipboard.writeText(inviteUrl);
                        alert('Invite link copied!');
                      }
                    } catch {/* no-op */}
                  }}
                >
                  <Share2 className="w-4 h-4" /> Share invite
                </button>
              </div>
            </div>

            <div className="text-sm">
              <div className="font-semibold mb-1">Players</div>
              <div className="flex flex-wrap gap-2">
                {players.map(p => (
                  <span key={p.name} className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs">{p.name}</span>
                ))}
              </div>
            </div>
          </section>

          <HostPanel
            visible={true}
            labelText={labelText}
            setLabelText={setLabelText}
            matched={matched}
            busy={busy}
            onOCR={(t) => setLabelText(t)}
            onQuickMatch={quickMatchFromOCR}
            onStartRound={startRoundWithOCR}
          />

          {currentRound && (
            <RoundPanel
              round={currentRound}
              answers={answers}
              locked={locked}
              revealed={revealed}
              onPick={(patch) => upsertAnswer(patch)}
              onLock={() => setLockedState(true)}
              onUnlock={() => setLockedState(false)}
              onReveal={revealAndScore}
            />
          )}

          {rounds.length > 1 && (
            <section className="border rounded-lg p-4">
              <div className="text-sm font-semibold mb-2">Past Rounds</div>
              <ol className="list-decimal list-inside text-sm text-gray-700">
                {rounds.slice(0, -1).map(r => (
                  <li key={r.id}>
                    Round {r.round_number}: {r.correct_variety || '—'} • {r.correct_country || '—'} • {r.correct_region || '—'} • {r.correct_vintage || '—'}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {err && <ErrorBox err={err} />}
        </>
      )}
    </div>
  );
};

/** ─────────────────────────────────────────────────────────────────────────────
 * Child components
 * ────────────────────────────────────────────────────────────────────────────*/
const ErrorBox: React.FC<{ err: string }> = ({ err }) => (
  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>
);

const JoinForm: React.FC<{
  initialSlug?: string;
  onJoin: (slug: string, name: string) => void;
}> = ({ initialSlug = '', onJoin }) => {
  const [slug, setSlug] = React.useState(initialSlug);
  const [name, setName] = React.useState('');
  return (
    <form
      className="flex flex-col sm:flex-row gap-2 mt-2"
      onSubmit={(e) => { e.preventDefault(); if (slug && name) onJoin(slug.trim(), name.trim()); }}
    >
      <input
        className="px-3 py-2 border rounded w-full sm:w-56"
        placeholder="Room code (slug)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />
      <input
        className="px-3 py-2 border rounded w-full sm:w-56"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className="px-3 py-2 rounded bg-black text-white" type="submit">
        Join
      </button>
    </form>
  );
};

const HostPanel: React.FC<{
  visible: boolean;
  labelText: string;
  setLabelText: (t: string) => void;
  matched: {
    display_name: string;
    country?: string | null;
    region?: string | null;
    appellation?: string | null;
    variety?: string | null;
    vintage?: number | null;
    world?: 'old' | 'new' | null;
  } | null;
  busy: boolean;
  onOCR: (t: string) => void;
  onQuickMatch: () => void;
  onStartRound: () => void;
}> = ({ visible, labelText, setLabelText, matched, busy, onOCR, onQuickMatch, onStartRound }) => {
  if (!visible) return null;
  return (
    <section className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Camera className="w-4 h-4" /> Host: Upload label & start round
      </div>
      <OCRUpload onText={onOCR} />
      <div className="text-xs text-gray-500">Or paste OCR text manually</div>
      <textarea
        className="w-full border rounded p-2 text-sm"
        rows={3}
        placeholder="Paste OCR text here…"
        value={labelText}
        onChange={(e) => setLabelText(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded border flex items-center gap-2"
          onClick={onQuickMatch}
          disabled={!labelText || busy}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {busy ? 'Matching…' : 'Quick match'}
        </button>
        <button
          className="px-3 py-2 rounded bg-black text-white flex items-center gap-2"
          onClick={onStartRound}
          disabled={!labelText}
        >
          <Play className="w-4 h-4" /> Start round
        </button>
      </div>

      {matched && (
        <div className="text-xs text-gray-700">
          <div className="font-semibold">Candidate:</div>
          <div>{matched.display_name}</div>
          <div>
            Variety: {matched.variety || '—'} • Country: {matched.country || '—'} • Region: {matched.region || matched.appellation || '—'} • Vintage: {matched.vintage ?? 'NV'}
          </div>
        </div>
      )}
    </section>
  );
};

const RoundPanel: React.FC<{
  round: GameRound;
  answers: Partial<GameAnswer>;
  locked: boolean;
  revealed: boolean;
  onPick: (patch: Partial<GameAnswer>) => void;
  onLock: () => void;
  onUnlock: () => void;
  onReveal: () => void;
}> = ({ round, answers, locked, revealed, onPick, onLock, onUnlock, onReveal }) => {
  // dynamic choices
  const [countries, setCountries] = React.useState<string[]>([]);
  const [regions, setRegions]     = React.useState<string[]>([]);
  const [subs, setSubs]           = React.useState<string[]>([]);
  const [varieties, setVarieties] = React.useState<string[]>([]);
  const [vintages, setVintages]   = React.useState<string[]>([]);

  // Build choices when round changes
  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Countries
      try {
        const { data } = await supabase.rpc('get_countries');
        if (!cancelled && Array.isArray(data)) {
          const list = data.map((r: any) => r.country).filter(Boolean);
          const correct = round.correct_country || '';
          const opts = shuffle(uniq([correct, ...list])).slice(0, 8);
          setCountries(opts.length ? opts : uniq([correct]));
        }
      } catch {
        const correct = round.correct_country || '';
        setCountries(uniq([correct]));
      }

      // Regions
      try {
        if (round.correct_country) {
          const { data } = await supabase.rpc('get_regions', { p_country: round.correct_country });
          if (!cancelled && Array.isArray(data)) {
            const list = data.map((r: any) => r.region).filter(Boolean);
            const correct = round.correct_region || '';
            const opts = shuffle(uniq([correct, ...list])).slice(0, 10);
            setRegions(opts.length ? opts : uniq([correct]));
          }
        } else {
          setRegions(uniq([round.correct_region || '']));
        }
      } catch {
        setRegions(uniq([round.correct_region || '']));
      }

      // Subregions (only if a real subregion exists)
      try {
        if (round.correct_country && round.correct_region && round.correct_subregion) {
          const { data } = await supabase.rpc('get_subregions', {
            p_country: round.correct_country, p_region: round.correct_region
          });
          if (!cancelled && Array.isArray(data)) {
            const list = data.map((r: any) => r.subregion).filter(Boolean);
            const correct = round.correct_subregion || '';
            const opts = shuffle(uniq([correct, ...list])).slice(0, 10);
            setSubs(opts.length ? opts : uniq([correct].filter(Boolean)));
          }
        } else {
          setSubs([]);
        }
      } catch {
        setSubs(uniq([round.correct_subregion || '']).filter(Boolean));
      }

      // Variety choices
      {
        const correct = round.correct_variety || '';
        const seed = [
          'Chardonnay','Pinot Noir','Sauvignon Blanc','Riesling','Cabernet Sauvignon',
          'Merlot','Syrah','Grenache','Tempranillo','Nebbiolo','Sangiovese',
          'Chenin Blanc','Pinot Gris','Viognier','Malbec','Zinfandel','Gamay'
        ];
        const opts = shuffle(uniq([correct, ...seed])).slice(0, 6);
        setVarieties(opts.length ? opts : uniq([correct]));
      }

      // Vintage choices (smart)
      {
        const cv = round.correct_vintage || 'NV';
        const year = /^\d{4}$/.test(cv) ? parseInt(cv, 10) : null;
        let pool: string[];
        if (year) {
          pool = uniq([String(year), String(year - 1), String(year + 1), String(year - 2), 'NV']);
        } else {
          const now = new Date().getFullYear();
          pool = uniq(['NV', String(now), String(now - 1), String(now - 2), String(now - 3)]);
        }
        // ensure correct present, take 4, shuffle
        const base = uniq([cv, ...pool]).slice(0, 4);
        setVintages(shuffle(base));
      }
    };

    load();
    return () => { cancelled = true; };
  }, [round.id, round.correct_country, round.correct_region, round.correct_subregion, round.correct_variety, round.correct_vintage]);

  // Sequential gating
  const canVariety = !SEQUENTIAL || !!answers.guess_world;
  const canVintage = !SEQUENTIAL || !!answers.guess_variety;
  const canCountry = !SEQUENTIAL || !!answers.guess_vintage;
  const canRegion  = !SEQUENTIAL || !!answers.guess_country;
  const canSub     = !SEQUENTIAL || !!answers.guess_region;

  return (
    <section className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Round {round.round_number}</div>
        <div className="text-xs text-gray-600">OCR text length: {round.ocr_text?.length ?? 0}</div>
      </div>

      {/* 1) World */}
      <Block title="World">
        <div className="flex flex-wrap gap-2">
          {['old','new'].map(opt => (
            <Choice key={opt} value={opt} chosen={answers.guess_world || ''} onPick={(v) => onPick({ guess_world: v })} />
          ))}
        </div>
      </Block>

      {/* 2) Variety */}
      <Block title="Variety / Blend">
        <div className="flex flex-wrap gap-2">
          {varieties.map(opt => (
            <Choice key={opt} value={opt} chosen={answers.guess_variety || ''} onPick={(v) => onPick({ guess_variety: v })} disabled={!canVariety} />
          ))}
        </div>
      </Block>

      {/* 3) Vintage */}
      <Block title="Vintage">
        <div className="flex flex-wrap gap-2">
          {vintages.map(opt => (
            <Choice key={opt} value={opt} chosen={answers.guess_vintage || ''} onPick={(v) => onPick({ guess_vintage: v })} disabled={!canVintage} />
          ))}
        </div>
      </Block>

      {/* 4) Country */}
      <Block title="Country">
        <div className="flex flex-wrap gap-2">
          {countries.map(opt => (
            <Choice key={opt} value={opt} chosen={answers.guess_country || ''} onPick={(v) => onPick({ guess_country: v })} disabled={!canCountry} />
          ))}
        </div>
      </Block>

      {/* 5) Region */}
      <Block title="Region">
        <div className="flex flex-wrap gap-2">
          {regions.map(opt => (
            <Choice key={opt} value={opt} chosen={answers.guess_region || ''} onPick={(v) => onPick({ guess_region: v })} disabled={!canRegion} />
          ))}
        </div>
      </Block>

      {/* 6) Sub-region */}
      {subs.length > 0 && (
        <Block title="Sub-region / Appellation">
          <div className="flex flex-wrap gap-2">
            {subs.map(opt => (
              <Choice key={opt} value={opt} chosen={answers.guess_subregion || ''} onPick={(v) => onPick({ guess_subregion: v })} disabled={!canSub} />
            ))}
          </div>
        </Block>
      )}

      <div className="flex gap-2">
        {!locked ? (
          <button className="px-3 py-2 rounded bg-black text-white flex items-center gap-2" onClick={onLock}>
            <Lock className="w-4 h-4" /> Lock in
          </button>
        ) : (
          <button className="px-3 py-2 rounded border flex items-center gap-2" onClick={onUnlock}>
            <Unlock className="w-4 h-4" /> Unlock
          </button>
        )}
        <button className="px-3 py-2 rounded border flex items-center gap-2" onClick={onReveal}>
          <Eye className="w-4 h-4" /> Reveal & score
        </button>
      </div>

      {/* Correct answers only AFTER reveal */}
      {revealed && (
        <div className="text-xs text-gray-600">
          Correct: {round.correct_variety || '—'} • {round.correct_country || '—'} • {round.correct_region || '—'} • {round.correct_subregion || '—'} • {round.correct_vintage || '—'}
        </div>
      )}
    </section>
  );
};

const Block: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="text-xs text-gray-600 mb-1">{title}</div>
    {children}
  </div>
);

export default GamePage;
