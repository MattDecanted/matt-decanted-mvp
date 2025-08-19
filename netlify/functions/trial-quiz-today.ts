import type { Handler } from "@netlify/functions";
import { admin } from "./_supabaseAdmin";

function adelaideDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Adelaide", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

async function getUserIdFromAuth(authorization?: string): Promise<string | null> {
  if (!authorization) return null;
  const [, token] = authorization.split(" ");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user?.id ?? null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    }};
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const headers = { "content-type": "application/json", "access-control-allow-origin": "*" };
  try {
    const body = JSON.parse(event.body || "{}");
    const quiz_id = body.quiz_id as string;
    const selections = body.selections as number[];
    const locale = (body.locale as string) || "en";
    const for_date = (body.for_date as string) || adelaideDate();
    const userIdFromBody = body.user_id as string | undefined;

    const authHeader = (event.headers.authorization || event.headers.Authorization) as string | undefined;
    const userIdFromJwt = await getUserIdFromAuth(authHeader);
    const user_id = userIdFromJwt ?? userIdFromBody ?? null;

    if (!quiz_id || !Array.isArray(selections) || !user_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing quiz_id, selections, or user_id" }) };
    }

    // Prevent double-award
    const { data: existing } = await admin
      .from("trial_quiz_attempts")
      .select("id, correct_count, points_awarded")
      .eq("user_id", user_id).eq("for_date", for_date).eq("locale", locale)
      .maybeSingle();
    if (existing) {
      return { statusCode: 200, headers, body: JSON.stringify({
        alreadyAttempted: true, correct: existing.correct_count, points: existing.points_awarded
      })};
    }

    // Load quiz with answers
    const { data: quiz, error: qErr } = await admin
      .from("trial_quizzes")
      .select("questions, points_award")
      .eq("id", quiz_id).eq("for_date", for_date).eq("locale", locale).eq("is_published", true)
      .single();
    if (qErr || !quiz) return { statusCode: 404, headers, body: JSON.stringify({ error: "Quiz not found" }) };

    const questions = quiz.questions as Array<{ q: string; options: string[]; correct_index: number }>;
    const max = Math.min(questions.length, selections.length);
    let correct = 0;
    for (let i = 0; i < max; i++) if (selections[i] === questions[i].correct_index) correct++;

    const points = correct > 0 ? quiz.points_award : 0;

    await admin.from("trial_quiz_attempts").insert({
      user_id, locale, for_date, correct_count: correct, points_awarded: points, source: "web"
    });

    if (points > 0) {
      await admin.from("points_ledger").insert({
        user_id, points, reason: "trial_quiz", meta: { for_date, correct, locale, quiz_id }
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ correct, points }) };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e?.message || "Internal error" }) };
  }
};
