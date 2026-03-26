"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Keypoint = {
  x: number;
  y: number;
  confidence: number;
};

type ScoreValue = number | null;

type JointRule = {
  id: string;
  group: "upper" | "lower";
  label: string;
  points: [number, number, number];
  target: number;
  tolerance: number;
};

type LandmarkLite = {
  x: number;
  y: number;
  visibility?: number;
};

type PoseLandmarkerLike = {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => {
    landmarks?: LandmarkLite[][];
  };
  close?: () => void;
};

const IDX = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

const UPPER_INDICES = [
  IDX.LEFT_SHOULDER,
  IDX.RIGHT_SHOULDER,
  IDX.LEFT_ELBOW,
  IDX.RIGHT_ELBOW,
  IDX.LEFT_WRIST,
  IDX.RIGHT_WRIST,
] as const;

const LOWER_INDICES = [
  IDX.LEFT_HIP,
  IDX.RIGHT_HIP,
  IDX.LEFT_KNEE,
  IDX.RIGHT_KNEE,
  IDX.LEFT_ANKLE,
  IDX.RIGHT_ANKLE,
] as const;

const SKELETON_CONNECTIONS: Array<[number, number]> = [
  [IDX.LEFT_SHOULDER, IDX.RIGHT_SHOULDER],
  [IDX.LEFT_SHOULDER, IDX.LEFT_ELBOW],
  [IDX.LEFT_ELBOW, IDX.LEFT_WRIST],
  [IDX.RIGHT_SHOULDER, IDX.RIGHT_ELBOW],
  [IDX.RIGHT_ELBOW, IDX.RIGHT_WRIST],
  [IDX.LEFT_SHOULDER, IDX.LEFT_HIP],
  [IDX.RIGHT_SHOULDER, IDX.RIGHT_HIP],
  [IDX.LEFT_HIP, IDX.RIGHT_HIP],
  [IDX.LEFT_HIP, IDX.LEFT_KNEE],
  [IDX.LEFT_KNEE, IDX.LEFT_ANKLE],
  [IDX.RIGHT_HIP, IDX.RIGHT_KNEE],
  [IDX.RIGHT_KNEE, IDX.RIGHT_ANKLE],
];

const JOINT_RULES: JointRule[] = [
  {
    id: "left-elbow",
    group: "upper",
    label: "left elbow",
    points: [IDX.LEFT_SHOULDER, IDX.LEFT_ELBOW, IDX.LEFT_WRIST],
    target: 155,
    tolerance: 55,
  },
  {
    id: "right-elbow",
    group: "upper",
    label: "right elbow",
    points: [IDX.RIGHT_SHOULDER, IDX.RIGHT_ELBOW, IDX.RIGHT_WRIST],
    target: 155,
    tolerance: 55,
  },
  {
    id: "left-shoulder",
    group: "upper",
    label: "left shoulder",
    points: [IDX.LEFT_ELBOW, IDX.LEFT_SHOULDER, IDX.LEFT_HIP],
    target: 45,
    tolerance: 45,
  },
  {
    id: "right-shoulder",
    group: "upper",
    label: "right shoulder",
    points: [IDX.RIGHT_ELBOW, IDX.RIGHT_SHOULDER, IDX.RIGHT_HIP],
    target: 45,
    tolerance: 45,
  },
  {
    id: "left-knee",
    group: "lower",
    label: "left knee",
    points: [IDX.LEFT_HIP, IDX.LEFT_KNEE, IDX.LEFT_ANKLE],
    target: 170,
    tolerance: 45,
  },
  {
    id: "right-knee",
    group: "lower",
    label: "right knee",
    points: [IDX.RIGHT_HIP, IDX.RIGHT_KNEE, IDX.RIGHT_ANKLE],
    target: 170,
    tolerance: 45,
  },
  {
    id: "left-hip",
    group: "lower",
    label: "left hip",
    points: [IDX.LEFT_SHOULDER, IDX.LEFT_HIP, IDX.LEFT_KNEE],
    target: 165,
    tolerance: 50,
  },
  {
    id: "right-hip",
    group: "lower",
    label: "right hip",
    points: [IDX.RIGHT_SHOULDER, IDX.RIGHT_HIP, IDX.RIGHT_KNEE],
    target: 165,
    tolerance: 50,
  },
];

function calculateAngle(a: Keypoint, b: Keypoint, c: Keypoint) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((radians * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

function scoreFromAngleDiff(diff: number, tolerance: number) {
  return Math.max(0, Math.min(100, Math.round(100 - (diff / tolerance) * 100)));
}

function average(nums: number[]) {
  if (!nums.length) return null;
  const total = nums.reduce((sum, n) => sum + n, 0);
  return Math.round(total / nums.length);
}

function pairedIndex(index: number) {
  const pairs: Record<number, number> = {
    [IDX.LEFT_SHOULDER]: IDX.RIGHT_SHOULDER,
    [IDX.RIGHT_SHOULDER]: IDX.LEFT_SHOULDER,
    [IDX.LEFT_ELBOW]: IDX.RIGHT_ELBOW,
    [IDX.RIGHT_ELBOW]: IDX.LEFT_ELBOW,
    [IDX.LEFT_WRIST]: IDX.RIGHT_WRIST,
    [IDX.RIGHT_WRIST]: IDX.LEFT_WRIST,
    [IDX.LEFT_HIP]: IDX.RIGHT_HIP,
    [IDX.RIGHT_HIP]: IDX.LEFT_HIP,
    [IDX.LEFT_KNEE]: IDX.RIGHT_KNEE,
    [IDX.RIGHT_KNEE]: IDX.LEFT_KNEE,
    [IDX.LEFT_ANKLE]: IDX.RIGHT_ANKLE,
    [IDX.RIGHT_ANKLE]: IDX.LEFT_ANKLE,
  };
  return pairs[index];
}

function getBodyCenterX(points: (Keypoint | null)[]) {
  const shoulderLeft = points[IDX.LEFT_SHOULDER];
  const shoulderRight = points[IDX.RIGHT_SHOULDER];
  if (shoulderLeft && shoulderRight) {
    return (shoulderLeft.x + shoulderRight.x) / 2;
  }

  const hipLeft = points[IDX.LEFT_HIP];
  const hipRight = points[IDX.RIGHT_HIP];
  if (hipLeft && hipRight) {
    return (hipLeft.x + hipRight.x) / 2;
  }

  return null;
}

function estimateMirroredPoint(index: number, points: (Keypoint | null)[], threshold: number) {
  const pair = pairedIndex(index);
  if (pair === undefined) return null;

  const source = points[pair];
  if (!source || source.confidence < threshold) return null;

  const centerX = getBodyCenterX(points);
  if (centerX === null) return null;

  return {
    x: centerX + (centerX - source.x),
    y: source.y,
    confidence: Math.max(0.3, source.confidence * 0.65),
  } satisfies Keypoint;
}

function pickPoint(
  index: number,
  points: (Keypoint | null)[],
  threshold: number,
  allowMirrorEstimate: boolean
) {
  const point = points[index];
  if (point && point.confidence >= threshold) return point;
  if (!allowMirrorEstimate) return null;
  return estimateMirroredPoint(index, points, threshold);
}

export default function AdaptivePoseCoach() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef(0);
  const poseLandmarkerRef = useRef<PoseLandmarkerLike | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [threshold] = useState(0.5);
  const [upperScore, setUpperScore] = useState<ScoreValue>(null);
  const [lowerScore, setLowerScore] = useState<ScoreValue>(null);
  const [feedback, setFeedback] = useState("Let’s get started. I’ll score whichever body parts are visible.");
  const [showMirrorEstimate] = useState(true);

  const pointsFromLandmarks = useCallback((landmarks: LandmarkLite[]) => {
    const nextPoints: (Keypoint | null)[] = new Array(33).fill(null);
    for (let i = 0; i < landmarks.length; i += 1) {
      const lm = landmarks[i];
      nextPoints[i] = {
        x: lm.x,
        y: lm.y,
        confidence: lm.visibility ?? 0,
      };
    }
    return nextPoints;
  }, []);

  const drawOverlay = useCallback((canvas: HTMLCanvasElement, renderPoints: (Keypoint | null)[]) => {
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;
    if (!ctx || !video) return;

    const width = video.videoWidth || 960;
    const height = video.videoHeight || 540;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    for (const [aIdx, bIdx] of SKELETON_CONNECTIONS) {
      const a = renderPoints[aIdx];
      const b = renderPoints[bIdx];
      if (!a || !b) continue;

      const aVisible = a.confidence >= threshold;
      const bVisible = b.confidence >= threshold;
      const visible = aVisible && bVisible;

      ctx.beginPath();
      if (!visible) {
        ctx.setLineDash([6, 6]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = visible ? "#22c55e" : "#71717a";
      ctx.moveTo(a.x * width, a.y * height);
      ctx.lineTo(b.x * width, b.y * height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (let i = 0; i < renderPoints.length; i += 1) {
      const p = renderPoints[i];
      if (!p) continue;
      const visible = p.confidence >= threshold;

      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 5, 0, Math.PI * 2);
      ctx.fillStyle = visible ? "#22c55e" : "#71717a";
      ctx.fill();
    }
  }, [threshold]);

  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;

    async function init() {
      setLoading(true);
      setError("");
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 960 },
            height: { ideal: 540 },
          },
          audio: false,
        });

        if (!active) return;

        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
          await videoRef.current.play().catch(() => {});
        }

        const vision = await import("@mediapipe/tasks-vision");
        const { FilesetResolver, PoseLandmarker } = vision;

        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const modelAssetPath =
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

        let model: PoseLandmarkerLike;
        try {
          model = await PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath, delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        } catch {
          model = await PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        }

        if (!active) {
          model.close?.();
          return;
        }

        poseLandmarkerRef.current = model;
        setLoading(false);

        const loop = (ts: number) => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const poseLandmarker = poseLandmarkerRef.current;
          if (!video || !canvas || !poseLandmarker) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          if (ts - lastTsRef.current < 33) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }
          lastTsRef.current = ts;

          if (video.readyState >= 2) {
            const result = poseLandmarker.detectForVideo(video, ts);
            const landmarks = result?.landmarks?.[0] || null;

            if (!landmarks) {
              setUpperScore(null);
              setLowerScore(null);
              setFeedback("I’m ready when you are. Step in and I’ll score the parts I can see.");
            } else {
              const nextPoints = pointsFromLandmarks(landmarks);

              const upperJointScores: Array<{ label: string; score: number }> = [];
              const lowerJointScores: Array<{ label: string; score: number }> = [];
              const currentVisibleUpper = UPPER_INDICES.filter(
                (idx) => nextPoints[idx] && (nextPoints[idx] as Keypoint).confidence >= threshold
              ).length;
              const currentVisibleLower = LOWER_INDICES.filter(
                (idx) => nextPoints[idx] && (nextPoints[idx] as Keypoint).confidence >= threshold
              ).length;

              for (const rule of JOINT_RULES) {
                const a = pickPoint(rule.points[0], nextPoints, threshold, showMirrorEstimate);
                const b = pickPoint(rule.points[1], nextPoints, threshold, showMirrorEstimate);
                const c = pickPoint(rule.points[2], nextPoints, threshold, showMirrorEstimate);
                if (!a || !b || !c) continue;

                const angle = calculateAngle(a, b, c);
                const diff = Math.abs(angle - rule.target);
                const jointScore = scoreFromAngleDiff(diff, rule.tolerance);

                if (rule.group === "upper") {
                  upperJointScores.push({ label: rule.label, score: jointScore });
                } else {
                  lowerJointScores.push({ label: rule.label, score: jointScore });
                }
              }

              const upper = average(upperJointScores.map((x) => x.score));
              const lower = average(lowerJointScores.map((x) => x.score));
              setUpperScore(upper);
              setLowerScore(lower);

              const visibleHints: string[] = [];
              if (currentVisibleUpper <= 2) {
                visibleHints.push("I can’t see your upper body clearly yet — lift the camera a little.");
              }
              if (currentVisibleLower <= 2) {
                visibleHints.push("I can’t see your legs clearly — step back a bit.");
              }

              const candidates = [...upperJointScores, ...lowerJointScores].sort((a, b) => a.score - b.score);
              const weakest = candidates[0];

              let encouragement = "Nice flow!";
              const bothVisible = upper !== null && lower !== null;
              if (bothVisible && upper >= 80 && lower >= 80) {
                encouragement = "Great rhythm and control!";
              } else if (upper !== null && upper >= 75) {
                encouragement = "Good arm movement!";
              } else if (lower !== null && lower >= 75) {
                encouragement = "Solid lower-body timing!";
              }

              let correction = "";
              if (weakest && weakest.score < 70) {
                correction = `Try refining your ${weakest.label} angle a bit more.`;
              }

              if (visibleHints.length > 0) {
                setFeedback(`${encouragement} ${correction}`.trim() + ` ${visibleHints.join(" ")}`.trim());
              } else {
                setFeedback(`${encouragement} ${correction}`.trim());
              }
            }

            drawOverlay(canvas, landmarks ? pointsFromLandmarks(landmarks) : []);
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error(err);
        setLoading(false);
        setError("Couldn’t start camera or pose engine. Check permissions and try again.");
      }
    }

    init();

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      poseLandmarkerRef.current?.close?.();
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [drawOverlay, pointsFromLandmarks, showMirrorEstimate, threshold]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-white">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Adaptive AI Pose Coach</h2>
        <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-zinc-300">
          Confidence threshold: {threshold}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-auto w-full scale-x-[-1]"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
        />

        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 text-zinc-200">
            Starting camera and pose engine...
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Upper Body</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">
            {upperScore === null ? "Not Visible" : `${upperScore}%`}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Lower Body</p>
          <p className="mt-1 text-2xl font-bold text-lime-300">
            {lowerScore === null ? "Not Visible" : `${lowerScore}%`}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-zinc-200">
        {feedback}
      </div>
    </div>
  );
}
