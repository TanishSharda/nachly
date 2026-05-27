import { redirect } from "next/navigation";

export default async function ChoreographyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/choreography/${encodeURIComponent(id)}/learn`);
}