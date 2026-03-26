-- Phase 2: Choreo engagement events for scroll actions

CREATE TABLE IF NOT EXISTS public.choreo_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choreo_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  anon_key TEXT,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'comment', 'try_this', 'view_stats')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT choreo_engagement_actor_required CHECK (user_id IS NOT NULL OR anon_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_choreo_engagement_choreo_type_created
  ON public.choreo_engagement_events (choreo_id, interaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_choreo_engagement_user_type
  ON public.choreo_engagement_events (user_id, choreo_id, interaction_type)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.choreo_engagement_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_engagement_events'
      AND policyname = 'Choreo engagement read public'
  ) THEN
    CREATE POLICY "Choreo engagement read public"
      ON public.choreo_engagement_events
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_engagement_events'
      AND policyname = 'Users insert own choreo engagement'
  ) THEN
    CREATE POLICY "Users insert own choreo engagement"
      ON public.choreo_engagement_events
      FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_engagement_events'
      AND policyname = 'Users delete own like events'
  ) THEN
    CREATE POLICY "Users delete own like events"
      ON public.choreo_engagement_events
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;