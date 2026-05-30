"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  minRole?: "choreographer" | "admin";
}

function getBaseMobileNavItems(): MobileNavItem[] {
  return [
    {
      label: "Scroll",
      href: "/scroll",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      ),
    },
    {
      label: "Saved",
      href: "/saved",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: "Create",
      href: "/creator/upload",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      ),
    },
    {
      label: "History",
      href: "/learn/profile",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 12a9 9 0 1 0 9-9" />
          <path d="M12 7v6l4 2" />
        </svg>
      ),
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.3 18.9l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.2 6.3A2 2 0 0 1 7 3.47l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c.08.6.56 1.09 1.16 1.16h.09a1.65 1.65 0 0 0 1.51-1.16L19.4 6.3a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.16 1.51H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];
}

function buildMobileNavItems(userRole?: string): MobileNavItem[] {
  // For now, keep a single canonical set so learners see the Create CTA instantly.
  return getBaseMobileNavItems();
}

function isActiveMobileRoute(pathname: string, href: string) {
  if (href === "/learn/profile") {
    return (
      pathname === "/learn/profile" ||
      pathname.startsWith("/learn/profile/") ||
      pathname === "/profile/me" ||
      pathname.startsWith("/profile/me/")
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | undefined>();
  const [mobileNavItems, setMobileNavItems] = useState<MobileNavItem[]>(getBaseMobileNavItems());

  const hideOnImmersiveRoute =
    pathname.startsWith("/flow") ||
    pathname.startsWith("/learn/session") ||
    pathname.startsWith("/learn/practice") ||
    pathname.startsWith("/record") ||
    pathname.startsWith("/reels") ||
    pathname.startsWith("/scroll") ||
    pathname.startsWith("/choreography/") ||
    pathname.startsWith("/learn/");

  // Fetch user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!isSupabaseConfigured()) {
        setMobileNavItems(getBaseMobileNavItems());
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setMobileNavItems(getBaseMobileNavItems());
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = (profile?.role || "student") as string;
        setUserRole(role);
        setMobileNavItems(buildMobileNavItems(role));
      } catch {
        setMobileNavItems(getBaseMobileNavItems());
      }
    };

    fetchUserRole();
  }, []);

  const handleProfileClick = async () => {
    console.log("Profile clicked");

    if (!isSupabaseConfigured()) {
      router.push("/learn/profile");
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?redirect=%2Flearn%2Fprofile");
        return;
      }

      router.push("/learn/profile");
    } catch {
      router.push("/auth?redirect=%2Flearn%2Fprofile");
    }
  };

  if (hideOnImmersiveRoute) {
    return null;
  }

  const displayItems = mobileNavItems.filter(item => {
    if (item.minRole === "choreographer" && userRole !== "choreographer" && userRole !== "admin") return false;
    if (item.minRole === "admin" && userRole !== "admin") return false;
    return true;
  });

  return (
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.65rem)] left-3 right-3 z-40 md:hidden sm:left-6 sm:right-6 sm:bottom-6">
      <div className="bg-black/40 backdrop-blur-lg border border-white/6 rounded-[28px] px-2 py-2.5 sm:rounded-[32px] sm:px-3 sm:py-3 flex items-center justify-around shadow-[0_24px_40px_-30px_rgba(0,0,0,0.6)]">
        {displayItems.map((item) => {
          const isActive = isActiveMobileRoute(pathname, item.href);

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={item.href === "/learn/profile" ? (e) => { e.preventDefault(); void handleProfileClick(); } : undefined}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-500 min-w-[52px]",
                isActive ? "text-[#7a5c3a]" : "text-[#8d8275] hover:text-[#5f4a31]"
              )}
            >
              <span
                className={cn(
                  "h-11 w-11 rounded-2xl flex items-center justify-center transition-transform duration-200",
                  isActive
                    ? "bg-white/10 text-[#f8efe6] shadow-[0_8px_22px_-14px_rgba(0,0,0,0.6)]"
                    : "bg-transparent text-[#d6cfc6] border border-white/6"
                )}
              >
                {item.icon}
              </span>
              <span className="text-[8px] uppercase tracking-[0.14em] font-bold text-[#d6cfc6] sm:text-[9px] sm:tracking-[0.15em]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

