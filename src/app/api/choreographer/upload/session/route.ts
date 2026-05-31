import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const id = randomUUID();
    const dir = join(tmpdir(), `upload-session-${id}`);
    await fs.mkdir(dir, { recursive: true });

    // Attempt to record session in DB for resumability (best-effort)
    try {
      const supabase = await createServerSupabase();
      const sr = createServiceRoleClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await sr.from('upload_sessions').insert({ session_id: id, user_id: user?.id || null, status: 'started', created_at: new Date().toISOString() });
    } catch (dbErr) {
      // non-fatal
      console.warn('failed to persist upload session:', dbErr);
    }

    return NextResponse.json({ ok: true, sessionId: id });
  } catch (err) {
    console.error('create upload session error', err);
    return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 });
  }
}
