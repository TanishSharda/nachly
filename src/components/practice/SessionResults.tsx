"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import Button from "@/components/ui/Button";
import CircularProgress from "@/components/ui/CircularProgress";
import {
  getMotivationalMessage,
  generateCoachingInsight,
  type SessionMetrics,
} from "@/lib/ai/pose-engine";
import { downloadShareCard } from "@/lib/ai/share-card";
import { getRecentSessions, getStreak, type SessionRecord } from "@/lib/ai/session-storage";
import type { DifficultyAdjustment } from "@/lib/ai/difficulty";
import type { WeakSpotDrill } from "@/lib/ai/weak-spot-drills";
import type { ReplaySegment } from "@/lib/ai/replay-segments";

const REPLAY_PREFS_KEY = "naachly_replay_prefs";

interface FocusedDrillSummary {
  active: boolean;
  bodyPart: "arms" | "legs" | "posture";
  targetScore: number;
  achievedScore: number;
  hitTarget: boolean;
  streak: number;
  completed: boolean;
}

interface SessionResultsProps {
  accuracy: number;
  consistency: number;
  completion: number;
  bodyPartScores: Record<string, number>;
  feedbackNotes: string[];
  replaySegments: ReplaySegment[];
  routineVideoUrl?: string | null;
  styleSlug: string;
  routineSlug: string;
  routineTitle: string;
  onPracticeAgain: () => void;
  // New features
  metrics?: SessionMetrics | null;
  difficultyResult?: DifficultyAdjustment | null;
  recommendedDrill?: WeakSpotDrill | null;
  recommendedDrillId?: string | null;
  focusedDrillSummary?: FocusedDrillSummary | null;
  userPracticeVideoUrl?: string | null;
}

export default function SessionResults({
  accuracy,
  consistency,
  completion,
  bodyPartScores,
  feedbackNotes,
  replaySegments,
  routineVideoUrl = null,
  styleSlug,
  routineSlug,
  routineTitle,
  onPracticeAgain,
  metrics = null,
  difficultyResult = null,
  recommendedDrill = null,
  recommendedDrillId = null,
  focusedDrillSummary = null,
  userPracticeVideoUrl = null,
}: SessionResultsProps) {
  const overall = Math.round(accuracy * 0.5 + consistency * 0.3 + completion * 0.2);
  const [sharing, setSharing] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [activeReplayIndex, setActiveReplayIndex] = useState<number | null>(null);
  const [replaySpeed, setReplaySpeed] = useState<0.75 | 1>(1);
  const [replayLoops, setReplayLoops] = useState<1 | 2 | 3>(1);
  const replayVideoRef = useRef<HTMLVideoElement | null>(null);
  const replayEndRef = useRef<number | null>(null);
  const replayStartRef = useRef<number | null>(null);
  const replayLoopRemainingRef = useRef(1);

  const getColor = (score: number): "wine" | "gold" | "green" => {
    if (score >= 80) return "green";
    if (score >= 60) return "gold";
    return "wine";
  };

  // Coaching insight
  const coachingLines =
    metrics
      ? generateCoachingInsight(
          { accuracy, consistency, completion, bodyPartScores, mistakes: [], totalFrames: 0, perfectFrames: 0, goodFrames: 0 },
          metrics
        )
      : [];

  const allNotes = [...coachingLines, ...feedbackNotes];
  const streak = getStreak();
  const comparedFrames = metrics?.totalFramesCompared ?? 0;
  const perfectRate = comparedFrames > 0 ? Math.round(((metrics?.perfectFrames ?? 0) / comparedFrames) * 100) : 0;
  const goodRate = comparedFrames > 0 ? Math.round(((metrics?.goodFrames ?? 0) / comparedFrames) * 100) : 0;
  const avgDrift =
    metrics && metrics.avgAngleDiffHistory.length > 0
      ? Math.round(metrics.avgAngleDiffHistory.reduce((sum, value) => sum + value, 0) / metrics.avgAngleDiffHistory.length)
      : 0;
  const weakPart =
    Object.entries(bodyPartScores).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "-";
  const mistakeRangesParam = replaySegments
    .map((segment) => `${Math.max(0, Math.floor(segment.startSec))}-${Math.max(Math.floor(segment.startSec) + 1, Math.ceil(segment.endSec))}`)
    .join(",");
  const hasMistakeSession = mistakeRangesParam.length > 0;
  const mistakeLearnHref = `/explore/${styleSlug}/${routineSlug}/learn?mistakes=${encodeURIComponent(mistakeRangesParam)}&slow=1`;
  const recentSessions = getRecentSessions(6);
  const trendSeries = recentSessions
    .slice(0, 6)
    .reverse()
    .map((session) => ({
      ...session,
      overall: Math.round(session.accuracy * 0.5 + session.consistency * 0.3 + session.completion * 0.2),
    }));
  const previousAverage =
    trendSeries.length > 1
      ? Math.round(trendSeries.slice(0, -1).reduce((sum, item) => sum + item.overall, 0) / (trendSeries.length - 1))
      : overall;
  const deltaVsPrevious = overall - previousAverage;
  const timelineMaxSec = Math.max(
    24,
    ...replaySegments.map((segment) => Math.ceil(segment.endSec)),
    ...trendSeries.map((session) => Math.max(1, Math.ceil(session.elapsed || 0)))
  );
  const timelineRows = replaySegments.length > 0 ? replaySegments.slice(0, 8) : [];

  const handleShareCard = useCallback(async () => {
    setSharing(true);
    try {
      await downloadShareCard({
        userName: "Dancer",
        routineTitle,
        accuracy,
        consistency,
        completion,
        streak: streak.count,
      });
    } catch (err) {
      console.error("Share card failed:", err);
    }
    setSharing(false);
  }, [routineTitle, accuracy, consistency, completion, streak.count]);

  const handleDownloadPracticeVideo = useCallback(() => {
    if (!userPracticeVideoUrl) return;
    setDownloadingVideo(true);
    try {
      const link = document.createElement("a");
      link.href = userPracticeVideoUrl;
      link.download = `nachly-${routineSlug}-practice-${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingVideo(false);
    }
  }, [routineSlug, userPracticeVideoUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayReplaySegment = useCallback(
    async (segment: ReplaySegment, index: number) => {
      const video = replayVideoRef.current;
      if (!video) return;

      try {
        replayStartRef.current = segment.startSec;
        replayEndRef.current = segment.endSec;
        replayLoopRemainingRef.current = replayLoops;
        video.playbackRate = replaySpeed;
        video.currentTime = Math.max(0, segment.startSec);
        setActiveReplayIndex(index);
        await video.play();
      } catch {
        setActiveReplayIndex(null);
      }
    },
    [replayLoops, replaySpeed]
  );

  const handleReplayPlayPause = useCallback(async () => {
    const video = replayVideoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        // Ignore autoplay restrictions.
      }
      return;
    }
    video.pause();
  }, []);

  const handlePlayReplayByIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= replaySegments.length) return;
      void handlePlayReplaySegment(replaySegments[index], index);
    },
    [handlePlayReplaySegment, replaySegments]
  );

  useEffect(() => {
    const video = replayVideoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (replayEndRef.current === null) return;
      if (video.currentTime >= replayEndRef.current) {
        const start = replayStartRef.current;
        if (!start && start !== 0) {
          video.pause();
          replayEndRef.current = null;
          setActiveReplayIndex(null);
          return;
        }

        if (replayLoopRemainingRef.current > 1) {
          replayLoopRemainingRef.current -= 1;
          video.currentTime = start;
          void video.play();
          return;
        }

        video.pause();
        replayEndRef.current = null;
        replayStartRef.current = null;
        replayLoopRemainingRef.current = 1;
        setActiveReplayIndex(null);
      }
    };

    const onPause = () => {
      if (replayEndRef.current === null) setActiveReplayIndex(null);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(REPLAY_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { speed?: number; loops?: number };
      if (parsed.speed === 0.75 || parsed.speed === 1) {
        setReplaySpeed(parsed.speed);
      }
      if (parsed.loops === 1 || parsed.loops === 2 || parsed.loops === 3) {
        setReplayLoops(parsed.loops);
      }
    } catch {
      // Ignore malformed stored preferences.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(REPLAY_PREFS_KEY, JSON.stringify({ speed: replaySpeed, loops: replayLoops }));
  }, [replaySpeed, replayLoops]);

  useEffect(() => {
    const video = replayVideoRef.current;
    if (!video) return;
    video.playbackRate = replaySpeed;
  }, [replaySpeed]);

  useEffect(() => {
    if (replaySegments.length === 0 || !routineVideoUrl) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTypingContext) return;

      if (event.key === " ") {
        event.preventDefault();
        void handleReplayPlayPause();
        return;
      }

      if (event.key === "1" || event.key === "2" || event.key === "3") {
        const loops = Number(event.key) as 1 | 2 | 3;
        setReplayLoops(loops);
        return;
      }

      if (event.key.toLowerCase() === "s") {
        setReplaySpeed((prev) => (prev === 1 ? 0.75 : 1));
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = activeReplayIndex === null ? 0 : Math.min(replaySegments.length - 1, activeReplayIndex + 1);
        handlePlayReplayByIndex(nextIndex);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex = activeReplayIndex === null ? 0 : Math.max(0, activeReplayIndex - 1);
        handlePlayReplayByIndex(prevIndex);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeReplayIndex, handlePlayReplayByIndex, handleReplayPlayPause, replaySegments.length, routineVideoUrl]);

  return (
    <div className="h-full w-full p-4 pt-6 sm:p-6 sm:pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full min-h-full"
      >
        <div className="mx-auto w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0b0f1a] via-[#0d111c] to-[#131722] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:px-10"
          >
            <div className="pointer-events-none absolute -top-28 right-0 h-48 w-48 rounded-full bg-nred-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-36 left-6 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-nred-200/80">Session complete</p>
                <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
                  {routineTitle}
                </h1>
                <p className="mt-2 text-sm text-zinc-400">Practice mode · {getMotivationalMessage(accuracy)}</p>
                {streak.count > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-nred-200 ring-1 ring-white/10">
                    🔥 {streak.count} day streak
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {[
                    { label: "Accuracy", value: accuracy, color: "wine" as const },
                    { label: "Consistency", value: consistency, color: "gold" as const },
                    { label: "Completion", value: completion, color: "green" as const },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-full bg-white/5 px-4 py-2 ring-1 ring-white/10"
                    >
                      <CircularProgress value={item.value} size={42} strokeWidth={5} color={item.color}>
                        <span className="text-[11px] font-semibold text-white">{item.value}%</span>
                      </CircularProgress>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">{item.label}</p>
                        <p className="text-sm font-semibold text-white">{item.value}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <CircularProgress value={overall} size={150} strokeWidth={8} color={getColor(overall)}>
                  <div className="text-center">
                    <div className="text-4xl font-display font-bold text-nred-300">{overall}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Overall</div>
                  </div>
                </CircularProgress>
              </div>
            </div>
          </motion.div>

          {/* Difficulty change notification */}
          {difficultyResult?.changed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={cn(
                "mb-8 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold",
                difficultyResult.direction === "up"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
              )}
            >
              {difficultyResult.direction === "up" ? "⬆️" : "⬇️"}{" "}
              Difficulty adjusted to {difficultyResult.emoji} {difficultyResult.label}
            </motion.div>
          )}

        {/* Mistake timeline */}
        {timelineRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.56 }}
            className="mb-10 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">Mistake Timeline</h3>
              <p className="text-xs text-zinc-400">Mistake segments across routine time</p>
            </div>
            <div className="space-y-2">
              {timelineRows.map((segment, index) => {
                const leftPct = (segment.startSec / timelineMaxSec) * 100;
                const widthPct = Math.max(6, ((segment.endSec - segment.startSec) / timelineMaxSec) * 100);
                const chipClass =
                  segment.severity === "high"
                    ? "bg-amber-400 text-black"
                    : "bg-lime-300 text-black";

                return (
                  <div key={`${segment.startSec}-${segment.endSec}-${index}`} className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3">
                    <span className="text-xs text-zinc-400 text-right">{index + 1}</span>
                    <div className="relative h-8 rounded-lg bg-white/5">
                      <div
                        className={cn("absolute top-1 h-6 rounded-full px-3 text-[10px] font-semibold leading-6", chipClass)}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={segment.note}
                      >
                        {formatTime(segment.startSec)}-{formatTime(segment.endSec)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-5 text-[10px] text-zinc-500">
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                <span key={tick} className="text-center">
                  {formatTime(Math.round(timelineMaxSec * tick))}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Comparative trend */}
        {trendSeries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.58 }}
            className="mb-10 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-white">Comparative Trend</h3>
              <div className={cn("rounded-full px-3 py-1 text-xs font-semibold", deltaVsPrevious >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300")}>
                {deltaVsPrevious >= 0 ? `+${deltaVsPrevious}` : `${deltaVsPrevious}`} vs previous avg ({previousAverage})
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {trendSeries.map((session: SessionRecord & { overall: number }, index) => {
                const heightPct = Math.max(15, session.overall);
                const isCurrent = index === trendSeries.length - 1;
                return (
                  <div key={`${session.date}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-2">
                    <div className="h-24 flex items-end justify-center">
                      <div
                        className={cn(
                          "w-7 rounded-md",
                          isCurrent ? "bg-gradient-to-t from-nred-500 to-lime-300" : "bg-gradient-to-t from-zinc-600 to-zinc-300"
                        )}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-center text-[11px] font-semibold text-white">{session.overall}</p>
                    <p className="text-center text-[10px] text-zinc-500">{new Date(session.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}


        {/* Performance dashboard cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {[
            { label: "Frames Compared", value: `${comparedFrames}` },
            { label: "Perfect Match", value: `${perfectRate}%` },
            { label: "Good Match", value: `${goodRate}%` },
            { label: "Avg Drift", value: avgDrift > 0 ? `${avgDrift}°` : "-" },
          ].map((item) => (
            <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">{item.label}</p>
              <p className="mt-2 text-2xl font-display font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">Weakest Area</p>
            <p className="mt-2 text-xl font-semibold text-white capitalize">{weakPart}</p>
            <p className="mt-1 text-xs text-zinc-400">Primary correction focus for your next session.</p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">Mistake Windows</p>
            <p className="mt-2 text-xl font-semibold text-white">{replaySegments.length}</p>
            <p className="mt-1 text-xs text-zinc-400">Detected segments where movement drifted the most.</p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">Consistency Index</p>
            <p className="mt-2 text-xl font-semibold text-white">{consistency}%</p>
            <p className="mt-1 text-xs text-zinc-400">How stable your form remained across the full routine.</p>
          </div>
        </div>

        {hasMistakeSession && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.92 }}
            className="mb-8 rounded-2xl border border-nred-500/25 bg-gradient-to-br from-[#171d12] to-[#12131b] p-5"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-nred-200/80">Mistake Learn Session</p>
                <h3 className="text-xl font-display font-bold text-white mt-1">Practice only the wrong parts</h3>
                <p className="text-sm text-zinc-300 mt-2 max-w-xl">
                  Opens a dedicated learn flow with only your weak segments. Starts in slow mode and supports full speed control.
                </p>
              </div>
              <Link href={mistakeLearnHref}>
                <Button className="whitespace-nowrap">Practice Mistakes</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Body part breakdown */}
        {Object.keys(bodyPartScores).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-zinc-900/60 backdrop-blur-sm rounded-xl p-5 mb-6 border border-white/10"
          >
            <h3 className="font-display font-bold text-white mb-4 text-sm">
              Body Part Scores
            </h3>
            <div className="space-y-3">
              {Object.entries(bodyPartScores).map(([part, score]) => (
                <div key={part} className="flex items-center gap-3">
                  <span className="text-sm text-zinc-300 w-16 capitalize">{part}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: 0.8 }}
                      className={cn(
                        "h-full rounded-full",
                        score >= 80
                          ? "bg-emerald-500"
                          : score >= 60
                          ? "bg-amber-400"
                          : "bg-nred-500"
                      )}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white w-8 text-right">
                    {score}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Coach notes */}
        {allNotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-zinc-900/60 backdrop-blur-sm rounded-xl p-5 mb-8 border border-white/10"
          >
            <h3 className="font-display font-bold text-white mb-3 text-sm">
              Coach&apos;s Notes
            </h3>
            <ul className="space-y-2">
              {allNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-nred-500 mt-0.5">&#8226;</span>
                  {note}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {recommendedDrill && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            className="bg-nred-500/10 backdrop-blur-sm rounded-xl p-5 mb-8 border border-nred-500/30"
          >
            <h3 className="font-display font-bold text-white mb-2 text-sm">
              Next Drill: {recommendedDrill.title} (Lv {recommendedDrill.level})
            </h3>
            <p className="text-sm text-zinc-200 mb-2">{recommendedDrill.cue}</p>
            <p className="text-xs text-zinc-400">
              Focus: {recommendedDrill.bodyPart} • Duration: {recommendedDrill.durationSeconds}s • Target score: {recommendedDrill.targetScore}
            </p>
          </motion.div>
        )}

        {focusedDrillSummary?.active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.97 }}
            className={cn(
              "backdrop-blur-sm rounded-xl p-5 mb-8 border",
              focusedDrillSummary.hitTarget
                ? "bg-emerald-500/10 border-emerald-400/30"
                : "bg-amber-500/10 border-amber-400/30"
            )}
          >
            <h3 className="font-display font-bold text-white mb-2 text-sm">
              Focused Drill Check: {focusedDrillSummary.bodyPart}
            </h3>
            <p className="text-sm text-zinc-200 mb-2">
              {focusedDrillSummary.hitTarget ? "Target reached" : "Keep pushing"}: {focusedDrillSummary.achievedScore} / {focusedDrillSummary.targetScore || "custom"}
            </p>
            <p className="text-xs text-zinc-300">
              Streak: {focusedDrillSummary.streak}/3 {focusedDrillSummary.completed ? "• Drill promoted unlocked" : "• Hit target in 3 sessions to promote"}
            </p>
          </motion.div>
        )}

        {focusedDrillSummary?.completed && recommendedDrill && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.99 }}
            className="bg-emerald-500/10 backdrop-blur-sm rounded-xl p-5 mb-8 border border-emerald-400/40"
          >
            <h3 className="font-display font-bold text-white mb-2 text-sm">
              Drill Completed! Next Level Ready
            </h3>
            <p className="text-sm text-zinc-100 mb-3">
              You unlocked <span className="font-semibold">{recommendedDrill.title}</span>. Jump in now while the correction is fresh.
            </p>
            <Link
              href={`/explore/${styleSlug}/${routineSlug}/practice?drillFocus=${recommendedDrill.bodyPart}&drillId=${recommendedDrillId || ""}&target=${recommendedDrill.targetScore}&loop=1&slow=1&autoStart=1`}
              className="inline-flex items-center rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/30"
            >
              Start Promoted Drill Now
            </Link>
          </motion.div>
        )}

        {replaySegments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.98 }}
            className="bg-nred-500/10 backdrop-blur-sm rounded-xl p-5 mb-8 border border-nred-400/30"
          >
            <h3 className="font-display font-bold text-white mb-3 text-sm">Replay Weak Spots</h3>
            <p className="text-[11px] text-zinc-300 mb-3">
              Shortcuts: Space play/pause, 1-3 loop count, S slow mode, Arrow Up/Down previous/next segment.
            </p>
            {routineVideoUrl && (
              <div className="mb-3 rounded-lg overflow-hidden border border-white/10 bg-black/30">
                <video
                  ref={replayVideoRef}
                  src={routineVideoUrl}
                  controls
                  playsInline
                  className="w-full h-44 object-contain bg-black"
                />
                <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-3 py-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((loop) => (
                      <button
                        key={loop}
                        type="button"
                        onClick={() => setReplayLoops(loop as 1 | 2 | 3)}
                        className={cn(
                          "rounded-md px-2 py-1 text-xs transition-colors",
                          replayLoops === loop
                            ? "bg-nred-500/20 text-nred-200"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10"
                        )}
                      >
                        x{loop}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplaySpeed((prev) => (prev === 1 ? 0.75 : 1))}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs transition-colors",
                      replaySpeed === 0.75
                        ? "bg-amber-500/20 text-amber-200"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    {replaySpeed === 0.75 ? "Slow 0.75x" : "Normal 1x"}
                  </button>
                </div>
              </div>
            )}
            {!routineVideoUrl && (
              <p className="text-xs text-zinc-400 mb-3">Routine video unavailable for inline replay on this routine.</p>
            )}
            <div className="space-y-2">
              {replaySegments.map((segment, index) => (
                <button
                  key={`${segment.startSec}-${segment.endSec}-${index}`}
                  type="button"
                  disabled={!routineVideoUrl}
                  onClick={() => handlePlayReplaySegment(segment, index)}
                  className={cn(
                    "w-full text-left rounded-lg border bg-black/20 px-3 py-2 transition-colors",
                    activeReplayIndex === index ? "border-nred-300/60 bg-nred-500/10" : "border-white/10 hover:bg-white/5",
                    !routineVideoUrl && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <p className="text-xs text-white font-semibold">
                    {formatTime(segment.startSec)} - {formatTime(segment.endSec)}
                    <span className={cn("ml-2", segment.severity === "high" ? "text-nred-300" : "text-amber-300")}>
                      {segment.severity.toUpperCase()}
                    </span>
                    {activeReplayIndex === index && <span className="ml-2 text-nred-300">PLAYING</span>}
                  </p>
                  <p className="text-xs text-zinc-300 mt-1">{segment.note}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex gap-3 justify-center flex-wrap"
        >
          <Button
            variant="ghost"
            onClick={onPracticeAgain}
            className="text-white hover:bg-zinc-800"
          >
            Practice Again
          </Button>
          <Button
            variant="ghost"
            onClick={handleShareCard}
            className="text-nred-500 hover:bg-nred-500/10"
          >
            {sharing ? "Generating..." : "📸 Share Card"}
          </Button>
          {userPracticeVideoUrl && (
            <Button
              variant="ghost"
              onClick={handleDownloadPracticeVideo}
              className="text-nred-300 hover:bg-nred-500/10"
            >
              {downloadingVideo ? "Preparing..." : "⬇ Download Your Video"}
            </Button>
          )}
          <Link href={`/explore/${styleSlug}/${routineSlug}`}>
            <Button variant="secondary">Back to Routine</Button>
          </Link>
        </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
