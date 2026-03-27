"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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

const IcoScroll = () => <Ico d="M12 2v20M5 5l7-3 7 3M5 19l7 3 7-3" />;
const IcoPose = () => <Ico d="M12 2a3 3 0 100 6 3 3 0 000-6zM12 8v6m-4 4l4-4 4 4m-8 0v2m8-2v2" />;
const IcoRecord = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
);
const IcoRemix = () => <Ico d="M16 3h5v5M4 20L20.5 3.5M21 16v5h-5M3 4l16.5 16.5" />;
const IcoLearn = () => <Ico d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />;
const IcoShare = () => <Ico d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />;
const IcoHeart = () => <Ico d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />;
const IcoComment = () => <Ico d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />;
const IcoBookmark = () => <Ico d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />;

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

const STYLES = [
  { 
    title: "Hip Hop", 
    desc: "14 Courses • Beginner to Pro", 
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCvq5kYoGjy8xQDmhLCFaUT8x7XKSq9W0JXW37gUzgC8rSMPnX8rT4hgII4J0GOFTjc8aAoCXQPYeKQxZmZ6gw6HNQzElvhUgiseOTEbbfa2d_Nch0tBw4_hNcPDBWzouB1s9RbchLwV7Eqa0_QlQXrNFsG6S9qcwpvEA4ox9K10ipsPNOUQl0X_gUWAqJ4JcuEO5pmzZh_QLE52xOCmO0bn56didNdMVQmyN6ctP7rEwrv4MGXf7L6x48JeIACBmI13aqGWMwYfm8" 
  },
  { 
    title: "Bhangra", 
    desc: "08 Courses • High Energy", 
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCjWNf-BUZuFqpm-E2XJuHyMidLtRlwTJHpTKO2YVzLCAA1sdwDzCkxT7YO40Ny2wq2mR831No9PQWWGSvUyfr23JPxQ61P6fAri73hDAHM96UoqTKGMA4i_rbEJoLMxioyv2eQheQFTGkLh3IimSO8rblpAyZGGOOmI_M5E6t56t32XyqUcK6hSAV9tdr9qM6bMQ80pefl5KySwhSmkIR11_AfatJCUJRrhp8vY60KtxpqJ9T4EBpje9HzrmsTu_T1khvWt1VhRhA" 
  },
  { 
    title: "Kathak", 
    desc: "12 Courses • Classical Soul", 
    img: "https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?q=80&w=2576&auto=format&fit=crop" 
  },
  { 
    title: "Groove", 
    desc: "20 Courses • Urban Style", 
    img: "https://images.unsplash.com/photo-1535525153412-5a42439a210d?q=80&w=2670&auto=format&fit=crop" 
  },
];

function RevealSection({ children, className = "", id = "" }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section 
      id={id}
      className={className} 
      variants={sectionReveal} 
      initial="hidden" 
      whileInView="visible" 
      viewport={{ once: true, amount: 0.12 }}
    >
      {children}
    </motion.section>
  );
}

const AnimatedHeadline = ({ text, accent, className = "" }: { text: string; accent?: string; className?: string }) => {
  const words = text.split(" ");
  return (
    <h2 className={`font-display text-5xl font-extralight leading-[1.1] tracking-[-0.03em] text-silk sm:text-7xl ${className}`}>
      {words.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: idx * 0.08, ease: easeOutExpo }}
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

export default function HomePage() {
  const router = useRouter();
  const [isEntering, setIsEntering] = useState(false);
  const { scrollY } = useScroll();
  const blobY = useTransform(scrollY, [0, 1300], [0, -120]);
  const parallaxY = useTransform(scrollY, [0, 1500], [0, -80]);

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
    setTimeout(() => {
      router.push("/scroll");
    }, 1200);
  }, [router]);

  return (
    <main className="relative min-h-screen overflow-x-clip bg-obsidian text-silk selection:bg-gold/30 selection:text-gold font-body">
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
              transition={{ duration: 0.5, ease: easeOutExpo }}
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

      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03] marketing-grain" />

      <motion.div style={{ y: blobY }} className="pointer-events-none fixed inset-0 -z-10">
        <motion.div
          animate={{ x: [0, 40, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute -top-32 left-[-15%] h-[40rem] w-[40rem] rounded-full bg-gold/5 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -50, 40, 0], y: [0, 30, -25, 0], scale: [1, 0.9, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
          className="absolute right-[-10%] top-40 h-[45rem] w-[45rem] rounded-full bg-gold/3 blur-[150px]"
        />
      </motion.div>

      {/* ── NAV ── */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl">
        <div className="flex items-center justify-between rounded-full border border-white/5 bg-obsidian-100/40 px-8 py-3 backdrop-blur-3xl shadow-2xl">
          <div className="flex items-center gap-3">
            <BrandLogo size={24} />
            <p className="text-[11px] font-medium tracking-[0.3em] uppercase text-gold">Nachly</p>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] font-medium text-silk/40">
            <a href="#flow" className="hover:text-gold transition-colors">The Flow</a>
            <a href="#ai-coach" className="hover:text-gold transition-colors">AI Coach</a>
            <a href="#styles" className="hover:text-gold transition-colors">Academy</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[10px] uppercase tracking-[0.2em] font-medium text-silk/60 hover:text-gold transition-colors hidden sm:block">Log In</Link>
            <MotionButton href="/scroll" label="Start" primary className="px-6 py-2.5 text-[11px]" />
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <RevealSection className="section-padding pt-44 pb-32">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8 inline-flex items-center gap-3 rounded-full border border-gold/15 bg-gold/5 px-5 py-2 text-[10px] uppercase tracking-[0.25em] font-medium text-gold"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" /> Launch Edition
            </motion.div>
            <AnimatedHeadline text="The Future of Dance Learning is Here." accent="Future" />
            <p className="mt-8 max-w-lg text-[16px] font-light leading-relaxed text-silk/50 tracking-wide">
              From watching to mastering. The all-in-one AI dance academy for the digital age. Experience the premium intersection of art and artificial intelligence.
            </p>

            <div className="mt-12 flex flex-wrap gap-5">
              <MotionButton href="/scroll" label="Start Dancing Now" onClick={handleStartDancing} primary />
              <MotionButton href="/explore" label="Find Your Style" />
            </div>
            
            <div className="mt-16 grid grid-cols-2 gap-8 border-t border-white/5 pt-12">
              <div>
                <p className="text-3xl font-extralight text-gold">24/7</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-silk/30 mt-1">AI Feedback</p>
              </div>
              <div>
                <p className="text-3xl font-extralight text-gold">50+</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-silk/30 mt-1">Global Styles</p>
              </div>
            </div>
          </div>

          <motion.div
            style={{ y: parallaxY }}
            className="relative hidden lg:block"
          >
            <div className="relative aspect-[4/5] rounded-[40px] overflow-hidden border border-white/10 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2669&auto=format&fit=crop" 
                alt="Cinematic Dancer" 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-110 hover:scale-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
              <div className="absolute bottom-10 left-10">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-2">Choreography by</p>
                <p className="text-2xl font-extralight text-silk">Elena Rossi</p>
              </div>
            </div>
            {/* Floating Glass Element */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-12 top-1/2 -translate-y-1/2 p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                  <IcoPose />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gold">AI Tracking</p>
                  <p className="text-lg font-light text-silk">Active</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </RevealSection>

      {/* ── THE FLOW ── */}
      <RevealSection id="flow" className="py-32 bg-obsidian-100/20 border-y border-white/5">
        <div className="section-padding grid gap-20 lg:grid-cols-2 items-center">
          <div className="order-2 lg:order-1 relative px-8 flex justify-center">
             {/* Mockup Case */}
             <div className="relative w-full max-w-[280px] aspect-[9/19.5] rounded-[3rem] border-[8px] border-obsidian-100 bg-obsidian shadow-2xl overflow-hidden ring-1 ring-white/10">
                <img 
                  src="https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=2574&auto=format&fit=crop" 
                  alt="Flow Feed Mockup" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
                
                {/* Internal UI elements */}
                <div className="absolute right-4 bottom-32 flex flex-col gap-5">
                   <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-silk"><IcoHeart /></div>
                   <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-silk"><IcoShare /></div>
                   <div className="h-10 w-10 rounded-full bg-gold/80 flex items-center justify-center text-obsidian"><IcoLearn size={18} /></div>
                </div>
                <div className="absolute left-4 bottom-8 right-16">
                   <p className="text-xs font-medium text-silk">Urban Grooves</p>
                   <p className="text-[10px] text-silk/60 mt-1 line-clamp-2">Master this routine in 3 steps with AI analysis.</p>
                </div>
             </div>
             {/* Decorative Blobs */}
             <div className="absolute -top-10 -left-10 h-40 w-40 bg-gold/10 blur-[80px] -z-10 rounded-full" />
             <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-white/5 blur-[80px] -z-10 rounded-full" />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-3">Discovery</p>
            <AnimatedHeadline text="Infinite Inspiration." accent="Inspiration" />
            <p className="mt-8 text-[16px] font-light leading-relaxed text-silk/50 tracking-wide">
              A high-definition feed tailored to your aesthetic. Watch, obsess, and learn any routine with a single tap. Our algorithm understands your kinetic style and pushes you toward your next breakthrough.
            </p>
            <div className="mt-12 space-y-8">
              <div className="flex gap-6 items-start group">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-gold/5 border border-gold/10 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                  <IcoScroll size={20} />
                </div>
                <div>
                   <h4 className="text-sm font-medium tracking-widest uppercase text-silk">Instant Breakdowns</h4>
                   <p className="text-[14px] font-light text-silk/40 mt-2">Convert any short-form video into a step-by-step tutorial automatically.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ── AI COACH ── */}
      <RevealSection id="ai-coach" className="py-32">
        <div className="section-padding text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-3">The Technology</p>
          <AnimatedHeadline text="AI-Powered Precision." accent="Precision" className="mx-auto" />
          <p className="mt-8 mx-auto max-w-2xl text-[16px] font-light leading-relaxed text-silk/50 tracking-wide">
            Practice with real-time body tracking. Our proprietary AI analyzes your posture, timing, and weight distribution, offering instant feedback as you dance alongside a master instructor.
          </p>
          
          <div className="mt-20 relative aspect-video max-w-5xl mx-auto rounded-[2rem] overflow-hidden border border-white/10 group shadow-2xl">
             <div className="grid md:grid-cols-2 h-full">
                <div className="relative border-r border-white/5 overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1535525153412-5a42439a210d?q=80&w=2670&auto=format&fit=crop" className="w-full h-full object-cover grayscale brightness-75" alt="Instructor" />
                   <div className="absolute top-6 left-6 px-3 py-1 rounded-full bg-obsidian-100/60 backdrop-blur-md border border-white/5 text-[9px] uppercase tracking-widest text-gold font-bold">Instructor</div>
                </div>
                <div className="relative overflow-hidden bg-obsidian-100">
                   <img src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2669&auto=format&fit=crop" className="w-full h-full object-cover opacity-50 contrast-125" alt="User Practice" />
                   {/* Digital skeleton mock overlay */}
                   <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <motion.path 
                        d="M50 20 L50 60 L30 80 M50 60 L70 80 M40 40 L60 40" 
                        stroke="#d3c4b8" 
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                        animate={{ d: ["M50 20 L50 60 L30 80 M50 60 L70 80 M40 40 L60 40", "M52 18 L50 62 L32 82 M50 62 L68 78 M38 42 L62 38", "M50 20 L50 60 L30 80 M50 60 L70 80 M40 40 L60 40"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                   </svg>
                   <div className="absolute top-6 left-6 px-3 py-1 rounded-full bg-gold/20 backdrop-blur-md border border-gold/40 text-[9px] uppercase tracking-widest text-gold font-bold">You (AI Active)</div>
                   <div className="absolute bottom-6 right-6">
                      <div className="h-16 w-16 rounded-full border-4 border-gold/20 flex items-center justify-center relative">
                         <motion.div 
                           className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent" 
                           animate={{ rotate: 360 }} 
                           transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                         />
                         <span className="text-xs font-bold text-gold">82%</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </RevealSection>

      {/* ── STUDIO ── */}
      <RevealSection className="bg-obsidian-100/30 py-32 border-y border-white/5">
        <div className="section-padding grid gap-16 lg:grid-cols-2 items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-3">The Studio</p>
            <AnimatedHeadline text="Share Your Growth." accent="Growth" />
            <p className="mt-8 text-[16px] font-light leading-relaxed text-silk/50 tracking-wide">
               Every session is automatically recorded into a premium, shared-ready video. Watch your progress in 4K cinematic clarity.
            </p>
            <div className="mt-12 space-y-8">
               <div className="group">
                  <h4 className="text-sm font-medium tracking-widest uppercase text-gold mb-2 group-hover:translate-x-1 transition-transform">Auto-Edit</h4>
                  <p className="text-[14px] font-light text-silk/40 leading-relaxed">Our AI cuts your sessions to the beat, adds visual effects, and optimizes color for social media instantly.</p>
               </div>
            </div>
            <div className="mt-12">
               <MotionButton href="/scroll" label="Try the Studio" primary />
            </div>
          </div>
          <div className="relative group">
             <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                <img src="https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=2574&auto=format&fit=crop" className="w-full h-full object-cover" alt="Recording Studio" />
                <div className="absolute inset-0 flex items-center justify-center bg-obsidian-100/40 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="h-20 w-20 rounded-full bg-gold/90 flex items-center justify-center pl-1 shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z" /></svg>
                   </div>
                </div>
             </div>
             <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -bottom-6 -right-6 h-32 w-32 hidden sm:block">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-gold/10">
                   <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
                   <text className="text-[10px] uppercase tracking-[0.3em] font-medium">
                      <textPath xlinkHref="#circlePath">Rec • Review • Remix • Repeat •</textPath>
                   </text>
                </svg>
             </motion.div>
          </div>
        </div>
      </RevealSection>

      {/* ── ACADEMY STYLES ── */}
      <RevealSection id="styles" className="py-40">
        <div className="section-padding">
          <div className="text-center mb-24">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-3">Global Academy</p>
            <AnimatedHeadline text="Curated Masteries." accent="Masteries" className="mx-auto" />
          </div>
          <motion.div variants={staggerParent} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STYLES.map((style) => (
              <motion.article 
                key={style.title} 
                variants={staggerChild} 
                whileHover={{ y: -12 }} 
                className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-obsidian-100 shadow-2xl border border-white/5"
              >
                <img src={style.img} alt={style.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-[1.5s] scale-110 group-hover:scale-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />
                <div className="absolute inset-x-8 bottom-10">
                   <h3 className="text-2xl font-light tracking-wide text-silk group-hover:text-gold transition-colors">{style.title}</h3>
                   <p className="text-[10px] uppercase tracking-widest text-silk/40 mt-3">{style.desc}</p>
                   <div className="h-[1px] w-0 group-hover:w-full bg-gold/30 mt-4 transition-all duration-700" />
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </RevealSection>

      {/* ── FINAL CTA ── */}
      <RevealSection className="section-padding pb-60 pt-20 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gold font-semibold mb-6">Join the Movement</p>
        <h2 className="font-display text-6xl font-extralight tracking-tighter text-silk sm:text-8xl">Master the <span className="text-gold italic">Art.</span></h2>
        <p className="mt-8 mx-auto max-w-xl text-[16px] font-light text-silk/40 tracking-widest leading-relaxed">
           Your journey from observation to mastery begins now. Experience the premium intersection of art and AI.
        </p>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6">
          <MotionButton href="/scroll" label="Start Dancing Now" onClick={handleStartDancing} primary className="px-12" />
          <MotionButton href="/explore" label="Explore Academy" className="px-12" />
        </div>
      </RevealSection>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 bg-obsidian py-32">
        <div className="section-padding">
          <div className="grid gap-16 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <BrandLogo size={36} className="shadow-[0_0_20px_rgba(211,196,184,0.1)]" />
                <p className="text-[14px] font-light tracking-[0.5em] uppercase text-gold">{SITE_NAME}</p>
              </div>
              <p className="text-[13px] font-light leading-relaxed text-silk/30 max-w-xs">The premium AI dance academy. Expert choreography, cinematic growth, and social precision.</p>
            </div>
            <div>
              <p className="mb-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/60">Discovery</p>
              <div className="flex flex-col gap-5 text-[12px] font-light text-silk/40 tracking-widest leading-loose">
                <Link href="/scroll" className="hover:text-gold transition-colors">The Flow</Link>
                <Link href="/explore" className="hover:text-gold transition-colors">Academy</Link>
                <Link href="/pricing" className="hover:text-gold transition-colors">Pricing</Link>
              </div>
            </div>
            <div>
              <p className="mb-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/60">Technology</p>
              <div className="flex flex-col gap-5 text-[12px] font-light text-silk/40 tracking-widest leading-loose">
                <span className="cursor-default">AI Pose Engine</span>
                <span className="cursor-default">Cinematic Auto-Edit</span>
                <span className="cursor-default">Mobile Academy</span>
              </div>
            </div>
            <div>
              <p className="mb-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/60">Legal</p>
              <div className="flex flex-col gap-5 text-[12px] font-light text-silk/40 tracking-widest leading-loose">
                <Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-gold transition-colors">Terms of Service</Link>
                <Link href="/support" className="hover:text-gold transition-colors">Support</Link>
              </div>
            </div>
          </div>
          <div className="mt-32 pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-8">
             <p className="text-[10px] uppercase tracking-widest text-silk/20">© 2026 NACHLY AI ACADEMY. ALL RIGHTS RESERVED.</p>
             <div className="flex gap-10">
                {['INSTAGRAM', 'TWITTER', 'TIKTOK'].map(social => (
                  <span key={social} className="text-[10px] tracking-widest text-silk/20 hover:text-gold transition-colors cursor-pointer">{social}</span>
                ))}
             </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
