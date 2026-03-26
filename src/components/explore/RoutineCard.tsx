"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { Routine } from "@/types/database";
import { formatDuration } from "@/lib/utils/format";

interface RoutineCardProps {
  routine: Routine;
  styleSlug: string;
  index: number;
}

const difficultyColors = {
  beginner: "success" as const,
  intermediate: "warning" as const,
  advanced: "red" as const,
};

export default function RoutineCard({ routine, styleSlug, index }: RoutineCardProps) {
  return (
    <Link href={`/explore/${styleSlug}/${routine.slug}`}>
      <Card hover padding="none" className="overflow-hidden group h-full">
        {/* Thumbnail placeholder */}
        <div className="h-36 sm:h-40 bg-gradient-to-br from-dbg-100 to-dbg-200 relative flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#c4ff00" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <span className="text-xs text-zinc-400">{formatDuration(routine.duration_seconds)}</span>
          </div>
          <div className="absolute top-3 left-3">
            <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              #{index + 1}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={difficultyColors[routine.difficulty]} size="sm">
              {routine.difficulty}
            </Badge>
          </div>
          <h3 className="font-display font-bold text-white text-lg mb-1 line-clamp-1 group-hover:text-nred-300 transition-colors">
            {routine.title}
          </h3>
          <p className="text-sm text-zinc-400 line-clamp-2">{routine.description}</p>
        </div>
      </Card>
    </Link>
  );
}
