"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getStyleBySlug, MOCK_ROUTINES } from "@/lib/mock-data";
import PurchaseModal from "@/components/explore/PurchaseModal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function StyleCoursePage() {
  const { styleSlug } = useParams<{ styleSlug: string }>();
  const style = getStyleBySlug(styleSlug);
  const routines = MOCK_ROUTINES[styleSlug] || [];
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadPurchaseStatus() {
      try {
        const response = await fetch(`/api/purchases/check?styleSlug=${encodeURIComponent(styleSlug)}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!mounted) return;
        setPurchased(Boolean(payload?.purchased));
      } catch {
        // Non-blocking fallback: keep local state.
      }
    }

    void loadPurchaseStatus();
    return () => {
      mounted = false;
    };
  }, [styleSlug]);

  if (!style) return notFound();

  const isBollywood = styleSlug === "bollywood";

  return (
    <div className="section-padding py-5 sm:py-8">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div variants={fadeUp} className="mb-4">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-xs text-zinc-300 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Explore
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden app-card mb-6">
          <div
            className="p-6 sm:p-10 relative overflow-hidden bg-obsidian-100/40 border border-white/5 rounded-[32px] shadow-2xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(211,196,184,0.1),rgba(211,196,184,0))]" />
            <Badge variant="accent" size="md" className="relative z-10 bg-gold/10 text-gold border-gold/20 mb-4 px-4 py-1.5 uppercase tracking-widest text-[9px] font-bold">
              {routines.length} {routines.length === 1 ? "routine" : "routines"}
            </Badge>
            <h1 className="relative z-10 font-display text-4xl sm:text-6xl font-extralight text-[#E7E5E5] mb-4 tracking-tight uppercase italic">{style.name}</h1>
            <p className="text-white/85 text-sm sm:text-base max-w-xl mb-5">{style.description}</p>
            {!purchased ? (
              <Button variant="secondary" size="lg" className="relative z-10 bg-gold text-obsidian px-10 py-4 text-[11px] font-bold uppercase tracking-[0.2em] rounded-full hover:scale-105 transition-transform border-none" onClick={() => setPurchaseOpen(true)}>
                {isBollywood ? "Unlock for INR 299 or INR 20/choreo" : "Unlock for INR 199/month"}
              </Button>
            ) : (
              <Badge variant="success" size="md">Purchased</Badge>
            )}
          </div>
        </motion.div>

        <motion.div variants={stagger}>
          <motion.h2 variants={fadeUp} className="font-display text-2xl font-bold app-accent-text mb-4">
            All Routines
          </motion.h2>

          {routines.length > 0 ? (
            <div className="space-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 sm:space-y-0">
              {routines.map((routine, i) => (
                <motion.div key={routine.id} variants={fadeUp}>
                  <div className="app-card rounded-2xl overflow-hidden h-full">
                    <div className="p-4 bg-white/5 border-b border-white/10 flex items-start justify-between gap-3">
                      <div>
                          <p className="text-[11px] text-zinc-300">Routine #{i + 1}</p>
                        <h3 className="font-semibold text-white text-lg leading-tight">{routine.title}</h3>
                      </div>
                        <Badge variant="outline" size="sm" className="capitalize text-zinc-200 border-white/20">
                        {routine.difficulty}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-zinc-300 line-clamp-2 mb-3">{routine.description}</p>
                      <div className="grid gap-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Link href={`/explore/${styleSlug}/${routine.slug}/learn`} className="block">
                          <button className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors">
                            Learn
                          </button>
                        </Link>
                        <Link href={`/explore/${styleSlug}/${routine.slug}/practice`} className="block">
                          <button className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors">
                            Practice
                          </button>
                        </Link>
                        <Link href={`/record/${routine.id}?mode=remix`} className="block">
                          <button className="w-full py-2.5 rounded-lg bg-gold text-obsidian text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-transform shadow-glow">
                            Remix
                          </button>
                        </Link>
                      </div>
                      <div className="mt-3">
                        <Link href={`/explore/${styleSlug}/${routine.slug}`}>
                          <button className="w-full rounded-full border border-white/10 bg-transparent text-[9px] font-bold uppercase tracking-[0.2em] py-2 text-zinc-400 hover:text-white transition-colors">
                            View Full Details
                          </button>
                        </Link>
                      </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div variants={fadeUp} className="text-center py-12 app-card rounded-2xl">
              <div className="text-4xl mb-4">Music</div>
              <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
              <p className="text-zinc-300 max-w-md mx-auto mb-6">
                {style.name} choreographies are being crafted by expert instructors. Check back soon!
              </p>
              <Link href="/apply-choreographer">
                <button className="px-8 py-3.5 bg-gold/10 text-gold border border-gold/20 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gold hover:text-obsidian transition-all">
                  Want to teach {style.name}? Apply here
                </button>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      <PurchaseModal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        style={style}
        onPurchaseComplete={() => setPurchased(true)}
      />
    </div>
  );
}
