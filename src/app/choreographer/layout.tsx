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
    label: "Earnings",
    href: "/choreographer/earnings",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  },
  {
    label: "Analytics",
    href: "/choreographer/analytics",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>,
  },
];

export default function ChoreographerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-white/10">
        <div className="px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size={32} className="shadow-[0_0_15px_rgba(121,255,206,0.3)]" />
            <span className="font-display font-bold text-lg text-white">{SITE_NAME}</span>
            <span className="text-xs bg-nred-500/20 text-nred-400 px-2 py-0.5 rounded-full font-medium">Creator</span>
          </Link>
          <Link href="/explore" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Back to Platform
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-60 border-r border-white/10 min-h-[calc(100vh-56px)] p-4">
          <nav className="space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/choreographer" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-nred-500/10 text-nred-500"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  );
}
