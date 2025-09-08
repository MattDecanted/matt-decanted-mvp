// src/lib/supabase.ts
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient = createClient(url, anon, {
  auth: {
    persistSession: true,       // keep user signed in (localStorage)
    autoRefreshToken: true,     // refresh JWT automatically
    detectSessionInUrl: false,  // we'll manually parse the URL
    flowType: "implicit",       // your current email magic-link style
    storageKey: "md_auth_v1",   // namespaced storage key
  },
});

// Helpful runtime breadcrumb + console access for debugging
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.log("[supabase.init]", { url, anon_prefix: anon?.slice(0, 6) });
  (window as any).SB = supabase; // e.g. SB.auth.getSession() in DevTools
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
  const hp  = new URLSearchParams(loc.hash.replace(/^#/, ""));

  const err = hp.get("error") || hp.get("error_description");
  if (err) throw new Error(decodeURIComponent(err));

  const access_token  = hp.get("access_token") || undefined;
  const refresh_token = hp.get("refresh_token") || undefined;
  const expires_in    = Number(hp.get("expires_in") || "3600");
  const token_type    = (hp.get("token_type") || "bearer") as "bearer";

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

/** Complete auth from PKCE (?code=…) if you ever switch to it or use OAuth. */
export async function exchangeCodeFromUrl(
  href: string = (typeof window !== "undefined" ? window.location.href : "")
): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  const u = new URL(href);
  const code = u.searchParams.get("code");
  if (!code) return null;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;

  // Clean query
  window.history.replaceState({}, document.title, u.pathname);

  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Try hash first (your current emails), then PKCE. Returns the session or null. */
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
