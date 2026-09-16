/**
 * Cognify 2.0 - Real-World Persona Simulation Testbed (Phase D - Requirement 27)
 * tests/validation/studentSimulation.ts
 *
 * Simulates 3 distinct student learning personas across a 30-day curriculum:
 * 
 * 1. Student 1 ('Fast Learner'):
 *    - High accuracy (>= 90%)
 *    - Low response latency (1500 - 3500ms, well below strain threshold)
 *    - Rapid streak progression and promotion to Socratic / Advanced Rigor pedagogy
 *    - High retention stability (exponential SM-2 intervals, low decay risk < 0.20, mastered bucket)
 * 
 * 2. Student 2 ('Struggling Learner'):
 *    - High error streak (repeated errors on dynamic_memory)
 *    - High response latency (> 15000ms, triggering learning strain)
 *    - Triggers prerequisite gap diagnosis (detects pointers gap as root cause)
 *    - Adapts to Worked Examples with step-by-step physical analogies and RAM memory reasoning
 *    - Recovers mastery after guided practice, resolves intervention, confidence restored
 * 
 * 3. Student 3 ('Inconsistent / Retention Decay'):
 *    - Learns concept with initial success (pointers & variables_types)
 *    - Skips study days (simulates 10-14 day hiatus)
 *    - Triggers Ebbinghaus exponential decay warning (risk >= 0.65, flagged as atRisk)
 *    - Recovers through spaced micro-retrieval drills with latency-aware SM-2 quality evaluation
 */

import {
  createInitialStudentState,
  getStudentStateManager,
  StudentStateManager,
  computeConceptAnswerUpdate,
} from '../../src/lib/studentStateEngine.js';
import { diagnosePrerequisiteGap, CONCEPT_REGISTRY } from '../../src/lib/conceptGraph.js';
import {
  computeRetentionDecayRisk,
  categorizeRetentionState,
  generateMicroReview,
  evaluateMicroReviewSubmission,
  ONE_DAY_MS,
} from '../../src/lib/retentionProductEngine.js';
import { calculateNextReview, RetentionSchedule } from '../../src/lib/spacedRetention.js';
import { buildPersona, Profile } from '../../api/_lib/ai.js';

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

export async function runStudentSimulationSuite(): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🎓 RUNNING 30-DAY MULTI-PERSONA STUDENT SIMULATION TESTBED');
  console.log('================================================================\n');

  // ===========================================================================
  // PERSONA 1: Fast Learner ('student_fast_alex')
  // ===========================================================================
  console.log('----------------------------------------------------------------');
  console.log('🚀 Persona 1: Fast Learner (Alex) - High Accuracy, Rapid Promotion');
  console.log('----------------------------------------------------------------');

  const fastStudentUid = `student_fast_alex_${Date.now()}`;
  const fastMgr = new StudentStateManager(fastStudentUid, 'Intermediate');
  const fastProfile: Profile = {
    uid: fastStudentUid,
    level: 'Intermediate',
    role: 'Student',
    field: 'Computer Science',
    language: 'English',
    accessibilityMode: 'None',
  };

  // Day 1 to Day 10: Foundational modules (variables_types, control_flow, functions)
  console.log('\n[Alex - Days 1-10] Foundational Curriculum Acceleration');
  const foundationalConcepts = ['variables_types', 'control_flow', 'functions'];
  for (const concept of foundationalConcepts) {
    // 3 rapid, correct attempts per concept with latency 2100-3200ms
    for (let attempt = 1; attempt <= 3; attempt++) {
      const latency = 2000 + Math.floor(Math.random() * 1200);
      fastMgr.recordAnswer(concept, true, latency);
    }
  }

  let fastState = fastMgr.getState();
  assert(fastState.totalExercisesCompleted === 9, 'Alex completed 9 foundational exercises');
  assert(fastState.conceptMastery['variables_types'].accuracy === 1.0, 'Variables & Types accuracy is 100%');
  assert(fastState.conceptMastery['functions'].consecutiveCorrect === 3, 'Functions consecutive correct reached 3');
  assert(fastState.learningStrain.possibleStruggle <= 0.25, 'Learning strain remains low (< 0.25)');
  assert(fastState.learningStrain.signals.length === 0, 'Zero struggle signals detected');

  // Day 11 to Day 20: Advanced concepts (pointers & heap_stack)
  console.log('\n[Alex - Days 11-20] Promotion to Socratic Pedagogy on Advanced Topics');
  // Answer pointers with consistent high accuracy and quick answers
  const pRes1 = fastMgr.recordAnswer('pointers', true, 2800);
  const pRes2 = fastMgr.recordAnswer('pointers', true, 2400);
  const pRes3 = fastMgr.recordAnswer('pointers', true, 2200); // 3rd consecutive correct

  fastState = pRes3.state;
  const pointersRecord = fastState.conceptMastery['pointers'];
  assert(pointersRecord.consecutiveCorrect === 3, 'Alex achieved 3 consecutive correct in pointers');
  assert(pointersRecord.accuracy === 1.0, 'Pointers accuracy is 100%');
  assert(pRes3.intervention?.strategy === 'socratic', 'Promoted to Socratic challenge strategy on 3-in-a-row');
  assert(pRes3.intervention?.recommendedAction === 'advance_difficulty', 'Recommended action is advance_difficulty');
  assert(fastState.activePedagogy === 'socratic', 'Active pedagogy elevated to socratic');

  // Validate System Prompt reflects Socratic / Rigorous Inquiry
  const fastPrompt = buildPersona(fastProfile, '', fastState);
  assert(
    fastPrompt.includes('Strategy: socratic') || fastPrompt.includes('Strategy: SOCRATIC'),
    'Prompt contains Strategy: socratic'
  );
  assert(
    fastPrompt.includes('SOCRATIC INQUIRY') || fastPrompt.includes('ADVANCED MASTERY'),
    'Prompt directs AI to challenge student with deep theoretical edge cases'
  );

  // Day 21 to Day 30: Spaced Retention Stability
  console.log('\n[Alex - Days 21-30] Longitudinal Spaced Retention Stability');
  let pointersSchedule = fastState.retentionSchedules['pointers'];
  assert(pointersSchedule !== undefined, 'Pointers retention schedule initialized');

  // Simulate successful reviews advancing SM-2 repetitions across curriculum
  const simulatedTimeDay25 = Date.now() + (25 * ONE_DAY_MS);
  for (let rep = 0; rep < 3; rep++) {
    pointersSchedule = calculateNextReview(pointersSchedule, 5); // Quality 5: perfect recall
  }
  // Align simulated future review date to Day 25
  pointersSchedule.lastReviewDate = simulatedTimeDay25;
  pointersSchedule.nextReviewDate = simulatedTimeDay25 + (pointersSchedule.intervalDays * ONE_DAY_MS);
  fastState.retentionSchedules['pointers'] = pointersSchedule;

  // Alex keeps up with reviews for other concepts as well
  for (const cid of foundationalConcepts) {
    if (fastState.retentionSchedules[cid]) {
      const sch = fastState.retentionSchedules[cid];
      sch.lastReviewDate = simulatedTimeDay25;
      sch.nextReviewDate = simulatedTimeDay25 + (14 * ONE_DAY_MS);
      sch.repetitions = 3;
      sch.status = 'retained';
    }
  }

  const pointersRisk = computeRetentionDecayRisk(pointersSchedule, simulatedTimeDay25);
  assert(pointersSchedule.repetitions >= 4, `Alex logged ${pointersSchedule.repetitions} successful repetitions`);
  assert(pointersSchedule.intervalDays >= 15, `Interval expanded exponentially to ${pointersSchedule.intervalDays} days`);
  assert(pointersSchedule.easeFactor >= 2.5, `Ease factor maintained at high level: ${pointersSchedule.easeFactor}`);
  assert(pointersSchedule.status === 'retained', 'Pointers status marked as "retained"');
  assert(pointersRisk < 0.20, `Retention decay risk is very low: ${(pointersRisk * 100).toFixed(1)}%`);

  const retentionCategories = categorizeRetentionState(fastState.retentionSchedules, fastState, simulatedTimeDay25);
  assert(retentionCategories.atRisk.length === 0, 'Alex has 0 concepts at risk');
  assert(
    retentionCategories.mastered.some(item => item.conceptId === 'pointers'),
    'Pointers categorized into "mastered" bucket'
  );

  // ===========================================================================
  // PERSONA 2: Struggling Learner ('student_struggling_maya')
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('🛑 Persona 2: Struggling Learner (Maya) - Prerequisite Gap & Recovery');
  console.log('----------------------------------------------------------------');

  const strugglingStudentUid = `student_struggling_maya_${Date.now()}`;
  const strugglingMgr = new StudentStateManager(strugglingStudentUid, 'Basic');
  const strugglingProfile: Profile = {
    uid: strugglingStudentUid,
    level: 'Basic',
    role: 'Student',
    field: 'Computer Science',
    language: 'English',
    accessibilityMode: 'None',
  };

  // Maya previously had high struggle on pointers (prerequisite)
  strugglingMgr.recordAnswer('pointers', false, 16000, 'dereference_confusion');
  strugglingMgr.recordAnswer('pointers', false, 17000, 'address_of_confusion');

  // Maya attempts dynamic_memory and struggles
  console.log('\n[Maya - Day 5] Prerequisite Gap Trigger on Dynamic Memory');
  // Attempt 1: High latency incorrect on dynamic_memory
  strugglingMgr.recordAnswer('dynamic_memory', false, 18500, 'uninitialized_pointer_dereference');
  // Attempt 2: Repeated failure with severe hesitation (21s)
  const dynMemStruggleRes = strugglingMgr.recordAnswer('dynamic_memory', false, 21000, 'memory_leak_confusion');
  
  let mayaState = dynMemStruggleRes.state;
  const dynMemRecord = mayaState.conceptMastery['dynamic_memory'];
  assert(dynMemRecord.consecutiveIncorrect === 2, 'Maya has 2 consecutive incorrect answers on dynamic_memory');
  assert(dynMemRecord.accuracy === 0.0, 'Accuracy is 0%');
  assert(mayaState.learningStrain.signals.includes('high_response_latency'), 'Signals include high_response_latency (>15s)');
  assert(mayaState.learningStrain.signals.includes('repeated_errors'), 'Signals include repeated_errors');
  assert(mayaState.learningStrain.possibleStruggle >= 0.75, `Learning strain elevated to high struggle: ${mayaState.learningStrain.possibleStruggle}`);

  // Prerequisite Root-Cause Gap Diagnosis
  console.log('\n[Maya] Prerequisite Root-Cause Diagnosis Verification');
  const prereqDiagnosis = diagnosePrerequisiteGap('dynamic_memory', mayaState.conceptMastery);
  assert(prereqDiagnosis.hasPrerequisiteGap === true, 'Identified prerequisite gap for dynamic_memory');
  assert(
    prereqDiagnosis.missingPrerequisites.includes('pointers') ||
    prereqDiagnosis.rootGapConcept?.id === 'pointers',
    'Diagnosed missing prerequisite: "pointers"'
  );
  assert(prereqDiagnosis.explanationEn.length > 20, 'Generated explanatory prerequisite diagnosis rationale');
  assert(dynMemStruggleRes.intervention?.recommendedAction === 'review_prerequisite', 'Intervention advises review_prerequisite');

  // Pedagogical Adaptation on Prerequisite: Worked Example on Pointers
  console.log('\n[Maya] Pedagogical Adaptation to Worked Examples on Prerequisite (Pointers)');
  const pointerStruggleRes = strugglingMgr.recordAnswer('pointers', false, 19000, 'dereference_confusion');
  mayaState = pointerStruggleRes.state;

  assert(pointerStruggleRes.intervention !== undefined, 'Adaptive intervention generated for pointers');
  assert(pointerStruggleRes.intervention?.strategy === 'worked_example', 'Strategy shifted to "worked_example"');
  assert(pointerStruggleRes.intervention?.recommendedAction === 'show_worked_example', 'Action is "show_worked_example"');
  assert(mayaState.activePedagogy === 'worked_example', 'Active student state pedagogy is "worked_example"');

  const mayaPrompt = buildPersona(strugglingProfile, '', mayaState);
  assert(
    mayaPrompt.includes('## MANDATORY PEDAGOGICAL INTERVENTION (HIGHEST OVERRIDE PRIORITY)'),
    'Prompt injects mandatory override header'
  );
  assert(
    mayaPrompt.includes('PHYSICAL ANALOGY FIRST'),
    'Prompt requires physical real-world analogy before code syntax'
  );
  assert(
    mayaPrompt.includes('NUMBERED STEP-BY-STEP WORKED EXAMPLE'),
    'Prompt mandates numbered step-by-step worked example'
  );
  assert(
    mayaPrompt.includes('INLINE MEMORY REASONING'),
    'Prompt requires inline memory address (0x1000) reasoning'
  );
  assert(
    mayaPrompt.includes('FORMATIVE MICRO-CHECK'),
    'Prompt mandates 1-click formative micro-check'
  );

  // Recovery: Guided Practice on Pointers then Dynamic Memory Mastery
  console.log('\n[Maya - Remediation & Recovery] Mastering Pointers and Conquering Dynamic Memory');
  // Maya solves the formative micro-check on pointers
  const pointerRecovery = strugglingMgr.recordAnswer('pointers', true, 5500);
  assert(pointerRecovery.state.conceptMastery['pointers'].consecutiveCorrect === 1, 'Maya solved pointers micro-check');
  assert(pointerRecovery.intervention?.strategy === 'scaffolded', 'Pointers crisis resolved back to scaffolded');

  // Maya returns to dynamic_memory with solid foundation
  strugglingMgr.recordAnswer('dynamic_memory', true, 6200);
  const recoveryRes2 = strugglingMgr.recordAnswer('dynamic_memory', true, 5800);
  
  mayaState = recoveryRes2.state;
  const recoveredRecord = mayaState.conceptMastery['dynamic_memory'];
  assert(recoveredRecord.consecutiveCorrect === 2, 'Maya achieved 2 consecutive correct answers on dynamic_memory after remediation');
  assert(recoveredRecord.consecutiveIncorrect === 0, 'Consecutive incorrect reset to 0');
  assert(recoveredRecord.confidence > 0.50, 'Confidence recovered above 0.50');
  assert(
    recoveryRes2.intervention?.strategy === 'scaffolded' ||
    recoveryRes2.intervention?.recommendedAction !== 'show_worked_example',
    'Crisis intervention resolved: Transitioned back to guided practice'
  );

  // ===========================================================================
  // PERSONA 3: Inconsistent / Retention Decay ('student_decay_sam')
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('⏳ Persona 3: Inconsistent Learner (Sam) - Ebbinghaus Decay & Recovery');
  console.log('----------------------------------------------------------------');

  const decayStudentUid = `student_decay_sam_${Date.now()}`;
  const decayMgr = new StudentStateManager(decayStudentUid, 'Intermediate');

  // Day 1: Sam learns pointers successfully
  console.log('\n[Sam - Day 1] Initial Learning & Retention Schedule Setup');
  decayMgr.recordAnswer('pointers', true, 4100);
  decayMgr.recordAnswer('pointers', true, 3900);
  
  let samState = decayMgr.getState();
  let samPointersSchedule = samState.retentionSchedules['pointers'];
  assert(samPointersSchedule !== undefined, 'Retention schedule created for pointers on Day 1');
  assert(samPointersSchedule.status === 'learning', 'Initial status is "learning"');

  // Simulate 14 days of complete absence / inactivity
  console.log('\n[Sam - Day 15] 14-Day Study Gap & Ebbinghaus Decay Warning Trigger');
  const fourteenDaysMs = 14 * ONE_DAY_MS;
  const simulatedTimeDay15 = Date.now() + fourteenDaysMs;

  // Calculate Ebbinghaus memory decay risk
  const decayRisk = computeRetentionDecayRisk(samPointersSchedule, simulatedTimeDay15);
  console.log(`  📊 Calculated Ebbinghaus Decay Risk after 14 days: ${(decayRisk * 100).toFixed(1)}%`);
  assert(decayRisk >= 0.65, `Memory decay risk escalated to high danger zone (>= 0.65): ${decayRisk}`);

  const samRetentionState = categorizeRetentionState(samState.retentionSchedules, samState, simulatedTimeDay15);
  assert(samRetentionState.atRisk.length >= 1, 'At least 1 concept flagged in "atRisk" bucket');
  const atRiskItem = samRetentionState.atRisk.find(i => i.conceptId === 'pointers');
  assert(atRiskItem !== undefined, 'Pointers identified as critically at risk of forgetting');
  assert(atRiskItem!.daysOverdue > 10, `Pointers is overdue by ${atRiskItem!.daysOverdue} days`);

  // Remediation via Spaced Micro-Retrieval Drill
  console.log('\n[Sam - Day 15 Recovery] Spaced Micro-Retrieval Drill Execution');
  const microQuestion = generateMicroReview('pointers');
  assert(microQuestion.conceptId === 'pointers', 'Generated targeted high-yield micro-review question');
  assert(microQuestion.options.length === 4, 'Micro-review has 4 multiple choice options');
  assert(microQuestion.correctIndex === 0, 'Target option correctly indexed');

  // Sam submits correct answer within prompt time (4500ms -> fluency score 5)
  const reviewSubmission = {
    conceptId: 'pointers',
    selectedIndex: microQuestion.correctIndex,
    responseTimeMs: 4500,
    timestamp: simulatedTimeDay15,
  };

  const reviewResult = evaluateMicroReviewSubmission(reviewSubmission, samPointersSchedule);
  assert(reviewResult.isCorrect === true, 'Sam solved the micro-review question correctly');
  assert(reviewResult.qualityScore === 5, 'Awarded highest quality recall score (5) for fast accurate retrieval');
  assert(reviewResult.newIntervalDays >= 3, `SM-2 review interval refreshed to ${reviewResult.newIntervalDays} days`);

  // Update schedule and verify risk normalized
  samPointersSchedule = {
    ...samPointersSchedule,
    repetitions: samPointersSchedule.repetitions + 1,
    intervalDays: reviewResult.newIntervalDays,
    lastReviewDate: simulatedTimeDay15,
    nextReviewDate: simulatedTimeDay15 + (reviewResult.newIntervalDays * ONE_DAY_MS),
    easeFactor: reviewResult.updatedEaseFactor,
    status: reviewResult.status as RetentionSchedule['status'],
  };
  samState.retentionSchedules['pointers'] = samPointersSchedule;

  const refreshedRisk = computeRetentionDecayRisk(samPointersSchedule, simulatedTimeDay15);
  console.log(`  📊 Refreshed Retention Risk Post-Drill: ${(refreshedRisk * 100).toFixed(1)}%`);
  assert(refreshedRisk < 0.20, `Retention risk successfully restored to safe level (< 0.20): ${refreshedRisk}`);

  const postReviewCategories = categorizeRetentionState(samState.retentionSchedules, samState, simulatedTimeDay15);
  assert(postReviewCategories.atRisk.length === 0, 'Zero concepts remaining in atRisk bucket after micro-drill');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 30-DAY STUDENT SIMULATION COMPLETE: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('================================================================\n');

  return { passed: totalPassed, failed: totalFailed };
}

// Direct CLI execution guard
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('studentSimulation');
if (isDirectRun) {
  runStudentSimulationSuite().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Fatal error in Student Simulation Suite:', err);
    process.exit(1);
  });
}
