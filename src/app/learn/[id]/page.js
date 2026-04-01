"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isSupabaseConfigured, shouldUseFirebaseFallback } from "@/lib/supabase/client";
import LearnModePlayer from "@/components/learn/LearnModePlayer";

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
  const id = params?.id;
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
    return <main className="min-h-screen grid place-items-center bg-black text-zinc-300">Loading Learn Mode...</main>;
  }

  if (error || !choreo) {
    return (
      <main className="min-h-screen grid place-items-center bg-black p-6 text-center">
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-red-200">{error || "Not found"}</div>
      </main>
    );
  }

  return <LearnModePlayer choreo={choreo} backHref="/scroll" practiceHref={`/record/${choreo.id}?mode=remix`} />;
}
