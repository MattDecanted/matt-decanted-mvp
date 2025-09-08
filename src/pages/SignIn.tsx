// src/pages/SignIn.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const COOLDOWN_SEC = 60;
const KEY = "otp_last_request_at";
const REDIRECT_TO =
  typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "/auth/callback";

type Mode = "idle" | "sent-magic" | "sent-recovery" | "error";

export default function SignIn() {
  const location = useLocation();
  const [params] = useSearchParams();

  // prefill email from ?email= if present
  const [email, setEmail] = useState(() => params.get("email") || "");

  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const authParam = params.get("auth");
  const ignoreCooldown = authParam === "missing" || authParam === "expired";

  // If already signed in, bounce (poll a bit to catch late session init)
  useEffect(() => {
    let alive = true;
    let tries = 0;

    const redirectIfAuthed = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) {
        const to =
          ((location.state as any)?.from?.pathname as string | undefined) ||
          "/account";
        window.location.replace(to);
        return true;
      }
      return false;
    };

    (async () => {
      if (await redirectIfAuthed()) return;
      // Poll up to ~5s (20 * 250ms)
      const tick = async () => {
        if (await redirectIfAuthed()) return;
        if (!alive) return;
        if (tries++ < 20) setTimeout(tick, 250);
      };
      setTimeout(tick, 250);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

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
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    startTimer(secs);
  };

  // Initialize cooldown, unless we're explicitly handling a bad/expired link
  useEffect(() => {
    if (ignoreCooldown) {
      setCooldown(0);
      return;
    }
    try {
      const last = Number(localStorage.getItem(KEY) || 0);
      const delta = Math.max(0, COOLDOWN_SEC - Math.floor((Date.now() - last) / 1000));
      if (delta > 0) startTimer(delta);
    } catch {
      /* ignore */
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [ignoreCooldown]);

  const secondsFrom429 = (m?: string | null) => {
    if (!m) return null;
    const mm = /after\s+(\d+)\s*seconds?/i.exec(m);
    return mm ? Math.max(1, parseInt(mm[1], 10)) : null;
  };

  const sendMagic = async () => {
    setErrorMsg(null);
    if (!isEmailValid(email) || cooldown > 0) return;

    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: REDIRECT_TO, // lands on /auth/callback
        },
      });

      if (error) {
        const secs = secondsFrom429(error.message) ?? COOLDOWN_SEC;
        if (String(error.message).toLowerCase().includes("429")) {
          setCooldownNow(secs);
          setMode("idle");
          setErrorMsg(`We just sent a link recently. Try again in ~${secs}s.`);
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

  const sendRecovery = async () => {
    setErrorMsg(null);
    if (!isEmailValid(email) || cooldown > 0) return;

    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${REDIRECT_TO}?type=recovery`,
      });

      if (error) {
        const secs = secondsFrom429(error.message) ?? COOLDOWN_SEC;
        if (String(error.message).toLowerCase().includes("429")) {
          setCooldownNow(secs);
          setMode("idle");
          setErrorMsg(`Recovery already requested. Try again in ~${secs}s.`);
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
    void sendMagic();
  };

  // Helpful banner if we arrived via ?auth=missing|expired
  const banner =
    authParam === "missing"
      ? "We couldn’t complete sign in from that link. Please request a new magic link."
      : authParam === "expired"
      ? "That magic link has expired. Please request a new one."
      : null;

  return (
    <div className="mx-auto max-w-md p-6 space-y-5">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {banner && (
        <div
          className="rounded border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2 text-sm"
          role="status"
        >
          {banner}
        </div>
      )}

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
        onClick={sendRecovery}
        disabled={sending || cooldown > 0 || !isEmailValid(email)}
      >
        {cooldown > 0 ? `Wait ${cooldown}s…` : "Send recov
