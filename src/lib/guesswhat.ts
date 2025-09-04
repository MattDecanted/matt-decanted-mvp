// src/lib/guesswhat.ts
import { supabase } from "@/lib/supabase";
import type {
  GuessWhatBankItem,
  GuessWhatAttempt,
  GuessWhatChallenge,
  GuessWhatResponse,
} from "@/types/guesswhat";

/* ---------------- Single-question Bank ---------------- */

export async function listActiveBankItems(locale?: string) {
  let q = supabase.from("guess_what_bank").select("*").eq("active", true).order("created_at", { ascending: false });
  if (locale) q = q.eq("locale", locale);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as GuessWhatBankItem[];
}

export async function getBankItemBySlug(slug: string, locale?: string) {
  let q = supabase.from("guess_what_bank").select("*").eq("slug", slug).maybeSingle();
  if (locale) q = q.eq("locale", locale);
  const { data, error } = await q;
  if (error) throw error;
  return (data || null) as GuessWhatBankItem | null;
}

export async function createAttempt(params: {
  userId: string;
  bankId: string;
  selectedIndex: number;
}) {
  const { userId, bankId, selectedIndex } = params;
  const { data, error } = await supabase
    .from("guess_what_attempts")
    .insert([{ user_id: userId, bank_id: bankId, selected_index: selectedIndex }])
    .select("*")
    .single();
  if (error) throw error;
  return data as GuessWhatAttempt;
}

/* ---------------- Weekly Challenges ---------------- */

export async function listPublishedChallenges() {
  const { data, error } = await supabase
    .from("guess_what_challenges")
    .select("*")
    .eq("is_published", true)
    .order("date", { ascending: false });
  if (error) throw error;
  // If your table stores JSON columns as text, parse them:
  return (data || []).map((row: any) => ({
    ...row,
    questions: typeof row.questions === "string" ? JSON.parse(row.questions) : row.questions,
    matts_answer: typeof row.matts_answer === "string" ? JSON.parse(row.matts_answer) : row.matts_answer,
    reveal_wine: typeof row.reveal_wine === "string" ? JSON.parse(row.reveal_wine) : row.reveal_wine,
  })) as GuessWhatChallenge[];
}

export async function saveChallengeResponse(payload: {
  userId: string;
  challengeId: string;
  answers: Record<number, number>;
  score: number;
}) {
  const { userId, challengeId, answers, score } = payload;
  const { data, error } = await supabase
    .from("guess_what_responses")
    .insert([{ user_id: userId, challenge_id: challengeId, answers, score }])
    .select("*")
    .single();
  if (error) throw error;
  return data as GuessWhatResponse;
}

/* ---------------- Video helper ---------------- */

export function toEmbedUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = u.hostname.includes("youtu.be")
        ? u.pathname.slice(1)
        : u.searchParams.get("v") ?? "";
      return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`;
    }
    return url;
  } catch {
    return url;
  }
}
