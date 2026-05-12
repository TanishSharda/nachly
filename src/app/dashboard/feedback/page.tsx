"use client";

import { useEffect, useMemo, useState } from "react";

type PracticeSession = {
  routineId: string;
  routineTitle: string;
  styleSlug: string;
  accuracy: number;
  consistency: number;
  completion: number;
  date: string;
  elapsed: number;
};

export default function FeedbackPage() {
  const [latestSession, setLatestSession] = useState<PracticeSession | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLatestSession() {
      try {
        const response = await fetch("/api/practice-sessions?limit=1", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!mounted || !response.ok) return;

        const latest = Array.isArray(payload.sessions) ? payload.sessions[0] : null;
        if (latest) {
          setLatestSession(latest);
        }
      } catch {
        // Keep fallback visuals.
      }
    }

    void loadLatestSession();

    return () => {
      mounted = false;
    };
  }, []);

  const overallScore = useMemo(() => {
    if (!latestSession) return 94;
    return Math.round((latestSession.accuracy + latestSession.consistency + latestSession.completion) / 3);
  }, [latestSession]);

  const breakdowns = useMemo(
    () => [
      { label: "Timing", value: `${Math.round(latestSession?.accuracy ?? 98)}%`, color: "#c4ff00" },
      { label: "Energy", value: `${Math.round(latestSession?.consistency ?? 89)}%`, color: "#9fcd00" },
      { label: "Fluidity", value: `${Math.round(latestSession?.completion ?? 91)}%`, color: "#FFFFFF" },
    ],
    [latestSession]
  );

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Session Complete</h1>
        <p className="text-zinc-400 mt-2 text-lg">
          {latestSession
            ? `Latest run: ${latestSession.routineTitle} • ${new Date(latestSession.date).toLocaleString()}`
            : "Here is your detailed AI motion breakdown."}
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl p-8 dash-glass dash-card flex flex-col md:flex-row justify-between items-center gap-8 animate-slide-up">
          {/* Big Score */}
          <div>
            <h2 className="text-7xl font-extrabold text-white" style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>
              {overallScore}
              <span className="text-3xl">%</span>
            </h2>
            <p className="text-zinc-400 mt-1">Overall Accuracy Score</p>
            {latestSession ? <p className="text-xs text-zinc-500 mt-1">Duration: {latestSession.elapsed}s</p> : null}
          </div>

          {/* Breakdowns */}
          <div className="flex gap-10">
            {breakdowns.map((b) => (
              <div key={b.label} className="text-center">
                <h3 className="text-2xl font-bold" style={{ color: b.color }}>{b.value}</h3>
                <p className="text-xs text-zinc-500 mt-1">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
