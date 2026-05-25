import { redirect } from "next/navigation";

export default function ChoreographyResultsPage({ params }: { params: { id: string } }) {
  redirect(`/replay/${encodeURIComponent(params.id)}`);
}