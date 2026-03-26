"use client";

import { cn } from "@/lib/utils/cn";
import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glass?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({
  className,
  hover = false,
  glass = false,
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border",
        glass
          ? "glass"
          : "bg-white/5 border-white/10 shadow-sm",
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
