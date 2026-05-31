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
import IntroSettingsModal from "@/components/marketing/IntroSettingsModal";

interface NavbarProps {
  user?: { id: string; full_name: string; avatar_url: string | null; role: string } | null;
}

type NavLink = { label: string; href: string; auth?: boolean; minRole?: "choreographer" | "admin" };

function isNavActive(pathname: string, href: string) {
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

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showIntroSettings, setShowIntroSettings] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navLinks = NAV_LINKS as unknown as NavLink[];
  const isCreator = user?.role === "choreographer" || user?.role === "admin";
  const creatorCtaHref = user ? (isCreator ? "/creator/dashboard" : "/select-role") : "/auth?mode=signup";
  const creatorCtaLabel = isCreator ? "Upload a Dance" : "Start Teaching";

  const handleProfileClick = () => {
    router.push("/learn/profile");
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth");
      router.refresh();
    } finally {
      setSigningOut(false);
      setMobileOpen(false);
    }
  };

  const triggerIntroPreview = (preview = true) => {
    if (typeof window === "undefined") return;
    try {
      if (preview) {
        window.dispatchEvent(new CustomEvent("showCinematicIntro", { detail: { preview: true } }));
      } else {
        // clear seen flag and show
        localStorage.removeItem("nachly_seen_intro");
        window.dispatchEvent(new CustomEvent("showCinematicIntro", { detail: { preview: false } }));
      }
    } catch (e) {
      /* ignore */
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#00000066] bg-[#070707]/50 backdrop-blur-2xl shadow-[0_18px_60px_-30px_rgba(0,0,0,0.7)]">
      <nav role="navigation" className="section-padding">
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
              const isActive = isNavActive(pathname, link.href);
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
                <Button href={creatorCtaHref} variant={isCreator ? "ghost" : "primary"} size="sm">
                  {creatorCtaLabel}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => triggerIntroPreview(true)}>
                  Preview Intro
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowIntroSettings(true)}>
                  Intro Settings
                </Button>
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
                <Button href="/auth?mode=signup" size="sm">Start Learning</Button>
                <Button variant="ghost" size="sm" onClick={() => triggerIntroPreview(true)}>Preview Intro</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowIntroSettings(true)}>Intro Settings</Button>
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
                        isNavActive(pathname, link.href)
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
                      <Button href={creatorCtaHref} onClick={() => setMobileOpen(false)} variant={isCreator ? "ghost" : "primary"} size="sm" className="w-full">{creatorCtaLabel}</Button>
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
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => { setMobileOpen(false); triggerIntroPreview(true); }}>
                        Preview Intro
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => { setMobileOpen(false); setShowIntroSettings(true); }}>
                        Intro Settings
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button href="/auth?mode=signup" onClick={() => setMobileOpen(false)} size="sm" className="w-full">Start Learning</Button>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => { setMobileOpen(false); triggerIntroPreview(true); }}>
                        Preview Intro
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          <IntroSettingsModal open={showIntroSettings} onClose={() => setShowIntroSettings(false)} />
      </nav>
    </header>
  );
}
