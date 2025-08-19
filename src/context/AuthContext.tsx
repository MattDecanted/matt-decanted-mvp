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
      // If returning from a magic link (/auth/callback), exchange it for a session.
      const href = typeof window !== 'undefined' ? window.location.href : '';
      const url = href ? new URL(href) : null;
      const hasHashToken =
        !!url?.hash && (url.hash.includes('access_token') || url.hash.includes('refresh_token'));
      const hasCode = !!url?.searchParams.get('code');

      if (hasHashToken || hasCode) {
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          console.error('getSessionFromUrl error:', error);
        }
        if (data?.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
        // Clean URL and route to /account if we’re on /auth/callback
        const path = window.location.pathname;
        if (path === '/auth/callback') {
          window.history.replaceState({}, document.title, '/account');
        } else {
          // Remove auth params from any other path
          window.history.replaceState({}, document.title, path);
        }
      } else {
        // Normal load: hydrate from stored session
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      }

      setLoading(false);

      // Listen for future auth changes
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      });

      return () => sub.subscription.unsubscribe();
    })();
  }, []);

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // 🔑 Send users to /auth/callback (must be in Supabase Auth "Redirect URLs")
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
