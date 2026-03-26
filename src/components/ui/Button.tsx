"use client";

import { cn } from "@/lib/utils/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-body font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          {
            "bg-gold text-obsidian hover:bg-[#C2B3A7] focus:ring-gold/30 shadow-[0_4px_20px_rgba(211,196,184,0.15)] hover:shadow-[0_8px_30px_rgba(211,196,184,0.25)]": variant === "primary",
            "bg-white/5 text-[#E7E5E5] border border-white/5 hover:bg-white/10 focus:ring-white/20 backdrop-blur-md": variant === "secondary",
            "text-gold hover:bg-gold/5 focus:ring-gold/10": variant === "ghost",
            "border border-gold/20 text-gold hover:bg-gold hover:text-obsidian focus:ring-gold/20": variant === "outline",
          },
          {
            "text-sm px-4 py-2 gap-1.5": size === "sm",
            "text-base px-6 py-3 gap-2": size === "md",
            "text-lg px-8 py-4 gap-2.5": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
