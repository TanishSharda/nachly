"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const mobileNavItems = [
  {
    label: "Home",
    href: "/",
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
    <nav className="fixed bottom-6 left-6 right-6 z-40 md:hidden">
      <div className="bg-obsidian-100/60 backdrop-blur-3xl border border-white/5 rounded-[32px] px-3 py-3 flex items-center justify-around shadow-2xl">
        {mobileNavItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.href === "/profile" ? (e) => { e.preventDefault(); void handleProfileClick(); } : undefined}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all duration-500 min-w-[50px]",
                isActive ? "text-gold" : "text-white/30 hover:text-white/50"
              )}
            >
              <span
                className={cn(
                  "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-500",
                  isActive
                    ? "bg-gold text-obsidian shadow-[0_0_20px_rgba(211,196,184,0.3)]"
                    : "bg-white/5 text-inherit border border-white/5"
                )}
              >
                {item.icon}
              </span>
              <span className="text-[9px] uppercase tracking-[0.15em] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
