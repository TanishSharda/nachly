import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { enforceRateLimit } from '@/lib/security/rateLimiter';

function missingSupabaseConfigResponse() {
  return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    const maybe = await enforceRateLimit(request as any as Request, { windowMs: 60_000, max: 30, keyPrefix: 'choreographer:metrics:by-routine' });
    if (maybe) return maybe;
  } catch (e) {
    // ignore limiter errors
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ routines: [] });

  const db = supabase;

  try {
    const { data: routines, error: routinesError } = await db
      .from("routines")
      .select("id,title")
      .eq("choreographer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (routinesError) {
      console.error('[choreographer/metrics/by-routine] routines error:', routinesError);
      return NextResponse.json({ routines: [] }, { status: 500 });
    }

    const ids = (routines || []).map((r: any) => r.id).filter(Boolean);
    if (!ids.length) return NextResponse.json({ routines: [] });

    const { data: engagementRows, error: engagementError } = await db
      .from("choreo_engagement_events")
      .select("choreo_id,interaction_type")
      .in("choreo_id", ids);

    if (engagementError) console.error('[choreographer/metrics/by-routine] engagement error:', engagementError);

    const { data: practiceRows, error: practiceError } = await db
      .from("practice_sessions")
      .select("routine_id")
      .in("routine_id", ids)
      .eq("status", "completed");

    if (practiceError) console.error('[choreographer/metrics/by-routine] practice error:', practiceError);

    const engagementMap: Record<string, { likes: number; comments: number; tryThis: number; views: number }> = {};
    (engagementRows || []).forEach((row: any) => {
      const id = row.choreo_id;
      engagementMap[id] = engagementMap[id] || { likes: 0, comments: 0, tryThis: 0, views: 0 };
      if (row.interaction_type === "like") engagementMap[id].likes += 1;
      if (row.interaction_type === "comment") engagementMap[id].comments += 1;
      if (row.interaction_type === "try_this") engagementMap[id].tryThis += 1;
      if (row.interaction_type === "view_stats") engagementMap[id].views += 1;
    });

    const practiceMap: Record<string, number> = {};
    (practiceRows || []).forEach((p: any) => {
      practiceMap[p.routine_id] = (practiceMap[p.routine_id] || 0) + 1;
    });

    const result = (routines || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      likes: engagementMap[r.id]?.likes || 0,
      comments: engagementMap[r.id]?.comments || 0,
      tryThis: engagementMap[r.id]?.tryThis || 0,
      views: engagementMap[r.id]?.views || 0,
      practiceCompletions: practiceMap[r.id] || 0,
    }));

    return NextResponse.json({ routines: result });
  } catch (err: any) {
    console.error('[choreographer/metrics/by-routine] unexpected:', err);
    return NextResponse.json({ routines: [] }, { status: 500 });
  }
}
