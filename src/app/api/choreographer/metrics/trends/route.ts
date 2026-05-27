import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

function missingSupabaseConfigResponse() {
  return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const routineId = (searchParams.get("routineId") || "").trim();
  const days = Number(searchParams.get("days") || "30");

  if (!routineId) return NextResponse.json({ error: "routineId required" }, { status: 400 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  try {
    const supabase = await createServerSupabase();
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

    const since = `${days} days`;

    // likes time series
    const { data: likesRows, error: likesError } = await db
      .from("choreo_engagement_events")
      .select("created_at")
      .eq("choreo_id", routineId)
      .eq("interaction_type", "like")
      .gte("created_at", `now() - interval '${days} days'`);

    if (likesError) console.error('[trends] likes error:', likesError);

    // practice completions time series
    const { data: practiceRows, error: practiceError } = await db
      .from("practice_sessions")
      .select("created_at")
      .eq("routine_id", routineId)
      .eq("status", "completed")
      .gte("created_at", `now() - interval '${days} days'`);

    if (practiceError) console.error('[trends] practice error:', practiceError);

    // build day buckets
    const buckets: Record<string, { likes: number; completions: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { likes: 0, completions: 0 };
    }

    (likesRows || []).forEach((r: any) => {
      const k = (new Date(r.created_at)).toISOString().slice(0, 10);
      if (buckets[k]) buckets[k].likes += 1;
    });
    (practiceRows || []).forEach((r: any) => {
      const k = (new Date(r.created_at)).toISOString().slice(0, 10);
      if (buckets[k]) buckets[k].completions += 1;
    });

    const dates = Object.keys(buckets);
    const likes = dates.map((d) => buckets[d].likes);
    const completions = dates.map((d) => buckets[d].completions);

    return NextResponse.json({ routineId, days, dates, likes, completions });
  } catch (err: any) {
    console.error('[trends] unexpected:', err);
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 });
  }
}
