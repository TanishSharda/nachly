import type { PoseLandmark } from "@/types/database";

interface OneEuroOptions {
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

class LowPassFilter {
  private initialized = false;
  private prev = 0;

  filter(value: number, alpha: number): number {
    if (!this.initialized) {
      this.initialized = true;
      this.prev = value;
      return value;
    }
    const result = alpha * value + (1 - alpha) * this.prev;
    this.prev = result;
    return result;
  }

  reset(value: number): void {
    this.initialized = true;
    this.prev = value;
  }
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  private prevTimeMs: number | null = null;
  private prevValue: number | null = null;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();

  constructor(options: OneEuroOptions = {}) {
    this.minCutoff = options.minCutoff ?? 1.0;
    this.beta = options.beta ?? 0.0;
    this.dCutoff = options.dCutoff ?? 1.0;
  }

  filter(value: number, timestampMs: number): number {
    if (this.prevTimeMs === null) {
      this.prevTimeMs = timestampMs;
      this.prevValue = value;
      this.xFilter.reset(value);
      this.dxFilter.reset(0);
      return value;
    }

    const dt = Math.max(0.001, (timestampMs - this.prevTimeMs) / 1000);
    this.prevTimeMs = timestampMs;

    const prev = this.prevValue ?? value;
    const dx = (value - prev) / dt;
    this.prevValue = value;

    const edx = this.dxFilter.filter(dx, alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, alpha(cutoff, dt));
  }
}

interface PoseSmootherOptions {
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

type FilterSet = {
  x: OneEuroFilter;
  y: OneEuroFilter;
  z: OneEuroFilter;
  visibility: OneEuroFilter;
};

export class PoseSmoother {
  private filters: FilterSet[];

  constructor(count: number, options: PoseSmootherOptions = {}) {
    this.filters = Array.from({ length: count }, () => ({
      x: new OneEuroFilter(options),
      y: new OneEuroFilter(options),
      z: new OneEuroFilter(options),
      visibility: new OneEuroFilter({ minCutoff: 1.0, beta: 0, dCutoff: 1.0 }),
    }));
  }

  smooth(landmarks: PoseLandmark[], timestampMs: number): PoseLandmark[] {
    return landmarks.map((lm, idx) => {
      const filters = this.filters[idx];
      if (!filters) return { ...lm };

      return {
        ...lm,
        x: filters.x.filter(lm.x, timestampMs),
        y: filters.y.filter(lm.y, timestampMs),
        z: filters.z.filter(lm.z ?? 0, timestampMs),
        visibility: filters.visibility.filter(lm.visibility ?? 0, timestampMs),
      };
    });
  }
}

export function createPoseSmoother(options: PoseSmootherOptions = {}): PoseSmoother {
  return new PoseSmoother(33, options);
}

export function interpolateLandmarks(
  current: PoseLandmark[],
  previous: PoseLandmark[] | null,
  minVisibility = 0.45
): PoseLandmark[] {
  if (!previous) return current.map((lm) => ({ ...lm }));

  return current.map((lm, idx) => {
    const prev = previous[idx];
    if (!prev) return { ...lm };

    const visibility = lm.visibility ?? 0;
    if (visibility >= minVisibility) return { ...lm };

    return {
      ...lm,
      x: prev.x * 0.8 + lm.x * 0.2,
      y: prev.y * 0.8 + lm.y * 0.2,
      z: (prev.z ?? 0) * 0.8 + (lm.z ?? 0) * 0.2,
      visibility: Math.max(visibility, (prev.visibility ?? 0) * 0.5),
    };
  });
}
