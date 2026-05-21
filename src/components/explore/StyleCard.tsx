"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { DanceStyle } from "@/types/database";
// NOTE: routine counts are now provided by the live feed API; mock removed.

interface StyleCardProps {
  style: DanceStyle;
}

export default function StyleCard({ style }: StyleCardProps) {
  const routineCount: number = 0;
  const isBollywood = style.slug === "bollywood";

  return (
    <Link href={`/explore/${style.slug}`}>
      <Card hover padding="none" className="overflow-hidden group h-full">
        <div
          className="h-56 sm:h-64 flex flex-col justify-between p-6 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${style.gradient_from}, ${style.gradient_to})`,
          }}
        >
          {/* Floating shapes for visual interest */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute bottom-4 right-4 w-20 h-20 bg-white/5 rounded-full group-hover:translate-y-[-5px] transition-transform duration-500" />

          <div className="relative z-10">
            <Badge variant="accent" size="sm" className="bg-white/20 text-white border-none">
              {routineCount > 0 ? `${routineCount} routine${routineCount !== 1 ? "s" : ""}` : "Coming soon"}
            </Badge>
          </div>

          <div className="relative z-10">
            <h3 className="font-display text-3xl font-bold text-white mb-1">
              {style.name}
            </h3>
            <p className="text-zinc-300/80 text-sm line-clamp-2">
              {style.description}
            </p>
          </div>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isBollywood ? (
              <>
                <span className="text-xl font-display font-bold text-white">&#8377;299</span>
                <span className="text-sm text-zinc-500">or ₹20/choreo</span>
              </>
            ) : (
              <>
                <span className="text-xl font-display font-bold text-white">&#8377;199</span>
                <span className="text-sm text-zinc-500">/month</span>
              </>
            )}
          </div>
          <motion.div
            whileHover={{ x: 4 }}
            className="text-nred-500 font-semibold text-sm flex items-center gap-1"
          >
            Explore
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.div>
        </div>
      </Card>
    </Link>
  );
}
