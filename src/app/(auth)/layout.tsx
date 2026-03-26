import Link from "next/link";
import BrandLogo from "@/components/shared/BrandLogo";
import { SITE_NAME } from "@/lib/utils/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col app-shell">
      <div className="p-4 md:p-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <BrandLogo size={36} className="app-card" priority />
          <span className="font-display font-bold text-xl app-accent-text">{SITE_NAME}</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md app-card rounded-2xl p-5 sm:p-7 border-white/15">
          {children}
        </div>
      </div>
    </div>
  );
}
