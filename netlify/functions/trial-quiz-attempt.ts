// netlify/functions/trial-quiz-attempt.ts
import type { Handler } from "@netlify/functions";
import { admin } from "./_supabaseAdmin";

// ---------------- CORS ----------------
const CORS_BASE = { "access-control-allow-origin": "*" };
const CORS_JSON = { ...CORS_BASE, "content-type": "application/json" };
const CORS_PRE = {
  ...CORS_BASE,
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
};

// Pull user id from Supabase JWT (if sent as Bearer token)
async function getUserIdFromAuth(authorization?: string): Promise<string | null> {
  if (!authorization) return null;
  const [, token] = authorization.split(" ");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error) return null;
  return data.user?.id ?? null;
}

// Adelaide "now" as ISO string (for trial start)
function adelaideNowISO(): string {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Australia/Adelaide" })
  ).toISOString();
}

type QuizQuestion = {
  q: string;
  options: string[];
  correct_index: number;
};

// ---------------- Handler ----------------
export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_PRE, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_JSON,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const quiz_id = body.quiz_id as string;
    const selections = body.selections as number[];
    const bodyUserId = body.user_id as string | undefined;
    const locale = (body.locale as string) || "en";

    if (!quiz_id || !Array.isArray(selections)) {
      return {
        statusCode: 400,
        headers: CORS_JSON,
        body: JSON.stringify({ error: "Missing quiz_id or selections" }),
      };
    }

    // Prefer Supabase JWT (Authorization: Bearer <access_token>), else fall back to body user_id
    const authHeader =
      (event.headers.authorization ||
        (event.headers as any).Authorization) as string | undefined;

    const userIdFromJwt = await getUserIdFromAuth(authHeader);
    const user_id = userIdFromJwt ?? bodyUserId ?? null;

    if (!user_id) {
      return {
        statusCode: 401,
        headers: CORS_JSON,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    // Load quiz (with answers) to score on the server
    const { data: quiz, error: qErr } = await admin
      .from("trial_quizzes")
      .select("id, for_date, locale, questions, points_award, is_published")
      .eq("id", quiz_id)
      .eq("is_published", true)
      .single();

    if (qErr || !quiz) {
      return {
        statusCode: 404,
        headers: CORS_JSON,
        body: JSON.stringify({ error: "Quiz not found" }),
      };
    }

    // Prevent duplicate attempt for the same day (for_date is DATE)
    const { data: existing } = await admin
      .from("trial_quiz_attempts")
      .select("id, correct_count, points_awarded")
      .eq("user_id", user_id)
      .eq("for_date", quiz.for_date)
      .eq("locale", locale || quiz.locale)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 200,
        headers: CORS_JSON,
        body: JSON.stringify({
          alreadyAttempted: true,
          correct: existing.correct_count,
          points: existing.points_awarded,
        }),
      };
    }

    // Score the submission
    const questions = (quiz.questions || []) as QuizQuestion[];
    const max = Math.min(questions.length, selections.length);
    let correct = 0;
    for (let i = 0; i < max; i++) {
      if (selections[i] === questions[i].correct_index) correct++;
    }

    const points = correct > 0 ? (quiz.points_award ?? 0) : 0;

    // Record attempt
    await admin.from("trial_quiz_attempts").insert({
      user_id,
      locale: locale || quiz.locale,
      for_date: quiz.for_date, // DATE
      correct_count: correct,
      points_awarded: points,
      source: "web",
      utm: null,
      affiliate_code: null,
    });

    // Ensure a profile row exists (use UPSERT; v2 has no .onConflict().ignore() chain)
    await admin
      .from("profiles")
      .upsert({ user_id, locale }, { onConflict: "user_id" });

    // Write to points_ledger if points earned, and start trial if not started
    let trialStarted = false;

    if (points > 0) {
      await admin.from("points_ledger").insert({
        user_id,
        points,
        reason: "trial_quiz",
        meta: { quiz_id, for_date: quiz.for_date, locale, correct },
      });

      // Start 7-day trial on first award (only if not already started)
      const { data: updated, error: trialErr } = await admin
        .from("profiles")
        .update({ trial_started_at: adelaideNowISO() })
        .eq("user_id", user_id)
        .is("trial_started_at", null)
        .select("user_id"); // returns [] if nothing updated

      if (trialErr) {
        console.error("Failed to set trial_started_at:", trialErr.message);
      } else {
        trialStarted = Array.isArray(updated) ? updated.length > 0 : !!updated;
      }
    }

    return {
      statusCode: 200,
      headers: CORS_JSON,
      body: JSON.stringify({ correct, points, trialStarted }),
    };
  } catch (e: any) {
    console.error(e);
    return {
      statusCode: 500,
      headers: CORS_JSON,
      body: JSON.stringify({ error: e?.message || "Server error" }),
    };
  }
};

export default handler;
