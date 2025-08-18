import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          locale: string;
          trial_started_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          locale?: string;
          trial_started_at?: string | null;
        };
        Update: {
          locale?: string;
          trial_started_at?: string | null;
          updated_at?: string;
        };
      };
      points_ledger: {
        Row: {
          id: number;
          user_id: string;
          points: number;
          reason: string;
          meta: any;
          created_at: string;
        };
        Insert: {
          user_id: string;
          points: number;
          reason: string;
          meta?: any;
        };
        Update: {
          points?: number;
          reason?: string;
          meta?: any;
        };
      };
      trial_quizzes: {
        Row: {
          id: string;
          locale: string;
          for_date: string;
          title: string;
          questions: any;
          points_award: number;
          is_published: boolean;
          created_at: string;
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
          utm: any;
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
          utm?: any;
          affiliate_code?: string | null;
        };
        Update: {
          correct_count?: number;
          points_awarded?: number;
          source?: string | null;
          utm?: any;
          affiliate_code?: string | null;
        };
      };
      guess_what_items: {
        Row: {
          id: string;
          locale: string;
          title: string;
          clues: string[];
          is_active: boolean;
          created_at: string;
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
          created_at: string;
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
          created_at: string;
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
  };
};