import type { SoundMeasurement, AlertSeverity } from '../types';

export type { AlertSeverity };

export type SoundEventCategory =
  | 'fire_alarm'
  | 'smoke_alarm'
  | 'doorbell'
  | 'knocking'
  | 'baby_crying'
  | 'dog_barking'
  | 'car_horn'
  | 'emergency_siren'
  | 'glass_breaking'
  | 'appliance_alert'
  | 'household_custom';

export type DetectionMethodType =
  | 'temporal_cadence_signature'  // e.g. T3/T4 temporal pulse sequences
  | 'transient_impact_signature'  // e.g. sharp acoustic transient burst
  | 'deep_learning_model'         // e.g. YAMNet / AudioSet CNN classifier
  | 'custom_frequency_profile';   // e.g. calibrated appliance beep

export type CategoryModelStatus =
  | 'active_verified'             // Live detection running with authentic signature
  | 'model_weights_required'      // Honestly declared: requires trained neural weights
  | 'user_configured';            // User defined profile

export interface SoundCategoryConfig {
  category: SoundEventCategory;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  defaultPriority: AlertSeverity;
  userPriority: AlertSeverity;
  isEnabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  cooldownSeconds: number;
  vibrationPattern: number[];     // Vibration pattern in ms, e.g. [300, 100, 300]
  detectionMethod: DetectionMethodType;
  modelStatus: CategoryModelStatus;
  modelDetails?: {
    modelName: string;
    version: string;
    source: string;
    license: string;
  };
}

export interface SoundAlert {
  id: string;
  category: SoundEventCategory;
  type: string;                  // Compatibility with Phase 1 ('alarm' | 'knock' | 'loud_noise' | 'speech')
  labelAr: string;
  labelEn: string;
  decibels: number;
  confidence: number;            // 0.0 to 1.0 (empirically calculated or model confidence)
  confidenceScore?: number;       // Alias for test compatibility
  severity: AlertSeverity;
  detectionMethod?: DetectionMethodType;
  timestamp: number;
  isDismissed?: boolean;
  isSnoozed?: boolean;
  vibrationPattern?: number[];
  explanationAr?: string;
  explanationEn?: string;
}

export interface AcousticAnalysisFrame {
  timestamp: number;
  rms: number;
  peak: number;
  decibels: number;
  frequencyBand: {
    low: number;                 // < 300 Hz
    mid: number;                 // 300 - 2500 Hz
    high: number;                // > 2500 Hz
  };
  dominantFrequencyHz: number;
  noiseFloorDb: number;
  snrDb: number;                 // Signal-to-Noise Ratio in dB
}

export interface SoundAwarenessConfig {
  sampleRate: number;
  fftSize: number;
  smoothingTimeConstant: number;
  alertThresholdDb: number;        // e.g. 75 dB
  dangerThresholdDb: number;       // e.g. 88 dB
  enableVibration: boolean;
  categories: Record<SoundEventCategory, SoundCategoryConfig>;
  privacy: {
    rawAudioStored: false;        // Strict safety invariant
    processingLocation: 'local_device_audio_worklet';
  };
}

export const SAFETY_LIMITATION_NOTICE = {
  ar: 'تنبيه سلامة هام: رفيقي أداة مساعدة إلكترونية للأفراد الصم وضعاف السمع للمساعدة في الانتباه للأصوات البيئية، وليست نظام إنذار حريق معتمد أو بديلاً عن أجهزة السلامة الرسمية المعتمدة طبياً أو مدنياً. لا يمكن ضمان رصد جميع الأصوات في كافة البيئات الصوتية المعقدة.',
  en: 'IMPORTANT SAFETY NOTICE: Rafiqi is an assistive visual notification tool for Deaf and hard-of-hearing individuals. It is NOT a certified fire alarm, medical monitor, or official life-safety system. Detection of every alarm, siren, or sound cannot be guaranteed across all acoustic environments.',
};

export type SoundMeasurementListener = (measurement: SoundMeasurement) => void;
export type SoundAlertListener = (alert: SoundAlert) => void;
export type SoundAlertDismissListener = (alertId: string) => void;
