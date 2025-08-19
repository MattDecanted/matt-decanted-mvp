// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // --- helpers --------------------------------------------------------------

  // Ensure a profile row exists; safe to call repeatedly
  const ensureProfile = async (uid: string) => {
    // prefer upsert to avoid race/duplicates
    const { error } = await supabase
      .from('profiles')
      .upsert([{ user_id: uid, locale: 'en' }], { onConflict: 'user_id' });
    if (error) throw error;
  };

  // Merge any guest progress (uses CURRENT access token)
  const mergeGuestProgress = async (sess: Session) => {
    const guestData = localStorage.getItem('mdTrialQuiz_guest');
    if (!guestData) return;
    try {
      const res = await fetch('/.netlify/functions/merge-guest-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sess.access_token}`,
        },
        body: guestData,
      });
      if (res.ok) localStorage.removeItem('mdTrialQuiz_guest');
    } catch (e) {
      // Non-fatal: user can re-play; keep console noise minimal in prod
      console.error('merge-guest-progress failed', e);
    }
  };

  const handlePostSignIn = async (sess: Session) => {
    try {
      await ensureProfile(sess.user.id);
      await mergeGuestProgress(sess);
    } catch (e) {
      console.error('post-signin tasks failed', e);
    }
  };

  // --- bootstrap & subscription --------------------------------------------

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' && newSession) {
        await handlePostSignIn(newSession);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // --- public API -----------------------------------------------------------

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // send users back to /account where you exchange ?code= for a session
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value: AuthContextType = { user, session, loading, signInWithEmail, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
