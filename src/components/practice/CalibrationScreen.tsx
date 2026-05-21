"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import Button from "@/components/ui/Button";

interface CalibrationScreenProps {
  cameraReady: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  cameraStatus: "idle" | "requesting" | "ready" | "error";
  cameraIssue: {
    title: string;
    message: string;
  } | null;
  onEnableCamera: () => void;
  onRetryCamera: () => void;
  onContinueWithoutCamera: () => void;
  onStart: () => void;
}

export default function CalibrationScreen({
  cameraReady,
  videoRef,
  stream,
  cameraStatus,
  cameraIssue,
  onEnableCamera,
  onRetryCamera,
  onContinueWithoutCamera,
  onStart,
}: CalibrationScreenProps) {
  // Attach stream to video element when stream becomes available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, videoRef]);

  const checklist = [
    { label: "Camera access", done: cameraReady },
    { label: "Full body visible", done: cameraReady },
    { label: "Good lighting", done: cameraReady },
    { label: "Space to move", done: cameraReady },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center flex flex-col items-center"
      >
        <h1 className="font-display text-2xl font-bold mb-1 text-white">
          Let&apos;s start dancing
        </h1>
        <p className="text-zinc-400 text-sm mb-4">
          Position yourself so your full body is visible in the camera, then begin your routine.
        </p>

        {/* Camera preview */}
        <div className="relative w-full max-h-[40vh] aspect-[16/10] bg-zinc-900 rounded-xl overflow-hidden mb-4 border border-white/10">
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

          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-2 bg-zinc-800 rounded-full flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D3C4B8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14" />
                    <rect x="1" y="6" width="14" height="12" rx="2" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-sm">Camera preview will appear here</p>
              </div>
            </div>
          )}

          {/* Body outline guide */}
          {cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-56 border-2 border-dashed border-amber-300/35 rounded-[32px]" />
            </div>
          )}
        </div>

        {/* T-pose hint when camera is ready */}
        {cameraReady && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 bg-amber-300/10 border border-amber-300/20 rounded-xl px-4 py-2.5"
          >
            <p className="text-xs text-amber-200 font-medium">
              Camera ready. Stand with arms out (T-pose) for best calibration.
            </p>
          </motion.div>
        )}

        {cameraStatus === "requesting" && (
          <div className="mb-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs text-zinc-200">
            Starting camera. Please allow permission in your browser prompt.
          </div>
        )}

        {cameraIssue && (
          <div className="mb-3 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left">
            <p className="text-sm font-semibold text-amber-300">{cameraIssue.title}</p>
            <p className="mt-1 text-xs text-amber-200/90">{cameraIssue.message}</p>
            {(cameraIssue.title === "Camera not detected" || cameraIssue.title === "Permission not granted") && (
              <p className="mt-2 text-xs text-amber-100">Camera not detected / Permission not granted</p>
            )}
          </div>
        )}

        {/* Readiness checklist — inline row */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mb-4">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                  item.done ? "bg-emerald-500" : "bg-zinc-700"
                )}
              >
                {item.done && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span
                className={cn(
                  "text-xs",
                  item.done ? "text-white" : "text-zinc-500"
                )}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          {!cameraReady && cameraStatus !== "error" ? (
            <Button variant="secondary" size="lg" onClick={onEnableCamera} loading={cameraStatus === "requesting"}>
              Enable Camera
            </Button>
          ) : !cameraReady && cameraStatus === "error" ? (
            <>
              <Button variant="secondary" size="lg" onClick={onRetryCamera}>
                Retry Camera
              </Button>
              <Button variant="ghost" size="lg" onClick={onContinueWithoutCamera}>
                Continue Demo
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="lg" onClick={onStart}>
              Start Practice
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
