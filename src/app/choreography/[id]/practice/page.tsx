import { redirect } from "next/navigation";

export default function ChoreographyPracticePage({ params }: { params: { id: string } }) {
  redirect(`/record/${encodeURIComponent(params.id)}`);
}