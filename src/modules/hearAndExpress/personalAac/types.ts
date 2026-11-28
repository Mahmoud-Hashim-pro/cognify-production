import type { AacSymbol, Dialect } from '../types';
export type { AacSymbol };

export type DefaultAacCategory =
  | 'home'
  | 'school'
  | 'work'
  | 'healthcare'
  | 'transportation'
  | 'food_and_drink'
  | 'emotions'
  | 'social_communication'
  | 'emergencies';

export type LegacyAacCategory = 'emergency' | 'medical' | 'daily' | 'academic';

export type AacCategory = DefaultAacCategory | LegacyAacCategory | string;

export interface CategoryMetadata {
  id: AacCategory;
  labelAr: string;
  labelEn: string;
  icon: string;
  descriptionAr: string;
  descriptionEn: string;
  isEmergency?: boolean;
}

export interface AacSentence {
  symbols: AacSymbol[];
  textAr: string;
  textEn: string;
}

export type AacSentenceListener = (sentence: AacSentence) => void;

export interface AacBoard {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  categoryOrder: AacCategory[];
  symbolIds: string[];
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AacPreferences {
  speechRate: number; // 0.5 to 1.5
  speechPitch: number; // 0.5 to 1.5
  preferredVoiceId: string | null;
  textSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrastMode: boolean;
  confirmBeforeSpeaking: boolean;
  switchScanningEnabled: boolean;
  switchScanSpeedMs: number;
  switchScanMode: 'auto' | 'step';
}

export interface SwitchScanningState {
  isActive: boolean;
  currentElementIndex: number;
  totalElements: number;
  activeGroup: 'categories' | 'symbols' | 'sentence_bar';
  scanSpeedMs: number;
  isPaused: boolean;
}

export type SwitchScanListener = (state: SwitchScanningState) => void;

export interface AacExportPayload {
  version: '1.0';
  exportedAt: number;
  boards: AacBoard[];
  customSymbols: AacSymbol[];
  favoritePhrases: { textAr: string; textEn: string; category: string }[];
  categoryOrder: AacCategory[];
  preferences: AacPreferences;
}

export interface OfflineAacAuditReport {
  isFullyOfflineCapable: boolean;
  boardStorageOffline: boolean;
  symbolNavigationOffline: boolean;
  sentenceCompositionOffline: boolean;
  ttsOfflineStatus: 'native_os_voices_supported_offline' | 'cloud_voices_require_internet';
  ttsOfflineExplanationAr: string;
  ttsOfflineExplanationEn: string;
}
