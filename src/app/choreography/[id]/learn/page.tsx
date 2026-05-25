import { redirect } from "next/navigation";

export default function ChoreographyLearnPage({ params }: { params: { id: string } }) {
  redirect(`/learn/${encodeURIComponent(params.id)}`);
}