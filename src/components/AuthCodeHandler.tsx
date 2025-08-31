import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/**
 * Safety net: if the user lands on ANY route with ?code=... (PKCE)
 * or ?type=recovery, complete the auth flow and route them correctly.
 * Skips /auth/callback so your dedicated page handles it there.
 */
export default function AuthCodeHandler() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);

    // Let the dedicated page handle /auth/callback
    if (url.pathname.startsWith("/auth/callback")) return;

    const code = url.searchParams.get("code");
    const type = url.searchParams.get("type");

    // Handle password recovery anywhere → centralize on callback page
    if (type === "recovery") {
      navigate(`/auth/callback?type=recovery${code ? `&code=${code}` : ""}`, {
        replace: true,
      });
      return;
    }

    // If no PKCE code, nothing to do
    if (!code) return;

    (async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(url.href);
        if (error) {
          console.error("exchangeCodeForSession (global) error:", error);
          navigate("/login?auth=error", { replace: true });
        } else {
          navigate("/account", { replace: true });
        }
      } catch (e) {
        console.error("AuthCodeHandler fatal:", e);
        navigate("/login?auth=error", { replace: true });
      }
    })();
  }, [loc.pathname, loc.search, navigate]);

  return null;
}
