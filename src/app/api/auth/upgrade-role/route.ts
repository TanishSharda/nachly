import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { error } = await supabase.from("profiles").update({ role: "choreographer" }).eq("id", user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
