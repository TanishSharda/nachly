import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Learn choreography | Nachly",
};

export default async function ChoreoLearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/learn/${encodeURIComponent(id)}?mode=stepwise`);
}