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
      // 1) Sum points_ledger for this user
      const { data: rows, error: plErr } = await supabase
        .from('points_ledger')
        .select('points')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (plErr) {
        console.error('points_ledger select error:', plErr);
        setTotalPoints(0);
      } else {
        const sum = (rows ?? []).reduce(
          (acc: number, r: any) => acc + (r.points || 0),
          0
        );
        setTotalPoints(sum);
      }

      // 2) Read trial start from profiles
      const { data: profile, error: prErr } = await supabase
        .from('profiles')
        .select('trial_started_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prErr) {
        console.error('profiles select error:', prErr);
        computeTrial(null);
      } else {
        computeTrial(profile?.trial_started_at ?? null);
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

  // Realtime: refresh when this user's points_ledger changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('realtime-points-self')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'points_ledger',
          filter: `user_id=eq.${user.id}`,
        },
        () => refreshPoints()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
