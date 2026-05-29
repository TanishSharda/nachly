import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logServiceRoleUsage } from '@/lib/security/serviceRoleAudit';

export async function POST(request: Request) {
  try {
    // Only allow running this test helper in development or when explicitly enabled.
    const enabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_TEST_API === '1';
    if (!enabled) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const title = (body.title as string) || `E2E Test Submission ${Date.now()}`;
    const email = (body.email as string) || `e2e+${Date.now()}@example.com`;
    const password = (body.password as string) || `TestPass123!`;

    const supabase = createServiceRoleClient();
    try {
      logServiceRoleUsage({ caller: 'api/test/create-published-submission', note: `auto-created test submission ${title}` });
    } catch (_) {}

    // create a user for the submission
    // @ts-ignore
    const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !userData?.user?.id) {
      return NextResponse.json({ error: 'failed to create user', detail: createErr?.message || null }, { status: 500 });
    }

    const userId = userData.user.id;
    const now = new Date().toISOString();

    const payload = {
      user_id: userId,
      title,
      description: `${title} — automated test insert`,
      caption: null,
      video_url: body.videoUrl || "https://storage.googleapis.com/naachly-test/sample.mp4",
      style_slug: body.styleSlug || "bollywood",
      difficulty: body.difficulty || "beginner",
      checklist_full_body_visible: true,
      checklist_stable_camera: true,
      checklist_good_lighting: true,
      checklist_passed: true,
      submission_status: "approved",
      ai_status: "completed",
      submitted_at: now,
      published_at: now,
      tier: "community",
    } as any;

    const { data, error } = await supabase.from("choreo_submissions").insert(payload).select("id,title,published_at,user_id").single();

    if (error) {
      return NextResponse.json({ error: "failed to insert submission", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, submission: data });
  } catch (err: any) {
    return NextResponse.json({ error: "server", detail: err?.message || String(err) }, { status: 500 });
  }
}
