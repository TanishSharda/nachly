"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type Workshop = {
  id: string;
  title: string;
  start_at: string;
  duration_minutes: number;
  price_inr: number;
  capacity: number;
  status: "scheduled" | "completed" | "cancelled";
};

export default function CreatorWorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [priceInr, setPriceInr] = useState("59900");
  const [capacity, setCapacity] = useState("100");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadWorkshops() {
      try {
        const response = await fetch("/api/choreographer/workshops", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!mounted || !response.ok) return;
        setWorkshops(Array.isArray(payload.workshops) ? payload.workshops : []);
      } catch {
        if (mounted) setWorkshops([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadWorkshops();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreateWorkshop() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/choreographer/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startAt: startAt.trim(),
          durationMinutes: Number(durationMinutes),
          priceInr: Number(priceInr),
          capacity: Number(capacity),
          description: description.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Unable to create workshop");
        return;
      }

      if (payload?.workshop) {
        setWorkshops((current) => [...current, payload.workshop]);
      }

      setTitle("");
      setStartAt("");
      setDurationMinutes("90");
      setPriceInr("59900");
      setCapacity("100");
      setDescription("");
      setMessage("Workshop created successfully.");
    } catch {
      setMessage("Unable to create workshop");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#F3B2AB]/70">Creator Studio</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Workshops</h1>
          <p className="text-sm text-zinc-400 mt-1">Schedule live workshops and manage attendance.</p>
        </div>
        <button
          type="button"
          onClick={handleCreateWorkshop}
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-[#F3B2AB] to-[#D88B80] px-4 py-2 text-xs font-bold text-[#0a0a0a]"
        >
          {saving ? "Saving..." : "Create Workshop"}
        </button>
      </div>

      {message ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">{message}</div>
      ) : null}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white">Upcoming Sessions</h3>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">May–June</span>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">Loading workshops...</div>
          ) : workshops.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">No workshops scheduled yet. Create one to start selling live sessions.</div>
          ) : (
            workshops.map((workshop) => (
              <div key={workshop.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-sm font-semibold text-white">{workshop.title}</p>
                  <p className="text-[11px] text-zinc-500">{new Date(workshop.start_at).toLocaleString()} • {workshop.duration_minutes} mins</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#F3B2AB]">₹{Math.round(workshop.price_inr / 100)}</p>
                    <p className="text-[10px] text-zinc-500">{workshop.capacity} seats</p>
                  </div>
                  <Badge variant={workshop.status === "scheduled" ? "default" : "success"}>{workshop.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-display font-bold text-white mb-3">Workshop Builder</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Workshop title" />
          <input value={startAt} onChange={(event) => setStartAt(event.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="2026-05-20T12:00:00Z" />
          <input value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Duration (mins)" />
          <input value={priceInr} onChange={(event) => setPriceInr(event.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Price (paise)" />
          <input value={capacity} onChange={(event) => setCapacity(event.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white sm:col-span-2" placeholder="Capacity" />
        </div>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" rows={4} placeholder="Describe what learners will get." />
        <button type="button" onClick={handleCreateWorkshop} disabled={saving} className="mt-4 rounded-xl border border-[#F3B2AB]/30 bg-[#F3B2AB]/10 px-4 py-2 text-xs font-semibold text-[#F3B2AB] disabled:opacity-60">
          {saving ? "Saving..." : "Save Workshop"}
        </button>
      </Card>
    </div>
  );
}
