-- Auth-backed practice attempt history for replay flows

CREATE TABLE IF NOT EXISTS public.practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  choreo_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  video_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_choreo_created
  ON public.practice_attempts (user_id, choreo_id, created_at DESC);

ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practice_attempts'
      AND policyname = 'Users view own practice attempts'
  ) THEN
    CREATE POLICY "Users view own practice attempts"
      ON public.practice_attempts
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practice_attempts'
      AND policyname = 'Users insert own practice attempts'
  ) THEN
    CREATE POLICY "Users insert own practice attempts"
      ON public.practice_attempts
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;