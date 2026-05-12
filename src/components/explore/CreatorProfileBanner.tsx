"use client";

import { motion } from "framer-motion";

interface CreatorProfileBannerProps {
  name: string;
  avatarUrl?: string;
  coverUrl?: string;
  isVerified?: boolean;
  bio?: string;
  danceStyles?: string[];
  routineCount?: number;
  studentCount?: number;
  followerCount?: number;
  rating?: number;
  instagramUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  onFollow?: () => void;
  isFollowing?: boolean;
}

export default function CreatorProfileBanner({
  name, avatarUrl, coverUrl, isVerified, bio, danceStyles = [],
  routineCount = 0, studentCount = 0, followerCount = 0, rating,
  instagramUrl, youtubeUrl, tiktokUrl, onFollow, isFollowing,
}: CreatorProfileBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
    >
      {/* Cover */}
      <div className="h-32 sm:h-40 relative overflow-hidden">
        {coverUrl ? (
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${coverUrl})` }} />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-[#1a2200] via-[#344400] to-[#556d00]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="px-5 pb-5 -mt-12 relative">
        <div className="flex items-end gap-4 mb-4">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-2xl border-4 border-black bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center shadow-lg">
            {avatarUrl ? (
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }} />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /></svg>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">{name}</h2>
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#c4ff00]/15 px-2 py-0.5 text-[10px] font-bold text-[#c4ff00]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#c4ff00"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  Verified
                </span>
              )}
            </div>
            {danceStyles.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">{danceStyles.join(" · ")}</p>
            )}
          </div>

          {/* Follow Button */}
          {onFollow && (
            <button
              type="button"
              onClick={onFollow}
              className={`shrink-0 rounded-xl px-5 py-2 text-xs font-bold transition ${
                isFollowing
                  ? "border border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10"
                  : "bg-[#c4ff00] text-[#0a0a0a] hover:brightness-110"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Bio */}
        {bio && <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{bio}</p>}

        {/* Stats */}
        <div className="flex items-center gap-5 mb-4">
          {[
            { label: "Routines", value: routineCount },
            { label: "Students", value: studentCount },
            { label: "Followers", value: followerCount },
            ...(rating ? [{ label: "Rating", value: `${rating.toFixed(1)}★` }] : []),
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-white">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Social Links */}
        {(instagramUrl || youtubeUrl || tiktokUrl) && (
          <div className="flex items-center gap-2">
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white hover:border-white/20 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
            )}
            {youtubeUrl && (
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white hover:border-white/20 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              </a>
            )}
            {tiktokUrl && (
              <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white hover:border-white/20 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
