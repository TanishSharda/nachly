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

const MIN_VISIBILITY = 0.5;

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
                const lms = result.landmarks[0] as PoseLandmark[];
                setLandmarks(lms);

                // Check body visibility
                const visibilitySummary = getPartialVisibilitySummary(lms, MIN_VISIBILITY);
                const isBodyVisible = visibilitySummary.hasAny;
                bodyVisibleRef.current = isBodyVisible;
                setBodyVisible(isBodyVisible);

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
                  if (now - lastFeedbackTimeRef.current > 4000) {
                    lastFeedbackTimeRef.current = now;
                    setFeedbackMessages((prev) => [
                      ...prev.slice(-10),
                      {
                        type: "error",
                        message: "I can’t see enough body landmarks yet — adjust camera and keep moving.",
                        timestamp: now,
                      },
                    ]);
                  }
                } else {
                  // Partial-body friendly scoring: estimate mirrored side when possible.
                  const angles = extractAdaptiveAngles(lms, 0.45, true);
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
                    landmarks: lms,
                    currentAngles: angles,
                    previousAngles,
                    motionHistory: motionHistoryRef.current,
                    visibilityHistory: visibilityHistoryRef.current,
                  });

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
                    setFeedbackMessages((prev) => [
                      ...prev.slice(-10),
                      {
                        type: cue.type,
                        message: `${cue.message}${visibilityHint}`,
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
                setLiveScores((prev) => ({
                  posture: Math.max(0, Math.round(prev.posture * 0.88)),
                  timing: Math.max(0, Math.round(prev.timing * 0.88)),
                  energy: Math.max(0, Math.round(prev.energy * 0.88)),
                  confidence: Math.max(0, Math.round(prev.confidence * 0.82)),
                  overall: Math.max(0, Math.round(prev.overall * 0.86)),
                }));

                const now = Date.now();
                if (now - lastFeedbackTimeRef.current > 4000) {
                  lastFeedbackTimeRef.current = now;
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
