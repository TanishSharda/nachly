"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getChoreographyFeed } from "@/lib/api/choreos";

export default function ChallengesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { posts } = await getChoreographyFeed({ limit: 3, offset: 0 });
        if (!mounted) return;
        setItems(Array.isArray(posts) ? posts : []);
      } catch {
        if (mounted) setItems([]);
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
    <main className="min-h-screen bg-[#f4f1ec] px-4 py-6 text-[#221d16] sm:px-6 md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a6c4d]">Weekly challenges</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-[#2a1c11]">Challenge Hub</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#665543]">Pick a routine, compete on the leaderboard, then jump into the player.</p>
          </div>
          <Link href="/leaderboard" className="rounded-full bg-[#7a5c3a] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#fff7ef] transition hover:brightness-105">
            Leaderboard
          </Link>
        </header>

        {loading ? (
          <div className="rounded-[1.5rem] border border-[#6c51321c] bg-white/80 p-6 text-sm text-[#665543]">Loading challenges...</div>
        ) : null}

        <div className="grid gap-4">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={`/choreography/${encodeURIComponent(item.id)}`}
              className="rounded-[1.5rem] border border-[#6c51321c] bg-white/80 p-5 shadow-[0_18px_40px_-28px_rgba(58,42,26,0.25)] transition hover:bg-[#fcfaf6]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a6c4d]">Challenge #{index + 1}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#241811]">{item.title}</h2>
                  <p className="mt-2 text-sm text-[#665543]">{item.description || "Open this choreography and start the challenge."}</p>
                </div>
                <span className="rounded-full border border-[#6c513220] bg-[#f7f1e8] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a5c3a]">Open</span>
              </div>
            </Link>
          ))}
        </div>

        {!loading && items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-[#6c51321c] bg-white/80 p-6 text-sm text-[#665543]">
            No challenge items are available right now. Try the feed instead.
          </div>
        ) : null}
      </div>
    </main>
  );
}
