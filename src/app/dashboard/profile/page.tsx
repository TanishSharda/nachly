/* eslint-disable @next/next/no-img-element */
"use client";

export default function DashProfilePage() {
  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Profile</h1>
      </header>

      <div className="rounded-2xl p-8 dash-glass dash-card flex items-center gap-8 animate-slide-up">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
          alt="User"
          className="w-24 h-24 rounded-full bg-white/10"
        />
        <div>
          <h2 className="text-2xl font-bold text-white">Alex T.</h2>
          <p className="text-nred-300 font-medium mt-1">Elite Tier Dancer</p>
          <div className="flex gap-2 mt-3">
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-zinc-300">Hip Hop</span>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-zinc-300">Popping</span>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-zinc-300">Breakdance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
