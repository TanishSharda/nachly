"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getOrCreateGuestId } from "@/lib/utils/guest-session";

const FLOW_CACHE_KEY = "nachly_flow_feed_cache_v3";
const ENABLED_FLOW_STYLES = ["bollywood", "bhangra"];

function normalizeStyle(value) {
  return String(value || "").trim().toLowerCase();
}

function isEnabledStyle(value) {
  return ENABLED_FLOW_STYLES.includes(normalizeStyle(value));
}

function filterByStyle(list, styleFilter) {
  const baseList = (list || []).filter((item) => {
    const styleSlug = normalizeStyle(item?.styleSlug || item?.style);
    return isEnabledStyle(styleSlug);
  });

  if (!styleFilter || styleFilter === "mix") return baseList;

  return baseList.filter((item) => {
    const styleSlug = String(item?.styleSlug || item?.style || "").toLowerCase();
    const styleName = String(item?.styleName || "").toLowerCase();
    const title = String(item?.title || "").toLowerCase();
    return styleSlug === styleFilter || styleName.includes(styleFilter) || title.includes(styleFilter);
  });
}

function getFlowLearnHref(item) {
  const routineSlug = String(item?.routineSlug || "").trim();
  if (routineSlug) return `/learn/${encodeURIComponent(routineSlug)}`;

  const routineId = String(item?.id || "").trim();
  if (routineId) return `/learn/${encodeURIComponent(routineId)}`;

  return "/explore";
}

function shouldAttachVideoSrc(index, activeIndex) {
  // Only attach the active video source to avoid loading multiple large clips at once.
  return index === activeIndex;
}

function getVideoPreload(index, activeIndex) {
  return index === activeIndex ? "metadata" : "none";
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

  const optimizedSuffix = ".optimized.mp4";
  const isOptimizedMp4 = cleanUrl.endsWith(optimizedSuffix);
  const base = isOptimizedMp4
    ? cleanUrl.slice(0, -optimizedSuffix.length)
    : cleanUrl.slice(0, -4);

  return {
    webm: `${base}.webm`,
    mp4: isOptimizedMp4 ? cleanUrl : `${base}.optimized.mp4`,
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
  const searchParams = useSearchParams();
  const styleFilter = (searchParams.get("style") || "").trim().toLowerCase();
  const cacheKey = styleFilter ? `${FLOW_CACHE_KEY}_${styleFilter}` : FLOW_CACHE_KEY;
  const [choreos, setChoreos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedMap, setLoadedMap] = useState({});
  const [savedMap, setSavedMap] = useState({});
  const [uiMessage, setUiMessage] = useState("");
  const [masterMuted, setMasterMuted] = useState(false);
  const [pendingLearn, setPendingLearn] = useState(null);
  const [paywallItem, setPaywallItem] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const masterVolume = 1;
  const feedRef = useRef(null);
  const videoRefs = useRef([]);
  const sectionRefs = useRef([]);
  const touchStartYRef = useRef(null);
  const lastGestureAtRef = useRef(0);
  const navigationLockRef = useRef(false);
  const navigationUnlockTimerRef = useRef(null);

  const GESTURE_COOLDOWN_MS = 420;
  const WHEEL_THRESHOLD = 28;
  const SWIPE_THRESHOLD = 42;

  const stylePriceFallbacks = {
    bollywood: 29900,
    bhangra: 19900,
    kathak: 19900,
    "hip-hop": 19900,
  };

  const resolveStylePriceInr = useCallback((item) => {
    const direct = Number(item?.stylePriceInr || item?.price_inr || 0);
    if (Number.isFinite(direct) && direct >= 100) return direct;
    const slug = String(item?.styleSlug || item?.style || "").toLowerCase();
    return stylePriceFallbacks[slug] || 29900;
  }, []);

  const formatInr = useCallback((paise) => {
    const inr = Math.max(1, Math.round(Number(paise || 0) / 100));
    return new Intl.NumberFormat("en-IN").format(inr);
  }, []);

  const loadRazorpayScript = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (window.Razorpay) return true;

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const openLearnPrompt = useCallback((item) => {
    setPendingLearn(item);
  }, []);

  const closeLearnPrompt = useCallback(() => {
    setPendingLearn(null);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallItem(null);
    setPaying(false);
    setPayError("");
  }, []);

  const proceedToLearn = useCallback((item) => {
    const href = getFlowLearnHref(item);
    if (typeof window !== "undefined") {
      window.location.href = href;
    }
  }, []);

  const handleContinueLearn = useCallback(async (item) => {
    closeLearnPrompt();
    proceedToLearn(item);
  }, [closeLearnPrompt, proceedToLearn]);

  const handlePayment = useCallback(async () => {
    if (!paywallItem) return;
    setPayError("");
    setPaying(true);

    try {
      const styleSlug = String(paywallItem?.styleSlug || paywallItem?.style || "").trim().toLowerCase();
      const styleName = String(paywallItem?.styleName || paywallItem?.style || "Style").trim();
      const amountPaise = resolveStylePriceInr(paywallItem);

      const orderResponse = await fetch("/api/purchases/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleSlug,
          styleName,
        }),
      });

      const orderPayload = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) {
        setPayError(orderPayload?.error || "Unable to start payment.");
        setPaying(false);
        return;
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        setPayError("Razorpay SDK failed to load. Please try again.");
        setPaying(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderPayload.keyId,
        amount: orderPayload.amount,
        currency: orderPayload.currency || "INR",
        name: "Nachly",
        description: `Unlock ${styleName}`,
        order_id: orderPayload.orderId,
        method: { upi: true },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [{ method: "upi" }],
              },
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: true },
          },
        },
        prefill: {
          name: orderPayload?.user?.name || "",
          email: orderPayload?.user?.email || "",
        },
        notes: {
          styleSlug,
        },
        handler: async (response) => {
          const verifyResponse = await fetch("/api/purchases/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              styleSlug,
              amountPaise,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyPayload = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || !verifyPayload?.verified) {
            setPayError(verifyPayload?.error || "Payment verification failed.");
            setPaying(false);
            return;
          }

          closePaywall();
          proceedToLearn(paywallItem);
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
        theme: {
          color: "#725b3f",
        },
      });

      razorpay.open();
    } catch {
      setPayError("Unable to start payment.");
      setPaying(false);
    }
  }, [closePaywall, loadRazorpayScript, paywallItem, proceedToLearn, resolveStylePriceInr]);

  const navigateToIndex = useCallback((nextIndex) => {
    if (!choreos.length) return;
    const bounded = Math.max(0, Math.min(choreos.length - 1, nextIndex));
    if (bounded === activeIndex) return;
    if (navigationLockRef.current) return;

    navigationLockRef.current = true;
    if (navigationUnlockTimerRef.current) {
      clearTimeout(navigationUnlockTimerRef.current);
    }

    setActiveIndex(bounded);
    const section = sectionRefs.current[bounded];
    if (section) {
      section.scrollIntoView({ behavior: "auto", block: "start" });
    }

    navigationUnlockTimerRef.current = setTimeout(() => {
      navigationLockRef.current = false;
      navigationUnlockTimerRef.current = null;
    }, 650);
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
          const cached = window.sessionStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const filteredCached = filterByStyle(parsed, styleFilter);
            if (Array.isArray(filteredCached) && filteredCached.length > 0 && mounted) {
              hasWarmCache = true;
              setChoreos(filteredCached);
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
        const filteredList = filterByStyle(list, styleFilter);
        if (!mounted) return;

        setChoreos(filteredList);
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(cacheKey, JSON.stringify(list));
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
  }, [cacheKey, styleFilter]);

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
    event.preventDefault();

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
    return () => {
      if (navigationUnlockTimerRef.current) {
        clearTimeout(navigationUnlockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (!video) return;

      if (idx === activeIndex) {
        // High priority playback
        video.muted = masterMuted;
        video.defaultMuted = masterMuted;
        video.volume = masterMuted ? 0 : masterVolume;
        video.play().catch(() => { });
      } else {
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;
        video.pause();
      }
    });
  }, [activeIndex, loadedMap, choreos, masterMuted, masterVolume]);


  useEffect(() => {
    if (!choreos.length) {
      return;
    }

    let mounted = true;

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
          anonKey: getOrCreateGuestId(),
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

      if (!payload?.counts) return;
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
          {styleFilter ? `No ${styleFilter} flow videos right now.` : "No Bollywood or Bhangra videos right now."}
        </div>
      );
    }

    return choreos.map((item, index) => {
      const isReady = loadedMap[item.id];
      const videoAsset = getOptimizedVideoAsset(item.video);

      return (
        <section
          key={item.id}
          data-index={index}
          ref={(node) => {
            sectionRefs.current[index] = node;
          }}
          className="relative h-[100dvh] w-full snap-start overflow-hidden bg-[#31332e]"
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
            muted={index !== activeIndex || masterMuted}
            defaultMuted={index !== activeIndex || masterMuted}
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
                {videoAsset.mp4 ? <source src={videoAsset.mp4} type="video/mp4" /> : null}
                {videoAsset.fallbackMp4 ? <source src={videoAsset.fallbackMp4} type="video/mp4" /> : null}
                {videoAsset.webm ? <source src={videoAsset.webm} type="video/webm" /> : null}
              </>
            ) : null}
          </video>

          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(251,249,244,0.45)_0%,rgba(251,249,244,0)_25%,rgba(251,249,244,0)_70%,rgba(251,249,244,0.9)_100%)]" />

          <div className="absolute left-4 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+9.6rem)] z-30 space-y-2 max-w-xl md:left-8 md:right-8 md:bottom-36 md:space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 bg-[#fbf9f4]/80 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-[0.05em] text-[#675e54]">
                  {item.difficulty || "Beginner Friendly"}
                </span>
                <span className="px-3 py-1 bg-[#fbf9f4]/80 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-[0.05em] text-[#675e54]">
                  {Math.max(2, Math.round((item.durationSeconds || 120) / 60))} min
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold leading-[0.95] tracking-tight text-[#1f1f1b]">{item.title}</h2>
              <p className="text-xs md:text-sm font-medium text-[#5e6059] max-w-lg">with {item.choreographerName || "Elena Rossi"}</p>
            </div>
          </div>

          <div className="absolute left-4 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+6.45rem)] z-30 flex items-center justify-between gap-2 md:left-8 md:right-8 md:bottom-16 md:gap-4">
            <button
              type="button"
              onClick={() => openLearnPrompt(item)}
              className="flex-1 bg-[#725b3f] text-white font-bold py-2.5 md:py-4 rounded-full flex items-center justify-center gap-2 shadow-[0px_14px_28px_rgba(49,51,46,0.14)] active:scale-95 transition-all text-[13px] md:text-base"
            >
              <span>Learn This</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="md:h-[18px] md:w-[18px]"><path d="M8 5v14l11-7z" /></svg>
            </button>

            <div className="flex gap-2">
              <button type="button" onClick={() => toggleSave(item)} className="w-11 h-11 md:w-12 md:h-12 bg-[#fbf9f4]/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#725b3f] shadow-sm hover:bg-[#fbf9f4] transition-colors active:scale-90">
                <svg width="18" height="18" viewBox="0 0 24 24" fill={savedMap[item.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
              </button>
              <button type="button" onClick={() => shareChoreo(item)} className="w-11 h-11 md:w-12 md:h-12 bg-[#fbf9f4]/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#725b3f] shadow-sm hover:bg-[#fbf9f4] transition-colors active:scale-90">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
              </button>
            </div>
          </div>
        </section>
      );
    });
  }, [activeIndex, choreos, error, loadedMap, loading, masterMuted, savedMap, shareChoreo, styleFilter, toggleSave, trackAction]);

  return (
    <main
      ref={feedRef}
      tabIndex={0}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      className="h-[100dvh] overflow-y-auto overflow-x-hidden snap-y snap-mandatory bg-[#31332e] transition-opacity duration-700 ease-in-out no-scrollbar touch-pan-y"
    >
      <AnimatePresence>
        {pendingLearn ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm md:items-center"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#fbf9f4] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#725b3f]">Ready to learn?</p>
              <h3 className="mt-2 text-2xl font-extrabold text-[#2a261f]">{pendingLearn.title}</h3>
              <p className="mt-2 text-sm text-[#6f675b]">Open the full routine and start step-by-step practice.</p>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => handleContinueLearn(pendingLearn)}
                  className="inline-flex items-center justify-center rounded-full bg-[#725b3f] px-5 py-3 text-sm font-semibold text-white"
                >
                  Continue to learn
                </button>
                <button
                  type="button"
                  onClick={closeLearnPrompt}
                  className="rounded-full border border-[#725b3f]/20 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#725b3f]"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {paywallItem ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm md:items-center"
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#fbf9f4] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#725b3f]">Unlock the full routine</p>
                  <h3 className="mt-2 text-2xl font-extrabold text-[#2a261f]">{paywallItem.title}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#8a7f73]">{paywallItem.styleName || paywallItem.styleSlug}</p>
                </div>
                <div className="rounded-full bg-[#725b3f]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#725b3f]">UPI ready</div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e6dccf] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8a7f73]">One-time pass</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold text-[#2a261f]">&#8377;{formatInr(resolveStylePriceInr(paywallItem))}</span>
                  <span className="text-xs text-[#7b7268]">Lifetime access to this style</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-[#5f564c]">
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#725b3f]" />Full step-by-step breakdowns</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#725b3f]" />Practice loops + slow mode</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#725b3f]" />Save sessions & track progress</li>
              </ul>

              {payError ? <p className="mt-3 text-xs text-red-600">{payError}</p> : null}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={paying}
                  className="inline-flex items-center justify-center rounded-full bg-[#725b3f] px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {paying ? "Opening Razorpay..." : "Pay with Razorpay"}
                </button>
                <button
                  type="button"
                  onClick={closePaywall}
                  className="rounded-full border border-[#725b3f]/20 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#725b3f]"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <header className="fixed top-0 z-50 w-full bg-[#fbf9f4]/75 backdrop-blur-xl px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.65rem)] md:px-6 md:py-4">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/explore" className="text-[#725b3f] hover:opacity-80 transition-opacity active:scale-95 rounded-full p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <h1 className="font-black text-2xl md:text-2xl tracking-tight text-[#725b3f]">Nachly</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMasterMuted((prev) => !prev);
              const activeVideo = videoRefs.current[activeIndex];
              if (activeVideo) {
                activeVideo.muted = !masterMuted;
                activeVideo.defaultMuted = !masterMuted;
                activeVideo.volume = !masterMuted ? 0 : masterVolume;
                activeVideo.play().catch(() => {});
              }
            }}
            className="rounded-full bg-[#fbf9f4]/90 border border-[#725b3f]/15 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[#725b3f]"
          >
            {masterMuted ? "Muted" : "Sound"}
          </button>
          <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-[#fdddb9] shadow-sm">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-eGDaQBRyHvPVmIpH3TvjjPjI6ZcggzOs5ylihE7u_JXJ0OH5vKl7PzTnTswma3VxdWrIp-2_Aubd_v2F8j0VDO3X_DS13XoqKBM9RxQ_APKJ_FKxSNw9TogNRrOhV04-f8zwM-DtpO8_NUUslBSUe7shr4th-q2gZkxHyp3hZPsSPZHoFOZjOVJtQdUJaJRqE2vsDvczSihNXVwFz1yF3tY4mElyXVENyjH5pid5rjbUhMdeXqKAHTJt5tTVJRpcJnuURMcbGJY" alt="profile" className="h-full w-full object-cover" />
          </div>
        </div>
        </div>

        <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { href: "/flow?style=bollywood", label: "Bollywood", value: "bollywood" },
            { href: "/flow?style=bhangra", label: "Bhangra", value: "bhangra" },
            { href: "/flow?style=mix", label: "Mix", value: "mix" },
          ].map((pill) => {
            const selected = (styleFilter || "mix") === pill.value;
            return (
              <Link
                key={pill.value}
                href={pill.href}
                className={selected
                  ? "rounded-full border border-[#725b3f]/20 bg-[#725b3f] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#fff7f3]"
                  : "rounded-full border border-[#725b3f]/20 bg-[#fbf9f4]/95 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#725b3f]"}
              >
                {pill.label}
              </Link>
            );
          })}
        </div>
      </header>

      {uiMessage ? (
        <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+0.35rem)] z-40 -translate-x-1/2 rounded-full bg-gold/10 border border-gold/20 px-6 py-2 text-[11px] uppercase tracking-widest text-gold backdrop-blur-md">
          {uiMessage}
        </div>
      ) : null}

      {choreos.length > 1 ? (
        <div className="pointer-events-none fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 md:flex">
          {choreos.map((entry, idx) => (
            <div
              key={entry.id || idx}
              className={idx === activeIndex ? "w-1.5 h-8 rounded-full bg-[#725b3f]" : "w-1.5 h-1.5 rounded-full bg-[#725b3f]/40"}
            />
          ))}
        </div>
      ) : null}

      {content}
    </main>
  );
}
