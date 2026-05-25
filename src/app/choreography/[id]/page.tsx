import { redirect } from "next/navigation";

export default function ChoreographyPage({ params }: { params: { id: string } }) {
  redirect(`/choreography/${encodeURIComponent(params.id)}/learn`);
}