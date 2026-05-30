import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

function buildMockChoreo(id: string) {
  const normalizedId = id.toLowerCase();

  if (normalizedId.includes("bhangra")) {
    return {
      id,
      title: "Bhangra Beats",
      video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      caption: "High-energy Punjabi rhythms",
      style: "bhangra",
      tier: "official",
      score: 88,
      tags: ["punjabi", "energy", "traditional"],
      moves: [
        { id: "1", name: "Gidha Circle", start: 0, end: 12 },
        { id: "2", name: "Dhol Sync", start: 12, end: 24 },
      ],
    };
  }

  return {
    id,
    title: "Monsoon Groove",
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    caption: "Learn the flow of monsoon energy",
    style: "bollywood",
    tier: "official",
    score: 92,
    tags: ["monsoon", "flow", "energy"],
    moves: [
      { id: "1", name: "Ground & Settle", start: 0, end: 8 },
      { id: "2", name: "Hip Release", start: 8, end: 16 },
      { id: "3", name: "Spiral Sequence", start: 16, end: 32 },
    ],
  };
}

function pickPreferredVideoUrl(entries: Array<{ video_url?: string | null; sort_order?: number | null }>) {
  const sorted = [...(entries || [])]
    .filter((entry) => Boolean(entry?.video_url))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (!sorted.length) {
    return "";
  }

  const normalized = sorted.map((entry) => ({
    ...entry,
    url: String(entry.video_url || ""),
  }));

  const optimizedMp4 = normalized.find((entry) => entry.url.includes(".optimized.mp4"));
  if (optimizedMp4) return optimizedMp4.url;

  const anyMp4 = normalized.find((entry) => entry.url.toLowerCase().includes(".mp4"));
  if (anyMp4) return anyMp4.url;

  return normalized[0]?.url || "";
}

function mapSubmissionToChoreo(row: {
  id: string;
  title: string | null;
  description: string | null;
  song_name?: string | null;
  caption: string | null;
  video_url: string | null;
  performance_video_url?: string | null;
  teach_video_url?: string | null;
  style_slug: string | null;
  tier: string | null;
  ai_overall_score: number | null;
  ai_tags: string[] | null;
  submission_status?: string | null;
  dance_styles?: Array<{ slug?: string; name?: string; price_inr?: number }> | null;
}) {
  return {
    id: row.id,
    title: row.title || "Untitled Choreo",
    video: row.teach_video_url || row.performance_video_url || row.video_url || "",
    performance_video_url: row.performance_video_url || row.video_url || "",
    teach_video_url: row.teach_video_url || row.performance_video_url || row.video_url || "",
    song_name: row.song_name || null,
    caption: row.caption || row.description || row.song_name || "",
    style: row.dance_styles?.[0]?.slug || row.style_slug || "unknown",
    tier: row.tier || "community",
    score: typeof row.ai_overall_score === "number" ? row.ai_overall_score : null,
    tags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
    moves: [],
    source: "submission",
    submission_status: row.submission_status || null,
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

export async function GET(_: Request, context: any) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const params = await context?.params;
  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabase();
    const db = supabase;

    const { data: submissionRow, error: submissionError } = await db
      .from("choreo_submissions")
      .select("id,title,description,song_name,caption,video_url,performance_video_url,teach_video_url,style_slug,tier,ai_overall_score,ai_tags,submission_status")
      .eq("id", id)
      .not("published_at", "is", null)
      .maybeSingle();

    if (submissionError) {
      if (submissionError.code === "PGRST205" || submissionError.message?.includes("Could not find the table")) {
        return NextResponse.json({ choreo: buildMockChoreo(id), fallback: true, mockData: true });
      }
      // If there's an error but it's not a table not found error, log it but continue to routines
      console.error("Submission query error:", submissionError);
    }

    if (submissionRow) {
      try {
        return NextResponse.json({ choreo: mapSubmissionToChoreo(submissionRow) });
      } catch (mapErr) {
        console.error('Error mapping submission to choreo:', mapErr, submissionRow);
        return NextResponse.json({ choreo: buildMockChoreo(id), fallback: true, mockData: true });
      }
    }
  } catch (err) {
    console.error("Submission fetch error:", err);
    // Continue to routines
  }

  try {
    const db = await createServerSupabase();
    const routineSelect =
      "id,title,description,is_published,is_approved,submission_tier,ai_overall_score,ai_tags,dance_styles(slug),routine_videos(video_url,video_type,sort_order),routine_steps(id,step_number,label,start_time,end_time)";

    const { data: rowById, error: idLookupError } = await db
      .from("routines")
      .select(routineSelect)
      .eq("id", id)
      .eq("is_published", true)
      .eq("is_approved", true)
      .maybeSingle();

    if (idLookupError) {
      if (idLookupError.code === "PGRST205" || idLookupError.message?.includes("Could not find the table")) {
        return NextResponse.json({ choreo: buildMockChoreo(id), fallback: true, mockData: true });
      }
      console.error("Routine query error (by id):", idLookupError);
    }

    let row = rowById;

    if (!row) {
      const { data: rowBySlug, error: slugLookupError } = await db
        .from("routines")
        .select(routineSelect)
        .eq("slug", id)
        .eq("is_published", true)
        .eq("is_approved", true)
        .maybeSingle();

      if (slugLookupError) {
        if (slugLookupError.code === "PGRST205" || slugLookupError.message?.includes("Could not find the table")) {
          return NextResponse.json({ choreo: buildMockChoreo(id), fallback: true, mockData: true });
        }
        console.error("Routine query error (by slug):", slugLookupError);
      }

      row = rowBySlug;
    }

    if (!row) {
      return NextResponse.json({ choreo: buildMockChoreo(id), fallback: true, mockData: true });
    }

    const dbVideo = pickPreferredVideoUrl(row.routine_videos || []);
    const video = dbVideo || "";

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
             style: row.dance_styles?.[0]?.slug || "unknown",
        tier: row.submission_tier || "community",
        score: typeof row.ai_overall_score === "number" ? row.ai_overall_score : null,
        tags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
        moves,
      },
    });
  } catch (err) {
    console.error("Choreography fetch error:", err);
    // Return mock data as fallback on any unexpected error
    return NextResponse.json({ choreo: buildMockChoreo(id), fallback: true, mockData: true });
  }
}