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
  id: z.string().trim().min(1).max(128),
  bodyPart: z.enum(["arms", "legs", "posture"]),
  title: z.string().trim().min(1).max(180),
  cue: z.string().trim().min(1).max(1000),
  durationSeconds: z.number().int().min(1).max(7200),
  targetScore: z.number().int().min(0).max(100),
  level: z.number().int().min(1).max(99),
  currentStreak: z.number().int().min(0).max(99),
  styleSlug: z.string().trim().max(80).nullable().optional(),
  routineSlug: z.string().trim().max(120).nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

const syncSchema = z.object({
  drills: z.array(drillSchema).max(200),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
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
    const maybe = await enforceRateLimit(request as any as Request, { windowMs: 60_000, max: 60, keyPrefix: 'drills:catalog:sync' });
    if (maybe) return maybe;
  } catch (e) {
    // ignore limiter failures
  }

  const db = supabase;

  const rows = parsed.data.drills.map((drill) => ({
    user_id: user.id,
    local_drill_id: drill.id,
    body_part: drill.bodyPart,
    title: drill.title,
    cue: drill.cue,
    duration_seconds: drill.durationSeconds,
    target_score: drill.targetScore,
    level: drill.level,
    current_streak: drill.currentStreak,
    source_style_slug: drill.styleSlug ?? null,
    source_routine_slug: drill.routineSlug ?? null,
    completed_at: drill.completedAt ?? null,
  }));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const { error } = await db.from("user_drills").upsert(rows, {
    onConflict: "user_id,local_drill_id",
  });

  if (error) {
    return NextResponse.json({ error: "Failed to sync drills" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
