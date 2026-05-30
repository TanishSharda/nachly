import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { enforceRateLimit } from '@/lib/security/rateLimiter';

function missingSupabaseConfigResponse() {
  return NextResponse.json(
    {
      error: "Service temporarily unavailable",
      detail: "Missing required server configuration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
    { status: 503 }
  );
}

const drillSchema = z.object({
  localDrillId: z.string().trim().min(1).max(128),
  bodyPart: z.enum(["arms", "legs", "posture"]),
  title: z.string().trim().min(1).max(180),
  cue: z.string().trim().min(1).max(1000),
  durationSeconds: z.number().int().min(1).max(7200),
  targetScore: z.number().int().min(0).max(100),
  level: z.number().int().min(1).max(99),
  currentStreak: z.number().int().min(0).max(99),
  sourceStyleSlug: z.string().trim().max(80).nullable().optional(),
  sourceRoutineSlug: z.string().trim().max(120).nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export async function GET(request: Request) {
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

  try {
    const maybe = await enforceRateLimit(request as any as Request, { windowMs: 60_000, max: 60, keyPrefix: 'drills:catalog:get' });
    if (maybe) return maybe;
  } catch (e) {
    // ignore limiter failures
  }

  const db = supabase;

  const { data, error } = await db
    .from("user_drills")
    .select(
      "local_drill_id,body_part,title,cue,duration_seconds,target_score,level,current_streak,source_style_slug,source_routine_slug,completed_at,created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch drill catalog" }, { status: 500 });
  }

  const drills = (data || []).map((row) => ({
    id: row.local_drill_id,
    bodyPart: row.body_part,
    title: row.title,
    cue: row.cue,
    durationSeconds: row.duration_seconds,
    targetScore: row.target_score,
    level: row.level,
    currentStreak: row.current_streak,
    styleSlug: row.source_style_slug,
    routineSlug: row.source_routine_slug,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ drills });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = drillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid drill payload" }, { status: 400 });
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

  try {
    const maybe = await enforceRateLimit(request as any as Request, { windowMs: 60_000, max: 60, keyPrefix: 'drills:catalog:post' });
    if (maybe) return maybe;
  } catch (e) {
    // ignore limiter failures
  }

  const db = supabase;
  const input = parsed.data;

  const { error } = await db.from("user_drills").upsert(
    {
      user_id: user.id,
      local_drill_id: input.localDrillId,
      body_part: input.bodyPart,
      title: input.title,
      cue: input.cue,
      duration_seconds: input.durationSeconds,
      target_score: input.targetScore,
      level: input.level,
      current_streak: input.currentStreak,
      source_style_slug: input.sourceStyleSlug ?? null,
      source_routine_slug: input.sourceRoutineSlug ?? null,
      completed_at: input.completedAt ?? null,
    },
    {
      onConflict: "user_id,local_drill_id",
    }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to sync drill" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
