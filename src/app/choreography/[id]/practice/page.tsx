import { redirect } from "next/navigation";

export default async function ChoreographyPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/practice/${encodeURIComponent(id)}`);
}