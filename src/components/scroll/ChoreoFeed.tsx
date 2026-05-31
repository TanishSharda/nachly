"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { getChoreographyFeed } from "@/lib/api/choreos";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import DeferredVideo from "@/components/video/DeferredVideo";
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

function formatCount(value?: number | null) {
  const v = value ?? 0;
  return new Intl.NumberFormat("en-IN", { notation: v >= 10000 ? "compact" : "standard" }).format(v);
}

function slugify(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function FeedCard({ post }: { post: ChoreographyFeedItem }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"performance" | "teaching">("performance");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const performanceVideo = post.demo_video_url || post.demo_reel?.video_url || post.video_url || "";
  const teachingVideo = post.teaching_video_url || post.tutorial?.video_url || performanceVideo;
  const videoUrl = activeTab === "teaching" ? teachingVideo : performanceVideo;
  const posterUrl = post.demo_reel?.thumbnail_url || "";
  const creatorSlug = slugify(post.creator_name);
  const learnHref = `/choreography/${encodeURIComponent(post.id)}/learn`;
  const practiceHref = `/choreography/${encodeURIComponent(post.id)}/practice`;
  const profileHref = creatorSlug ? `/profile/${encodeURIComponent(creatorSlug)}` : "/profile/me";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.load();
    const attemptPlay = () => {
      void video.play().catch(() => {
        // Autoplay can still be blocked in some browsers; keep the preview visible either way.
      });
    };

    if (video.readyState >= 2) {
      attemptPlay();
      return;
    }

    video.addEventListener("canplay", attemptPlay, { once: true });
    return () => {
      video.removeEventListener("canplay", attemptPlay);
    };
  }, [videoUrl]);

  const rememberFeedScroll = () => {
    try {
      window.sessionStorage.setItem("naachly_feed_scroll_y_v1", String(window.scrollY || 0));
    } catch {
      // ignore session storage issues
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#1b120d] shadow-[0_28px_60px_-36px_rgba(0,0,0,0.8)]"
    >
      <div className="relative min-h-[74vh]">
        {videoUrl ? (
          <DeferredVideo
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1a1a1a_0%,#000000_100%)]" />
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

          <div className="mt-4 inline-flex rounded-full border border-white/10 bg-black/20 p-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85 backdrop-blur-md w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("performance")}
              className={cn(
                "rounded-full px-3 py-1.5 transition",
                activeTab === "performance" ? "bg-white text-[#241811]" : "text-white/80 hover:text-white"
              )}
            >
              Performance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("teaching")}
              className={cn(
                "rounded-full px-3 py-1.5 transition",
                activeTab === "teaching" ? "bg-white text-[#241811]" : "text-white/80 hover:text-white"
              )}
            >
              Teaching
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl text-white">
              <Link href={profileHref} onClick={rememberFeedScroll} className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#f7d9b7] hover:text-white transition-colors">
                {post.creator_name || "Featured choreographer"}
              </Link>
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
                  href={learnHref}
                  onClick={rememberFeedScroll}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#F3B2AB] px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-black transition hover:brightness-110"
                  aria-label={`Learn ${post.title || 'this choreography'}`}
              >
                Learn Now
              </Link>
              <Link
                href={practiceHref}
                onClick={rememberFeedScroll}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white/10"
                  aria-label={`Practice ${post.title || 'this choreography'}`}
              >
                Practice
              </Link>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: liked ? "Liked" : "Like", active: liked, onClick: () => setLiked((current) => !current) },
                  { label: saved ? "Saved" : "Save", active: saved, onClick: () => setSaved((current) => !current) },
                  {
                    label: "Share",
                    active: false,
                    onClick: async () => {
                      const url = `${window.location.origin}${learnHref}`;
                      if (navigator.share) {
                        await navigator.share({ title: post.title, text: post.description ?? undefined, url });
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
                    aria-label={`${action.label} ${post.title || ''}`.trim()}
                    aria-pressed={action.active}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] backdrop-blur-md transition",
                      action.active
                        ? "border-[#F3B2AB]/40 bg-[#F3B2AB]/20 text-[#F3B2AB]"
                        : "border-white/10 bg-white/5 text-white hover:bg-white/10"
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
        <Card key={index} padding="none" className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#1b120d]">
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
  const [nextCursor, setNextCursor] = useState<string | null>(() => {
    try {
      const last = initialPosts?.[initialPosts.length - 1];
      return last?.published_at || null;
    } catch {
      return null;
    }
  });
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
    setTimeout(() => {
      setPosts(initialPosts);
      setOffset(initialPosts.length);
      setHasMore(initialPosts.length > 0);
      setError(null);
    }, 0);
  }, [initialPosts]);

  const [newAvailable, setNewAvailable] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    let client: any;
    try {
      client = createSupabaseClient();
    } catch (err) {
      return;
    }

    const scheduleNew = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      // debounce rapid events and show a single banner
      refreshTimer.current = window.setTimeout(() => {
        setNewAvailable(true);
        refreshTimer.current = null;
      }, 1500);
    };

    const channel = client
      .channel("public-choreography-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "routines" }, scheduleNew)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "routines" }, scheduleNew)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "choreo_submissions" }, scheduleNew)
      .subscribe();

    return () => {
      try {
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        channel.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [style, difficulty]);

  const handleRefresh = async () => {
    try {
      const data = await getChoreographyFeed({ limit: 8, offset: 0, style, difficulty });
      const incoming = data.posts || [];
      setPosts((current) => {
        const existing = new Set(current.map((p) => p.id));
        const merged = [...incoming.filter((p) => !existing.has(p.id)), ...current];
        return merged;
      });
    } catch {
      // ignore
    } finally {
      setNewAvailable(false);
    }
  };

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
      try {
        const params: any = { limit: 8, offset };
        if (style) params.style = style;
        if (difficulty) params.difficulty = difficulty;
        if (nextCursor) {
          params.cursor = nextCursor;
        }
        const data = await getChoreographyFeed(params);
        const incoming = data.posts || [];
        setPosts((current) => {
          const existingIds = new Set(current.map((item) => item.id));
          const merged = [...current, ...incoming.filter((item) => !existingIds.has(item.id))];
          return merged;
        });
        if (data.nextCursor) {
          setNextCursor(data.nextCursor);
          setHasMore(Boolean(incoming.length === 8));
        } else {
          setOffset(data.nextOffset ?? offset + incoming.length);
          setHasMore(Boolean(data.hasMore && incoming.length));
        }
        setError(null);
      } catch (err: any) {
        setError(err?.message || "Unable to load more reels right now.");
      } finally {
        setLoadingMore(false);
      }
    };

    void loadMore();
  }, [hasMore, loadingMore, offset, queryString, style, difficulty]);

  const activeFilters = [style || "all", difficulty || "all"];

  if (!posts.length) {
    return <FeedSkeleton />;
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
        {FEED_FILTERS.map((filter) => {
          const isActive = (filter.style || "all") === activeFilters[0] && (filter.difficulty || "all") === activeFilters[1];
          const href = new URLSearchParams();
          if (filter.style) href.set("style", filter.style);
          if (filter.difficulty) href.set("difficulty", filter.difficulty);

          return (
            <Link
              key={filter.label}
              href={href.toString() ? `/learn/feed?${href.toString()}` : "/learn/feed"}
              className={cn(
                "rounded-full border px-4 py-2 transition",
                isActive ? "border-[#F3B2AB] bg-[#F3B2AB] text-black" : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
      {newAvailable ? (
        <div className="mb-3 flex justify-center">
          <button onClick={handleRefresh} className="rounded-full bg-[#c4ff00] px-4 py-2 text-sm font-bold text-black">New content available — Refresh</button>
        </div>
      ) : null}

      <div className="space-y-5">
        {posts.map((post) => (
          <FeedCard key={post.id} post={post} />
        ))}
      </div>

      <div ref={sentinelRef} className="grid place-items-center py-8">
        {loadingMore ? (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8D9F]">Loading more reels</span>
        ) : hasMore ? (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8D9F]">Scroll for more</span>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8D9F]">End of the feed</span>
        )}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}