import { NextResponse } from "next/server";
import { getChoreographyFeed } from "@/lib/supabase/queries/choreos";

/*
  Recommendation: migrate the feed endpoint to cursor-based pagination
  to improve performance at scale. Replace `offset` with a `cursor` param
  (e.g. `created_at` ISO timestamp or opaque cursor). Return `{ posts, nextCursor }`
  where `nextCursor` is the paging token for the next page. This avoids large
  OFFSET queries which become slower as table size grows.

  Example response shape after migration:
  {
    posts: [...],
    hasMore: true,
    nextCursor: '2026-05-30T12:23:45.000Z'
  }
*/

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 12), 24);
  const offset = parsePositiveInt(searchParams.get("offset"), 0);
  const cursor = (searchParams.get('cursor') || '').trim() || null;
  const style = (searchParams.get("style") || "").trim().toLowerCase();
  const difficulty = (searchParams.get("difficulty") || "").trim().toLowerCase();

  const result = await getChoreographyFeed({
    limit,
    offset,
    cursor: cursor || undefined,
    style: style || undefined,
    difficulty: difficulty || undefined,
  });

  const { posts, error, nextCursor: serverNextCursor } = result as any;

  if (error) {
    return NextResponse.json({ posts: [], hasMore: false, nextOffset: offset, error: error }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // If server returned a nextCursor, surface cursor-style paging token.
  const nextCursor = serverNextCursor || null;
  return NextResponse.json(
    {
      posts,
      hasMore: (posts || []).length === limit,
      nextOffset: offset + ((posts || []).length || 0),
      nextCursor,
      fallback: false,
    },
    {
      headers: {
        // Short shared caching for CDN/edge to reduce load on reads.
        // Keep client no-cache semantics and allow CDN to serve for 30s.
        'Cache-Control': 'public, s-maxage=30',
      },
    }
  );
}