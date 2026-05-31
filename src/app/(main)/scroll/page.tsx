"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getChoreographyFeed } from "@/lib/api/choreos";
import dynamic from "next/dynamic";
const ImmersiveFeed = dynamic(() => import("@/components/scroll/ImmersiveFeed"), { ssr: false });

export default function ScrollPage() {
  const searchParams = useSearchParams();
  const style = (searchParams?.get("style") || "").trim().toLowerCase();
  const difficulty = (searchParams?.get("difficulty") || "").trim().toLowerCase();

  const [initialPosts, setInitialPosts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchInitial = async () => {
      try {
        const { posts } = await getChoreographyFeed({ style: style || undefined, difficulty: difficulty || undefined, limit: 8, offset: 0 });
        if (!mounted) return;
        setInitialPosts(Array.isArray(posts) ? posts : []);
      } catch (err) {
        console.error("/scroll: failed to load feed", err);
        if (mounted) setInitialPosts([]);
      }
    };

    void fetchInitial();
    return () => {
      mounted = false;
    };
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

  return (
    <main className="min-h-screen bg-obsidian text-foreground">
      <section className="px-4 pb-10 sm:px-6 md:px-8">
        <div className="mx-auto max-w-5xl">
          <ImmersiveFeed initialPosts={initialPosts} />
        </div>
      </section>
    </main>
  );
}
