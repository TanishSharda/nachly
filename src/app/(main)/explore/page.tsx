"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MOCK_STYLES, MOCK_ROUTINES } from "@/lib/mock-data";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function ExplorePage() {
  const [weeklyTop, setWeeklyTop] = useState<null | {
    banner?: string;
    choreos?: Array<{ id: string; title: string; style_slug?: string; tier?: string; ai_overall_score?: number }>;
  }>(null);

  useEffect(() => {
    let mounted = true;

    async function loadWeeklyTop() {
      try {
        const response = await fetch("/api/choreos/weekly-top", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!mounted) return;
        setWeeklyTop(payload);
      } catch {
        // Keep existing static spotlight when weekly service is unavailable.
      }
    }

    void loadWeeklyTop();
    return () => {
      mounted = false;
    };
  }, []);

  const featured = weeklyTop?.choreos?.[0];

  const shortcuts: Array<{ label: string; href: string; icon: string }> = [
    { label: "Recording Studio", href: "/record/routine-bollywood-bijuria", icon: "●" },
    { label: "Special Features", href: "/adaptive-pose", icon: "✦" },
    { label: "Scroll", href: "/scroll", icon: "▶" },
    { label: "Practice History", href: "/previous-sessions", icon: "◎" },
    { label: "Saved", href: "/saved", icon: "◆" },
  ];

  const mobileHub = [
    {
      label: "Recording Studio",
      href: "/record/routine-bollywood-bijuria",
      icon: "●",
      hint: "Record with instructor split",
    },
    {
      label: "Special Features",
      href: "/adaptive-pose",
      icon: "✦",
      hint: "Try adaptive AI pose mode",
    },
    { label: "Scroll", href: "/scroll", icon: "▶", hint: "Watch and discover" },
    { label: "Practice History", href: "/previous-sessions", icon: "◎", hint: "See all your sessions" },
  ];

  const trendingStyles = MOCK_STYLES.map((style) => ({
    ...style,
    routineCount: MOCK_ROUTINES[style.slug]?.length ?? 0,
  }));

  return (
    <div className="section-padding py-5 sm:py-8 tab-screen-enter">
      <h1 className="sr-only">Explore Dance Styles</h1>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="mb-4 md:mb-10 hidden sm:block">
          <div className="rounded-[32px] p-1 bg-gradient-to-br from-gold/20 via-transparent to-white/5 border border-white/5">
            <div className="rounded-[28px] overflow-hidden relative h-52 sm:h-64 bg-obsidian">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(211,196,184,0.15),rgba(211,196,184,0))]" />
              <div className="absolute inset-0 p-8 sm:p-10 flex flex-col justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5 text-[9px] uppercase tracking-[0.25em] font-semibold text-gold">
                   <span className="h-1 w-1 rounded-full bg-gold animate-pulse" />
                  {weeklyTop?.banner || "Spotlight Dance"}
                </div>
                <div>
                  <h1 className="font-display text-3xl sm:text-5xl font-extralight text-[#E7E5E5] leading-tight tracking-tight">
                    {(featured?.title || "Dance Flow").toUpperCase()}
                  </h1>
                  <p className="text-[#E7E5E5]/40 text-xs sm:text-[13px] mt-3 font-light tracking-wide">
                    {featured
                      ? `${featured.style_slug || "mixed-style"} • ${featured.tier || "advanced"}${typeof featured.ai_overall_score === "number" ? ` • accuracy score ${featured.ai_overall_score}` : ""}`
                      : "Learning traditional dance moves with new technology."}
                  </p>
                  <Link
                    href={featured ? `/learn/${featured.id}?mode=stepwise` : "/explore/hip-hop"}
                    className="mt-6 inline-flex items-center rounded-full bg-gold text-obsidian text-[11px] font-bold uppercase tracking-[0.2em] px-8 py-3.5 hover:scale-105 transition-transform"
                  >
                    Enter Practice
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-10">
          <div className="grid grid-cols-5 gap-3">
            {shortcuts.map((item) => (
              <Link key={item.label} href={item.href} className="group p-4 rounded-3xl bg-obsidian-100/40 border border-white/5 hover:border-gold/20 hover:bg-gold/[0.02] transition-all duration-500 text-center">
                <div className="h-10 w-10 mx-auto rounded-2xl bg-gold/5 text-gold border border-gold/10 group-hover:border-gold/30 flex items-center justify-center text-sm transition-all duration-500">
                  {item.icon}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 mt-3 group-hover:text-gold/80 transition-colors font-medium">{item.label}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6 sm:hidden">
          <div className="app-card rounded-2xl p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Explore Hub</h2>
              <span className="text-[11px] text-zinc-400">Quick Access</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {mobileHub.map((item) => (
                <Link key={item.label} href={item.href} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]">
                  <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-nred-500/20 text-nred-300">
                    {item.icon}
                  </div>
                  <p className="text-sm font-semibold text-white leading-tight">{item.label}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">{item.hint}</p>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extralight tracking-tight text-[#E7E5E5]">Dance Styles</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/60 font-medium">Popular Styles</p>
          </div>
          <Link href="/library" className="text-[10px] uppercase tracking-widest text-gold/60 hover:text-gold transition-colors font-bold border-b border-gold/20 pb-1">
            See all
          </Link>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trendingStyles.map((style) => (
            <motion.div key={style.id} variants={fadeUp} whileHover={{ y: -8 }} transition={{ duration: 0.5 }}>
              <Link href={`/explore/${style.slug}`} className="block rounded-[32px] overflow-hidden bg-obsidian-100/40 border border-white/5 hover:border-gold/20 hover:bg-gold/[0.02] transition-all duration-700 shadow-2xl group">
                <div
                  className="h-32 sm:h-40 p-6 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent opacity-40 group-hover:scale-110 transition-transform duration-1000" />
                  <span className="relative z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] uppercase tracking-widest text-[#E7E5E5]/60 font-semibold">
                    {style.routineCount > 0 ? `${style.routineCount} dances` : "New addition"}
                  </span>
                  <h3 className="relative z-10 font-display text-4xl text-[#E7E5E5] group-hover:text-gold transition-all duration-700 font-extralight tracking-[0.1em] uppercase">
                    {style.name}
                  </h3>
                </div>
                <div className="p-6 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="hidden sm:block text-[11px] font-light text-[#E7E5E5]/30 line-clamp-1 leading-relaxed">{style.description}</p>
                    <p className="text-gold/60 text-[10px] uppercase tracking-widest mt-1 font-bold">Standard Access • {(style.price_inr / 100).toFixed(0)} INR</p>
                  </div>
                  <span className="h-10 w-10 rounded-2xl bg-gold/5 border border-gold/10 text-gold flex items-center justify-center text-lg group-hover:bg-gold group-hover:text-obsidian transition-all duration-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div variants={fadeUp} className="rounded-[40px] border border-gold/10 bg-obsidian-100/50 p-10 mt-12 mb-8 relative overflow-hidden group">
           <div className="absolute bottom-0 right-0 w-64 h-64 bg-gold/3 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2 group-hover:bg-gold/5 transition-colors duration-1000" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-3 relative z-10">Teacher Program</p>
          <h3 className="font-display text-3xl font-extralight text-[#E7E5E5] mb-4 relative z-10">Become a <span className="text-gold italic">Dance Teacher</span></h3>
          <p className="text-[14px] font-light text-[#E7E5E5]/40 leading-relaxed max-w-xl mb-8 relative z-10">
            Show your dances in our movie-style catalog. Reach many students and build your name.
          </p>
          <Link href="/apply-choreographer" className="relative z-10 inline-flex px-10 py-4 rounded-full bg-gold text-obsidian text-[11px] font-bold uppercase tracking-[0.2em] hover:scale-105 transition-transform">
            Apply to Join
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
