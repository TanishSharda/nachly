// lib/ai/difficulty.ts — Adaptive difficulty that adjusts tolerance zones

const STORAGE_KEY = "naachly_difficulty";

interface DifficultyPreset {
  perfectMax: number;
  gentleMax: number;
  label: string;
  emoji: string;
}

export interface DifficultyState extends DifficultyPreset {
  level: string;
  sessionsAtLevel: number;
}

export interface DifficultyAdjustment extends DifficultyPreset {
  level: string;
  changed: boolean;
  direction: "up" | "down" | "stay";
}

const PRESETS: Record<string, DifficultyPreset> = {
  beginner: { perfectMax: 50, gentleMax: 78, label: "Beginner", emoji: "🌱" },
  easy: { perfectMax: 45, gentleMax: 70, label: "Easy", emoji: "🎯" },
  normal: { perfectMax: 40, gentleMax: 62, label: "Normal", emoji: "💪" },
  intermediate: {
    perfectMax: 35,
    gentleMax: 55,
    label: "Intermediate",
    emoji: "🔥",
  },
  hard: { perfectMax: 30, gentleMax: 48, label: "Hard", emoji: "⚡" },
  expert: { perfectMax: 25, gentleMax: 40, label: "Expert", emoji: "👑" },
};

const LEVELS = ["beginner", "easy", "normal", "intermediate", "hard", "expert"];

/**
 * Load the user's current difficulty from localStorage.
 * Default is 'beginner' for new users.
 */
export function getDifficulty(): DifficultyState {
  if (typeof window === "undefined")
    return { ...PRESETS.beginner, level: "beginner", sessionsAtLevel: 0 };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const level = LEVELS.includes(stored.level) ? stored.level : "beginner";
    return {
      ...PRESETS[level],
      level,
      sessionsAtLevel: stored.sessionsAtLevel || 0,
    };
  } catch {
    return { ...PRESETS.beginner, level: "beginner", sessionsAtLevel: 0 };
  }
}

/** Save current difficulty */
function saveDifficulty(level: string, sessionsAtLevel: number): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ level, sessionsAtLevel })
  );
}

/**
 * After a session, decide whether to adjust difficulty.
 *
 * Rules:
 * - If accuracy >= 80% for 2 consecutive sessions → move UP
 * - If accuracy < 40% → move DOWN immediately
 * - Otherwise stay
 */
export function adjustDifficulty(accuracy: number): DifficultyAdjustment {
  const current = getDifficulty();
  const currentIdx = LEVELS.indexOf(current.level);
  let newIdx = currentIdx;
  let sessions = current.sessionsAtLevel + 1;
  let direction: "up" | "down" | "stay" = "stay";

  if (accuracy >= 80 && sessions >= 2 && currentIdx < LEVELS.length - 1) {
    newIdx = currentIdx + 1;
    sessions = 0;
    direction = "up";
  } else if (accuracy < 40 && currentIdx > 0) {
    newIdx = currentIdx - 1;
    sessions = 0;
    direction = "down";
  }

  const newLevel = LEVELS[newIdx];
  saveDifficulty(newLevel, sessions);

  return {
    ...PRESETS[newLevel],
    level: newLevel,
    changed: direction !== "stay",
    direction,
  };
}

/**
 * Get the tolerance zones for the current difficulty.
 * Used by the comparison engine.
 */
export function getToleranceZones(): {
  perfectMax: number;
  gentleMax: number;
} {
  const d = getDifficulty();
  return { perfectMax: d.perfectMax, gentleMax: d.gentleMax };
}

/** Get all difficulty levels for UI display */
export function getAllLevels(): Array<{
  level: string;
  label: string;
  emoji: string;
}> {
  return LEVELS.map((level) => ({
    level,
    label: PRESETS[level].label,
    emoji: PRESETS[level].emoji,
  }));
}

/** Reset difficulty to beginner */
export function resetDifficulty(): void {
  saveDifficulty("beginner", 0);
}
