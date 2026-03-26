"use client";

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getStyleBySlug, getRoutineBySlug, getMockSteps, getMockVideos } from "@/lib/mock-data";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { formatDuration } from "@/lib/utils/format";
import { notFound } from "next/navigation";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const difficultyColors = {
  beginner: "success" as const,
  intermediate: "warning" as const,
  advanced: "red" as const,
};

export default function RoutineDetailPage() {
  const { styleSlug, routineSlug } = useParams<{ styleSlug: string; routineSlug: string }>();
  const style = getStyleBySlug(styleSlug);
  const routine = getRoutineBySlug(styleSlug, routineSlug);
  const steps = routine ? getMockSteps(routine.id) : [];
  const videos = routine ? getMockVideos(routine.id) : [];
  const performanceVideo = videos.find((v) => v.video_type === "performance");
  const [isSaved, setIsSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!routine) return;

    let mounted = true;

    async function loadSavedState() {
      try {
        const response = await fetch("/api/choreos/saves", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        const isRoutineSaved = (payload?.saves || []).some((entry: { choreoId?: string }) => entry?.choreoId === routine?.id);
        if (mounted) setIsSaved(isRoutineSaved);
      } catch {
        // Non-blocking on detail page.
      }
    }

    void loadSavedState();
    return () => {
      mounted = false;
    };
  }, [routine]);

  const toggleSave = useCallback(async () => {
    if (!routine) return;

    setSavePending(true);
    try {
      const response = await fetch("/api/choreos/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choreoId: routine.id,
          title: routine.title,
          videoUrl: performanceVideo?.video_url || "",
          styleSlug,
          difficulty: routine.difficulty,
          caption: routine.description,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSaveMessage(payload?.error || "Unable to update saved status");
        return;
      }

      setIsSaved(Boolean(payload?.saved));
      setSaveMessage(payload?.saved ? "Saved for practice later" : "Removed from saved");
    } catch {
      setSaveMessage("Unable to update saved status");
    } finally {
      setSavePending(false);
    }
  }, [performanceVideo?.video_url, routine, styleSlug]);

  if (!style || !routine) return notFound();

  return (
    <div className="section-padding py-5 sm:py-8">
      {/* Breadcrumb */}
      <div className="pt-1 pb-3">
        <nav className="flex items-center gap-2 text-xs text-zinc-300">
          <Link href={`/explore/${styleSlug}`} className="hover:text-white transition-colors mr-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href="/explore" className="hover:text-white transition-colors">Explore</Link>
          <span>/</span>
          <Link href={`/explore/${styleSlug}`} className="hover:text-white transition-colors">{style.name}</Link>
          <span>/</span>
          <span className="text-white font-medium truncate">{routine.title}</span>
        </nav>
      </div>

      <div className="py-2">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Left: Video placeholder + info */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            <motion.div variants={fadeUp}>
              {performanceVideo?.video_url ? (
                <div className="aspect-video rounded-2xl overflow-hidden app-card border-white/15">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    src={performanceVideo.video_url}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                    poster=""
                  />
                </div>
              ) : (
                <div
                  className="aspect-video rounded-2xl flex items-center justify-center relative overflow-hidden app-card"
                  style={{
                    background: `linear-gradient(135deg, ${style.gradient_from}, ${style.gradient_to})`,
                  }}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                    <p className="text-white font-semibold">Performance Video</p>
                    <p className="text-white/70 text-sm">{formatDuration(routine.duration_seconds)}</p>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant={difficultyColors[routine.difficulty]} size="md">
                  {routine.difficulty}
                </Badge>
                <Badge variant="outline" size="md" className="text-zinc-200 border-white/20">
                  {formatDuration(routine.duration_seconds)}
                </Badge>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold app-accent-text mb-3">
                {routine.title}
              </h1>
              <p className="text-zinc-300 leading-relaxed">{routine.description}</p>
            </motion.div>

            {/* Steps preview */}
            <motion.div variants={fadeUp}>
              <h2 className="font-display text-xl font-bold text-white mb-4">
                What You&apos;ll Learn ({steps.length} steps)
              </h2>
              <div className="space-y-2">
                {steps.slice(0, 6).map((step, i) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-4 p-3 rounded-xl app-card border-white/15"
                  >
                    <div className="w-8 h-8 bg-nred-500/20 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-nred-500">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">{step.label}</p>
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {formatDuration(Math.round(step.end_time - step.start_time))}
                    </span>
                  </div>
                ))}
                {steps.length > 6 && (
                  <p className="text-sm text-zinc-300 text-center py-2">
                    + {steps.length - 6} more steps (10s each)
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right: Action sidebar */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <motion.div variants={fadeUp}>
              <Card className="sticky top-24 space-y-6 app-card border-white/15">
                <div className="text-center">
                  <h3 className="font-display text-lg font-bold text-white mb-1">Ready to dance?</h3>
                  <p className="text-sm text-zinc-300">Choose your mode</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void toggleSave();
                  }}
                  disabled={savePending}
                  className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    isSaved
                      ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-100"
                      : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  } disabled:opacity-60`}
                >
                  {savePending ? "Updating..." : isSaved ? "Saved for later" : "Save for later"}
                </button>

                {saveMessage ? (
                  <p className="-mt-3 text-center text-xs text-zinc-300">{saveMessage}</p>
                ) : null}

                <div className="space-y-3">
                  <Link
                    href={`/explore/${styleSlug}/${routineSlug}/learn`}
                    className="block"
                  >
                    <div className="p-4 rounded-xl border-2 border-white/10 hover:border-nred-400/60 transition-colors group bg-white/5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-nred-500/10 rounded-lg flex items-center justify-center group-hover:bg-nred-500/20 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A3E635" strokeWidth="2" strokeLinecap="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Learn Mode</h4>
                          <p className="text-xs text-zinc-300">Step-by-step breakdown</p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-300">
                        Watch, learn, and master each step with slow-motion and looping.
                      </p>
                    </div>
                  </Link>

                  <Link
                    href={`/explore/${styleSlug}/${routineSlug}/practice-check`}
                    className="block"
                  >
                    <div className="p-4 rounded-xl border-2 border-white/10 hover:border-nred-300/40 transition-colors group bg-white/5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/15 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
                            <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14" />
                            <rect x="1" y="6" width="14" height="12" rx="2" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">PRACTICE MODE</h4>
                          <p className="text-xs text-zinc-300">AI-powered coaching</p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-300">
                        Dance with your camera on. AI compares your moves and scores you in real-time.
                      </p>
                    </div>
                  </Link>

                    <Link
                      href={routine ? `/record/${routine.id}?mode=remix` : "#"}
                      className="block"
                    >
                      <div className="p-4 rounded-xl border-2 border-white/10 hover:border-gold/30 transition-colors group bg-white/5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold decoration-white/10 group-hover:bg-gold/15 transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                              <circle cx="12" cy="13" r="4"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">REMIX STUDIO</h4>
                            <p className="text-xs text-zinc-300">Record with remix output</p>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300">
                          Record your full take with instructor-on-top and your camera below.
                        </p>
                      </div>
                    </Link>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-white">{steps.length}</div>
                      <div className="text-xs text-zinc-400">Steps</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{formatDuration(routine.duration_seconds)}</div>
                      <div className="text-xs text-zinc-400">Duration</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white capitalize">{routine.difficulty.slice(0, 3)}</div>
                      <div className="text-xs text-zinc-400">Level</div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
