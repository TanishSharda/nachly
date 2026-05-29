"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const HINTS = [
  "Move faster",
  "Raise your hand higher",
  "Keep your shoulders relaxed",
  "Hold your center for balance",
  "Sharpen your arm extension",
];

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getLearnVideoSources(videoUrl) {
  if (!videoUrl || typeof videoUrl !== "string") return [];

  const cleanUrl = videoUrl.split("?")[0];
  const isLocalMp4 = cleanUrl.startsWith("/videos/") && cleanUrl.endsWith(".mp4");

  if (!isLocalMp4) {
    return [{ src: videoUrl, type: "video/mp4" }];
  }

  const base = cleanUrl.endsWith(".optimized.mp4")
    ? cleanUrl.slice(0, -".optimized.mp4".length)
    : cleanUrl.slice(0, -4);

  // Prefer MP4 first in Learn Mode to maximize audio compatibility.
  return [
    { src: `${base}.optimized.mp4`, type: "video/mp4" },
    { src: cleanUrl, type: "video/mp4" },
    { src: `${base}.webm`, type: "video/webm" },
  ];
}

export default function LearnModePlayer({ choreo, backHref = "/learn/feed", practiceHref, mode }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [hintIndex, setHintIndex] = useState(0);
  const [videoError, setVideoError] = useState("");

  const resumeKey = useMemo(() => `naachly_learn_resume_${choreo?.id || "unknown"}`,[choreo?.id]);
  const videoSources = useMemo(() => getLearnVideoSources(choreo?.video), [choreo?.video]);
  const [signedUrl, setSignedUrl] = useState(null);
  const isEmbedUrl = useMemo(() => {
    const v = String(choreo?.video || "").trim();
    if (!v) return false;
    const lower = v.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("vimeo.com") || lower.includes("/embed/")) return true;
    const path = v.split("?")[0];
    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext) return false;
    return !(ext === "mp4" || ext === "webm");
  }, [choreo?.video]);

  const embedSrc = useMemo(() => {
    const v = String(choreo?.video || "").trim();
    if (!v) return "";
    // convert common YouTube formats to embed
    try {
      if (v.includes("youtube.com/watch")) {
        const m = v.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        const id = m ? m[1] : null;
        if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`;
      }
      if (v.includes("youtu.be/")) {
        const m = v.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        const id = m ? m[1] : null;
        if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`;
      }
    } catch {}
    return v;
  }, [choreo?.video]);
  const moves = choreo?.moves || [];
  const isStepwiseMode = mode === "stepwise";
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const recordHref = useMemo(() => {
    if (practiceHref) return practiceHref;
    if (choreo?.id) return `/record/${encodeURIComponent(choreo.id)}?mode=remix`;
    return "/flow?style=mix";
  }, [practiceHref, choreo?.id]);
  const aiPracticeHref = useMemo(() => {
    if (choreo?.id) return `/practice/${encodeURIComponent(choreo.id)}`;
    return "/adaptive-pose";
  }, [choreo?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const now = video.currentTime || 0;
      setCurrentTime(now);

      try {
        window.localStorage.setItem(resumeKey, String(now));
      } catch {
        // Ignore storage write errors.
      }

      // Auto-pause at end of step in stepwise mode
      if (isStepwiseMode && moves && moves[currentMoveIndex]) {
        const end = (moves[currentMoveIndex].end || moves[currentMoveIndex].end_time || 0);
        if (end && now >= end - 0.15) {
          video.pause();
          setIsPlaying(false);
        }
      }
    };

    const onLoadedMetadata = () => {
      setVideoError("");
      setDuration(video.duration || 0);

      try {
        const saved = Number(window.localStorage.getItem(resumeKey) || 0);
        if (Number.isFinite(saved) && saved > 0 && saved < (video.duration || 0)) {
          video.currentTime = saved;
          setCurrentTime(saved);
        }
      } catch {
        // Ignore storage read errors.
      }

      // If opened in stepwise mode, seek to the first move start
      if (isStepwiseMode && moves && moves.length > 0) {
        const firstStart = moves[0].start || moves[0].start_time || 0;
        video.currentTime = firstStart;
        setCurrentTime(firstStart);
        setIsPlaying(false);
        setCurrentMoveIndex(0);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => setVideoError("Video unavailable for this routine right now.");

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
    };
  }, [resumeKey]);

  // Attempt programmatic autoplay when the source list changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSources || !videoSources.length) return;

    // Ensure muted to satisfy autoplay policies
    try {
      video.muted = true;
    } catch {}

    // reload sources
    video.load();

    const tryPlay = () => {
      void video.play().catch(() => {
        // play may be blocked by browser autoplay policies
      });
    };

    if (video.readyState >= 2) {
      tryPlay();
      return;
    }

    video.addEventListener("canplay", tryPlay, { once: true });
    return () => video.removeEventListener("canplay", tryPlay);
  }, [videoSources]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % HINTS.length);
    }, 4500);
    return () => clearInterval(id);
  }, [isPlaying]);

  // Debug logging to help diagnose missing sources when running locally
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug("LearnModePlayer: choreo", choreo, "videoSources", videoSources);
    } catch {}
  }, [choreo, videoSources]);

  // If the choreo.video points to Supabase storage public URL, request a signed URL
  useEffect(() => {
    let mounted = true;
    async function fetchSigned() {
      setSignedUrl(null);
      const v = String(choreo?.video || "").trim();
      if (!v) return;

      try {
        const url = new URL(v, window.location.href);
        const publicMarker = "/storage/v1/object/public/";
        const idx = url.pathname.indexOf(publicMarker);
        if (idx === -1) return;

        const tail = url.pathname.slice(idx + publicMarker.length); // bucket/...path
        const parts = tail.split("/");
        const bucket = parts.shift();
        const path = parts.join("/");
        if (!bucket || !path) return;

        const res = await fetch("/api/storage/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket, path, expires: 300 }),
        });
        const json = await res.json();
        if (!mounted) return;
        if (res.ok && json?.url) {
          setSignedUrl(json.url);
        } else {
          // eslint-disable-next-line no-console
          console.warn("Failed to get signed url", json);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("No signed URL needed or failed to parse URL", err);
      }
    }

    fetchSigned();
    return () => {
      mounted = false;
    };
  }, [choreo?.video]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const playCurrentMove = () => {
    const video = videoRef.current;
    if (!video || !moves || !moves[currentMoveIndex]) return;
    const m = moves[currentMoveIndex];
    const start = m.start || m.start_time || 0;
    video.currentTime = start;
    video.play().catch(() => {});
    setIsPlaying(true);
  };

  const gotoNextMove = () => {
    if (!moves || moves.length === 0) return;
    const next = Math.min(moves.length - 1, currentMoveIndex + 1);
    setCurrentMoveIndex(next);
    const video = videoRef.current;
    const start = moves[next].start || moves[next].start_time || 0;
    if (video) {
      video.currentTime = start;
      setCurrentTime(start);
    }
    setIsPlaying(false);
  };

  const gotoPrevMove = () => {
    if (!moves || moves.length === 0) return;
    const prev = Math.max(0, currentMoveIndex - 1);
    setCurrentMoveIndex(prev);
    const video = videoRef.current;
    const start = moves[prev].start || moves[prev].start_time || 0;
    if (video) {
      video.currentTime = start;
      setCurrentTime(start);
    }
    setIsPlaying(false);
  };

  const seekTo = (time) => {
    const video = videoRef.current;
    if (!video) return;
    const safe = Math.max(0, Math.min(duration || 0, time));
    video.currentTime = safe;
    setCurrentTime(safe);
  };

  const skipBy = (seconds) => {
    seekTo((videoRef.current?.currentTime || 0) + seconds);
  };

  const applySpeed = (nextSpeed) => {
    const video = videoRef.current;
    setSpeed(nextSpeed);
    if (video) {
      video.playbackRate = nextSpeed;
    }
  };

  const toggleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      await video.requestFullscreen?.();
      return;
    }

    await document.exitFullscreen?.();
  };

  const handleRecordClick = () => {
    router.push(recordHref);
  };

  const handleAiPracticeClick = () => {
    router.push(aiPracticeHref);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <section className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/35 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,rgba(114,91,63,0.33),transparent_45%)] z-10" />

        <div className="absolute left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+0.35rem)] z-20 flex items-start justify-between gap-2 md:left-6 md:right-6 md:top-8">
          <Link href={backHref} className="h-12 w-12 rounded-full border border-white/10 bg-white/10 backdrop-blur-xl grid place-items-center transition active:scale-95 hover:bg-white/15 md:h-14 md:w-14">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </Link>
          <div className="max-w-[72vw] text-right sm:max-w-[68vw]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/65 md:text-[10px] md:tracking-[0.24em]">Session 04</p>
            <h1 className="mt-1.5 line-clamp-2 text-xl font-semibold leading-[1.04] text-white tracking-tight sm:text-2xl md:mt-2 md:text-6xl md:leading-[0.95]">{choreo?.title || "Ethereal Foundations"}</h1>
            <button
              type="button"
              onClick={handleAiPracticeClick}
              className="mt-1.5 inline-flex items-center rounded-full border border-white/20 bg-white/12 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.09em] text-white hover:bg-white/20 transition md:mt-2 md:px-3 md:py-1.5 md:text-[10px] md:tracking-[0.13em]"
            >
              Practice with AI
            </button>
          </div>
        </div>

        <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
          {isStepwiseMode && moves && moves.length > 0 ? (
            <div className="pointer-events-auto relative grid place-items-center gap-3 p-4 rounded-xl bg-black/40 backdrop-blur-md">
              <span className="text-sm text-white/90">Step {currentMoveIndex + 1} of {moves.length}</span>
              <div className="flex items-center gap-3">
                <button onClick={gotoPrevMove} className="inline-flex items-center justify-center h-12 w-12 rounded-full border border-white/10 bg-white/6 text-white hover:bg-white/10">◀</button>
                <button onClick={playCurrentMove} className="inline-flex items-center justify-center h-16 w-36 rounded-full border border-white/20 bg-white/10 text-white font-semibold">{isPlaying ? 'Playing' : 'Play Step'}</button>
                <button onClick={gotoNextMove} className="inline-flex items-center justify-center h-12 w-12 rounded-full border border-white/10 bg-white/6 text-white hover:bg-white/10">▶</button>
              </div>
            </div>
          ) : (
            <button onClick={togglePlayPause} className="pointer-events-auto relative grid h-24 w-24 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition hover:scale-105 active:scale-95 md:h-32 md:w-32">
              <span className="absolute inset-0 rounded-full bg-[#fdddb9]/20 blur-xl" />
              {isPlaying ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="relative z-10 text-white"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="relative z-10 text-white"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
          )}
        </div>

        <section className="absolute inset-0 z-0">
          {isEmbedUrl && (!videoSources || videoSources.length === 0) ? (
            <iframe
              src={embedSrc}
              title={choreo?.title || "Learn video"}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              className="h-full w-full bg-[#1b1510] object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              loop
              preload="auto"
              className="h-full w-full bg-[#1b1510] object-contain"
            >
                {(signedUrl ? [{ src: signedUrl, type: "video/mp4" }] : videoSources).map((source) => (
                  <source key={source.src} src={source.src} type={source.type} />
                ))}
            </video>
          )}

          {videoError ? (
            <div className="absolute inset-0 grid place-items-center bg-[#2c1f16]/70 px-6 text-center text-sm text-[#ffe9e5]">
              {videoError}
            </div>
          ) : null}

          {!videoSources || videoSources.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center bg-[#111111]/70 px-6 text-center text-sm text-white/80">
              <div className="max-w-[80%]">
                <p className="mb-2 font-semibold">No playable video sources detected for this routine.</p>
                <p className="break-words text-xs mb-2">Resolved URL: {String(choreo?.video || "")}</p>
                <div className="text-left text-xs">
                  <p className="font-semibold">Resolved sources:</p>
                  <ul className="list-disc ml-4">
                    {Array.isArray(videoSources) && videoSources.length ? (
                      videoSources.map((s) => <li key={s.src} className="break-words">{s.src} ({s.type})</li>)
                    ) : (
                      <li className="italic">(none)</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <div className="pointer-events-none absolute left-4 top-[calc(env(safe-area-inset-top,0px)+5.6rem)] rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-white/90 backdrop-blur-md md:left-6 md:top-28 md:px-4 md:text-[11px]">
            AI Hint: {HINTS[hintIndex]}
          </div>

        </section>

        <section className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] z-20 rounded-[18px] border border-white/10 bg-white/10 p-2.5 backdrop-blur-xl md:inset-x-6 md:bottom-7 md:rounded-[20px] md:p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-white/85 tabular-nums md:mb-2.5 md:text-sm">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 0)}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seekTo(Number(event.target.value || 0))}
            className="mb-2 h-1.5 w-full cursor-pointer accent-[#7a5c3a] md:mb-2.5"
          />

          <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between md:gap-2">
            <div className="grid grid-cols-2 gap-1.5 md:flex md:gap-2">
              <button
                type="button"
                onClick={handleRecordClick}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-[#f0ddc2] px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#2b2118] shadow-[0_16px_30px_rgba(0,0,0,0.2)] transition hover:brightness-105 md:h-10 md:px-3"
              >
                Record
              </button>
              <button
                type="button"
                onClick={handleAiPracticeClick}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-[#725b3f]/85 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-white transition hover:brightness-110 md:h-10 md:px-3"
              >
                AI Practice
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 md:flex md:items-center md:gap-2">
              <button type="button" onClick={() => skipBy(-5)} className="flex h-10 w-full items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/20 md:w-10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white md:h-4 md:w-4"><path d="M11 19l-7-7 7-7"/><path d="M20 19l-7-7 7-7"/></svg>
              </button>

              <button type="button" onClick={() => skipBy(5)} className="flex h-10 w-full items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/20 md:w-10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white md:h-4 md:w-4"><path d="M3 12a9 9 0 0 1 9-9h4"/><path d="M16 3l3 3-3 3"/><path d="M21 12a9 9 0 0 1-9 9H8"/><path d="M8 21l-3-3 3-3"/></svg>
              </button>

              <div className="flex h-10 items-center justify-center rounded-full border border-white/10 bg-black/35 px-2 backdrop-blur-lg">
                <select
                  value={speed}
                  onChange={(event) => applySpeed(Number(event.target.value || 1))}
                  className="w-full bg-transparent text-xs font-semibold text-[#f0ddc2] outline-none border-none"
                >
                  {SPEED_OPTIONS.map((option) => (
                    <option key={option} value={option} className="text-black">{option}x</option>
                  ))}
                </select>
              </div>

              <button type="button" onClick={toggleFullscreen} className="flex h-10 w-full items-center justify-center rounded-full bg-[#725b3f] text-white shadow-[0_20px_40px_rgba(49,51,46,0.2)] transition hover:brightness-110 md:w-10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="md:h-4 md:w-4"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
