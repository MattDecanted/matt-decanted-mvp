// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = {
  id?: string | null;
  user_id?: string | null;
  alias?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  display_name?: string | null;
  bio?: string | null;                // may not exist in your DB; kept optional
  terms_accepted_at?: string | null;  // may exist
  // Optional / nice-to-haves if present:
  country?: string | null;
  state?: string | null;
  points_total?: number | null;
  points?: number | null;
  score?: number | null;
  xp?: number | null;
  badge_level?: string | null;
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

/** Helper: robust upsert that removes unknown columns and retries. */
async function safeUpsertProfile(payload: Record<string, any>) {
  let tries = 0;
  let dataToSend: Record<string, any> = { ...payload };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { error } = await supabase.from("profiles").upsert(dataToSend); // no onConflict: let PK/unique handle it
    if (!error) return;

    const msg = String(error.message || "");
    // Try to detect the exact column name from common Postgres/Supabase error messages
    const m1 = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
    const m2 = msg.match(/could not find the '([a-zA-Z0-9_]+)'\s+column/i);
    const bad = (m1?.[1] || m2?.[1]) as string | undefined;

    if (!bad || !(bad in dataToSend) || tries++ > 8) {
      // Give up if we can't identify the field reliably.
      throw error;
    }

    // Drop the offending field and retry
    const { [bad]: _omit, ...rest } = dataToSend;
    dataToSend = rest;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile by id OR user_id (supports either schema), selecting * to avoid missing-column errors.
  const fetchProfile = React.useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or(`id.eq.${uid},user_id.eq.${uid}`)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[AuthContext] profiles fetch error:", error.message);
      setProfile(null);
      return;
    }
    setProfile((data as Profile) ?? null);
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

      // Try with both id and user_id so we work against either schema.
      const payload: Record<string, any> = {
        id: user.id,
        user_id: user.id,
        ...patch,
      };

      await safeUpsertProfile(payload);
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
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
