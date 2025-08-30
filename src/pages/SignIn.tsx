// src/pages/SignIn.tsx
import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowLeft, LogIn, Wand2, Send } from "lucide-react";

type Mode = "signin" | "signup" | "magic" | "reset";

export default function SignIn() {
  const navigate = useNavigate();

  const [mode, setMode] = React.useState<Mode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Convenient redirect target
  const redirectTo = `${window.location.origin}/dashboard`;
  const emailRedirect = `${window.location.origin}/activate`;
  const resetRedirect = `${window.location.origin}/reset-password`;

  function Tab({ value, children }: { value: Mode; children: React.ReactNode }) {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => {
          setMode(value);
          setErr(null);
          setMsg(null);
        }}
        className={
          "px-3 py-1.5 rounded-md text-sm font-medium transition" +
          (active
            ? " bg-brand-blue text-white shadow"
            : " bg-gray-900/90 text-white/90 hover:bg-gray-900")
        }
      >
        {children}
      </button>
    );
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // best-effort trial start (no-op if already started)
      try { await supabase.rpc("vv_start_trial", { p_days: 7 }); } catch {}
      navigate("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo },
      });
      if (error) throw error;
      // Supabase will redirect; nothing else to do here
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-in failed.");
      setBusy(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: emailRedirect,
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      setMsg("Check your email to confirm your account.");
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMsg("Magic link sent. Check your inbox.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send magic link.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirect,
      });
      if (error) throw error;
      setMsg("Reset email sent. Follow the link to set a new password.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-brand-blue">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-gray-500">Sign in to continue.</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        <Tab value="signin">Sign in</Tab>
        <Tab value="signup">Sign up</Tab>
        <Tab value="magic">Magic link</Tab>
        <Tab value="reset">Reset</Tab>
      </div>

      {/* Card */}
      <div className="rounded-2xl border bg-white shadow-[0_8px_30px_rgba(0,0,0,.06)]">
        <div className="p-5">
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border-gray-300 pl-9"
                  placeholder="you@example.com"
                />
              </div>

              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border-gray-300 pl-9 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-brand-blue px-4 py-2 font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                <LogIn className="mr-2 h-4 w-4" /> {busy ? "Signing in…" : "Sign in"}
              </button>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                Continue with Google
              </button>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-sm text-brand-blue hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border-gray-300"
                placeholder="Your name"
              />

              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-gray-300"
                placeholder="you@example.com"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border-gray-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-brand-blue px-4 py-2 font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                Create account
              </button>

              <p className="text-xs text-gray-500 text-center">
                We’ll email you a confirmation link to activate your account.
              </p>
            </form>
          )}

          {mode === "magic" && (
            <form onSubmit={handleMagic} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border-gray-300 pl-9"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-blue px-4 py-2 font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                <Wand2 className="mr-2 h-4 w-4" /> {busy ? "Sending…" : "Send magic link"}
              </button>
              <p className="text-xs text-gray-500 text-center">
                We’ll email a one-time sign-in link.
              </p>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleReset} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border-gray-300 pl-9"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                <Send className="mr-2 h-4 w-4" /> {busy ? "Sending…" : "Send reset email"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                You’ll receive a link to set a new password. If you already have a link,
                open it and you’ll be taken to reset.
              </p>
            </form>
          )}

          {/* Alerts */}
          {(err || msg) && (
            <div
              className={
                "mt-4 rounded-lg border px-3 py-2 text-sm " +
                (err
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700")
              }
            >
              {err || msg}
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="mt-6 flex justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
