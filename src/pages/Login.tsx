// src/pages/Login.tsx
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const COOLDOWN_SEC = 60;
const KEY = "otp_last_request_at"; // persist across refreshes
const REDIRECT_TO = `${window.location.origin}/auth/callback`;

type Mode = "idle" | "sent-magic" | "sent-recovery" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // ---- utils ----
  const isEmailValid = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const startTimer = (startFrom: number) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    let t = startFrom;
    setCooldown(t);
    timerRef.current = window.setInterval(() => {
      t -= 1;
      setCooldown(t);
      if (t <= 0 && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 1000);
  };

  const setCooldownNow = (secs: number) => {
    localStorage.setItem(KEY, String(Date.now()));
    startTimer(secs);
  };

  // Catch refreshes mid-cooldown
  useEffect(() => {
    const last = Number(localStorage.getItem(KEY) || 0);
    const delta = Math.max(
      0,
      COOLDOWN_SEC - Math.floor((Date.now() - last) / 1000)
    );
    if (delta > 0) startTimer(delta);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  // Attempt to read “after 49 seconds” from Supabase 429 message
  const secondsFrom429 = (message: string | undefined | null) => {
    if (!message) return null;
    const m = /after\s+(\d+)\s*seconds?/i.exec(message);
    return m ? Math.max(1, parseInt(m[1], 10)) : null;
    // If absent, caller will default to COOLDOWN_SEC
  };

  const requestMagicLink = async () => {
    setErrorMsg(null);
    if (!email || !isEmailValid(email) || cooldown > 0) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: REDIRECT_TO },
      });
      if (error) {
        const secs = secondsFrom429(error.message) ?? COOLDOWN_SEC;
        if (error.message?.toLowerCase().includes("429")) {
          setCooldownNow(secs);
          setMode("idle");
          setErrorMsg(
            `We just sent a link recently. Please try again in ~${secs}s.`
          );
          return;
        }
        console.error("signInWithOtp error:", error);
        setMode("error");
        setErrorMsg(error.message);
        return;
      }
      setMode("sent-magic");
      setCooldownNow(COOLDOWN_SEC);
    } finally {
      setSending(false);
    }
  };

  const requestRecovery = async () => {
    setErrorMsg(null);
    if (!email || !isEmailValid(email) || cooldown > 0) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${REDIRECT_TO}?type=recovery` }
      );
      if (error) {
        const secs = secondsFrom429(error.message) ?? COOLDOWN_SEC;
        if (error.message?.toLowerCase().includes("429")) {
          setCooldownNow(secs);
          setMode("idle");
          setErrorMsg(
            `Recovery already requested. Please try again in ~${secs}s.`
          );
          return;
        }
        console.error("resetPasswordForEmail error:", error);
        setMode("error");
        setErrorMsg(error.message);
        return;
      }
      setMode("sent-recovery");
      setCooldownNow(COOLDOWN_SEC);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestMagicLink();
  };

  return (
    <div className="mx-auto max-w-md p-6 space-y-5">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium">Email</label>
        <input
          className="w-full rounded border p-2"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
        />

        <button
          type="submit"
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={sending || cooldown > 0 || !isEmailValid(email)}
        >
          {cooldown > 0 ? `Wait ${cooldown}s…` : "Send magic link"}
        </button>
      </form>

      <div className="pt-2 text-sm text-gray-600">Forgot password?</div>
      <button
        className="w-full rounded border px-4 py-2 disabled:opacity-50"
        onClick={requestRecovery}
        disabled={sending || cooldown > 0 || !isEmailValid(email)}
      >
        {cooldown > 0 ? `Wait ${cooldown}s…` : "Send recovery email"}
      </button>

      {/* status & errors */}
      {mode === "sent-magic" && (
        <div className="rounded-md bg-green-50 p-3 text-sm">
          Check <b>{email}</b> for your sign-in link. Open it on this device.
        </div>
      )}
      {mode === "sent-recovery" && (
        <div className="rounded-md bg-green-50 p-3 text-sm">
          Recovery email sent to <b>{email}</b>. Use the link to set a new
          password.
        </div>
      )}
      {errorMsg && (
        <div className="rounded-md bg-red-50 p-3 text-sm">
          {errorMsg}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Tip: links expire quickly. If it says expired, request another and use it
        straight away.
      </p>
    </div>
  );
}
