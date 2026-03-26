"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BrandLogo from "@/components/shared/BrandLogo";

type RecordingStudioTopBarProps = {
  className?: string;
  title?: string;
  isRecording?: boolean;
  hasRecording?: boolean;
  recordingSeconds?: number;
  recordedVideoUrl?: string;
  startDisabled?: boolean;
  stopDisabled?: boolean;
  viewDisabled?: boolean;
  downloadDisabled?: boolean;
  helperText?: string;
  errorMessage?: string;
  onStartRecording?: () => void | Promise<void>;
  onStopRecording?: () => void | Promise<void>;
  onDownloadRecording?: () => void;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function StartIcon() {
  return <span className="inline-block h-3.5 w-3.5 rounded-full bg-current" aria-hidden="true" />;
}

function StopIcon() {
  return <span className="inline-block h-3.5 w-3.5 rounded-[3px] bg-current" aria-hidden="true" />;
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

export default function RecordingStudioTopBar({
  className = "",
  title = "Naachly Studio",
  isRecording,
  hasRecording,
  recordingSeconds,
  recordedVideoUrl,
  startDisabled,
  stopDisabled,
  viewDisabled,
  downloadDisabled,
  helperText,
  errorMessage,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
}: RecordingStudioTopBarProps) {
  const [internalRecording, setInternalRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [internalRecordedVideoUrl, setInternalRecordedVideoUrl] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [internalError, setInternalError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const effectiveIsRecording = typeof isRecording === "boolean" ? isRecording : internalRecording;
  const previewUrl = recordedVideoUrl || internalRecordedVideoUrl;
  const effectiveHasRecording =
    typeof hasRecording === "boolean" ? hasRecording : Boolean(previewUrl && (recordedVideo || recordedVideoUrl));
  const effectiveError = errorMessage || internalError;
  const effectiveSeconds = typeof recordingSeconds === "number" ? recordingSeconds : elapsedSeconds;
  const timerLabel = useMemo(() => formatTime(effectiveSeconds), [effectiveSeconds]);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStreamTracks = () => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const chooseMimeType = () => {
    const candidates = [
      "video/mp4;codecs=h264,aac",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
  };

  const startRecording = async () => {
    if (effectiveIsRecording) return;

    if (onStartRecording) {
      await onStartRecording();
      return;
    }

    setInternalError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 720 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: true,
      });
      streamRef.current = stream;

      const mimeType = chooseMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      chunksRef.current = [];
      setElapsedSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearTimer();
        setInternalRecording(false);

        if (chunksRef.current.length === 0) {
          stopStreamTracks();
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
        setRecordedVideo(blob);

        if (internalRecordedVideoUrl) {
          URL.revokeObjectURL(internalRecordedVideoUrl);
        }

        const url = URL.createObjectURL(blob);
        setInternalRecordedVideoUrl(url);

        stopStreamTracks();
      };

      recorder.start(1000);
      setInternalRecording(true);
      startTimer();
    } catch (err) {
      console.error(err);
      setInternalError("Could not access camera/microphone. Please allow permissions and try again.");
      stopStreamTracks();
      clearTimer();
      setInternalRecording(false);
    }
  };

  const stopRecording = async () => {
    if (onStopRecording) {
      await onStopRecording();
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    clearTimer();
    setInternalRecording(false);
  };

  const downloadRecording = () => {
    if (onDownloadRecording) {
      onDownloadRecording();
      return;
    }

    if (!recordedVideo) return;

    const downloadUrl = URL.createObjectURL(recordedVideo);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `naachly-recording-${Date.now()}.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
  };

  useEffect(() => {
    return () => {
      clearTimer();
      stopStreamTracks();
      if (internalRecordedVideoUrl) {
        URL.revokeObjectURL(internalRecordedVideoUrl);
      }
    };
  }, [internalRecordedVideoUrl]);

  const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm";

  return (
    <>
      <div
        className={`w-full rounded-2xl border px-3 py-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-colors duration-300 sm:px-4 ${
          effectiveIsRecording
            ? "border-red-500/50 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black"
            : "border-white/10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black"
        } ${className}`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo size={34} rounded className="shadow-[0_0_18px_rgba(255,40,40,0.24)]" />
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
            {effectiveIsRecording && (
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                REC {timerLabel}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={startRecording}
              disabled={typeof startDisabled === "boolean" ? startDisabled : effectiveIsRecording}
              className={`${buttonBase} border-red-400/45 bg-red-500/15 text-red-100 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <StartIcon />
              Start Recording
            </button>

            <button
              type="button"
              onClick={stopRecording}
              disabled={typeof stopDisabled === "boolean" ? stopDisabled : !effectiveIsRecording}
              className={`${buttonBase} border-zinc-500/45 bg-zinc-800/70 text-zinc-100 hover:bg-zinc-700/80 disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <StopIcon />
              Stop Recording
            </button>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              disabled={typeof viewDisabled === "boolean" ? viewDisabled : !effectiveHasRecording}
              className={`${buttonBase} border-sky-400/35 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <EyeIcon />
              View Recording
            </button>

            <button
              type="button"
              onClick={downloadRecording}
              disabled={typeof downloadDisabled === "boolean" ? downloadDisabled : !effectiveHasRecording}
              className={`${buttonBase} border-emerald-400/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <DownloadIcon />
              Download Recording
            </button>
          </div>
        </div>

        {helperText && <p className="mt-2 text-xs text-zinc-300">{helperText}</p>}
        {effectiveError && <p className="mt-1 text-xs text-red-300">{effectiveError}</p>}
      </div>

      {showModal && effectiveHasRecording && previewUrl && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-zinc-950 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white sm:text-lg">Recorded Video</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <video src={previewUrl} controls className="w-full rounded-xl bg-black" />
          </div>
        </div>
      )}
    </>
  );
}
