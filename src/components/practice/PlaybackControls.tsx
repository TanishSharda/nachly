"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type PlaybackSpeed = 0.5 | 0.75 | 1;

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: PlaybackSpeed;
  isLooping: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onRestart: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onLoopToggle: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  speed,
  isLooping,
  onPlayPause,
  onSeek,
  onSkip,
  onRestart,
  onSpeedChange,
  onLoopToggle,
}: PlaybackControlsProps) {
  const [visible, setVisible] = useState(true);
  const [hovering, setHovering] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const progressRef = useRef<HTMLDivElement>(null);

  const resetHideTimer = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!hovering) setVisible(false);
    }, 3000);
  }, [hovering]);

  // Auto-hide after 3s
  useEffect(() => {
    resetHideTimer();
    const handleMove = () => resetHideTimer();
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchstart", handleMove);
    return () => {
      clearTimeout(hideTimerRef.current);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchstart", handleMove);
    };
  }, [resetHideTimer]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const speeds: PlaybackSpeed[] = [0.5, 0.75, 1];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="fixed bottom-0 left-0 right-0 z-[56] px-4 pb-4"
        >
          <div className="max-w-4xl mx-auto bg-dark/70 backdrop-blur-xl rounded-2xl border border-dark-700/50 p-3 shadow-2xl shadow-black/30">
            {/* Progress bar */}
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="w-full h-1.5 bg-dark-700 rounded-full mb-3 cursor-pointer group relative"
            >
              <div
                className="h-full bg-gold-400 rounded-full transition-[width] duration-100 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gold-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Left: playback controls */}
              <div className="flex items-center gap-1">
                {/* Restart */}
                <ControlButton onClick={onRestart} title="Restart">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 4v6h6" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </ControlButton>

                {/* Back 5s */}
                <ControlButton onClick={() => onSkip(-5)} title="Back 5s">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polygon points="11 19 2 12 11 5 11 19" />
                    <polygon points="22 19 13 12 22 5 22 19" />
                  </svg>
                </ControlButton>

                {/* Play/Pause */}
                <button
                  onClick={onPlayPause}
                  className="w-10 h-10 rounded-full bg-gold-400 hover:bg-gold-300 flex items-center justify-center text-dark transition-colors mx-1"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>

                {/* Forward 5s */}
                <ControlButton onClick={() => onSkip(5)} title="Forward 5s">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polygon points="13 19 22 12 13 5 13 19" />
                    <polygon points="2 19 11 12 2 5 2 19" />
                  </svg>
                </ControlButton>

                {/* Loop */}
                <ControlButton
                  onClick={onLoopToggle}
                  title="Loop"
                  active={isLooping}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                </ControlButton>
              </div>

              {/* Center: time */}
              <span className="text-xs font-mono text-dark-300 whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration || 0)}
              </span>

              {/* Right: speed */}
              <div className="flex items-center gap-0.5 bg-dark-800/60 rounded-lg p-0.5">
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSpeedChange(s)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-md transition-all font-medium",
                      speed === s
                        ? "bg-gold-400 text-dark"
                        : "text-dark-300 hover:text-cream-100"
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ControlButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
        active
          ? "text-gold-400 bg-gold-400/10"
          : "text-dark-300 hover:text-cream-100 hover:bg-dark-700/50"
      )}
    >
      {children}
    </button>
  );
}
