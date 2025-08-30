import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function SignIn() {
  const nav = useNavigate();
  const loc = useLocation();
  const { signInWithPassword, signUpWithPassword, signInWithMagic, signInWithGoogle, requestPasswordReset, startTrial, loading } = useAuth();

  const [tab, setTab] = useState<"signin"|"signup"|"magic"|"reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function afterAuth() {
    // Start/refresh trial (safe if already started)
    try { await startTrial(7); } catch {}
    const dest = (loc.state as any)?.from?.pathname || "/dashboard";
    nav(dest, { replace: true });
  }

  async function doSignIn() {
    setBusy(true); setMsg("");
    const { error } = await signInWithPassword(email, password);
    setBusy(false);
    if (error) return setMsg(error.message || "Sign-in failed");
    afterAuth();
  }

  async function doSignUp() {
    setBusy(true); setMsg("");
    const { error } = await signUpWithPassword(email, password, name);
    setBusy(false);
    if (error) return setMsg(error.message || "Sign-up failed");
    afterAuth();
  }

  async function doMagic() {
    setBusy(true); setMsg("");
    const { error } = await signInWithMagic(email);
    setBusy(false);
    if (error) return setMsg(error.message || "Could not send magic link");
    setMsg("Magic link sent. Check your email.");
  }

  async function doReset() {
    setBusy(true); setMsg("");
    const { error } = await requestPasswordReset(email);
    setBusy(false);
    if (error) return setMsg(error.message || "Could not send reset email");
    setMsg("Password reset email sent. Check your inbox.");
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
      <p className="text-sm text-gray-600 mb-6">Sign in to continue.</p>

      <div className="flex gap-2 mb-4 text-sm">
        <button className={`px-3 py-1 rounded border ${tab==="signin"?"bg-black text-white":"bg-white"}`} onClick={()=>setTab("signin")}>Sign in</button>
        <button className={`px-3 py-1 rounded border ${tab==="signup"?"bg-black text-white":"bg-white"}`} onClick={()=>setTab("signup")}>Sign up</button>
        <button className={`px-3 py-1 rounded border ${tab==="magic"?"bg-black text-white":"bg-white"}`} onClick={()=>setTab("magic")}>Magic link</button>
        <button className={`px-3 py-1 rounded border ${tab==="reset"?"bg-black text-white":"bg-white"}`} onClick={()=>setTab("reset")}>Reset</button>
      </div>

      {tab === "signin" && (
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button disabled={busy||loading} onClick={doSignIn} className="w-full rounded bg-black text-white py-2 disabled:opacity-50">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button disabled={busy||loading} onClick={async ()=>{ setMsg(""); const { error } = await signInWithGoogle(); if (error) setMsg(error.message); }} className="w-full rounded border py-2">
            Continue with Google
          </button>
          <div className="text-right text-sm">
            <button className="underline" onClick={()=>setTab("reset")}>Forgot password?</button>
          </div>
        </div>
      )}

      {tab === "signup" && (
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2" placeholder="Full name (optional)" value={name} onChange={e=>setName(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button disabled={busy||loading} onClick={doSignUp} className="w-full rounded bg-black text-white py-2 disabled:opacity-50">
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      )}

      {tab === "magic" && (
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <button disabled={busy||loading} onClick={doMagic} className="w-full rounded bg-black text-white py-2 disabled:opacity-50">
            {busy ? "Sending…" : "Send magic link"}
          </button>
        </div>
      )}

      {tab === "reset" && (
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <button disabled={busy||loading} onClick={doReset} className="w-full rounded bg-black text-white py-2 disabled:opacity-50">
            {busy ? "Sending…" : "Send reset email"}
          </button>
          <div className="text-xs text-gray-500">
            You’ll receive a link to set a new password. If you already have a link, go to <Link to="/reset-password" className="underline">Reset Password</Link>.
          </div>
        </div>
      )}

      {msg && <div className="mt-4 text-sm">{msg}</div>}
    </main>
  );
}
