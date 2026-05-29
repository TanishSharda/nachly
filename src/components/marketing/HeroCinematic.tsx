"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import CursorTrail from "@/components/marketing/CursorTrail";
import WaveformVisualizer from "@/components/marketing/WaveformVisualizer";
import CinematicIntro from "@/components/marketing/CinematicIntro";

export default function HeroCinematic() {
  return (
    <section className="relative isolate h-screen w-full overflow-hidden bg-[#050505]" data-atmosphere="contemporary">
      {/* background giant typography */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className="hero-giant-typo absolute left-1/2 top-10 -translate-x-1/2 -translate-y-1/2 font-black tracking-tight text-white/6 select-none leading-none transform-gpu blur-sm">
          NACHLY
        </span>
        <div className="absolute inset-0 bg-gradient-to-b from-[#000000e6] to-transparent" />
      </div>

      <div className="section-padding relative z-10 mx-auto flex h-full max-w-7xl items-center gap-8">
        {/* Left - Discover feed mock */}
        <motion.div initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="hidden w-1/4 shrink-0 flex-col gap-4 md:flex">
          <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] p-3 shadow-lg">
            <div className="h-56 w-full rounded-xl bg-black/60" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-3/4 rounded bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-white/8" />
            </div>
          </div>
        </motion.div>

        {/* Center - Recording studio mock */}
        <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9 }} className="flex w-full max-w-3xl flex-col items-center gap-6">
          <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/8 bg-black p-3 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]">
            <div className="aspect-[16/9] w-full rounded-lg bg-black">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-56 w-36 rounded-lg bg-gradient-to-br from-[#1b1b1b] to-[#0b0b0b] shadow-inner" />
              </div>
              <div className="absolute left-4 top-4 rounded-full bg-white/6 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Recording Studio</div>
              <div className="absolute right-4 bottom-4 flex gap-2">
                <div className="h-3 w-24 rounded-full bg-[#F3B2AB]/60" />
                <div className="h-3 w-16 rounded-full bg-white/10" />
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-center gap-4">
            <Link href="/auth?mode=signup" className="marketing-cta marketing-cta-glow rounded-full bg-[#F3B2AB] px-6 py-3 text-sm font-bold uppercase text-black shadow-sm">Start Learning</Link>
            <Link href="/creator/upload" className="marketing-cta rounded-full border border-white/10 px-5 py-3 text-sm font-semibold uppercase text-white">Become Creator</Link>
          </div>

          <div className="w-full mt-3">
            <WaveformVisualizer />
          </div>
        </motion.div>

        {/* Right - Learn mode mock */}
        <motion.div initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="hidden w-1/4 shrink-0 flex-col gap-4 md:flex">
          <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] p-3 shadow-lg">
            <div className="h-56 w-full rounded-xl bg-black/60" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-3/4 rounded bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-white/8" />
            </div>
          </div>
        </motion.div>
      </div>

      <CursorTrail />

      {/* subtle ambient gradients and beam */}
      <div className="pointer-events-none absolute inset-0 -z-20 opacity-30">
        <div className="absolute left-0 top-1/4 h-96 w-1/3 bg-gradient-to-r from-[#1e1b26] to-transparent blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-1/3 bg-gradient-to-l from-[#2b1212] to-transparent blur-3xl" />
      </div>

      <div className="marketing-atmosphere-overlay" />
      <CinematicIntro />
    </section>
  );
}
