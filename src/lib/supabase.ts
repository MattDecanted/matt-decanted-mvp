// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Database types aligned to your SQL schema.
 * (Unchanged from your version; only the client creation below is new.)
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          locale: string | null;          // default 'en'
          trial_started_at: string | null;
        };
        Insert: {
          user_id: string;
          locale?: string | null;
          trial_started_at?: string | null;
        };
        Update: {
          locale?: string | null;
          trial_started_at?: string | null;
        };
      };

      points_ledger: {
        Row: {
          id: number;
          user_id: string;
          points: number;
          reason: string;
          meta: any | null;               // default {}
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
          for_date: string;               // ISO date (YYYY-MM-DD)
          title: string;
          questions: any;                 // [{ q, options[], correct_index }]
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
          for_date: string;               // ISO date
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
        Row: {
          id: string;
          locale: string;
          title: string;                  // the correct answer
          clues: string[];                // progressive clues
          is_active: boolean;
        };
        Insert: {
          locale?: string;
          title: string;
          clues: string[];
          is_active?: boolean;
        };
        Update: {
          title?: string;
          clues?: string[];
          is_active?: boolean;
        };
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
      // We handle hash tokens ourselves (HashAuthBridge)
      detectSessionInUrl: false,
    },
  });

  // Expose for DevTools debugging:
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

/**
 * Optional helper: set a session from a URL hash (used by magic link / recovery).
 * Returns { handled: boolean, error?: AuthError }.
 */
export async function setSessionFromHash(hash?: string) {
  const h = hash ?? (typeof window !== 'undefined' ? window.location.hash : '');
  if (!h) return { handled: false as const };
  const p = new URLSearchParams(h.startsWith('#') ? h.slice(1) : h);
  const access_token = p.get('access_token');
  const refresh_token = p.get('refresh_token');
  if (!access_token || !refresh_token) return { handled: false as const };

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return { handled: true as const, error };
}
