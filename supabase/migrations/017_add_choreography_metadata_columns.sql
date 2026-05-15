-- Add missing choreography metadata columns to choreo_submissions table
-- These columns are required for storing complete choreography information

ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS lesson_parts JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS hashtags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS music_credit TEXT;
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS slow_mo_markers JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS trim_start_seconds NUMERIC;
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS trim_end_seconds NUMERIC;
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS caption_overlays JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS video_duration_seconds NUMERIC;
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'free' CHECK (access_type IN ('free', 'ppv', 'subscription'));
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.choreo_submissions ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
