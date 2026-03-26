import { cn } from "@/lib/utils/cn";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: "wine" | "gold" | "green";
  className?: string;
  children?: React.ReactNode;
}

export default function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  color = "wine",
  className,
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference - (pct / 100) * circumference;

  const colorMap = {
    wine: "stroke-wine-900",
    gold: "stroke-gold-400",
    green: "stroke-emerald-500",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-dark-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700 ease-out", colorMap[color])}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
