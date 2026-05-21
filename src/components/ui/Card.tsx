"use client";

import { cn } from "@/lib/utils/cn";
import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glass?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  theme?: "light" | "dark";
}

export default function Card({
  className,
  hover = false,
  glass = false,
  padding = "md",
  theme = "light",
  children,
  ...props
}: CardProps) {
  const themeClasses = glass
    ? "glass"
    : theme === "dark"
    ? "bg-white/5 border-white/10 shadow-sm"
    : "bg-[var(--surface)] border-[var(--line)] shadow-[0_16px_45px_-28px_rgba(58,42,26,0.12)]";

  return (
    <div
      className={cn(
        "rounded-2xl border",
        themeClasses,
        hover && "card-hover cursor-pointer",
        {
          "p-0": padding === "none",
          "p-4": padding === "sm",
          "p-6": padding === "md",
          "p-8": padding === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
