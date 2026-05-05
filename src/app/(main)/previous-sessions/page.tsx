"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isSupabaseConfigured, shouldUseFirebaseFallback } from "@/lib/supabase/client";
import { getOrCreateGuestId } from "@/lib/utils/guest-session";

type AttemptRecord = {
  id: string;
  choreoId: string;
  choreoTitle?: string | null;
  score: number;
  video: string;
  createdAt: number;
};

function getClientUserId() {
  return getOrCreateGuestId();
}

function formatDate(timestamp: number) {
  return new Date(timestamp || Date.now()).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchTitleByChoreoId(choreoId: string): Promise<string> {
  if (!choreoId) return "Untitled Choreo";

  try {
    const response = await fetch(`/api/choreos/${encodeURIComponent(choreoId)}`, { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      const title = payload?.choreo?.title;
      if (title && typeof title === "string") return title;
    }
  } catch {
    // Ignore and try fallback below.
  }

  try {
    const byDoc = await getDocs(query(collection(db, "choreos"), where("id", "==", choreoId), limit(1)));
    if (!byDoc.empty) {
      const title = byDoc.docs[0].data()?.title;
      if (title) return String(title);
    }
  } catch {
    // Ignore final fallback.
  }

  return choreoId;
}

export default function PreviousSessionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<AttemptRecord[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadSessions() {
      setLoading(true);
      setError("");

      try {
        let list: AttemptRecord[] = [];
        let supabaseAttempted = false;
        let supabaseFailed = false;

        if (isSupabaseConfigured()) {
          supabaseAttempted = true;
          try {
            const response = await fetch("/api/attempts", { cache: "no-store" });
            if (response.ok) {
              const payload = await response.json();
              list = Array.isArray(payload?.attempts) ? payload.attempts : [];
            } else {
              supabaseFailed = true;
            }
          } catch {
            supabaseFailed = true;
          }
        }

        const allowFallback = shouldUseFirebaseFallback();
        if (allowFallback && list.length === 0) {
          const userId = getClientUserId();
          const snap = await getDocs(query(collection(db, "attempts"), where("userId", "==", userId), limit(300)));

          list = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Number(data.createdAt || Date.now());
            return {
              id: docSnap.id,
              choreoId: String(data.choreoId || ""),
              choreoTitle: null,
              score: Number(data.score || 0),
              video: String(data.video || ""),
              createdAt,
            } as AttemptRecord;
          });
        }

        if (!allowFallback && supabaseAttempted && supabaseFailed) {
          throw new Error("Unable to load previous sessions right now.");
        }

        const titleCache = new Map<string, string>();
        const enriched = await Promise.all(
          list.map(async (session) => {
            const existingTitle = (session.choreoTitle || "").trim();
            if (existingTitle) return session;

            const cacheHit = titleCache.get(session.choreoId);
            if (cacheHit) {
              return { ...session, choreoTitle: cacheHit };
            }

            const resolved = await fetchTitleByChoreoId(session.choreoId);
            titleCache.set(session.choreoId, resolved);
            return { ...session, choreoTitle: resolved };
          })
        );

        enriched.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (!mounted) return;
        setSessions(enriched);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError("Could not load previous sessions. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadSessions();
    return () => {
      mounted = false;
    };
  }, []);

  const averageScore = useMemo(() => {
    if (sessions.length === 0) return 0;
    const total = sessions.reduce((sum, session) => sum + Number(session.score || 0), 0);
    return Math.round(total / sessions.length);
  }, [sessions]);

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 tab-screen-enter">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Histry</h1>
            <p className="mt-1 text-sm text-zinc-400">Your past recordings with song name, score, timestamp, and replay actions.</p>
          </div>
          <Link
            href="/explore"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
          >
            Back to Explore
          </Link>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-zinc-400">Total Sessions</p>
            <p className="mt-1 text-xl font-bold text-white">{sessions.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-zinc-400">Average Score</p>
            <p className="mt-1 text-xl font-bold text-nred-300">{averageScore}%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-zinc-400">Best Score</p>
            <p className="mt-1 text-xl font-bold text-emerald-300">{sessions.length ? Math.max(...sessions.map((s) => s.score)) : 0}%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-zinc-400">Recordings</p>
            <p className="mt-1 text-xl font-bold text-white">{sessions.filter((s) => Boolean(s.video)).length}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 text-zinc-300">Loading your histry...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-red-200">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-zinc-300">No histry found yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Start a recording from any dance form to see your history here.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <article key={session.id} className="rounded-2xl border border-white/10 bg-zinc-950/75 p-4 tap-feedback">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Song</p>
                    <h2 className="text-lg font-semibold text-white">{session.choreoTitle || session.choreoId || "Untitled Choreo"}</h2>
                    <p className="mt-1 text-xs text-zinc-400">{formatDate(session.createdAt)}</p>
                  </div>
                  <div className="rounded-xl border border-nred-400/35 bg-nred-500/15 px-3 py-2 text-right">
                    <p className="text-xs text-zinc-300">Score</p>
                    <p className="text-lg font-bold text-nred-200">{session.score}%</p>
                  </div>
                </div>

                {session.video ? (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                    <video src={session.video} controls className="max-h-[360px] w-full bg-black object-contain" />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/15 bg-black/30 px-4 py-6 text-center text-sm text-zinc-400">
                    Recording unavailable for this session.
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/replay/${session.choreoId}`}
                    className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
                  >
                    View Replay
                  </Link>
                  <Link
                    href={`/learn/${session.choreoId}?mode=stepwise`}
                    className="rounded-xl border border-sky-300/35 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/25"
                  >
                    Learn Dance
                  </Link>
                  <Link
                    href={`/record/${session.choreoId}`}
                    className="rounded-xl border border-emerald-300/35 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
                  >
                    Record Again
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
