// netlify/functions/trial-quiz-today.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,HEAD,OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
};

function adelaideDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Adelaide",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors };
  }
  // Only GET/HEAD supported
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
  }

  const headers = { ...cors, "content-type": "application/json" };

  try {
    const locale = event.queryStringParameters?.locale || "en";
    const for_date = adelaideDate();

    const url = process.env.VITE_SUPABASE_URL!;
    const anon = process.env.VITE_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing Supabase env vars" }),
      };
    }

    const supabase = createClient(url, anon);

    const { data, error } = await supabase
      .from("trial_quizzes")
      .select(
        "id, locale, for_date, title, questions, points_award, is_published"
      )
      .eq("for_date", for_date)
      .eq("locale", locale)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message }),
      };
    }

    if (!data) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ status: "no_quiz" }),
      };
    }

    // Strip answers; do not leak correct_index
    const sanitized = {
      id: data.id,
      locale: data.locale,
      for_date: data.for_date,
      title: data.title,
      points_award: data.points_award,
      questions: (data.questions ?? []).map((q: any) => ({
        q: q.q,
        options: q.options,
      })),
    };

    return { statusCode: 200, headers, body: JSON.stringify(sanitized) };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e?.message || "server_error" }),
    };
  }
};
