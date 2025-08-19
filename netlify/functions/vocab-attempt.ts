import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const h = { "access-control-allow-origin": "*", "content-type": "application/json" };
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE!;
const admin = createClient(url, key);

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { ...h, "access-control-allow-methods": "POST,OPTIONS" }, body: "" };
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: h, body: JSON.stringify({ error: "Method Not Allowed" }) };

  try {
    const { user_id, selection } = JSON.parse(event.body || "{}");
    if (!user_id || typeof selection !== "number") return { statusCode: 400, headers: h, body: JSON.stringify({ error: "Bad Request" }) };

    // get today’s vocab
    const adlToday = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Adelaide" });
    const { data: v } = await admin
      .from("daily_vocab")
      .select("id, for_date, correct_index, points_award")
      .eq("for_date", adlToday)
      .maybeSingle();

    if (!v) return { statusCode: 404, headers: h, body: JSON.stringify({ error: "Not found" }) };

    // prevent double
    const { data: already } = await admin
      .from("points_ledger")
      .select("id")
      .eq("user_id", user_id)
      .eq("reason", "vocab_daily")
      .contains("meta", { for_date: v.for_date })
      .maybeSingle();
    if (already) return { statusCode: 200, headers: h, body: JSON.stringify({ alreadyAttempted: true }) };

    const correct = v.correct_index === selection ? 1 : 0;
    const points = correct ? (v.points_award ?? 5) : 0;

    // award (and log attempt by points_ledger only, keep it simple)
    if (points > 0) {
      await admin.from("points_ledger").insert({
        user_id, points, reason: "vocab_daily", meta: { for_date: v.for_date, vocab_id: v.id }
      });
    }

    return { statusCode: 200, headers: h, body: JSON.stringify({ correct, points }) };
  } catch (e: any) {
    return { statusCode: 500, headers: h, body: JSON.stringify({ error: e?.message || "Server error" }) };
  }
};
