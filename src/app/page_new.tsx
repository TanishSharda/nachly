"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getChoreographyFeed } from "@/lib/api/choreos";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import BrandLogo from "@/components/shared/BrandLogo";
import { SITE_NAME } from "@/lib/utils/constants";

const easeOut = [0.16, 1, 0.3, 1] as const;

function sectionReveal(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: easeOut },
    viewport: { once: true, amount: 0.2 },
  };
}

function BentoCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-white/12 bg-gradient-to-br from-[#1a1512] via-[#161210] to-[#120f0d] p-6 shadow-[0_10px_45px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-[0_16px_50px_rgba(211,196,184,0.08)] sm:p-7 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gold/5 to-transparent" />
      {children}
    </div>
  );
}

const quickCards = [
  {
    title: "Playback",
    lines: ["Speed x0.75", "Loop selected part", "Skip to section"],
  },
  {
    title: "Session",
    lines: ["Routine: Bhangra Basics", "Progress: 66%", "Saved in library"],
  },
  {
    title: "Output",
    lines: ["Record full take", "Download video", "Share with class"],
  },
];

const flowSteps = [
  {
    title: "Follow",
    description: "Watch and mirror each move with clear visual pacing.",
  },
  {
    title: "Flow",
    description: "Practice with smooth controls: speed, skip, and repeat.",
  },
  {
    title: "Record",
    description: "Capture your performance and track growth over time.",
  },
];

export default function HomePageNew() {
  const router = useRouter();
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    async function prefetchFlow() {
      try {
        const data = await getChoreographyFeed({ tier: "official", limit: 24 });
        const posts = Array.isArray(data?.posts) ? data.posts : [];
        if (posts.length > 0) {
          window.sessionStorage.setItem("nachly_flow_feed_cache_v1", JSON.stringify(posts));
        }
      } catch {
        // Silent failure is okay for prefetching.
      }
    }

    prefetchFlow();
  }, []);

  const handleTryFlow = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsEntering(true);
      setTimeout(() => {
        router.push("/explore");
      }, 900);
    },
    [router]
  );

  return (
    <main className="relative min-h-screen overflow-x-clip bg-obsidian text-[#e8dfd3]">
      <AnimatePresence>
        {isEntering ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-obsidian"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: easeOut }}
              className="flex flex-col items-center gap-4"
            >
              <BrandLogo size={56} />
              <p className="text-[11px] uppercase tracking-[0.35em] text-gold">Loading Flow</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_15%,rgba(211,196,184,0.14),transparent_45%),radial-gradient(circle_at_85%_20%,rgba(211,196,184,0.1),transparent_40%),linear-gradient(180deg,#12100f_0%,#171412_35%,#120f0d_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:40px_40px]" />

      <section className="section-padding pt-8 sm:pt-10">
        <motion.nav
          {...sectionReveal()}
          className="flex items-center justify-between rounded-full border border-gold/20 bg-obsidian-100/75 px-4 py-3 backdrop-blur-xl sm:px-7"
        >
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo size={26} />
            <span className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">{SITE_NAME}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full border border-gold/25 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold transition hover:bg-gold/10">
              Log In
            </Link>
            <button
              type="button"
              onClick={handleTryFlow}
              className="rounded-full bg-gold px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-obsidian transition hover:brightness-105"
            >
              Try Flow
            </button>
          </div>
        </motion.nav>

        <motion.div {...sectionReveal(0.05)} className="mt-14 grid gap-5 md:grid-cols-4 md:grid-rows-[auto_auto]">
          <BentoCard className="md:col-span-3 md:row-span-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Follow - Practice - Record
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[0.98] tracking-[-0.02em] text-[#f3e7d8] sm:text-6xl xl:text-[5.2rem]">
              Learn Dance Step-by-Step with Flow
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[#c9b9a7] sm:text-base">
              A structured and interactive dance learning platform with everything in one place: follow routines, practice with playback controls, then record your best take.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleTryFlow}
                className="h-12 rounded-full bg-gold px-7 text-xs font-semibold uppercase tracking-[0.16em] text-obsidian transition hover:brightness-105"
              >
                Try Flow
              </button>
              <Link
                href="/creator/upload"
                className="inline-flex h-12 items-center justify-center rounded-full border border-gold/25 bg-gold/5 px-7 text-xs font-semibold uppercase tracking-[0.16em] text-gold transition hover:bg-gold/10"
              >
                For Dance Academies
              </Link>
            </div>
          </BentoCard>

          {quickCards.slice(0, 2).map((card) => (
            <BentoCard key={card.title} className="md:col-span-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">{card.title}</p>
              <div className="mt-3 space-y-1.5">
                {card.lines.map((line) => (
                  <p key={line} className="text-sm text-[#dfd2c3]">
                    {line}
                  </p>
                ))}
              </div>
            </BentoCard>
          ))}
        </motion.div>
      </section>

      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">Flow Section</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#f3e7d8] sm:text-5xl">Built around one learning loop</h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {flowSteps.map((step) => (
              <BentoCard key={step.title}>
                <h3 className="font-display text-3xl font-semibold text-[#f3e7d8]">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#c9b9a7]">{step.description}</p>
              </BentoCard>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()} className="grid gap-5 md:grid-cols-4">
          <BentoCard className="md:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">See Nachly in Action</p>
            <h3 className="mt-3 font-display text-3xl font-semibold text-[#f3e7d8]">From learn mode to recording</h3>
            <div className="mt-5 grid h-40 grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#14110e] p-3">
              <div className="rounded-xl bg-gradient-to-b from-[#2a211b] to-[#171310]" />
              <div className="rounded-xl bg-gradient-to-b from-[#3b2d24] to-[#1d1713]" />
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">For Dance Academies</p>
            <h3 className="mt-3 font-display text-3xl font-semibold text-[#f3e7d8]">Take Your Dance Academy Online</h3>
            <ul className="mt-5 space-y-2 text-sm text-[#cdbdab]">
              <li>Upload choreography</li>
              <li>Teach students remotely</li>
              <li>Reach more learners</li>
              <li>Monetize recorded content</li>
            </ul>
            <Link
              href="/creator/upload"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-gold px-7 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-obsidian transition hover:brightness-105"
            >
              Partner with us
            </Link>
          </BentoCard>

          <BentoCard className="md:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Social Proof</p>
            <p className="mt-4 text-base leading-relaxed text-[#d7c8b7]">
              &quot;Nachly helps our students practice efficiently and master routines outside studio hours.&quot;
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Ibadat e Bhangra</p>
          </BentoCard>

          <BentoCard className="md:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Features</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#dfd2c3]">
              <div className="rounded-xl border border-white/10 bg-[#171310] p-3">Step-by-step learning mode</div>
              <div className="rounded-xl border border-white/10 bg-[#171310] p-3">Smooth playback controls</div>
              <div className="rounded-xl border border-white/10 bg-[#171310] p-3">Record your performance</div>
              <div className="rounded-xl border border-white/10 bg-[#171310] p-3">Learn anytime, anywhere</div>
            </div>
          </BentoCard>
        </motion.div>
      </section>

      <section className="section-padding pb-24 pt-16">
        <motion.div {...sectionReveal()} className="grid gap-5 md:grid-cols-4">
          <BentoCard className="md:col-span-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">Final CTA</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#f5e9db] sm:text-5xl">Start Learning Now</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#dccdbc]">
              Begin your journey with Flow or partner with us to bring your academy online.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleTryFlow}
                className="h-12 rounded-full bg-gold px-7 text-xs font-semibold uppercase tracking-[0.15em] text-obsidian transition hover:brightness-105"
              >
                Try Flow
              </button>
              <Link
                href="/creator/upload"
                className="inline-flex h-12 items-center rounded-full border border-gold/30 bg-[#1a1512] px-7 text-xs font-semibold uppercase tracking-[0.15em] text-gold transition hover:bg-gold/10"
              >
                For Dance Academies
              </Link>
            </div>
          </BentoCard>
        </motion.div>
      </section>

      <footer className="border-t border-white/5 bg-obsidian py-16">
        <div className="section-padding flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold">{SITE_NAME}</p>
            <p className="mt-1 text-xs text-[#bcae9d]">Structured dance learning for students and academies.</p>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[#8f8070]">© 2026 NACHLY. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </main>
  );
}
