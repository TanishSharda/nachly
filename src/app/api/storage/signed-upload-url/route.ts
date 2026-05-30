import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createServerSupabase } from "@/lib/supabase/server";
import { logServiceRoleUsage } from '@/lib/security/serviceRoleAudit';
import { enforceRateLimit } from '@/lib/security/rateLimiter';

export async function POST(request: NextRequest) {
  try {
    try {
      const maybe = await enforceRateLimit(request as unknown as NextRequest, { windowMs: 60_000, max: 30, keyPrefix: 'storage:signed-upload' });
      if (maybe) return maybe;
    } catch (e) {
      // ignore rate limiter failures
    }

    // Require authenticated user for signed upload URLs
    const serverSupabase = await createServerSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const path = String(body?.path || "").trim();
    const bucket = String(body?.bucket || "choreographer-uploads").trim();
    const upsert = Boolean(body?.upsert);

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
    }

    // Validate bucket name against allowed list to avoid arbitrary buckets
    const allowed = [
      'choreographer-uploads',
      'avatars',
    ];
    if (!allowed.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    // audit: record that a service-role signed-upload URL was created for this user
    try {
      logServiceRoleUsage({ caller: 'api/storage/signed-upload-url', note: `user:${user.id} bucket:${bucket} path:${path}` });
    } catch (_) {}
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert });

    if (error || !data?.token || !data?.signedUrl) {
      console.error("[/api/storage/signed-upload-url] createSignedUploadUrl error:", error);
      return NextResponse.json(
        { error: error?.message || "Failed to create signed upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, signedUrl: data.signedUrl, token: data.token, path: data.path });
  } catch (err) {
    console.error("[/api/storage/signed-upload-url] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}