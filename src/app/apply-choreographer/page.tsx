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
  "Jazz",
  "Freestyle",
  "Other",
];

export default function ApplyChoreographerPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [danceStyles, setDanceStyles] = useState<string[]>([]);
  const [otherStyle, setOtherStyle] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [whyNachly, setWhyNachly] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
        if (user.email) setEmail((prev) => prev || user.email);
      } catch {
        // Optional prefill only.
      }
    };

    void init();
  }, []);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!name.trim()) errors.push("Full name");
    if (!email.trim()) errors.push("Email");
    if (!phone.trim()) errors.push("Phone number");
    if (danceStyles.length === 0) errors.push("At least one dance style");
    if (!yearsExperience.trim()) errors.push("Years of experience");
    if (!driveLink.trim()) errors.push("Portfolio/Google Drive link");
    if (whyNachly.trim().length < 30) errors.push("Why join Nachly (30+ characters)");

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const toggleDanceStyle = (style: string) => {
    setDanceStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

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

      // Build specialties list
      const specialties = danceStyles.includes("Other")
        ? [otherStyle.trim(), ...danceStyles.filter((s) => s !== "Other")]
        : danceStyles;

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        instagram: instagram.trim(),
        youtube: youtube.trim(),
        portfolio: driveLink.trim(),
        sampleVideo: driveLink.trim(),
        experience: `Years of Experience: ${yearsExperience}\n\n${whyNachly}`,
        specialties,
        bio: whyNachly.trim(),
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
            Nachly
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
                  className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-full flex items-center justify-center"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="text-yellow-400"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  </svg>
                </motion.div>
                <h1 className="font-display text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  Become a Nachly Creator
                </h1>
                <p className="text-zinc-400 max-w-md mx-auto">
                  Share your choreography with thousands of learners. Our team will review your application within 2-3 days.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm"
                  >
                    <p className="font-semibold mb-2">Please complete the following:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Full Name <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Email <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Phone Number <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-all"
                  />
                </div>

                {/* Instagram Handle */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Instagram Handle
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">@</span>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="yourhandle"
                      className="flex-1 px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-all"
                    />
                  </div>
                  <p className="text-xs text-zinc-600 mt-1.5">
                    So we can check out your dance content
                  </p>
                </div>

                {/* YouTube / Social Link */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    YouTube Channel or Social Link
                  </label>
                  <input
                    type="url"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="https://youtube.com/... or TikTok/Instagram link"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-all"
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">
                    Share your YouTube channel, dance reels, or any other social media where you showcase your work
                  </p>
                </div>

                {/* Dance Styles */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-3">
                    Dance Styles <span className="text-yellow-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DANCE_FORMS.map((form) => (
                      <button
                        key={form}
                        type="button"
                        onClick={() => toggleDanceStyle(form)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          danceStyles.includes(form)
                            ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-black"
                            : "bg-zinc-900 text-zinc-400 border border-white/10 hover:border-zinc-700"
                        }`}
                      >
                        {form}
                      </button>
                    ))}
                  </div>

                  {/* Other input */}
                  {danceStyles.includes("Other") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3"
                    >
                      <input
                        type="text"
                        value={otherStyle}
                        onChange={(e) => setOtherStyle(e.target.value)}
                        placeholder="Specify your dance style..."
                        className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-all"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Years of Experience */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Years of Experience <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    placeholder="e.g., 5 years"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-all"
                  />
                </div>

                {/* Google Drive Link */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Portfolio / Google Drive Link <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/... or video link"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-all"
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">
                    Upload your choreography videos to Google Drive and share the link here. Make sure sharing is set to &quot;Anyone with the link&quot;.
                  </p>
                </div>

                {/* Why join Nachly */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Why do you want to join Nachly? <span className="text-yellow-400">*</span>
                  </label>
                  <textarea
                    value={whyNachly}
                    onChange={(e) => setWhyNachly(e.target.value)}
                    rows={4}
                    placeholder="Tell us why you want to teach on Nachly and what you hope to achieve..."
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-all resize-none"
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">Minimum 30 characters</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {error.includes("log in") && (
                  <Link
                    href="/login?redirect=%2Fapply-choreographer"
                    className="inline-flex text-sm text-yellow-400 hover:text-yellow-300"
                  >
                    Go to login
                  </Link>
                )}

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                    !loading
                      ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:shadow-lg hover:shadow-yellow-400/20"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit Application"
                  )}
                </motion.button>

                <p className="text-center text-xs text-zinc-600">
                  We will review your application and get back to you within 2-3 days.
                </p>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400/20 to-green-500/10 rounded-full flex items-center justify-center"
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-green-400"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>

              <h2 className="text-3xl font-bold mb-3">Application Submitted!</h2>
              <p className="text-zinc-400 mb-6">
                Thank you, <span className="text-white font-semibold">{name}</span>! We&apos;ve received your application and will review it within 2-3 days.
              </p>

              <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
                <h3 className="font-semibold mb-3 text-white">What happens next?</h3>
                <ul className="space-y-3 text-sm text-zinc-400">
                  <li className="flex gap-3">
                    <span className="text-yellow-400 font-bold">1</span>
                    <span>Our team will review your portfolio and experience</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-yellow-400 font-bold">2</span>
                    <span>We&apos;ll send you an email with the decision</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-yellow-400 font-bold">3</span>
                    <span>If approved, you&apos;ll gain access to the Creator Dashboard</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-yellow-400 font-bold">4</span>
                    <span>Start uploading and teaching your choreography!</span>
                  </li>
                </ul>
              </div>

              <Link href="/explore">
                <button className="px-8 py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold hover:shadow-lg hover:shadow-yellow-400/20 transition-all">
                  Back to Nachly
                </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
