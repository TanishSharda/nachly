import { redirect } from "next/navigation";

export default function ChoreographerSubmissionDetailRedirectPage({ params }: { params: { submissionId: string } }) {
  redirect(`/creator/choreos/${encodeURIComponent(params.submissionId)}`);
}
