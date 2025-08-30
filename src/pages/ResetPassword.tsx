import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, ShieldCheck } from "lucide-react";

function parseHash(hash: string) {
  const h = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return {
    access_token: h.get("access_token"),
    refresh_token: h.get("refresh_token"),
    type: h.get("type"), // recovery | magiclink | signup
    error: h.get("error"),
    error_description: h.get("error_description"),
  };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [phase, setPhase] = React.useState<"checking" | "ready" | "error" | "saving" | "done">("checking");
  const [note, setNote] = React.useState<string>("Checking link…");
  const [error, setError] = React.useState<string | null>(null);

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const [resendEmail, setResendEmail] = React.useState("");
  const [resendMsg, setResendMsg] = React.useState<string | null>(null);
  const [resendBusy, setResendBusy] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        // 1) Hash tokens (most common for Supabase emails)
        const { access_token, refresh_token, error, error_description } = parseHash(window.location.hash);
        if (error) throw new Error(error_description || error);

        if (access_token && refresh_token) {
          const { error: sessErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sessErr) throw sessErr;
          setPhase("ready");
          setNote("Link verified. Set a new password.");
          return;
        }

        // 2) PKCE style `?code=...`
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchErr) throw exchErr;
          setPhase("ready");
          setNote("Link verified. Set a new password.");
          return;
        }

        // If already signed in, still allow reset
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setPhase("ready");
          setNote("Signed in. Set a new password.");
          return;
        }

        // No tokens & not signed in -> show resend UI
        setPhase("error");
        setError("This link is missing or expired.");
      } catch (e: any) {
        setPhase("error");
        setError(e?.message ?? "Link invalid or expired.");
      }
    })();
  }, []);

  async function saveNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setError(null);
    setPhase("saving");
    const { error: upErr } = await supabase.auth.updateUser({ password });
    if (upErr) {
      setPhase("ready");
      setError(upErr.message);
      return;
    }
    setPhase("done");
    setNote("Password updated. Redirecting…");
    setTimeout(() => navigate("/dashboard"), 900);
  }

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setResendMsg(null);
    setResendBusy(true);
    try {
      const { error: rerr } = await supabase.auth.resetPasswordForEmail(resendEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (rerr) throw rerr;
      setResendMsg("Email sent. Check your inbox for a fresh reset link.");
    } catch (e: any) {
      setResendMsg(e?.message ?? "Could not send reset email.");
    } finally {
      setResendBusy(false);
    }
  }

  // ---- UI ----
  if (phase === "checking") {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-brand-blue">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-gray-600">{note}</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="w-full max-w-sm border rounded-2xl bg-white shadow p-6 space-y-4">
          <h1 className="text-xl font-semibold">Reset Password</h1>
          <p className="text-red-600 text-sm">{error}</p>
          <form onSubmit={resend} className="space-y-3">
            <label className="block">
              <span className="text-sm text-gray-700">Email</span>
              <div className="mt-1 flex items-center gap-2 rounded-lg border px-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  className="w-full py-2 outline-none"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                />
              </div>
            </label>
            <button
              className="w-full rounded-lg bg-brand-blue text-white py-2 font-semibold disabled:opacity-60"
              disabled={resendBusy}
            >
              {resendBusy ? "Sending…" : "Send new reset link"}
            </button>
            {resendMsg && <p className="text-sm text-gray-600">{resendMsg}</p>}
          </form>
        </div>
      </div>
    );
  }

  // ready / saving / done
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <form
        onSubmit={saveNewPassword}
        className="w-full max-w-sm border rounded-2xl bg-white shadow p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Reset Password</h1>
        <p className="text-sm text-gray-600">{note}</p>

        {error && <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}

        <label className="block">
          <span className="text-sm text-gray-700">New password</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border px-3">
            <Lock className="h-4 w-4 text-gray-400" />
            <input
              type="password"
              className="w-full py-2 outline-none"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">Confirm password</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border px-3">
            <Lock className="h-4 w-4 text-gray-400" />
            <input
              type="password"
              className="w-full py-2 outline-none"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-blue text-white py-2 font-semibold disabled:opacity-60"
          disabled={phase === "saving"}
        >
          {phase === "saving" ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
