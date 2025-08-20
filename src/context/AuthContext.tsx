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
    const initAuth = async () => {
      try {
        const { pathname, hash, search } = window.location;
        const isCallback = pathname.startsWith('/auth/callback');
        const hasHashTokens = hash.includes('access_token');
        const hasCode = new URLSearchParams(search).has('code');

        if (isCallback && (hasHashTokens || hasCode)) {
          const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) console.error('Error during getSessionFromUrl:', error);

          window.history.replaceState({}, document.title, '/auth/callback');

          if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
            window.location.replace('/account');
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      });

      return () => listener.subscription.unsubscribe();
    };

    const cleanup = initAuth();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
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
    <AuthContext.Provider
      value={{ user, session, loading, signInWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
