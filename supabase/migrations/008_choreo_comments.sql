-- Phase 3: Choreo comments for scroll feed interactions

CREATE TABLE IF NOT EXISTS public.choreo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choreo_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  anon_key TEXT,
  display_name TEXT,
  comment_text TEXT NOT NULL CHECK (char_length(comment_text) BETWEEN 1 AND 400),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT choreo_comments_actor_required CHECK (user_id IS NOT NULL OR anon_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_choreo_comments_choreo_created
  ON public.choreo_comments (choreo_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_choreo_comments_user_created
  ON public.choreo_comments (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.choreo_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_comments'
      AND policyname = 'Choreo comments readable by all'
  ) THEN
    CREATE POLICY "Choreo comments readable by all"
      ON public.choreo_comments
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_comments'
      AND policyname = 'Users insert own choreo comments'
  ) THEN
    CREATE POLICY "Users insert own choreo comments"
      ON public.choreo_comments
      FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_comments'
      AND policyname = 'Users delete own choreo comments'
  ) THEN
    CREATE POLICY "Users delete own choreo comments"
      ON public.choreo_comments
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;