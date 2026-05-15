import { redirect } from "next/navigation";

export default function LegacyApplyRedirectPage() {
  redirect("/choreographer/create");
}
