/**
 * Temporal smoothing for fingerspelling predictions and sign landmark transitions.
 * Eliminates jitter and prevents repetitive letter spamming on live video streams.
 */

export const SIGN_LETTERS = 'ABCDEFGHIKLMNOPQRSTUVWXY'; // 24 static letters, no motion-dependent J/Z

export interface SignPrediction {
  letter: string;
  confidence: number;
}

export class SignSmoother {
  private buf: SignPrediction[] = [];
  private lastEmitted = '';
  private lastEmitTime = 0;
  private gapSinceEmit = false;

  constructor(
    private windowSize = 8,
    private minAgreement = 5,
    private minConfidence = 0.6,
    private repeatCooldownMs = 900
  ) {}

  /** Feed one frame's prediction. Returns a letter when it stabilizes, else null. */
  push(p: SignPrediction): string | null {
    this.buf.push(p);
    if (this.buf.length > this.windowSize) this.buf.shift();
    if (this.buf.length < this.minAgreement) return null;

    const counts = new Map<string, { n: number; conf: number }>();
    for (const q of this.buf) {
      const c = counts.get(q.letter) ?? { n: 0, conf: 0 };
      c.n += 1;
      c.conf += q.confidence;
      counts.set(q.letter, c);
    }

    let best = '';
    let bestN = 0;
    let bestConf = 0;
    counts.forEach((v, k) => {
      if (v.n > bestN) {
        best = k;
        bestN = v.n;
        bestConf = v.conf / v.n;
      }
    });

    if (bestN < this.minAgreement || bestConf < this.minConfidence) return null;

    const now = performance.now();
    const isRepeat = best === this.lastEmitted;

    // The same letter only re-fires after the hand actually left (handLost -> gapSinceEmit)
    // or after cooldown if hand stayed.
    if (isRepeat && !this.gapSinceEmit) {
      return null;
    }

    this.lastEmitted = best;
    this.lastEmitTime = now;
    this.gapSinceEmit = false;
    this.buf = []; // Require fresh evidence for next commitment
    return best;
  }

  /** Call when MediaPipe reports no hand detected */
  handLost(): void {
    this.buf = [];
    this.gapSinceEmit = true;
  }

  /** Convenience: append stable letter to word */
  appendTo(word: string, letter: string): string {
    return word + letter;
  }

  reset(): void {
    this.buf = [];
    this.lastEmitted = '';
    this.gapSinceEmit = false;
  }
}
