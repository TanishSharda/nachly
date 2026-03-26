"use client";

import { motion } from "framer-motion";

interface BeatPulseProps {
  beatCount: number;
  bpm: number;
  isOnBeat: boolean;
}

/**
 * Visual beat pulse indicator — syncs to detected audio beats.
 * Shows a pulsing ring and BPM display.
 */
export default function BeatPulse({ beatCount, bpm, isOnBeat }: BeatPulseProps) {
  if (bpm === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Pulse ring */}
      <motion.div
        key={beatCount}
        initial={{ scale: 1.4, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 0.3 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`w-4 h-4 rounded-full border-2 ${
          isOnBeat
            ? "border-nred-500 bg-nred-500/30"
            : "border-white/20 bg-white/5"
        }`}
      />
      <span className="text-[10px] font-mono text-white/40">
        {bpm} BPM
      </span>
    </div>
  );
}
