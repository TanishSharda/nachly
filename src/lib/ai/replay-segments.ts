export interface ReplaySegment {
  startSec: number;
  endSec: number;
  severity: "high" | "medium";
  note: string;
}

interface BuildReplaySegmentsInput {
  avgAngleDiffHistory: number[];
  sessionSeconds: number;
  weakBodyPart?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildReplaySegments(input: BuildReplaySegmentsInput): ReplaySegment[] {
  const { avgAngleDiffHistory, sessionSeconds, weakBodyPart } = input;
  if (avgAngleDiffHistory.length < 24 || sessionSeconds <= 0) return [];

  const window = 12;
  const smoothed: Array<{ index: number; score: number }> = [];

  for (let i = 0; i <= avgAngleDiffHistory.length - window; i += 3) {
    const slice = avgAngleDiffHistory.slice(i, i + window);
    const avg = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    smoothed.push({ index: i + Math.floor(window / 2), score: avg });
  }

  const sorted = [...smoothed].sort((a, b) => b.score - a.score);
  const selected: Array<{ index: number; score: number }> = [];

  for (const candidate of sorted) {
    if (selected.length >= 3) break;
    const tooClose = selected.some((picked) => Math.abs(picked.index - candidate.index) < window * 1.5);
    if (!tooClose) selected.push(candidate);
  }

  const perFrameSec = sessionSeconds / avgAngleDiffHistory.length;
  const notePart = weakBodyPart ? `Focus on ${weakBodyPart}.` : "Focus on control and timing.";

  return selected
    .sort((a, b) => a.index - b.index)
    .map((segment) => {
      const center = segment.index * perFrameSec;
      const startSec = clamp(Math.round(center - 4), 0, Math.max(0, Math.floor(sessionSeconds) - 2));
      const endSec = clamp(startSec + 8, startSec + 2, Math.ceil(sessionSeconds));
      const severity: "high" | "medium" = segment.score >= 34 ? "high" : "medium";

      return {
        startSec,
        endSec,
        severity,
        note: `${severity === "high" ? "High drift" : "Medium drift"} detected. ${notePart}`,
      };
    });
}
