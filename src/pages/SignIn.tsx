// src/pages/SignIn.tsx
import * as React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, LogIn, UserPlus, Sparkles
} from "lucide-react";

type Mode = "signin" | "signup" | "magic" | "reset";

export default function SignIn() {
  const [mode, setMode] = React.useState<Mode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation() as any;
  const redirectTo: string =
    location?.state?.from?.pathname ? location.state.from.pathname : "/dashboard";

  function resetAlerts() {
    setErr(null);
    setMsg(null);
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
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
          data: { full_name: fullName || null },
          emailRedirectTo: `${window.location.origin}/activate`,
        },
      });
      if (error) throw error;
      setMsg("Check your email to confirm your account.");
      setMode("signin");
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/activate` },
      });
      if (error) throw error;
      setMsg("Magic link sent — check your email.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send magic link");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/activate`,
      });
      if (error) throw error;
      setMsg("Reset email sent — check your inbox.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send reset email");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    resetAlerts();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
      // Redirect happens via OAuth; `data.url` is handled by Supabase.
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[80vh] flex items-start justify-center px-4 py-10 bg-white">
      <div className="w-full max-w-md">
        {/* Page title */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-gray-500">Sign in to continue.</p>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-2 justify-center mb-4">
          <Seg value={mode} tag="signin" onClick={() => setMode("signin")}>
            Sign in
          </Seg>
          <Seg value={mode} tag="signup" onClick={() => setMode("signup")}>
            Sign up
          </Seg>
          <Seg value={mode} tag="magic" onClick={() => setMode("magic")}>
            Magic link
          </Seg>
          <Seg value={mode} tag="reset" onClick={() => setMode("reset")}>
            Reset
          </Seg>
        </div>

        {/* Card */}
        <div className="card p-5">
          {err && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
          {msg && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {msg}
            </div>
          )}

          {mode === "signin" && (
            <form onSubmit={handleSignin} className="space-y-4">
              <LabeledInput
                label="Email"
                type="email"
                icon={<Mail className="w-4 h-4 text-gray-400" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <LabeledInput
                label="Password"
                type={showPw ? "text" : "password"}
                icon={<Lock className="w-4 h-4 text-gray-400" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <button
                className="btn-primary w-full justify-center"
                disabled={busy}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Sign in
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="btn-ghost w-full justify-center"
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
            <form onSubmit={handleSignup} className="space-y-4">
              <LabeledInput
                label="Full name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
              <LabeledInput
                label="Email"
                type="email"
                icon={<Mail className="w-4 h-4 text-gray-400" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <LabeledInput
                label="Password"
                type={showPw ? "text" : "password"}
                icon={<Lock className="w-4 h-4 text-gray-400" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <LabeledInput
                label="Confirm password"
                type="password"
                icon={<Lock className="w-4 h-4 text-gray-400" />}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />

              <button className="btn-primary w-full justify-center" disabled={busy}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Create account
                  </span>
                )}
              </button>
            </form>
          )}

          {mode === "magic" && (
            <form onSubmit={handleMagic} className="space-y-4">
              <LabeledInput
                label="Email"
                type="email"
                icon={<Mail className="w-4 h-4 text-gray-400" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <button className="btn-primary w-full justify-center" disabled={busy}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Send magic link
                  </span>
                )}
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              <LabeledInput
                label="Email"
                type="email"
                icon={<Mail className="w-4 h-4 text-gray-400" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <button className="btn-primary w-full justify-center" disabled={busy}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                  </span>
                ) : (
                  "Send reset email"
                )}
              </button>
              <p className="text-xs text-gray-500">
                You’ll receive a link to set a new password.
              </p>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="btn-ghost inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ---------- small helpers ---------- */
function Seg({
  value,
  tag,
  onClick,
  children,
}: {
  value: string;
  tag: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const active = value === tag;
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center rounded-lg bg-brand-blue text-white px-3 py-1.5 text-sm font-semibold shadow"
          : "inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      }
    >
      {children}
    </button>
  );
}

function LabeledInput({
  label,
  icon,
  rightIcon,
  ...props
}: {
  label: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
        <input
          {...props}
          className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-${icon ? "9" : "3"} pr-${
            rightIcon ? "9" : "3"
          } outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue`}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</span>
        )}
      </div>
    </label>
  );
}
