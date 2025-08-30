// src/pages/SignIn.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, Lock, User, ShieldCheck, ArrowRight } from "lucide-react";

type Tab = "signin" | "signup" | "magic" | "reset";

const Field = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  autoComplete?: string;
}) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    <div className="relative">
      {icon && <span className="absolute left-3 top-2.5 text-gray-400">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border-gray-300 pl-10 pr-3 py-2 focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
      />
    </div>
  </label>
);

export default function SignIn() {
  const [tab, setTab] = React.useState<Tab>("signin");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  // shared fields
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const navigate = useNavigate();
  const location = useLocation() as any;
  const redirectTo = location?.state?.from?.pathname || "/dashboard";
  const activateUrl = `${window.location.origin}/activate`;

  // If the user hit /signin#type=recovery (Supabase recovery redirect)
  React.useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      setTab("reset");
      setMsg("Enter a new password to complete your reset.");
    }
  }, []);

  const clearMsg = () => setMsg(null);

  async function doGoogle() {
    clearMsg();
    setBusy(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: activateUrl },
      });
      // OAuth will redirect away; no navigate here
    } catch (e: any) {
      setMsg(e?.message || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    clearMsg();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setMsg(e?.message || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    clearMsg();
    if (!email || !password || !fullName) {
      setMsg("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: activateUrl,
        },
      });
      if (error) throw error;

      // Create/update a profile row (idempotent)
      const uid = data.user?.id;
      if (uid) {
        await supabase
          .from("profiles")
          .upsert(
            {
              id: uid,
              full_name: fullName,
              role: "learner", // default
              subscription_status: null,
            },
            { onConflict: "id" }
          );
      }

      setMsg("Check your inbox to confirm your email. Then sign in.");
      setTab("signin");
    } catch (e: any) {
      setMsg(e?.message || "Sign up failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    clearMsg();
    if (!email) {
      setMsg("Enter your email.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: activateUrl },
      });
      if (error) throw error;
      setMsg("Magic link sent. Check your inbox.");
    } catch (e: any) {
      setMsg(e?.message || "Could not send magic link.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    clearMsg();
    if (window.location.hash.includes("type=recovery")) {
      // We're on the recovery link—just update the password.
      if (!password || password !== confirm) {
        setMsg("Enter and confirm your new password.");
        return;
      }
      setBusy(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMsg("Password updated. You can now sign in.");
        setTab("signin");
        window.history.replaceState({}, "", "/signin");
      } catch (e: any) {
        setMsg(e?.message || "Password update failed.");
      } finally {
        setBusy(false);
      }
      return;
    }

    // Request a reset link via email
    if (!email) {
      setMsg("Enter your email.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: activateUrl + "#type=recovery",
      });
      if (error) throw error;
      setMsg("Reset email sent. Check your inbox.");
    } catch (e: any) {
      setMsg(e?.message || "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  const TabButton = ({ value, children }: { value: Tab; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => {
        clearMsg();
        setTab(value);
      }}
      className={`px-3 py-1.5 text-sm rounded-md border ${
        tab === value
          ? "bg-brand-blue text-white border-brand-blue"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-[70vh] flex items-start sm:items-center justify-center px-4 pt-8 sm:pt-0">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-gray-500">Sign in to continue.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <TabButton value="signin">Sign in</TabButton>
          <TabButton value="signup">Sign up</TabButton>
          <TabButton value="magic">Magic link</TabButton>
          <TabButton value="reset">Reset</TabButton>
        </div>

        {/* Card */}
        <div className="card p-5">
          {msg && (
            <div
              className={`mb-4 text-sm rounded-md px-3 py-2 border ${
                msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error")
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {msg}
            </div>
          )}

          {tab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                autoComplete="current-password"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full btn-primary justify-center"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
              </button>
              <button
                type="button"
                onClick={doGoogle}
                disabled={busy}
                className="w-full btn-ghost justify-center"
              >
                Continue with Google
              </button>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setTab("reset")}
                  className="text-sm text-brand-blue hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {tab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Field
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="Matt Decanted"
                icon={<User className="w-4 h-4" />}
                autoComplete="name"
              />
              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Create a password"
                icon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
              />
              <Field
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat your password"
                icon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
              />
              <button type="submit" disabled={busy} className="w-full btn-primary justify-center">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
              </button>
              <p className="text-xs text-gray-500 text-center">
                By signing up you agree to our terms and privacy policy.
              </p>
            </form>
          )}

          {tab === "magic" && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
              />
              <button type="submit" disabled={busy} className="w-full btn-primary justify-center">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send magic link"}
              </button>
              <p className="text-xs text-gray-500 text-center">
                We’ll email you a one-time link to sign in instantly.
              </p>
            </form>
          )}

          {tab === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              {window.location.hash.includes("type=recovery") ? (
                <>
                  <Field
                    label="New password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter new password"
                    icon={<Lock className="w-4 h-4" />}
                    autoComplete="new-password"
                  />
                  <Field
                    label="Confirm password"
                    type="password"
                    value={confirm}
                    onChange={setConfirm}
                    placeholder="Confirm new password"
                    icon={<Lock className="w-4 h-4" />}
                    autoComplete="new-password"
                  />
                  <button type="submit" disabled={busy} className="w-full btn-primary justify-center">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
                  </button>
                </>
              ) : (
                <>
                  <Field
                    label="Email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    icon={<Mail className="w-4 h-4" />}
                    autoComplete="email"
                  />
                  <button type="submit" disabled={busy} className="w-full btn-primary justify-center">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset email"}
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    You’ll receive a link to set a new password.
                  </p>
                </>
              )}
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-sm">
          <button
            className="inline-flex items-center text-gray-600 hover:text-gray-800"
            onClick={() => navigate("/")}
          >
            Back to home <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
