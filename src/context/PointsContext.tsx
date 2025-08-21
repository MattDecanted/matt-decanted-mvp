// src/context/PointsContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface PointsContextType {
  totalPoints: number;
  trialDaysLeft: number | null;
  isTrialUser: boolean;
  loading: boolean;
  refreshPoints: () => Promise<void>;
}

const PointsContext = createContext<PointsContextType | undefined>(undefined);

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [totalPoints, setTotalPoints] = useState(0);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isTrialUser, setIsTrialUser] = useState(false);
  const [loading, setLoading] = useState(true);

  const computeTrial = (trialStartedAt: string | null | undefined) => {
    if (!trialStartedAt) {
      setTrialDaysLeft(null);
      setIsTrialUser(false);
      return;
    }
    const start = new Date(trialStartedAt);
    const now = new Date();
    const daysSinceStart = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const left = Math.max(0, 7 - daysSinceStart);
    setTrialDaysLeft(left);
    setIsTrialUser(left > 0);
  };

  const refreshPoints = async () => {
    if (!user?.id) {
      setTotalPoints(0);
      setTrialDaysLeft(null);
      setIsTrialUser(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // ✅ Read from user_points (MVP schema)
      const { data: upRow, error: upErr } = await supabase
        .from('user_points')
        .select('total_points')
        .eq('user_id', user.id)
        .maybeSingle();

      if (upErr) {
        // Ignore "no rows" code (PGRST116); otherwise log
        if ((upErr as any).code !== 'PGRST116') {
          console.error('user_points select error:', upErr);
        }
        setTotalPoints(0);
      } else {
        setTotalPoints(upRow?.total_points ?? 0);
      }

      // Optional trial calc from profiles (ignore if table/column not present)
      try {
        const { data: profile, error: prErr } = await supabase
          .from('profiles')
          .select('trial_started_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!prErr) {
          computeTrial(profile?.trial_started_at ?? null);
        } else {
          // If profiles table doesn’t exist or column missing, just disable trial UI gracefully
          computeTrial(null);
        }
      } catch {
        computeTrial(null);
      }
    } catch (e) {
      console.error('refreshPoints error:', e);
      setTotalPoints(0);
      computeTrial(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial / auth-driven fetch
  useEffect(() => {
    refreshPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime: refresh when this user's user_points row changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`realtime-user-points-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // slight debounce to avoid flicker if multiple writes occur
          setTimeout(() => void refreshPoints(), 75);
        }
      )
      .subscribe();

    // also refresh on focus (safety net if realtime is off)
    const onFocus = () => void refreshPoints();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo(
    () => ({ totalPoints, trialDaysLeft, isTrialUser, loading, refreshPoints }),
    [totalPoints, trialDaysLeft, isTrialUser, loading]
  );

  return (
    <PointsContext.Provider value={value}>{children}</PointsContext.Provider>
  );
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) throw new Error('usePoints must be used within a PointsProvider');
  return ctx;
}
