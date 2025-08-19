// netlify/functions/trial-quiz-attempt.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// --- CORS helpers (allow browser POSTs) ---
const base = { "access-control-allow-origin": "*" };
const corsJSON = { ...base, "content-type": "application/json" };
const corsPre = {
  ...base,
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
};

// --- Admin (service-role) Supabase client ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("Missing Supabase env vars on server");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return new Response("", { status: 204, headers: corsPre });
  }
  if (event.httpMethod !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: corsJSON,
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { quiz_id, user_id, selections, locale = "en" } = body;

    if (!quiz_id || !user_id || !Array.isArray(selections)) {
      return new Response(JSON.stringify({ error: "Bad Request" }), {
        status: 400,
        headers: corsJSON,
      });
    }

    // Fetch the quiz WITH answers so we can score server-side
    const { data: quiz, error: qErr } = await admin
      .from("trial_quizzes")
      .select("id, for_date, locale, questions, points_award")
      .eq("id", quiz_id)
      .single();

    if (qErr || !quiz) {
      return new Response(JSON.stringify({ error: "Quiz not found" }), {
        status: 404,
        headers: corsJSON,
      });
    }

    // Prevent double-claim for same day
    const { data: already } = await admin
      .from("trial_quiz_attempts")
      .select("id")
      .eq("user_id", user_id)
      .eq("for_date", quiz.for_date)
      .maybeSingle();

    if (already) {
      return new Response(JSON.stringify({ alreadyAttempted: true }), {
        status: 200,
        headers: corsJSON,
      });
    }

    // Score
    const correct = (quiz.questions || []).reduce(
      (acc: number, q: any, i: number) => acc + (q?.correct_index === selections[i] ? 1 : 0),
      0
    );
    const points = quiz.points_award ?? 0;

    // Record attempt
    await admin.from("trial_quiz_attempts").insert({
      user_id,
      locale: locale || quiz.locale,
      for_date: quiz.for_date,
      correct_count: correct,
      points_awarded: points,
      source: "mvp",
      utm: null,
      affiliate_code: null,
    });

    // Award points
    await admin.from("points_ledger").insert({
      user_id,
      points,
      reason: "trial_quiz",
      meta: { quiz_id },
    });

    return new Response(JSON.stringify({ correct, points }), {
      status: 200,
      headers: corsJSON,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Server error" }),
      { status: 500, headers: corsJSON }
    );
  }
};

export default handler;
