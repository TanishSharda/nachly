"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import BrandLogo from "@/components/shared/BrandLogo";
import { SITE_NAME } from "@/lib/utils/constants";

const sidebarLinks = [
  {
    label: "Dashboard",
    href: "/choreographer",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
  },
  {
    label: "My Routines",
    href: "/choreographer/routines",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
  },
  {
    label: "Upload",
    href: "/choreographer/create",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>,
  },
  {
    label: "Drafts",
    href: "/choreographer/drafts",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h6M8 16h4" /></svg>,
  },
  {
    label: "Workshops",
    href: "/choreographer/workshops",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
  },
  {
    label: "Analytics",
    href: "/choreographer/analytics",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>,
  },
  {
    label: "Earnings",
    href: "/choreographer/earnings",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  },
  {
    label: "Profile",
    href: "/choreographer/profile",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /></svg>,
  },
];

export default function ChoreographerLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-white/10">
        <div className="px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size={32} className="shadow-[0_0_15px_rgba(196,255,0,0.2)]" />
            <span className="font-display font-bold text-lg text-white">{SITE_NAME}</span>
            <span className="text-[10px] bg-gradient-to-r from-[#c4ff00] to-[#7b9e00] text-[#0a0a0a] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Creator</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/choreographer/create" className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#c4ff00] to-[#7b9e00] px-3 py-1.5 text-xs font-bold text-[#0a0a0a] transition hover:brightness-110">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              New Upload
            </Link>
            <Link href="/explore" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Back to Platform
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 border-r border-white/10 min-h-[calc(100vh-56px)] p-4">
          <nav className="space-y-1 flex-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/choreographer" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-[#c4ff00]/10 text-[#c4ff00]"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/10 pt-4">
            <Link href="/apply-choreographer" className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
              Creator Help
            </Link>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-black/90 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {sidebarLinks.slice(0, 6).map((link) => {
            const isActive = pathname === link.href || (link.href !== "/choreographer" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 transition",
                  isActive ? "text-[#c4ff00]" : "text-zinc-500"
                )}
              >
                {link.icon}
                <span className="text-[9px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
