// lib/ai/voice-coach.ts — Web Speech API voice coaching with cooldown & queue

/**
 * VoiceCoach — speaks feedback messages aloud during dance sessions.
 * Uses the native Web Speech API (no dependencies).
 *
 * Features:
 * - Per-body-part cooldown (won't nag about the same joint repeatedly)
 * - Global cooldown (minimum gap between any spoken messages)
 * - Short, punchy messages optimized for mid-dance delivery
 * - Automatically selects a clear English voice
 */

interface VoiceCoachOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  globalCooldown?: number;
  partCooldown?: number;
}

export class VoiceCoach {
  private enabled: boolean;
  private synth: SpeechSynthesis | null;
  private rate: number;
  private pitch: number;
  private volume: number;
  private globalCooldownMs: number;
  private partCooldownMs: number;
  private lastSpoke = 0;
  private partTimestamps: Record<string, number> = {};
  private voice: SpeechSynthesisVoice | null = null;

  constructor(opts: VoiceCoachOptions = {}) {
    this.enabled =
      typeof window !== "undefined" && "speechSynthesis" in window;
    this.synth = this.enabled ? window.speechSynthesis : null;
    this.rate = opts.rate || 1.15;
    this.pitch = opts.pitch || 1.05;
    this.volume = opts.volume || 0.85;
    this.globalCooldownMs = opts.globalCooldown || 3500;
    this.partCooldownMs = opts.partCooldown || 8000;

    if (this.enabled) this.pickVoice();
  }

  /** Pick a clear English voice (prefer Google or female voices) */
  private pickVoice(): void {
    if (!this.synth) return;
    const pick = () => {
      const voices = this.synth!.getVoices();
      if (voices.length === 0) return;
      this.voice =
        voices.find((v) => v.name.includes("Google US English")) ||
        voices.find(
          (v) => v.lang === "en-US" && v.name.includes("Female")
        ) ||
        voices.find((v) => v.lang.startsWith("en-US")) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];
    };
    pick();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = pick;
    }
  }

  /**
   * Attempt to speak a coaching message.
   * @returns true if message was spoken, false if cooldown blocked it
   */
  speak(
    message: string,
    joint: string | null = null,
    type: "praise" | "warning" | "error" = "warning"
  ): boolean {
    if (!this.enabled || !this.synth) return false;

    const now = Date.now();

    // Global cooldown check
    if (now - this.lastSpoke < this.globalCooldownMs) return false;

    // Per-joint cooldown
    if (joint) {
      const lastPartTime = this.partTimestamps[joint] || 0;
      if (now - lastPartTime < this.partCooldownMs) return false;
      this.partTimestamps[joint] = now;
    }

    this.lastSpoke = now;

    // Cancel anything currently playing — we want the freshest feedback
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = type === "praise" ? 1.0 : this.rate;
    utterance.pitch = type === "praise" ? 1.15 : this.pitch;
    utterance.volume = this.volume;

    this.synth.speak(utterance);
    return true;
  }

  /**
   * Process feedback array from the pose engine and speak the most important one.
   */
  processFeedback(
    feedbackItems: Array<{
      type: "error" | "warning" | "praise";
      message: string;
      joint?: string;
    }>
  ): void {
    if (!feedbackItems || feedbackItems.length === 0) return;

    // Priority: error > warning > praise
    const errors = feedbackItems.filter((f) => f.type === "error");
    const warnings = feedbackItems.filter((f) => f.type === "warning");
    const praises = feedbackItems.filter((f) => f.type === "praise");

    if (errors.length > 0) {
      const e = errors[0];
      this.speak(e.message, e.joint || null, "error");
    } else if (warnings.length > 0) {
      const w = warnings[0];
      this.speak(w.message, w.joint || null, "warning");
    } else if (praises.length > 0) {
      // Only speak praise occasionally — don't flood with positivity
      if (Math.random() < 0.3) {
        this.speak(praises[0].message, null, "praise");
      }
    }
  }

  /** Stop all speech and clear cooldowns */
  reset(): void {
    if (this.synth) this.synth.cancel();
    this.lastSpoke = 0;
    this.partTimestamps = {};
  }

  /** Turn on/off */
  setEnabled(on: boolean): void {
    this.enabled =
      on && typeof window !== "undefined" && "speechSynthesis" in window;
    if (!on && this.synth) this.synth.cancel();
  }

  /** Get current enabled state */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Cleanup */
  destroy(): void {
    if (this.synth) this.synth.cancel();
    this.enabled = false;
  }
}

/** Factory function — creates a VoiceCoach instance */
export function createVoiceCoach(opts?: VoiceCoachOptions): VoiceCoach {
  return new VoiceCoach(opts);
}
