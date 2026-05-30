import Link from "next/link";
import { getChoreographyFeed } from "@/lib/api/choreos";

export default async function LearnerPracticePage() {
  const data = await getChoreographyFeed({ limit: 8, offset: 0 }).catch(() => ({ posts: [] as any[] }));
  const posts = Array.isArray(data?.posts) ? data.posts : [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe5d4_0%,#fbf8f2_32%,#f6f0e5_100%)] px-4 py-8 text-[#241811] sm:px-6 md:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-[#6c51321f] bg-white/75 p-6 backdrop-blur-xl sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a6c4d]">Practice Studio</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#2a1c11] sm:text-4xl">Open AI practice in one tap.</h1>
        <p className="mt-3 text-sm text-[#665543]">
          Pick a choreography and jump directly into the AI practice camera flow.
        </p>

        {posts.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {posts.slice(0, 6).map((post: any) => (
              <Link
                key={post.id}
                href={`/practice/${encodeURIComponent(post.id)}`}
                className="rounded-2xl border border-[#6c51321f] bg-white p-4 transition hover:bg-[#f8f2e8]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a6c4d]">{post.style_slug || post.style || "Style"}</p>
                <h2 className="mt-2 text-lg font-bold text-[#2a1c11]">{post.title || "Untitled Choreo"}</h2>
                <p className="mt-1 text-xs text-[#6d5e50]">Open AI Practice</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-[#6c51321f] bg-white/70 p-5 text-sm text-[#665543]">
            No choreography found yet. Explore the feed and save one to start practicing.
          </div>
        )}
      </div>
    </main>
  );
}
