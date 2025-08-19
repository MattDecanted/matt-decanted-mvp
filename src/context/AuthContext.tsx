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
    (async () => {
      // 1) If returning from a magic link, exchange it for a session and clean the URL.
      const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
      const hasCode = typeof window !== 'undefined' && (new URL(window.location.href)).searchParams.get('code');

      if (hasHash || hasCode) {
        try {
          const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) console.error('getSessionFromUrl error:', error);
          if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
          }
        } finally {
          // Remove auth params from the URL so refreshes don’t retry the exchange
          const clean = window.location.pathname + window.location.search.replace(/(\?|&)code=[^&]+/,'').replace(/(\?|&)state=[^&]+/,'');
          window.history.replaceState({}, document.title, clean.split('?')[0]);
        }
      } else {
        // 2) Normal load: hydrate from stored session
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      }

      setLoading(false);

      // 3) Listen for future auth changes
      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      });
      return () => listener.subscription.unsubscribe();
    })();
  }, []);

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        shouldCreateUser: true, // ok for MVP
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
