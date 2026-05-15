-- Migration: Set up choreographer storage bucket and RLS policies
-- This migration creates a Supabase Storage bucket for choreographer video and image uploads

-- Create the choreographer-uploads bucket (public read, authenticated write)
-- Note: In the Supabase UI, create a bucket named 'choreographer-uploads' with:
-- - Visibility: Public
-- - File size limit: 50MB (Supabase free tier limit)

-- RLS Policies for choreographer-uploads bucket

-- Policy: Allow authenticated users to upload their own choreography videos
CREATE POLICY "Allow authenticated users to upload choreography" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'choreographer-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Allow users to read their own uploads
CREATE POLICY "Allow users to read their own choreography uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'choreographer-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Allow users to update their own uploads (for metadata)
CREATE POLICY "Allow users to update their own choreography uploads" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'choreographer-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'choreographer-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Allow users to delete their own uploads
CREATE POLICY "Allow users to delete their own choreography uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'choreographer-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Allow public read access to published choreography videos (for learners)
CREATE POLICY "Allow public read access to published choreography" ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'choreographer-uploads'
    AND (storage.foldername(name))[2] = 'published'
  );

-- Add choreography_uploads table to track uploads metadata
CREATE TABLE IF NOT EXISTS choreography_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_size integer,
  file_type text,
  status text DEFAULT 'uploading' CHECK (status IN ('uploading', 'completed', 'failed', 'processing')),
  choreography_id uuid REFERENCES choreo_submissions(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create index on user_id for faster queries
CREATE INDEX choreography_uploads_user_id_idx ON choreography_uploads(user_id);
CREATE INDEX choreography_uploads_choreography_id_idx ON choreography_uploads(choreography_id);
CREATE INDEX choreography_uploads_status_idx ON choreography_uploads(status);

-- Enable RLS on choreography_uploads
ALTER TABLE choreography_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for choreography_uploads table
-- Users can insert their own uploads
CREATE POLICY "Users can insert their own choreography uploads"
  ON choreography_uploads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own uploads
CREATE POLICY "Users can read their own choreography uploads"
  ON choreography_uploads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own uploads
CREATE POLICY "Users can update their own choreography uploads"
  ON choreography_uploads FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own uploads
CREATE POLICY "Users can delete their own choreography uploads"
  ON choreography_uploads FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
