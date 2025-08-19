// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { pathname, hash, search } = window.location;
        const onCallback = pathname.startsWith('/auth/callback');
        const hasHashTokens = hash.includes('access_token');
        const hasCode = new URLSearchParams(search).get('code');

        if (onCallback && (hasHashTokens || hasCode)) {
          // 1) Exchange the link for a session (stores it for us)
          const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) console.error('getSessionFromUrl error:', error);

          // 2) Clean the URL *before* navigating away to avoid retry loops
          window.history.replaceState({}, document.title, '/auth/callback');

          // 3) Hydrate local state then send user to /account
          if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
            window.location.replace('/account');
            return; // stop here; next load will hydrate from storage
          }
        }

        // Normal app load (or callback without tokens): hydrate from stored session
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }

      // Listen for future auth changes
      const { data: listener } = supabase.auth.onAuthStateChange((_evt, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      });
      unsub = () => listener.subscription.unsubscribe();
    })();

    return () => { if (unsub) unsub(); };
  }, []);

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Email link should land on the callback route (not /account)
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
