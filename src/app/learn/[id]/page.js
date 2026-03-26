"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isSupabaseConfigured, shouldUseFirebaseFallback } from "@/lib/supabase/client";

async function fetchLegacyChoreoById(id) {
  const byDocId = await getDoc(doc(db, "choreos", id));
  if (byDocId.exists()) {
    const data = byDocId.data();
    return {
      id: data.id || byDocId.id,
      title: data.title || "Untitled Choreo",
      video: data.video || "",
      moves: Array.isArray(data.moves) ? data.moves : [],
    };
  }

  const byFieldSnap = await getDocs(query(collection(db, "choreos"), where("id", "==", id), limit(1)));
  if (byFieldSnap.empty) return null;

  const picked = byFieldSnap.docs[0];
  const data = picked.data();
  return {
    id: data.id || picked.id,
    title: data.title || "Untitled Choreo",
    video: data.video || "",
    moves: Array.isArray(data.moves) ? data.moves : [],
  };
}

async function fetchChoreoById(id) {
  let supabaseRequestFailed = false;

  if (isSupabaseConfigured()) {
    try {
      const response = await fetch(`/api/choreos/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.choreo) return payload.choreo;
      }
      supabaseRequestFailed = !response.ok;
    } catch {
      supabaseRequestFailed = true;
    }
  }

  if (!shouldUseFirebaseFallback()) {
    if (isSupabaseConfigured() && supabaseRequestFailed) {
      throw new Error("Supabase choreography fetch failed while legacy fallback is disabled.");
    }
    return null;
  }

  return fetchLegacyChoreoById(id);
}

export default function LearnPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const [choreo, setChoreo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMoveId, setActiveMoveId] = useState("");
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const isStepwiseMode = searchParams?.get("mode") === "stepwise";

  const moveList = useMemo(() => (Array.isArray(choreo?.moves) ? choreo.moves : []), [choreo]);
  const activeMoveIndex = useMemo(
    () => moveList.findIndex((move) => String(move.id) === String(activeMoveId)),
    [activeMoveId, moveList]
  );

  const activeMove = useMemo(() => {
    if (!choreo) return null;
    return choreo.moves.find((move) => String(move.id) === String(activeMoveId)) || null;
  }, [activeMoveId, choreo]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const data = await fetchChoreoById(String(id));
        if (!mounted) return;
        if (!data) {
          setError("Choreography not found.");
          setChoreo(null);
          return;
        }
        setChoreo(data);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError("Failed to load choreography.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeMove) return;

    const start = Number(activeMove.start || 0);
    const end = Number(activeMove.end || start + 1);

    const handleTimeUpdate = () => {
      if (video.currentTime >= end) {
        video.currentTime = start;
        video.play().catch(() => {});
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [activeMove]);

  useEffect(() => {
    if (!isStepwiseMode) return;
    if (!moveList.length) return;
    if (activeMoveId) return;

    setActiveMoveId(String(moveList[0].id));
  }, [activeMoveId, isStepwiseMode, moveList]);

  const playMove = (move) => {
    if (!videoReady || !videoRef.current) return;
    setActiveMoveId(String(move.id));
    videoRef.current.currentTime = Number(move.start || 0);
    videoRef.current.play().catch(() => {});
  };

  const playMoveByIndex = (nextIndex) => {
    if (!moveList.length) return;
    const safeIndex = Math.max(0, Math.min(moveList.length - 1, nextIndex));
    const nextMove = moveList[safeIndex];
    if (!nextMove) return;
    playMove(nextMove);
  };

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-black text-zinc-300">Loading choreography...</main>;
  }

  if (error || !choreo) {
    return (
      <main className="min-h-screen grid place-items-center bg-black p-6 text-center">
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-red-200">{error || "Not found"}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">{choreo.title}</h1>
          <Link href={`/record/${choreo.id}`} className="rounded-xl bg-nred-500/20 border border-nred-400/50 px-4 py-2 text-sm text-nred-200 hover:bg-nred-500/30 transition">
            Remix This
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-3 sm:p-4">
          <video
            ref={videoRef}
            src={choreo.video}
            controls
            playsInline
            className="w-full rounded-xl bg-black"
            onLoadedData={() => setVideoReady(true)}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
          <p className="text-sm text-zinc-400">
            {isStepwiseMode ? "Stepwise mode: use Previous/Next to learn one move at a time." : "Tap a move to jump and loop that section."}
          </p>

          {isStepwiseMode && moveList.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!videoReady || activeMoveIndex <= 0}
                onClick={() => playMoveByIndex(activeMoveIndex - 1)}
                className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Previous Step
              </button>
              <button
                type="button"
                disabled={!videoReady || activeMoveIndex < 0 || activeMoveIndex >= moveList.length - 1}
                onClick={() => playMoveByIndex(activeMoveIndex + 1)}
                className="rounded-xl border border-nred-400/55 bg-nred-500/15 px-4 py-2 text-sm font-semibold text-nred-200 transition hover:bg-nred-500/25 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next Step
              </button>
              <span className="text-xs text-zinc-400">
                Step {Math.max(1, activeMoveIndex + 1)} of {moveList.length}
              </span>
            </div>
          )}

          <div className="mt-3 grid gap-2">
            {choreo.moves.map((move) => {
              const selected = String(move.id) === String(activeMoveId);
              return (
                <button
                  key={String(move.id)}
                  type="button"
                  disabled={!videoReady}
                  onClick={() => playMove(move)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-nred-400/70 bg-nred-500/15"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  } ${!videoReady ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{move.name || "Move"}</span>
                    <span className="text-xs text-zinc-400">
                      {Number(move.start || 0).toFixed(1)}s - {Number(move.end || 0).toFixed(1)}s
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
