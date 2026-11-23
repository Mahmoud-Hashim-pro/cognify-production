import type { Dialect, DialogMessage } from '../types';

export type RecognitionState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'paused'
  | 'error';

export type RecognitionErrorCode =
  | 'not-allowed'
  | 'no-speech'
  | 'network'
  | 'audio-capture'
  | 'aborted'
  | 'language-not-supported'
  | 'service-not-allowed'
  | 'unknown';

export interface RecognitionError {
  code: RecognitionErrorCode;
  messageAr: string;
  messageEn: string;
  recoverable: boolean;
  suggestedActionAr: string;
  suggestedActionEn: string;
}

export interface SupportedLanguageInfo {
  code: string;               // e.g. 'ar-SA', 'ar-EG', 'en-US'
  dialect: Dialect;
  labelAr: string;
  labelEn: string;
  isEngineSupported: boolean; // Evaluated against active browser engine
  requiresInternet: boolean;  // True for Chromium cloud STT
  isDefault?: boolean;
}

export type CaptionTextSize = 'standard' | 'large' | 'extra_large' | 'huge';

export type CaptionTheme =
  | 'blue_companion'       // Rafiqi signature deep navy & cyan
  | 'dark_high_contrast'   // Pure black (#000000) & vivid cyan / yellow
  | 'light_high_contrast'  // Pure white (#FFFFFF) & deep bold navy
  | 'amber_on_black'       // Black (#000000) & classic low-vision amber (#FFB800)
  | 'yellow_on_navy'       // Deep navy (#0A192F) & electric yellow (#FFFF00)
  | 'yellow_on_black'
  | 'high_contrast'
  | 'dark'
  | 'light';

export type CaptionFontFamily = 'system' | 'rounded' | 'monospace';

export interface CaptionVisualSettings {
  textSize: CaptionTextSize;
  theme: CaptionTheme;
  fontFamily: CaptionFontFamily;
  lineHeight: 'normal' | 'relaxed' | 'loose';
  showTimestamps: boolean;
  showSpeakerLabels: boolean;
  autoScroll: boolean;
  reducedMotion: boolean;
}

export interface TranscriptSegment {
  id: string;
  sender: 'user' | 'other' | string;
  speaker: 'user' | 'other' | string;
  speakerLabel: string;
  text: string;
  originalText: string;
  isEdited: boolean;
  editHistory?: Array<{ text: string; timestamp: number }>;
  timestamp: number;
  dialect: Dialect;
  confidence: number;
  isFinal: boolean;
  isBookmarked: boolean;
  isLowConfidence: boolean;
  direction: 'rtl' | 'ltr';
}

export interface VocabularyItem {
  id: string;
  originalPhrase: string;
  replacementPhrase: string;
  note?: string;
  caseSensitive?: boolean;
}

export interface ConversationNote {
  id: string;
  text: string;
  timestamp: number;
  linkedSegmentId?: string;
}

export interface PrivacySettings {
  retentionPolicy: 'session_only' | 'local_storage' | 'manual_clear';
  dataProcessingDisclosureAcknowledged: boolean;
  rawAudioStored: false; // Invariant: Raw audio is NEVER stored
}

export interface TranscriptSummary {
  title: string;
  topic: string;
  keyPoints: string[];
  actionItems: string[];
  generatedAt: number;
  totalSegmentsAnalyzed: number;
}

export interface LiveConversationConfig {
  defaultDialect: Dialect;
  autoSpeakOutgoing: boolean;
  hapticOnIncoming: boolean;
  visualSettings: CaptionVisualSettings;
  privacy: PrivacySettings;
}

export type ConversationListener = (messages: TranscriptSegment[]) => void;
export type LiveStreamListener = (partialText: string, confidence: number) => void;
export type RecognitionStateListener = (state: RecognitionState, error?: RecognitionError) => void;
