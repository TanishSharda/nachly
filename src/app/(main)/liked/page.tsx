"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getChoreographyLikes } from "@/lib/api/choreos";

type LikedItem = {
  choreoId: string;
  title: string;
  routineSlug: string | null;
  styleSlug: string;
  styleName: string;
  difficulty: string;
  caption: string;
  videoUrl: string;
};

function learnHref(item: LikedItem) {
  if (item.styleSlug && item.routineSlug) {
    return `/explore/${item.styleSlug}/${item.routineSlug}/learn`;
  }
  return `/learn/${item.choreoId}?mode=stepwise`;
}

export default function LikedPage() {
  const [items, setItems] = useState<LikedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const likes = await getChoreographyLikes();
        if (!mounted) return;
        setItems(Array.isArray(likes) ? likes : []);
      } catch {
        if (mounted) setError("Unable to load liked sessions");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#050507] px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Liked Sessions</h1>
            <p className="mt-1 text-sm text-zinc-400">Your hearted choreographies from Scroll.</p>
          </div>
          <Link
            href="/profile/me"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Back to Profile
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300">Loading liked sessions...</div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">{error}</div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300">
            No liked sessions yet. Open Scroll and tap the heart button.
          </div>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.choreoId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-base font-semibold text-white">{item.title || "Untitled Choreo"}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {(item.styleName || item.styleSlug || "style").toUpperCase()} · {(item.difficulty || "intermediate").toUpperCase()}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{item.caption || "Ready for your next practice session."}</p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href={learnHref(item)}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Learn
                </Link>
                <Link
                  href={`/record/${item.choreoId}?mode=remix`}
                  className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-indigo-500 px-3 py-2 text-center text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Remix
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
