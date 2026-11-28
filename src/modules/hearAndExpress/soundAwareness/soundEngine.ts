import type { SoundMeasurement, AlertSeverity } from '../types';
import type {
  SoundEventCategory,
  SoundAlert,
  SoundCategoryConfig,
  SoundAwarenessConfig,
  SoundMeasurementListener,
  SoundAlertListener,
  SoundAlertDismissListener,
  AcousticAnalysisFrame,
} from './types';
import { SAFETY_LIMITATION_NOTICE } from './types';
import { AcousticAnalyzer } from './acousticAnalyzer';
import { TemporalSignatureEngine } from './temporalSignatureEngine';
import { ModelClassifierAdapter } from './modelClassifierAdapter';

export class SoundAwarenessEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;

  private acousticAnalyzer: AcousticAnalyzer;
  private temporalSignatureEngine: TemporalSignatureEngine;
  private modelClassifierAdapter: ModelClassifierAdapter;

  private measurementListeners: Set<SoundMeasurementListener> = new Set();
  private alertListeners: Set<SoundAlertListener> = new Set();
  private dismissListeners: Set<SoundAlertDismissListener> = new Set();

  private config: SoundAwarenessConfig;
  private lastAlertTime: Record<string, number> = {};
  private categorySnoozeUntil: Record<string, number> = {};
  private alertHistory: SoundAlert[] = [];
  private readonly maxHistoryLength = 50;

  constructor(configOverrides?: Partial<SoundAwarenessConfig>) {
    this.acousticAnalyzer = new AcousticAnalyzer();
    this.temporalSignatureEngine = new TemporalSignatureEngine();
    this.modelClassifierAdapter = new ModelClassifierAdapter();

    this.config = {
      sampleRate: 44100,
      fftSize: 1024,
      smoothingTimeConstant: 0.8,
      alertThresholdDb: 75,
      dangerThresholdDb: 88,
      enableVibration: true,
      categories: { ...ModelClassifierAdapter.DEFAULT_CATEGORY_CONFIGS },
      privacy: {
        rawAudioStored: false,
        processingLocation: 'local_device_audio_worklet',
      },
      ...configOverrides,
    };
  }

  /**
   * SAFETY INVARIANT: Physical Realism Validation.
   * Proves that single-microphone hardware on standard client devices cannot measure
   * physical direction (0-360°) or distance. Throws if any caller attempts to inject
   * or simulate spatial vectors.
   */
  public static invariantSpatialValidation(suspectData?: { angle?: unknown; distance?: unknown }): boolean {
    if (suspectData && ('angle' in suspectData || 'distance' in suspectData)) {
      throw new Error(
        'PHYSICAL_INVARIANT_VIOLATION: Single-channel microphone audio cannot determine spatial direction or distance. Directional radar is prohibited.'
      );
    }
    return true;
  }

  public getSafetyNotice(): typeof SAFETY_LIMITATION_NOTICE {
    return SAFETY_LIMITATION_NOTICE;
  }

  public subscribeMeasurement(listener: SoundMeasurementListener): () => void {
    this.measurementListeners.add(listener);
    return () => {
      this.measurementListeners.delete(listener);
    };
  }

  public subscribeAlert(listener: SoundAlertListener): () => void {
    this.alertListeners.add(listener);
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  public subscribeDismiss(listener: SoundAlertDismissListener): () => void {
    this.dismissListeners.add(listener);
    return () => {
      this.dismissListeners.delete(listener);
    };
  }

  public async start(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
      source.connect(this.analyser);

      this.isRunning = true;
      this.pump();
      return true;
    } catch (err) {
      this.stop();
      return false;
    }
  }

  public stop(): void {
    if (this.animationFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyser = null;
    this.isRunning = false;
    this.temporalSignatureEngine.reset();
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getConfig(): SoundAwarenessConfig {
    return { ...this.config };
  }

  public getCategoryConfig(category: SoundEventCategory): SoundCategoryConfig {
    return { ...this.config.categories[category] };
  }

  public updateCategoryConfig(
    category: SoundEventCategory,
    updates: Partial<SoundCategoryConfig>
  ): void {
    if (this.config.categories[category]) {
      this.config.categories[category] = {
        ...this.config.categories[category],
        ...updates,
      };
    }
  }

  public setEnableVibration(enabled: boolean): void {
    this.config.enableVibration = enabled;
  }

  public snoozeCategory(category: SoundEventCategory, durationMinutes = 15): void {
    this.categorySnoozeUntil[category] = Date.now() + durationMinutes * 60 * 1000;
  }

  public cancelSnooze(category: SoundEventCategory): void {
    delete this.categorySnoozeUntil[category];
  }

  public isCategorySnoozed(category: SoundEventCategory): boolean {
    const until = this.categorySnoozeUntil[category];
    return typeof until === 'number' && Date.now() < until;
  }

  public dismissAlert(alertId: string): void {
    const target = this.alertHistory.find((a) => a.id === alertId);
    if (target) {
      target.isDismissed = true;
    }
    this.dismissListeners.forEach((l) => l(alertId));
  }

  public getActiveAlerts(): SoundAlert[] {
    const now = Date.now();
    return this.alertHistory.filter(
      (a) => !a.isDismissed && now - a.timestamp < 30000 // considered active for 30s
    );
  }

  public getAlertHistory(): SoundAlert[] {
    return [...this.alertHistory];
  }

  public clearAlertHistory(): void {
    this.alertHistory = [];
  }

  public getClassifierAdapter(): ModelClassifierAdapter {
    return this.modelClassifierAdapter;
  }

  /**
   * Process raw time-domain & frequency-domain buffers.
   * Called by Web Audio pump loop or directly in tests with synthetic data.
   */
  public processAudioBuffers(
    timeData: Float32Array | Uint8Array,
    freqData: Uint8Array,
    sampleRate = 44100
  ): SoundMeasurement {
    // 1. Acoustic Spectral & Temporal Analysis
    const frame = this.acousticAnalyzer.analyzeFrame(timeData, freqData, sampleRate);

    // 2. Evaluate against Deterministic Temporal Signatures
    const signatureMatch = this.temporalSignatureEngine.evaluateFrame(frame);

    // 3. Determine legacy pattern compatibility string
    let detectedPattern: 'alarm' | 'knock' | 'speech' | 'impact' | 'ambient' = 'ambient';

    if (signatureMatch?.category === 'smoke_alarm' || signatureMatch?.category === 'fire_alarm') {
      detectedPattern = 'alarm';
    } else if (signatureMatch?.category === 'knocking') {
      detectedPattern = 'knock';
    } else if (frame.frequencyBand.mid > 0.25 && frame.decibels >= 48 && frame.decibels < 82) {
      detectedPattern = 'speech';
    } else if (frame.peak > 0.85) {
      detectedPattern = 'impact';
    }

    const measurement: SoundMeasurement = {
      decibels: frame.decibels,
      rms: frame.rms,
      peak: frame.peak,
      frequencyBand: frame.frequencyBand,
      detectedPattern,
      timestamp: frame.timestamp,
    };

    // 4. Alert Evaluation & Triggering
    this.evaluateAndEmitAlerts(frame, signatureMatch);

    // 5. Notify measurement listeners
    this.measurementListeners.forEach((listener) => listener(measurement));

    return measurement;
  }

  private evaluateAndEmitAlerts(
    frame: AcousticAnalysisFrame,
    signatureMatch: ReturnType<TemporalSignatureEngine['evaluateFrame']>
  ): void {
    const now = frame.timestamp;

    // A. Priority 1: Verified Temporal Signature Match (e.g. Smoke Alarm T3, Knock, Doorbell)
    if (signatureMatch) {
      const catConfig = this.config.categories[signatureMatch.category];
      if (catConfig && catConfig.isEnabled && !this.isCategorySnoozed(signatureMatch.category)) {
        const last = this.lastAlertTime[signatureMatch.category] || 0;
        const cooldownMs = catConfig.cooldownSeconds * 1000;

        if (now - last > cooldownMs) {
          this.lastAlertTime[signatureMatch.category] = now;

          const alert: SoundAlert = {
            id: `alert_${now}_${signatureMatch.category}`,
            category: signatureMatch.category,
            type: signatureMatch.category === 'knocking' ? 'knock' : 'alarm',
            labelAr: signatureMatch.descriptionAr,
            labelEn: signatureMatch.descriptionEn,
            decibels: frame.decibels,
            confidence: signatureMatch.confidence,
            severity: catConfig.userPriority || catConfig.defaultPriority,
            detectionMethod: catConfig.detectionMethod,
            timestamp: now,
            isDismissed: false,
            isSnoozed: false,
            vibrationPattern: catConfig.vibrationPattern,
          };

          this.dispatchAlert(alert);
        }
      }
      return;
    }

    // B. Danger Volume Threshold (General High SPL Alert >= dangerThresholdDb, e.g. 88 dB)
    if (frame.decibels >= this.config.dangerThresholdDb) {
      const catConfig = this.config.categories['fire_alarm'];
      const last = this.lastAlertTime['danger_threshold'] || 0;
      if (now - last > 4000) {
        this.lastAlertTime['danger_threshold'] = now;

        const alert: SoundAlert = {
          id: `alert_${now}_danger_spl`,
          category: 'fire_alarm',
          type: 'alarm',
          labelAr: `خطر: شدة صوت بيئية شديدة الخطورة (${frame.decibels} ديسيبل)`,
          labelEn: `Danger: Extremely loud hazardous acoustic level (${frame.decibels} dB)`,
          decibels: frame.decibels,
          confidence: 0.9,
          severity: 'danger',
          detectionMethod: 'temporal_cadence_signature',
          timestamp: now,
          isDismissed: false,
          isSnoozed: false,
          vibrationPattern: catConfig?.vibrationPattern || [500, 200, 500, 200, 500],
        };

        this.dispatchAlert(alert);
      }
      return;
    }

    // C. Elevated Ambient Sound Alert (>= alertThresholdDb, e.g. 75 dB, with SNR >= 10 dB)
    if (frame.decibels >= this.config.alertThresholdDb && frame.snrDb >= 10) {
      const last = this.lastAlertTime['loud_ambient'] || 0;
      if (now - last > 3500) {
        this.lastAlertTime['loud_ambient'] = now;

        const alert: SoundAlert = {
          id: `alert_${now}_loud_ambient`,
          category: 'household_custom',
          type: 'loud_noise',
          labelAr: `تنبيه: ارتفاع ملحوظ في مستوى الصوت المحيط (${frame.decibels} ديسيبل)`,
          labelEn: `Warning: Elevated ambient acoustic level (${frame.decibels} dB)`,
          decibels: frame.decibels,
          confidence: 0.75,
          severity: 'warning',
          detectionMethod: 'custom_frequency_profile',
          timestamp: now,
          isDismissed: false,
          isSnoozed: false,
          vibrationPattern: [200, 100, 200],
        };

        this.dispatchAlert(alert);
      }
    }
  }

  private dispatchAlert(alert: SoundAlert): void {
    // Add to alert history
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > this.maxHistoryLength) {
      this.alertHistory.pop();
    }

    // Dispatch haptic vibration if enabled
    if (this.config.enableVibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(alert.vibrationPattern);
      } catch {
        // Mobile browser vibration policy or vibration blocked
      }
    }

    // Notify listeners
    this.alertListeners.forEach((listener) => listener(alert));
  }

  private pump(): void {
    if (!this.isRunning || !this.analyser) return;

    const timeBuffer = new Uint8Array(this.analyser.fftSize);
    const freqBuffer = new Uint8Array(this.analyser.frequencyBinCount);

    this.analyser.getByteTimeDomainData(timeBuffer);
    this.analyser.getByteFrequencyData(freqBuffer);

    this.processAudioBuffers(
      timeBuffer,
      freqBuffer,
      this.audioContext?.sampleRate || 44100
    );

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(() => this.pump());
    }
  }
}
