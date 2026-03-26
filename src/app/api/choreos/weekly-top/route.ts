import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

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

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = createServerSupabase();
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const weekStart = startOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const { data: curated, error: curatedError } = await db
    .from("weekly_featured_choreos")
    .select("id,slot_position,rank_score,is_curator_override,curator_note,submission_id,user_id,choreo_submissions(title,style_slug,tier,caption,video_url,ai_overall_score)")
    .eq("week_start", weekStart.toISOString().slice(0, 10))
    .order("slot_position", { ascending: true })
    .limit(5);

  if (!curatedError && curated && curated.length > 0) {
    return NextResponse.json({
      source: "curated",
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      banner: "This Week's Selected Choreos",
      choreos: curated,
    });
  }

  const { data: auto, error } = await db
    .from("choreo_submissions")
    .select("id,title,style_slug,tier,caption,video_url,ai_overall_score,engagement_score,weekly_points")
    .in("submission_status", ["approved"])
    .order("weekly_points", { ascending: false })
    .order("engagement_score", { ascending: false })
    .order("ai_overall_score", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: "Failed to load weekly top choreos" }, { status: 500 });
  }

  return NextResponse.json({
    source: "automatic-shortlist",
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    banner: "This Week's Selected Choreos",
    choreos: auto ?? [],
  });
}
