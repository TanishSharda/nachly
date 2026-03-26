"use client";

const breakdowns = [
  { label: "Timing", value: "98%", color: "#c4ff00" },
  { label: "Energy", value: "89%", color: "#9fcd00" },
  { label: "Fluidity", value: "91%", color: "#FFFFFF" },
];

export default function FeedbackPage() {
  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Session Complete</h1>
        <p className="text-zinc-400 mt-2 text-lg">Here is your detailed AI motion breakdown.</p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl p-8 dash-glass dash-card flex flex-col md:flex-row justify-between items-center gap-8 animate-slide-up">
          {/* Big Score */}
          <div>
            <h2 className="text-7xl font-extrabold text-white" style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>
              94<span className="text-3xl">%</span>
            </h2>
            <p className="text-zinc-400 mt-1">Overall Accuracy Score</p>
          </div>

          {/* Breakdowns */}
          <div className="flex gap-10">
            {breakdowns.map((b) => (
              <div key={b.label} className="text-center">
                <h3 className="text-2xl font-bold" style={{ color: b.color }}>{b.value}</h3>
                <p className="text-xs text-zinc-500 mt-1">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
