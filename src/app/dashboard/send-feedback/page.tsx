"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import { FEEDBACK_DANCE_STYLE_OPTIONS } from "@/lib/utils/constants";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";
const FEEDBACK_COOLDOWN_MS = 60_000;

async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function SendFeedbackPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [danceStyles, setDanceStyles] = useState<string[]>([]);
  const [otherStyle, setOtherStyle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const hasOther = danceStyles.includes("Other");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && danceStyles.length > 0 && message.trim().length >= 10;
  }, [email, danceStyles, message]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const loadCurrentUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        setEmail(user.email || "");
        const fullName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          "";
        if (fullName) setName(fullName);
      } catch {
        // Optional prefill only.
      }
    };

    void loadCurrentUser();
  }, []);

  const toggleStyle = (style: string) => {
    setDanceStyles((prev) =>
      prev.includes(style) ? prev.filter((item) => item !== style) : [...prev, style]
    );
  };

  const resetForm = () => {
    setSuccess(true);
    setDanceStyles([]);
    setOtherStyle("");
    setExperienceLevel("beginner");
    setMessage("");
    setHoneypot("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    setSuccess(false);

    if (!canSubmit) {
      setSubmitError("Please complete all required fields.");
      return;
    }

    if (hasOther && !otherStyle.trim()) {
      setSubmitError("Please add your other dance style.");
      return;
    }

    setSubmitting(true);

    try {
      if (!isSupabaseConfigured()) {
        setSubmitError("Feedback is unavailable until Supabase is configured.");
        return;
      }

      const lastSubmittedRaw = localStorage.getItem("naachly_feedback_last_submit");
      const lastSubmittedAt = lastSubmittedRaw ? Number(lastSubmittedRaw) : 0;
      if (Date.now() - lastSubmittedAt < FEEDBACK_COOLDOWN_MS) {
        setSubmitError("Please wait a minute before submitting feedback again.");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedMessage = message.trim();
      const normalizedStyles = Array.from(new Set(danceStyles.map((style) => style.trim())));

      const messageHash = await sha256Hex(`${normalizedEmail}:${normalizedMessage}`);
      const anonFingerprint = [
        navigator.userAgent,
        navigator.language,
        Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
      ].join("|");
      const ipHash = await sha256Hex(anonFingerprint);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("feedback_submissions").insert({
        user_id: user?.id ?? null,
        name: name.trim() || null,
        email: normalizedEmail,
        dance_styles: normalizedStyles,
        other_style: hasOther ? otherStyle.trim() : null,
        experience_level: experienceLevel,
        message: normalizedMessage,
        message_hash: messageHash,
        ip_hash: ipHash,
      });

      if (error) {
        if (error.code === "23505") {
          setSubmitError("This feedback was already submitted. Thank you!");
        } else {
          setSubmitError("Unable to submit feedback right now.");
        }
        return;
      }

      localStorage.setItem("naachly_feedback_last_submit", String(Date.now()));

      resetForm();
    } catch {
      setSubmitError("Network error while sending feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Share Feedback</h1>
        <p className="text-zinc-400 mt-2 text-lg">
          Tell us what you want to learn next so Naachly can coach you better.
        </p>
      </header>

      <Card className="dash-glass dash-card border border-white/10 bg-black/40">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="feedback-name"
              label="Name (optional)"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              id="feedback-email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <p className="text-sm font-medium text-white mb-2">What dance styles do you want to learn?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FEEDBACK_DANCE_STYLE_OPTIONS.map((style) => {
                const selected = danceStyles.includes(style);
                return (
                  <label
                    key={style}
                    className={[
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all",
                      selected
                        ? "border-nred-500 bg-nred-500/10 text-white"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleStyle(style)}
                      className="accent-nred-600"
                    />
                    <span className="text-sm">{style}</span>
                  </label>
                );
              })}
            </div>
            {hasOther && (
              <div className="mt-3">
                <Input
                  id="feedback-other-style"
                  label="Other style"
                  placeholder="e.g. Salsa"
                  value={otherStyle}
                  onChange={(event) => setOtherStyle(event.target.value)}
                />
              </div>
            )}
          </div>

          <Select
            id="feedback-experience"
            label="Experience level"
            value={experienceLevel}
            onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}
            options={[
              { value: "beginner", label: "Beginner" },
              { value: "intermediate", label: "Intermediate" },
              { value: "advanced", label: "Advanced" },
            ]}
          />

          <div className="space-y-1.5">
            <label htmlFor="feedback-message" className="block text-sm font-medium text-white">
              Feedback or suggestions
            </label>
            <textarea
              id="feedback-message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What would make Naachly a better dance coach for you?"
              className="w-full rounded-xl border border-white/10 bg-white/5 text-white px-4 py-3 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-nred-500"
              required
            />
          </div>

          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          {submitError && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
              {submitError}
            </p>
          )}

          {success && (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
              Thanks for your feedback! We use this to improve your AI dance coaching experience.
            </p>
          )}

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-500">
              This form submits directly to Supabase with duplicate and cooldown checks.
            </p>
            <Button type="submit" disabled={!canSubmit} loading={submitting}>
              Submit Feedback
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
