/**
 * Hear & Express Personalization & Accessibility Profile Engine
 *
 * Implements granular user preferences across all 4 modules:
 * - Languages & Arabic dialects
 * - Caption sizing, contrast, and color themes
 * - TTS voice, speed, and critical message confirmation
 * - AAC layouts, switch scanning intervals, and favorite phrases
 * - Sound alerts categories, priorities, and presentation styles
 * - Sign language playback speeds and phonological cues
 *
 * Strict Ethical Rule:
 * Users are NEVER required to disclose or register a disability to access any feature.
 */

import type {
  HearAndExpressPreferences,
  PreferencesListener,
  FullDataExportPackage,
} from './types';
import { HearAndExpressPrivacyManager } from './privacyManager';
import { PersonalAacEngine } from '../personalAac';
import { UnifiedCommunicationEngine } from '../unifiedCommunication';

export const DEFAULT_PREFERENCES: HearAndExpressPreferences = {
  language: 'ar',
  arabicDialect: 'Arabic',

  captionSize: 'large',
  captionTheme: 'yellow_on_black',
  contrastLevel: 'high',
  reducedMotion: false,

  ttsVoiceId: null,
  ttsSpeed: 0.95,
  ttsPitch: 1.0,
  confirmCriticalMessages: true,

  aacGridSize: '3x4',
  activeAacBoardId: 'board_standard',
  aacSwitchScanningEnabled: false,
  aacScanSpeedMs: 1500,

  alertCategoriesEnabled: {
    smoke_alarm: true,
    fire_alarm: true,
    emergency_siren: true,
    door_knocking: true,
    doorbell: true,
    baby_crying: true,
    dog_barking: true,
    car_horn: true,
    glass_breaking: true,
  },
  alertPriorityThreshold: 'all',
  alertPresentation: 'banner',
  enableVibrationAlerts: true,

  signPlaybackSpeed: 1.0,
  showPhonologicalCues: true,
  showRegionalVariations: true,

  screenReaderVerbosity: 'descriptive',
  largeTouchTargets: true,
  noDisabilityDisclosureRequired: true, // Invariant
};

export class HearAndExpressPersonalizationEngine {
  private preferences: HearAndExpressPreferences;
  private listeners: Set<PreferencesListener> = new Set();
  private isStorageAvailable: boolean = true;

  constructor() {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      this.isStorageAvailable = false;
      return;
    }

    try {
      const stored = localStorage.getItem('rafiqi_hear_express_prefs_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.preferences = {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          noDisabilityDisclosureRequired: true, // Strict invariant lock
        };
      }
    } catch (e) {
      console.warn('[PersonalizationEngine] Storage load failed, operating with default profile:', e);
      this.preferences = { ...DEFAULT_PREFERENCES };
    }
  }

  private saveToStorage(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      localStorage.setItem('rafiqi_hear_express_prefs_v1', JSON.stringify(this.preferences));
      return true;
    } catch (e) {
      console.warn('[PersonalizationEngine] Storage save failed (quota or disabled), operating in-memory:', e);
      return false;
    }
  }

  public getPreferences(): HearAndExpressPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(partial: Partial<HearAndExpressPreferences>): HearAndExpressPreferences {
    this.preferences = {
      ...this.preferences,
      ...partial,
      noDisabilityDisclosureRequired: true, // Ensure invariant is never overwritten
    };
    this.saveToStorage();
    this.notify();
    return this.getPreferences();
  }

  public resetToDefaults(): HearAndExpressPreferences {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.saveToStorage();
    this.notify();
    return this.getPreferences();
  }

  // ─── Preset Accessibility Configurations ─────────────────────────────
  // (Optional ergonomic presets available without requiring clinical disclosure)

  public applyPreset(preset: 'high_visual' | 'acoustic_focus' | 'motor_scanning' | 'calm_minimal'): HearAndExpressPreferences {
    switch (preset) {
      case 'high_visual':
        return this.updatePreferences({
          captionSize: 'xxl',
          captionTheme: 'yellow_on_black',
          contrastLevel: 'maximum',
          reducedMotion: true,
          largeTouchTargets: true,
          showPhonologicalCues: true,
        });

      case 'acoustic_focus':
        return this.updatePreferences({
          alertPriorityThreshold: 'warning_and_danger',
          alertPresentation: 'modal',
          enableVibrationAlerts: true,
          captionSize: 'large',
        });

      case 'motor_scanning':
        return this.updatePreferences({
          aacSwitchScanningEnabled: true,
          aacScanSpeedMs: 1500,
          largeTouchTargets: true,
          reducedMotion: true,
          confirmCriticalMessages: true,
        });

      case 'calm_minimal':
        return this.updatePreferences({
          captionSize: 'normal',
          captionTheme: 'dark',
          contrastLevel: 'standard',
          reducedMotion: true,
          alertPresentation: 'silent_visual',
          screenReaderVerbosity: 'minimal',
        });

      default:
        return this.getPreferences();
    }
  }

  // ─── Complete Data Sovereignty Export ────────────────────────────────

  public generateFullExportPackage(
    privacyManager: HearAndExpressPrivacyManager,
    aacEngine?: PersonalAacEngine,
    unifiedEngine?: UnifiedCommunicationEngine
  ): FullDataExportPackage {
    return {
      version: '1.0',
      exportedAt: Date.now(),
      preferences: this.getPreferences(),
      privacyConsents: privacyManager.getConsent(),
      customAacBoardsCount: aacEngine ? aacEngine.getBoards().length : 0,
      savedNotesCount: unifiedEngine ? unifiedEngine.getNotes().length : 0,
      favoritePhrasesCount: aacEngine ? aacEngine.getFavoritePhrases().length : 0,
    };
  }

  public subscribe(listener: PreferencesListener): () => void {
    this.listeners.add(listener);
    listener(this.getPreferences());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const prefs = this.getPreferences();
    this.listeners.forEach((l) => l(prefs));
  }
}
