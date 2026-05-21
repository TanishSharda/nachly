import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

interface DrillCompletionRow {
  drill_id: string;
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

  const supabase = await createServerSupabase();
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
    .select("drill_id,signed_payload,signature,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch drill progression" }, { status: 500 });
  }

  const rows = (data || []) as DrillCompletionRow[];
  const progression: Record<string, { verifiedHits: number; verifiedCompleted: boolean; lastHitAt: string }> = {};

  for (const row of rows) {
    const expected = signPayload(signingSecret, row.signed_payload);
    if (expected !== row.signature) continue;

    const current = progression[row.drill_id] || {
      verifiedHits: 0,
      verifiedCompleted: false,
      lastHitAt: row.created_at,
    };

    current.verifiedHits += 1;
    current.verifiedCompleted = current.verifiedHits >= 3;
    if (!current.lastHitAt || row.created_at > current.lastHitAt) {
      current.lastHitAt = row.created_at;
    }
    progression[row.drill_id] = current;
  }

  return NextResponse.json({ progression });
}
