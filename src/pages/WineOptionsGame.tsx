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

/* ---------- util ---------- */
const toPlain = (s?: string | null) => (s ? s.replace(/<[^>]+>/g, "") : "");
const pickFour = (correct: string, pool: string[]) => {
  const uniq = Array.from(new Set([correct, ...pool.filter(p => p && p !== correct)]));
  return uniq.slice(0, 4); // correct will be at index 0
};

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

/* ---------- OCR helpers (host upload starts a round) ---------- */
const FN_OCR = "/.netlify/functions/ocr-label";

type LabelHints = {
  vintage_year?: number | null;
  is_non_vintage?: boolean;
  inferred_variety?: string | null;
};

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
}
function extractLabelHints(text: string): LabelHints {
  const t = text.toLowerCase();
  const years = Array.from(t.matchAll(/\b(19|20)\d{2}\b/g)).map((m) => Number(m[0]));
  const possibleYear = years.find((y) => y >= 1980 && y <= new Date().getFullYear());
  const isNV = /\bnv\b|\bnon\s*-?\s*vintage\b/.test(t);

  let inferredVariety: string | null = null;
  if (/blanc\s+de\s+blancs/.test(t)) inferredVariety = "Chardonnay";
  else if (/blanc\s+de\s+noirs/.test(t)) inferredVariety = "Pinot Noir";
  else {
    const grapes = [
      "cabernet sauvignon","cabernet","merlot","syrah","shiraz","grenache","mourvèdre","mataro",
      "pinot noir","pinot grigio","pinot gris","chardonnay","sauvignon blanc","riesling","tempranillo",
      "nebbiolo","sangiovese","malbec","chenin blanc","viognier","zinfandel","gamay","meunier",
    ];
    const found = grapes.find((g) => t.includes(g));
    inferredVariety = found ? titleCase(found) : null;
  }
  return {
    vintage_year: isNV ? null : possibleYear ?? null,
    is_non_vintage: isNV,
    inferred_variety: inferredVariety,
  };
}

export type StepQuestion = {
  key: "vintage" | "variety" | "hemisphere" | "country" | "region" | "subregion";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

/* ---------- country/region heuristics ---------- */
type Detected = { country?: string; region?: string; subregion?: string; isOldWorld?: boolean };
function detectOrigin(text: string): Detected {
  const t = text.toLowerCase();

  const ow = /(france|italy|spain|germany|portugal|austria|greece|hungary|georgia\b)/i.test(text);
  const res: Detected = { isOldWorld: ow };

  // Country
  const countryTests: Array<[string, RegExp]> = [
    ["France", /(france|champagne|bordeaux|bourgogne|burgundy|loire|alsace|rhone|beaujolais|provence|languedoc|jura)/i],
    ["Italy", /(italy|toscana|piemonte|piedmont|veneto|sicilia|alto adige|friuli|chianti|barolo|barbaresco)/i],
    ["Spain", /(spain|rioja|ribera del duero|rías?\s*baixas|priorat|navarra|cava)/i],
    ["USA", /(napa|sonoma|california|oregon|washington|willamette|columbia valley|paso robles|usa|american)/i],
    ["Australia", /(australia|barossa|mclaren vale|margaret river|yarra valley|clare valley|coonawarra)/i],
    ["New Zealand", /(new zealand|marlborough|central otago|hawke'?s bay)/i],
    ["Chile", /(chile|maipo|colchagua|casablanca)/i],
    ["Argentina", /(argentina|mendoza|salta|patagonia)/i],
    ["South Africa", /(south africa|stellenbosch|swartland|walker bay|cape)/i],
    ["Germany", /(germany|mosel|rheingau|pfalz|nahe|baden)/i],
    ["Portugal", /(portugal|douro|alentejo|vinho verde|dao|d\u00E3o)/i],
  ];
  for (const [name, rx] of countryTests) if (rx.test(text)) { res.country = name; break; }

  // Region + subregion (very light)
  const regionMatchers: Record<string, Array<[string, RegExp, string[]]>> = {
    France: [
      ["Bordeaux", /bordeaux|pauillac|margaux|medoc|st[.\s-]*julien|st[.\s-]*est[eé]phe|pomerol|saint[ -]?emilion|graves|pessac/i,
        ["Bordeaux","Burgundy","Loire","Rhône"]],
      ["Burgundy", /bourgogne|burgundy|c[oô]te d'?or|beaune|nuits|chablis|c[oô]te de nuits|c[oô]te de beaune/i,
        ["Burgundy","Bordeaux","Loire","Rhône"]],
      ["Loire", /loire|sancerre|vouvray|muscadet|anjou|savennieres/i,
        ["Loire","Bordeaux","Rhône","Burgundy"]],
      ["Rhône", /rhone|c[oô]tes? du rh[oô]ne|cote rotie|hermitage|gigondas|chateauneuf/i,
        ["Rhône","Bordeaux","Loire","Burgundy"]],
      ["Champagne", /champagne|reims|epernay|ay\b|aÿ/i,
        ["Champagne","Bordeaux","Loire","Burgundy"]],
      ["Alsace", /alsace|riesling d'alsace/i,
        ["Alsace","Loire","Burgundy","Rhône"]],
    ],
    Italy: [
      ["Tuscany", /toscana|tuscany|chianti|brunello|montalcino|montepulciano/i, ["Tuscany","Piedmont","Veneto","Sicily"]],
      ["Piedmont", /piemonte|piedmont|barolo|barbaresco|langhe|asti/i, ["Piedmont","Tuscany","Veneto","Sicily"]],
      ["Veneto", /veneto|valpolicella|soave|amarone|prosecco/i, ["Veneto","Tuscany","Piedmont","Sicily"]],
      ["Sicily", /sicilia|sicily|etna/i, ["Sicily","Tuscany","Piedmont","Veneto"]],
    ],
    Spain: [
      ["Rioja", /rioja/i, ["Rioja","Ribera del Duero","Priorat","Rías Baixas"]],
      ["Ribera del Duero", /ribera del duero/i, ["Ribera del Duero","Rioja","Priorat","Rías Baixas"]],
      ["Rías Baixas", /r[ií]as?\s*baixas/i, ["Rías Baixas","Rioja","Ribera del Duero","Priorat"]],
      ["Priorat", /priorat/i, ["Priorat","Rioja","Ribera del Duero","Rías Baixas"]],
    ],
    USA: [
      ["Napa Valley", /napa/i, ["Napa Valley","Sonoma","Willamette","Columbia Valley"]],
      ["Sonoma", /sonoma/i, ["Sonoma","Napa Valley","Willamette","Columbia Valley"]],
      ["Willamette Valley", /willamette/i, ["Willamette Valley","Napa Valley","Sonoma","Columbia Valley"]],
      ["Columbia Valley", /columbia valley|washington/i, ["Columbia Valley","Napa Valley","Sonoma","Willamette Valley"]],
    ],
    Australia: [
      ["Barossa", /barossa/i, ["Barossa","McLaren Vale","Margaret River","Yarra Valley"]],
      ["McLaren Vale", /mclaren vale/i, ["McLaren Vale","Barossa","Margaret River","Yarra Valley"]],
      ["Margaret River", /margaret river/i, ["Margaret River","Barossa","McLaren Vale","Yarra Valley"]],
      ["Yarra Valley", /yarra valley/i, ["Yarra Valley","Barossa","McLaren Vale","Margaret River"]],
    ],
    "New Zealand": [
      ["Marlborough", /marlborough/i, ["Marlborough","Central Otago","Hawke's Bay","Nelson"]],
      ["Central Otago", /central otago/i, ["Central Otago","Marlborough","Hawke's Bay","Nelson"]],
      ["Hawke's Bay", /hawke'?s bay/i, ["Hawke's Bay","Marlborough","Central Otago","Nelson"]],
    ],
    Chile: [
      ["Maipo", /maipo/i, ["Maipo","Colchagua","Casablanca","Maule"]],
      ["Colchagua", /colchagua/i, ["Colchagua","Maipo","Casablanca","Maule"]],
      ["Casablanca", /casablanca/i, ["Casablanca","Maipo","Colchagua","Maule"]],
    ],
    Argentina: [
      ["Mendoza", /mendoza/i, ["Mendoza","Salta","Patagonia","Uco Valley"]],
      ["Salta", /salta|cafayate/i, ["Salta","Mendoza","Patagonia","Uco Valley"]],
      ["Patagonia", /patagonia/i, ["Patagonia","Mendoza","Salta","Uco Valley"]],
    ],
    "South Africa": [
      ["Stellenbosch", /stellenbosch/i, ["Stellenbosch","Swartland","Walker Bay","Paarl"]],
      ["Swartland", /swartland/i, ["Swartland","Stellenbosch","Walker Bay","Paarl"]],
    ],
    Germany: [
      ["Mosel", /mosel/i, ["Mosel","Rheingau","Pfalz","Nahe"]],
      ["Rheingau", /rheingau/i, ["Rheingau","Mosel","Pfalz","Nahe"]],
      ["Pfalz", /pfalz/i, ["Pfalz","Mosel","Rheingau","Nahe"]],
    ],
    Portugal: [
      ["Douro", /douro/i, ["Douro","Alentejo","Vinho Verde","Dão"]],
      ["Alentejo", /alentejo/i, ["Alentejo","Douro","Vinho Verde","Dão"]],
      ["Vinho Verde", /vinho verde/i, ["Vinho Verde","Douro","Alentejo","Dão"]],
    ],
  };

  const country = res.country;
  if (country && regionMatchers[country]) {
    for (const [region, rx] of regionMatchers[country]) {
      if (rx.test(text)) { res.region = region; break; }
    }
  }

  // Subregion (only for a few)
  if (res.region === "Bordeaux") {
    if (/pauillac|margaux|st[.\s-]*julien|st[.\s-]*est[eé]phe|medoc/i.test(text)) res.subregion = "Left Bank";
    else if (/saint[ -]?emilion|pomerol/i.test(text)) res.subregion = "Right Bank";
  }
  if (res.region === "Burgundy") {
    if (/chablis/i.test(text)) res.subregion = "Chablis";
    else if (/c[oô]te de nuits/i.test(text)) res.subregion = "Côte de Nuits";
    else if (/c[oô]te de beaune/i.test(text)) res.subregion = "Côte de Beaune";
  }
  if (res.region === "Napa Valley") {
    if (/oakville|rutherford|st[.\s-]*helena|mount veeder/i.test(text)) res.subregion = "Oakville/Rutherford";
  }
  return res;
}

/* ---------- variety/blend detection ---------- */
function detectVarietyOrBlend(text: string, hint?: string | null): { label: string; distractors: string[] } {
  const t = text.toLowerCase();

  const looksBlend =
    /\bblend\b|\bassemblage\b|\bassemblage\b|\bcuv[ée]e\b|cabernet.+merlot|merlot.+cabernet|\bgrenache.+syrah|\bgsm\b|syrah.+grenache|cabernet.+franc/i.test(text) ||
    /&|\/|,\s*(cabernet|merlot|syrah|grenache|mourv[eè]dre|tempranillo|sangiovese|nebbiolo)/i.test(text);

  if (looksBlend) {
    return { label: "Blend", distractors: ["Cabernet Sauvignon", "Pinot Noir", "Chardonnay"] };
  }

  const candidates = [
    "Cabernet Sauvignon","Merlot","Syrah","Shiraz","Grenache","Pinot Noir","Pinot Grigio","Pinot Gris",
    "Chardonnay","Sauvignon Blanc","Riesling","Tempranillo","Nebbiolo","Sangiovese","Malbec",
    "Chenin Blanc","Viognier","Zinfandel","Gamay"
  ];
  const pick = hint && candidates.includes(hint) ? hint : (candidates.find(c => t.includes(c.toLowerCase())) || "Pinot Noir");

  // Light distractors from same color/style family
  const alt: Record<string, string[]> = {
    "Cabernet Sauvignon": ["Merlot","Syrah","Blend"],
    "Pinot Noir": ["Gamay","Merlot","Blend"],
    "Chardonnay": ["Sauvignon Blanc","Riesling","Blend"],
  };
  const d = alt[pick] || ["Cabernet Sauvignon","Pinot Noir","Chardonnay"];
  return { label: pick, distractors: d };
}

/* ---------- step builder from OCR ---------- */
async function buildRoundPayloadFromOCR(file: File): Promise<{ questions: StepQuestion[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(FN_OCR, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  const { text } = await res.json();

  const hints = extractLabelHints(text || "");
  const origin = detectOrigin(text || "");
  const now = new Date().getFullYear();

  // Vintage
  const vintageOpts = hints.is_non_vintage
    ? ["NV", String(now), String(now - 1), String(now - 2)]
    : hints.vintage_year
      ? [String(hints.vintage_year), String(hints.vintage_year - 1), String(hints.vintage_year + 1), "NV"]
      : ["NV", String(now), String(now - 1), String(now - 2)];

  // Hemisphere
  const hemiCorrect = origin.isOldWorld ? 0 : 1;

  // Variety / Blend
  const vb = detectVarietyOrBlend(text || "", hints.inferred_variety);
  const varietyOpts = pickFour(vb.label, vb.distractors);

  // Country
  const countryCorrect = origin.country || (origin.isOldWorld ? "France" : "USA");
  const countryDistractorsOW = ["Italy", "Spain", "Germany", "Portugal"];
  const countryDistractorsNW = ["Australia", "New Zealand", "Chile", "Argentina"];
  const countryOpts = pickFour(
    countryCorrect,
    (origin.isOldWorld ? countryDistractorsOW : countryDistractorsNW)
  );

  // Region (based on country)
  const regionPools: Record<string, string[]> = {
    France: ["Bordeaux","Burgundy","Loire","Rhône"],
    Italy: ["Tuscany","Piedmont","Veneto","Sicily"],
    Spain: ["Rioja","Ribera del Duero","Rías Baixas","Priorat"],
    USA: ["Napa Valley","Sonoma","Willamette Valley","Columbia Valley"],
    Australia: ["Barossa","McLaren Vale","Margaret River","Yarra Valley"],
    "New Zealand": ["Marlborough","Central Otago","Hawke's Bay","Nelson"],
    Chile: ["Maipo","Colchagua","Casablanca","Maule"],
    Argentina: ["Mendoza","Salta","Patagonia","Uco Valley"],
    "South Africa": ["Stellenbosch","Swartland","Walker Bay","Paarl"],
    Germany: ["Mosel","Rheingau","Pfalz","Nahe"],
    Portugal: ["Douro","Alentejo","Vinho Verde","Dão"],
  };
  const regionCorrect = origin.region || (regionPools[countryCorrect]?.[0] ?? "Bordeaux");
  const regionOpts = pickFour(regionCorrect, (regionPools[countryCorrect] || []).filter(r => r !== regionCorrect));

  // Optional subregion
  const subregions: Record<string, string[]> = {
    Bordeaux: ["Left Bank","Right Bank","Graves","Entre-Deux-Mers"],
    Burgundy: ["Chablis","Côte de Nuits","Côte de Beaune","Mâconnais"],
    "Napa Valley": ["Oakville/Rutherford","St. Helena","Mount Veeder","Howell Mountain"],
    Rioja: ["Rioja Alta","Rioja Alavesa","Rioja Oriental","Rioja Baja"],
  };
  const subregionCorrect = origin.subregion;
  const subregionOpts = subregionCorrect
    ? pickFour(subregionCorrect, (subregions[regionCorrect] || []).filter(s => s !== subregionCorrect))
    : null;

  const questions: StepQuestion[] = [
    { key: "hemisphere", prompt: "Old World or New World?", options: ["Old World","New World"], correctIndex: hemiCorrect },
    { key: "vintage",    prompt: "Pick the vintage",        options: vintageOpts,                correctIndex: 0 },
    { key: "variety",    prompt: "Pick the variety / blend",options: varietyOpts,                correctIndex: 0 },
    { key: "country",    prompt: "Pick the country",        options: countryOpts,                correctIndex: 0 },
    { key: "region",     prompt: "Pick the region",         options: regionOpts,                 correctIndex: 0 },
  ];
  if (subregionOpts) {
    questions.push({ key: "subregion", prompt: "Pick the subregion", options: subregionOpts, correctIndex: 0 });
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

  function attachRealtime(sessId: string) {
    channelRef.current = listenToSession(sessId, {
      onParticipantJoin: async () => { await refetchParticipants(sessId); },
      onParticipantUpdate: async () => { await refetchParticipants(sessId); },
      onRoundChange: setRound,
      onSessionChange: async (s) => { setSession(s); await refetchParticipants(sessId); },
    });
  }

  useEffect(() => {
    if (!session?.id) return;
    const t = setInterval(() => {
      refetchParticipants(session.id).catch(() => {});
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
