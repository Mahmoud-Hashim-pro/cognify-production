/**
 * Hear & Express — Core Modular Architecture Barrel Export
 *
 * Provides a clean, clinically honest, and reliable system for Deaf,
 * Hard of Hearing, and AAC users.
 */

export * from './types';
export * from './liveConversation';
export * from './soundAwareness';
export * from './signLanguage';
export * from './personalAac';
export * from './unifiedCommunication';
export * from './privacyAndPersonalization';
export type { SoundAlert } from './soundAwareness';

import { ConversationEngine } from './liveConversation';
import { SoundAwarenessEngine } from './soundAwareness';
import { SignLanguageService } from './signLanguage';
import { PersonalAacEngine } from './personalAac';
import { UnifiedCommunicationEngine } from './unifiedCommunication';
import { HearAndExpressPrivacyManager, HearAndExpressPersonalizationEngine } from './privacyAndPersonalization';
import type { HearAndExpressState } from './types';

export class HearAndExpressOrchestrator {
  public conversation: ConversationEngine;
  public soundAwareness: SoundAwarenessEngine;
  public signLanguage: SignLanguageService;
  public aac: PersonalAacEngine;
  public unified: UnifiedCommunicationEngine;
  public privacy: HearAndExpressPrivacyManager;
  public personalization: HearAndExpressPersonalizationEngine;

  constructor() {
    this.conversation = new ConversationEngine();
    this.soundAwareness = new SoundAwarenessEngine();
    this.signLanguage = new SignLanguageService();
    this.aac = new PersonalAacEngine();
    this.unified = new UnifiedCommunicationEngine();
    this.privacy = new HearAndExpressPrivacyManager();
    this.personalization = new HearAndExpressPersonalizationEngine();
  }

  public getSystemState(): HearAndExpressState {
    return {
      liveConversation: {
        isInitialized: true,
        isActive: this.conversation.getIsListening(),
        error: null,
      },
      soundAwareness: {
        isInitialized: true,
        isActive: this.soundAwareness.getIsRunning(),
        error: null,
      },
      signLanguage: {
        isInitialized: true,
        isActive: true,
        error: null,
      },
      personalAac: {
        isInitialized: true,
        isActive: true,
        error: null,
      },
    };
  }

  /**
   * Verified Clinical & Safety Invariant Check:
   * 1. Rejects fake spatial audio angle/distance.
   * 2. Confirms offline AAC readiness.
   * 3. Confirms sign lexicon backing.
   */
  public verifySafetyInvariants(): {
    spatialDirectionProhibited: boolean;
    offlineAacReady: boolean;
    masterLexiconBacked: boolean;
  } {
    // Spatial validation must throw when provided directional data
    let directionProhibited = false;
    try {
      SoundAwarenessEngine.invariantSpatialValidation({ angle: 90, distance: 3.5 });
    } catch {
      directionProhibited = true;
    }

    const aacSymbols = this.aac.getSymbols();
    const offlineAacReady = aacSymbols.length >= 18;

    const lexiconCount = this.signLanguage.getMasterLexiconCount();
    const masterLexiconBacked = lexiconCount >= 1400;

    return {
      spatialDirectionProhibited: directionProhibited,
      offlineAacReady,
      masterLexiconBacked,
    };
  }
}

// Global singleton instance for app-wide access
let orchestratorInstance: HearAndExpressOrchestrator | null = null;

export function getHearAndExpressSystem(): HearAndExpressOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new HearAndExpressOrchestrator();
  }
  return orchestratorInstance;
}
