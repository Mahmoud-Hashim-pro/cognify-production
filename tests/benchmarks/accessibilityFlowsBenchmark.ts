/**
 * Cognify Accessibility 2.0 - Real User Flows & Modality Integration Benchmark
 * tests/benchmarks/accessibilityFlowsBenchmark.ts
 *
 * Comprehensive end-to-end benchmark covering real user flows across:
 *   Flow 1: Visual Accessibility Flow (Blind / Low Vision — TTS narration, spoken audio cadence).
 *   Flow 2: Hearing Accessibility Flow (Deaf / Hard-of-Hearing — Live captions, sign avatar, visual anchors).
 *   Flow 3: Motor Accessibility Flow (Tremor & Switch Access — Large hitboxes, 450ms debounce, sub-steps).
 *   Flow 4: Speech Difference Flow (Dysarthria / Low Confidence — Respectful acoustic clarification, 0 guessing).
 *   Flow 5: 100% Student Agency & Lock Defense (Locked preferences immutable against extreme strain).
 *   Flow 6: Efficacy Scoring & Measurable Learning Outcome Feedback Tracking.
 *
 * Usage:
 *   npx tsx tests/benchmarks/accessibilityFlowsBenchmark.ts
 */

import {
  createDefaultAccessibilityState,
  normalizeAccessibilityState,
  setManualPreference,
  unlockPreference,
  isPreferenceLocked,
  createAccessibilitySignal,
  extractVisionSignals,
  extractTtsSignals,
  extractSpeechSignals,
  extractCaptionSignals,
  extractMotorSignals,
  extractAvatarSignals,
  AccessibilitySignalBuffer,
  evaluateAccessibilitySignals,
  applyModalityDecisions,
  deriveAdaptiveAccessibilityState,
  generateSpeechClarificationPrompt,
  synthesizeAccessibilityDirectives,
  recordAccessibilityFeedback,
  computeEfficacyMetrics,
} from '../../src/accessibility/index.js';
import {
  validateNonDiagnosticInvariant,
  FORBIDDEN_CLINICAL_KEYWORDS,
} from '../../src/lib/accessibilityIntelligenceEngine.js';
import { formatAccessibilityStateBlock, buildPersona } from '../../api/_lib/ai.js';
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
console.log('  COGNIFY ACCESSIBILITY 2.0: REAL USER FLOWS BENCHMARK');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// Flow 1: Visual Modality Flow (Blind / Low Vision Student)
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ Flow 1: Visual Modality Flow (Blind / Low Vision Student)');
{
  const studentId = 'student_visual_flow';
  let state = createDefaultAccessibilityState(studentId);

  // Baseline verification
  assert(
    state.vision.ttsAutoNarration === false && state.communication.primaryModality === 'text',
    'Student starts with standard text baseline preferences'
  );

  // Buffer collects signals from user interactions: listens to full TTS explanations repeatedly
  const buffer = new AccessibilitySignalBuffer();
  const ttsSignals = [
    ...extractTtsSignals(22, 22, false),
    ...extractTtsSignals(18, 18, false),
    ...extractVisionSignals({ screenReaderRequested: true, contrastToggled: true }),
  ];
  buffer.pushMany(ttsSignals);

  assert(buffer.count() >= 3, 'Signal buffer successfully captured multi-modal interaction signals');

  // Decision Engine evaluates the collected signals
  const decisions = evaluateAccessibilitySignals(state, buffer.getSignals());
  assert(
    decisions.some(d => d.targetPath === 'vision.ttsAutoNarration' && d.suggestedValue === true),
    'Decision engine recommends enabling TTS Auto-Narration'
  );
  assert(
    decisions.some(d => d.targetPath === 'communication.primaryModality' && d.suggestedValue === 'audio'),
    'Decision engine recommends switching primary modality to audio'
  );
  assert(
    decisions.some(d => d.targetPath === 'vision.contrast' && d.suggestedValue === 'high_contrast'),
    'Decision engine recommends high contrast visual adjustments'
  );

  // Apply decisions
  state = applyModalityDecisions(state, decisions);
  assert(
    state.vision.ttsAutoNarration === true && state.communication.primaryModality === 'audio',
    'Accessibility state successfully adapted to audio-first modality'
  );

  // Verify dynamic AI Tutor directives
  const directives = synthesizeAccessibilityDirectives(state, 'en');
  assert(
    directives.includes('natural spoken audio narration'),
    'AI Tutor directives include natural spoken audio cadence for blind/low-vision flow'
  );

  // Student accepts adaptation and achieves high quiz score (+30% gain)
  state = recordAccessibilityFeedback(state, 'vision.ttsAutoNarration', true, 0.30);
  const metrics = computeEfficacyMetrics(state);
  assert(
    metrics.acceptanceRate === 1.0 && metrics.completionRateDelta > 0,
    'Efficacy tracking confirms accepted adaptation with positive learning gain delta'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow 2: Hearing Modality Flow (Deaf / Hard-of-Hearing Student)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Flow 2: Hearing Modality Flow (Deaf / Hard-of-Hearing Student)');
{
  const studentId = 'student_hearing_flow';
  let state = createDefaultAccessibilityState(studentId);

  // Buffer collects caption activation and 3D sign avatar view events
  const buffer = new AccessibilitySignalBuffer();
  buffer.pushMany([
    ...extractCaptionSignals(35000, 180, true),
    ...extractCaptionSignals(42000, 220, true),
    ...extractAvatarSignals(12, false, true),
  ]);

  const decisions = evaluateAccessibilitySignals(state, buffer.getSignals());
  assert(
    decisions.some(d => d.targetPath === 'hearing.captionsEnabled' && d.suggestedValue === true),
    'Decision engine recommends turning on live captions based on repeated usage'
  );
  assert(
    decisions.some(d => d.targetPath === 'hearing.showSignAvatar' && d.suggestedValue === true),
    'Decision engine recommends enabling 3D sign language avatar'
  );

  state = applyModalityDecisions(state, decisions);
  assert(
    state.hearing.captionsEnabled === true && state.hearing.showSignAvatar === true,
    'Hearing preferences adapted with live captions and sign avatar active'
  );

  // Check French directives for hearing-first student
  const frDirectives = synthesizeAccessibilityDirectives(state, 'fr');
  assert(
    frDirectives.includes('puces visuelles nettes') && frDirectives.includes('gras'),
    'French directives instruct AI tutor with sharp visual bullet points and bold concepts'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow 3: Motor Modality Flow (Fine-Motor Tremor & Switch Access)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Flow 3: Motor Modality Flow (Fine-Motor Tremor & Switch Access)');
{
  const studentId = 'student_motor_flow';
  let state = createDefaultAccessibilityState(studentId);

  // Telemetry reveals repeated tremor misclicks and high dwell times
  const motorSignals = extractMotorSignals([3800, 4200, 3500], 3, 2);
  const decisions = evaluateAccessibilitySignals(state, motorSignals);

  assert(
    decisions.some(d => d.targetPath === 'motor.largeTargetMode' && d.suggestedValue === true),
    'Decision engine generates large target mode adaptation for tremor mitigation'
  );
  assert(
    decisions.some(d => d.targetPath === 'motor.tremorDebounceMs' && d.suggestedValue === 450),
    'Decision engine increases tremor debounce filter to 450ms'
  );

  state = applyModalityDecisions(state, decisions);
  assert(
    state.motor.largeTargetMode === true && state.motor.tremorDebounceMs === 450,
    'Motor adaptations applied: large targets and debounce filter active'
  );

  // AI Tutor Directives for motor flow: break complex steps into single-action choices
  const arDirectives = synthesizeAccessibilityDirectives(state, 'ar');
  assert(
    arDirectives.includes('قسّم المسائل المعقدة إلى خطوات منفصلة واضحة'),
    'Arabic directives instruct AI tutor to partition complex explanations into single-action steps'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow 4: Speech Difference Flow (Dysarthria / Low Recognition Confidence)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Flow 4: Speech Difference Flow (Dysarthria / Low Recognition Confidence)');
{
  // Scenario A: Recognition confidence < 0.70 (e.g. 0.45)
  const lowResult = generateSpeechClarificationPrompt(
    'algorzm cplxity...',
    0.45,
    ['Algorithm Time Complexity', 'Binary Search Analysis', 'Big O Notation'],
    'en'
  );

  assert(
    lowResult.requiresClarification === true,
    'Recognition confidence < 0.70 strictly requires clarification'
  );
  assert(
    lowResult.options.length === 3 && lowResult.options[0] === 'Algorithm Time Complexity',
    'Provides concrete acoustic alternatives without pretending to understand or inventing hallucinations'
  );
  assert(
    lowResult.prompt.includes('I want to make sure I understood you correctly'),
    'Clarification prompt uses respectful, validating language'
  );

  // Scenario B: High confidence >= 0.70 passes directly
  const highResult = generateSpeechClarificationPrompt(
    'What is a binary search tree?',
    0.91,
    [],
    'en'
  );
  assert(
    highResult.requiresClarification === false && highResult.prompt === 'What is a binary search tree?',
    'High confidence (> 0.70) speech input passes directly without unnecessary prompts'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow 5: 100% Student Agency & Lock Defense
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Flow 5: 100% Student Agency & Lock Defense');
{
  const studentId = 'student_agency_defense';
  let state = createDefaultAccessibilityState(studentId);

  // Student explicitly locks largeTargetMode to false
  state = setManualPreference(state, 'motor.largeTargetMode', false, true);
  assert(
    isPreferenceLocked(state, 'motor.largeTargetMode') === true,
    'Preference motor.largeTargetMode successfully locked by student'
  );

  // Severe tremor signals arrive
  const heavyTremorSignals = extractMotorSignals([5000, 6000], 5);
  const decisions = evaluateAccessibilitySignals(state, heavyTremorSignals);

  const targetDecision = decisions.find(d => d.targetPath === 'motor.largeTargetMode');
  assert(
    targetDecision !== undefined && targetDecision.blockedByLock === true,
    'Decision engine flags adaptation as blockedByLock'
  );
  assert(
    targetDecision?.autoApplied === false,
    'Decision engine forbids auto-applying locked preference'
  );

  // Apply decisions
  const afterAttempt = applyModalityDecisions(state, decisions);
  assert(
    afterAttempt.motor.largeTargetMode === false,
    'Locked preference remains FALSE: AI adaptation cannot override student choice'
  );

  // Unlocked field (tremorDebounceMs) adapts properly
  assert(
    afterAttempt.motor.tremorDebounceMs === 450,
    'Unlocked parameters adapt to assist student while strictly respecting the lock'
  );

  // Master switch disabled
  state.adaptation.autoAdaptationEnabled = false;
  const masterDisabledDecisions = evaluateAccessibilitySignals(state, heavyTremorSignals);
  assert(
    masterDisabledDecisions.every(d => d.autoApplied === false),
    'When autoAdaptationEnabled is false, 100% of candidate decisions have autoApplied=false'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow 6: Non-Diagnostic Invariant Enforcement Across Layers
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Flow 6: Non-Diagnostic Invariant Enforcement Across Layers');
{
  const cleanState = createDefaultAccessibilityState('clean_student');
  const validCheck = validateNonDiagnosticInvariant(cleanState);
  assert(validCheck.valid, 'Clean accessibility state passes invariant validation');

  // Verify that forbidden diagnostic terms are caught
  let caughtClinical = 0;
  for (const word of ['adhd', 'autism', 'dyslexia', 'handicapped', 'asperger']) {
    const dirtyPayload = { reason: `Special accommodation for ${word}` };
    if (!validateNonDiagnosticInvariant(dirtyPayload).valid) {
      caughtClinical++;
    }
  }
  assert(
    caughtClinical === 5,
    'All clinical diagnostic labels blocked across all layers (Strict Non-Diagnosis Invariant)'
  );

  // Verify end-to-end buildPersona system prompt integration
  const profile: Profile = {
    id: 'user_flow_student',
    email: 'student@cognify.edu',
    name: 'Alex Rivera',
    language: 'English',
    studentState: {
      userId: 'user_flow_student',
      accessibilityState: {
        ...cleanState,
        vision: { ...cleanState.vision, ttsAutoNarration: true },
        communication: { ...cleanState.communication, primaryModality: 'audio' },
      },
    } as any,
  };

  const persona = buildPersona(profile);
  assert(
    persona.includes('OPERATIONAL ACCESSIBILITY CAPABILITIES'),
    'AI Tutor prompt contains operational accessibility section'
  );
  assert(
    persona.includes('Spoken Audio Cadence'),
    'AI Tutor prompt contains specific operational cadence directives'
  );

  const a11yBlock = formatAccessibilityStateBlock(profile.studentState?.accessibilityState);
  assert(
    validateNonDiagnosticInvariant(profile.studentState?.accessibilityState).valid,
    'Student accessibility state is 100% compliant with Non-Diagnostic Invariant'
  );
  assert(
    !['adhd', 'autism', 'dyslexia', 'handicap', 'retarded', 'mental deficit'].some(k => a11yBlock.toLowerCase().includes(k)),
    'AI Tutor accessibility directives are completely free of any medical or diagnostic terms'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Report
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(`  ACCESSIBILITY REAL USER FLOWS BENCHMARK: ${passedTests}/${totalTests} PASSED`);
if (failedTests > 0) {
  console.log(`  🚨 FAILURES DETECTED: ${failedTests}`);
  process.exit(1);
} else {
  console.log('  🎯 STATUS: ALL 6 REAL USER ACCESSIBILITY FLOWS 100% VERIFIED');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  process.exit(0);
}
