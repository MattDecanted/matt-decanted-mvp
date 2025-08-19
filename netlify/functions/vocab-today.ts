import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = { "access-control-allow-origin": "*", "content-type": "application/json" };
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE!;

const admin = createClient(url, key);

export const handler: Handler = async () => {
  const { data, error } = await admin
    .from("daily_vocab")
    .select("id, locale, for_date, term, question, options, points_award")
    .eq("for_date", new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Adelaide" }))
    .maybeSingle();

  if (error || !data) return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
  return { statusCode: 200, headers, body: JSON.stringify(data) };
};
