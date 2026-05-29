-- Add song_name column to choreo_submissions used by creator upload

ALTER TABLE public.choreo_submissions
  ADD COLUMN IF NOT EXISTS song_name TEXT;
