import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/** Unified Profile we return to the app */
type Profile = {
  id: string; // always the auth user id
  full_name?: string | null;
  avatar_url?: string | null;
  role?: "admin" | "premium" | "basic" | "subscriber" | "learner" | string | null;
  subscription_tier?: "free" | "basic" | "premium" | null;
  subscription_status?: "trial" | "active" | "paused" | "canceled" | "inactive" | null;
  trial_expires_at?: string | null; // ISO date if present
};

type AuthContextType = {
  user: any | null;
  profile: Profile | null;
  loading: boolean;

  // OLD API (kept for compatibility)
  signIn: (email: string, password: string) => Promise<{ error?: string }>;

  // NEW helpers
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signInWithMagic: (email: string) => Promise<{ error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  startTrial: (days?: number) => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SITE_URL = (import.meta as any).env?.VITE_SITE_URL || window.location.origin;
const MAGIC_REDIRECT = `${SITE_URL}/dashboard`;      // after magic-link login / oauth
const RESET_REDIRECT = `${SITE_URL}/reset-password`; // password recovery flow

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /** Ensure member_profiles row exists; safe to call multiple times */
  const ensureProfileRow = useCallback(async (userId: string) => {
    // Try to find a member_profiles row first
    const { data: mp, error } = await supabase
      .from("member_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mp && !error) {
      await supabase.from("member_profiles").upsert(
        {
          user_id: userId,
          role: "learner",
          subscription_tier: "free",
          subscription_status: "trial",
        },
        { onConflict: "user_id" }
      );
      // Best-effort trial start (idempotent server function)
      try {
        await supabase.rpc("vv_start_trial", { p_days: 7 });
      } catch {
        /* non-fatal */
      }
    }
  }, []);

  /** Build our unified Profile from DB */
  const hydrateProfile = useCallback(async (userId: string) => {
    // Load member_profiles first (preferred)
    const [{ data: mp }, { data: adminRow }] = await Promise.all([
      supabase
        .from("member_profiles")
        .select("user_id, full_name, avatar_url, role, subscription_tier, subscription_status, trial_expires_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
    ]);

    let next: Profile | null = null;

    if (mp) {
      next = {
        id: userId,
        full_name: (mp as any)?.full_name ?? null,
        avatar_url: (mp as any)?.avatar_url ?? null,
        role: (mp as any)?.role ?? "learner",
        subscription_tier: (mp as any)?.subscription_tier ?? "free",
        subscription_status: (mp as any)?.subscription_status ?? "trial",
        trial_expires_at: (mp as any)?.trial_expires_at ?? null,
      };
    } else {
      // Fallback to old `profiles` table shape if present
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, subscription_status")
        .eq("id", userId)
        .maybeSingle();

      if (p) {
        next = {
          id: userId,
          full_name: (p as any)?.full_name ?? null,
          avatar_url: (p as any)?.avatar_url ?? null,
          role: (p as any)?.role ?? "learner",
          subscription_tier: "free",
          subscription_status: (p as any)?.subscription_status ?? "inactive",
          trial_expires_at: null,
        };
      }
    }

    // Admin override
    if (adminRow?.user_id) {
      next = next ?? { id: userId };
      next.role = "admin";
    }

    setProfile(next);
  }, []);

  /** Load session + profile on boot */
  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const sessUser = data?.session?.user ?? null;
      setUser(sessUser);
      if (sessUser?.id) {
        await ensureProfileRow(sessUser.id);
        await hydrateProfile(sessUser.id);
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, [ensureProfileRow, hydrateProfile]);

  useEffect(() => {
    loadSession();
    // subscribe to auth state (handles magic-link + password recovery completion)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
      } else {
        await ensureProfileRow(nextUser.id);
        await hydrateProfile(nextUser.id);
      }
      setLoading(false);
    });
    return () => sub?.subscription?.unsubscribe();
  }, [loadSession, ensureProfileRow, hydrateProfile]);

  // ---------- Auth API ----------
  const signInWithPassword = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data?.user?.id) {
      await ensureProfileRow(data.user.id);
      await hydrateProfile(data.user.id);
      try { await supabase.rpc("vv_start_trial", { p_days: 7 }); } catch {}
    }
    return {};
  };

  // Backwards compat alias
  const signIn = signInWithPassword;

  const signUpWithPassword = async (email: string, password: string, name?: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: name ? { full_name: name } : {} },
    });
    if (error) return { error: error.message };
    if (data?.user?.id) {
      await ensureProfileRow(data.user.id);
      await hydrateProfile(data.user.id);
      try { await supabase.rpc("vv_start_trial", { p_days: 7 }); } catch {}
    }
    return {};
  };

  const signInWithMagic = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: MAGIC_REDIRECT },
    });
    return { error: error?.message };
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT,
    });
    return { error: error?.message };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: MAGIC_REDIRECT },
    });
    return { error: error?.message };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    await hydrateProfile(user.id);
  };

  const startTrial = async (days = 7) => {
    try { await supabase.rpc("vv_start_trial", { p_days: days }); } catch {}
    await refreshProfile();
  };

  const isAdmin = useMemo(() => profile?.role === "admin", [profile?.role]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signInWithPassword,
        signUpWithPassword,
        signInWithMagic,
        requestPasswordReset,
        signInWithGoogle,
        signOut,
        refreshProfile,
        startTrial,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
