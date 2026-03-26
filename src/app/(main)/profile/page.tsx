"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import Select from "@/components/ui/Select";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [preferredStyles, setPreferredStyles] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setName("Dance Enthusiast");
      setEmail("dancer@example.com");
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Please log in to view your profile.");
          setLoading(false);
          return;
        }

        setEmail(user.email || "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, bio, preferences")
          .eq("id", user.id)
          .maybeSingle();

        const fallbackName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          (user.email?.split("@")[0] ?? "Dancer");

        setName(profile?.full_name || fallbackName);
        setBio(profile?.bio || "");

        const preferences = (profile?.preferences as {
          experience_level?: ExperienceLevel;
          dance_styles?: string[];
        } | null) ?? null;

        if (preferences?.experience_level) {
          setExperienceLevel(preferences.experience_level);
        }
        if (preferences?.dance_styles?.length) {
          setPreferredStyles(preferences.dance_styles.join(", "));
        }
      } catch {
        setError("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isSupabaseConfigured()) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please log in again to save changes.");
        return;
      }

      const styles = preferredStyles
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const { error: saveError } = await supabase
        .from("profiles")
        .update({
          full_name: name,
          bio,
          preferences: {
            experience_level: experienceLevel,
            dance_styles: styles,
          },
        })
        .eq("id", user.id);

      if (saveError) {
        setError("Could not save your profile right now.");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save your profile right now.");
    }
  }

  if (loading) {
    return (
      <div className="section-padding py-10">
        <p className="text-center text-zinc-300">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="section-padding py-5 sm:py-8 tab-screen-enter">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto"
      >
        <h1 className="font-display text-3xl font-bold app-accent-text mb-5">Profile</h1>

        <Link
          href="/liked"
          className="mb-4 block rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
        >
          Liked Sessions
        </Link>

        <Card className="app-card border-white/15 tap-feedback">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
            <Avatar name={name} size="lg" />
            <div>
              <h2 className="font-display font-bold text-white text-lg">{name}</h2>
              <p className="text-sm text-zinc-300">{email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <Input
              id="name"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="!bg-[#1e1b5f]/70"
            />
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              disabled
              className="!bg-[#1e1b5f]/40"
            />

            <Select
              id="experienceLevel"
              label="Experience level"
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}
              className="!bg-[#1e1b5f]/70"
              options={[
                { value: "beginner", label: "Beginner" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ]}
            />

            <Input
              id="preferredStyles"
              label="Preferred dance styles"
              value={preferredStyles}
              onChange={(event) => setPreferredStyles(event.target.value)}
              placeholder="Hip Hop, Bollywood"
              className="!bg-[#1e1b5f]/70"
            />

            <div className="space-y-1.5">
              <label htmlFor="bio" className="block text-sm font-medium text-zinc-200">Bio</label>
              <textarea
                id="bio"
                rows={3}
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-field resize-none !bg-[#1e1b5f]/70"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit">Save Changes</Button>
              {saved && (
                <span className="text-sm text-emerald-300 font-medium">Saved!</span>
              )}
              {error && (
                <span className="text-sm text-amber-300 font-medium">{error}</span>
              )}
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
