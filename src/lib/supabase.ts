// src/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Database types aligned to the SQL migration we ran:
 * - Only include columns that actually exist in the tables.
 * - Use correct nullability.
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
          kind: "short" | "guess_what";
          ref_id: string;
          question: string;
          options: string[];
          correct_index: number;
          points_award: number;
        };
        Insert: {
          kind: "short" | "guess_what";
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Soft warn so builds don’t crash if this file is imported in non-browser contexts.
  console.warn("Supabase env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

/** Typed Supabase client for the browser app. */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);
