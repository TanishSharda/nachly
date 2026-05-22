"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const WIZARD_KEY = "naachly_creator_wizard_preset";

const styleOptions = [
  { value: "bollywood", label: "Bollywood" },
  { value: "bhangra", label: "Bhangra" },
  { value: "hip-hop", label: "Hip Hop" },
  { value: "kathak", label: "Kathak" },
  { value: "contemporary", label: "Contemporary" },
] as const;

const monetizationOptions = [
  { value: "free", label: "Free", description: "Build audience first" },
  { value: "ppv", label: "Pay-per-view", description: "One-time unlock" },
  { value: "subscription", label: "Subscription", description: "Members-only access" },
] as const;

const wizardSteps = [
  { title: "Concept", description: "Define the idea and audience for your routine." },
  { title: "Structure", description: "Plan lesson length, difficulty, and breakdown." },
  { title: "Monetize", description: "Choose how learners will unlock the routine." },
  { title: "Launch", description: "Hand off to the upload studio with your preset." },
];

function getStyleLabel(value: (typeof styleOptions)[number]["value"]) {
  return styleOptions.find((item) => item.value === value)?.label || "Bollywood";
}

function getMonetizationLabel(value: (typeof monetizationOptions)[number]["value"]) {
  return monetizationOptions.find((item) => item.value === value)?.label || "Free";
}

export default function ChoreographerCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [styleSlug, setStyleSlug] = useState<(typeof styleOptions)[number]["value"]>("bollywood");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [monetization, setMonetization] = useState<(typeof monetizationOptions)[number]["value"]>("free");
  const [lessonCount, setLessonCount] = useState(6);
  const [audience, setAudience] = useState("Beginner learners on mobile");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [presetStatus, setPresetStatus] = useState("Starting fresh");
  const [presetError, setPresetError] = useState("");

  const canAdvance = useMemo(() => {
    if (step === 1) return title.trim().length >= 3 && description.trim().length >= 20;
    if (step === 2) return lessonCount >= 3 && lessonCount <= 12;
    if (step === 3) return true;
    return true;
  }, [description, lessonCount, step, title]);

  // Load preset from server on mount
  useEffect(() => {
    const loadPreset = async () => {
      try {
        setIsLoading(true);
        setPresetError("");
        const response = await fetch("/api/choreographer/wizard-preset");
        const data = await response.json();

        if (data.preset) {
          setTitle(data.preset.title);
          setDescription(data.preset.description);
          setStyleSlug(data.preset.styleSlug);
          setDifficulty(data.preset.difficulty);
          setLessonCount(data.preset.lessonCount);
          setMonetization(data.preset.accessType);
          if (data.preset.audience) setAudience(data.preset.audience);
          setPresetStatus("Loaded your saved creative brief");
        } else {
          setPresetStatus("Starting fresh");
        }
      } catch (err) {
        console.error("Failed to load wizard preset:", err);
        setPresetStatus("Starting fresh");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPreset();
  }, []);

  const storePreset = async () => {
    try {
      setIsSaving(true);
      setPresetError("");
      setPresetStatus("Saving creative brief...");
      const payload = {
        title: title.trim(),
        description: description.trim(),
        styleSlug,
        difficulty,
        lessonCount,
        accessType: monetization,
        audience: audience.trim(),
      };

      const response = await fetch("/api/choreographer/wizard-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setPresetStatus("Could not save brief");
        setPresetError("Your concept will still open in the studio, but we could not save it to your account.");
        console.error("Failed to save wizard preset");
      } else {
        setPresetStatus("Saved to your account");
      }
    } catch (err) {
      console.error("Error saving wizard preset:", err);
      setPresetStatus("Could not save brief");
      setPresetError("Your concept will still open in the studio, but we could not save it to your account.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!canAdvance) return;
    if (step < wizardSteps.length) {
      setStep((current) => current + 1);
      return;
    }

    await storePreset();
    router.push("/upload-choreo");
  };

  const currentStep = wizardSteps[step - 1];
  const snapshotItems = [
    { label: "Title", value: title.trim() || "Untitled routine" },
    { label: "Style", value: getStyleLabel(styleSlug) },
    { label: "Level", value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1) },
    { label: "Lessons", value: `${lessonCount || 0} parts` },
    { label: "Access", value: getMonetizationLabel(monetization) },
    { label: "Audience", value: audience.trim() || "Not set yet" },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#121212_0%,#0a0a0a_45%,#050505_100%)] px-4 py-6 text-white sm:px-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_28px_60px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-7"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F3B2AB]">Creator wizard</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Map the routine before you upload it.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                Use this quick setup to lock the concept, pick the audience, and hand off to the upload studio with a clean creative brief.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-300">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${isLoading ? "border-white/10 bg-white/5 text-zinc-400" : presetError ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : "border-[#F3B2AB]/20 bg-[#F3B2AB]/10 text-[#F3B2AB]"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isLoading ? "animate-pulse bg-zinc-500" : presetError ? "bg-amber-300" : "bg-[#F3B2AB]"}`} />
                  {isLoading ? "Loading saved brief" : presetStatus}
                </span>
                {presetError && <span className="text-zinc-400">{presetError}</span>}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 sm:min-w-[320px]">
              {wizardSteps.map((item, index) => {
                const active = index + 1 === step;
                const done = index + 1 < step;
                return (
                  <div
                    key={item.title}
                    className={`rounded-2xl border px-3 py-3 text-center ${active ? "border-[#F3B2AB]/40 bg-[#F3B2AB]/10 text-[#F3B2AB]" : done ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-zinc-400"}`}
                  >
                    <p>{String(index + 1).padStart(2, "0")}</p>
                    <p className="mt-1 leading-tight">{item.title}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-white/10 bg-black/30 p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">Step {step}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{currentStep.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">{currentStep.description}</p>

              <div className="mt-6 space-y-4">
                {step === 1 && (
                  <>
                    <Input id="title" label="Routine title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Midnight Monsoon" />
                    <div className="space-y-1.5">
                      <label htmlFor="description" className="block text-sm font-medium text-zinc-200">Routine description</label>
                      <textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Describe the mood, energy, and movement language."
                        className="input-field resize-none !bg-white/5"
                      />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <Select
                      id="styleSlug"
                      label="Primary style"
                      value={styleSlug}
                      onChange={(event) => setStyleSlug(event.target.value as typeof styleSlug)}
                      options={styleOptions.map((item) => ({ value: item.value, label: item.label }))}
                    />
                    <Select
                      id="difficulty"
                      label="Difficulty"
                      value={difficulty}
                      onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}
                      options={[
                        { value: "beginner", label: "Beginner" },
                        { value: "intermediate", label: "Intermediate" },
                        { value: "advanced", label: "Advanced" },
                      ]}
                    />
                    <Input
                      id="lessonCount"
                      type="number"
                      label="Suggested lesson parts"
                      value={String(lessonCount)}
                      onChange={(event) => setLessonCount(Number(event.target.value || 0))}
                      min={3}
                      max={12}
                    />
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {monetizationOptions.map((option) => {
                        const selected = monetization === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMonetization(option.value)}
                            className={`rounded-2xl border p-4 text-left transition ${selected ? "border-[#F3B2AB]/40 bg-[#F3B2AB]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                          >
                              <p className={`text-sm font-bold ${selected ? "text-[#F3B2AB]" : "text-white"}`}>{option.label}</p>
                              <p className="mt-1 text-xs text-zinc-400">{option.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    <Input
                      id="audience"
                      label="Primary audience"
                      value={audience}
                      onChange={(event) => setAudience(event.target.value)}
                      placeholder="Intermediate learners on mobile"
                    />
                  </>
                )}

                {step === 4 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {snapshotItems.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
                        <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" onClick={() => router.push("/choreographer")} disabled={isSaving}>Back to dashboard</Button>
                <Button type="button" onClick={handleContinue} disabled={!canAdvance || isSaving || isLoading}>
                  {isSaving ? "Saving..." : step < wizardSteps.length ? "Continue" : "Open Upload Studio"}
                </Button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                {step === 4
                  ? "Your brief will be saved to your account before the upload studio opens, so you can resume it later from drafts."
                  : "You can always come back and continue from the same brief before publishing."}
              </p>
            </Card>

            <div className="grid gap-4">
              <Card className="border-white/10 bg-black/35 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">Live brief</p>
                <h3 className="mt-2 text-xl font-black text-white">What will travel into upload</h3>
                <div className="mt-4 space-y-3">
                  {snapshotItems.slice(0, 4).map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm">
                      <span className="text-zinc-400">{item.label}</span>
                      <span className="font-semibold text-white text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-[#F3B2AB]/20 bg-[#F3B2AB]/10 p-5 text-[#f5ffe0]">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#F3B2AB]">Studio shortcut</p>
                <h3 className="mt-2 text-2xl font-black text-white">Need to skip the setup?</h3>
                <p className="mt-2 text-sm text-zinc-200">
                  Open the full upload studio directly if your routine brief is already prepared.
                </p>
                <Button type="button" variant="primary" className="mt-5 w-full" onClick={() => router.push("/upload-choreo")}>
                  Open Upload Studio
                </Button>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}