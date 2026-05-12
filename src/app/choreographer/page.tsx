"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

type RevenuePayload = {
  summary: {
    totalEarned: number;
    pendingPayout: number;
    revenueSplit: number;
  };
  streams: {
    ppv: number;
    subscriptions: number;
    workshops: number;
  };
  payoutHistory: Array<{
    period: string;
    purchases: number;
    gross: number;
    share: number;
    status: "pending" | "paid" | "processing";
  }>;
};

type SubmissionSummary = {
  id: string;
  title: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  ai_overall_score?: number | null;
  submission_status?: string;
  updated_at?: string;
};

const quickActions = [
  { label: "Upload Choreography", href: "/choreographer/create", icon: "🎬", desc: "Create a new routine" },
  { label: "View Analytics", href: "/choreographer/analytics", icon: "📊", desc: "Track performance" },
  { label: "Edit Profile", href: "/choreographer/profile", icon: "✏️", desc: "Update your bio" },
  { label: "Check Earnings", href: "/choreographer/earnings", icon: "💳", desc: "Revenue & payouts" },
];

const recentActivity = [
  { type: "learn", text: "45 new learners started \"Bollywood Groove\"", time: "2h ago" },
  { type: "earn", text: "₹2,400 earned from premium unlocks", time: "5h ago" },
  { type: "score", text: "\"Hip Hop Basics\" avg AI score improved to 78%", time: "1d ago" },
  { type: "milestone", text: "You reached 1,000 total students! 🎉", time: "2d ago" },
  { type: "featured", text: "\"Bhangra Energy\" featured in Weekly Picks", time: "3d ago" },
];

const recentRoutines = [
  { title: "Bollywood Groove", students: 427, avgScore: 82, completion: 72, status: "published" },
  { title: "Hip Hop Basics", students: 289, avgScore: 78, completion: 68, status: "published" },
  { title: "Kathak Tatkar", students: 156, avgScore: 71, completion: 61, status: "published" },
  { title: "Bhangra Energy", students: 375, avgScore: 85, completion: 81, status: "published" },
];

export default function ChoreographerDashboard() {
  const [revenue, setRevenue] = useState<RevenuePayload | null>(null);
  const [displayName, setDisplayName] = useState("Creator");
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        const [revenueResponse, profileResponse, submissionsResponse] = await Promise.all([
          fetch("/api/choreographer/revenue", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
          fetch("/api/choreographer/profile", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
          fetch("/api/choreos/submissions", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
        ]);
        if (!mounted) return;


        const fullName = String(profileResponse?.profile?.displayName || "").trim();
        setDisplayName(fullName.split(" ")[0] || "Creator");

        setRevenue({
          summary: revenueResponse?.summary || { totalEarned: 0, pendingPayout: 0, revenueSplit: 60 },
          streams: revenueResponse?.streams || { ppv: 0, subscriptions: 0, workshops: 0 },
          payoutHistory: revenueResponse?.payoutHistory || [],
        });

        const incomingSubmissions = Array.isArray(submissionsResponse?.submissions)
          ? (submissionsResponse.submissions as SubmissionSummary[])
          : [];

        setSubmissions(
          incomingSubmissions
            .filter((item) => item.submission_status !== "draft")
            .slice(0, 6)
        );
      } catch {
        if (mounted) {
          setRevenue(null);
          setSubmissions([]);
        }
      }
    }

    void loadDashboardData();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Total Earnings",
        value: `₹${(revenue?.summary.totalEarned || 142500).toLocaleString("en-IN")}`,
        sub: "lifetime",
        color: "text-emerald-400",
        icon: "💰",
      },
      {
        label: "Pending Payout",
        value: `₹${(revenue?.summary.pendingPayout || 0).toLocaleString("en-IN")}`,
        sub: "next payout cycle",
        color: "text-[#c4ff00]",
        icon: "📈",
      },
      {
        label: "PPV + Subscriptions",
        value: `₹${((revenue?.streams.ppv || 0) + (revenue?.streams.subscriptions || 0)).toLocaleString("en-IN")}`,
        sub: "live monetization",
        color: "text-white",
        icon: "👥",
      },
      {
        label: "Revenue Split",
        value: `${revenue?.summary.revenueSplit || 60}%`,
        sub: "creator share",
        color: "text-amber-400",
        icon: "🤖",
      },
    ],
    [revenue]
  );

  const activity = useMemo(() => {
    const submissionActivity = submissions.slice(0, 2).map((item) => ({
      type: "score",
      text: `\"${item.title || "Untitled choreo"}\" is ${String(item.submission_status || "in progress").replaceAll("_", " ")}`,
      time: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "recent",
    }));

    if (!revenue?.payoutHistory?.length) return recentActivity;

    return [
      {
        type: "earn",
        text: `Latest payout window: ₹${revenue.payoutHistory[0].share.toLocaleString("en-IN")} share from ${revenue.payoutHistory[0].period}`,
        time: revenue.payoutHistory[0].status,
      },
      {
        type: "learn",
        text: `${revenue.streams.ppv.toLocaleString("en-IN")} INR in pay-per-view revenue this cycle`,
        time: "live",
      },
      {
        type: "featured",
        text: `${revenue.streams.subscriptions.toLocaleString("en-IN")} INR from subscriptions this cycle`,
        time: "live",
      },
      ...submissionActivity,
      ...recentActivity.slice(3),
    ];
  }, [revenue, submissions]);

  const routinePerformance = useMemo(() => {
    if (!submissions.length) return recentRoutines;

    return submissions.slice(0, 4).map((item) => ({
      title: item.title || "Untitled choreo",
      students: Number(item.view_count || 0),
      avgScore: Number(item.ai_overall_score || 0),
      completion: Number(item.ai_overall_score || 0),
      status: item.submission_status || "pending_review",
    }));
  }, [submissions]);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Welcome back, {displayName}</h1>
            <p className="text-zinc-400 mt-1 text-sm">Here&apos;s how your content is performing</p>
          </div>
          <Link href="/choreographer/create" className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#c4ff00] to-[#7b9e00] px-4 py-2.5 text-xs font-bold text-[#0a0a0a] transition hover:brightness-110">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            New Upload
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4 relative overflow-hidden">
            <span className="absolute right-3 top-3 text-2xl opacity-20">{s.icon}</span>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{s.label}</p>
            <p className={`text-2xl sm:text-3xl font-display font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</p>
          </Card>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeUp} className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href}>
              <Card hover className="!p-4 group">
                <span className="text-2xl">{a.icon}</span>
                <p className="text-sm font-semibold text-white mt-2 group-hover:text-[#c4ff00] transition">{a.label}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{a.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Routine Performance */}
        <motion.div variants={fadeUp}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-white">Routine Performance</h3>
              <Link href="/choreographer/routines" className="text-[10px] font-semibold uppercase tracking-wider text-[#c4ff00] hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {routinePerformance.map((r) => (
                <div key={r.title} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 bg-[#c4ff00]/10 rounded-lg flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4ff00" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{r.title}</p>
                    <p className="text-[10px] text-zinc-500">{r.students} views · AI {r.avgScore}%</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-white">{r.completion}%</p>
                    <div className="w-16 h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-[#c4ff00]" style={{ width: `${r.completion}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={fadeUp}>
          <Card>
            <h3 className="font-display font-bold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {activity.map((a, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                    a.type === "earn" ? "bg-emerald-400" :
                    a.type === "learn" ? "bg-[#c4ff00]" :
                    a.type === "milestone" ? "bg-amber-400" :
                    a.type === "featured" ? "bg-purple-400" :
                    "bg-zinc-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300">{a.text}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Earnings Chart */}
      <motion.div variants={fadeUp} className="mt-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">Monthly Earnings</h3>
            <Link href="/choreographer/earnings" className="text-[10px] font-semibold uppercase tracking-wider text-[#c4ff00] hover:underline">Details</Link>
          </div>
          <div className="h-36 flex items-end gap-2">
            {([35, 52, 44, 68, 82, 75, 90, 65, 78, 95, 88, 72] as number[]).map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.04, duration: 0.5 }}
                className="flex-1 bg-gradient-to-t from-[#344400] to-[#c4ff00] rounded-t-md min-h-[4px]"
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-zinc-600">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
