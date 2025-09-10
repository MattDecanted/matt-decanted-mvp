// src/lib/supabase.ts
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient = createClient(url, anon, {
  auth: {
    persistSession: true,       // keep user signed in (localStorage)
    autoRefreshToken: true,     // refresh JWT automatically
    detectSessionInUrl: false,  // we complete auth manually below
    // @ts-expect-error: 'flowType' exists in newer supabase-js; safe to include
    flowType: "implicit",       // current email magic-link style
    storageKey: "md_auth_v1",   // namespaced storage key
  },
});

// Helpful runtime breadcrumb + global console access for debugging
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.log("[supabase.init]", { url, anon_prefix: anon?.slice(0, 6) });

  // Expose for devtools usage (both aliases):
  (window as any).SB = supabase;
  (window as any).supabase = supabase;

  // Small helper kit for quick checks in the console:
  (window as any).sw = {
    whoami: async () => (await supabase.auth.getUser()).data.user,
    wordsBetween: async (fromYmd: string, toYmd: string) =>
      supabase
        .from("swirdle_words")
        .select("id, word, date_scheduled, is_published")
        .gte("date_scheduled", fromYmd)
        .lte("date_scheduled", toYmd)
        .order("date_scheduled", { ascending: true })
        .range(0, 9999),
    sept: async () =>
      (window as any).sw.wordsBetween("2025-09-01", "2025-09-30"),
  };
}

/** True if current URL contains auth info we can consume. */
export function isAuthUrl(
  href: string = (typeof window !== "undefined" ? window.location.href : "")
): boolean {
  try {
    if (!href) return false;
    const u = new URL(href);
    const code = u.searchParams.get("code"); // PKCE/code path (OAuth etc.)
    const hp = new URLSearchParams(u.hash.replace(/^#/, "")); // implicit/hash
    return Boolean(code || hp.get("access_token") || hp.get("refresh_token"));
  } catch {
    return false;
  }
}

/** Complete auth from an implicit/hash magic link: #access_token=…&refresh_token=… */
export async function setSessionFromHash(
  href: string = (typeof window !== "undefined" ? window.location.href : "")
): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  const loc = new URL(href);
  const hp = new URLSearchParams(loc.hash.replace(/^#/, ""));

  const err = hp.get("error") || hp.get("error_description");
  if (err) throw new Error(decodeURIComponent(err));

  const access_token = hp.get("access_token") || undefined;
  const refresh_token = hp.get("refresh_token") || undefined;
  const expires_in = Number(hp.get("expires_in") || "3600");
  const token_type = (hp.get("token_type") || "bearer") as "bearer";

  if (!access_token || !refresh_token) return null;

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
    expires_in,
    token_type,
  });
  if (error) throw error;

  // Clean hash
  window.history.replaceState({}, document.title, loc.pathname + loc.search);

  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Complete auth from PKCE (?code=…) — tries href then code for broad version support. */
export async function exchangeCodeFromUrl(
  href: string = (typeof window !== "undefined" ? window.location.href : "")
): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  const u = new URL(href);
  const code = u.searchParams.get("code");
  if (!code) return null;

  let err1: any = null;
  let err2: any = null;

  // Try full URL first
  try {
    const r1 = await (supabase.auth as any).exchangeCodeForSession(u.href);
    if (r1?.error) throw r1.error;
  } catch (e) {
    err1 = e;
    // Fallback: try just the code
    try {
      const r2 = await (supabase.auth as any).exchangeCodeForSession(code);
      if (r2?.error) throw r2.error;
    } catch (e2) {
      err2 = e2;
    }
  }

  if (err1 && err2) {
    throw (err2 || err1);
  }

  // Clean query
  window.history.replaceState({}, document.title, u.pathname);

  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Try hash first (your current magic-link flow), then PKCE. */
export async function completeAuthFromUrl(href?: string): Promise<Session | null> {
  const s1 = await setSessionFromHash(href);
  if (s1) return s1;
  const s2 = await exchangeCodeFromUrl(href);
  return s2;
}

/* ---------- Back-compat aliases so older imports don't break ---------- */
export async function setSessionFromUrlFragment() {
  return setSessionFromHash();
}
export async function setSessionFromHashStrict() {
  return setSessionFromHash();
}
