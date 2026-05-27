"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const INTERESTS = ["Bollywood", "Hip Hop", "Kathak", "Bhangra", "Contemporary", "Improvisation"];
const EXPERIENCE_OPTIONS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"learner" | "creator">("learner");
  const [experience, setExperience] = useState<(typeof EXPERIENCE_OPTIONS)[number]["value"]>("beginner");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const summary = useMemo(() => {
    return role === "creator"
      ? "Set up your creator profile and go straight to the dashboard."
      : "Personalize your learner feed and start with the right routines.";
  }, [role]);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth?redirect=%2Fonboarding");
          return;
        }

        if (!mounted) return;
        setFullName(String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Dancer"));
      } catch {
        if (mounted) setError("Could not load your account details.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (searchParams.get("role") === "creator") {
      setRole("creator");
    }
  }, [searchParams]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]
    );
  };

  const handleSubmit = async () => {
    setError("");
    setSaving(true);

    if (!isSupabaseConfigured()) {
      router.push(role === "creator" ? "/creator/dashboard" : "/learn/feed");
      return;
    }

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role,
          interests: selectedInterests,
          experience_level: experience,
          full_name: fullName,
        }),
      });

        // If server accepts the request, continue as usual
        if (response.ok) {
          const payload = await response.json().catch(() => ({}));
          router.push(payload?.nextRoute || (role === "creator" ? "/creator/dashboard" : "/learn/feed"));
          return;
        }

        // If unauthenticated, attempt a client-side fallback using the browser Supabase client.
        // This helps when cookies aren't sent by the browser but the client has an active session.
        if (response.status === 401 && isSupabaseConfigured()) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            router.replace("/auth?redirect=%2Fonboarding");
            return;
          }

          const chosenRole = role === "creator" ? "creator" : "learner";
          const dbRole = chosenRole === "creator" ? "choreographer" : "student";

          const interests = Array.isArray(selectedInterests) ? selectedInterests : [];
          const experienceLevel = String(experience || "beginner");
          const fullNameSafe = String(fullName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Dancer").trim();

          const { error } = await supabase.from("profiles").upsert(
            {
              id: user.id,
              full_name: fullNameSafe,
              role: dbRole,
              preferences: {
                interests,
                experience_level: experienceLevel,
                onboarding_completed: true,
                onboarding_role: chosenRole,
              },
            },
            { onConflict: "id" }
          );

          if (error) {
            throw new Error(error.message || "Could not save onboarding (client)");
          }

          router.push(role === "creator" ? "/creator/dashboard" : "/learn/feed");
          return;
        }

        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Could not save onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save onboarding");
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#fbf8f2] px-4 py-10 text-center text-[#7e7468]">Loading onboarding...</div>;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe5d4_0%,#fbf8f2_36%,#f5efe6_100%)] px-4 py-8 text-[#241811] sm:px-6 md:px-8">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-[#6c51321c] bg-white/80 backdrop-blur-xl" padding="lg">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#8a6c4d]">Onboarding</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-[#2a1c11]">Welcome, {fullName || "Dancer"}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#665543]">Choose how you want to use Nachly, then we will take you straight to the right place.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole("learner")}
                className={`rounded-[1.5rem] border p-5 text-left transition ${role === "learner" ? "border-[#7a5c3a] bg-[#f7f1e8]" : "border-[#6c51321c] bg-white/70 hover:bg-[#fcfaf6]"}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a6c4d]">Learner</p>
                <h2 className="mt-2 text-xl font-black text-[#241811]">I want to practice and explore.</h2>
                <p className="mt-2 text-sm text-[#665543]">You will land in the feed and learner tools.</p>
              </button>

              <button
                type="button"
                onClick={() => setRole("creator")}
                className={`rounded-[1.5rem] border p-5 text-left transition ${role === "creator" ? "border-[#7a5c3a] bg-[#f7f1e8]" : "border-[#6c51321c] bg-white/70 hover:bg-[#fcfaf6]"}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a6c4d]">Creator</p>
                <h2 className="mt-2 text-xl font-black text-[#241811]">I want to publish routines.</h2>
                <p className="mt-2 text-sm text-[#665543]">You will land in the creator dashboard.</p>
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_0.9fr]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a6c4d]">Interests</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => {
                    const active = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${active ? "border-[#7a5c3a] bg-[#7a5c3a] text-white" : "border-[#6c51321c] bg-white text-[#7a5c3a] hover:bg-[#f9f5ef]"}`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a6c4d]">Experience</p>
                <div className="mt-3 grid gap-2">
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setExperience(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${experience === option.value ? "border-[#7a5c3a] bg-[#f7f1e8] text-[#241811]" : "border-[#6c51321c] bg-white/70 text-[#665543] hover:bg-[#fcfaf6]"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a6c4d]">Summary</p>
              <p className="mt-2 text-sm text-[#665543]">{summary}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => void handleSubmit()} loading={saving} className="px-6 py-3" variant="primary">Continue</Button>
              <Button type="button" variant="ghost" className="px-6 py-3" onClick={() => router.push("/auth")}>Back to login</Button>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          </Card>
        </motion.div>
      </div>
    </main>
  );
}