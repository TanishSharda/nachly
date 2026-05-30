"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UploadWizard from "@/components/dashboard/UploadWizard";
import VideoUploadZone from "@/components/dashboard/VideoUploadZone";
import LessonBuilder from "@/components/dashboard/LessonBuilder";
import HashtagInput from "@/components/dashboard/HashtagInput";
import TrimTimeline from "@/components/dashboard/TrimTimeline";
import ThumbnailPicker from "@/components/dashboard/ThumbnailPicker";
import CaptionEditor, { type CaptionOverlay } from "@/components/dashboard/CaptionEditor";
import SlowMoTimeline, { type SlowMoMarker } from "@/components/dashboard/SlowMoTimeline";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import {
  getChoreographySubmissions,
  getChoreographySubmission,
  patchChoreographySubmission,
  postChoreographySubmission,
  deleteChoreographySubmission,
} from "@/lib/api/choreos";

type Style = "hip-hop" | "bhangra" | "kathak" | "zumba" | "bollywood" | "contemporary";
type Difficulty = "beginner" | "intermediate" | "advanced";

interface LessonPart { id: string; label: string; startTime: string; endTime: string; description: string; }

interface DraftRecord {
  id: string;
  title: string;
  description: string;
  caption: string | null;
  video_url: string;
  style_slug: Style;
  difficulty: Difficulty;
  access_type?: "free" | "ppv" | "subscription";
  price_inr?: number | null;
  subscription_tier?: string | null;
  lesson_parts?: LessonPart[];
  hashtags?: string[];
  music_credit?: string | null;
  thumbnail_url?: string | null;
  slow_mo_markers?: SlowMoMarker[];
  trim_start_seconds?: number | null;
  trim_end_seconds?: number | null;
  caption_overlays?: CaptionOverlay[];
  video_duration_seconds?: number | null;
  updated_at?: string;
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds)) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function parseTimecode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (Number.isNaN(minutes) || Number.isNaN(seconds) || seconds > 59) return null;
  return minutes * 60 + seconds;
}

const styleOptions: { value: Style; label: string }[] = [
  { value: "hip-hop", label: "Hip Hop" },
  { value: "bhangra", label: "Bhangra" },
  { value: "kathak", label: "Kathak" },
  { value: "zumba", label: "Zumba" },
  { value: "bollywood", label: "Bollywood" },
  { value: "contemporary", label: "Contemporary" },
];

const WIZARD_STEPS = [
  { label: "Upload Video" },
  { label: "Trim & Preview" },
  { label: "Lesson Structure" },
  { label: "Details & Tags" },
  { label: "Thumbnail" },
  { label: "Captions" },
  { label: "Slow-Mo Markers" },
  { label: "Preview" },
  { label: "Publish" },
];

function NavButtons({ hideNext, goBack, goNext, step, canNext }: { hideNext?: boolean; goBack: () => void; goNext: () => void; step: number; canNext: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button data-testid="nav-back" type="button" onClick={goBack} disabled={step === 1} className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-30">
        ← Back
      </button>
      {!hideNext && (
        <button data-testid="nav-next" type="button" onClick={goNext} disabled={!canNext} className="rounded-xl bg-gradient-to-r from-[#F3B2AB] to-[#D88B80] px-5 py-2.5 text-xs font-bold text-[#0a0a0a] transition hover:brightness-110 disabled:opacity-40">
          Next →
        </button>
      )}
    </div>
  );
}

export default function UploadChoreoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const draftSaveTimer = useRef<number | null>(null);

  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftTitleInput, setDraftTitleInput] = useState("");
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // Step 1: Video
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadWarning, setUploadWarning] = useState("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  // Step 2: Trim
  const [trimStartSeconds, setTrimStartSeconds] = useState(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState(0);
  // Step 3: Lessons
  const [lessonParts, setLessonParts] = useState<LessonPart[]>([]);
  // Step 4: Metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [styleSlug, setStyleSlug] = useState<Style>("hip-hop");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [musicCredit, setMusicCredit] = useState("");
  const [accessType, setAccessType] = useState<"free" | "ppv" | "subscription">("free");
  const [priceInr, setPriceInr] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState("");
  // Step 5: Thumbnail
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  // Step 6: Captions
  const [captionOverlays, setCaptionOverlays] = useState<CaptionOverlay[]>([]);
  // Step 7: Slow-mo
  const [slowMoMarkers, setSlowMoMarkers] = useState<SlowMoMarker[]>([]);
  // Step 8: Preview
  const [previewTab, setPreviewTab] = useState<"feed" | "learn">("feed");
  // Checklist
  const [fullBody, setFullBody] = useState(false);
  const [stableCam, setStableCam] = useState(false);
  const [goodLight, setGoodLight] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; status: string; tier: string; message: string } | null>(null);

  const creatorWizardKey = "naachly_creator_wizard_preset";
  const isLocalVideo = videoUrl.startsWith("blob:");
  const canSaveDraft =
    videoUrl.trim().length > 0 &&
    !isLocalVideo &&
    title.trim().length >= 2 &&
    description.trim().length >= 10;

  const applyDraft = useCallback((draft: DraftRecord) => {
    const normalizedMarkers = (draft.slow_mo_markers || []).map((marker) => ({
      id: marker.id || Math.random().toString(36).slice(2, 9),
      label: marker.label || "Section",
      startSeconds: Number((marker as any).startSeconds ?? (marker as any).start ?? 0),
      endSeconds: Number((marker as any).endSeconds ?? (marker as any).end ?? 0),
    }));
    setDraftId(draft.id);
    setTitle(draft.title || "");
    setDescription(draft.description || "");
    setVideoUrl(draft.video_url || "");
    setStyleSlug(draft.style_slug || "hip-hop");
    setDifficulty(draft.difficulty || "beginner");
    setAccessType(draft.access_type || "free");
    setPriceInr(draft.price_inr || 0);
    setSubscriptionTier(draft.subscription_tier || "");
    setLessonParts(draft.lesson_parts || []);
    setHashtags(draft.hashtags || []);
    setMusicCredit(draft.music_credit || "");
    setThumbnailUrl(draft.thumbnail_url || "");
    setSlowMoMarkers(normalizedMarkers);
    setCaptionOverlays(draft.caption_overlays || []);
    setVideoDurationSeconds(draft.video_duration_seconds || 0);
    setTrimStartSeconds(draft.trim_start_seconds || 0);
    setTrimEndSeconds(draft.trim_end_seconds || draft.video_duration_seconds || 0);
    setLastSavedAt(draft.updated_at || new Date().toISOString());
  }, []);

  const buildDraftPayload = useCallback((draft: DraftRecord, overrides?: Partial<DraftRecord>) => {
    const merged = { ...draft, ...overrides };
    return {
      id: merged.id,
      title: merged.title || "Untitled draft",
      description: merged.description || "Draft description",
      caption: merged.caption || "",
      videoUrl: merged.video_url,
      styleSlug: merged.style_slug || "hip-hop",
      captionOverlays: merged.caption_overlays || [],
      videoDurationSeconds: merged.video_duration_seconds || 0,
    };
  }, []);

  const resetDraft = useCallback(() => {
    setDraftId(null);
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setVideoFile(null);
    setStyleSlug("hip-hop");
    setDifficulty("beginner");
    setAccessType("free");
    setPriceInr(0);
    setSubscriptionTier("");
    setLessonParts([]);
    setHashtags([]);
    setMusicCredit("");
    setThumbnailUrl("");
    setSlowMoMarkers([]);
    setCaptionOverlays([]);
    setVideoDurationSeconds(0);
    setTrimStartSeconds(0);
    setTrimEndSeconds(0);
    setLastSavedAt(null);
    setEditingDraftId(null);
    setDraftTitleInput("");
    setDeletingDraftId(null);
    setStep(1);
  }, []);

  const loadDrafts = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setDraftsLoading(true);
    setDraftError("");
    try {
      const submissions = await getChoreographySubmissions();
      setDrafts(submissions || []);
    } catch {
      setDraftError("Failed to load drafts");
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  const loadLatestDraft = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setDraftsLoading(true);
    setDraftError("");
    try {
      const submissions = await getChoreographySubmissions();
      setDrafts(submissions || []);
      if (submissions && submissions.length > 0) {
        const latest = submissions[0];
        applyDraft(latest);
        setDraftId(latest.id);
      }
    } catch {
      setDraftError("Failed to load latest draft");
    } finally {
      setDraftsLoading(false);
    }
  }, [applyDraft]);

  const loadDraftById = useCallback(async (id: string) => {
    if (!isSupabaseConfigured() || !id) return;
    setDraftsLoading(true);
    setDraftError("");
    try {
      const draft = await getChoreographySubmission(id);
      if (draft) {
        applyDraft(draft);
        setDraftId(draft.id);
      }
    } catch {
      setDraftError("Failed to load draft");
    } finally {
      setDraftsLoading(false);
    }
  }, [applyDraft]);

  const startRenameDraft = useCallback((draft: DraftRecord) => {
    setEditingDraftId(draft.id);
    setDraftTitleInput(draft.title || "");
  }, []);

  const cancelRenameDraft = useCallback(() => {
    setEditingDraftId(null);
    setDraftTitleInput("");
  }, []);

  const submitRenameDraft = useCallback(async (draft: DraftRecord) => {
    if (!isSupabaseConfigured()) return;
    const nextTitle = draftTitleInput.trim();
    if (!nextTitle) return;
    try {
      await patchChoreographySubmission(buildDraftPayload(draft, { title: nextTitle }));
      setDrafts((prev) => prev.map((item) => (item.id === draft.id ? { ...item, title: nextTitle } : item)));
      cancelRenameDraft();
    } catch {
      setDraftError("Could not rename draft");
    }
  }, [buildDraftPayload, cancelRenameDraft, draftTitleInput]);

  const deleteDraft = useCallback(async (draft: DraftRecord) => {
    if (!isSupabaseConfigured()) return;
    const confirmDelete = window.confirm("Delete this draft? This cannot be undone.");
    if (!confirmDelete) return;
    setDeletingDraftId(draft.id);
    try {
      await deleteChoreographySubmission(draft.id);
      setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
      if (draftId === draft.id) resetDraft();
    } catch {
      setDraftError("Could not delete draft");
    } finally {
      setDeletingDraftId(null);
    }
  }, [draftId, resetDraft]);

  const uploadVideoToSupabase = useCallback(async () => {
    if (!videoFile) return;
    if (!isSupabaseConfigured()) {
      setUploadWarning('Supabase not configured');
      return;
    }
    setUploadingVideo(true);
    setUploadProgress(0);
    setUploadWarning("");
    try {
      setUploadProgress(10);

      // generate file path (client-side deterministic)
      const timestamp = Date.now();
      const safeFileName = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const userInfo = await fetch('/api/auth/user', { cache: 'no-store' }).then((r) => r.json().catch(() => ({})));
      const userId = (userInfo?.user?.id) || 'anon';
      const filePath = `${userId}/${draftId || 'draft'}/${timestamp}-${safeFileName}`;

      // Request a server-signed upload URL (server uses service role key)
      const signRes = await fetch('/api/storage/signed-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, bucket: 'choreographer-uploads', upsert: false }),
      }).then((r) => r.json());

      if (!signRes?.ok || !signRes?.signedUrl) {
        throw new Error(String(signRes?.error || 'Failed to obtain signed upload URL'));
      }

      setUploadProgress(25);

      // Upload the file to the signed URL
      const putResp = await fetch(signRes.signedUrl, {
        method: 'PUT',
        body: videoFile,
        headers: { 'Content-Type': videoFile.type },
      });

      if (!putResp.ok) {
        throw new Error('Upload failed');
      }

      setUploadProgress(70);

      // Obtain a public or signed download URL for the uploaded object
      const publicRes = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, bucket: 'choreographer-uploads', expires: 60 }),
      }).then((r) => r.json());

      const uploadedUrl = String(publicRes?.url || '');
      if (uploadedUrl) {
        setVideoUrl(uploadedUrl);
        setVideoFile(null);
        setUploadProgress(100);
      } else {
        throw new Error('Upload succeeded but URL was not returned');
      }
    } catch (err: any) {
      const reason = err?.message ? ` (${err.message})` : "";
      setUploadWarning(`Video upload failed. Check storage configuration and permissions.${reason}`);
    } finally {
      setUploadingVideo(false);
    }
  }, [videoFile, draftId]);

  const uploadThumbnailToSupabase = useCallback(async (dataUrl: string) => {
    if (!isSupabaseConfigured()) {
      setUploadWarning('Supabase not configured');
      return;
    }
    setThumbnailUploading(true);
    setUploadWarning("");
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `thumbnail-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const timestamp = Date.now();
      const userInfo = await fetch('/api/auth/user', { cache: 'no-store' }).then((r) => r.json().catch(() => ({})));
      const userId = (userInfo?.user?.id) || 'anon';
      const filePath = `${userId}/${draftId || 'draft'}/${timestamp}-thumbnail.jpg`;

      const signRes = await fetch('/api/storage/signed-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, bucket: 'choreographer-uploads', upsert: false }),
      }).then((r) => r.json());

      if (!signRes?.ok || !signRes?.signedUrl) {
        throw new Error(String(signRes?.error || 'Failed to obtain signed upload URL'));
      }

      const putResp = await fetch(signRes.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!putResp.ok) {
        throw new Error('Thumbnail upload failed');
      }

      const publicRes = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, bucket: 'choreographer-uploads', expires: 60 }),
      }).then((r) => r.json());

      const uploadedUrl = String(publicRes?.url || '');
      if (uploadedUrl) {
        setThumbnailUrl(uploadedUrl);
      } else {
        throw new Error('Thumbnail upload succeeded but URL was not returned');
      }
    } catch (err: any) {
      const reason = err?.message ? ` (${err.message})` : "";
      setUploadWarning(`Thumbnail upload failed. Check storage configuration and permissions.${reason}`);
    } finally {
      setThumbnailUploading(false);
    }
  }, [draftId]);

  useEffect(() => {
    setTimeout(() => {
      loadDrafts();
      loadLatestDraft();
    }, 0);
  }, [loadDrafts, loadLatestDraft]);

  useEffect(() => {
    const draftParam = searchParams.get("draft");
    if (draftParam) {
      setTimeout(() => loadDraftById(draftParam), 0);
    }
  }, [searchParams, loadDraftById]);

  useEffect(() => {
    if (draftId || videoUrl) return;

    const loadWizardPreset = async () => {
      try {
        // First try to fetch from server
        const response = await fetch("/api/choreographer/wizard-preset");
        const data = await response.json();

        if (data.preset) {
          setTitle(data.preset.title);
          setDescription(data.preset.description);
          setStyleSlug(data.preset.styleSlug);
          setDifficulty(data.preset.difficulty);
          setAccessType(data.preset.accessType);
          // Clear localStorage since we got it from the server
          try {
            localStorage.removeItem(creatorWizardKey);
          } catch {
            // Ignore
          }
          return;
        }
      } catch {
        // Fall back to localStorage if server request fails
      }

      // Fall back to localStorage
      try {
        const raw = localStorage.getItem(creatorWizardKey);
        if (!raw) return;

        const preset = JSON.parse(raw) as {
          title?: string;
          description?: string;
          styleSlug?: Style;
          difficulty?: Difficulty;
          accessType?: "free" | "ppv" | "subscription";
        };

        if (preset.title) setTitle(preset.title);
        if (preset.description) setDescription(preset.description);
        if (preset.styleSlug) setStyleSlug(preset.styleSlug);
        if (preset.difficulty) setDifficulty(preset.difficulty);
        if (preset.accessType) setAccessType(preset.accessType);
      } catch {
        // Ignore wizard preset restore failures.
      }
    };

    void loadWizardPreset();
  }, [draftId, videoUrl]);

  useEffect(() => {
    if (draftId || videoUrl) return;
    try {
      const raw = localStorage.getItem("naachly_upload_draft_local");
      if (!raw) return;
      const payload = JSON.parse(raw) as {
        title?: string;
        description?: string;
        videoUrl?: string;
        styleSlug?: Style;
        difficulty?: Difficulty;
        lessonParts?: LessonPart[];
        hashtags?: string[];
        musicCredit?: string;
        accessType?: "free" | "ppv" | "subscription";
        priceInr?: number;
        subscriptionTier?: string;
        thumbnailUrl?: string;
        slowMoMarkers?: SlowMoMarker[];
        trimStartSeconds?: number;
        trimEndSeconds?: number;
        captionOverlays?: CaptionOverlay[];
        videoDurationSeconds?: number;
      };
      if (!payload.videoUrl) return;
      setTimeout(() => {
        setTitle(payload.title || "");
        setDescription(payload.description || "");
        setVideoUrl(payload.videoUrl || "");
        setStyleSlug(payload.styleSlug || "hip-hop");
        setDifficulty(payload.difficulty || "beginner");
        setLessonParts(payload.lessonParts || []);
        setHashtags(payload.hashtags || []);
        setMusicCredit(payload.musicCredit || "");
        setAccessType(payload.accessType || "free");
        setPriceInr(payload.priceInr || 0);
        setSubscriptionTier(payload.subscriptionTier || "");
        setThumbnailUrl(payload.thumbnailUrl || "");
      }, 0);
      const normalizedMarkers = (payload.slowMoMarkers || []).map((marker) => ({
        id: marker.id || Math.random().toString(36).slice(2, 9),
        label: marker.label || "Section",
        startSeconds: Number((marker as any).startSeconds ?? (marker as any).start ?? 0),
        endSeconds: Number((marker as any).endSeconds ?? (marker as any).end ?? 0),
      }));
      setTimeout(() => {
        setSlowMoMarkers(normalizedMarkers);
        setCaptionOverlays(payload.captionOverlays || []);
        setVideoDurationSeconds(payload.videoDurationSeconds || 0);
        setTrimStartSeconds(payload.trimStartSeconds || 0);
        setTrimEndSeconds(payload.trimEndSeconds || payload.videoDurationSeconds || 0);
      }, 0);
    } catch {
      // Ignore local draft restore failures.
    }
  }, [draftId, videoUrl]);

  useEffect(() => {
    const payload = {
      title,
      description,
      videoUrl,
      styleSlug,
      difficulty,
      lessonParts,
      hashtags,
      musicCredit,
      accessType,
      priceInr,
      subscriptionTier,
      thumbnailUrl,
      slowMoMarkers,
      trimStartSeconds,
      trimEndSeconds,
      captionOverlays,
      videoDurationSeconds,
    };
    try {
      localStorage.setItem("naachly_upload_draft_local", JSON.stringify(payload));
    } catch {
      // Ignore localStorage failures.
    }
  }, [title, description, videoUrl, styleSlug, difficulty, lessonParts, hashtags, musicCredit, accessType, priceInr, subscriptionTier, thumbnailUrl, slowMoMarkers, trimStartSeconds, trimEndSeconds, captionOverlays, videoDurationSeconds]);
  const saveDraft = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setSavingDraft(true);
    setDraftError("");
    try {
      const payload = {
        id: draftId || undefined,
        title: title.trim() || "Untitled draft",
        description: description.trim() || "",
        video_url: videoUrl.trim(),
        style_slug: styleSlug,
        difficulty,
        caption_overlays: captionOverlays,
        slow_mo_markers: slowMoMarkers,
        trim_start_seconds: trimStartSeconds || null,
        trim_end_seconds: trimEndSeconds || null,
        video_duration_seconds: videoDurationSeconds || null,
        hashtags,
        thumbnail_url: thumbnailUrl || null,
      } as Partial<DraftRecord>;

      if (draftId) {
        await patchChoreographySubmission(payload as DraftRecord);
      } else {
        const res = await postChoreographySubmission(payload as DraftRecord);
        if (res?.submission?.id) setDraftId(res.submission.id);
      }

      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setDraftError("Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  }, [draftId, title, description, videoUrl, styleSlug, difficulty, captionOverlays, slowMoMarkers, trimStartSeconds, trimEndSeconds, videoDurationSeconds, hashtags, thumbnailUrl]);

  useEffect(() => {
    if (!canSaveDraft) return;
    if (draftSaveTimer.current) window.clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = window.setTimeout(() => {
      saveDraft();
    }, 900);
    return () => {
      if (draftSaveTimer.current) window.clearTimeout(draftSaveTimer.current);
    };
  }, [canSaveDraft, saveDraft]);

  useEffect(() => {
    if (videoDurationSeconds > 0 && trimEndSeconds === 0) {
      setTimeout(() => setTrimEndSeconds(videoDurationSeconds), 0);
    }
  }, [videoDurationSeconds, trimEndSeconds]);

  const trimValid = useMemo(() => {
    if (!videoDurationSeconds) return true;
    return trimEndSeconds > trimStartSeconds + 0.5;
  }, [videoDurationSeconds, trimStartSeconds, trimEndSeconds]);

  function computeLessonValidation(parts: LessonPart[]) {
    if (parts.length === 0) return { isValid: true, message: "" };
    for (const part of parts) {
      if (part.label.trim().length < 2) {
        return { isValid: false, message: "Each lesson part needs a label (2+ characters)." };
      }
      const start = parseTimecode(part.startTime);
      const end = parseTimecode(part.endTime);
      if (start === null || end === null) {
        return { isValid: false, message: "Lesson timestamps must be in mm:ss format." };
      }
      if (end <= start) {
        return { isValid: false, message: "Lesson part end time must be after the start time." };
      }
    }
    return { isValid: true, message: "" };
  }
  const lessonValidation = computeLessonValidation(lessonParts);

  const monetizationValidation = useMemo(() => {
    if (accessType === "ppv") {
      if (!Number.isFinite(priceInr) || priceInr < 99) {
        return { isValid: false, message: "One-time price must be at least ₹99." };
      }
    }
    if (accessType === "subscription") {
      if (!subscriptionTier.trim()) {
        return { isValid: false, message: "Select a subscription tier for this routine." };
      }
    }
    return { isValid: true, message: "" };
  }, [accessType, priceInr, subscriptionTier]);

  function computeCaptionValidation(overlays: CaptionOverlay[]) {
    if (overlays.length === 0) return { isValid: true, message: "" };
    if (overlays.length > 20) {
      return { isValid: false, message: "Limit captions to 20 overlays." };
    }
    for (const caption of overlays) {
      if (caption.text.trim().length === 0) {
        return { isValid: false, message: "Caption text cannot be empty." };
      }
      if (caption.text.length > 120) {
        return { isValid: false, message: "Caption text must be under 120 characters." };
      }
      const time = parseTimecode(caption.timecode);
      if (time === null) {
        return { isValid: false, message: "Caption timecodes must be in mm:ss format." };
      }
    }
    return { isValid: true, message: "" };
  }
  const captionValidation = computeCaptionValidation(captionOverlays);

  const canNext = useMemo(() => {
    if (step === 1) return videoUrl.trim().length > 0;
    if (step === 2) return trimValid;
    if (step === 3) return lessonValidation.isValid;
    if (step === 4) return title.trim().length >= 2 && description.trim().length >= 10 && monetizationValidation.isValid;
    if (step === 6) return captionValidation.isValid;
    return true;
  }, [step, videoUrl, title, description, trimValid, lessonValidation.isValid, captionValidation.isValid, monetizationValidation.isValid]);

  const draftSaved = savingDraft ? false : lastSavedAt ? true : undefined;

  const goNext = useCallback(() => { if (canNext && step < 9) { setStep(step + 1); } }, [canNext, step]);
  const goBack = useCallback(() => { if (step > 1) setStep(step - 1); }, [step]);

  const handlePublish = useCallback(async () => {
    setSubmitting(true);
    setError("");
    if (isLocalVideo) {
      setError("Please upload your video to cloud storage or provide a hosted URL before publishing.");
      setSubmitting(false);
      return;
    }
    try {
      const payload = {
        title: title.trim(), description: description.trim(), caption: "",
        videoUrl: videoUrl.trim(), styleSlug, difficulty,
        checklist: { fullBodyVisible: fullBody, stableCamera: stableCam, goodLighting: goodLight },
        lessonParts, hashtags, musicCredit: musicCredit.trim(),
        accessType,
        priceInr,
        subscriptionTier: subscriptionTier.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        slowMoMarkers,
        trimStartSeconds,
        trimEndSeconds,
        captionOverlays,
        videoDurationSeconds,
        draftId: draftId || undefined,
        publishNow: true,
      };
      console.log("[handlePublish] Sending payload:", payload);
      const data = await postChoreographySubmission(payload);
      setResult({
        id: data?.submission?.id || "",
        status: data?.submission?.submission_status || "pending_review",
        tier: data?.submission?.tier || "community",
        message: data?.message || "Submission queued for AI evaluation",
      });
      // Clear the wizard preset after successful submission
      try {
        await fetch("/api/choreographer/wizard-preset", { method: "DELETE" });
      } catch {
        // Ignore cleanup errors
      }
    } catch (err: any) {
      console.error("[handlePublish] Catch error:", err);
      const detail = err?.message ? ` | ${err.message}` : "";
        const message = `Failed to submit choreography${detail}`;
        setError(message);

        // If the error message indicates a stale/non-owned draft or a DB permission/constraint
        // issue, clear the local draft id so the user can retry without the stale reference.
        const lower = String(err?.message || "").toLowerCase();
        const shouldClearDraft =
          lower.includes("stale") ||
          lower.includes("non-owned") ||
          lower.includes("ownership") ||
          lower.includes("permission") ||
          lower.includes("violates") ||
          lower.includes("foreign key") ||
          lower.includes("draft");

        if (shouldClearDraft) {
          try {
            setDraftId(null);
            localStorage.removeItem("naachly_upload_draft_local");
          } catch (e) {
            // ignore localStorage failures
          }
        }
    }
    finally { setSubmitting(false); }
  }, [title, description, videoUrl, styleSlug, difficulty, fullBody, stableCam, goodLight, lessonParts, hashtags, musicCredit, accessType, priceInr, subscriptionTier, thumbnailUrl, slowMoMarkers, trimStartSeconds, trimEndSeconds, captionOverlays, videoDurationSeconds, draftId, isLocalVideo]);

  

  if (result) {
    return (
      <main className="section-padding py-10 tab-screen-enter">
        <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-white">{result.message}</h2>
          <p className="mt-2 text-sm text-zinc-400">Status: {result.status} · Tier: {result.tier}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/creator/choreos" className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15">View Submissions</Link>
            <button type="button" onClick={() => { setResult(null); resetDraft(); }} className="rounded-xl border border-[#F3B2AB]/30 bg-[#F3B2AB]/10 px-4 py-2.5 text-xs font-semibold text-[#F3B2AB]">Upload Another</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section-padding py-6 sm:py-10 tab-screen-enter">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7 backdrop-blur-sm">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#F3B2AB]/80">Creator Studio</p>
            <h1 data-testid="upload-page-title" className="mt-1 text-2xl font-bold text-white sm:text-3xl">Post Choreography</h1>
          </div>
          <Link href="/creator/choreos" className="rounded-lg border border-white/20 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition">My Routines</Link>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white">Drafts</p>
              <p className="text-[11px] text-zinc-500">Continue where you left off</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDrafts}
                data-testid="drafts-refresh-button"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 transition"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={resetDraft}
                data-testid="drafts-new-button"
                className="rounded-lg border border-[#F3B2AB]/30 bg-[#F3B2AB]/10 px-3 py-1.5 text-[11px] font-semibold text-[#F3B2AB] hover:bg-[#F3B2AB]/20 transition"
              >
                New Draft
              </button>
            </div>
          </div>
          {draftError && (
            <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{draftError}</p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {draftsLoading && (
              <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3 text-xs text-zinc-500">Loading drafts…</div>
            )}
            {!draftsLoading && drafts.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-zinc-500">No drafts yet.</div>
            )}
            {drafts.slice(0, 4).map((draft) => (
              <div
                key={draft.id}
                role="button"
                tabIndex={0}
                onClick={() => applyDraft(draft)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    applyDraft(draft);
                  }
                }}
                className={`rounded-xl border p-3 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-[#F3B2AB]/40 ${
                  draftId === draft.id ? "border-[#F3B2AB] bg-[#F3B2AB]/10" : "border-white/10 bg-zinc-900/40 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {editingDraftId === draft.id ? (
                    <input
                      value={draftTitleInput}
                      onChange={(event) => setDraftTitleInput(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-white outline-none"
                    />
                  ) : (
                    <p className="text-white font-semibold truncate">{draft.title || "Untitled Draft"}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {editingDraftId === draft.id ? (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            submitRenameDraft(draft);
                          }}
                          className="text-[10px] text-[#F3B2AB]"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            cancelRenameDraft();
                          }}
                          className="text-[10px] text-zinc-400"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            startRenameDraft(draft);
                          }}
                          className="text-[10px] text-zinc-400 hover:text-white"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteDraft(draft);
                          }}
                          disabled={deletingDraftId === draft.id}
                          className="text-[10px] text-red-400/80 hover:text-red-300 disabled:opacity-40"
                        >
                          {deletingDraftId === draft.id ? "Deleting…" : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-zinc-500">{draft.updated_at ? new Date(draft.updated_at).toLocaleString() : "Just now"}</p>
              </div>
            ))}
          </div>
        </div>

        <UploadWizard steps={WIZARD_STEPS} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} draftSaved={draftSaved}>
          {/* Step 1: Upload */}
          {step === 1 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-1">Upload Your Choreography</h2>
              <p className="text-sm text-zinc-400 mb-4">Record or upload a video of your dance routine</p>
              <VideoUploadZone
                videoUrl={videoUrl}
                onVideoUrlChange={setVideoUrl}
                onFileSelect={(file) => {
                  setVideoFile(file);
                  setUploadWarning("");
                }}
                onFileError={setUploadWarning}
              />
              {isLocalVideo && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-zinc-400">Local preview detected. Upload to cloud to enable draft autosave.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      data-testid="upload-to-cloud-button"
                      type="button"
                      onClick={uploadVideoToSupabase}
                      disabled={uploadingVideo || !videoFile}
                      className="rounded-xl bg-[#F3B2AB] px-4 py-2 text-xs font-bold text-[#0a0a0a] disabled:opacity-40"
                    >
                      {uploadingVideo ? "Uploading…" : "Upload to Cloud"}
                    </button>
                  </div>
                  {uploadingVideo && (
                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-[#F3B2AB] transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-500">{uploadProgress}% uploaded</p>
                    </div>
                  )}
                </div>
              )}
              {uploadWarning && (
                <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{uploadWarning}</p>
              )}
              {uploadWarning && videoFile && !uploadingVideo && (
                <button
                  data-testid="retry-upload-button"
                  type="button"
                  onClick={uploadVideoToSupabase}
                  className="mt-2 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5"
                >
                  Retry upload
                </button>
              )}
              <NavButtons goBack={goBack} goNext={goNext} step={step} canNext={canNext} />
            </section>
          )}

          {/* Step 2: Trim */}
          {step === 2 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-1">Trim & Preview</h2>
              <p className="text-sm text-zinc-400 mb-4">Set the start and end points of your choreography</p>
              {videoUrl && (
                <div className="mb-4 aspect-video rounded-xl overflow-hidden bg-black">
                  <video
                    data-testid="trim-preview-video"
                    src={videoUrl}
                    className="h-full w-full object-contain"
                    controls
                    muted
                    onLoadedMetadata={(event) => {
                      const duration = event.currentTarget.duration || 0;
                      setVideoDurationSeconds(duration);
                      if (!trimEndSeconds) setTrimEndSeconds(duration);
                    }}
                  />
                </div>
              )}
              {videoDurationSeconds > 0 ? (
                <TrimTimeline
                  duration={videoDurationSeconds}
                  startSeconds={trimStartSeconds}
                  endSeconds={trimEndSeconds || videoDurationSeconds}
                  onChange={({ startSeconds, endSeconds }) => {
                    setTrimStartSeconds(startSeconds);
                    setTrimEndSeconds(endSeconds);
                  }}
                />
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-zinc-500">
                  Upload a video to enable trim controls.
                </div>
              )}
              {!trimValid && (
                <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Trim end must be at least 0.5s after the start.
                </p>
              )}
              <NavButtons goBack={goBack} goNext={goNext} step={step} canNext={canNext} />
            </section>
          )}

          {/* Step 3: Lesson Structure */}
          {step === 3 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-1">Structure Your Lesson</h2>
              <p className="text-sm text-zinc-400 mb-4">Break your choreography into learnable segments</p>
              <LessonBuilder parts={lessonParts} onPartsChange={setLessonParts} />
              {!lessonValidation.isValid && (
                <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {lessonValidation.message}
                </p>
              )}
              <NavButtons goBack={goBack} goNext={goNext} step={step} canNext={canNext} />
            </section>
          )}

          {/* Step 4: Details */}
          {step === 4 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-1">Details & Tags</h2>
              <p className="text-sm text-zinc-400 mb-4">Add metadata to help learners find your choreography</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Title *</label>
                  <input data-testid="upload-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your choreography a name" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Description *</label>
                  <textarea data-testid="upload-description-input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe your choreography, what learners will achieve..." className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Dance Style</label>
                    <select value={styleSlug} onChange={(e) => setStyleSlug(e.target.value as Style)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F3B2AB]/40">
                      {styleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Difficulty</label>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F3B2AB]/40">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Music Credit</label>
                  <input data-testid="upload-music-credit-input" value={musicCredit} onChange={(e) => setMusicCredit(e.target.value)} placeholder="Song name — Artist" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold text-white">Monetization</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Choose how learners access this routine.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {([
                      { value: "free", label: "Free" },
                      { value: "ppv", label: "One-time Unlock" },
                      { value: "subscription", label: "Subscription" },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAccessType(option.value)}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          accessType === option.value
                            ? "bg-[#F3B2AB]/20 text-[#F3B2AB] border border-[#F3B2AB]/30"
                            : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {accessType === "ppv" && (
                    <div className="mt-3">
                      <label className="text-[11px] text-zinc-500">Price (INR)</label>
                      <input
                        type="number"
                        min={99}
                        value={priceInr}
                        onChange={(e) => setPriceInr(Number(e.target.value))}
                        placeholder="199"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F3B2AB]/40"
                      />
                    </div>
                  )}
                  {accessType === "subscription" && (
                    <div className="mt-3">
                      <label className="text-[11px] text-zinc-500">Subscription Tier</label>
                      <select
                        value={subscriptionTier}
                        onChange={(e) => setSubscriptionTier(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F3B2AB]/40"
                      >
                        <option value="">Select tier</option>
                        <option value="studio">Studio Pass</option>
                        <option value="creator">Creator Club</option>
                        <option value="elite">Elite Masterclass</option>
                      </select>
                    </div>
                  )}
                </div>
                <HashtagInput tags={hashtags} onTagsChange={setHashtags} />
                {!monetizationValidation.isValid && (
                  <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    {monetizationValidation.message}
                  </p>
                )}
              </div>
              <NavButtons goBack={goBack} goNext={goNext} step={step} canNext={canNext} />
            </section>
          )}

          {/* Step 5: Thumbnail */}
          {step === 5 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-1">Choose Thumbnail</h2>
              <p className="text-sm text-zinc-400 mb-4">Pick or upload a cover image for your choreography</p>
              <ThumbnailPicker videoUrl={videoUrl} selectedUrl={thumbnailUrl} onSelect={setThumbnailUrl} />
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Upload custom thumbnail</label>
                  <input
                    data-testid="thumbnail-file-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          setThumbnailUrl(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
                  />
                </div>
                {thumbnailUrl.startsWith("data:") && (
                  <button
                    type="button"
                    onClick={() => uploadThumbnailToSupabase(thumbnailUrl)}
                    disabled={thumbnailUploading}
                    className="w-fit rounded-xl bg-[#F3B2AB] px-4 py-2 text-xs font-bold text-[#0a0a0a] disabled:opacity-40"
                  >
                    {thumbnailUploading ? "Uploading…" : "Upload Thumbnail to Cloud"}
                  </button>
                )}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Or paste thumbnail URL</label>
                  <input data-testid="thumbnail-url-input" value={thumbnailUrl.startsWith("data:") ? "" : thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40" />
                </div>
              </div>
              <NavButtons goBack={goBack} goNext={goNext} step={step} canNext={canNext} />
            </section>
          )}

          {/* Step 6: Captions */}
          {step === 6 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-1">Captions & Overlays</h2>
              <p className="text-sm text-zinc-400 mb-4">Add text overlays or captions for your video</p>
              <CaptionEditor captions={captionOverlays} onChange={setCaptionOverlays} />
              {!captionValidation.isValid && (
                <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {captionValidation.message}
                </p>
              )}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Coming soon</p>
                <p className="text-xs text-zinc-400">Auto-generated captions from audio will be available in a future update</p>
              </div>
              <NavButtons goBack={goBack} goNext={goNext} step={step} canNext={canNext} />
            </section>
          )}

          {/* Step 7: Slow-Mo Markers */}
          {step === 7 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-1">Slow-Motion Markers</h2>
              <p className="text-sm text-zinc-400 mb-4">Mark sections where learners can practice at half speed</p>
              <SlowMoTimeline duration={videoDurationSeconds} markers={slowMoMarkers} onChange={setSlowMoMarkers} />
              <NavButtons goBack={goBack} goNext={goNext} step={step} canNext={canNext} />
            </section>
          )}

          {/* Step 8: Preview */}
          {step === 8 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-1">Preview Learner Experience</h2>
              <p className="text-sm text-zinc-400 mb-4">This is how your choreography will appear to learners</p>
              <div className="mb-3 flex items-center gap-2">
                {(["feed", "learn"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPreviewTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      previewTab === tab ? "bg-[#F3B2AB]/20 text-[#F3B2AB] border border-[#F3B2AB]/30" : "bg-white/5 text-zinc-400 border border-white/10"
                    }`}
                  >
                    {tab === "feed" ? "Feed Card" : "Learn Mode"}
                  </button>
                ))}
              </div>
              {previewTab === "feed" ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="aspect-video bg-black flex items-center justify-center">
                    {videoUrl ? (
                      <video src={videoUrl} className="h-full w-full object-contain" controls muted />
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-sm text-zinc-400">Video preview</p>
                        <p className="text-xs text-zinc-600 mt-1 break-all">{videoUrl || "No video"}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="rounded-full bg-[#F3B2AB]/15 px-2 py-0.5 text-[10px] font-bold text-[#F3B2AB]">{difficulty}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{styleOptions.find((s) => s.value === styleSlug)?.label}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{title || "Untitled"}</h3>
                    <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{description || "No description"}</p>
                    {lessonParts.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></svg>
                        {lessonParts.length} parts
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {hashtags.map((t) => <span key={t} className="text-[11px] text-[#F3B2AB]/70">#{t}</span>)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-400">Learn Mode Preview</p>
                      <p className="text-sm font-semibold text-white">{title || "Untitled"}</p>
                    </div>
                    <span className="text-[10px] text-zinc-500">Trim: {formatTime(trimStartSeconds)} → {formatTime(trimEndSeconds || videoDurationSeconds)}</span>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                      {thumbnailUrl ? (
                        <Image src={thumbnailUrl} alt="Thumbnail" unoptimized fill className="opacity-60" style={{ objectFit: "cover" }} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">Preview canvas</div>
                      )}
                      {captionOverlays.slice(0, 3).map((caption) => (
                        <div
                          key={caption.id}
                          className={`absolute left-1/2 -translate-x-1/2 rounded-lg bg-black/70 px-2 py-1 text-[10px] text-zinc-100 ${
                            caption.position === "top"
                              ? "top-3"
                              : caption.position === "center"
                                ? "top-1/2 -translate-y-1/2"
                                : "bottom-3"
                          }`}
                        >
                          {caption.timecode} — {caption.text || "(empty)"}
                        </div>
                      ))}
                      {slowMoMarkers.length > 0 && (
                        <div className="absolute bottom-2 left-2 right-2 rounded-full bg-white/10 px-2 py-1">
                          <div className="relative h-2 rounded-full bg-white/10">
                            {slowMoMarkers.map((marker) => {
                              const left = videoDurationSeconds ? (marker.startSeconds / videoDurationSeconds) * 100 : 0;
                              const width = videoDurationSeconds ? ((marker.endSeconds - marker.startSeconds) / videoDurationSeconds) * 100 : 0;
                              return (
                                <span
                                  key={marker.id}
                                  className="absolute top-0 h-2 rounded-full bg-[#F3B2AB]/50"
                                  style={{ left: `${left}%`, width: `${Math.max(2, width)}%` }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                      <p className="text-[11px] text-zinc-500">Lesson Parts</p>
                      {lessonParts.length === 0 ? (
                        <p className="text-xs text-zinc-400 mt-1">No lesson parts added yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                          {lessonParts.map((part, idx) => (
                            <li key={part.id} className="flex items-center justify-between">
                              <span>{idx + 1}. {part.label}</span>
                              <span className="text-zinc-500">{part.startTime} → {part.endTime}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                      <p className="text-[11px] text-zinc-500">Captions</p>
                      {captionOverlays.length === 0 ? (
                        <p className="text-xs text-zinc-400 mt-1">No caption overlays yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                          {captionOverlays.map((caption) => (
                            <li key={caption.id} className="flex items-center justify-between">
                              <span>{caption.timecode} — {caption.text || "(empty)"}</span>
                              <span className="text-zinc-500 capitalize">{caption.position}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                      <p className="text-[11px] text-zinc-500">Slow-Mo Markers</p>
                      {slowMoMarkers.length === 0 ? (
                        <p className="text-xs text-zinc-400 mt-1">No slow-mo markers yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                          {slowMoMarkers.map((marker) => (
                            <li key={marker.id} className="flex items-center justify-between">
                              <span>{marker.label}</span>
                              <span className="text-zinc-500">{formatTime(marker.startSeconds)} → {formatTime(marker.endSeconds)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <NavButtons goBack={goBack} goNext={goNext} step={step} canNext={canNext} />
            </section>
          )}

          {/* Step 9: Publish */}
          {step === 9 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-1">Final Review & Publish</h2>
              <p className="text-sm text-zinc-400 mb-4">Confirm quality checklist and publish your choreography</p>
              <div className="space-y-2 mb-5">
                {[
                  { label: "Full body visible in video", checked: fullBody, onChange: setFullBody },
                  { label: "Camera is stable", checked: stableCam, onChange: setStableCam },
                  { label: "Good lighting conditions", checked: goodLight, onChange: setGoodLight },
                ].map((c) => (
                  <label key={c.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 cursor-pointer hover:bg-white/[0.05] transition">
                    <input type="checkbox" checked={c.checked} onChange={(e) => c.onChange(e.target.checked)} className="accent-[#F3B2AB] h-4 w-4" />
                    {c.label}
                  </label>
                ))}
              </div>
              {/* Summary */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Summary</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-zinc-500">Title:</span> <span className="text-white">{title || "—"}</span></div>
                  <div><span className="text-zinc-500">Style:</span> <span className="text-white">{styleOptions.find((s) => s.value === styleSlug)?.label}</span></div>
                  <div><span className="text-zinc-500">Difficulty:</span> <span className="text-white capitalize">{difficulty}</span></div>
                  <div><span className="text-zinc-500">Parts:</span> <span className="text-white">{lessonParts.length}</span></div>
                  <div><span className="text-zinc-500">Tags:</span> <span className="text-white">{hashtags.length}</span></div>
                  <div><span className="text-zinc-500">Slow-mo:</span> <span className="text-white">{slowMoMarkers.length} markers</span></div>
                  <div><span className="text-zinc-500">Captions:</span> <span className="text-white">{captionOverlays.length}</span></div>
                  <div><span className="text-zinc-500">Trim:</span> <span className="text-white">{formatTime(trimStartSeconds)} → {formatTime(trimEndSeconds || videoDurationSeconds)}</span></div>
                  <div><span className="text-zinc-500">Access:</span> <span className="text-white">{accessType}</span></div>
                  <div><span className="text-zinc-500">Price:</span> <span className="text-white">{accessType === "ppv" ? `₹${priceInr}` : "—"}</span></div>
                </div>
              </div>
              {error && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}
              <div className="flex items-center gap-3">
                <button type="button" onClick={goBack} className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition">← Back</button>
                <button data-testid="publish-button" type="button" onClick={handlePublish} disabled={submitting || !(fullBody && stableCam && goodLight)} className="flex-1 rounded-xl bg-gradient-to-r from-[#F3B2AB] to-[#D88B80] py-3 text-sm font-bold text-[#0a0a0a] transition hover:brightness-110 disabled:opacity-40">
                  {submitting ? "Publishing..." : "🚀 Publish Choreography"}
                </button>
              </div>
            </section>
          )}
        </UploadWizard>
      </div>
    </main>
  );
}
