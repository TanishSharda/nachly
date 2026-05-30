"use client";

import { useRouter } from "next/navigation";

interface HistoryBackButtonProps {
  fallbackHref: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export default function HistoryBackButton({ fallbackHref, children, className = "", ariaLabel }: HistoryBackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button type="button" onClick={handleClick} aria-label={ariaLabel} className={className}>
      {children}
    </button>
  );
}
