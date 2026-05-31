import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { logServiceRoleUsage } from '@/lib/security/serviceRoleAudit';
import { enforceRateLimit } from '@/lib/security/rateLimiter';
import { getVideoDuration } from '@/lib/media/ffprobe';

// Route segment config for large file uploads
export const maxDuration = 300; // 5 minutes timeout

interface UploadResponse {
  ok?: boolean;
  file?: {
    path: string;
    url: string;
    size: number;
    type: string;
  };
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    try {
      const maybe = await enforceRateLimit(request as unknown as NextRequest, { windowMs: 60_000, max: 10, keyPrefix: 'choreographer:upload' });
      if (maybe) return maybe;
    } catch (e) {
      // ignore limiter failures
    }
    const supabase = await createServerSupabase();
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 503 });
    }

    const db = createServiceRoleClient();
    console.log('[/api/choreographer/upload] Service role present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const choreographyId = formData.get('choreographyId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max for Supabase free tier)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 413 }
      );
    }

    // Validate file type (video or image)
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
      return NextResponse.json(
        { error: `File type not allowed. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Prepare filename and buffer for upload and optional server-side checks
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Server-side video duration validation (optional, requires ffprobe in PATH).
    if (file.type.startsWith('video/')) {
      try {
        const duration = await getVideoDuration(fileBuffer, `${timestamp}-${safeFileName}`);
        if (duration !== null && duration > maxDuration) {
          return NextResponse.json({ error: 'Video duration exceeds maximum allowed length' }, { status: 413 });
        }
      } catch (e) {
        console.warn('Video duration check failed:', (e as any)?.message || e);
      }
    }

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Generate unique file path: user-id/choreography-id/timestamp-filename
    const filePath = `${user.id}/${choreographyId || 'draft'}/${timestamp}-${safeFileName}`;

    try {
      logServiceRoleUsage({ caller: 'api/choreographer/upload', note: `user:${user.id} file:${filePath}` });
    } catch (_) {}

    // Use previously-read buffer
    const buffer = fileBuffer;

    // Upload to Supabase Storage
    const { data, error } = await db.storage
      .from('choreographer-uploads')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      console.error('[/api/choreographer/upload] Storage error:', error);
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = db.storage
      .from('choreographer-uploads')
      .getPublicUrl(data.path);

    // Record upload metadata in database
    const { error: dbError } = await db
      .from('choreography_uploads')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: data.path,
        file_size: file.size,
        file_type: file.type,
        choreography_id: choreographyId || null,
        status: 'completed',
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalSize: file.size,
        },
      });

    if (dbError) {
      console.error('[/api/choreographer/upload] Database error:', JSON.stringify(dbError));
      // Storage succeeded but DB record failed - not critical
    }

    return NextResponse.json({
      ok: true,
      file: {
        path: data.path,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type,
      },
    });
  } catch (err) {
    console.error('[/api/choreographer/upload] Error:', err);
    return NextResponse.json(
      { error: 'Upload failed', message: String(err) },
      { status: 500 }
    );
  }
}
