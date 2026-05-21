import { NextResponse } from "next/server";
import { getChoreographyFeed } from "@/lib/supabase/queries/choreos";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 12), 24);
  const offset = parsePositiveInt(searchParams.get("offset"), 0);
  const style = (searchParams.get("style") || "").trim().toLowerCase();
  const difficulty = (searchParams.get("difficulty") || "").trim().toLowerCase();

  const { posts, error } = await getChoreographyFeed({
    limit,
    offset,
    style: style || undefined,
    difficulty: difficulty || undefined,
  });

  if (error) {
    return NextResponse.json({ posts: [], hasMore: false, nextOffset: offset, error: error });
  }

  return NextResponse.json({
    posts,
    hasMore: (posts || []).length === limit,
    nextOffset: offset + ((posts || []).length || 0),
    fallback: false,
  });
}