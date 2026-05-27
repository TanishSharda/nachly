"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getChoreographyFeed } from "@/lib/api/choreos";
import ChoreoFeed from "@/components/scroll/ChoreoFeed";
import ImmersiveFeed from "@/components/scroll/ImmersiveFeed";

export default function ScrollPage() {
  const searchParams = useSearchParams();
  const style = (searchParams.get("style") || "").trim().toLowerCase();
  const difficulty = (searchParams.get("difficulty") || "").trim().toLowerCase();

  const [initialPosts, setInitialPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const { posts } = await getChoreographyFeed({ style: style || undefined, difficulty: difficulty || undefined, limit: 8, offset: 0 });
        setInitialPosts(Array.isArray(posts) ? posts : []);
      } catch (err) {
        console.error("/scroll: failed to load feed", err);
        setInitialPosts([]);
      }
    };

    void fetchInitial();
  }, [style, difficulty]);

  useEffect(() => {
    try {
      const saved = Number(window.sessionStorage.getItem("naachly_feed_scroll_y_v1") || 0);
      if (Number.isFinite(saved) && saved > 0) {
        const id = window.setTimeout(() => window.scrollTo({ top: saved, behavior: "auto" }), 0);
        return () => window.clearTimeout(id);
      }
    } catch {
      // ignore restore failures
    }
    return undefined;
  }, [style, difficulty, initialPosts.length]);

  const title = difficulty === "all" || !difficulty ? "Infinite feed. Structured learning." : `${difficulty[0].toUpperCase()}${difficulty.slice(1)} feed`;

  return (
    <main className="min-h-screen bg-obsidian text-foreground">
      <section className="relative overflow-hidden px-4 pb-8 pt-6 sm:px-6 md:px-8 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_48px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-7"
          >
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#F3B2AB]">Home feed</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">{title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8A8D9F] sm:text-base">
                  A cinematic reel stream for discovery, practice, and rapid switching into step-by-step learning.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                <Link href="/challenges" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10">
                  Challenges
                </Link>
                <Link href="/learn/feed" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10">
                  All feed
                </Link>
                <Link href="/collections" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10">
                  Collections
                </Link>
                <Link href="/onboarding?role=creator" className="rounded-full bg-[#F3B2AB] px-4 py-2 text-black hover:brightness-105">
                  Upload a Dance
                </Link>
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 md:px-8">
        <div className="mx-auto max-w-5xl">
          <ImmersiveFeed initialPosts={initialPosts} />
        </div>
      </section>
    </main>
  );
}