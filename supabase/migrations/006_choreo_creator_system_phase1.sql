-- Phase 1: Choreography Upload + Creator System foundation
-- Adds moderated submission flow, async AI evaluation storage, tiers, and weekly featured scheduling.

-- ------------------------------------------------------------
-- routines extensions
-- ------------------------------------------------------------
ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS submission_tier TEXT NOT NULL DEFAULT 'community'
    CHECK (submission_tier IN ('community', 'rising', 'official')),
  ADD COLUMN IF NOT EXISTS submission_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (submission_status IN ('draft', 'pending_review', 'ai_evaluating', 'needs_improvement', 'approved', 'rejected', 'published')),
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS community_video_url TEXT,
  ADD COLUMN IF NOT EXISTS ai_overall_score INTEGER CHECK (ai_overall_score >= 0 AND ai_overall_score <= 100),
  ADD COLUMN IF NOT EXISTS ai_score_breakdown JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quality_checklist JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resubmission_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_feedback TEXT,
  ADD COLUMN IF NOT EXISTS is_weekly_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured_week_start DATE,
  ADD COLUMN IF NOT EXISTS featured_week_end DATE,
  ADD COLUMN IF NOT EXISTS official_selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS creator_badge_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS creator_badge_awarded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_routines_submission_tier ON public.routines (submission_tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routines_submission_status ON public.routines (submission_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_routines_featured_week ON public.routines (is_weekly_featured, featured_week_start DESC);

-- ------------------------------------------------------------
-- choreo_submissions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.choreo_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  caption TEXT,
  video_url TEXT NOT NULL,
  style_slug TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),

  checklist_full_body_visible BOOLEAN NOT NULL,
  checklist_stable_camera BOOLEAN NOT NULL,
  checklist_good_lighting BOOLEAN NOT NULL,
  checklist_passed BOOLEAN NOT NULL,

  tier TEXT NOT NULL DEFAULT 'community' CHECK (tier IN ('community', 'rising', 'official')),
  submission_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (submission_status IN ('draft', 'pending_review', 'ai_evaluating', 'needs_improvement', 'approved', 'rejected', 'archived')),

  ai_status TEXT NOT NULL DEFAULT 'pending' CHECK (ai_status IN ('pending', 'queued', 'processing', 'completed', 'failed')),
  ai_overall_score INTEGER CHECK (ai_overall_score >= 0 AND ai_overall_score <= 100),
  ai_timing_score INTEGER CHECK (ai_timing_score >= 0 AND ai_timing_score <= 100),
  ai_energy_score INTEGER CHECK (ai_energy_score >= 0 AND ai_energy_score <= 100),
  ai_accuracy_score INTEGER CHECK (ai_accuracy_score >= 0 AND ai_accuracy_score <= 100),
  ai_expression_score INTEGER CHECK (ai_expression_score >= 0 AND ai_expression_score <= 100),
  ai_level_tag TEXT CHECK (ai_level_tag IN ('beginner', 'intermediate', 'pro')),
  ai_quality_tag TEXT CHECK (ai_quality_tag IN ('clean', 'needs_improvement')),
  ai_tags TEXT[] NOT NULL DEFAULT '{}',
  ai_feedback JSONB NOT NULL DEFAULT '{}',
  improvement_suggestions TEXT[] NOT NULL DEFAULT '{}',

  engagement_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  try_this_count INTEGER NOT NULL DEFAULT 0,

  weekly_points NUMERIC(8, 2) NOT NULL DEFAULT 0,
  review_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  submitted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  parent_submission_id UUID REFERENCES public.choreo_submissions(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_choreo_submissions_user_created
  ON public.choreo_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_choreo_submissions_status
  ON public.choreo_submissions (submission_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_choreo_submissions_tier_score
  ON public.choreo_submissions (tier, ai_overall_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_choreo_submissions_style_weekly
  ON public.choreo_submissions (style_slug, weekly_points DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_choreo_submissions_ai_status
  ON public.choreo_submissions (ai_status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_choreo_submissions_parent
  ON public.choreo_submissions (parent_submission_id);

CREATE TRIGGER set_updated_at_choreo_submissions
  BEFORE UPDATE ON public.choreo_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- weekly_featured_choreos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_featured_choreos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  slot_position INTEGER NOT NULL CHECK (slot_position BETWEEN 1 AND 5),
  submission_id UUID NOT NULL REFERENCES public.choreo_submissions(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  is_curator_override BOOLEAN NOT NULL DEFAULT FALSE,
  curator_note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (week_start, slot_position)
);

CREATE INDEX IF NOT EXISTS idx_weekly_featured_active
  ON public.weekly_featured_choreos (week_start DESC, slot_position ASC);

CREATE INDEX IF NOT EXISTS idx_weekly_featured_submission
  ON public.weekly_featured_choreos (submission_id);

-- ------------------------------------------------------------
-- RLS policies
-- ------------------------------------------------------------
ALTER TABLE public.choreo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_featured_choreos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_submissions'
      AND policyname = 'Users view own choreo submissions'
  ) THEN
    CREATE POLICY "Users view own choreo submissions"
      ON public.choreo_submissions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_submissions'
      AND policyname = 'Users insert own choreo submissions'
  ) THEN
    CREATE POLICY "Users insert own choreo submissions"
      ON public.choreo_submissions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_submissions'
      AND policyname = 'Users update own editable submissions'
  ) THEN
    CREATE POLICY "Users update own editable submissions"
      ON public.choreo_submissions
      FOR UPDATE
      USING (
        auth.uid() = user_id
        AND submission_status IN ('draft', 'needs_improvement', 'rejected')
      )
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_submissions'
      AND policyname = 'Admins moderate all submissions'
  ) THEN
    CREATE POLICY "Admins moderate all submissions"
      ON public.choreo_submissions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'weekly_featured_choreos'
      AND policyname = 'Weekly featured viewable by all'
  ) THEN
    CREATE POLICY "Weekly featured viewable by all"
      ON public.weekly_featured_choreos
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'weekly_featured_choreos'
      AND policyname = 'Admins manage weekly featured'
  ) THEN
    CREATE POLICY "Admins manage weekly featured"
      ON public.weekly_featured_choreos
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;
END
$$;