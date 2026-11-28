/**
 * Hear & Express Architecture — Core Types & Safety Invariants
 *
 * Grounded foundation for Deaf, Hard of Hearing, and AAC communication support.
 * Replaces legacy pseudo-heuristics and fake radar metrics with empirical, reliable engineering.
 */

export type Dialect = 'Egyptian Ammiya' | 'Arabic' | 'English';

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface ModuleStatus {
  isInitialized: boolean;
  isActive: boolean;
  error: string | null;
}

export interface HearAndExpressState {
  liveConversation: ModuleStatus;
  soundAwareness: ModuleStatus;
  signLanguage: ModuleStatus;
  personalAac: ModuleStatus;
}

/**
 * Strict Engineering Invariant:
 * Single microphone inputs in standard consumer browsers CANNOT calculate physical sound angle (0-360°)
 * or exact distance in meters. Any system claiming directional audio from a mono stream is clinically fraudulent.
 */
export interface SoundMeasurement {
  decibels: number;           // Estimated SPL dB (0 to ~120 dB)
  rms: number;                // Root mean square amplitude (0.0 to 1.0)
  peak: number;               // Peak amplitude (0.0 to 1.0)
  frequencyBand: {
    low: number;              // Bass / low frequency energy (<300Hz)
    mid: number;              // Human vocal range energy (300Hz - 2500Hz)
    high: number;             // High pitch / sirens / alarms (>2500Hz)
  };
  detectedPattern?: 'alarm' | 'knock' | 'speech' | 'impact' | 'ambient';
  timestamp: number;
}

export interface SoundAlert {
  id: string;
  type: 'alarm' | 'knock' | 'loud_noise' | 'speech';
  labelAr: string;
  labelEn: string;
  decibels: number;
  severity: AlertSeverity;
  timestamp: number;
}

export interface DialogMessage {
  id: string;
  sender: 'user' | 'other';
  text: string;
  timestamp: number;
  dialect: Dialect;
  confidence?: number;
  isFinal: boolean;
}

export interface AacSymbol {
  id: string;
  labelAr: string;
  labelEn: string;
  icon: string;
  category: string;
  spokenTextAr: string;
  spokenTextEn: string;
  isCustom?: boolean;
  isFavorite?: boolean;
  usageCount?: number;
  shortcutKey?: string;
}

export interface SignRecognitionStatus {
  isCameraActive: boolean;
  isHandTracked: boolean;
  trackedLandmarksCount: number;
  /**
   * Honest scientific disclosure:
   * Real-time continuous sign language translation requires custom-trained deep learning
   * pose models and sequence decoders. Arbitrary finger-curl heuristics are not reliable translations.
   */
  researchStatus: 'lexicon_supported' | 'tracking_active' | 'empirical_research_required';
  disclaimerAr: string;
  disclaimerEn: string;
}
