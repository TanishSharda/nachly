import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient, createServerSupabase } from "@/lib/supabase/server";

function slugify(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickVideo(entries: Array<{ video_url?: string | null; video_type?: string | null; sort_order?: number | null }>) {
  const performance = [...(entries || [])].find((entry) => entry?.video_type === "performance" && entry?.video_url);
  if (performance?.video_url) return performance.video_url;
  const first = [...(entries || [])].find((entry) => entry?.video_url);
  return first?.video_url || "";
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  if (params.username === "me") {
    return notFound();
  }

  const supabase = await createServerSupabase();
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, role, bio, social_links, follower_count, total_students, experience_level, dance_styles, is_verified")
    .order("created_at", { ascending: true });

  const profile = (profiles || []).find((entry: any) => slugify(entry.full_name) === params.username);
  if (!profile) {
    notFound();
  }

  const [{ data: submissions }, { data: routines }] = await Promise.all([
    db
      .from("choreo_submissions")
      .select("id,title,description,caption,video_url,style_slug,difficulty,published_at,created_at,profiles(full_name,avatar_url)")
      .eq("user_id", profile.id)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false }),
    db
      .from("routines")
      .select("id,title,description,caption,difficulty,created_at,updated_at,routine_videos(video_url,video_type,sort_order),dance_styles(slug,name)")
      .eq("choreographer_id", profile.id)
      .eq("is_published", true)
      .eq("is_approved", true)
      .order("created_at", { ascending: false }),
  ]);

  const publishedChoreographies = [
    ...(submissions || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description || item.caption || "",
      style: item.style_slug || "unknown",
      difficulty: item.difficulty || "beginner",
      published_at: item.published_at || item.created_at,
      video_url: item.video_url || "",
      source: "submission",
    })),
    ...(routines || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description || item.caption || "",
      style: item.dance_styles?.[0]?.slug || "unknown",
      difficulty: item.difficulty || "beginner",
      published_at: item.created_at,
      video_url: pickVideo(item.routine_videos || []),
      source: "routine",
    })),
  ].sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());

  return (
    <main className="min-h-screen bg-[#f4f1ec] text-[#221d16]">
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-[2rem] border border-[#6c51321c] bg-white/80 p-6 shadow-[0_24px_48px_-30px_rgba(58,42,26,0.28)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a6c4d]">Public profile</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-[#2a1c11]">{profile.full_name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#665543]">{profile.bio || "Creator profile on Nachly."}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a5c3a]">
              <span className="rounded-full border border-[#6c513220] bg-white px-3 py-2">{profile.role}</span>
              <span className="rounded-full border border-[#6c513220] bg-white px-3 py-2">{profile.follower_count || 0} followers</span>
              <span className="rounded-full border border-[#6c513220] bg-white px-3 py-2">{publishedChoreographies.length} published</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {publishedChoreographies.length ? publishedChoreographies.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[2rem] border border-[#6c51321c] bg-[#1b120d] shadow-[0_28px_60px_-36px_rgba(48,31,17,0.8)]">
              <div className="p-6 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#f7d9b7]">{item.style} • {item.difficulty}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">{item.title}</h2>
                <p className="mt-3 max-w-2xl text-sm text-[#f1e4d7]">{item.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/choreography/${encodeURIComponent(item.id)}/learn`} className="rounded-2xl bg-[#f4eadb] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#372515]">
                    Learn
                  </Link>
                  <Link href={`/choreography/${encodeURIComponent(item.id)}/practice`} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#f4e7d6]">
                    Practice
                  </Link>
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-[2rem] border border-[#6c51321c] bg-white/80 p-6 text-sm text-[#665543]">No published choreographies yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}