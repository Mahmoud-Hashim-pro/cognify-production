/**
 * Milestone 9: Retention & Spaced Learning Product Engine Automated Verification Suite
 *
 * Verifies:
 * 1. Ebbinghaus exponential decay risk calculation (fresh, decayed, overdue)
 * 2. Strict 4-category disjoint partitioning (Due Today, At Risk, Mastered, Upcoming)
 * 3. Multilingual high-yield conceptual Micro-Review question generator (EN, AR, FR)
 * 4. Latency-aware SM-2 submission evaluation and quality score mapping (0 to 5)
 * 5. Schedule interval progression on mastery (1d -> 3d -> 7d) and regression on failure
 */

import {
  computeRetentionDecayRisk,
  categorizeRetentionState,
  generateMicroReview,
  evaluateMicroReviewSubmission,
  resolveConceptTitle,
  ONE_DAY_MS,
} from '../src/lib/retentionProductEngine.js';

import type { RetentionSchedule } from '../src/lib/spacedRetention.js';
import type { MicroReviewSubmission } from '../src/types/retention.js';

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
  console.log('🔄 RUNNING RETENTION & SPACED LEARNING VERIFICATION (M9)');
  console.log('============================================================\n');

  const now = Date.now();

  // -------------------------------------------------------------------------
  // 1. Ebbinghaus Decay Risk Calculation
  // -------------------------------------------------------------------------
  console.log('--- 1. Ebbinghaus Exponential Decay Risk ---');

  const freshSchedule: RetentionSchedule = {
    conceptId: 'pointers',
    repetitions: 1,
    intervalDays: 3,
    easeFactor: 2.5,
    lastReviewDate: now,
    nextReviewDate: now + 3 * ONE_DAY_MS,
    status: 'learning',
  };

  const freshRisk = computeRetentionDecayRisk(freshSchedule, now);
  assert(freshRisk < 0.1, `Freshly reviewed concept has low decay risk (<0.1): ${freshRisk}`);

  const halfDecayedSchedule: RetentionSchedule = {
    ...freshSchedule,
    lastReviewDate: now - 3.75 * ONE_DAY_MS, // half stability (interval 3 * ease 2.5 = 7.5)
  };
  const halfRisk = computeRetentionDecayRisk(halfDecayedSchedule, now);
  assert(halfRisk >= 0.35 && halfRisk <= 0.45, `Half-decayed concept shows expected risk ~0.39: ${halfRisk}`);

  const criticallyDecayedSchedule: RetentionSchedule = {
    ...freshSchedule,
    lastReviewDate: now - 20 * ONE_DAY_MS, // severely overdue
  };
  const criticalRisk = computeRetentionDecayRisk(criticallyDecayedSchedule, now);
  assert(criticalRisk >= 0.85, `Critically overdue concept shows extreme decay risk (>=0.85): ${criticalRisk}`);

  // -------------------------------------------------------------------------
  // 2. Strict 4-Category Disjoint Partitioning (Due Today, At Risk, Mastered, Upcoming)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Four-Bucket Partitioning (Due Today, At Risk, Mastered, Upcoming) ---');

  const schedulesMap: Record<string, RetentionSchedule> = {
    due_item: {
      conceptId: 'recursion',
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.5,
      lastReviewDate: now - 1.2 * ONE_DAY_MS,
      nextReviewDate: now - 0.2 * ONE_DAY_MS, // Due today (overdue by 0.2 days < 1 day)
      status: 'learning',
    },
    at_risk_item: {
      conceptId: 'dynamic_memory',
      repetitions: 2,
      intervalDays: 3,
      easeFactor: 2.2,
      lastReviewDate: now - 15 * ONE_DAY_MS,
      nextReviewDate: now - 8 * ONE_DAY_MS, // Overdue by 8 days => at risk
      status: 'learning',
    },
    mastered_item: {
      conceptId: 'variables_types',
      repetitions: 4,
      intervalDays: 21,
      easeFactor: 2.6,
      lastReviewDate: now - 2 * ONE_DAY_MS,
      nextReviewDate: now + 19 * ONE_DAY_MS, // Future review + 4 reps => mastered
      status: 'retained',
    },
    upcoming_item: {
      conceptId: 'object_oriented',
      repetitions: 1,
      intervalDays: 7,
      easeFactor: 2.5,
      lastReviewDate: now - 1 * ONE_DAY_MS,
      nextReviewDate: now + 6 * ONE_DAY_MS, // Future review, 1 rep => upcoming
      status: 'learning',
    },
  };

  const categorized = categorizeRetentionState(schedulesMap, undefined, now);

  assert(categorized.dueToday.length === 1, `Due today count is exactly 1: ${categorized.dueToday.length}`);
  assert(categorized.dueToday[0].conceptId === 'recursion', 'Due today contains recursion');

  assert(categorized.atRisk.length === 1, `At risk count is exactly 1: ${categorized.atRisk.length}`);
  assert(categorized.atRisk[0].conceptId === 'dynamic_memory', 'At risk contains dynamic_memory');
  assert(categorized.atRisk[0].daysOverdue > 0, `At risk records positive overdue days: ${categorized.atRisk[0].daysOverdue}`);

  assert(categorized.mastered.length === 1, `Mastered count is exactly 1: ${categorized.mastered.length}`);
  assert(categorized.mastered[0].conceptId === 'variables_types', 'Mastered contains variables_types');

  assert(categorized.upcoming.length === 1, `Upcoming count is exactly 1: ${categorized.upcoming.length}`);
  assert(categorized.upcoming[0].conceptId === 'object_oriented', 'Upcoming contains object_oriented');

  // Verify zero overlap across all 4 buckets
  const allIds = [
    ...categorized.dueToday.map((i) => i.conceptId),
    ...categorized.atRisk.map((i) => i.conceptId),
    ...categorized.mastered.map((i) => i.conceptId),
    ...categorized.upcoming.map((i) => i.conceptId),
  ];
  const uniqueIds = new Set(allIds);
  assert(allIds.length === uniqueIds.size, 'Zero overlap across the four retention buckets');

  // -------------------------------------------------------------------------
  // 3. Multilingual Conceptual Micro-Reviews (EN, AR, FR)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Multilingual Conceptual Micro-Review Questions ---');

  const questionPointers = generateMicroReview('pointers', 'en');
  assert(questionPointers.conceptId === 'pointers', 'Question generated for pointers');
  assert(questionPointers.options.length >= 3, `Question has >= 3 options: ${questionPointers.options.length}`);
  assert(questionPointers.correctIndex >= 0 && questionPointers.correctIndex < questionPointers.options.length, 'Correct index within options bounds');
  assert(questionPointers.promptEn.length > 10, 'English prompt is rich');
  assert(questionPointers.promptAr.length > 10, 'Arabic prompt is rich');
  assert(questionPointers.promptFr.length > 10, 'French prompt is rich');

  const questionRecursion = generateMicroReview('recursion', 'ar');
  assert(questionRecursion.explanationAr.length > 10, 'Arabic explanation is populated for recursion');

  const fallbackQuestion = generateMicroReview('custom_unknown_topic', 'en');
  assert(fallbackQuestion.conceptId === 'custom_unknown_topic', 'Fallback question generates cleanly for arbitrary conceptId');
  assert(fallbackQuestion.options.length === 4, 'Fallback question has 4 options');

  // -------------------------------------------------------------------------
  // 4. Latency-Aware SM-2 Micro-Review Evaluation & Progression
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Latency-Aware SM-2 Evaluation & Schedule Progression ---');

  const currentSched: RetentionSchedule = {
    conceptId: 'pointers',
    repetitions: 1,
    intervalDays: 1,
    easeFactor: 2.5,
    lastReviewDate: now - ONE_DAY_MS,
    nextReviewDate: now,
    status: 'learning',
  };

  // Case A: Correct with fast response (<12s) => quality 5, interval progresses 1d -> 3d
  const fastCorrectSubmission: MicroReviewSubmission = {
    conceptId: 'pointers',
    selectedIndex: questionPointers.correctIndex,
    responseTimeMs: 8500, // 8.5s
  };

  const resFast = evaluateMicroReviewSubmission(fastCorrectSubmission, currentSched);
  assert(resFast.isCorrect === true, 'Fast submission evaluated as correct');
  assert(resFast.qualityScore === 5, `Fast correct response receives top quality score 5: ${resFast.qualityScore}`);
  assert(resFast.newIntervalDays === 3, `Interval advances from 1d -> 3d: ${resFast.newIntervalDays}`);
  assert(resFast.nextReviewDate > now, 'Next review date scheduled in future');

  // Case B: Subsequent correct review with medium latency (<25s) => quality 4, interval progresses 3d -> 7d
  const schedAt3d: RetentionSchedule = {
    ...currentSched,
    repetitions: 2,
    intervalDays: 3,
    easeFactor: resFast.updatedEaseFactor,
  };

  const mediumCorrectSubmission: MicroReviewSubmission = {
    conceptId: 'pointers',
    selectedIndex: questionPointers.correctIndex,
    responseTimeMs: 18000, // 18s
  };

  const resMedium = evaluateMicroReviewSubmission(mediumCorrectSubmission, schedAt3d);
  assert(resMedium.qualityScore === 4, `Medium correct response receives quality score 4: ${resMedium.qualityScore}`);
  assert(resMedium.newIntervalDays === 7, `Interval advances from 3d -> 7d: ${resMedium.newIntervalDays}`);

  // Case C: Incorrect response => quality < 3, interval reset to 1d (regression)
  const incorrectSubmission: MicroReviewSubmission = {
    conceptId: 'pointers',
    selectedIndex: (questionPointers.correctIndex + 1) % questionPointers.options.length,
    responseTimeMs: 12000,
  };

  const resIncorrect = evaluateMicroReviewSubmission(incorrectSubmission, schedAt3d);
  assert(resIncorrect.isCorrect === false, 'Wrong option evaluated as incorrect');
  assert(resIncorrect.qualityScore < 3, `Incorrect submission gives quality score < 3: ${resIncorrect.qualityScore}`);
  assert(resIncorrect.newIntervalDays === 1, `Regression resets interval back to 1 day: ${resIncorrect.newIntervalDays}`);
  assert(resIncorrect.status === 'regressed', `Status updated to regressed: ${resIncorrect.status}`);

  // -------------------------------------------------------------------------
  // 5. Concept Title Resolution
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Concept Title Resolution ---');
  const arTitle = resolveConceptTitle('dynamic_memory', 'ar');
  const enTitle = resolveConceptTitle('dynamic_memory', 'en');
  assert(arTitle.length > 0, `Arabic title resolved: ${arTitle}`);
  assert(enTitle.length > 0, `English title resolved: ${enTitle}`);

  // Summary
  console.log('\n============================================================');
  console.log(`📊 RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error(`❌ Suite failed with ${failedTests} failures.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passedTests} RETENTION & SPACED LEARNING TESTS PASSED (100%)!\n`);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
