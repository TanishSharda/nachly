// lib/ai/audio-engine.ts — Web Audio API beat detection for rhythm feedback

/**
 * AudioEngine — attaches to a <video> or <audio> element,
 * analyses frequency data to detect beats in real-time.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private lastBeatTime = 0;
  private beatInterval = 0;
  private _bpm = 0;
  private _beatCount = 0;
  private beatTimestamps: number[] = [];
  private energyHistory: number[] = [];
  private isRunning = false;
  private _rafId: number | null = null;

  public onBeat: ((beatIndex: number) => void) | null = null;

  // Tuning
  private readonly BEAT_THRESHOLD = 1.4; // energy must be 1.4× above average
  private readonly MIN_BEAT_GAP = 250; // ms — no beats faster than 240 BPM
  private readonly ENERGY_BUFFER = 60; // frames of history

  /**
   * Connect to a media element (<video> or <audio>).
   * Must be called after user gesture (click/tap).
   */
  connect(mediaElement: HTMLMediaElement): boolean {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.ctx.createMediaElementSource(mediaElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.ctx.destination); // still output audio

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      this.isRunning = true;
      this.loop();
      return true;
    } catch (err) {
      console.warn("AudioEngine: failed to connect", err);
      return false;
    }
  }

  /** Main analysis loop */
  private loop(): void {
    if (!this.isRunning || !this.analyser || !this.dataArray) return;

    // @ts-expect-error — TS5 Uint8Array<ArrayBuffer> vs ArrayBufferLike mismatch
    this.analyser.getByteFrequencyData(this.dataArray);

    // Compute energy — focus on low frequencies (bass = beats)
    let energy = 0;
    const bassEnd = Math.min(16, this.dataArray.length);
    for (let i = 0; i < bassEnd; i++) {
      energy += this.dataArray[i];
    }
    energy /= bassEnd;

    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.ENERGY_BUFFER) {
      this.energyHistory.shift();
    }

    // Average energy
    const avgEnergy =
      this.energyHistory.reduce((a, b) => a + b, 0) /
      this.energyHistory.length;

    // Beat detection
    const now = performance.now();
    if (
      energy > avgEnergy * this.BEAT_THRESHOLD &&
      energy > 40 && // minimum absolute energy
      now - this.lastBeatTime > this.MIN_BEAT_GAP
    ) {
      this.lastBeatTime = now;
      this._beatCount++;
      this.beatTimestamps.push(now);

      // Keep last 20 beat timestamps for BPM calc
      if (this.beatTimestamps.length > 20) {
        this.beatTimestamps.shift();
      }

      // Calculate BPM from recent beats
      if (this.beatTimestamps.length >= 4) {
        const intervals: number[] = [];
        for (let i = 1; i < this.beatTimestamps.length; i++) {
          intervals.push(this.beatTimestamps[i] - this.beatTimestamps[i - 1]);
        }
        const avgInterval =
          intervals.reduce((a, b) => a + b, 0) / intervals.length;
        this._bpm = Math.round(60000 / avgInterval);
        this.beatInterval = avgInterval;
      }

      if (this.onBeat) {
        this.onBeat(this._beatCount);
      }
    }

    this._rafId = requestAnimationFrame(() => this.loop());
  }

  /** Get current energy level (0-255 normalized) */
  getEnergy(): number {
    if (!this.dataArray) return 0;
    let total = 0;
    for (let i = 0; i < this.dataArray.length; i++) total += this.dataArray[i];
    return total / this.dataArray.length;
  }

  /** Check if user movement is on beat */
  isOnBeat(windowMs = 200): boolean {
    return performance.now() - this.lastBeatTime < windowMs;
  }

  /** Get current BPM estimate */
  getBPM(): number {
    return this._bpm;
  }

  /** Get beat count */
  get beatCount(): number {
    return this._beatCount;
  }

  /** Disconnect and cleanup */
  disconnect(): void {
    this.isRunning = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    try {
      if (this.source) this.source.disconnect();
      if (this.analyser) this.analyser.disconnect();
      if (this.ctx && this.ctx.state !== "closed") this.ctx.close();
    } catch {
      // ignore cleanup errors
    }
    this.ctx = null;
    this.analyser = null;
    this.source = null;
  }
}

/** Create a simple audio engine instance */
export function createAudioEngine(): AudioEngine {
  return new AudioEngine();
}
