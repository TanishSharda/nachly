"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getChoreographyIndex } from "@/lib/api/choreos";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import Button from "@/components/ui/Button";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

type ChoreoItem = {
  id: string;
  title: string;
  routineSlug?: string | null;
  styleSlug: string;
  styleName?: string;
  difficulty?: string;
  stylePriceInr?: number | null;
};

type Session = {
  styleSlug?: string;
  completion?: number;
};

type StyleLibrary = {
  id: string;
  slug: string;
  name: string;
  gradient_from: string;
  gradient_to: string;
  routines: Array<{ id: string; title: string; slug: string; difficulty: string; progress: number }>;
  progress: number;
};

const STYLE_GRADIENTS: Record<string, { from: string; to: string }> = {
  bollywood: { from: "#e11d48", to: "#fb7185" },
  "hip-hop": { from: "#2563eb", to: "#22d3ee" },
  kathak: { from: "#f59e0b", to: "#f97316" },
  bhangra: { from: "#16a34a", to: "#84cc16" },
};

export default function LibraryPage() {
  const [purchasedSlugs, setPurchasedSlugs] = useState<string[]>([]);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [styles, setStyles] = useState<StyleLibrary[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadLibraryState() {
      try {
        const [subscriptionResponse, sessionsResponse] = await Promise.all([
          fetch("/api/subscriptions/check", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
          fetch("/api/practice-sessions?limit=100", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
        ]);

        const choreos = await getChoreographyIndex();
        const sessions = Array.isArray(sessionsResponse?.sessions) ? (sessionsResponse.sessions as Session[]) : [];

        const styleMap = new Map<string, StyleLibrary>();
        for (const choreo of choreos) {
          const slug = String(choreo.styleSlug || "").trim();
          if (!slug || !choreo.routineSlug) continue;
          const gradient = STYLE_GRADIENTS[slug] || { from: "#3f3f46", to: "#71717a" };
          const existing = styleMap.get(slug) || ({
            id: slug,
            slug,
            name: choreo.styleName || slug,
            gradient_from: gradient.from,
            gradient_to: gradient.to,
            routines: [],
            progress: 0,
          } as StyleLibrary);
          if (!existing.routines.some((routine) => routine.slug === choreo.routineSlug)) {
            existing.routines.push({
              id: choreo.id,
              title: choreo.title || "Untitled Routine",
              slug: String(choreo.routineSlug),
              difficulty: String(choreo.difficulty || "intermediate"),
              progress: 0,
            });
          }
          styleMap.set(slug, existing);
        }

        const sessionProgress = new Map<string, { total: number; count: number }>();
        for (const session of sessions) {
          const slug = String(session.styleSlug || "").trim();
          if (!slug) continue;
          const completion = Number(session.completion || 0);
          const current = sessionProgress.get(slug) || { total: 0, count: 0 };
          current.total += completion;
          current.count += 1;
          sessionProgress.set(slug, current);
        }

        const nextStyles = [...styleMap.values()].map((style) => {
          const progressMeta = sessionProgress.get(style.slug);
          const styleProgress = progressMeta && progressMeta.count > 0 ? Math.round(progressMeta.total / progressMeta.count) : 0;
          return {
            ...style,
            progress: styleProgress,
            routines: style.routines.map((routine) => ({ ...routine, progress: styleProgress })),
          };
        });

        const purchaseResults = await Promise.all(
          nextStyles.map(async (style) => {
            const response = await fetch(`/api/purchases/check?styleSlug=${encodeURIComponent(style.slug)}`, { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            return { slug: style.slug, purchased: Boolean(response.ok && payload?.purchased) };
          })
        );

        if (!mounted) return;

        setStyles(nextStyles);
        setSubscriptionActive(Boolean(subscriptionResponse?.active));
        setPurchasedSlugs(purchaseResults.filter((item) => item.purchased).map((item) => item.slug));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadLibraryState();

    return () => {
      mounted = false;
    };
  }, []);

  const purchasedStyles = useMemo(() => {
    if (subscriptionActive) return styles;
    return styles.filter((s) => purchasedSlugs.includes(s.slug));
  }, [purchasedSlugs, subscriptionActive, styles]);

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

        {loading ? (
          <motion.div variants={fadeUp} className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            Checking your access...
          </motion.div>
        ) : subscriptionActive ? (
          <motion.div variants={fadeUp} className="mb-5 rounded-2xl border border-[#F3B2AB]/20 bg-[#F3B2AB]/10 p-4 text-sm text-white">
            <p className="font-semibold text-[#F3B2AB]">Naachly Plus active</p>
            <p className="mt-1 text-zinc-200">You have subscription access to premium routines and creator drops.</p>
          </motion.div>
        ) : null}

        {!hasPurchases ? (
          <motion.div variants={fadeUp} className="text-center py-14 app-card rounded-2xl">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B8178" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-2">No courses yet</h2>
            <p className="text-zinc-300 mb-6">Explore dance styles and unlock your first routine</p>
            <Link href="/learn/feed"><Button>Explore Styles</Button></Link>
          </motion.div>
        ) : (
          <div className="space-y-7">
            {purchasedStyles.map((style) => {
              const routines = style.routines || [];
              const styleProgress = style.progress || 0;

              return (
                <motion.div key={style.id} variants={fadeUp} className="app-card rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-white">{style.name}</h2>
                      <p className="text-xs text-zinc-300">{routines.length} routines</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-nred-300">
                        {subscriptionActive ? "Plus access" : `${Math.round(styleProgress)}% complete`}
                      </span>
                      <Progress value={styleProgress} size="sm" className="w-28 mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {routines.slice(0, 6).map((routine) => {
                      const pct = routine.progress || 0;
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
