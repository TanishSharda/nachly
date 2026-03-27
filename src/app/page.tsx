"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import BrandLogo from "@/components/shared/BrandLogo";
import { SITE_NAME } from "@/lib/utils/constants";

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

/* ── Inline SVG icon helpers ── */
const Ico = ({ d, size = 22, stroke = "currentColor", fill = "none" }: { d: string; size?: number; stroke?: string; fill?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-transform duration-500 group-hover:scale-110"
  >
    <path d={d} />
  </svg>
);

const IcoScroll = ({ size }: { size?: number }) => <Ico d="M12 2v20M5 5l7-3 7 3M5 19l7 3 7-3" size={size} />;
const IcoPose = ({ size }: { size?: number }) => <Ico d="M12 2a3 3 0 100 6 3 3 0 000-6zM12 8v6m-4 4l4-4 4 4m-8 0v2m8-2v2" size={size} />;
const IcoRecord = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
);
const IcoRemix = ({ size }: { size?: number }) => <Ico d="M16 3h5v5M4 20L20.5 3.5M21 16v5h-5M3 4l16.5 16.5" size={size} />;
const IcoLearn = ({ size }: { size?: number }) => <Ico d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" size={size} />;
const IcoShare = ({ size }: { size?: number }) => <Ico d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" size={size} />;
const IcoHeart = ({ size }: { size?: number }) => <Ico d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" size={size} />;
const IcoComment = ({ size }: { size?: number }) => <Ico d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" size={size} />;
const IcoBookmark = ({ size }: { size?: number }) => <Ico d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" size={size} />;



const sectionReveal = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOutExpo } },
};

const staggerParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};

const staggerChild = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: easeOutExpo } },
};

const FEATURES = [
  { icon: <IcoScroll />, title: "New Dances", desc: "Find the latest dance routines in our high-quality video feed.", accent: true },
  { icon: <IcoPose />, title: "Smart Tracking", desc: "Our AI body tracking compares your moves to the teacher's moves." },
  { icon: <IcoRecord />, title: "Dance Library", desc: "Your practice sessions are saved automatically in high quality." },
  { icon: <IcoRemix />, title: "Easy Practice", desc: "Learn with a split-screen and get real-time feedback on your moves." },
  { icon: <IcoLearn />, title: "Move by Move", desc: "Break any dance down into single moves to learn them perfectly." },
  { icon: <IcoShare />, title: "Share your Dance", desc: "One-tap share to your social media or with the global community." },
];

const STYLES = [
  { title: "Bollywood", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCjWNf-BUZuFqpm-E2XJuHyMidLtRlwTJHpTKO2YVzLCAA1sdwDzCkxT7YO40Ny2wq2mR831No9PQWWGSvUyfr23JPxQ61P6fAri73hDAHM96UoqTKGMA4i_rbEJoLMxioyv2eQheQFTGkLh3IimSO8rblpAyZGGOOmI_M5E6t56t32XyqUcK6hSAV9tdr9qM6bMQ80pefl5KySwhSmkIR11_AfatJCUJRrhp8vY60KtxpqJ9T4EBpje9HzrmsTu_T1khvWt1VhRhA" },
  { title: "Grove", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCvq5kYoGjy8xQDmhLCFaUT8x7XKSq9W0JXW37gUzgC8rSMPnX8rT4hgII4J0GOFTjc8aAoCXQPYeKQxZmZ6gw6HNQzElvhUgiseOTEbbfa2d_Nch0tBw4_hNcPDBWzouB1s9RbchLwV7Eqa0_QlQXrNFsG6S9qcwpvEA4ox9K10ipsPNOUQl0X_gUWAqJ4JcuEO5pmzZh_QLE52xOCmO0bn56didNdMVQmyN6ctP7rEwrv4MGXf7L6x48JeIACBmI13aqGWMwYfm8" },
];

const SCROLL_STEPS = [
  { num: "01", title: "Watch", desc: "Watch the latest dances in a clean, high-quality video feed." },
  { num: "02", title: "Break Down", desc: "Break any dance into small steps that you can loop. Focus on the details." },
  { num: "03", title: "Practice", desc: "Start practicing. Our AI tracks your body to help you improve." },
  { num: "04", title: "Save", desc: "Save all your practice videos automatically in high quality." },
];

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section className={className} variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }}>
      {children}
    </motion.section>
  );
}

const AnimatedHeadline = ({ text, accent }: { text: string; accent?: string }) => {
  const words = text.split(" ");
  return (
    <h2 className="font-display text-5xl font-extralight leading-[1.1] tracking-[-0.03em] text-[#E7E5E5] sm:text-7xl">
      {words.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`mr-[0.2em] inline-block ${accent?.includes(word) ? "text-gold font-light" : ""}`}
        >
          {word}
        </motion.span>
      ))}
    </h2>
  );
};

const MotionButton = ({ 
  href, 
  label, 
  primary = false, 
  className = "", 
  onClick 
}: { 
  href: string; 
  label: string; 
  primary?: boolean; 
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) => {
  return (
    <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} className="relative">
      <Link
        href={href}
        onClick={onClick}
        className={`relative inline-flex items-center overflow-hidden rounded-full px-10 py-4 text-[13px] font-semibold uppercase tracking-[0.2em] transition-all duration-500 ${
          primary
            ? "bg-gold text-obsidian shadow-[0_10px_40px_rgba(211,196,184,0.15)] hover:shadow-[0_15px_60px_rgba(211,196,184,0.25)]"
            : "border border-gold/20 bg-gold/5 text-gold backdrop-blur-xl hover:bg-gold/10"
        } ${className}`}
      >
        <span className="relative z-10">{label}</span>
      </Link>
    </motion.div>
  );
};

function CursorGlow() {
  const [active, setActive] = useState(false);
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const smoothX = useSpring(x, { stiffness: 180, damping: 22, mass: 0.2 });
  const smoothY = useSpring(y, { stiffness: 180, damping: 22, mass: 0.2 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(hover: none)").matches;
    if (isTouch) return;
    const onMove = (event: MouseEvent) => { setActive(true); x.set(event.clientX - 110); y.set(event.clientY - 110); };
    const onLeave = () => setActive(false);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseleave", onLeave); };
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(211,196,184,0.08)_0%,rgba(211,196,184,0)_70%)] blur-[80px]"
      style={{ x: smoothX, y: smoothY, opacity: active ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    />
  );
}

export default function HomePage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(1);
  const [isEntering, setIsEntering] = useState(false);
  const { scrollY } = useScroll();
  const blobY = useTransform(scrollY, [0, 1300], [0, -120]);
  const parallaxY = useTransform(scrollY, [0, 1500], [0, -80]);

  useEffect(() => {
    const id = setInterval(() => setSeconds((prev) => (prev >= 10 ? 1 : prev + 1)), 900);
    return () => clearInterval(id);
  }, []);

  // Background Prefetch for Flow Feed
  useEffect(() => {
    async function prefetchFlow() {
      try {
        const response = await fetch("/api/choreos?tier=official");
        if (response.ok) {
          const payload = await response.json();
          if (Array.isArray(payload?.choreos)) {
            window.sessionStorage.setItem("nachly_flow_feed_cache_v1", JSON.stringify(payload.choreos));
          }
        }
      } catch (e) {
        console.warn("Background prefetch failed:", e);
      }
    }
    prefetchFlow();
  }, []);

  const handleStartDancing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsEntering(true);
    // Allow animation to play and data to settle
    setTimeout(() => {
      router.push("/scroll");
    }, 1200);
  }, [router]);

  const timerLabel = useMemo(() => `00:${String(seconds).padStart(2, "0")}`, [seconds]);

  return (
    <main className="relative min-h-screen overflow-x-clip bg-obsidian text-[#E7E5E5] selection:bg-gold/30 selection:text-gold">
      <AnimatePresence>
        {isEntering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-obsidian"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <BrandLogo size={60} className="shadow-[0_0_50px_rgba(211,196,184,0.2)]" />
              <div className="flex flex-col items-center gap-2">
                <p className="text-[11px] font-medium tracking-[0.5em] uppercase text-gold animate-pulse">
                  Entering Academy
                </p>
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CursorGlow />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03] marketing-grain" />

      <motion.div style={{ y: blobY }} className="pointer-events-none fixed inset-0 -z-10">
        <motion.div
          animate={{ x: [0, 40, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute -top-32 left-[-15%] h-[40rem] w-[40rem] rounded-full bg-gold/3 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -50, 40, 0], y: [0, 30, -25, 0], scale: [1, 0.9, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
          className="absolute right-[-10%] top-40 h-[45rem] w-[45rem] rounded-full bg-[#E7E5E5]/2 blur-[150px]"
        />
      </motion.div>

      {/* ── NAV ── */}
      <RevealSection className="section-padding pt-6 sm:pt-8">
        <nav className="mb-12 hidden items-center justify-between rounded-full border border-white/5 bg-obsidian-100/40 px-8 py-4 backdrop-blur-3xl md:flex shadow-2xl">
          <div className="flex items-center gap-3">
            <BrandLogo size={24} />
            <p className="text-[11px] font-medium tracking-[0.3em] uppercase text-gold">Nachly</p>
          </div>
          <div className="flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] font-medium text-[#E7E5E5]/40">
            <a href="#scroll-feature" className="hover:text-gold transition-colors">Start Dancing</a>
            <a href="#features" className="hover:text-gold transition-colors">How it Works</a>
            <a href="#styles" className="hover:text-gold transition-colors">Dance Styles</a>
          </div>
          <div className="flex items-center gap-4">
            <MotionButton href="/login" label="Log In" />
            <MotionButton href="/scroll" label="Start Dancing" primary />
          </div>
        </nav>

        {/* ── HERO ── */}
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:pt-8">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8 inline-flex items-center gap-3 rounded-full border border-gold/15 bg-gold/5 px-5 py-2 text-[10px] uppercase tracking-[0.25em] font-medium text-gold"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" /> Dance Academy — Now Live
            </motion.div>
            <AnimatedHeadline text="Improve Your Moves. Master the Rhythm." accent="Master" />
            <p className="mt-8 max-w-lg text-[15px] font-light leading-relaxed text-[#E7E5E5]/60 tracking-wide">
              The premium AI-powered dance academy. Watch amazing dances, learn every step with smart tracking, and practice with our AI trainer. Improve your skills today.
            </p>

            <div className="mt-12 flex flex-wrap gap-5">
              <MotionButton href="/scroll" label="Start Dancing" onClick={handleStartDancing} primary />
              <MotionButton href="/explore" label="Find Styles" />
            </div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerParent} className="mt-12 space-y-4">
              {[
                { label: "High-Quality Dance Feed", color: "bg-gold/15 text-gold", icon: "✧" },
                { label: "Smart AI Body Tracking", color: "bg-white/5 text-white/40", icon: <IcoPose /> },
                { label: "Automated Practice Videos", color: "bg-white/5 text-white/40", icon: <IcoShare /> },
              ].map((item) => (
                <motion.div key={item.label} variants={staggerChild} whileHover={{ x: 8 }} className="flex items-center gap-4 group">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-obsidian-100/40 text-[13px] transition-all duration-500 group-hover:border-gold/20 group-hover:bg-gold/5 ${item.color}`}>
                    {item.icon}
                  </span>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#E7E5E5]/50 group-hover:text-gold transition-colors">{item.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div
            id="demo"
            style={{ y: parallaxY }}
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative mx-auto w-full max-w-[26rem]"
          >
            <div className="rounded-[40px] bg-gold/5 p-4 backdrop-blur-3xl shadow-2xl border border-white/5 relative group overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div
                className="relative h-[34rem] overflow-hidden rounded-[30px] bg-cover bg-center grayscale-[0.2] transition-all duration-700 group-hover:grayscale-0 shadow-inner"
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCvq5kYoGjy8xQDmhLCFaUT8x7XKSq9W0JXW37gUzgC8rSMPnX8rT4hgII4J0GOFTjc8aAoCXQPYeKQxZmZ6gw6HNQzElvhUgiseOTEbbfa2d_Nch0tBw4_hNcPDBWzouB1s9RbchLwV7Eqa0_QlQXrNFsG6S9qcwpvEA4ox9K10ipsPNOUQl0X_gUWAqJ4JcuEO5pmzZh_QLE52xOCmO0bn56didNdMVQmyN6ctP7rEwrv4MGXf7L6x48JeIACBmI13aqGWMwYfm8')" }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-obsidian/30 via-transparent to-obsidian" />
                <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
                  <div className="inline-flex items-center gap-3 rounded-full bg-obsidian-100/60 border border-white/5 px-4 py-1.5 text-[9px] uppercase tracking-widest text-[#E7E5E5] backdrop-blur-md">
                    <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="h-1.5 w-1.5 rounded-full bg-gold" />
                    Archive {timerLabel}
                  </div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: seconds > 2 ? 1 : 0 }} className="rounded-full bg-gold px-4 py-1.5 text-[10px] uppercase font-bold text-obsidian tracking-wider">
                    MASTERED {82}%
                  </motion.div>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-6">
                  {[<IcoHeart key="h" />, <IcoComment key="c" />, <IcoShare key="s" />, <IcoBookmark key="b" />].map((icon, i) => (
                    <div key={i} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-obsidian-100/40 border border-white/10 text-gold/60 hover:text-gold transition-all duration-300 backdrop-blur-md group/ico">
                      {icon}
                    </div>
                  ))}
                </div>
                <div className="absolute inset-x-6 bottom-6 space-y-4">
                  <div className="flex gap-2">
                    {["Top Performance", "Academy Choice"].map((r) => (
                      <span key={r} className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-[9px] uppercase tracking-wider text-[#E7E5E5]/60">{r}</span>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <Link href="/scroll" className="flex-1 premium-button bg-gold text-obsidian py-4 text-[11px] tracking-widest uppercase">Start</Link>
                    <Link href="/scroll" className="flex-1 premium-button bg-white/5 border border-white/10 text-white py-4 text-[11px] tracking-widest uppercase">Learn</Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </RevealSection>

      {/* ── SCROLL FEATURE ── */}
      <RevealSection className="mt-32 py-32 bg-obsidian-100/30 border-y border-white/5">
        <div className="section-padding" id="scroll-feature">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/5 text-gold border border-gold/10"
            >
              <IcoScroll />
            </motion.div>
            <AnimatedHeadline text="The Smooth Dance Experience" accent="Smooth" />
            <p className="mx-auto mt-6 max-w-2xl text-[15px] font-light text-[#E7E5E5]/50 leading-relaxed tracking-wide">
              A high-quality video feed designed for focused learning. Watch hand-picked routines, learn every move, and improve your dancing.
            </p>
          </div>

          <motion.div variants={staggerParent} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {SCROLL_STEPS.map((step) => (
              <motion.div key={step.num} variants={staggerChild} whileHover={{ y: -10 }} className="p-8 rounded-3xl bg-obsidian-100/50 border border-white/5 hover:border-gold/20 transition-all duration-500 group">
                <div className="text-4xl font-extralight text-gold/20 mb-6 group-hover:text-gold transition-colors duration-700">{step.num}</div>
                <h3 className="text-lg font-light tracking-widest uppercase text-gold/80 mb-3">{step.title}</h3>
                <p className="text-[13px] font-light text-[#E7E5E5]/40 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-16 text-center">
            <MotionButton href="/scroll" label="Start Dancing Now" onClick={handleStartDancing} primary className="px-12" />
          </div>
        </div>
      </RevealSection>

      {/* ── PHILOSOPHY ── */}
      <RevealSection className="section-padding py-32" >
        <div id="features">
          <div className="max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-3">Foundations</p>
            <AnimatedHeadline text="A New Standard of Excellence" accent="Excellence" />
          </div>

          <motion.div variants={staggerParent} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={staggerChild} whileHover={{ y: -8 }} className="p-8 rounded-[32px] bg-obsidian-100/40 border border-white/5 hover:bg-gold/[0.02] hover:border-gold/10 transition-all duration-700 group">
                <div className="mb-6 text-gold/60 group-hover:text-gold transition-colors duration-500">{f.icon}</div>
                <h3 className="text-sm font-medium tracking-widest uppercase text-gold/90 mb-3">{f.title}</h3>
                <p className="text-[13px] font-light text-[#E7E5E5]/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </RevealSection>

      {/* ── STUDIO ── */}
      <RevealSection className="bg-obsidian-100/40 py-32 border-y border-white/5">
        <div className="section-padding">
          <div className="grid gap-20 lg:grid-cols-2 items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-3">The Studio</p>
              <AnimatedHeadline text="Professional AI for Dancing" accent="Dancing" />
              <div className="mt-12 space-y-8">
                {[
                  { t: "Body mapping", d: "Real-time pose analysis that compares your moves to the teacher's moves." },
                  { t: "Dance Analysis", d: "Deep insights into your timing, accuracy, and energy." },
                  { t: "Auto Recording", d: "Every session is automatically recorded in high quality for you to watch later." },
                ].map(item => (
                  <div key={item.t} className="group">
                    <h4 className="text-[11px] uppercase tracking-[0.2em] font-medium text-gold mb-2 group-hover:translate-x-1 transition-transform">{item.t}</h4>
                    <p className="text-[14px] font-light text-[#E7E5E5]/40 leading-relaxed">{item.d}</p>
                  </div>
                ))}
              </div>
              <div className="mt-12 flex flex-wrap gap-5">
                <MotionButton href="/scroll" label="Join the Studio" primary />
                <MotionButton href="/explore" label="All Dances" />
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.8 }} className="relative overflow-hidden rounded-[40px] border border-white/5 p-4 bg-obsidian shadow-2xl">
              <div className="h-[26rem] rounded-[32px] bg-cover bg-center grayscale shadow-2xl" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuATUbss4yuUBxUB-vpjYdQhOI-fgbkxbEuYUe_OXoUa2_vvawn5lnm2BSRdt1tj_T7aUT276pVivh4JcvoE-YGArwOSXQO9vANFpQmkJdtY0lt4OZv09eiu1V3KIVaR0Pvqp6FHJhO4tGbD-5ECUGMmlYjudlbaWP9kXdmi5QunI10fCSHro_3FKStz6-7T510xzT7GKK-CkHKrtvTztbrD0FYbUV8V7M7bn9N2rOpCGrs6bcLkABl9m2-L3xZ3UlB4uQ-q5diTD0Q')" }} />
               <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-40" />
            </motion.div>
          </div>
        </div>
      </RevealSection>

      {/* ── STYLES ── */}
      <RevealSection className="py-32" >
        <div className="section-padding" id="styles">
          <div className="text-center mb-20">
             <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-3">Global Disciplines</p>
             <AnimatedHeadline text="Curated Masteries" accent="Masteries" />
          </div>
          <motion.div variants={staggerParent} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STYLES.map((card) => (
              <motion.article key={card.title} variants={staggerChild} whileHover={{ y: -10 }} className="group relative overflow-hidden rounded-[40px] aspect-[4/5] shadow-2xl">
                <div className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-[2s] scale-110 group-hover:scale-100" style={{ backgroundImage: `url('${card.img}')` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent opacity-80" />
                <div className="absolute inset-0 p-8 flex flex-col justify-end items-center text-center">
                   <h3 className="text-2xl font-light tracking-widest uppercase text-[#E7E5E5] group-hover:text-gold transition-colors">{card.title}</h3>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </RevealSection>

      {/* ── FINAL CTA ── */}
      <RevealSection className="section-padding pb-40 pt-20 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gold font-semibold mb-6">Start Dancing</p>
        <h2 className="font-display text-6xl font-extralight tracking-tighter text-[#E7E5E5] sm:text-7xl">Make Your <span className="text-gold italic">Mark.</span></h2>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6">
          <MotionButton href="/scroll" label="Start Now" onClick={handleStartDancing} primary className="px-12" />
          <MotionButton href="/explore" label="Find Styles" className="px-12" />
        </div>
      </RevealSection>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 bg-obsidian">
        <div className="section-padding py-24">
          <div className="grid gap-16 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-4 mb-6 group">
                <BrandLogo size={36} className="shadow-[0_0_20px_rgba(211,196,184,0.1)] group-hover:shadow-[0_0_35px_rgba(211,196,184,0.2)] transition-all duration-700" />
                <p className="text-[14px] font-light tracking-[0.5em] uppercase text-gold group-hover:text-gold transition-colors">{SITE_NAME}</p>
              </div>
              <p className="text-[13px] font-light leading-relaxed text-[#E7E5E5]/30">The premium dance academy. Expert choreography, made easy to learn.</p>
            </div>
            <div>
              <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/60">Dances</p>
              <div className="flex flex-col gap-4 text-[13px] font-light text-[#E7E5E5]/40">
                <Link href="/scroll" className="hover:text-gold transition-colors">Start Dancing</Link>
                <Link href="/explore" className="hover:text-gold transition-colors">Styles</Link>
                <Link href="/reels" className="hover:text-gold transition-colors">Video Feed</Link>
              </div>
            </div>
            <div>
              <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/60">Teach</p>
              <div className="flex flex-col gap-4 text-[13px] font-light text-[#E7E5E5]/40">
                <Link href="/login" className="hover:text-gold transition-colors">Log In</Link>
                <Link href="/signup" className="hover:text-gold transition-colors">Sign Up</Link>
                <Link href="/download" className="hover:text-gold transition-colors">Mobile App</Link>
              </div>
            </div>
            <div>
               <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/60">Help</p>
              <div className="flex flex-col gap-4 text-[13px] font-light text-[#E7E5E5]/40">
                <Link href="/legal" className="hover:text-gold transition-colors">Legal Terms</Link>
              </div>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-white/5 flex flex-wrap justify-between items-center gap-4">
             <p className="text-[10px] uppercase tracking-widest text-[#E7E5E5]/20">© 2026 Nachly Academy. All Rights Reserved.</p>
             <div className="flex gap-8 text-[10px] uppercase tracking-widest text-[#E7E5E5]/20">
                <span className="hover:text-gold cursor-pointer transition-colors">Privacy</span>
                <span className="hover:text-gold cursor-pointer transition-colors">Terms</span>
             </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
