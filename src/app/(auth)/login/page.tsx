import { redirect } from "next/navigation";

export default async function LegacyLoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirectTarget = params.redirect && params.redirect.startsWith("/") ? params.redirect : "/select-role";
  const next = new URLSearchParams({ mode: "login", redirect: redirectTarget });
  if (params.error) {
    next.set("error", params.error);
  }

  redirect(`/auth?${next.toString()}`);
}
