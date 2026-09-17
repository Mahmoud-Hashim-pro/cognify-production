/**
 * Cognify Accessibility 2.0 - Core Accessibility State Contract
 * src/types/accessibilityState.ts
 *
 * Models operational accessibility capabilities, sensory preferences, motor parameters,
 * and feedback telemetry decoupled from static medical diagnostic assumptions.
 * Enforces 100% Student Agency via granular manualLocks.
 */

export type TextScalePreference = '100%' | '125%' | '150%' | '200%';
export type ContrastPreference = 'standard' | 'high_contrast' | 'dark_obsidian';
export type CaptionStylePreference = 'standard' | 'high_contrast_yellow' | 'large_subtitles';
export type MotorInputMethod =
  | 'standard_touch_mouse'
  | 'keyboard_only'
  | 'switch_access'
  | 'dwell_selection'
  | 'gaze_blink';
export type SpeechInputMode =
  | 'standard_speech'
  | 'adaptive_speech'
  | 'phrase_bank'
  | 'text_only';
export type PrimaryModality = 'text' | 'audio' | 'visual' | 'hybrid' | 'sign_language';
export type ResponseLength = 'concise' | 'balanced' | 'detailed';
export type InteractionPacing = 'rapid' | 'standard' | 'deliberate';

export interface AccessibilityVisionPreferences {
  preferredTextScale: TextScalePreference;
  contrast: ContrastPreference;
  screenReaderOptimized: boolean;
  ttsAutoNarration: boolean;
  simplifyVisualNoise: boolean;
}

export interface AccessibilityHearingPreferences {
  captionsEnabled: boolean;
  captionStyle: CaptionStylePreference;
  visualAlertsEnabled: boolean;
  audioIndependenceRequired: boolean;
  showSignAvatar: boolean;
}

export interface AccessibilityMotorPreferences {
  inputMethod: MotorInputMethod;
  dwellTimeMs: number;
  tremorDebounceMs: number;
  largeTargetMode: boolean;
  rowColumnScanIntervalMs: number;
}

export interface AccessibilitySpeechPreferences {
  inputMode: SpeechInputMode;
  clarificationConfidenceThreshold: number;
  lastRecognitionConfidence?: number;
}

export interface AccessibilityCommunicationPreferences {
  primaryModality: PrimaryModality;
  responseLength: ResponseLength;
  pacing: InteractionPacing;
}

export interface AccessibilityAdaptationControl {
  autoAdaptationEnabled: boolean;
  manualLocks: Record<string, boolean>;
  lastAdaptedTimestamp: number;
}

export interface AccessibilityFeedbackMetrics {
  adaptationsSuggestedCount: number;
  adaptationsAcceptedCount: number;
  completionRateDelta: number;
}

export interface AccessibilityState {
  version: 2;
  userId: string;
  vision: AccessibilityVisionPreferences;
  hearing: AccessibilityHearingPreferences;
  motor: AccessibilityMotorPreferences;
  speech: AccessibilitySpeechPreferences;
  communication: AccessibilityCommunicationPreferences;
  adaptation: AccessibilityAdaptationControl;
  feedback: AccessibilityFeedbackMetrics;
}

export interface A11yTelemetryObservation {
  timestamp: number;
  dwellTimeMs?: number;
  captionUsageSeconds?: number;
  audioListenedSeconds?: number;
  tremorRetriesCount?: number;
  voiceInputConfidence?: number;
  interactionType?: 'quiz' | 'reading' | 'chat' | 'navigation';
}
