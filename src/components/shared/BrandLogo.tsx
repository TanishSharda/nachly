import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface BrandLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
  rounded?: boolean;
}

export default function BrandLogo({
  size = 36,
  className,
  priority = false,
  rounded = true,
}: BrandLogoProps) {
  return (
    <div
      className={cn("relative overflow-hidden shrink-0", rounded ? "rounded-xl" : "", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-elite.svg"
        alt="Naachly logo"
        fill
        sizes={`${size}px`}
        priority={priority}
      />
    </div>
  );
}
