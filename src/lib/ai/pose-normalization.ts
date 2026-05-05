import type { PoseLandmark } from "@/types/database";
import { MP } from "@/lib/ai/pose-engine";

export interface NormalizationResult {
  landmarks: PoseLandmark[];
  scale: number;
  centerX: number;
  centerY: number;
}

function midpoint(a: PoseLandmark | undefined, b: PoseLandmark | undefined, minVis: number) {
  if (!a || !b) return null;
  if ((a.visibility ?? 0) < minVis || (b.visibility ?? 0) < minVis) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function normalizeLandmarks(
  landmarks: PoseLandmark[],
  minVisibility = 0.3
): NormalizationResult | null {
  if (!landmarks || landmarks.length === 0) return null;

  const shoulderMid = midpoint(landmarks[MP.LEFT_SHOULDER], landmarks[MP.RIGHT_SHOULDER], minVisibility);
  const hipMid = midpoint(landmarks[MP.LEFT_HIP], landmarks[MP.RIGHT_HIP], minVisibility);
  const center = shoulderMid ?? hipMid;
  if (!center) return null;

  const shoulderWidth = (() => {
    const l = landmarks[MP.LEFT_SHOULDER];
    const r = landmarks[MP.RIGHT_SHOULDER];
    if (!l || !r) return null;
    if ((l.visibility ?? 0) < minVisibility || (r.visibility ?? 0) < minVisibility) return null;
    return Math.hypot(l.x - r.x, l.y - r.y);
  })();

  const hipWidth = (() => {
    const l = landmarks[MP.LEFT_HIP];
    const r = landmarks[MP.RIGHT_HIP];
    if (!l || !r) return null;
    if ((l.visibility ?? 0) < minVisibility || (r.visibility ?? 0) < minVisibility) return null;
    return Math.hypot(l.x - r.x, l.y - r.y);
  })();

  const scale = Math.max(shoulderWidth ?? 0, hipWidth ?? 0, 0.0001);
  const normalized = landmarks.map((lm) => ({
    ...lm,
    x: (lm.x - center.x) / scale,
    y: (lm.y - center.y) / scale,
    z: (lm.z ?? 0) / scale,
  }));

  return {
    landmarks: normalized,
    scale,
    centerX: center.x,
    centerY: center.y,
  };
}
