"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
const CalibrationScreen = dynamic(() => import("./CalibrationScreen"), { ssr: false });
import CountdownOverlay from "./CountdownOverlay";
import VideoStage from "./VideoStage";
import PlaybackControls from "./PlaybackControls";
const SessionResults = dynamic(() => import("./SessionResults"), { ssr: false });
import { saveSession, saveSessionToServer, updateStreak } from "@/lib/ai/session-storage";
import { postChoreographyEngagement } from "@/lib/api/choreos";
import { getOrCreateGuestId } from "@/lib/utils/guest-session";
import { usePoseDetection } from "@/components/practice/usePoseDetection";
import { buildReplaySegments } from "@/lib/ai/replay-segments";

type Phase = "calibration" | "countdown" | "dancing" | "results";

export default function ClientPracticeShell({ choreo }: { choreo: any }) {
  const [phase, setPhase] = useState<Phase>("calibration");
  const [countdown, setCountdown] = useState(3);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const pose = usePoseDetection(choreo?.style || choreo?.styleSlug || "default", phase === "dancing");
  const [finalResult, setFinalResult] = useState<{
    accuracy: number;
    consistency: number;
    completion: number;
    bodyPartScores: Record<string, number>;
    metrics: any | null;
    replaySegments: any[];
  } | null>(null);

  const startCountdown = useCallback(() => {
    // track engagement for starting practice
    try {
      postChoreographyEngagement({ choreoId: choreo?.id, action: "try_this", mode: "track", anonKey: getOrCreateGuestId() }).catch(() => {});
    } catch {
      // ignore
    }

    setPhase("countdown");
    setCountdown(3);
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          setPhase("dancing");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [choreo]);

  const finishPractice = useCallback(() => {
    // compute final scores from pose detection metrics
    try {
      const elapsedSeconds = Math.max(0, Math.round(currentTime || 0));
      const totalDuration = Math.max(0, Math.round(duration || 0));
      const final = pose?.getFinalScores ? pose.getFinalScores(elapsedSeconds, totalDuration) : null;

      const accuracy = final?.accuracy ?? 0;
      const consistency = final?.consistency ?? 0;
      const completion = final?.completion ?? (totalDuration > 0 ? Math.round((elapsedSeconds / totalDuration) * 100) : 0);

      // Persist session locally and attempt server sync with computed metrics
      saveSession({
        routineId: choreo?.id || "",
        routineTitle: choreo?.title || choreo?.name || "",
        styleSlug: choreo?.style || choreo?.styleSlug || "",
        accuracy,
        consistency,
        completion,
        elapsed: elapsedSeconds,
      });

      void saveSessionToServer({
        routineId: choreo?.id || "",
        routineTitle: choreo?.title || choreo?.name || "",
        styleSlug: choreo?.style || choreo?.styleSlug || "",
        accuracy,
        consistency,
        completion,
        elapsed: elapsedSeconds,
        bodyPartScores: final?.bodyPartScores || undefined,
      }).catch(() => {});

      // derive simple replay segments from pose metrics (peaks in avgAngleDiffHistory)
      // Build replay segments using shared utility
      const metricsData = pose?.metrics;
      const history = (metricsData?.avgAngleDiffHistory || []) as number[];
      const totalFrames = final?.totalFrames || metricsData?.totalFramesCompared || history.length || 0;
      const totalDur = totalDuration || 0;
      const replaySegments = buildReplaySegments({ avgAngleDiffHistory: history, sessionSeconds: totalDur, weakBodyPart: undefined });

      // store final result for UI
      setFinalResult({
        accuracy,
        consistency,
        completion,
        bodyPartScores: final?.bodyPartScores || {},
        metrics: pose?.metrics || null,
        replaySegments,
      });

      try {
        updateStreak();
      } catch {}
    } catch (err) {
      // non-blocking
    }

    // stop detection and show results
    try {
      pose?.stopDetection?.();
    } catch {}

    setPhase("results");
  }, [choreo, currentTime, duration, pose]);

  return (
    <div className="space-y-4">
      {phase === "calibration" && (
        <div>
          <CalibrationScreen
            cameraReady={false}
            videoRef={videoRef}
            stream={null}
            cameraStatus="idle"
            cameraIssue={null}
            onEnableCamera={() => {}}
            onRetryCamera={() => {}}
            onContinueWithoutCamera={() => {}}
            onStart={() => startCountdown()}
          />
          <div className="mt-4 flex justify-center">
            <button className="rounded-lg bg-white px-4 py-2 text-black" onClick={startCountdown}>
              Start Practice
            </button>
          </div>
        </div>
      )}

      {phase === "countdown" && <CountdownOverlay count={countdown} visible={true} />}

      {phase === "dancing" && (
        <div className="relative">
          <VideoStage
            ref={videoRef}
            videoUrl={choreo?.teaching_video_url || choreo?.video || choreo?.videoUrl}
            onTimeUpdate={(t, d) => {
              setCurrentTime(t);
              setDuration(d || 0);
            }}
            onEnded={() => finishPractice()}
          />

          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <PlaybackControls
              isPlaying={true}
              currentTime={currentTime}
              duration={duration}
              speed={1}
              isLooping={false}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onSkip={() => {}}
              onRestart={() => {}}
              onSpeedChange={() => {}}
              onLoopToggle={() => {}}
            />
          </div>
        </div>
      )}

      {phase === "results" && (
        <SessionResults
          accuracy={finalResult?.accuracy ?? 0}
          consistency={finalResult?.consistency ?? 0}
          completion={finalResult?.completion ?? 0}
          bodyPartScores={finalResult?.bodyPartScores ?? {}}
          feedbackNotes={(pose?.feedbackMessages || []).map((f: any) => f.message)}
          replaySegments={finalResult?.replaySegments ?? []}
          routineVideoUrl={choreo?.teaching_video_url || choreo?.video || choreo?.videoUrl}
          styleSlug={choreo?.style || choreo?.styleSlug || ""}
          routineSlug={choreo?.slug || choreo?.routineSlug || String(choreo?.id || "")}
          routineTitle={choreo?.title || choreo?.name || "Routine"}
          onPracticeAgain={() => {
            setFinalResult(null);
            setPhase("calibration");
          }}
        />
      )}
    </div>
  );
}
