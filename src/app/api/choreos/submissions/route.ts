import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

const submissionCreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(2000),
  caption: z.string().trim().max(280).optional().or(z.literal("")),
  videoUrl: z.string().trim().url().max(2000),
  styleSlug: z.enum(["hip-hop", "bhangra", "kathak", "zumba", "bollywood", "contemporary"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  lessonParts: z.array(z.record(z.unknown())).optional(),
  hashtags: z.array(z.string().min(1).max(40)).optional(),
  musicCredit: z.string().trim().max(200).optional().or(z.literal("")),
  thumbnailUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  slowMoMarkers: z.array(z.record(z.unknown())).optional(),
  trimStartSeconds: z.number().nonnegative().optional(),
  trimEndSeconds: z.number().nonnegative().optional(),
  captionOverlays: z.array(z.record(z.unknown())).optional(),
  videoDurationSeconds: z.number().nonnegative().optional(),
  accessType: z.enum(["free", "ppv", "subscription"]).optional(),
  priceInr: z.number().nonnegative().optional(),
  subscriptionTier: z.string().trim().max(80).optional().or(z.literal("")),
  draftId: z.string().uuid().optional(),
  checklist: z.object({
    fullBodyVisible: z.boolean(),
    stableCamera: z.boolean(),
    goodLighting: z.boolean(),
  }),
});

const draftUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(2000),
  caption: z.string().trim().max(280).optional().or(z.literal("")),
  videoUrl: z.string().trim().url().max(2000),
  styleSlug: z.enum(["hip-hop", "bhangra", "kathak", "zumba", "bollywood", "contemporary"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  lessonParts: z.array(z.record(z.unknown())).optional(),
  hashtags: z.array(z.string().min(1).max(40)).optional(),
  musicCredit: z.string().trim().max(200).optional().or(z.literal("")),
  thumbnailUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  slowMoMarkers: z.array(z.record(z.unknown())).optional(),
  trimStartSeconds: z.number().nonnegative().optional(),
  trimEndSeconds: z.number().nonnegative().optional(),
  captionOverlays: z.array(z.record(z.unknown())).optional(),
  videoDurationSeconds: z.number().nonnegative().optional(),
  accessType: z.enum(["free", "ppv", "subscription"]).optional(),
  priceInr: z.number().nonnegative().optional(),
  subscriptionTier: z.string().trim().max(80).optional().or(z.literal("")),
});

function missingSupabaseConfigResponse() {
  return NextResponse.json(
    {
      error: "Service temporarily unavailable",
      detail:
        "Missing required server configuration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
    { status: 503 }
  );
}

function checklistSuggestions(checklist: { fullBodyVisible: boolean; stableCamera: boolean; goodLighting: boolean }) {
  const suggestions: string[] = [];
  if (!checklist.fullBodyVisible) suggestions.push("Ensure your full body is visible in frame.");
  if (!checklist.stableCamera) suggestions.push("Keep your camera stable and avoid heavy shake.");
  if (!checklist.goodLighting) suggestions.push("Record in brighter light to improve motion readability.");
  return suggestions;
}

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const latest = url.searchParams.get("latest") === "1";
  const id = url.searchParams.get("id");

  let query = db
    .from("choreo_submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (id) {
    const { data, error } = await db
      .from("choreo_submissions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ draft: data });
  }

  if (status) {
    query = query.eq("submission_status", status);
  }

  if (latest) {
    query = query.limit(1);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to load submissions" }, { status: 500 });
  }

  if (latest) {
    return NextResponse.json({ draft: data?.[0] ?? null });
  }

  return NextResponse.json({ submissions: data ?? [] });
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = draftUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid draft payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const input = parsed.data;
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const draftPayload = {
    title: input.title,
    description: input.description,
    caption: input.caption || null,
    video_url: input.videoUrl,
    style_slug: input.styleSlug,
    difficulty: input.difficulty,
    lesson_parts: input.lessonParts ?? [],
    hashtags: input.hashtags ?? [],
    music_credit: input.musicCredit || null,
    thumbnail_url: input.thumbnailUrl || null,
    slow_mo_markers: input.slowMoMarkers ?? [],
    trim_start_seconds: input.trimStartSeconds ?? null,
    trim_end_seconds: input.trimEndSeconds ?? null,
    caption_overlays: input.captionOverlays ?? [],
    video_duration_seconds: input.videoDurationSeconds ?? null,
    access_type: input.accessType ?? "free",
    price_inr: input.priceInr ?? 0,
    subscription_tier: input.subscriptionTier || null,
    submission_status: "draft",
    ai_status: "pending",
    checklist_full_body_visible: false,
    checklist_stable_camera: false,
    checklist_good_lighting: false,
    checklist_passed: false,
  };

  if (input.id) {
    const { data, error } = await db
      .from("choreo_submissions")
      .update(draftPayload)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select("id,submission_status,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, draft: data });
  }

  const { data, error } = await db
    .from("choreo_submissions")
    .insert({
      user_id: user.id,
      ...draftPayload,
    })
    .select("id,submission_status,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, draft: data });
}

export async function DELETE(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Draft id is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data, error } = await db
    .from("choreo_submissions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("submission_status", "draft")
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, draft: data });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = submissionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const input = parsed.data;
  const checklistPassed =
    input.checklist.fullBodyVisible && input.checklist.stableCamera && input.checklist.goodLighting;

  if (!checklistPassed) {
    return NextResponse.json(
      {
        error: "Submission blocked by quality checklist",
        message: "Your choreography is close to being featured",
        suggestions: checklistSuggestions(input.checklist),
        cta: "Re-record & Improve",
      },
      { status: 422 }
    );
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const submissionPayload = {
    user_id: user.id,
    title: input.title,
    description: input.description,
    caption: input.caption || null,
    video_url: input.videoUrl,
    style_slug: input.styleSlug,
    difficulty: input.difficulty,
    lesson_parts: input.lessonParts ?? [],
    hashtags: input.hashtags ?? [],
    music_credit: input.musicCredit || null,
    thumbnail_url: input.thumbnailUrl || null,
    slow_mo_markers: input.slowMoMarkers ?? [],
    trim_start_seconds: input.trimStartSeconds ?? null,
    trim_end_seconds: input.trimEndSeconds ?? null,
    caption_overlays: input.captionOverlays ?? [],
    video_duration_seconds: input.videoDurationSeconds ?? null,
    access_type: input.accessType ?? "free",
    price_inr: input.priceInr ?? 0,
    subscription_tier: input.subscriptionTier || null,
    checklist_full_body_visible: input.checklist.fullBodyVisible,
    checklist_stable_camera: input.checklist.stableCamera,
    checklist_good_lighting: input.checklist.goodLighting,
    checklist_passed: true,
    submission_status: "pending_review",
    ai_status: "queued",
    submitted_at: new Date().toISOString(),
    tier: "community",
    improvement_suggestions: [],
  };

  const query = input.draftId
    ? db.from("choreo_submissions").update(submissionPayload).eq("id", input.draftId).eq("user_id", user.id)
    : db.from("choreo_submissions").insert(submissionPayload);

  const { data, error } = await query.select("id,submission_status,ai_status,tier,submitted_at").single();

  if (error) {
    return NextResponse.json({ error: "Failed to create choreography submission" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    submission: data,
    message: "Submission received and queued for AI evaluation.",
  });
}
