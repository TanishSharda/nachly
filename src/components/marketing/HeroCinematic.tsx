"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import CursorTrail from "@/components/marketing/CursorTrail";
import dynamic from "next/dynamic";
const WaveformVisualizer = dynamic(() => import("@/components/marketing/WaveformVisualizer"), { ssr: false });
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

        {/* Center - BIG NACHLY headline (full-screen, low opacity) */}
        <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9 }} className="relative flex w-full flex-col items-center gap-6">
          <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
            <h1 className="nachly-hero-text select-none text-center font-extrabold leading-none text-gray-300/10" aria-hidden>
              <span className="block text-[10rem] md:text-[14rem] lg:text-[20rem]">NACHLY</span>
            </h1>
          </div>

          <div className="z-10 flex w-full flex-wrap items-center justify-center gap-4">
            <Link href="/auth?mode=signup" className="marketing-cta marketing-cta-glow rounded-full bg-[#F3B2AB] px-6 py-3 text-sm font-bold uppercase text-black shadow-sm">Start Learning</Link>
            <Link href="/creator/upload" className="marketing-cta rounded-full border border-white/10 px-5 py-3 text-sm font-semibold uppercase text-white">Become Creator</Link>
            <Link href="#how-it-works" className="marketing-cta rounded-full border border-white/10 px-5 py-3 text-sm font-semibold uppercase text-white">
              How it Works
            </Link>
          </div>

          <div className="w-full mt-3 z-10">
            <WaveformVisualizer />
          </div>
        </motion.div>

        {/* side mocks removed for minimal hero */}
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
