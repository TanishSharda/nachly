"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import BrandLogo from "@/components/shared/BrandLogo";
import { NAV_LINKS, SITE_NAME } from "@/lib/utils/constants";

interface NavbarProps {
  user?: { id: string; full_name: string; avatar_url: string | null; role: string } | null;
}

interface NavLink {
  label: string;
  href: string;
  auth?: boolean;
  minRole?: "choreographer" | "admin";
}

// Helper function to build nav links based on role
function getNavLinks(user: NavbarProps["user"]): NavLink[] {
  const baseLinks: NavLink[] = [
    { label: "Explore", href: "/explore" },
    { label: "Scroll", href: "/scroll" },
    { label: "My Library", href: "/library", auth: true },
    { label: "Stats", href: "/stats", auth: true },
  ];

  // Add choreographer-specific links
  if (user?.role === "choreographer" || user?.role === "admin") {
    baseLinks.push(
      { label: "Create", href: "/choreographer/create", minRole: "choreographer" },
      { label: "Dashboard", href: "/choreographer/dashboard", minRole: "choreographer" }
    );
  }

  // Add admin-specific links
  if (user?.role === "admin") {
    baseLinks.push({ label: "Admin", href: "/admin/applications", minRole: "admin" });
  }

  return baseLinks;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navLinks = getNavLinks(user);

  const handleProfileClick = () => {
    console.log("Profile clicked");
    router.push("/profile");
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
      setMobileOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#6c51321f] bg-[#f8f5ef]/85 backdrop-blur-2xl shadow-[0_10px_28px_-24px_rgba(58,42,26,0.65)]">
      <nav className="section-padding">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 group">
              <BrandLogo size={42} className="shadow-[0_12px_32px_-22px_rgba(122,92,58,0.6)] transition-all duration-700" priority />
              <span className="font-display font-semibold text-[14px] tracking-[0.36em] uppercase text-[#7a5c3a] transition-colors block">{SITE_NAME}</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              if (link.auth && !user) return null;
              if (link.minRole === "choreographer" && user?.role !== "choreographer" && user?.role !== "admin") return null;
              if (link.minRole === "admin" && user?.role !== "admin") return null;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-[10px] uppercase font-semibold tracking-[0.2em] transition-all duration-500 relative py-2",
                    isActive ? "text-[#7a5c3a]" : "text-[#7e7468] hover:text-[#3a2f22]"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-0 right-0 h-px bg-[#7a5c3a]/70 rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {user?.role !== "choreographer" && user?.role !== "admin" ? (
                  <Link href="/become-creator">
                    <Button size="sm">Start Teaching</Button>
                  </Link>
                ) : (
                  <Link href="/choreographer">
                    <Button variant="ghost" size="sm">Creator Dashboard</Button>
                  </Link>
                )}
                <button type="button" onClick={handleProfileClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                  <span className="text-sm font-medium text-[#2d241a]">{user.full_name}</span>
                </button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} loading={signingOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Start Learning</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[#6c513214] transition-colors text-[#7a5c3a]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-[#6c51321f]"
            >
              <div className="py-4 space-y-2">
                {navLinks.map((link) => {
                  if (link.auth && !user) return null;
                  if (link.minRole === "choreographer" && user?.role !== "choreographer" && user?.role !== "admin") return null;
                  if (link.minRole === "admin" && user?.role !== "admin") return null;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        pathname.startsWith(link.href)
                          ? "bg-[#7a5c3a1a] text-[#7a5c3a]"
                          : "text-[#7e7468] hover:bg-[#6c51320f] hover:text-[#2d241a]"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <div className="pt-2 border-t border-[#6c51321f] space-y-2">
                  {user ? (
                    <>
                      {user?.role !== "choreographer" && user?.role !== "admin" ? (
                        <Link href="/become-creator" onClick={() => setMobileOpen(false)} className="block">
                          <Button size="sm" className="w-full">Start Teaching</Button>
                        </Link>
                      ) : (
                        <Link href="/choreographer" onClick={() => setMobileOpen(false)} className="block">
                          <Button variant="ghost" size="sm" className="w-full">Creator Dashboard</Button>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={handleProfileClick}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left"
                      >
                        <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                        <span className="text-sm font-medium">{user.full_name}</span>
                      </button>
                      <Button variant="ghost" size="sm" className="w-full" onClick={handleSignOut} loading={signingOut}>
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileOpen(false)} className="block">
                        <Button variant="ghost" size="sm" className="w-full">Log in</Button>
                      </Link>
                      <Link href="/signup" onClick={() => setMobileOpen(false)} className="block">
                        <Button size="sm" className="w-full">Start Learning</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
