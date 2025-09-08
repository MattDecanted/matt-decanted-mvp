// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Profile = {
  id?: string | null;
  user_id?: string | null;
  alias?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  display_name?: string | null;
  bio?: string | null;
  terms_accepted_at?: string | null;
  [key: string]: any;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  loading: boolean; // true until auth (and profile, if logged in) are loaded
  profile: Profile | null;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  upsertProfile: (patch: Partial<Profile>) => Promise<void>;
};

const AuthCtx = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile by id OR user_id (supports either schema)
  const fetchProfile = React.useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,user_id,alias,role,is_admin,display_name,bio,terms_accepted_at')
      .or(`id.eq.${uid},user_id.eq.${uid}`)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[AuthContext] profiles fetch error:', error.message);
      setProfile(null);
      return;
    }
    setProfile(data ?? null);
  }, []);

  // Boot: restore session, then (if logged in) load profile
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      const sess = data.session ?? null;
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        await fetchProfile(sess.user.id);
      } else {
        setProfile(null);
      }
      if (alive) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const nextSession = newSession ?? null;
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);

      if (nextUser) {
        await fetchProfile(nextUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      alive = false;
      sub?.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  async function signInWithEmail(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  const refreshProfile = React.useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const upsertProfile = React.useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return;
      const row = { id: user.id, user_id: user.id, ...patch };
      const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      await fetchProfile(user.id);
    },
    [user, fetchProfile]
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      session,
      loading,
      profile,
      signInWithEmail,
      signOut,
      refreshProfile,
      upsertProfile,
    }),
    [user, session, loading, profile, refreshProfile, upsertProfile]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
