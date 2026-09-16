/**
 * Institutional Intelligence Verification Suite (Milestone 15)
 * Verifies university-wide analytics, curricular bottlenecks, strict k-Anonymity (k >= 5)
 * suppression, early-warning dropout radar, and ABET accreditation attainment.
 */

import {
  evaluateCurricularBottlenecks,
  synthesizeEarlyWarningRadar,
  generateAccreditationSummary,
  compileInstitutionalDashboard,
} from '../src/lib/institutionalIntelligence';
import type { StudentState } from '../src/types/studentState';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runSuite() {
  console.log('============================================================');
  console.log('🏛️ RUNNING INSTITUTIONAL INTELLIGENCE ENGINE VERIFICATION (M15)');
  console.log('============================================================\n');

  // Build diverse mock cohort across 2 departments:
  // - 3 Students in Critical Risk (to test k-Anonymity suppression < 5)
  // - 8 Students in High Risk
  // - 15 Students in Moderate Risk
  // - 20 Students in Low Risk (Flourishing)
  const allStudents: StudentState[] = [];

  // 1. Critical risk (3 students - MUST BE SUPPRESSED under k=5)
  for (let i = 1; i <= 3; i++) {
    allStudents.push({
      uid: `crit_std_${i}`,
      cognitiveStage: 'foundational',
      activePedagogy: 'worked_example',
      conceptMastery: {
        pointers: {
          conceptId: 'pointers',
          accuracy: 0.30,
          attempts: 10,
          correct: 3,
          confidence: 0.3,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 4,
          lastTested: Date.now(),
          mistakeTypes: ['memory_leak'],
        },
        dynamic_memory: {
          conceptId: 'dynamic_memory',
          accuracy: 0.25,
          attempts: 8,
          correct: 2,
          confidence: 0.2,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 3,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
      },
      learningStrain: {
        possibleStruggle: 0.82,
        confidence: 0.9,
        signals: ['repeated_errors', 'high_response_latency'],
      },
      struggleSignal: 0.82,
      cognitiveLoadScore: 0.82,
      pedagogyEffectiveness: {
        worked_example: { score: 0.8, helpfulCount: 4, unhelpfulCount: 1 },
        socratic: { score: 0.2, helpfulCount: 1, unhelpfulCount: 5 },
        scaffolded: { score: 0.5, helpfulCount: 2, unhelpfulCount: 2 },
        analogies: { score: 0.5, helpfulCount: 2, unhelpfulCount: 2 },
        advanced_rigor: { score: 0.1, helpfulCount: 0, unhelpfulCount: 3 },
      },
      retentionSchedules: {},
      activeInterventions: {},
      totalExercisesCompleted: 8,
      lastActiveTimestamp: Date.now(),
    });
  }

  // 2. High risk (8 students - k >= 5, must NOT be suppressed)
  for (let i = 1; i <= 8; i++) {
    allStudents.push({
      uid: `high_std_${i}`,
      cognitiveStage: 'developing',
      activePedagogy: 'scaffolded',
      conceptMastery: {
        pointers: {
          conceptId: 'pointers',
          accuracy: 0.52,
          attempts: 7,
          correct: 3,
          confidence: 0.5,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 2,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
        dynamic_memory: {
          conceptId: 'dynamic_memory',
          accuracy: 0.50,
          attempts: 6,
          correct: 3,
          confidence: 0.5,
          consecutiveCorrect: 1,
          consecutiveIncorrect: 2,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
      },
      learningStrain: {
        possibleStruggle: 0.60,
        confidence: 0.75,
        signals: ['repeated_errors'],
      },
      struggleSignal: 0.60,
      cognitiveLoadScore: 0.60,
      pedagogyEffectiveness: {
        worked_example: { score: 0.7, helpfulCount: 3, unhelpfulCount: 1 },
        socratic: { score: 0.4, helpfulCount: 2, unhelpfulCount: 3 },
        scaffolded: { score: 0.7, helpfulCount: 4, unhelpfulCount: 1 },
        analogies: { score: 0.6, helpfulCount: 2, unhelpfulCount: 1 },
        advanced_rigor: { score: 0.3, helpfulCount: 1, unhelpfulCount: 2 },
      },
      retentionSchedules: {},
      activeInterventions: {},
      totalExercisesCompleted: 14,
      lastActiveTimestamp: Date.now(),
    });
  }

  // 3. Moderate risk (15 students)
  for (let i = 1; i <= 15; i++) {
    allStudents.push({
      uid: `mod_std_${i}`,
      cognitiveStage: 'developing',
      activePedagogy: 'scaffolded',
      conceptMastery: {
        pointers: {
          conceptId: 'pointers',
          accuracy: 0.68,
          attempts: 6,
          correct: 4,
          confidence: 0.7,
          consecutiveCorrect: 2,
          consecutiveIncorrect: 1,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
      },
      learningStrain: {
        possibleStruggle: 0.42,
        confidence: 0.6,
        signals: [],
      },
      struggleSignal: 0.42,
      cognitiveLoadScore: 0.42,
      pedagogyEffectiveness: {
        worked_example: { score: 0.75, helpfulCount: 3, unhelpfulCount: 1 },
        socratic: { score: 0.60, helpfulCount: 3, unhelpfulCount: 2 },
        scaffolded: { score: 0.80, helpfulCount: 5, unhelpfulCount: 1 },
        analogies: { score: 0.70, helpfulCount: 3, unhelpfulCount: 1 },
        advanced_rigor: { score: 0.50, helpfulCount: 2, unhelpfulCount: 1 },
      },
      retentionSchedules: {},
      activeInterventions: {},
      totalExercisesCompleted: 18,
      lastActiveTimestamp: Date.now(),
    });
  }

  // 4. Low risk / Flourishing (20 students)
  for (let i = 1; i <= 20; i++) {
    allStudents.push({
      uid: `low_std_${i}`,
      cognitiveStage: 'advanced',
      activePedagogy: 'socratic',
      conceptMastery: {
        pointers: {
          conceptId: 'pointers',
          accuracy: 0.94,
          attempts: 8,
          correct: 7,
          confidence: 0.95,
          consecutiveCorrect: 5,
          consecutiveIncorrect: 0,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
        dynamic_memory: {
          conceptId: 'dynamic_memory',
          accuracy: 0.90,
          attempts: 6,
          correct: 5,
          confidence: 0.90,
          consecutiveCorrect: 4,
          consecutiveIncorrect: 0,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
      },
      learningStrain: {
        possibleStruggle: 0.15,
        confidence: 0.8,
        signals: [],
      },
      struggleSignal: 0.15,
      cognitiveLoadScore: 0.15,
      pedagogyEffectiveness: {
        worked_example: { score: 0.7, helpfulCount: 3, unhelpfulCount: 1 },
        socratic: { score: 0.95, helpfulCount: 7, unhelpfulCount: 0 },
        scaffolded: { score: 0.8, helpfulCount: 4, unhelpfulCount: 1 },
        analogies: { score: 0.7, helpfulCount: 3, unhelpfulCount: 1 },
        advanced_rigor: { score: 0.9, helpfulCount: 5, unhelpfulCount: 0 },
      },
      retentionSchedules: {},
      activeInterventions: {},
      totalExercisesCompleted: 28,
      lastActiveTimestamp: Date.now(),
    });
  }

  // Total students = 3 + 8 + 15 + 20 = 46 students

  // -------------------------------------------------------------------------
  // 1. Curricular Bottlenecks & Downstream Cascades
  // -------------------------------------------------------------------------
  console.log('--- 1. Curricular Bottlenecks & Downstream Cascades ---');
  const bottlenecks = evaluateCurricularBottlenecks(allStudents, 'CS101');
  assert(bottlenecks.length > 0, `Identified curricular bottlenecks: count=${bottlenecks.length}`);

  const pointerBottleneck = bottlenecks.find((b) => b.conceptId === 'pointers');
  assert(pointerBottleneck !== undefined, 'pointers identified as a primary curricular bottleneck');
  assert(pointerBottleneck?.downstreamImpactCourses.includes('CS201: Data Structures'), 'Identifies downstream failure cascade to CS201 Data Structures');
  assert(pointerBottleneck?.affectedStudentPercentage > 20, `Calculated affected percentage: ${pointerBottleneck?.affectedStudentPercentage}%`);

  // -------------------------------------------------------------------------
  // 2. Strict k-Anonymity (k >= 5) Suppression
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Strict k-Anonymity (k >= 5) Suppression ---');
  const { radar, audit } = synthesizeEarlyWarningRadar(allStudents, 5);

  assert(audit.minimumCohortSize === 5, 'Audit enforces minimum cohort size of k=5');
  assert(audit.suppressionApplied === true, 'Suppression flagged as active due to sub-threshold cohort');
  assert(audit.suppressedCohortsCount === 1, `Suppressed exactly 1 sub-threshold cohort: ${audit.suppressedCohortsCount}`);
  assert(audit.reidentificationRisk === 'zero', 'Reidentification risk evaluated as zero');

  const criticalCohort = radar.find((r) => r.riskLevel === 'critical');
  assert(criticalCohort !== undefined, 'Identified critical risk cohort');
  assert(criticalCohort?.isSuppressed === true, 'Critical cohort (3 students) is suppressed');
  assert(criticalCohort?.studentCountDisplay === '<5 (Suppressed for Privacy)', 'Display masked with "<5 (Suppressed for Privacy)"');
  assert(criticalCohort?.actualStudentCount === undefined, 'Raw actualStudentCount is omitted for suppressed cohort');

  const highCohort = radar.find((r) => r.riskLevel === 'high');
  assert(highCohort !== undefined, 'Identified high risk cohort');
  assert(highCohort?.isSuppressed === false, 'High risk cohort (8 students) is NOT suppressed');
  assert(highCohort?.studentCountDisplay === '8 students', `High risk display shows exact count: ${highCohort?.studentCountDisplay}`);
  assert(highCohort?.actualStudentCount === 8, 'High risk actualStudentCount is 8');

  // -------------------------------------------------------------------------
  // 3. Early-Warning Radar Actions
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Early-Warning Radar Actionable Interventions ---');
  assert(criticalCohort?.recommendedInstitutionalActionEn.includes('Advising'), 'Critical action triggers immediate Academic Advising');
  assert(criticalCohort?.recommendedInstitutionalActionAr.includes('الإرشاد الأكاديمي'), 'Critical Arabic action is localized');
  assert(highCohort?.recommendedInstitutionalActionEn.includes('TA tutorial'), 'High risk action triggers TA tutorial sessions');

  // -------------------------------------------------------------------------
  // 4. Accreditation Attainment & Continuous Improvement Loop
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Accreditation Attainment & Continuous Improvement ---');
  const accreditation = generateAccreditationSummary(
    [{ departmentId: 'cs', departmentNameEn: 'Computer Science', departmentNameAr: 'علوم الحاسب', enrolledStudentsCount: 46, averageMasteryRate: 0.81, averageStrainRate: 0.32, retentionRate: 0.94 }],
    bottlenecks
  );

  assert(accreditation.accreditationStandard === 'ABET_CAC', 'Standard formatted as ABET_CAC');
  assert(accreditation.outcomesAttainment.length === 3, 'Evaluates ABET Student Outcomes (SO-1, SO-2, SO-6)');

  const so1 = accreditation.outcomesAttainment.find((o) => o.outcomeId === 'SO-1');
  assert(so1?.status === 'exceeds_standard', 'SO-1 exceeds standard benchmark');

  assert(accreditation.continuousImprovementLoop.measuredImpactGainPercentage === 18, 'Records +18% gain in continuous improvement loop');
  assert(accreditation.continuousImprovementLoop.implementedPedagogicalChangeAr.length > 20, 'Arabic continuous improvement loop is localized');

  // -------------------------------------------------------------------------
  // 5. Full Institutional Dashboard Compilation
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Full Institutional Dashboard Compilation ---');
  const dashboard = compileInstitutionalDashboard('uni_cairo_fci', 'Cairo University - Faculty of Computing', {
    cs: allStudents.slice(0, 26),
    is: allStudents.slice(26),
  });

  assert(dashboard.institutionId === 'uni_cairo_fci', 'Embeds correct institution ID');
  assert(dashboard.departments.length === 2, 'Aggregates 2 departments (CS and IS)');
  assert(dashboard.bottlenecks.length > 0, 'Embeds curricular bottlenecks');
  assert(dashboard.earlyWarningRadar.length === 4, 'Embeds 4-tier early-warning radar');
  assert(dashboard.kAnonymityAudit.minimumCohortSize === 5, 'Embeds k-anonymity audit in compiled dashboard');
  assert(dashboard.accreditation.outcomesAttainment.length > 0, 'Embeds accreditation outcomes attainment');

  // Summary
  console.log('\n============================================================');
  console.log(`📊 RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error(`❌ Suite failed with ${failedTests} failures.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passedTests} INSTITUTIONAL INTELLIGENCE TESTS PASSED (100%)!\n`);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
