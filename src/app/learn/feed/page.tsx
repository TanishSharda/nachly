import { redirect } from "next/navigation";

export default function LearnFeedRedirectPage() {
  // Canonical learner feed moved to /scroll — redirect to avoid 404s.
  redirect("/scroll");
}

