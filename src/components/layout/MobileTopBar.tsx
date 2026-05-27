"use client";

import { usePathname } from "next/navigation";

type MobileTopBarProps = {
  initial: string;
};

export default function MobileTopBar({ initial }: MobileTopBarProps) {
  const pathname = usePathname();
  const hideOnImmersiveRoute =
    pathname.startsWith("/flow") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/record") ||
    pathname.startsWith("/learn/feed") ||
    pathname.startsWith("/scroll") ||
    pathname.startsWith("/reels");

  if (hideOnImmersiveRoute) {
    return null;
  }

  return (
    <header className="md:hidden sticky top-0 z-40 px-6 pt-6 pb-4 backdrop-blur-2xl bg-[#f8f5ef]/90 border-b border-[#6c51321f]">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#7a5c3a]/70">Nachly Academy</p>
          <h1 className="text-xl font-semibold tracking-tight text-[#2d241a] uppercase">Flow Studio</h1>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-[#f1ebe3] border border-[#6c513224] flex items-center justify-center text-[11px] font-bold text-[#7a5c3a] shadow-[0_10px_24px_-20px_rgba(58,42,26,0.8)]">
          {initial}
        </div>
      </div>
    </header>
  );
}
