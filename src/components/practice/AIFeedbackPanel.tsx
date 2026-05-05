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
  const showCoachData = bodyVisible && !isDemo && !isLoading;

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
    if (!bodyVisible) return "--";
    return score;
  };

  const liveState = isLoading
    ? { label: "Warming up", tone: "text-zinc-400", chip: "bg-zinc-500/15 text-zinc-300 border-zinc-500/20" }
    : isDemo
    ? { label: "Demo mode", tone: "text-amber-300", chip: "bg-amber-500/15 text-amber-300 border-amber-500/20" }
    : bodyVisible
    ? { label: "Body tracked", tone: "text-emerald-300", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" }
    : { label: "Need full body", tone: "text-amber-300", chip: "bg-amber-500/15 text-amber-300 border-amber-500/20" };

  const metricRows = [
    { label: "Posture", value: posture },
    { label: "Timing", value: timing },
    { label: "Energy", value: energy },
    { label: "Confidence", value: confidence },
    { label: "Overall", value: overall },
  ];

  const priorityTip = (() => {
    if (isLoading) return "Preparing AI coach and pose model.";
    if (isDemo) return "Live scoring is unavailable, but the camera feed is still usable.";
    if (!bodyVisible) return "Step back until your full body is visible so the AI can score every joint.";

    const tracked = metricRows
      .filter((item) => typeof item.value === "number")
      .sort((left, right) => left.value - right.value);
    const weakest = tracked[0];

    if (!weakest) return "Keep moving with the instructor and watch the score rings.";

    if (weakest.label === "Posture") return "Your posture is the biggest unlock right now. Slow down and keep your chest open.";
    if (weakest.label === "Timing") return "Your timing needs the most attention. Match the beat before adding speed.";
    if (weakest.label === "Energy") return "Your energy is low. Use bigger movement and finish each gesture cleanly.";
    if (weakest.label === "Confidence") return "The AI is seeing hesitation. Commit to the move and hold your shape longer.";
    return "Keep following the instructor and the AI will sharpen the rest.";
  })();

  // Full-body-not-visible warning — separate fullscreen overlay on mobile
  const showBodyWarning = !isDemo && !isLoading && !bodyVisible;

  return (
    <>
      {/* === FULLSCREEN body warning overlay === */}
      <AnimatePresence>
        {showBodyWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex w-[min(92vw,42rem)] flex-col items-center gap-5 rounded-[2rem] border border-amber-500/30 bg-black/50 px-8 py-10 text-center shadow-2xl shadow-black/60"
            >
              <div className="w-28 h-28 bg-amber-500/20 rounded-full flex items-center justify-center border-2 border-amber-500/50">
                <svg
                  width="56"
                  height="56"
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
              <p className="text-3xl sm:text-4xl font-bold text-amber-300">
                Full body not visible!
              </p>
              <p className="max-w-md text-base sm:text-lg text-amber-200/75">
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
        <div className="overflow-hidden max-w-[180px] sm:max-w-[272px] rounded-[24px] border border-white/10 bg-black/75 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.42)]">
          {/* Header with collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="tracking-[0.18em] uppercase text-[9px] sm:text-[10px] text-zinc-400">AI Coach</span>
              {isDemo && (
                <span className="px-1.5 py-0.5 rounded-full text-[7px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/20">
                  DEMO
                </span>
              )}
              {isLoading && (
                <span className="px-1.5 py-0.5 rounded-full text-[7px] font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/20 animate-pulse">
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
                <div className="px-3 sm:px-4 pb-3 pt-1">
                  <div className={cn("rounded-2xl border px-3 py-3", liveState.chip)}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={cn("text-sm font-semibold", liveState.tone)}>{liveState.label}</p>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Live AI</p>
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-zinc-200/80">{priorityTip}</p>
                  </div>
                </div>

                {/* Distance guidance */}
                {distanceGuide && distanceGuide.status !== "ok" && (
                  <div className={cn("mx-3 sm:mx-4 mb-3 px-3 py-2 rounded-2xl border", distanceGuide.status === "close" ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-500/10 border-amber-500/20") }>
                    <p
                      className={cn(
                        "text-[10px] sm:text-[11px] leading-tight",
                        distanceGuide.status === "close"
                          ? "text-amber-300"
                          : "text-amber-300"
                      )}
                    >
                      {distanceGuide.message}
                    </p>
                  </div>
                )}

                {/* Demo mode notice */}
                {isDemo && (
                  <div className="mx-3 sm:mx-4 mb-3 px-3 py-2 rounded-2xl bg-amber-400/10 border border-amber-400/20">
                    <p className="text-[10px] sm:text-[11px] text-amber-300 leading-tight">
                      Pose model unavailable. Scoring disabled.
                    </p>
                  </div>
                )}

                {/* Score rings — smaller on mobile */}
                {showCoachData ? (
                  <div className="px-3 sm:px-4 pb-3">
                    <div className="grid grid-cols-5 gap-1 sm:gap-2">
                      {metricRows.map((metric) => (
                        <div key={metric.label} className="text-center">
                          <CircularProgress
                            value={hasScores ? metric.value : 0}
                            size={34}
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
                          <p className="text-[7px] sm:text-[9px] text-zinc-500 mt-1">
                            {metric.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mx-3 sm:mx-4 mb-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] text-zinc-300">AI metrics unlock when your full body is visible.</p>
                  </div>
                )}

                {showCoachData && (
                  <div className="px-3 sm:px-4 pb-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-white/8 bg-white/5 px-2.5 py-2">
                        <p className="text-[8px] uppercase tracking-[0.18em] text-zinc-500">Status</p>
                        <p className="mt-1 text-[11px] font-semibold text-white">{liveState.label}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/5 px-2.5 py-2">
                        <p className="text-[8px] uppercase tracking-[0.18em] text-zinc-500">Beat</p>
                        <p className="mt-1 text-[11px] font-semibold text-white">{beatCount}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/5 px-2.5 py-2">
                        <p className="text-[8px] uppercase tracking-[0.18em] text-zinc-500">BPM</p>
                        <p className="mt-1 text-[11px] font-semibold text-white">{bpm || "--"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Beat & voice controls */}
                {showCoachData && (
                  <div className="px-3 sm:px-4 pb-3 flex items-center justify-between border-t border-white/5 pt-2">
                    <BeatPulse
                      beatCount={beatCount}
                      bpm={bpm}
                      isOnBeat={isOnBeat}
                    />
                    {onToggleVoice && (
                      <button
                        onClick={onToggleVoice}
                        className={cn(
                          "text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-1 rounded-full border transition-colors",
                          voiceEnabled
                            ? "bg-amber-300/20 text-amber-200 border-amber-300/20"
                            : "bg-white/5 text-zinc-500 border-white/10"
                        )}
                      >
                        {voiceEnabled ? "🔊" : "🔇"}
                      </button>
                    )}
                  </div>
                )}

                {/* Feedback messages — limit to 2 on mobile */}
                {showCoachData && latestMessages.length > 0 && (
                  <div className="px-3 sm:px-4 pb-3 space-y-2 border-t border-white/5 pt-2">
                    <AnimatePresence mode="popLayout">
                      {latestMessages.slice(-2).map((msg, i) => (
                        <motion.div
                          key={`${msg.timestamp}-${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="flex items-start gap-2 rounded-2xl border border-white/8 bg-white/5 px-2.5 py-2"
                        >
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                              dotColors[msg.type]
                            )}
                          />
                          <p
                            className={cn(
                              "text-[10px] sm:text-[11px] leading-tight",
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
