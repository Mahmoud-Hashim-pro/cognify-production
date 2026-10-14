/**
 * Milestone 13: Teacher Intelligence Automated Verification Suite
 *
 * Verifies:
 * 1. Classroom concept mastery aggregation across heterogeneous students
 * 2. Struggle cluster detection and root prerequisite gap diagnosis
 * 3. Class-wide pedagogical strategy efficacy ranking
 * 4. Differentiated instruction group generation (Foundational, Fluency, Advanced Socratic)
 * 5. Actionable pedagogical recommendations synthesis for educators
 */

import {
  detectStruggleClusters,
  evaluateClassInterventionEfficacy,
  generateDifferentiatedGroups,
  generateTeacherRecommendations,
  compileTeacherDashboard,
} from '../src/lib/teacherIntelligence.js';

import type { StudentState } from '../src/types/studentState.js';

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
  console.log('👨‍🏫 RUNNING TEACHER INTELLIGENCE ENGINE VERIFICATION (M13)');
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // MOCK DATA: 20 Students with mixed performance in Computer Science 101
  // -------------------------------------------------------------------------
  const mockStudents: StudentState[] = [];

  // 12 Students struggling with dynamic_memory (root cause: pointers)
  for (let i = 1; i <= 12; i++) {
    mockStudents.push({
      uid: `student_struggler_${i}`,
      cognitiveStage: 'foundational',
      activePedagogy: 'scaffolded',
      conceptMastery: {
        pointers: {
          conceptId: 'pointers',
          accuracy: 0.45,
          attempts: 6,
          correct: 2,
          confidence: 0.4,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 3,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
        dynamic_memory: {
          conceptId: 'dynamic_memory',
          accuracy: 0.35,
          attempts: 5,
          correct: 1,
          confidence: 0.3,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 3,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
      },
      learningStrain: {
        possibleStruggle: 0.75,
        confidence: 0.8,
        signals: ['repeated_errors', 'high_response_latency'],
      },
      struggleSignal: 0.75,
      cognitiveLoadScore: 0.75,
      pedagogyEffectiveness: {
        worked_example: { score: 0.85, helpfulCount: 4, unhelpfulCount: 1 },
        socratic: { score: 0.25, helpfulCount: 1, unhelpfulCount: 5 },
        scaffolded: { score: 0.60, helpfulCount: 3, unhelpfulCount: 2 },
        analogies: { score: 0.50, helpfulCount: 2, unhelpfulCount: 2 },
        advanced_rigor: { score: 0.20, helpfulCount: 0, unhelpfulCount: 2 },
      },
      retentionSchedules: {},
      activeInterventions: {},
      totalExercisesCompleted: 15,
      lastActiveTimestamp: Date.now(),
    });
  }

  // 8 Students who have mastered pointers and are excelling
  for (let i = 1; i <= 8; i++) {
    mockStudents.push({
      uid: `student_master_${i}`,
      cognitiveStage: 'advanced',
      activePedagogy: 'socratic',
      conceptMastery: {
        pointers: {
          conceptId: 'pointers',
          accuracy: 0.95,
          attempts: 8,
          correct: 7,
          confidence: 0.9,
          consecutiveCorrect: 5,
          consecutiveIncorrect: 0,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
        dynamic_memory: {
          conceptId: 'dynamic_memory',
          accuracy: 0.85,
          attempts: 6,
          correct: 5,
          confidence: 0.85,
          consecutiveCorrect: 4,
          consecutiveIncorrect: 0,
          lastTested: Date.now(),
          mistakeTypes: [],
        },
      },
      learningStrain: {
        possibleStruggle: 0.15,
        confidence: 0.7,
        signals: [],
      },
      struggleSignal: 0.15,
      cognitiveLoadScore: 0.15,
      pedagogyEffectiveness: {
        worked_example: { score: 0.70, helpfulCount: 3, unhelpfulCount: 1 },
        socratic: { score: 0.92, helpfulCount: 6, unhelpfulCount: 0 },
        scaffolded: { score: 0.75, helpfulCount: 4, unhelpfulCount: 1 },
        analogies: { score: 0.65, helpfulCount: 2, unhelpfulCount: 1 },
        advanced_rigor: { score: 0.85, helpfulCount: 4, unhelpfulCount: 1 },
      },
      retentionSchedules: {},
      activeInterventions: {},
      totalExercisesCompleted: 24,
      lastActiveTimestamp: Date.now(),
    });
  }

  // -------------------------------------------------------------------------
  // 1. Struggle Cluster Detection
  // -------------------------------------------------------------------------
  console.log('--- 1. Struggle Cluster Detection ---');
  const clusters = detectStruggleClusters(mockStudents, 0.25);
  assert(clusters.length >= 2, `Detected at least 2 struggle clusters: count=${clusters.length}`);

  const dynamicMemoryCluster = clusters.find((c) => c.conceptId === 'dynamic_memory');
  assert(dynamicMemoryCluster !== undefined, 'dynamic_memory detected as struggle cluster');
  assert(dynamicMemoryCluster?.strugglingStudentCount === 12, `Detected exactly 12 struggling students: ${dynamicMemoryCluster?.strugglingStudentCount}`);
  assert(dynamicMemoryCluster?.struggleRatePercentage === 60, `Struggle rate is 60% (12/20): ${dynamicMemoryCluster?.struggleRatePercentage}%`);
  assert(dynamicMemoryCluster?.diagnosedPrerequisiteGap !== undefined, 'Diagnosed missing prerequisite gap for cluster');
  assert(dynamicMemoryCluster?.diagnosedPrerequisiteGap?.prerequisiteId === 'pointers', 'Identified pointers as root stumbling block');

  // -------------------------------------------------------------------------
  // 2. Class Pedagogical Efficacy Ranking
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Class Pedagogical Strategy Efficacy ---');
  const efficacy = evaluateClassInterventionEfficacy(mockStudents);
  assert(efficacy.worked_example !== undefined, 'Evaluates worked_example strategy');
  assert(efficacy.socratic !== undefined, 'Evaluates socratic strategy');
  assert(efficacy.worked_example.attemptsCount > 0, 'Aggregates strategy attempts count across class');
  assert(efficacy.worked_example.isCalibrated === true, 'Calibrated based on sample size >= 3');
  assert(efficacy.worked_example.efficacyRate >= 0.70, `Worked example demonstrates high efficacy rate: ${efficacy.worked_example.efficacyRate}`);

  // -------------------------------------------------------------------------
  // 3. Differentiated Instruction Grouping
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Automated Differentiated Instruction Grouping ---');
  const groups = generateDifferentiatedGroups(mockStudents, 'dynamic_memory');
  assert(groups.length >= 2, `Partitions cohort into differentiated groups: count=${groups.length}`);

  const foundationalGroup = groups.find((g) => g.id === 'group_foundational_scaffolding');
  assert(foundationalGroup !== undefined, 'Identifies foundational scaffolding group');
  assert(foundationalGroup?.students.length === 12, `Foundational group contains all 12 struggling students: ${foundationalGroup?.students.length}`);
  assert(foundationalGroup?.recommendedPedagogy === 'worked_example', 'Recommends worked_example pedagogy for struggling cohort');

  const advancedGroup = groups.find((g) => g.id === 'group_advanced_socratic');
  assert(advancedGroup !== undefined, 'Identifies advanced socratic inquiry group');
  assert(advancedGroup?.students.length === 8, `Advanced group contains all 8 high-performing students: ${advancedGroup?.students.length}`);
  assert(advancedGroup?.recommendedPedagogy === 'socratic', 'Recommends socratic pedagogy for advanced cohort');

  // -------------------------------------------------------------------------
  // 4. Actionable Educator Recommendations
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Actionable Educator Recommendations ---');
  const recommendations = generateTeacherRecommendations(clusters, efficacy);
  assert(recommendations.length >= 2, `Synthesizes pedagogical recommendations: count=${recommendations.length}`);

  const prereqRec = recommendations.find((r) => r.category === 'prerequisite_review');
  assert(prereqRec !== undefined, 'Generates prerequisite review recommendation');
  assert(prereqRec?.actionPromptEn.includes('pointers') || prereqRec?.actionPromptEn.includes('Pointers'), 'Recommendation advises reviewing pointers in next lecture');
  assert(prereqRec?.actionPromptAr.includes('المؤشرات') || prereqRec?.actionPromptAr.includes('المتطلب'), 'Arabic recommendation is localized');

  // -------------------------------------------------------------------------
  // 5. Full Teacher Dashboard Compilation
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Full Teacher Dashboard Compilation ---');
  const dashboard = compileTeacherDashboard('cs101_sec_a', 'CS101: Intro to Computer Science', mockStudents);
  assert(dashboard.classId === 'cs101_sec_a', 'Dashboard records class ID');
  assert(dashboard.totalStudents === 20, 'Dashboard records total students (20)');
  assert(dashboard.struggleClusters.length >= 2, 'Dashboard embeds struggle clusters');
  assert(dashboard.differentiatedGroups.length >= 2, 'Dashboard embeds differentiated groups');
  assert(dashboard.actionRecommendations.length >= 2, 'Dashboard embeds action recommendations');

  // Summary
  console.log('\n============================================================');
  console.log(`📊 RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error(`❌ Suite failed with ${failedTests} failures.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passedTests} TEACHER INTELLIGENCE TESTS PASSED (100%)!\n`);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
