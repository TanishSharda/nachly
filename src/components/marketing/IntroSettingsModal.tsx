"use client";

import React, { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function IntroSettingsModal({ open, onClose }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.6);

  useEffect(() => {
    try {
      const e = localStorage.getItem("nachly_intro_enabled");
      const v = localStorage.getItem("nachly_intro_volume");
      if (e !== null) setTimeout(() => setEnabled(e === "true"), 0);
      if (v !== null) setTimeout(() => setVolume(Number(v)), 0);
    } catch (err) {
      /* ignore */
    }
  }, [open]);

  const save = () => {
    try {
      localStorage.setItem("nachly_intro_enabled", enabled ? "true" : "false");
      localStorage.setItem("nachly_intro_volume", String(volume));
      // notify running components
      window.dispatchEvent(new CustomEvent("nachlyIntroSettingsChanged", { detail: { enabled, volume } }));
      // persist for logged-in users
      try {
        fetch("/api/auth/preferences", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ intro_enabled: enabled, intro_volume: volume }),
        }).catch(() => {});
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      /* ignore */
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-11/12 max-w-md rounded-lg bg-[#0b0b0b] p-6 shadow-lg border border-[#222]">
        <h3 className="text-lg font-semibold mb-4">Intro Settings</h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span>Play intro on visit</span>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          </label>

          <label className="block">
            <div className="flex items-center justify-between mb-1">
              <span>Intro volume</span>
              <span className="text-sm opacity-70">{Math.round(volume * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          </label>

          {/* voiceover removed per request */}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="px-3 py-2 hover:opacity-80" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-[#7a5c3a] text-black rounded-md" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
