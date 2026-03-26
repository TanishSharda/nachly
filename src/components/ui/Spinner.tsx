import { cn } from "@/lib/utils/cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-dark-200 border-t-wine-900",
        {
          "h-4 w-4": size === "sm",
          "h-6 w-6": size === "md",
          "h-10 w-10 border-[3px]": size === "lg",
        },
        className
      )}
    />
  );
}
