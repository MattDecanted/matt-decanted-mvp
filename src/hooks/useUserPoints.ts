// src/hooks/useUserPoints.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
// If you already have an AuthContext, you can use it; otherwise read from supabase
// import { useAuth } from '@/context/AuthContext';

type Stats = { total_points: number; current_streak: number };

export function useUserPoints() {
  const [userId, setUserId] = useState<string | null>(null);
  // const { user } = useAuth(); const userId = user?.id ?? null;
  const [points, setPoints] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  async function refresh(uid?: string | null) {
    if (!uid) return;
    const { data, error } = await supabase.rpc("vv_get_user_stats");
    if (!error && Array.isArray(data) && data[0]) {
      const row = data[0] as Partial<Stats>;
      setPoints(row.total_points ?? 0);
      setStreak(row.current_streak ?? 0);
    }
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setUserId(uid);
      await refresh(uid);
    })();
  }, []);

  // Realtime on our tables (so headers update instantly)
  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel(`user-points-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vocab_user_totals", filter: `user_id=eq.${userId}` },
        () => refresh(userId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vocab_user_latest_correct", filter: `user_id=eq.${userId}` },
        () => refresh(userId)
      )
      .subscribe();

    const onFocus = () => refresh(userId);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(ch);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);

  return { points, streak, refresh };
}
