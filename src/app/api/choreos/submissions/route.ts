import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

const submissionCreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(2000),
  caption: z.string().trim().max(280).optional().or(z.literal("")),
  videoUrl: z.string().trim().url().max(2000),
  styleSlug: z.enum(["hip-hop", "bhangra", "kathak", "zumba", "bollywood"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  checklist: z.object({
    fullBodyVisible: z.boolean(),
    stableCamera: z.boolean(),
    goodLighting: z.boolean(),
  }),
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

export async function GET() {
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

  const { data, error } = await db
    .from("choreo_submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Failed to load submissions" }, { status: 500 });
  }

  return NextResponse.json({ submissions: data ?? [] });
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

  const { data, error } = await db
    .from("choreo_submissions")
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description,
      caption: input.caption || null,
      video_url: input.videoUrl,
      style_slug: input.styleSlug,
      difficulty: input.difficulty,
      checklist_full_body_visible: input.checklist.fullBodyVisible,
      checklist_stable_camera: input.checklist.stableCamera,
      checklist_good_lighting: input.checklist.goodLighting,
      checklist_passed: true,
      submission_status: "pending_review",
      ai_status: "queued",
      submitted_at: new Date().toISOString(),
      tier: "community",
      improvement_suggestions: [],
    })
    .select("id,submission_status,ai_status,tier,submitted_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create choreography submission" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    submission: data,
    message: "Submission received and queued for AI evaluation.",
  });
}
