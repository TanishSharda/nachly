"use client";

import { useEffect, useRef } from "react";
import { drawSkeleton, resizeCanvas } from "@/lib/ai/skeleton-renderer";
import type { PoseLandmark, FrameComparison } from "@/types/database";

interface SkeletonCanvasProps {
  landmarks: PoseLandmark[] | null;
  comparison: FrameComparison | null;
  mirrored?: boolean;
  showShadowGuide?: boolean;
  className?: string;
}

export default function SkeletonCanvas({
  landmarks,
  comparison,
  mirrored = true,
  showShadowGuide = false,
  className = "",
}: SkeletonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas(canvas);

    if (landmarks && landmarks.length > 0) {
      drawSkeleton(canvas, landmarks, comparison, mirrored, 0.5, showShadowGuide);
    } else {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (showShadowGuide) {
          drawSkeleton(
            canvas,
            [
              ...Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 } as PoseLandmark)),
            ],
            null,
            mirrored,
            2,
            true,
          );
        }
      }
    }
  }, [landmarks, comparison, mirrored, showShadowGuide]);

  // Resize on window resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => resizeCanvas(canvas);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
