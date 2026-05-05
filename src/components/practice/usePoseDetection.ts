"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { PoseLandmark, FrameComparison, JointAngle } from "@/types/database";
import {
  RollingBuffer,
  createSessionMetrics,
  calculateFinalScores,
  updateMetrics,
  type SessionMetrics,
} from "@/lib/ai/pose-engine";
import { extractAdaptiveAngles, getPartialVisibilitySummary } from "@/lib/ai/partial-body";
import { computeCoachScores, getCoachCue } from "@/lib/ai/coach-metrics";
import { getDifficulty } from "@/lib/ai/difficulty";
import { createPoseSmoother, interpolateLandmarks, type PoseSmoother } from "@/lib/ai/pose-filters";
import { normalizeLandmarks } from "@/lib/ai/pose-normalization";

const MIN_VISIBILITY = 0.5;
const QUALITY_CHECK_INTERVAL_MS = 1000;
const LOW_LIGHT_THRESHOLD = 0.18;
const BRIGHT_LIGHT_THRESHOLD = 0.9;
const ALIGNMENT_THRESHOLD = 0.18;
const MAX_VISIBILITY_WARNINGS = 5;

function getLightingScore(video: HTMLVideoElement, canvas: HTMLCanvasElement): number | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const width = 32;
  const height = 18;
  canvas.width = width;
  canvas.height = height;

  try {
    ctx.drawImage(video, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    return total / (data.length / 4) / 255;
  } catch {
    return null;
  }
}

function getBodyCenterX(landmarks: PoseLandmark[]): number | null {
  const ls = landmarks[11];
  const rs = landmarks[12];
  if (ls && rs && ls.visibility >= 0.4 && rs.visibility >= 0.4) {
    return (ls.x + rs.x) / 2;
  }

  const lh = landmarks[23];
  const rh = landmarks[24];
  if (lh && rh && lh.visibility >= 0.4 && rh.visibility >= 0.4) {
    return (lh.x + rh.x) / 2;
  }

  return null;
}

interface FeedbackMessage {
  type: "error" | "warning" | "praise";
  message: string;
  timestamp: number;
}

export type DetectionMode = "loading" | "real" | "demo";

interface PoseDetectionResult {
  landmarks: PoseLandmark[] | null;
  comparison: FrameComparison | null;
  metrics: SessionMetrics;
  liveScores: {
    posture: number;
    timing: number;
    energy: number;
    confidence: number;
    overall: number;
  };
  feedbackMessages: FeedbackMessage[];
  isReady: boolean;
  bodyVisible: boolean;
  detectionMode: DetectionMode;
  error: string | null;
  startDetection: (videoEl: HTMLVideoElement) => void;
  stopDetection: () => void;
  getFinalScores: (elapsedSeconds: number, totalDuration: number) => ReturnType<typeof calculateFinalScores>;
}

export function usePoseDetection(
  styleSlug: string,
  active: boolean
): PoseDetectionResult {
  const [landmarks, setLandmarks] = useState<PoseLandmark[] | null>(null);
  const [comparison, setComparison] = useState<FrameComparison | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(false);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("loading");
  const [error] = useState<string | null>(null);
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const [liveScores, setLiveScores] = useState({
    posture: 0,
    timing: 0,
    energy: 0,
    confidence: 0,
    overall: 0,
  });

  const metricsRef = useRef(createSessionMetrics());
  const bufferRef = useRef(new RollingBuffer(10));
  const frameCountRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastFeedbackTimeRef = useRef(0);
  const visibilityWarningCountRef = useRef(0);
  const poseLandmarkerRef = useRef<unknown>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bodyVisibleRef = useRef(false);
  const activeRef = useRef(active);
  const lastDetectionTsRef = useRef(0);
  const detectionIntervalMsRef = useRef(33);
  const previousAnglesRef = useRef<Record<string, JointAngle> | null>(null);
  const motionHistoryRef = useRef<number[]>([]);
  const visibilityHistoryRef = useRef<number[]>([]);
  const thresholdsRef = useRef({ perfectMax: 40, gentleMax: 62 });
  const difficultyLevelRef = useRef("beginner");
  const smootherRef = useRef<PoseSmoother | null>(null);
  const lastStableLandmarksRef = useRef<PoseLandmark[] | null>(null);
  const qualityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastQualityCheckRef = useRef(0);
  const lightingStatusRef = useRef<"ok" | "low" | "bright">("ok");
  const alignmentStatusRef = useRef<"ok" | "left" | "right">("ok");

  // Keep activeRef in sync
  useEffect(() => {
    activeRef.current = active;
  }, [active]);


  // Demo mode fallback — no fake scores, just shows it's demo
  const runDemoMode = useCallback(() => {
    if (!active) return;

    setDetectionMode("demo");
    setIsReady(true);
    setBodyVisible(false);
    setLiveScores({ posture: 0, timing: 0, energy: 0, confidence: 0, overall: 0 });

    const now = Date.now();
    setFeedbackMessages([
      {
        type: "warning",
        message: "Demo mode — pose detection model not available. Scores are disabled.",
        timestamp: now,
      },
    ]);
  }, [active]);

  // Try to load MediaPipe (gracefully falls back to demo mode)
  const startDetection = useCallback(
    (videoEl: HTMLVideoElement) => {
      videoRef.current = videoEl;
      metricsRef.current = createSessionMetrics();
      bufferRef.current = new RollingBuffer(10);
      frameCountRef.current = 0;
      lastFeedbackTimeRef.current = Date.now();
      setFeedbackMessages([]);
      setLiveScores({ posture: 0, timing: 0, energy: 0, confidence: 0, overall: 0 });
      setDetectionMode("loading");
      setIsReady(false);
      setBodyVisible(false);
      bodyVisibleRef.current = false;
      lastDetectionTsRef.current = 0;
      previousAnglesRef.current = null;
      motionHistoryRef.current = [];
      visibilityHistoryRef.current = [];
      smootherRef.current = createPoseSmoother({ minCutoff: 1.2, beta: 0.15, dCutoff: 1.0 });
      lastStableLandmarksRef.current = null;
      visibilityWarningCountRef.current = 0;
      qualityCanvasRef.current = document.createElement("canvas");
      lastQualityCheckRef.current = 0;
      lightingStatusRef.current = "ok";
      alignmentStatusRef.current = "ok";
      const difficulty = getDifficulty();
      thresholdsRef.current = {
        perfectMax: difficulty.perfectMax,
        gentleMax: difficulty.gentleMax,
      };
      difficultyLevelRef.current = difficulty.level;
      detectionIntervalMsRef.current = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
        ? 50
        : 33;

      // Attempt MediaPipe Pose initialization
      (async () => {
        const MAX_INIT_RETRIES = 3;
        let lastError: unknown = null;

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let poseLandmarker: any = null;

          for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
            try {
              console.log(`[PoseDetection] Init attempt ${attempt}/${MAX_INIT_RETRIES}`);
              const vision = await import("@mediapipe/tasks-vision");
              const { PoseLandmarker, FilesetResolver } = vision;

              const filesetResolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
              );

              const MODEL_URL =
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

              // Try GPU first, fall back to CPU.
              try {
                poseLandmarker = await PoseLandmarker.createFromOptions(
                  filesetResolver,
                  {
                    baseOptions: {
                      modelAssetPath: MODEL_URL,
                      delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                  }
                );
              } catch (gpuError) {
                console.warn("[PoseDetection] GPU failed, falling back to CPU:", gpuError);
                poseLandmarker = await PoseLandmarker.createFromOptions(
                  filesetResolver,
                  {
                    baseOptions: {
                      modelAssetPath: MODEL_URL,
                      delegate: "CPU",
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                  }
                );
              }

              break;
            } catch (err) {
              lastError = err;
              if (attempt < MAX_INIT_RETRIES) {
                await new Promise((resolve) => {
                  setTimeout(resolve, 500 * attempt);
                });
              }
            }
          }

          if (!poseLandmarker) {
            throw lastError ?? new Error("Pose model initialization failed");
          }

          poseLandmarkerRef.current = poseLandmarker;
          setDetectionMode("real");
          setIsReady(true);

          // Add initial message
          const now = Date.now();
          lastFeedbackTimeRef.current = now;
          setFeedbackMessages([
            {
              type: "warning",
              message: "Show whichever body parts are visible. I will score what I can see.",
              timestamp: now,
            },
          ]);

          // Real detection loop
          const detect = () => {
            if (!activeRef.current || !videoRef.current || videoRef.current.readyState < 2) {
              animFrameRef.current = requestAnimationFrame(detect);
              return;
            }

            const nowTs = performance.now();
            if (nowTs - lastDetectionTsRef.current < detectionIntervalMsRef.current) {
              animFrameRef.current = requestAnimationFrame(detect);
              return;
            }
            lastDetectionTsRef.current = nowTs;

            frameCountRef.current++;
            try {
              const result = poseLandmarker.detectForVideo(
                videoRef.current,
                nowTs
              );

              if (result.landmarks && result.landmarks.length > 0) {
                const rawLandmarks = result.landmarks[0] as PoseLandmark[];
                const smoothedLandmarks = smootherRef.current
                  ? smootherRef.current.smooth(rawLandmarks, nowTs)
                  : rawLandmarks;
                const stableLandmarks = interpolateLandmarks(
                  smoothedLandmarks,
                  lastStableLandmarksRef.current,
                  0.45
                );
                lastStableLandmarksRef.current = stableLandmarks;
                setLandmarks(stableLandmarks);

                // Check body visibility
                const visibilitySummary = getPartialVisibilitySummary(smoothedLandmarks, MIN_VISIBILITY);
                const isBodyVisible = visibilitySummary.hasUpper && visibilitySummary.hasLower;
                bodyVisibleRef.current = isBodyVisible;
                setBodyVisible(isBodyVisible);
                if (isBodyVisible) {
                  visibilityWarningCountRef.current = 0;
                }

                // Periodic quality checks
                if (nowTs - lastQualityCheckRef.current > QUALITY_CHECK_INTERVAL_MS) {
                  lastQualityCheckRef.current = nowTs;
                  const canvas = qualityCanvasRef.current;
                  const video = videoRef.current;
                  if (canvas && video) {
                    const lightingScore = getLightingScore(video, canvas);
                    if (lightingScore !== null) {
                      if (lightingScore < LOW_LIGHT_THRESHOLD) {
                        lightingStatusRef.current = "low";
                      } else if (lightingScore > BRIGHT_LIGHT_THRESHOLD) {
                        lightingStatusRef.current = "bright";
                      } else {
                        lightingStatusRef.current = "ok";
                      }
                    }
                  }

                  const centerX = getBodyCenterX(stableLandmarks);
                  if (centerX !== null) {
                    if (centerX < 0.5 - ALIGNMENT_THRESHOLD) alignmentStatusRef.current = "left";
                    else if (centerX > 0.5 + ALIGNMENT_THRESHOLD) alignmentStatusRef.current = "right";
                    else alignmentStatusRef.current = "ok";
                  }
                }

                if (!isBodyVisible) {
                  // Nothing usable visible right now.
                  setComparison(null);
                  // Decay scores toward 0
                  setLiveScores((prev) => ({
                    posture: Math.max(0, Math.round(prev.posture * 0.9)),
                    timing: Math.max(0, Math.round(prev.timing * 0.9)),
                    energy: Math.max(0, Math.round(prev.energy * 0.9)),
                    confidence: Math.max(0, Math.round(prev.confidence * 0.9)),
                    overall: Math.max(0, Math.round(prev.overall * 0.9)),
                  }));

                  // Provide body visibility feedback every 4 seconds
                  const now = Date.now();
                  if (
                    now - lastFeedbackTimeRef.current > 4000 &&
                    visibilityWarningCountRef.current < MAX_VISIBILITY_WARNINGS
                  ) {
                    lastFeedbackTimeRef.current = now;
                    visibilityWarningCountRef.current += 1;
                    setFeedbackMessages((prev) => [
                      ...prev.slice(-10),
                      {
                        type: "error",
                        message: "Full body not visible yet — step back so head, arms, torso, and legs are in frame.",
                        timestamp: now,
                      },
                    ]);
                  }
                } else {
                  // Partial-body friendly scoring: estimate mirrored side when possible.
                  const angles = extractAdaptiveAngles(stableLandmarks, 0.45, true);
                  bufferRef.current.push(angles);
                  const previousAngles = previousAnglesRef.current;

                  let totalDiff = 0;
                  let activeJointCount = 0;
                  const jointScores: FrameComparison["jointScores"] = {};
                  const { perfectMax, gentleMax } = thresholdsRef.current;

                  if (previousAngles) {
                    for (const [jointName, current] of Object.entries(angles)) {
                      const prev = previousAngles[jointName];
                      if (!prev) continue;

                      const diff = Math.abs(current.angle - prev.angle);
                      const category =
                        diff > gentleMax ? "mistake" : diff > perfectMax ? "gentle" : "perfect";

                      jointScores[jointName] = { diff, category };
                      totalDiff += diff;
                      activeJointCount += 1;
                    }
                  }

                  const frameComparison: FrameComparison = {
                    overallScore:
                      activeJointCount > 0 ? Math.max(0, 1 - totalDiff / activeJointCount / 90) : 0,
                    jointScores,
                    activeJointCount,
                  };

                  setComparison(frameComparison);
                  if (frameComparison.activeJointCount > 0) {
                    updateMetrics(metricsRef.current, frameComparison);
                  }

                  const coach = computeCoachScores({
                    styleSlug,
                    difficultyLevel: difficultyLevelRef.current,
                    landmarks: stableLandmarks,
                    currentAngles: angles,
                    previousAngles,
                    motionHistory: motionHistoryRef.current,
                    visibilityHistory: visibilityHistoryRef.current,
                  });

                  void normalizeLandmarks(stableLandmarks, 0.3);

                  motionHistoryRef.current = [...motionHistoryRef.current.slice(-15), coach.motionMagnitude];
                  visibilityHistoryRef.current = [
                    ...visibilityHistoryRef.current.slice(-15),
                    coach.visibilityAverage,
                  ];
                  previousAnglesRef.current = angles;

                  setLiveScores(coach.scores);

                  const now = Date.now();
                  if (now - lastFeedbackTimeRef.current > 4500) {
                    lastFeedbackTimeRef.current = now;
                    const cue = getCoachCue(coach.scores);
                    let visibilityHint = "";
                    if (!visibilitySummary.hasUpper) {
                      visibilityHint = " I can’t see your upper body clearly, tilt camera up slightly.";
                    } else if (!visibilitySummary.hasLower) {
                      visibilityHint = " I can’t see your legs clearly, step back a little.";
                    }
                    let qualityHint = "";
                    if (lightingStatusRef.current === "low") {
                      qualityHint = " Lighting is low - move to a brighter area.";
                    } else if (lightingStatusRef.current === "bright") {
                      qualityHint = " Lighting is harsh - soften or reduce glare if possible.";
                    } else if (alignmentStatusRef.current === "left") {
                      qualityHint = " Move slightly right so you are centered.";
                    } else if (alignmentStatusRef.current === "right") {
                      qualityHint = " Move slightly left so you are centered.";
                    }
                    setFeedbackMessages((prev) => [
                      ...prev.slice(-10),
                      {
                        type: cue.type,
                        message: `${cue.message}${visibilityHint}${qualityHint}`,
                        timestamp: now,
                      },
                    ]);
                  }
                }
              } else {
                // No person detected at all
                setLandmarks(null);
                setComparison(null);
                setBodyVisible(false);
                bodyVisibleRef.current = false;
                previousAnglesRef.current = null;
                lastStableLandmarksRef.current = null;
                setLiveScores((prev) => ({
                  posture: Math.max(0, Math.round(prev.posture * 0.88)),
                  timing: Math.max(0, Math.round(prev.timing * 0.88)),
                  energy: Math.max(0, Math.round(prev.energy * 0.88)),
                  confidence: Math.max(0, Math.round(prev.confidence * 0.82)),
                  overall: Math.max(0, Math.round(prev.overall * 0.86)),
                }));

                const now = Date.now();
                if (
                  now - lastFeedbackTimeRef.current > 4000 &&
                  visibilityWarningCountRef.current < MAX_VISIBILITY_WARNINGS
                ) {
                  lastFeedbackTimeRef.current = now;
                  visibilityWarningCountRef.current += 1;
                  setFeedbackMessages((prev) => [
                    ...prev.slice(-10),
                    {
                      type: "error",
                      message: "No person detected — step into the camera view",
                      timestamp: now,
                    },
                  ]);
                }
              }
            } catch {
              // skip frame on error
            }

            animFrameRef.current = requestAnimationFrame(detect);
          };

          detect();
        } catch (err) {
          // MediaPipe not available — fall back to demo mode (no fake scores)
          console.error("[PoseDetection] MediaPipe failed to initialize:", err);
          setFeedbackMessages([
            {
              type: "warning",
              message: "Camera started, but AI model could not load. Switching to demo mode.",
              timestamp: Date.now(),
            },
          ]);
          runDemoMode();
        }
      })();
    },
    [runDemoMode, styleSlug]
  );

  const stopDetection = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    clearTimeout(animFrameRef.current);

    if (poseLandmarkerRef.current) {
      try {
        (poseLandmarkerRef.current as { close: () => void }).close();
      } catch {
        // ignore
      }
      poseLandmarkerRef.current = null;
    }

    setLandmarks(null);
    setComparison(null);
    setIsReady(false);
    setBodyVisible(false);
    bodyVisibleRef.current = false;
    lastStableLandmarksRef.current = null;
    setLiveScores({ posture: 0, timing: 0, energy: 0, confidence: 0, overall: 0 });
  }, []);

  const getFinalScores = useCallback(
    (elapsedSeconds: number, totalDuration: number) => {
      return calculateFinalScores(metricsRef.current, elapsedSeconds, totalDuration);
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(animFrameRef.current);
      if (poseLandmarkerRef.current) {
        try {
          (poseLandmarkerRef.current as { close: () => void }).close();
        } catch {
          // ignore
        }
      }
      lastStableLandmarksRef.current = null;
    };
  }, []);

  return {
    landmarks,
    comparison,
    metrics: metricsRef.current,
    liveScores,
    feedbackMessages,
    isReady,
    bodyVisible,
    detectionMode,
    error,
    startDetection,
    stopDetection,
    getFinalScores,
  };
}
