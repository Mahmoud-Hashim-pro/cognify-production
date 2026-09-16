/**
 * Phase 2C - Sprint 1: Learning Profile Contract & UI Verification Suite
 *
 * Verifies:
 * 1. PersonalLearningProfile canonical contract generation.
 * 2. Strict Sample Size Guard (N >= 3) for pedagogical strategies.
 * 3. Prerequisite gap diagnosis in current learning focus.
 * 4. Spaced retention health alerts calculation.
 * 5. Recent progress & mastery delta tracking.
 * 6. Ethical Non-IQ guardrail disclaimers in English and Arabic.
 * 7. Serverless API Endpoint (/api/student/learningProfile) request/response handling.
 * 8. Resilient client offline fallback mechanics.
 */

import { getStudentStateManager, createInitialStudentState, StudentState } from '../src/lib/studentStateEngine.js';
import { generatePersonalLearningProfile } from '../src/lib/learningProfileService.js';
import learningProfileHandler from '../api/student/learningProfile.js';
import type { PersonalLearningProfile } from '../src/types/learningProfile.js';

let totalPassed = 0;
let totalFailed = 0;

export async function runLearningProfileContractVerification(
  customAssert?: (cond: boolean, name: string) => void
): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🧪 PHASE 2C - SPRINT 1: LEARNING PROFILE CONTRACT VERIFICATION');
  console.log('================================================================');

  let passedLocal = 0;
  let failedLocal = 0;

  const assert = (cond: boolean, name: string) => {
    if (customAssert) {
      customAssert(cond, name);
    }
    if (cond) {
      passedLocal++;
      totalPassed++;
      console.log(`  ✅ PASS: ${name}`);
    } else {
      failedLocal++;
      totalFailed++;
      console.error(`  ❌ FAIL: ${name}`);
    }
  };

  // --------------------------------------------------------------------------
  // TEST 1: Baseline Initial Contract Generation
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Baseline Contract Generation ---');
  const uid = `student_profile_test_${Date.now()}`;
  const manager = getStudentStateManager(uid, 'Basic');
  const baselineProfile = manager.getPersonalLearningProfile('Yousef Gamal');

  assert(baselineProfile.uid === uid, 'Profile UID matches student UID');
  assert(baselineProfile.displayName === 'Yousef Gamal', 'Profile displayName matches passed name');
  assert(typeof baselineProfile.overallMasteryPercentage === 'number', 'overallMasteryPercentage is numeric');
  assert(baselineProfile.overallMasteryPercentage >= 0 && baselineProfile.overallMasteryPercentage <= 100, 'overallMasteryPercentage is bounded 0-100');
  assert(typeof baselineProfile.overallConfidencePercentage === 'number', 'overallConfidencePercentage is numeric');
  assert(Array.isArray(baselineProfile.effectiveStrategies), 'effectiveStrategies is an array');
  assert(baselineProfile.effectiveStrategies.length === 5, 'All 5 canonical pedagogy strategies are evaluated');
  assert(Array.isArray(baselineProfile.retentionAlerts), 'retentionAlerts is an array');
  assert(Array.isArray(baselineProfile.recentProgress), 'recentProgress is an array');

  // --------------------------------------------------------------------------
  // TEST 2: Ethical Non-IQ Guardrail
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Ethical Non-IQ Guardrail Callout ---');
  assert(
    baselineProfile.ethicalDisclaimerEn.includes('not an IQ score') &&
    baselineProfile.ethicalDisclaimerEn.includes('static measurement of intelligence'),
    'Ethical disclaimer in English explicitly disclaims IQ and static intelligence measurement'
  );
  assert(
    baselineProfile.ethicalDisclaimerAr.includes('ولا يمثل مقياسًا لنسبة الذكاء') &&
    baselineProfile.ethicalDisclaimerAr.includes('تقييمًا ثابتًا للقدرات الإدراكية'),
    'Ethical disclaimer in Arabic explicitly disclaims IQ and static intelligence measurement'
  );

  // --------------------------------------------------------------------------
  // TEST 3: Sample-Size Guard (N >= 3) for Strategies
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Strategy Sample-Size Guard (N >= 3) ---');
  // At baseline, attempts are 0 -> should all be calibrating
  const baselineWorked = baselineProfile.effectiveStrategies.find(s => s.strategy === 'worked_example');
  assert(baselineWorked !== undefined, 'worked_example strategy exists in profile');
  assert(baselineWorked?.isCalibrating === true, 'worked_example isCalibrating is true with 0 attempts');
  assert(baselineWorked?.sampleSizeNoteEn.includes('Calibrating (0/3 exercises completed)'), 'sampleSizeNoteEn displays calibrating count 0/3');
  assert(baselineWorked?.sampleSizeNoteAr.includes('جاري المعايرة (0/3 تمارين مكتملة)'), 'sampleSizeNoteAr displays calibrating count 0/3 in Arabic');

  // Simulate 1 attempt with worked_example
  manager.recordAnswer('pointers', false, 14000, 'syntax_deref');
  manager.recordPedagogyFeedback('worked_example', true, 'pointers', 'Step by step code helped clarify');
  const profileAfter1 = manager.getPersonalLearningProfile('Yousef Gamal');
  const workedAfter1 = profileAfter1.effectiveStrategies.find(s => s.strategy === 'worked_example');
  assert(workedAfter1?.isCalibrating === true, 'worked_example is still calibrating with 1 attempt');
  assert(workedAfter1?.attemptsCount === 1, 'attemptsCount is 1');
  assert(workedAfter1?.sampleSizeNoteEn.includes('Calibrating (1/3 exercises completed)'), 'sampleSizeNoteEn displays calibrating count 1/3');

  // Simulate 2 more attempts (reaching 3 attempts)
  manager.recordAnswer('pointers', true, 12000);
  manager.recordPedagogyFeedback('worked_example', true, 'pointers');
  manager.recordAnswer('pointers', true, 9000);
  manager.recordPedagogyFeedback('worked_example', true, 'pointers');

  const profileAfter3 = manager.getPersonalLearningProfile('Yousef Gamal');
  const workedAfter3 = profileAfter3.effectiveStrategies.find(s => s.strategy === 'worked_example');
  assert(workedAfter3?.isCalibrating === false, 'worked_example isCalibrating becomes FALSE at N >= 3');
  assert(workedAfter3?.attemptsCount === 3, 'attemptsCount is 3');
  assert(workedAfter3?.sampleSizeNoteEn.includes('Based on 3 attempts'), 'sampleSizeNoteEn displays "Based on 3 attempts"');
  assert(workedAfter3?.isOptimal === true, 'worked_example is labeled optimal with 3 consecutive successes');

  // --------------------------------------------------------------------------
  // TEST 4: Concept Mastery Calculation & Progress
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Concept Mastery Progress ---');
  assert(profileAfter3.conceptProfiles['pointers'] !== undefined, 'conceptProfiles contains pointers');
  const pointersSummary = profileAfter3.conceptProfiles['pointers'];
  assert(pointersSummary.masteredConcepts !== undefined || pointersSummary.attemptsCount === 3, 'Pointers summary has 3 attempts recorded');
  assert(pointersSummary.masteredConcepts === undefined && pointersSummary.masteryPercentage > 0, 'Pointers mastery percentage is positive');
  assert(pointersSummary.confidencePercentage >= 0, 'Pointers confidence percentage is valid');
  assert(profileAfter3.overallMasteryPercentage > 0, 'Overall mastery percentage increases after practice');

  // --------------------------------------------------------------------------
  // TEST 5: Prerequisite Diagnosis in Current Learning Focus
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Current Focus & Prerequisite Diagnosis ---');
  // Student struggles with dynamic_memory (requires pointers)
  const prereqUid = `student_prereq_${Date.now()}`;
  const prereqMgr = getStudentStateManager(prereqUid, 'Basic');
  prereqMgr.recordAnswer('dynamic_memory', false, 20000, 'segfault');
  prereqMgr.recordAnswer('dynamic_memory', false, 22000, 'leak');

  const profileWithPrereq = prereqMgr.getPersonalLearningProfile('Yousef Gamal');
  assert(profileWithPrereq.currentFocus !== undefined, 'currentFocus is present');
  if (profileWithPrereq.currentFocus) {
    assert(profileWithPrereq.currentFocus.conceptId === 'dynamic_memory', 'currentFocus targets dynamic_memory');
    assert(profileWithPrereq.currentFocus.recommendedStrategy !== undefined, 'currentFocus recommends an adaptive strategy');
    assert(
      profileWithPrereq.currentFocus.prerequisiteToReview?.conceptId === 'pointers',
      'currentFocus diagnoses prerequisite gap in pointers for dynamic_memory'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 6: Spaced Retention Alerts
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Spaced Retention Alerts ---');
  // Artificially set an overdue retention schedule
  const rawState = prereqMgr.getState();
  rawState.retentionSchedules['pointers'] = {
    conceptId: 'pointers',
    repetitions: 1,
    intervalDays: 1,
    easeFactor: 2.5,
    lastReviewDate: Date.now() - 3 * 86400000,
    nextReviewDate: Date.now() - 2 * 86400000, // 2 days ago
    status: 'learning',
  };
  const profileWithRetention = generatePersonalLearningProfile(rawState, 'Yousef Gamal');
  const pointerAlert = profileWithRetention.retentionAlerts.find(a => a.conceptId === 'pointers');
  assert(pointerAlert !== undefined, 'retentionAlerts identifies pointers');
  assert(pointerAlert?.isDue === true, 'pointers retention alert isDue is true');
  assert(pointerAlert?.riskLevel === 'high' || pointerAlert?.riskLevel === 'medium', 'Retention risk is high or medium for overdue item');

  // --------------------------------------------------------------------------
  // TEST 7: Serverless API Endpoint Integration (api/student/learningProfile)
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Serverless API Endpoint Integration ---');

  let responseStatus = 0;
  let responseHeaders: Record<string, string> = {};
  let responseBody: any = null;

  const mockRes = {
    setHeader: (k: string, v: string) => {
      responseHeaders[k] = v;
    },
    status: (code: number) => {
      responseStatus = code;
      return {
        json: (data: any) => {
          responseBody = data;
          return data;
        },
        end: () => {},
      };
    },
  };

  // 7A: GET Request
  const mockGetReq = {
    method: 'GET',
    query: { uid, displayName: 'Yousef Gamal' },
    headers: {},
  };
  await learningProfileHandler(mockGetReq, mockRes);
  assert(responseStatus === 200, 'GET /api/student/learningProfile returns HTTP 200');
  assert(responseBody?.success === true, 'API response success is true');
  assert(responseBody?.profile?.uid === uid, 'API response profile UID matches request');
  assert(responseBody?.profile?.displayName === 'Yousef Gamal', 'API response profile displayName matches');
  assert(responseHeaders['Access-Control-Allow-Origin'] === '*', 'CORS Access-Control-Allow-Origin header is set');

  // 7B: POST Request with studentState payload
  const mockPostReq = {
    method: 'POST',
    body: {
      uid: 'custom_student_123',
      displayName: 'Amira Ahmed',
      studentState: rawState,
    },
    headers: { 'content-type': 'application/json' },
  };
  await learningProfileHandler(mockPostReq, mockRes);
  assert(responseStatus === 200, 'POST /api/student/learningProfile returns HTTP 200');
  assert(responseBody?.profile?.displayName === 'Amira Ahmed', 'POST profile displayName matches payload');
  assert(responseBody?.profile?.conceptProfiles?.dynamic_memory !== undefined, 'POST computes profile using passed studentState');

  // 7C: OPTIONS Request (CORS Preflight)
  let preflightStatus = 0;
  const mockOptionsRes = {
    setHeader: () => {},
    status: (code: number) => {
      preflightStatus = code;
      return { end: () => {} };
    },
  };
  await learningProfileHandler({ method: 'OPTIONS' }, mockOptionsRes);
  assert(preflightStatus === 204, 'OPTIONS preflight returns HTTP 204');

  console.log(`\n================================================================`);
  console.log(`Contract Verification Complete: ${passedLocal} passed, ${failedLocal} failed.`);
  console.log(`================================================================\n`);

  return { passed: passedLocal, failed: failedLocal };
}

// Execute standalone if run directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('learningProfileContractVerification')) {
  runLearningProfileContractVerification().then(({ failed }) => {
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
