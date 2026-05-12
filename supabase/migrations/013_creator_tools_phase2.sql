-- Phase 2: Creator tools metadata
-- Adds trim, caption overlays, and duration for drafts and submissions.

ALTER TABLE public.choreo_submissions
  ADD COLUMN IF NOT EXISTS trim_start_seconds REAL,
  ADD COLUMN IF NOT EXISTS trim_end_seconds REAL,
  ADD COLUMN IF NOT EXISTS caption_overlays JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS video_duration_seconds REAL;
