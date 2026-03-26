import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

const APPLY_COOLDOWN_MS = 10 * 60 * 1000;

const applySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  portfolio: z.string().trim().url().max(2000).optional().or(z.literal("")),
  sampleVideo: z.string().trim().url().max(2000),
  experience: z.string().trim().min(20).max(5000),
  specialties: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
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
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid application payload" }, { status: 400 });
  }

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

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data: existing } = await db
    .from("choreographer_applications")
    .select("id,status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = existing?.[0];
  if (latest?.created_at) {
    const latestAt = new Date(latest.created_at).getTime();
    if (!Number.isNaN(latestAt)) {
      const elapsedMs = Date.now() - latestAt;
      if (elapsedMs < APPLY_COOLDOWN_MS) {
        const retryAfterSec = Math.max(1, Math.ceil((APPLY_COOLDOWN_MS - elapsedMs) / 1000));
        return NextResponse.json(
          {
            error: "You are submitting too quickly. Please wait before trying again.",
            retryAfterSeconds: retryAfterSec,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSec),
            },
          }
        );
      }
    }
  }

  if (latest && latest.status === "pending") {
    return NextResponse.json(
      { error: "You already have a pending application under review." },
      { status: 409 }
    );
  }

  const input = parsed.data;
  const profileUpdate: { full_name?: string; bio?: string } = {};
  if (input.name) profileUpdate.full_name = input.name;
  if (input.bio) profileUpdate.bio = input.bio;

  if (Object.keys(profileUpdate).length > 0) {
    await db.from("profiles").update(profileUpdate).eq("id", user.id);
  }

  const { data, error } = await db
    .from("choreographer_applications")
    .insert({
      user_id: user.id,
      portfolio_url: input.portfolio || null,
      sample_video: input.sampleVideo,
      experience: input.experience,
      specialties: input.specialties,
      status: "pending",
    })
    .select("id,status,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    application: {
      id: data.id,
      status: data.status,
      createdAt: data.created_at,
    },
  });
}
