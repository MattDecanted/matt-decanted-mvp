import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/** Unified Profile we return to the app */
type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: "admin" | "premium" | "basic" | "subscriber" | "learner" | string | null;
  subscription_tier?: "free" | "basic" | "premium" | null;
  subscription_status?: "trial" | "active" | "paused" | "canceled" | "inactive" | null;
  trial_expires_at?: string | null;
};

type AuthContextType = {
  user: any | null;
  profile: Profile | null;
  loading: boolean;

  // OLD alias (kept)
  signIn: (email: string, password: string) => Promise<{ error?: string }>;

  // New helpers
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

// -------- Redirects / URLs --------
const SITE_URL = (import.meta as any).env?.VITE_SITE_URL || window.location.origin;
const MAGIC_REDIRECT = `${SITE_URL}/dashboard`;      // where magic-link / oauth lands
const RESET_REDIRECT = `${SITE_URL}/reset-password`; // where password-recovery lands

// Parse tokens from hash (magic link style)
function parseHash(hash: string) {
  const qs = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return {
    access_token: qs.get("access_token"),
    refresh_token: qs.get("refresh_token"),
    error: qs.get("error"),
    error_description: qs.get("error_description"),
    type: qs.get("type"),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /** Ensure member_profiles row exists (idempotent) */
  const ensureProfileRow = useCallback(async (userId: string) => {
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
      // best-effort start trial
      try { await supabase.rpc("vv_start_trial", { p_days: 7 }); } catch {}
    }
  }, []);

  /** Build unified Profile */
  const hydrateProfile = useCallback(async (userId: string) => {
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

    if (adminRow?.user_id) {
      next = next ?? { id: userId };
      next.role = "admin";
    }

    setProfile(next);
  }, []);

  /** Claim session from URL (magic-link or PKCE code) */
  const claimSessionFromUrl = useCallback(async () => {
    // 1) Fragment tokens (#access_token=…&refresh_token=…)
    const { access_token, refresh_token, error, error_description } = parseHash(window.location.hash);
    if (error) throw new Error(error_description || error);
    if (access_token && refresh_token) {
      const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (setErr) throw setErr;
      // clean hash
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      return true;
    }
    // 2) Code param (?code=…) for PKCE flows
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exErr) throw exErr;
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams}` : ""));
      return true;
    }
    return false;
  }, []);

  /** Load session + profile on boot */
  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      // IMPORTANT: try to claim a session first (handles magic link & reset)
      try { await claimSessionFromUrl(); } catch { /* non-fatal */ }

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
  }, [claimSessionFromUrl, ensureProfileRow, hydrateProfile]);

  useEffect(() => {
    void loadSession();

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

  // Back-compat alias
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
