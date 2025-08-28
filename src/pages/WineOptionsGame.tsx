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
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const unique = <T,>(arr: T[]) => Array.from(new Set(arr));
const ensureFour = (first: string, pool: string[]) => {
  const out = unique([first, ...pool.filter(x => x && x !== first)]);
  const pad = ["Chardonnay","Sauvignon Blanc","Riesling","Pinot Noir","Merlot","Syrah","Cabernet Sauvignon","Gamay"];
  for (const p of pad) if (out.length < 4 && !out.includes(p)) out.push(p);
  return out.slice(0, 4);
};
const parseVarList = (v: unknown): string[] =>
  Array.isArray(v) ? (v as string[]).filter(Boolean)
  : typeof v === "string" ? v.split(/[,;/]| and /i).map(x => x.trim()).filter(Boolean)
  : [];

/* ---------- status maps ---------- */
const WRITE_STATUS: Record<string, GameSession["status"]> = {
  waiting: "open", in_progress: "active", finished: "finished", closed: "cancelled",
};
const READ_STATUS: Record<GameSession["status"], string> = {
  open: "waiting", active: "in_progress", finished: "finished", cancelled: "closed",
};

/* ---------- OCR helpers ---------- */
const FN_OCR = "/.netlify/functions/ocr-label";

type StepQuestion = {
  key: "vintage" | "variety" | "hemisphere" | "country" | "region" | "subregion";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

/* ---------- Old/New World ---------- */
const OLD_WORLD = new Set(["france","italy","spain","germany","portugal","austria","greece","hungary","georgia"]);
const hasStrongFrenchCue = (t: string) =>
  /(appellation|grand\s+cru|premier\s+cru|mis\s+en\s+bouteille|ch[âa]teau|c[ôo]te)/i.test(t);

/* ---------- Region pools (added Canada/China/India + expanded AU) ---------- */
const REGION_POOLS: Record<string, string[]> = {
  France: ["Bordeaux","Burgundy","Beaujolais","Loire","Rhône","Champagne","Alsace","Provence"],
  Italy: ["Tuscany","Piedmont","Veneto","Sicily"],
  Spain: ["Rioja","Ribera del Duero","Priorat","Rías Baixas"],
  USA: ["Napa Valley","Sonoma","Willamette Valley","Columbia Valley"],
  Australia: [
    "Barossa","McLaren Vale","Clare Valley","Coonawarra","Adelaide Hills","Riverland","Langhorne Creek",
    "Yarra Valley","Mornington Peninsula","Rutherglen","Heathcote",
    "Hunter Valley","Orange","Mudgee",
    "Margaret River","Great Southern","Swan Valley",
    "Tamar Valley","Coal River Valley","Derwent Valley","Pipers River","Huon Valley","North East Tasmania","North West Tasmania",
  ],
  "New Zealand": ["Marlborough","Central Otago","Hawke's Bay","Nelson"],
  Chile: ["Maipo","Colchagua","Casablanca","Maule"],
  Argentina: ["Mendoza","Salta","Patagonia","Uco Valley"],
  "South Africa": ["Stellenbosch","Swartland","Walker Bay","Paarl"],
  Germany: ["Mosel","Rheingau","Pfalz","Nahe"],
  Portugal: ["Douro","Alentejo","Vinho Verde","Dão"],
  Canada: ["Okanagan Valley","Niagara Peninsula","Prince Edward County","Lake Erie North Shore"],
  China: ["Ningxia","Yantai","Hebei","Xinjiang"],
  India: ["Nashik","Nandi Hills","Akluj","Baramati"],
};

/* ---------- comprehensive grape dictionary + detectors ---------- */
const WHITE_POOL = [
  "Chardonnay","Sauvignon Blanc","Riesling","Pinot Gris","Pinot Grigio","Gewürztraminer","Chenin Blanc","Viognier",
  "Semillon","Muscat Blanc à Petits Grains","Trebbiano","Verdelho","Albariño","Garganega","Marsanne","Roussanne",
  "Grenache Blanc","Colombard","Melon de Bourgogne","Cortese","Fiano","Greco","Verdicchio","Vermentino","Arneis",
  "Godello","Verdejo","Palomino Fino","Macabeo","Xarel·lo","Parellada","Loureiro","Fernão Pires","Grüner Veltliner",
  "Silvaner","Scheurebe","Kerner","Assyrtiko","Moscato Giallo","Torrontés","Koshu","Furmint","Hárslevelű","Savagnin"
];
const RED_POOL = [
  "Cabernet Sauvignon","Merlot","Pinot Noir","Syrah","Shiraz","Grenache","Tempranillo","Sangiovese","Nebbiolo",
  "Zinfandel","Primitivo","Malbec","Carignan","Cabernet Franc","Mourvèdre","Cinsault","Tannat","Counoise",
  "Montepulciano","Aglianico","Nero d’Avola","Barbera","Corvina","Lagrein","Dolcetto","Mencía","Bobal","Graciano",
  "Touriga Nacional","Touriga Franca","Trincadeira","Castelão","Blaufränkisch","Zweigelt","St. Laurent","Gamay",
  "Carménère","Pinotage","Saperavi","Kadarka","Plavac Mali","Xinomavro","Agiorgitiko","Negroamaro","Lambrusco","Schiava"
];
const GRAPE_SYNONYMS: Record<string, string[]> = {
  // Whites
  "Chardonnay": ["blanc de bourgogne","chablis"],
  "Sauvignon Blanc": ["fumé blanc","blanc fumé","sauv blanc"],
  "Riesling": ["johannisberg riesling","weisser riesling","weißer riesling","white riesling"],
  "Pinot Gris": ["pinot grigio","grauburgunder","ruländer","rulaender"],
  "Gewürztraminer": ["traminer aromatico","savagnin rose","gewurztraminer"],
  "Chenin Blanc": ["steen"],
  "Viognier": [],
  "Semillon": ["sem"],
  "Muscat Blanc à Petits Grains": ["moscato bianco","muskateller","muscat blanc a petits grains","muscat a petits grains"],
  "Trebbiano": ["ugni blanc","procanico"],
  "Verdelho": ["gouveio"],
  "Albariño": ["alvarinho","albarino"],
  "Garganega": ["trebbiano di soave"],
  "Marsanne": [],
  "Roussanne": [],
  "Grenache Blanc": [],
  "Colombard": ["colombar"],
  "Melon de Bourgogne": ["muscadet"],
  "Cortese": ["gavi"],
  "Fiano": [],
  "Greco": ["greco di tufo"],
  "Verdicchio": ["trebbiano di soave"],
  "Vermentino": ["rolle"],
  "Arneis": [],
  "Godello": [],
  "Verdejo": [],
  "Palomino Fino": ["palomino"],
  "Macabeo": ["viura"],
  "Xarel·lo": ["xarello","xarel-lo","xarel.lo"],
  "Parellada": [],
  "Loureiro": [],
  "Fernão Pires": ["maria gomes","fernao pires"],
  "Grüner Veltliner": ["gruner veltliner","gruener veltliner","gruner"],
  "Silvaner": ["sylvaner"],
  "Scheurebe": [],
  "Kerner": [],
  "Assyrtiko": [],
  "Moscato Giallo": [],
  "Torrontés": ["torrontes"],
  "Koshu": [],
  "Furmint": [],
  "Hárslevelű": ["harslevelu"],
  "Savagnin": ["nature (jura savagnin)","heida","paien"],
  // Reds
  "Cabernet Sauvignon": ["cab sauv","cabernet-sauvignon"],
  "Merlot": ["merlot noir"],
  "Pinot Noir": ["spätburgunder","blauburgunder","pinot nero","spatburgunder"],
  "Syrah": ["shiraz"],
  "Shiraz": ["syrah"],
  "Grenache": ["garnacha","cannonau"],
  "Tempranillo": ["tinta roriz","aragonez","aragonês","cencibel","tinto fino"],
  "Sangiovese": ["brunello","prugnolo gentile","morellino"],
  "Nebbiolo": ["spanna","chiavennasca"],
  "Zinfandel": ["primitivo","crljenak kaštelanski","crljenak kastelanski"],
  "Malbec": ["côt","auxerrois","cot"],
  "Carignan": ["mazuelo","cariñena","carignane","carinena"],
  "Cabernet Franc": ["breton","bouchet"],
  "Mourvèdre": ["monastrell","mataro","mourvedre"],
  "Cinsault": ["cinsaut"],
  "Tannat": [],
  "Counoise": [],
  "Montepulciano": ["montepulciano d’abruzzo grape","montepulciano d'abruzzo grape"],
  "Aglianico": [],
  "Nero d’Avola": ["calabrese","nero d'avola"],
  "Barbera": [],
  "Corvina": [],
  "Lagrein": [],
  "Dolcetto": [],
  "Mencía": ["mencia"],
  "Bobal": [],
  "Graciano": [],
  "Touriga Nacional": [],
  "Touriga Franca": [],
  "Trincadeira": ["tinta amarela"],
  "Castelão": ["periquita","castelao"],
  "Blaufränkisch": ["lemberger","kékfrankos","kekfrankos","blaufrankisch"],
  "Zweigelt": [],
  "St. Laurent": ["saint laurent","st laurent"],
  "Gamay": [],
  "Carménère": ["grande vidure","carmenere"],
  "Pinotage": [],
  "Saperavi": [],
  "Kadarka": [],
  "Plavac Mali": [],
  "Xinomavro": ["xinomavro"],
  "Agiorgitiko": [],
  "Negroamaro": [],
  "Lambrusco": ["lambruschi"],
  "Schiava": ["vernatsch","trollinger"],
};
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function findGrapesInText(text: string): string[] {
  const t = norm(text);
  const hits: string[] = [];
  for (const [canon, syns] of Object.entries(GRAPE_SYNONYMS)) {
    const needles = [canon, ...syns].map(norm);
    const rx = new RegExp(`\\b(?:${needles.map(esc).join("|")})\\b`, "i");
    if (rx.test(t)) hits.push(canon);
  }
  return Array.from(new Set(hits));
}

/* ---------- Burgundy vocabulary ---------- */
const BOURGOGNE_MARKERS = [
  "bourgogne","burgundy","cote d'or","côte d'or","cote de beaune","côte de beaune","cote de nuits","côte de nuits",
  "beaujolais","chablis","cote chalonnaise","côte chalonnaise"
];
const VILLAGES_BEaune = [
  "chassagne-montrachet","puligny-montrachet","meursault","beaune","pommard","volnay","aloxe-corton",
  "savigny-les-beaune","savigny-lès-beaune","pernand-vergelesses","st-aubin","saint-aubin","santenay"
];
const VILLAGES_Nuits = [
  "gevrey-chambertin","chambolle-musigny","vosne-romanee","vosne-romanée","vougeot","morey-saint-denis",
  "nuits-saint-georges","fixin","marsannay"
];

/* ---------- DB-first geo fetch from wine_reference ---------- */
type GeoPick = {
  countryCorrect?: string;
  countryOptions: string[];
  regionCorrect?: string;
  regionOptions: string[];
  subregionCorrect?: string | null;
  subregionOptions?: string[] | null;
  typicalVarieties?: string[];
  isOldWorld?: boolean;
};
async function fetchGeoFromWineReference(ocrText: string): Promise<GeoPick | null> {
  const t = norm(ocrText);
  const tokens = Array.from(new Set((t.match(/[a-z0-9'-]{3,}/g) || []).slice(0, 10)));
  if (!tokens.length) return null;

  const ors = tokens.map(n =>
    `country.ilike.%${n}%,region.ilike.%${n}%,subregion.ilike.%${n}%`
  ).join(",");

  const { data } = await supabase
    .from("wine_reference")
    .select("country,region,subregion,varieties")
    .or(ors)
    .limit(100);

  const rows = (data || []) as Array<{country: string|null; region: string|null; subregion: string|null; varieties?: any}>;
  if (!rows.length) return null;

  // score rows: exact string presences
  const score = (r: any) => {
    let s = 0;
    if (r.country && t.includes(norm(r.country))) s += 2;
    if (r.region && t.includes(norm(r.region))) s += 4;
    if (r.subregion && t.includes(norm(r.subregion))) s += 5;
    return s;
  };
  const best = rows.map(r => ({ r, s: score(r) }))
                   .sort((a,b)=>b.s-a.s)[0].r;

  const countryCorrect = best.country || undefined;
  const regionCorrect = best.region || undefined;

  const countries = unique(rows.map(r => r.country || "").filter(Boolean));
  const regions   = unique(rows.filter(r => r.country === countryCorrect).map(r => r.region || "").filter(Boolean));

  const subrows = rows.filter(r => r.country === countryCorrect && r.region === regionCorrect && r.subregion);
  const sublist = unique(subrows.map(r => (r.subregion || "").trim()).filter(Boolean));

  return {
    countryCorrect,
    countryOptions: ensureFour(countryCorrect || "France", countries.filter(c => c !== countryCorrect)),
    regionCorrect,
    regionOptions: ensureFour(regionCorrect || (REGION_POOLS[countryCorrect || "France"]?.[0] || "Burgundy"),
                              regions.filter(r => r !== regionCorrect)),
    subregionCorrect: sublist[0] || null,
    subregionOptions: sublist.length ? ensureFour(sublist[0], sublist.slice(1)) : null,
    typicalVarieties: parseVarList(best.varieties),
    isOldWorld: !!countryCorrect && OLD_WORLD.has((countryCorrect || "").toLowerCase()),
  };
}

/* ---------- Variety/blend with Champagne + Burgundy rules ---------- */
function detectVarietyOrBlend(textRaw: string, ocrHint?: string | null, typical?: string[]): { label: string; distractors: string[] } {
  const t = norm(textRaw);

  // Champagne
  if (/\bchampagne\b/i.test(textRaw)) {
    if (/\bblanc\s+de\s+blancs?\b/i.test(textRaw)) return { label: "Chardonnay", distractors: ["Sauvignon Blanc","Riesling","Blend"] };
    if (/\bblanc\s+de\s+noirs?\b/i.test(textRaw))  return { label: "Pinot Noir", distractors: ["Gamay","Merlot","Blend"] };
    return { label: "Blend", distractors: ["Pinot Noir","Chardonnay","Pinot Meunier"] };
  }

  // Burgundy villages
  const whiteBurg = VILLAGES_BEaune.some(v => t.includes(v)) || /\b(chablis|corton-charlemagne)\b/.test(t);
  const redBurg   = VILLAGES_Nuits.some(v => t.includes(v))   || /\b(gevrey|vosne|volnay|pommard|nuits)\b/.test(t);

  // Blends or 2+ grapes
  const explicitBlend = /\b(?:blend|assemblage|field\s*blend|gs?m)\b/.test(t);
  const hits = findGrapesInText(textRaw);
  if (explicitBlend || hits.length >= 2) return { label: "Blend", distractors: ["Cabernet Sauvignon","Pinot Noir","Chardonnay"] };

  if (hits.length === 1) {
    const v = hits[0];
    const isWhite = WHITE_POOL.includes(v);
    const more = isWhite ? ["Sauvignon Blanc","Riesling","Chenin Blanc"] : ["Merlot","Syrah","Grenache"];
    return { label: v, distractors: more.filter(x => x !== v).slice(0,3) };
  }

  if (whiteBurg) return { label: "Chardonnay", distractors: ["Sauvignon Blanc","Riesling","Blend"] };
  if (redBurg)   return { label: "Pinot Noir", distractors: ["Gamay","Merlot","Blend"] };

  // Table hint if available
  if (typical && typical[0]) {
    const v = typical[0];
    const isWhite = WHITE_POOL.includes(v);
    const more = isWhite ? ["Sauvignon Blanc","Riesling","Pinot Gris"] : ["Merlot","Syrah","Grenache"];
    return { label: v, distractors: more };
  }

  // OCR hint if sensible
  if (ocrHint && (WHITE_POOL.includes(ocrHint) || RED_POOL.includes(ocrHint))) {
    const isWhite = WHITE_POOL.includes(ocrHint);
    const more = isWhite ? ["Sauvignon Blanc","Riesling","Pinot Gris"] : ["Merlot","Syrah","Grenache"];
    return { label: ocrHint, distractors: more };
  }
  return { label: "Blend", distractors: ["Cabernet Sauvignon","Pinot Noir","Chardonnay"] };
}

/* ---------- Country & Region detection (OCR fallback) ---------- */
function detectCountryRegionFallback(textRaw: string) {
  const t = norm(textRaw);
  const countryRules: Array<[string, RegExp]> = [
    ["France", /(france|bordeaux|bourgogne|burgundy|loire|alsace|rhone|rhône|beaujolais|champagne|sancerre|chablis|côte|cote|chateau|appellation)/],
    ["Italy", /(italy|italia|toscana|chianti|barolo|barbaresco|piemonte|piedmont|veneto|sicilia|etna|prosecco|valpolicella|soave)/],
    ["Spain", /(spain|rioja|ribera\s+del\s+duero|priorat|r[íi]as?\s*baixas|cava|jerez|sherry)/],
    ["Germany", /(germany|deutschland|mosel|rheingau|pfalz|nahe|sp[äa]tlese|kabinett|trocken)/],
    ["Portugal", /(portugal|douro|dao|d[ãa]o|alentejo|vinho\s*verde|porto)/],
    ["USA", /(usa|united\s+states|american\s+viticultural|ava|california|napa|sonoma|oregon|washington|willamette|columbia\s+valley)/],
    ["Australia", /(australia|barossa|mclaren\s*vale|margaret\s*river|yarra\s*valley|clare\s*valley|coonawarra)/],
    ["New Zealand", /(new\s+zealand|marlborough|central\s+otago|hawke'?s\s+bay|nelson)/],
    ["Chile", /(chile|maipo|colchagua|casablanca|aconcagua|maule)/],
    ["Argentina", /(argentina|mendoza|salta|patagonia|uco\s*valley)/],
    ["South Africa", /(south\s+africa|stellenbosch|swartland|western\s+cape|walker\s+bay|paarl)/],
    ["Canada", /(canada|okanagan|niagara|ontario|british\s+columbia|bc)/],
    ["China", /(china|ningxia|xinjiang|yantai|shandong)/],
    ["India", /(india|nashik|nandi\s*hills|maharashtra|karnataka|baramati|akluj)/],
  ];

  let country: string | undefined;
  for (const [name, rx] of countryRules) if (rx.test(t)) { country = name; break; }

  // Burgundy force
  let regionFromBurgundy: string | undefined;
  let subregionFromBurgundy: string | null = null;
  if ([...BOURGOGNE_MARKERS, ...VILLAGES_BEaune, ...VILLAGES_Nuits].some(k => t.includes(k))) {
    country = "France";
    regionFromBurgundy = "Burgundy";
    if (VILLAGES_BEaune.some(v => t.includes(v))) subregionFromBurgundy = "Côte de Beaune";
    if (VILLAGES_Nuits.some(v => t.includes(v))) subregionFromBurgundy = "Côte de Nuits";
  }

  const isOldWorld =
    (!!country && OLD_WORLD.has(country.toLowerCase())) ||
    hasStrongFrenchCue(textRaw) ||
    /\b(france|italy|spain|germany|portugal|austria|greece|hungary|georgia)\b/i.test(textRaw);

  if (!country) country = isOldWorld ? "France" : "USA";

  const pool = REGION_POOLS[country] || [];
  let region: string | undefined =
    regionFromBurgundy ||
    pool.find(r => norm(textRaw).includes(norm(r))) ||
    (country === "France" && /\bbeaujolais\b/i.test(textRaw) ? "Beaujolais" : undefined) ||
    pool[0];

  let subregion: string | null = subregionFromBurgundy;
  if (!subregion && region === "Bordeaux") {
    if (/(pauillac|margaux|st[.\s-]*julien|st[.\s-]*est[eé]phe|m[ée]doc)/i.test(textRaw)) subregion = "Left Bank";
    else if (/(pomerol|saint[ -]?emilion)/i.test(textRaw)) subregion = "Right Bank";
  }
  if (!subregion && region === "Burgundy") {
    if (/c[oô]te\s+de\s+nuits/i.test(textRaw)) subregion = "Côte de Nuits";
    else if (/c[oô]te\s+de\s+beaune/i.test(textRaw)) subregion = "Côte de Beaune";
  }
  if (!subregion && region === "Napa Valley") {
    if (/(oakville|rutherford|st[.\s-]*helena|mount\s*veeder|howell\s*mountain)/i.test(textRaw)) subregion = "Oakville/Rutherford";
  }

  const newWorldList = ["USA","Australia","New Zealand","Chile","Argentina","South Africa","Canada","China","India"];
  const countryOptions = ensureFour(country, isOldWorld ? ["France","Italy","Spain","Germany","Portugal"] : newWorldList);
  const regionOptions  = ensureFour(region || pool[0] || "Burgundy", pool.filter(r => r !== region));

  let subregionOptions: string[] | null = null;
  if (subregion) {
    const SUBS: Record<string, string[]> = {
      Bordeaux: ["Left Bank","Right Bank","Graves","Entre-Deux-Mers"],
      Burgundy: ["Côte de Beaune","Côte de Nuits","Chablis","Côte Chalonnaise"],
      "Napa Valley": ["Oakville/Rutherford","St. Helena","Mount Veeder","Howell Mountain"],
      Rioja: ["Rioja Alta","Rioja Alavesa","Rioja Oriental"],
    };
    const poolS = SUBS[region || ""] || [];
    subregionOptions = ensureFour(subregion, poolS.filter(s => s !== subregion));
  }

  return {
    isOldWorld,
    countryCorrect: country,
    countryOptions,
    regionCorrect: region || pool[0] || "Burgundy",
    regionOptions,
    subregionCorrect: subregion,
    subregionOptions,
  };
}

/* ---------- Vintage detection ---------- */
function detectVintage(text: string) {
  const t = norm(text);
  const y = Array.from(t.matchAll(/\b(19|20)\d{2}\b/g)).map(m => Number(m[0]));
  const year = y.find(v => v >= 1980 && v <= new Date().getFullYear());
  const isNV = /\b(?:nv|non\s*-?\s*vintage)\b/.test(t);
  const now = new Date().getFullYear();
  if (isNV) return ["NV", String(now), String(now-1), String(now-2)];
  if (year)  return [String(year), String(year - 1), String(year + 1), "NV"];
  return ["NV", String(now), String(now-1), String(now-2)];
}

/* ---------- Build round payload from OCR (DB-first) ---------- */
async function buildRoundPayloadFromOCR(file: File): Promise<{ questions: StepQuestion[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(FN_OCR, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  const { text } = await res.json();

  // 1) Try DB
  const fromDB = await fetchGeoFromWineReference(text || "");

  // 2) Fallback to OCR heuristics
  const fall = detectCountryRegionFallback(text || "");

  const isOld = fromDB?.isOldWorld ?? fall.isOldWorld;
  const hemiCorrect = isOld ? 0 : 1;

  const countryCorrect = fromDB?.countryCorrect ?? fall.countryCorrect!;
  const regionCorrect  = fromDB?.regionCorrect  ?? fall.regionCorrect!;
  const countryOptions = fromDB?.countryOptions?.length ? fromDB.countryOptions : fall.countryOptions;
  const regionOptions  = fromDB?.regionOptions?.length  ? fromDB.regionOptions  : fall.regionOptions;
  const subregionOptions = fromDB?.subregionOptions ?? fall.subregionOptions;

  const vintageOpts = detectVintage(text || "");

  const vb = detectVarietyOrBlend(text || "", undefined, fromDB?.typicalVarieties);
  const varietyOpts = ensureFour(vb.label, vb.distractors);

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
  async function copy() { try { await navigator.clipboard.writeText(joinUrl); setCopied(true); setTimeout(()=>setCopied(false), 1500); } catch {} }
  async function share() { try { if (navigator.share) await navigator.share({ title: "Join my Wine Options game", text: `Use code ${inviteCode}`, url: joinUrl }); else await copy(); } catch {} }
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

function QuestionStepper({ round, me, onFinished }: { round: GameRound; me: Participant; onFinished: () => void; }) {
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
      await submitAnswer(round.id, me.id, selected, isCorrect).catch(() => {});
      if (isCorrect) await awardPoints(me.id, 10).catch(() => {});
    } finally {
      if (index < questions.length - 1) { setIndex(i => i + 1); setSelected(null); }
      else { onFinished(); }
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
      .from("session_participants").select("*")
      .eq("session_id", sessionId).order("joined_at", { ascending: true });
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
      .from("game_rounds").select("*")
      .eq("session_id", sessionId)
      .order("started_at", { ascending: false }).limit(1);
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

  useEffect(() => {
    if (!session?.id) return;
    const t = setInterval(() => {
      refetchParticipants(session.id).catch(() => {});
      refetchLatestRound(session.id).catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [session?.id]);

  // Auto-join if /join/:code
  useEffect(() => {
    const run = async () => {
      if (!initialCode || session) return;
      setLoading(true); setErr(null);
      try {
        const res = await fetch("/.netlify/functions/join-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invite_code: initialCode.trim().toUpperCase(), user_id: null, display_name: displayName || "Guest" }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { session: s, participant } = await res.json();
        setSession(s); setMe(participant); setCodeInput(s.invite_code);
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
      if (!uid) { setErr("Please sign in to host a game."); setLoading(false); return; }

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
        .from("session_participants").select("*")
        .eq("session_id", s.id)
        .or(`is_host.eq.true,user_id.eq.${uid}`).limit(1);
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
    setRound(null);
    setSession(s => (s ? { ...s, status: "finished" } as GameSession : s));
  }
  async function playAgain() {
    if (!session) return;
    // Re-open the session so the upload UI appears again
    await setSessionStatus(session.id, WRITE_STATUS["waiting"]);
    // Optimistic UI so everyone immediately sees the waiting screen
    setSession((s) => (s ? ({ ...s, status: "open" } as GameSession) : s));
    setRound(null);
  }

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

    {/* Host sees Play again; others see a waiting hint */}
    <div className="flex items-center justify-between">
      {!isHost ? (
        <div className="text-sm text-gray-600">Waiting for the host to play again…</div>
      ) : (
        <button
          onClick={playAgain}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-black text-white"
        >
          Play again
        </button>
      )}

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
