import { cn } from "@/lib/utils/cn";

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "wine" | "gold" | "green";
  showLabel?: boolean;
  className?: string;
}

export default function Progress({
  value,
  max = 100,
  size = "md",
  color = "wine",
  showLabel = false,
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1.5">
          <span className="text-sm font-medium text-dark-500">Progress</span>
          <span className="text-sm font-semibold text-dark">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className={cn("w-full bg-dark-100 rounded-full overflow-hidden", {
          "h-1.5": size === "sm",
          "h-2.5": size === "md",
          "h-4": size === "lg",
        })}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", {
            "bg-wine-900": color === "wine",
            "bg-gold-400": color === "gold",
            "bg-emerald-500": color === "green",
          })}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
