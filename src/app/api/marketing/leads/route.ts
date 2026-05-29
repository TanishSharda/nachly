import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { enforceRateLimit } from '@/lib/security/rateLimiter';

type LeadInsert = {
  email: string;
  source: string;
  page: string;
  guest_key: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
};

const leadSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: z.string().trim().min(2).max(80).default("homepage"),
  page: z.string().trim().min(1).max(120).default("/"),
  guestKey: z.string().trim().min(4).max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

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

export async function POST(request: Request) {
  try {
    const maybe = await enforceRateLimit(request as unknown as NextRequest, { windowMs: 60_000, max: 10, keyPrefix: 'marketing:leads' });
    if (maybe) return maybe;
  } catch (e) {
    // ignore
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const input = parsed.data;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = supabase;

  const payload: LeadInsert = {
    email: input.email,
    source: input.source,
    page: input.page,
    guest_key: input.guestKey || null,
    user_id: user?.id || null,
    metadata: input.metadata || null,
  };

  const { data, error } = await db
    .from("marketing_leads")
    .insert(payload)
    .select("id, email")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, email: data.email });
}
