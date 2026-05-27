"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

type RevenueData = {
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
	payoutHistory: Array<{ period: string; purchases: number; gross: number; share: number; status: "pending" | "paid" | "processing" }>;
};

export default function MonetisationPage() {
	const [data, setData] = useState<RevenueData | null>(null);

	useEffect(() => {
		let mounted = true;
		async function loadRevenue() {
			try {
				const response = await fetch("/api/choreographer/revenue", { cache: "no-store" });
				const payload = await response.json().catch(() => ({}));
				if (!mounted || !response.ok) {
					setData({
						summary: { totalEarned: 0, pendingPayout: 0, revenueSplit: 60 },
						streams: { ppv: 0, subscriptions: 0, workshops: 0 },
						payoutHistory: [],
					});
					return;
				}
				setData({
					summary: payload.summary || { totalEarned: 0, pendingPayout: 0, revenueSplit: 60 },
					streams: payload.streams || { ppv: 0, subscriptions: 0, workshops: 0 },
					payoutHistory: payload.payoutHistory || [],
				});
			} catch {
				if (mounted) {
					setData({
						summary: { totalEarned: 0, pendingPayout: 0, revenueSplit: 60 },
						streams: { ppv: 0, subscriptions: 0, workshops: 0 },
						payoutHistory: [],
					});
				}
			}
		}

		void loadRevenue();
		return () => {
			mounted = false;
		};
	}, []);

	const summary = data?.summary || { totalEarned: 0, pendingPayout: 0, revenueSplit: 60 };
	const streams = data?.streams || { ppv: 0, subscriptions: 0, workshops: 0 };
	const payouts = data?.payoutHistory || [];

	return (
		<motion.div initial="hidden" animate="visible" variants={stagger}>
			<motion.div variants={fadeUp} className="mb-8">
				<h1 className="font-display text-2xl sm:text-3xl font-bold text-dark">Monetisation</h1>
				<p className="text-dark-400 mt-1">Your revenue breakdown and payout history</p>
				<Link href="/creator/dashboard" className="mt-3 inline-flex text-sm text-dark-400 hover:text-dark">
					← Back to dashboard
				</Link>
			</motion.div>

			<motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
				<Card className="bg-gradient-wine text-cream-50">
					<p className="text-sm text-cream-200">Total Earned</p>
					<p className="text-3xl font-display font-bold mt-1">₹{summary.totalEarned.toLocaleString("en-IN")}</p>
					<p className="text-xs text-cream-200/70 mt-1">Lifetime earnings</p>
				</Card>
				<Card>
					<p className="text-sm text-dark-400">Pending Payout</p>
					<p className="text-3xl font-display font-bold text-dark mt-1">₹{summary.pendingPayout.toLocaleString("en-IN")}</p>
					<p className="text-xs text-dark-300 mt-1">Processing by month end</p>
				</Card>
				<Card>
					<p className="text-sm text-dark-400">Revenue Split</p>
					<p className="text-3xl font-display font-bold text-gold-600 mt-1">{summary.revenueSplit}%</p>
					<p className="text-xs text-dark-300 mt-1">Your share of each purchase</p>
				</Card>
			</motion.div>

			<motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
				<Card>
					<p className="text-xs uppercase tracking-wider text-dark-300">Pay-per-view</p>
					<p className="text-2xl font-display font-bold text-dark mt-2">₹{streams.ppv.toLocaleString("en-IN")}</p>
					<p className="text-xs text-dark-300 mt-1">Premium routine unlocks</p>
				</Card>
				<Card>
					<p className="text-xs uppercase tracking-wider text-dark-300">Subscriptions</p>
					<p className="text-2xl font-display font-bold text-dark mt-2">₹{streams.subscriptions.toLocaleString("en-IN")}</p>
					<p className="text-xs text-dark-300 mt-1">Monthly recurring revenue</p>
				</Card>
				<Card>
					<p className="text-xs uppercase tracking-wider text-dark-300">Workshops</p>
					<p className="text-2xl font-display font-bold text-dark mt-2">₹{streams.workshops.toLocaleString("en-IN")}</p>
					<p className="text-xs text-dark-300 mt-1">Live session tickets</p>
				</Card>
			</motion.div>

			<motion.div variants={fadeUp}>
				<Card>
					<h3 className="font-display font-bold text-dark mb-4">Payout History</h3>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-dark-400 border-b border-dark-100">
									<th className="pb-3 font-medium">Period</th>
									<th className="pb-3 font-medium">Purchases</th>
									<th className="pb-3 font-medium">Gross Revenue</th>
									<th className="pb-3 font-medium">Your Share (60%)</th>
									<th className="pb-3 font-medium">Status</th>
								</tr>
							</thead>
							<tbody>
								{payouts.length === 0 ? (
									<tr>
										<td colSpan={5} className="py-6 text-center text-sm text-dark-400">
											No payout history yet. It will appear once transactions are settled.
										</td>
									</tr>
								) : (
									payouts.map((p) => (
										<tr key={p.period} className="border-b border-dark-50 last:border-none">
											<td className="py-3 font-medium text-dark">{p.period}</td>
											<td className="py-3 text-dark-500">{p.purchases}</td>
											<td className="py-3 text-dark-500">₹{p.gross.toLocaleString("en-IN")}</td>
											<td className="py-3 font-semibold text-dark">₹{p.share.toLocaleString("en-IN")}</td>
											<td className="py-3">
												<Badge variant={p.status === "paid" ? "success" : "warning"}>{p.status}</Badge>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</Card>
			</motion.div>
		</motion.div>
	);
}