"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const FLOW_CACHE_KEY = "nachly_flow_feed_cache_v1";

function getClientAnonKey() {
  if (typeof window === "undefined") return "anon";
  const key = "naachly_scroll_anon";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = `anon_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, created);
  return created;
}

function getFlowLearnHref(item) {
  if (!item?.id) return "/explore";
  return `/learn/${item.id}`;
}

function shouldAttachVideoSrc(index, activeIndex) {
  // Keep only nearby videos connected to the network pipeline.
  return Math.abs(index - activeIndex) <= 1;
}

function getVideoPreload(index, activeIndex) {
  if (index === activeIndex) return "auto";
  if (index === activeIndex + 1) return "metadata";
  return "none";
}

function getOptimizedVideoAsset(videoUrl) {
  if (!videoUrl || typeof videoUrl !== "string") {
    return {
      webm: "",
      mp4: "",
      fallbackMp4: "",
      poster: "",
    };
  }

  const cleanUrl = videoUrl.split("?")[0];
  const isLocalMp4 = cleanUrl.startsWith("/videos/") && cleanUrl.endsWith(".mp4");
  if (!isLocalMp4) {
    return {
      webm: "",
      mp4: "",
      fallbackMp4: videoUrl,
      poster: "",
    };
  }

  const base = cleanUrl.slice(0, -4);
  return {
    webm: `${base}.webm`,
    mp4: `${base}.optimized.mp4`,
    fallbackMp4: videoUrl,
    poster: `${base}.poster.jpg`,
  };
}

async function fetchChoreos() {
  let supabaseRequestFailed = false;

  if (isSupabaseConfigured()) {
    try {
      const response = await fetch("/api/choreos?tier=official", { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload?.choreos)) {
          return payload.choreos;
        }
      }
      supabaseRequestFailed = !response.ok;
    } catch {
      supabaseRequestFailed = true;
    }
  }

  if (isSupabaseConfigured() && supabaseRequestFailed) {
    throw new Error("Official choreo feed unavailable right now. Please retry.");
  }

  return [];
}

export default function FlowPage() {
  const [choreos, setChoreos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedMap, setLoadedMap] = useState({});
  const [engagementMap, setEngagementMap] = useState({});
  const [savedMap, setSavedMap] = useState({});
  const [uiMessage, setUiMessage] = useState("");
  const feedRef = useRef(null);
  const videoRefs = useRef([]);
  const sectionRefs = useRef([]);
  const touchStartYRef = useRef(null);
  const lastGestureAtRef = useRef(0);

  const GESTURE_COOLDOWN_MS = 420;
  const WHEEL_THRESHOLD = 28;
  const SWIPE_THRESHOLD = 42;

  const navigateToIndex = useCallback((nextIndex) => {
    if (!choreos.length) return;
    const bounded = Math.max(0, Math.min(choreos.length - 1, nextIndex));
    if (bounded === activeIndex) return;

    setActiveIndex(bounded);
    const section = sectionRefs.current[bounded];
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeIndex, choreos.length]);

  useEffect(() => {
    if (!uiMessage) return;
    const id = setTimeout(() => setUiMessage(""), 1800);
    return () => clearTimeout(id);
  }, [uiMessage]);

  useEffect(() => {
    let mounted = true;

    async function loadChoreos() {
      let hasWarmCache = false;

      if (typeof window !== "undefined") {
        try {
          const cached = window.sessionStorage.getItem(FLOW_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0 && mounted) {
              hasWarmCache = true;
              setChoreos(parsed);
              setLoading(false);
            }
          }
        } catch {
          // Ignore malformed cache and continue with network fetch.
        }
      }

      if (!hasWarmCache) {
        setLoading(true);
      }

      setError("");
      try {
        const list = await fetchChoreos();
        if (!mounted) return;

        setChoreos(list);
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(FLOW_CACHE_KEY, JSON.stringify(list));
          } catch {
            // Non-blocking cache write.
          }
        }
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        if (!hasWarmCache) {
          setError("Failed to load flow videos. Check data provider config and try again.");
        } else {
          setUiMessage("Showing last loaded flow. Refresh to retry live feed.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadChoreos();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!choreos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (!visible) return;
        const idx = Number(visible.target.getAttribute("data-index"));
        if (!Number.isNaN(idx)) setActiveIndex(idx);
      },
      {
        root: feedRef.current,
        threshold: 0.7,
        rootMargin: "0px"
      }
    );

    sectionRefs.current.forEach((section, index) => {
      if (section) {
        section.setAttribute("data-index", String(index));
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, [choreos]);

  const handleWheel = useCallback((event) => {
    if (!choreos.length) return;
    const deltaY = event.deltaY || 0;
    if (Math.abs(deltaY) < WHEEL_THRESHOLD) return;

    const now = Date.now();
    if (now - lastGestureAtRef.current < GESTURE_COOLDOWN_MS) return;
    lastGestureAtRef.current = now;

    if (deltaY > 0) {
      navigateToIndex(activeIndex + 1);
    } else {
      navigateToIndex(activeIndex - 1);
    }
  }, [activeIndex, choreos.length, navigateToIndex]);

  const handleTouchStart = useCallback((event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStartYRef.current = touch.clientY;
  }, []);

  const handleTouchEnd = useCallback((event) => {
    if (!choreos.length) return;
    const startY = touchStartYRef.current;
    touchStartYRef.current = null;
    if (typeof startY !== "number") return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const deltaY = startY - touch.clientY;
    if (Math.abs(deltaY) < SWIPE_THRESHOLD) return;

    const now = Date.now();
    if (now - lastGestureAtRef.current < GESTURE_COOLDOWN_MS) return;
    lastGestureAtRef.current = now;

    if (deltaY > 0) {
      navigateToIndex(activeIndex + 1);
    } else {
      navigateToIndex(activeIndex - 1);
    }
  }, [activeIndex, choreos.length, navigateToIndex]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      navigateToIndex(activeIndex + 1);
    }
    if (event.key === "ArrowUp" || event.key === "PageUp") {
      navigateToIndex(activeIndex - 1);
    }
  }, [activeIndex, navigateToIndex]);

  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (!video) return;

      if (idx === activeIndex) {
        // High priority playback
        video.play().catch(() => { });
      } else {
        video.pause();
      }
    });
  }, [activeIndex, loadedMap, choreos]);


  useEffect(() => {
    if (!choreos.length) {
      setEngagementMap({});
      return;
    }

    let mounted = true;

    async function loadEngagement() {
      try {
        const ids = choreos.map((item) => item.id).filter(Boolean).join(",");
        const response = await fetch(`/api/choreos/engagement?ids=${encodeURIComponent(ids)}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!mounted) return;
        setEngagementMap(payload?.metrics || {});
      } catch {
        // Non-blocking for feed.
      }
    }

    async function loadSaves() {
      try {
        const response = await fetch("/api/choreos/saves", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        const set = {};
        (payload?.saves || []).forEach((entry) => {
          if (entry?.choreoId) set[entry.choreoId] = true;
        });
        if (!mounted) return;
        setSavedMap(set);
      } catch {
        // Non-blocking for feed.
      }
    }

    void loadEngagement();
    void loadSaves();
    return () => {
      mounted = false;
    };
  }, [choreos]);


  const trackAction = useCallback(async (choreoId, action) => {
    try {
      const response = await fetch("/api/choreos/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choreoId,
          action,
          mode: action === "like" ? "toggle" : "track",
          anonKey: getClientAnonKey(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          setUiMessage("Login to like and track your choreos");
          return;
        }
        setUiMessage(payload?.error || "Action unavailable right now");
        return;
      }

      const counts = payload?.counts;
      if (!counts) return;

      setEngagementMap((prev) => ({
        ...prev,
        [choreoId]: {
          likes: counts.like || 0,
          comments: counts.comment || 0,
          tryThis: counts.try_this || 0,
          views: counts.view_stats || 0,
          viewerLiked: payload?.liked ?? prev?.[choreoId]?.viewerLiked ?? false,
        },
      }));
    } catch {
      setUiMessage("Unable to connect to Academy servers");
    }
  }, []);

  const toggleSave = useCallback(async (item) => {
    setUiMessage("Syncing with your library...");
    try {
      const response = await fetch("/api/choreos/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choreoId: item.id,
          title: item.title,
          videoUrl: item.video,
          styleSlug: item.styleSlug || item.style,
          difficulty: item.difficulty,
          caption: item.caption,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          setUiMessage("Login to save your academy progress");
          return;
        }
        setUiMessage(payload?.error || "Unable to update saved choreos");
        return;
      }

      setSavedMap((prev) => ({ ...prev, [item.id]: Boolean(payload?.saved) }));
      setUiMessage(payload?.saved ? "Saved to your Academy library" : "Removed from library");
    } catch {
      setUiMessage("Unable to save right now");
    }
  }, []);

  const shareChoreo = useCallback(async (item) => {
    const learnHref = getFlowLearnHref(item);
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${learnHref}` : learnHref;
    const shareData = {
      title: item.title || "Nachly Choreo",
      text: "Train with this official choreography on Nachly",
      url: shareUrl,
    };

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setUiMessage("Link copied. Share it anywhere.");
      }
    } catch {
      setUiMessage("Unable to share right now");
    }
  }, []);

  function compactCount(value) {
    if (!value) return "0";
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return String(value);
  }

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="relative h-screen overflow-hidden bg-obsidian">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(211,196,184,0.05),transparent_70%)]" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-6 h-10 w-10 animate-spin rounded-full border border-gold/20 border-t-gold" />
            <p className="text-xl font-light tracking-widest text-gold uppercase">Preparing your flow feed</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-screen bg-obsidian grid place-items-center p-6 text-center">
          <div className="rounded-3xl border border-gold/10 bg-gold/5 px-8 py-6 text-gold/80 font-light italic">
            {error}
          </div>
        </div>
      );
    }

    if (choreos.length === 0) {
      return (
        <div className="h-screen bg-obsidian grid place-items-center text-gold/40 font-light tracking-widest uppercase px-6 text-center">
          No dances to show right now.
        </div>
      );
    }

    return choreos.map((item, index) => {
      const isReady = loadedMap[item.id];
      const metrics = engagementMap[item.id] || { likes: 0, comments: 0, tryThis: 0, views: 0, viewerLiked: false };
      const videoAsset = getOptimizedVideoAsset(item.video);

      return (
        <section
          key={item.id}
          data-index={index}
          ref={(node) => {
            sectionRefs.current[index] = node;
          }}
          className="relative h-[100dvh] w-full snap-start bg-black overflow-hidden"
          onDoubleClick={() => {
            void trackAction(item.id, "like");
          }}
        >
          <AnimatePresence>
            {!isReady && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 grid place-items-center bg-obsidian text-gold/20 font-light tracking-widest uppercase transition-opacity duration-500"
              >
                Loading...
              </motion.div>
            )}
          </AnimatePresence>

          <video
            ref={(node) => {
              videoRefs.current[index] = node;
            }}
            poster={videoAsset.poster || undefined}
            playsInline
            muted
            defaultMuted
            loop
            autoPlay
            preload={getVideoPreload(index, activeIndex)}
            className="h-full w-full object-cover"
            onCanPlay={() => {
              setLoadedMap((prev) => ({ ...prev, [item.id]: true }));
              const node = videoRefs.current[index];
              if (node && index === activeIndex) {
                node.play().catch(() => { });
              }
            }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              if (video.currentTime >= 30) {
                video.currentTime = 0;
                setUiMessage("Learn to see the full routine");
              }
            }}
          >
            {shouldAttachVideoSrc(index, activeIndex) ? (
              <>
                {videoAsset.webm ? <source src={videoAsset.webm} type="video/webm" /> : null}
                {videoAsset.mp4 ? <source src={videoAsset.mp4} type="video/mp4" /> : null}
                {videoAsset.fallbackMp4 ? <source src={videoAsset.fallbackMp4} type="video/mp4" /> : null}
              </>
            ) : null}
          </video>

          {/* Luxury Soft Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-obsidian/20" />

          {/* Header Info */}
          <div className="absolute left-6 right-24 bottom-32 z-30 space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/60">{item.styleName || item.style} • {item.difficulty || "Intermediate"}</span>
              <h2 className="text-3xl font-light tracking-tight text-[#E7E5E5]">{item.title}</h2>
              <p className="text-sm font-light text-[#E7E5E5]/40 italic">choreography by {item.choreographerName || "Official Artist"}</p>
            </div>
          </div>

          {/* Right Floating Actions */}
          <div className="absolute bottom-32 right-6 z-30 flex flex-col gap-6">
            <button
              type="button"
              onClick={() => trackAction(item.id, "like")}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-3 rounded-full border transition-all duration-500 ${metrics.viewerLiked ? 'bg-gold border-gold text-obsidian' : 'bg-white/5 border-white/10 text-white group-hover:border-gold/30'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={metrics.viewerLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg>
              </div>
              <span className="text-[11px] font-medium text-[#E7E5E5]/40 tracking-wider uppercase">{compactCount(metrics.likes || 0)}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSave(item)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-3 rounded-full border transition-all duration-500 ${savedMap[item.id] ? 'bg-gold/20 border-gold text-gold' : 'bg-white/5 border-white/10 text-white group-hover:border-gold/30'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
              </div>
              <span className="text-[11px] font-medium text-[#E7E5E5]/40 tracking-wider uppercase">{savedMap[item.id] ? "Saved" : "Save"}</span>
            </button>

            <button
              type="button"
              onClick={() => shareChoreo(item)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 rounded-full border bg-white/5 border-white/10 text-white group-hover:border-gold/30 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
              </div>
              <span className="text-[11px] font-medium text-[#E7E5E5]/40 tracking-wider uppercase">Share</span>
            </button>
          </div>

          {/* Bottom Action Bar */}
          <div className="absolute left-6 right-6 bottom-10 z-30">
            <div className="flex gap-3">
              <Link
                href={`/record/${item.id}?mode=remix`}
                className="flex-1 flex items-center justify-center gap-3 premium-button bg-gold text-obsidian border-none py-4 text-[13px] font-black tracking-[0.25em] uppercase"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
                REMIX
              </Link>

              <Link
                href={getFlowLearnHref(item)}
                className="flex-1 flex items-center justify-center gap-2 premium-button bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all py-4 text-[13px] tracking-[0.15em] backdrop-blur-md uppercase"
              >
                Learn Step by Step
              </Link>
            </div>
          </div>
        </section>
      );
    });
  }, [activeIndex, choreos, engagementMap, error, loadedMap, loading, savedMap, shareChoreo, toggleSave, trackAction]);

  return (
    <main
      ref={feedRef}
      tabIndex={0}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      className="h-[100dvh] overflow-y-auto overflow-x-hidden snap-y snap-mandatory bg-black text-[#E7E5E5] transition-opacity duration-700 ease-in-out scroll-smooth no-scrollbar touch-pan-y"
    >
      <Link
        href="/explore"
        className="fixed left-6 top-6 z-40 p-2 rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md hover:bg-black/60 transition-all"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </Link>

      {uiMessage ? (
        <div className="fixed left-1/2 top-6 z-40 -translate-x-1/2 rounded-full bg-gold/10 border border-gold/20 px-6 py-2 text-[11px] uppercase tracking-widest text-gold backdrop-blur-md">
          {uiMessage}
        </div>
      ) : null}

      {content}
    </main>
  );
}
