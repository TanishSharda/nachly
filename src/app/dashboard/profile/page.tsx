/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";

export default function DashProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    displayName: string;
    bio: string;
    expLevel: string;
    selectedStyles: string[];
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/choreographer/profile", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!mounted || !response.ok) return;

        if (payload?.profile) {
          setProfile({
            displayName: payload.profile.displayName || "Alex T.",
            bio: payload.profile.bio || "Elite Tier Dancer",
            expLevel: payload.profile.expLevel || "student",
            selectedStyles: Array.isArray(payload.profile.selectedStyles) ? payload.profile.selectedStyles : [],
          });
        }
      } catch {
        if (mounted) {
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Profile</h1>
      </header>

      <div className="rounded-2xl p-8 dash-glass dash-card flex items-center gap-8 animate-slide-up">
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile?.displayName || "Felix")}`}
          alt="User profile avatar"
          className="w-24 h-24 rounded-full bg-white/10"
        />
        <div>
          <h2 className="text-2xl font-bold text-white">{loading ? "Loading..." : profile?.displayName || "Alex T."}</h2>
          <p className="text-nred-300 font-medium mt-1">{loading ? "Loading profile" : profile?.expLevel || "Elite Tier Dancer"}</p>
          <div className="flex gap-2 mt-3">
            {(profile?.selectedStyles?.length ? profile.selectedStyles : ["Hip Hop", "Popping", "Breakdance"]).slice(0, 3).map((style) => (
              <span key={style} className="bg-white/10 px-3 py-1 rounded-full text-xs text-zinc-300">{style}</span>
            ))}
          </div>
          <p className="mt-4 max-w-xl text-sm text-zinc-400">{loading ? "Loading your profile details..." : profile?.bio || "Add a bio from your creator profile to show up here."}</p>
        </div>
      </div>
    </div>
  );
}
