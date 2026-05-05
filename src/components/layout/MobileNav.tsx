"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const mobileNavItems = [
  {
    label: "Home",
    href: "/explore",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    label: "History",
    href: "/previous-sessions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14" />
        <rect x="1" y="6" width="14" height="12" rx="2" />
      </svg>
    ),
  },
  {
    label: "Scroll",
    href: "/scroll",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m12 9 5 3-5 3V9Z" />
      </svg>
    ),
  },
  {
    label: "Stats",
    href: "/stats",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 1 0-16 0" />
      </svg>
    ),
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const hideOnImmersiveRoute =
    pathname.startsWith("/flow") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/record") ||
    pathname.startsWith("/scroll") ||
    pathname.startsWith("/scrool") ||
    pathname.startsWith("/reels");

  const handleProfileClick = async () => {
    console.log("Profile clicked");

    if (!isSupabaseConfigured()) {
      router.push("/profile");
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=%2Fprofile");
        return;
      }

      router.push("/profile");
    } catch {
      router.push("/login?redirect=%2Fprofile");
    }
  };

  if (hideOnImmersiveRoute) {
    return null;
  }

  return (
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.65rem)] left-3 right-3 z-40 md:hidden sm:left-6 sm:right-6 sm:bottom-6">
      <div className="bg-[#f8f5ef]/92 backdrop-blur-2xl border border-[#6c513224] rounded-[28px] px-2 py-2.5 sm:rounded-[32px] sm:px-3 sm:py-3 flex items-center justify-around shadow-[0_24px_40px_-30px_rgba(58,42,26,0.75)]">
        {mobileNavItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.href === "/profile" ? (e) => { e.preventDefault(); void handleProfileClick(); } : undefined}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-500 min-w-[52px]",
                isActive ? "text-[#7a5c3a]" : "text-[#8d8275] hover:text-[#5f4a31]"
              )}
            >
              <span
                className={cn(
                  "h-11 w-11 rounded-2xl flex items-center justify-center transition-all duration-500",
                  isActive
                    ? "bg-[#e9dfd2] text-[#6f5436] shadow-[0_8px_22px_-14px_rgba(58,42,26,0.65)]"
                    : "bg-[#f1ebe3] text-inherit border border-[#6c51321a]"
                )}
              >
                {item.icon}
              </span>
              <span className="text-[8px] uppercase tracking-[0.14em] font-bold sm:text-[9px] sm:tracking-[0.15em]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
