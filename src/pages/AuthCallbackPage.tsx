// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from "react";
import { supabase, setSessionFromHash } from "@/lib/supabase";

const POST_LOGIN_KEY = "md_post_login_to";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    const getDest = () => {
      let dest = `${window.location.origin}/account`;
      try {
        const stored = localStorage.getItem(POST_LOGIN_KEY);
        if (stored) {
          dest = `${window.location.origin}${stored.startsWith("/") ? stored : `/${stored}`}`;
          localStorage.removeItem(POST_LOGIN_KEY);
        }
      } catch {}
      return dest;
    };

    const go = () => {
      const dest = getDest();
      // Multiple navigation strategies so we don't get stuck in SPA history
      window.location.replace(dest);
      setTimeout(() => { window.location.href = dest; }, 400);
      setTimeout(() => { window.location.assign(dest); }, 1200);
    };

    // Best-effort onboarding; never blocks redirect
    const bestEffortJoin = async () => {
      try {
        setMsg("Setting up your account…");
        const p = supabase.rpc("join_member", {
          p_plan: "free",
          p_start_trial: true,
          p_locale: (navigator.language || "en").slice(0, 2),
        });
        await Promise.race([p, new Promise((r) => setTimeout(r, 1200))]);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[join_member] best-effort call failed:", e);
      }
    };

    const tryPkce = async (href: string) => {
      // Some supabase-js versions accept full URL; others expect the raw code.
      const url = new URL(href);
      const code = url.searchParams.get("code");
      if (!code) return false;

      setMsg("Exchanging code…");
      try {
        const a = await supabase.auth.exchangeCodeForSession(url.href as any);
        if (a?.error) throw a.error;
      } catch (e1) {
        const b = await supabase.auth.exchangeCodeForSession(code as any);
        if (b?.error) throw b.error;
      }

      // Clean the querystring (keep any hash intact)
      window.history.replaceState({}, document.title, url.pathname + url.hash);
      return true;
    };

    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1) Implicit/hash (magic link): #access_token=... / #refresh_token=...
        if (url.hash.includes("access_token") || url.hash.includes("refresh_token")) {
          setMsg("Storing session…");
          await setSessionFromHash(); // cleans the hash internally
          await bestEffortJoin();
          setMsg("Redirecting…");
          go();
          return;
        }

        // 2) PKCE (?code=...)
        const didPkce = await tryPkce(url.href);
        if (didPkce) {
          await bestEffortJoin();
          setMsg("Redirecting…");
          go();
          return;
        }

        // 3) Nothing useful in URL → back to sign in
        setMsg("Missing token. Please request a new link.");
        window.location.replace(`${window.location.origin}/signin?auth=missing`);
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error("[AuthCallbackPage] error:", e);
        setMsg(e?.message || "Could not sign you in.");
        window.location.replace(`${window.location.origin}/signin?auth=error`);
      }
    })();
  }, []);

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 text-center">
        <div className="font-semibold mb-1">Signing you in…</div>
        <div className="text-sm text-gray-600">{msg}</div>
      </div>
    </div>
  );
}
