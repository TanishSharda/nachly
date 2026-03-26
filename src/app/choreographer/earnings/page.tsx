"use client";

import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const mockPayouts = [
  { period: "March 2026", purchases: 45, gross: 13455, share: 8073, status: "pending" as const },
  { period: "February 2026", purchases: 38, gross: 11362, share: 6817, status: "paid" as const },
  { period: "January 2026", purchases: 31, gross: 9269, share: 5561, status: "paid" as const },
  { period: "December 2025", purchases: 28, gross: 8372, share: 5023, status: "paid" as const },
];

export default function EarningsPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark">Earnings</h1>
        <p className="text-dark-400 mt-1">Your revenue breakdown and payout history</p>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-wine text-cream-50">
          <p className="text-sm text-cream-200">Total Earned</p>
          <p className="text-3xl font-display font-bold mt-1">₹25,474</p>
          <p className="text-xs text-cream-200/70 mt-1">Lifetime earnings</p>
        </Card>
        <Card>
          <p className="text-sm text-dark-400">Pending Payout</p>
          <p className="text-3xl font-display font-bold text-dark mt-1">₹8,073</p>
          <p className="text-xs text-dark-300 mt-1">Processing by month end</p>
        </Card>
        <Card>
          <p className="text-sm text-dark-400">Revenue Split</p>
          <p className="text-3xl font-display font-bold text-gold-600 mt-1">60%</p>
          <p className="text-xs text-dark-300 mt-1">Your share of each purchase</p>
        </Card>
      </motion.div>

      {/* Payout history */}
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
                {mockPayouts.map((p) => (
                  <tr key={p.period} className="border-b border-dark-50 last:border-none">
                    <td className="py-3 font-medium text-dark">{p.period}</td>
                    <td className="py-3 text-dark-500">{p.purchases}</td>
                    <td className="py-3 text-dark-500">₹{p.gross.toLocaleString("en-IN")}</td>
                    <td className="py-3 font-semibold text-dark">₹{p.share.toLocaleString("en-IN")}</td>
                    <td className="py-3">
                      <Badge variant={p.status === "paid" ? "success" : "warning"}>
                        {p.status}
                      </Badge>
                    </td>
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
