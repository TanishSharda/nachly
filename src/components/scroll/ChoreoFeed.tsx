"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { cn } from "@/lib/utils/cn";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import type { ChoreographyFeedItem } from "@/lib/supabase/queries/choreos";

type FeedResponse = {
  posts: ChoreographyFeedItem[];
  hasMore: boolean;
  nextOffset: number;
  fallback: boolean;
};

interface ChoreoFeedProps {
  initialPosts: ChoreographyFeedItem[];
  style?: string;
  difficulty?: string;
}

const FEED_FILTERS = [
  { label: "All", style: undefined, difficulty: undefined },
  { label: "Bollywood", style: "bollywood" },
  { label: "Bhangra", style: "bhangra" },
  { label: "Beginner", difficulty: "beginner" },
  { label: "Intermediate", difficulty: "intermediate" },
  { label: "Advanced", difficulty: "advanced" },
];

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN", { notation: value >= 10000 ? "compact" : "standard" }).format(value);
}

function FeedCard({ post }: { post: ChoreographyFeedItem }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);

  const videoUrl = post.demo_reel?.video_url || post.tutorial?.video_url || "";
  const posterUrl = post.demo_reel?.thumbnail_url || "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-[2rem] border border-[#6c51321c] bg-[#1b120d] shadow-[0_28px_60px_-36px_rgba(48,31,17,0.8)]"
    >
      <div className="relative min-h-[74vh]">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={posterUrl || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#7a5c3a_0%,#20160f_45%,#0b0705_100%)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0705] via-[#0b0705]/35 to-transparent" />

        <div className="relative flex min-h-[74vh] flex-col justify-between p-5 sm:p-7 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4e8d9] backdrop-blur-md">
              <span>{post.dance_style}</span>
              <span>•</span>
              <span>{post.difficulty_level}</span>
            </div>
            <div>
              {post.source === 'routine' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                  Performance
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  Submission
                </span>
              )}
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fff7ef] backdrop-blur-md">
              <span>{formatCount(post.views_count)} views</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#f7d9b7]">
                {post.creator_name || "Featured choreographer"}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-[0.92] tracking-tight sm:text-4xl md:text-5xl">
                {post.title}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#f1e4d7] sm:text-base">
                {post.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#fff2e3]">
                <span className="rounded-full bg-white/10 px-3 py-1.5">{formatCount(post.saves_count)} saves</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">{post.demo_reel?.duration_seconds || 0}s reel</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">Tutorial ready</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:min-w-[220px]">
              <Link
                href="/learn"
                className="inline-flex items-center justify-center rounded-2xl bg-[#f4eadb] px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-[#372515] transition hover:bg-white"
              >
                Learn Tab
              </Link>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: liked ? "Liked" : "Like", active: liked, onClick: () => setLiked((current) => !current) },
                  { label: saved ? "Saved" : "Save", active: saved, onClick: () => setSaved((current) => !current) },
                  {
                    label: "Share",
                    active: false,
                    onClick: async () => {
                      const url = `${window.location.origin}/learn/${post.id}?mode=stepwise`;
                      if (navigator.share) {
                        await navigator.share({ title: post.title, text: post.description, url });
                        return;
                      }
                      await navigator.clipboard.writeText(url);
                    },
                  },
                  { label: following ? "Following" : "Follow", active: following, onClick: () => setFollowing((current) => !current) },
                ].map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] backdrop-blur-md transition",
                      action.active
                        ? "border-[#f7d9b740] bg-[#f7d9b71c] text-[#fff6eb]"
                        : "border-white/10 bg-white/8 text-[#f4e7d6] hover:bg-white/12"
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index} padding="none" className="overflow-hidden rounded-[2rem] border border-[#6c51321c] bg-[#1b120d]">
          <div className="relative min-h-[70vh]">
            <Skeleton className="absolute inset-0 rounded-none bg-[#2d2017]" />
            <div className="relative flex min-h-[70vh] flex-col justify-between p-6">
              <Skeleton className="h-6 w-32 rounded-full bg-white/10" />
              <div className="space-y-3">
                <Skeleton className="h-5 w-36 bg-white/10" />
                <Skeleton className="h-10 w-full max-w-2xl bg-white/10" />
                <Skeleton className="h-4 w-3/4 bg-white/10" />
                <Skeleton className="h-12 w-48 rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ChoreoFeed({ initialPosts, style, difficulty }: ChoreoFeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (style) params.set("style", style);
    if (difficulty) params.set("difficulty", difficulty);
    return params.toString();
  }, [style, difficulty]);

  useEffect(() => {
    setPosts(initialPosts);
    setOffset(initialPosts.length);
    setHasMore(initialPosts.length > 0);
    setError(null);
  }, [initialPosts]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setLoadingMore(true);
        }
      },
      { rootMargin: "1200px 0px 1200px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore]);

  useEffect(() => {
    if (!loadingMore || !hasMore) return;

    const loadMore = async () => {
      const response = await apiGet<FeedResponse>(`/api/choreos/feed?limit=8&offset=${offset}${queryString ? `&${queryString}` : ""}`);

      if (response.error || !response.data) {
        setError(response.error?.message || "Unable to load more reels right now.");
        setLoadingMore(false);
        return;
      }

      const incoming = response.data.posts || [];
      setPosts((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const merged = [...current, ...incoming.filter((item) => !existingIds.has(item.id))];
        return merged;
      });
      setOffset(response.data.nextOffset ?? offset + incoming.length);
      setHasMore(Boolean(response.data.hasMore && incoming.length));
      setError(null);
      setLoadingMore(false);
    };

    void loadMore();
  }, [hasMore, loadingMore, offset, queryString]);

  const activeFilters = [style || "all", difficulty || "all"];

  if (!posts.length) {
    return <FeedSkeleton />;
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#81634a]">
        {FEED_FILTERS.map((filter) => {
          const isActive = (filter.style || "all") === activeFilters[0] && (filter.difficulty || "all") === activeFilters[1];
          const href = new URLSearchParams();
          if (filter.style) href.set("style", filter.style);
          if (filter.difficulty) href.set("difficulty", filter.difficulty);

          return (
            <Link
              key={filter.label}
              href={href.toString() ? `/scroll?${href.toString()}` : "/scroll"}
              className={cn(
                "rounded-full border px-4 py-2 transition",
                isActive ? "border-[#7a5c3a] bg-[#7a5c3a] text-[#fff7ef]" : "border-[#6c513220] bg-white/70 text-[#725b3f] hover:bg-white"
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="space-y-5">
        {posts.map((post) => (
          <FeedCard key={post.id} post={post} />
        ))}
      </div>

      <div ref={sentinelRef} className="grid place-items-center py-8">
        {loadingMore ? (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a6a4c]">Loading more reels</span>
        ) : hasMore ? (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a6a4c]">Scroll for more</span>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a6a4c]">End of the feed</span>
        )}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}