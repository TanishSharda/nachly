-- Migration 012: Creator Ecosystem V2
-- Extends profiles, adds lesson parts, hashtags, follows

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teaching_philosophy TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'emerging'
    CHECK (experience_level IN ('emerging', 'established', 'master')),
  ADD COLUMN IF NOT EXISTS dance_styles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

CREATE TABLE IF NOT EXISTS public.routine_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.choreo_submissions(id) ON DELETE SET NULL,
  part_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  description TEXT,
  slow_mo_start REAL,
  slow_mo_end REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(routine_id, part_number)
);

CREATE TABLE IF NOT EXISTS public.routine_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(routine_id, tag)
);

CREATE TABLE IF NOT EXISTS public.creator_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, creator_id)
);

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS custom_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS music_credit TEXT,
  ADD COLUMN IF NOT EXISTS preview_video_url TEXT;

ALTER TABLE public.choreo_submissions
  ADD COLUMN IF NOT EXISTS lesson_parts JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS music_credit TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS slow_mo_markers JSONB DEFAULT '[]';

ALTER TABLE public.routine_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='routine_parts' AND policyname='Parts viewable') THEN
    CREATE POLICY "Parts viewable" ON public.routine_parts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='routine_hashtags' AND policyname='Tags viewable') THEN
    CREATE POLICY "Tags viewable" ON public.routine_hashtags FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='creator_follows' AND policyname='Follows viewable') THEN
    CREATE POLICY "Follows viewable" ON public.creator_follows FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='creator_follows' AND policyname='Users manage follows') THEN
    CREATE POLICY "Users manage follows" ON public.creator_follows FOR ALL USING (auth.uid()=follower_id) WITH CHECK (auth.uid()=follower_id);
  END IF;
END $$;
