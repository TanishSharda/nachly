-- Add profile preferences and feedback submissions

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT NOT NULL,
  dance_styles TEXT[] NOT NULL DEFAULT '{}',
  other_style TEXT,
  experience_level TEXT NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  message TEXT NOT NULL,
  message_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_ip_hash_created_at ON public.feedback_submissions (ip_hash, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_feedback_email_message_hash ON public.feedback_submissions ((lower(email)), message_hash);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feedback_submissions'
      AND policyname = 'Public insert feedback'
  ) THEN
    CREATE POLICY "Public insert feedback"
      ON public.feedback_submissions
      FOR INSERT
      WITH CHECK (true);
  END IF;
END
$$;
