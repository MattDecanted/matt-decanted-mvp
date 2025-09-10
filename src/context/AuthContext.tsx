// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = {
  id?: string | null;
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  alias?: string | null;
  display_name?: string | null;

  // 🔑 Admin bits your app checks:
  role?: string | null;       // e.g. "admin"
  is_admin?: boolean | null;  // boolean fallback

  // Optional fields — tolerated if absent:
  bio?: string | null;
  terms_accepted_at?: string | null;
  country?: string | null;
  state?: string | null;
  points_total?: number | null;
  points?: number | null;
  score?: number | null;
  xp?: number | null;
  badge_level?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  [key: string]: any;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  upsertProfile: (patch: Partial<Profile>) => Promise<void>;
};

const AuthCtx = createContext<AuthValue | undefined>(undefined);

/** Robust upsert that drops unknown columns and retries (handles drift across envs). */
async function safeUpsertProfile(payload: Record<string, any>) {
  let tries = 0;
  let dataToSend: Record<string, any> = { ...payload };

  // retry loop removes problematic columns if Postgres complains
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { error } = await supabase.from("profiles").upsert(dataToSend);
    if (!error) return;

    const msg = String(error.message || "");
    const m1 = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
    const m2 = msg.match(/could not find the '([a-zA-Z0-9_]+)'\s+column/i);
    const bad = (m1?.[1] || m2?.[1]) as string | undefined;

    if (!bad || !(bad in dataToSend) || tries++ > 8) {
      throw error;
    }
    const { [bad]: _omit, ...rest } = dataToSend;
    dataToSend = rest;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch profile by either id OR user_id, tolerant of schema differences. */
  const fetchProfile = React.useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*") // keep * so we don't break if columns differ across envs
      .or(`id.eq.${uid},user_id.eq.${uid}`)
      .maybeSingle();

    if (error) {
      console.warn("[AuthContext] profiles fetch error:", error.message);
      setProfile(null);
      return;
    }
    setProfile((data as Profile) ?? null);
  }, []);

  /** Boot: hydrate session, then profile (if logged in). */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;

        const sess = data.session ?? null;
        const u = sess?.user ?? null;

        setSession(sess);
        setUser(u);

        if (u) {
          await fetchProfile(u.id);
        } else {
          setProfile(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
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

  /** Magic-link sign-in. */
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

  /** Sign out and clear profile. */
  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  /** Force re-fetch of profile. */
  const refreshProfile = React.useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  /** Upsert (id + user_id) then refresh. */
  const upsertProfile = React.useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return;

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
      profile,            // <-- includes role / is_admin if present in DB
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
