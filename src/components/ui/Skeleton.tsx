import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-dark-100 via-dark-50 to-dark-100 bg-[length:200%_100%] animate-shimmer rounded-lg",
        className
      )}
    />
  );
}
