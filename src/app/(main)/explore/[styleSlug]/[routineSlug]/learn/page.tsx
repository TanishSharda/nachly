"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { getChoreographySaves, postChoreographySave } from "@/lib/api/choreos";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { notFound } from "next/navigation";

type LearnPhase = "watching" | "paused-between-steps" | "completed";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type LearnStep = any;

function generateSteps(durationSeconds: number, stepInterval = 10) {
  const totalDuration = Math.max(0, Math.floor(durationSeconds || 90));
  const stepCount = Math.max(1, Math.ceil(totalDuration / stepInterval));
  return Array.from({ length: stepCount }, (_, i) => {
    const startTime = i * stepInterval;
    const endTime = Math.min((i + 1) * stepInterval, totalDuration);
    return {
      id: `step-${i + 1}`,
      routine_id: null,
      step_number: i + 1,
      label: `Step ${i + 1}`,
      start_time: startTime,
      end_time: endTime,
      description: `Practice this ${Math.round(endTime - startTime)}s segment.`,
      created_at: new Date().toISOString(),
    };
  });
}

function parseMistakeSteps(routineId: string, rangesRaw: string | null): LearnStep[] {
  if (!rangesRaw) return [];

  const parsed = rangesRaw
    .split(",")
    .map((token) => token.trim())
    .map((token) => {
      const [startRaw, endRaw] = token.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
      if (end <= start) return null;
      return { start: Math.max(0, Math.floor(start)), end: Math.ceil(end) };
    })
    .filter((range): range is { start: number; end: number } => Boolean(range));

  return parsed.map((range, index) => ({
    id: `mistake-step-${routineId}-${index + 1}`,
    routine_id: routineId,
    step_number: index + 1,
    label: `Mistake Segment ${index + 1}`,
    start_time: range.start,
    end_time: range.end,
    description: "Focused correction loop from your report.",
    created_at: new Date(0).toISOString(),
  }));
}

export default function LearnModePage() {
  const { styleSlug, routineSlug } = useParams<{
    styleSlug: string;
    routineSlug: string;
  }>();
  const [style, setStyle] = useState<any | null>(null);
  const [routine, setRoutine] = useState<any | null>(null);
  const searchParams = useSearchParams();
  const mistakeRangesRaw = searchParams.get("mistakes");
  const slowModeDefault = searchParams.get("slow") === "1";
  const modeParam = searchParams.get("mode");
  const parsedMistakeSteps = useMemo(
    () => (routine ? parseMistakeSteps(routine.id, mistakeRangesRaw) : []),
    [routine, mistakeRangesRaw]
  );
  const isMistakeSession = parsedMistakeSteps.length > 0;

  // Steps are generated dynamically once we know the real video duration
  const [steps, setSteps] = useState<LearnStep[]>(() => (routine ? [] : []));

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<LearnPhase>(modeParam === "stepwise" ? "paused-between-steps" : "watching");
  const [playbackSpeed, setPlaybackSpeed] = useState(slowModeDefault ? 0.75 : 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [replayCount, setReplayCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Self-camera state
  const [cameraOn, setCameraOn] = useState(false);
  const webcamRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timeCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoUrl = (() => {
    const perf = (routine?.routine_videos || []).find((v: any) => v.video_type === "performance");
    return perf?.video_url || routine?.video_url || null;
  })();

  useEffect(() => {
    if (!routine) return;

    let mounted = true;

    async function loadSavedState() {
      try {
        const saves = await getChoreographySaves();
        const isRoutineSaved = (saves || []).some((entry: { choreoId?: string }) => entry?.choreoId === routine?.id);
        if (mounted) setIsSaved(isRoutineSaved);
      } catch {
        // Non-blocking on learn mode.
      }
    }

    void loadSavedState();
    return () => {
      mounted = false;
    };
  }, [routine]);

  const toggleSave = useCallback(async () => {
    if (!routine) return;

    setSavePending(true);
    try {
      const payload = await postChoreographySave({
        choreoId: routine.id,
        title: routine.title,
        videoUrl: videoUrl || "",
        styleSlug,
        difficulty: routine.difficulty,
        caption: routine.description,
      });

      setIsSaved(Boolean(payload?.saved));
      setSaveMessage(payload?.saved ? "Saved for practice later" : "Removed from saved");
    } catch {
      setSaveMessage("Unable to update saved status");
    } finally {
      setSavePending(false);
    }
  }, [routine, styleSlug, videoUrl]);

  useEffect(() => {
    if (!routine) return;

    setSteps(isMistakeSession ? parsedMistakeSteps : []);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setReplayCount(0);
    setPhase("watching");
    setPlaybackSpeed(slowModeDefault ? 0.75 : 1);
  }, [routine, isMistakeSession, parsedMistakeSteps, slowModeDefault]);

  const step = steps[currentStep];
  const totalSteps = steps.length;
  const progressPct =
    totalSteps > 0 ? (completedSteps.size / totalSteps) * 100 : 0;

  // Regenerate steps when real video duration is detected
  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current;
    if (!video || !routine) return;
    const realDuration = video.duration;
    if (!realDuration || !isFinite(realDuration)) return;

    setVideoDuration(realDuration);

    // Regenerate steps based on the actual video length
    const newSteps = isMistakeSession
      ? parsedMistakeSteps.map((step, index) => ({
          ...step,
          step_number: index + 1,
          start_time: Math.max(0, Math.min(step.start_time, Math.max(0, Math.floor(realDuration) - 1))),
          end_time: Math.max(
            Math.min(Math.ceil(realDuration), step.end_time),
            Math.min(Math.ceil(realDuration), step.start_time + 1)
          ),
        }))
      : generateSteps(realDuration);
    setSteps(newSteps);
  }, [routine, isMistakeSession, parsedMistakeSteps]);

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // --- Start camera helper ---
  const startCamera = useCallback(async () => {
    if (streamRef.current) return; // already running
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      console.error("Camera access denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [cameraOn, startCamera, stopCamera]);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach stream to webcam video element
  useEffect(() => {
    if (webcamRef.current && streamRef.current) {
      webcamRef.current.srcObject = streamRef.current;
      webcamRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // --- Play the current step's segment ---
  const playCurrentStep = useCallback(() => {
    const video = videoRef.current;
    if (!video || !step) return;

    video.currentTime = step.start_time;
    video.play().catch(() => {});
    setIsPlaying(true);
    setPhase("watching");
  }, [step]);

  // --- Monitor video time and auto-pause at step boundary ---
  useEffect(() => {
    if (!videoRef.current || !step || phase !== "watching") return;

    const video = videoRef.current;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setVideoDuration(video.duration || 0);

      if (video.currentTime >= step.end_time - 0.15) {
        video.pause();
        setIsPlaying(false);
        setCompletedSteps((prev) => new Set([...prev, currentStep]));
        setPhase("paused-between-steps");
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [step, currentStep, phase]);

  // --- Go to next step ---
  const goNextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
      setReplayCount(0);
    } else {
      setPhase("completed");
    }
  }, [currentStep, totalSteps]);

  // --- Replay current step ---
  const replayStep = useCallback(() => {
    setReplayCount((c) => c + 1);
    playCurrentStep();
  }, [playCurrentStep]);

  // --- Replay at slower speed ---
  const replaySlower = useCallback(() => {
    const slowerSpeed = Math.max(0.25, playbackSpeed - 0.25);
    setPlaybackSpeed(slowerSpeed);
    setReplayCount((c) => c + 1);
    setTimeout(() => playCurrentStep(), 50);
  }, [playbackSpeed, playCurrentStep]);

  // --- Jump to specific step ---
  const jumpToStep = useCallback((index: number) => {
    setCurrentStep(index);
    setReplayCount(0);
    setPhase("watching");
  }, []);

  // --- Auto-play when step changes ---
  useEffect(() => {
    if (phase === "completed") return;
    const t = setTimeout(() => playCurrentStep(), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && phase === "paused-between-steps") {
        e.preventDefault();
        goNextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        replayStep();
      } else if (e.key === " ") {
        e.preventDefault();
        if (phase === "paused-between-steps") {
          goNextStep();
        } else if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, goNextStep, replayStep]);

  // Cleanup timer
  useEffect(() => {
    const ref = timeCheckRef;
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, []);

  // Restart from beginning
  const restartAll = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setReplayCount(0);
    setPhase("watching");
  }, []);

  if (!style || !routine) return notFound();

  const speeds = [0.25, 0.5, 0.75, 1];

  const stepDuration = step ? step.end_time - step.start_time : 10;
  const stepProgress = step
    ? Math.min(
        100,
        Math.max(0, ((currentTime - step.start_time) / stepDuration) * 100)
      )
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden">
      {/* ===== Top bar ===== */}
      <div className="shrink-0 bg-black/90 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between px-3 h-10">
          <Link
            href={`/explore/${styleSlug}/${routineSlug}`}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Exit
          </Link>

          {/* Step counter + title */}
          <div className="text-center">
            <p className="text-xs font-semibold text-white">{routine.title}</p>
            <p className="text-[10px] text-nred-500">
              {isMistakeSession ? "Mistake Learn" : "Step Learn"} • {currentStep + 1}/{totalSteps} &middot; {formatTime(step?.start_time || 0)} - {formatTime(step?.end_time || 0)}
              {videoDuration > 0 && (
                <span className="text-white/30"> &middot; {formatTime(videoDuration)}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                void toggleSave();
              }}
              disabled={savePending}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border",
                isSaved
                  ? "bg-emerald-400/20 text-emerald-100 border-emerald-300/40"
                  : "text-white/70 hover:text-white border-white/15 hover:border-white/25",
                savePending && "opacity-60"
              )}
            >
              {savePending ? "Saving..." : isSaved ? "Saved" : "Save"}
            </button>

            {/* Camera toggle */}
            <button
              onClick={toggleCamera}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                cameraOn
                  ? "bg-nred-500/20 text-nred-300 border border-nred-500/30"
                  : "text-white/60 hover:text-white border border-white/10 hover:border-white/20"
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14" />
                <rect x="1" y="6" width="14" height="12" rx="2" />
              </svg>
              {cameraOn ? "Camera On" : "Camera"}
            </button>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="h-[2px] bg-white/5">
          <motion.div
            className="h-full bg-nred-500/80"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {saveMessage ? (
          <p className="px-3 py-1 text-[11px] text-center text-zinc-300 border-t border-white/5">{saveMessage}</p>
        ) : null}
      </div>

      {/* ===== Split-screen area ===== */}
      <div className="flex-1 relative min-h-0 flex">
        {/* --- LEFT: Instructor Video --- */}
        <div
          className={cn(
            "relative min-h-0 transition-all duration-500 ease-out",
            cameraOn ? "w-1/2" : "w-full"
          )}
        >
          {videoUrl ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                src={videoUrl}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                preload="auto"
                onLoadedMetadata={handleVideoLoaded}
                onClick={() => {
                  if (!videoRef.current) return;
                  if (videoRef.current.paused) {
                    videoRef.current.play();
                    setIsPlaying(true);
                  } else {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </>
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${style.gradient_from}, ${style.gradient_to})`,
              }}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-black/30 rounded-full flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A3E635" strokeWidth="1.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <p className="text-white/60 text-sm">Instructor Video</p>
              </div>
            </div>
          )}

          {/* Instructor label */}
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md text-white/70 font-medium">
              Instructor
            </span>
          </div>

          {/* Step progress bar at bottom of instructor video */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <div className="h-1 bg-white/10">
              <motion.div
                className="h-full bg-nred-500"
                style={{ width: `${stepProgress}%` }}
              />
            </div>
          </div>

          {/* Play/pause indicator on instructor video */}
          <AnimatePresence>
            {phase === "watching" && !isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
              >
                <div className="w-14 h-14 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- Thin divider --- */}
        {cameraOn && (
          <div className="w-[2px] bg-white/10 shrink-0" />
        )}

        {/* --- RIGHT: Self Camera --- */}
        <AnimatePresence>
          {cameraOn && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "50%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative min-h-0 overflow-hidden"
            >
              <video
                ref={webcamRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              />

              {/* "You" label */}
              <div className="absolute top-2 left-2 z-10">
                <span className="text-[10px] bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md text-nred-500 font-medium">
                  You
                </span>
              </div>

              {/* Body guide outline */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-36 h-64 border-2 border-dashed border-nred-500/20 rounded-[40px]" />
              </div>

              {/* No camera feed placeholder (shows briefly before stream attaches) */}
              {!streamRef.current && (
                <div className="absolute inset-0 bg-dark-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 bg-dbg-50 rounded-full flex items-center justify-center animate-pulse">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A3E635" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14" />
                        <rect x="1" y="6" width="14" height="12" rx="2" />
                      </svg>
                    </div>
                    <p className="text-zinc-500 text-xs">Connecting camera...</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== PAUSED BETWEEN STEPS OVERLAY (covers entire split area) ===== */}
        <AnimatePresence>
          {phase === "paused-between-steps" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="text-center max-w-sm mx-4"
              >
                <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1 mb-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-emerald-300 text-xs font-semibold">
                    Step {currentStep + 1} Complete
                  </span>
                </div>

                <h2 className="text-xl font-display font-bold text-white mb-1">
                  {currentStep < totalSteps - 1 ? "Ready for next step?" : "Last step done!"}
                </h2>

                {replayCount > 0 && (
                  <p className="text-zinc-400 text-xs mb-3">
                    Practiced {replayCount + 1} times
                  </p>
                )}

                <div className="flex gap-2.5 justify-center mt-4">
                  <button
                    onClick={replayStep}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-sm transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Replay
                  </button>

                  <button
                    onClick={replaySlower}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-sm transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 8 14" />
                    </svg>
                    Slower
                  </button>

                  {currentStep < totalSteps - 1 ? (
                    <button
                      onClick={goNextStep}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-nred-500 hover:bg-nred-600 text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                      Next Step
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => setPhase("completed")}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                      Finish
                    </button>
                  )}
                </div>

                <p className="text-white/30 text-[10px] mt-3">
                  <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/40">Space</kbd> next &middot;{" "}
                  <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/40">&larr;</kbd> replay
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== COMPLETED OVERLAY — Guide to Practice ===== */}
        <AnimatePresence>
          {phase === "completed" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center max-w-lg mx-4"
              >
                {/* Celebration icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-500/30 to-nred-500/20 rounded-full flex items-center justify-center border border-emerald-500/30"
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-display font-bold text-white mb-2"
                >
                  {isMistakeSession ? "Mistake Session Complete!" : "You&apos;ve Learned the Routine!"}
                </motion.h2>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-4 mb-5"
                >
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-xs font-medium">{totalSteps} segments completed</span>
                  </div>
                  <div className="w-px h-3 bg-white/20" />
                  <div className="flex items-center gap-1.5 text-nred-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 8 14" />
                    </svg>
                    <span className="text-xs font-medium">{formatTime(videoDuration)} total</span>
                  </div>
                </motion.div>

                {/* Next step guidance */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-nred-500/10 border border-nred-500/20 rounded-2xl p-5 mb-5"
                >
                  <p className="text-nred-300 text-sm font-semibold mb-1">
                    {isMistakeSession ? "Reinforce the correction" : "Ready for the next level?"}
                  </p>
                  <p className="text-white/60 text-xs leading-relaxed">
                    {isMistakeSession
                      ? "Jump into AI Practice Mode to verify if these weak segments are fixed under live scoring."
                      : "Practice Mode uses AI to track your movements in real-time, giving you feedback on posture, timing, and energy. Dance along with the instructor and see your score!"}
                  </p>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col gap-2.5 items-center"
                >
                  <Link
                    href={`/explore/${styleSlug}/${routineSlug}/practice`}
                    className="flex items-center gap-2 px-8 py-3 bg-nred-500 hover:bg-nred-600 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-nred-500/20"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Start Practice Mode
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <div className="flex gap-3">
                    <button
                      onClick={restartAll}
                      className="flex items-center gap-1.5 px-4 py-2 text-white/50 hover:text-white/80 text-xs transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      Learn Again
                    </button>
                    <Link
                      href={`/explore/${styleSlug}/${routineSlug}`}
                      className="flex items-center gap-1.5 px-4 py-2 text-white/50 hover:text-white/80 text-xs transition-colors"
                    >
                      Back to Details
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Bottom bar ===== */}
      <div className="shrink-0 bg-black/90 backdrop-blur-sm border-t border-white/5">
        {/* Controls row: speed + play + time */}
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* Speed pills */}
          <div className="flex items-center gap-1">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold transition-colors",
                  playbackSpeed === s
                    ? "bg-nred-500 text-white"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => {
              if (!videoRef.current) return;
              if (phase === "paused-between-steps") {
                replayStep();
              } else if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
              } else {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }}
            className="w-8 h-8 rounded-full bg-nred-500 hover:bg-nred-600 flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Time */}
          <span className="text-[10px] text-white/40 font-mono w-20 text-right">
            {formatTime(currentTime)} / {formatTime(videoDuration || 0)}
          </span>
        </div>

        {/* Step timeline with labels */}
        <div className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar">
          {steps.map((s, i) => {
            const isCompleted = completedSteps.has(i);
            const isCurrent = i === currentStep;

            return (
              <button
                key={s.id}
                onClick={() => jumpToStep(i)}
                className={cn(
                  "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border",
                  isCurrent
                    ? "bg-nred-500/20 border-nred-500/50 text-nred-300"
                    : isCompleted
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60"
                )}
              >
                {/* Checkmark or step number */}
                {isCompleted ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                    isCurrent
                      ? "bg-nred-500 text-white"
                      : "bg-white/10 text-white/50"
                  )}>
                    {i + 1}
                  </span>
                )}
                <span>Step {i + 1}</span>
                <span className={cn(
                  "text-[9px]",
                  isCurrent ? "text-nred-500/60" : isCompleted ? "text-emerald-400/50" : "text-white/20"
                )}>
                  {formatTime(s.start_time)}-{formatTime(s.end_time)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
