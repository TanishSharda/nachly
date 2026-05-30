"use client";

import { cn } from "@/lib/utils/cn";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type ButtonAsButton = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };
type ButtonAsAnchor = BaseProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center font-body font-semibold rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 btn-focus",
      {
        "bg-gradient-to-r from-[#7a5c3a] to-[#8f6c45] text-[#f8f5ef] border border-[#6c513236] hover:brightness-105 shadow-[0_12px_30px_-20px_rgba(58,42,26,0.75)]": variant === "primary",
        "bg-[#ffffffb3] text-[#2d241a] border border-[#6c513220] hover:bg-[#fff7ed] backdrop-blur-md": variant === "secondary",
        "text-[#7a5c3a] hover:bg-[#7a5c3a12]": variant === "ghost",
        "border border-[#6c513238] text-[#7a5c3a] hover:bg-[#7a5c3a] hover:text-[#f8f5ef]": variant === "outline",
        "bg-rose-600 text-white hover:bg-rose-700": variant === "danger",
      },
      {
        "text-sm px-4 py-2 gap-1.5": size === "sm",
        "text-base px-6 py-3 gap-2": size === "md",
        "text-lg px-8 py-4 gap-2.5": size === "lg",
      },
      className
    );

    // Render anchor when href is provided
    if ((props as ButtonAsAnchor).href) {
      const { href, target, rel, ...anchorProps } = props as ButtonAsAnchor;
      return (
        <a ref={ref as any} href={href} target={target} rel={rel} className={classes} {...anchorProps}>
          {loading && (
            <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {children}
        </a>
      );
    }

    // Default: render a button
    const { disabled, ...buttonProps } = props as ButtonAsButton;
    return (
      <button ref={ref as any} disabled={disabled} className={classes} {...buttonProps}>
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
