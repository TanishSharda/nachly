"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isSupabaseConfigured, shouldUseFirebaseFallback } from "@/lib/supabase/client";
import { getChoreographyPost } from "@/lib/api/choreos";
import LearnModePlayer from "@/components/learn/LearnModePlayer";

function buildMockChoreo(id) {
  const normalizedId = String(id || "").toLowerCase();

  if (normalizedId.includes("bhangra")) {
    return {
      id,
      title: "Bhangra Beats",
      video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      caption: "High-energy Punjabi rhythms",
      style: "bhangra",
      tier: "official",
      score: 88,
      tags: ["punjabi", "energy", "traditional"],
      moves: [
        { id: "1", name: "Gidha Circle", start: 0, end: 12 },
        { id: "2", name: "Dhol Sync", start: 12, end: 24 },
      ],
    };
  }

  return {
    id,
    title: "Monsoon Groove",
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    caption: "Learn the flow of monsoon energy",
    style: "bollywood",
    tier: "official",
    score: 92,
    tags: ["monsoon", "flow", "energy"],
    moves: [
      { id: "1", name: "Ground & Settle", start: 0, end: 8 },
      { id: "2", name: "Hip Release", start: 8, end: 16 },
      { id: "3", name: "Spiral Sequence", start: 16, end: 32 },
    ],
  };
}

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

function mapSubmissionToChoreo(submission) {
  if (!submission) return null;

  const resolvedVideo =
    submission.video ||
    submission.video_url ||
    submission.demo_video_url ||
    submission.teaching_video_url ||
    submission?.tutorial?.video_url ||
    submission?.demo_reel?.video_url ||
    "";

  return {
    id: submission.id,
    title: submission.title || "Untitled Choreo",
    video: resolvedVideo,
    caption: submission.caption || submission.description || "",
    style: submission.style_slug || "unknown",
    tier: submission.tier || "community",
    score: typeof submission.ai_overall_score === "number" ? submission.ai_overall_score : null,
    tags: Array.isArray(submission.ai_tags) ? submission.ai_tags : [],
    moves: [],
  };
}

async function fetchChoreoById(id) {
  let supabaseRequestFailed = false;

  if (isSupabaseConfigured()) {
    try {
      // Fetch choreography (handles both submissions and routines)
      const post = await getChoreographyPost(String(id));
      if (post) return mapSubmissionToChoreo(post) || post;
      supabaseRequestFailed = true;
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

  try {
    const legacyChoreo = await fetchLegacyChoreoById(id);
    return legacyChoreo || buildMockChoreo(id);
  } catch {
    return buildMockChoreo(id);
  }
}

export default function LearnPage() {
  const params = useParams();
  const id = params?.id;
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [choreo, setChoreo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-[#f4f1ec] text-[#3a2f22]">Loading Learn Mode...</main>;
  }

  if (error || !choreo) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#f4f1ec] p-6 text-center">
        <div className="rounded-2xl border border-[#b76a59]/35 bg-[#fff2ef] px-5 py-4 text-[#7d3023]">{error || "Not found"}</div>
      </main>
    );
  }

  return <LearnModePlayer choreo={choreo} mode={modeParam || undefined} backHref="/learn/feed" practiceHref={`/practice/${choreo.id}`} />;
}
