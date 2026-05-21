import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

const postSchema = z.object({
  choreoId: z.string().trim().min(1).max(160),
  action: z.enum(["like", "comment", "try_this", "view_stats"]),
  mode: z.enum(["toggle", "track"]).default("track"),
  anonKey: z.string().trim().min(4).max(64).optional(),
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

type EngagementRow = {
  interaction_type: string;
};

type SupabaseClientLike = Awaited<ReturnType<typeof createServerSupabase>> | ReturnType<typeof createServiceRoleClient>;

async function countFor(db: SupabaseClientLike, choreoId: string) {
  const { data, error } = await db
    .from("choreo_engagement_events")
    .select("interaction_type")
    .eq("choreo_id", choreoId)
    .in("interaction_type", ["like", "comment", "try_this", "view_stats"]);

  if (error) {
    return { like: 0, comment: 0, try_this: 0, view_stats: 0 };
  }

  const counts = { like: 0, comment: 0, try_this: 0, view_stats: 0 };
  (data || []).forEach((row: EngagementRow) => {
    const key = row.interaction_type as keyof typeof counts;
    if (counts[key] !== undefined) counts[key] += 1;
  });
  return counts;
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
    return NextResponse.json({ metrics: {} });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data, error } = await db
    .from("choreo_engagement_events")
    .select("choreo_id,interaction_type,user_id")
    .in("choreo_id", ids);

  if (error) {
    return NextResponse.json({ error: "Failed to load engagement metrics" }, { status: 500 });
  }

  const metrics = ids.reduce<Record<string, { likes: number; comments: number; tryThis: number; views: number; viewerLiked: boolean }>>(
    (acc, id) => {
      acc[id] = { likes: 0, comments: 0, tryThis: 0, views: 0, viewerLiked: false };
      return acc;
    },
    {}
  );

  (data || []).forEach((row) => {
    const bucket = metrics[row.choreo_id];
    if (!bucket) return;

    if (row.interaction_type === "like") {
      bucket.likes += 1;
      if (user?.id && row.user_id === user.id) bucket.viewerLiked = true;
      return;
    }

    if (row.interaction_type === "comment") bucket.comments += 1;
    if (row.interaction_type === "try_this") bucket.tryThis += 1;
    if (row.interaction_type === "view_stats") bucket.views += 1;
  });

  return NextResponse.json({ metrics });
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
    return NextResponse.json({ error: "Invalid engagement payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const input = parsed.data;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  if (input.action === "like" && input.mode === "toggle") {
    if (!user) {
      return NextResponse.json({ error: "Login required to like choreographies" }, { status: 401 });
    }

    const { data: existing, error: existingError } = await db
      .from("choreo_engagement_events")
      .select("id")
      .eq("choreo_id", input.choreoId)
      .eq("interaction_type", "like")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
    }

    let liked = false;

    if (existing?.id) {
      const { error: deleteError } = await db.from("choreo_engagement_events").delete().eq("id", existing.id);
      if (deleteError) {
        return NextResponse.json({ error: "Failed to remove like" }, { status: 500 });
      }
      liked = false;
    } else {
      const { error: insertError } = await db.from("choreo_engagement_events").insert({
        choreo_id: input.choreoId,
        user_id: user.id,
        interaction_type: "like",
      });
      if (insertError) {
        return NextResponse.json({ error: "Failed to add like" }, { status: 500 });
      }
      liked = true;
    }

    const counts = await countFor(db, input.choreoId);
    return NextResponse.json({ ok: true, liked, counts });
  }

  const actorAnonKey = input.anonKey || null;
  if (!user && !actorAnonKey) {
    return NextResponse.json({ error: "anonKey is required for unauthenticated events" }, { status: 400 });
  }

  const { error } = await db.from("choreo_engagement_events").insert({
    choreo_id: input.choreoId,
    user_id: user?.id || null,
    anon_key: actorAnonKey,
    interaction_type: input.action,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to track engagement" }, { status: 500 });
  }

  const counts = await countFor(db, input.choreoId);
  return NextResponse.json({ ok: true, counts });
}
