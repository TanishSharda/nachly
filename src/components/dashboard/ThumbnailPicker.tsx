"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ThumbnailPickerProps {
  videoUrl: string;
  selectedUrl: string;
  onSelect: (url: string) => void;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function ThumbnailPicker({ videoUrl, selectedUrl, onSelect }: ThumbnailPickerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const capturePoints = useMemo(() => [0.15, 0.4, 0.65, 0.85], []);

  useEffect(() => {
    let cancelled = false;

    async function generateFrames() {
      if (!videoUrl) {
        setFrames([]);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.src = videoUrl;
        video.muted = true;
        video.playsInline = true;

        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => resolve();
          const onError = () => reject(new Error("Video metadata failed"));
          video.addEventListener("loadedmetadata", onLoaded, { once: true });
          video.addEventListener("error", onError, { once: true });
        });

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, video.videoWidth);
        canvas.height = Math.max(1, video.videoHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");

        const nextFrames: string[] = [];
        for (const point of capturePoints) {
          const targetTime = video.duration * point;
          await new Promise<void>((resolve) => {
            const onSeeked = () => resolve();
            video.addEventListener("seeked", onSeeked, { once: true });
            video.currentTime = targetTime;
          });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          nextFrames.push(canvas.toDataURL("image/jpeg", 0.8));
        }

        if (!cancelled) {
          setFrames(nextFrames);
        }
      } catch {
        if (!cancelled) {
          setFrames([]);
          setError("Frame extraction needs a CORS-enabled video. Upload or use a local file.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    generateFrames();
    return () => {
      cancelled = true;
    };
  }, [videoUrl, capturePoints]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Auto Frames</h3>
          <p className="text-xs text-zinc-500">Pick a frame or upload a custom cover</p>
        </div>
        {loading && <span className="text-[10px] text-zinc-500">Generating…</span>}
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {frames.map((frame, index) => (
          <button
            key={frame}
            type="button"
            onClick={() => onSelect(frame)}
            className={`relative overflow-hidden rounded-xl border-2 transition ${
              selectedUrl === frame ? "border-[#F3B2AB]" : "border-white/10 hover:border-white/30"
            }`}
          >
            <img src={frame} alt={`Frame ${index + 1}`} className="h-full w-full object-cover" />
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-zinc-300">
              {formatPercent(capturePoints[index] || 0)}
            </span>
          </button>
        ))}
        {!frames.length && !loading && (
          <div className="col-span-2 sm:col-span-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
            Upload a video to generate frames.
          </div>
        )}
      </div>

      <video ref={videoRef} className="hidden" />
    </div>
  );
}
