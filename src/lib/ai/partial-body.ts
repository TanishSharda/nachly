import type { PoseLandmark, JointAngle } from "@/types/database";
import { extractAngles, MP } from "@/lib/ai/pose-engine";

const UPPER_KEYPOINTS = [
  MP.LEFT_SHOULDER,
  MP.RIGHT_SHOULDER,
  MP.LEFT_ELBOW,
  MP.RIGHT_ELBOW,
  MP.LEFT_WRIST,
  MP.RIGHT_WRIST,
] as const;

const LOWER_KEYPOINTS = [
  MP.LEFT_HIP,
  MP.RIGHT_HIP,
  MP.LEFT_KNEE,
  MP.RIGHT_KNEE,
  MP.LEFT_ANKLE,
  MP.RIGHT_ANKLE,
] as const;

const MIRROR_PAIRS: Record<number, number> = {
  [MP.LEFT_SHOULDER]: MP.RIGHT_SHOULDER,
  [MP.RIGHT_SHOULDER]: MP.LEFT_SHOULDER,
  [MP.LEFT_ELBOW]: MP.RIGHT_ELBOW,
  [MP.RIGHT_ELBOW]: MP.LEFT_ELBOW,
  [MP.LEFT_WRIST]: MP.RIGHT_WRIST,
  [MP.RIGHT_WRIST]: MP.LEFT_WRIST,
  [MP.LEFT_HIP]: MP.RIGHT_HIP,
  [MP.RIGHT_HIP]: MP.LEFT_HIP,
  [MP.LEFT_KNEE]: MP.RIGHT_KNEE,
  [MP.RIGHT_KNEE]: MP.LEFT_KNEE,
  [MP.LEFT_ANKLE]: MP.RIGHT_ANKLE,
  [MP.RIGHT_ANKLE]: MP.LEFT_ANKLE,
};

export interface PartialVisibilitySummary {
  upperVisibleCount: number;
  lowerVisibleCount: number;
  hasUpper: boolean;
  hasLower: boolean;
  hasAny: boolean;
}

function visibleCount(landmarks: PoseLandmark[], ids: readonly number[], threshold: number) {
  return ids.filter((idx) => landmarks[idx] && landmarks[idx].visibility >= threshold).length;
}

function getBodyCenterX(landmarks: PoseLandmark[]) {
  const ls = landmarks[MP.LEFT_SHOULDER];
  const rs = landmarks[MP.RIGHT_SHOULDER];
  if (ls && rs && ls.visibility > 0.3 && rs.visibility > 0.3) {
    return (ls.x + rs.x) / 2;
  }

  const lh = landmarks[MP.LEFT_HIP];
  const rh = landmarks[MP.RIGHT_HIP];
  if (lh && rh && lh.visibility > 0.3 && rh.visibility > 0.3) {
    return (lh.x + rh.x) / 2;
  }

  return null;
}

export function getPartialVisibilitySummary(
  landmarks: PoseLandmark[],
  threshold = 0.5
): PartialVisibilitySummary {
  const upperVisibleCount = visibleCount(landmarks, UPPER_KEYPOINTS, threshold);
  const lowerVisibleCount = visibleCount(landmarks, LOWER_KEYPOINTS, threshold);
  const hasUpper = upperVisibleCount >= 2;
  const hasLower = lowerVisibleCount >= 2;

  return {
    upperVisibleCount,
    lowerVisibleCount,
    hasUpper,
    hasLower,
    hasAny: hasUpper || hasLower,
  };
}

export function extractAdaptiveAngles(
  landmarks: PoseLandmark[],
  threshold = 0.45,
  allowMirrorEstimate = true
): Record<string, JointAngle> {
  if (!allowMirrorEstimate) {
    return extractAngles(landmarks, threshold);
  }

  const hydrated = landmarks.map((lm) => ({ ...lm }));
  const centerX = getBodyCenterX(hydrated);

  if (centerX !== null) {
    for (const [idxStr, pairIdx] of Object.entries(MIRROR_PAIRS)) {
      const idx = Number(idxStr);
      const current = hydrated[idx];
      if (current && current.visibility >= threshold) continue;

      const pair = hydrated[pairIdx];
      if (!pair || pair.visibility < threshold) continue;

      hydrated[idx] = {
        ...pair,
        x: centerX + (centerX - pair.x),
        visibility: Math.max(0.3, pair.visibility * 0.65),
      };
    }
  }

  return extractAngles(hydrated, Math.min(0.3, threshold));
}
