"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [cameraInput, setCameraInput] = useState("FaceTime HD Camera");
  const [aiSensitivity, setAiSensitivity] = useState(70);
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/choreographer/profile", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!mounted || !response.ok || !payload?.profile) return;

        setCameraInput(payload.profile.cameraInput || "FaceTime HD Camera");
        setAiSensitivity(Number.isFinite(payload.profile.aiSensitivity) ? payload.profile.aiSensitivity : 70);
        setTheme(payload.profile.theme === "light" ? "light" : "dark");
      } catch {
        // Keep defaults.
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/choreographer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameraInput,
          aiSensitivity,
          theme,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Unable to save settings");
        return;
      }

      setMessage("Settings saved successfully.");
    } catch {
      setMessage("Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Settings</h1>
      </header>

      <div className="rounded-2xl p-8 dash-glass dash-card animate-slide-up">
        <div className="space-y-8">
          {loading ? <p className="text-sm text-zinc-400">Loading settings...</p> : null}

          {/* Camera Input */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Camera Input</h3>
            <select value={cameraInput} onChange={(event) => setCameraInput(event.target.value)} className="w-full p-3 bg-white/5 border border-white/10 text-white rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-nred-500 transition-all">
              <option>FaceTime HD Camera</option>
              <option>Logitech C920</option>
              <option>External USB Camera</option>
            </select>
          </div>

          {/* AI Sensitivity */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">AI Sensitivity</h3>
            <input
              type="range"
              min="0"
              max="100"
              value={aiSensitivity}
              onChange={(event) => setAiSensitivity(Number(event.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-nred-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(196,255,0,0.55)] [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>Low</span>
              <span>{aiSensitivity}%</span>
            </div>
          </div>

          {/* Theme */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Theme</h3>
            <div className="flex gap-3">
              <button type="button" onClick={() => setTheme("dark")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${theme === "dark" ? "bg-white/10 text-white border-white/10" : "bg-transparent text-zinc-500 border-white/5 hover:bg-white/5"}`}>
                Dark
              </button>
              <button type="button" onClick={() => setTheme("light")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${theme === "light" ? "bg-white/10 text-white border-white/10" : "bg-transparent text-zinc-500 border-white/5 hover:bg-white/5"}`}>
                Light
              </button>
            </div>
          </div>

          {message ? <p className="text-sm text-zinc-300">{message}</p> : null}

          <button type="button" onClick={handleSave} disabled={saving} className="rounded-xl bg-gradient-to-r from-[#c4ff00] to-[#7b9e00] px-6 py-3 text-sm font-bold text-[#0a0a0a] transition hover:brightness-110 disabled:opacity-50">
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
