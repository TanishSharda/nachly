-- Server-side drill catalog for authoritative user drill state

CREATE TABLE IF NOT EXISTS public.user_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_drill_id TEXT NOT NULL,
  body_part TEXT NOT NULL CHECK (body_part IN ('arms', 'legs', 'posture')),
  title TEXT NOT NULL,
  cue TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  target_score INTEGER NOT NULL CHECK (target_score >= 0 AND target_score <= 100),
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  source_style_slug TEXT,
  source_routine_slug TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, local_drill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_drills_user_updated
  ON public.user_drills (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_drills_user_completed
  ON public.user_drills (user_id, completed_at DESC);

ALTER TABLE public.user_drills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_drills'
      AND policyname = 'Users view own drills'
  ) THEN
    CREATE POLICY "Users view own drills"
      ON public.user_drills
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_drills'
      AND policyname = 'Users insert own drills'
  ) THEN
    CREATE POLICY "Users insert own drills"
      ON public.user_drills
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_drills'
      AND policyname = 'Users update own drills'
  ) THEN
    CREATE POLICY "Users update own drills"
      ON public.user_drills
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.update_user_drills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_user_drills ON public.user_drills;
CREATE TRIGGER set_updated_at_user_drills
  BEFORE UPDATE ON public.user_drills
  FOR EACH ROW EXECUTE FUNCTION public.update_user_drills_updated_at();
