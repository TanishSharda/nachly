"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils/cn";

interface VideoStageProps {
  videoUrl?: string | null;
  gradientFrom?: string;
  gradientTo?: string;
  playbackRate?: number;
  isPlaying?: boolean;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

const VideoStage = forwardRef<HTMLVideoElement, VideoStageProps>(
  (
    {
      videoUrl,
      gradientFrom = "#2C1810",
      gradientTo = "#722F37",
      playbackRate = 1,
      className,
      onTimeUpdate,
      onEnded,
    },
    ref
  ) => {
    const internalRef = useRef<HTMLVideoElement>(null);
    useImperativeHandle(ref, () => internalRef.current!);

    // Set playback rate imperatively
    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.playbackRate = playbackRate;
      }
    }, [playbackRate]);

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const video = e.currentTarget;
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    return (
      <div className={cn("absolute inset-0 bg-dark", className)}>
        {videoUrl ? (
          <video
            ref={internalRef}
            src={videoUrl}
            className="w-full h-full object-cover sm:object-contain"
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={onEnded}
          />
        ) : (
          /* Gradient placeholder when no video URL */
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}cc, ${gradientTo}cc)`,
            }}
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="white"
                  stroke="none"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <p className="text-cream-100/80 font-medium text-lg">
                Instructor Video
              </p>
              <p className="text-cream-200/40 text-sm mt-1">
                Follow along with the movements
              </p>
            </div>
          </div>
        )}

        {/* "Instructor" label */}
        <span className="absolute bottom-16 left-4 z-10 text-xs bg-dark/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-dark-300">
          Instructor
        </span>
      </div>
    );
  }
);

VideoStage.displayName = "VideoStage";
export default VideoStage;
