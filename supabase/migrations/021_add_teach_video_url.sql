-- Add teach_video_url column to choreo_submissions used by creator upload

ALTER TABLE public.choreo_submissions
  ADD COLUMN IF NOT EXISTS teach_video_url TEXT;
