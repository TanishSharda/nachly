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

type SubmissionRow = {
  user_id: string;
  style_slug: string;
  ai_overall_score: number | null;
  engagement_score: number;
  weekly_points: number;
  tier: "community" | "rising" | "official";
};

function tierBoost(tier: SubmissionRow["tier"]): number {
  if (tier === "official") return 12;
  if (tier === "rising") return 6;
  return 0;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const { searchParams } = new URL(request.url);
  const styleFilter = (searchParams.get("style") || "").trim().toLowerCase();

  const supabase = await createServerSupabase();
  const db = supabase;

  let query = db
    .from("choreo_submissions")
    .select("user_id,style_slug,ai_overall_score,engagement_score,weekly_points,tier")
    .eq("submission_status", "approved")
    .limit(5000);

  if (styleFilter) {
    query = query.eq("style_slug", styleFilter);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to load choreography ranking" }, { status: 500 });
  }

  const rows = (data ?? []) as SubmissionRow[];
  const userMap = new Map<
    string,
    { userId: string; uploads: number; styleMap: Record<string, number>; totalScore: number }
  >();

  rows.forEach((row) => {
    const styleSlug = row.style_slug || "unknown";
    const aiScore = toNumber(row.ai_overall_score);
    const engagement = toNumber(row.engagement_score);
    const weekly = toNumber(row.weekly_points);
    const score = aiScore * 0.55 + engagement * 0.2 + weekly * 0.15 + tierBoost(row.tier) * 1.0;

    const current =
      userMap.get(row.user_id) ||
      ({ userId: row.user_id, uploads: 0, styleMap: {}, totalScore: 0 } as {
        userId: string;
        uploads: number;
        styleMap: Record<string, number>;
        totalScore: number;
      });

    current.uploads += 1;
    current.totalScore += score;
    current.styleMap[styleSlug] = (current.styleMap[styleSlug] || 0) + score;
    userMap.set(row.user_id, current);
  });

  const ranking = [...userMap.values()]
    .map((entry) => ({
      userId: entry.userId,
      score: Math.round(entry.totalScore / Math.max(1, entry.uploads)),
      uploads: entry.uploads,
      styles: entry.styleMap,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  const userIds = ranking.map((r) => r.userId);
  let nameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await db.from("profiles").select("id,full_name").in("id", userIds);
    nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Dancer"]));
  }

  return NextResponse.json({
    style: styleFilter || null,
    leaderboard: ranking.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      name: nameById.get(entry.userId) || "Dancer",
      score: entry.score,
      uploads: entry.uploads,
    })),
  });
}
