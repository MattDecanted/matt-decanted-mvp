import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface PointsContextType {
  totalPoints: number;
  trialDaysLeft: number | null;
  isTrialUser: boolean;
  loading: boolean;
  refreshPoints: () => Promise<void>;
}

const PointsContext = createContext<PointsContextType | undefined>(undefined);

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isTrialUser, setIsTrialUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();

  const refreshPoints = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get total points
      const { data: pointsData } = await supabase
        .from('points_ledger')
        .select('points')
        .eq('user_id', user.id);

      const total = pointsData?.reduce((sum, record) => sum + record.points, 0) || 0;
      setTotalPoints(total);

      // Get profile for trial info
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_started_at')
        .eq('user_id', user.id)
        .single();

      if (profile?.trial_started_at) {
        const trialStart = new Date(profile.trial_started_at);
        const now = new Date();
        const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 7 - daysSinceStart);
        
        setTrialDaysLeft(daysLeft);
        setIsTrialUser(daysLeft > 0);
      } else {
        setTrialDaysLeft(null);
        setIsTrialUser(false);
      }
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPoints();
  }, [user, session]);

  const value = {
    totalPoints,
    trialDaysLeft,
    isTrialUser,
    loading,
    refreshPoints,
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
}

export function usePoints() {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
}