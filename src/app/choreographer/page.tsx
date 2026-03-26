"use client";

import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Progress from "@/components/ui/Progress";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

// Mock dashboard data
const stats = {
  totalEarnings: 14385,
  thisMonth: 4250,
  totalStudents: 342,
  activePractices: 89,
  routineCount: 8,
  avgRating: 4.6,
};

const recentRoutines = [
  { title: "Bollywood Groove", students: 127, avgScore: 78, completion: 65 },
  { title: "Hip Hop Basics", students: 89, avgScore: 82, completion: 72 },
  { title: "Kathak Tatkar", students: 56, avgScore: 71, completion: 58 },
  { title: "Bhangra Energy", students: 70, avgScore: 85, completion: 81 },
];

export default function ChoreographerDashboard() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Overview of your creator performance</p>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Earnings", value: `₹${stats.totalEarnings.toLocaleString("en-IN")}`, sub: "lifetime", color: "text-nred-500" },
          { label: "This Month", value: `₹${stats.thisMonth.toLocaleString("en-IN")}`, sub: "current period", color: "text-emerald-400" },
          { label: "Students", value: stats.totalStudents.toString(), sub: "practicing your routines", color: "text-white" },
          { label: "Avg Rating", value: stats.avgRating.toFixed(1), sub: `across ${stats.routineCount} routines`, color: "text-nred-400" },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-2xl sm:text-3xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{s.sub}</p>
          </Card>
        ))}
      </motion.div>

      {/* Earnings chart placeholder */}
      <motion.div variants={fadeUp} className="mb-8">
        <Card>
          <h3 className="font-display font-bold text-white mb-4">Monthly Earnings</h3>
          <div className="h-48 bg-white/5 rounded-xl flex items-center justify-center">
            <div className="flex items-end gap-3 h-32">
              {[35, 52, 44, 68, 82, 75, 90, 65, 78, 95, 88, 72].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="w-6 sm:w-8 bg-gradient-to-t from-nred-800 to-nred-500 rounded-t-md"
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-3 text-xs text-zinc-500">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
        </Card>
      </motion.div>

      {/* Routine performance */}
      <motion.div variants={fadeUp}>
        <Card>
          <h3 className="font-display font-bold text-white mb-4">Routine Performance</h3>
          <div className="space-y-4">
            {recentRoutines.map((r) => (
              <div key={r.title} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 bg-nred-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A3E635" strokeWidth="2" strokeLinecap="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{r.title}</p>
                  <p className="text-xs text-zinc-400">{r.students} students</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">Avg {r.avgScore}%</p>
                  <Progress value={r.completion} size="sm" color="gold" className="w-20 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
