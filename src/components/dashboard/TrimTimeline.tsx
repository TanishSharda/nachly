"use client";

import { useMemo } from "react";

interface TrimTimelineProps {
  duration: number;
  startSeconds: number;
  endSeconds: number;
  onChange: (next: { startSeconds: number; endSeconds: number }) => void;
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds)) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function TrimTimeline({ duration, startSeconds, endSeconds, onChange }: TrimTimelineProps) {
  const minGap = Math.min(0.5, duration / 60);
  const safeStart = Math.max(0, Math.min(startSeconds, duration));
  const safeEnd = Math.max(safeStart + minGap, Math.min(endSeconds, duration));

  const progress = useMemo(() => {
    if (!duration) return { left: "0%", width: "100%" };
    const left = (safeStart / duration) * 100;
    const width = ((safeEnd - safeStart) / duration) * 100;
    return { left: `${left}%`, width: `${width}%` };
  }, [duration, safeStart, safeEnd]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
        <span>Trim window</span>
        <span>{formatTime(safeStart)} → {formatTime(safeEnd)} / {formatTime(duration)}</span>
      </div>
      <div className="relative h-10 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800">
        <div className="absolute inset-0 rounded-xl border border-white/5" />
        <div
          className="absolute top-1.5 h-7 rounded-lg bg-[#F3B2AB]/20 border border-[#F3B2AB]/40"
          style={progress}
        />
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={safeStart}
          onChange={(e) => {
            const nextStart = Number(e.target.value);
            const bounded = Math.min(nextStart, safeEnd - minGap);
            onChange({ startSeconds: bounded, endSeconds: safeEnd });
          }}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          aria-label="Trim start"
        />
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={safeEnd}
          onChange={(e) => {
            const nextEnd = Number(e.target.value);
            const bounded = Math.max(nextEnd, safeStart + minGap);
            onChange({ startSeconds: safeStart, endSeconds: bounded });
          }}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          aria-label="Trim end"
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-zinc-500">Start (seconds)</label>
          <input
            type="number"
            min={0}
            max={duration}
            step={0.1}
            value={safeStart}
            onChange={(e) => {
              const nextStart = Number(e.target.value);
              const bounded = Math.min(nextStart, safeEnd - minGap);
              onChange({ startSeconds: Math.max(0, bounded), endSeconds: safeEnd });
            }}
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#F3B2AB]/40"
          />
        </div>
        <div>
          <label className="text-[11px] text-zinc-500">End (seconds)</label>
          <input
            type="number"
            min={0}
            max={duration}
            step={0.1}
            value={safeEnd}
            onChange={(e) => {
              const nextEnd = Number(e.target.value);
              const bounded = Math.max(nextEnd, safeStart + minGap);
              onChange({ startSeconds: safeStart, endSeconds: Math.min(duration, bounded) });
            }}
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#F3B2AB]/40"
          />
        </div>
      </div>
    </div>
  );
}
