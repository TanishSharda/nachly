-- Migration: add recommended indexes for feed and lookups
-- Run this as a migration in staging first, then production after validation.

CREATE INDEX IF NOT EXISTS idx_routines_created_at ON routines (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routines_creator_id ON routines (creator_id);
CREATE INDEX IF NOT EXISTS idx_choreo_submissions_choreography_id ON choreo_submissions (choreography_id);
CREATE INDEX IF NOT EXISTS idx_choreo_views_choreo_id ON choreography_views (choreography_id);

-- Consider composite indexes for common filter patterns (style + created_at)
-- CREATE INDEX IF NOT EXISTS idx_routines_style_created_at ON routines (dance_style, created_at DESC);
