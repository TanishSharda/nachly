"use client";

import { useCallback } from "react";

interface LessonPart {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  description: string;
}

interface LessonBuilderProps {
  parts: LessonPart[];
  onPartsChange: (parts: LessonPart[]) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function LessonBuilder({ parts, onPartsChange }: LessonBuilderProps) {
  const addPart = useCallback(() => {
    onPartsChange([
      ...parts,
      { id: generateId(), label: `Part ${parts.length + 1}`, startTime: "", endTime: "", description: "" },
    ]);
  }, [parts, onPartsChange]);

  const removePart = useCallback((id: string) => {
    onPartsChange(parts.filter((p) => p.id !== id));
  }, [parts, onPartsChange]);

  const updatePart = useCallback((id: string, field: keyof LessonPart, value: string) => {
    onPartsChange(parts.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }, [parts, onPartsChange]);

  const movePart = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= parts.length) return;
    const copy = [...parts];
    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
    onPartsChange(copy);
  }, [parts, onPartsChange]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Lesson Structure</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Break your choreography into learnable parts</p>
        </div>
        <button
          type="button"
          onClick={addPart}
          className="flex items-center gap-1.5 rounded-xl border border-[#F3B2AB]/30 bg-[#F3B2AB]/10 px-3 py-1.5 text-xs font-semibold text-[#F3B2AB] transition hover:bg-[#F3B2AB]/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Add Part
        </button>
      </div>

      {parts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-zinc-400">No parts yet</p>
          <p className="mt-1 text-xs text-zinc-600">Add parts to structure your choreography into learnable segments</p>
          <button type="button" onClick={addPart} className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition">
            Add First Part
          </button>
        </div>
      )}

      <div className="space-y-3">
        {parts.map((part, index) => (
          <div key={part.id} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => movePart(index, -1)} disabled={index === 0} className="text-zinc-600 hover:text-white disabled:opacity-20 transition">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button type="button" onClick={() => movePart(index, 1)} disabled={index === parts.length - 1} className="text-zinc-600 hover:text-white disabled:opacity-20 transition">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3B2AB]/10 text-xs font-bold text-[#F3B2AB]">
                  {index + 1}
                </span>
              </div>
              <button type="button" onClick={() => removePart(part.id)} className="text-zinc-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <input
                value={part.label}
                onChange={(e) => updatePart(part.id, "label", e.target.value)}
                placeholder="Part name (e.g. Intro Groove)"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={part.startTime}
                  onChange={(e) => updatePart(part.id, "startTime", e.target.value)}
                  placeholder="Start (e.g. 0:00)"
                  className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40"
                />
                <input
                  value={part.endTime}
                  onChange={(e) => updatePart(part.id, "endTime", e.target.value)}
                  placeholder="End (e.g. 0:30)"
                  className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40"
                />
              </div>
              <input
                value={part.description}
                onChange={(e) => updatePart(part.id, "description", e.target.value)}
                placeholder="Brief description (optional)"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
