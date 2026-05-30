import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

type OnboardingRole = "learner" | "creator";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
      role?: OnboardingRole;
      interests?: string[];
      experience_level?: string;
      full_name?: string;
    };

    const chosenRole: OnboardingRole = payload.role === "creator" ? "creator" : "learner";
    const role = chosenRole === "creator" ? "choreographer" : "student";
    const interests = Array.isArray(payload.interests)
      ? payload.interests.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const experienceLevel = String(payload.experience_level || "beginner");
    const fullName = String(payload.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Dancer").trim();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();

    const existingPreferences = (existingProfile?.preferences as Record<string, unknown> | null) || {};
    const nextPreferences = {
      ...existingPreferences,
      interests,
      experience_level: experienceLevel,
      onboarding_completed: true,
      onboarding_role: chosenRole,
    };

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: fullName,
        role,
        preferences: nextPreferences,
      },
      { onConflict: "id" }
    );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      nextRoute: chosenRole === "creator" ? "/creator/dashboard" : "/learn/feed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save onboarding";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}