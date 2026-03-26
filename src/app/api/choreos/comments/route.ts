import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

const postSchema = z.object({
  choreoId: z.string().trim().min(1).max(160),
  comment: z.string().trim().min(1).max(400),
  anonKey: z.string().trim().min(4).max(64).optional(),
  displayName: z.string().trim().max(80).optional(),
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

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 60);

  if (!ids.length) {
    return NextResponse.json({ comments: {} });
  }

  const supabase = createServerSupabase();
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data, error } = await db
    .from("choreo_comments")
    .select("id,choreo_id,user_id,display_name,comment_text,created_at")
    .in("choreo_id", ids)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  const grouped = ids.reduce<Record<string, Array<{ id: string; userId: string | null; displayName: string; text: string; createdAt: string }>>>(
    (acc, id) => {
      acc[id] = [];
      return acc;
    },
    {}
  );

  (data || []).forEach((row) => {
    if (!grouped[row.choreo_id]) grouped[row.choreo_id] = [];
    grouped[row.choreo_id].push({
      id: row.id,
      userId: row.user_id || null,
      displayName: row.display_name || "Dancer",
      text: row.comment_text,
      createdAt: row.created_at,
    });
  });

  return NextResponse.json({ comments: grouped });
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
    return NextResponse.json({ error: "Invalid comment payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const input = parsed.data;

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !input.anonKey) {
    return NextResponse.json({ error: "anonKey is required for guest comments" }, { status: 400 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  let displayName = input.displayName?.trim() || "";
  if (user) {
    const { data: profile } = await db.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    if (profile?.full_name) displayName = profile.full_name;
  }

  const { data, error } = await db
    .from("choreo_comments")
    .insert({
      choreo_id: input.choreoId,
      user_id: user?.id || null,
      anon_key: user ? null : input.anonKey || null,
      display_name: displayName || "Dancer",
      comment_text: input.comment,
    })
    .select("id,choreo_id,user_id,display_name,comment_text,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    comment: {
      id: data.id,
      choreoId: data.choreo_id,
      userId: data.user_id || null,
      displayName: data.display_name || "Dancer",
      text: data.comment_text,
      createdAt: data.created_at,
    },
  });
}
