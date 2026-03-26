"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

type CameraCheckResult = {
  secureContext: string;
  mediaDevicesAvailable: string;
  userAgent: string;
};

export default function PracticePreflightPage() {
  const { styleSlug, routineSlug } = useParams<{ styleSlug: string; routineSlug: string }>();
  const [result, setResult] = useState<CameraCheckResult | null>(null);

  const practiceHref = useMemo(() => `/explore/${styleSlug}/${routineSlug}/practice`, [styleSlug, routineSlug]);

  const runCameraCheck = async () => {
    const secureContext = window.isSecureContext ? "Yes" : "No";
    const mediaDevicesAvailable = navigator.mediaDevices?.getUserMedia ? "Yes" : "No";
    const userAgent = navigator.userAgent;

    setResult({
      secureContext,
      mediaDevicesAvailable,
      userAgent,
    });
  };

  return (
    <div className="section-padding py-6 sm:py-10 tab-screen-enter">
      <div className="mx-auto max-w-2xl app-card rounded-2xl p-5 sm:p-7">
        <h1 className="font-display text-3xl font-bold text-white">Camera Check</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Run a quick preflight to confirm your device is ready, then enter practice mode.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runCameraCheck}
            className="tap-feedback rounded-xl bg-gradient-to-r from-nred-500 to-lime-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Run Camera Check
          </button>
          <Link
            href={practiceHref}
            className="tap-feedback rounded-xl border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white"
          >
            Continue to Practice
          </Link>
        </div>

        {result ? (
          <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-200">
            <p>Secure context: {result.secureContext}</p>
            <p>Media devices API: {result.mediaDevicesAvailable}</p>
            <p className="break-words text-zinc-400">User agent: {result.userAgent}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
