// lib/ai/session-storage.ts — localStorage wrapper for session/streak tracking

const KEYS = {
  USER_NAME: "naachly_userName",
  STREAK: "naachly_streak",
  SESSIONS: "naachly_sessions",
  DRILLS: "naachly_drills",
} as const;

export interface SessionRecord {
  routineId: string;
  routineTitle: string;
  styleSlug: string;
  accuracy: number;
  consistency: number;
  completion: number;
  date: string;
  elapsed: number; // seconds
}

export interface StreakData {
  count: number;
  lastDate: string | null;
}

export interface StoredDrill {
  id: string;
  bodyPart: "arms" | "legs" | "posture";
  title: string;
  cue: string;
  styleSlug?: string;
  routineSlug?: string;
  durationSeconds: number;
  targetScore: number;
  level: number;
  currentStreak: number;
  createdAt: string;
  completedAt: string | null;
}

type SaveDrillInput = Pick<
  StoredDrill,
  "bodyPart" | "title" | "cue" | "durationSeconds" | "targetScore" | "level"
> & {
  styleSlug?: string;
  routineSlug?: string;
  currentStreak?: number;
};

// ─── User Name ───

export function getUserName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEYS.USER_NAME) || "";
}

export function setUserName(name: string): void {
  localStorage.setItem(KEYS.USER_NAME, name);
}

// ─── Streak ───

export function getStreak(): StreakData {
  if (typeof window === "undefined") return { count: 0, lastDate: null };
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.STREAK) || "{}");
    return { count: data.count || 0, lastDate: data.lastDate || null };
  } catch {
    return { count: 0, lastDate: null };
  }
}

export function updateStreak(): number {
  const today = new Date().toISOString().split("T")[0];
  const streak = getStreak();
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];

  if (streak.lastDate === today) return streak.count;
  if (streak.lastDate === yesterday) {
    const newCount = streak.count + 1;
    localStorage.setItem(
      KEYS.STREAK,
      JSON.stringify({ count: newCount, lastDate: today })
    );
    return newCount;
  }
  localStorage.setItem(
    KEYS.STREAK,
    JSON.stringify({ count: 1, lastDate: today })
  );
  return 1;
}

// ─── Sessions ───

export function saveSession(sessionData: Omit<SessionRecord, "date">): void {
  try {
    const sessions = JSON.parse(
      localStorage.getItem(KEYS.SESSIONS) || "[]"
    ) as SessionRecord[];
    sessions.push({ ...sessionData, date: new Date().toISOString() });
    // Keep last 50 sessions
    localStorage.setItem(
      KEYS.SESSIONS,
      JSON.stringify(sessions.slice(-50))
    );
  } catch {
    // ignore storage errors
  }
}

export function getSessions(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      localStorage.getItem(KEYS.SESSIONS) || "[]"
    ) as SessionRecord[];
  } catch {
    return [];
  }
}

export function getSessionCount(): number {
  return getSessions().length;
}

/** Get recent sessions (most recent first) */
export function getRecentSessions(limit = 10): SessionRecord[] {
  return getSessions().reverse().slice(0, limit);
}

/** Get average scores across all sessions */
export function getAverageScores(): {
  accuracy: number;
  consistency: number;
  completion: number;
} {
  const sessions = getSessions();
  if (sessions.length === 0)
    return { accuracy: 0, consistency: 0, completion: 0 };

  const sum = sessions.reduce(
    (acc, s) => ({
      accuracy: acc.accuracy + s.accuracy,
      consistency: acc.consistency + s.consistency,
      completion: acc.completion + s.completion,
    }),
    { accuracy: 0, consistency: 0, completion: 0 }
  );

  return {
    accuracy: Math.round(sum.accuracy / sessions.length),
    consistency: Math.round(sum.consistency / sessions.length),
    completion: Math.round(sum.completion / sessions.length),
  };
}

export function getStoredDrills(limit = 10): StoredDrill[] {
  if (typeof window === "undefined") return [];
  try {
    const drills = JSON.parse(localStorage.getItem(KEYS.DRILLS) || "[]") as StoredDrill[];
    return drills.slice(-limit).reverse();
  } catch {
    return [];
  }
}

export function saveDrill(drill: SaveDrillInput): StoredDrill {
  const entry: StoredDrill = {
    ...drill,
    level: drill.level || 1,
    currentStreak: drill.currentStreak || 0,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  try {
    const drills = JSON.parse(localStorage.getItem(KEYS.DRILLS) || "[]") as StoredDrill[];
    drills.push(entry);
    localStorage.setItem(KEYS.DRILLS, JSON.stringify(drills.slice(-40)));
  } catch {
    // Ignore storage failures.
  }

  return entry;
}

export function completeDrill(drillId: string): void {
  try {
    const drills = JSON.parse(localStorage.getItem(KEYS.DRILLS) || "[]") as StoredDrill[];
    const next = drills.map((drill) =>
      drill.id === drillId ? { ...drill, completedAt: new Date().toISOString() } : drill
    );
    localStorage.setItem(KEYS.DRILLS, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

export function getActiveDrills(): StoredDrill[] {
  return getStoredDrills(40).filter((drill) => drill.completedAt === null);
}

export function evaluateDrillCompletions(
  bodyPartScores: Record<string, number>
): { completed: StoredDrill[]; streakProgress: StoredDrill[] } {
  try {
    const drills = JSON.parse(localStorage.getItem(KEYS.DRILLS) || "[]") as StoredDrill[];
    if (drills.length === 0) return { completed: [], streakProgress: [] };

    const nowIso = new Date().toISOString();
    const completed: StoredDrill[] = [];
    const streakProgress: StoredDrill[] = [];
    let changed = false;

    const next = drills.map((drill) => {
      if (drill.completedAt) return drill;
      const currentScore = bodyPartScores[drill.bodyPart];
      if (!Number.isFinite(currentScore)) return drill;

      if (currentScore < drill.targetScore) {
        if (drill.currentStreak > 0) {
          changed = true;
          return { ...drill, currentStreak: 0 };
        }
        return drill;
      }

      const nextStreak = (drill.currentStreak || 0) + 1;
      const progressed = { ...drill, currentStreak: nextStreak };
      streakProgress.push(progressed);

      if (nextStreak >= 3) {
        changed = true;
        const done = { ...progressed, completedAt: nowIso };
        completed.push(done);
        return done;
      }

      changed = true;
      return progressed;

    });

    if (changed) {
      localStorage.setItem(KEYS.DRILLS, JSON.stringify(next));
    }

    return { completed, streakProgress };
  } catch {
    return { completed: [], streakProgress: [] };
  }
}
