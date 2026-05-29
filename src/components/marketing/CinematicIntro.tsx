"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function CinematicIntro() {
  const [visible, setVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [volumeOverride, setVolumeOverride] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const seen = localStorage.getItem("nachly_seen_intro") === "true";
    const enabledFlag = localStorage.getItem("nachly_intro_enabled");
    const enabled = enabledFlag === null ? true : enabledFlag === "true";
    const vol = localStorage.getItem("nachly_intro_volume");
    if (vol !== null) setVolumeOverride(Number(vol));

    if (!enabled) return; // don't auto-show if disabled in settings

    const handleShow = (e?: any) => {
      const preview = e?.detail?.preview === true;
      if (preview) {
        setPreviewMode(true);
        setVisible(true);
        return;
      }
      if (!seen) setVisible(true);
    };

    // show on mount if not seen
    handleShow();
    window.addEventListener("showCinematicIntro", handleShow as EventListener);
    return () => {
      window.removeEventListener("showCinematicIntro", handleShow as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => {
        setVisible(false);
        if (!previewMode) localStorage.setItem("nachly_seen_intro", "true");
      }, 700);
      return () => clearTimeout(t);
    }

    let ctx: AudioContext | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      ctx = null;
    }

    const now = ctx ? ctx.currentTime : 0;

    if (ctx) {
      const master = ctx.createGain();
      const savedVol = volumeOverride ?? (localStorage.getItem("nachly_intro_volume") ? Number(localStorage.getItem("nachly_intro_volume")) : 0.6);
      master.gain.value = Math.max(0, Math.min(1, savedVol)); /* respect saved volume */
      master.connect(ctx.destination);

      const kickTimes = [0, 0.42, 0.84, 1.26];
      kickTimes.forEach((t) => {
        const o = ctx!.createOscillator();
        const g = ctx!.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(160, now + t);
        o.frequency.exponentialRampToValueAtTime(55, now + t + 0.12);
        g.gain.setValueAtTime(0, now + t);
        g.gain.linearRampToValueAtTime(0.85, now + t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.48);
        o.connect(g);
        g.connect(master);
        o.start(now + t);
        o.stop(now + t + 0.5);
      });

      const makeNoiseBuffer = () => {
        const bufferSize = ctx!.sampleRate * 0.04;
        const buffer = ctx!.createBuffer(1, bufferSize, ctx!.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        return buffer;
      };

      const hhTimes = [0.18, 0.58, 0.98, 1.38];
      hhTimes.forEach((t) => {
        const src = ctx!.createBufferSource();
        src.buffer = makeNoiseBuffer();
        const g = ctx!.createGain();
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.24, now + t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05);
        src.connect(g);
        g.connect(master);
        src.start(now + t);
      });

      // voiceover disabled by user preference; no voice playback.

      const pad = ctx.createOscillator();
      const padG = ctx.createGain();
      pad.type = "triangle";
      pad.frequency.setValueAtTime(110, now);
      padG.gain.setValueAtTime(0, now);
      padG.gain.linearRampToValueAtTime(0.045, now + 0.02);
      padG.gain.linearRampToValueAtTime(0.015, now + 1.6);
      pad.connect(padG);
      padG.connect(master);
      pad.start(now);
      pad.stop(now + 1.8);

      const cleanup = () => {
        try {
          if (ctx && typeof ctx.close === "function") {
            try {
              (ctx.close() as Promise<void>).catch(() => {});
            } catch (e) {
              /* ignore */
            }
          }
        } catch (e) {
          /* ignore */
        }
      };

      const tEnd = setTimeout(() => {
        cleanup();
        setVisible(false);
        if (!previewMode) localStorage.setItem("nachly_seen_intro", "true");
        setPreviewMode(false);
      }, 2000);

      return () => {
        clearTimeout(tEnd);
        cleanup();
      };
    }

    const t = setTimeout(() => {
      setVisible(false);
      if (!previewMode) localStorage.setItem("nachly_seen_intro", "true");
      setPreviewMode(false);
    }, 900);
    return () => clearTimeout(t);
  }, [visible, previewMode]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.2, delay: 0.9, ease: "circOut" }}
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      onAnimationComplete={() => setVisible(false)}
      aria-hidden
    >
      <div className="text-center px-6">
        <motion.h1
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.05 }}
          className="hero-giant-typo text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white"
        >
          Learn Dance. Teach Dance. Build Your Movement.
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 0.9 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-4 max-w-xl mx-auto text-base md:text-lg text-[#d9d9d9]/90"
        >
          A cinematic, movement-driven experience — rhythm, style, and mastery.
        </motion.p>
      </div>
    </motion.div>
  );
}
