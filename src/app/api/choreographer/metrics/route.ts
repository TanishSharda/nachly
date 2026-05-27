import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

function missingSupabaseConfigResponse() {
  return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
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
    return NextResponse.json({ metrics: {} });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  try {
    // routines owned by this choreographer
    const { data: routinesData, error: routinesError } = await db.from("routines").select("id,saves_count").eq("choreographer_id", user.id).limit(500);
    if (routinesError) {
      console.error('[choreographer/metrics] routines error:', routinesError);
      return NextResponse.json({ metrics: {} }, { status: 500 });
    }

    const routineIds = (routinesData || []).map((r: any) => r.id).filter(Boolean);

    // submissions authored by this creator (community uploads)
    const { data: subsData } = await db.from("choreo_submissions").select("id,saves_count").eq("user_id", user.id).limit(500);
    const submissionIds = (subsData || []).map((s: any) => s.id).filter(Boolean);

    const allIds = Array.from(new Set([...routineIds, ...submissionIds]));

    if (!allIds.length) {
      return NextResponse.json({ metrics: { likes: 0, comments: 0, tryThis: 0, views: 0, practiceCompletions: 0, uniqueLearners: 0, saves: 0 } });
    }

    const { data: engagementRows, error: engagementError } = await db
      .from("choreo_engagement_events")
      .select("interaction_type,user_id,choreo_id")
      .in("choreo_id", allIds);

    if (engagementError) {
      console.error('[choreographer/metrics] engagement error:', engagementError);
    }

    const metrics = { likes: 0, comments: 0, tryThis: 0, views: 0, practiceCompletions: 0, uniqueLearners: 0, saves: 0 } as Record<string, number>;
    const learnerSet = new Set<string>();

    (engagementRows || []).forEach((row: any) => {
      const type = row.interaction_type;
      if (type === "like") metrics.likes += 1;
      if (type === "comment") metrics.comments += 1;
      if (type === "try_this") metrics.tryThis += 1;
      if (type === "view_stats") metrics.views += 1;
      if (row.user_id) learnerSet.add(row.user_id);
    });

    // practice completions for routines (practice_sessions.routine_id)
    let practiceCount = 0;
    if (routineIds.length) {
      const { data: practiceRows, error: practiceError } = await db
        .from("practice_sessions")
        .select("user_id,id")
        .in("routine_id", routineIds)
        .eq("status", "completed");

      if (practiceError) {
        console.error('[choreographer/metrics] practice error:', practiceError);
      } else {
        practiceCount = (practiceRows || []).length;
        (practiceRows || []).forEach((p: any) => { if (p.user_id) learnerSet.add(p.user_id); });
      }
    }

    metrics.practiceCompletions = practiceCount;
    metrics.uniqueLearners = learnerSet.size;

    // sum saves from routines and submissions
    try {
      const routineSaves = (routinesData || []).reduce((sum: number, r: any) => sum + Number(r.saves_count || 0), 0);
      const submissionSaves = (subsData || []).reduce((sum: number, s: any) => sum + Number(s.saves_count || 0), 0);
      metrics.saves = routineSaves + submissionSaves;
    } catch (e) {
      metrics.saves = 0;
    }

    return NextResponse.json({ metrics });
  } catch (err: any) {
    console.error('[choreographer/metrics] unexpected:', err);
    return NextResponse.json({ metrics: {} }, { status: 500 });
  }
}
