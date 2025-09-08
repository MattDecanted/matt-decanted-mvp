import React, { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const COOLDOWN_SEC = 60;
const KEY = "otp_last_request_at";
const POST_LOGIN_KEY = "md_post_login_to";
const REDIRECT_TO =
  typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "/auth/callback";

type Mode = "idle" | "sent-magic" | "sent-recovery" | "error";

export default function SignIn() {
  const location = useLocation();
  const [params] = useSearchParams();

  // prefill email from ?email=
  const [email, setEmail] = useState<string>(() => params.get("email") || "");

  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const authParam = params.get("auth");
  const ignoreCooldown = authParam === "missing" || authParam === "expired";

  // Stash intended destination if we were sent here by a guard
  useEffect(() => {
    const from = (location.state as any)?.from?.pathname as string | undefined;
    if (from) {
      try {
        localStorage.setItem(POST_LOGIN_KEY, from);
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If already signed in, bounce (with a short poll for late init)
  useEffect(() => {
    let alive = true;
    let tries = 0;

    const redirectIfAuthed = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return true;
      if (data.session) {
        let to = "/account";
        try {
          const stored = localStorage.getItem(POST_LOGIN_KEY);
          if (stored) {
            to = stored;
            localStorage.removeItem(POST_LOGIN_KEY);
          }
        } catch {
          /* ignore */
        }
        window.location.replace(to);
        return true;
      }
      return false;
    };

    (async () => {
      if (await redirectIfAuthed()) return;
      const tick = async () => {
        if (await redirectIfAuthed()) return;
        if (!alive) return;
        if (tries++ < 20) setTimeout(tick, 250); // ~5s
      };
      setTimeout(tick, 250);
    })();

    return () => {
      alive = false;
    };
  }, [location.state]);

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
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    startTimer(secs);
  };

  // Initialize cooldown (unless user arrived with a bad/expired link)
  useEffect(() => {
    if (ignoreCooldown) {
      setCooldown(0);
      return;
    }
    try {
      const last = Number(localStorage.getItem(KEY) || 0);
      const delta = Math.max(
        0,
        COOLDOWN_SEC - Math.floor((Date.now() - last) / 1000)
      );
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
    if (!isEmailValid(email) || (!ignoreCooldown && cooldown > 0)) return;

    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: REDIRECT_TO,
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
        // eslint-disable-next-line no-console
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
    if (!isEmailValid(email) || (!ignoreCooldown && cooldown > 0)) return;

    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${REDIRECT_TO}?type=recovery`,
        }
      );

      if (error) {
        const secs = secondsFrom429(error.message) ?? COOLDOWN_SEC;
        if (String(error.message).toLowerCase().includes("429")) {
          setCooldownNow(secs);
          setMode("idle");
          setErrorMsg(
            `Recovery already requested. Try again in ~${secs}s.`
          );
          return;
        }
        // eslint-disable-next-line no-console
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

  const banner =
    authParam === "missing"
      ? "We couldn't complete sign in from that link. Please request a new magic link."
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
          disabled={
            sending || (!ignoreCooldown && cooldown > 0) || !isEmailValid(email)
          }
        >
          {cooldown > 0 && !ignoreCooldown
            ? `Wait ${cooldown}s...`
            : "Send magic link"}
        </button>
      </form>

      <div className="pt-2 text-sm text-gray-600">Forgot password?</div>
      <button
        className="w-full rounded border px-4 py-2 disabled:opacity-50"
        onClick={sendRecovery}
        disabled={
          sending || (!ignoreCooldown && cooldown > 0) || !isEmailValid(email)
        }
      >
        {cooldown > 0 && !ignoreCooldown
          ? `Wait ${cooldown}s...`
          : "Send recovery email"}
      </button>

      {mode === "sent-magic" && (
        <div
          className="rounded-md bg-green-50 p-3 text-sm"
          role="status"
          aria-live="polite"
        >
          Check <b>{email}</b> for your sign-in link. Open it on this device.
        </div>
      )}
      {mode === "sent-recovery" && (
        <div
          className="rounded-md bg-green-50 p-3 text-sm"
          role="status"
          aria-live="polite"
        >
          Recovery email sent to <b>{email}</b>. Use the link to set a new
          password.
        </div>
      )}
      {errorMsg && (
        <div className="rounded-md bg-red-50 p-3 text-sm" role="alert">
          {errorMsg}
        </div>
      )}
      <p className="text-xs text-gray-500">
        Tip: links expire quickly. If it says expired, request another and use
        it straight away.
      </p>
    </div>
  );
}
