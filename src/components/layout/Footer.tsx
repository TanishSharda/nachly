import Link from "next/link";
import BrandLogo from "@/components/shared/BrandLogo";
import { SITE_NAME } from "@/lib/utils/constants";

const footerLinks = {
  Dance: [
    { label: "Hip Hop", href: "/scroll?style=hip-hop" },
    { label: "Bollywood", href: "/scroll?style=bollywood" },
    { label: "Kathak", href: "/scroll?style=kathak" },
    { label: "Bhangra", href: "/scroll?style=bhangra" },
  ],
  Platform: [
    { label: "How it Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Subscriptions", href: "/subscribe" },
    { label: "Creator Studio", href: "/creator/upload" },
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
    <footer className="border-t border-[#6c51321f] bg-[#f8f5ef]/70 text-[#7e7468] font-light">
      <div className="section-padding py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-24">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-6">
            <Link href="/" className="flex items-center gap-4 group">
              <BrandLogo size={42} className="shadow-[0_14px_30px_-20px_rgba(58,42,26,0.6)] transition-all duration-700" />
              <span className="font-display font-semibold text-[14px] tracking-[0.4em] uppercase text-[#7a5c3a]">{SITE_NAME}</span>
            </Link>
            <p className="text-[13px] leading-relaxed max-w-[220px] text-[#7e7468]">
              The evolution of dance training. Practice with cinematic AI precision. Master your art in the digital sanctuary.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="space-y-6">
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#7a5c3a]">{title}</h4>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12px] hover:text-[#5f472e] transition-colors duration-500"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[#6c51321f] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#8f877d]">
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#8f877d]">Made with passion for dancers everywhere</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
