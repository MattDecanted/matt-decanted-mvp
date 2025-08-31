import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { handleAuthRedirect, supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { search, hash } = useLocation();
  const [msg, setMsg] = useState("Setting your session and finishing up…");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) Parse & store session from URL (works for #access_token and ?code)
        await handleAuthRedirect();

        // 2) Verify we actually have a session
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data?.session) throw new Error("No session found after auth redirect");

        setMsg("Signed in. Redirecting…");

        const redirectTo = localStorage.getItem("redirectTo") || "/";
        localStorage.removeItem("redirectTo");
        navigate(redirectTo, { replace: true });
      } catch (e: any) {
        console.error("Auth callback error:", e);
        setErr(e?.message || "Unexpected error");
        setMsg("We couldn’t complete sign-in.");
      }
    })();
  }, [hash, search, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="rounded-xl border px-6 py-5 text-center shadow-sm">
        <div className="text-lg font-semibold">Signing you in…</div>
        <div className="mt-1 text-sm text-gray-600">{msg}</div>
        {err && <div className="mt-3 text-sm text-red-600">Error: {err}</div>}
      </div>
    </div>
  );
}
