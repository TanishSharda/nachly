import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

type RoutineRow = {
  id: string;
  title: string | null;
  slug: string | null;
  caption: string | null;
  description: string | null;
  difficulty: string | null;
  dance_styles: Array<{ slug: string | null; name: string | null }> | null;
  routine_videos: Array<{ video_url: string | null; sort_order: number | null }> | null;
};

function missingSupabaseConfigResponse() {
  return NextResponse.json(
    {
      error: "Service temporarily unavailable",
      detail: "Missing required server configuration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
    { status: 503 }
  );
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ likes: [] });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data: likeRows, error: likesError } = await db
    .from("choreo_engagement_events")
    .select("choreo_id,created_at")
    .eq("interaction_type", "like")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (likesError) {
    return NextResponse.json({ error: "Failed to load liked sessions" }, { status: 500 });
  }

  const uniqueIds = Array.from(new Set((likeRows || []).map((row) => row.choreo_id).filter(Boolean)));
  if (!uniqueIds.length) {
    return NextResponse.json({ likes: [] });
  }

  const { data: routineRows, error: routineError } = await db
    .from("routines")
    .select("id,title,slug,caption,description,difficulty,dance_styles(slug,name),routine_videos(video_url,sort_order)")
    .in("id", uniqueIds);

  if (routineError) {
    return NextResponse.json({ error: "Failed to load liked sessions" }, { status: 500 });
  }

  const routineById = new Map<string, RoutineRow>();
  (routineRows || []).forEach((row) => {
    routineById.set(row.id, row as RoutineRow);
  });

  const likes = uniqueIds
    .map((id) => {
      const row = routineById.get(id);
      if (!row) return null;
      const style = Array.isArray(row.dance_styles) ? row.dance_styles[0] : null;

      const videoUrl = [...(row.routine_videos || [])]
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .find((entry) => entry.video_url)?.video_url || "";

      return {
        choreoId: row.id,
        title: row.title || "Untitled Choreo",
        routineSlug: row.slug || null,
        styleSlug: style?.slug || "unknown",
        styleName: style?.name || style?.slug || "Style",
        difficulty: row.difficulty || "intermediate",
        caption: row.caption || row.description || "",
        videoUrl,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ likes });
}
