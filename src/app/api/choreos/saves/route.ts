import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

const postSchema = z.object({
  choreoId: z.string().trim().min(1).max(160),
  title: z.string().trim().max(160).optional(),
  videoUrl: z.string().trim().url().max(2000).optional(),
  styleSlug: z.string().trim().max(80).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  caption: z.string().trim().max(600).optional(),
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

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ saves: [] });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data, error } = await db
    .from("user_saved_choreos")
    .select("choreo_id,title,video_url,style_slug,difficulty,caption,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: "Failed to load saved choreos" }, { status: 500 });
  }

  const saves = (data || []).map((row) => ({
    choreoId: row.choreo_id,
    title: row.title || "Untitled Choreo",
    videoUrl: row.video_url || "",
    styleSlug: row.style_slug || "",
    difficulty: row.difficulty || null,
    caption: row.caption || "",
    createdAt: row.created_at,
  }));

  return NextResponse.json({ saves });
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
    return NextResponse.json({ error: "Invalid save payload" }, { status: 400 });
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
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data: existing, error: existingError } = await db
    .from("user_saved_choreos")
    .select("id")
    .eq("user_id", user.id)
    .eq("choreo_id", input.choreoId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "Failed to toggle save" }, { status: 500 });
  }

  let saved = false;

  if (existing?.id) {
    const { error: deleteError } = await db.from("user_saved_choreos").delete().eq("id", existing.id);
    if (deleteError) {
      return NextResponse.json({ error: "Failed to remove save" }, { status: 500 });
    }
    saved = false;
  } else {
    const { error: insertError } = await db.from("user_saved_choreos").insert({
      user_id: user.id,
      choreo_id: input.choreoId,
      title: input.title || null,
      video_url: input.videoUrl || null,
      style_slug: input.styleSlug || null,
      difficulty: input.difficulty || null,
      caption: input.caption || null,
    });

    if (insertError) {
      return NextResponse.json({ error: "Failed to save choreo" }, { status: 500 });
    }
    saved = true;
  }

  return NextResponse.json({ ok: true, saved });
}
