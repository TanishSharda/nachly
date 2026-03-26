-- Server-signed drill completion events for tamper-resistant progression audit

CREATE TABLE IF NOT EXISTS public.drill_completion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  drill_id UUID NOT NULL,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  style_slug TEXT NOT NULL,
  routine_slug TEXT NOT NULL,
  body_part TEXT NOT NULL CHECK (body_part IN ('arms', 'legs', 'posture')),
  target_score INTEGER NOT NULL CHECK (target_score >= 0 AND target_score <= 100),
  achieved_score INTEGER NOT NULL CHECK (achieved_score >= 0 AND achieved_score <= 100),
  auto_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completion_source TEXT NOT NULL CHECK (completion_source IN ('auto-hold', 'manual-end')),
  compared_frames INTEGER NOT NULL DEFAULT 0,
  body_part_samples INTEGER NOT NULL DEFAULT 0,
  stable_samples INTEGER NOT NULL DEFAULT 0,
  signed_payload TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drill_completion_events_user_created_at
  ON public.drill_completion_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drill_completion_events_drill_created_at
  ON public.drill_completion_events (drill_id, created_at DESC);

ALTER TABLE public.drill_completion_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drill_completion_events'
      AND policyname = 'Users view own drill completion events'
  ) THEN
    CREATE POLICY "Users view own drill completion events"
      ON public.drill_completion_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drill_completion_events'
      AND policyname = 'Users insert own drill completion events'
  ) THEN
    CREATE POLICY "Users insert own drill completion events"
      ON public.drill_completion_events
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
