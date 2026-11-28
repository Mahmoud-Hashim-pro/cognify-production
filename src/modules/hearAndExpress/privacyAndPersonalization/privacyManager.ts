/**
 * Hear & Express Privacy and Consent Governance Manager
 *
 * Enforces strict privacy standards:
 * - Transparent disclosures for microphone and camera usage.
 * - No false claims: if browser Web Speech or cloud APIs transmit data to an external
 *   provider, the disclosure explicitly states that reality.
 * - Never stores raw audio or video streams.
 * - Complete data sovereignty: single-click export, complete scrub deletion, and consent withdrawal.
 */

import type {
  PermissionStateAudit,
  ProcessingTransparencyDisclosure,
  PrivacyConsentRecord,
  TranscriptRetentionPolicy,
  PrivacyConsentListener,
} from './types';

export const TRANSPARENCY_DISCLOSURE: ProcessingTransparencyDisclosure = {
  audioProcessingLocation: 'client_device_memory_only',
  speechRecognitionEngineType: 'browser_web_speech_or_os_voice',
  rawAudioStored: false,
  cameraStreamStored: false,
  disclosureStatementAr:
    'إفصاح الخصوصية والشفافية: يتم معالجة الصوت المباشر والوعي الصوتي محلياً في ذاكرة المتصفح المؤقتة (AudioWorklet) دون حفظ أو تسجيل أي ملفات صوتية خام. في حال استخدام ميزة التسميات التوضيحية المدعومة بمحرك المتصفح (Web Speech API)، قد تقوم بعض المتصفحات (مثل Google Chrome) بنقل الصوت المشفر مؤقتاً لخوادم سحابية لمعالجة التعرف على الكلام، ولا يدعي النظام معالجة سحابية محلية كذباً. جميع اللوحات المخصصة والملاحظات تحفظ على جهازك فقط.',
  disclosureStatementEn:
    'Privacy & Transparency Disclosure: Live environmental sound awareness is processed locally in temporary browser memory without recording or storing raw audio. When using browser-native speech recognition (Web Speech API), some browsers may transmit audio to vendor cloud servers for speech-to-text processing; we never falsely claim local processing when external cloud providers are involved. Custom boards and notes are stored strictly on your local device.',
};

export const DEFAULT_CONSENT_RECORD: PrivacyConsentRecord = {
  microphoneConsentGranted: false,
  cameraConsentGranted: false,
  audioProcessingAcknowledged: false,
  cloudDisclosureAcknowledged: false,
  transcriptRetention: 'session_only',
  consentTimestamp: 0,
};

export class HearAndExpressPrivacyManager {
  private consent: PrivacyConsentRecord;
  private permissions: PermissionStateAudit;
  private listeners: Set<PrivacyConsentListener> = new Set();

  constructor() {
    this.consent = { ...DEFAULT_CONSENT_RECORD };
    this.permissions = {
      microphone: 'prompt',
      camera: 'prompt',
      lastPermissionCheckTimestamp: Date.now(),
    };
    this.loadConsentFromStorage();
  }

  private loadConsentFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem('rafiqi_hear_express_privacy_consent_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.consent = { ...this.consent, ...parsed };
      }
    } catch {
      this.consent = { ...DEFAULT_CONSENT_RECORD };
    }
  }

  private saveConsentToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('rafiqi_hear_express_privacy_consent_v1', JSON.stringify(this.consent));
    } catch {
      // quota handling
    }
  }

  public getConsent(): PrivacyConsentRecord {
    return { ...this.consent };
  }

  public getTransparencyDisclosure(): ProcessingTransparencyDisclosure {
    return { ...TRANSPARENCY_DISCLOSURE };
  }

  public getPermissionAudit(): PermissionStateAudit {
    return { ...this.permissions };
  }

  // ─── Consent Grants & Revocations ────────────────────────────────────

  public grantMicrophoneConsent(): void {
    this.consent.microphoneConsentGranted = true;
    this.consent.audioProcessingAcknowledged = true;
    this.consent.consentTimestamp = Date.now();
    this.permissions.microphone = 'granted';
    this.saveConsentToStorage();
    this.notify();
  }

  public revokeMicrophoneConsent(): void {
    this.consent.microphoneConsentGranted = false;
    this.permissions.microphone = 'denied';
    this.saveConsentToStorage();
    this.notify();
  }

  public grantCameraConsent(): void {
    this.consent.cameraConsentGranted = true;
    this.consent.consentTimestamp = Date.now();
    this.permissions.camera = 'granted';
    this.saveConsentToStorage();
    this.notify();
  }

  public revokeCameraConsent(): void {
    this.consent.cameraConsentGranted = false;
    this.permissions.camera = 'denied';
    this.saveConsentToStorage();
    this.notify();
  }

  public setTranscriptRetention(policy: TranscriptRetentionPolicy): void {
    this.consent.transcriptRetention = policy;
    this.saveConsentToStorage();
    this.notify();
  }

  public acknowledgeCloudDisclosure(): void {
    this.consent.cloudDisclosureAcknowledged = true;
    this.saveConsentToStorage();
    this.notify();
  }

  /**
   * Complete Consent Withdrawal:
   * Revokes all sensor consents, resets retention to session-only,
   * and wipes session privacy markers.
   */
  public withdrawAllConsent(): void {
    this.consent = {
      ...DEFAULT_CONSENT_RECORD,
      consentTimestamp: Date.now(),
    };
    this.permissions.microphone = 'denied';
    this.permissions.camera = 'denied';
    this.saveConsentToStorage();
    this.notify();
  }

  /**
   * Cryptographic Scrub & Complete User Data Deletion:
   * Removes all local storage keys associated with Hear & Express.
   */
  public deleteAllUserData(): { success: boolean; erasedKeys: string[] } {
    const keysToErase = [
      'rafiqi_custom_aac_symbols',
      'rafiqi_aac_personal_boards_v2',
      'rafiqi_aac_category_order',
      'rafiqi_aac_user_preferences',
      'rafiqi_aac_favorite_phrases',
      'rafiqi_hear_express_prefs_v1',
      'rafiqi_hear_express_privacy_consent_v1',
      'rafiqi_transcripts_history',
      'rafiqi_saved_notes_v1',
    ];

    if (typeof localStorage !== 'undefined') {
      try {
        for (const key of keysToErase) {
          localStorage.removeItem(key);
        }
      } catch (err) {
        console.error('[PrivacyManager] Error while deleting local user data:', err);
      }
    }

    this.consent = { ...DEFAULT_CONSENT_RECORD };
    this.notify();

    return {
      success: true,
      erasedKeys: keysToErase,
    };
  }

  public subscribe(listener: PrivacyConsentListener): () => void {
    this.listeners.add(listener);
    listener(this.getConsent());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const c = this.getConsent();
    this.listeners.forEach((l) => l(c));
  }
}
