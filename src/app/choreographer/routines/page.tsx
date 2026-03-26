"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ChoreoSubmission } from "@/types/database";

function statusTone(status: ChoreoSubmission["submission_status"]) {
  if (status === "approved") return "text-emerald-300 border-emerald-400/35 bg-emerald-500/10";
  if (status === "needs_improvement") return "text-amber-200 border-amber-300/35 bg-amber-300/10";
  if (status === "rejected") return "text-red-300 border-red-400/35 bg-red-500/10";
  return "text-zinc-200 border-white/20 bg-white/5";
}

export default function ChoreographerRoutinesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState<ChoreoSubmission[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/choreos/submissions", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Could not load submissions");
        }

        if (!mounted) return;
        setSubmissions(Array.isArray(payload?.submissions) ? payload.submissions : []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Could not load submissions");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="tab-screen-enter">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-nred-200/80">Creator System</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">My Choreo Submissions</h1>
          <p className="mt-1 text-sm text-zinc-300">Track review status, AI scores, and resubmit if needed.</p>
        </div>
        <Link
          href="/upload-choreo"
          className="rounded-xl bg-gradient-to-r from-nred-500 to-lime-500 px-4 py-2 text-sm font-semibold text-[#041225]"
        >
          New Upload
        </Link>
      </div>

      {loading ? <div className="rounded-2xl app-card p-5 text-zinc-300">Loading submissions...</div> : null}
      {error ? <div className="rounded-2xl border border-red-400/35 bg-red-500/10 p-5 text-red-200">{error}</div> : null}

      {!loading && !error && submissions.length === 0 ? (
        <div className="rounded-2xl app-card p-8 text-center">
          <p className="text-zinc-300">No choreography submissions yet.</p>
          <Link
            href="/upload-choreo"
            className="mt-4 inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
          >
            Upload your first choreo
          </Link>
        </div>
      ) : null}

      {!loading && !error && submissions.length > 0 ? (
        <div className="grid gap-3">
          {submissions.map((submission) => (
            <Link
              key={submission.id}
              href={`/choreographer/routines/${submission.id}`}
              className="rounded-2xl app-card p-4 transition hover:brightness-110"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{submission.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {submission.style_slug} • {submission.difficulty} • v{submission.version}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{submission.description}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(submission.submission_status)}`}>
                    {submission.submission_status}
                  </span>
                  <p className="mt-2 text-xs text-zinc-400">Tier: {submission.tier}</p>
                  {typeof submission.ai_overall_score === "number" ? (
                    <p className="text-xs text-emerald-200">Score {submission.ai_overall_score}</p>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
