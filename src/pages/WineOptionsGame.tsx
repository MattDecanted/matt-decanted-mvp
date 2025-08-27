// src/pages/WineOptionsGame.tsx
import React, { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Users, Share2, Copy, Loader2, Trophy, ChevronRight, CheckCircle2,
  LogOut, Camera, Upload, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  listenToSession, unsubscribe, setSessionStatus, endRound,
  submitAnswer, awardPoints, type GameSession, type Participant, type GameRound,
} from "@/lib/gameSession";

/* ---------- tiny utils ---------- */
const toPlain = (s?: string | null) => (s ? s.replace(/<[^>]+>/g, "") : "");
const pickFour = (correct: string, pool: string[]) => {
  const uniq = Array.from(new Set([correct, ...pool.filter(p => p && p !== correct)]));
  return uniq.slice(0, 4); // correct at index 0
};
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const tokenize = (s: string) => Array.from(new Set(norm(s).match(/[a-z0-9'-]{3,}/g) || [])).slice(0, 20);
const parseVarList = (v: unknown): string[] =>
  Array.isArray(v) ? v as string[] :
  typeof v === "string" ? v.split(/[,;/]| and /i).map(x => x.trim()).filter(Boolean) : [];

/* ---------- status maps ---------- */
const WRITE_STATUS: Record<string, GameSession["status"]> = {
  waiting: "open",
  in_progress: "active",
  finished: "finished",
  closed: "cancelled",
};
const READ_STATUS: Record<GameSession["status"], string> = {
  open: "waiting",
  active: "in_progress",
  finished: "finished",
  cancelled: "closed",
};

/* ---------- OCR helpers ---------- */
const FN_OCR = "/.netlify/functions/ocr-label";

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null;
};

function extractLabelHints(text: string): LabelHints {
  const t = norm(text);

  // Vintage / NV
  const years = Array.from(t.matchAll(/\b(19|20)\d{2}\b/g)).map((m) => Number(m[0]));
  const possibleYear = years.find((y) => y >= 1980 && y <= new Date().getFullYear());
  const isNV = /\b(?:nv|non\s*-?\s*vintage)\b/.test(t);

  // Variety (tolerant; catches "blanc de blancs" => Chardonnay)
  const rx = {
    chardonnay: /\bchard[a-z0-9-]*onn?ay\b|\bblanc\s+de\s+blancs?\b/,
    pinotNoir:  /\bpinot\s*no[i1]r\b/,
    sauvBlanc:  /\bsauv[a-z-]*ignon(?:\s*blanc)?\b|\bsauv\s*blanc\b/,
    riesling:   /\briesl[i1]ng\b/,
    gamay:      /\bgamay\b/,
    nebbiolo:   /\bnebbiolo\b/,
    sangiovese: /\bsangiovese\b/,
    tempranillo:/\btempran[i1]llo\b/,
    cabernet:   /\bcab(?:ernet)?\s*sauv[a-z-]*ignon\b|\bcab\s*sauv\b/,
    merlot:     /\bmerl[o0]t\b/,
    syrah:      /\bsyrah\b|\bshiraz\b/,
    grenache:   /\bgrenache\b/,
    meunier:    /\bmeunier\b/,
    pinotGris:  /\bpinot\s*gri[sz]\b/,
    viognier:   /\bviognier\b/,
    chenin:     /\bchenin\s*blanc\b/,
    malbec:     /\bmalbec\b/,
    zinfandel:  /\bzinfandel\b/,
  };

  let inferred_variety: string | null = null;
  if (rx.chardonnay.test(t)) inferred_variety = "Chardonnay";
  else if (rx.pinotNoir.test(t)) inferred_variety = "Pinot Noir";
  else if (rx.sauvBlanc.test(t)) inferred_variety = "Sauvignon Blanc";
  else if (rx.riesling.test(t)) inferred_variety = "Riesling";
  else if (rx.gamay.test(t)) inferred_variety = "Gamay";
  else if (rx.nebbiolo.test(t)) inferred_variety = "Nebbiolo";
  else if (rx.sangiovese.test(t)) inferred_variety = "Sangiovese";
  else if (rx.tempranillo.test(t)) inferred_variety = "Tempranillo";
  else if (rx.cabernet.test(t)) inferred_variety = "Cabernet Sauvignon";
  else if (rx.merlot.test(t)) inferred_variety = "Merlot";
  else if (rx.syrah.test(t)) inferred_variety = "Syrah";
  else if (rx.grenache.test(t)) inferred_variety = "Grenache";
  else if (rx.meunier.test(t)) inferred_variety = "Pinot Meunier";
  else if (rx.pinotGris.test(t)) inferred_variety = "Pinot Gris";
  else if (rx.viognier.test(t)) inferred_variety = "Viognier";
  else if (rx.chenin.test(t)) inferred_variety = "Chenin Blanc";
  else if (rx.malbec.test(t)) inferred_variety = "Malbec";
  else if (rx.zinfandel.test(t)) inferred_variety = "Zinfandel";

  return {
    vintage_year: isNV ? null : possibleYear ?? null,
    is_non_vintage: isNV || undefined,
    inferred_variety,
  };
}

export type StepQuestion = {
  key: "vintage" | "variety" | "hemisphere" | "country" | "region" | "subregion";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

/* ---------- Old/New world helper ---------- */
const OLD_WORLD = new Set(["France","Italy","Spain","Germany","Portugal","Austria","Greece","Hungary","Georgia"]);
const isOldWorldCountry = (c?: string) => !!c && OLD_WORLD.has(c);

/* ---------- DB-first geo + typical varieties from wine_reference ---------- */
type WineRefRow = { country: string | null; region: string | null; subregion: string | null; typical_varieties?: any };
type GeoPick = {
  countryCorrect?: string;
  countryOptions: string[];
  regionCorrect?: string;
  regionOptions: string[];
  subregionCorrect?: string | null;
  subregionOptions?: string[] | null;
  typicalVarieties?: string[]; // from the best row (if present)
  isOldWorld?: boolean;
};

function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }

async function fetchGeoFromWineReference(ocrText: string): Promise<GeoPick> {
  try {
    const t = norm(ocrText);
    const toks = tokenize(ocrText);

    // Strong country hints
    let hintCountry: string | undefined;
    if (/\bvin\s+de\s+france\b|\bproduit\s+de\s+france\b|\bfrance\b/.test(t)) hintCountry = "France";
    if (/\bitaly\b|\bitalia\b/.test(t)) hintCountry = hintCountry || "Italy";
    if (/\bspain\b|espa[nñ]a/.test(t)) hintCountry = hintCountry || "Spain";

    // 1) Name matches on country/region/subregion
    const needles = toks.slice(0, 8);
    const ors = needles.map(n =>
      `country.ilike.%${n}%,region.ilike.%${n}%,subregion.ilike.%${n}%`
    ).join(",");

    const { data: nameRows } = ors
      ? await supabase
          .from("wine_reference")
          .select("country,region,subregion,typical_varieties")
          .or(ors)
      : { data: [] as WineRefRow[] };

    // Merge rows (no synonyms column in this table)
    const rows: WineRefRow[] = [...(nameRows || [])];

    if (!rows.length) return { countryOptions: [], regionOptions: [] };

    // Score rows: region+subregion string presence + hinted country + light popularity via region name length
    const scoreRow = (r: WineRefRow) => {
      let s = 0;
      if (r.region && t.includes(norm(r.region))) s += 4;
      if (r.subregion && t.includes(norm(r.subregion))) s += 5;
      if (r.country && t.includes(norm(r.country))) s += 2;
      if (hintCountry && r.country === hintCountry) s += 3;
      s += (r.region ? Math.min(3, r.region.length / 10) : 0);
      return s;
    };
    const scored = rows.map(r => ({ r, s: scoreRow(r) }))
                       .sort((a,b) => b.s - a.s || (hintCountry ? (a.r.country === hintCountry ? -1 : 1) : 0));
    const best = scored[0].r;

    const countryCorrect = (best.country || undefined) as string | undefined;
    const byCountry = scored.filter(x => x.r.country === countryCorrect);

    const countriesSorted = uniq(scored.map(x => x.r.country || "").filter(Boolean));
    const countryOptions = [countryCorrect, ...countriesSorted.filter(c => c !== countryCorrect)].filter(Boolean).slice(0,4) as string[];

    // Regions
    const regionCounts = new Map<string, number>();
    byCountry.forEach(x => { const key = (x.r.region || "").trim(); if (key) regionCounts.set(key, (regionCounts.get(key) || 0) + x.s); });
    const regionCorrect = (regionCounts.size
      ? [...regionCounts.entries()].sort((a,b)=>b[1]-a[1])[0][0]
      : (best.region || undefined)) as string | undefined;

    const regionOptions = uniq([
      ...(regionCorrect ? [regionCorrect] : []),
      ...byCountry.map(x => (x.r.region || "").trim()).filter(Boolean)
    ]).slice(0,4);

    // Subregions (optional)
    let subregionCorrect: string | null = null;
    let subregionOptions: string[] | null = null;
    if (regionCorrect) {
      const subs = byCountry
        .filter(x => (x.r.region || "").trim() === regionCorrect && x.r.subregion)
        .map(x => (x.r.subregion || "").trim())
        .filter(Boolean);
      const uniqSubs = uniq(subs);
      if (uniqSubs.length) {
        subregionCorrect = uniqSubs[0];
        subregionOptions = [subregionCorrect, ...uniqSubs.slice(1)].slice(0,4);
      }
    }

    const typicalVarieties = parseVarList(best.typical_varieties);
    const isOldWorld = isOldWorldCountry(countryCorrect);

    return {
      countryCorrect,
      countryOptions,
      regionCorrect,
      regionOptions,
      subregionCorrect,
      subregionOptions,
      typicalVarieties,
      isOldWorld,
    };
  } catch {
    return { countryOptions: [], regionOptions: [] };
  }
}

/* ---------- variety/blend detection (uses typicalVarieties when helpful) ---------- */
function detectVarietyOrBlend(
  text: string,
  hint?: string | null,
  regionName?: string,
  typicalVarieties?: string[]
): { label: string; distractors: string[] } {
  const t = norm(text);

  // Explicit multi-grape patterns (NOT "cuvée")
  const explicitBlend =
    /\bblend\b|\bgsm\b|\bfield\s*blend\b|cabernet.+merlot|merlot.+cabernet|grenache.+syrah|syrah.+grenache/.test(t);

  const grapes: Array<{ name: string; rx: RegExp }> = [
    { name: "Chardonnay",        rx: /\bchard[a-z0-9-]*onn?ay\b|\bblanc\s+de\s+blancs?\b/ },
    { name: "Sauvignon Blanc",   rx: /\bsauv[a-z-]*ignon(?:\s*blanc)?\b|\bsauv\s*blanc\b/ },
    { name: "Pinot Noir",        rx: /\bpinot\s*no[i1]r\b/ },
    { name: "Riesling",          rx: /\briesl[i1]ng\b/ },
    { name: "Gamay",             rx: /\bgamay\b/ },
    { name: "Tempranillo",       rx: /\btempran[i1]llo\b/ },
    { name: "Nebbiolo",          rx: /\bnebbiolo\b/ },
    { name: "Sangiovese",        rx: /\bsangiovese\b/ },
    { name: "Cabernet Sauvignon",rx: /\bcab(?:ernet)?\s*sauv[a-z-]*ignon\b|\bcab\s*sauv\b/ },
    { name: "Merlot",            rx: /\bmerl[o0]t\b/ },
    { name: "Syrah",             rx: /\bsyrah\b|\bshiraz\b/ },
    { name: "Grenache",          rx: /\bgrenache\b/ },
    { name: "Pinot Meunier",     rx: /\bmeunier\b/ },
    { name: "Pinot Gris",        rx: /\bpinot\s*gri[sz]\b/ },
    { name: "Viognier",          rx: /\bviognier\b/ },
    { name: "Chenin Blanc",      rx: /\bchenin\s*blanc\b/ },
    { name: "Malbec",            rx: /\bmalbec\b/ },
    { name: "Zinfandel",         rx: /\bzinfandel\b/ },
  ];
  const hits = Array.from(new Set(grapes.filter(g => g.rx.test(t)).map(g => g.name)));

  const byRegion: Record<string, string> = {
    "Chablis": "Chardonnay",
    "Beaujolais": "Gamay",
    "Bordeaux": "Blend",
    "Rioja": "Tempranillo",
    "Barolo": "Nebbiolo",
    "Chianti": "Sangiovese",
    "Marlborough": "Sauvignon Blanc",
    "Mosel": "Riesling",
  };

  // Use table's typicalVarieties if we didn't get a direct OCR hit
  const tv = (typicalVarieties || []).filter(Boolean);
  const tvTop = tv[0];

  if (hits.length >= 2 || explicitBlend) return { label: "Blend", distractors: ["Cabernet Sauvignon","Pinot Noir","Chardonnay"] };
  if (hits.length === 1) {
    const v = hits[0];
    const d: Record<string, string[]> = {
      "Chardonnay": ["Sauvignon Blanc","Riesling","Blend"],
      "Pinot Noir": ["Gamay","Merlot","Blend"],
      "Cabernet Sauvignon": ["Merlot","Syrah","Blend"],
      "Riesling": ["Chenin Blanc","Sauvignon Blanc","Blend"],
      "Gamay": ["Pinot Noir","Merlot","Blend"],
    };
    return { label: v, distractors: d[v] || ["Cabernet Sauvignon","Pinot Noir","Chardonnay"] };
  }

  // No OCR hit: prefer table hint → then region hint → then original OCR hint
  const fallback = tvTop || (regionName ? byRegion[regionName] : undefined) || hint || "Blend";
  const fallbackD = {
    "Blend": ["Cabernet Sauvignon","Pinot Noir","Chardonnay"],
    "Chardonnay": ["Sauvignon Blanc","Riesling","Blend"],
    "Pinot Noir": ["Gamay","Merlot","Blend"],
    "Sauvignon Blanc": ["Chardonnay","Riesling","Blend"],
    "Riesling": ["Chenin Blanc","Sauvignon Blanc","Blend"],
  } as Record<string,string[]>;
  return { label: fallback, distractors: fallbackD[fallback] || ["Cabernet Sauvignon","Pinot Noir","Chardonnay"] };
}

/* ---------- build steps from OCR + wine_reference ---------- */
async function buildRoundPayloadFromOCR(file: File): Promise<{ questions: StepQuestion[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(FN_OCR, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  const { text } = await res.json();

  const hints = extractLabelHints(text || "");
  const geo = await fetchGeoFromWineReference(text || "");
  const now = new Date().getFullYear();

// Hemisphere (prefer DB country)
const countryFromDB = geo.countryCorrect;
const isOld = geo.isOldWorld ?? (
  isOldWorldCountry(countryFromDB) ||
  /\b(france|italy|spain|germany|portugal|austria|greece|hungary)\b/i.test(text)
);
const hemiCorrect = isOld ? 0 : 1;


  // Vintage
  const vintageOpts = hints.is_non_vintage
    ? ["NV", String(now), String(now - 1), String(now - 2)]
    : hints.vintage_year
      ? [String(hints.vintage_year), String(hints.vintage_year - 1), String(hints.vintage_year + 1), "NV"]
      : ["NV", String(now), String(now - 1), String(now - 2)];

  // Country/Region/Subregion (DB-first, with fallbacks)
  const countryCorrect = countryFromDB || (isOld ? "France" : "USA");
  const countryOptions = geo.countryOptions.length
    ? pickFour(countryCorrect, geo.countryOptions)
    : (isOld ? ["France","Italy","Spain","Germany"] : ["USA","Australia","New Zealand","Chile"]);

  const regionCorrect = geo.regionCorrect
    || (countryCorrect === "France" ? "Bordeaux"
      : countryCorrect === "USA" ? "Napa Valley"
      : "Rioja");
  const regionOptions = geo.regionOptions.length
    ? pickFour(regionCorrect, geo.regionOptions)
    : (countryCorrect === "France"
        ? ["Bordeaux","Burgundy","Beaujolais","Loire"]
        : countryCorrect === "USA"
          ? ["Napa Valley","Sonoma","Willamette Valley","Columbia Valley"]
          : ["Rioja","Ribera del Duero","Priorat","Rías Baixas"]);

  const subregionOptions = geo.subregionOptions || null;

  // Variety/Blend (use typicalVarieties from wine_reference)
  const vb = detectVarietyOrBlend(text || "", hints.inferred_variety, regionCorrect, geo.typicalVarieties);
  const varietyOpts = pickFour(vb.label, vb.distractors);

  const questions: StepQuestion[] = [
    { key: "hemisphere", prompt: "Old World or New World?", options: ["Old World","New World"], correctIndex: hemiCorrect },
    { key: "vintage",    prompt: "Pick the vintage",        options: vintageOpts,                correctIndex: 0 },
    { key: "variety",    prompt: "Pick the variety / blend",options: varietyOpts,                correctIndex: 0 },
    { key: "country",    prompt: "Pick the country",        options: countryOptions,             correctIndex: 0 },
    { key: "region",     prompt: "Pick the region",         options: regionOptions,              correctIndex: 0 },
  ];
  if (subregionOptions && subregionOptions.length) {
    questions.push({ key: "subregion", prompt: "Pick the subregion", options: subregionOptions, correctIndex: 0 });
  }
  return { questions };
}

/* ---------- small UI bits ---------- */
function InviteBar({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${base}/join/${inviteCode}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join my Wine Options game", text: `Use code ${inviteCode}`, url: joinUrl });
      } else {
        await copy();
      }
    } catch {}
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border bg-white shadow-sm">
      <div>
        <div className="text-xs text-gray-500">Invite code</div>
        <div className="font-mono text-2xl font-semibold tracking-wide">{inviteCode}</div>
      </div>
      <div className="flex-1" />
      <button onClick={copy} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:shadow">
        <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
      </button>
      <button onClick={share} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-black text-white hover:shadow">
        <Share2 className="h-4 w-4" /> Share
      </button>
    </div>
  );
}

function QuestionStepper({
  round, me, onFinished,
}: { round: GameRound; me: Participant; onFinished: () => void; }) {
  const questions: StepQuestion[] = round.payload?.questions ?? [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const q = questions[index];

  useEffect(() => { setIndex(0); setSelected(null); }, [round?.id]);

  async function handleNext() {
    if (selected == null || busy) return;
    setBusy(true);
    const isCorrect = selected === q.correctIndex;

    try {
      await submitAnswer(round.id, me.id, selected, isCorrect).catch((e) =>
        console.error("[submitAnswer] failed", e)
      );
      if (isCorrect) {
        await awardPoints(me.id, 10).catch((e) =>
          console.error("[awardPoints] failed", e)
        );
      }
    } finally {
      if (index < questions.length - 1) {
        setIndex((i) => i + 1);
        setSelected(null);
      } else {
        onFinished();
      }
      setBusy(false);
    }
  }

  if (!q) return null;

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">Question {index + 1} of {questions.length}</div>
      <div className="text-2xl font-semibold">{q.prompt}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`p-4 rounded-2xl border text-left hover:shadow-sm focus:outline-none focus:ring-2 ${active ? "ring-2 ring-black" : ""}`}
              aria-pressed={active}
              disabled={busy}
            >
              <div className="flex items-center gap-2">
                {active ? <CheckCircle2 className="h-5 w-5" /> : <ChevronRight className="h-5 w-5 opacity-50" />}
                <span className="font-medium">{opt}</span>
              </div>
              {active && q.explanation && <div className="mt-2 text-xs text-gray-500">{q.explanation}</div>}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={selected == null || busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-black text-white disabled:opacity-60"
        >
          {index < questions.length - 1 ? (busy ? "Saving…" : "Next") : (busy ? "Finishing…" : "See Results")}
        </button>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function WineOptionsGame({ initialCode = "" }: { initialCode?: string }) {
  const [displayName, setDisplayName] = useState("Player");
  const [codeInput, setCodeInput] = useState(initialCode);
  const [session, setSession] = useState<GameSession | null>(null);
  const [me, setMe] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [round, setRound] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => () => unsubscribe(channelRef.current), []);

  async function refetchParticipants(sessionId: string) {
    const { data: ps } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });

    setParticipants(ps ?? []);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;

    if (ps) {
      if (me) {
        const mineById = ps.find((p: any) => p.id === me.id) as Participant | undefined;
        if (mineById) { setMe(mineById); return; }
      }
      if (uid) {
        const mineByUid = ps.find((p: any) => p.user_id === uid) as Participant | undefined;
        if (mineByUid) { setMe(mineByUid); return; }
      }
      const hostRow = ps.find((p: any) => p.is_host) as Participant | undefined;
      if (!me && hostRow) setMe(hostRow);
    }
  }

  async function refetchLatestRound(sessionId: string) {
    const { data: r } = await supabase
      .from("game_rounds")
      .select("*")
      .eq("session_id", sessionId)
      .order("started_at", { ascending: false })
      .limit(1);
    if (r && r[0]) setRound(r[0] as GameRound);
  }

  function attachRealtime(sessId: string) {
    channelRef.current = listenToSession(sessId, {
      onParticipantJoin: async () => { await refetchParticipants(sessId); },
      onParticipantUpdate: async () => { await refetchParticipants(sessId); },
      onRoundChange: setRound,
      onSessionChange: async (s) => { setSession(s); await refetchParticipants(sessId); },
    });
  }

  // Polling backs up realtime for participants + latest round
  useEffect(() => {
    if (!session?.id) return;
    const t = setInterval(() => {
      refetchParticipants(session.id).catch(() => {});
      refetchLatestRound(session.id).catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [session?.id]);

  // Auto-join if we landed on /join/:code
  useEffect(() => {
    const run = async () => {
      if (!initialCode || session) return;
      setLoading(true); setErr(null);
      try {
        const res = await fetch("/.netlify/functions/join-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invite_code: initialCode.trim().toUpperCase(),
            user_id: null,
            display_name: displayName || "Guest",
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { session: s, participant } = await res.json();
        setSession(s);
        setMe(participant);
        setCodeInput(s.invite_code);
        await refetchParticipants(s.id);
        attachRealtime(s.id);
      } catch (e: any) {
        setErr(e?.message || "Failed to join game.");
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function handleHost() {
    setLoading(true); setErr(null);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) {
        setErr("Please sign in to host a game.");
        setLoading(false);
        return;
      }

      const res = await fetch("/.netlify/functions/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host_user_id: uid, display_name: displayName || "Host" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session: s } = await res.json();

      setSession(s);
      await refetchParticipants(s.id);

      const { data: psMe } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", s.id)
        .or(`is_host.eq.true,user_id.eq.${uid}`)
        .limit(1);

      if (psMe && psMe[0]) setMe(psMe[0] as Participant);

      setCodeInput(s.invite_code);
      attachRealtime(s.id);
    } catch (e: any) {
      setErr(e?.message || "Failed to create game.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setLoading(true); setErr(null);
    try {
      const code = codeInput.trim().toUpperCase();
      if (!code) { setErr("Enter an invite code."); setLoading(false); return; }
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;

      const res = await fetch("/.netlify/functions/join-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code, user_id: uid, display_name: displayName || "Guest" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session: s, participant } = await res.json();

      setSession(s);
      setMe(participant);
      setCodeInput(s.invite_code);
      await refetchParticipants(s.id);
      attachRealtime(s.id);
    } catch (e: any) {
      setErr(e?.message || "Failed to join game.");
    } finally {
      setLoading(false);
    }
  }

  async function startGameFromUpload(file: File) {
    if (!session || !me) return;
    setUploadErr(null);
    setUploadBusy(true);
    try {
      const payload = await buildRoundPayloadFromOCR(file);

      const res = await fetch("/.netlify/functions/start-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          caller_user_id: me.user_id,
          payload,
          round_number: 1,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { round: r } = await res.json();

      setRound(r);
    } catch (er: any) {
      setUploadErr(er?.message || "OCR/Start round failed");
    } finally {
      setUploadBusy(false);
    }
  }

  async function finishGame() {
    if (!session || !round) return;
    await endRound(round.id);
    await setSessionStatus(session.id, WRITE_STATUS["finished"]);
  }

  // Prefer live round for status; else reflect session status
  const uiStatus = round ? "in_progress" : (session ? READ_STATUS[session.status] : "waiting");

  const isHost =
    (!!session?.host_user_id && !!me?.user_id && me.user_id === session.host_user_id) || !!me?.is_host;

  const isParticipantHost = (p: Participant, s: GameSession) =>
    (!!s.host_user_id && !!p.user_id && p.user_id === s.host_user_id) || !!p.is_host;

  if (!session) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-semibold">Wine Options — Multiplayer</h1>

        {err && <div className="text-sm rounded-2xl border border-red-200 bg-red-50 text-red-700 p-2">{toPlain(err)}</div>}

        <div className="flex items-start gap-2 text-xs text-gray-600">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <p>Magic-link sign-in may not persist in private/incognito windows (cookies/localStorage blocked). Use a normal window or email+password/OAuth for hosting.</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Display name</label>
          <input
            className="w-full border rounded-2xl p-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={loading}
            onClick={handleHost}
            className="px-4 py-2 rounded-2xl bg-black text-white inline-flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Host new game
          </button>
          <div className="flex-1" />
          <input
            placeholder="Invite code"
            className="border rounded-2xl p-2 w-40"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          />
          <button
            disabled={loading || codeInput.length < 4}
            onClick={handleJoin}
            className="px-4 py-2 rounded-2xl border"
          >
            Join
          </button>
        </div>

        <div className="text-xs text-gray-500">Upload controls appear after you host or join a session.</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm">Status: <span className="font-medium">{uiStatus}</span></div>
        <div className="text-sm text-gray-500">Players: {participants.length}</div>
      </div>

      <InviteBar inviteCode={session.invite_code} />

      <div className="p-4 rounded-2xl border bg-white shadow-sm">
        <div className="font-medium mb-2">Players</div>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const host = isParticipantHost(p, session);
            return (
              <div key={p.id} className={`px-3 py-1 rounded-full border ${host ? "bg-gray-100" : ""}`}>
                {p.display_name} {host && <span className="text-xs">(host)</span>} — {p.score} pts
              </div>
            );
          })}
        </div>
      </div>

      {/* Host-only upload */}
      {!round && uiStatus === "waiting" && isHost && (
        <div className="space-y-3 p-4 rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Camera className="h-4 w-4" />
            <span>You are the host — upload a label to start the round</span>
          </div>

          {uploadErr && (
            <div className="text-sm rounded-2xl border border-red-200 bg-red-50 text-red-700 p-2">
              {toPlain(uploadErr)}
            </div>
          )}

          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border cursor-pointer w-fit">
            <Upload className="h-4 w-4" />
            <span>{uploadBusy ? "Reading…" : "Choose image"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) startGameFromUpload(file);
              }}
            />
          </label>
        </div>
      )}

      {/* Guests waiting message */}
      {!round && uiStatus === "waiting" && !isHost && (
        <div className="p-4 rounded-2xl border bg-white shadow-sm text-sm text-gray-700">
          Waiting for the host to start the round…
        </div>
      )}

      {round && uiStatus !== "finished" && (
        <div className="p-4 rounded-2xl border bg-white shadow-sm">
          {me && <QuestionStepper round={round} me={me} onFinished={finishGame} />}
        </div>
      )}

      {uiStatus === "finished" && (
        <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-3">
          <div className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" /> Results
          </div>
          <ul className="space-y-1">
            {[...participants].sort((a, b) => b.score - a.score).map((p, i) => (
              <li key={p.id} className="flex justify-between">
                <span>{i + 1}. {p.display_name}</span>
                <span className="font-medium">{p.score} pts</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button
              onClick={() => window.location.assign("/wine-options/multiplayer")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border"
            >
              <LogOut className="h-4 w-4" /> Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function uniqBy<T>(arr: T[], key: (t: T) => string) {
  const m = new Map<string, T>();
  for (const it of arr) m.set(key(it), it);
  return [...m.values()];
}
