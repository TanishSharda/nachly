-- Add performance video URL column to choreo_submissions for new feature

ALTER TABLE public.choreo_submissions
  ADD COLUMN IF NOT EXISTS performance_video_url TEXT;
