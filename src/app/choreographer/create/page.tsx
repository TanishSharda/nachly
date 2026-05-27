import { redirect } from "next/navigation";

export default function ChoreographerCreateRedirectPage() {
  redirect("/creator/upload");
}