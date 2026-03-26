import Link from "next/link";
import BrandLogo from "@/components/shared/BrandLogo";
import { SITE_NAME } from "@/lib/utils/constants";

const footerLinks = {
  Dance: [
    { label: "Hip Hop", href: "/explore/hip-hop" },
    { label: "Bollywood", href: "/explore/bollywood" },
    { label: "Kathak", href: "/explore/kathak" },
    { label: "Bhangra", href: "/explore/bhangra" },
  ],
  Platform: [
    { label: "How it Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Become a Choreographer", href: "/choreographer/apply" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-obsidian border-t border-white/5 text-[#E7E5E5]/40 font-light">
      <div className="section-padding py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-24">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-6">
            <Link href="/" className="flex items-center gap-4 group">
              <BrandLogo size={42} className="shadow-[0_0_30px_rgba(211,196,184,0.15)] group-hover:shadow-[0_0_45px_rgba(211,196,184,0.25)] transition-all duration-700" />
              <span className="font-display font-light text-[14px] tracking-[0.5em] uppercase text-gold">{SITE_NAME}</span>
            </Link>
            <p className="text-[13px] leading-relaxed max-w-[200px]">
              The evolution of dance training. Practice with cinematic AI precision. Master your art in the digital sanctuary.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="space-y-6">
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-gold">{title}</h4>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12px] hover:text-gold transition-colors duration-500"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600">Made with passion for dancers everywhere</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
