"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { ChoreoSubmission } from "@/types/database";

export default function ChoreographerSubmissionDetailPage() {
  const params = useParams<{ submissionId: string }>();
  const router = useRouter();
  const submissionId = params?.submissionId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState<ChoreoSubmission | null>(null);
  const [resubmitVideoUrl, setResubmitVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const canResubmit = useMemo(() => {
    if (!submission) return false;
    return submission.submission_status === "needs_improvement" || submission.submission_status === "rejected";
  }, [submission]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!submissionId) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/choreos/submissions/${encodeURIComponent(submissionId)}`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Could not load submission details");
        }

        if (!mounted) return;
        setSubmission(payload?.submission || null);
        setResubmitVideoUrl(payload?.submission?.video_url || "");
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Could not load submission details");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [submissionId]);

  async function handleResubmit() {
    if (!submission || !submissionId || !resubmitVideoUrl.trim()) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/choreos/submissions/${encodeURIComponent(submissionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resubmit",
          title: submission.title,
          description: submission.description,
          caption: submission.caption || "",
          videoUrl: resubmitVideoUrl.trim(),
          checklist: {
            fullBodyVisible: true,
            stableCamera: true,
            goodLighting: true,
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Resubmission failed");
      }

      router.refresh();
      const refreshed = await fetch(`/api/choreos/submissions/${encodeURIComponent(submissionId)}`, { cache: "no-store" });
      const refreshedPayload = await refreshed.json().catch(() => ({}));
      if (refreshed.ok) {
        setSubmission(refreshedPayload?.submission || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resubmission failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="tab-screen-enter">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-nred-200/80">Submission Detail</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">{submission?.title || "Choreo"}</h1>
        </div>
        <Link href="/choreographer/routines" className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white">
          Back
        </Link>
      </div>

      {loading ? <div className="rounded-2xl app-card p-5 text-zinc-300">Loading submission...</div> : null}
      {error ? <div className="mb-4 rounded-2xl border border-red-400/35 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

      {!loading && submission ? (
        <div className="grid gap-4">
          <div className="rounded-2xl app-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1">Status: {submission.submission_status}</span>
              <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1">Tier: {submission.tier}</span>
              <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1">Style: {submission.style_slug}</span>
              {typeof submission.ai_overall_score === "number" ? (
                <span className="rounded-full border border-emerald-300/35 bg-emerald-500/10 px-2 py-1 text-emerald-100">
                  Score: {submission.ai_overall_score}
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-sm text-zinc-300">{submission.description}</p>
            {submission.caption ? <p className="mt-2 text-xs text-zinc-400">Caption: {submission.caption}</p> : null}

            {submission.improvement_suggestions?.length ? (
              <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3">
                <p className="text-xs font-semibold text-amber-100">Improve Loop Suggestions</p>
                <ul className="mt-2 list-disc pl-4 text-xs text-amber-50/90 space-y-1">
                  {submission.improvement_suggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {canResubmit ? (
            <div className="rounded-2xl app-card p-5">
              <h2 className="text-lg font-semibold text-white">Re-record & Improve</h2>
              <p className="mt-1 text-sm text-zinc-300">Update your video URL and resubmit for another AI evaluation.</p>
              <input
                className="input-field mt-3"
                value={resubmitVideoUrl}
                onChange={(e) => setResubmitVideoUrl(e.target.value)}
                placeholder="https://..."
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={saving || !resubmitVideoUrl.trim()}
                  onClick={handleResubmit}
                  className="rounded-xl bg-gradient-to-r from-nred-500 to-lime-500 px-4 py-2 text-sm font-semibold text-[#041225] disabled:opacity-40"
                >
                  {saving ? "Resubmitting..." : "Resubmit"}
                </button>
                <Link href="/upload-choreo" className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white">
                  New Upload
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
