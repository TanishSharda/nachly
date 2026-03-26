import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const styleSlug = (searchParams.get("styleSlug") || "").trim().toLowerCase();

  if (!styleSlug) {
    return NextResponse.json({ purchased: false });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ purchased: false });
  }

  const { data: styleRow } = await supabase
    .from("dance_styles")
    .select("id")
    .eq("slug", styleSlug)
    .maybeSingle();

  if (!styleRow?.id) {
    return NextResponse.json({ purchased: false });
  }

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("style_id", styleRow.id)
    .eq("status", "completed")
    .maybeSingle();

  return NextResponse.json({ purchased: Boolean(purchase?.id) });
}
