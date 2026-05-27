"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getChoreographySubmission,
  patchChoreographySubmission,
  postChoreographySubmission,
} from "@/lib/api/choreos";

const STORAGE_BUCKET = "choreographer-uploads";
const DRAFT_PREFIX = "creator-upload";

type StyleSlug = "bollywood" | "bhangra" | "hip-hop" | "kathak" | "contemporary";
type Difficulty = "beginner" | "intermediate" | "advanced";
type Step = 1 | 2 | 3;
type MediaRole = "performance" | "teach";

type DraftShape = {
  id: string;
  title: string;
  song_name?: string | null;
  description?: string | null;
  style_slug?: StyleSlug;
  difficulty?: Difficulty;
  thumbnail_url?: string | null;
  video_url?: string | null;
  performance_video_url?: string | null;
  teach_video_url?: string | null;
};

const STYLE_OPTIONS: Array<{ value: StyleSlug; label: string; emoji: string }> = [
  { value: "bollywood", label: "Bollywood", emoji: "🎬" },
  { value: "bhangra", label: "Bhangra", emoji: "🥁" },
  { value: "hip-hop", label: "Hip Hop", emoji: "🧢" },
  { value: "kathak", label: "Kathak", emoji: "💫" },
  { value: "contemporary", label: "Contemporary", emoji: "🌊" },
];

const DIFFICULTY_OPTIONS: Array<{ value: Difficulty; label: string; subtitle: string }> = [
  { value: "beginner", label: "Beginner", subtitle: "Quick to learn" },
  { value: "intermediate", label: "Intermediate", subtitle: "Some detail" },
  { value: "advanced", label: "Advanced", subtitle: "Performance-ready" },
];

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

function safeString(value: string | null | undefined) {
  return String(value || "").trim();
}

function getStyleLabel(value: StyleSlug) {
  return STYLE_OPTIONS.find((option) => option.value === value)?.label || "Bollywood";
}

function getDifficultyLabel(value: Difficulty) {
  return DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label || "Beginner";
}

function getBlankMediaState() {
  return {
    fileName: "",
    previewUrl: "",
    uploadedUrl: "",
    progress: 0,
    uploading: false,
    error: "",
  };
}

function UploadCard({
  title,
  subtitle,
  helper,
  mediaUrl,
  fileName,
  progress,
  uploading,
  error,
  onPickFile,
  onClear,
}: {
  title: string;
  subtitle: string;
  helper: string;
  mediaUrl: string;
  fileName: string;
  progress: number;
  uploading: boolean;
  error: string;
  onPickFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const hasMedia = Boolean(mediaUrl);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onPickFile(file);
      }}
      className={`rounded-[1.75rem] border p-4 transition sm:p-5 ${
        dragging ? "border-[#F3B2AB]/50 bg-[#F3B2AB]/10" : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
        >
          Browse
        </button>
      </div>

      <p className="mt-3 text-xs text-zinc-500">{helper}</p>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPickFile(file);
          event.target.value = "";
        }}
      />

      <div className={`mt-4 rounded-[1.5rem] border border-dashed p-4 ${hasMedia ? "border-white/15 bg-black/30" : "border-white/10 bg-black/20"}`}>
        {hasMedia ? (
          <div className="space-y-3">
            <video src={mediaUrl} controls playsInline muted className="aspect-video w-full rounded-2xl bg-black object-cover" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{fileName || "Uploaded video"}</p>
                <p className="text-xs text-zinc-500">Ready for the next step</p>
              </div>
              <button
                type="button"
                onClick={onClear}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-300 transition hover:bg-white/10"
              >
                Replace
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-[1.25rem] py-8 text-center transition hover:bg-white/[0.03]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-[#F3B2AB]">
              +
            </div>
            <div>
              <p className="text-sm font-medium text-white">Drop video here</p>
              <p className="mt-1 text-xs text-zinc-500">or tap to upload from your phone</p>
            </div>
          </button>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#F3B2AB] to-[#D88B80] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{uploading ? "Uploading..." : hasMedia ? "Uploaded" : "Waiting"}</span>
        <span>{Math.min(100, Math.max(0, Math.round(progress)))}%</span>
      </div>

      {error ? <p className="mt-2 text-xs text-amber-200">{error}</p> : null}
    </div>
  );
}

export default function CreatorUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [draftId, setDraftId] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState("Ready to publish");
  const [error, setError] = useState("");
  const [publishedId, setPublishedId] = useState("");

  const [title, setTitle] = useState("");
  const [songName, setSongName] = useState("");
  const [styleSlug, setStyleSlug] = useState<StyleSlug>("bollywood");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [description, setDescription] = useState("");

  const [performanceMedia, setPerformanceMedia] = useState(getBlankMediaState());
  const [teachMedia, setTeachMedia] = useState(getBlankMediaState());

  const performanceObjectUrlRef = useRef<string | null>(null);
  const teachObjectUrlRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  const canContinueStep1 = useMemo(() => {
    return title.trim().length >= 2 && songName.trim().length >= 2 && Boolean(styleSlug) && Boolean(difficulty);
  }, [difficulty, songName, styleSlug, title]);

  const canContinueStep2 = useMemo(() => {
    return Boolean(performanceMedia.uploadedUrl && teachMedia.uploadedUrl);
  }, [performanceMedia.uploadedUrl, teachMedia.uploadedUrl]);

  const currentStepLabel = step === 1 ? "Basic Info" : step === 2 ? "Upload Videos" : "Publish";

  const updateMedia = useCallback((role: MediaRole, patch: Partial<ReturnType<typeof getBlankMediaState>>) => {
    if (role === "performance") {
      setPerformanceMedia((current) => ({ ...current, ...patch }));
      return;
    }
    setTeachMedia((current) => ({ ...current, ...patch }));
  }, []);

  const revokeObjectUrl = useCallback((role: MediaRole) => {
    const ref = role === "performance" ? performanceObjectUrlRef : teachObjectUrlRef;
    if (ref.current) {
      URL.revokeObjectURL(ref.current);
      ref.current = null;
    }
  }, []);

  const handlePickFile = useCallback(
    async (role: MediaRole, file: File) => {
      setError("");
      revokeObjectUrl(role);
      const objectUrl = URL.createObjectURL(file);
      if (role === "performance") {
        performanceObjectUrlRef.current = objectUrl;
        updateMedia(role, {
          fileName: file.name,
          previewUrl: objectUrl,
          uploadedUrl: "",
          progress: 4,
          uploading: true,
          error: "",
        });
      } else {
        teachObjectUrlRef.current = objectUrl;
        updateMedia(role, {
          fileName: file.name,
          previewUrl: objectUrl,
          uploadedUrl: "",
          progress: 4,
          uploading: true,
          error: "",
        });
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userId = user?.id || "anon";
        const path = `${userId}/${draftId || "draft"}/${role}-${Date.now()}-${cleanFileName(file.name)}`;

        const signedResponse = await fetch("/api/storage/signed-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket: STORAGE_BUCKET, path, upsert: false }),
        });
        const signedJson = await signedResponse.json().catch(() => ({}));
        if (!signedResponse.ok || !signedJson?.signedUrl) {
          throw new Error(String(signedJson?.error || "Failed to create upload URL"));
        }

        updateMedia(role, { progress: 14 });
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signedJson.signedUrl, true);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const value = Math.max(10, Math.min(95, Math.round((event.loaded / event.total) * 100)));
            updateMedia(role, { progress: value });
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
              return;
            }
            reject(new Error(`Upload failed with status ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(file);
        });

        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(signedJson.path || path);
        const publicUrl = data?.publicUrl || "";
        revokeObjectUrl(role);
        updateMedia(role, {
          uploadedUrl: publicUrl,
          previewUrl: publicUrl || objectUrl,
          progress: 100,
          uploading: false,
          error: "",
        });
        setStatus(role === "performance" ? "Performance video ready" : "Teach video ready");
      } catch (uploadError) {
        console.error(uploadError);
        updateMedia(role, {
          progress: 0,
          uploading: false,
          error: "Upload failed. Try again or check your connection.",
        });
        setError("One of the video uploads failed.");
      }
    },
    [draftId, revokeObjectUrl, updateMedia]
  );

  const clearMedia = useCallback(
    (role: MediaRole) => {
      revokeObjectUrl(role);
      if (role === "performance") {
        setPerformanceMedia(getBlankMediaState());
      } else {
        setTeachMedia(getBlankMediaState());
      }
    },
    [revokeObjectUrl]
  );

  const hydrateDraft = useCallback(
    (draft: DraftShape) => {
      setDraftId(draft.id);
      setTitle(draft.title || "");
      setSongName(draft.song_name || "");
      setStyleSlug((draft.style_slug as StyleSlug) || "bollywood");
      setDifficulty((draft.difficulty as Difficulty) || "beginner");
      setThumbnailUrl(draft.thumbnail_url || "");
      setDescription(draft.description || "");
      const performanceUrl = draft.performance_video_url || draft.video_url || "";
      const teachUrl = draft.teach_video_url || "";
      setPerformanceMedia({
        fileName: performanceUrl ? "Performance video" : "",
        previewUrl: performanceUrl,
        uploadedUrl: performanceUrl,
        progress: performanceUrl ? 100 : 0,
        uploading: false,
        error: "",
      });
      setTeachMedia({
        fileName: teachUrl ? "Teach video" : "",
        previewUrl: teachUrl,
        uploadedUrl: teachUrl,
        progress: teachUrl ? 100 : 0,
        uploading: false,
        error: "",
      });
      setStep(performanceUrl && teachUrl ? 3 : performanceUrl ? 2 : 1);
      setStatus("Draft loaded");
    },
    []
  );

  useEffect(() => {
    let active = true;

    async function loadDraft() {
      setLoadingDraft(true);
      try {
        const draftParam = searchParams.get("draft");
        let draft: DraftShape | null = null;

        if (draftParam) {
          const response = await fetch(`/api/choreos/submissions?id=${encodeURIComponent(draftParam)}`, { cache: "no-store" });
          const payload = await response.json().catch(() => ({}));
          draft = (payload?.draft || payload?.submission || null) as DraftShape | null;
        } else {
          const response = await fetch("/api/choreos/submissions?latest=1&status=draft", { cache: "no-store" });
          const payload = await response.json().catch(() => ({}));
          draft = (payload?.draft || null) as DraftShape | null;
        }

        if (!active) return;
        if (draft) hydrateDraft(draft);
      } catch (loadError) {
        console.error(loadError);
      } finally {
        if (active) {
          setLoadingDraft(false);
          hydratedRef.current = true;
        }
      }
    }

    void loadDraft();
    return () => {
      active = false;
    };
  }, [hydrateDraft, searchParams]);

  useEffect(() => {
    return () => {
      revokeObjectUrl("performance");
      revokeObjectUrl("teach");
    };
  }, [revokeObjectUrl]);

  const buildPayload = useCallback(
    (publishNow: boolean) => ({
      id: draftId || undefined,
      title: title.trim(),
      songName: songName.trim(),
      description: description.trim(),
      caption: "",
      videoUrl: performanceMedia.uploadedUrl || "",
      performanceVideoUrl: performanceMedia.uploadedUrl || "",
      teachVideoUrl: teachMedia.uploadedUrl || "",
      styleSlug,
      difficulty,
      lessonParts: [],
      hashtags: [],
      musicCredit: songName.trim(),
      thumbnailUrl: thumbnailUrl.trim(),
      slowMoMarkers: [],
      trimStartSeconds: 0,
      trimEndSeconds: 0,
      captionOverlays: [],
      videoDurationSeconds: 0,
      accessType: "free" as const,
      priceInr: 0,
      subscriptionTier: "",
      publishNow,
    }),
    [description, difficulty, draftId, performanceMedia.previewUrl, performanceMedia.uploadedUrl, songName, styleSlug, teachMedia.previewUrl, teachMedia.uploadedUrl, thumbnailUrl, title]
  );

  const persistDraft = useCallback(async () => {
    if (!title.trim() && !songName.trim() && !performanceMedia.uploadedUrl && !teachMedia.uploadedUrl) {
      setStatus("Add a title or video to save a draft");
      return null;
    }

    setSavingDraft(true);
    setError("");
    try {
      const payload = buildPayload(false);
      const response = await patchChoreographySubmission(payload);
      const nextDraftId = response?.draft?.id || draftId;
      if (nextDraftId) setDraftId(nextDraftId);
      setStatus("Draft saved");
      return nextDraftId || null;
    } catch (draftError: any) {
      console.error(draftError);
      setError(draftError?.message || "Could not save draft");
      return null;
    } finally {
      setSavingDraft(false);
    }
  }, [buildPayload, draftId, performanceMedia.uploadedUrl, songName, teachMedia.uploadedUrl, title]);

  const publish = useCallback(async () => {
    if (!title.trim() || !songName.trim() || !performanceMedia.uploadedUrl || !teachMedia.uploadedUrl) {
      setError("Add the title, song, and both videos before publishing.");
      return;
    }

    setPublishing(true);
    setError("");
    setStatus("Publishing choreography...");

    try {
      const payload = buildPayload(true);
      const response = await postChoreographySubmission(payload);
      const submission = response?.submission;
      const nextId = submission?.id || draftId;
      if (nextId) setPublishedId(nextId);
      setStatus("Published");
      if (nextId) {
        router.replace(`/creator/choreos`);
      }
    } catch (publishError: any) {
      console.error(publishError);
      setError(publishError?.message || "Could not publish choreography");
      setStatus("Publish failed");
    } finally {
      setPublishing(false);
    }
  }, [buildPayload, draftId, performanceMedia.uploadedUrl, router, songName, teachMedia.uploadedUrl, title]);

  const currentThumbnail = thumbnailUrl.trim();
  const previewPerformance = performanceMedia.uploadedUrl || performanceMedia.previewUrl;
  const previewTeach = teachMedia.uploadedUrl || teachMedia.previewUrl;

  if (loadingDraft) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#18120f_0%,#0b0b0b_45%,#050505_100%)] px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-zinc-300">
          Loading creator upload...
        </div>
      </main>
    );
  }

  if (publishedId) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#18120f_0%,#0b0b0b_45%,#050505_100%)] px-4 py-10 text-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-[#F3B2AB]">Published</p>
          <h1 className="text-3xl font-black">Your choreography is live.</h1>
          <p className="text-sm text-zinc-300">The new upload flow stays focused on publishing choreography only. Advanced editing can happen after publish.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/creator/choreos" className="rounded-full bg-[#F3B2AB] px-4 py-2 text-xs font-bold text-black">
              View in Creator Studio
            </Link>
            <Link href={`/learn/${publishedId}`} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              Open Learn Preview
            </Link>
            <Link href="/creator/upload" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              Publish Another
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1a120f_0%,#0c0c0d_52%,#050505_100%)] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-start justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F3B2AB]">Creator Upload</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Publish choreography in under 60 seconds.</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-300">
              Fast, mobile-first, creator-only publishing. No AI practice. No recording studio. Just the choreography you want to share.
            </p>
          </div>
          <Link href="/creator/choreos" className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white sm:inline-flex">
            Back to Studio
          </Link>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {([1, 2, 3] as Step[]).map((item) => {
            const active = item === step;
            const done = item < step;
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (item <= step || (item === 2 && canContinueStep1) || (item === 3 && canContinueStep2)) {
                    setStep(item);
                  }
                }}
                className={`flex-1 rounded-full px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  active
                    ? "bg-[#F3B2AB] text-black"
                    : done
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-transparent text-zinc-500"
                }`}
              >
                {item === 1 ? "Basic Info" : item === 2 ? "Upload Videos" : "Publish"}
              </button>
            );
          })}
        </div>

        <div className="mb-4 flex items-center justify-between rounded-full border border-white/10 bg-black/30 px-4 py-3 text-xs text-zinc-400">
          <span>Step {step} of 3</span>
          <span>{currentStepLabel}</span>
        </div>

        {error ? <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{error}</div> : null}
        <div className="mb-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-zinc-400">
          {status}
          {savingDraft ? <span className="ml-2 text-zinc-500">Saving draft...</span> : null}
          {publishing ? <span className="ml-2 text-zinc-500">Publishing...</span> : null}
        </div>

        {step === 1 && (
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-6">
              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Dance Title</label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Midnight Monsoon"
                    className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-base text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-[#F3B2AB]/40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Song Name</label>
                  <input
                    value={songName}
                    onChange={(event) => setSongName(event.target.value)}
                    placeholder="Song title or track name"
                    className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-base text-white outline-none placeholder:text-zinc-600 focus:border-[#F3B2AB]/40"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Dance Style</label>
                    <div className="grid gap-2">
                      {STYLE_OPTIONS.map((option) => {
                        const selected = styleSlug === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setStyleSlug(option.value)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              selected ? "border-[#F3B2AB]/40 bg-[#F3B2AB]/10" : "border-white/10 bg-black/25 hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-white">{option.label}</span>
                              <span>{option.emoji}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Difficulty</label>
                    <div className="grid gap-2">
                      {DIFFICULTY_OPTIONS.map((option) => {
                        const selected = difficulty === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setDifficulty(option.value)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              selected ? "border-[#F3B2AB]/40 bg-[#F3B2AB]/10" : "border-white/10 bg-black/25 hover:bg-white/[0.04]"
                            }`}
                          >
                            <p className="text-sm font-semibold text-white">{option.label}</p>
                            <p className="text-xs text-zinc-500">{option.subtitle}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <details
                  open={advancedOpen}
                  onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
                  className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4"
                >
                  <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
                    Advanced Options
                  </summary>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">Thumbnail URL or upload later</label>
                      <input
                        value={thumbnailUrl}
                        onChange={(event) => setThumbnailUrl(event.target.value)}
                        placeholder="Optional thumbnail link"
                        className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#F3B2AB]/40"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">Short note</label>
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={3}
                        placeholder="Optional internal note or description"
                        className="w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#F3B2AB]/40"
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Preview Summary</p>
              <div className="mt-4 space-y-3 rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Dance Title</p>
                  <p className="mt-1 text-lg font-semibold text-white">{title || "Untitled"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Song</p>
                  <p className="mt-1 text-sm text-zinc-300">{songName || "Not set"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Style</p>
                    <p className="mt-1 text-sm font-semibold text-white">{getStyleLabel(styleSlug)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Difficulty</p>
                    <p className="mt-1 text-sm font-semibold text-white">{getDifficultyLabel(difficulty)}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Thumbnail</p>
                  <p className="mt-1 break-all text-sm text-zinc-300">{thumbnailUrl || "Optional"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canContinueStep1}
                className="mt-4 w-full rounded-2xl bg-[#F3B2AB] px-4 py-4 text-xs font-black uppercase tracking-[0.24em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
              <p className="mt-3 text-center text-[11px] text-zinc-500">Keep it lean. All advanced editing happens after publish.</p>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="grid gap-4">
            <UploadCard
              title="Performance Video"
              subtitle="Show the full choreography"
              helper="This video appears in learner feed and reels."
              mediaUrl={previewPerformance}
              fileName={performanceMedia.fileName}
              progress={performanceMedia.progress}
              uploading={performanceMedia.uploading}
              error={performanceMedia.error}
              onPickFile={(file) => void handlePickFile("performance", file)}
              onClear={() => clearMedia("performance")}
            />

            <UploadCard
              title="Teach This Dance"
              subtitle="Teach step-by-step for learners"
              helper="This video is used inside Learn Mode."
              mediaUrl={previewTeach}
              fileName={teachMedia.fileName}
              progress={teachMedia.progress}
              uploading={teachMedia.uploading}
              error={teachMedia.error}
              onPickFile={(file) => void handlePickFile("teach", file)}
              onClear={() => clearMedia("teach")}
            />

            <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canContinueStep2}
                className="rounded-full bg-[#F3B2AB] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Preview</p>
              <h2 className="mt-2 text-2xl font-black text-white">Check the final post</h2>
              <p className="mt-2 text-sm text-zinc-400">Thumbnail, title, and both videos are shown exactly as the learner will see them.</p>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30">
                <div className="aspect-[9/10] bg-black">
                  {currentThumbnail ? (
                    <img src={currentThumbnail} alt="Thumbnail preview" className="h-full w-full object-cover" />
                  ) : previewPerformance ? (
                    <video src={previewPerformance} controls playsInline muted className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-zinc-500">No thumbnail yet</div>
                  )}
                </div>
                <div className="space-y-4 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Title</p>
                    <p className="mt-1 text-xl font-semibold text-white">{title || "Untitled"}</p>
                    <p className="mt-1 text-sm text-zinc-400">{songName || "Song not set"}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Performance preview</p>
                      {previewPerformance ? (
                        <video src={previewPerformance} controls playsInline muted className="mt-2 aspect-video w-full rounded-xl bg-black object-cover" />
                      ) : (
                        <p className="mt-2 text-xs text-zinc-500">Missing</p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Teach preview</p>
                      {previewTeach ? (
                        <video src={previewTeach} controls playsInline muted className="mt-2 aspect-video w-full rounded-xl bg-black object-cover" />
                      ) : (
                        <p className="mt-2 text-xs text-zinc-500">Missing</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Ready to publish</p>
              <div className="mt-4 space-y-3 rounded-[1.5rem] border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">Dance Title</span>
                  <span className="text-right text-white">{title || "Untitled"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">Song</span>
                  <span className="text-right text-white">{songName || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">Style</span>
                  <span className="text-right text-white">{getStyleLabel(styleSlug)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">Difficulty</span>
                  <span className="text-right text-white">{getDifficultyLabel(difficulty)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">Thumbnail</span>
                  <span className="max-w-[55%] truncate text-right text-white">{currentThumbnail ? "Ready" : "Optional"}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => void persistDraft()}
                  disabled={savingDraft || publishing}
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingDraft ? "Saving Draft..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => void publish()}
                  disabled={savingDraft || publishing || !canContinueStep2}
                  className="rounded-2xl bg-[#F3B2AB] px-4 py-4 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {publishing ? "Publishing..." : "Publish"}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3 text-xs text-zinc-500">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-zinc-300 hover:text-white"
                >
                  Back to uploads
                </button>
                <Link href="/creator/choreos" className="text-zinc-300 hover:text-white">
                  Creator Studio
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
