"use client";

import { motion } from "framer-motion";
import {
  getRecentSessions,
  getAverageScores,
  getStreak,
  type SessionRecord,
} from "@/lib/ai/session-storage";

interface SessionHistoryProps {
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Modal showing past session scores, streak, and progress.
 */
export default function SessionHistory({ onClose }: SessionHistoryProps) {
  const sessions = getRecentSessions(10);
  const averages = getAverageScores();
  const streak = getStreak();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-white">
            Practice History
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Streak & averages */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-nred-500">
              {streak.count}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">🔥 Streak</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">
              {averages.accuracy}%
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">Avg Accuracy</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {sessions.length}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">Sessions</div>
          </div>
        </div>

        {/* Session list */}
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-400 text-sm">
              No practice sessions yet.
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              Complete a practice session to see your history here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session: SessionRecord, i: number) => (
              <div
                key={`${session.date}-${i}`}
                className="bg-white/5 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {session.routineTitle}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {formatDate(session.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-nred-500">
                      {session.accuracy}%
                    </p>
                    <p className="text-[10px] text-zinc-500">accuracy</p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background:
                        session.accuracy >= 80
                          ? "rgba(52,211,153,0.2)"
                          : session.accuracy >= 60
                          ? "rgba(163,230,53,0.16)"
                          : "rgba(255,255,255,0.05)",
                      color:
                        session.accuracy >= 80
                          ? "#34d399"
                          : session.accuracy >= 60
                          ? "#A3E635"
                          : "#777",
                    }}
                  >
                    {Math.round(
                      (session.accuracy +
                        session.consistency +
                        session.completion) /
                        3
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
