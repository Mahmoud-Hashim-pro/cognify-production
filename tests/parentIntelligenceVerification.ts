/**
 * Parent Intelligence Verification Suite (Milestone 14)
 * Verifies weekly growth trajectories, celebrated breakthroughs, supportive home cues,
 * and rigorously tests the Zero-Chat-Snooping Privacy Shield.
 */

import {
  synthesizeWeeklyGrowth,
  detectCelebratedBreakthroughs,
  generateHomeDiscussionCues,
  compileParentDashboard,
} from '../src/lib/parentIntelligence';
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
  console.log('👨‍👩‍👧 RUNNING PARENT INTELLIGENCE ENGINE VERIFICATION (M14)');
  console.log('============================================================\n');

  // Build a test student state
  const mockStudent: StudentState = {
    uid: 'student_sami_2026',
    cognitiveStage: 'developing',
    activePedagogy: 'worked_example',
    conceptMastery: {
      pointers: {
        conceptId: 'pointers',
        accuracy: 0.82,
        attempts: 6,
        correct: 5,
        confidence: 0.85,
        consecutiveCorrect: 3,
        consecutiveIncorrect: 2, // Had initial struggle!
        lastTested: Date.now(),
        mistakeTypes: ['memory_leak'],
      },
      dynamic_memory: {
        conceptId: 'dynamic_memory',
        accuracy: 0.92,
        attempts: 5,
        correct: 5,
        confidence: 0.95,
        consecutiveCorrect: 4,
        consecutiveIncorrect: 0,
        lastTested: Date.now(),
        mistakeTypes: [],
      },
      arrays: {
        conceptId: 'arrays',
        accuracy: 0.88,
        attempts: 8,
        correct: 7,
        confidence: 0.90,
        consecutiveCorrect: 4,
        consecutiveIncorrect: 0,
        lastTested: Date.now(),
        mistakeTypes: [],
      },
      recursion: {
        conceptId: 'recursion',
        accuracy: 0.50,
        attempts: 3,
        correct: 1,
        confidence: 0.40,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 2,
        lastTested: Date.now(),
        mistakeTypes: ['stack_overflow'],
      },
    },
    learningStrain: {
      possibleStruggle: 0.35,
      confidence: 0.7,
      signals: [],
    },
    struggleSignal: 0.35,
    cognitiveLoadScore: 0.35,
    pedagogyEffectiveness: {
      worked_example: { score: 0.80, helpfulCount: 4, unhelpfulCount: 1 },
      socratic: { score: 0.60, helpfulCount: 2, unhelpfulCount: 1 },
      scaffolded: { score: 0.75, helpfulCount: 3, unhelpfulCount: 1 },
      analogies: { score: 0.70, helpfulCount: 2, unhelpfulCount: 1 },
      advanced_rigor: { score: 0.30, helpfulCount: 0, unhelpfulCount: 1 },
    },
    retentionSchedules: {},
    activeInterventions: {},
    totalExercisesCompleted: 22,
    lastActiveTimestamp: Date.now(),
  };

  // -------------------------------------------------------------------------
  // 1. Weekly Learning Growth Synthesis
  // -------------------------------------------------------------------------
  console.log('--- 1. Weekly Learning Growth Synthesis ---');
  const growth = synthesizeWeeklyGrowth(mockStudent, 2);
  assert(growth.conceptsMasteredCount === 3, `Mastered 3 concepts (pointers, dynamic_memory, arrays): ${growth.conceptsMasteredCount}`);
  assert(growth.growthPercentage === 50, `Calculates 50% weekly growth: ${growth.growthPercentage}%`);
  assert(growth.activeDaysCount >= 5, `Active days count derived: ${growth.activeDaysCount}`);
  assert(growth.practiceTimeMinutes > 50, `Estimates cumulative practice time: ${growth.practiceTimeMinutes} mins`);
  assert(growth.learningMomentum === 'accelerating', `Momentum marked as accelerating: ${growth.learningMomentum}`);

  // -------------------------------------------------------------------------
  // 2. Celebrated Breakthroughs Detection
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Celebrated Breakthroughs Detection ---');
  const breakthroughs = detectCelebratedBreakthroughs(mockStudent);
  assert(breakthroughs.length >= 2, `Detected at least 2 breakthroughs: count=${breakthroughs.length}`);

  const resilienceBreakthrough = breakthroughs.find((b) => b.type === 'resilience_breakthrough');
  assert(resilienceBreakthrough !== undefined, 'Identified resilience breakthrough for overcoming pointers struggle');
  assert(resilienceBreakthrough?.conceptId === 'pointers', 'Points to pointers as conquered struggle');
  assert(resilienceBreakthrough?.headlineEn.includes('Determination') || resilienceBreakthrough?.headlineEn.includes('Conquered'), 'Resilience headline praises grit');
  assert(resilienceBreakthrough?.headlineAr.includes('بالإصرار') || resilienceBreakthrough?.headlineAr.includes('تغلّب'), 'Arabic headline is localized');

  const masteryBreakthrough = breakthroughs.find((b) => b.type === 'mastery_leap');
  assert(masteryBreakthrough !== undefined, 'Identified mastery leap for dynamic_memory (accuracy >= 90%)');
  assert(masteryBreakthrough?.conceptId === 'dynamic_memory', 'Leap points to dynamic_memory');

  const streakMilestone = breakthroughs.find((b) => b.type === 'streak_milestone');
  assert(streakMilestone !== undefined, 'Identified streak/volume milestone for completing >= 15 exercises');

  // -------------------------------------------------------------------------
  // 3. Actionable Home Discussion Cues
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Actionable Home Discussion Cues ---');
  const cues = generateHomeDiscussionCues(mockStudent);
  assert(cues.length >= 2, `Generated at least 2 home discussion cues: count=${cues.length}`);

  const pointerCue = cues.find((c) => c.targetedConceptId === 'pointers');
  assert(pointerCue !== undefined, 'Generates home cue for pointers');
  assert(pointerCue?.conversationStarterEn.includes('addresses') || pointerCue?.conversationStarterEn.includes('pointers'), 'Starter uses intuitive real-world analogy');
  assert(pointerCue?.conversationStarterAr.includes('المؤشرات') || pointerCue?.conversationStarterAr.includes('عناوين'), 'Arabic starter is warmly localized');
  assert(pointerCue?.supportiveTipEn.length > 20, 'Includes positive supportive tip for parent');

  // -------------------------------------------------------------------------
  // 4. Strict Zero-Chat-Snooping Privacy Shield
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Strict Zero-Chat-Snooping Privacy Shield ---');
  const dashboard = compileParentDashboard(mockStudent, 'Sami', 2);

  assert(dashboard.privacyShield.isZeroChatSnoopingEnforced === true, 'Enforces Zero-Chat-Snooping Privacy Shield');
  assert(dashboard.privacyShield.rawMessagesExposed === 0, 'Guarantees exactly 0 raw messages exposed');
  assert(dashboard.privacyShield.chatTranscriptsBlocked === true, 'Chat transcripts are strictly blocked');
  assert(dashboard.privacyShield.studentPsychologicalSafetyGuaranteed === true, 'Student psychological safety is guaranteed');

  // Audit serialization: Ensure no chat transcript keys leak into parent data
  const jsonString = JSON.stringify(dashboard);
  assert(!jsonString.includes('"chatLogs"'), 'Zero chatLogs key present');
  assert(!jsonString.includes('"transcripts":'), 'Zero raw transcripts payload present');
  assert(!jsonString.includes('"rawMessages"'), 'Zero rawMessages key present');
  assert(!jsonString.includes('"messageContent"'), 'Zero messageContent key present');

  // -------------------------------------------------------------------------
  // 5. Full Parent Dashboard Compilation
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Full Parent Dashboard Compilation ---');
  assert(dashboard.studentUid === 'student_sami_2026', 'Embeds correct student UID');
  assert(dashboard.studentDisplayName === 'Sami', 'Embeds correct student display name');
  assert(dashboard.growthSummary.conceptsMasteredCount === 3, 'Embeds weekly growth summary');
  assert(dashboard.breakthroughs.length >= 2, 'Embeds celebrated breakthroughs');
  assert(dashboard.homeDiscussionCues.length >= 2, 'Embeds home discussion cues');

  // Summary
  console.log('\n============================================================');
  console.log(`📊 RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error(`❌ Suite failed with ${failedTests} failures.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passedTests} PARENT INTELLIGENCE TESTS PASSED (100%)!\n`);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
