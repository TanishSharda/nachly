"use client";

import { useEffect, useMemo, useState } from "react";

type DrillEvent = {
  id: string;
  drillId: string;
  routineId: string;
  bodyPart: "arms" | "legs" | "posture";
  targetScore: number;
  achievedScore: number;
  autoCompleted: boolean;
  completionSource: "auto-hold" | "manual-end";
  comparedFrames: number;
  bodyPartSamples: number;
  stableSamples: number;
  createdAt: string;
  signatureValid: boolean;
};

type DrillEventsResponse = {
  total: number;
  validCount: number;
  invalidCount: number;
  events: DrillEvent[];
};

type DrillProgressionResponse = {
  progression: Record<string, { verifiedHits: number; verifiedCompleted: boolean; lastHitAt: string }>;
};

export default function AnalyticsPage() {
  const [drillSummary, setDrillSummary] = useState<DrillEventsResponse | null>(null);
  const [drillEvents, setDrillEvents] = useState<DrillEvent[]>([]);
  const [progression, setProgression] = useState<DrillProgressionResponse["progression"]>({});

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics() {
      try {
        const [eventsResponse, progressionResponse] = await Promise.all([
          fetch("/api/drills/events", { cache: "no-store" }),
          fetch("/api/drills/progression", { cache: "no-store" }),
        ]);

        const eventsPayload = (await eventsResponse.json().catch(() => ({}))) as DrillEventsResponse;
        const progressionPayload = (await progressionResponse.json().catch(() => ({}))) as DrillProgressionResponse;

        if (!mounted) return;

        if (eventsResponse.ok) {
          setDrillSummary(eventsPayload);
          setDrillEvents(Array.isArray(eventsPayload.events) ? eventsPayload.events : []);
        }

        if (progressionResponse.ok) {
          setProgression(progressionPayload.progression || {});
        }
      } catch {
        if (mounted) {
          setDrillSummary(null);
          setDrillEvents([]);
          setProgression({});
        }
      }
    }

    void loadAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  const verifiedCompletedCount = useMemo(
    () => Object.values(progression).filter((entry) => entry.verifiedCompleted).length,
    [progression]
  );

  const recentVerifiedEvents = useMemo(
    () => drillEvents.filter((event) => event.signatureValid).slice(0, 5),
    [drillEvents]
  );

  const bodyPartWeaknesses = useMemo(() => {
    const verified = drillEvents.filter((event) => event.signatureValid);
    if (!verified.length) {
      return [
        { label: "Footwork", value: 68, color: "#D88B80" },
        { label: "Posture", value: 74, color: "#F3B2AB" },
      ];
    }

    const buckets: Record<DrillEvent["bodyPart"], { sum: number; count: number }> = {
      arms: { sum: 0, count: 0 },
      legs: { sum: 0, count: 0 },
      posture: { sum: 0, count: 0 },
    };

    for (const event of verified) {
      const target = Math.max(1, Number(event.targetScore || 1));
      const pct = Math.max(0, Math.min(100, Math.round((Number(event.achievedScore || 0) / target) * 100)));
      buckets[event.bodyPart].sum += pct;
      buckets[event.bodyPart].count += 1;
    }

    const labels: Record<DrillEvent["bodyPart"], string> = {
      arms: "Arms",
      legs: "Legs",
      posture: "Posture",
    };

    const colors: Record<DrillEvent["bodyPart"], string> = {
      arms: "#b8ff4a",
      legs: "#D88B80",
      posture: "#F3B2AB",
    };

    return (Object.keys(buckets) as DrillEvent["bodyPart"][])
      .map((part) => ({
        label: labels[part],
        value: buckets[part].count > 0 ? Math.round(buckets[part].sum / buckets[part].count) : 0,
        color: colors[part],
      }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 2);
  }, [drillEvents]);

  const dailyTrend = useMemo(() => {
    const verified = drillEvents.filter((event) => event.signatureValid);
    if (!verified.length) {
      return [62, 66, 71, 68, 74, 79, 83];
    }

    const dayMap = new Map<string, { total: number; count: number }>();
    for (const event of verified) {
      const key = new Date(event.createdAt).toISOString().slice(0, 10);
      const target = Math.max(1, Number(event.targetScore || 1));
      const pct = Math.max(0, Math.min(100, Math.round((Number(event.achievedScore || 0) / target) * 100)));
      const current = dayMap.get(key) || { total: 0, count: 0 };
      current.total += pct;
      current.count += 1;
      dayMap.set(key, current);
    }

    return [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([, value]) => Math.round(value.total / Math.max(1, value.count)));
  }, [drillEvents]);

  const trendMax = Math.max(...dailyTrend, 1);

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Progress Analytics</h1>
        <p className="text-zinc-400 mt-2 text-lg">Track your growth over time.</p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Chart Area */}
        <div className="col-span-8 min-h-[300px] rounded-2xl dash-glass dash-card p-8 animate-slide-up">
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Weekly Form Trend</p>
              <p className="mt-2 text-sm text-zinc-300">Average verified drill score by day (last 7 days with activity)</p>
            </div>

            <div className="mt-6 flex h-44 items-end gap-3">
              {dailyTrend.map((value, index) => (
                <div key={`trend-${index}`} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative h-36 w-full overflow-hidden rounded-xl bg-white/5">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-xl bg-gradient-to-t from-[#556d00] to-[#F3B2AB]"
                      style={{ height: `${(value / trendMax) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">D{index + 1}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weaknesses */}
        <div className="col-span-4 rounded-2xl p-6 dash-glass dash-card animate-slide-up">
          <h3 className="text-lg font-bold text-white mb-6">Top Weaknesses</h3>
          <ul className="flex flex-col gap-5">
            {bodyPartWeaknesses.map((w) => (
              <li key={w.label}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm" style={{ color: w.color }}>{w.label}</span>
                  <span className="text-sm text-white font-semibold">{w.value}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${w.value}%`, background: w.color, boxShadow: `0 0 8px ${w.color}40` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl p-6 dash-glass dash-card animate-slide-up">
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Verified Events</p>
          <p className="mt-2 text-3xl font-bold text-white">{drillSummary?.validCount ?? 0}</p>
          <p className="mt-1 text-sm text-zinc-400">{drillSummary ? `${drillSummary.invalidCount} failed checks filtered out` : "Waiting for signed events"}</p>
        </div>

        <div className="rounded-2xl p-6 dash-glass dash-card animate-slide-up">
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Verified Completions</p>
          <p className="mt-2 text-3xl font-bold text-white">{verifiedCompletedCount}</p>
          <p className="mt-1 text-sm text-zinc-400">Drills hit the 3-session target</p>
        </div>

        <div className="rounded-2xl p-6 dash-glass dash-card animate-slide-up">
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Recent Focus</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(recentVerifiedEvents.length > 0 ? recentVerifiedEvents : bodyPartWeaknesses.map((weakness) => ({ bodyPart: weakness.label.toLowerCase() === "arms" ? "arms" : weakness.label.toLowerCase() === "legs" ? "legs" : "posture" } as DrillEvent))).map((event, index) => (
              <span key={`${event.bodyPart}-${index}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200 uppercase tracking-[0.12em]">
                {event.bodyPart}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl p-6 dash-glass dash-card animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Recent Verified Hits</h3>
          <span className="text-xs text-zinc-500">{drillSummary?.total ?? 0} events total</span>
        </div>
        {recentVerifiedEvents.length === 0 ? (
          <p className="text-sm text-zinc-500">No verified drill events yet.</p>
        ) : (
          <div className="space-y-3">
            {recentVerifiedEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {event.bodyPart.toUpperCase()} • {event.achievedScore}/{event.targetScore}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {new Date(event.createdAt).toLocaleString()} • {event.completionSource === "auto-hold" ? "Auto hold" : "Manual end"}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <p>Frames {event.comparedFrames}</p>
                  <p>Samples {event.bodyPartSamples}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
