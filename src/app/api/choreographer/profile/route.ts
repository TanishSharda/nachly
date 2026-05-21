import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const profilePatchSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(300).optional().or(z.literal("")),
  philosophy: z.string().trim().max(500).optional().or(z.literal("")),
  expLevel: z.string().trim().min(1).max(40).optional(),
  selectedStyles: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  instagram: z.string().trim().max(2000).optional().or(z.literal("")),
  youtube: z.string().trim().max(2000).optional().or(z.literal("")),
  tiktok: z.string().trim().max(2000).optional().or(z.literal("")),
  cameraInput: z.string().trim().max(120).optional().or(z.literal("")),
  aiSensitivity: z.number().int().min(0).max(100).optional(),
  theme: z.enum(["dark", "light"]).optional(),
});

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ profile: null, fallback: true });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ profile: null, fallback: true });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name,bio,social_links,preferences,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ profile: null, fallback: true });
  }

  return NextResponse.json({
    profile: {
      displayName: data.full_name || "",
      bio: data.bio || "",
      philosophy: String((data.preferences as Record<string, unknown> | null)?.philosophy || ""),
      expLevel: String((data.preferences as Record<string, unknown> | null)?.experience_level || "emerging"),
      cameraInput: String((data.preferences as Record<string, unknown> | null)?.camera_input || "FaceTime HD Camera"),
      aiSensitivity: Number((data.preferences as Record<string, unknown> | null)?.ai_sensitivity || 70),
      theme: String((data.preferences as Record<string, unknown> | null)?.theme || "dark") === "light" ? "light" : "dark",
      selectedStyles: Array.isArray((data.preferences as Record<string, unknown> | null)?.dance_styles)
        ? ((data.preferences as Record<string, unknown>).dance_styles as string[])
        : [],
      instagram: String((data.social_links as Record<string, unknown> | null)?.instagram || ""),
      youtube: String((data.social_links as Record<string, unknown> | null)?.youtube || ""),
      tiktok: String((data.social_links as Record<string, unknown> | null)?.tiktok || ""),
    },
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
  }

  const hasAnyPatchField = Object.values(parsed.data).some((value) => value !== undefined);
  if (!hasAnyPatchField) {
    return NextResponse.json({ error: "No profile fields provided" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: existingProfile, error: existingError } = await supabase
    .from("profiles")
    .select("full_name,bio,social_links,preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  const existingSocial = (existingProfile?.social_links as Record<string, unknown> | null) || {};
  const existingPreferences = (existingProfile?.preferences as Record<string, unknown> | null) || {};

  const nextSocial = {
    ...existingSocial,
    ...(parsed.data.instagram !== undefined ? { instagram: parsed.data.instagram || "" } : {}),
    ...(parsed.data.youtube !== undefined ? { youtube: parsed.data.youtube || "" } : {}),
    ...(parsed.data.tiktok !== undefined ? { tiktok: parsed.data.tiktok || "" } : {}),
  };

  const nextPreferences = {
    ...existingPreferences,
    ...(parsed.data.expLevel !== undefined ? { experience_level: parsed.data.expLevel } : {}),
    ...(parsed.data.selectedStyles !== undefined ? { dance_styles: parsed.data.selectedStyles } : {}),
    ...(parsed.data.philosophy !== undefined ? { philosophy: parsed.data.philosophy || "" } : {}),
    ...(parsed.data.cameraInput !== undefined ? { camera_input: parsed.data.cameraInput || "FaceTime HD Camera" } : {}),
    ...(parsed.data.aiSensitivity !== undefined ? { ai_sensitivity: parsed.data.aiSensitivity } : {}),
    ...(parsed.data.theme !== undefined ? { theme: parsed.data.theme } : {}),
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.displayName ?? existingProfile?.full_name ?? "Dancer",
      bio: parsed.data.bio !== undefined ? parsed.data.bio || null : existingProfile?.bio ?? null,
      social_links: nextSocial,
      preferences: nextPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
