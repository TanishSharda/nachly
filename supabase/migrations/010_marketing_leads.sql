-- Marketing lead capture for homepage conversion funnel.

CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'homepage',
  page TEXT NOT NULL DEFAULT '/',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_key TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_leads_email_lower CHECK (email = lower(email))
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_marketing_leads_email
  ON public.marketing_leads (email);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_created_at
  ON public.marketing_leads (created_at DESC);

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'marketing_leads'
      AND policyname = 'Marketing leads insert allowed'
  ) THEN
    CREATE POLICY "Marketing leads insert allowed"
      ON public.marketing_leads
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'marketing_leads'
      AND policyname = 'Marketing leads select disabled'
  ) THEN
    CREATE POLICY "Marketing leads select disabled"
      ON public.marketing_leads
      FOR SELECT
      USING (false);
  END IF;
END
$$;
