import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

const reactionTypes = ["loved_it", "hard", "practicing", "fast_moves"] as const;

type ReactionType = (typeof reactionTypes)[number];

type ReactionRow = {
  reaction_type: string;
  choreo_id?: string;
  user_id?: string | null;
};

type SupabaseClientLike = Awaited<ReturnType<typeof createServerSupabase>> | ReturnType<typeof createServiceRoleClient>;

const postSchema = z.object({
  choreoId: z.string().trim().min(1).max(160),
  reaction: z.enum(reactionTypes),
  anonKey: z.string().trim().min(4).max(64).optional(),
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

function emptyCounts() {
  return {
    loved_it: 0,
    hard: 0,
    practicing: 0,
    fast_moves: 0,
  };
}

async function countFor(
  db: SupabaseClientLike,
  choreoId: string
) {
  const { data, error } = await db
    .from("choreo_reactions")
    .select("reaction_type")
    .eq("choreo_id", choreoId);

  if (error) return emptyCounts();

  const counts = emptyCounts();
  (data || []).forEach((row: ReactionRow) => {
    const key = row.reaction_type as ReactionType;
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
    return NextResponse.json({ reactions: {} });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;
  const { data, error } = await db
    .from("choreo_reactions")
    .select("choreo_id,reaction_type,user_id")
    .in("choreo_id", ids);

  if (error) {
    return NextResponse.json({ error: "Failed to load reactions" }, { status: 500 });
  }

  const reactions = ids.reduce<
    Record<string, { counts: Record<ReactionType, number>; viewerReaction: ReactionType | null }>
  >((acc, id) => {
    acc[id] = { counts: emptyCounts(), viewerReaction: null };
    return acc;
  }, {});

  (data || []).forEach((row) => {
    const bucket = reactions[row.choreo_id];
    if (!bucket) return;

    const reaction = row.reaction_type as ReactionType;
    if (bucket.counts[reaction] !== undefined) {
      bucket.counts[reaction] += 1;
    }

    if (user?.id && row.user_id === user.id) {
      bucket.viewerReaction = reaction;
    }
  });

  return NextResponse.json({ reactions });
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
    return NextResponse.json({ error: "Invalid reaction payload" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return missingSupabaseConfigResponse();
  }

  const input = parsed.data;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const actorAnonKey = input.anonKey || null;
  if (!user && !actorAnonKey) {
    return NextResponse.json({ error: "anonKey is required for unauthenticated reactions" }, { status: 400 });
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  let existingQuery = db
    .from("choreo_reactions")
    .select("id,reaction_type")
    .eq("choreo_id", input.choreoId)
    .limit(1);

  if (user) {
    existingQuery = existingQuery.eq("user_id", user.id);
  } else {
    existingQuery = existingQuery.is("user_id", null).eq("anon_key", actorAnonKey);
  }

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "Failed to toggle reaction" }, { status: 500 });
  }

  let viewerReaction: ReactionType | null = input.reaction;

  if (existing?.id && existing.reaction_type === input.reaction) {
    const { error: deleteError } = await db.from("choreo_reactions").delete().eq("id", existing.id);
    if (deleteError) {
      return NextResponse.json({ error: "Failed to remove reaction" }, { status: 500 });
    }
    viewerReaction = null;
  } else if (existing?.id) {
    const { error: updateError } = await db
      .from("choreo_reactions")
      .update({ reaction_type: input.reaction, created_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
    }
  } else {
    const { error: insertError } = await db.from("choreo_reactions").insert({
      choreo_id: input.choreoId,
      user_id: user?.id || null,
      anon_key: user ? null : actorAnonKey,
      reaction_type: input.reaction,
    });

    if (insertError) {
      return NextResponse.json({ error: "Failed to add reaction" }, { status: 500 });
    }
  }

  const counts = await countFor(db, input.choreoId);
  return NextResponse.json({ ok: true, counts, viewerReaction });
}
