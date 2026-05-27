"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SelectRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingRole, setLoadingRole] = useState<"learner" | "creator" | null>(null);
  const [error, setError] = useState("");
  const preselectedRole = searchParams.get("role") === "creator" ? "creator" : "learner";

  const handleRoleSelect = async (role: "learner" | "creator") => {
    setLoadingRole(role);
    setError("");

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth");
          return;
        }

        const dbRole = role === "creator" ? "choreographer" : "student";
        const fullName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split("@")[0] ||
          "Dancer";

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .maybeSingle();

        const existingPreferences =
          existingProfile?.preferences && typeof existingProfile.preferences === "object"
            ? (existingProfile.preferences as Record<string, unknown>)
            : {};

        const nextPreferences = {
          ...existingPreferences,
          selected_app_role: role,
          onboarding_role: role,
        };

        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: fullName,
            role: dbRole,
            preferences: nextPreferences,
          },
          { onConflict: "id" }
        );

        if (upsertError) {
          throw new Error(upsertError.message || "Failed to save role");
        }
      }

      router.push(role === "creator" ? "/creator/dashboard" : "/learn/feed");
    } catch (e: any) {
      setError(e?.message || "Could not save your role. Please retry.");
      setLoadingRole(null);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe5d4_0%,#fbf8f2_32%,#f6f0e5_100%)] px-4 py-8 text-[#241811] sm:px-6 md:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a6c4d]">Role Selection</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[#2a1c11] sm:text-5xl">Choose your Nachly mode</h1>
        <p className="mt-3 text-sm text-[#665543]">Pick how you want to use Nachly right now. You can switch later from profile.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleRoleSelect("learner")}
            disabled={loadingRole !== null}
            className={`rounded-[1.6rem] border p-6 text-left transition disabled:opacity-60 ${preselectedRole === "learner" ? "border-[#7a5c3a] bg-[#f7f1e8]" : "border-[#6c51322a] bg-white/80 hover:bg-[#f9f5ef]"}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a6c4d]">Learn</p>
            <h2 className="mt-2 text-2xl font-black text-[#241811]">Learn choreography</h2>
            <ul className="mt-3 space-y-1 text-sm text-[#665543]">
              <li>Practice routines</li>
              <li>Record yourself</li>
            </ul>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#7a5c3a]">{loadingRole === "learner" ? "Saving..." : "Continue as Learner"}</p>
          </button>

          <button
            type="button"
            onClick={() => void handleRoleSelect("creator")}
            disabled={loadingRole !== null}
            className={`rounded-[1.6rem] border p-6 text-left transition disabled:opacity-60 ${preselectedRole === "creator" ? "border-[#7a5c3a] bg-[#f7f1e8]" : "border-[#6c51322a] bg-white/80 hover:bg-[#f9f5ef]"}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a6c4d]">Choreographer</p>
            <h2 className="mt-2 text-2xl font-black text-[#241811]">Teach and upload</h2>
            <ul className="mt-3 space-y-1 text-sm text-[#665543]">
              <li>Upload choreos</li>
              <li>Teach step-by-step</li>
              <li>Grow audience</li>
            </ul>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#7a5c3a]">{loadingRole === "creator" ? "Saving..." : "Continue as Creator"}</p>
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  );
}
