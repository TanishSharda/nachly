"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { SITE_NAME } from "@/lib/utils/constants";

function formatRetryAfter(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "a few moments";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
}

export default function ChoreographerApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    portfolio: "",
    experience: "",
    specialties: [] as string[],
    sampleVideo: "",
    bio: "",
  });

  const styleOptions = ["Hip Hop", "Bollywood", "Kathak", "Bhangra"];

  function toggleSpecialty(style: string) {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(style)
        ? prev.specialties.filter((s) => s !== style)
        : [...prev.specialties, style],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/choreographer/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 429) {
          const wait = formatRetryAfter(Number(payload?.retryAfterSeconds || 0));
          setSubmitError(`Please wait ${wait} before submitting another application.`);
          return;
        }
        setSubmitError(payload?.error || "Unable to submit application right now.");
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Network error while submitting application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-dark mb-3">Application Submitted!</h2>
          <p className="text-dark-400 leading-relaxed">
            Thank you for applying to become a choreographer on {SITE_NAME}. We&apos;ll review your application and get back to you within 3-5 business days.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-dark mb-3">
            Become a Choreographer
          </h1>
          <p className="text-dark-400 max-w-lg mx-auto">
            Share your passion with thousands of aspiring dancers. Earn revenue for every student who practices your routines.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: "💰", label: "Earn Revenue", desc: "60% of every purchase" },
            { icon: "📊", label: "Analytics", desc: "Track engagement" },
            { icon: "🌍", label: "Reach", desc: "Global audience" },
          ].map((b) => (
            <Card key={b.label} className="text-center" padding="sm">
              <div className="text-2xl mb-1">{b.icon}</div>
              <p className="text-sm font-semibold text-dark">{b.label}</p>
              <p className="text-xs text-dark-400">{b.desc}</p>
            </Card>
          ))}
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="name"
              label="Full Name"
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              id="portfolio"
              label="Portfolio / Social Media URL"
              placeholder="https://instagram.com/yourprofile"
              value={formData.portfolio}
              onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
            />
            <Input
              id="sampleVideo"
              label="Sample Dance Video URL"
              placeholder="https://youtube.com/watch?v=..."
              value={formData.sampleVideo}
              onChange={(e) => setFormData({ ...formData, sampleVideo: e.target.value })}
              required
            />

            {/* Specialties */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-700">Dance Specialties</label>
              <div className="flex flex-wrap gap-2">
                {styleOptions.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleSpecialty(style)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.specialties.includes(style)
                        ? "bg-wine-900 text-cream-50"
                        : "bg-dark-50 text-dark-400 hover:bg-dark-100"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div className="space-y-1.5">
              <label htmlFor="experience" className="block text-sm font-medium text-dark-700">
                Dance Experience
              </label>
              <textarea
                id="experience"
                rows={4}
                placeholder="Tell us about your dance journey, training, and teaching experience..."
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                required
                className="input-field resize-none"
              />
            </div>

            {submitError && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
                {submitError}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Submit Application
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
