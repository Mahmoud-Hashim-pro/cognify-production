import type { AcousticAnalysisFrame, SoundEventCategory } from './types';

export interface SignatureDetectionResult {
  category: SoundEventCategory;
  confidence: number;
  descriptionEn: string;
  descriptionAr: string;
}

interface PulseEvent {
  startTime: number;
  endTime?: number;
  durationMs?: number;
  dominantFrequencyHz: number;
  peakDb: number;
}

export class TemporalSignatureEngine {
  // Pulse tracking state for T3 smoke/fire alarms
  private t3Pulses: PulseEvent[] = [];
  private t3CurrentPulse: PulseEvent | null = null;
  private t3LastDetectionTime = 0;

  // Transient tracking for knocking
  private knockEvents: { timestamp: number; peak: number; lowEnergy: number }[] = [];
  private lastKnockDetectionTime = 0;

  // Doorbell dual-tone tracking
  private chimeTones: { timestamp: number; freq: number; db: number }[] = [];
  private lastDoorbellDetectionTime = 0;

  /**
   * Evaluate an acoustic analysis frame against deterministic temporal and spectral signatures.
   *
   * @param frame Current AcousticAnalysisFrame from AcousticAnalyzer
   * @param now Current timestamp in milliseconds (defaults to Date.now())
   * @returns SignatureDetectionResult if a pattern matches, null otherwise
   */
  public evaluateFrame(
    frame: AcousticAnalysisFrame,
    now: number = frame.timestamp || Date.now()
  ): SignatureDetectionResult | null {
    // 1. Evaluate NFPA 72 T3 Smoke / Fire Alarm Cadence
    const t3Result = this.evaluateT3Alarm(frame, now);
    if (t3Result) return t3Result;

    // 2. Evaluate Transient Knocking Burst Signature
    const knockResult = this.evaluateKnockTransient(frame, now);
    if (knockResult) return knockResult;

    // 3. Evaluate Dual-Tone Doorbell Signature
    const doorbellResult = this.evaluateDoorbellChime(frame, now);
    if (doorbellResult) return doorbellResult;

    return null;
  }

  /**
   * NFPA 72 Temporal Three (T3) Smoke/Fire Alarm Cadence:
   * Consists of 3 audio pulses (~0.5s ON, ~0.5s OFF), followed by ~1.5s pause.
   * Dominant frequency is typically between 2600 Hz and 3500 Hz.
   * Required SNR: at least 10 dB above ambient noise floor.
   */
  private evaluateT3Alarm(frame: AcousticAnalysisFrame, now: number): SignatureDetectionResult | null {
    const isAlarmFrequency = frame.dominantFrequencyHz >= 2600 && frame.dominantFrequencyHz <= 3800;
    const isAlarmIntensity = frame.decibels >= 70 && frame.snrDb >= 10;
    const isHighBandDominant = frame.frequencyBand.high > 0.4 && frame.frequencyBand.high > frame.frequencyBand.low * 1.5;

    const isActiveAudio = isAlarmFrequency && isAlarmIntensity && isHighBandDominant;

    // Pulse state machine
    if (isActiveAudio) {
      if (!this.t3CurrentPulse) {
        // Pulse starts
        this.t3CurrentPulse = {
          startTime: now,
          dominantFrequencyHz: frame.dominantFrequencyHz,
          peakDb: frame.decibels,
        };
      } else {
        // Pulse continues
        if (frame.decibels > this.t3CurrentPulse.peakDb) {
          this.t3CurrentPulse.peakDb = frame.decibels;
        }
      }
    } else {
      if (this.t3CurrentPulse) {
        // Pulse ended
        const duration = now - this.t3CurrentPulse.startTime;
        this.t3CurrentPulse.endTime = now;
        this.t3CurrentPulse.durationMs = duration;

        // Valid T3 beep duration is typically 300ms to 700ms (nominal 500ms)
        if (duration >= 250 && duration <= 900) {
          this.t3Pulses.push({ ...this.t3CurrentPulse });
          // Retain only the last 6 pulses within a 6-second window
          this.t3Pulses = this.t3Pulses.filter((p) => now - p.startTime <= 6000);
        }
        this.t3CurrentPulse = null;
      }
    }

    // Direct instantaneous detection if audio is very loud, high-pitched and continuous
    // or if 3 consecutive pulses matching T3 cadence are recorded
    if (this.t3Pulses.length >= 3 && (this.t3LastDetectionTime === 0 || now - this.t3LastDetectionTime > 4000)) {
      const p1 = this.t3Pulses[this.t3Pulses.length - 3];
      const p2 = this.t3Pulses[this.t3Pulses.length - 2];
      const p3 = this.t3Pulses[this.t3Pulses.length - 1];

      const gap1 = p2.startTime - (p1.endTime || p1.startTime + 500);
      const gap2 = p3.startTime - (p2.endTime || p2.startTime + 500);

      // In T3, gap between pulses is nominally 0.5s (acceptable range 200ms - 800ms)
      const validCadence = gap1 >= 200 && gap1 <= 900 && gap2 >= 200 && gap2 <= 900;

      if (validCadence) {
        this.t3LastDetectionTime = now;
        this.t3Pulses = []; // Reset after firing
        return {
          category: 'smoke_alarm',
          confidence: 0.92,
          descriptionEn: 'Smoke alarm T3 cadence detected (NFPA 72 3-pulse sequence)',
          descriptionAr: 'تم رصد نمط إنذار الحريق والدخان المعتمد (تسلسل النبضات الثلاثي T3)',
        };
      }
    }

    // Immediate high-severity trigger if dominant frequency is >= 2800 Hz and volume is dangerously high (>= 88 dB)
    if (isAlarmFrequency && frame.decibels >= 88 && (this.t3LastDetectionTime === 0 || now - this.t3LastDetectionTime > 4000)) {
      this.t3LastDetectionTime = now;
      return {
        category: 'fire_alarm',
        confidence: 0.88,
        descriptionEn: 'High-intensity siren / fire alarm acoustic signature detected',
        descriptionAr: 'تم رصد صوت إنذار مرتفع الشدة أو صفارة طوارئ حادة',
      };
    }

    return null;
  }

  /**
   * Transient Knocking Burst Signature:
   * Fast acoustic impact (peak > 0.5, duration < 250ms),
   * low/mid frequency dominance (< 1500 Hz), SNR >= 8 dB.
   */
  private evaluateKnockTransient(frame: AcousticAnalysisFrame, now: number): SignatureDetectionResult | null {
    const isImpact =
      frame.peak >= 0.45 &&
      frame.decibels >= 65 &&
      frame.snrDb >= 8 &&
      frame.frequencyBand.low > 0.35 &&
      frame.frequencyBand.low > frame.frequencyBand.high * 1.3 &&
      frame.dominantFrequencyHz <= 1800;

    if (isImpact) {
      this.knockEvents.push({
        timestamp: now,
        peak: frame.peak,
        lowEnergy: frame.frequencyBand.low,
      });

      // Filter events to 2-second window
      this.knockEvents = this.knockEvents.filter((k) => now - k.timestamp <= 2000);

      // If at least 2 distinct impact spikes occur within 1.5 seconds, or a single strong knock occurs
      if (this.knockEvents.length >= 2 && (this.lastKnockDetectionTime === 0 || now - this.lastKnockDetectionTime > 3000)) {
        this.lastKnockDetectionTime = now;
        this.knockEvents = [];
        return {
          category: 'knocking',
          confidence: 0.85,
          descriptionEn: 'Rhythmic door knock transient impact sequence detected',
          descriptionAr: 'تم رصد صوت طرق إيقاعي على الباب أو ارتطام قصير',
        };
      } else if (frame.peak >= 0.75 && (this.lastKnockDetectionTime === 0 || now - this.lastKnockDetectionTime > 3000)) {
        this.lastKnockDetectionTime = now;
        return {
          category: 'knocking',
          confidence: 0.75,
          descriptionEn: 'Door knock transient impact detected',
          descriptionAr: 'تم رصد صوت طرق على الباب أو ارتطام خفيف',
        };
      }
    }

    return null;
  }

  /**
   * Dual-Tone Doorbell Chime:
   * Standard "Ding-Dong" chime: Tone 1 (~700 - 1000 Hz) followed by Tone 2 (~500 - 750 Hz)
   * within 300ms to 1200ms.
   */
  private evaluateDoorbellChime(frame: AcousticAnalysisFrame, now: number): SignatureDetectionResult | null {
    const isChimeTone =
      frame.decibels >= 65 &&
      frame.snrDb >= 8 &&
      frame.dominantFrequencyHz >= 500 &&
      frame.dominantFrequencyHz <= 1200 &&
      frame.frequencyBand.mid > 0.35;

    if (isChimeTone) {
      this.chimeTones.push({
        timestamp: now,
        freq: frame.dominantFrequencyHz,
        db: frame.decibels,
      });

      this.chimeTones = this.chimeTones.filter((c) => now - c.timestamp <= 2000);

      if (this.chimeTones.length >= 2 && (this.lastDoorbellDetectionTime === 0 || now - this.lastDoorbellDetectionTime > 4000)) {
        const first = this.chimeTones[0];
        const last = this.chimeTones[this.chimeTones.length - 1];
        const timeDiff = last.timestamp - first.timestamp;

        // Check for tone transition: first tone higher than second tone by at least 80 Hz
        if (timeDiff >= 200 && timeDiff <= 1500 && first.freq > last.freq + 70) {
          this.lastDoorbellDetectionTime = now;
          this.chimeTones = [];
          return {
            category: 'doorbell',
            confidence: 0.82,
            descriptionEn: 'Two-tone doorbell chime cadence detected (Ding-Dong)',
            descriptionAr: 'تم رصد نغمة جرس الباب الثنائية (Ding-Dong)',
          };
        }
      }
    }

    return null;
  }

  public reset(): void {
    this.t3Pulses = [];
    this.t3CurrentPulse = null;
    this.t3LastDetectionTime = 0;
    this.knockEvents = [];
    this.lastKnockDetectionTime = 0;
    this.chimeTones = [];
    this.lastDoorbellDetectionTime = 0;
  }
}
