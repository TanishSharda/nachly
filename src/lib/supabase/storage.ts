import { SupabaseClient } from '@supabase/supabase-js';

const CHOREOGRAPHER_BUCKET = 'choreographer-uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Supabase free tier limit)

interface UploadOptions {
  choreographyId?: string;
  isDraft?: boolean;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  path: string;
  url: string | null;
  size: number;
  type: string;
}

/**
 * Upload a file to Supabase Storage for choreographer content
 */
export async function uploadChoreographerFile(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Prevent accidental client-side usage: this helper must run on server only.
  if (typeof window !== 'undefined') {
    throw new Error('uploadChoreographerFile is server-only. Use the signed-upload URL flow from the client.');
  }
  const { choreographyId = 'draft', isDraft = false } = options;

  // Validate file
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type not allowed: ${file.type}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Generate file path
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const status = isDraft ? 'draft' : 'published';
  const filePath = `${userId}/${status}/${choreographyId}/${timestamp}-${safeFileName}`;

  try {
    // Upload with retry and exponential backoff
    const maxAttempts = 3;
    let attempt = 0;
    let uploadData: any = null;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const { data, error } = await supabase.storage
          .from(CHOREOGRAPHER_BUCKET)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
            cacheControl: '3600',
          });

        if (error) {
          throw error;
        }

        uploadData = data;
        break;
      } catch (err: any) {
        // Final attempt -> rethrow
        if (attempt >= maxAttempts) {
          throw new Error(`Upload failed after ${attempt} attempts: ${String(err)}`);
        }
        // Exponential backoff (ms)
        const backoff = Math.pow(2, attempt) * 200; // 400ms, 800ms, ...
        await new Promise((res) => setTimeout(res, backoff));
      }
    }

    if (!uploadData) {
      throw new Error('Upload failed: no data returned');
    }

    // supabase client types for getPublicUrl can be narrow; access defensively
    const publicResult: any = supabase.storage
      .from(CHOREOGRAPHER_BUCKET)
      .getPublicUrl(uploadData?.path || filePath);

    return {
      path: uploadData.path,
      url: publicResult?.data?.publicUrl ?? null,
      size: file.size,
      type: file.type,
    };
  } catch (err) {
    throw new Error(`Upload failed: ${String(err)}`);
  }
}

/**
 * Get a signed URL for a file (useful for private/draft content)
 */
export async function getSignedUrl(
  supabase: SupabaseClient,
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new Error('getSignedUrl is server-only. Use the public or signed URL endpoints from the server.');
  }
  const { data, error } = await supabase.storage
    .from(CHOREOGRAPHER_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  supabase: SupabaseClient,
  filePath: string
): Promise<void> {
  if (typeof window !== 'undefined') {
    throw new Error('deleteFile is server-only.');
  }
  const { error } = await supabase.storage
    .from(CHOREOGRAPHER_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * List files for a choreography
 */
export async function listChoreographyFiles(
  supabase: SupabaseClient,
  userId: string,
  choreographyId: string
): Promise<Array<{ name: string; id: string | null; updated_at: string; metadata?: Record<string, any> }>> {
  const { data, error } = await supabase.storage
    .from(CHOREOGRAPHER_BUCKET)
    .list(`${userId}/published/${choreographyId}`, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return (data || []).map((file) => ({
    name: file.name,
    id: file.id,
    updated_at: file.updated_at ?? new Date(0).toISOString(),
    metadata: file.metadata ?? undefined,
  }));
}

/**
 * Get file metadata from database
 */
export async function getUploadMetadata(
  supabase: SupabaseClient,
  filePath: string
): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('choreography_uploads')
    .select('*')
    .eq('file_path', filePath)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Metadata fetch failed: ${error.message}`);
  }

  return data;
}
