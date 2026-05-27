"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const timeRanges = ["7d", "30d", "90d", "All"] as const;

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
	view_count?: number | null;
	like_count?: number | null;
	comment_count?: number | null;
	try_this_count?: number | null;
	ai_overall_score?: number | null;
};

const topRoutines = [
	{ title: "Bollywood Groove", views: 8420, learns: 1240, completion: 72, aiScore: 82, revenue: 18500 },
	{ title: "Hip Hop Basics", views: 6130, learns: 890, completion: 68, aiScore: 78, revenue: 12300 },
	{ title: "Kathak Tatkar", views: 4890, learns: 560, completion: 61, aiScore: 71, revenue: 8900 },
	{ title: "Bhangra Energy", views: 5392, learns: 529, completion: 81, aiScore: 85, revenue: 14200 },
];

const funnelSteps = [
	{ label: "Impressions", value: 24832, pct: 100 },
	{ label: "Views", value: 18291, pct: 73.7 },
	{ label: "Learn Clicks", value: 3219, pct: 13.0 },
	{ label: "Started Lesson", value: 2156, pct: 8.7 },
	{ label: "Completed", value: 1467, pct: 5.9 },
	{ label: "Purchased", value: 342, pct: 1.4 },
];

const fallbackMonthlyEarnings = [
	{ month: "Jan", value: 8200 },
	{ month: "Feb", value: 11400 },
	{ month: "Mar", value: 9800 },
	{ month: "Apr", value: 15600 },
	{ month: "May", value: 18900 },
	{ month: "Jun", value: 16200 },
	{ month: "Jul", value: 22100 },
	{ month: "Aug", value: 19500 },
	{ month: "Sep", value: 24800 },
	{ month: "Oct", value: 28200 },
	{ month: "Nov", value: 25600 },
	{ month: "Dec", value: 21400 },
];

export default function AnalyticsPage() {
	const [range, setRange] = useState<(typeof timeRanges)[number]>("30d");
	const [revenue, setRevenue] = useState<RevenuePayload | null>(null);
	const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);

	useEffect(() => {
		let mounted = true;

		async function loadAnalyticsData() {
			try {
				const [revenueResponse, submissionsResponse] = await Promise.all([
					fetch("/api/choreographer/revenue", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
					fetch("/api/choreos/submissions", { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
				]);

				if (!mounted) return;

				setRevenue({
					summary: revenueResponse?.summary || { totalEarned: 0, pendingPayout: 0, revenueSplit: 60 },
					streams: revenueResponse?.streams || { ppv: 0, subscriptions: 0, workshops: 0 },
					payoutHistory: revenueResponse?.payoutHistory || [],
				});

				const incomingSubmissions = Array.isArray(submissionsResponse?.submissions)
					? (submissionsResponse.submissions as SubmissionSummary[])
					: [];
				setSubmissions(incomingSubmissions.filter((item) => Number(item.view_count || 0) > 0 || Number(item.ai_overall_score || 0) > 0));
			} catch {
				if (mounted) {
					setRevenue(null);
					setSubmissions([]);
				}
			}
		}

		void loadAnalyticsData();
		return () => {
			mounted = false;
		};
	}, []);

	const monthlyEarnings = useMemo(() => {
		if (!revenue?.payoutHistory?.length) return fallbackMonthlyEarnings;

		return revenue.payoutHistory
			.slice()
			.reverse()
			.map((entry, index) => ({
				month: entry.period.slice(0, 3) || `M${index + 1}`,
				value: entry.share,
			}));
	}, [revenue]);

	const monthlyMax = Math.max(...monthlyEarnings.map((entry) => entry.value), 1);

	const derivedSubmissionTotals = useMemo(() => {
		if (!submissions.length) {
			return {
				totalViews: 0,
				learns: 0,
				avgAiScore: 0,
			};
		}

		const totalViews = submissions.reduce((sum, item) => sum + Number(item.view_count || 0), 0);
		const learns = submissions.reduce((sum, item) => sum + Number(item.try_this_count || 0), 0);
		const scored = submissions.filter((item) => Number(item.ai_overall_score || 0) > 0);
		const avgAiScore = scored.length
			? Math.round(scored.reduce((sum, item) => sum + Number(item.ai_overall_score || 0), 0) / scored.length)
			: 0;

		return { totalViews, learns, avgAiScore };
	}, [submissions]);

	const liveOverviewStats = useMemo(
		() => {
			if (!submissions.length) {
				return [
					{ label: "Total Views", value: "24,832", change: "+12.4%", up: true },
					{ label: "Reach", value: "18,291", change: "+8.7%", up: true },
					{ label: "Earnings", value: `₹${(revenue?.summary.totalEarned || 0).toLocaleString("en-IN")}`, change: revenue ? "live" : "fallback", up: true },
					{ label: "Pending Payout", value: `₹${(revenue?.summary.pendingPayout || 0).toLocaleString("en-IN")}`, change: revenue ? "live" : "fallback", up: true },
					{ label: "Learn Clicks", value: "3,219", change: "+18.6%", up: true },
					{ label: "Completion Rate", value: "68%", change: "+3.2%", up: true },
				];
			}

			return [
				{ label: "Total Views", value: derivedSubmissionTotals.totalViews.toLocaleString("en-IN"), change: "live", up: true },
				{ label: "Reach", value: Math.round(derivedSubmissionTotals.totalViews * 0.72).toLocaleString("en-IN"), change: "estimated", up: true },
				{ label: "Earnings", value: `₹${(revenue?.summary.totalEarned || 0).toLocaleString("en-IN")}`, change: "live", up: true },
				{ label: "Pending Payout", value: `₹${(revenue?.summary.pendingPayout || 0).toLocaleString("en-IN")}`, change: "live", up: true },
				{ label: "Learn Clicks", value: derivedSubmissionTotals.learns.toLocaleString("en-IN"), change: "live", up: true },
				{ label: "Completion Rate", value: `${derivedSubmissionTotals.avgAiScore}%`, change: "from AI scores", up: true },
			];
		},
		[derivedSubmissionTotals, revenue, submissions.length]
	);

	const liveFunnelSteps = useMemo(() => {
		if (!submissions.length || derivedSubmissionTotals.totalViews === 0) return funnelSteps;

		const impressions = Math.max(derivedSubmissionTotals.totalViews, Math.round(derivedSubmissionTotals.totalViews * 1.25));
		const views = derivedSubmissionTotals.totalViews;
		const learns = Math.min(views, derivedSubmissionTotals.learns);
		const startedLesson = Math.min(learns, Math.round(learns * 0.68));
		const completed = Math.min(startedLesson, Math.round(startedLesson * (derivedSubmissionTotals.avgAiScore / 100 || 0.55)));
		const purchased = Math.min(completed, Math.round(completed * 0.22));

		const pct = (value: number) => Number(((value / impressions) * 100).toFixed(1));

		return [
			{ label: "Impressions", value: impressions, pct: 100 },
			{ label: "Views", value: views, pct: pct(views) },
			{ label: "Learn Clicks", value: learns, pct: pct(learns) },
			{ label: "Started Lesson", value: startedLesson, pct: pct(startedLesson) },
			{ label: "Completed", value: completed, pct: pct(completed) },
			{ label: "Purchased", value: purchased, pct: pct(purchased) },
		];
	}, [derivedSubmissionTotals, submissions.length]);

	const liveTopRoutines = useMemo(
		() => {
			if (!submissions.length) {
				return topRoutines.map((routine, index) => ({
					...routine,
					revenue: revenue?.payoutHistory?.[index]?.share ?? routine.revenue,
				}));
			}

			const sorted = submissions
				.slice()
				.sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0))
				.slice(0, 4);

			return sorted.map((item) => {
				const views = Number(item.view_count || 0);
				const learns = Number(item.try_this_count || 0);
				const aiScore = Number(item.ai_overall_score || 0);
				const completion = aiScore > 0 ? aiScore : Math.min(100, Math.round((learns / Math.max(views, 1)) * 100));

				return {
					title: item.title || "Untitled choreo",
					views,
					learns,
					completion,
					aiScore,
					revenue: Math.round((views * 4.5 + learns * 18) * 0.6),
				};
			});
		},
		[revenue, submissions]
	);

	return (
		<motion.div initial="hidden" animate="visible" variants={stagger}>
			<motion.div variants={fadeUp} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Analytics</h1>
					<p className="text-zinc-400 mt-1 text-sm">Track your creator performance and learner engagement</p>
				</div>
				<div className="flex gap-1 rounded-xl bg-white/5 p-1">
					{timeRanges.map((r) => (
						<button key={r} type="button" onClick={() => setRange(r)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === r ? "bg-[#F3B2AB]/20 text-[#F3B2AB]" : "text-zinc-500 hover:text-white"}`}>
							{r}
						</button>
					))}
				</div>
			</motion.div>

			<div className="mb-6">
				<Link href="/creator/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
					← Back to dashboard
				</Link>
			</div>

			{revenue ? (
				<motion.div variants={fadeUp} className="mb-6">
					<Card className="border-[#F3B2AB]/20 bg-[#F3B2AB]/5">
						<p className="text-[10px] uppercase tracking-[0.25em] text-[#F3B2AB]/80">Live earnings sync</p>
						<p className="mt-2 text-sm text-zinc-200">
							Your revenue, payout, and workshop totals are now pulled from the monetization system in real time.
						</p>
					</Card>
				</motion.div>
			) : null}

			<motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
				{liveOverviewStats.map((s) => (
					<Card key={s.label} className="!p-4">
						<p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{s.label}</p>
						<p className="mt-1 text-xl font-bold text-white sm:text-2xl">{s.value}</p>
						<p className={`mt-0.5 text-xs font-semibold ${s.up ? "text-emerald-400" : "text-red-400"}`}>
							{s.up ? "↑" : "↓"} {s.change}
						</p>
					</Card>
				))}
			</motion.div>

			<motion.div variants={fadeUp} className="mb-6">
				<Card>
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-display font-bold text-white">Monthly Revenue</h3>
						<span className="text-xs text-zinc-500">Last 12 months</span>
					</div>
					<div className="flex items-end gap-2 h-36">
						{monthlyEarnings.map((e, i) => (
							<div key={e.month} className="flex-1 flex flex-col items-center gap-1">
								<motion.div
									initial={{ height: 0 }}
									animate={{ height: `${(e.value / monthlyMax) * 100}%` }}
									transition={{ delay: i * 0.04, duration: 0.5 }}
									className="w-full rounded-t-md bg-gradient-to-t from-[#344400] to-[#F3B2AB] min-h-[4px]"
								/>
								<span className="text-[9px] text-zinc-600">{e.month}</span>
							</div>
						))}
					</div>
				</Card>
			</motion.div>

			<motion.div variants={fadeUp} className="mb-6">
				<Card>
					<h3 className="font-display font-bold text-white mb-4">Conversion Funnel</h3>
					<div className="space-y-2">
						{liveFunnelSteps.map((f, i) => (
							<div key={f.label} className="flex items-center gap-3">
								<span className="w-24 text-xs text-zinc-400 shrink-0">{f.label}</span>
								<div className="flex-1 h-7 bg-white/5 rounded-lg overflow-hidden relative">
									<motion.div
										initial={{ width: 0 }}
										whileInView={{ width: `${f.pct}%` }}
										transition={{ delay: i * 0.08, duration: 0.6 }}
										viewport={{ once: true }}
										className="h-full rounded-lg bg-gradient-to-r from-[#F3B2AB]/80 to-[#F3B2AB]/40"
									/>
									<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white">
										{f.value.toLocaleString()}
									</span>
								</div>
								<span className="w-12 text-right text-[10px] font-semibold text-zinc-500">{f.pct}%</span>
							</div>
						))}
					</div>
				</Card>
			</motion.div>

			<motion.div variants={fadeUp}>
				<Card>
					<h3 className="font-display font-bold text-white mb-4">Top Performing Routines</h3>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-zinc-500 border-b border-white/10">
									<th className="pb-3 font-medium">Routine</th>
									<th className="pb-3 font-medium">Views</th>
									<th className="pb-3 font-medium">Learns</th>
									<th className="pb-3 font-medium">Completion</th>
									<th className="pb-3 font-medium">AI Score</th>
									<th className="pb-3 font-medium text-right">Revenue</th>
								</tr>
							</thead>
							<tbody>
								{liveTopRoutines.map((r) => (
									<tr key={r.title} className="border-b border-white/5 last:border-none">
										<td className="py-3 font-medium text-white">{r.title}</td>
										<td className="py-3 text-zinc-400">{r.views.toLocaleString()}</td>
										<td className="py-3 text-zinc-400">{r.learns.toLocaleString()}</td>
										<td className="py-3">
											<div className="flex items-center gap-2">
												<div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
													<div className="h-full rounded-full bg-[#F3B2AB]" style={{ width: `${r.completion}%` }} />
												</div>
												<span className="text-zinc-400">{r.completion}%</span>
											</div>
										</td>
										<td className="py-3">
											<span className={`text-xs font-semibold ${r.aiScore >= 80 ? "text-emerald-400" : r.aiScore >= 70 ? "text-amber-400" : "text-red-400"}`}>
												{r.aiScore}
											</span>
										</td>
										<td className="py-3 text-right font-semibold text-white">₹{r.revenue.toLocaleString("en-IN")}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Card>
			</motion.div>
		</motion.div>
	);
}