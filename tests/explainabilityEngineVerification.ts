/**
 * Phase 2C - Milestone 5: Explainable Intelligence Engine Verification Suite
 *
 * Verifies:
 * 1. Pedagogy Choice Explainability (Worked Example, Analogy, Scaffolded, Socratic, Advanced Rigor).
 * 2. Deterministic, evidence-grounded rationales with sample-size calibration (N >= 3).
 * 3. Prerequisite Gap vs. Localized Concept Recommendation Diagnosis.
 * 4. Longitudinal Spaced Retention & Memory Decay Risk explanations (Ebbinghaus curve).
 * 5. Synthesized Common Mistakes Catalog & Actionable Remediation Tips.
 * 6. Resilient edge case handling (null states, uncalibrated metrics, missing schedules).
 */

import {
  explainPedagogyChoice,
  explainRecommendation,
  explainRetentionReview,
  synthesizeCommonMistakes,
  COMMON_MISTAKES_CATALOG,
  PedagogyRationale,
  RecommendationRationale,
  RetentionRationale,
  CommonMistakeItem,
} from '../src/lib/explainabilityEngine.js';
import { getStudentStateManager, createInitialStudentState } from '../src/lib/studentStateEngine.js';
import type { StudentState } from '../src/types/studentState.js';

let totalPassed = 0;
let totalFailed = 0;

export async function runExplainabilityEngineVerification(
  customAssert?: (cond: boolean, name: string) => void
): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🧠 PHASE 2C - MILESTONE 5: EXPLAINABLE INTELLIGENCE VERIFICATION');
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
  // TEST 1: Pedagogy Choice - Worked Example under High Cognitive Strain
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Pedagogy Choice: Worked Example Explanation ---');
  const uid1 = `explain_test_user_1_${Date.now()}`;
  const mgr1 = getStudentStateManager(uid1, 'Basic');

  // Simulate 2 consecutive errors on "pointers"
  mgr1.recordAnswer('pointers', false, 18000, 'dereference_null');
  mgr1.recordAnswer('pointers', false, 19500, 'dereference_null');
  const stateStruggling = mgr1.getState();

  const workedExampleRationale = explainPedagogyChoice('worked_example', stateStruggling, 'pointers');

  assert(workedExampleRationale.strategy === 'worked_example', 'Strategy matches worked_example');
  assert(workedExampleRationale.trigger.includes('Repeated') || workedExampleRationale.trigger.includes('Strain'), 'Trigger identifies repeated errors or high strain');
  assert(workedExampleRationale.evidence.includes('pointers'), 'Evidence cites specific concept "pointers"');
  assert(workedExampleRationale.evidence.includes('consecutive errors') || workedExampleRationale.evidence.includes('2'), 'Evidence cites error count');
  assert(workedExampleRationale.confidenceLevel === 'calibrating', 'Confidence is calibrating when attempts < 3');
  assert(workedExampleRationale.rationaleEn.length > 30, 'English rationale is substantive and detailed');
  assert(workedExampleRationale.rationaleAr.length > 30, 'Arabic rationale is substantive and detailed');
  assert(workedExampleRationale.rationaleEn.includes('Worked Example') || workedExampleRationale.rationaleEn.includes('memory'), 'English rationale mentions worked examples');
  assert(workedExampleRationale.pedagogicalGoalEn.length > 20, 'Pedagogical goal in English is present');
  assert(workedExampleRationale.pedagogicalGoalAr.length > 20, 'Pedagogical goal in Arabic is present');

  // --------------------------------------------------------------------------
  // TEST 2: Pedagogy Choice - Socratic Inquiry on High Mastery Streak
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Pedagogy Choice: Socratic Inquiry on High Mastery ---');
  const uid2 = `explain_test_user_2_${Date.now()}`;
  const mgr2 = getStudentStateManager(uid2, 'Advanced');

  // Calibrate pedagogy effectiveness with 4 positive interactions
  mgr2.recordPedagogyFeedback('socratic', true, 'recursion');
  mgr2.recordPedagogyFeedback('socratic', true, 'recursion');
  mgr2.recordPedagogyFeedback('socratic', true, 'recursion');
  mgr2.recordPedagogyFeedback('socratic', true, 'recursion');

  // 3 consecutive correct answers
  mgr2.recordAnswer('recursion', true, 4200);
  mgr2.recordAnswer('recursion', true, 3900);
  mgr2.recordAnswer('recursion', true, 4100);
  const stateMastered = mgr2.getState();

  const socraticRationale = explainPedagogyChoice('socratic', stateMastered, 'recursion');

  assert(socraticRationale.strategy === 'socratic', 'Strategy matches socratic');
  assert(socraticRationale.confidenceLevel === 'high', 'Confidence is high with 4 attempts and high score');
  assert(socraticRationale.trigger.includes('Mastery') || socraticRationale.trigger.includes('Streak'), 'Trigger identifies mastery streak');
  assert(socraticRationale.evidence.includes('3'), 'Evidence notes streak of 3 consecutive correct answers');
  assert(socraticRationale.rationaleEn.includes('Socratic') || socraticRationale.rationaleEn.includes('deductive'), 'English rationale references Socratic inquiry');
  assert(socraticRationale.rationaleAr.includes('سقراطي') || socraticRationale.rationaleAr.includes('الاستنتاجي'), 'Arabic rationale properly translated');

  // --------------------------------------------------------------------------
  // TEST 3: Pedagogy Choice - Analogies, Scaffolded, Advanced Rigor
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Pedagogy Choice: Other Modalities ---');
  const analogiesRationale = explainPedagogyChoice('analogies', stateStruggling, 'pointers');
  assert(analogiesRationale.strategy === 'analogies', 'Analogies strategy returned');
  assert(analogiesRationale.rationaleEn.includes('Analog') || analogiesRationale.rationaleEn.includes('metaphor'), 'Analogies rationale emphasizes mental models');
  assert(analogiesRationale.rationaleAr.includes('التشبيهات'), 'Arabic analogies rationale present');

  const scaffoldedRationale = explainPedagogyChoice('scaffolded', null, 'control_flow');
  assert(scaffoldedRationale.strategy === 'scaffolded', 'Scaffolded strategy handled gracefully with null state');
  assert(scaffoldedRationale.confidenceLevel === 'provisional', 'Provisional confidence with null state');
  assert(scaffoldedRationale.rationaleEn.includes('Scaffold') || scaffoldedRationale.rationaleEn.includes('progression'), 'Scaffolded rationale provides structured guidance');

  const rigorRationale = explainPedagogyChoice('advanced_rigor', stateMastered, 'recursion');
  assert(rigorRationale.strategy === 'advanced_rigor', 'Advanced rigor strategy returned');
  assert(rigorRationale.rationaleEn.includes('Formal') || rigorRationale.rationaleEn.includes('complexity'), 'Rigor rationale mentions complexity/formal proof');

  // --------------------------------------------------------------------------
  // TEST 4: Recommendation Rationale - Prerequisite Gap Diagnosis
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Recommendation Rationale: Prerequisite Gap Diagnosis ---');
  const uid3 = `explain_test_user_3_${Date.now()}`;
  const mgr3 = getStudentStateManager(uid3, 'Basic');

  // Create prerequisite gap: "pointers" requires "memory_addresses".
  // Fail "memory_addresses" heavily.
  mgr3.recordAnswer('memory_addresses', false, 15000, 'type_mismatch');
  mgr3.recordAnswer('memory_addresses', false, 16000, 'type_mismatch');
  // Attempt "pointers"
  mgr3.recordAnswer('pointers', false, 19000, 'dereference_null');

  const stateGap = mgr3.getState();
  const recRationale = explainRecommendation('pointers', stateGap);

  assert(recRationale.isPrerequisiteGap === true, 'Accurately diagnoses prerequisite gap');
  assert(recRationale.targetConceptId === 'pointers', 'Target concept is "pointers"');
  assert(recRationale.recommendedConceptId === 'memory_addresses', 'Recommended concept is root gap "memory_addresses"');
  assert(Array.isArray(recRationale.prerequisiteChain), 'Prerequisite chain is an array');
  assert(recRationale.prerequisiteChain?.includes('memory_addresses'), 'Prerequisite chain contains root gap');
  assert(recRationale.prerequisiteChain?.includes('pointers'), 'Prerequisite chain contains target');
  assert(recRationale.rationaleEn.includes('Memory Addresses') || recRationale.rationaleEn.includes('prerequisite'), 'English rationale references unmastered prerequisite');
  assert(recRationale.rationaleAr.includes('المتطلب') || recRationale.rationaleAr.includes('عناوين الذاكرة'), 'Arabic rationale references prerequisite');

  // --------------------------------------------------------------------------
  // TEST 5: Recommendation Rationale - Localized Concept Focus (No Gap)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Recommendation Rationale: Localized Concept Focus ---');
  const uid4 = `explain_test_user_4_${Date.now()}`;
  const mgr4 = getStudentStateManager(uid4, 'Basic');

  // Master prerequisite "variables_types"
  mgr4.recordAnswer('variables_types', true, 3000);
  mgr4.recordAnswer('variables_types', true, 3100);
  mgr4.recordAnswer('variables_types', true, 2900);

  // Struggle on "control_flow" directly
  mgr4.recordAnswer('control_flow', false, 14000, 'off_by_one');
  mgr4.recordAnswer('control_flow', false, 15000, 'off_by_one');

  const stateLocalized = mgr4.getState();
  const localizedRationale = explainRecommendation('control_flow', stateLocalized);

  assert(localizedRationale.isPrerequisiteGap === false, 'No prerequisite gap diagnosed');
  assert(localizedRationale.recommendedConceptId === 'control_flow', 'Recommended concept is target itself');
  assert(localizedRationale.rationaleEn.includes('remediation') || localizedRationale.rationaleEn.includes('friction'), 'Rationale explains localized remediation');
  assert(localizedRationale.rationaleAr.length > 20, 'Arabic localized rationale present');

  // --------------------------------------------------------------------------
  // TEST 6: Spaced Retention Review Explanation
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Spaced Retention Review Explanation ---');
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // 6a: Overdue schedule (high risk)
  const stateWithOverdue: StudentState = {
    ...stateMastered,
    retentionSchedules: {
      recursion: {
        conceptId: 'recursion',
        repetitions: 2,
        intervalDays: 3,
        easeFactor: 2.5,
        lastReviewDate: now - 8 * ONE_DAY,
        nextReviewDate: now - 5 * ONE_DAY, // 5 days overdue!
        status: 'learning',
      },
    },
  };

  const overdueRationale = explainRetentionReview('recursion', stateWithOverdue, now);
  assert(overdueRationale.riskLevel === 'high', 'Risk level is high for overdue schedule');
  assert(overdueRationale.decayRisk >= 0.7, 'Decay risk score is elevated (>= 0.7)');
  assert(overdueRationale.daysSinceReview >= 8, 'Days since review correctly calculated');
  assert(overdueRationale.urgencyLabelEn.includes('Overdue') || overdueRationale.urgencyLabelEn.includes('Decay'), 'Urgency label flags overdue state');
  assert(overdueRationale.rationaleEn.includes('Ebbinghaus') || overdueRationale.rationaleEn.includes('overdue'), 'English rationale references forgetting curve');
  assert(overdueRationale.rationaleAr.includes('مستحقة') || overdueRationale.rationaleAr.includes('النسيان'), 'Arabic rationale properly translated');

  // 6b: Upcoming schedule (<48h, medium risk)
  const stateWithUpcoming: StudentState = {
    ...stateMastered,
    retentionSchedules: {
      functions: {
        conceptId: 'functions',
        repetitions: 3,
        intervalDays: 7,
        easeFactor: 2.5,
        lastReviewDate: now - 6 * ONE_DAY,
        nextReviewDate: now + 1 * ONE_DAY, // 24 hours away (< 48h)
        status: 'learning',
      },
    },
  };

  const upcomingRationale = explainRetentionReview('functions', stateWithUpcoming, now);
  assert(upcomingRationale.riskLevel === 'medium', 'Risk level is medium when due within 48h');
  assert(upcomingRationale.decayRisk > 0.4 && upcomingRationale.decayRisk < 0.7, 'Decay risk is moderate (0.4 - 0.7)');
  assert(upcomingRationale.urgencyLabelEn.includes('Approaching'), 'Urgency label flags approaching milestone');

  // 6c: Consolidated schedule (low risk)
  const stateWithSafe: StudentState = {
    ...stateMastered,
    retentionSchedules: {
      variables_types: {
        conceptId: 'variables_types',
        repetitions: 5,
        intervalDays: 30,
        easeFactor: 2.6,
        lastReviewDate: now - 2 * ONE_DAY,
        nextReviewDate: now + 28 * ONE_DAY,
        status: 'retained',
      },
    },
  };

  const safeRationale = explainRetentionReview('variables_types', stateWithSafe, now);
  assert(safeRationale.riskLevel === 'low', 'Risk level is low for well-consolidated schedule');
  assert(safeRationale.decayRisk <= 0.35, 'Decay risk is low (<= 0.35)');
  assert(safeRationale.urgencyLabelEn.includes('Consolidated') || safeRationale.urgencyLabelEn.includes('Stable'), 'Urgency label confirms stability');

  // 6d: Concept without schedule (safe fallback)
  const fallbackRetention = explainRetentionReview('non_existent_concept', null, now);
  assert(fallbackRetention.riskLevel === 'medium', 'Fallback returns medium baseline');
  assert(fallbackRetention.rationaleEn.length > 20, 'Fallback English rationale returned');

  // --------------------------------------------------------------------------
  // TEST 7: Common Mistakes Synthesis & Actionable Remediation Tips
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Common Mistakes Synthesis & Remediation Catalog ---');
  const uid5 = `explain_test_user_5_${Date.now()}`;
  const mgr5 = getStudentStateManager(uid5, 'Basic');

  // Inject multiple mistake types across concepts
  mgr5.recordAnswer('pointers', false, 14000, 'dereference_null');
  mgr5.recordAnswer('pointers', false, 15000, 'dereference_null');
  mgr5.recordAnswer('recursion', false, 12000, 'base_case_omission');
  mgr5.recordAnswer('control_flow', false, 10000, 'off_by_one');

  const mistakesList = synthesizeCommonMistakes(mgr5.getState());

  assert(Array.isArray(mistakesList), 'synthesizeCommonMistakes returns an array');
  assert(mistakesList.length >= 3, 'Found at least 3 synthesized mistake patterns');

  const nullMistake = mistakesList.find((m) => m.id === 'dereference_null');
  assert(nullMistake !== undefined, 'dereference_null found in synthesized mistakes');
  assert(nullMistake!.count === 2, 'dereference_null has count of 2');
  assert(nullMistake!.conceptsInvolved.includes('pointers'), 'dereference_null links to pointers concept');
  assert(nullMistake!.nameEn === 'Null Pointer Dereference', 'Catalog nameEn matches');
  assert(nullMistake!.nameAr.includes('Null Pointer') || nullMistake!.nameAr.includes('مؤشر فارغ'), 'Catalog nameAr matches');
  assert(nullMistake!.remediationTipEn.includes('NULL') || nullMistake!.remediationTipEn.includes('guard'), 'Remediation tip provides actionable guard pattern');
  assert(nullMistake!.remediationTipAr.length > 20, 'Arabic remediation tip is detailed');
  assert(nullMistake!.suggestedActionEn.length > 10, 'Suggested action in English is present');

  const baseCaseMistake = mistakesList.find((m) => m.id === 'base_case_omission');
  assert(baseCaseMistake !== undefined, 'base_case_omission found');
  assert(baseCaseMistake!.conceptsInvolved.includes('recursion'), 'base_case_omission links to recursion');
  assert(baseCaseMistake!.remediationTipEn.includes('base case'), 'Base case tip mentions base case');

  // Verify sorting order: dereference_null (count 2) should be first
  assert(mistakesList[0].id === 'dereference_null', 'Mistakes sorted by frequency descending');

  // Empty state handling
  const emptyMistakes = synthesizeCommonMistakes(null);
  assert(Array.isArray(emptyMistakes) && emptyMistakes.length === 0, 'Null state returns empty array');

  // --------------------------------------------------------------------------
  // TEST 8: Catalog Completeness Check
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Catalog Completeness Check ---');
  const catalogKeys = Object.keys(COMMON_MISTAKES_CATALOG);
  assert(catalogKeys.includes('dereference_null'), 'Catalog includes dereference_null');
  assert(catalogKeys.includes('base_case_omission'), 'Catalog includes base_case_omission');
  assert(catalogKeys.includes('off_by_one'), 'Catalog includes off_by_one');
  assert(catalogKeys.includes('memory_leak'), 'Catalog includes memory_leak');
  assert(catalogKeys.includes('type_mismatch'), 'Catalog includes type_mismatch');
  assert(catalogKeys.includes('dangling_pointer'), 'Catalog includes dangling_pointer');
  assert(catalogKeys.includes('infinite_loop'), 'Catalog includes infinite_loop');

  for (const [key, entry] of Object.entries(COMMON_MISTAKES_CATALOG)) {
    assert(entry.nameEn.length > 0 && entry.nameAr.length > 0, `Catalog entry "${key}" has bilingual names`);
    assert(entry.remediationTipEn.length > 10 && entry.remediationTipAr.length > 10, `Catalog entry "${key}" has bilingual tips`);
  }

  console.log('\n================================================================');
  console.log(`📊 EXPLAINABILITY ENGINE VERIFICATION: ${passedLocal} passed, ${failedLocal} failed`);
  console.log('================================================================');

  return { passed: passedLocal, failed: failedLocal };
}

// Direct execution when invoked via CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('explainabilityEngineVerification.ts')) {
  runExplainabilityEngineVerification()
    .then((results) => {
      if (results.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}
