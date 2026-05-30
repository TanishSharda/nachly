import Link from "next/link";

export default function StudioRecordHomePage() {
  return (
    <main className="min-h-screen bg-[#fbf9f4] px-6 py-16 text-[#31332e]">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-[#b2b2ab]/20 bg-white/80 p-8 shadow-lg">
        <p className="text-xs uppercase tracking-[0.24em] text-[#725b3f]">Studio Record</p>
        <h1 className="text-4xl font-bold">Pick a choreography to record.</h1>
        <p className="max-w-2xl text-sm text-[#5f6058]">
          Recording sessions live in the studio route family. Open a choreography from Learn to launch the recorder for that item.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/learn/feed" className="rounded-full border border-[#6c513236] bg-[#fff8ed] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#725b3f]">
            Browse Learn
          </Link>
          <Link href="/studio/drafts" className="rounded-full border border-[#6c513236] bg-[#fff8ed] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#725b3f]">
            Drafts
          </Link>
        </div>
      </div>
    </main>
  );
}
