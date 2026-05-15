"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import BrandLogo from "@/components/shared/BrandLogo";

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
    <div className={`relative overflow-hidden rounded-[2rem] border border-[#6c51321f] bg-[#fbf7f1] p-6 shadow-[0_18px_45px_-28px_rgba(58,42,26,0.45)] transition duration-300 hover:-translate-y-0.5 hover:border-[#6c513236] hover:shadow-[0_24px_50px_-26px_rgba(58,42,26,0.5)] sm:p-7 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#efe3d2] to-transparent" />
      {children}
    </div>
  );
}

const creatorBenefits = [
  {
    icon: "🎬",
    title: "Upload Like Instagram",
    description: "Record or upload your choreography with our smooth, mobile-first creator tools. Add music, hashtags, and captions in seconds.",
  },
  {
    icon: "📚",
    title: "Teach Professionally",
    description: "Structure your choreography into step-by-step lessons. Add slow-motion markers, descriptions, and difficulty levels.",
  },
  {
    icon: "🌍",
    title: "Reach Global Learners",
    description: "Your choreography goes directly into the main feed. Thousands of dancers discover and learn your routines daily.",
  },
  {
    icon: "💰",
    title: "Monetize Your Craft",
    description: "Earn revenue from premium tutorials, subscriptions, and workshops. 60% revenue share on every purchase.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Engagement",
    description: "Our AI coach helps learners practice your choreography with real-time feedback, increasing completion rates and retention.",
  },
  {
    icon: "📊",
    title: "Deep Analytics",
    description: "Track views, learn clicks, completion rates, learner AI scores, revenue, and audience retention in real time.",
  },
];

const howItWorksSteps = [
  { step: "01", title: "Apply", description: "Submit your profile, portfolio, and sample choreography. Get verified within 48 hours." },
  { step: "02", title: "Upload", description: "Record or upload your choreography. Structure it into learnable parts with our creator tools." },
  { step: "03", title: "Teach", description: "Your content goes live on the platform. Learners discover, practice, and improve with AI coaching." },
  { step: "04", title: "Earn", description: "Monetize through premium tutorials, subscriptions, and workshops. Track everything in your dashboard." },
];

const earningTiers = [
  { level: "Rising Creator", routines: "1–5", monthlyRange: "₹5,000 – ₹15,000", highlight: false },
  { level: "Established Creator", routines: "5–15", monthlyRange: "₹15,000 – ₹50,000", highlight: true },
  { level: "Master Choreographer", routines: "15+", monthlyRange: "₹50,000+", highlight: false },
];

const creatorFaqs = [
  { question: "Who can apply?", answer: "Any dance instructor, choreographer, or experienced dancer with a portfolio of work. We review all applications within 48 hours." },
  { question: "How does monetization work?", answer: "You earn 60% of every premium tutorial purchase. We handle payments, learner support, and platform infrastructure." },
  { question: "What content works best?", answer: "Trending choreography with clear breakdowns. Bollywood, Hip Hop, Kathak, and Bhangra perform exceptionally well on our platform." },
  { question: "Do I need professional equipment?", answer: "A smartphone with good lighting is enough to start. We provide quality guidelines to help you create studio-grade content." },
  { question: "How does AI help my students?", answer: "Our AI coach provides real-time pose feedback during practice, helping learners improve faster — which means higher completion rates for your content." },
  { question: "Can I track my performance?", answer: "Yes. Your creator dashboard shows views, learn clicks, completion rates, AI scores, revenue, and audience analytics in real time." },
];

const dashboardFeatures = [
  { label: "Total Views", value: "24.8K", trend: "+12%" },
  { label: "Active Learners", value: "342", trend: "+28%" },
  { label: "Completion Rate", value: "68%", trend: "+5%" },
  { label: "Monthly Revenue", value: "₹42,500", trend: "+18%" },
];

export default function ForChoreographersPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#f4f1ec] text-[#221d16]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(122,92,58,0.12),transparent_45%),radial-gradient(circle_at_85%_5%,rgba(251,249,245,0.7),transparent_55%),linear-gradient(180deg,#f6f3ef_0%,#f1ebe2_48%,#ece4d8_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] [background-image:radial-gradient(rgba(122,92,58,0.2)_1px,transparent_1px)] [background-size:36px_36px]" />

      {/* Navigation */}
      <section className="section-padding pt-8 sm:pt-12">
        <motion.nav {...sectionReveal()} className="flex items-center justify-between rounded-full border border-[#6c51321f] bg-[#fbf7f1]/80 px-4 py-3 backdrop-blur-xl sm:px-7">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo size={28} />
            <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[#7a5c3a]">Nachly</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="hidden sm:inline-flex rounded-full border border-[#6c513236] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5c3a] transition hover:bg-[#f2e7da]">
              For Learners
            </Link>
            <Link href="/login" className="rounded-full border border-[#6c513236] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5c3a] transition hover:bg-[#f2e7da]">
              Log In
            </Link>
            <Link href="/choreographer/create" className="rounded-full bg-[#7a5c3a] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fff7f0] transition hover:brightness-110">
              Become a Creator
            </Link>
          </div>
        </motion.nav>
      </section>

      {/* Hero */}
      <section className="section-padding mt-10 sm:mt-16">
        <motion.div {...sectionReveal(0.05)} className="text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#6c513236] bg-white/70 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5c3a]">Now accepting creators</span>
          </motion.div>
          <h1 className="mx-auto max-w-4xl font-display text-4xl font-semibold leading-[0.95] tracking-[-0.02em] text-[#241e17] sm:text-6xl lg:text-7xl">
            Teach Dance to <br />
            <span className="bg-gradient-to-r from-[#7a5c3a] to-[#a38260] bg-clip-text text-transparent">the World</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#5f554b] sm:text-lg">
            Upload choreography, build structured tutorials, reach thousands of learners, and earn from your expertise. The creator economy meets dance education.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/choreographer/create" className="h-12 inline-flex items-center rounded-full bg-[#7a5c3a] px-7 text-xs font-semibold uppercase tracking-[0.16em] text-[#fff7f0] transition hover:brightness-110 shadow-[0_14px_35px_-15px_rgba(122,92,58,0.6)]">
              Apply to Create
            </Link>
            <a href="#how-it-works" className="inline-flex h-12 items-center justify-center rounded-full border border-[#6c513236] bg-white/70 px-7 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5c3a] transition hover:bg-[#f5ede2]">
              How It Works
            </a>
          </div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {dashboardFeatures.map((stat) => (
            <BentoCard key={stat.label} className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5c3a]">{stat.label}</p>
              <p className="mt-2 font-display text-2xl font-bold text-[#241e17] sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-600">{stat.trend}</p>
            </BentoCard>
          ))}
        </motion.div>
      </section>

      {/* Why Create on Nachly */}
      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a5c3a]">Why create on Nachly</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#241e17] sm:text-5xl">Everything a choreographer needs</h2>
          <p className="mt-3 max-w-2xl text-sm text-[#6b6056]">From upload to earnings, we handle the infrastructure so you can focus on what you do best — creating incredible choreography.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creatorBenefits.map((item, index) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.06 }} viewport={{ once: true, amount: 0.2 }}>
                <BentoCard>
                  <span className="text-3xl">{item.icon}</span>
                  <h3 className="mt-3 text-lg font-semibold text-[#241e17]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#6b6056]">{item.description}</p>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a5c3a]">How it works</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#241e17] sm:text-5xl">From application to earnings in 4 steps</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {howItWorksSteps.map((s, index) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.08 }} viewport={{ once: true, amount: 0.2 }}>
                <BentoCard className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#7a5c3a]/10">
                    <span className="text-sm font-bold text-[#7a5c3a]">{s.step}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-[#241e17]">{s.title}</h3>
                  <p className="mt-2 text-sm text-[#6b6056]">{s.description}</p>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Dashboard Preview */}
      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a5c3a]">Creator dashboard</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#241e17] sm:text-5xl">Your command center</h2>
          <p className="mt-3 max-w-2xl text-sm text-[#6b6056]">Track every metric that matters — from views and engagement to learner progress and revenue.</p>
          <div className="mt-8">
            <BentoCard className="!p-0 overflow-hidden">
              <div className="bg-[#0e0e0e] p-6 sm:p-8">
                {/* Mock dashboard UI */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#c4ff00] to-[#7b9e00]" />
                  <div>
                    <p className="text-sm font-semibold text-white">Creator Studio</p>
                    <p className="text-xs text-zinc-500">Your performance at a glance</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Total Earnings", value: "₹1,42,500", color: "text-emerald-400" },
                    { label: "Active Students", value: "1,247", color: "text-white" },
                    { label: "Avg AI Score", value: "82%", color: "text-[#c4ff00]" },
                    { label: "Completion Rate", value: "68%", color: "text-amber-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{s.label}</p>
                      <p className={`mt-1 text-lg font-bold sm:text-xl ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-end gap-2 h-24">
                  {[35, 52, 44, 68, 82, 75, 90, 65, 78, 95, 88, 72].map((h, i) => (
                    <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} transition={{ delay: i * 0.04, duration: 0.4 }} viewport={{ once: true }} className="flex-1 rounded-t bg-gradient-to-t from-[#344400] to-[#c4ff00]" />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-zinc-600">
                  <span>Jan</span><span>Mar</span><span>Jun</span><span>Sep</span><span>Dec</span>
                </div>
              </div>
            </BentoCard>
          </div>
        </motion.div>
      </section>

      {/* Earning Potential */}
      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a5c3a]">Monetization</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#241e17] sm:text-5xl">Earn what you deserve</h2>
          <p className="mt-3 max-w-2xl text-sm text-[#6b6056]">60% revenue share on every purchase. No hidden fees. Monthly payouts.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {earningTiers.map((tier, index) => (
              <motion.div key={tier.level} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.08 }} viewport={{ once: true, amount: 0.2 }}>
                <BentoCard className={tier.highlight ? "!border-[#7a5c3a]/40 ring-2 ring-[#7a5c3a]/20" : ""}>
                  {tier.highlight && <span className="absolute right-4 top-4 rounded-full bg-[#7a5c3a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Popular</span>}
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5c3a]">{tier.level}</p>
                  <p className="mt-3 font-display text-2xl font-bold text-[#241e17]">{tier.monthlyRange}</p>
                  <p className="mt-1 text-xs text-[#6b6056]">{tier.routines} routines</p>
                  <p className="mt-1 text-xs text-[#6b6056]">per month estimated</p>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Creator FAQ */}
      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a5c3a]">FAQ</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#241e17] sm:text-5xl">Questions from creators</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {creatorFaqs.map((item, index) => (
              <motion.div key={item.question} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.04 }} viewport={{ once: true, amount: 0.2 }}>
                <BentoCard>
                  <h3 className="text-base font-semibold text-[#241e17]">{item.question}</h3>
                  <p className="mt-2 text-sm text-[#6b6056]">{item.answer}</p>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="section-padding mt-16">
        <motion.div {...sectionReveal()}>
          <div className="rounded-[2.5rem] border border-[#6c513236] bg-[#fbf7f1] p-8 text-center shadow-[0_25px_50px_-30px_rgba(58,42,26,0.6)] sm:p-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a5c3a]">Join the future of dance</p>
            <h2 className="mt-4 mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-[#241e17] sm:text-5xl">
              Ready to teach the world?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#6b6056]">
              Join a growing community of verified choreographers earning from their expertise. Applications reviewed within 48 hours.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/choreographer/create" className="h-12 inline-flex items-center rounded-full bg-[#7a5c3a] px-8 text-xs font-semibold uppercase tracking-[0.15em] text-[#fff7f0] transition hover:brightness-110 shadow-[0_14px_35px_-15px_rgba(122,92,58,0.6)]">
                Become a Creator
              </Link>
              <Link href="/subscribe" className="inline-flex h-12 items-center rounded-full border border-[#6c513236] bg-white px-7 text-xs font-semibold uppercase tracking-[0.15em] text-[#7a5c3a] transition hover:bg-[#f5ede2]">
                View Plans
              </Link>
              <Link href="/explore" className="inline-flex h-12 items-center rounded-full border border-[#6c513236] bg-white px-7 text-xs font-semibold uppercase tracking-[0.15em] text-[#7a5c3a] transition hover:bg-[#f5ede2]">
                Explore as Learner
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="section-padding pb-16 pt-14">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-[#6c51321f] pt-8 sm:flex-row">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo size={28} />
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[#7a5c3a]">Nachly</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-[#6b6056]">The creator economy meets dance education.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a5c3a]">
            <Link href="/">For Learners</Link>
            <Link href="/for-choreographers">For Creators</Link>
            <Link href="/subscribe">Subscriptions</Link>
            <Link href="/choreographer/create">Apply</Link>
            <Link href="/login">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
