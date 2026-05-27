"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const RECOMMENDED_FALLBACK = [
  { title: "Continue Training", artist: "naachly", duration: "10m", level: "Beginner", img: "" },
  { title: "Build Consistency", artist: "naachly", duration: "15m", level: "Intermediate", img: "" },
  { title: "Refine Technique", artist: "naachly", duration: "20m", level: "Advanced", img: "" },
];

type Session = {
  routineId: string;
  routineTitle: string;
  styleSlug: string;
  accuracy: number;
  consistency: number;
  completion: number;
  date: string;
  elapsed: number;
};

type ProfileResponse = {
  profile?: {
    displayName?: string;
  };
};

export default function DashboardPage() {
  const [displayName, setDisplayName] = useState("Dancer");
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        const [profileResponse, sessionsResponse] = await Promise.all([
          fetch("/api/choreographer/profile", { cache: "no-store" }),
          fetch("/api/practice-sessions?limit=6", { cache: "no-store" }),
        ]);

        const profilePayload = (await profileResponse.json().catch(() => ({}))) as ProfileResponse;
        const sessionsPayload = (await sessionsResponse.json().catch(() => ({}))) as { sessions?: Session[] };

        if (!mounted) return;

        if (profileResponse.ok && profilePayload?.profile?.displayName) {
          const firstName = String(profilePayload.profile.displayName).trim().split(" ")[0];
          setDisplayName(firstName || "Dancer");
        }

        if (sessionsResponse.ok && Array.isArray(sessionsPayload.sessions)) {
          setSessions(sessionsPayload.sessions);
        }
      } catch {
        if (mounted) {
          setDisplayName("Dancer");
          setSessions([]);
        }
      }
    }

    void loadDashboardData();
    return () => {
      mounted = false;
    };
  }, []);

  const recommended = useMemo(() => {
    if (!sessions.length) return RECOMMENDED_FALLBACK;

    return sessions.slice(0, 3).map((session, index) => ({
      title: session.routineTitle,
      artist: session.styleSlug.replace(/-/g, " "),
      duration: `${Math.max(1, Math.round(session.elapsed / 60))}m`,
      level: session.completion >= 80 ? "Advanced" : session.completion >= 50 ? "Intermediate" : "Beginner",
      img: RECOMMENDED_FALLBACK[index % RECOMMENDED_FALLBACK.length].img,
      href: `/explore/${session.styleSlug}`,
    }));
  }, [sessions]);

  const latest = sessions[0] || null;
  const latestProgress = latest ? Math.round((latest.accuracy + latest.consistency + latest.completion) / 3) : 45;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-end mb-12">
        <div className="space-y-2">
          <h1 className="text-5xl font-extralight tracking-tight text-luxury">Welcome back, {displayName}.</h1>
          <p className="text-[#E7E5E5]/40 text-lg font-light tracking-wide italic">Your training space is ready.</p>
        </div>
      </header>

      {/* Hero Section: Continue Learning */}
      <section className="mb-16">
        <div className="group relative overflow-hidden rounded-3xl min-h-[400px] flex items-end p-10 border border-gold/10">
          <motion.div 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[2s] ease-out group-hover:scale-105"
            style={{ background: "linear-gradient(135deg, #1f2937 0%, #0f172a 45%, #3f6212 100%)" }}
          />
          <div className="absolute inset-0 z-1 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
          
          <div className="relative z-10 w-full max-w-lg space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/80">Continue Learning</span>
            <h2 className="text-4xl font-light text-[#E7E5E5] leading-tight">{latest?.routineTitle || "Deep Breathing & Movement"}</h2>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-[#E7E5E5]/40">Progress</span>
                <span className="text-lg font-light text-gold">{latestProgress}% Complete</span>
              </div>
              <div className="h-8 w-[1px] bg-gold/20" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-[#E7E5E5]/40">Next Step</span>
                <span className="text-lg font-light">{latest?.styleSlug?.replace(/-/g, " ") || "Rhythm Basics"}</span>
              </div>
            </div>
            
            <Link href={latest ? `/explore/${latest.styleSlug}` : "/learn/feed"} className="premium-button mt-6 inline-flex">
              Resume Session
            </Link>
          </div>
        </div>
      </section>

      {/* Recommended Horizontal Scroll */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-light tracking-[0.1em] uppercase text-gold/80">Recommended for you</h3>
          <Link href="/dashboard/library" className="text-[12px] font-medium text-[#E7E5E5]/40 hover:text-gold transition-colors uppercase tracking-widest">View All</Link>
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar">
          {recommended.map((item, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -8 }}
              className="flex-shrink-0 w-80 premium-card p-0 overflow-hidden group border-gold/5"
            >
              <div className="h-48 overflow-hidden bg-gradient-to-br from-[#2d3f1a] via-[#1f2937] to-[#0f172a]">
                {item.img ? <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : null}
              </div>
              <div className="p-6 space-y-1">
                <span className="text-[10px] uppercase tracking-[0.15em] text-gold/60">{item.level} • {item.duration}</span>
                <h4 className="text-lg font-light text-[#E7E5E5]">{item.title}</h4>
                <p className="text-[12px] text-[#E7E5E5]/30 italic">with {item.artist}</p>
                <Link href={(item as { href?: string }).href || "/learn/feed"} className="inline-block pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold/80 hover:text-gold">
                  Open
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
