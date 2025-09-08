// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from "react";
import { supabase, setSessionFromHash } from "@/lib/supabase";

const POST_LOGIN_KEY = "md_post_login_to";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    // choose the best destination: stored "intended page" or /account
    const getDest = () => {
      let dest = `${window.location.origin}/account`;
      try {
        const stored = localStorage.getItem(POST_LOGIN_KEY);
        if (stored) {
          dest = `${window.location.origin}${stored.startsWith("/") ? stored : `/${stored}`}`;
          localStorage.removeItem(POST_LOGIN_KEY);
        }
      } catch {
        /* ignore */
      }
      return dest;
    };

    const go = () => {
      const dest = getDest();
      // Try multiple navigation strategies so we don't get stuck
      window.location.replace(dest);
      setTimeout(() => {
        window.location.href = dest;
      }, 400);
      setTimeout(() => {
        window.location.assign(dest);
      }, 1200);
    };

    // Don't let onboarding hang: race the RPC against a short timeout
    const bestEffortJoin = async () => {
      try {
        setMsg("Setting up your account…");
        const p = supabase.rpc("join_member", {
          p_plan: "free",
          p_start_trial: true,
          p_locale: (navigator.language || "en").slice(0, 2),
          // p_first_name: undefined,
          // p_country: undefined,
          // p_accept_tos: undefined,
          // p_accept_notifications: undefined,
        });
        await Promise.race([p, new Promise((r) => setTimeout(r, 1200))]);
      } catch (e) {
        // Never block redirect if RPC hiccups
        // eslint-disable-next-line no-console
        console.warn("[join_member] best-effort call failed:", e);
      }
    };

    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1) Implicit/hash (magic link): #access_token=... / #refresh_token=...
        if (url.hash.includes("access_token") || url.hash.includes("refresh_token")) {
          setMsg("Storing session…");
          await setSessionFromHash(); // also cleans the hash
          await bestEffortJoin();
          setMsg("Redirecting…");
          go();
          return;
        }

        // 2) PKCE: ?code=...
        const code = url.searchParams.get("code");
        if (code) {
          setMsg("Exchanging code…");
          // Works across supabase-js versions that accept a full URL
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          if (error) throw error;

          // Clean query so the app can’t mistake it for a fresh callback later
          window.history.replaceState({}, document.title, url.pathname + url.hash);

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
