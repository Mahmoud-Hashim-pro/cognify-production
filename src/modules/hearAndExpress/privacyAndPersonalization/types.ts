import type { Dialect } from '../types';
import type { CaptionTheme } from '../liveConversation';
export type { CaptionTheme };

export type CaptionSize = 'normal' | 'large' | 'xl' | 'xxl';
export type ContrastLevel = 'standard' | 'high' | 'maximum';
export type AlertPresentationMode = 'banner' | 'modal' | 'vibration_only' | 'silent_visual';
export type AlertPriorityThreshold = 'all' | 'warning_and_danger' | 'danger_only';
export type TranscriptRetentionPolicy = 'session_only' | 'ephemeral_15min' | 'local_persistent';
export type ScreenReaderVerbosity = 'minimal' | 'standard' | 'descriptive';

export interface HearAndExpressPreferences {
  // 1. Language & Dialect
  language: 'ar' | 'en';
  arabicDialect: 'Egyptian Ammiya' | 'Arabic';

  // 2. Captions & Visuals
  captionSize: CaptionSize;
  captionTheme: CaptionTheme;
  contrastLevel: ContrastLevel;
  reducedMotion: boolean;

  // 3. TTS & Speech Output
  ttsVoiceId: string | null;
  ttsSpeed: number; // 0.5 to 1.5
  ttsPitch: number; // 0.5 to 1.5
  confirmCriticalMessages: boolean;

  // 4. AAC Board Layout & Navigation
  aacGridSize: '2x3' | '3x4' | '4x6';
  activeAacBoardId: string;
  aacSwitchScanningEnabled: boolean;
  aacScanSpeedMs: number;

  // 5. Sound Alerts & Notifications
  alertCategoriesEnabled: Record<string, boolean>;
  alertPriorityThreshold: AlertPriorityThreshold;
  alertPresentation: AlertPresentationMode;
  enableVibrationAlerts: boolean;

  // 6. Sign Learning Preferences
  signPlaybackSpeed: 0.5 | 0.75 | 1.0 | 1.25;
  showPhonologicalCues: boolean;
  showRegionalVariations: boolean;

  // 7. Universal Access & Ethical Invariant
  screenReaderVerbosity: ScreenReaderVerbosity;
  largeTouchTargets: boolean;
  noDisabilityDisclosureRequired: true; // Strict ethical rule
}

export interface PermissionStateAudit {
  microphone: 'granted' | 'denied' | 'prompt' | 'unsupported';
  camera: 'granted' | 'denied' | 'prompt' | 'unsupported';
  lastPermissionCheckTimestamp: number;
}

export interface ProcessingTransparencyDisclosure {
  audioProcessingLocation: 'client_device_memory_only';
  speechRecognitionEngineType: 'browser_web_speech_or_os_voice' | 'cloud_assisted_where_configured';
  rawAudioStored: false; // Strict safety invariant
  cameraStreamStored: false; // Strict safety invariant
  disclosureStatementAr: string;
  disclosureStatementEn: string;
}

export interface PrivacyConsentRecord {
  microphoneConsentGranted: boolean;
  cameraConsentGranted: boolean;
  audioProcessingAcknowledged: boolean;
  cloudDisclosureAcknowledged: boolean;
  transcriptRetention: TranscriptRetentionPolicy;
  consentTimestamp: number;
}

export interface FullDataExportPackage {
  version: '1.0';
  exportedAt: number;
  preferences: HearAndExpressPreferences;
  privacyConsents: PrivacyConsentRecord;
  customAacBoardsCount: number;
  savedNotesCount: number;
  favoritePhrasesCount: number;
}

export type PreferencesListener = (prefs: HearAndExpressPreferences) => void;
export type PrivacyConsentListener = (consent: PrivacyConsentRecord) => void;
