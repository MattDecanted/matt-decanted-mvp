// src/hooks/useUserPoints.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useUserPoints() {
  const { user } = useAuth();
  const [points, setPoints] = useState<number>(0);

  async function refresh() {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('user_points')
      .select('total_points')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!error) setPoints(data?.total_points ?? 0);
  }

  useEffect(() => {
    refresh();
  }, [user?.id]);

  // Optional: realtime subscribe so header updates instantly
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`points-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_points', filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();

    // also refresh when tab regains focus (safety net)
    const onFocus = () => refresh();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id]);

  return { points, refresh };
}
