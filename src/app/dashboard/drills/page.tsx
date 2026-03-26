"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredDrills, type StoredDrill } from "@/lib/ai/session-storage";

type DrillBodyPartFilter = "all" | "arms" | "legs" | "posture";

interface SignedDrillEventsSummary {
  total: number;
  validCount: number;
  invalidCount: number;
}

interface SignedDrillEvent {
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
}

interface SignedDrillEventsResponse extends SignedDrillEventsSummary {
  events: SignedDrillEvent[];
}

interface VerifiedProgression {
  verifiedHits: number;
  verifiedCompleted: boolean;
  lastHitAt: string;
}

interface VerifiedProgressionResponse {
  progression: Record<string, VerifiedProgression>;
}

interface DrillCatalogResponse {
  drills: StoredDrill[];
}

async function syncDrillsToCatalog(drills: StoredDrill[]) {
  if (drills.length === 0) return;

  try {
    await fetch("/api/drills/catalog/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drills }),
    });
  } catch {
    // Keep local-only experience if network/auth is unavailable.
  }
}

export default function DrillsPage() {
  const [drills, setDrills] = useState<StoredDrill[]>([]);
  const [signedSummary, setSignedSummary] = useState<SignedDrillEventsSummary | null>(null);
  const [signedEvents, setSignedEvents] = useState<SignedDrillEvent[]>([]);
  const [verifiedProgression, setVerifiedProgression] = useState<Record<string, VerifiedProgression>>({});
  const [bodyPartFilter, setBodyPartFilter] = useState<DrillBodyPartFilter>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    const localDrills = getStoredDrills(40);

    void (async () => {
      try {
        const response = await fetch("/api/drills/catalog", { method: "GET" });
        if (response.ok) {
          const data = (await response.json()) as DrillCatalogResponse;
          const remoteDrills = Array.isArray(data.drills) ? data.drills : [];
          if (remoteDrills.length > 0) {
            setDrills(remoteDrills);
            if (localDrills.length > 0) {
              void syncDrillsToCatalog(localDrills);
            }
            return;
          }
        }
      } catch {
        // Fallback to local drills below.
      }

      setDrills(localDrills);
      if (localDrills.length > 0) {
        void syncDrillsToCatalog(localDrills);
      }
    })();

    void (async () => {
      try {
        const response = await fetch("/api/drills/events", { method: "GET" });
        if (!response.ok) return;
        const data = (await response.json()) as SignedDrillEventsResponse;
        setSignedSummary(data);
        setSignedEvents(data.events || []);
      } catch {
        // Non-blocking dashboard enrichment.
      }
    })();

    void (async () => {
      try {
        const response = await fetch("/api/drills/progression", { method: "GET" });
        if (!response.ok) return;
        const data = (await response.json()) as VerifiedProgressionResponse;
        setVerifiedProgression(data.progression || {});
      } catch {
        // Non-blocking dashboard enrichment.
      }
    })();
  }, []);

  const active = drills.filter((drill) => !drill.completedAt);
  const completed = drills.filter((drill) => Boolean(drill.completedAt));
  const recentVerifiedEvents = signedEvents.filter((event) => event.signatureValid).slice(0, 8);

  const matchesFilter = (drill: StoredDrill) =>
    bodyPartFilter === "all" || drill.bodyPart === bodyPartFilter;

  const passesVerificationFilter = (drill: StoredDrill) =>
    !verifiedOnly || Boolean(verifiedProgression[drill.id]);

  const filteredActive = active.filter((drill) => matchesFilter(drill) && passesVerificationFilter(drill));
  const filteredCompleted = completed.filter((drill) => matchesFilter(drill) && passesVerificationFilter(drill));

  return (
    <div className="animate-fade-in max-w-5xl">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">My Drills</h1>
        <p className="text-zinc-400 mt-2 text-lg">Complete the same drill target for 3 sessions to unlock promotion.</p>
        {signedSummary && (
          <div className="mt-4 rounded-xl border border-nred-400/30 bg-nred-500/10 px-4 py-3 text-xs text-nred-100">
            Trusted completion events: {signedSummary.validCount}/{signedSummary.total}
            {signedSummary.invalidCount > 0 && (
              <span className="ml-2 text-amber-300">({signedSummary.invalidCount} failed signature checks)</span>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["all", "arms", "legs", "posture"] as DrillBodyPartFilter[]).map((part) => (
            <button
              key={part}
              type="button"
              onClick={() => setBodyPartFilter(part)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                bodyPartFilter === part
                  ? "bg-nred-500/20 text-nred-200"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10"
              }`}
            >
              {part === "all" ? "All Body Parts" : part[0].toUpperCase() + part.slice(1)}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setVerifiedOnly((value) => !value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              verifiedOnly
                ? "bg-nred-500/20 text-nred-200"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            {verifiedOnly ? "Verified Only: ON" : "Verified Only: OFF"}
          </button>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Active Drills</h2>
        {filteredActive.length === 0 ? (
          <div className="rounded-2xl p-6 dash-glass dash-card text-zinc-400">No active drills yet. Finish a practice session to get your first drill.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredActive.map((drill) => {
              const verified = verifiedProgression[drill.id];
              const displayStreak = verified ? Math.min(3, verified.verifiedHits) : drill.currentStreak;
              const verifiedDone = Boolean(verified?.verifiedCompleted);

              return (
              <article key={drill.id} className="rounded-2xl p-5 dash-glass dash-card border border-nred-500/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">{drill.title}</h3>
                  <span className="text-xs text-nred-400">Lv {drill.level}</span>
                </div>
                <p className="text-sm text-zinc-300 mb-3">{drill.cue}</p>
                <div className="text-xs text-zinc-400 mb-2">
                  Focus: {drill.bodyPart} • Duration: {drill.durationSeconds}s • Target: {drill.targetScore}
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Streak Progress</span>
                    <span>{displayStreak}/3</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-nred-600 to-nred-400 transition-all"
                      style={{ width: `${Math.min(100, (displayStreak / 3) * 100)}%` }}
                    />
                  </div>
                </div>
                {verified && (
                  <p className="mt-2 text-[11px] text-nred-300">
                    Verified hits: {verified.verifiedHits}
                    {verifiedDone ? " • verified complete" : ""}
                  </p>
                )}
                <div className="mt-4">
                  {drill.styleSlug && drill.routineSlug ? (
                    <Link
                      href={`/explore/${drill.styleSlug}/${drill.routineSlug}/practice?drillFocus=${drill.bodyPart}&drillId=${drill.id}&target=${drill.targetScore}&loop=1&slow=1&autoStart=1`}
                      className="inline-flex items-center rounded-lg bg-nred-500/20 px-3 py-1.5 text-xs font-semibold text-nred-200 transition-colors hover:bg-nred-500/30"
                    >
                      Loop This Weak Spot
                    </Link>
                  ) : (
                    <span className="inline-flex items-center rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-400">
                      Loop launch unavailable for this drill
                    </span>
                  )}
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-4">Completed Drills</h2>
        {filteredCompleted.length === 0 ? (
          <div className="rounded-2xl p-6 dash-glass dash-card text-zinc-500">No completed drills yet.</div>
        ) : (
          <div className="space-y-3">
            {filteredCompleted.map((drill) => {
              const verified = verifiedProgression[drill.id];
              const displayStreak = verified ? Math.min(3, verified.verifiedHits) : drill.currentStreak;

              return (
              <article key={drill.id} className="rounded-xl p-4 dash-glass dash-card border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{drill.title}</h3>
                  <span className="text-xs text-emerald-400">Completed</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Focus: {drill.bodyPart} • Target: {drill.targetScore} • Final streak: {displayStreak}/3
                </p>
                {verified && (
                  <p className="text-[11px] text-nred-300 mt-1">
                    Verified hits: {verified.verifiedHits} • Last: {new Date(verified.lastHitAt).toLocaleDateString()}
                  </p>
                )}
              </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-white mb-4">Recent Verified Events</h2>
        {recentVerifiedEvents.length === 0 ? (
          <div className="rounded-2xl p-6 dash-glass dash-card text-zinc-500">No verified events yet.</div>
        ) : (
          <div className="space-y-2">
            {recentVerifiedEvents.map((event) => (
              <div key={event.id} className="rounded-xl p-3 border border-nred-400/20 bg-nred-500/5">
                <p className="text-xs text-white font-semibold">
                  {event.bodyPart.toUpperCase()} • {event.achievedScore}/{event.targetScore}
                  <span className="ml-2 text-nred-300">{event.completionSource === "auto-hold" ? "AUTO" : "MANUAL"}</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {new Date(event.createdAt).toLocaleString()} • Frames {event.comparedFrames} • Samples {event.bodyPartSamples}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
