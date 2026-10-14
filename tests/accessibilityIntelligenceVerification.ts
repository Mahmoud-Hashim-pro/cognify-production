/**
 * Milestone 12: Accessibility Intelligence Automated Verification Suite
 *
 * Verifies:
 * 1. Observation aggregation across user interactions
 * 2. Autonomous adaptation of communication modality and response length
 * 3. 100% Student agency manual lock protection (locked preferences are NEVER auto-overridden)
 * 4. Strict Ethical Non-Diagnosis Invariant (catches and rejects forbidden clinical / deficit keywords)
 * 5. Dynamic AI system prompt directive synthesis across EN, AR, and FR
 */

import {
  createInitialA11yProfile,
  recordA11yObservation,
  deriveAdaptiveCommunicationPreferences,
  setUserManualPreference,
  validateNonDiagnosticInvariant,
  buildA11ySystemDirectives,
  FORBIDDEN_CLINICAL_KEYWORDS,
} from '../src/lib/accessibilityIntelligenceEngine.js';

import type {
  A11yCommunicationProfile,
  A11yInteractionObservation,
} from '../src/types/accessibilityIntelligence.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runSuite() {
  console.log('\n============================================================');
  console.log('♿ RUNNING ACCESSIBILITY INTELLIGENCE VERIFICATION (M12)');
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // 1. Initial Profile Creation & Defaults
  // -------------------------------------------------------------------------
  console.log('--- 1. Initial Profile Creation & Defaults ---');

  const profile = createInitialA11yProfile('student_accessibility_101');
  assert(profile.userId === 'student_accessibility_101', 'User ID set correctly');
  assert(profile.preferences.preferredResponseLength === 'balanced', 'Default response length is balanced');
  assert(profile.preferences.preferredModality === 'text', 'Default preferred modality is text');
  assert(profile.preferences.visualDensity === 'standard', 'Default visual density is standard');
  assert(profile.autoAdaptationEnabled === true, 'Auto-adaptation enabled by default');
  assert(profile.totalObservations === 0, 'Initial observation count is 0');

  // -------------------------------------------------------------------------
  // 2. Strict Ethical Non-Diagnosis Invariant Guard
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Strict Ethical Non-Diagnosis Invariant Guard ---');

  // Valid profile passes
  const validCheck = validateNonDiagnosticInvariant(profile);
  assert(validCheck.valid === true, 'Standard functional profile passes non-diagnosis invariant');
  assert(validCheck.violations.length === 0, 'Zero violations for clean functional profile');

  // Malicious / leaked clinical diagnoses are detected and rejected
  const maliciousObject = {
    userId: 'student_probe',
    diagnosedCondition: 'adhd_inattentive',
    psychiatric_label: 'bipolar',
    preferences: {
      preferredResponseLength: 'concise',
    },
  };

  const invalidCheck = validateNonDiagnosticInvariant(maliciousObject);
  assert(invalidCheck.valid === false, 'Detects and flags forbidden clinical diagnosis terms');
  assert(invalidCheck.violations.length >= 2, `Identifies all forbidden terms: count=${invalidCheck.violations.length}`);

  // Test keyword coverage
  assert(FORBIDDEN_CLINICAL_KEYWORDS.includes('adhd'), 'Contains adhd in forbidden keywords');
  assert(FORBIDDEN_CLINICAL_KEYWORDS.includes('autism'), 'Contains autism in forbidden keywords');
  assert(FORBIDDEN_CLINICAL_KEYWORDS.includes('dyslexia'), 'Contains dyslexia in forbidden keywords');

  // -------------------------------------------------------------------------
  // 3. Autonomous Functional Adaptation (Length & Modality)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Autonomous Functional Adaptation ---');

  let currentProfile = profile;

  // Simulate user making 5 brief requests (< 5 words) with fast interaction
  for (let i = 0; i < 5; i++) {
    const obs: A11yInteractionObservation = {
      timestamp: Date.now() + i * 1000,
      promptLength: 3, // very short prompt
      usedVoiceInput: false,
      listenedToAudio: false,
      dwellTimeMs: 2000, // fast pace
    };
    currentProfile = recordA11yObservation(currentProfile, obs);
  }

  assert(currentProfile.totalObservations === 5, `Recorded 5 observations: ${currentProfile.totalObservations}`);

  const adaptedPrefs1 = deriveAdaptiveCommunicationPreferences(currentProfile);
  assert(
    adaptedPrefs1.preferredResponseLength === 'concise',
    `Response length auto-adapted to "concise" based on brief prompts: "${adaptedPrefs1.preferredResponseLength}"`
  );

  // Simulate user listening to audio TTS across next 10 turns (total 10 audio out of 15 turns = 66.7% > 60%)
  for (let i = 0; i < 10; i++) {
    const obsAudio: A11yInteractionObservation = {
      timestamp: Date.now() + (5 + i) * 1000,
      promptLength: 10,
      usedVoiceInput: false,
      listenedToAudio: true,
      dwellTimeMs: 8000,
    };
    currentProfile = recordA11yObservation(currentProfile, obsAudio);
  }

  const adaptedPrefs2 = deriveAdaptiveCommunicationPreferences(currentProfile);
  assert(
    adaptedPrefs2.preferredModality === 'audio',
    `Modality auto-adapted to "audio" based on TTS listening rate: "${adaptedPrefs2.preferredModality}"`
  );

  // -------------------------------------------------------------------------
  // 4. 100% Student Agency Manual Lock Protection
  // -------------------------------------------------------------------------
  console.log('\n--- 4. 100% Student Agency & Manual Lock Protection ---');

  // User explicitly locks preferredResponseLength to "detailed"
  currentProfile = setUserManualPreference(currentProfile, 'preferredResponseLength', 'detailed', true);
  assert(currentProfile.preferences.preferredResponseLength === 'detailed', 'User manually set response length to detailed');
  assert(currentProfile.preferences.manualLocks['preferredResponseLength'] === true, 'Manual lock flag is active');

  // Add more short prompt observations that would otherwise trigger "concise"
  for (let i = 0; i < 5; i++) {
    const obsBrief: A11yInteractionObservation = {
      timestamp: Date.now() + (15 + i) * 1000,
      promptLength: 2,
      usedVoiceInput: false,
      listenedToAudio: false,
      dwellTimeMs: 1500,
    };
    currentProfile = recordA11yObservation(currentProfile, obsBrief);
  }

  // Derive preferences again
  const lockedPrefs = deriveAdaptiveCommunicationPreferences(currentProfile);
  assert(
    lockedPrefs.preferredResponseLength === 'detailed',
    'Locked preference "detailed" is STRICTLY preserved and NOT overridden by auto-adaptation'
  );

  // -------------------------------------------------------------------------
  // 5. Dynamic AI System Prompt Directives (EN, AR, FR)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Dynamic AI Persona Directives ---');

  const conciseAudioPrefs = {
    ...profile.preferences,
    preferredResponseLength: 'concise' as const,
    preferredModality: 'audio' as const,
  };

  const directiveEn = buildA11ySystemDirectives(conciseAudioPrefs, 'en');
  assert(directiveEn.toLowerCase().includes('concise'), 'English directive includes concise instruction');
  assert(directiveEn.toLowerCase().includes('speech') || directiveEn.toLowerCase().includes('audio'), 'English directive includes speech/audio instruction');

  const directiveAr = buildA11ySystemDirectives(conciseAudioPrefs, 'ar');
  assert(directiveAr.includes('موجزة') || directiveAr.includes('موجز'), 'Arabic directive includes concise instruction');
  assert(directiveAr.includes('صوت') || directiveAr.includes('القراءة الصوتية'), 'Arabic directive includes audio instruction');

  const directiveFr = buildA11ySystemDirectives(conciseAudioPrefs, 'fr');
  assert(directiveFr.toLowerCase().includes('concise') || directiveFr.toLowerCase().includes('audio'), 'French directive includes accessibility instructions');

  // Summary
  console.log('\n============================================================');
  console.log(`📊 RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error(`❌ Suite failed with ${failedTests} failures.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passedTests} ACCESSIBILITY INTELLIGENCE TESTS PASSED (100%)!\n`);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
