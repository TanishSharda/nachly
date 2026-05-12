-- Creator Wizard Presets
-- Stores choreographer routine concepts before upload

CREATE TABLE public.creator_wizard_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choreographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Concept (Step 1)
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Structure (Step 2)
  style_slug TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  lesson_count INTEGER NOT NULL DEFAULT 6 CHECK (lesson_count >= 3 AND lesson_count <= 12),
  
  -- Monetization (Step 3)
  access_type TEXT NOT NULL DEFAULT 'free' CHECK (access_type IN ('free', 'ppv', 'subscription')),
  audience TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_wizard_presets ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own presets
CREATE POLICY "Users see own presets" ON public.creator_wizard_presets
  FOR SELECT
  USING (choreographer_id = auth.uid());

-- Policy: users can insert their own presets
CREATE POLICY "Users create own presets" ON public.creator_wizard_presets
  FOR INSERT
  WITH CHECK (choreographer_id = auth.uid());

-- Policy: users can update their own presets
CREATE POLICY "Users update own presets" ON public.creator_wizard_presets
  FOR UPDATE
  USING (choreographer_id = auth.uid())
  WITH CHECK (choreographer_id = auth.uid());

-- Policy: users can delete their own presets
CREATE POLICY "Users delete own presets" ON public.creator_wizard_presets
  FOR DELETE
  USING (choreographer_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_creator_wizard_presets_choreographer_id
  ON public.creator_wizard_presets(choreographer_id);
