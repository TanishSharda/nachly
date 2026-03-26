"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Step = 1 | 2 | 3;
type Style = "hip-hop" | "bhangra" | "kathak" | "zumba" | "bollywood";
type Difficulty = "beginner" | "intermediate" | "advanced";

const styleOptions: Array<{ value: Style; label: string }> = [
  { value: "hip-hop", label: "Hip Hop" },
  { value: "bhangra", label: "Bhangra" },
  { value: "kathak", label: "Kathak" },
  { value: "zumba", label: "Zumba" },
  { value: "bollywood", label: "Bollywood" },
];

export default function UploadChoreoPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [videoUrl, setVideoUrl] = useState(search.get("videoUrl") || "");
  const [styleSlug, setStyleSlug] = useState<Style>((search.get("style") as Style) || "hip-hop");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [title, setTitle] = useState(search.get("title") || "");
  const [description, setDescription] = useState("");
  const [caption, setCaption] = useState("");

  const [fullBodyVisible, setFullBodyVisible] = useState(false);
  const [stableCamera, setStableCamera] = useState(false);
  const [goodLighting, setGoodLighting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | {
    id: string;
    status: string;
    tier: string;
    message: string;
    cta?: string | null;
    suggestions?: string[];
  }>(null);

  const checklistPassed = fullBodyVisible && stableCamera && goodLighting;

  const canGoStep2 = useMemo(() => videoUrl.trim().length > 0, [videoUrl]);
  const canGoStep3 = useMemo(() => title.trim().length >= 2 && description.trim().length >= 10, [title, description]);

  async function submit() {
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/choreos/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          caption: caption.trim(),
          videoUrl: videoUrl.trim(),
          styleSlug,
          difficulty,
          checklist: {
            fullBodyVisible,
            stableCamera,
            goodLighting,
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
        setResult({
          id: "",
          status: "blocked",
          tier: "community",
          message: payload?.message || payload?.error || "Submission failed",
          cta: payload?.cta || null,
          suggestions,
        });
        return;
      }

      setResult({
        id: payload?.submission?.id || "",
        status: payload?.submission?.submission_status || "pending_review",
        tier: payload?.submission?.tier || "community",
        message: payload?.message || "Submission queued for AI evaluation",
      });
    } catch {
      setError("Could not submit choreography right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="section-padding py-6 sm:py-10 tab-screen-enter">
      <div className="mx-auto max-w-2xl rounded-3xl app-card p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-nred-200/80">Creator Upload</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Post Choreography</h1>
            <p className="mt-2 text-sm text-zinc-300">Upload - AI Feedback - Improve - Get Featured</p>
          </div>
          <Link href="/scroll" className="rounded-lg border border-white/20 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition">
            Back to Scroll
          </Link>
        </div>

        <div className="mb-5 flex items-center gap-2 text-xs">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-2 flex-1 rounded-full ${step >= n ? "bg-nred-400" : "bg-white/15"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <section>
            <h2 className="text-lg font-semibold text-white">1. Upload or Record Video</h2>
            <p className="mt-1 text-sm text-zinc-300">Paste a choreography video URL. If you came from recording, this is prefilled.</p>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              className="input-field mt-4"
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={!canGoStep2}
                onClick={() => setStep(2)}
                className="rounded-xl bg-gradient-to-r from-nred-500 to-lime-500 px-4 py-2 text-sm font-semibold text-[#041225] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="text-lg font-semibold text-white">2. Style and Difficulty</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs text-zinc-400">Dance Style</p>
                <select value={styleSlug} onChange={(e) => setStyleSlug(e.target.value as Style)} className="input-field">
                  {styleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-2 text-xs text-zinc-400">Difficulty</p>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="input-field">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Title" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field min-h-[100px]"
                placeholder="Description"
              />
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="input-field"
                placeholder="Caption (optional)"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white">
                Back
              </button>
              <button
                type="button"
                disabled={!canGoStep3}
                onClick={() => setStep(3)}
                className="rounded-xl bg-gradient-to-r from-nred-500 to-lime-500 px-4 py-2 text-sm font-semibold text-[#041225] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 className="text-lg font-semibold text-white">3. Quality Checklist</h2>
            <p className="mt-1 text-sm text-zinc-300">All checks must pass before submission.</p>

            <div className="mt-4 grid gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200">
                <input type="checkbox" checked={fullBodyVisible} onChange={(e) => setFullBodyVisible(e.target.checked)} />
                Full body visible
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200">
                <input type="checkbox" checked={stableCamera} onChange={(e) => setStableCamera(e.target.checked)} />
                Stable camera
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200">
                <input type="checkbox" checked={goodLighting} onChange={(e) => setGoodLighting(e.target.checked)} />
                Good lighting
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white">
                Back
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !checklistPassed}
                className="rounded-xl bg-gradient-to-r from-nred-500 to-lime-500 px-4 py-2 text-sm font-semibold text-[#041225] disabled:opacity-40"
              >
                {submitting ? "Submitting..." : "Submit Choreography"}
              </button>
            </div>
          </section>
        )}

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        {result && (
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">{result.message}</p>
            <p className="mt-1 text-xs text-zinc-400">Status: {result.status} | Tier: {result.tier}</p>
            {result.suggestions && result.suggestions.length > 0 && (
              <ul className="mt-3 list-disc pl-4 text-xs text-zinc-300 space-y-1">
                {result.suggestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {result.cta && (
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  router.refresh();
                }}
                className="mt-3 rounded-xl border border-nred-400/40 bg-nred-500/10 px-3 py-2 text-xs font-semibold text-nred-200"
              >
                {result.cta}
              </button>
            )}
            <div className="mt-3">
              <Link
                href="/choreographer/routines"
                className="inline-flex rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white"
              >
                View My Submissions
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
