"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getChoreographyFeed, getChoreographyPost, getChoreographySaves, postChoreographySave } from "@/lib/api/choreos";
import { motion } from "framer-motion";
import { use } from "react";
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
  const [style, setStyle] = useState<any | null>(null);
  const [routine, setRoutine] = useState<any | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const performanceVideo = videos.find((v) => v.video_type === "performance");

  useEffect(() => {
    let mounted = true;
    async function loadRoutine() {
      setLoading(true);
      try {
        // Try to find routine via feed by style and slug
        const feedJson = await getChoreographyFeed({ style: styleSlug || undefined, limit: 150 });
        const posts = Array.isArray(feedJson?.posts) ? feedJson.posts : [];
        const found = posts.find((p: any) => p.routineSlug === routineSlug || p.slug === routineSlug || p.id === routineSlug);

        if (found) {
          setStyle({ name: found.styleName || found.style || styleSlug });
          // Fetch full details by id
          const id = found.id;
          const post = await getChoreographyPost(id) || found;
          if (!mounted) return;
          setRoutine(post);
          setSteps(post?.moves || post?.routine_steps || []);
          setVideos(post?.routine_videos || (post?.tutorial ? [post.tutorial] : []) || []);
        }
      } catch (err) {
        // leave empty — non-blocking UI
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadRoutine();
    return () => {
      mounted = false;
    };
  }, [styleSlug, routineSlug]);
  const [isSaved, setIsSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!routine) return;

    let mounted = true;

    async function loadSavedState() {
      try {
        const saves = await getChoreographySaves();
        const isRoutineSaved = (saves || []).some((entry: { choreoId?: string }) => entry?.choreoId === routine?.id);
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
      const payload = await postChoreographySave({
        choreoId: routine.id,
        title: routine.title,
        videoUrl: performanceVideo?.video_url || "",
        styleSlug,
        difficulty: routine.difficulty,
        caption: routine.description,
      });

      setIsSaved(Boolean(payload?.saved));
      setSaveMessage(payload?.saved ? "Saved for practice later" : "Removed from saved");
    } catch {
      setSaveMessage("Unable to update saved status");
    } finally {
      setSavePending(false);
    }
  }, [performanceVideo, routine, styleSlug]);

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
          <Link href="/learn/feed" className="hover:text-white transition-colors">Explore</Link>
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
                  { }
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
                <Badge variant={difficultyColors[(routine.difficulty as keyof typeof difficultyColors) || "intermediate"]} size="md">
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
                  <Link href={`/explore/${styleSlug}`} className="block">
                    <div className="p-4 rounded-xl border-2 border-gold/25 hover:border-gold/40 transition-colors group bg-gold/5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-4-6 4 1.5-7.8L2 9h7z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Unlock this style</h4>
                          <p className="text-xs text-zinc-300">Pay once for the full style collection</p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-300">
                        Open the style page to purchase access to every routine in {style.name}.
                      </p>
                    </div>
                  </Link>

                  <Link href="/subscribe" className="block">
                    <div className="p-4 rounded-xl border-2 border-white/10 hover:border-white/20 transition-colors group bg-white/5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/15 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
                            <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
                            <path d="M4 7h3a2 2 0 0 0 2-2V2" />
                            <path d="M4 17h3a2 2 0 0 1 2 2v3" />
                            <path d="M20 17h-3a2 2 0 0 0-2 2v3" />
                            <path d="M9 12h6" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Go premium</h4>
                          <p className="text-xs text-zinc-300">Subscription access across the app</p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-300">
                        Get recurring access to premium routines, workshops, and creator drops.
                      </p>
                    </div>
                  </Link>

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
