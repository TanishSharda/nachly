"use client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LearnModePlayer from "./LearnModePlayer";
import ClientPracticeShell from "@/components/practice/ClientPracticeShell";

type Step = "teach" | "practice" | "record";

export default function ClientLearnShell({ choreo }: { choreo: any }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("teach");

  const gotoPractice = useCallback(() => {
    // Render in-place practice shell instead of navigating away
    setStep("practice");
  }, []);

  const gotoRecord = useCallback(() => {
    router.push(`/record/${encodeURIComponent(choreo.id)}`);
  }, [router, choreo]);

  return (
    <div className="space-y-4">
      <nav className="flex items-center justify-center gap-2 bg-black/60 rounded-xl p-1">
        <button
          aria-pressed={step === "teach"}
          onClick={() => setStep("teach")}
          className={`px-3 py-2 rounded-lg text-sm ${step === "teach" ? "bg-white text-black" : "text-white/80"}`}
        >
          Teach
        </button>

        <button
          aria-pressed={step === "practice"}
          onClick={() => {
            setStep("practice");
            gotoPractice();
          }}
          className={`px-3 py-2 rounded-lg text-sm ${step === "practice" ? "bg-white text-black" : "text-white/80"}`}
        >
          Practice
        </button>

        <button
          aria-pressed={step === "record"}
          onClick={() => {
            setStep("record");
            gotoRecord();
          }}
          className={`px-3 py-2 rounded-lg text-sm ${step === "record" ? "bg-white text-black" : "text-white/80"}`}
        >
          Record
        </button>
      </nav>

      <div className="mt-2">
        {step === "teach" && <LearnModePlayer choreo={choreo} mode="stepwise" practiceHref={`/choreography/${choreo?.id}/practice`} />}
        {step === "practice" && <ClientPracticeShell choreo={choreo} />}
        {step === "record" && (
          <div className="rounded-lg border border-white/10 p-6 text-center text-sm text-white/80">
            Redirecting to Record...
          </div>
        )}
      </div>
    </div>
  );
}
