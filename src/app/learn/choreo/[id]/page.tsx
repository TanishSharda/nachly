import { redirect } from "next/navigation";

export default async function LearnChoreoDetailAliasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/learn/session/${encodeURIComponent(id)}`);
}
