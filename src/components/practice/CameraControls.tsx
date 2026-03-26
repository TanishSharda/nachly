"use client";

import { cn } from "@/lib/utils/cn";

interface CameraControlsProps {
  cameraOn: boolean;
  webcamVisible: boolean;
  swapped?: boolean;
  shadowMode?: boolean;
  onToggleCamera: () => void;
  onToggleWebcam: () => void;
  onToggleSwap?: () => void;
  onToggleShadowMode?: () => void;
  onToggleExpand?: () => void;
}

export default function CameraControls({
  cameraOn,
  webcamVisible,
  swapped = false,
  shadowMode = false,
  onToggleCamera,
  onToggleWebcam,
  onToggleSwap,
  onToggleShadowMode,
  onToggleExpand,
}: CameraControlsProps) {
  return (
    <div className="fixed top-16 right-4 z-[56] flex gap-1.5 bg-dark/60 backdrop-blur-xl rounded-xl p-1.5 border border-dark-700/50 shadow-lg">
      {/* Camera toggle */}
      <button
        onClick={onToggleCamera}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
          cameraOn
            ? "text-gold-400 bg-gold-400/10"
            : "text-dark-400 hover:text-dark-200"
        )}
        title={cameraOn ? "Turn off camera" : "Turn on camera"}
      >
        {cameraOn ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14" />
            <rect x="1" y="6" width="14" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14" />
            <rect x="1" y="6" width="14" height="12" rx="2" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </button>

      {/* Show/hide webcam PiP */}
      <button
        onClick={onToggleWebcam}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
          webcamVisible
            ? "text-cream-100 hover:text-dark-200"
            : "text-dark-400 hover:text-dark-200"
        )}
        title={webcamVisible ? "Hide webcam" : "Show webcam"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          {webcamVisible ? (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          ) : (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </>
          )}
        </svg>
      </button>

      {/* Expand to split view */}
      {onToggleExpand && (
        <button
          onClick={onToggleExpand}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-400 hover:text-cream-100 transition-colors"
          title="Split view"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
        </button>
      )}

      {onToggleShadowMode && (
        <button
          onClick={onToggleShadowMode}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            shadowMode
              ? "text-nred-300 bg-nred-500/15"
              : "text-dark-400 hover:text-cream-100"
          )}
          title={shadowMode ? "Disable shadow guide" : "Enable shadow guide"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="6" r="2" />
            <path d="M12 8v5m0 0-4 4m4-4 4 4" />
            <path d="M5 22h14" />
          </svg>
        </button>
      )}

      {onToggleSwap && (
        <button
          onClick={onToggleSwap}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            swapped ? "text-nred-200 bg-nred-500/20" : "text-dark-400 hover:text-cream-100"
          )}
          title="Swap instructor and self view"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M7 7h10v6" />
            <path d="m17 13 3-3-3-3" />
            <path d="M17 17H7v-6" />
            <path d="m7 11-3 3 3 3" />
          </svg>
        </button>
      )}
    </div>
  );
}
