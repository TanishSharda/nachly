"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function formatRetryAfter(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "a few moments";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
}

const DANCE_FORMS = [
  "Bollywood",
  "Hip Hop",
  "Kathak",
  "Bhangra",
  "Contemporary",
  "Salsa",
  "Bharatanatyam",
  "Other",
];

export default function ApplyChoreographerPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [danceForm, setDanceForm] = useState("");
  const [otherForm, setOtherForm] = useState("");
  const [experience, setExperience] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const init = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const fullName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          "";

        if (fullName) setName((prev) => prev || fullName);
        if (user.email) setEmail(user.email);
      } catch {
        // Optional prefill only.
      }
    };

    void init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        setError("Applications are unavailable until Supabase is configured.");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please log in first to submit your application.");
        return;
      }

      const specialty = danceForm === "Other" ? otherForm.trim() : danceForm;
      const payload = {
        name: name.trim(),
        email: (email || user.email || "").trim(),
        portfolio: driveLink.trim(),
        sampleVideo: driveLink.trim(),
        experience: experience.trim(),
        specialties: specialty ? [specialty] : [],
        bio: "",
      };

      const response = await fetch("/api/choreographer/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (response.status === 429) {
          const wait = formatRetryAfter(Number(result?.retryAfterSeconds || 0));
          setError(`Please wait ${wait} before submitting another application.`);
          return;
        }
        setError(result?.error || "Unable to submit application right now.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error while submitting application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    name.trim() &&
    driveLink.trim() &&
    experience.trim().length >= 20 &&
    (danceForm && (danceForm !== "Other" || otherForm.trim()));

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <div className="bg-black/90 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <Link href="/" className="font-display text-lg font-bold bg-gradient-to-r from-nred-500 to-white bg-clip-text text-transparent">
            Naachly
          </Link>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
               {/* Header */}
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-16 h-16 mx-auto mb-4 bg-nred-500/10 rounded-full flex items-center justify-center text-nred-500"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3" /><path d="M12 8v6m-4 4l4-4 4 4m-8 0v2m8-2v2" /></svg>
                </motion.div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
                  Teach on Naachly
                </h1>
                <p className="text-zinc-400 max-w-md mx-auto">
                  Share your choreography with thousands of learners. Fill out the form below and we&apos;ll review your application.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Your Name <span className="text-nred-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-nred-500/50 focus:border-nred-500/50 transition-all"
                    required
                  />
                </div>

                {/* Instagram Handle */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    placeholder="@yourhandle"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-nred-500/50 focus:border-nred-500/50 transition-all"
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">
                    So we can check out your dance content
                  </p>
                </div>

                {/* Google Drive Link */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Google Drive Link <span className="text-nred-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-nred-500/50 focus:border-nred-500/50 transition-all"
                    required
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">
                    Upload your choreography videos to Google Drive and share the link here. Make sure sharing is set to &quot;Anyone with the link&quot;.
                  </p>
                </div>

                {/* YouTube / Social Link */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    YouTube or Social Media Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/... or any social link"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-nred-500/50 focus:border-nred-500/50 transition-all"
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">
                    Share your YouTube channel, dance reels, or any other social media where you showcase your work
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Experience <span className="text-nred-500">*</span>
                  </label>
                  <textarea
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    rows={4}
                    placeholder="Tell us about your dance background, teaching experience, and what styles you specialize in"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-nred-500/50 focus:border-nred-500/50 transition-all"
                    required
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">Minimum 20 characters.</p>
                </div>

                {/* Dance Form */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Dance Form <span className="text-nred-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DANCE_FORMS.map((form) => (
                      <button
                        key={form}
                        type="button"
                        onClick={() => setDanceForm(form)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          danceForm === form
                            ? "bg-nred-500 text-white"
                            : "bg-zinc-900 text-zinc-400 border border-white/10 hover:border-nred-500/40"
                        }`}
                      >
                        {form}
                      </button>
                    ))}
                  </div>

                  {/* Other input */}
                  {danceForm === "Other" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3"
                    >
                      <input
                        type="text"
                        value={otherForm}
                        onChange={(e) => setOtherForm(e.target.value)}
                        placeholder="Specify your dance form..."
                        className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-nred-500/50 focus:border-nred-500/50 transition-all"
                      />
                    </motion.div>
                  )}
                </div>

                {error && (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
                    {error}
                  </p>
                )}

                {error.includes("log in") && (
                  <Link
                    href="/login?redirect=%2Fapply-choreographer"
                    className="inline-flex text-sm text-nred-500 hover:text-nred-400"
                  >
                    Go to login
                  </Link>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    isValid && !loading
                      ? "bg-nred-500 hover:bg-nred-600 text-white hover:scale-[1.01] active:scale-[0.99]"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 bg-emerald-500/10 rounded-full flex items-center justify-center"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </motion.div>
              <h2 className="font-display text-3xl font-bold mb-3">Application Submitted!</h2>
              <p className="text-zinc-400 max-w-md mx-auto mb-8">
                Thank you, <span className="text-white font-semibold">{name}</span>! We&apos;ll review your {danceForm === "Other" ? otherForm : danceForm} choreography and get back to you within 48 hours.
              </p>
              <Link href="/explore">
                <button className="px-6 py-3 bg-nred-500 hover:bg-nred-600 text-white font-semibold rounded-xl transition-all">
                  Back to Explore
                </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
