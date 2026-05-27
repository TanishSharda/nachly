import Link from "next/link";

export default function PracticeSessionPage({ params }: { params: { id: string } }) {
  const sessionId = params?.id || "unknown";

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Practice Session</p>
        <h1 className="text-4xl font-bold">Session review</h1>
        <p className="max-w-2xl text-sm text-zinc-300">
          Session ID: <span className="font-mono text-white">{sessionId}</span>
        </p>
        <p className="text-sm text-zinc-400">
          Practice sessions stay in the AI Practice system. Detailed per-session analytics can be wired here next.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/practice" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
            Back to Practice
          </Link>
          <Link href="/learn/feed" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
            Pick a Routine
          </Link>
        </div>
      </div>
    </main>
  );
}
