"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getChoreographyFeed } from "@/lib/api/choreos";
import ChoreoFeed from "@/components/scroll/ChoreoFeed";

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

  const title = difficulty === "all" || !difficulty ? "Infinite reels. Structured learning." : `${difficulty[0].toUpperCase()}${difficulty.slice(1)} reels`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe5d4_0%,#fbf8f2_32%,#f6f0e5_100%)] text-[#241811]">
      <section className="relative overflow-hidden px-4 pb-8 pt-6 sm:px-6 md:px-8 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2rem] border border-[#6c51321c] bg-white/70 p-5 shadow-[0_24px_48px_-30px_rgba(58,42,26,0.35)] backdrop-blur-xl sm:p-7"
          >
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#8a6c4d]">Home feed</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-[#2a1c11] sm:text-5xl md:text-6xl">{title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#665543] sm:text-base">
                  A cinematic reel stream for discovery, practice, and rapid switching into step-by-step learning.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a5c3a]">
                <Link href="/scroll" className="rounded-full border border-[#6c513220] bg-white px-4 py-2 hover:bg-[#f9f5ef]">
                  All reels
                </Link>
                <Link href="/library" className="rounded-full border border-[#6c513220] bg-white px-4 py-2 hover:bg-[#f9f5ef]">
                  Library
                </Link>
                <Link href="/profile" className="rounded-full bg-[#7a5c3a] px-4 py-2 text-[#fff7ef] hover:brightness-105">
                  Profile
                </Link>
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 md:px-8">
        <div className="mx-auto max-w-5xl">
          <ChoreoFeed initialPosts={initialPosts} style={style || undefined} difficulty={difficulty || undefined} />
        </div>
      </section>
    </main>
  );
}