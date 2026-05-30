import type { Metadata } from "next";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { getChoreographyFeed } from "@/lib/supabase/queries/choreos";

export const metadata: Metadata = {
  title: "Learn | Nachly",
  description: "Browse structured dance tutorials and jump into the player.",
};

function TutorialPreview({
  id,
  title,
  creator,
  style,
  difficulty,
  status,
  description,
}: {
  id: string;
  title: string;
  creator: string;
  style: string;
  difficulty: string;
  status: string;
  description: string;
}) {
  return (
    <Card hover padding="lg" className="bg-white/75 border-[#6c51321c] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#8a6c4d]">{creator}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#241811]">{title}</h2>
        </div>
        <span className="rounded-full border border-[#6c513220] bg-[#f7f1e8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#725b3f]">
          {status}
        </span>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#665543]">{description}</p>

      <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#725b3f]">
        <span className="rounded-full border border-[#6c513220] bg-white px-3 py-1.5">{style}</span>
        <span className="rounded-full border border-[#6c513220] bg-white px-3 py-1.5">{difficulty}</span>
        <span className="rounded-full border border-[#6c513220] bg-white px-3 py-1.5">Step-by-step</span>
      </div>

        <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/learn/${id}?mode=stepwise`}
          className="inline-flex items-center justify-center rounded-full bg-[#7a5c3a] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#fff7ef] transition hover:brightness-105"
        >
          Open player
        </Link>
        <Link
          href={`/practice/${id}`}
          className="inline-flex items-center justify-center rounded-full border border-[#6c513220] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#725b3f] transition hover:bg-[#f9f5ef]"
        >
          Practice
        </Link>
      </div>
    </Card>
  );
}

export default async function LearnTabPage() {
  const { posts } = await getChoreographyFeed({ limit: 8, offset: 0 }).catch(() => ({ posts: [] }));
  const items = posts || [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe5d4_0%,#fbf8f2_32%,#f6f0e5_100%)] text-[#241811]">
      <section className="px-4 pb-8 pt-6 sm:px-6 md:px-8 md:pb-10">
        <div className="mx-auto max-w-6xl">
          <Card className="border-[#6c51321c] bg-white/75 backdrop-blur-xl" padding="lg">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#8a6c4d]">Learn tab</p>
            <div className="mt-3 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-[#2a1c11] sm:text-5xl md:text-6xl">Tutorials with a proper player.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#665543] sm:text-base">
                  Open any reel, resume where you left off, switch playback speed, and jump straight into practice from the same screen.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#725b3f]">
                <div className="rounded-2xl border border-[#6c513220] bg-white p-4">Step cues</div>
                <div className="rounded-2xl border border-[#6c513220] bg-white p-4">Resume state</div>
                <div className="rounded-2xl border border-[#6c513220] bg-white p-4">Practice CTA</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-5">
          {items.map((item) => (
            <TutorialPreview
              key={item.id}
              id={item.id}
              title={item.title}
              creator={item.creator_name || item.choreographer_name || "Featured choreographer"}
              style={item.style_slug || item.style || "unknown"}
              difficulty={item.difficulty || item.difficulty_level || "beginner"}
              status={item.submission_status || item.tier || "approved"}
              description={item.description || item.caption || "Open the player to learn this routine."}
            />
          ))}
        </div>
      </section>
    </main>
  );
}