import type { Metadata } from "next";
import { getChoreographyPost } from "@/lib/api/choreos";
import ClientLearnShell from "@/components/learn/ClientLearnShell";

export const metadata: Metadata = {
  title: "Learn choreography | Nachly",
};

export default async function ChoreoLearnPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { post } = await getChoreographyPost(id).catch(() => ({ post: null }));

  return (
    <main className="min-h-screen bg-black text-white">
      {post ? (
        <div className="mx-auto max-w-4xl px-4 py-6">
          <ClientLearnShell choreo={post} />
        </div>
      ) : (
        <div className="p-6 text-center">Choreography not found.</div>
      )}
    </main>
  );
}