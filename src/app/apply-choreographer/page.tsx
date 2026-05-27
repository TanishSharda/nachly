import { redirect } from "next/navigation";

export default function LegacyApplyRedirectPage() {
  redirect("/creator/upload");
}
