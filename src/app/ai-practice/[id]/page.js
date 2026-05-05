"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { doc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isSupabaseConfigured, shouldUseFirebaseFallback } from "@/lib/supabase/client";
import CalibrationScreen from "@/components/practice/CalibrationScreen";
import CountdownOverlay from "@/components/practice/CountdownOverlay";
import VideoStage from "@/components/practice/VideoStage";
import WebcamOverlay from "@/components/practice/WebcamOverlay";
import AIFeedbackPanel from "@/components/practice/AIFeedbackPanel";
import CameraControls from "@/components/practice/CameraControls";
import PlaybackControls from "@/components/practice/PlaybackControls";
import { usePoseDetection } from "@/components/practice/usePoseDetection";
import { createAudioEngine } from "@/lib/ai/audio-engine";
import { createVoiceCoach } from "@/lib/ai/voice-coach";
import { adjustDifficulty, getDifficulty } from "@/lib/ai/difficulty";
import { saveSession, saveSessionToServer, updateStreak } from "@/lib/ai/session-storage";
import { getDistanceGuidance } from "@/lib/ai/pose-engine";

const PHASE = {
  LOADING: "loading",
  CALIBRATE: "calibrate",
  COUNTDOWN: "countdown",
  PRACTICE: "practice",
  RESULTS: "results",
};

async function fetchLegacyChoreoById(id) {
  const byDocId = await getDoc(doc(db, "choreos", id));
  if (byDocId.exists()) {
    const data = byDocId.data();
    return {
      id: data.id || byDocId.id,
      title: data.title || "Untitled Choreo",
      video: data.video || "",
      moves: Array.isArray(data.moves) ? data.moves : [],
      style: data.style || data.styleSlug || data.style_slug || "bollywood",
      slug: data.slug || data.routineSlug || data.routine_slug || byDocId.id,
      duration_seconds: data.duration_seconds || 60,
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
    style: data.style || data.styleSlug || data.style_slug || "bollywood",
    slug: data.slug || data.routineSlug || data.routine_slug || picked.id,
    duration_seconds: data.duration_seconds || 60,
  };
}

async function fetchChoreoById(id) {
  let supabaseRequestFailed = false;

  if (isSupabaseConfigured()) {
    try {
      const response = await fetch(`/api/choreos/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.choreo) {
          return {
            ...payload.choreo,
            style: payload.choreo.style || payload.choreo.styleSlug || payload.choreo.style_slug || "bollywood",
            slug: payload.choreo.slug || payload.choreo.routineSlug || payload.choreo.routine_slug || payload.choreo.id,
            duration_seconds: payload.choreo.duration_seconds || 60,
          };
        }
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

function getSupportedRecorderMimeType() {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((candidate) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate));
}

export default function AIPracticePage() {
  const params = useParams();
  const id = params?.id;

  const [choreo, setChoreo] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [phase, setPhase] = useState(PHASE.LOADING);
  const [countdownValue, setCountdownValue] = useState(3);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraIssue, setCameraIssue] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [webcamVisible, setWebcamVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionResults, setSessionResults] = useState(null);
  const [recordedPracticeUrl, setRecordedPracticeUrl] = useState("");
  const [beatCount, setBeatCount] = useState(0);
  const [bpm, setBpm] = useState(0);
  const [isOnBeat, setIsOnBeat] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [distanceGuide, setDistanceGuide] = useState(null);
  const [difficultyResult, setDifficultyResult] = useState(null);

  const webcamVideoRef = useRef(null);
  const instructorVideoRef = useRef(null);
  const streamRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const audioEngineRef = useRef(null);
  const voiceCoachRef = useRef(null);
  const distanceCheckRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const styleSlug = choreo?.style || choreo?.styleSlug || choreo?.style_slug || "bollywood";
  const practiceActive = phase === PHASE.PRACTICE && cameraOn;
  const {
    landmarks,
    comparison,
    metrics,
    liveScores,
    feedbackMessages,
    bodyVisible,
    detectionMode,
    startDetection,
    stopDetection,
    getFinalScores,
  } = usePoseDetection(styleSlug, practiceActive);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setCameraReady(false);
  }, []);

  const enableCamera = useCallback(async () => {
    setCameraStatus("requesting");
    setCameraIssue(null);

    try {
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

      let mediaStream = null;
      let lastError = null;
      for (const constraints of attempts) {
        try {
          // eslint-disable-next-line no-await-in-loop
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!mediaStream) {
        throw lastError || new Error("Camera access failed");
      }

      streamRef.current = mediaStream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = mediaStream;
        webcamVideoRef.current.muted = true;
        webcamVideoRef.current.defaultMuted = true;
        webcamVideoRef.current.playsInline = true;
        webcamVideoRef.current.autoplay = true;
        await new Promise((resolve) => {
          const video = webcamVideoRef.current;
          if (!video) {
            resolve();
            return;
          }

          const onReady = () => {
            video.removeEventListener("loadedmetadata", onReady);
            video.removeEventListener("canplay", onReady);
            resolve();
          };

          video.addEventListener("loadedmetadata", onReady, { once: true });
          video.addEventListener("canplay", onReady, { once: true });
          void video.play().catch(() => {});
        });
      }
      setCameraStream(mediaStream);
      setCameraReady(true);
      setCameraOn(true);
      setCameraStatus("ready");
    } catch (error) {
      console.error("[Camera]", error);
      setCameraStatus("error");

      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        setCameraIssue({ title: "Permission not granted", message: "Please allow camera access in your browser settings and try again." });
      } else if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
        setCameraIssue({ title: "Camera not detected", message: "No camera found on this device. Connect a webcam and try again." });
      } else {
        setCameraIssue({ title: "Camera error", message: error?.message || "Could not access camera. Please try again." });
      }
    }
  }, []);

  const retryCamera = useCallback(() => {
    setCameraIssue(null);
    void enableCamera();
  }, [enableCamera]);

  const continueWithoutCamera = useCallback(() => {
    setCameraIssue(null);
    setCameraStatus("idle");
    setCameraReady(false);
    setCameraOn(false);
    setPhase(PHASE.COUNTDOWN);
  }, []);

  const startCountdown = useCallback(() => {
    setPhase(PHASE.COUNTDOWN);
    setCountdownValue(3);

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdownValue((value) => {
        if (value <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setPhase(PHASE.PRACTICE);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }, []);

  const finishSession = useCallback(() => {
    stopDetection();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (distanceCheckRef.current) clearInterval(distanceCheckRef.current);

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    audioEngineRef.current?.disconnect?.();
    voiceCoachRef.current?.destroy?.();

    const practiceDuration = Math.max(1, choreo?.duration_seconds || duration || 60);
    const finalScores = getFinalScores(elapsed, practiceDuration);
    const accuracy = finalScores.accuracy;
    const consistency = finalScores.consistency;
    const completion = finalScores.completion;

    const diffResult = adjustDifficulty(accuracy);
    setDifficultyResult(diffResult);
    updateStreak();

    if (choreo) {
      saveSession({
        routineId: choreo.id,
        routineTitle: choreo.title,
        styleSlug,
        accuracy,
        consistency,
        completion,
        elapsed,
      });
      const bodyPartScores =
        Object.keys(finalScores.bodyPartScores || {}).length > 0
          ? finalScores.bodyPartScores
          : undefined;
      void saveSessionToServer({
        routineId: choreo.id,
        accuracy,
        consistency,
        completion,
        elapsed,
        bodyPartScores,
        difficultyLevel: diffResult.level,
      });
    }

    setSessionResults({
      accuracy,
      consistency,
      completion,
      bodyPartScores: Object.keys(finalScores.bodyPartScores || {}).length > 0 ? finalScores.bodyPartScores : {},
      feedbackNotes:
        accuracy === 0
          ? [
              "No pose data was captured during this session.",
              "Make sure your full body is visible to the camera.",
              "Try practicing again with better lighting and more space.",
            ]
          : [
              "Your movements were tracked against the instructor.",
              "Keep practicing to improve your accuracy!",
            ],
    });

    setPhase(PHASE.RESULTS);
    stopCamera();
  }, [choreo, duration, elapsed, getFinalScores, stopCamera, stopDetection, styleSlug]);

  const resetPractice = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setPhase(PHASE.CALIBRATE);
    setSessionResults(null);
    setDifficultyResult(null);
    setCurrentTime(0);
    setDuration(0);
    setElapsed(0);
    setIsPlaying(false);
    setBeatCount(0);
    setBpm(0);
    setDistanceGuide(null);
    setCountdownValue(3);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) return;
      setDataLoading(true);
      setDataError("");
      try {
        const data = await fetchChoreoById(String(id));
        if (!mounted) return;
        if (!data) {
          setDataError("Choreography not found.");
          setChoreo(null);
          return;
        }
        setChoreo(data);
        setPhase(PHASE.CALIBRATE);
      } catch (error) {
        console.error(error);
        if (!mounted) return;
        setDataError("Failed to load choreography.");
      } finally {
        if (mounted) setDataLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopDetection();
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      if (distanceCheckRef.current) clearInterval(distanceCheckRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      audioEngineRef.current?.disconnect?.();
      voiceCoachRef.current?.destroy?.();
      if (recordedPracticeUrl) {
        URL.revokeObjectURL(recordedPracticeUrl);
      }
    };
  }, [recordedPracticeUrl, stopCamera, stopDetection]);

  useEffect(() => {
    if (phase !== PHASE.PRACTICE) return;

    const detectTimer = setTimeout(() => {
      if (cameraReady && webcamVideoRef.current) {
        startDetection(webcamVideoRef.current);
      }
    }, 300);

    setElapsed(0);
    setIsPlaying(true);
    elapsedTimerRef.current = setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    try {
      const audioEngine = createAudioEngine();
      audioEngineRef.current = audioEngine;
      const connectAudio = () => {
        if (instructorVideoRef.current && !instructorVideoRef.current.paused) {
          audioEngine.connect(instructorVideoRef.current);
          audioEngine.onBeat = (count) => {
            setBeatCount(count);
            setBpm(audioEngine.getBPM());
            setIsOnBeat(true);
            setTimeout(() => setIsOnBeat(false), 200);
          };
        } else {
          setTimeout(connectAudio, 500);
        }
      };
      setTimeout(connectAudio, 1000);
    } catch {
      // Audio engine is optional.
    }

    try {
      voiceCoachRef.current = createVoiceCoach({ globalCooldown: 3500, partCooldown: 8000 });
    } catch {
      voiceCoachRef.current = null;
    }

    const video = instructorVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }

    if (cameraStream && typeof MediaRecorder !== "undefined") {
      try {
        recordedChunksRef.current = [];
        const mimeType = getSupportedRecorderMimeType();
        const recorder = mimeType ? new MediaRecorder(cameraStream, { mimeType }) : new MediaRecorder(cameraStream);
        recorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          if (recordedChunksRef.current.length === 0) return;

          const blob = new Blob(recordedChunksRef.current, {
            type: recorder.mimeType || mimeType || "video/webm",
          });
          const url = URL.createObjectURL(blob);
          setRecordedPracticeUrl((previousUrl) => {
            if (previousUrl) URL.revokeObjectURL(previousUrl);
            return url;
          });
        };

        recorder.start(1000);
      } catch (error) {
        console.error("[Practice recording]", error);
        recorderRef.current = null;
        recordedChunksRef.current = [];
      }
    }

    return () => {
      clearTimeout(detectTimer);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      if (distanceCheckRef.current) clearInterval(distanceCheckRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, [cameraReady, cameraStream, phase, startDetection]);

  useEffect(() => {
    if (phase !== PHASE.PRACTICE) return;

    if (distanceCheckRef.current) clearInterval(distanceCheckRef.current);
    distanceCheckRef.current = setInterval(() => {
      if (landmarks && landmarks.length > 0) {
        setDistanceGuide(getDistanceGuidance(landmarks));
      }
    }, 2000);

    return () => {
      if (distanceCheckRef.current) clearInterval(distanceCheckRef.current);
    };
  }, [landmarks, phase]);

  useEffect(() => {
    if (
      phase === PHASE.PRACTICE &&
      voiceEnabled &&
      voiceCoachRef.current &&
      feedbackMessages.length > 0
    ) {
      const latest = feedbackMessages[feedbackMessages.length - 1];
      voiceCoachRef.current.speak(
        latest.message,
        null,
        latest.type === "praise" ? "praise" : latest.type === "error" ? "error" : "warning"
      );
    }
  }, [feedbackMessages, phase, voiceEnabled]);

  useEffect(() => {
    if (phase === PHASE.PRACTICE && duration > 0 && currentTime >= duration) {
      finishSession();
    }
  }, [currentTime, duration, finishSession, phase]);

  useEffect(() => {
    if (!cameraStream || !webcamVideoRef.current) return;
    webcamVideoRef.current.srcObject = cameraStream;
    webcamVideoRef.current.play().catch(() => {});
  }, [cameraStream]);

  useEffect(() => {
    if (phase !== PHASE.PRACTICE) {
      setIsPlaying(false);
      return;
    }

    const video = instructorVideoRef.current;
    if (video) {
      video.playbackRate = speed;
    }
  }, [phase, speed]);

  const handlePlayPause = useCallback(() => {
    const video = instructorVideoRef.current;
    if (!video) {
      setIsPlaying((previous) => !previous);
      return;
    }

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = useCallback((time) => {
    const video = instructorVideoRef.current;
    if (video) video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleSkip = useCallback((seconds) => {
    const video = instructorVideoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || duration, video.currentTime + seconds));
    }
    setCurrentTime((time) => Math.max(0, time + seconds));
  }, [duration]);

  const handleRestart = useCallback(() => {
    const video = instructorVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const handleSpeedChange = useCallback((newSpeed) => {
    setSpeed(newSpeed);
    const video = instructorVideoRef.current;
    if (video) video.playbackRate = newSpeed;
  }, []);

  const handleLoopToggle = useCallback(() => {
    setIsLooping((looping) => {
      const video = instructorVideoRef.current;
      if (video) video.loop = !looping;
      return !looping;
    });
  }, []);

  const handleDownloadPracticeVideo = useCallback(() => {
    if (!recordedPracticeUrl) return;
    const anchor = document.createElement("a");
    anchor.href = recordedPracticeUrl;
    anchor.download = `naachly-${choreo?.slug || choreo?.id || "practice"}-${Date.now()}.webm`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [choreo?.id, choreo?.slug, recordedPracticeUrl]);

  const videoUrl = choreo?.video || "";

  if (dataLoading) {
    return <main className="min-h-screen grid place-items-center bg-black text-zinc-300">Loading practice mode...</main>;
  }

  if (dataError || !choreo) {
    return (
      <main className="min-h-screen grid place-items-center bg-black p-6 text-center">
        <div className="max-w-sm rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-zinc-200">
          <p className="font-semibold">{dataError || "Not found"}</p>
          <Link href="/learn" className="mt-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
            Back to Learn
          </Link>
        </div>
      </main>
    );
  }

  const difficulty = getDifficulty();

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden">
      <div className="shrink-0 relative z-[57] bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between h-12 px-4 gap-3">
          <Link
            href={`/learn/${encodeURIComponent(choreo.id)}`}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Exit
          </Link>

          <div className="text-center">
            <p className="text-sm font-semibold text-white">{choreo.title}</p>
            <p className="text-[10px] text-zinc-500">Practice Mode • {difficulty.emoji} {difficulty.label}</p>
          </div>

          <div className="flex items-center gap-2">
            {phase === PHASE.PRACTICE ? (
              <button
                onClick={finishSession}
                className="text-sm text-amber-300 font-semibold hover:text-amber-200 transition-colors"
              >
                End Session
              </button>
            ) : (
              <div className="w-16" />
            )}
          </div>
        </div>
      </div>

      <div className={`flex-1 relative min-h-0 ${phase === PHASE.RESULTS ? "overflow-y-auto" : "overflow-hidden"}`}>
        {phase === PHASE.CALIBRATE && (
          <CalibrationScreen
            cameraReady={cameraReady}
            videoRef={webcamVideoRef}
            stream={cameraStream}
            cameraStatus={cameraStatus}
            cameraIssue={cameraIssue}
            onEnableCamera={enableCamera}
            onRetryCamera={retryCamera}
            onContinueWithoutCamera={continueWithoutCamera}
            onStart={startCountdown}
          />
        )}

        <CountdownOverlay count={countdownValue} visible={phase === PHASE.COUNTDOWN} />

        {phase === PHASE.PRACTICE && (
          <>
            <VideoStage
              ref={instructorVideoRef}
              videoUrl={videoUrl}
              playbackRate={speed}
              isPlaying={isPlaying}
              onTimeUpdate={(time, dur) => {
                setCurrentTime(time);
                setDuration(dur);
              }}
              onEnded={() => {
                if (!isLooping) finishSession();
              }}
            />

            <AnimatePresence>
              <WebcamOverlay
                videoRef={webcamVideoRef}
                stream={cameraStream}
                cameraReady={cameraReady}
                landmarks={landmarks}
                comparison={comparison}
                visible={webcamVisible && cameraReady}
              />
            </AnimatePresence>

            <AIFeedbackPanel
              posture={liveScores.posture}
              timing={liveScores.timing}
              energy={liveScores.energy}
              confidence={liveScores.confidence}
              overall={liveScores.overall}
              feedbackMessages={feedbackMessages}
              bodyVisible={bodyVisible}
              detectionMode={detectionMode}
              beatCount={beatCount}
              bpm={bpm}
              isOnBeat={isOnBeat}
              distanceGuide={distanceGuide}
              voiceEnabled={voiceEnabled}
              onToggleVoice={() => {
                setVoiceEnabled((value) => {
                  const next = !value;
                  voiceCoachRef.current?.setEnabled?.(next);
                  return next;
                });
              }}
            />

            <CameraControls
              cameraOn={cameraReady}
              webcamVisible={webcamVisible}
              onToggleCamera={() => {
                if (cameraReady) {
                  stopCamera();
                  stopDetection();
                } else {
                  void enableCamera();
                }
              }}
              onToggleWebcam={() => setWebcamVisible((value) => !value)}
            />

            <PlaybackControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              speed={speed}
              isLooping={isLooping}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onSkip={handleSkip}
              onRestart={handleRestart}
              onSpeedChange={handleSpeedChange}
              onLoopToggle={handleLoopToggle}
            />

            <div className="fixed top-16 right-14 z-[55]">
              <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 px-3 py-1.5 mr-24">
                <span className="text-xs font-mono text-zinc-400">
                  {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </>
        )}

        {phase === PHASE.RESULTS && sessionResults && (
          <div className="min-h-full bg-black px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Session Complete</p>
                  <h2 className="mt-2 text-3xl font-bold text-white">{choreo.title}</h2>
                  <p className="mt-2 text-sm text-zinc-400">Practice again to improve your score and timing.</p>
                </div>
                <button
                  onClick={resetPractice}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/20 transition"
                >
                  Practice Again
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Accuracy", value: sessionResults.accuracy },
                  { label: "Consistency", value: sessionResults.consistency },
                  { label: "Completion", value: sessionResults.completion },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{item.label}</p>
                    <p className="mt-3 text-4xl font-bold text-white">{item.value}%</p>
                  </div>
                ))}
              </div>

              {difficultyResult ? (
                <div className="mt-5 rounded-2xl border border-gold/20 bg-gold/10 p-4 text-sm text-gold-100">
                  Difficulty {difficultyResult.direction === "up" ? "increased" : difficultyResult.direction === "down" ? "decreased" : "stayed the same"} to {difficultyResult.label}.
                </div>
              ) : null}

              {recordedPracticeUrl ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-white">Practice video ready</p>
                    <p className="text-zinc-400">Download your full camera recording from this session.</p>
                  </div>
                  <button
                    onClick={handleDownloadPracticeVideo}
                    className="rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100 hover:bg-amber-300/20 transition"
                  >
                    Download Video
                  </button>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/learn/${encodeURIComponent(choreo.id)}`}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/20 transition"
                >
                  Back to Learn
                </Link>
                <button
                  onClick={resetPractice}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/20 transition"
                >
                  Practice Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
