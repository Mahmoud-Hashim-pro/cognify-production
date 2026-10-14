/**
 * Cognify Accessibility 2.0 - Core Accessibility State & Intelligence Benchmark
 * tests/benchmarks/accessibilityStateBenchmark.ts
 *
 * Comprehensive benchmark covering:
 *   Pillar 1: Ethical Non-Diagnostic Invariant Guard (Strict capability modeling, 0 clinical labels).
 *   Pillar 2: 100% Student Agency & Manual Lock Protection (AI cannot override locked student choices).
 *   Pillar 3: Interaction Telemetry Observation & Multi-Modal Adaptive Derivation.
 *   Pillar 4: Respectful Speech Clarification Generation (Confidence < 0.70 guardrails in EN, AR, FR).
 *   Pillar 5: Measurable Accessibility Feedback & Completion Gain Efficacy Tracking.
 *   Pillar 6: Multilingual AI Tutor Directives Synthesis & System Prompt Integration.
 *
 * Usage:
 *   npx tsx tests/benchmarks/accessibilityStateBenchmark.ts
 */

import {
  createDefaultAccessibilityState,
  deriveAdaptiveAccessibilityState,
  setManualAccessibilityPreference,
  recordAccessibilityFeedback,
  generateSpeechClarificationPrompt,
  synthesizeAccessibilityDirectives,
} from '../../src/lib/accessibilityStateEngine.js';
import {
  validateNonDiagnosticInvariant,
  enforceNonDiagnosticInvariant,
  FORBIDDEN_CLINICAL_KEYWORDS,
} from '../../src/lib/accessibilityIntelligenceEngine.js';
import { formatAccessibilityStateBlock, buildPersona } from '../../api/_lib/ai.js';
import type { AccessibilityState, A11yTelemetryObservation } from '../../src/types/accessibilityState.js';
import type { Profile } from '../../api/_lib/ai.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string, detail?: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}${detail ? ` (${detail})` : ''}`);
    failedTests++;
  } else {
    console.log(`  ✅ PASS: ${message}${detail ? ` [${detail}]` : ''}`);
    passedTests++;
  }
}

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('  COGNIFY ACCESSIBILITY 2.0: BENCHMARK SUITE & INVARIANT AUDIT');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// Pillar 1: Ethical Non-Diagnostic Invariant Guard
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ Pillar 1: Ethical Non-Diagnostic Invariant Guard');
{
  const initialState = createDefaultAccessibilityState('student_bench_01');
  const initialValidation = validateNonDiagnosticInvariant(initialState);
  assert(
    initialValidation.valid,
    'Default initial AccessibilityState is 100% compliant with Non-Diagnostic Invariant',
    `Violations: ${initialValidation.violations.length}`
  );

  // Test that clinical/medical diagnostic keywords are strictly rejected
  let blockedCount = 0;
  for (const keyword of FORBIDDEN_CLINICAL_KEYWORDS.slice(0, 10)) {
    const testPayload = { clinicalDiagnosis: `Patient diagnosed with ${keyword}` };
    const result = validateNonDiagnosticInvariant(testPayload);
    if (!result.valid) blockedCount++;
  }
  assert(
    blockedCount === 10,
    'All tested clinical diagnostic keywords strictly blocked by invariant guard',
    `${blockedCount}/10 blocked`
  );

  // Test setManualAccessibilityPreference blocks clinical keywords with an exception
  let exceptionCaught = false;
  try {
    setManualAccessibilityPreference(
      initialState,
      'vision.preferredTextScale',
      'dyslexia friendly font with adhd accommodation'
    );
  } catch (err: any) {
    exceptionCaught = err.message.includes('[Accessibility Invariant Violation]');
  }
  assert(
    exceptionCaught,
    'setManualAccessibilityPreference throws error when clinical diagnosis keywords are injected'
  );

  // Test valid operational capabilities pass cleanly
  const validCapabilities = {
    modality: 'spoken audio cadence',
    visualAnchor: 'high contrast visual border',
    navigation: 'two-switch row column scan',
  };
  const validResult = validateNonDiagnosticInvariant(validCapabilities);
  assert(
    validResult.valid,
    'Operational capability descriptions are accepted without invariant violation'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pillar 2: 100% Student Agency & Manual Lock Protection
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Pillar 2: 100% Student Agency & Manual Lock Protection');
{
  const state = createDefaultAccessibilityState('student_bench_agency');

  // Student manually locks motor.largeTargetMode to false
  const lockedState = setManualAccessibilityPreference(state, 'motor.largeTargetMode', false, true);
  assert(
    lockedState.adaptation.manualLocks['motor.largeTargetMode'] === true,
    'Manual lock registered for motor.largeTargetMode'
  );
  assert(
    lockedState.motor.largeTargetMode === false,
    'Initial motor.largeTargetMode set to false by student'
  );

  // Telemetry indicates high tremors and long dwell times that would normally trigger largeTargetMode
  const strongTremorTelemetry: A11yTelemetryObservation[] = [
    { timestamp: Date.now(), tremorRetriesCount: 4, dwellTimeMs: 4500 },
    { timestamp: Date.now(), tremorRetriesCount: 3, dwellTimeMs: 4000 },
  ];

  const adapted = deriveAdaptiveAccessibilityState(lockedState, strongTremorTelemetry);
  assert(
    adapted.motor.largeTargetMode === false,
    'AI Auto-Adaptation strictly respects manual lock and NEVER alters student-locked preference',
    'motor.largeTargetMode remained false despite heavy tremors'
  );

  // However, unlocked fields like tremorDebounceMs CAN adapt safely
  assert(
    adapted.motor.tremorDebounceMs === 450,
    'Unlocked fields adapt automatically to assist student while preserving locked choices',
    `tremorDebounceMs=${adapted.motor.tremorDebounceMs}ms`
  );

  // When student unlocks the preference, adaptation is restored
  const unlockedState = setManualAccessibilityPreference(adapted, 'motor.largeTargetMode', false, false);
  assert(
    unlockedState.adaptation.manualLocks['motor.largeTargetMode'] === undefined,
    'Manual lock successfully removed upon student request'
  );

  const readapted = deriveAdaptiveAccessibilityState(unlockedState, strongTremorTelemetry);
  assert(
    readapted.motor.largeTargetMode === true,
    'After unlocking, adaptive engine is free to assist with large targets based on telemetry',
    'motor.largeTargetMode adapted to true'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pillar 3: Telemetry-Driven Empirical Modality Adaptation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Pillar 3: Telemetry-Driven Empirical Modality Adaptation');
{
  const state = createDefaultAccessibilityState('student_bench_telemetry');

  // Scenario A: High caption engagement, zero audio listening -> adapts to visual modality
  const visualTelemetry: A11yTelemetryObservation[] = [
    { timestamp: Date.now(), captionUsageSeconds: 25, audioListenedSeconds: 0, dwellTimeMs: 2000 },
    { timestamp: Date.now(), captionUsageSeconds: 15, audioListenedSeconds: 2, dwellTimeMs: 2200 },
  ];
  const visualAdapted = deriveAdaptiveAccessibilityState(state, visualTelemetry);
  assert(
    visualAdapted.hearing.captionsEnabled === true,
    'Captions automatically enabled when empirical usage is high'
  );
  assert(
    visualAdapted.communication.primaryModality === 'visual',
    'Primary modality adapts to visual based on sensory engagement data'
  );

  // Scenario B: High audio listening -> adapts to audio modality & auto-narration
  const audioTelemetry: A11yTelemetryObservation[] = [
    { timestamp: Date.now(), audioListenedSeconds: 30, captionUsageSeconds: 0, dwellTimeMs: 1800 },
  ];
  const audioAdapted = deriveAdaptiveAccessibilityState(state, audioTelemetry);
  assert(
    audioAdapted.vision.ttsAutoNarration === true,
    'TTS Auto-Narration enabled when student consistently relies on spoken audio'
  );
  assert(
    audioAdapted.communication.primaryModality === 'audio',
    'Primary modality adapts to audio when student prefers auditory interaction'
  );

  // Scenario C: Rapid interaction pacing vs deliberate interaction pacing
  const rapidTelemetry: A11yTelemetryObservation[] = [
    { timestamp: Date.now(), dwellTimeMs: 800 },
    { timestamp: Date.now(), dwellTimeMs: 1000 },
  ];
  const rapidAdapted = deriveAdaptiveAccessibilityState(state, rapidTelemetry);
  assert(
    rapidAdapted.communication.pacing === 'rapid',
    'Pacing adapts to rapid when interaction latency is very low'
  );

  const deliberateTelemetry: A11yTelemetryObservation[] = [
    { timestamp: Date.now(), dwellTimeMs: 5000 },
    { timestamp: Date.now(), dwellTimeMs: 4200 },
  ];
  const deliberateAdapted = deriveAdaptiveAccessibilityState(state, deliberateTelemetry);
  assert(
    deliberateAdapted.communication.pacing === 'deliberate',
    'Pacing adapts to deliberate when interaction latency indicates need for unhurried processing'
  );

  // Scenario D: Master switch disabled -> zero changes
  const disabledState = { ...state, adaptation: { ...state.adaptation, autoAdaptationEnabled: false } };
  const untouched = deriveAdaptiveAccessibilityState(disabledState, audioTelemetry);
  assert(
    untouched.vision.ttsAutoNarration === false && untouched.communication.primaryModality === 'text',
    'When autoAdaptationEnabled is false, telemetry produces zero mutations'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pillar 4: Respectful Speech Clarification Generation (Confidence < 0.70)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Pillar 4: Respectful Speech Clarification Generation (Confidence < 0.70)');
{
  // High confidence: passes straight through
  const highConf = generateSpeechClarificationPrompt('What is Big O notation?', 0.92, [], 'en');
  assert(
    !highConf.requiresClarification && highConf.prompt === 'What is Big O notation?',
    'High confidence (> 0.70) speech passes directly without clarification'
  );

  // Low confidence English: never guesses, offers respectful clarification choices
  const lowConfEN = generateSpeechClarificationPrompt('Wht iz bg...', 0.52, ['Explain Big O notation', 'Explain binary search', 'Repeat question'], 'en');
  assert(
    lowConfEN.requiresClarification === true,
    'Low confidence (< 0.70) triggers explicit respectful clarification'
  );
  assert(
    lowConfEN.options.length === 3 && lowConfEN.options[0] === 'Explain Big O notation',
    'Clarification options accurately reflect acoustic alternatives without AI hallucination'
  );

  // Low confidence Arabic: natural friendly Arabic clarification
  const lowConfAR = generateSpeechClarificationPrompt('ما هو...', 0.45, [], 'ar');
  assert(
    lowConfAR.requiresClarification === true,
    'Arabic low confidence triggers Arabic clarification prompt'
  );
  assert(
    lowConfAR.prompt.includes('أود التأكد من أنني سمعتك بدقة'),
    'Arabic clarification uses respectful, reassuring phrasing'
  );

  // Low confidence French: polite French clarification
  const lowConfFR = generateSpeechClarificationPrompt('Quest ce que...', 0.40, [], 'fr');
  assert(
    lowConfFR.requiresClarification === true,
    'French low confidence triggers French clarification prompt'
  );
  assert(
    lowConfFR.prompt.includes('m’assurer de vous avoir bien compris') || lowConfFR.prompt.includes('bien compris'),
    'French clarification uses polite, respectful phrasing'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pillar 5: Measurable Feedback & Completion Gain Efficacy Tracking
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Pillar 5: Measurable Feedback & Completion Gain Efficacy Tracking');
{
  let state = createDefaultAccessibilityState('student_bench_feedback');

  state = recordAccessibilityFeedback(state, 'ttsAutoNarration', true, 0.25);
  assert(
    state.feedback.adaptationsSuggestedCount === 1,
    'adaptationsSuggestedCount incremented to 1'
  );
  assert(
    state.feedback.adaptationsAcceptedCount === 1,
    'adaptationsAcceptedCount incremented to 1'
  );
  assert(
    state.feedback.completionRateDelta > 0,
    'Positive completion rate delta tracked upon accepted adaptation',
    `delta = ${state.feedback.completionRateDelta}`
  );

  // Second adaptation rejected
  state = recordAccessibilityFeedback(state, 'pacing', false, -0.05);
  assert(
    state.feedback.adaptationsSuggestedCount === 2,
    'adaptationsSuggestedCount incremented to 2'
  );
  assert(
    state.feedback.adaptationsAcceptedCount === 1,
    'adaptationsAcceptedCount remains 1 after rejected suggestion'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pillar 6: Multilingual AI Tutor Directives Synthesis & Prompt Integration
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Pillar 6: Multilingual AI Tutor Directives Synthesis & Prompt Integration');
{
  const a11yState = createDefaultAccessibilityState('student_bench_tutor');
  a11yState.communication.primaryModality = 'audio';
  a11yState.vision.ttsAutoNarration = true;
  a11yState.communication.pacing = 'deliberate';

  // Directives synthesis in EN, AR, FR
  const directivesEN = synthesizeAccessibilityDirectives(a11yState, 'en');
  assert(
    typeof directivesEN === 'string' && directivesEN.includes('natural spoken audio narration'),
    'English directives instruct AI tutor on spoken audio cadence'
  );

  const directivesAR = synthesizeAccessibilityDirectives(a11yState, 'ar');
  assert(
    typeof directivesAR === 'string' && (directivesAR.includes('الصوتي') || directivesAR.includes('الصوت')),
    'Arabic directives instruct AI tutor on spoken natural pacing',
    directivesAR
  );

  const directivesFR = synthesizeAccessibilityDirectives(a11yState, 'fr');
  assert(
    typeof directivesFR === 'string' && directivesFR.includes('narration audio fluide'),
    'French directives instruct AI tutor in idiomatic French'
  );

  // AI Prompt Integration in api/_lib/ai.ts
  const block = formatAccessibilityStateBlock(a11yState);
  assert(
    block.includes('OPERATIONAL ACCESSIBILITY CAPABILITIES'),
    'formatAccessibilityStateBlock renders operational capabilities section header'
  );
  assert(
    !FORBIDDEN_CLINICAL_KEYWORDS.some(k => block.toLowerCase().includes(k)),
    'AI prompt block is 100% free of clinical diagnostic terms'
  );

  // Verify buildPersona includes the block
  const testProfile: Profile = {
    id: 'student_test',
    email: 'student@example.edu',
    name: 'Sarah Connor',
    role: 'Student',
    level: 'Intermediate',
    field: 'Computer Science',
    language: 'English',
    studentState: {
      userId: 'student_test',
      accessibilityState: a11yState,
    } as any,
  };

  const personaPrompt = buildPersona(testProfile);
  assert(
    personaPrompt.includes('OPERATIONAL ACCESSIBILITY CAPABILITIES'),
    'buildPersona includes the operational accessibility capabilities block in final system prompt'
  );
  assert(
    personaPrompt.includes('Spoken Audio Cadence'),
    'buildPersona injects specific student accessibility directives into AI Tutor persona'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Report
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(`  ACCESSIBILITY 2.0 BENCHMARK COMPLETE: ${passedTests}/${totalTests} PASSED`);
if (failedTests > 0) {
  console.log(`  🚨 FAILURES DETECTED: ${failedTests}`);
  process.exit(1);
} else {
  console.log('  🎯 STATUS: ALL INVARIANTS & BENCHMARKS 100% VERIFIED');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  process.exit(0);
}
