"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import Button from "@/components/ui/Button";
import { MOCK_STYLES, MOCK_ROUTINES } from "@/lib/mock-data";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

// Mock: user has purchased Bollywood and Hip Hop
const purchasedSlugs = ["bollywood", "hip-hop"];
const progressData: Record<string, number> = {
  "routine-bollywood-1": 100,
  "routine-bollywood-2": 65,
  "routine-bollywood-3": 30,
  "routine-hip-hop-1": 80,
  "routine-hip-hop-2": 45,
};

export default function LibraryPage() {
  const purchasedStyles = MOCK_STYLES.filter((s) => purchasedSlugs.includes(s.slug));
  const hasPurchases = purchasedStyles.length > 0;

  return (
    <div className="section-padding py-5 sm:py-8">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div variants={fadeUp} className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold app-accent-text">My Library</h1>
              <p className="text-zinc-300 mt-1 text-sm">Your unlocked courses and progress tracker</p>
            </div>
            <Link
              href="/upload-choreo"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 tap-feedback"
            >
              Upload Choreo
            </Link>
          </div>
        </motion.div>

        {!hasPurchases ? (
          <motion.div variants={fadeUp} className="text-center py-14 app-card rounded-2xl">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B8178" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-2">No courses yet</h2>
            <p className="text-zinc-300 mb-6">Explore dance styles and unlock your first routine</p>
            <Link href="/explore"><Button>Explore Styles</Button></Link>
          </motion.div>
        ) : (
          <div className="space-y-7">
            {purchasedStyles.map((style) => {
              const routines = MOCK_ROUTINES[style.slug] || [];
              const styleProgress =
                routines.length > 0
                  ? routines.reduce((sum, r) => sum + (progressData[r.id] || 0), 0) / routines.length
                  : 0;

              return (
                <motion.div key={style.id} variants={fadeUp} className="app-card rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-white">{style.name}</h2>
                      <p className="text-xs text-zinc-300">{routines.length} routines</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-nred-300">{Math.round(styleProgress)}% complete</span>
                      <Progress value={styleProgress} size="sm" className="w-28 mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {routines.slice(0, 6).map((routine) => {
                      const pct = progressData[routine.id] || 0;
                      return (
                        <Link key={routine.id} href={`/explore/${style.slug}/${routine.slug}`}>
                          <Card hover padding="sm" className="h-full border-white/15 bg-[#211c68]/70">
                            <div className="flex items-start gap-3">
                              <div
                                className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center"
                                style={{ background: `linear-gradient(135deg, ${style.gradient_from}, ${style.gradient_to})` }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm line-clamp-1">{routine.title}</p>
                                <Badge variant={pct === 100 ? "success" : "outline"} size="sm" className="mt-1">
                                  {pct === 100 ? "Completed" : `${pct}%`}
                                </Badge>
                              </div>
                            </div>
                            <Progress value={pct} size="sm" color={pct === 100 ? "green" : "wine"} className="mt-3" />
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
