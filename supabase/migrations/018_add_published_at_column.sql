-- Add published_at column to choreo_submissions for tracking when a routine is published
ALTER TABLE public.choreo_submissions
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Create an index for querying published submissions
CREATE INDEX IF NOT EXISTS idx_choreo_submissions_published
  ON public.choreo_submissions (published_at DESC NULLS LAST)
  WHERE published_at IS NOT NULL;
