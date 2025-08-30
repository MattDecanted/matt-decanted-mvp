// src/pages/ResetPassword.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type Stage = "checking" | "ready" | "saving" | "done" | "error";

export default function ResetPassword() {
  const nav = useNavigate();
  const [stage, setStage] = React.useState<Stage>("checking");
  const [err, setErr] = React.useState<string>("");
  const [pw1, setPw1] = React.useState("");
  const [pw2, setPw2] = React.useState("");

  // Parse both hash fragment and query params robustly
  React.useEffect(() => {
    (async () => {
      try {
        // 1) Try access_token / refresh_token in the hash
        const hash = window.location.hash.startsWith("#")
          ? new URLSearchParams(window.location.hash.slice(1))
          : new URLSearchParams();

        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        const type = (hash.get("type") || "").toLowerCase(); // "recovery" | "magiclink" | ...

        if (access_token && refresh_token) {
          // Tell supabase to use this session
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;

          // If this is a recovery link => show password form.
          // If it's a magic link, you could just route to /dashboard instead.
          if (type === "recovery") {
            setStage("ready");
            return;
          } else {
            // magic link: you're signed in already
            nav("/dashboard", { replace: true });
            return;
          }
        }

        // 2) Try `?code=` (OTP/verify-style links)
        const query = new URLSearchParams(window.location.search);
        const code = query.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // For password recovery links using ?code=, show the form too
          setStage("ready");
          return;
        }

        // Nothing usable found
        setErr("Invalid or missing token in the URL. Please request a new reset link.");
        setStage("error");
      } catch (e: any) {
        setErr(e?.message || "Could not validate link.");
        setStage("error");
      }
    })();
  }, [nav]);

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setErr("Passwords do not match.");
      return;
    }
    setErr("");
    setStage("saving");
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setStage("done");
    } catch (e: any) {
      setErr(e?.message || "Failed to update password.");
      setStage("ready");
    }
  }

  if (stage === "checking") {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl border p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold mb-2">Reset Password</h1>
          <p className="text-gray-600">Checking link…</p>
        </div>
      </main>
    );
  }

  if (stage === "error") {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl border p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-3">Reset Password</h1>
          <div className="text-sm text-red-600 mb-4">{err}</div>
          <div className="flex gap-2">
            <button
              onClick={() => nav("/signin")}
              className="px-4 py-2 rounded-md bg-blue-600 text-white"
            >
              Go to Sign in
            </button>
            <button
              onClick={() => nav("/activate")}
              className="px-4 py-2 rounded-md border"
            >
              Send a new magic link
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "done") {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl border p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold mb-2">Password updated</h1>
          <p className="text-gray-600 mb-4">You’re all set — sign in with your new password.</p>
          <button onClick={() => nav("/signin")} className="px-4 py-2 rounded-md bg-blue-600 text-white">
            Continue to Sign in
          </button>
        </div>
      </main>
    );
  }

  // stage === "ready" or "saving"
  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <form onSubmit={submitNewPassword} className="w-full max-w-md bg-white rounded-xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Choose a new password</h1>
        <p className="text-sm text-gray-600 mb-4">
          Your reset link has been verified. Enter your new password below.
        </p>

        {err && <div className="text-sm text-red-600 mb-3">{err}</div>}

        <label className="block mb-3">
          <span className="text-sm text-gray-700">New password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-gray-700">Confirm password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <button
          type="submit"
          disabled={stage === "saving"}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-60"
        >
          {stage === "saving" ? "Saving…" : "Update password"}
        </button>

        <button
          type="button"
          onClick={() => nav("/signin")}
          className="w-full mt-3 text-sm text-gray-700 underline"
        >
          Back to sign in
        </button>
      </form>
    </main>
  );
}
