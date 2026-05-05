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
    <main className="min-h-screen bg-[#fbf9f4] px-4 py-6 text-[#31332e]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10">
          <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#725b3f]">Your Collection</span>
          <h1 className="mt-1 text-4xl md:text-5xl font-extrabold tracking-tight text-[#1f1f1b]">Saved</h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-[#725b3f]" />
        </div>

        <div className="mb-8 flex gap-3 overflow-x-auto no-scrollbar pb-3">
          <button className="rounded-full bg-[#725b3f] px-6 py-2 text-sm font-semibold text-white">All</button>
          <button className="rounded-full bg-[#f5f4ed] px-6 py-2 text-sm font-semibold text-[#675e54]">Contemporary</button>
          <button className="rounded-full bg-[#f5f4ed] px-6 py-2 text-sm font-semibold text-[#675e54]">Ballet</button>
          <button className="rounded-full bg-[#f5f4ed] px-6 py-2 text-sm font-semibold text-[#675e54]">Hip Hop</button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#b2b2ab] bg-[#f5f4ed] p-6 text-sm text-[#5e6059]">Loading saved choreos...</div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-[#fd795a] bg-[#fff2ef] p-6 text-sm text-[#6e1400]">{error}</div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-2xl border border-[#b2b2ab] bg-[#f5f4ed] p-6 text-sm text-[#5e6059]">
            Nothing saved yet. Go to Scroll and tap Save on official choreographies.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.choreoId} className="group overflow-hidden rounded-[2rem] bg-[#f5f4ed] transition-all hover:bg-[#eceae2]">
              <div className="relative aspect-[16/10] overflow-hidden">
                {item.videoUrl ? (
                  <video src={item.videoUrl} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" muted playsInline />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#ddd5c7] to-[#cfc6b5]" />
                )}
                <button className="absolute right-4 top-4 rounded-full bg-white/85 p-2 text-[#725b3f] shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold tracking-tight text-[#1f1f1b]">{item.title || "Untitled Choreo"}</p>
                    <p className="mt-1 text-sm text-[#675e54]">Instructor Session</p>
                  </div>
                  <span className="rounded-full bg-[#fdddb9] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#644e33]">
                    {(item.difficulty || "beginner").toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-[#5e6059]">
                {(item.styleSlug || "style").toUpperCase()} · {(item.difficulty || "intermediate").toUpperCase()}
              </p>
                <p className="mt-2 line-clamp-2 text-sm text-[#5e6059]">{item.caption || "Ready for your next practice session."}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link
                    href={learnHref(item)}
                    className="rounded-full border border-[#7a7b75]/25 bg-white/80 px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-[#725b3f] transition hover:bg-white"
                  >
                    Practice Now
                  </Link>
                  <Link
                    href={`/record/${item.choreoId}?mode=remix`}
                    className="rounded-full bg-[#725b3f] px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#654f34]"
                  >
                    Continue
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
