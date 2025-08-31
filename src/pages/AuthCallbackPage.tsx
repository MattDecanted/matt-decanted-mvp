import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase, setSessionFromHash } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { search, hash } = useLocation();
  const [message, setMessage] = useState("Setting your session and finishing up…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) If we have #access_token=… (implicit link), use your helper
        if (hash.includes("access_token")) {
          await setSessionFromHash(); // writes session + cleans hash (your lib)
        }

        // 2) If we have ?code=… (PKCE), exchange it
        const params = new URLSearchParams(search);
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // clean the query string for neatness
          const loc = new URL(window.location.href);
          window.history.replaceState({}, document.title, loc.pathname);
        }

        // 3) Confirm we actually have a session
        const { data, error: getErr } = await supabase.auth.getSession();
        if (getErr) throw getErr;
        if (!data?.session) {
          throw new Error("No session found after auth redirect");
        }

        setMessage("Signed in. Redirecting…");

        // Optional: if you stored a desired redirect in localStorage, use it
        const redirectTo = localStorage.getItem("redirectTo") || "/";
        localStorage.removeItem("redirectTo");

        // 4) Navigate away so we don’t sit on a spinner forever
        navigate(redirectTo, { replace: true });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Unexpected error");
        setMessage("We couldn’t complete sign-in.");
      }
    })();
  }, [hash, search, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="rounded-xl border px-6 py-5 text-center shadow-sm">
        <div className="text-lg font-semibold">Signing you in…</div>
        <div className="mt-1 text-sm text-gray-600">{message}</div>
        {error && <div className="mt-3 text-sm text-red-600">Error: {error}</div>}
      </div>
    </div>
  );
}
