"use client";

import { useCallback, useMemo } from "react";

export type SlowMoMarker = {
  id: string;
  label: string;
  startSeconds: number;
  endSeconds: number;
};

interface SlowMoTimelineProps {
  duration: number;
  markers: SlowMoMarker[];
  onChange: (markers: SlowMoMarker[]) => void;
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds)) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function SlowMoTimeline({ duration, markers, onChange }: SlowMoTimelineProps) {
  const addMarker = useCallback(() => {
    const next = {
      id: generateId(),
      label: `Section ${markers.length + 1}`,
      startSeconds: 0,
      endSeconds: Math.min(5, duration || 5),
    };
    onChange([...markers, next]);
  }, [markers, onChange, duration]);

  const updateMarker = useCallback((id: string, field: keyof SlowMoMarker, value: string | number) => {
    const minGap = 0.5;
    onChange(markers.map((m) => {
      if (m.id !== id) return m;
      const next = { ...m, [field]: Number(value) };
      const start = clamp(next.startSeconds, 0, duration || next.startSeconds);
      const end = clamp(next.endSeconds, 0, duration || next.endSeconds);
      if (field === "startSeconds") {
        next.startSeconds = start;
        next.endSeconds = Math.max(end, start + minGap);
      } else {
        next.endSeconds = Math.max(end, start + minGap);
        next.startSeconds = start;
      }
      if (duration) {
        next.startSeconds = clamp(next.startSeconds, 0, duration);
        next.endSeconds = clamp(next.endSeconds, 0, duration);
      }
      return next;
    }));
  }, [markers, onChange, duration]);

  const removeMarker = useCallback((id: string) => {
    onChange(markers.filter((m) => m.id !== id));
  }, [markers, onChange]);

  const bars = useMemo(() => {
    if (!duration) return [];
    return markers.map((m) => {
      const left = Math.max(0, Math.min(100, (m.startSeconds / duration) * 100));
      const width = Math.max(2, Math.min(100, ((m.endSeconds - m.startSeconds) / duration) * 100));
      return { id: m.id, left: `${left}%`, width: `${width}%` };
    });
  }, [markers, duration]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Slow-Mo Sections</h3>
          <p className="text-xs text-zinc-500">Highlight tricky sections for half-speed practice</p>
        </div>
        <button
          type="button"
          onClick={addMarker}
          className="rounded-xl border border-[#c4ff00]/30 bg-[#c4ff00]/10 px-3 py-1.5 text-xs font-semibold text-[#c4ff00] hover:bg-[#c4ff00]/20 transition"
        >
          + Add Marker
        </button>
      </div>

      {markers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-zinc-400">No slow-motion markers yet</p>
          <p className="text-xs text-zinc-600 mt-1">Optional — helps learners practice tricky sections</p>
        </div>
      )}

      {duration > 0 && markers.length > 0 && (
        <div className="mb-4 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2">
          <div className="relative h-3 rounded-full bg-white/10">
            {bars.map((bar) => (
              <div
                key={bar.id}
                className="absolute top-0 h-3 rounded-full bg-[#c4ff00]/40"
                style={{ left: bar.left, width: bar.width }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {markers.map((m) => (
          <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
              <input
                value={m.label}
                onChange={(e) => updateMarker(m.id, "label", e.target.value)}
                className="bg-transparent text-sm font-medium text-white outline-none"
              />
              <button
                type="button"
                onClick={() => removeMarker(m.id)}
                className="text-zinc-600 hover:text-red-400 transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-500">Start</label>
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={m.startSeconds}
                  onChange={(e) => updateMarker(m.id, "startSeconds", Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500">End</label>
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={m.endSeconds}
                  onChange={(e) => updateMarker(m.id, "endSeconds", Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">{formatTime(m.startSeconds)} → {formatTime(m.endSeconds)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
