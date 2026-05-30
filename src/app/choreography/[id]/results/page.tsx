import { redirect } from "next/navigation";

export default async function ChoreographyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/replay/${encodeURIComponent(id)}`);
}