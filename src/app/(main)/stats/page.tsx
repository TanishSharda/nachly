"use client";

import { useEffect, useMemo, useState } from "react";
import { getSessions, getStreak } from "@/lib/ai/session-storage";

type LeaderboardEntry = {
  userId: string;
  name: string;
  avg_ai_score: number;
  best_score: number;
  consistency_score: number;
  improvement_rate: number;
  total_sessions: number;
  ranking_score: number;
};

type MeEntry = LeaderboardEntry & {
  rank: number;
  improvement_last_7_days: number;
};

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
  me: MeEntry | null;
};

type AttemptRecord = {
  score: number;
  createdAt: number;
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function calculateBodyPartAccuracy() {
  const sessions = getSessions();
  if (sessions.length === 0) return { Arms: 0, Legs: 0, Posture: 0 };
  return {
    Arms: Math.round(sessions.reduce((s, x) => s + Number(x.accuracy || 0), 0) / sessions.length),
    Legs: Math.round(sessions.reduce((s, x) => s + Number(x.consistency || 0), 0) / sessions.length),
    Posture: Math.round(sessions.reduce((s, x) => s + Number(x.completion || 0), 0) / sessions.length),
  };
}

function TrendGraph({ points }: { points: AttemptRecord[] }) {
  if (points.length === 0) {
    return <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">No AI score history yet.</div>;
  }

  const width = 720;
  const height = 220;
  const padX = 36;
  const padY = 20;
  const minY = 0;
  const maxY = 100;

  const xStep = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
  const yScale = (height - padY * 2) / (maxY - minY);

  const path = points
    .map((point, idx) => {
      const x = padX + xStep * idx;
      const y = height - padY - (point.score - minY) * yScale;
      return `${idx === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-gold/10 bg-obsidian-100 p-6 shadow-xl">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full">
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D3C4B8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D3C4B8" stopOpacity="1" />
          </linearGradient>
        </defs>
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="rgba(211,196,184,0.1)" strokeWidth="1" />
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="rgba(211,196,184,0.1)" strokeWidth="1" />
        <path d={path} fill="none" stroke="url(#line-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, idx) => {
          const x = padX + xStep * idx;
          const y = height - padY - point.score * yScale;
          return <circle key={`${point.createdAt}-${idx}`} cx={x} cy={y} r="3" fill="#D3C4B8" className="drop-shadow-[0_0_8px_rgba(211,196,184,0.5)]" />;
        })}
      </svg>
      <div className="mt-4 flex justify-between text-[10px] uppercase tracking-widest text-[#E7E5E5]/40 font-medium">
        <span>{formatDate(points[0].createdAt)}</span>
        <span>Current Progress</span>
        <span>{formatDate(points[points.length - 1].createdAt)}</span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<MeEntry | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [leaderboardRes, attemptsRes] = await Promise.all([
          fetch("/api/leaderboard", { cache: "no-store" }),
          fetch("/api/attempts", { cache: "no-store" }),
        ]);

        if (!mounted) return;

        if (leaderboardRes.ok) {
          const data = (await leaderboardRes.json()) as LeaderboardResponse;
          setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
          setMe(data.me || null);
        }

        if (attemptsRes.ok) {
          const payload = await attemptsRes.json();
          const points = Array.isArray(payload?.attempts)
            ? payload.attempts
                .map((attempt: { score: number; createdAt: number }) => ({
                  score: Math.max(0, Math.min(100, Number(attempt.score || 0))),
                  createdAt: Number(attempt.createdAt || Date.now()),
                }))
                .sort((a: AttemptRecord, b: AttemptRecord) => a.createdAt - b.createdAt)
                .slice(-14)
            : [];
          setAttempts(points);
        }
      } catch {
        if (!mounted) return;
        setLeaderboard([]);
        setMe(null);
        setAttempts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const sessions = useMemo(() => getSessions(), []);
  const streak = useMemo(() => getStreak(), []);
  const bodyPart = useMemo(() => calculateBodyPartAccuracy(), []);

  const bestScore = useMemo(
    () => (attempts.length ? Math.max(...attempts.map((entry) => entry.score)) : 0),
    [attempts]
  );

  const practiceMinutes = useMemo(
    () => Math.round(sessions.reduce((sum, session) => sum + Number(session.elapsed || 0), 0) / 60),
    [sessions]
  );

  const progressCompare = useMemo(() => {
    if (attempts.length < 2) return { past: attempts[0]?.score || 0, current: attempts[0]?.score || 0 };
    const midpoint = Math.floor(attempts.length / 2);
    const firstHalf = attempts.slice(0, midpoint);
    const secondHalf = attempts.slice(midpoint);
    const avg = (arr: AttemptRecord[]) => (arr.length ? arr.reduce((s, x) => s + x.score, 0) / arr.length : 0);
    return { past: Math.round(avg(firstHalf)), current: Math.round(avg(secondHalf)) };
  }, [attempts]);

  return (
    <div className="section-padding py-5 sm:py-8 tab-screen-enter">
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold app-accent-text">AI Performance Stats</h1>
        <p className="mt-1 text-sm text-zinc-300">Personal AI coach analytics and global ranking.</p>
      </div>

      <div className="mb-8 rounded-[32px] border border-gold/15 bg-obsidian-100 p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold/60 font-semibold mb-2">Kinetic Standing</p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-6xl font-extralight tracking-tighter text-[#E7E5E5]">#{me?.rank || "-"}</p>
              <p className="mt-2 text-sm font-light text-[#E7E5E5]/60 tracking-wide italic">Average Kinetic Mastery: {me?.avg_ai_score ?? 0}%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E7E5E5]/40 mb-1">Weekly Evolution</p>
              <p className={`text-3xl font-light tracking-tight ${(me?.improvement_last_7_days || 0) >= 0 ? "text-gold" : "text-white/60"}`}>
                {(me?.improvement_last_7_days || 0) >= 0 ? "+" : ""}
                {me?.improvement_last_7_days ?? 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-white/10 bg-zinc-950/75 p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">AI Score Over Time</h2>
            <TrendGraph points={attempts} />
          </section>

          <section className="rounded-3xl border border-gold/5 bg-obsidian-100 p-6 shadow-sm">
            <h2 className="mb-6 text-[11px] uppercase tracking-[0.3em] font-semibold text-gold/80">Global Mastery</h2>
            {loading ? (
              <p className="text-xs font-light text-[#E7E5E5]/40 italic">Syncing with sanctuary...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-xs font-light text-[#E7E5E5]/40 italic">The sanctuary is currently quiet.</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.slice(0, 50).map((entry, idx) => {
                  const isSelf = Boolean(me && entry.userId === me.userId);
                  return (
                    <div
                      key={entry.userId}
                      className={`group rounded-2xl border p-4 transition-all duration-500 hover:scale-[1.01] ${
                        isSelf ? "border-gold/30 bg-gold/5 shadow-lg" : "border-white/5 bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-5">
                          <span className={`text-lg font-light ${idx < 3 ? "text-gold" : "text-[#E7E5E5]/20"}`}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <p className="text-sm font-medium tracking-wide text-[#E7E5E5] group-hover:text-gold transition-colors">{entry.name}</p>
                            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-[#E7E5E5]/30">
                              {entry.avg_ai_score}% ACCURACY • CONSISTENCY {entry.consistency_score}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-light text-gold tracking-tighter">{entry.ranking_score}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[32px] border border-gold/5 bg-obsidian-100 p-6 space-y-6">
            <div className="group">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E7E5E5]/40 font-medium">Personal Best</p>
              <p className="mt-1 text-4xl font-extralight tracking-tighter text-gold group-hover:scale-110 transition-transform origin-left duration-700">{bestScore}%</p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E7E5E5]/40 font-medium">Flow Streak</p>
              <p className="mt-1 text-4xl font-extralight tracking-tighter text-[#E7E5E5]">{streak.count} DAYS</p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E7E5E5]/40 font-medium font-semibold mb-4">Body Kinetics</p>
              {Object.entries(bodyPart).map(([label, value]) => (
                <div key={label} className="mb-4 last:mb-0">
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-gold/60">
                    <span>{label}</span>
                    <span className="text-[#E7E5E5]">{value}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-gold/5 overflow-hidden">
                    <div className="h-full bg-gold/40 rounded-full transition-all duration-1000 ease-out-quint" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gold/5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E7E5E5]/40 font-medium">Kinetic Evolution</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center group">
                  <p className="text-[9px] uppercase tracking-widest text-[#E7E5E5]/30 mb-1">Legacy</p>
                  <p className="text-xl font-light text-[#E7E5E5]/60">{progressCompare.past}%</p>
                </div>
                <div className="rounded-2xl border border-gold/10 bg-gold/5 p-4 text-center group">
                  <p className="text-[9px] uppercase tracking-widest text-gold/40 mb-1">Flow</p>
                  <p className="text-xl font-light text-gold">{progressCompare.current}%</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
