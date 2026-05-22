import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function CreatorDashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=%2Fcreator%2Fdashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "choreographer" || profile?.role === "admin") {
    redirect("/choreographer");
  }

  redirect("/become-creator");
}