"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { getStyleBySlug, getRoutineBySlug, getRoutineVideoUrl } from "@/lib/mock-data";
import { notFound } from "next/navigation";
import CalibrationScreen from "@/components/practice/CalibrationScreen";
import SkeletonCanvas from "@/components/practice/SkeletonCanvas";
import CountdownOverlay from "@/components/practice/CountdownOverlay";
import VideoStage from "@/components/practice/VideoStage";
import PlaybackControls from "@/components/practice/PlaybackControls";
import CameraControls from "@/components/practice/CameraControls";
import AIFeedbackPanel from "@/components/practice/AIFeedbackPanel";
import SessionResults from "@/components/practice/SessionResults";
import SessionHistory from "@/components/practice/SessionHistory";
import { usePoseDetection } from "@/components/practice/usePoseDetection";
import { createAudioEngine, type AudioEngine } from "@/lib/ai/audio-engine";
import { createVoiceCoach, type VoiceCoach } from "@/lib/ai/voice-coach";
import { adjustDifficulty, getDifficulty, type DifficultyAdjustment } from "@/lib/ai/difficulty";
import { evaluateDrillCompletions, getStoredDrills, saveSession, updateStreak, saveDrill } from "@/lib/ai/session-storage";
import { getDistanceGuidance } from "@/lib/ai/pose-engine";
import { buildPromotedDrill, buildWeakSpotDrill, type WeakSpotDrill } from "@/lib/ai/weak-spot-drills";
import { buildReplaySegments, type ReplaySegment } from "@/lib/ai/replay-segments";

type PracticePhase = "calibration" | "countdown" | "dancing" | "results";
type PlaybackSpeed = 0.5 | 0.75 | 1;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function getDrillAutoCompleteConfig(level: string): {
  holdSeconds: number;
  requiredScoreBonus: number;
  minComparedFrames: number;
  minBodyPartSamples: number;
  minStableSamples: number;
  label: string;
} {
  switch (level) {
    case "beginner":
      return {
        holdSeconds: 2,
        requiredScoreBonus: 0,
        minComparedFrames: 20,
        minBodyPartSamples: 16,
        minStableSamples: 4,
        label: "Relaxed",
      };
    case "easy":
      return {
        holdSeconds: 2.5,
        requiredScoreBonus: 0,
        minComparedFrames: 24,
        minBodyPartSamples: 18,
        minStableSamples: 5,
        label: "Easy",
      };
    case "normal":
      return {
        holdSeconds: 3,
        requiredScoreBonus: 1,
        minComparedFrames: 28,
        minBodyPartSamples: 22,
        minStableSamples: 5,
        label: "Standard",
      };
    case "intermediate":
      return {
        holdSeconds: 3.5,
        requiredScoreBonus: 2,
        minComparedFrames: 34,
        minBodyPartSamples: 26,
        minStableSamples: 6,
        label: "Strict",
      };
    case "hard":
      return {
        holdSeconds: 4,
        requiredScoreBonus: 3,
        minComparedFrames: 40,
        minBodyPartSamples: 30,
        minStableSamples: 7,
        label: "Hardcore",
      };
    case "expert":
      return {
        holdSeconds: 4.5,
        requiredScoreBonus: 4,
        minComparedFrames: 48,
        minBodyPartSamples: 36,
        minStableSamples: 8,
        label: "Elite",
      };
    default:
      return {
        holdSeconds: 3,
        requiredScoreBonus: 1,
        minComparedFrames: 28,
        minBodyPartSamples: 22,
        minStableSamples: 5,
        label: "Standard",
      };
  }
}

type CameraStatus = "idle" | "requesting" | "ready" | "error";

interface CameraIssue {
  title: string;
  message: string;
}

interface FocusedDrillSummary {
  active: boolean;
  bodyPart: "arms" | "legs" | "posture";
  targetScore: number;
  achievedScore: number;
  hitTarget: boolean;
  streak: number;
  completed: boolean;
  serverVerified: boolean;
}

interface DrillCompletionEventInput {
  drillId: string;
  routineId: string;
  styleSlug: string;
  routineSlug: string;
  bodyPart: "arms" | "legs" | "posture";
  targetScore: number;
  achievedScore: number;
  autoCompleted: boolean;
  completionSource: "auto-hold" | "manual-end";
  comparedFrames: number;
  bodyPartSamples: number;
  stableSamples: number;
}

interface DrillCompletionEventResponse {
  ok: boolean;
  verifiedHits: number;
  verifiedCompleted: boolean;
}

async function syncDrillCatalogSnapshot() {
  const drills = getStoredDrills(40);
  if (drills.length === 0) return;

  try {
    await fetch("/api/drills/catalog/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ drills }),
    });
  } catch {
    // Non-blocking: local drill state is still available.
  }
}

async function submitSignedDrillCompletion(
  input: DrillCompletionEventInput
): Promise<{ verifiedHits: number; verifiedCompleted: boolean } | null> {
  try {
    const response = await fetch("/api/drills/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as DrillCompletionEventResponse;
    if (!data.ok) return null;
    return {
      verifiedHits: data.verifiedHits,
      verifiedCompleted: data.verifiedCompleted,
    };
  } catch {
    // Non-blocking telemetry: local progression still works even if network fails.
    return null;
  }
}

function mapCameraError(error: unknown): CameraIssue {
  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    return {
      title: "HTTPS required",
      message: "Camera access requires HTTPS on mobile browsers. Open Naachly using a secure https URL.",
    };
  }

  const name = (error as DOMException | undefined)?.name;
  switch (name) {
    case "NotAllowedError":
      return {
        title: "Permission not granted",
        message: "Camera permission was denied. Allow camera access in browser site settings and retry.",
      };
    case "NotFoundError":
      return {
        title: "Camera not detected",
        message: "No camera device was found. Connect a camera and try again.",
      };
    case "NotReadableError":
      return {
        title: "Camera busy",
        message: "Your camera is being used by another app or tab. Close other camera apps and retry.",
      };
    case "OverconstrainedError":
      return {
        title: "Camera configuration failed",
        message: "Your device does not support the requested camera settings. Retrying with a basic profile may help.",
      };
    case "SecurityError":
      return {
        title: "Secure context required",
        message: "Camera access is blocked because this page is not secure. Use HTTPS or localhost.",
      };
    default:
      return {
        title: "Camera unavailable",
        message: "We could not start the camera. Check permissions and try again.",
      };
  }
}

export default function PracticeModePage() {
  const { styleSlug, routineSlug } = useParams<{
    styleSlug: string;
    routineSlug: string;
  }>();
  const searchParams = useSearchParams();
  const style = getStyleBySlug(styleSlug);
  const routine = getRoutineBySlug(styleSlug, routineSlug);
  const drillFocusParam = searchParams.get("drillFocus");
  const drillFocus =
    drillFocusParam === "arms" || drillFocusParam === "legs" || drillFocusParam === "posture"
      ? drillFocusParam
      : null;
  const shouldLoopDrill = searchParams.get("loop") === "1";
  const shouldSlowDrill = searchParams.get("slow") === "1";
  const shouldAutoStart = searchParams.get("autoStart") === "1";
  const drillId = searchParams.get("drillId");
  const drillTargetParam = Number(searchParams.get("target"));
  const drillTarget = Number.isFinite(drillTargetParam) ? drillTargetParam : null;

  // === All hooks MUST be before conditional return ===
  const [phase, setPhase] = useState<PracticePhase>("calibration");
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [webcamVisible, setWebcamVisible] = useState(true);
  const [viewSwapped, setViewSwapped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(() => (shouldSlowDrill ? 0.75 : 1));
  const [isLooping, setIsLooping] = useState(() => shouldLoopDrill);
  const [elapsed, setElapsed] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameraIssue, setCameraIssue] = useState<CameraIssue | null>(null);
  const [userPracticeVideoUrl, setUserPracticeVideoUrl] = useState<string | null>(null);

  // New engine state
  const [beatCount, setBeatCount] = useState(0);
  const [bpm, setBpm] = useState(0);
  const [isOnBeat, setIsOnBeat] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [shadowMode, setShadowMode] = useState(false);
  const [resolvedDrillTarget, setResolvedDrillTarget] = useState<number>(drillTarget ?? 70);
  const [drillDurationSeconds, setDrillDurationSeconds] = useState<number>(90);
  const [drillReadyHoldSeconds, setDrillReadyHoldSeconds] = useState(0);
  const [distanceGuide, setDistanceGuide] = useState<{
    status: "ok" | "close" | "far";
    message: string;
  } | null>(null);
  const [difficultyResult, setDifficultyResult] = useState<DifficultyAdjustment | null>(null);
  const [recommendedDrill, setRecommendedDrill] = useState<WeakSpotDrill | null>(null);

  // Results state
  const [resultScores, setResultScores] = useState<{
    accuracy: number;
    consistency: number;
    completion: number;
    bodyPartScores: Record<string, number>;
    feedbackNotes: string[];
    replaySegments: ReplaySegment[];
    focusedDrillSummary: FocusedDrillSummary | null;
    generatedDrillId: string | null;
  } | null>(null);

  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const instructorVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordedVideoUrlRef = useRef<string | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval>>();
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const voiceCoachRef = useRef<VoiceCoach | null>(null);
  const distanceCheckRef = useRef<ReturnType<typeof setInterval>>();
  const autoStartRequestedRef = useRef(false);
  const autoStartPhaseStartedRef = useRef(false);
  const drillReadySinceRef = useRef<number | null>(null);
  const autoCompleteTriggeredRef = useRef(false);
  const recentDrillScoresRef = useRef<number[]>([]);

  // AI Pose Detection
  const isDancing = phase === "dancing";
  const {
    landmarks,
    comparison,
    metrics: poseMetrics,
    liveScores,
    feedbackMessages,
    bodyVisible,
    detectionMode,
    startDetection,
    stopDetection,
    getFinalScores,
  } = usePoseDetection(styleSlug, isDancing);
  const difficulty = getDifficulty();
  const drillAutoConfig = getDrillAutoCompleteConfig(difficulty.level);

  const drillPartStats = drillFocus ? poseMetrics.bodyParts[drillFocus] : null;
  const liveDrillScore =
    drillPartStats && drillPartStats.total > 0
      ? Math.round(((drillPartStats.perfect + drillPartStats.good * 0.6) / drillPartStats.total) * 100)
      : 0;
  const drillRequiredScoreForAutoComplete = Math.min(
    100,
    resolvedDrillTarget + drillAutoConfig.requiredScoreBonus
  );
  const comparedFrames = poseMetrics.totalFramesCompared;
  const bodyPartSampleCount = drillPartStats?.total ?? 0;
  const recentDrillScores = recentDrillScoresRef.current;
  const drillScoreStable =
    recentDrillScores.length >= drillAutoConfig.minStableSamples &&
    recentDrillScores.every((score) => score >= drillRequiredScoreForAutoComplete - 2);
  const drillSignalReliable =
    comparedFrames >= drillAutoConfig.minComparedFrames &&
    bodyPartSampleCount >= drillAutoConfig.minBodyPartSamples;
  const drillTimeProgress = drillFocus
    ? Math.min(100, (elapsed / Math.max(1, drillDurationSeconds)) * 100)
    : 0;
  const drillScoreProgress = drillFocus
    ? Math.min(100, (liveDrillScore / Math.max(1, resolvedDrillTarget)) * 100)
    : 0;
  const drillReady = Boolean(
    drillFocus &&
      elapsed >= drillDurationSeconds &&
      liveDrillScore >= drillRequiredScoreForAutoComplete &&
      drillSignalReliable &&
      drillScoreStable
  );

  useEffect(() => {
    if (phase !== "dancing" || !drillFocus) {
      recentDrillScoresRef.current = [];
      return;
    }

    const next = [...recentDrillScoresRef.current.slice(-11), liveDrillScore];
    recentDrillScoresRef.current = next;
  }, [phase, drillFocus, liveDrillScore]);

  // --- Camera lifecycle ---
  const getAdaptiveConstraints = useCallback((): MediaStreamConstraints => {
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    const idealWidth = isMobile ? 640 : 1280;
    const idealHeight = isMobile ? 480 : 720;
    const idealFps = isMobile ? 24 : 30;

    return {
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: idealWidth },
        height: { ideal: idealHeight },
        frameRate: { ideal: idealFps, max: 30 },
        aspectRatio: { ideal: 16 / 9 },
      },
      audio: false,
    };
  }, []);

  const startCamera = useCallback(async () => {
    setCameraStatus("requesting");
    setCameraIssue(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setCameraIssue({
        title: "Browser not supported",
        message: "Your browser does not support camera access. Use latest Chrome or Edge.",
      });
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setCameraStatus("error");
      setCameraIssue({
        title: "HTTPS required",
        message: "Camera access requires HTTPS on mobile browsers. Open Naachly using a secure https URL.",
      });
      return;
    }

    try {
      let stream = await navigator.mediaDevices.getUserMedia(getAdaptiveConstraints());

      // Fallback for devices that reject facingMode or strict constraints.
      if (!stream.getVideoTracks().length) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const firstVideoInput = devices.find((device) => device.kind === "videoinput");
        if (firstVideoInput) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: firstVideoInput.deviceId } },
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      setCameraStream(stream);
      setCameraReady(true);
      setCameraStatus("ready");
    } catch (err) {
      console.error("Camera start failed:", err);
      setCameraReady(false);
      setCameraStatus("error");
      setCameraIssue(mapCameraError(err));

      // Last-chance fallback with minimal constraints for older mobile/Windows drivers.
      if ((err as DOMException)?.name === "OverconstrainedError") {
        try {
          const minimalStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          streamRef.current = minimalStream;
          setCameraStream(minimalStream);
          setCameraReady(true);
          setCameraStatus("ready");
          setCameraIssue(null);
        } catch {
          // Keep mapped issue from the primary failure.
        }
      }
    }
  }, [getAdaptiveConstraints]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraStream(null);
    setCameraReady(false);
    setCameraStatus("idle");
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }
    setViewSwapped(false);
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraReady) {
      stopCamera();
      stopDetection();
    } else {
      startCamera();
    }
  }, [cameraReady, stopCamera, startCamera, stopDetection]);

  const clearRecordedVideoUrl = useCallback(() => {
    if (recordedVideoUrlRef.current) {
      URL.revokeObjectURL(recordedVideoUrlRef.current);
      recordedVideoUrlRef.current = null;
    }
    setUserPracticeVideoUrl(null);
  }, []);

  const stopUserRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    mediaRecorderRef.current = null;
  }, []);

  const startUserRecording = useCallback(() => {
    if (!cameraStream || typeof MediaRecorder === "undefined") return;
    if (mediaRecorderRef.current?.state === "recording") return;

    recordedChunksRef.current = [];

    const mimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const selectedMimeType = mimeCandidates.find((mime) => MediaRecorder.isTypeSupported(mime));

    try {
      const recorder = selectedMimeType
        ? new MediaRecorder(cameraStream, { mimeType: selectedMimeType })
        : new MediaRecorder(cameraStream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) return;
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMimeType || "video/webm",
        });
        const nextUrl = URL.createObjectURL(blob);
        if (recordedVideoUrlRef.current) {
          URL.revokeObjectURL(recordedVideoUrlRef.current);
        }
        recordedVideoUrlRef.current = nextUrl;
        setUserPracticeVideoUrl(nextUrl);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
    } catch {
      // Recording is optional and should not block practice flow.
    }
  }, [cameraStream]);

  // --- Playback controls ---
  const handlePlayPause = useCallback(() => {
    const video = instructorVideoRef.current;
    if (!video) {
      setIsPlaying((p) => !p);
      return;
    }
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    const video = instructorVideoRef.current;
    if (video) video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    const video = instructorVideoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }
    setCurrentTime((t) => Math.max(0, t + seconds));
  }, []);

  const handleRestart = useCallback(() => {
    const video = instructorVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play();
    }
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeed(newSpeed);
    const video = instructorVideoRef.current;
    if (video) video.playbackRate = newSpeed;
  }, []);

  const handleLoopToggle = useCallback(() => {
    setIsLooping((l) => {
      const video = instructorVideoRef.current;
      if (video) video.loop = !l;
      return !l;
    });
  }, []);

  useEffect(() => {
    const video = instructorVideoRef.current;
    if (video) video.loop = isLooping;
  }, [isLooping]);

  const handleTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  useEffect(() => {
    if (!drillFocus) return;

    let nextTarget = drillTarget ?? 70;
    let nextDuration = 90;

    if (drillId) {
      const storedDrill = getStoredDrills(40).find((drill) => drill.id === drillId);
      if (storedDrill) {
        nextTarget = drillTarget ?? storedDrill.targetScore;
        nextDuration = storedDrill.durationSeconds;
      }
    }

    setResolvedDrillTarget(nextTarget);
    setDrillDurationSeconds(nextDuration);
  }, [drillFocus, drillId, drillTarget]);

  // --- Phase transitions ---
  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setPhase("dancing");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!shouldAutoStart || phase !== "calibration" || autoStartRequestedRef.current) return;
    autoStartRequestedRef.current = true;
    void startCamera();
  }, [phase, shouldAutoStart, startCamera]);

  useEffect(() => {
    if (!shouldAutoStart || phase !== "calibration" || autoStartPhaseStartedRef.current) return;

    if (cameraReady) {
      autoStartPhaseStartedRef.current = true;
      setPhase("dancing");
      return;
    }

    if (cameraStatus === "error") {
      autoStartPhaseStartedRef.current = true;
      setPhase("dancing");
    }
  }, [cameraReady, cameraStatus, phase, shouldAutoStart]);

  const finishSession = useCallback(async () => {
    stopDetection();
    stopUserRecording();
    clearInterval(elapsedTimerRef.current);
    clearInterval(distanceCheckRef.current);

    // Cleanup audio and voice
    audioEngineRef.current?.disconnect();
    voiceCoachRef.current?.destroy();

    // Calculate final scores
    const routineDuration = routine?.duration_seconds || 60;
    const finalScores = getFinalScores(elapsed, routineDuration);

    // Use real scores only — no fake fallback. If detection didn't work, scores are 0.
    const accuracy = finalScores.accuracy;
    const consistency = finalScores.consistency;
    const completion = finalScores.completion;
    const weakestPart = Object.entries(finalScores.bodyPartScores)
      .sort((a, b) => a[1] - b[1])[0]?.[0];
    const replaySegments = buildReplaySegments({
      avgAngleDiffHistory: poseMetrics.avgAngleDiffHistory,
      sessionSeconds: Math.max(elapsed, 1),
      weakBodyPart: weakestPart,
    });

    const drillCompletion = evaluateDrillCompletions(finalScores.bodyPartScores);

    let generatedDrill = buildWeakSpotDrill({
      bodyPartScores: finalScores.bodyPartScores,
      metrics: poseMetrics,
      styleSlug,
    });

    const isFocusedServerMode = Boolean(drillFocus && drillId);

    if (drillCompletion.completed.length > 0 && !isFocusedServerMode) {
      const selectedCompleted = drillId
        ? drillCompletion.completed.find((drill) => drill.id === drillId)
        : null;
      const latestCompleted = selectedCompleted || drillCompletion.completed[0];
      const achieved = finalScores.bodyPartScores[latestCompleted.bodyPart] ?? latestCompleted.targetScore;
      generatedDrill = buildPromotedDrill(latestCompleted, achieved);
    }

    let focusedDrillSummary: FocusedDrillSummary | null = null;
    let focusedTrackedDrill: ReturnType<typeof getStoredDrills>[number] | null = null;
    if (drillFocus) {
      const achievedScore = Math.round(finalScores.bodyPartScores[drillFocus] ?? 0);
      const trackedDrill = drillId ? getStoredDrills(40).find((drill) => drill.id === drillId) : null;
      focusedTrackedDrill = trackedDrill || null;
      const trackedStreak = trackedDrill?.currentStreak ?? 0;
      const trackedCompleted = Boolean(trackedDrill?.completedAt);
      const hitTarget = achievedScore >= resolvedDrillTarget;

      focusedDrillSummary = {
        active: true,
        bodyPart: drillFocus,
        targetScore: resolvedDrillTarget,
        achievedScore,
        hitTarget,
        streak: trackedStreak,
        completed: trackedCompleted,
        serverVerified: false,
      };
    }

    const autoCompletedDrill = Boolean(drillFocus && autoCompleteTriggeredRef.current);

    if (focusedDrillSummary?.hitTarget && drillId && routine?.id && isUuid(drillId) && isUuid(routine.id)) {
      const verified = await submitSignedDrillCompletion({
        drillId,
        routineId: routine.id,
        styleSlug,
        routineSlug,
        bodyPart: focusedDrillSummary.bodyPart,
        targetScore: focusedDrillSummary.targetScore,
        achievedScore: focusedDrillSummary.achievedScore,
        autoCompleted: autoCompletedDrill,
        completionSource: autoCompletedDrill ? "auto-hold" : "manual-end",
        comparedFrames,
        bodyPartSamples: bodyPartSampleCount,
        stableSamples: recentDrillScores.length,
      });

      if (verified) {
        focusedDrillSummary = {
          ...focusedDrillSummary,
          streak: Math.min(3, verified.verifiedHits),
          completed: verified.verifiedCompleted,
          serverVerified: true,
        };

        if (verified.verifiedCompleted && focusedTrackedDrill) {
          generatedDrill = buildPromotedDrill(focusedTrackedDrill, focusedDrillSummary.achievedScore);
        }
      }
    }

    setRecommendedDrill(generatedDrill);
    const savedGeneratedDrill = saveDrill({ ...generatedDrill, styleSlug, routineSlug });

    // Adjust difficulty
    const diffResult = adjustDifficulty(accuracy);
    setDifficultyResult(diffResult);

    // Save session & update streak
    updateStreak();
    if (routine) {
      saveSession({
        routineId: routine.id,
        routineTitle: routine.title,
        styleSlug,
        accuracy,
        consistency,
        completion,
        elapsed,
      });
    }

    setResultScores({
      accuracy,
      consistency,
      completion,
      bodyPartScores: Object.keys(finalScores.bodyPartScores).length > 0
        ? finalScores.bodyPartScores
        : {},
      feedbackNotes:
        accuracy === 0
          ? [
              "No pose data was captured during this session.",
              "Make sure your full body is visible to the camera.",
              "Try practicing with an instructor video for real scoring.",
            ]
          : [
              ...drillCompletion.streakProgress
                .filter((drill) => !drill.completedAt)
                .map(
                  (drill) =>
                    `Drill streak: ${drill.title} ${drill.currentStreak}/3 (target ${drill.targetScore})`
                ),
              ...drillCompletion.completed.map(
                (drill) => `Drill completed: ${drill.title} (target ${drill.targetScore})`
              ),
                ...(focusedDrillSummary?.active
                  ? [
                      focusedDrillSummary.hitTarget
                        ? `Focused drill target hit: ${focusedDrillSummary.achievedScore}/${focusedDrillSummary.targetScore || "custom"}`
                        : `Focused drill target missed: ${focusedDrillSummary.achievedScore}/${focusedDrillSummary.targetScore || "custom"}`,
                      ...(focusedDrillSummary.serverVerified
                        ? ["Progress verified by signed server events."]
                        : []),
                    ]
                  : []),
              ...(autoCompletedDrill ? ["Auto-complete triggered after stable target hold."] : []),
              "Your movements were tracked against the instructor.",
              "Keep practicing to improve your accuracy!",
            ],
        replaySegments,
        focusedDrillSummary,
        generatedDrillId: savedGeneratedDrill.id,
    });

      void syncDrillCatalogSnapshot();

    setPhase("results");
    stopCamera();
  }, [
    stopDetection,
    stopCamera,
    elapsed,
    getFinalScores,
    routine,
    styleSlug,
    routineSlug,
    poseMetrics,
    drillFocus,
    drillId,
    resolvedDrillTarget,
    comparedFrames,
    bodyPartSampleCount,
    recentDrillScores.length,
    stopUserRecording,
  ]);

  useEffect(() => {
    if (phase !== "dancing" || !drillFocus) {
      drillReadySinceRef.current = null;
      setDrillReadyHoldSeconds(0);
      return;
    }

    if (!drillReady) {
      drillReadySinceRef.current = null;
      setDrillReadyHoldSeconds(0);
      return;
    }

    if (autoCompleteTriggeredRef.current) return;

    if (drillReadySinceRef.current === null) {
      drillReadySinceRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (drillReadySinceRef.current === null || autoCompleteTriggeredRef.current) return;

      const heldSeconds = (Date.now() - drillReadySinceRef.current) / 1000;
      setDrillReadyHoldSeconds(Math.min(drillAutoConfig.holdSeconds, heldSeconds));

      if (heldSeconds >= drillAutoConfig.holdSeconds) {
        autoCompleteTriggeredRef.current = true;
        setDrillReadyHoldSeconds(drillAutoConfig.holdSeconds);
        finishSession();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [phase, drillFocus, drillReady, finishSession, drillAutoConfig.holdSeconds]);

  const resetPractice = useCallback(() => {
    setPhase("calibration");
    setResultScores(null);
    setDifficultyResult(null);
    setCurrentTime(0);
    setDuration(0);
    setElapsed(0);
    setIsPlaying(false);
    setBeatCount(0);
    setBpm(0);
    setDistanceGuide(null);
    setResolvedDrillTarget(drillTarget ?? 70);
    setDrillDurationSeconds(90);
    setDrillReadyHoldSeconds(0);
    setCameraStatus("idle");
    setCameraIssue(null);
    setRecommendedDrill(null);
    autoStartRequestedRef.current = false;
    autoStartPhaseStartedRef.current = false;
    drillReadySinceRef.current = null;
    autoCompleteTriggeredRef.current = false;
    recentDrillScoresRef.current = [];
    clearRecordedVideoUrl();
  }, [clearRecordedVideoUrl, drillTarget]);

  // --- Start detection + engines when dancing begins ---
  const videoUrl = routine ? getRoutineVideoUrl(routine.id) : null;

  // Warm up MediaPipe so camera-to-score startup is faster on slower networks.
  useEffect(() => {
    import("@mediapipe/tasks-vision").catch(() => {
      // Non-fatal: startDetection still has its own fallback path.
    });
  }, []);

  useEffect(() => {
    if (phase !== "dancing") return;

    startUserRecording();

    // Start pose detection
    const detectTimer = setTimeout(() => {
      if (cameraReady && webcamVideoRef.current) {
        startDetection(webcamVideoRef.current);
      }
    }, 300);

    // Start elapsed timer
    setElapsed(0);
    setIsPlaying(true);
    elapsedTimerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    // Initialize audio engine
    try {
      const ae = createAudioEngine();
      audioEngineRef.current = ae;
      const tryConnect = () => {
        if (instructorVideoRef.current && !instructorVideoRef.current.paused) {
          ae.connect(instructorVideoRef.current);
          ae.onBeat = (count) => {
            setBeatCount(count);
            setBpm(ae.getBPM());
            setIsOnBeat(true);
            setTimeout(() => setIsOnBeat(false), 200);
          };
        } else {
          setTimeout(tryConnect, 500);
        }
      };
      setTimeout(tryConnect, 1000);
    } catch {
      // Audio engine not available
    }

    // Initialize voice coach
    const vc = createVoiceCoach({
      globalCooldown: 3500,
      partCooldown: 8000,
    });
    voiceCoachRef.current = vc;

    // Video playback
    if (videoUrl && instructorVideoRef.current) {
      const video = instructorVideoRef.current;
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      const routineDuration = routine?.duration_seconds || 60;
      setDuration(routineDuration);

      const timeInterval = setInterval(() => {
        setCurrentTime((t) => {
          if (t >= routineDuration) {
            clearInterval(timeInterval);
            return routineDuration;
          }
          return t + 1;
        });
      }, 1000);

      return () => {
        clearTimeout(detectTimer);
        clearInterval(elapsedTimerRef.current);
        clearInterval(timeInterval);
        clearInterval(distanceCheckRef.current);
      };
    }

    return () => {
      clearTimeout(detectTimer);
      clearInterval(elapsedTimerRef.current);
      clearInterval(distanceCheckRef.current);
      stopUserRecording();
    };
  }, [phase, cameraReady, startDetection, routine?.duration_seconds, startUserRecording, stopUserRecording, videoUrl]);

  useEffect(() => {
    return () => {
      stopUserRecording();
      if (recordedVideoUrlRef.current) {
        URL.revokeObjectURL(recordedVideoUrlRef.current);
      }
    };
  }, [stopUserRecording]);

  // Keep webcam element bound to the latest stream in dancing mode.
  useEffect(() => {
    const video = webcamVideoRef.current;
    if (!video || !cameraStream) return;

    if (video.srcObject !== cameraStream) {
      video.srcObject = cameraStream;
    }

    video.play().catch(() => {
      // Playback may require user gesture on some mobile browsers.
    });
  }, [cameraStream, phase, viewSwapped]);

  // Distance guidance check (every 2 seconds during dancing)
  useEffect(() => {
    if (phase !== "dancing") return;
    distanceCheckRef.current = setInterval(() => {
      if (landmarks && landmarks.length > 0) {
        const guide = getDistanceGuidance(landmarks);
        setDistanceGuide(guide);
      }
    }, 2000);
    return () => clearInterval(distanceCheckRef.current);
  }, [phase, landmarks]);

  // Voice coaching on feedback messages
  useEffect(() => {
    if (
      phase === "dancing" &&
      voiceEnabled &&
      voiceCoachRef.current &&
      feedbackMessages.length > 0
    ) {
      const latest = feedbackMessages[feedbackMessages.length - 1];
      voiceCoachRef.current.speak(
        latest.message,
        null,
        latest.type === "praise" ? "praise" : latest.type === "error" ? "error" : "warning"
      );
    }
  }, [phase, voiceEnabled, feedbackMessages]);

  // Auto-finish when time is up
  useEffect(() => {
    if (phase === "dancing" && duration > 0 && currentTime >= duration) {
      finishSession();
    }
  }, [phase, currentTime, duration, finishSession]);

  // === Conditional return AFTER all hooks ===
  if (!style || !routine) return notFound();

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden">
      {/* Session History Modal */}
      <AnimatePresence>
        {showHistory && <SessionHistory onClose={() => setShowHistory(false)} />}
      </AnimatePresence>

      {/* Top bar */}
      <div className="shrink-0 relative z-[57] bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between h-12 px-4">
          <Link
            href={`/explore/${styleSlug}/${routineSlug}`}
            onClick={stopCamera}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Exit
          </Link>

          <div className="text-center">
            <p className="text-sm font-semibold text-white">{routine.title}</p>
            <p className="text-[10px] text-zinc-500">
              Practice Mode • {difficulty.emoji} {difficulty.label}
            </p>
            {drillFocus && (
              <p className="text-[10px] text-nred-400">
                Drill Focus: {drillFocus} • {isLooping ? "Loop On" : "Loop Off"} • {shouldAutoStart ? "Auto Start" : "Manual Start"}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {phase === "dancing" ? (
              <>
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  📊
                </button>
                <button
                  onClick={finishSession}
                  className="text-sm text-nred-500 font-semibold hover:text-nred-400 transition-colors"
                >
                  End Session
                </button>
              </>
            ) : (
              <div className="w-16" />
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className={cn("flex-1 relative min-h-0", phase === "results" ? "overflow-y-auto" : "overflow-hidden")}>
        {/* ===== CALIBRATION PHASE ===== */}
        {phase === "calibration" && (
          <CalibrationScreen
            cameraReady={cameraReady}
            videoRef={webcamVideoRef}
            stream={cameraStream}
            onEnableCamera={startCamera}
            onStart={startCountdown}
            cameraStatus={cameraStatus}
            cameraIssue={cameraIssue}
            onRetryCamera={startCamera}
            onContinueWithoutCamera={startCountdown}
          />
        )}

        {/* ===== COUNTDOWN PHASE ===== */}
        <CountdownOverlay count={countdown} visible={phase === "countdown"} />

        {/* ===== DANCING PHASE ===== */}
        {phase === "dancing" && (
          <>
            {/* Instructor video stays mounted; only layout changes to avoid pause/reset on swap */}
            <VideoStage
              ref={instructorVideoRef}
              videoUrl={routine ? getRoutineVideoUrl(routine.id) : null}
              gradientFrom={style.gradient_from}
              gradientTo={style.gradient_to}
              playbackRate={speed}
              isPlaying={isPlaying}
              className={cn(
                viewSwapped
                  ? "!inset-auto fixed bottom-24 right-3 z-[55] w-[120px] h-[76px] sm:w-[220px] sm:h-[138px] rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-black/60"
                  : "z-[54]"
              )}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => {
                if (!isLooping) finishSession();
              }}
            />

            {viewSwapped && (
              <button
                type="button"
                onClick={() => setViewSwapped(false)}
                className="fixed bottom-24 right-3 z-[56] w-[120px] h-[76px] sm:w-[220px] sm:h-[138px]"
                aria-label="Swap back to instructor main view"
              />
            )}

            <AnimatePresence>
              {webcamVisible && cameraReady && (
                viewSwapped ? (
                  <motion.div
                    key="webcam-main"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[53] bg-black"
                  >
                    <video
                      ref={webcamVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <SkeletonCanvas
                      landmarks={landmarks}
                      comparison={comparison}
                      mirrored={true}
                      showShadowGuide={shadowMode}
                    />
                  </motion.div>
                ) : (
                  <motion.button
                    key="webcam-pip"
                    type="button"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    onClick={() => setViewSwapped(true)}
                    className="fixed bottom-24 right-3 z-[55] w-[100px] h-[75px] sm:w-[180px] sm:h-[135px] rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-black/60 active:scale-95 transition-transform"
                  >
                    <video
                      ref={webcamVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <SkeletonCanvas
                      landmarks={landmarks}
                      comparison={comparison}
                      mirrored={true}
                      showShadowGuide={shadowMode}
                    />
                    <span className="absolute bottom-1 left-1.5 text-[8px] bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-zinc-300 pointer-events-none">
                      You
                    </span>
                  </motion.button>
                )
              )}
            </AnimatePresence>

            {/* AI feedback panel (top-left) */}
            <AIFeedbackPanel
              posture={liveScores.posture}
              timing={liveScores.timing}
              energy={liveScores.energy}
              confidence={liveScores.confidence}
              overall={liveScores.overall}
              feedbackMessages={feedbackMessages}
              bodyVisible={bodyVisible}
              detectionMode={detectionMode}
              beatCount={beatCount}
              bpm={bpm}
              isOnBeat={isOnBeat}
              distanceGuide={distanceGuide}
              voiceEnabled={voiceEnabled}
              onToggleVoice={() => {
                setVoiceEnabled((v) => {
                  const next = !v;
                  voiceCoachRef.current?.setEnabled(next);
                  return next;
                });
              }}
            />

            {drillFocus && (
              <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[55] w-[300px] max-w-[90vw]">
                <div className="rounded-xl border border-nred-500/30 bg-black/70 backdrop-blur-sm px-3 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-nred-300">
                      Drill Session Mode: {drillFocus}
                    </p>
                    <span className={cn("text-[10px] font-semibold", drillReady ? "text-emerald-300" : "text-zinc-300")}>
                      {drillReady ? "Ready to Complete" : "In Progress"}
                    </span>
                  </div>

                  {drillReady && !autoCompleteTriggeredRef.current && (
                    <p className="text-[10px] text-emerald-200 mb-2">
                      Auto rule {drillAutoConfig.label}: score {drillRequiredScoreForAutoComplete}+ for {drillAutoConfig.holdSeconds}s
                      {" • "}
                      Completing in {Math.max(0, Math.ceil(drillAutoConfig.holdSeconds - drillReadyHoldSeconds))}s
                    </p>
                  )}
                  {!drillReady && (
                    <p className="text-[10px] text-zinc-300 mb-2">
                      Signal: {Math.min(comparedFrames, drillAutoConfig.minComparedFrames)}/{drillAutoConfig.minComparedFrames} frames,
                      {" "}
                      {Math.min(bodyPartSampleCount, drillAutoConfig.minBodyPartSamples)}/{drillAutoConfig.minBodyPartSamples} samples,
                      {" "}
                      stability {Math.min(recentDrillScores.length, drillAutoConfig.minStableSamples)}/{drillAutoConfig.minStableSamples}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-300 mb-1">
                        <span>Time</span>
                        <span>
                          {Math.min(elapsed, drillDurationSeconds)}s / {drillDurationSeconds}s
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-nred-400/80 transition-all" style={{ width: `${drillTimeProgress}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-300 mb-1">
                        <span>Score</span>
                        <span>
                          {liveDrillScore} / {resolvedDrillTarget}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            liveDrillScore >= resolvedDrillTarget ? "bg-emerald-400/90" : "bg-amber-400/90"
                          )}
                          style={{ width: `${drillScoreProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Camera controls (top-right) */}
            <CameraControls
              cameraOn={cameraReady}
              webcamVisible={webcamVisible}
              swapped={viewSwapped}
              shadowMode={shadowMode}
              onToggleCamera={toggleCamera}
              onToggleWebcam={() => setWebcamVisible((v) => !v)}
              onToggleSwap={() => {
                if (!cameraReady) return;
                setViewSwapped((value) => !value);
              }}
              onToggleShadowMode={() => setShadowMode((value) => !value)}
            />

            {/* Playback controls (bottom bar) */}
            <PlaybackControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              speed={speed}
              isLooping={isLooping}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onSkip={handleSkip}
              onRestart={handleRestart}
              onSpeedChange={handleSpeedChange}
              onLoopToggle={handleLoopToggle}
            />

            {/* Elapsed timer overlay */}
            <div className="fixed top-16 right-14 z-[55]">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 mr-24">
                <span className="text-xs font-mono text-zinc-400">
                  {Math.floor(elapsed / 60)}:
                  {(elapsed % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </>
        )}

        {/* ===== RESULTS PHASE ===== */}
        {phase === "results" && resultScores && (
          <SessionResults
            accuracy={resultScores.accuracy}
            consistency={resultScores.consistency}
            completion={resultScores.completion}
            bodyPartScores={resultScores.bodyPartScores}
            feedbackNotes={resultScores.feedbackNotes}
            replaySegments={resultScores.replaySegments}
            routineVideoUrl={videoUrl}
            styleSlug={styleSlug}
            routineSlug={routineSlug}
            routineTitle={routine.title}
            onPracticeAgain={resetPractice}
            metrics={poseMetrics}
            difficultyResult={difficultyResult}
            recommendedDrill={recommendedDrill}
            recommendedDrillId={resultScores.generatedDrillId}
            focusedDrillSummary={resultScores.focusedDrillSummary}
            userPracticeVideoUrl={userPracticeVideoUrl}
          />
        )}
      </div>
    </div>
  );
}
