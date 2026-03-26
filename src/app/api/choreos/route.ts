import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { MOCK_ROUTINES, getMockSteps, getRoutineVideoUrl } from "@/lib/mock-data";

function buildMockChoreos(tierFilter?: string | null) {
  return Object.values(MOCK_ROUTINES)
    .flat()
    .filter((routine) => routine.is_published && routine.is_approved)
    .map((routine) => ({
      id: routine.id,
      title: routine.title || "Untitled Choreo",
      routineSlug: routine.slug || null,
      video: getRoutineVideoUrl(routine.id) || "",
      caption: routine.description || "",
      style: routine.style_slug || "unknown",
      styleSlug: routine.style_slug || "unknown",
      styleName: routine.style_slug || "Style",
      difficulty: routine.difficulty || "intermediate",
      choreographerId: routine.choreographer_id || null,
      choreographerName: "Official Choreographer",
      tier: "official",
      score: null,
      tags: [],
      moves: getMockSteps(routine.id, routine.duration_seconds).map((step) => ({
        id: step.id || String(step.step_number),
        name: step.label || `Move ${step.step_number || ""}`,
        start: Number(step.start_time || 0),
        end: Number(step.end_time || 0),
      })),
    }))
    .filter((item) => (tierFilter ? item.tier === tierFilter : true));
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

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const { searchParams } = new URL(request.url);
  const tierParam = (searchParams.get("tier") || "").trim().toLowerCase();
  const tierFilter = ["community", "rising", "official"].includes(tierParam) ? tierParam : null;

  const supabase = createServerSupabase();
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  let query = db
    .from("routines")
    .select(
      "id,title,slug,description,caption,difficulty,is_published,is_approved,submission_tier,ai_overall_score,ai_tags,choreographer_id,profiles(full_name),dance_styles(slug,name),routine_videos(video_url,video_type,sort_order),routine_steps(id,step_number,label,start_time,end_time)"
    )
    .eq("is_published", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(150);

  if (tierFilter) {
    query = query.eq("submission_tier", tierFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ choreos: buildMockChoreos(tierFilter), fallback: "mock-data" });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ choreos: buildMockChoreos(tierFilter), fallback: "mock-data" });
  }

  const choreos = (data || []).map((row) => {
    const video = [...(row.routine_videos || [])]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .find((entry) => entry.video_url)?.video_url || "";

    const moves = [...(row.routine_steps || [])]
      .sort((a, b) => (a.step_number || 0) - (b.step_number || 0))
      .map((step) => ({
        id: step.id || String(step.step_number),
        name: step.label || `Move ${step.step_number || ""}`,
        start: Number(step.start_time || 0),
        end: Number(step.end_time || 0),
      }));

    return {
      id: row.id,
      title: row.title || "Untitled Choreo",
      routineSlug: row.slug || null,
      video,
      caption: row.caption || row.description || "",
      style: row.dance_styles?.slug || "unknown",
      styleSlug: row.dance_styles?.slug || "unknown",
      styleName: row.dance_styles?.name || row.dance_styles?.slug || "Style",
      difficulty: row.difficulty || "intermediate",
      choreographerId: row.choreographer_id || null,
      choreographerName: row.profiles?.full_name || "Official Choreographer",
      tier: row.submission_tier || "community",
      score: typeof row.ai_overall_score === "number" ? row.ai_overall_score : null,
      tags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
      moves,
    };
  });

  return NextResponse.json({ choreos });
}