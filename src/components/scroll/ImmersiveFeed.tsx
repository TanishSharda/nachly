"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { getChoreographyFeed, postChoreographyEngagement, postChoreographySave, getChoreographyEngagement, getChoreographySaves } from "@/lib/api/choreos";
import type { ChoreographyFeedItem } from "@/lib/supabase/queries/choreos";
import Link from "next/link";
import { getOrCreateGuestId } from "@/lib/utils/guest-session";

export default function ImmersiveFeed({ initialPosts = [] }: { initialPosts?: ChoreographyFeedItem[] }) {
  const [posts, setPosts] = useState<ChoreographyFeedItem[]>(initialPosts || []);
  const [engagementMap, setEngagementMap] = useState<Record<string, any>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef<string | null>(null);

  useEffect(() => {
    if (posts.length > 0) return;
    let mounted = true;
    (async () => {
      try {
        const res = await getChoreographyFeed({ limit: 24, offset: 0 });
        if (!mounted) return;
        setPosts(Array.isArray(res?.posts) ? res.posts : []);
      } catch (err) {
        console.error("ImmersiveFeed: failed to load feed", err);
        if (mounted) setPosts([]);
      }
    })();

    return () => { mounted = false; };
  }, [posts.length]);

  useEffect(() => {
    // preserve scroll position per earlier behaviour
    try {
      const saved = Number(window.sessionStorage.getItem("naachly_feed_scroll_y_v1") || 0);
      if (saved && containerRef.current) {
        window.scrollTo({ top: saved, behavior: "auto" });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!posts || posts.length === 0) return;
    let mounted = true;

    // initial load of engagement + saves
    (async () => {
      try {
        const ids = posts.map((p) => p.id).filter(Boolean);
        const metrics = await getChoreographyEngagement(ids);
        if (mounted && metrics) setEngagementMap(metrics);
      } catch (err) {
        // non-blocking
      }

      try {
        const saves = await getChoreographySaves();
        const map: Record<string, boolean> = {};
        (saves || []).forEach((s) => {
          if (s?.choreoId) map[s.choreoId] = true;
        });
        if (mounted) setSavedMap(map);
      } catch (err) {
        // non-blocking
      }
    })();

    return () => { mounted = false; };
  }, [posts]);

  // Visibility-based autoplay / pause using IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sections = Array.from(container.querySelectorAll("section[snap-start]") as Element[]).length
      ? Array.from(container.querySelectorAll("section[snap-start]"))
      : Array.from(container.querySelectorAll("section"));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          const id = el.getAttribute("data-id") || el.getAttribute("data-post-id");
          const video = el.querySelector("video") as HTMLVideoElement | null;
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // play this video's media
            if (video && video.paused) {
              // try/catch for autoplay policies
              try { void video.play(); } catch {}
            }
            visibleRef.current = id || null;
            // save scroll position
            try { window.sessionStorage.setItem("naachly_feed_scroll_y_v1", String(window.scrollY || 0)); } catch {}
          } else {
            if (video && !video.paused) {
              try { video.pause(); } catch {}
            }
            if (visibleRef.current === id) visibleRef.current = null;
          }
        });
      },
      { threshold: [0.5] }
    );

    sections.forEach((s) => io.observe(s));

    // Keyboard navigation for snap sections
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;

      const visibleSections = sections.filter((s) => s instanceof HTMLElement) as HTMLElement[];
      if (visibleSections.length === 0) return;

      const currentIndex = visibleSections.findIndex((s) => {
        const rect = s.getBoundingClientRect();
        return rect.top >= -10 && rect.top <= (window.innerHeight || 768) / 2;
      });

      const clampIndex = (i: number) => Math.max(0, Math.min(visibleSections.length - 1, i));

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        const next = clampIndex((currentIndex === -1 ? 0 : currentIndex) + 1);
        visibleSections[next].scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        const prev = clampIndex((currentIndex === -1 ? 0 : currentIndex) - 1);
        visibleSections[prev].scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (e.key === "Home") {
        e.preventDefault();
        visibleSections[0].scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (e.key === "End") {
        e.preventDefault();
        visibleSections[visibleSections.length - 1].scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [posts]);

  // Poll engagement map periodically and debounce immediate refetches
  useEffect(() => {
    let mounted = true;
    let debounceTimer: any = null;

    const refetch = async (ids?: string[]) => {
      try {
        const idsToFetch = ids && ids.length ? ids : posts.map((p) => p.id).filter(Boolean);
        const metrics = await getChoreographyEngagement(idsToFetch);
        if (mounted && metrics) setEngagementMap((prev) => ({ ...prev, ...metrics }));
      } catch (err) {
        // ignore
      }
    };

    // poll every 15s
    const iv = setInterval(() => {
      void refetch();
    }, 15000);

    // Supabase Realtime subscription for live counts (best-effort)
    let supabaseSub: any = null;
    (async () => {
      try {
        if (isSupabaseConfigured()) {
          const mod = await import("@/lib/supabase/client");
          const createClient = mod.createClient;
          const supabase = createClient();
          const ids = posts.map((p) => p.id).filter(Boolean);
          if (ids.length > 0) {
            supabaseSub = supabase
              .channel("choreo-engagement-live")
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "choreo_engagement_events", filter: `choreo_id=eq.${ids.join(",")}` },
                (payload: any) => {
                  try {
                    const choreoId = payload?.new?.choreo_id || payload?.old?.choreo_id;
                    if (choreoId) void refetch([choreoId]);
                  } catch {}
                }
              )
              .subscribe();
          }
        }
      } catch {
        // ignore realtime failures
      }
    })();

    // expose a debounced refetch helper to window for quick reconciliation after optimistic updates
    (window as any).__naachly_refetch_feed = (ids?: string[]) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void refetch(ids);
      }, 1000);
    };

    return () => {
      mounted = false;
      clearInterval(iv);
      if (debounceTimer) clearTimeout(debounceTimer);
      try { delete (window as any).__naachly_refetch_feed; } catch {}
      try {
        if (supabaseSub) supabaseSub.unsubscribe();
      } catch {}
    };
  }, [posts]);

  if (!posts || posts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Loading feed...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white">
      <div className="snap-y snap-mandatory overflow-y-auto h-screen">
        {posts.map((post) => {
          const performanceVideo = post.demo_video_url || post.demo_reel?.video_url || post.video_url || "";
          const teachingVideo = post.teaching_video_url || performanceVideo;
          const videoUrl = performanceVideo;
          const posterUrl = post.demo_reel?.thumbnail_url || "";
          const learnHref = `/learn/${encodeURIComponent(post.id)}?mode=stepwise`;

          const metrics = engagementMap[post.id] || { likes: 0, comments: 0, tryThis: 0, views: 0, viewerLiked: false };

          return (
            <section key={post.id} data-post-id={post.id} className="snap-start min-h-screen relative">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  poster={posterUrl || undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0705] via-[#0b0705]/35 to-transparent" />

              <div className="relative z-10 flex h-full flex-col justify-between p-6">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-xs font-semibold uppercase">{post.dance_style} • {post.difficulty_level}</div>
                  <div className="text-xs">{post.creator_name}</div>
                </div>

                <div>
                  <h2 className="text-3xl font-black leading-tight">{post.title}</h2>
                  <p className="mt-3 max-w-xl text-sm text-white/80">{post.description}</p>

                  <div className="mt-6 flex gap-3">
                    <Link href={learnHref} className="rounded-2xl bg-white text-black px-5 py-3 font-bold">Learn</Link>
                    <Link href={`/choreography/${encodeURIComponent(post.id)}/practice`} className="rounded-2xl border border-white/20 px-5 py-3">Practice</Link>
                  </div>
                </div>

                <FeedActions
                  post={post}
                  metrics={metrics}
                  saved={Boolean(savedMap[post.id])}
                  onTrackAction={async (action: string) => {
                    try {
                      const payload = await postChoreographyEngagement({ choreoId: post.id, action, mode: action === "like" ? "toggle" : "track", anonKey: getOrCreateGuestId() });
                      const counts = payload?.counts || {};
                      setEngagementMap((prev) => ({
                        ...prev,
                        [post.id]: {
                          likes: counts.like || 0,
                          comments: counts.comment || 0,
                          tryThis: counts.try_this || 0,
                          views: counts.view_stats || 0,
                          viewerLiked: payload?.liked ?? prev?.[post.id]?.viewerLiked ?? false,
                        },
                      }));
                      return payload;
                    } catch (err) {
                      // ignore
                      return null;
                    }
                  }}
                  onToggleSave={async () => {
                    try {
                      const res = await postChoreographySave({ choreoId: post.id, title: post.title, videoUrl: post.video_url || post.demo_video_url || post.demo_reel?.video_url, styleSlug: post.style });
                      setSavedMap((prev) => ({ ...prev, [post.id]: Boolean(res?.saved) }));
                    } catch (err) {
                      // ignore
                    }
                  }}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FeedActions({
  post,
  metrics,
  saved,
  onTrackAction,
  onToggleSave,
}: {
  post: ChoreographyFeedItem;
  metrics?: any;
  saved?: boolean;
  onTrackAction?: (action: string) => Promise<void> | void;
  onToggleSave?: () => Promise<void> | void;
}) {
  const [liked, setLiked] = useState(Boolean(metrics?.viewerLiked));
  const [isSaved, setIsSaved] = useState(Boolean(saved));
  const [likeCount, setLikeCount] = useState<number>(metrics?.likes || 0);

  useEffect(() => {
    setLikeCount(metrics?.likes || 0);
    setLiked(Boolean(metrics?.viewerLiked));
    setIsSaved(Boolean(saved));
  }, [metrics, saved]);
  const [loading, setLoading] = useState(false);

  const onLike = useCallback(async () => {
    setLoading(true);
    try {
      // optimistic update
      setLiked((s) => {
        setLikeCount((c) => (s ? Math.max(0, c - 1) : c + 1));
        return !s;
      });

      const payload = onTrackAction ? await onTrackAction("like") : null;
      const serverLikes = payload?.counts?.like;
      const serverLiked = payload?.liked;
      if (typeof serverLikes === "number") setLikeCount(serverLikes);
      if (typeof serverLiked === "boolean") setLiked(Boolean(serverLiked));
      // trigger a debounced refetch to reconcile hot counts
      try { (window as any).__naachly_refetch_feed?.(); } catch {}
    } catch (err) {
      console.error("Like failed", err);
    } finally {
      setLoading(false);
    }
  }, [onTrackAction]);

  const onSave = useCallback(async () => {
    setLoading(true);
    try {
      if (onToggleSave) await onToggleSave();
      setIsSaved((s) => !s);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setLoading(false);
    }
  }, [onToggleSave]);

  const onShare = useCallback(() => {
    try {
      if (navigator.share) {
        navigator.share({ title: post.title, url: typeof window !== "undefined" ? window.location.origin + `/choreography/${post.id}` : `/choreography/${post.id}` });
      } else {
        navigator.clipboard?.writeText(typeof window !== "undefined" ? window.location.origin + `/choreography/${post.id}` : `/choreography/${post.id}`);
        alert("Link copied to clipboard");
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  }, [post.id, post.title]);

  function compactCount(value: number) {
    if (!value) return "0";
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return String(value);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <motion.button
          onClick={onLike}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2 rounded-full px-3 py-2 transition-all ${liked ? "bg-emerald-500/30 text-emerald-200 shadow-md" : "bg-white/6 hover:bg-white/10"}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <motion.span key={likeCount} initial={{ scale: 0.9, opacity: 0.6 }} animate={{ scale: liked ? 1.05 : 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 22 }} className="text-xs font-semibold">
            {compactCount(likeCount)}
          </motion.span>
        </motion.button>

        <motion.button onClick={onSave} disabled={loading} whileTap={{ scale: 0.95 }} className={`flex items-center gap-2 rounded-full px-3 py-2 transition-all ${isSaved ? "bg-emerald-500/20 text-emerald-200 shadow-sm" : "bg-white/6 hover:bg-white/10"}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          <span className="text-xs font-semibold">{isSaved ? "Saved" : "Save"}</span>
        </motion.button>

        <motion.button onClick={onShare} whileTap={{ scale: 0.95 }} className="rounded-full bg-white/6 px-3 py-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
        </motion.button>
      </div>
      <div className="text-xs text-white/70">{(post.views_count || 0).toLocaleString()} views</div>
    </div>
  );
}
