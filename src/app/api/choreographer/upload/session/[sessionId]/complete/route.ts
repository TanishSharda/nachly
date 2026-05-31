import { NextRequest, NextResponse } from 'next/server';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { logServiceRoleUsage } from '@/lib/security/serviceRoleAudit';
import { getVideoDuration } from '@/lib/media/ffprobe';

export async function POST(request: NextRequest, { params }: any) {
  const { sessionId } = params as { sessionId: string };
  try {
    const form = await request.formData();
    const fileName = (form.get('fileName') as string) || `upload-${Date.now()}`;
    const choreographyId = (form.get('choreographyId') as string) || null;

    const dir = join(tmpdir(), `upload-session-${sessionId}`);
    // read chunk files in numeric order
    const files = await fs.readdir(dir);
    const chunkFiles = files.filter((f) => f.startsWith('chunk-')).sort((a, b) => {
      const ai = Number(a.split('-')[1]);
      const bi = Number(b.split('-')[1]);
      return ai - bi;
    });
    if (chunkFiles.length === 0) return NextResponse.json({ error: 'No chunks found' }, { status: 400 });

    // concatenate buffers
    const buffers: Buffer[] = [];
    for (const cf of chunkFiles) {
      const b = await fs.readFile(join(dir, cf));
      buffers.push(b);
    }
    const full = Buffer.concat(buffers);

    // optional duration check
    try {
      const duration = await getVideoDuration(full, fileName);
      if (duration !== null && duration > 300) {
        await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
        return NextResponse.json({ error: 'Video duration exceeds maximum allowed length' }, { status: 413 });
      }
    } catch (e) {
      console.warn('duration check failed', e);
    }

    // Upload to Supabase storage
    const supabase = await createServerSupabase();
    if (!supabase) return NextResponse.json({ error: 'Supabase unavailable' }, { status: 503 });
    const sr = createServiceRoleClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${user.id}/${choreographyId || 'draft'}/${Date.now()}-${safeFileName}`;

    try {
      logServiceRoleUsage({ caller: 'api/choreographer/upload/session/complete', note: `user:${user.id} file:${path}` });
    } catch (_) {}

    const { data: uploadData, error } = await sr.storage.from('choreographer-uploads').upload(path, full, { contentType: 'video/mp4', upsert: false });
    if (error) {
      console.error('chunked upload storage error', error);
      return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = sr.storage.from('choreographer-uploads').getPublicUrl(uploadData.path);

    // write DB record (best-effort)
    try {
      await sr.from('choreography_uploads').insert({
        user_id: user.id,
        file_name: fileName,
        file_path: uploadData.path,
        file_size: full.length,
        file_type: 'video/mp4',
        choreography_id: choreographyId || null,
        status: 'completed',
        metadata: { uploadedAt: new Date().toISOString(), originalSize: full.length },
      });
    } catch (dbErr) {
      console.error('chunked upload db error', dbErr);
    }

    // update session record if present
    try {
      await sr.from('upload_sessions').update({ status: 'completed', file_path: uploadData.path, file_size: full.length }).eq('session_id', sessionId);
    } catch (updateErr) {
      console.warn('failed to update upload session record', updateErr);
    }

    // cleanup
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});

    return NextResponse.json({ ok: true, file: { path: uploadData.path, url: urlData.publicUrl, size: full.length, type: 'video/mp4' } });
  } catch (err) {
    console.error('complete chunk upload error', err);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}
