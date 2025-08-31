// src/pages/Login.tsx
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const COOLDOWN_SEC = 60;
const KEY = "otp_last_request_at"; // persist across refreshes

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // restore cooldown if we refreshed
    const last = Number(localStorage.getItem(KEY) || 0);
    const delta = Math.max(0, COOLDOWN_SEC - Math.floor((Date.now() - last) / 1000));
    setCooldown(delta);
    if (delta > 0) startTimer(delta);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, []);

  const startTimer = (startFrom: number) => {
    let t = startFrom;
    timerRef.current = window.setInterval(() => {
      t -= 1;
      setCooldown(t);
      if (t <= 0 && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 1000);
  };

  const requestMagicLink = async () => {
    if (!email) return;
    if (cooldown > 0) return; // guard
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        console.error("signInWithOtp error:", error);
        alert(error.message);
        return;
      }
      // start cooldown
      localStorage.setItem(KEY, String(Date.now()));
      setCooldown(COOLDOWN_SEC);
      startTimer(COOLDOWN_SEC);
    } finally {
      setSending(false);
    }
  };

  const requestRecovery = async () => {
    if (!email) return;
    if (cooldown > 0) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) {
        console.error("resetPasswordForEmail error:", error);
        alert(error.message);
        return;
      }
      localStorage.setItem(KEY, String(Date.now()));
      setCooldown(COOLDOWN_SEC);
      startTimer(COOLDOWN_SEC);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <input
        className="w-full rounded border p-2"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
      />
      <button
        className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        onClick={requestMagicLink}
        disabled={sending || cooldown > 0}
      >
        {cooldown > 0 ? `Wait ${cooldown}s…` : "Send magic link"}
      </button>

      <div className="text-sm text-gray-600">Forgot password?</div>
      <button
        className="w-full rounded border px-4 py-2 disabled:opacity-50"
        onClick={requestRecovery}
        disabled={sending || cooldown > 0}
      >
        {cooldown > 0 ? `Wait ${cooldown}s…` : "Send recovery email"}
      </button>
    </div>
  );
}
