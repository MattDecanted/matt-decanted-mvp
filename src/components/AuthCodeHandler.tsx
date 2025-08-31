// src/components/AuthCodeHandler.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCodeHandler() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);

    // let dedicated page own /auth/callback
    if (url.pathname.startsWith("/auth/callback")) return;

    const code = url.searchParams.get("code");
    const type = url.searchParams.get("type");
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");

    // recovery anywhere → normalize to callback page
    if (type === "recovery") {
      navigate(`/auth/callback?type=recovery${code ? `&code=${code}` : ""}`, { replace: true });
      return;
    }

    if (code) {
      (async () => {
        const { error } = await supabase.auth.exchangeCodeForSession(url.href);
        window.history.replaceState({}, document.title, url.pathname);
        if (error) navigate("/login?auth=error", { replace: true });
        else navigate("/account", { replace: true });
      })();
      return;
    }

    if (access_token && refresh_token) {
      (async () => {
        // fallback if getSessionFromUrl is missing
        const anyAuth = (supabase.auth as any);
        let error: any = null;
        if (typeof anyAuth.getSessionFromUrl === 'function') {
          ({ error } = await anyAuth.getSessionFromUrl({ storeSession: true }));
        } else {
          ({ error } = await supabase.auth.setSession({ access_token, refresh_token }));
        }
        window.history.replaceState({}, document.title, url.pathname + url.search);
        if (error) navigate("/login?auth=error", { replace: true });
        else navigate("/account", { replace: true });
      })();
    }
  }, [loc.pathname, loc.search, navigate]);

  return null;
}
