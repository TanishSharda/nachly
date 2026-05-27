import Link from "next/link";

export default function StudioDraftsPage() {
  return (
    <main className="min-h-screen bg-[#fbf9f4] px-6 py-16 text-[#31332e]">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-[#b2b2ab]/20 bg-white/80 p-8 shadow-lg">
        <p className="text-xs uppercase tracking-[0.24em] text-[#725b3f]">Studio Drafts</p>
        <h1 className="text-4xl font-bold">Drafts stay with the studio.</h1>
        <p className="max-w-2xl text-sm text-[#5f6058]">
          Recording drafts and future edit exports belong to the studio workflow. You can wire the actual draft list here next.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/studio" className="rounded-full border border-[#6c513236] bg-[#fff8ed] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#725b3f]">
            Back to Studio
          </Link>
          <Link href="/studio/edit" className="rounded-full border border-[#6c513236] bg-[#fff8ed] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#725b3f]">
            Edit
          </Link>
        </div>
      </div>
    </main>
  );
}
