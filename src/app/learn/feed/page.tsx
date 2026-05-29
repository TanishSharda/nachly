import { redirect } from "next/navigation";

export default async function LearnFeedRedirectPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Canonical learner feed moved to /scroll — redirect to avoid 404s.
  const params = new URLSearchParams();
  const resolvedSearchParams = await searchParams;

  for (const [key, value] of Object.entries(resolvedSearchParams || {})) {
    if (typeof value === "string" && value.trim()) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  redirect(query ? `/scroll?${query}` : "/scroll");
}

