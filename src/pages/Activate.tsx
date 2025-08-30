// src/pages/Activate.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Mail } from "lucide-react";

function parseHash(hash: string) {
  const h = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return {
    access_token: h.get("access_token"),
    refresh_token: h.get("refresh_token"),
    type: h.get("type"), // magiclink | signup | recovery
    error: h.get("error"),
    error_description: h.get("error_description"),
  };
}

export default function Activate() {
  const navigate = useNavigate();

  // UI state for the “request magic link” mode
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Callback handling state
  const [checking, setChecking] = React.useState(true);
  const [cbError, setCbError] = React.useState<string | null>(null);
  const [cbNote, setCbNote] = React.useState<string>("Checking link…");

  React.useEffect(() => {
    (async () => {
      // 1) Try tokens in hash (common for Supabase email links)
      const { access_token, refresh_token, type, error, error_description } = parseHash(
        window.location.hash
      );

      try {
        if (error) throw new Error(error_description || error);

        if (access_token && refresh_token) {
          const { error: sessErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessErr) throw sessErr;

          // best-effort: start 7-day trial
          try {
            await supabase.rpc("vv_start_trial", { p_days: 7 });
          } catch {
            /* non-fatal */
          }

          setCbNote(type === "magiclink" ? "Magic link verified. Redirecting…" : "Signed in. Redirecting…");
          setChecking(false);
          setTimeout(() => navigate("/dashboard"), 700);
          return;
        }

        // 2) Fallback: try `?code=` (PKCE style)
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchErr) throw exchErr;

          try {
            await supabase.rpc("vv_start_trial", { p_days: 7 });
          } catch {
            /* non-fatal */
          }

          setCbNote("Signed in. Redirecting…");
          setChecking(false);
          setTimeout(() => navigate("/dashboard"), 700);
          return;
        }

        // No tokens present → show request form
        setChecking(false);
      } catch (e: any) {
        setCbError(e?.message ?? "Link invalid or expired.");
        setChecking(false);
      }
    })();
  }, [navigate]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // IMPORTANT: redirect back to this page so we can complete the session.
          emailRedirectTo: `${window.location.origin}/activate`,
        },
      });
      if (error) throw error;
      setMsg("Check your email for a sign-in link.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send magic link.");
    } finally {
      setSending(false);
    }
  }

  // While we’re inspecting tokens
  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-brand-blue">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Activate</h1>
          <p className={cbError ? "text-red-600" : "text-gray-600"}>{cbError ?? cbNote}</p>
        </div>
      </div>
    );
  }

  // No tokens → show “send magic link” form
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <form
        onSubmit={sendMagicLink}
        className="w-full max-w-sm bg-white shadow-[0_8px_30px_rgba(0,0,0,.06)] border rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-brand-blue">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Activate / Create Account</h1>
            <p className="text-xs text-gray-500">We’ll email you a secure magic link.</p>
          </div>
        </div>

        {msg && (
          <div className="text-sm p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            {msg}
          </div>
        )}
        {err && (
          <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
            {err}
          </div>
        )}

        <label className="block">
          <span className="text-sm text-gray-700">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-lg bg-brand-blue text-white py-2 font-semibold hover:opacity-95 disabled:opacity-60"
          disabled={sending}
        >
          {sending ? "Sending…" : "Send magic link"}
        </button>

        <p className="text-xs text-gray-500">
          Clicking the link will sign you in and activate your account.
        </p>

        <button
          type="button"
          className="w-full text-sm text-gray-700 underline"
          onClick={() => navigate("/signin")}
        >
          Prefer password? Sign in
        </button>
      </form>
    </div>
  );
}
