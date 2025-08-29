// src/hooks/useDailyAward.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
// Optional: if you have your own auth context, uncomment the next line and swap usages
// import { useAuth } from "@/context/AuthContext";

function formatDateAdelaide(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Adelaide",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d).reduce((a: Record<string,string>, p) => (a[p.type]=p.value, a), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function todayGameKey(prefix: string) {
  return `${prefix}:${formatDateAdelaide()}`;
}

type AwardResult = { awarded: number; streak: number };

export function useDailyAward(opts: { gamePrefix: string; pointsOnWin?: number }) {
  const { gamePrefix, pointsOnWin = 10 } = opts;
  const key = useMemo(() => todayGameKey(gamePrefix), [gamePrefix]);

  // const { user } = useAuth();
  // const userId = user?.id ?? null;
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ subscription_tier?: string|null; trial_expires_at?: string|null } | null>(null);
  const [playedToday, setPlayedToday] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  // bootstrap auth + profile
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: mp } = await supabase
        .from("member_profiles")
        .select("subscription_tier, trial_expires_at")
        .eq("user_id", uid)
        .maybeSingle();
      setProfile(mp ?? {});
    })();
  }, []);

  useEffect(() => {
    setPlayedToday(localStorage.getItem(`played:${key}`) === "1");
  }, [key]);

  /** Start a 7-day trial if eligible (call on first meaningful interaction) */
  const ensureTrial = useCallback(async () => {
    if (!userId) return { started: false, needsSignIn: true };

    const today = formatDateAdelaide();
    const dt = new Date(today); dt.setDate(dt.getDate() + 7);
    const trial_expires_at = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;

    if (profile?.subscription_tier === "premium") return { started: false, needsSignIn: false };
    if (profile?.subscription_tier === "trial" && profile?.trial_expires_at && profile.trial_expires_at >= today) {
      return { started: false, needsSignIn: false };
    }

    const { error } = await supabase
      .from("member_profiles")
      .upsert(
        { user_id: userId, subscription_tier: "trial", trial_started_at: today, trial_expires_at },
        { onConflict: "user_id" }
      );
    if (error) {
      setErr(error.message);
      return { started: false, needsSignIn: false };
    }
    setProfile({ subscription_tier: "trial", trial_expires_at });
    return { started: true, needsSignIn: false };
  }, [userId, profile]);

  /** Call on win/lose; awards once per day per key using vv_award_points() */
  const complete = useCallback(async (isWin: boolean): Promise<AwardResult> => {
    setErr(null);
    const base = isWin ? pointsOnWin : 0;

    if (!userId) {
      setErr("Sign in to save points & streak");
      return { awarded: 0, streak: 0 };
    }
    if (playedToday) return { awarded: 0, streak: 0 };

    setSaving(true);
    try {
      // Canonical signature
      const r = await supabase.rpc("vv_award_points", {
        term: key,
        was_correct: isWin,
        points: base,
      });
      if (!r.error) {
        localStorage.setItem(`played:${key}`, "1");
        const row = (r.data?.[0] ?? {}) as { points_awarded?: number; streak_after?: number };
        return { awarded: row.points_awarded ?? base, streak: row.streak_after ?? 0 };
      }

      // Fallback signature (older DBs)
      const r2 = await supabase.rpc("vv_award_points", {
        p_points: base,
        p_term: key,
        p_was_correct: isWin,
      });
      if (!r2.error) {
        localStorage.setItem(`played:${key}`, "1");
        const row = (r2.data?.[0] ?? {}) as { points_awarded?: number; streak_after?: number };
        return { awarded: row.points_awarded ?? base, streak: row.streak_after ?? 0 };
      }

      setErr(r.error?.message ?? r2.error?.message ?? "Unable to award points");
      return { awarded: 0, streak: 0 };
    } finally {
      setSaving(false);
      setPlayedToday(true);
    }
  }, [userId, key, playedToday, pointsOnWin]);

  return { key, userId, profile, playedToday, saving, err, ensureTrial, complete };
}
