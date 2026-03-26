import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

interface DrillCompletionRow {
  id: string;
  drill_id: string;
  routine_id: string;
  body_part: "arms" | "legs" | "posture";
  target_score: number;
  achieved_score: number;
  auto_completed: boolean;
  completion_source: "auto-hold" | "manual-end";
  compared_frames: number;
  body_part_samples: number;
  stable_samples: number;
  signed_payload: string;
  signature: string;
  created_at: string;
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

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const signingSecret = process.env.DRILL_SIGNING_SECRET;
  if (!signingSecret) {
    return missingConfigResponse();
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  const { data, error } = await db
    .from("drill_completion_events")
    .select(
      "id,drill_id,routine_id,body_part,target_score,achieved_score,auto_completed,completion_source,compared_frames,body_part_samples,stable_samples,signed_payload,signature,created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch drill events" }, { status: 500 });
  }

  const rows = (data || []) as DrillCompletionRow[];
  const events = rows.map((row) => {
    const expected = signPayload(signingSecret, row.signed_payload);
    const signatureValid = expected === row.signature;

    return {
      id: row.id,
      drillId: row.drill_id,
      routineId: row.routine_id,
      bodyPart: row.body_part,
      targetScore: row.target_score,
      achievedScore: row.achieved_score,
      autoCompleted: row.auto_completed,
      completionSource: row.completion_source,
      comparedFrames: row.compared_frames,
      bodyPartSamples: row.body_part_samples,
      stableSamples: row.stable_samples,
      createdAt: row.created_at,
      signatureValid,
    };
  });

  const validCount = events.filter((event) => event.signatureValid).length;

  return NextResponse.json({
    total: events.length,
    validCount,
    invalidCount: events.length - validCount,
    events,
  });
}
