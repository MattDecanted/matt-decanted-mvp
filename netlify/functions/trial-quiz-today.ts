// netlify/functions/trial-quiz-today.ts
import type { Handler } from "@netlify/functions";
import { admin } from "./_supabaseAdmin";

/** Get YYYY-MM-DD in Australia/Adelaide */
function adelaideDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Adelaide",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // en-CA -> YYYY-MM-DD
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const locale = (event.queryStringParameters?.locale || "en").toString();
    const for_date = adelaideDate();

    const { data, error } = await admin
      .from("trial_quizzes")
      .select("id, title, questions, points_award")
      .eq("locale", locale)
      .eq("for_date", for_date)
      .eq("is_published", true)
      .single();

    if (error || !data) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
        body: JSON.stringify({ error: "Quiz not found for today", locale, for_date }),
      };
    }

    // Strip correct_index so answers aren't leaked to the client
    const safeQuestions = (data.questions as any[]).map((q) => ({
      q: q.q,
      options: q.options,
    }));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({
        id: data.id,
        locale,
        for_date,
        title: data.title,
        questions: safeQuestions,
        points_award: data.points_award,
      }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ error: e.message || "Internal error" }),
    };
  }
};
