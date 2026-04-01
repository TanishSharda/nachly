"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_STEP_SECONDS = 10;

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

  return [
    { src: `${base}.webm`, type: "video/webm" },
    { src: `${base}.optimized.mp4`, type: "video/mp4" },
    { src: cleanUrl, type: "video/mp4" },
  ];
}

export default function LearnModePlayer({ choreo, backHref = "/scroll", practiceHref }) {
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [hintIndex, setHintIndex] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [videoError, setVideoError] = useState("");

  const resumeKey = useMemo(() => `naachly_learn_resume_${choreo?.id || "unknown"}`,[choreo?.id]);
  const videoSources = useMemo(() => getLearnVideoSources(choreo?.video), [choreo?.video]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const now = video.currentTime || 0;
      setCurrentTime(now);

      if (loopEnabled && loopEnd > loopStart && now >= loopEnd) {
        video.currentTime = loopStart;
      }

      try {
        window.localStorage.setItem(resumeKey, String(now));
      } catch {
        // Ignore storage write errors.
      }
    };

    const onLoadedMetadata = () => {
      setVideoError("");
      setDuration(video.duration || 0);
      setVideoReady(true);

      try {
        const saved = Number(window.localStorage.getItem(resumeKey) || 0);
        if (Number.isFinite(saved) && saved > 0 && saved < (video.duration || 0)) {
          video.currentTime = saved;
          setCurrentTime(saved);
        }
      } catch {
        // Ignore storage read errors.
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
  }, [loopEnabled, loopEnd, loopStart, resumeKey]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % HINTS.length);
    }, 4500);
    return () => clearInterval(id);
  }, [isPlaying]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
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

  const markLoopStart = () => {
    const now = videoRef.current?.currentTime || 0;
    setLoopStart(now);
    if (loopEnd <= now) {
      setLoopEnd(Math.min(now + 8, duration || now + 8));
    }
  };

  const markLoopEnd = () => {
    const now = videoRef.current?.currentTime || 0;
    setLoopEnd(now);
    if (now <= loopStart) {
      setLoopStart(Math.max(now - 8, 0));
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6">
        <header className="mb-3 flex items-center justify-between">
          <Link href={backHref} className="rounded-lg border border-white/15 px-3 py-2 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10">
            Back
          </Link>
          <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Learn Mode</h1>
          <div className="w-[66px]" />
        </header>

        <section className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
          <video
            ref={videoRef}
            playsInline
            className="h-full w-full bg-black object-contain"
          >
            {videoSources.map((source) => (
              <source key={source.src} src={source.src} type={source.type} />
            ))}
          </video>

          {videoError ? (
            <div className="absolute inset-0 grid place-items-center bg-black/70 px-6 text-center text-sm text-red-200">
              {videoError}
            </div>
          ) : null}

          <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-gold/30 bg-black/50 px-3 py-1 text-xs text-gold">
            AI Hint: {HINTS[hintIndex]}
          </div>

          {loopEnabled && loopEnd > loopStart ? (
            <div className="pointer-events-none absolute right-4 top-4 rounded-md border border-emerald-300/30 bg-black/50 px-3 py-1 text-xs text-emerald-200">
              Loop {formatTime(loopStart)} - {formatTime(loopEnd)}
            </div>
          ) : null}
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-white/70">
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
            className="mb-4 h-2 w-full cursor-pointer accent-[#D3C4B8]"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => skipBy(-SEEK_STEP_SECONDS)} className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">-10s</button>
              <button type="button" onClick={togglePlayPause} className="rounded-lg border border-gold/50 bg-gold/20 px-4 py-2 text-sm text-gold hover:bg-gold/30" disabled={!videoReady}>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={() => skipBy(SEEK_STEP_SECONDS)} className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">+10s</button>
              <button type="button" onClick={toggleFullscreen} className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Fullscreen</button>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <label className="text-xs uppercase tracking-widest text-white/50">Speed</label>
              <select
                value={speed}
                onChange={(event) => applySpeed(Number(event.target.value || 1))}
                className="rounded-lg border border-white/20 bg-black px-3 py-2 text-sm"
              >
                {SPEED_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}x</option>
                ))}
              </select>

              <button type="button" onClick={markLoopStart} className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Set Loop A</button>
              <button type="button" onClick={markLoopEnd} className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Set Loop B</button>
              <button type="button" onClick={() => setLoopEnabled((prev) => !prev)} className="rounded-lg border border-emerald-300/40 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-300/10">
                {loopEnabled ? "Loop On" : "Loop Off"}
              </button>

              <Link href={practiceHref || `/record/${choreo?.id || ""}`} className="rounded-lg border border-nred-400/50 bg-nred-500/20 px-3 py-2 text-sm text-nred-200 hover:bg-nred-500/30">
                Practice with Camera
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
