import type { SessionMetrics } from "@/lib/ai/pose-engine";

export interface WeakSpotDrill {
  bodyPart: "arms" | "legs" | "posture";
  title: string;
  cue: string;
  durationSeconds: number;
  targetScore: number;
  level: number;
}

interface BuildWeakSpotDrillInput {
  bodyPartScores: Record<string, number>;
  metrics: SessionMetrics;
  styleSlug: string;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function getDominantWeakPart(
  bodyPartScores: Record<string, number>,
  metrics: SessionMetrics,
): "arms" | "legs" | "posture" {
  const parts: Array<"arms" | "legs" | "posture"> = ["arms", "legs", "posture"];

  let weakest: "arms" | "legs" | "posture" = "posture";
  let lowest = Number.POSITIVE_INFINITY;

  for (const part of parts) {
    const scoreFromResult = bodyPartScores[part];
    const scoreFromMetrics =
      metrics.bodyParts[part].total > 0
        ? ((metrics.bodyParts[part].perfect + metrics.bodyParts[part].good * 0.6) /
            metrics.bodyParts[part].total) *
          100
        : 100;

    const composite = Number.isFinite(scoreFromResult)
      ? scoreFromResult * 0.7 + scoreFromMetrics * 0.3
      : scoreFromMetrics;

    if (composite < lowest) {
      lowest = composite;
      weakest = part;
    }
  }

  return weakest;
}

const DRILL_LIBRARY: Record<
  "arms" | "legs" | "posture",
  { title: string; cue: string; durationSeconds: number }
> = {
  arms: {
    title: "Arm Path Precision",
    cue: "Run 4 slow 8-counts and fully extend both arms to exact end positions.",
    durationSeconds: 90,
  },
  legs: {
    title: "Leg Drive Control",
    cue: "Practice knee bends and directional steps on 1 and 5 to lock lower-body timing.",
    durationSeconds: 120,
  },
  posture: {
    title: "Posture Stack Reset",
    cue: "Keep shoulders level over hips for 3 loops; re-center chest before each count.",
    durationSeconds: 90,
  },
};

export function buildWeakSpotDrill(input: BuildWeakSpotDrillInput): WeakSpotDrill {
  const weakestPart = getDominantWeakPart(input.bodyPartScores, input.metrics);
  const drill = DRILL_LIBRARY[weakestPart];

  const baseScore = Number.isFinite(input.bodyPartScores[weakestPart])
    ? input.bodyPartScores[weakestPart]
    : 55;

  const styleTargetBoost = input.styleSlug === "kathak" ? 12 : 10;

  return {
    bodyPart: weakestPart,
    title: drill.title,
    cue: drill.cue,
    durationSeconds: drill.durationSeconds,
    targetScore: clamp(Math.round(baseScore + styleTargetBoost), 60, 92),
    level: 1,
  };
}

export function buildPromotedDrill(
  completedDrill: Pick<WeakSpotDrill, "bodyPart" | "title" | "cue" | "durationSeconds" | "targetScore" | "level">,
  achievedScore: number,
): WeakSpotDrill {
  const nextLevel = (completedDrill.level || 1) + 1;
  const nextDuration = clamp(completedDrill.durationSeconds + 15, 75, 180);
  const nextTarget = clamp(Math.max(completedDrill.targetScore + 5, Math.round(achievedScore + 3)), 68, 95);

  return {
    bodyPart: completedDrill.bodyPart,
    title: `${completedDrill.title} Lv ${nextLevel}`,
    cue: `${completedDrill.cue} Keep form clean on every 8-count at this higher intensity.`,
    durationSeconds: nextDuration,
    targetScore: nextTarget,
    level: nextLevel,
  };
}
