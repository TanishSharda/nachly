import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-body font-semibold shrink-0 overflow-hidden",
        {
          "h-8 w-8 text-xs": size === "sm",
          "h-10 w-10 text-sm": size === "md",
          "h-14 w-14 text-lg": size === "lg",
        },
        "relative",
        !src && "bg-obsidian-100/50 text-gold border border-gold/10",
        className
      )}
    >
      {src ? (
        <Image src={src} alt={name} unoptimized fill style={{ objectFit: "cover" }} />
      ) : (
        initials
      )}
    </div>
  );
}
