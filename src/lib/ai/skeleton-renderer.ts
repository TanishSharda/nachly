// Skeleton renderer for MediaPipe Pose (33 landmarks) — earthy color scheme

import type { PoseLandmark, FrameComparison } from "@/types/database";
import { MP } from "./pose-engine";

// MediaPipe Pose connections (body only, skip face)
const SKELETON_CONNECTIONS: [number, number][] = [
  [MP.LEFT_SHOULDER, MP.RIGHT_SHOULDER],
  [MP.LEFT_SHOULDER, MP.LEFT_ELBOW],
  [MP.LEFT_ELBOW, MP.LEFT_WRIST],
  [MP.RIGHT_SHOULDER, MP.RIGHT_ELBOW],
  [MP.RIGHT_ELBOW, MP.RIGHT_WRIST],
  [MP.LEFT_SHOULDER, MP.LEFT_HIP],
  [MP.RIGHT_SHOULDER, MP.RIGHT_HIP],
  [MP.LEFT_HIP, MP.RIGHT_HIP],
  [MP.LEFT_HIP, MP.LEFT_KNEE],
  [MP.LEFT_KNEE, MP.LEFT_ANKLE],
  [MP.RIGHT_HIP, MP.RIGHT_KNEE],
  [MP.RIGHT_KNEE, MP.RIGHT_ANKLE],
  [MP.LEFT_ANKLE, MP.LEFT_HEEL],
  [MP.RIGHT_ANKLE, MP.RIGHT_HEEL],
  [MP.LEFT_HEEL, MP.LEFT_FOOT_INDEX],
  [MP.RIGHT_HEEL, MP.RIGHT_FOOT_INDEX],
  [MP.LEFT_WRIST, MP.LEFT_INDEX],
  [MP.RIGHT_WRIST, MP.RIGHT_INDEX],
];

// Map landmark index to joint name for color coding
const KP_TO_JOINT: Record<number, string> = {
  [MP.LEFT_SHOULDER]: "left_shoulder_raise",
  [MP.LEFT_ELBOW]: "left_arm",
  [MP.LEFT_WRIST]: "left_arm",
  [MP.RIGHT_SHOULDER]: "right_shoulder_raise",
  [MP.RIGHT_ELBOW]: "right_arm",
  [MP.RIGHT_WRIST]: "right_arm",
  [MP.LEFT_HIP]: "left_torso",
  [MP.LEFT_KNEE]: "left_leg",
  [MP.LEFT_ANKLE]: "left_leg",
  [MP.RIGHT_HIP]: "right_torso",
  [MP.RIGHT_KNEE]: "right_leg",
  [MP.RIGHT_ANKLE]: "right_leg",
};

// Earthy-themed colors matching Naachly's palette
const COLORS: Record<string, string> = {
  perfect: "#C5A572",   // gold
  gentle: "#ddbe88",    // light gold
  mistake: "#de4d5a",   // soft red
  default: "#8B4513",   // saddle brown
};

const GLOW_COLORS: Record<string, string> = {
  perfect: "rgba(197, 165, 114, 0.4)",
  gentle: "rgba(221, 190, 136, 0.3)",
  mistake: "rgba(222, 77, 90, 0.4)",
  default: "rgba(139, 69, 19, 0.25)",
};

function getColor(kpIndex: number, jointScores: FrameComparison["jointScores"]): string {
  const jointName = KP_TO_JOINT[kpIndex];
  if (!jointName || !jointScores[jointName]) return COLORS.default;
  return COLORS[jointScores[jointName].category] || COLORS.default;
}

function getGlow(kpIndex: number, jointScores: FrameComparison["jointScores"]): string {
  const jointName = KP_TO_JOINT[kpIndex];
  if (!jointName || !jointScores[jointName]) return GLOW_COLORS.default;
  return GLOW_COLORS[jointScores[jointName].category] || GLOW_COLORS.default;
}

export function drawSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: PoseLandmark[],
  comparison: FrameComparison | null = null,
  mirrored = true,
  minVisibility = 0.5,
  showShadowGuide = false
) {
  if (!canvas || !landmarks) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const jointScores = comparison?.jointScores || {};

  // MediaPipe returns normalized coordinates (0-1)
  const sx = (x: number) => mirrored ? width - x * width : x * width;
  const sy = (y: number) => y * height;

  if (showShadowGuide) {
    const guide: Partial<Record<number, { x: number; y: number }>> = {
      [MP.LEFT_SHOULDER]: { x: 0.42, y: 0.28 },
      [MP.RIGHT_SHOULDER]: { x: 0.58, y: 0.28 },
      [MP.LEFT_ELBOW]: { x: 0.36, y: 0.38 },
      [MP.RIGHT_ELBOW]: { x: 0.64, y: 0.38 },
      [MP.LEFT_WRIST]: { x: 0.32, y: 0.5 },
      [MP.RIGHT_WRIST]: { x: 0.68, y: 0.5 },
      [MP.LEFT_HIP]: { x: 0.45, y: 0.5 },
      [MP.RIGHT_HIP]: { x: 0.55, y: 0.5 },
      [MP.LEFT_KNEE]: { x: 0.44, y: 0.7 },
      [MP.RIGHT_KNEE]: { x: 0.56, y: 0.7 },
      [MP.LEFT_ANKLE]: { x: 0.42, y: 0.9 },
      [MP.RIGHT_ANKLE]: { x: 0.58, y: 0.9 },
    };

    ctx.save();
    ctx.setLineDash([6, 7]);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.lineWidth = 2;

    for (const [i, j] of SKELETON_CONNECTIONS) {
      const a = guide[i];
      const b = guide[j];
      if (!a || !b) continue;

      ctx.beginPath();
      ctx.moveTo(sx(a.x), sy(a.y));
      ctx.lineTo(sx(b.x), sy(b.y));
      ctx.stroke();
    }

    ctx.setLineDash([]);
    for (const point of Object.values(guide)) {
      if (!point) continue;
      ctx.beginPath();
      ctx.arc(sx(point.x), sy(point.y), 3, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(56, 189, 248, 0.7)";
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw connections
  for (const [i, j] of SKELETON_CONNECTIONS) {
    const a = landmarks[i];
    const b = landmarks[j];
    if (!a || !b || a.visibility < minVisibility || b.visibility < minVisibility) continue;

    const color = getColor(j, jointScores);
    const glow = getGlow(j, jointScores);

    // Glow
    ctx.beginPath();
    ctx.moveTo(sx(a.x), sy(a.y));
    ctx.lineTo(sx(b.x), sy(b.y));
    ctx.strokeStyle = glow;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.stroke();

    // Main
    ctx.beginPath();
    ctx.moveTo(sx(a.x), sy(a.y));
    ctx.lineTo(sx(b.x), sy(b.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Draw keypoints (skip face: 0-10)
  for (let i = 11; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm || lm.visibility < minVisibility) continue;

    const color = getColor(i, jointScores);
    const glow = getGlow(i, jointScores);
    const x = sx(lm.x);
    const y = sy(lm.y);

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();
  }
}

export function resizeCanvas(canvas: HTMLCanvasElement) {
  if (!canvas?.parentElement) return;
  const { clientWidth, clientHeight } = canvas.parentElement;
  if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
    canvas.width = clientWidth;
    canvas.height = clientHeight;
  }
}
