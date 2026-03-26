"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import CircularProgress from "@/components/ui/CircularProgress";
import BeatPulse from "./BeatPulse";
import type { DetectionMode } from "./usePoseDetection";

interface FeedbackMessage {
  type: "error" | "warning" | "praise";
  message: string;
  timestamp: number;
}

interface AIFeedbackPanelProps {
  posture: number;
  timing: number;
  energy: number;
  confidence: number;
  overall: number;
  feedbackMessages: FeedbackMessage[];
  bodyVisible: boolean;
  detectionMode: DetectionMode;
  beatCount?: number;
  bpm?: number;
  isOnBeat?: boolean;
  distanceGuide?: { status: "ok" | "close" | "far"; message: string } | null;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
}

export default function AIFeedbackPanel({
  posture,
  timing,
  energy,
  confidence,
  overall,
  feedbackMessages,
  bodyVisible,
  detectionMode,
  beatCount = 0,
  bpm = 0,
  isOnBeat = false,
  distanceGuide = null,
  voiceEnabled = true,
  onToggleVoice,
}: AIFeedbackPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const isDemo = detectionMode === "demo";
  const isLoading = detectionMode === "loading";
  const hasScores = bodyVisible && !isDemo && !isLoading;

  const getScoreColor = (score: number): "wine" | "gold" | "green" => {
    if (!hasScores) return "wine";
    if (score >= 80) return "green";
    if (score >= 60) return "gold";
    return "wine";
  };

  const dotColors = {
    error: "bg-amber-400",
    warning: "bg-amber-400",
    praise: "bg-emerald-400",
  };

  const latestMessages = feedbackMessages.slice(-3);

  const displayScore = (score: number) => {
    if (isDemo || isLoading) return "--";
    if (!bodyVisible && score === 0) return "--";
    return score;
  };

  // Full-body-not-visible warning — separate fullscreen overlay on mobile
  const showBodyWarning = !isDemo && !isLoading && !bodyVisible;

  return (
    <>
      {/* === FULLSCREEN body warning overlay (mobile) === */}
      <AnimatePresence>
        {showBodyWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm sm:hidden pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex flex-col items-center gap-4 px-8 text-center"
            >
              <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center border-2 border-amber-500/50">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-amber-300">
                Full body not visible!
              </p>
              <p className="text-base text-amber-200/70">
                Step back so the camera can see your entire body
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Compact AI Feedback Panel === */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed top-16 left-2 sm:left-4 z-[56]"
      >
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/30 overflow-hidden max-w-[160px] sm:max-w-[220px]">
          {/* Header with collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-between px-2.5 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span>AI</span>
              {isDemo && (
                <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-amber-400/20 text-amber-400">
                  DEMO
                </span>
              )}
              {isLoading && (
                <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-zinc-500/30 text-zinc-400 animate-pulse">
                  LOAD
                </span>
              )}
            </div>
            <motion.svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              animate={{ rotate: collapsed ? 180 : 0 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Body visibility warning — compact inside panel (desktop only) */}
                {showBodyWarning && (
                  <div className="hidden sm:block mx-3 mb-3 px-4 py-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 animate-pulse">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <p className="text-sm font-bold text-amber-300 leading-snug">
                        Full body not visible!
                      </p>
                      <p className="text-[11px] text-amber-200/70 leading-tight">
                        Step back so the camera can see your entire body
                      </p>
                    </div>
                  </div>
                )}

                {/* Small warning badge on mobile (inside panel) */}
                {showBodyWarning && (
                  <div className="sm:hidden mx-2 mb-2 px-2 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40">
                    <p className="text-[9px] font-bold text-amber-300 text-center">⚠️ Body not visible</p>
                  </div>
                )}

                {/* Distance guidance */}
                {distanceGuide && distanceGuide.status !== "ok" && (
                  <div
                    className={cn(
                      "mx-2 sm:mx-3 mb-2 px-2 py-1.5 rounded-lg border",
                      distanceGuide.status === "close"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-nred-500/10 border-nred-500/20"
                    )}
                  >
                    <p
                      className={cn(
                        "text-[9px] sm:text-[10px] leading-tight",
                        distanceGuide.status === "close"
                          ? "text-amber-300"
                          : "text-nred-300"
                      )}
                    >
                      {distanceGuide.message}
                    </p>
                  </div>
                )}

                {/* Demo mode notice */}
                {isDemo && (
                  <div className="mx-2 sm:mx-3 mb-2 px-2 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20">
                    <p className="text-[9px] sm:text-[10px] text-amber-300 leading-tight">
                      Pose model unavailable. Scoring disabled.
                    </p>
                  </div>
                )}

                {/* Score rings — smaller on mobile */}
                <div className="px-2 sm:px-4 pb-2 sm:pb-3">
                  <div className="grid grid-cols-5 gap-1 sm:gap-2">
                    {[
                      { label: "Post", value: posture },
                      { label: "Time", value: timing },
                      { label: "Engy", value: energy },
                      { label: "Conf", value: confidence },
                      { label: "All", value: overall },
                    ].map((metric) => (
                      <div key={metric.label} className="text-center">
                        <CircularProgress
                          value={hasScores ? metric.value : 0}
                          size={30}
                          strokeWidth={2.5}
                          color={getScoreColor(metric.value)}
                        >
                          <span
                            className={cn(
                              "text-[8px] sm:text-[10px] font-bold",
                              hasScores ? "text-white" : "text-zinc-500"
                            )}
                          >
                            {displayScore(metric.value)}
                          </span>
                        </CircularProgress>
                        <p className="text-[7px] sm:text-[9px] text-zinc-500 mt-0.5">
                          {metric.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Beat & voice controls */}
                <div className="px-2 sm:px-4 pb-2 flex items-center justify-between">
                  <BeatPulse
                    beatCount={beatCount}
                    bpm={bpm}
                    isOnBeat={isOnBeat}
                  />
                  {onToggleVoice && (
                    <button
                      onClick={onToggleVoice}
                      className={cn(
                        "text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-colors",
                        voiceEnabled
                          ? "bg-nred-500/20 text-nred-400"
                          : "bg-white/5 text-zinc-500"
                      )}
                    >
                      {voiceEnabled ? "🔊" : "🔇"}
                    </button>
                  )}
                </div>

                {/* Feedback messages — limit to 2 on mobile */}
                {latestMessages.length > 0 && (
                  <div className="px-2 sm:px-4 pb-2 sm:pb-3 space-y-1 border-t border-white/5 pt-1.5">
                    <AnimatePresence mode="popLayout">
                      {latestMessages.slice(-2).map((msg, i) => (
                        <motion.div
                          key={`${msg.timestamp}-${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="flex items-start gap-1.5"
                        >
                          <div
                            className={cn(
                              "w-1 h-1 rounded-full mt-1 flex-shrink-0",
                              dotColors[msg.type]
                            )}
                          />
                          <p
                            className={cn(
                              "text-[9px] sm:text-[11px] leading-tight",
                              msg.type === "error"
                                ? "text-amber-300"
                                : msg.type === "warning"
                                ? "text-amber-300"
                                : "text-emerald-300"
                            )}
                          >
                            {msg.message}
                          </p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
