import { createHmac } from "node:crypto";
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { enforceRateLimit } from '@/lib/security/rateLimiter';

const completionSchema = z.object({
  drillId: z.string().uuid(),
  routineId: z.string().uuid(),
  styleSlug: z.string().trim().min(1).max(80),
  routineSlug: z.string().trim().min(1).max(120),
  bodyPart: z.enum(["arms", "legs", "posture"]),
  targetScore: z.number().int().min(0).max(100),
  achievedScore: z.number().int().min(0).max(100),
  autoCompleted: z.boolean(),
  completionSource: z.enum(["auto-hold", "manual-end"]),
  comparedFrames: z.number().int().min(0).max(20000),
  bodyPartSamples: z.number().int().min(0).max(20000),
  stableSamples: z.number().int().min(0).max(20000),
});

function buildSignedPayload(params: {
  userId: string;
  drillId: string;
  routineId: string;
  bodyPart: "arms" | "legs" | "posture";
  targetScore: number;
  achievedScore: number;
  completionSource: "auto-hold" | "manual-end";
  autoCompleted: boolean;
  timestampIso: string;
}): string {
  return [
    params.userId,
    params.drillId,
    params.routineId,
    params.bodyPart,
    String(params.targetScore),
    String(params.achievedScore),
    params.completionSource,
    params.autoCompleted ? "1" : "0",
    params.timestampIso,
  ].join("|");
}

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function missingConfigResponse() {
  return NextResponse.json(
    {
      error: "Service temporarily unavailable",
      detail: "Missing required server configuration: DRILL_SIGNING_SECRET",
    },
    { status: 503 }
  );
}

function missingSupabaseConfigResponse() {
  return NextResponse.json(
    {
      error: "Service temporarily unavailable",
      detail: "Missing required server configuration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
    { status: 503 }
  );
}

interface StoredEventRow {
  signed_payload: string;
  signature: string;
}

export async function POST(request: Request) {
  try {
    const maybe = await enforceRateLimit(request as unknown as NextRequest, { windowMs: 60_000, max: 40, keyPrefix: 'drills:complete' });
    if (maybe) return maybe;
  } catch (e) {
    // ignore rate limiter errors
  }
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = completionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid completion payload" }, { status: 400 });
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

  // Server-side guard against client inflation.
  if (input.achievedScore < input.targetScore) {
    return NextResponse.json({ error: "Completion score below target" }, { status: 400 });
  }

  const signingSecret = process.env.DRILL_SIGNING_SECRET;
  if (!signingSecret) {
    return missingConfigResponse();
  }

  const db = supabase;

  const timestampIso = new Date().toISOString();
  const signedPayload = buildSignedPayload({
    userId: user.id,
    drillId: input.drillId,
    routineId: input.routineId,
    bodyPart: input.bodyPart,
    targetScore: input.targetScore,
    achievedScore: input.achievedScore,
    completionSource: input.completionSource,
    autoCompleted: input.autoCompleted,
    timestampIso,
  });
  const signature = signPayload(signingSecret, signedPayload);

  const { error } = await db.from("drill_completion_events").insert({
    user_id: user.id,
    drill_id: input.drillId,
    routine_id: input.routineId,
    style_slug: input.styleSlug,
    routine_slug: input.routineSlug,
    body_part: input.bodyPart,
    target_score: input.targetScore,
    achieved_score: input.achievedScore,
    auto_completed: input.autoCompleted,
    completion_source: input.completionSource,
    compared_frames: input.comparedFrames,
    body_part_samples: input.bodyPartSamples,
    stable_samples: input.stableSamples,
    signed_payload: signedPayload,
    signature,
    created_at: timestampIso,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to save signed completion event" }, { status: 500 });
  }

  const { data: storedEvents, error: countError } = await db
    .from("drill_completion_events")
    .select("signed_payload,signature")
    .eq("user_id", user.id)
    .eq("drill_id", input.drillId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (countError) {
    return NextResponse.json({ error: "Failed to verify completion streak" }, { status: 500 });
  }

  const verifiedHits = ((storedEvents || []) as StoredEventRow[]).reduce((count, event) => {
    const expected = signPayload(signingSecret, event.signed_payload);
    return expected === event.signature ? count + 1 : count;
  }, 0);

  const normalizedVerifiedHits = Math.min(3, verifiedHits);
  const verifiedCompleted = verifiedHits >= 3;

  const drillStateUpdate: {
    current_streak: number;
    completed_at?: string;
  } = {
    current_streak: normalizedVerifiedHits,
  };

  if (verifiedCompleted) {
    drillStateUpdate.completed_at = timestampIso;
  }

  const { error: drillStateError } = await db
    .from("user_drills")
    .update(drillStateUpdate)
    .eq("user_id", user.id)
    .eq("local_drill_id", input.drillId);

  if (drillStateError) {
    return NextResponse.json({ error: "Failed to update drill state" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verifiedHits: normalizedVerifiedHits, verifiedCompleted });
}
