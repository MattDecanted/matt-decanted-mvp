// src/components/AuthCodeHandler.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/**
 * Safety net: completes auth on ANY route (except /auth/callback).
 * Handles:
 *  - PKCE (?code=...)
 *  - Recovery (?type=recovery)
 *  - Legacy implicit flow (#access_token=...)
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

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const hashError =
      hashParams.get("error") || hashParams.get("error_description");

    // 0) Provider-sent hash error
    if (hashError) {
      // Clean the URL (remove hash)
      window.history.replaceState({}, document.title, url.pathname + url.search);
      navigate("/login?auth=error", { replace: true });
      return;
    }

    // 1) Recovery anywhere → centralize on callback page
    if (type === "recovery") {
      navigate(`/auth/callback?type=recovery${code ? `&code=${code}` : ""}`, {
        replace: true,
      });
      return;
    }

    // 2) PKCE anywhere: ?code=...
    if (code) {
      (async () => {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          // Clean the URL (remove query)
          window.history.replaceState({}, document.title, url.pathname);
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
      return;
    }

    // 3) Legacy implicit flow anywhere: #access_token=...
    if (accessToken) {
      (async () => {
        try {
          const { error } = await supabase.auth.getSessionFromUrl({
            storeSession: true,
          });
          // Clean the URL (remove hash)
          window.history.replaceState({}, document.title, url.pathname + url.search);
          if (error) {
            console.error("getSessionFromUrl (global) error:", error);
            navigate("/login?auth=error", { replace: true });
          } else {
            navigate("/account", { replace: true });
          }
        } catch (e) {
          console.error("AuthCodeHandler fatal (hash):", e);
          navigate("/login?auth=error", { replace: true });
        }
      })();
      return;
    }

    // else: nothing to do
  }, [loc.pathname, loc.search, navigate]);

  return null;
}
