-- watch.ed Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read for profiles
CREATE POLICY "Profiles are publicly viewable"
  ON profiles FOR SELECT
  USING (true);

-- Only the owner can update their profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Entries table
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'series')),
  status TEXT NOT NULL DEFAULT 'plan_to_watch' CHECK (status IN ('watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  progress_season INTEGER,
  progress_episode INTEGER,
  watch_date TEXT,
  notes TEXT,
  tmdb_id INTEGER,
  poster_path TEXT,
  year INTEGER,
  genres TEXT[],
  overview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);
CREATE INDEX IF NOT EXISTS idx_entries_rating ON entries(rating);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can CRUD their own entries"
  ON entries FOR ALL
  USING (auth.uid() = user_id);

-- Public can view entries (for public profile page)
CREATE POLICY "Anyone can view entries"
  ON entries FOR SELECT
  USING (true);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entry_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_entry_id ON reactions(entry_id);
CREATE INDEX IF NOT EXISTS idx_reactions_visitor_id ON reactions(visitor_id);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions"
  ON reactions FOR SELECT
  USING (true);

-- Anyone can insert reactions (no auth needed)
CREATE POLICY "Anyone can insert reactions"
  ON reactions FOR INSERT
  WITH CHECK (true);

-- Owner can update/delete their own reaction (by visitor_id)
CREATE POLICY "Visitors can update their own reactions"
  ON reactions FOR UPDATE
  USING (true);

CREATE POLICY "Visitors can delete their own reactions"
  ON reactions FOR DELETE
  USING (true);

-- Badge column for golden ticket / shit awards
ALTER TABLE entries ADD COLUMN IF NOT EXISTS badge TEXT CHECK (badge IS NULL OR badge IN ('golden', 'shit'));

-- Change progress_episode to text so you can enter ranges like "1-5" or "1,3,5-7"
ALTER TABLE entries ALTER COLUMN progress_episode TYPE TEXT USING progress_episode::TEXT;

-- Runtime in minutes (for calculating total watch time)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS runtime INTEGER;

-- Function to auto-update updated_at on entries
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
