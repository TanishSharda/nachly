"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SavedItem = {
  choreoId: string;
  title: string;
  videoUrl: string;
  styleSlug: string;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  caption: string;
};

function learnHref(item: SavedItem) {
  return `/learn/${item.choreoId}?mode=stepwise`;
}

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/choreos/saves", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!mounted) return;
          setError(payload?.error || "Unable to load saved choreos");
          return;
        }
        if (!mounted) return;
        setItems(Array.isArray(payload?.saves) ? payload.saves : []);
      } catch {
        if (mounted) setError("Unable to load saved choreos");
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
            <h1 className="text-2xl font-semibold tracking-tight">Saved for Practice</h1>
            <p className="mt-1 text-sm text-zinc-400">Jump back into Learn or Remix anytime.</p>
          </div>
          <Link
            href="/scroll"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Back to Scroll
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300">Loading saved choreos...</div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">{error}</div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-300">
            Nothing saved yet. Go to Scroll and tap Save on official choreographies.
          </div>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.choreoId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-base font-semibold text-white">{item.title || "Untitled Choreo"}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {(item.styleSlug || "style").toUpperCase()} · {(item.difficulty || "intermediate").toUpperCase()}
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
