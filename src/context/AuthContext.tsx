import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: 'admin' | 'premium' | 'basic' | 'subscriber' | 'learner' | string | null;
  subscription_status?: 'active' | 'paused' | 'canceled' | null;
};

type AuthContextType = {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const sessUser = data?.session?.user ?? null;
    setUser(sessUser);

    if (sessUser?.id) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, subscription_status')
        .eq('id', sessUser.id)
        .maybeSingle();
      setProfile(p ?? null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
      } else {
        (async () => {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role, subscription_status')
            .eq('id', nextUser.id)
            .maybeSingle();
          setProfile(p ?? null);
          setLoading(false);
        })();
      }
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [loadSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    await loadSession();
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    const { data: p } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, subscription_status')
      .eq('id', user.id)
      .maybeSingle();
    setProfile(p ?? null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
