import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/auth/preferences
 * Body: { intro_enabled?: boolean, intro_volume?: number }
 * Updates the authenticated user's profile.preferences JSON column
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const { intro_enabled, intro_volume } = body as { intro_enabled?: boolean; intro_volume?: number };

    // fetch existing preferences
    const { data: profile, error: getErr } = await supabase.from("profiles").select("preferences").eq("id", authUser.id).single();
    if (getErr) {
      console.error("[/api/auth/preferences] fetch profile error", getErr);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    const existing = (profile?.preferences as Record<string, any> | null) || {};
    const next = { ...existing };
    if (typeof intro_enabled === "boolean") next.intro_enabled = intro_enabled;
    if (typeof intro_volume === "number") next.intro_volume = intro_volume;

    const { error: updErr } = await supabase.from("profiles").update({ preferences: next }).eq("id", authUser.id);
    if (updErr) {
      console.error("[/api/auth/preferences] update error", updErr);
      return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[/api/auth/preferences] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
