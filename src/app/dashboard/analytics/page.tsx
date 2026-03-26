"use client";

const weaknesses = [
  { label: "Footwork Speed", value: 72, color: "#9fcd00" },
  { label: "Core Stability", value: 81, color: "#c4ff00" },
];

export default function AnalyticsPage() {
  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Progress Analytics</h1>
        <p className="text-zinc-400 mt-2 text-lg">Track your growth over time.</p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Chart Area */}
        <div className="col-span-8 min-h-[300px] rounded-2xl dash-glass dash-card flex items-center justify-center p-8 animate-slide-up">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4ff00" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <p className="text-zinc-400 text-lg font-medium">Analytics Chart</p>
            <p className="text-zinc-600 text-sm mt-1">Weekly performance trends will appear here</p>
          </div>
        </div>

        {/* Weaknesses */}
        <div className="col-span-4 rounded-2xl p-6 dash-glass dash-card animate-slide-up">
          <h3 className="text-lg font-bold text-white mb-6">Top Weaknesses</h3>
          <ul className="flex flex-col gap-5">
            {weaknesses.map((w) => (
              <li key={w.label}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm" style={{ color: w.color }}>{w.label}</span>
                  <span className="text-sm text-white font-semibold">{w.value}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${w.value}%`, background: w.color, boxShadow: `0 0 8px ${w.color}40` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
