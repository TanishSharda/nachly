import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const planId = (searchParams.get("planId") || "").trim();

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ active: false });
  }

  let query = supabase
    .from("subscriptions")
    .select("id,status,ends_at")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (planId) {
    query = query.eq("plan_id", planId);
  }

  const { data } = await query.maybeSingle();

  if (!data?.id) {
    return NextResponse.json({ active: false });
  }

  if (data.ends_at && new Date(data.ends_at) < new Date()) {
    return NextResponse.json({ active: false, expired: true });
  }

  return NextResponse.json({ active: true, ends_at: data.ends_at || null });
}
