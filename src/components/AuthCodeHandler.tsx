import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, setSessionFromUrlFragment as setSessionFromHashStrict } from "@/lib/supabase";

export default function AuthCodeHandler() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);

    // Let /auth/callback own its own flow
    if (url.pathname.startsWith("/auth/callback")) return;

    const code = url.searchParams.get("code");
    const type = url.searchParams.get("type");
    const hasHash = url.hash.includes("access_token");

    // Normalize recovery to /auth/callback
    if (type === "recovery") {
      navigate(`/auth/callback?type=recovery${code ? `&code=${code}` : ""}`, { replace: true });
      return;
    }

    if (code) {
      (async () => {
        const { error } = await supabase.auth.exchangeCodeForSession(url.href);
        window.history.replaceState({}, document.title, url.pathname); // clean
        if (error) navigate("/signin?auth=error", { replace: true });
        else navigate("/account", { replace: true });
      })();
      return;
    }

    if (hasHash) {
      (async () => {
        try {
          await setSessionFromHashStrict();
          navigate("/account", { replace: true });
        } catch {
          navigate("/signin?auth=error", { replace: true });
        }
      })();
    }
  }, [loc.pathname, loc.search, navigate]);

  return null;
}
