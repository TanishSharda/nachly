"use client";

export default function SettingsPage() {
  return (
    <div className="animate-fade-in max-w-2xl">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Settings</h1>
      </header>

      <div className="rounded-2xl p-8 dash-glass dash-card animate-slide-up">
        <div className="space-y-8">
          {/* Camera Input */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Camera Input</h3>
            <select className="w-full p-3 bg-white/5 border border-white/10 text-white rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-nred-500 transition-all">
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
              defaultValue="70"
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-nred-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(196,255,0,0.55)] [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Theme */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Theme</h3>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-xl bg-white/10 text-white border border-white/10 text-sm font-medium hover:bg-white/20 transition-all">Dark</button>
              <button className="px-4 py-2 rounded-xl bg-transparent text-zinc-500 border border-white/5 text-sm font-medium hover:bg-white/5 transition-all cursor-not-allowed" disabled>Light (Coming Soon)</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
