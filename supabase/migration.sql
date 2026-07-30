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
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON profiles;
CREATE POLICY "Profiles are publicly viewable"
  ON profiles FOR SELECT
  USING (true);

-- Only the owner can update their profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'pending'
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
DROP POLICY IF EXISTS "Users can CRUD their own entries" ON entries;
CREATE POLICY "Users can CRUD their own entries"
  ON entries FOR ALL
  USING (auth.uid() = user_id);

-- Public can view entries (for public profile page)
DROP POLICY IF EXISTS "Anyone can view entries" ON entries;
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
DROP POLICY IF EXISTS "Anyone can view reactions" ON reactions;
CREATE POLICY "Anyone can view reactions"
  ON reactions FOR SELECT
  USING (true);

-- Anyone can insert reactions (no auth needed)
DROP POLICY IF EXISTS "Anyone can insert reactions" ON reactions;
CREATE POLICY "Anyone can insert reactions"
  ON reactions FOR INSERT
  WITH CHECK (true);

-- Owner can update/delete their own reaction (by visitor_id)
DROP POLICY IF EXISTS "Visitors can update their own reactions" ON reactions;
CREATE POLICY "Visitors can update their own reactions"
  ON reactions FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Visitors can delete their own reactions" ON reactions;
CREATE POLICY "Visitors can delete their own reactions"
  ON reactions FOR DELETE
  USING (true);

-- Profile avatar, approval status, and admin flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Admin can update any profile (for approving/rejecting users)
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- Badge column for golden ticket / wammale cinema / MalamCult / absolute appi awards
ALTER TABLE entries ADD COLUMN IF NOT EXISTS badge TEXT;

-- Drop old constraint and add updated one
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_badge_check;
ALTER TABLE entries ADD CONSTRAINT entries_badge_check CHECK (badge IS NULL OR badge IN ('golden', 'wammale cinema', 'MalamCult', 'absolute appi'));

-- Change progress_episode to text so you can enter ranges like "1-5" or "1,3,5-7"
ALTER TABLE entries ALTER COLUMN progress_episode TYPE TEXT USING progress_episode::TEXT;

-- Runtime in minutes (for calculating total watch time)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS runtime INTEGER;

-- Tagline (one-liner from TMDB)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Cast and crew (comma-separated top cast from TMDB)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS cast_crew TEXT;

-- Custom poster URL (overrides TMDB poster)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS custom_poster_url TEXT;

-- IMDb ID for cross-referencing and enriched import
ALTER TABLE entries ADD COLUMN IF NOT EXISTS imdb_id TEXT;

-- Function to auto-update updated_at on entries
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON entries;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments table (followers can comment on reviews)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_entry_id ON comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;
CREATE POLICY "Authenticated users can insert comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comment author or entry owner can delete" ON comments;
CREATE POLICY "Comment author or entry owner can delete"
  ON comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT user_id FROM entries WHERE id = entry_id
    )
  );

DROP TRIGGER IF EXISTS set_updated_at ON comments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Instagram URL for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Favorite flag for personal favorite marking
ALTER TABLE entries ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can follow" ON follows;
CREATE POLICY "Users can follow"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Lists / Collections
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own lists" ON lists;
CREATE POLICY "Users can CRUD own lists"
  ON lists FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view public lists" ON lists;
CREATE POLICY "Anyone can view public lists"
  ON lists FOR SELECT
  USING (is_public = true);

CREATE TABLE IF NOT EXISTS list_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_list_entries_list_id ON list_entries(list_id);
CREATE INDEX IF NOT EXISTS idx_list_entries_entry_id ON list_entries(entry_id);

ALTER TABLE list_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "List owner can manage entries" ON list_entries;
CREATE POLICY "List owner can manage entries"
  ON list_entries FOR ALL
  USING (
    EXISTS (SELECT 1 FROM lists WHERE lists.id = list_entries.list_id AND lists.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can view public list entries" ON list_entries;
CREATE POLICY "Anyone can view public list entries"
  ON list_entries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM lists WHERE lists.id = list_entries.list_id AND lists.is_public = true)
  );

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Watch events (rewatch tracking + per-episode check-in)
CREATE TABLE IF NOT EXISTS watch_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  watch_date TEXT NOT NULL,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  season_number INTEGER,
  episode_number INTEGER,
  episode_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_events_entry_id ON watch_events(entry_id);
CREATE INDEX IF NOT EXISTS idx_watch_events_watch_date ON watch_events(watch_date);

ALTER TABLE watch_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage watch events via entries" ON watch_events;
CREATE POLICY "Users can manage watch events via entries"
  ON watch_events FOR ALL
  USING (
    EXISTS (SELECT 1 FROM entries WHERE entries.id = watch_events.entry_id AND entries.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can view watch events for public entries" ON watch_events;
CREATE POLICY "Anyone can view watch events for public entries"
  ON watch_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM entries WHERE entries.id = watch_events.entry_id)
  );

-- Function + trigger to update entry's updated_at when a watch event changes
CREATE OR REPLACE FUNCTION touch_entry_on_watch_event_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE entries SET updated_at = NOW() WHERE id = OLD.entry_id;
  ELSE
    UPDATE entries SET updated_at = NOW() WHERE id = NEW.entry_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_watch_event_change ON watch_events;
CREATE TRIGGER on_watch_event_change
  AFTER INSERT OR UPDATE OR DELETE ON watch_events
  FOR EACH ROW EXECUTE FUNCTION touch_entry_on_watch_event_change();

-- Watch goals (yearly targets)
CREATE TABLE IF NOT EXISTS watch_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  movie_target INTEGER DEFAULT 0,
  series_target INTEGER DEFAULT 0,
  episode_target INTEGER DEFAULT 0,
  hour_target INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_watch_goals_user_id ON watch_goals(user_id);

ALTER TABLE watch_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own goals" ON watch_goals;
CREATE POLICY "Users can manage own goals"
  ON watch_goals FOR ALL
  USING (auth.uid() = user_id);

-- Recommendations (friend-to-friend)
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  tmdb_id INTEGER,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('movie', 'series')),
  poster_path TEXT,
  year INTEGER,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_to ON recommendations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_from ON recommendations(from_user_id);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendations;
CREATE POLICY "Users can view own recommendations"
  ON recommendations FOR SELECT
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can send recommendations" ON recommendations;
CREATE POLICY "Users can send recommendations"
  ON recommendations FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Recipient can mark as read" ON recommendations;
CREATE POLICY "Recipient can mark as read"
  ON recommendations FOR UPDATE
  USING (auth.uid() = to_user_id);

-- Watch providers (TMDB streaming data) and download URL
ALTER TABLE entries ADD COLUMN IF NOT EXISTS watch_providers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS download_url TEXT;

-- Watch parties
CREATE TABLE IF NOT EXISTS watch_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tmdb_id INTEGER,
  media_type TEXT CHECK (media_type IN ('movie', 'series')),
  poster_path TEXT,
  year INTEGER,
  watch_date TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'watching', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_parties_host ON watch_parties(host_id);
CREATE INDEX IF NOT EXISTS idx_watch_parties_date ON watch_parties(watch_date);

ALTER TABLE watch_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view parties" ON watch_parties;
CREATE POLICY "Anyone can view parties"
  ON watch_parties FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Host can manage parties" ON watch_parties;
CREATE POLICY "Host can manage parties"
  ON watch_parties FOR ALL
  USING (auth.uid() = host_id);

CREATE TABLE IF NOT EXISTS watch_party_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'watched')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(party_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wpp_party ON watch_party_participants(party_id);
CREATE INDEX IF NOT EXISTS idx_wpp_user ON watch_party_participants(user_id);

ALTER TABLE watch_party_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Party participants are viewable by participants" ON watch_party_participants;
CREATE POLICY "Party participants are viewable by participants"
  ON watch_party_participants FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM watch_party_participants WHERE party_id = watch_party_participants.party_id
    )
    OR auth.uid() IN (SELECT host_id FROM watch_parties WHERE id = watch_party_participants.party_id)
  );

DROP POLICY IF EXISTS "Users can manage own participation" ON watch_party_participants;
CREATE POLICY "Users can manage own participation"
  ON watch_party_participants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Host can manage participants" ON watch_party_participants;
CREATE POLICY "Host can manage participants"
  ON watch_party_participants FOR ALL
  USING (
    auth.uid() IN (SELECT host_id FROM watch_parties WHERE id = watch_party_participants.party_id)
  );

ALTER TABLE watch_parties ADD COLUMN IF NOT EXISTS stream_url TEXT;
ALTER TABLE watch_parties ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS watch_party_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wpm_party ON watch_party_messages(party_id, created_at);

ALTER TABLE watch_party_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read messages" ON watch_party_messages;
CREATE POLICY "Anyone can read messages"
  ON watch_party_messages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can send messages" ON watch_party_messages;
CREATE POLICY "Authenticated users can send messages"
  ON watch_party_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Host can delete messages" ON watch_party_messages;
CREATE POLICY "Host can delete messages"
  ON watch_party_messages FOR DELETE
  USING (
    auth.uid() IN (SELECT host_id FROM watch_parties WHERE id = watch_party_messages.party_id)
  );

-- Sync position for watch party playback
ALTER TABLE watch_parties ADD COLUMN IF NOT EXISTS "current_time" FLOAT DEFAULT 0;
ALTER TABLE watch_parties ADD COLUMN IF NOT EXISTS is_playing BOOLEAN DEFAULT false;
