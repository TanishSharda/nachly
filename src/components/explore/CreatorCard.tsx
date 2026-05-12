"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface CreatorCardProps {
  id: string;
  title: string;
  creatorName: string;
  creatorAvatar?: string;
  isVerified?: boolean;
  thumbnailUrl?: string;
  videoUrl?: string;
  styleLabel: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  viewCount?: number;
  learnCount?: number;
  likeCount?: number;
  partCount?: number;
}

const difficultyColors = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  advanced: "bg-red-500/15 text-red-400 border-red-500/20",
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default function CreatorCard({
  id, title, creatorName, creatorAvatar, isVerified, thumbnailUrl,
  videoUrl, styleLabel, difficulty, viewCount = 0, learnCount = 0,
  likeCount = 0, partCount = 0,
}: CreatorCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all hover:border-white/20 hover:shadow-[0_12px_40px_-15px_rgba(196,255,0,0.15)]"
    >
      {/* Thumbnail / Video */}
      <Link href={`/learn/${id}`} className="block relative aspect-[9/14] bg-black overflow-hidden">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={thumbnailUrl}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            muted
            loop
            playsInline
            onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
            onMouseOut={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
          />
        ) : thumbnailUrl ? (
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${thumbnailUrl})` }} />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          <span className="rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[9px] font-semibold text-white">{styleLabel}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${difficultyColors[difficulty]}`}>{difficulty}</span>
        </div>

        {/* Parts badge */}
        {partCount > 0 && (
          <div className="absolute top-2.5 right-2.5 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[9px] font-medium text-zinc-300">
            {partCount} parts
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />

        {/* View count */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-[10px] text-zinc-300">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          {formatCount(viewCount)}
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        {/* Creator row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-full bg-zinc-700 shrink-0 overflow-hidden flex items-center justify-center">
            {creatorAvatar ? (
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${creatorAvatar})` }} />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /></svg>
            )}
          </div>
          <span className="text-xs font-medium text-zinc-300 truncate">{creatorName}</span>
          {isVerified && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#c4ff00" className="shrink-0"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          )}
        </div>

        <Link href={`/learn/${id}`}>
          <h3 className="text-sm font-semibold text-white line-clamp-1 hover:text-[#c4ff00] transition">{title}</h3>
        </Link>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
              {formatCount(likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
              {formatCount(learnCount)}
            </span>
          </div>
          <Link href={`/learn/${id}`} className="rounded-lg bg-[#c4ff00] px-3 py-1.5 text-[10px] font-bold text-[#0a0a0a] transition hover:brightness-110">
            Learn This
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
