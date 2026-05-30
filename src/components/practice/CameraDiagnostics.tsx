"use client";

import { useEffect, useState, useCallback } from "react";

interface CameraDiagnosticsProps {
  onEnableCamera?: () => Promise<void> | (() => void);
  onError?: (err: any) => void;
}

export default function CameraDiagnostics({ onEnableCamera, onError }: CameraDiagnosticsProps) {
  const [supported, setSupported] = useState(false);
  const [devices, setDevices] = useState([] as MediaDeviceInfo[]);
  const [lastError, setLastError] = useState<null | { name?: string; message?: string }>(null);
  const [testRunning, setTestRunning] = useState(false);

  const listDevices = useCallback(async () => {
    setLastError(null);
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "videoinput"));
    } catch (e: any) {
      setLastError({ name: e?.name, message: e?.message });
      if (onError) onError(e);
    }
  }, [onError]);

  useEffect(() => {
    setTimeout(() => {
      setSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
      // attempt to enumerate devices on mount (does not prompt for permission)
      void listDevices();
    }, 0);
  }, [listDevices]);

  

  async function runQuickTest() {
    setLastError(null);
    setTestRunning(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // immediately stop
      stream.getTracks().forEach((t) => t.stop());
      await listDevices();
      if (onError) onError(null);
      if (onEnableCamera) {
        try {
          await onEnableCamera();
        } catch (e) {
          // ignore errors from caller
        }
      }
    } catch (e: any) {
      setLastError({ name: e?.name, message: e?.message });
      if (onError) onError(e);
    } finally {
      setTestRunning(false);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    }
  }

  async function runFallbacks() {
    setLastError(null);
    setTestRunning(true);
    let stream: MediaStream | null = null;
    const variants = [
      { video: { facingMode: { ideal: "user" }, width: { ideal: 720 }, height: { ideal: 1280 } } },
      { video: { facingMode: "user" } },
      { video: true },
    ];

    try {
      // try standard variants first
      for (const c of variants) {
        try {
           
          stream = await navigator.mediaDevices.getUserMedia(c as MediaStreamConstraints);
          break;
        } catch (err) {
          // continue to next
        }
      }

      // if still no stream, enumerate devices and try deviceId
      if (!stream) {
        const list = await navigator.mediaDevices.enumerateDevices();
        const cams = list.filter((d) => d.kind === "videoinput");
        for (const cam of cams) {
          try {
             
            stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cam.deviceId } } });
            if (stream) break;
          } catch (err: any) {
            // record lastError but keep trying
            setLastError({ name: err?.name, message: err?.message });
            if (onError) onError(err);
          }
        }
      }

      if (!stream) {
        // if nothing succeeded, show last known error
        if (!lastError) setLastError({ message: "All fallback attempts failed" });
        if (onError && lastError) onError(lastError);
      } else {
        stream.getTracks().forEach((t) => t.stop());
        await listDevices();
        setLastError(null);
        if (onError) onError(null);
        if (onEnableCamera) {
          try { await onEnableCamera(); } catch {}
        }
      }
    } catch (e: any) {
      setLastError({ name: e?.name, message: e?.message });
    } finally {
      setTestRunning(false);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    }
  }

  return (
    <div className="fixed left-4 bottom-4 z-[60] w-[320px] max-w-[90vw] bg-dark/70 backdrop-blur-lg p-3 rounded-xl border border-dark-700/50 text-sm text-cream-100">
      <div className="flex items-center justify-between mb-2">
        <strong>Camera diagnostics</strong>
        <span className="text-xs text-dark-300">v1</span>
      </div>

      <div className="mb-2">Supported: {supported ? "Yes" : "No"}</div>

      <div className="mb-2">
        Devices: {devices.length}
        {devices.length > 0 && (
          <ul className="mt-1 list-disc list-inside text-xs text-dark-300">
            {devices.map((d) => (
              <li key={d.deviceId}>{d.label || "Unnamed camera"}</li>
            ))}
          </ul>
        )}
      </div>

      {lastError && (
        <div className="mb-2 text-xs text-nred-200">
          <div className="font-semibold">Last error</div>
          <div>{lastError.name}: {lastError.message}</div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          className="flex-1 rounded-md bg-cream-100 text-dark-900 px-2 py-1 text-xs"
          onClick={() => void runQuickTest()}
          disabled={testRunning}
        >
          {testRunning ? "Testing…" : "Quick test"}
        </button>
        <button
          className="rounded-md bg-transparent border border-dark-700/40 px-2 py-1 text-xs"
          onClick={() => void listDevices()}
        >
          Refresh
        </button>
        <button
          className="rounded-md bg-transparent border border-dark-700/40 px-2 py-1 text-xs"
          onClick={() => void runFallbacks()}
          disabled={testRunning}
        >
          Retry (fallbacks)
        </button>
      </div>
    </div>
  );
}
