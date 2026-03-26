-- Phase 4: Curated scroll experience foundations
-- Adds user saves + quick reactions for premium action-focused scroll UX.

CREATE TABLE IF NOT EXISTS public.user_saved_choreos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  choreo_id TEXT NOT NULL,
  title TEXT,
  video_url TEXT,
  style_slug TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, choreo_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_choreos_user_created
  ON public.user_saved_choreos (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_saved_choreos_choreo
  ON public.user_saved_choreos (choreo_id);

CREATE TABLE IF NOT EXISTS public.choreo_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choreo_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  anon_key TEXT,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('loved_it', 'hard', 'practicing', 'fast_moves')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT choreo_reactions_actor_required CHECK (user_id IS NOT NULL OR anon_key IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_choreo_reactions_user
  ON public.choreo_reactions (choreo_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_choreo_reactions_anon
  ON public.choreo_reactions (choreo_id, anon_key)
  WHERE anon_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_choreo_reactions_choreo_type_created
  ON public.choreo_reactions (choreo_id, reaction_type, created_at DESC);

ALTER TABLE public.user_saved_choreos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choreo_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_saved_choreos'
      AND policyname = 'Users view own saved choreos'
  ) THEN
    CREATE POLICY "Users view own saved choreos"
      ON public.user_saved_choreos
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_saved_choreos'
      AND policyname = 'Users insert own saved choreos'
  ) THEN
    CREATE POLICY "Users insert own saved choreos"
      ON public.user_saved_choreos
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_saved_choreos'
      AND policyname = 'Users delete own saved choreos'
  ) THEN
    CREATE POLICY "Users delete own saved choreos"
      ON public.user_saved_choreos
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_reactions'
      AND policyname = 'Choreo reactions readable by all'
  ) THEN
    CREATE POLICY "Choreo reactions readable by all"
      ON public.choreo_reactions
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_reactions'
      AND policyname = 'Users insert own choreo reactions'
  ) THEN
    CREATE POLICY "Users insert own choreo reactions"
      ON public.choreo_reactions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'choreo_reactions'
      AND policyname = 'Users delete own choreo reactions'
  ) THEN
    CREATE POLICY "Users delete own choreo reactions"
      ON public.choreo_reactions
      FOR DELETE
      USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END
$$;
