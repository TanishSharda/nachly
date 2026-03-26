"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isSupabaseConfigured, shouldUseFirebaseFallback } from "@/lib/supabase/client";

function getClientUserId() {
  if (typeof window === "undefined") return "anon";
  return window.localStorage.getItem("naachly_user_id") || "anon";
}

function formatAttemptLabel(attempt, index) {
  const date = new Date(attempt.createdAt || Date.now()).toLocaleString();
  return `#${index + 1} | Score ${attempt.score} | ${date}`;
}

async function loadVideoFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch attempt video");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load attempt video"));
  });

  return { video, objectUrl };
}

function getSupportedMimeType() {
  const options = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
}

async function mergeAttemptsTopBottom(oldAttempt, newAttempt) {
  const oldAsset = await loadVideoFromUrl(oldAttempt.video);
  const newAsset = await loadVideoFromUrl(newAttempt.video);

  const width = 720;
  const height = 1280;
  const halfHeight = height / 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  const stream = canvas.captureStream(30);
  const mimeType = getSupportedMimeType() || "video/webm";
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  const duration = Math.max(1, Math.min(oldAsset.video.duration || 1, newAsset.video.duration || 1));

  const done = new Promise((resolve) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  oldAsset.video.currentTime = 0;
  newAsset.video.currentTime = 0;
  await Promise.all([oldAsset.video.play().catch(() => {}), newAsset.video.play().catch(() => {})]);
  recorder.start(500);

  await new Promise((resolve) => {
    const started = performance.now();

    const paint = () => {
      const elapsed = (performance.now() - started) / 1000;

      ctx.fillStyle = "#05070d";
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(oldAsset.video, 0, 0, width, halfHeight);
      ctx.drawImage(newAsset.video, 0, halfHeight, width, halfHeight);

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, halfHeight);
      ctx.lineTo(width, halfHeight);
      ctx.stroke();

      ctx.fillStyle = "rgba(0,0,0,0.52)";
      ctx.fillRect(16, 14, 430, 56);
      ctx.fillRect(16, halfHeight + 14, 430, 56);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 26px system-ui";
      ctx.fillText(`OLD | Score ${oldAttempt.score}`, 28, 50);
      ctx.fillText(`NOW | Score ${newAttempt.score}`, 28, halfHeight + 50);

      if (elapsed < duration && !oldAsset.video.ended && !newAsset.video.ended) {
        requestAnimationFrame(paint);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(paint);
  });

  recorder.stop();
  const mergedBlob = await done;

  oldAsset.video.pause();
  newAsset.video.pause();
  URL.revokeObjectURL(oldAsset.objectUrl);
  URL.revokeObjectURL(newAsset.objectUrl);

  return mergedBlob;
}

export default function ReplayPage() {
  const params = useParams();
  const choreoId = String(params?.id || "");
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("time");
  const [oldAttemptId, setOldAttemptId] = useState("");
  const [newAttemptId, setNewAttemptId] = useState("");
  const [mergePreviewUrl, setMergePreviewUrl] = useState("");
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAttempts() {
      setLoading(true);
      setError("");
      try {
        let list = [];
        let supabaseAttempted = false;
        let supabaseRequestFailed = false;

        if (isSupabaseConfigured()) {
          supabaseAttempted = true;
          try {
            const response = await fetch(`/api/attempts?choreoId=${encodeURIComponent(choreoId)}`, {
              cache: "no-store",
            });

            if (response.ok) {
              const payload = await response.json();
              list = Array.isArray(payload.attempts) ? payload.attempts : [];
            } else {
              supabaseRequestFailed = true;
            }
          } catch {
            supabaseRequestFailed = true;
          }
        }

        const allowFallback = shouldUseFirebaseFallback();
        if (!allowFallback && supabaseAttempted && supabaseRequestFailed) {
          throw new Error("Supabase attempts fetch failed while legacy fallback is disabled.");
        }

        if (allowFallback && list.length === 0) {
          const userId = getClientUserId();
          const snap = await getDocs(
            query(
              collection(db, "attempts"),
              where("userId", "==", userId),
              where("choreoId", "==", choreoId)
            )
          );

          list = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Number(data.createdAt || 0);
            return {
              id: docSnap.id,
              userId: data.userId,
              choreoId: data.choreoId,
              score: Number(data.score || 0),
              video: data.video || "",
              createdAt,
            };
          });
        }

        if (!mounted) return;

        list.sort((a, b) => a.createdAt - b.createdAt);
        setAttempts(list);

        if (list.length > 0) {
          setOldAttemptId(list[0].id);
          setNewAttemptId(list[list.length - 1].id);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError("Failed to load attempts.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (choreoId) loadAttempts();
    return () => {
      mounted = false;
    };
  }, [choreoId]);

  useEffect(() => {
    return () => {
      if (mergePreviewUrl) URL.revokeObjectURL(mergePreviewUrl);
    };
  }, [mergePreviewUrl]);

  const sortedAttempts = useMemo(() => {
    const list = [...attempts];
    if (sortBy === "score") {
      list.sort((a, b) => b.score - a.score);
      return list;
    }
    list.sort((a, b) => a.createdAt - b.createdAt);
    return list;
  }, [attempts, sortBy]);

  const firstAttempt = attempts[0] || null;
  const latestAttempt = attempts[attempts.length - 1] || null;
  const improvement = firstAttempt && latestAttempt ? latestAttempt.score - firstAttempt.score : 0;

  const selectedOld = attempts.find((item) => item.id === oldAttemptId) || null;
  const selectedNew = attempts.find((item) => item.id === newAttemptId) || null;

  const handleMergeSelected = async () => {
    if (!selectedOld || !selectedNew) return;
    if (selectedOld.id === selectedNew.id) {
      setError("Pick two different attempts to merge old vs now.");
      return;
    }
    setMerging(true);
    setError("");

    try {
      const mergedBlob = await mergeAttemptsTopBottom(selectedOld, selectedNew);
      if (mergePreviewUrl) URL.revokeObjectURL(mergePreviewUrl);
      const localUrl = URL.createObjectURL(mergedBlob);
      setMergePreviewUrl(localUrl);
    } catch (err) {
      console.error(err);
      setError("Failed to merge selected attempts.");
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-black text-zinc-300">Loading replay...</main>;
  }

  if (error && attempts.length === 0) {
    return (
      <main className="min-h-screen grid place-items-center bg-black p-6">
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-red-200">{error}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Glow-Up Replay</h1>
            <p className="text-zinc-400 text-sm mt-1">View all tries and merge any old vs now pair.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortBy("time")}
              className={`rounded-lg px-3 py-2 text-xs border transition ${
                sortBy === "time" ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-zinc-300"
              }`}
            >
              Sort by Time
            </button>
            <button
              type="button"
              onClick={() => setSortBy("score")}
              className={`rounded-lg px-3 py-2 text-xs border transition ${
                sortBy === "score" ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-zinc-300"
              }`}
            >
              Sort by Score
            </button>
          </div>
        </div>

        {firstAttempt && latestAttempt ? (
          <>
            <div className="mb-5 rounded-2xl border border-nred-400/35 bg-nred-500/10 p-4">
              <p className="text-xl font-semibold text-nred-200">
                {improvement >= 0 ? `+${improvement}` : improvement} improvement
              </p>
              <p className="text-sm text-zinc-300 mt-1">
                First score {firstAttempt.score} -&gt; Latest score {latestAttempt.score}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-3">
                <p className="mb-2 text-sm text-zinc-300">First Attempt</p>
                <video src={firstAttempt.video} controls className="w-full rounded-xl bg-black" />
                <p className="mt-2 text-xs text-zinc-400">Score: {firstAttempt.score}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-3">
                <p className="mb-2 text-sm text-zinc-300">Latest Attempt</p>
                <video src={latestAttempt.video} controls className="w-full rounded-xl bg-black" />
                <p className="mt-2 text-xs text-zinc-400">Score: {latestAttempt.score}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-300 mb-3">Merge Any Two Tries (Old vs Now)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={oldAttemptId}
                  onChange={(event) => setOldAttemptId(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
                >
                  {attempts.map((attempt, index) => (
                    <option key={attempt.id} value={attempt.id}>
                      OLD: {formatAttemptLabel(attempt, index)}
                    </option>
                  ))}
                </select>

                <select
                  value={newAttemptId}
                  onChange={(event) => setNewAttemptId(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
                >
                  {attempts.map((attempt, index) => (
                    <option key={attempt.id} value={attempt.id}>
                      NOW: {formatAttemptLabel(attempt, index)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!selectedOld || !selectedNew || merging}
                  onClick={handleMergeSelected}
                  className="rounded-xl bg-nred-500/20 border border-nred-400/60 px-4 py-2 text-sm font-semibold text-nred-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nred-500/30 transition"
                >
                  {merging ? "Merging..." : "Merge Selected Old vs Now"}
                </button>

                {mergePreviewUrl && (
                  <a
                    href={mergePreviewUrl}
                    download={`naachly-old-vs-now-${choreoId}.webm`}
                    className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition"
                  >
                    Download Merged Replay
                  </a>
                )}
              </div>

              {mergePreviewUrl && (
                <video src={mergePreviewUrl} controls className="mt-4 w-full rounded-xl bg-black" />
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 text-zinc-400">
            No attempts yet. Create your first remix from the recording page.
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
          <p className="text-sm text-zinc-300 mb-3">All Tries</p>
          <div className="grid gap-2">
            {sortedAttempts.map((attempt, idx) => (
              <div key={attempt.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">Attempt #{idx + 1}</p>
                  <p className="text-xs text-zinc-400">{new Date(attempt.createdAt || Date.now()).toLocaleString()}</p>
                </div>
                <div className="text-sm font-semibold text-nred-300">{attempt.score}</div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        <div className="mt-5 flex gap-3">
          <Link href="/scroll" className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition">
            Back to Scroll
          </Link>
          <Link href={`/record/${choreoId}`} className="rounded-xl border border-nred-400/60 bg-nred-500/15 px-4 py-2 text-sm font-semibold text-nred-200 hover:bg-nred-500/25 transition">
            Record New Attempt
          </Link>
        </div>
      </div>
    </main>
  );
}
