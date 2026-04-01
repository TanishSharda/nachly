import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { MOCK_ROUTINES, getMockSteps, getRoutineVideoUrl } from "@/lib/mock-data";

function buildMockChoreoById(id: string) {
  const routine = Object.values(MOCK_ROUTINES)
    .flat()
    .find((entry) => entry.id === id);

  if (!routine) return null;

  return {
    id: routine.id,
    title: routine.title || "Untitled Choreo",
    video: getRoutineVideoUrl(routine.id) || "",
    caption: routine.description || "",
    style: routine.style_slug || "unknown",
    tier: "community",
    score: null,
    tags: [],
    moves: getMockSteps(routine.id, routine.duration_seconds).map((step) => ({
      id: step.id || String(step.step_number),
      name: step.label || `Move ${step.step_number || ""}`,
      start: Number(step.start_time || 0),
      end: Number(step.end_time || 0),
    })),
  };
}

function missingSupabaseConfigResponse() {
  return NextResponse.json(
    {
      error: "Service temporarily unavailable",
      detail: "Missing required server configuration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
    { status: 503 }
  );
}

export async function GET(_: Request, context: { params: { id: string } }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const id = (context.params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data: row, error } = await db
    .from("routines")
    .select(
      "id,title,description,is_published,is_approved,submission_tier,ai_overall_score,ai_tags,dance_styles(slug),routine_videos(video_url,video_type,sort_order),routine_steps(id,step_number,label,start_time,end_time)"
    )
    .eq("id", id)
    .eq("is_published", true)
    .eq("is_approved", true)
    .maybeSingle();

  if (error) {
    const mockChoreo = buildMockChoreoById(id);
    if (mockChoreo) {
      return NextResponse.json({ choreo: mockChoreo, fallback: "mock-data" });
    }
    return NextResponse.json({ error: "Failed to fetch choreography" }, { status: 500 });
  }

  if (!row) {
    const mockChoreo = buildMockChoreoById(id);
    if (mockChoreo) {
      return NextResponse.json({ choreo: mockChoreo, fallback: "mock-data" });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dbVideo = [...(row.routine_videos || [])]
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .find((entry) => entry.video_url)?.video_url || "";
  const video = dbVideo || getRoutineVideoUrl(row.id) || "";

  const moves = [...(row.routine_steps || [])]
    .sort((a, b) => (a.step_number || 0) - (b.step_number || 0))
    .map((step) => ({
      id: step.id || String(step.step_number),
      name: step.label || `Move ${step.step_number || ""}`,
      start: Number(step.start_time || 0),
      end: Number(step.end_time || 0),
    }));

  return NextResponse.json({
    choreo: {
      id: row.id,
      title: row.title || "Untitled Choreo",
      video,
      caption: row.description || "",
      style: row.dance_styles?.slug || "unknown",
      tier: row.submission_tier || "community",
      score: typeof row.ai_overall_score === "number" ? row.ai_overall_score : null,
      tags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
      moves,
    },
  });
}