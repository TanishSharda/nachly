"use client";

import { usePathname } from "next/navigation";

type MobileTopBarProps = {
  initial: string;
};

export default function MobileTopBar({ initial }: MobileTopBarProps) {
  const pathname = usePathname();
  const hideOnImmersiveRoute =
    pathname.startsWith("/scroll") ||
    pathname.startsWith("/scrool") ||
    pathname.startsWith("/reels");

  if (hideOnImmersiveRoute) {
    return null;
  }

  return (
    <header className="md:hidden sticky top-0 z-40 px-6 pt-6 pb-4 backdrop-blur-3xl bg-obsidian-100/60 border-b border-white/5">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-gold/60">Naachly Academy</p>
          <h1 className="text-xl font-extralight tracking-tight text-[#E7E5E5] uppercase italic">the elite studio</h1>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-obsidian-100 border border-white/5 flex items-center justify-center text-[11px] font-bold text-gold shadow-2xl">
          {initial}
        </div>
      </div>
    </header>
  );
}
