/**
 * Cognify 2.0 - Real-World Persona Simulation Testbed (Phase D - Requirement 30)
 * tests/validation/teacherWorkflowValidation.ts
 *
 * Validates Teacher Dashboard workflows:
 * 1. Cohort Mastery Heatmap Generation:
 *    - Multi-concept x multi-student mastery grid (144 cells across 24 students and 6 concepts)
 *    - Cell color tiers (Green: >=80%, Yellow: 60-79%, Red: <60%)
 *    - Concept-level and student-level aggregate performance benchmarking
 * 
 * 2. Low-Mastery Prerequisite Alert Dispatch:
 *    - Struggle cluster detection with root-cause prerequisite gap diagnosis
 *    - Dispatched alert notification to teacher queue with priority, affected count, and actionable remediation prompts
 * 
 * 3. Curriculum Pacing Recommendations:
 *    - Pacing engine recommending Decelerate vs Accelerate based on cohort struggle rates
 *    - Automated differentiated instruction grouping (Foundational, Guided Fluency, Advanced Socratic)
 *    - Full Teacher Dashboard compilation
 */

import {
  detectStruggleClusters,
  evaluateClassInterventionEfficacy,
  generateDifferentiatedGroups,
  generateTeacherRecommendations,
  compileTeacherDashboard,
  generateCohortMasteryHeatmap,
  evaluateCurriculumPacing,
  dispatchTeacherAlert,
} from '../../src/lib/teacherIntelligence.js';
import type { StudentState } from '../../src/types/studentState.js';
import type {
  TeacherDashboardData,
  HeatmapCell,
  ConceptHeatmapSummary,
  PrerequisiteAlertMessage,
  CurriculumPacingRecommendation,
} from '../../src/types/teacher.js';

let totalPassed = 0;
let totalFailed = 0;


function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    totalFailed++;
  }
}

export async function runTeacherWorkflowValidationSuite(): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('👨‍🏫 RUNNING TEACHER DASHBOARD WORKFLOW VALIDATION TESTBED');
  console.log('================================================================\n');

  // ===========================================================================
  // MOCK COHORT SETUP: 24 Students in CS101 Section B
  // - 14 Struggling students (stumbling on dynamic_memory due to pointers gap)
  // - 6 Guided Fluency students (steady progress)
  // - 4 Advanced students (excelling in Socratic mode)
  // ===========================================================================
  const cohort: StudentState[] = [];
  const trackedConcepts = [
    'variables_types',
    'control_flow',
    'functions',
    'pointers',
    'dynamic_memory',
    'recursion',
  ];

  // 1. Struggling group (14 students)
  for (let i = 1; i <= 14; i++) {
    cohort.push({
      uid: `std_struggler_${i}`,
      cognitiveStage: 'foundational',
      activePedagogy: 'worked_example',
      conceptMastery: {
        variables_types: { conceptId: 'variables_types', accuracy: 0.92, attempts: 5, correct: 5, confidence: 0.9, consecutiveCorrect: 4, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        control_flow: { conceptId: 'control_flow', accuracy: 0.85, attempts: 6, correct: 5, confidence: 0.8, consecutiveCorrect: 3, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        functions: { conceptId: 'functions', accuracy: 0.70, attempts: 7, correct: 5, confidence: 0.7, consecutiveCorrect: 2, consecutiveIncorrect: 1, lastTested: Date.now(), mistakeTypes: [] },
        pointers: { conceptId: 'pointers', accuracy: 0.45, attempts: 8, correct: 3, confidence: 0.4, consecutiveCorrect: 0, consecutiveIncorrect: 3, lastTested: Date.now(), mistakeTypes: ['dereference_confusion'] },
        dynamic_memory: { conceptId: 'dynamic_memory', accuracy: 0.30, attempts: 6, correct: 1, confidence: 0.3, consecutiveCorrect: 0, consecutiveIncorrect: 3, lastTested: Date.now(), mistakeTypes: ['memory_leak'] },
        recursion: { conceptId: 'recursion', accuracy: 0.40, attempts: 5, correct: 2, confidence: 0.4, consecutiveCorrect: 0, consecutiveIncorrect: 2, lastTested: Date.now(), mistakeTypes: ['stack_overflow'] },
      },
      learningStrain: { possibleStruggle: 0.78, confidence: 0.85, signals: ['repeated_errors', 'high_response_latency'] },
      struggleSignal: 0.78,
      cognitiveLoadScore: 0.78,
      pedagogyEffectiveness: {
        worked_example: { score: 0.85, helpfulCount: 5, unhelpfulCount: 1 },
        socratic: { score: 0.25, helpfulCount: 1, unhelpfulCount: 4 },
        scaffolded: { score: 0.65, helpfulCount: 3, unhelpfulCount: 2 },
        analogies: { score: 0.70, helpfulCount: 3, unhelpfulCount: 1 },
        advanced_rigor: { score: 0.15, helpfulCount: 0, unhelpfulCount: 2 },
      },
      retentionSchedules: {},
      activeInterventions: {},
      totalExercisesCompleted: 18,
      lastActiveTimestamp: Date.now(),
    });
  }

  // 2. Guided Fluency group (6 students)
  for (let i = 1; i <= 6; i++) {
    cohort.push({
      uid: `std_fluency_${i}`,
      cognitiveStage: 'developing',
      activePedagogy: 'scaffolded',
      conceptMastery: {
        variables_types: { conceptId: 'variables_types', accuracy: 0.95, attempts: 6, correct: 6, confidence: 0.95, consecutiveCorrect: 5, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        control_flow: { conceptId: 'control_flow', accuracy: 0.90, attempts: 5, correct: 4, confidence: 0.85, consecutiveCorrect: 3, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        functions: { conceptId: 'functions', accuracy: 0.82, attempts: 6, correct: 5, confidence: 0.80, consecutiveCorrect: 2, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        pointers: { conceptId: 'pointers', accuracy: 0.72, attempts: 7, correct: 5, confidence: 0.70, consecutiveCorrect: 2, consecutiveIncorrect: 1, lastTested: Date.now(), mistakeTypes: [] },
        dynamic_memory: { conceptId: 'dynamic_memory', accuracy: 0.68, attempts: 6, correct: 4, confidence: 0.65, consecutiveCorrect: 2, consecutiveIncorrect: 1, lastTested: Date.now(), mistakeTypes: [] },
        recursion: { conceptId: 'recursion', accuracy: 0.75, attempts: 5, correct: 4, confidence: 0.75, consecutiveCorrect: 2, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
      },
      learningStrain: { possibleStruggle: 0.35, confidence: 0.70, signals: [] },
      struggleSignal: 0.35,
      cognitiveLoadScore: 0.35,
      pedagogyEffectiveness: {
        worked_example: { score: 0.75, helpfulCount: 3, unhelpfulCount: 1 },
        socratic: { score: 0.60, helpfulCount: 3, unhelpfulCount: 2 },
        scaffolded: { score: 0.85, helpfulCount: 5, unhelpfulCount: 1 },
        analogies: { score: 0.75, helpfulCount: 3, unhelpfulCount: 1 },
        advanced_rigor: { score: 0.40, helpfulCount: 1, unhelpfulCount: 2 },
      },
      retentionSchedules: {},
      activeInterventions: {},
      totalExercisesCompleted: 22,
      lastActiveTimestamp: Date.now(),
    });
  }

  // 3. Advanced Socratic group (4 students)
  for (let i = 1; i <= 4; i++) {
    cohort.push({
      uid: `std_advanced_${i}`,
      cognitiveStage: 'advanced',
      activePedagogy: 'socratic',
      conceptMastery: {
        variables_types: { conceptId: 'variables_types', accuracy: 1.0, attempts: 6, correct: 6, confidence: 1.0, consecutiveCorrect: 6, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        control_flow: { conceptId: 'control_flow', accuracy: 0.96, attempts: 6, correct: 6, confidence: 0.95, consecutiveCorrect: 5, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        functions: { conceptId: 'functions', accuracy: 0.94, attempts: 7, correct: 7, confidence: 0.95, consecutiveCorrect: 5, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        pointers: { conceptId: 'pointers', accuracy: 0.92, attempts: 8, correct: 7, confidence: 0.92, consecutiveCorrect: 4, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        dynamic_memory: { conceptId: 'dynamic_memory', accuracy: 0.88, attempts: 6, correct: 5, confidence: 0.90, consecutiveCorrect: 4, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
        recursion: { conceptId: 'recursion', accuracy: 0.90, attempts: 6, correct: 5, confidence: 0.90, consecutiveCorrect: 4, consecutiveIncorrect: 0, lastTested: Date.now(), mistakeTypes: [] },
      },
      learningStrain: { possibleStruggle: 0.12, confidence: 0.80, signals: [] },
      struggleSignal: 0.12,
      cognitiveLoadScore: 0.12,
      pedagogyEffectiveness: {
        worked_example: { score: 0.65, helpfulCount: 2, unhelpfulCount: 1 },
        socratic: { score: 0.96, helpfulCount: 7, unhelpfulCount: 0 },
        scaffolded: { score: 0.80, helpfulCount: 4, unhelpfulCount: 1 },
        analogies: { score: 0.70, helpfulCount: 2, unhelpfulCount: 1 },
        advanced_rigor: { score: 0.92, helpfulCount: 5, unhelpfulCount: 0 },
      },
      retentionSchedules: {},
      activeInterventions: {},
      totalExercisesCompleted: 30,
      lastActiveTimestamp: Date.now(),
    });
  }

  assert(cohort.length === 24, 'Classroom cohort initialized with exactly 24 students');

  // ===========================================================================
  // 1. Cohort Mastery Heatmap Generation
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('🗺️ 1. Cohort Mastery Heatmap Matrix Generation');
  console.log('----------------------------------------------------------------');

  const heatmap = generateCohortMasteryHeatmap(cohort, trackedConcepts);
  const heatmapMatrix = heatmap.cells;
  const processedConceptSummaries = heatmap.conceptSummaries;

  // Validate Heatmap Dimensions
  const expectedTotalCells = 24 * 6; // 144 cells
  assert(heatmapMatrix.length === expectedTotalCells, `Heatmap generated all ${expectedTotalCells} individual student x concept cells`);
  assert(heatmapMatrix.every(cell => cell.accuracy >= 0 && cell.accuracy <= 1), 'All cell accuracies bounded between 0 and 1');

  const varSummary = processedConceptSummaries.find(s => s.conceptId === 'variables_types');
  assert(varSummary !== undefined, 'Found summary for variables_types');
  assert(varSummary!.colorTier === 'green', `variables_types cohort mastery is High/Green (${varSummary!.averageAccuracy * 100}%)`);

  const dynMemSummary = processedConceptSummaries.find(s => s.conceptId === 'dynamic_memory');
  assert(dynMemSummary !== undefined, 'Found summary for dynamic_memory');
  assert(dynMemSummary!.colorTier === 'red', `dynamic_memory cohort mastery is Critical/Red (${dynMemSummary!.averageAccuracy * 100}%)`);
  assert(dynMemSummary!.strugglingCount === 14, `Identified exactly 14 students in red zone for dynamic_memory: ${dynMemSummary!.strugglingCount}`);

  // ===========================================================================
  // 2. Low-Mastery Prerequisite Alert Dispatch
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('🚨 2. Low-Mastery Prerequisite Alert Dispatch');
  console.log('----------------------------------------------------------------');

  const clusters = detectStruggleClusters(cohort, 0.25);
  assert(clusters.length >= 1, `Detected struggle clusters: count=${clusters.length}`);

  const primaryCluster = clusters.find(c => c.conceptId === 'dynamic_memory');
  assert(primaryCluster !== undefined, 'dynamic_memory detected as a primary struggle cluster');
  assert(primaryCluster!.strugglingStudentCount === 14, `Cluster flags 14 struggling students: ${primaryCluster!.strugglingStudentCount}`);
  assert(primaryCluster!.struggleRatePercentage >= 50, `Struggle rate is ${primaryCluster!.struggleRatePercentage}% (>= 50%)`);
  assert(primaryCluster!.diagnosedPrerequisiteGap !== undefined, 'Diagnosed missing prerequisite gap');
  assert(primaryCluster!.diagnosedPrerequisiteGap?.prerequisiteId === 'pointers', 'Diagnosed "pointers" as root stumbling block');

  // Dispatch alert using canonical teacher intelligence engine
  const alertPayload = dispatchTeacherAlert('teacher_prof_alan_turing', primaryCluster!);
  const teacherAlertFeed: PrerequisiteAlertMessage[] = [alertPayload];

  assert(teacherAlertFeed.length === 1, 'Alert successfully dispatched to teacher alert feed');
  assert(teacherAlertFeed[0].severity === 'urgent', 'Alert severity tagged as "urgent"');
  assert(teacherAlertFeed[0].rootPrerequisiteId === 'pointers', 'Alert links directly to root prerequisite pointers');
  assert(teacherAlertFeed[0].suggestedClassAction.includes('worked-example review'), 'Alert includes concrete pedagogical action prompt');

  // ===========================================================================
  // 3. Curriculum Pacing Recommendations & Differentiated Grouping
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('⏱️ 3. Curriculum Pacing Recommendations & Differentiated Grouping');
  console.log('----------------------------------------------------------------');

  const pacingRec = evaluateCurriculumPacing('cs101_sec_b', clusters, processedConceptSummaries);
  assert(pacingRec.pacingDecision === 'decelerate_review', 'Pacing engine advises "decelerate_review" due to high struggle rate');
  assert(pacingRec.recommendedReviewHours === 2, 'Recommends 2 hours of prerequisite review');
  assert(pacingRec.nextPlannedModule.includes('Pointer Remediation'), 'Adapts next module to focus on remediation');

  // Differentiated Group Generation
  console.log('\n[Teacher] Automated Differentiated Instruction Grouping');
  const groups = generateDifferentiatedGroups(cohort, 'dynamic_memory');
  assert(groups.length === 3, `Cohort partitioned into exactly 3 differentiated instruction groups: count=${groups.length}`);

  const foundationalGroup = groups.find(g => g.id === 'group_foundational_scaffolding');
  assert(foundationalGroup !== undefined, 'Created Foundational Scaffolding Group');
  assert(foundationalGroup!.students.length === 14, `Foundational group contains all 14 struggling students: ${foundationalGroup!.students.length}`);
  assert(foundationalGroup!.recommendedPedagogy === 'worked_example', 'Recommends worked_example pedagogy');

  const fluencyGroup = groups.find(g => g.id === 'group_guided_practice');
  assert(fluencyGroup !== undefined, 'Created Guided Fluency Group');
  assert(fluencyGroup!.students.length === 6, `Fluency group contains 6 developing students: ${fluencyGroup!.students.length}`);
  assert(fluencyGroup!.recommendedPedagogy === 'scaffolded', 'Recommends scaffolded pedagogy');

  const advancedGroup = groups.find(g => g.id === 'group_advanced_socratic');
  assert(advancedGroup !== undefined, 'Created Advanced Socratic Group');
  assert(advancedGroup!.students.length === 4, `Advanced group contains 4 excelling students: ${advancedGroup!.students.length}`);
  assert(advancedGroup!.recommendedPedagogy === 'socratic', 'Recommends socratic pedagogy');

  // Verify full class compilation
  console.log('\n[Teacher] Full Dashboard Compilation Verification');
  const fullDashboard: TeacherDashboardData = compileTeacherDashboard(
    'cs101_sec_b',
    'CS101: Systems Programming',
    cohort
  );

  assert(fullDashboard.classId === 'cs101_sec_b', 'Dashboard compiled for cs101_sec_b');
  assert(fullDashboard.totalStudents === 24, 'Dashboard records 24 total students');
  assert(fullDashboard.struggleClusters.length >= 1, 'Dashboard embeds struggle clusters');
  assert(fullDashboard.differentiatedGroups.length === 3, 'Dashboard embeds 3 differentiated groups');
  assert(fullDashboard.actionRecommendations.length >= 1, 'Dashboard embeds educator action recommendations');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 TEACHER WORKFLOW VALIDATION COMPLETE: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('================================================================\n');

  return { passed: totalPassed, failed: totalFailed };
}

// Direct CLI execution guard
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('teacherWorkflowValidation');
if (isDirectRun) {
  runTeacherWorkflowValidationSuite().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Fatal error in Teacher Workflow Validation Suite:', err);
    process.exit(1);
  });
}
