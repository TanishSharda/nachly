import { redirect } from "next/navigation";

export default async function LegacySignupRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirectTarget = params.redirect && params.redirect.startsWith("/") ? params.redirect : "/select-role";
  const next = new URLSearchParams({ mode: "signup", redirect: redirectTarget });
  if (params.error) {
    next.set("error", params.error);
  }

  redirect(`/auth?${next.toString()}`);
}
