# Supabase Storage Setup for Choreographer Uploads

This document outlines the Supabase Storage backend configuration for file uploads in Naachly.

## Overview

Choreographers can now upload video and image files directly to Supabase Storage through a secure, authenticated API endpoint. Files are organized by user ID and access level (draft/published).

## Setup Instructions

### 1. Create Storage Bucket in Supabase

In the Supabase Dashboard:

1. Navigate to **Storage** → **Buckets**
2. Click **Create a new bucket**
3. Configure:
   - **Name:** `choreographer-uploads`
   - **Visibility:** Public (files will have public URLs)
   - **File size limit:** 50MB (Supabase free tier)
4. Click **Create bucket**

### 2. Run Migration

Execute the migration file to set up RLS policies and metadata table:

```sql
supabase migration up
```

Or manually run the SQL in: `supabase/migrations/016_choreographer_storage_setup.sql`

This creates:
- RLS policies for secure file access
- `choreography_uploads` table for metadata tracking

### 3. Configure Environment

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## API Endpoint

### POST `/api/choreographer/upload`

Upload a file to Supabase Storage.

**Request:**
```
Content-Type: multipart/form-data

file: File (video/mp4, video/webm, video/quicktime, image/jpeg, image/png, image/webp)
choreographyId?: string (optional, defaults to 'draft')
```

**Response:**
```json
{
  "ok": true,
  "file": {
    "path": "user-id/draft/123456-filename.mp4",
    "url": "https://..."
    "size": 52428800,
    "type": "video/mp4"
  }
}
```

**Error Response:**
```json
{
  "error": "File size exceeds 50MB limit"
}
```

## File Organization

Files are stored in this directory structure:

```
choreographer-uploads/
├── {user-id}/
│   ├── draft/
│   │   └── {choreography-id}/
│   │       └── {timestamp}-{filename}
│   └── published/
│       └── {choreography-id}/
│           └── {timestamp}-{filename}
```

- **draft/** - Private choreography in progress
- **published/** - Public choreography available to learners

## Storage Utilities

Use the helpers in `src/lib/supabase/storage.ts`:

```typescript
import { 
  uploadChoreographerFile, 
  deleteFile, 
  getSignedUrl, 
  listChoreographyFiles 
} from '@/lib/supabase/storage';

// Upload a file
const result = await uploadChoreographerFile(
  supabase,
  file,
  userId,
  { choreographyId: 'my-choreo', isDraft: false }
);

// Delete a file
await deleteFile(supabase, 'user-id/draft/choreo-id/filename.mp4');

// Get signed URL (for private files)
const signedUrl = await getSignedUrl(supabase, filePath);

// List files for a choreography
const files = await listChoreographyFiles(supabase, userId, choreographyId);
```

## Features

### ✅ Implemented

- Authenticated file upload via `/api/choreographer/upload`
- RLS policies for secure access control
- Metadata tracking in `choreography_uploads` table
- File size validation (max 50MB)
- File type validation (videos and images only)
- Public URL generation for published content
- Storage utility helpers

### 🔄 Upload Page Integration

The existing upload wizard at `/upload-choreo` can use the new upload API:

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('choreographyId', choreographyId);

const response = await fetch('/api/choreographer/upload', {
  method: 'POST',
  body: formData
});
```

## Security

- **Authentication:** All uploads require valid Supabase auth token
- **RLS Policies:** Users can only access their own files
- **File Validation:** Type and size checks on both client and server
- **Path Isolation:** Files organized by user ID to prevent conflicts
- **Public URLs:** Only "published" files are publicly accessible

## Monitoring

Track uploads via the `choreography_uploads` table:

```sql
-- Get recent uploads
SELECT * FROM choreography_uploads 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC 
LIMIT 20;

-- Get upload stats
SELECT 
  status, 
  COUNT(*) as count, 
  SUM(file_size) as total_size 
FROM choreography_uploads 
GROUP BY status;
```

## Troubleshooting

### "Bucket not found" error
- Ensure the `choreographer-uploads` bucket exists in Supabase Dashboard
- Check bucket visibility is set to "Public"

### "RLS policy violation" error
- Verify migration has been run
- Check user is authenticated with valid JWT token
- Confirm file path follows expected format: `{user-id}/...`

### Large file upload failures
- Check Vercel timeout settings (currently set to 300s)
- Verify file is within 50MB limit
- Check network stability for large files

## Future Enhancements

- [ ] Resume interrupted uploads
- [ ] Video transcoding pipeline
- [ ] Automatic thumbnail generation
- [ ] CDN optimization
- [ ] Virus scanning integration
- [ ] Usage analytics dashboard
