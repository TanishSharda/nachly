import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { enforceRateLimit } from '@/lib/security/rateLimiter';

type AttemptRow = {
  user_id: string;
  score: number | null;
  created_at: string | null;
};

type LeaderboardRow = {
  userId: string;
  name: string;
  avg_ai_score: number;
  best_score: number;
  consistency_score: number;
  improvement_rate: number;
  total_sessions: number;
  ranking_score: number;
};

function toNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function percentileClamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function calculateConsistency(scores: number[]) {
  if (scores.length <= 1) return scores.length === 1 ? 100 : 0;
  const avg = scores.reduce((s, n) => s + n, 0) / scores.length;
  const variance = scores.reduce((s, n) => s + (n - avg) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  return percentileClamp(100 - std * 2);
}

function calculateImprovement(attempts: { score: number; createdAt: number }[]) {
  if (attempts.length < 2) return 0;
  const sorted = [...attempts].sort((a, b) => a.createdAt - b.createdAt);
  const midpoint = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, midpoint);
  const second = sorted.slice(midpoint);
  if (first.length === 0 || second.length === 0) return 0;
  const firstAvg = first.reduce((s, a) => s + a.score, 0) / first.length;
  const secondAvg = second.reduce((s, a) => s + a.score, 0) / second.length;
  return percentileClamp(secondAvg - firstAvg + 50);
}

function computeRankingRows(rows: AttemptRow[], profileById: Record<string, string>): LeaderboardRow[] {
  const map = new Map<string, { scores: number[]; attempts: { score: number; createdAt: number }[] }>();

  for (const row of rows) {
    const userId = String(row.user_id || "");
    if (!userId) continue;
    const score = percentileClamp(toNumber(row.score));
    const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();

    const bucket = map.get(userId) || { scores: [], attempts: [] };
    bucket.scores.push(score);
    bucket.attempts.push({ score, createdAt });
    map.set(userId, bucket);
  }

  const leaderboard = Array.from(map.entries()).map(([userId, bucket]) => {
    const avg = bucket.scores.length ? bucket.scores.reduce((s, n) => s + n, 0) / bucket.scores.length : 0;
    const best = bucket.scores.length ? Math.max(...bucket.scores) : 0;
    const consistency = calculateConsistency(bucket.scores);
    const improvement = calculateImprovement(bucket.attempts);
    const rankingScore = 0.5 * avg + 0.3 * consistency + 0.2 * improvement;

    return {
      userId,
      name: profileById[userId] || "Dancer",
      avg_ai_score: Math.round(avg),
      best_score: Math.round(best),
      consistency_score: Math.round(consistency),
      improvement_rate: Math.round(improvement),
      total_sessions: bucket.scores.length,
      ranking_score: Math.round(rankingScore * 100) / 100,
    };
  });

  leaderboard.sort((a, b) => b.ranking_score - a.ranking_score);
  return leaderboard;
}

function calculateMyImprovement7d(rows: AttemptRow[], userId: string) {
  const now = Date.now();
  const in14Days = rows
    .filter((row) => row.user_id === userId)
    .map((row) => ({
      score: percentileClamp(toNumber(row.score)),
      time: row.created_at ? new Date(row.created_at).getTime() : 0,
    }))
    .filter((row) => now - row.time <= 14 * 24 * 60 * 60 * 1000 && row.time > 0);

  const current7 = in14Days.filter((row) => now - row.time <= 7 * 24 * 60 * 60 * 1000);
  const prev7 = in14Days.filter((row) => now - row.time > 7 * 24 * 60 * 60 * 1000);

  const avg = (arr: { score: number }[]) => (arr.length ? arr.reduce((s, r) => s + r.score, 0) / arr.length : 0);
  return Math.round((avg(current7) - avg(prev7)) * 10) / 10;
}

export async function GET(request: Request) {
  try {
    const maybe = await enforceRateLimit(request as any as Request, { windowMs: 60_000, max: 30, keyPrefix: 'leaderboard:get' });
    if (maybe) return maybe;
  } catch (e) {
    // ignore limiter errors
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ leaderboard: [], me: null });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = supabase;

  const attemptsResponse = await db
    .from("practice_attempts")
    .select("user_id,score,created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (attemptsResponse.error) {
    return NextResponse.json({ leaderboard: [], me: null }, { status: 200 });
  }

  const rows = (attemptsResponse.data || []) as AttemptRow[];
  const userIds = Array.from(new Set(rows.map((r) => String(r.user_id || "")).filter(Boolean)));

  const profileById: Record<string, string> = {};
  if (userIds.length > 0) {
    const profilesResponse = await db.from("profiles").select("id,full_name").in("id", userIds);
    for (const row of profilesResponse.data || []) {
      profileById[String(row.id)] = row.full_name || "Dancer";
    }
  }

  const leaderboard = computeRankingRows(rows, profileById);
  const meIndex = user ? leaderboard.findIndex((entry) => entry.userId === user.id) : -1;
  const me = meIndex >= 0
    ? {
        ...leaderboard[meIndex],
        rank: meIndex + 1,
        improvement_last_7_days: calculateMyImprovement7d(rows, user!.id),
      }
    : null;

  return NextResponse.json({ leaderboard, me });
}
