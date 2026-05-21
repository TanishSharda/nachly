"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import SkeletonCanvas from "./SkeletonCanvas";
import type { PoseLandmark, FrameComparison } from "@/types/database";

type PipSize = "small" | "medium" | "large";

const PIP_SIZES: Record<PipSize, { width: number; height: number }> = {
  small: { width: 200, height: 150 },
  medium: { width: 280, height: 210 },
  large: { width: 380, height: 285 },
};

interface WebcamOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  cameraReady: boolean;
  landmarks: PoseLandmark[] | null;
  comparison: FrameComparison | null;
  visible: boolean;
  onToggleExpand?: () => void;
}

export default function WebcamOverlay({
  videoRef,
  stream,
  cameraReady,
  landmarks,
  comparison,
  visible,
  onToggleExpand,
}: WebcamOverlayProps) {
  const [pipSize, setPipSize] = useState<PipSize>("medium");
  const [position, setPosition] = useState({ x: -1, y: -1 }); // -1 means "use default"
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, elemX: 0, elemY: 0 });

  const size = PIP_SIZES[pipSize];

  // Attach stream to video element when component mounts or stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      // Ensure playback starts
      videoRef.current.play().catch(() => {});
    }
  }, [stream, videoRef]);

  // Set default position (bottom-right) on mount
  useEffect(() => {
    if (position.x === -1) {
      setPosition({
        x: window.innerWidth - size.width - 24,
        y: window.innerHeight - size.height - 100, // above playback controls
      });
    }
  }, [position.x, size.width, size.height]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        elemX: position.x,
        elemY: position.y,
      };
    },
    [position]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        elemX: position.x,
        elemY: position.y,
      };
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - dragStartRef.current.mouseX;
      const dy = clientY - dragStartRef.current.mouseY;
      const newX = Math.max(
        8,
        Math.min(
          window.innerWidth - size.width - 8,
          dragStartRef.current.elemX + dx
        )
      );
      const newY = Math.max(
        8,
        Math.min(
          window.innerHeight - size.height - 8,
          dragStartRef.current.elemY + dy
        )
      );
      setPosition({ x: newX, y: newY });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, size]);

  const cyclePipSize = useCallback(() => {
    setPipSize((s) => (s === "small" ? "medium" : s === "medium" ? "large" : "small"));
  }, []);

  if (!visible) return null;

  return (
    <motion.div
      ref={dragRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 55,
      }}
      className={cn(
        "rounded-2xl overflow-hidden border-2 border-dark-700/80 shadow-2xl shadow-black/40",
        "bg-dark-800",
        isDragging && "ring-2 ring-gold-400/50"
      )}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
      />

      {/* Webcam video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "w-full h-full object-cover scale-x-[-1]",
          !cameraReady && "hidden"
        )}
      />

      {/* Skeleton overlay */}
      {cameraReady && (
        <SkeletonCanvas
          landmarks={landmarks}
          comparison={comparison}
          mirrored={true}
        />
      )}

      {/* Camera off state */}
      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
          <div className="text-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C5A572"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="mx-auto mb-1"
            >
              <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14" />
              <rect x="1" y="6" width="14" height="12" rx="2" />
            </svg>
            <p className="text-dark-400 text-xs">Camera off</p>
          </div>
        </div>
      )}

      {/* "You" label */}
      <span className="absolute bottom-2 left-2 z-20 text-[10px] bg-dark/70 backdrop-blur-sm px-2 py-0.5 rounded-md text-dark-300 pointer-events-none">
        You
      </span>

      {/* Control buttons (top-right of PiP) */}
      <div className="absolute top-1.5 right-1.5 z-20 flex gap-1">
        {/* Resize */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            cyclePipSize();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-6 h-6 rounded-md bg-dark/70 backdrop-blur-sm flex items-center justify-center text-dark-300 hover:text-cream-100 transition-colors"
          title="Resize"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>

        {/* Expand */}
        {onToggleExpand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-md bg-dark/70 backdrop-blur-sm flex items-center justify-center text-dark-300 hover:text-cream-100 transition-colors"
            title="Expand"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <line x1="12" y1="2" x2="12" y2="22" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}
