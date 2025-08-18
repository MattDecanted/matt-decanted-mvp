/*
# Initial Database Schema

1. New Tables
  - `profiles` - User profiles with trial tracking
  - `points_ledger` - Complete points transaction history  
  - `trial_quizzes` - Daily quiz content by locale and date
  - `trial_quiz_attempts` - User quiz completion tracking
  - `guess_what_items` - Game content with progressive clues
  - `guess_what_sessions` - User game progress and scoring
  - `shorts` - Video content with metadata
  - `quiz_bank` - Question repository for various quiz types

2. Security
  - Enable RLS on all user-related tables
  - Public read access for published content only
  - Users can only access their own data

3. Constraints
  - Unique constraints for one-per-day quiz attempts
  - Check constraints for valid enum values
  - Foreign key relationships maintained
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locale text DEFAULT 'en',
  trial_started_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create points ledger
CREATE TABLE IF NOT EXISTS points_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points int NOT NULL,
  reason text NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create trial quizzes
CREATE TABLE IF NOT EXISTS trial_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text DEFAULT 'en',
  for_date date NOT NULL,
  title text NOT NULL,
  questions jsonb NOT NULL,
  points_award int DEFAULT 10,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(locale, for_date)
);

-- Create trial quiz attempts
CREATE TABLE IF NOT EXISTS trial_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  locale text DEFAULT 'en',
  for_date date NOT NULL,
  correct_count int NOT NULL,
  points_awarded int NOT NULL,
  source text,
  utm jsonb DEFAULT '{}',
  affiliate_code text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, locale, for_date)
);

-- Create guess what items
CREATE TABLE IF NOT EXISTS guess_what_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text DEFAULT 'en',
  title text NOT NULL,
  clues text[] NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create guess what sessions
CREATE TABLE IF NOT EXISTS guess_what_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES guess_what_items(id) ON DELETE CASCADE,
  guesses int DEFAULT 0,
  solved boolean DEFAULT false,
  points_awarded int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create shorts table
CREATE TABLE IF NOT EXISTS shorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text DEFAULT 'en',
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  video_url text NOT NULL,
  preview boolean DEFAULT false,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create quiz bank
CREATE TABLE IF NOT EXISTS quiz_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('short', 'guess_what')),
  ref_id uuid NOT NULL,
  question text NOT NULL,
  options text[] NOT NULL,
  correct_index int NOT NULL,
  points_award int DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_what_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_what_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_bank ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Points ledger policies
CREATE POLICY "Users can read own points"
  ON points_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points"
  ON points_ledger FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trial quizzes policies (public read for published)
CREATE POLICY "Anyone can read published quizzes"
  ON trial_quizzes FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Trial quiz attempts policies
CREATE POLICY "Users can read own attempts"
  ON trial_quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON trial_quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Guess what items policies (public read for active)
CREATE POLICY "Anyone can read active items"
  ON guess_what_items FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Guess what sessions policies
CREATE POLICY "Users can read own sessions"
  ON guess_what_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON guess_what_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON guess_what_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Shorts policies (public read for published)
CREATE POLICY "Anyone can read published shorts"
  ON shorts FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Quiz bank policies (public read)
CREATE POLICY "Anyone can read quiz questions"
  ON quiz_bank FOR SELECT
  TO anon, authenticated
  USING (true);