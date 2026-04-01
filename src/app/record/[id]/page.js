"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { compareWithTemporalTolerance } from "@/lib/ai/pose-engine";
import { extractAdaptiveAngles } from "@/lib/ai/partial-body";
import { createClient, isSupabaseConfigured, shouldUseFirebaseFallback } from "@/lib/supabase/client";
import BrandLogo from "@/components/shared/BrandLogo";

function getLegacyClientUserId() {
  if (typeof window === "undefined") return "anon";
  const key = "naachly_user_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = `user_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, created);
  return created;
}

async function fetchLegacyChoreoById(id) {
  const byDocId = await getDoc(doc(db, "choreos", id));
  if (byDocId.exists()) {
    const data = byDocId.data();
    return {
      id: data.id || byDocId.id,
      title: data.title || "Untitled Choreo",
      video: data.video || "",
      moves: Array.isArray(data.moves) ? data.moves : [],
    };
  }

  const byFieldSnap = await getDocs(query(collection(db, "choreos"), where("id", "==", id), limit(1)));
  if (byFieldSnap.empty) return null;

  const picked = byFieldSnap.docs[0];
  const data = picked.data();
  return {
    id: data.id || picked.id,
    title: data.title || "Untitled Choreo",
    video: data.video || "",
    moves: Array.isArray(data.moves) ? data.moves : [],
  };
}

async function fetchChoreoById(id) {
  let supabaseRequestFailed = false;

  if (isSupabaseConfigured()) {
    try {
      const response = await fetch(`/api/choreos/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.choreo) return payload.choreo;
      }
      supabaseRequestFailed = !response.ok;
    } catch {
      supabaseRequestFailed = true;
    }
  }

  if (!shouldUseFirebaseFallback()) {
    if (isSupabaseConfigured() && supabaseRequestFailed) {
      throw new Error("Supabase choreography fetch failed while legacy fallback is disabled.");
    }
    return null;
  }

  return fetchLegacyChoreoById(id);
}

function getSupportedMimeType() {
  const options = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
}

async function loadVideo(videoEl, src) {
  return new Promise((resolve, reject) => {
    videoEl.src = src;
    videoEl.onloadedmetadata = () => resolve();
    videoEl.onerror = () => reject(new Error("Video failed to load"));
  });
}

async function generateMergedVideo({ instructorSrc, userBlob, score }) {
  const drawRoundedRect = (ctx, x, y, w, h, r) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const drawPill = (
    ctx,
    x,
    y,
    w,
    h,
    bg,
    text,
    textColor,
    font = "700 24px system-ui",
    border = "rgba(255,255,255,0.18)",
    glow = "rgba(170,255,70,0.16)"
  ) => {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    drawRoundedRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = border;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  };

  const drawCoverImage = (ctx, video, dx, dy, dw, dh) => {
    const vw = video.videoWidth || dw;
    const vh = video.videoHeight || dh;
    const scale = Math.max(dw / vw, dh / vh);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = Math.max(0, (vw - sw) / 2);
    const sy = Math.max(0, (vh - sh) / 2);
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
  };

  const instructor = document.createElement("video");
  const user = document.createElement("video");
  instructor.crossOrigin = "anonymous";
  instructor.muted = true;
  user.muted = true;
  instructor.playsInline = true;
  user.playsInline = true;

  const userSrc = URL.createObjectURL(userBlob);
  await Promise.all([loadVideo(instructor, instructorSrc), loadVideo(user, userSrc)]);

  const width = 720;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(userSrc);
    throw new Error("Canvas context unavailable");
  }

  const stream = canvas.captureStream(30);
  const mimeType = getSupportedMimeType() || "video/webm";
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  const duration = Math.max(1, Math.min(instructor.duration || 1, user.duration || 1));

  const done = new Promise((resolve) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  instructor.currentTime = 0;
  user.currentTime = 0;
  await Promise.all([instructor.play().catch(() => {}), user.play().catch(() => {})]);
  recorder.start(500);

  await new Promise((resolve) => {
    const started = performance.now();

    const cardX = 12;
    const cardY = 12;
    const cardW = width - 24;
    const cardH = height - 24;
    const cardRadius = 26;

    const topH = Math.floor(cardH * 0.515);
    const bottomH = cardH - topH;
    const splitY = cardY + topH;

    const instructorTag = { x: cardX + 14, y: cardY + 14, w: 138, h: 34 };
    const youTag = { x: cardX + 14, y: splitY + 10, w: 70, h: 32 };
    const brandTag = { x: cardX + cardW / 2 - 103, y: splitY - 26, w: 206, h: 52 };

    const rankTag = { x: cardX + cardW - 122, y: splitY + 104, w: 106, h: 38 };
    const scoreTag = { x: cardX + cardW - 202, y: splitY + 152, w: 186, h: 44 };
    const xpTag = { x: cardX + cardW - 166, y: splitY + 206, w: 150, h: 44 };

    const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
    const rank = "S";
    const xp = 150;

    const paint = () => {
      const elapsed = (performance.now() - started) / 1000;

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#0E0E0E");
      bg.addColorStop(1, "#050505");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
      ctx.save();
      ctx.clip();

      drawCoverImage(ctx, instructor, cardX, cardY, cardW, topH);
      drawCoverImage(ctx, user, cardX, splitY, cardW, bottomH);

      const vignetteTop = ctx.createLinearGradient(0, cardY, 0, splitY);
      vignetteTop.addColorStop(0, "rgba(0,0,0,0.35)");
      vignetteTop.addColorStop(0.75, "rgba(0,0,0,0.05)");
      vignetteTop.addColorStop(1, "rgba(0,0,0,0.22)");
      ctx.fillStyle = vignetteTop;
      ctx.fillRect(cardX, cardY, cardW, topH);

      const vignetteBottom = ctx.createLinearGradient(0, splitY, 0, cardY + cardH);
      vignetteBottom.addColorStop(0, "rgba(0,0,0,0.1)");
      vignetteBottom.addColorStop(1, "rgba(0,0,0,0.48)");
      ctx.fillStyle = vignetteBottom;
      ctx.fillRect(cardX, splitY, cardW, bottomH);

      ctx.fillStyle = "rgba(211,196,184,0.15)";
      ctx.fillRect(cardX, splitY - 4, cardW, 8);
      ctx.fillStyle = "#D3C4B8";
      ctx.fillRect(cardX, splitY - 1.5, cardW, 3);
      ctx.restore();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
      ctx.stroke();

      drawPill(
        ctx,
        instructorTag.x,
        instructorTag.y,
        instructorTag.w,
        instructorTag.h,
        "rgba(14,14,14,0.95)",
        "INSTRUCTOR",
        "#D3C4B8",
        "800 14px Manrope, system-ui",
        "rgba(211,196,184,0.3)",
        "rgba(211,196,184,0.1)"
      );
      drawPill(
        ctx,
        youTag.x,
        youTag.y,
        youTag.w,
        youTag.h,
        "rgba(40,40,40,0.88)",
        "YOU",
        "#E7E5E5",
        "800 14px Manrope, system-ui",
        "rgba(255,255,255,0.2)",
        "rgba(211,196,184,0.05)"
      );
      drawPill(
        ctx,
        brandTag.x,
        brandTag.y,
        brandTag.w,
        brandTag.h,
        "rgba(14,14,14,0.98)",
        "Naachly",
        "#D3C4B8",
        "200 31px Manrope, system-ui",
        "rgba(211,196,184,0.2)",
        "rgba(211,196,184,0.15)"
      );

      // Performance capsules removed per user request for clean recording

      if (elapsed < duration && !instructor.ended && !user.ended) {
        requestAnimationFrame(paint);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(paint);
  });

  recorder.stop();
  const mergedBlob = await done;

  instructor.pause();
  user.pause();
  URL.revokeObjectURL(userSrc);
  return mergedBlob;
}

async function generatePortraitSelfVideo(userBlob) {
  const drawCoverImage = (ctx, video, dx, dy, dw, dh) => {
    const vw = video.videoWidth || dw;
    const vh = video.videoHeight || dh;
    const scale = Math.max(dw / vw, dh / vh);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = Math.max(0, (vw - sw) / 2);
    const sy = Math.max(0, (vh - sh) / 2);
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
  };

  const user = document.createElement("video");
  user.muted = true;
  user.playsInline = true;

  const userSrc = URL.createObjectURL(userBlob);
  await loadVideo(user, userSrc);

  const width = 720;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(userSrc);
    throw new Error("Canvas context unavailable");
  }

  const stream = canvas.captureStream(30);
  const mimeType = getSupportedMimeType() || "video/webm";
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  const duration = Math.max(1, user.duration || 1);

  const done = new Promise((resolve) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  user.currentTime = 0;
  await user.play().catch(() => {});
  recorder.start(500);

  await new Promise((resolve) => {
    const started = performance.now();

    const paint = () => {
      const elapsed = (performance.now() - started) / 1000;

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#05080f");
      bg.addColorStop(1, "#020407");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      drawCoverImage(ctx, user, 0, 0, width, height);

      if (elapsed < duration && !user.ended) {
        requestAnimationFrame(paint);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(paint);
  });

  recorder.stop();
  const outputBlob = await done;
  user.pause();
  URL.revokeObjectURL(userSrc);
  return outputBlob;
}

export default function RecordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const isRemixMode = searchParams?.get("mode") === "remix";
  const [choreo, setChoreo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [score, setScore] = useState(null);
  const [mergedUrl, setMergedUrl] = useState("");
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");
  const [instructorReady, setInstructorReady] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [aiStatus, setAiStatus] = useState("loading");
  const [authUserId, setAuthUserId] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showGoFlash, setShowGoFlash] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);

  const instructorRef = useRef(null);
  const webcamRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const poseLandmarkerRef = useRef(null);
  const scoringLoopRef = useRef(0);
  const countdownTimerRef = useRef(null);
  const goFlashTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const aiStatsRef = useRef({ frameCount: 0, totalScore: 0 });
  const instructorAngleBufferRef = useRef([]);
  const recordingRef = useRef(false);
  const startInFlightRef = useRef(false);
  const recordingStartedAtRef = useRef(0);

  const canScroll = mergedUrl || score !== null;

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const data = await fetchChoreoById(String(id));
        if (!mounted) return;
        if (!data) {
          setError("Choreography not found.");
          return;
        }
        setChoreo(data);
      } catch (err) {
        console.error(err);
        if (mounted) setError("Failed to load choreography.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    setInstructorReady(false);
  }, [choreo?.video]);

  useEffect(() => {
    let mounted = true;

    async function loadAuthUser() {
      if (!isSupabaseConfigured()) return;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;
        setAuthUserId(user?.id || "");
      } catch {
        if (mounted) setAuthUserId("");
      }
    }

    void loadAuthUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const stopCurrentStream = () => {
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = null;

      const node = webcamRef.current;
      if (node) {
        node.srcObject = null;
      }
    };

    if (!cameraEnabled) {
      stopCurrentStream();
      setCameraReady(false);
      return () => {
        active = false;
      };
    }

    async function attachStream(stream) {
      streamRef.current = stream;
      const node = webcamRef.current;
      if (!node) return;

      node.srcObject = stream;
      node.muted = true;
      node.defaultMuted = true;
      node.setAttribute("playsinline", "true");
      node.setAttribute("autoplay", "true");

      try {
        await node.play();
      } catch {
        // Some mobile browsers may delay playback until metadata is available.
      }
    }

    async function getCameraStream() {
      const attempts = [
        {
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 720 },
            height: { ideal: 1280 },
            aspectRatio: { ideal: 9 / 16 },
          },
          audio: false,
        },
        { video: { facingMode: { ideal: "user" }, aspectRatio: { ideal: 9 / 16 } }, audio: false },
        { video: { facingMode: "user" }, audio: false },
        { video: true, audio: false },
      ];

      let lastError = null;
      for (const constraints of attempts) {
        try {
          // eslint-disable-next-line no-await-in-loop
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError || new Error("Camera access failed");
    }

    async function startCamera() {
      try {
        const stream = await getCameraStream();
        if (!active) return;

        await attachStream(stream);
        if (!active) return;

        setCameraReady(true);
      } catch (err) {
        console.error(err);
        if (active) {
          setCameraEnabled(false);
          setCameraReady(false);
          setError("Camera access failed. On phone, allow camera permission and ensure HTTPS is enabled.");
        }
      }
    }

    startCamera();
    return () => {
      active = false;
      stopCurrentStream();
    };
  }, [cameraEnabled]);

  useEffect(() => {
    let active = true;

    if (!isRemixMode) {
      setAiStatus("ready");
      setAiReady(false);
      poseLandmarkerRef.current?.close?.();
      return () => {
        active = false;
        cancelAnimationFrame(scoringLoopRef.current);
      };
    }

    setAiStatus("loading");
    setAiReady(false);

    async function initPoseModel() {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { PoseLandmarker, FilesetResolver } = vision;
        const resolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const modelPath =
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

        const model = await PoseLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: modelPath, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        if (!active) {
          model.close?.();
          return;
        }

        poseLandmarkerRef.current = model;
        setAiReady(true);
        setAiStatus("ready");
      } catch (err) {
        console.error(err);
        if (active) {
          setAiStatus("error");
          setAiReady(false);
          setError((prev) => prev || "AI pose model unavailable on this device/browser.");
        }
      }
    }

    initPoseModel();
    return () => {
      active = false;
      cancelAnimationFrame(scoringLoopRef.current);
      poseLandmarkerRef.current?.close?.();
    };
  }, [isRemixMode]);

  useEffect(() => {
    return () => {
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    };
  }, [mergedUrl]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (goFlashTimerRef.current) {
        clearTimeout(goFlashTimerRef.current);
      }
      audioContextRef.current?.close?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!recording) return;

    const tick = () => {
      if (!recordingStartedAtRef.current) return;
      setRecordingElapsed(Math.max(0, Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)));
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [recording]);

  const playCountdownTone = (frequency, durationMs) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + durationMs / 1000 + 0.02);
    } catch {
      // Audio is optional; recording flow should continue without sound.
    }
  };

  const canRecord = useMemo(() => {
    if (!cameraReady || recording || processing || countdown !== 0) return false;
    if (!isRemixMode) return true;
    return instructorReady && aiReady;
  }, [cameraReady, isRemixMode, instructorReady, aiReady, recording, processing, countdown]);

  const showCenteredStart = !recording && !processing && !mergedUrl && countdown === 0;
  const showAiSetupOverlay = isRemixMode && aiStatus === "loading" && !recording && !processing;
  const showCenteredResultActions = Boolean(mergedUrl) && !recording && !processing;
  const displayScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Number(score))) : 95;
  const rankLabel = displayScore >= 92 ? "S" : displayScore >= 84 ? "A" : displayScore >= 74 ? "B" : "C";
  const earnedXp = Math.max(60, Math.round(displayScore * 1.6));

  const startBlockedReason = useMemo(() => {
    if (!cameraEnabled) return "Camera is off. Turn on camera first.";
    if (!cameraReady) return "Waiting for camera permission/readiness.";
    if (isRemixMode && !instructorReady) return "Waiting for instructor video to load.";
    if (isRemixMode && !aiReady) return "Waiting for AI model to load.";
    if (recording) return "Recording is already in progress.";
    if (processing) return "Please wait while previous recording is processing.";
    if (countdown > 0) return "Countdown already in progress.";
    return "";
  }, [cameraEnabled, cameraReady, isRemixMode, instructorReady, aiReady, recording, processing, countdown]);

  const runAiScoringLoop = useMemo(
    () => () => {
      const poseLandmarker = poseLandmarkerRef.current;
      const userVideo = webcamRef.current;
      const instructorVideo = instructorRef.current;

      if (!recordingRef.current || !poseLandmarker || !userVideo || !instructorVideo) return;

      const ts = performance.now();
      try {
        if (userVideo.readyState >= 2 && instructorVideo.readyState >= 2) {
          const userResult = poseLandmarker.detectForVideo(userVideo, ts);
          const instructorResult = poseLandmarker.detectForVideo(instructorVideo, ts);

          const userLm = userResult?.landmarks?.[0];
          const instructorLm = instructorResult?.landmarks?.[0];

          if (userLm && instructorLm) {
            const userAngles = extractAdaptiveAngles(userLm, 0.45, true);
            const instructorAngles = extractAdaptiveAngles(instructorLm, 0.45, true);

            instructorAngleBufferRef.current.push({ angles: instructorAngles, timestamp: ts });
            const temporalWindowMs = 700;
            instructorAngleBufferRef.current = instructorAngleBufferRef.current.filter(
              (frame) => ts - frame.timestamp <= temporalWindowMs
            );

            const comparison = compareWithTemporalTolerance(
              userAngles,
              instructorAngleBufferRef.current,
              12,
              24,
              {
                includeLegs: false,
                legWeight: 0.25,
                jitterTolerance: 3,
                minJointVisibility: 0.45,
              }
            );

            if (comparison.activeJointCount > 0) {
              aiStatsRef.current.frameCount += 1;
              aiStatsRef.current.totalScore += comparison.overallScore * 100;
            }
          }
        }
      } catch {
        // Non-blocking during scoring.
      }

      scoringLoopRef.current = requestAnimationFrame(runAiScoringLoop);
    },
    []
  );

  const beginRecordingNow = () => {
    const stream = streamRef.current;
    if (!stream || recording || processing) {
      setError("Camera stream is not ready yet. Please try again.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("This browser does not support recording. Try a modern Chrome/Edge build.");
      return;
    }

    const hasActiveTrack = stream.getTracks().some((track) => track.readyState === "live");
    if (!hasActiveTrack) {
      setError("Camera stream ended unexpectedly. Please refresh and try again.");
      return;
    }

    const mimeType = getSupportedMimeType();
    chunksRef.current = [];
    aiStatsRef.current = { frameCount: 0, totalScore: 0 };
    instructorAngleBufferRef.current = [];

    try {
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorderRef.current = recorder;
      recorder.start(500);
      setRecording(true);
      recordingStartedAtRef.current = Date.now();
      setRecordingElapsed(0);
      recordingRef.current = true;

      if (instructorRef.current) {
        instructorRef.current.muted = false;
        instructorRef.current.defaultMuted = false;
        instructorRef.current.volume = 1;
        instructorRef.current.currentTime = 0;
        instructorRef.current.play().catch(() => {});
      }

      cancelAnimationFrame(scoringLoopRef.current);
      if (isRemixMode && aiReady && poseLandmarkerRef.current) {
        scoringLoopRef.current = requestAnimationFrame(runAiScoringLoop);
      }
    } catch (err) {
      console.error(err);
      setError("Recording could not start on this browser.");
    }
  };

  const primeMediaForCountdown = async () => {
    const webcam = webcamRef.current;
    if (webcam) {
      webcam.play?.().catch(() => {});
    }

    const instructor = instructorRef.current;
    if (instructor) {
      instructor.currentTime = 0;
      try {
        // Warm media pipeline while keeping the sequence starting from 0 after countdown.
        await instructor.play();
        instructor.pause();
        instructor.currentTime = 0;
      } catch {
        // Ignore warmup playback failures; user click still starts recording.
      }
    }
  };

  const startRecording = async () => {
    if (!canRecord || startInFlightRef.current) return;
    startInFlightRef.current = true;
    setError("");

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    await primeMediaForCountdown();

    setCountdown(3);
    playCountdownTone(880, 150);
    startInFlightRef.current = false;

    countdownTimerRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          playCountdownTone(1320, 260);
          setShowGoFlash(true);
          if (goFlashTimerRef.current) {
            clearTimeout(goFlashTimerRef.current);
          }
          goFlashTimerRef.current = setTimeout(() => {
            setShowGoFlash(false);
          }, 450);
          beginRecordingNow();
          return 0;
        }
        playCountdownTone(880, 140);
        return previous - 1;
      });
    }, 1000);
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setRecording(false);
    recordingStartedAtRef.current = 0;
    setProcessing(true);
    recordingRef.current = false;
    cancelAnimationFrame(scoringLoopRef.current);

    const rawBlob = await new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" }));
      };
      recorder.stop();
    });

    if (!rawBlob || rawBlob.size === 0) {
      setProcessing(false);
      setError("No recording data was captured. Please try again.");
      return;
    }

    const aiScore =
      aiStatsRef.current.frameCount > 0
        ? Math.round(aiStatsRef.current.totalScore / aiStatsRef.current.frameCount)
        : 0;
    setScore(isRemixMode ? aiScore : null);

    try {
      if (!isRemixMode) {
        const portraitBlob = await generatePortraitSelfVideo(rawBlob);
        if (mergedUrl) URL.revokeObjectURL(mergedUrl);
        const localUrl = URL.createObjectURL(portraitBlob);
        setMergedUrl(localUrl);
        setUploadedVideoUrl("");
        return;
      }

      const mergedBlob = await generateMergedVideo({
        instructorSrc: choreo.video,
        userBlob: rawBlob,
        score: aiScore,
      });

      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
      const localUrl = URL.createObjectURL(mergedBlob);
      setMergedUrl(localUrl);

      const fallbackUserId = getLegacyClientUserId();
      const storageUserId = authUserId || fallbackUserId;
      const fileRef = ref(storage, `attempts/${storageUserId}/${choreo.id}/${Date.now()}.webm`);
      await uploadBytes(fileRef, mergedBlob, { contentType: "video/webm" });
      const downloadUrl = await getDownloadURL(fileRef);
      setUploadedVideoUrl(downloadUrl);

      let persisted = false;

      if (authUserId) {
        try {
          const response = await fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              choreoId: choreo.id,
              score: aiScore,
              videoUrl: downloadUrl,
            }),
          });

          if (!response.ok) {
            throw new Error("Supabase attempt save failed");
          }

          persisted = true;
        } catch {
          // Fall through to legacy write path during migration.
        }
      }

      if (!persisted && !shouldUseFirebaseFallback()) {
        throw new Error("Supabase attempt save failed while legacy fallback is disabled.");
      }

      if (!persisted) {
        await addDoc(collection(db, "attempts"), {
          userId: fallbackUserId,
          choreoId: choreo.id,
          score: aiScore,
          video: downloadUrl,
          createdAt: Date.now(),
        });
      }

    } catch (err) {
      console.error(err);
      setError(isRemixMode ? "Remix generation failed. Please try recording again." : "Recording failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const downloadMergedRecording = () => {
    if (!mergedUrl) return;
    const anchor = document.createElement("a");
    anchor.href = mergedUrl;
    anchor.download = isRemixMode
      ? `naachly-remix-${choreo?.id || "dance"}.webm`
      : `naachly-recording-${Date.now()}.webm`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const shareRemixToInstagram = async () => {
    if (!mergedUrl || shareBusy) return;

    setShareBusy(true);
    setError("");

    try {
      const response = await fetch(mergedUrl);
      const blob = await response.blob();
      const file = new File([blob], `naachly-${isRemixMode ? "remix" : "recording"}-${choreo?.id || "dance"}.webm`, {
        type: blob.type || "video/webm",
      });

      const title = isRemixMode
        ? `${choreo?.title || "Naachly Remix"} - My Remix`
        : "Naachly Recording - My Choreo";
      const text = isRemixMode
        ? "Created with Naachly AI dance coach. Share this remix to Instagram."
        : "Recorded on Naachly Studio. Share this video to Instagram.";

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title,
          text,
          files: [file],
        });
        return;
      }

      downloadMergedRecording();
      setError(isRemixMode ? "Downloaded remix. Upload it to Instagram from your gallery." : "Downloaded recording. Upload it to Instagram from your gallery.");
    } catch {
      setError("Could not open share sheet. Video downloaded for Instagram upload.");
      downloadMergedRecording();
    } finally {
      setShareBusy(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-black text-zinc-300">Loading record studio...</main>;
  }

  if (error && !choreo) {
    return (
      <main className="min-h-screen grid place-items-center bg-black p-6">
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-red-200">{error}</div>
      </main>
    );
  }

  return (
    <main className={`h-[100dvh] bg-obsidian text-[#E7E5E5] p-2 sm:p-4 ${canScroll ? "overflow-y-auto" : "overflow-hidden"}`}>
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col">
        <div className="mb-4 rounded-3xl border border-gold/10 bg-obsidian-100 p-4 sm:p-6 transition-all duration-700 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <BrandLogo size={32} className="brightness-110 shadow-[0_0_20px_rgba(211,196,184,0.15)]" />
              <h1 className="text-2xl font-extralight tracking-[0.2em] uppercase text-gold italic">Studio</h1>
            </div>
            {recording && (
              <div className="inline-flex items-center gap-3 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5 text-[10px] font-bold tracking-widest text-gold uppercase animate-fade-in shadow-glow">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
                RECORDING {String(Math.floor(recordingElapsed / 60)).padStart(2, "0")}:{String(recordingElapsed % 60).padStart(2, "0")}
              </div>
            )}
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-[#E7E5E5]/40 font-medium">
            {processing
              ? "Synthesizing your motion..."
              : countdown > 0
                ? `Initiating in ${countdown}s`
                : recording
                  ? "Capturing Movement"
                  : canRecord
                    ? "Academy Studio Ready"
                    : startBlockedReason}
          </p>
          {error && <p className="mt-2 text-[11px] text-gold/80 italic animate-pulse">{error}</p>}
        </div>

        <div className="mb-4 flex items-center justify-between gap-4 px-4 bg-white/5 py-3 rounded-2xl border border-white/5">
          <p className="text-[#E7E5E5]/60 text-xs font-light tracking-[0.1em] uppercase italic truncate">{choreo?.title || "Choreo"}</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                if (recording || processing) return;
                setError("");
                setCameraEnabled((prev) => !prev);
              }}
              disabled={recording || processing}
              className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-500 ${
                cameraEnabled
                  ? "text-gold underline underline-offset-8 decoration-gold/50"
                  : "text-[#E7E5E5]/30 hover:text-gold"
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              {cameraEnabled ? "LEN ACTIVE" : "ENABLE LENS"}
            </button>
            {isRemixMode ? (
              <Link href={`/learn/${choreo?.id || id}?mode=stepwise`} className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#E7E5E5]/30 hover:text-gold transition-all">
                LEARN STEPS
              </Link>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {isRemixMode ? (
            <div className="flex flex-col md:flex-row h-full w-full gap-3">
              <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-obsidian-100/90 border border-gold/20 rounded-full text-[9px] font-bold text-gold tracking-widest uppercase">Instructor</div>
                <video
                  ref={instructorRef}
                  src={choreo?.video}
                  controls
                  playsInline
                  muted={false}
                  defaultMuted={false}
                  preload="auto"
                  className="h-full w-full bg-black object-contain"
                  onLoadedData={(event) => {
                    const node = event.currentTarget;
                    node.muted = false;
                    node.defaultMuted = false;
                    node.volume = 1;
                    setInstructorReady(true);
                  }}
                  onEnded={() => {
                    if (recordingRef.current) {
                      void stopRecording();
                    }
                  }}
                />
              </div>

              <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-obsidian-100/90 border border-white/40 rounded-full text-[9px] font-bold text-white tracking-widest uppercase">You</div>
                {cameraEnabled ? (
                  <video
                    ref={webcamRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full bg-black scale-x-[-1] object-contain"
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-obsidian-100/50 backdrop-blur-xl">
                    <div className="text-center px-4">
                      <div className="h-12 w-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4 text-gold">📷</div>
                      <p className="text-sm font-semibold text-white tracking-wide uppercase">Camera is off</p>
                      <p className="mt-2 text-[10px] text-zinc-400 uppercase tracking-widest">Enable lens to begin academy training</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
              <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-obsidian-100/90 border border-white/40 rounded-full text-[9px] font-bold text-white tracking-widest uppercase">Performance Mode</div>
              {cameraEnabled ? (
                <video
                  ref={webcamRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full bg-black scale-x-[-1] object-contain"
                />
              ) : (
                <div className="grid h-full place-items-center bg-obsidian-100/50 backdrop-blur-xl">
                  <div className="text-center px-4">
                    <div className="h-12 w-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4 text-gold">📷</div>
                    <p className="text-sm font-semibold text-white tracking-wide uppercase">Lens is inactive</p>
                    <p className="mt-2 text-[10px] text-zinc-400 uppercase tracking-widest">Turn on camera to record choreography</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isRemixMode && score !== null && (
          <div className="mt-4 rounded-[32px] border border-gold/20 bg-gold/5 p-6 backdrop-blur-xl animate-fade-up shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-2xl font-light tracking-widest text-[#E7E5E5] uppercase italic">Dance Accuracy</p>
              <div className="text-4xl font-light text-gold tracking-tighter">{score}%</div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${score}%` }}
                 className="h-full bg-gold shadow-[0_0_20px_rgba(211,196,184,0.5)]"
               />
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E7E5E5]/40 mt-4 text-center">AI Synthesis: Continuous Motion Logic Analysis</p>
          </div>
        )}

        {countdown > 0 && (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-sm tracking-[0.2em] uppercase text-zinc-300 mb-3">Get Ready</p>
              <div className="mx-auto h-36 w-36 rounded-full border border-gold/40 bg-obsidian-100/80 backdrop-blur-xl grid place-items-center text-7xl font-light text-gold shadow-[0_0_50px_rgba(211,196,184,0.15)] italic">
                {countdown}
              </div>
              <p className="mt-4 text-sm text-zinc-300">Starting recording...</p>
            </div>
          </div>
        )}

        {showGoFlash && (
          <div className="fixed inset-0 z-[85] grid place-items-center bg-gold/10 backdrop-blur-[2px]">
            <div className="text-center">
              <p className="text-[10px] tracking-[0.4em] uppercase text-gold/80 mb-4 font-bold">Naachly Academy</p>
              <div className="text-8xl sm:text-9xl font-black text-gold drop-shadow-[0_0_30px_rgba(211,196,184,0.6)] italic">
                GO
              </div>
            </div>
          </div>
        )}

        {showAiSetupOverlay && (
          <div className="fixed inset-0 z-[90] grid place-items-center bg-black/85 backdrop-blur-sm">
            <div className="text-center px-6">
              <BrandLogo size={64} className="mx-auto mb-6 shadow-[0_0_40px_rgba(211,196,184,0.2)]" priority />
              <div className="mx-auto mb-6 h-10 w-10 rounded-full border-2 border-gold/20 border-t-gold animate-spin" />
              <p className="text-xl font-semibold text-white">Preparing AI Coach</p>
              <p className="mt-2 text-sm text-zinc-300">Please wait before starting your recording.</p>
            </div>
          </div>
        )}

        {showCenteredStart && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-obsidian-100/60 p-4 backdrop-blur-xl animate-fade-in">
            <div className="w-full max-w-sm rounded-[40px] border border-gold/20 bg-obsidian p-8 text-center shadow-[0_32px_120px_rgba(0,0,0,0.8)] sm:max-w-md">
              <h2 className="text-3xl font-extralight tracking-[0.2em] text-[#E7E5E5] uppercase italic mb-6">Remix Studio</h2>
              {!cameraEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setCameraEnabled(true);
                  }}
                  className="mt-4 w-full rounded-2xl bg-gold px-4 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-obsidian transition hover:scale-[1.02] shadow-glow"
                >
                  Enable Lens
                </button>
              ) : aiStatus === "loading" ? (
                <button
                  type="button"
                  disabled
                  className="mt-4 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 opacity-75"
                >
                  Calibrating...
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={!canRecord}
                  className="mt-4 w-full rounded-2xl bg-gold px-4 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-obsidian transition hover:scale-[1.05] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40 shadow-glow"
                >
                  Start Remix
                </button>
              )}
              {!canRecord && startBlockedReason ? (
                <p className="mt-4 text-[10px] uppercase tracking-widest text-gold/40 font-medium">{startBlockedReason}</p>
              ) : null}
            </div>
          </div>
        )}

        {recording && (
          <button
            type="button"
            onClick={stopRecording}
            disabled={processing}
            style={{
              left: "50%",
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
              transform: "translateX(-50%)",
            }}
            className="fixed z-[95] rounded-full border border-white/30 bg-red-500/90 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_30px_rgba(239,68,68,0.35)] transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop Recording
          </button>
        )}

        {showCenteredResultActions && (
          <div className="fixed inset-0 z-[88] overflow-y-auto bg-obsidian p-6 text-[#E7E5E5] animate-fade-in">
            <div className="mx-auto w-full max-w-lg pb-12">
              <div className="mb-10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="text-gold/60 hover:text-gold transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <h2 className="text-xl font-light tracking-[0.2em] uppercase text-gold/80">Session Overview</h2>
                <div className="w-6" />
              </div>

              <div className="relative overflow-hidden rounded-[32px] bg-obsidian-100 border border-gold/10 shadow-2xl group">
                {mergedUrl ? (
                  <video src={mergedUrl} className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-[3s] group-hover:scale-105" muted playsInline loop autoPlay />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-b from-obsidian/40 via-transparent to-obsidian" />

                <div className="relative z-10 flex min-h-[500px] flex-col justify-between p-8">
                  <div className="text-center group">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-gold/60">Dance Performance</span>
                    <h3 className="text-4xl font-extralight tracking-widest text-gold mt-2 uppercase">Naachly</h3>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-end justify-between border-b border-gold/10 pb-6">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-[#E7E5E5]/40">Mastery Rank</span>
                        <div className="text-7xl font-light text-gold tracking-tight">{rankLabel}</div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-[#E7E5E5]/40">Accuracy</span>
                        <div className="text-5xl font-extralight text-[#E7E5E5] italic">{displayScore}%</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 py-4 px-8 rounded-2xl bg-gold/5 border border-gold/10 backdrop-blur-md">
                      <span className="text-lg">✨</span>
                      <span className="text-xl font-light tracking-[0.2em] text-[#E7E5E5]">+{earnedXp} DANCE XP</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-4">
                <button
                  type="button"
                  onClick={() => shareRemixToInstagram()}
                  disabled={shareBusy}
                  className="premium-button w-full bg-gold text-obsidian border-none py-5 text-[13px] font-black tracking-[0.25em]"
                >
                  {shareBusy ? "PREPARING..." : "POST TO INSTAGRAM"}
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="premium-button w-full bg-white/5 border border-white/10 text-white hover:bg-white/10 py-4 text-[11px] tracking-[0.15em]"
                  >
                    POST TO FEED
                  </button>
                  <button
                    type="button"
                    onClick={downloadMergedRecording}
                    className="premium-button w-full bg-white/5 border border-white/10 text-white hover:bg-white/10 py-4 text-[11px] tracking-[0.15em]"
                  >
                    SAVE DEVICE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPreviewModal && mergedUrl && (
          <div className="fixed inset-0 z-[96] grid place-items-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-zinc-950 p-3 shadow-2xl sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white sm:text-lg">Recorded Video</h2>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <video src={mergedUrl} controls className="max-h-[70vh] w-full rounded-xl bg-black" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
