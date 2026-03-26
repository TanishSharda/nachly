-- Naachly Database Schema
-- Run this migration in your Supabase SQL Editor

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'choreographer', 'admin')),
  bio           TEXT,
  social_links  JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DANCE_STYLES
-- ============================================================
CREATE TABLE public.dance_styles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  cover_image   TEXT,
  gradient_from TEXT DEFAULT '#722F37',
  gradient_to   TEXT DEFAULT '#C5A572',
  price_inr     INTEGER NOT NULL DEFAULT 29900,
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROUTINES
-- ============================================================
CREATE TABLE public.routines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id         UUID NOT NULL REFERENCES dance_styles(id) ON DELETE CASCADE,
  choreographer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  slug             TEXT NOT NULL,
  description      TEXT,
  difficulty       TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_seconds INTEGER NOT NULL,
  thumbnail_url    TEXT,
  is_published     BOOLEAN DEFAULT FALSE,
  is_approved      BOOLEAN DEFAULT FALSE,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(style_id, slug)
);

-- ============================================================
-- ROUTINE_VIDEOS
-- ============================================================
CREATE TABLE public.routine_videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id      UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  video_type      TEXT NOT NULL CHECK (video_type IN ('performance', 'teaching', 'practice')),
  video_url       TEXT NOT NULL,
  duration_seconds INTEGER,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(routine_id, video_type)
);

-- ============================================================
-- ROUTINE_STEPS
-- ============================================================
CREATE TABLE public.routine_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id  UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  label       TEXT NOT NULL,
  start_time  REAL NOT NULL,
  end_time    REAL NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(routine_id, step_number)
);

-- ============================================================
-- INSTRUCTOR_POSE_DATA
-- ============================================================
CREATE TABLE public.instructor_pose_data (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id   UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  timestamp_ms INTEGER NOT NULL,
  keypoints    JSONB NOT NULL,
  angles       JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pose_data_routine_time ON instructor_pose_data(routine_id, timestamp_ms);

-- ============================================================
-- PURCHASES
-- ============================================================
CREATE TABLE public.purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  style_id    UUID NOT NULL REFERENCES dance_styles(id) ON DELETE CASCADE,
  amount_inr  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded')),
  payment_ref TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, style_id)
);

-- ============================================================
-- USER_PROGRESS
-- ============================================================
CREATE TABLE public.user_progress (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id        UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  learn_completed   BOOLEAN DEFAULT FALSE,
  current_step      INTEGER DEFAULT 1,
  steps_completed   INTEGER[] DEFAULT '{}',
  best_score        REAL DEFAULT 0,
  total_sessions    INTEGER DEFAULT 0,
  total_practice_ms INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, routine_id)
);

-- ============================================================
-- PRACTICE_SESSIONS
-- ============================================================
CREATE TABLE public.practice_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id        UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  accuracy_score    REAL NOT NULL,
  consistency_score REAL NOT NULL,
  completion_pct    REAL NOT NULL,
  duration_ms       INTEGER NOT NULL,
  difficulty_level  TEXT,
  body_part_scores  JSONB,
  mistakes          JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHOREOGRAPHER_APPLICATIONS
-- ============================================================
CREATE TABLE public.choreographer_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  portfolio_url TEXT,
  experience    TEXT NOT NULL,
  specialties   TEXT[] NOT NULL,
  sample_video  TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes   TEXT,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYOUTS
-- ============================================================
CREATE TABLE public.payouts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choreographer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  total_purchases    INTEGER NOT NULL,
  gross_amount_inr   INTEGER NOT NULL,
  choreographer_share INTEGER NOT NULL,
  platform_share     INTEGER NOT NULL,
  status             TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid')),
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER_STREAKS
-- ============================================================
CREATE TABLE public.user_streaks (
  user_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dance_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_pose_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE choreographer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Dance styles (public read)
CREATE POLICY "Styles viewable" ON dance_styles FOR SELECT USING (is_active = true);

-- Routines (published + approved)
CREATE POLICY "Published routines viewable" ON routines FOR SELECT USING (is_published AND is_approved);
CREATE POLICY "Choreographers manage own" ON routines FOR ALL USING (choreographer_id = auth.uid());

-- Videos & steps (public read for now, add purchase check later)
CREATE POLICY "Videos viewable" ON routine_videos FOR SELECT USING (true);
CREATE POLICY "Steps viewable" ON routine_steps FOR SELECT USING (true);
CREATE POLICY "Pose data viewable" ON instructor_pose_data FOR SELECT USING (true);

-- Purchases
CREATE POLICY "Users see own purchases" ON purchases FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users create purchases" ON purchases FOR INSERT WITH CHECK (user_id = auth.uid());

-- Progress
CREATE POLICY "Users manage own progress" ON user_progress FOR ALL USING (user_id = auth.uid());

-- Practice sessions
CREATE POLICY "Users manage own sessions" ON practice_sessions FOR ALL USING (user_id = auth.uid());

-- Applications
CREATE POLICY "Users manage own applications" ON choreographer_applications FOR ALL USING (user_id = auth.uid());

-- Payouts
CREATE POLICY "Choreographers see own payouts" ON payouts FOR SELECT USING (choreographer_id = auth.uid());

-- Streaks
CREATE POLICY "Users manage own streaks" ON user_streaks FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Dancer'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_streaks (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_routines BEFORE UPDATE ON routines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_progress BEFORE UPDATE ON user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO dance_styles (slug, name, description, gradient_from, gradient_to, price_inr, sort_order) VALUES
('hip-hop', 'Hip Hop', 'Master the fundamentals of hip hop with groove, isolations, and street-style choreography.', '#2C1810', '#722F37', 29900, 0),
('bollywood', 'Bollywood', 'Feel the rhythm of Bollywood with expressive choreography and high-energy footwork.', '#722F37', '#C5A572', 29900, 1),
('kathak', 'Kathak', 'Explore the elegance of Kathak with intricate footwork and expressive storytelling.', '#8c1f2e', '#ddbe88', 29900, 2),
('bhangra', 'Bhangra', 'Get energized with Bhangra — powerful shoulder movements, jumps, and infectious beats.', '#C5A572', '#722F37', 29900, 3);
