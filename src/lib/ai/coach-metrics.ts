import type { JointAngle, PoseLandmark } from "@/types/database";

export interface CoachScores {
  posture: number;
  timing: number;
  energy: number;
  confidence: number;
  overall: number;
}

interface ComputeCoachScoresInput {
  styleSlug: string;
  difficultyLevel: string;
  landmarks: PoseLandmark[];
  currentAngles: Record<string, JointAngle>;
  previousAngles: Record<string, JointAngle> | null;
  motionHistory: number[];
  visibilityHistory: number[];
}

const KEY_VISIBILITY_LANDMARKS = [11, 12, 23, 24, 25, 26, 27, 28];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getDifficultyForgiveness(level: string): number {
  switch (level) {
    case "beginner":
      return 1.26;
    case "easy":
      return 1.18;
    case "normal":
      return 1.08;
    case "intermediate":
      return 1;
    case "hard":
      return 0.95;
    case "expert":
      return 0.9;
    default:
      return 1;
  }
}

function applyForgiveness(score: number, multiplier: number): number {
  if (multiplier === 1) return clamp(Math.round(score));

  if (multiplier > 1) {
    const boosted = score + (100 - score) * (multiplier - 1) * 0.45;
    return clamp(Math.round(boosted));
  }

  const tightened = score - score * (1 - multiplier) * 0.3;
  return clamp(Math.round(tightened));
}

function computePosture(landmarks: PoseLandmark[]): number {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0;

  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
  const hipTilt = Math.abs(leftHip.y - rightHip.y);
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const torsoShift = Math.abs(shoulderMidX - hipMidX);

  const penalty = shoulderTilt * 220 + hipTilt * 220 + torsoShift * 160;
  return clamp(Math.round(100 - penalty));
}

function computeMotionMagnitude(
  currentAngles: Record<string, JointAngle>,
  previousAngles: Record<string, JointAngle> | null,
): number {
  if (!previousAngles) return 0;

  let total = 0;
  let count = 0;

  for (const [name, angle] of Object.entries(currentAngles)) {
    const previous = previousAngles[name];
    if (!previous) continue;
    total += Math.abs(angle.angle - previous.angle);
    count += 1;
  }

  if (count === 0) return 0;
  return total / count;
}

function computeTimingScore(motionHistory: number[]): number {
  if (motionHistory.length < 6) return 50;

  const recent = motionHistory.slice(-12);
  const mean = avg(recent);
  const variability = stdDev(recent);
  const coeffVar = variability / Math.max(mean, 0.01);

  const consistency = clamp(100 - coeffVar * 120);
  const movementPresence = clamp(mean * 6);
  return clamp(Math.round(consistency * 0.75 + movementPresence * 0.25));
}

function computeEnergyScore(motionHistory: number[]): number {
  if (motionHistory.length === 0) return 0;
  const recent = motionHistory.slice(-8);
  const meanMotion = avg(recent);
  return clamp(Math.round(meanMotion * 7.5));
}

function computeConfidenceScore(visibilityHistory: number[], energyScore: number, timingScore: number): number {
  const vis = visibilityHistory.length > 0 ? avg(visibilityHistory.slice(-8)) : 0;
  const visibilityScore = clamp(vis * 100);
  const commitment = clamp(energyScore + 15);
  const rhythmTrust = clamp(timingScore);

  return clamp(Math.round(visibilityScore * 0.55 + commitment * 0.25 + rhythmTrust * 0.2));
}

function getStyleWeights(styleSlug: string): { posture: number; timing: number; energy: number; confidence: number } {
  switch (styleSlug) {
    case "hip-hop":
      return { posture: 0.14, timing: 0.3, energy: 0.36, confidence: 0.2 };
    case "kathak":
      return { posture: 0.36, timing: 0.3, energy: 0.14, confidence: 0.2 };
    case "bhangra":
      return { posture: 0.15, timing: 0.25, energy: 0.4, confidence: 0.2 };
    case "bollywood":
      return { posture: 0.24, timing: 0.3, energy: 0.26, confidence: 0.2 };
    default:
      return { posture: 0.25, timing: 0.3, energy: 0.25, confidence: 0.2 };
  }
}

function getVisibilityAverage(landmarks: PoseLandmark[]): number {
  const visibilities = KEY_VISIBILITY_LANDMARKS
    .map((index) => landmarks[index]?.visibility ?? 0)
    .filter((value) => Number.isFinite(value));

  return avg(visibilities);
}

export function getCoachCue(scores: CoachScores): { type: "warning" | "praise"; message: string } {
  const entries: Array<{ key: keyof CoachScores; value: number }> = [
    { key: "posture", value: scores.posture },
    { key: "timing", value: scores.timing },
    { key: "energy", value: scores.energy },
    { key: "confidence", value: scores.confidence },
  ];

  const weakest = entries.reduce((lowest, current) => (current.value < lowest.value ? current : lowest), entries[0]);

  if (scores.overall >= 82) {
    return { type: "praise", message: "Great control. Keep this groove going." };
  }

  switch (weakest.key) {
    case "posture":
      return { type: "warning", message: "Lift your chest and keep your shoulders level." };
    case "timing":
      return { type: "warning", message: "Match the beat pulse. Count 1-2-3-4 in your head." };
    case "energy":
      return { type: "warning", message: "Push bigger movement accents on each main count." };
    case "confidence":
      return { type: "warning", message: "Commit to each move. Full range looks stronger." };
    default:
      return { type: "warning", message: "Keep going. Small improvements each bar." };
  }
}

export function computeCoachScores(input: ComputeCoachScoresInput): {
  scores: CoachScores;
  motionMagnitude: number;
  visibilityAverage: number;
} {
  const motionMagnitude = computeMotionMagnitude(input.currentAngles, input.previousAngles);
  const visibilityAverage = getVisibilityAverage(input.landmarks);

  const rawPosture = computePosture(input.landmarks);
  const rawTiming = computeTimingScore(input.motionHistory);
  const rawEnergy = computeEnergyScore(input.motionHistory);
  const rawConfidence = computeConfidenceScore(input.visibilityHistory, rawEnergy, rawTiming);

  const forgiveness = getDifficultyForgiveness(input.difficultyLevel);
  const posture = applyForgiveness(rawPosture, forgiveness);
  const timing = applyForgiveness(rawTiming, forgiveness);
  const energy = applyForgiveness(rawEnergy, forgiveness);
  const confidence = applyForgiveness(rawConfidence, forgiveness);

  const weights = getStyleWeights(input.styleSlug);
  const overall = clamp(
    Math.round(
      posture * weights.posture +
        timing * weights.timing +
        energy * weights.energy +
        confidence * weights.confidence,
    ),
  );

  return {
    scores: {
      posture,
      timing,
      energy,
      confidence,
      overall,
    },
    motionMagnitude,
    visibilityAverage,
  };
}
