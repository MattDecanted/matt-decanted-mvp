// netlify/functions/trial-quiz-attempt.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// CORS helpers
const base = { "access-control-allow-origin": "*" };
const corsJSON = { ...base, "content-type": "application/json" };
const corsPre = {
  ...base,
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
};

// Use server env (prefer SUPABASE_URL if you set it; fallback to VITE_ for now)
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  // Throwing here will produce a Netlify error page; instead, return JSON
  console.error("Missing Supabase env vars on server");
}

const admin = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE)
  : null;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsPre, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsJSON,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    if (!admin) {
      return {
        statusCode: 500,
        headers: corsJSON,
        body: JSON.stringify({ error: "Server misconfig: Supabase env" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { quiz_id, user_id, selections, locale = "en" } = body;

    if (!quiz_id || !user_id || !Array.isArray(selections)) {
      return {
        statusCode: 400,
        headers: corsJSON,
        body: JSON.stringify({ error: "Bad Request" }),
      };
    }

    // Fetch the quiz (with answers) to score server-side
    const { data: quiz, error: qErr } = await admin
      .from("trial_quizzes")
      .select("id, for_date, locale, questions, points_award")
      .eq("id", quiz_id)
      .single();

    if (qErr || !quiz) {
      return {
        statusCode: 404,
        headers: corsJSON,
        body: JSON.stringify({ error: "Quiz not found" }),
      };
    }

    // Prevent duplicate attempt same day
    const { data: already } = await admin
      .from("trial_quiz_attempts")
      .select("id")
      .eq("user_id", user_id)
      .eq("for_date", quiz.for_date)
      .maybeSingle();

    if (already) {
      return {
        statusCode: 200,
        headers: corsJSON,
        body: JSON.stringify({ alreadyAttempted: true }),
      };
    }

    // Score answers
    const correct = (quiz.questions || []).reduce(
      (acc: number, q: any, i: number) =>
        acc + (q?.correct_index === selections[i] ? 1 : 0),
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

    return {
      statusCode: 200,
      headers: corsJSON,
      body: JSON.stringify({ correct, points }),
    };
  } catch (e: any) {
    console.error(e);
    return {
      statusCode: 500,
      headers: corsJSON,
      body: JSON.stringify({ error: e?.message || "Server error" }),
    };
  }
};

export default handler;
