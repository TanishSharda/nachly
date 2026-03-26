import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "red" | "accent" | "success" | "warning" | "outline";
  size?: "sm" | "md";
  className?: string;
}

export default function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-body font-medium rounded-full",
        {
          "bg-white/10 text-zinc-300": variant === "default",
          "bg-nred-500/16 text-nred-300 border border-nred-500/30": variant === "red",
          "bg-white/10 text-white": variant === "accent",
          "bg-emerald-100 text-emerald-800": variant === "success",
          "bg-amber-100 text-amber-800": variant === "warning",
          "border border-white/20 text-zinc-400": variant === "outline",
        },
        {
          "text-xs px-2.5 py-0.5": size === "sm",
          "text-sm px-3 py-1": size === "md",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
