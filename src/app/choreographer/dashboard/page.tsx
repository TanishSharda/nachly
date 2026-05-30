import { redirect } from "next/navigation";

export default function ChoreographerDashboardRedirectPage() {
  redirect("/creator/dashboard");
}