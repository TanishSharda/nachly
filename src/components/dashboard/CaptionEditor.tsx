"use client";

import { useCallback } from "react";

export type CaptionOverlay = {
  id: string;
  timecode: string;
  text: string;
  position: "top" | "center" | "bottom";
};

interface CaptionEditorProps {
  captions: CaptionOverlay[];
  onChange: (captions: CaptionOverlay[]) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function CaptionEditor({ captions, onChange }: CaptionEditorProps) {
  const addCaption = useCallback(() => {
    onChange([
      ...captions,
      { id: generateId(), timecode: "0:00", text: "", position: "bottom" },
    ]);
  }, [captions, onChange]);

  const updateCaption = useCallback((id: string, field: keyof CaptionOverlay, value: string) => {
    onChange(captions.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }, [captions, onChange]);

  const removeCaption = useCallback((id: string) => {
    onChange(captions.filter((c) => c.id !== id));
  }, [captions, onChange]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Caption Overlays</h3>
          <p className="text-xs text-zinc-500">Add time-stamped coaching notes</p>
        </div>
        <button
          type="button"
          onClick={addCaption}
          className="rounded-xl border border-[#c4ff00]/30 bg-[#c4ff00]/10 px-3 py-1.5 text-xs font-semibold text-[#c4ff00] hover:bg-[#c4ff00]/20 transition"
        >
          + Add Caption
        </button>
      </div>

      {captions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-zinc-400">No captions yet</p>
          <p className="text-xs text-zinc-600 mt-1">Add overlay notes to guide learners</p>
        </div>
      )}

      <div className="space-y-3">
        {captions.map((caption) => (
          <div key={caption.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Overlay</span>
              <button
                type="button"
                onClick={() => removeCaption(caption.id)}
                className="text-zinc-600 hover:text-red-400 transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={caption.timecode}
                  onChange={(e) => updateCaption(caption.id, "timecode", e.target.value)}
                  placeholder="0:12"
                  className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-2 text-xs text-white placeholder-zinc-600 outline-none"
                />
                <select
                  value={caption.position}
                  onChange={(e) => updateCaption(caption.id, "position", e.target.value)}
                  className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-2 text-xs text-white outline-none"
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
                <input
                  value={caption.text}
                  onChange={(e) => updateCaption(caption.id, "text", e.target.value)}
                  placeholder="Caption text"
                  className="col-span-3 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-2 text-xs text-white placeholder-zinc-600 outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
