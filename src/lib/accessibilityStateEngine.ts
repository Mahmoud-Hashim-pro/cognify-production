/**
 * Cognify Accessibility 2.0 - Core Accessibility State Engine
 * src/lib/accessibilityStateEngine.ts
 *
 * Implements:
 * 1. Initial State Creation with balanced, agency-first defaults.
 * 2. Interaction Telemetry Observation & Multi-Modal Adaptive Derivation.
 * 3. 100% Student Agency & Manual Lock Protection.
 * 4. Respectful Speech Clarification Generation (Confidence < 0.70).
 * 5. Dynamic Multilingual AI Tutor Directives Synthesis (EN, AR, FR).
 * 6. Measurable Accessibility Feedback & Efficacy Tracking.
 * 7. Strict Ethical Non-Diagnosis Invariant Preservation.
 */

import type {
  AccessibilityState,
  A11yTelemetryObservation,
  PrimaryModality,
  ResponseLength,
  InteractionPacing,
  TextScalePreference,
  ContrastPreference,
  MotorInputMethod,
} from '../types/accessibilityState.js';
import {
  enforceNonDiagnosticInvariant,
  validateNonDiagnosticInvariant,
} from './accessibilityIntelligenceEngine.js';

/**
 * Creates default initial Accessibility State for a student.
 */
export function createDefaultAccessibilityState(userId: string): AccessibilityState {
  return {
    version: 2,
    userId: userId || 'anonymous_student',
    vision: {
      preferredTextScale: '100%',
      contrast: 'standard',
      screenReaderOptimized: false,
      ttsAutoNarration: false,
      simplifyVisualNoise: false,
    },
    hearing: {
      captionsEnabled: false,
      captionStyle: 'standard',
      visualAlertsEnabled: true,
      audioIndependenceRequired: false,
      showSignAvatar: false,
    },
    motor: {
      inputMethod: 'standard_touch_mouse',
      dwellTimeMs: 1200,
      tremorDebounceMs: 250,
      largeTargetMode: false,
      rowColumnScanIntervalMs: 1000,
    },
    speech: {
      inputMode: 'standard_speech',
      clarificationConfidenceThreshold: 0.70,
      lastRecognitionConfidence: 1.0,
    },
    communication: {
      primaryModality: 'text',
      responseLength: 'balanced',
      pacing: 'standard',
    },
    adaptation: {
      autoAdaptationEnabled: true,
      manualLocks: {},
      lastAdaptedTimestamp: Date.now(),
    },
    feedback: {
      adaptationsSuggestedCount: 0,
      adaptationsAcceptedCount: 0,
      completionRateDelta: 0.0,
    },
  };
}

/**
 * Derives adaptive accessibility preferences based on empirical telemetry observations.
 * Strict Invariants:
 * 1. If autoAdaptationEnabled is false => zero mutations.
 * 2. Every key in manualLocks is 100% immutable against AI adaptation.
 * 3. Enforces Non-Diagnostic Invariant: only operational capabilities are adapted.
 */
export function deriveAdaptiveAccessibilityState(
  currentState: AccessibilityState,
  observations: A11yTelemetryObservation[]
): AccessibilityState {
  enforceNonDiagnosticInvariant(currentState);

  if (!currentState.adaptation.autoAdaptationEnabled || !observations || observations.length === 0) {
    return currentState;
  }

  const locks = currentState.adaptation.manualLocks || {};
  const next = JSON.parse(JSON.stringify(currentState)) as AccessibilityState;

  const totalDwell = observations.reduce((acc, o) => acc + (o.dwellTimeMs || 0), 0);
  const avgDwell = totalDwell / observations.length;

  const totalTremors = observations.reduce((acc, o) => acc + (o.tremorRetriesCount || 0), 0);
  const avgTremors = totalTremors / observations.length;

  const totalCaptions = observations.reduce((acc, o) => acc + (o.captionUsageSeconds || 0), 0);
  const totalAudio = observations.reduce((acc, o) => acc + (o.audioListenedSeconds || 0), 0);

  // 1. Motor & Input Adaptation
  if (!locks['motor.largeTargetMode'] && (avgTremors >= 1.5 || avgDwell > 3000)) {
    next.motor.largeTargetMode = true;
  }
  if (!locks['motor.tremorDebounceMs'] && avgTremors >= 2.0) {
    next.motor.tremorDebounceMs = 450;
  }

  // 2. Communication Pacing Adaptation
  if (!locks['communication.pacing']) {
    if (avgDwell < 1500) {
      next.communication.pacing = 'rapid';
    } else if (avgDwell > 4000) {
      next.communication.pacing = 'deliberate';
    } else {
      next.communication.pacing = 'standard';
    }
  }

  // 3. Sensory Modality Adaptation
  if (!locks['hearing.captionsEnabled'] && totalCaptions >= 20 && totalAudio < 5) {
    next.hearing.captionsEnabled = true;
    if (!locks['communication.primaryModality']) {
      next.communication.primaryModality = 'visual';
    }
  } else if (!locks['vision.ttsAutoNarration'] && totalAudio >= 20) {
    next.vision.ttsAutoNarration = true;
    if (!locks['communication.primaryModality']) {
      next.communication.primaryModality = 'audio';
    }
  }

  // Re-assert locks strictly
  if (locks['motor.largeTargetMode']) next.motor.largeTargetMode = currentState.motor.largeTargetMode;
  if (locks['motor.tremorDebounceMs']) next.motor.tremorDebounceMs = currentState.motor.tremorDebounceMs;
  if (locks['communication.pacing']) next.communication.pacing = currentState.communication.pacing;
  if (locks['hearing.captionsEnabled']) next.hearing.captionsEnabled = currentState.hearing.captionsEnabled;
  if (locks['vision.ttsAutoNarration']) next.vision.ttsAutoNarration = currentState.vision.ttsAutoNarration;
  if (locks['communication.primaryModality']) next.communication.primaryModality = currentState.communication.primaryModality;

  next.adaptation.lastAdaptedTimestamp = Date.now();
  enforceNonDiagnosticInvariant(next);
  return next;
}

/**
 * Sets a manual user preference and optionally locks it against automatic AI changes.
 * Guarantees 100% Student Agency.
 */
export function setManualAccessibilityPreference(
  state: AccessibilityState,
  path: string,
  value: any,
  lock: boolean = true
): AccessibilityState {
  const check = validateNonDiagnosticInvariant({ [path]: value });
  if (!check.valid) {
    throw new Error(`[Accessibility Invariant Violation]: ${check.violations.join('; ')}`);
  }

  const next = JSON.parse(JSON.stringify(state)) as AccessibilityState;
  const parts = path.split('.');

  let curr: any = next;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!curr[parts[i]]) curr[parts[i]] = {};
    curr = curr[parts[i]];
  }
  curr[parts[parts.length - 1]] = value;

  if (lock) {
    next.adaptation.manualLocks[path] = true;
  } else {
    delete next.adaptation.manualLocks[path];
  }

  next.adaptation.lastAdaptedTimestamp = Date.now();
  return next;
}

/**
 * Records student feedback on an accessibility adaptation (e.g. accepted audio explanation).
 * Calculates empirical completion gain delta.
 */
export function recordAccessibilityFeedback(
  state: AccessibilityState,
  adaptationKey: string,
  accepted: boolean,
  completionDelta: number = 0.0
): AccessibilityState {
  const next = JSON.parse(JSON.stringify(state)) as AccessibilityState;

  next.feedback.adaptationsSuggestedCount = (next.feedback.adaptationsSuggestedCount || 0) + 1;
  if (accepted) {
    next.feedback.adaptationsAcceptedCount = (next.feedback.adaptationsAcceptedCount || 0) + 1;
  }

  if (completionDelta !== 0) {
    const prevDelta = next.feedback.completionRateDelta || 0.0;
    next.feedback.completionRateDelta = parseFloat(((prevDelta + completionDelta) / 2).toFixed(3));
  }

  return next;
}

/**
 * Generates respectful speech clarification options when voice recognition confidence drops below 0.70.
 * The AI tutor will NEVER pretend to understand ambiguous audio.
 */
export function generateSpeechClarificationPrompt(
  recognizedText: string,
  confidence: number,
  alternatives: string[] = [],
  lang: 'en' | 'ar' | 'fr' = 'en'
): { prompt: string; options: string[]; requiresClarification: boolean } {
  if (confidence >= 0.70 && recognizedText.trim().length > 0) {
    return {
      prompt: recognizedText,
      options: [],
      requiresClarification: false,
    };
  }

  if (lang === 'ar') {
    const options = alternatives.length > 0
      ? alternatives.slice(0, 3)
      : ['شرح المفهوم خطوة بخطوة', 'حل تمرين تطبيقي', 'إعادة صياغة السؤال كتابةً'];
    return {
      prompt: 'أود التأكد من أنني سمعتك بدقة. هل تقصد أحد الخيارات التالية؟',
      options,
      requiresClarification: true,
    };
  }

  if (lang === 'fr') {
    const options = alternatives.length > 0
      ? alternatives.slice(0, 3)
      : ['Expliquer le concept étape par étape', 'Pratiquer un exercice', 'Saisir la question par écrit'];
    return {
      prompt: 'Je souhaite m’assurer de vous avoir bien compris. Vouliez-vous dire :',
      options,
      requiresClarification: true,
    };
  }

  const options = alternatives.length > 0
    ? alternatives.slice(0, 3)
    : ['Explain the concept step-by-step', 'Practice an exercise', 'Type the question instead'];
  return {
    prompt: 'I want to make sure I understood you correctly. Did you mean:',
    options,
    requiresClarification: true,
  };
}

/**
 * Synthesizes dynamic AI system prompt directives from the student's active Accessibility State.
 * Decoupled from medical terms: provides operational instructions for modality, cadence, and visual anchors.
 */
export function synthesizeAccessibilityDirectives(
  state: AccessibilityState,
  lang: 'en' | 'ar' | 'fr' = 'en'
): string {
  enforceNonDiagnosticInvariant(state);

  const directives: string[] = [];

  // Modality & Phrasing
  if (state.communication.primaryModality === 'audio' || state.vision.ttsAutoNarration) {
    if (lang === 'ar') {
      directives.push('نسّق الإجابة للإلقاء الصوتي الطبيعي بجمل قصيرة وواضحة خالية من رموز ماركداون الزائدة.');
    } else if (lang === 'fr') {
      directives.push('Optimisez la formulation pour une narration audio fluide, avec des phrases courtes et sans symboles markdown superflus.');
    } else {
      directives.push('Format the response for natural spoken audio narration with clean, rhythmic sentences and no markdown clutter.');
    }
  } else if (state.communication.primaryModality === 'visual' || state.hearing.captionsEnabled) {
    if (lang === 'ar') {
      directives.push('نظّم الشرح في نقاط بصرية بارزة مع إبراز المفاهيم الأساسية بخط عريض.');
    } else if (lang === 'fr') {
      directives.push('Structurez l’explication avec des puces visuelles nettes et mettez en évidence les termes clés en gras.');
    } else {
      directives.push('Structure the explanation with prominent visual bullet points and highlight key concepts in bold.');
    }
  }

  // Response Length
  if (state.communication.responseLength === 'concise') {
    if (lang === 'ar') {
      directives.push('قدّم إجابات موجزة للغاية مع التركيز على جوهر المسألة دون استطراد.');
    } else if (lang === 'fr') {
      directives.push('Fournissez des réponses très concises, centrées sur l’essentiel sans digression.');
    } else {
      directives.push('Provide extremely concise answers, focusing strictly on core points without filler.');
    }
  }

  // Interaction Simplicity & Motor
  if (state.motor.largeTargetMode || state.motor.inputMethod === 'switch_access') {
    if (lang === 'ar') {
      directives.push('قسّم المسائل المعقدة إلى خطوات منفصلة واضحة مع إتاحة خيارات تفاعلية محددة.');
    } else if (lang === 'fr') {
      directives.push('Décomposez les problèmes complexes en étapes distinctes et numérotées avec des choix clairs.');
    } else {
      directives.push('Break complex problems into numbered, single-action sub-steps with clearly delineated choices.');
    }
  }

  return directives.join(' ');
}
