// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** ---------- Database types (add the tables you actually use) ---------- */
export type Database = {
  public: {
    Tables: {
      // Newer profile you use in AuthContext
      member_profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'admin' | 'premium' | 'basic' | 'subscriber' | 'learner' | string | null;
          subscription_tier: 'free' | 'basic' | 'premium' | null;
          subscription_status: 'trial' | 'active' | 'paused' | 'canceled' | 'inactive' | null;
          trial_expires_at: string | null; // ISO string
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['member_profiles']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['member_profiles']['Row']>;
      };

      // Simple admins table (override role)
      admins: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
      };

      // Older/legacy profiles (keep if any code still touches it)
      profiles: {
        Row: {
          id?: string;               // many apps use "id" PK
          user_id?: string;          // your old type had "user_id"
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          subscription_status?: 'active' | 'paused' | 'canceled' | null;
          locale?: string | null;    // default 'en'
          trial_started_at?: string | null;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };

      points_ledger: {
        Row: {
          id: number;
          user_id: string;
          points: number;
          reason: string;
          meta: any | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          points: number;
          reason: string;
          meta?: any | null;
        };
        Update: {
          points?: number;
          reason?: string;
          meta?: any | null;
        };
      };

      trial_quizzes: {
        Row: {
          id: string;
          locale: string;
          for_date: string; // YYYY-MM-DD
          title: string;
          questions: any;   // [{ q, options[], correct_index }]
          points_award: number;
          is_published: boolean;
        };
        Insert: {
          locale?: string;
          for_date: string;
          title: string;
          questions: any;
          points_award?: number;
          is_published?: boolean;
        };
        Update: {
          title?: string;
          questions?: any;
          points_award?: number;
          is_published?: boolean;
        };
      };

      trial_quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          locale: string;
          for_date: string;
          correct_count: number;
          points_awarded: number;
          source: string | null;
          utm: any | null;
          affiliate_code: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          locale?: string;
          for_date: string;
          correct_count: number;
          points_awarded: number;
          source?: string | null;
          utm?: any | null;
          affiliate_code?: string | null;
        };
        Update: {
          correct_count?: number;
          points_awarded?: number;
          source?: string | null;
          utm?: any | null;
          affiliate_code?: string | null;
        };
      };

      guess_what_items: {
        Row: { id: string; locale: string; title: string; clues: string[]; is_active: boolean };
        Insert: { locale?: string; title: string; clues: string[]; is_active?: boolean };
        Update: { title?: string; clues?: string[]; is_active?: boolean };
      };

      guess_what_sessions: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          guesses: number;
          solved: boolean;
          points_awarded: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          item_id: string;
          guesses?: number;
          solved?: boolean;
          points_awarded?: number;
        };
        Update: {
          guesses?: number;
          solved?: boolean;
          points_awarded?: number;
        };
      };

      shorts: {
        Row: {
          id: string;
          locale: string;
          slug: string;
          title: string;
          video_url: string;
          preview: boolean;
          is_published: boolean;
        };
        Insert: {
          locale?: string;
          slug: string;
          title: string;
          video_url: string;
          preview?: boolean;
          is_published?: boolean;
        };
        Update: {
          title?: string;
          video_url?: string;
          preview?: boolean;
          is_published?: boolean;
        };
      };

      quiz_bank: {
        Row: {
          id: string;
          kind: 'short' | 'guess_what';
          ref_id: string;
          question: string;
          options: string[];
          correct_index: number;
          points_award: number;
        };
        Insert: {
          kind: 'short' | 'guess_what';
          ref_id: string;
          question: string;
          options: string[];
          correct_index: number;
          points_award?: number;
        };
        Update: {
          question?: string;
          options?: string[];
          correct_index?: number;
          points_award?: number;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

/* ---------- Environment (Vite) ---------- */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function notConfigured(): never {
  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Netlify environment variables.'
  );
}

let client: SupabaseClient<Database>;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      /** ✅ Let Supabase parse #access_token / #refresh_token automatically */
      detectSessionInUrl: true,
    },
  });

  // Debug hooks for the browser console
  if (typeof window !== 'undefined') {
    (window as any).supabase = client;
    (window as any).__SB_URL__ = SUPABASE_URL;
  }
} else {
  console.warn('Supabase env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  client = new Proxy({} as SupabaseClient<Database>, {
    get() {
      return notConfigured;
    },
    apply() {
      return notConfigured();
    },
  }) as SupabaseClient<Database>;
}

/** Typed Supabase client for the browser app. */
export const supabase = client;

/** Helper: does the current URL hash look like an auth hash? (kept for compatibility) */
export function hasAuthHash(hash?: string) {
  const h = hash ?? (typeof window !== 'undefined' ? window.location.hash : '');
  if (!h) return false;
  const p = new URLSearchParams(h.startsWith('#') ? h.slice(1) : h);
  return !!(p.get('access_token') && p.get('refresh_token'));
}

/**
 * setSessionFromHash: still exported for older code paths.
 * With detectSessionInUrl=true, Supabase does this automatically on page load.
 */
export async function setSessionFromHash(hash?: string) {
  const h = hash ?? (typeof window !== 'undefined' ? window.location.hash : '');
  if (!h) return { handled: false as const };

  const p = new URLSearchParams(h.startsWith('#') ? h.slice(1) : h);
  const access_token = p.get('access_token');
  const refresh_token = p.get('refresh_token');
  if (!access_token || !refresh_token) return { handled: false as const };

  const maybeAuth = (supabase as any)?.auth;
  if (!maybeAuth || typeof maybeAuth.setSession !== 'function') {
    console.warn('[setSessionFromHash] Supabase client not configured.');
    return { handled: true as const, error: undefined };
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return { handled: true as const, error };
}
