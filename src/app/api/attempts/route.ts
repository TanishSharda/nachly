import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { enforceRateLimit } from '@/lib/security/rateLimiter';

const postSchema = z.object({
  choreoId: z.string().trim().min(1).max(120),
  score: z.number().int().min(0).max(100),
  videoUrl: z.string().trim().url().max(2000),
});

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

  const url = new URL(request.url);
  const choreoId = (url.searchParams.get("choreoId") || "").trim();

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const db = supabase;

  let attemptsQuery = db
    .from("practice_attempts")
    .select("id,user_id,choreo_id,score,video_url,created_at")
    .eq("user_id", user.id);

  if (choreoId) {
    attemptsQuery = attemptsQuery.eq("choreo_id", choreoId).order("created_at", { ascending: true }).limit(300);
  } else {
    attemptsQuery = attemptsQuery.order("created_at", { ascending: false }).limit(300);
  }

  const { data, error } = await attemptsQuery;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch attempts" }, { status: 500 });
  }

  const choreoIds = Array.from(new Set((data || []).map((row) => String(row.choreo_id || "")).filter(Boolean)));
  let titleById: Record<string, string> = {};

  if (choreoIds.length > 0) {
    const { data: routineRows } = await db.from("routines").select("id,title").in("id", choreoIds);
    titleById = (routineRows || []).reduce((acc, row) => {
      acc[String(row.id)] = row.title || "Untitled Choreo";
      return acc;
    }, {} as Record<string, string>);
  }

  const attempts = (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    choreoId: row.choreo_id,
    choreoTitle: titleById[String(row.choreo_id)] || null,
    score: Number(row.score || 0),
    video: row.video_url,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  }));

  return NextResponse.json({ attempts });
}

export async function POST(request: Request) {
  try {
    const maybe = await enforceRateLimit(request as unknown as NextRequest, { windowMs: 60_000, max: 60, keyPrefix: 'attempts' });
    if (maybe) return maybe;
  } catch (e) {
    // ignore limiter failures
  }
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attempt payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const db = supabase;
  const input = parsed.data;

  const { data, error } = await db
    .from("practice_attempts")
    .insert({
      user_id: user.id,
      choreo_id: input.choreoId,
      score: input.score,
      video_url: input.videoUrl,
    })
    .select("id,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
  });
}