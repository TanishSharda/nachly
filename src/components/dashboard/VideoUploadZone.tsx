"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface VideoUploadZoneProps {
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  onFileSelect?: (file: File) => void;
  onFileError?: (message: string) => void;
}

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export default function VideoUploadZone({ videoUrl, onVideoUrlChange, onFileSelect, onFileError }: VideoUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) {
      onFileError?.("Unsupported file type. Please upload a video.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      onFileError?.("File is too large. Max size is 500MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFileMeta({ name: file.name, size: file.size });
    onFileSelect?.(file);
    onVideoUrlChange(url);
  }, [onFileError, onFileSelect, onVideoUrlChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const hasVideo = previewUrl || videoUrl.trim().startsWith("http");

  useEffect(() => {
    if (!videoUrl.trim()) {
      setPreviewUrl("");
      setFileMeta(null);
      return;
    }
    if (!previewUrl && videoUrl.trim().startsWith("http")) {
      setPreviewUrl(videoUrl.trim());
    }
  }, [previewUrl, videoUrl]);

  return (
    <div>
      {/* Mode toggle */}
      <div className="mb-4 flex gap-2">
        {(["upload", "url"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              mode === m
                ? "bg-[#c4ff00]/20 text-[#c4ff00] border border-[#c4ff00]/30"
                : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            {m === "upload" ? "📁 Upload File" : "🔗 Paste URL"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${
            dragging
              ? "border-[#c4ff00] bg-[#c4ff00]/5"
              : "border-white/20 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.05]"
          } ${hasVideo ? "p-3" : "p-8 sm:p-12"}`}
        >
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileInput} />

          {previewUrl ? (
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              <video src={previewUrl} className="h-full w-full object-contain" controls muted />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreviewUrl(""); setFileMeta(null); onVideoUrlChange(""); }}
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
              {fileMeta && (
                <div className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] text-zinc-200">
                  {fileMeta.name} • {(fileMeta.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <motion.div
                animate={dragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#c4ff00" : "#666"} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </motion.div>
              <p className="text-sm font-medium text-white">Drop your video here</p>
              <p className="mt-1 text-xs text-zinc-500">or click to browse • MP4, MOV, WebM up to 500MB</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            placeholder="https://drive.google.com/... or direct video URL"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-[#c4ff00]/50 focus:ring-2 focus:ring-[#c4ff00]/20"
          />
          <p className="mt-2 text-xs text-zinc-600">Paste a Google Drive link or direct video URL</p>
          {previewUrl && (
            <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black">
              <video src={previewUrl} className="h-full w-full object-contain" controls muted />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
