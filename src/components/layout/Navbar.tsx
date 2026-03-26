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

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
    <header className="sticky top-0 z-40 bg-obsidian-100/40 backdrop-blur-3xl border-b border-white/5 shadow-2xl">
      <nav className="section-padding">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 group">
            <BrandLogo size={42} className="shadow-[0_0_30px_rgba(211,196,184,0.15)] group-hover:shadow-[0_0_45px_rgba(211,196,184,0.25)] transition-all duration-700" priority />
            <span className="font-display font-light text-[14px] tracking-[0.5em] uppercase text-gold group-hover:text-gold transition-colors block">{SITE_NAME}</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              if ("auth" in link && link.auth && !user) return null;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-[10px] uppercase font-semibold tracking-[0.2em] transition-all duration-500 relative py-2",
                    isActive ? "text-gold" : "text-white/40 hover:text-white"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-0 right-0 h-px bg-gold/60 rounded-full"
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
                <button type="button" onClick={handleProfileClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                  <span className="text-sm font-medium text-white">{user.full_name}</span>
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
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
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
              className="md:hidden overflow-hidden border-t border-white/10"
            >
              <div className="py-4 space-y-2">
                {NAV_LINKS.map((link) => {
                  if ("auth" in link && link.auth && !user) return null;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        pathname.startsWith(link.href)
                          ? "bg-gold/15 text-gold"
                          : "text-zinc-400 hover:bg-white/5"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  {user ? (
                    <>
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
