"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import Select from "@/components/ui/Select";
import Progress from "@/components/ui/Progress";
import CircularProgress from "@/components/ui/CircularProgress";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getChoreographySaves, getChoreographyLikes } from "@/lib/api/choreos";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

type PracticeSessionItem = {
  routineId: string;
  routineTitle: string;
  styleSlug: string;
  accuracy: number;
  consistency: number;
  completion: number;
  date: string;
  elapsed: number;
};

type SavedItem = {
  choreoId: string;
  title: string;
  styleSlug: string;
  difficulty: string | null;
};

type LikedItem = {
  choreoId: string;
  title: string;
  styleSlug: string;
  difficulty: string;
};

function computeCurrentStreak(dates: string[]) {
  const uniqueDays = Array.from(
    new Set(
      dates
        .map((value) => new Date(value).toISOString().slice(0, 10))
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  if (!uniqueDays.length) return 0;

  let streak = 0;
  const cursor = new Date(uniqueDays[0]);

  for (const day of uniqueDays) {
    const expected = cursor.toISOString().slice(0, 10);
    if (day !== expected) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function formatMinutes(seconds: number) {
  const mins = Math.max(0, Math.round(seconds / 60));
  return `${mins} min`;
}

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [preferredStyles, setPreferredStyles] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSessionItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setName("Dance Enthusiast");
      setEmail("dancer@example.com");
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Please log in to view your profile.");
          setLoading(false);
          return;
        }

        setEmail(user.email || "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, bio, preferences")
          .eq("id", user.id)
          .maybeSingle();

        const fallbackName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          (user.email?.split("@")[0] ?? "Dancer");

        setName(profile?.full_name || fallbackName);
        setBio(profile?.bio || "");

        const preferences = (profile?.preferences as {
          experience_level?: ExperienceLevel;
          dance_styles?: string[];
        } | null) ?? null;

        if (preferences?.experience_level) {
          setExperienceLevel(preferences.experience_level);
        }
        if (preferences?.dance_styles?.length) {
          setPreferredStyles(preferences.dance_styles.join(", "));
        }
      } catch {
        setError("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadProfileStats() {
      try {
        const [sessionsResponse, saves, likes] = await Promise.all([
          fetch("/api/practice-sessions?limit=100", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
          getChoreographySaves(),
          getChoreographyLikes(),
        ]);

        if (!mounted) return;

        setPracticeSessions(Array.isArray(sessionsResponse?.sessions) ? (sessionsResponse.sessions as PracticeSessionItem[]) : []);
        setSavedCount(Array.isArray(saves) ? saves.length : 0);
        setLikedCount(Array.isArray(likes) ? likes.length : 0);
      } catch {
        if (mounted) {
          setPracticeSessions([]);
          setSavedCount(0);
          setLikedCount(0);
        }
      } finally {
        if (mounted) setStatsLoading(false);
      }
    }

    void loadProfileStats();

    return () => {
      mounted = false;
    };
  }, []);

  const practiceCount = practiceSessions.length;
  const currentStreak = computeCurrentStreak(practiceSessions.map((session) => session.date));
  const topScore = practiceSessions.reduce((max, session) => Math.max(max, session.accuracy, session.consistency, session.completion), 0);
  const averageCompletion = practiceCount > 0
    ? Math.round(practiceSessions.reduce((sum, session) => sum + session.completion, 0) / practiceCount)
    : 0;
  const totalPracticeMinutes = practiceSessions.reduce((sum, session) => sum + session.elapsed, 0) / 60;

  const routineProgress = new Map<string, { title: string; styleSlug: string; completion: number; sessions: number }>();
  for (const session of practiceSessions) {
    const current = routineProgress.get(session.routineId) || {
      title: session.routineTitle,
      styleSlug: session.styleSlug,
      completion: 0,
      sessions: 0,
    };
    current.completion += session.completion;
    current.sessions += 1;
    routineProgress.set(session.routineId, current);
  }

  const topRoutines = Array.from(routineProgress.entries())
    .map(([routineId, value]) => ({
      routineId,
      title: value.title,
      styleSlug: value.styleSlug,
      sessions: value.sessions,
      progress: value.sessions > 0 ? Math.round(value.completion / value.sessions) : 0,
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isSupabaseConfigured()) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please log in again to save changes.");
        return;
      }

      const styles = preferredStyles
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const { error: saveError } = await supabase
        .from("profiles")
        .update({
          full_name: name,
          bio,
          preferences: {
            experience_level: experienceLevel,
            dance_styles: styles,
          },
        })
        .eq("id", user.id);

      if (saveError) {
        setError("Could not save your profile right now.");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save your profile right now.");
    }
  }

  if (loading) {
    return (
      <div className="section-padding py-10">
        <p className="text-center text-[#7e7468]">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="section-padding py-5 sm:py-8 tab-screen-enter">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl"
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#2d241a]">Profile</h1>
            <p className="mt-1 text-sm text-[#7e7468]">Your account, progress, and practice history.</p>
          </div>
          <Link
            href="/creator/dashboard"
            className="rounded-xl border border-[#F3B2AB]/20 bg-[#F3B2AB]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#F3B2AB] transition hover:bg-[#F3B2AB]/15"
          >
            Become a Creator
          </Link>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="app-card border-white/15 tap-feedback">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7d70]">Saved dances</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-black text-[#2d241a]">{savedCount}</p>
                <p className="mt-1 text-xs text-[#8a7d70]">Reels queued for later</p>
              </div>
              <CircularProgress value={Math.min(100, savedCount * 10)} size={68} strokeWidth={6} color="gold">
                <span className="text-xs font-semibold text-[#2d241a]">{savedCount}</span>
              </CircularProgress>
            </div>
          </Card>

          <Card className="app-card border-white/15 tap-feedback">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7d70]">Practice sessions</p>
            <p className="mt-3 text-3xl font-black text-[#2d241a]">{practiceCount}</p>
            <p className="mt-1 text-xs text-[#8a7d70]">{formatMinutes(totalPracticeMinutes * 60)} practiced</p>
            <Progress value={Math.min(100, practiceCount * 10)} size="sm" color="green" className="mt-4" />
          </Card>

          <Card className="app-card border-white/15 tap-feedback">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7d70]">Current streak</p>
            <p className="mt-3 text-3xl font-black text-[#2d241a]">{currentStreak}d</p>
            <p className="mt-1 text-xs text-[#8a7d70]">Practice on consecutive days</p>
            <Progress value={Math.min(100, currentStreak * 20)} size="sm" color="wine" className="mt-4" />
          </Card>

          <Card className="app-card border-white/15 tap-feedback">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7d70]">Best score</p>
            <p className="mt-3 text-3xl font-black text-[#2d241a]">{topScore}%</p>
            <p className="mt-1 text-xs text-[#8a7d70]">Highest accuracy, consistency, or completion</p>
            <Progress value={topScore} size="sm" color="green" className="mt-4" />
          </Card>
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="app-card border-white/15 tap-feedback p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7d70]">Practice summary</p>
                <h2 className="mt-1 text-xl font-bold text-[#2d241a]">Progress at a glance</h2>
              </div>
              <span className="rounded-full border border-[#6c51321f] bg-white/60 px-3 py-1 text-xs font-semibold text-[#7e7468]">
                {likedCount} liked
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7d70]">Average completion</p>
                <p className="mt-2 text-2xl font-black text-[#2d241a]">{averageCompletion}%</p>
                <Progress value={averageCompletion} size="sm" color="wine" className="mt-3" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7d70]">Top score</p>
                <p className="mt-2 text-2xl font-black text-[#2d241a]">{topScore}%</p>
                <Progress value={topScore} size="sm" color="green" className="mt-3" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7d70]">Practice minutes</p>
                <p className="mt-2 text-2xl font-black text-[#2d241a]">{Math.round(totalPracticeMinutes)}</p>
                <p className="mt-2 text-xs text-[#8a7d70]">Minutes logged in practice sessions</p>
              </div>
            </div>
          </Card>

          <Card className="app-card border-white/15 tap-feedback p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7d70]">Learning path</p>
                <h2 className="mt-1 text-xl font-bold text-[#2d241a]">Most practiced routines</h2>
              </div>
              <span className="rounded-full border border-[#6c51321f] bg-white/60 px-3 py-1 text-xs font-semibold text-[#7e7468]">
                {statsLoading ? "syncing" : "live"}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {topRoutines.length > 0 ? topRoutines.map((routine) => (
                <div key={routine.routineId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#2d241a]">{routine.title}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a7d70]">{routine.styleSlug} • {routine.sessions} sessions</p>
                    </div>
                    <span className="text-sm font-semibold text-[#F3B2AB]">{routine.progress}%</span>
                  </div>
                  <Progress value={routine.progress} size="sm" color={routine.progress >= 80 ? "green" : "wine"} className="mt-3" />
                </div>
              )) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[#7e7468]">
                  Start a practice session to unlock routine progress here.
                </div>
              )}
            </div>
          </Card>
        </div>

        <Link
          href="/liked"
          className="mb-4 block rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
        >
          Liked Sessions
        </Link>

        <Card className="app-card border-white/15 tap-feedback">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
            <Avatar name={name} size="lg" />
            <div>
              <h2 className="font-display font-bold text-[#2d241a] text-lg">{name}</h2>
              <p className="text-sm text-[#7e7468]">{email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <Input
              id="name"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="!bg-[#1e1b5f]/70"
            />
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              disabled
              className="!bg-[#1e1b5f]/40"
            />

            <Select
              id="experienceLevel"
              label="Experience level"
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}
              className="!bg-[#1e1b5f]/70"
              options={[
                { value: "beginner", label: "Beginner" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ]}
            />

            <Input
              id="preferredStyles"
              label="Preferred dance styles"
              value={preferredStyles}
              onChange={(event) => setPreferredStyles(event.target.value)}
              placeholder="Hip Hop, Bollywood"
              className="!bg-[#1e1b5f]/70"
            />

            <div className="space-y-1.5">
              <label htmlFor="bio" className="block text-sm font-medium text-zinc-200">Bio</label>
              <textarea
                id="bio"
                rows={3}
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-field resize-none !bg-[#1e1b5f]/70"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit">Save Changes</Button>
              {saved && (
                <span className="text-sm text-emerald-300 font-medium">Saved!</span>
              )}
              {error && (
                <span className="text-sm text-amber-300 font-medium">{error}</span>
              )}
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
