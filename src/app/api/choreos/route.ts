import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

// Mock choreography data for development/testing
function getMockChoreos(tierFilter?: string | null, styleFilter?: string | null) {
  const mockChoreos = [
    {
      id: "mock-1",
      title: "Monsoon Groove",
      routineSlug: "monsoon-groove",
      video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      caption: "Learn the flow of monsoon energy",
      style: "bollywood",
      styleSlug: "bollywood",
      styleName: "Bollywood",
      stylePriceInr: 29900,
      difficulty: "intermediate",
      choreographerId: "mock-choreo-1",
      choreographerName: "Naachly Official",
      tier: "official",
      score: 92,
      tags: ["monsoon", "flow", "energy"],
      moves: [
        { id: "1", name: "Ground & Settle", start: 0, end: 8 },
        { id: "2", name: "Hip Release", start: 8, end: 16 },
        { id: "3", name: "Spiral Sequence", start: 16, end: 32 },
      ],
    },
    {
      id: "mock-2",
      title: "Bhangra Beats",
      routineSlug: "bhangra-beats",
      video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      caption: "High-energy Punjabi rhythms",
      style: "bhangra",
      styleSlug: "bhangra",
      styleName: "Bhangra",
      stylePriceInr: 29900,
      difficulty: "advanced",
      choreographerId: "mock-choreo-2",
      choreographerName: "Naachly Official",
      tier: "official",
      score: 88,
      tags: ["punjabi", "energy", "traditional"],
      moves: [
        { id: "1", name: "Gidha Circle", start: 0, end: 12 },
        { id: "2", name: "Dhol Sync", start: 12, end: 24 },
      ],
    },
    {
      id: "mock-3",
      title: "Contemporary Flow",
      routineSlug: "contemporary-flow",
      video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      caption: "Modern movement vocabulary",
      style: "mix",
      styleSlug: "mix",
      styleName: "Mix",
      stylePriceInr: null,
      difficulty: "beginner",
      choreographerId: "mock-choreo-3",
      choreographerName: "Naachly Official",
      tier: "community",
      score: 85,
      tags: ["contemporary", "flow"],
      moves: [
        { id: "1", name: "Wave Through", start: 0, end: 10 },
      ],
    },
  ];

  let filtered = mockChoreos;
  
  if (tierFilter) {
    filtered = filtered.filter((c) => c.tier === tierFilter);
  }
  
  if (styleFilter && styleFilter !== "mix") {
    filtered = filtered.filter((c) => c.styleSlug === styleFilter);
  }
  
  return filtered;
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
  
  const styleParam = (searchParams.get("style") || "").trim().toLowerCase();
  const styleFilter = ["bollywood", "bhangra", "mix"].includes(styleParam) ? styleParam : null;

  const supabase = await createServerSupabase();
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  let query = db
    .from("routines")
    .select(
      "id,title,slug,description,caption,difficulty,is_published,is_approved,submission_tier,ai_overall_score,ai_tags,choreographer_id,profiles(full_name),dance_styles(slug,name,price_inr),routine_videos(video_url,video_type,sort_order),routine_steps(id,step_number,label,start_time,end_time)"
    )
    .eq("is_published", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(150);

  if (tierFilter) {
    query = query.eq("submission_tier", tierFilter);
  }
  
  if (styleFilter && styleFilter !== "mix") {
    query = query.eq("dance_styles.slug", styleFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[/api/choreos] Query error:", error);
    return NextResponse.json(
      { error: "Failed to fetch choreography list", detail: error.message },
      { status: 500 }
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ choreos: [], fallback: true });
  }

  const choreos = (data || []).map((row: any) => {
    const video = pickPreferredVideoUrl(row.routine_videos || []);

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
      style: row.dance_styles?.[0]?.slug || "unknown",
      styleSlug: row.dance_styles?.[0]?.slug || "unknown",
      styleName: row.dance_styles?.[0]?.name || row.dance_styles?.[0]?.slug || "Style",
      stylePriceInr: row.dance_styles?.[0]?.price_inr ?? null,
      difficulty: row.difficulty || "intermediate",
      choreographerId: row.choreographer_id || null,
      choreographerName: row.profiles?.[0]?.full_name || row.profiles?.full_name || "Official Choreographer",
      tier: row.submission_tier || "community",
      score: typeof row.ai_overall_score === "number" ? row.ai_overall_score : null,
      tags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
      moves,
    };
  });

  return NextResponse.json({ choreos });
}