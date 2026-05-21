import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const postSchema = z.object({
  routineId: z.string().trim().min(1).max(120),
  accuracy: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100),
  completion: z.number().min(0).max(100),
  durationMs: z.number().int().min(0),
  bodyPartScores: z.record(z.string(), z.number()).optional(),
  difficultyLevel: z.string().trim().max(40).optional(),
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

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const url = new URL(request.url);
  const routineId = (url.searchParams.get("routineId") || "").trim();
  const limitParam = Number(url.searchParams.get("limit") || 20);
  const limit = Number.isFinite(limitParam) ? Math.min(100, Math.max(1, Math.floor(limitParam))) : 20;

  if (routineId && !isUuid(routineId)) {
    return NextResponse.json({ error: "Invalid routine id" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  let query = db
    .from("practice_sessions")
    .select(
      "id,routine_id,accuracy_score,consistency_score,completion_pct,duration_ms,created_at,routines(title,dance_styles(slug))"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (routineId) {
    query = query.eq("routine_id", routineId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  const sessions = (data || []).map((row: any) => ({
    routineId: row.routine_id,
    routineTitle: row.routines?.title || "Untitled Routine",
    styleSlug: row.routines?.dance_styles?.[0]?.slug || row.routines?.dance_styles?.slug || "unknown",
    accuracy: Number(row.accuracy_score || 0),
    consistency: Number(row.consistency_score || 0),
    completion: Number(row.completion_pct || 0),
    date: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    elapsed: Math.max(0, Math.round(Number(row.duration_ms || 0) / 1000)),
  }));

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session payload" }, { status: 400 });
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

  const input = parsed.data;
  if (!isUuid(input.routineId)) {
    return NextResponse.json({ error: "Invalid routine id" }, { status: 400 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data, error } = await db
    .from("practice_sessions")
    .insert({
      user_id: user.id,
      routine_id: input.routineId,
      accuracy_score: input.accuracy,
      consistency_score: input.consistency,
      completion_pct: input.completion,
      duration_ms: input.durationMs,
      body_part_scores: input.bodyPartScores || null,
      difficulty_level: input.difficultyLevel || null,
    })
    .select("id,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
  });
}
