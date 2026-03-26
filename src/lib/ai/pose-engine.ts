// Naachly AI Pose Engine — ported from naacho-website, adapted for MediaPipe Pose (33 landmarks)

import type { PoseLandmark, JointAngle, FrameComparison, SessionResult } from "@/types/database";

// MediaPipe Pose landmark indices (33 landmarks)
export const MP = {
  NOSE: 0,
  LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
} as const;

// Joint definitions for angle-based comparison
const JOINT_ANGLES_DEF = [
  { name: "left_arm", points: [MP.LEFT_SHOULDER, MP.LEFT_ELBOW, MP.LEFT_WRIST], label: "left arm" },
  { name: "right_arm", points: [MP.RIGHT_SHOULDER, MP.RIGHT_ELBOW, MP.RIGHT_WRIST], label: "right arm" },
  { name: "left_leg", points: [MP.LEFT_HIP, MP.LEFT_KNEE, MP.LEFT_ANKLE], label: "left leg" },
  { name: "right_leg", points: [MP.RIGHT_HIP, MP.RIGHT_KNEE, MP.RIGHT_ANKLE], label: "right leg" },
  { name: "left_torso", points: [MP.LEFT_SHOULDER, MP.LEFT_HIP, MP.LEFT_KNEE], label: "torso" },
  { name: "right_torso", points: [MP.RIGHT_SHOULDER, MP.RIGHT_HIP, MP.RIGHT_KNEE], label: "torso" },
  { name: "left_shoulder_raise", points: [MP.LEFT_ELBOW, MP.LEFT_SHOULDER, MP.LEFT_HIP], label: "left shoulder" },
  { name: "right_shoulder_raise", points: [MP.RIGHT_ELBOW, MP.RIGHT_SHOULDER, MP.RIGHT_HIP], label: "right shoulder" },
  { name: "left_hip_angle", points: [MP.LEFT_SHOULDER, MP.LEFT_HIP, MP.LEFT_ANKLE], label: "left hip" },
  { name: "right_hip_angle", points: [MP.RIGHT_SHOULDER, MP.RIGHT_HIP, MP.RIGHT_ANKLE], label: "right hip" },
];

const ALWAYS_ACTIVE_JOINTS = new Set(["left_leg", "right_leg", "left_torso", "right_torso"]);

const JOINT_TO_BODY_PART: Record<string, string> = {
  left_arm: "arms", right_arm: "arms",
  left_leg: "legs", right_leg: "legs",
  left_torso: "posture", right_torso: "posture",
  left_shoulder_raise: "posture", right_shoulder_raise: "posture",
  left_hip_angle: "legs", right_hip_angle: "legs",
};

const LEG_JOINTS = new Set(["left_leg", "right_leg", "left_hip_angle", "right_hip_angle"]);

export interface CompareOptions {
  includeLegs?: boolean;
  ignoreJoints?: string[];
  legWeight?: number;
  jitterTolerance?: number;
  minJointVisibility?: number;
}

// --- Angle math ---
export function calcAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs(rad * (180 / Math.PI));
  if (deg > 180) deg = 360 - deg;
  return deg;
}

// Extract angles from 33 MediaPipe landmarks
export function extractAngles(landmarks: PoseLandmark[], minVisibility = 0.5): Record<string, JointAngle> {
  const angles: Record<string, JointAngle> = {};
  for (const joint of JOINT_ANGLES_DEF) {
    const [iA, iB, iC] = joint.points;
    const a = landmarks[iA];
    const b = landmarks[iB];
    const c = landmarks[iC];
    if (a && b && c && a.visibility >= minVisibility && b.visibility >= minVisibility && c.visibility >= minVisibility) {
      angles[joint.name] = {
        name: joint.name,
        angle: calcAngle(a, b, c),
        visibility: Math.min(a.visibility, b.visibility, c.visibility),
      };
    }
  }
  return angles;
}

// Compare user vs instructor angles
export function compareAngles(
  userAngles: Record<string, JointAngle>,
  instructorAngles: Record<string, JointAngle>,
  perfectMax = 20,
  gentleMax = 40,
  options: CompareOptions = {}
): FrameComparison {
  const {
    includeLegs = true,
    ignoreJoints = [],
    legWeight = 1,
    jitterTolerance = 0,
    minJointVisibility = 0,
  } = options;

  const ignoredSet = new Set(ignoreJoints);
  const jointScores: FrameComparison["jointScores"] = {};
  let totalWeightedDiff = 0;
  let totalWeight = 0;
  let count = 0;

  for (const jointName of Object.keys(instructorAngles)) {
    const userJoint = userAngles[jointName];
    const instructorJoint = instructorAngles[jointName];
    if (!userJoint || !instructorJoint) continue;
    if (ignoredSet.has(jointName)) continue;
    if (!includeLegs && LEG_JOINTS.has(jointName)) continue;
    if (userJoint.visibility < minJointVisibility || instructorJoint.visibility < minJointVisibility) continue;

    const rawDiff = Math.abs(userJoint.angle - instructorJoint.angle);
    const diff = rawDiff <= jitterTolerance ? 0 : rawDiff;
    let category: "perfect" | "gentle" | "mistake" = "perfect";
    if (diff > gentleMax) category = "mistake";
    else if (diff > perfectMax) category = "gentle";

    jointScores[jointName] = { diff, category };
    const weight = LEG_JOINTS.has(jointName) ? legWeight : 1;
    totalWeightedDiff += diff * weight;
    totalWeight += weight;
    count++;
  }

  const overallScore = count > 0 && totalWeight > 0 ? Math.max(0, 1 - totalWeightedDiff / totalWeight / 90) : 0;
  return { overallScore, jointScores, activeJointCount: count };
}

// Temporal tolerance: compare against instructor buffer, return best match
export function compareWithTemporalTolerance(
  userAngles: Record<string, JointAngle>,
  instructorBuffer: { angles: Record<string, JointAngle>; timestamp: number }[],
  perfectMax = 20,
  gentleMax = 40,
  options: CompareOptions = {}
): FrameComparison {
  if (!instructorBuffer || instructorBuffer.length === 0) {
    return { overallScore: 0, jointScores: {}, activeJointCount: 0 };
  }

  const activeJoints = getActiveJoints(instructorBuffer);

  // Filter to active joints only
  const filterAngles = (angles: Record<string, JointAngle>) => {
    if (!activeJoints) return angles;
    const filtered: Record<string, JointAngle> = {};
    for (const [k, v] of Object.entries(angles)) {
      if (activeJoints.has(k)) filtered[k] = v;
    }
    return filtered;
  };

  const filteredUser = filterAngles(userAngles);
  if (Object.keys(filteredUser).length === 0) {
    return { overallScore: 0, jointScores: {}, activeJointCount: 0 };
  }

  let best: FrameComparison = { overallScore: -1, jointScores: {}, activeJointCount: 0 };
  for (const frame of instructorBuffer) {
    const result = compareAngles(filteredUser, filterAngles(frame.angles), perfectMax, gentleMax, options);
    if (result.overallScore > best.overallScore) best = result;
  }

  return best.overallScore >= 0 ? best : { overallScore: 0, jointScores: {}, activeJointCount: 0 };
}

// Detect which joints are actively moving
function getActiveJoints(buffer: { angles: Record<string, JointAngle> }[], minRange = 12): Set<string> | null {
  if (buffer.length < 2) return null;

  const ranges: Record<string, { min: number; max: number }> = {};
  for (const frame of buffer) {
    for (const [name, data] of Object.entries(frame.angles)) {
      if (!ranges[name]) ranges[name] = { min: data.angle, max: data.angle };
      ranges[name].min = Math.min(ranges[name].min, data.angle);
      ranges[name].max = Math.max(ranges[name].max, data.angle);
    }
  }

  const active = new Set<string>();
  for (const [name, range] of Object.entries(ranges)) {
    if (ALWAYS_ACTIVE_JOINTS.has(name) || range.max - range.min >= minRange) {
      active.add(name);
    }
  }

  return active.size > 0 ? active : null;
}

// --- Style-specific tolerance profiles ---
export const STYLE_TOLERANCES: Record<string, { perfectMax: number; gentleMax: number; temporalWindowMs: number }> = {
  "hip-hop": { perfectMax: 18, gentleMax: 38, temporalWindowMs: 500 },
  bollywood: { perfectMax: 22, gentleMax: 42, temporalWindowMs: 1200 },
  kathak: { perfectMax: 15, gentleMax: 35, temporalWindowMs: 800 },
  bhangra: { perfectMax: 25, gentleMax: 48, temporalWindowMs: 600 },
  default: { perfectMax: 22, gentleMax: 42, temporalWindowMs: 800 },
};

export function getStyleTolerance(styleSlug: string) {
  return STYLE_TOLERANCES[styleSlug] || STYLE_TOLERANCES.default;
}

// --- Rolling angle buffer ---
export class RollingBuffer {
  private buffer: Record<string, JointAngle>[] = [];
  constructor(private size = 10) {}

  push(angles: Record<string, JointAngle>) {
    this.buffer.push(angles);
    if (this.buffer.length > this.size) this.buffer.shift();
  }

  getAverage(): Record<string, JointAngle> {
    if (this.buffer.length === 0) return {};
    const sums: Record<string, { angle: number; vis: number; count: number; name: string }> = {};
    for (const frame of this.buffer) {
      for (const [key, val] of Object.entries(frame)) {
        if (!sums[key]) sums[key] = { angle: 0, vis: 0, count: 0, name: val.name };
        sums[key].angle += val.angle;
        sums[key].vis += val.visibility;
        sums[key].count++;
      }
    }
    const avg: Record<string, JointAngle> = {};
    for (const [key, s] of Object.entries(sums)) {
      avg[key] = { name: s.name, angle: s.angle / s.count, visibility: s.vis / s.count };
    }
    return avg;
  }
}

// --- Session metrics ---
export interface SessionMetrics {
  totalFramesCompared: number;
  perfectFrames: number;
  goodFrames: number;
  badFrames: number;
  avgAngleDiffHistory: number[];
  bodyParts: Record<string, { perfect: number; good: number; bad: number; total: number }>;
}

export function createSessionMetrics(): SessionMetrics {
  return {
    totalFramesCompared: 0,
    perfectFrames: 0,
    goodFrames: 0,
    badFrames: 0,
    avgAngleDiffHistory: [],
    bodyParts: {
      arms: { perfect: 0, good: 0, bad: 0, total: 0 },
      legs: { perfect: 0, good: 0, bad: 0, total: 0 },
      posture: { perfect: 0, good: 0, bad: 0, total: 0 },
    },
  };
}

export function updateMetrics(metrics: SessionMetrics, comparison: FrameComparison) {
  if (comparison.activeJointCount === 0) return;

  metrics.totalFramesCompared++;

  let totalDiff = 0;
  let count = 0;
  for (const [jointName, score] of Object.entries(comparison.jointScores)) {
    totalDiff += score.diff;
    count++;

    const part = JOINT_TO_BODY_PART[jointName];
    if (part && metrics.bodyParts[part]) {
      metrics.bodyParts[part].total++;
      if (score.category === "perfect") metrics.bodyParts[part].perfect++;
      else if (score.category === "gentle") metrics.bodyParts[part].good++;
      else metrics.bodyParts[part].bad++;
    }
  }

  const avgDiff = count > 0 ? totalDiff / count : 0;
  metrics.avgAngleDiffHistory.push(avgDiff);

  if (avgDiff < 15) metrics.perfectFrames++;
  else if (avgDiff < 30) metrics.goodFrames++;
  else metrics.badFrames++;
}

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

function stdDev(arr: number[]) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

export function calculateFinalScores(metrics: SessionMetrics, elapsedSeconds: number, totalDuration: number): SessionResult {
  const { totalFramesCompared, perfectFrames, goodFrames, avgAngleDiffHistory, bodyParts } = metrics;

  const completion = totalDuration > 0 ? clamp(Math.round((elapsedSeconds / totalDuration) * 100)) : 0;

  if (totalFramesCompared < 10) {
    return { accuracy: 0, consistency: 0, completion, bodyPartScores: {}, mistakes: [], totalFrames: 0, perfectFrames: 0, goodFrames: 0 };
  }

  const meanDiff = avgAngleDiffHistory.reduce((a, b) => a + b, 0) / avgAngleDiffHistory.length;
  const baseAccuracy = ((perfectFrames + goodFrames * 0.6) / totalFramesCompared) * 100;
  const diffPenalty = clamp(1 - meanDiff / 60, 0, 1);
  const accuracy = clamp(Math.round(baseAccuracy * diffPenalty));

  const sd = stdDev(avgAngleDiffHistory);
  const stabilityScore = clamp(Math.round(50 - sd), 0, 50);
  const accuracyComponent = clamp(Math.round(50 * (1 - meanDiff / 60)), 0, 50);
  const consistency = clamp(stabilityScore + accuracyComponent);

  const bodyPartScores: Record<string, number> = {};
  for (const [part, data] of Object.entries(bodyParts)) {
    if (data.total > 0) {
      bodyPartScores[part] = clamp(Math.round(((data.perfect + data.good * 0.6) / data.total) * 100));
    }
  }

  return {
    accuracy,
    consistency,
    completion,
    bodyPartScores,
    mistakes: [],
    totalFrames: totalFramesCompared,
    perfectFrames,
    goodFrames,
  };
}

// --- Distance guidance ---
export function getShoulderWidth(landmarks: PoseLandmark[], minVis = 0.5): number | null {
  const l = landmarks[MP.LEFT_SHOULDER];
  const r = landmarks[MP.RIGHT_SHOULDER];
  if (!l || !r || l.visibility < minVis || r.visibility < minVis) return null;
  return Math.hypot(l.x - r.x, l.y - r.y);
}

export function isFullBodyVisible(landmarks: PoseLandmark[], minVis = 0.5): boolean {
  const ids = [MP.LEFT_KNEE, MP.RIGHT_KNEE, MP.LEFT_ANKLE, MP.RIGHT_ANKLE];
  return ids.every((id) => landmarks[id] && landmarks[id].visibility >= minVis);
}

// --- Feedback generation ---
const PRAISE_MESSAGES: Record<string, string[]> = {
  "hip-hop": ["Fire moves!", "Clean isolation!", "That pop was perfect!", "You got the groove!"],
  bollywood: ["Beautiful expression!", "Graceful hands!", "Stunning energy!", "You're glowing!"],
  kathak: ["Precise footwork!", "Elegant form!", "Beautiful chakkar!", "Perfect tatkar!"],
  bhangra: ["Massive energy!", "That shoulder pump!", "Incredible spirit!", "Jatt di power!"],
  default: ["Nice moves!", "Great timing!", "Awesome energy!", "Killing it!", "Smooth!"],
};

const CORRECTION_HINTS: Record<string, string[]> = {
  "left arm": ["Raise your left arm slightly", "Extend your left arm more"],
  "right arm": ["Raise your right arm slightly", "Extend your right arm more"],
  "left leg": ["Bend your left knee more", "Wider left leg stance"],
  "right leg": ["Bend your right knee more", "Wider right leg stance"],
  torso: ["Straighten your back", "Lean your torso slightly"],
  "left shoulder": ["Lift your left shoulder", "Drop your left shoulder"],
  "right shoulder": ["Lift your right shoulder", "Drop your right shoulder"],
  "left hip": ["Open your left hip angle", "Bring your left hip in"],
  "right hip": ["Open your right hip angle", "Bring your right hip in"],
};

export function generateFeedback(comparison: FrameComparison, styleSlug = "default"): { type: "error" | "warning" | "praise"; message: string } | null {
  const entries = Object.entries(comparison.jointScores).sort((a, b) => b[1].diff - a[1].diff);
  const mistakes = entries.filter(([, s]) => s.category === "mistake");
  const gentle = entries.filter(([, s]) => s.category === "gentle");
  const perfect = entries.filter(([, s]) => s.category === "perfect");

  if (mistakes.length > 0) {
    const [jointName] = mistakes[0];
    const label = JOINT_ANGLES_DEF.find((j) => j.name === jointName)?.label || jointName;
    const hints = CORRECTION_HINTS[label] || [`Adjust your ${label}`];
    return { type: "error", message: hints[Math.floor(Math.random() * hints.length)] };
  }

  if (gentle.length > 0) {
    const [jointName] = gentle[0];
    const label = JOINT_ANGLES_DEF.find((j) => j.name === jointName)?.label || jointName;
    const hints = CORRECTION_HINTS[label] || [`Slight adjustment on ${label}`];
    return { type: "warning", message: hints[Math.floor(Math.random() * hints.length)] };
  }

  if (perfect.length >= 4) {
    const msgs = PRAISE_MESSAGES[styleSlug] || PRAISE_MESSAGES.default;
    return { type: "praise", message: msgs[Math.floor(Math.random() * msgs.length)] };
  }

  return null;
}

export function getMotivationalMessage(accuracy: number, name = "Dancer"): string {
  if (accuracy >= 85) return `Fantastic session, ${name}! Your timing was strong.`;
  if (accuracy >= 60) return `Great effort, ${name}! You're improving every session.`;
  return `Nice start, ${name}! Keep practicing and you'll get there!`;
}

// --- Coaching insight — personalized body-part feedback ---
export function generateCoachingInsight(
  scores: SessionResult,
  metrics: SessionMetrics,
): string[] {
  const lines: string[] = [];
  const bp = metrics?.bodyParts;

  // Body part analysis
  if (bp) {
    const parts = ["arms", "legs", "posture"];
    const weakest = parts.reduce((w, p) => {
      const pct = bp[p].total > 0 ? (bp[p].perfect + bp[p].good) / bp[p].total : 1;
      const wPct = bp[w].total > 0 ? (bp[w].perfect + bp[w].good) / bp[w].total : 1;
      return pct < wPct ? p : w;
    }, parts[0]);
    const strongest = parts.reduce((s, p) => {
      const pct = bp[p].total > 0 ? (bp[p].perfect + bp[p].good) / bp[p].total : 0;
      const sPct = bp[s].total > 0 ? (bp[s].perfect + bp[s].good) / bp[s].total : 0;
      return pct > sPct ? p : s;
    }, parts[0]);

    if (strongest !== weakest) {
      lines.push(`Your ${strongest} were your strongest — great control there.`);
      lines.push(`Focus on ${weakest} next session for biggest improvement.`);
    }
  }

  // Score-based insight
  if (scores.accuracy >= 85 && scores.consistency >= 80) {
    lines.push("You kept strong posture and matched timing really well.");
  } else if (scores.accuracy >= 60) {
    lines.push("Your movements improved as the session went on. Keep building that muscle memory.");
  } else {
    lines.push("Focus on watching the instructor closely and mirror their movements at a comfortable pace.");
  }

  return lines;
}

// --- Distance guidance (for normalized MediaPipe coordinates 0-1) ---
const SHOULDER_WIDTH_TOO_CLOSE = 0.35; // normalized
const SHOULDER_WIDTH_TOO_FAR = 0.12;

export function getDistanceGuidance(
  landmarks: PoseLandmark[]
): { status: "ok" | "close" | "far"; message: string } | null {
  const width = getShoulderWidth(landmarks);
  if (width === null) return null;
  if (width > SHOULDER_WIDTH_TOO_CLOSE)
    return { status: "close", message: "Move back so we can see your full body" };
  if (width < SHOULDER_WIDTH_TOO_FAR)
    return { status: "far", message: "Step closer to the camera" };
  return { status: "ok", message: "You're perfectly positioned" };
}
