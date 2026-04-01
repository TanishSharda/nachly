import { redirect } from "next/navigation";

export default function ScrollRedirect() {
  redirect("/flow");
  return null;
}
