"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getOrCreateGuestId } from "@/lib/utils/guest-session";
import BrandLogo from "@/components/shared/BrandLogo";
import HeroCinematic from "@/components/marketing/HeroCinematic";

const easeOut = [0.16, 1, 0.3, 1] as const;
const HERO_VIDEO = "/videos/one-night.optimized.mp4";
const HERO_POSTER = "/videos/one-night.poster.jpg";
const HERO_VIDEO_ALT = "/videos/first-class.optimized.mp4";
const HERO_POSTER_ALT = "/videos/one-night.poster.jpg";
const HERO_VIDEO_THIRD = "/videos/first-class.optimized.mp4";

const WAITLIST_COUNT = process.env.NEXT_PUBLIC_WAITLIST_COUNT;
const CREATOR_COUNT = process.env.NEXT_PUBLIC_CREATOR_COUNT;
const DROP_COUNT = process.env.NEXT_PUBLIC_DROP_COUNT;

const heroBadges = ["Trending drops", "Step-by-step", "Creator-led"];

const whyLove = [
  {
    title: "Learn trending dances faster",
    description: "Skip endless tutorials. Nachly turns viral dances into learnable steps.",
  },
  {
    title: "Guided breakdowns",
    description: "Clear sections, repeat loops, and clean timing so you build muscle memory.",
  },
  {
    title: "Practice without pressure",
    description: "Slow it down, mirror the teacher, then ramp up when it feels right.",
  },
  {
    title: "Made for Gen Z habits",
    description: "Scroll-native, short-form, and addictive in the best way.",
  },
  {
    title: "Progress you can feel",
    description: "Track streaks and improvements instead of guessing if you are better.",
  },
  {
    title: "Affordable alternative",
    description: "Get studio-like structure without the studio price tag.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Scroll",
    description: "Browse a feed of choreography curated for your vibe.",
  },
  {
    step: "02",
    title: "Pick",
    description: "Open the routine you want and see the full breakdown.",
  },
  {
    step: "03",
    title: "Learn step-by-step",
    description: "Use loops, slow motion, and clean sections to lock it in.",
  },
  {
    step: "04",
    title: "Practice",
    description: "Mirror the instructor and record your take when ready.",
  },
  {
    step: "05",
    title: "Improve",
    description: "Save your sessions and build a real progression arc.",
  },
];

const features = [
  {
    title: "Short-form choreography feed",
    description: "Discover trending dances and remix-ready routines.",
  },
  {
    title: "Structured lessons",
    description: "Clean breakdowns that make every move learnable.",
  },
  {
    title: "Practice tools",
    description: "Speed control, loops, mirror mode, and instant replay.",
  },
  {
    title: "Progress tracking",
    description: "Streaks, saved sessions, and visible growth over time.",
  },
  {
    title: "Future AI-assisted feedback",
    description: "Personalized guidance will arrive as the AI coach evolves.",
  },
  {
    title: "Creator-led learning",
    description: "Learn from choreographers who shape the trends.",
  },
];

const faqs = [
  {
    question: "Is Nachly beginner-friendly?",
    answer: "Yes. Start slow, loop sections, and build confidence at your pace.",
  },
  {
    question: "Will AI coach me?",
    answer: "AI-assisted feedback is coming soon. The current flow already gives you structured practice.",
  },
  {
    question: "Is it affordable?",
    answer: "We are building an accessible option for dance learners everywhere.",
  },
  {
    question: "When does Nachly launch?",
    answer: "We are rolling out soon. Join the waitlist to be first.",
  },
];

const waitlistStats = [
  {
    label: "Waitlist signups",
    value: WAITLIST_COUNT ? `${WAITLIST_COUNT}+` : "Growing daily",
  },
  {
    label: "Creator drops",
    value: DROP_COUNT ? `${DROP_COUNT}+ weekly` : "Weekly drops",
  },
  {
    label: "Creators onboard",
    value: CREATOR_COUNT ? `${CREATOR_COUNT}+` : "Top choreographers",
  },
];

const appPreviews = [
  {
    title: "Scroll the feed",
    subtitle: "Viral drops daily",
    video: HERO_VIDEO,
    poster: HERO_POSTER,
  },
  {
    title: "Learn step-by-step",
    subtitle: "Breakdowns that stick",
    video: HERO_VIDEO_ALT,
    poster: HERO_POSTER_ALT,
  },
  {
    title: "Practice + record",
    subtitle: "Save your progress",
    video: HERO_VIDEO_THIRD,
    poster: HERO_POSTER_ALT,
  },
];

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
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.5)] transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_50px_-26px_rgba(0,0,0,0.6)] sm:p-7 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/5 to-transparent" />
      {children}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [captureState, setCaptureState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [captureMessage, setCaptureMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setTimeout(() => setAuthReady(true), 0);
      return;
    }

    const supabase = createClient();
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setIsAuthenticated(Boolean(data.session?.user));
        setAuthReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setIsAuthenticated(false);
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const flowEntryHref = useMemo(() => {
    if (!authReady) return "/auth?redirect=%2Flearn%2Ffeed";
    return isAuthenticated ? "/learn/feed" : "/auth?redirect=%2Flearn%2Ffeed";
  }, [authReady, isAuthenticated]);

  const goToFlowEntry = useCallback(() => {
    router.push(flowEntryHref);
  }, [flowEntryHref, router]);

  const handleLeadCapture = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setCaptureState("error");
        setCaptureMessage("Please enter your email.");
        return;
      }

      setCaptureState("saving");
      setCaptureMessage("");

      try {
        const response = await fetch("/api/marketing/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            source: "homepage_final_cta",
            page: "/",
            guestKey: getOrCreateGuestId(),
            metadata: {
              campaign: "flow-learning-landing",
            },
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Unable to save email");
        }

        setCaptureState("saved");
        setCaptureMessage(payload?.duplicate ? "You are already on the list. We will keep you updated." : "You are on the list. Early updates are on the way.");
        setEmail("");
      } catch {
        setCaptureState("error");
        setCaptureMessage("Could not save your email right now. Please try again.");
      }
    },
    [email]
  );

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#080808] text-[#F8F8F8]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.03),transparent_45%),radial-gradient(circle_at_85%_5%,rgba(255,255,255,0.02),transparent_55%),linear-gradient(180deg,#0a0a0a_0%,#121212_48%,#000000_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] [background-image:radial-gradient(rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:36px_36px]" />

      <HeroCinematic />

      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F3B2AB]">App preview</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">See it in motion</h2>
          <p className="mt-3 max-w-2xl text-sm text-[#8A8D9F]">
            Real choreography clips, real practice flow. This is what Nachly feels like.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {appPreviews.map((item) => (
              <motion.div key={item.title} whileHover={{ y: -6 }} transition={{ duration: 0.3 }}>
                <BentoCard>
                  <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] border border-white/10 bg-black">
                    <video
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster={item.poster}
                      className="h-full w-full object-cover"
                    >
                      <source src={item.video} type="video/mp4" />
                    </video>
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
                      {item.title}
                    </div>
                    <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/60 px-3 py-2 backdrop-blur-md">
                      <p className="text-[10px] font-semibold text-white">{item.subtitle}</p>
                    </div>
                  </div>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F3B2AB]">Why users love it</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">Built for dance learners, not spectators</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whyLove.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.04 }}
                viewport={{ once: true, amount: 0.2 }}
              >
                <BentoCard>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#8A8D9F]">{item.description}</p>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="how-it-works" className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F3B2AB]">How it works</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">For learners and creators</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8A8D9F]">
            Learners use Nachly to find a routine, break it down, practice it, and improve. Creators use it to upload choreography, guide students, and grow an audience.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <BentoCard>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F3B2AB]">Learner</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Find. Learn. Practice. Improve.</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#8A8D9F]">
                <li>Scroll the feed and pick a dance you want.</li>
                <li>Use step-by-step breakdowns, slow motion, and loops.</li>
                <li>Practice in the camera flow, then save your progress.</li>
              </ul>
            </BentoCard>

            <BentoCard>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F3B2AB]">Creator</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Upload. Teach. Reach. Earn.</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#8A8D9F]">
                <li>Upload choreography, tutorials, and guided lessons.</li>
                <li>Teach with structured sections instead of random clips.</li>
                <li>Reach learners and grow your brand inside the platform.</li>
              </ul>
            </BentoCard>
          </div>
        </motion.div>
      </section>

      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F3B2AB]">Problem and solution</p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">Watching dance is not learning dance</h2>
              <p className="mt-5 text-base leading-relaxed text-[#8A8D9F]">
                Nachly bridges the gap between passive scrolling and real practice. You get structure, repetition, and progress so dances actually stick.
              </p>
            </div>
            <BentoCard>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F3B2AB]">Nachly fixes it</p>
              <ul className="mt-4 space-y-3 text-sm text-[#8A8D9F]">
                <li>Breakdowns built for repetition</li>
                <li>Practice tools you control</li>
                <li>Progress you can track</li>
                <li>Creator-led routines that stay fresh</li>
              </ul>
            </BentoCard>
          </div>
        </motion.div>
      </section>

      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F3B2AB]">Features</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">Everything you need to level up</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.04 }}
                viewport={{ once: true, amount: 0.2 }}
              >
                <BentoCard>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#8A8D9F]">{item.description}</p>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()} className="grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Learn what is trending",
              label: "Community",
              description: "Stay plugged into the dances that everyone is doing right now.",
            },
            {
              title: "Track your streaks",
              label: "Consistency",
              description: "Build a habit with visual streaks and saved practice sessions.",
            },
            {
              title: "Show your progress",
              label: "Share",
              description: "Record your best takes and share the glow up.",
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <BentoCard>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F3B2AB]">{item.label}</p>
                <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-[#8A8D9F]">{item.description}</p>
              </BentoCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* For Choreographers Section */}
      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <div className="rounded-[2.5rem] border border-[#6c513236] bg-gradient-to-br from-[#2b241b] to-[#1a1610] p-8 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F3B2AB]">For choreographers</p>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Teach dance. Build your brand. Earn.</h2>
                <p className="mt-4 text-sm leading-relaxed text-[#8A8D9F]">
                  Join a growing community of verified choreographers. Upload like Instagram, structure professional tutorials, reach global learners, and monetize your expertise with a 60% revenue share.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/for-choreographers" className="inline-flex h-11 items-center rounded-full bg-[#F3B2AB] px-6 text-xs font-semibold uppercase tracking-[0.14em] text-black transition hover:brightness-110 shadow-[0_14px_30px_-15px_rgba(243,178,171,0.5)]">
                    Learn More
                  </Link>
                  <Link href="/creator/upload" className="inline-flex h-11 items-center rounded-full border border-white/20 px-6 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/5">
                    Start Creating
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "🎬", title: "Upload", desc: "Record or upload choreography with creator tools" },
                  { icon: "📚", title: "Teach", desc: "Build step-by-step lessons and tutorials" },
                  { icon: "📊", title: "Grow", desc: "Track views, learners, and AI scores" },
                  { icon: "💰", title: "Earn", desc: "60% revenue share on every purchase" },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-[#6c513230] bg-white/[0.03] p-4">
                    <span className="text-2xl">{item.icon}</span>
                    <p className="mt-2 text-sm font-semibold text-[#f8f5ef]">{item.title}</p>
                    <p className="mt-1 text-xs text-[#8a7d70]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="waitlist" className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8 text-center shadow-[0_25px_50px_-30px_rgba(0,0,0,0.6)] sm:p-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F3B2AB]">Waitlist</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Be among the first to transform how you learn dance.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#8A8D9F]">
              Get early access, new drops, and creator-led routines as soon as we launch.
            </p>

            <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
              {waitlistStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#F3B2AB]">{stat.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleLeadCapture} className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 flex-1 rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white placeholder:text-[#8A8D9F] outline-none transition focus:border-white/30"
              />
              <button
                type="submit"
                disabled={captureState === "saving"}
                className="h-12 rounded-full bg-white px-6 text-xs font-semibold uppercase tracking-[0.14em] text-black transition hover:brightness-110 disabled:opacity-70"
              >
                {captureState === "saving" ? "Saving..." : "Join Waitlist"}
              </button>
            </form>

            {captureMessage ? (
              <p className={`mt-3 text-sm ${captureState === "error" ? "text-[#9a3e2a]" : "text-[#5f554b]"}`}>{captureMessage}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={goToFlowEntry}
                className="h-12 rounded-full bg-white px-7 text-xs font-semibold uppercase tracking-[0.15em] text-black transition hover:brightness-110"
              >
                Start Learning
              </button>
              <Link
                href="/learn/feed?style=mix"
                className="inline-flex h-12 items-center rounded-full border border-white/20 bg-transparent px-7 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/10"
              >
                Explore the Feed
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F3B2AB]">FAQ</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">Quick answers</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {faqs.map((item, index) => (
              <motion.div
                key={item.question}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.04 }}
                viewport={{ once: true, amount: 0.2 }}
              >
                <BentoCard>
                  <h3 className="text-base font-semibold text-white">{item.question}</h3>
                  <p className="mt-2 text-sm text-[#8A8D9F]">{item.answer}</p>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <footer className="section-padding pb-16 pt-14">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo size={28} />
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[#F3B2AB]">Nachly</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-[#8A8D9F]">A modern dance learning app built for the scroll generation.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F3B2AB]">
            <Link href="/learn/feed?style=mix">Flow</Link>
            <Link href="/learn/feed">Feed</Link>
            <Link href="/for-choreographers">For Creators</Link>
            <Link href="/subscribe">Subscriptions</Link>
            <Link href="/creator/dashboard">Creator</Link>
            <Link href="/auth">Login</Link>
            <Link href="/download-app">App</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
