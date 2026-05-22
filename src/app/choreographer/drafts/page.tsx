"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface DraftRecord {
  id: string;
  title: string;
  description: string;
  updated_at?: string;
  created_at?: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/choreos/submissions?status=draft");
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || "Failed to load drafts");
        return;
      }
      setDrafts(payload?.submissions || []);
    } catch {
      setError("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const deleteDraft = useCallback(async (draft: DraftRecord) => {
    const confirmDelete = window.confirm("Delete this draft? This cannot be undone.");
    if (!confirmDelete) return;
    setDeletingId(draft.id);
    try {
      const response = await fetch(`/api/choreos/submissions?id=${draft.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError("Could not delete draft");
        return;
      }
      setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
    } catch {
      setError("Could not delete draft");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#F3B2AB]/70">Creator Studio</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Drafts</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage unfinished choreography uploads.</p>
        </div>
        <Link
          href="/creator/upload"
          className="rounded-xl bg-gradient-to-r from-[#F3B2AB] to-[#D88B80] px-4 py-2 text-xs font-bold text-[#0a0a0a]"
        >
          New Upload
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
            Loading drafts...
          </div>
        )}
        {!loading && drafts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-400">
            No drafts yet. Start a new upload to create one.
          </div>
        )}
        {drafts.map((draft) => (
          <div key={draft.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white truncate">{draft.title || "Untitled Draft"}</h3>
                <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{draft.description || "No description yet."}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/upload-choreo?draft=${draft.id}`}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-200 hover:bg-white/5"
                >
                  Continue
                </Link>
                <button
                  type="button"
                  onClick={() => deleteDraft(draft)}
                  disabled={deletingId === draft.id}
                  className="rounded-lg border border-red-400/20 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                >
                  {deletingId === draft.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-zinc-600">Last updated: {draft.updated_at ? new Date(draft.updated_at).toLocaleString() : "Just now"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
