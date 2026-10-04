/**
 * Cognitive & Executive Function Engine 2.0 Verification Suite
 * Milestone 26: Go/No-Go, Working Memory, Rule Switching, ADHD Slicer & Dyscalculia Modeler.
 */

import {
  generateGoNoGoSession,
  evaluateGoNoGoPerformance,
  generateMemoryGridSequence,
  evaluateMemoryGridAnswer,
  TARGET_REFERENCE_CARDS,
  generateRandomTestCard,
  checkSetShiftingMatch,
  pickNextShiftingRule,
  generateStroopTrial,
  sliceTaskIntoMicroSteps,
  buildTenFrame,
  CUISENAIRE_RODS,
  generateConcreteMathProblem,
  evaluateCompassionateStreak,
  AmbientNoiseSynthesizer,
} from '../src/lib/cognitiveEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

export async function runCognitiveEngineVerification(): Promise<{ passed: number; failed: number }> {
  passed = 0;
  failed = 0;
  console.log(`\n[26] Cognitive & Executive Function Engine 2.0 Verification`);

  // ─── 1. GO / NO-GO INHIBITORY CONTROL TESTS ────────────────────────────────
  const easySession = generateGoNoGoSession(10, 'easy');
  assert(easySession.length === 10, 'Go/No-Go generates exact requested trial count (10)');
  assert(easySession.every(t => t.durationMs === 1200), 'Easy Go/No-Go sets generous 1200ms stimulus duration');

  const hardSession = generateGoNoGoSession(20, 'hard');
  assert(hardSession.length === 20, 'Hard Go/No-Go generates 20 trials');
  assert(hardSession.every(t => t.durationMs === 600), 'Hard Go/No-Go sets rapid 600ms stimulus duration');

  const sampleTrials = [
    { id: 't1', isGo: true, symbol: '🍏', labelEn: 'Apple', labelAr: 'تفاحة', durationMs: 800 },
    { id: 't2', isGo: true, symbol: '⭐', labelEn: 'Star', labelAr: 'نجمة', durationMs: 800 },
    { id: 't3', isGo: false, symbol: '💣', labelEn: 'Bomb', labelAr: 'قنبلة', durationMs: 800 },
    { id: 't4', isGo: false, symbol: '🔴', labelEn: 'Stop', labelAr: 'قف', durationMs: 800 },
  ];

  // Perfect user: clicked on t1, t2; did not click on t3, t4
  const perfectResp = [
    { trialId: 't1', userClicked: true, reactionTimeMs: 350 },
    { trialId: 't2', userClicked: true, reactionTimeMs: 400 },
    { trialId: 't3', userClicked: false, reactionTimeMs: 0 },
    { trialId: 't4', userClicked: false, reactionTimeMs: 0 },
  ];
  const perfectEval = evaluateGoNoGoPerformance(sampleTrials, perfectResp);
  assert(perfectEval.goAccuracy === 100, 'Go accuracy is 100% when all targets clicked');
  assert(perfectEval.noGoAccuracy === 100, 'No-Go accuracy is 100% when all traps avoided');
  assert(perfectEval.commissionErrors === 0, 'Zero commission errors when no traps are tapped');
  assert(perfectEval.meanReactionTimeMs === 375, 'Mean reaction time correctly calculated ((350+400)/2 = 375ms)');
  assert(perfectEval.grade === 'excellent', 'Grade is excellent for high inhibitory performance');

  // Impulsive user: clicked on t3 (commission error) and missed t2 (omission error)
  const impulsiveResp = [
    { trialId: 't1', userClicked: true, reactionTimeMs: 250 },
    { trialId: 't2', userClicked: false, reactionTimeMs: 0 },
    { trialId: 't3', userClicked: true, reactionTimeMs: 280 }, // Trap clicked!
    { trialId: 't4', userClicked: false, reactionTimeMs: 0 },
  ];
  const impulsiveEval = evaluateGoNoGoPerformance(sampleTrials, impulsiveResp);
  assert(impulsiveEval.commissionErrors === 1, 'Correctly flags 1 commission error (trap clicked)');
  assert(impulsiveEval.omissionErrors === 1, 'Correctly flags 1 omission error (target missed)');
  assert(impulsiveEval.noGoAccuracy === 50, 'No-Go accuracy is 50% when 1 of 2 traps triggered');

  // ─── 2. WORKING MEMORY GRID TESTS ──────────────────────────────────────────
  const wmRound = generateMemoryGridSequence(4, 3, false);
  assert(wmRound.gridSize === 3, 'Default grid size is 3x3');
  assert(wmRound.sequence.length === 4, 'Memory grid generates exact sequence length 4');
  assert(wmRound.sequence.every(idx => idx >= 0 && idx < 9), 'All sequence indices within 3x3 bounds (0-8)');

  const forwardEval = evaluateMemoryGridAnswer(wmRound, [...wmRound.sequence]);
  assert(forwardEval.isCorrect === true, 'Forward recall matches exact sequence');
  assert(forwardEval.matchedCount === 4, 'Forward recall matches all 4 positions');

  const reverseRound = generateMemoryGridSequence(3, 3, true);
  const correctReverse = [...reverseRound.sequence].reverse();
  const reverseEval = evaluateMemoryGridAnswer(reverseRound, correctReverse);
  assert(reverseEval.isCorrect === true, 'Reverse span correctly evaluates inverted sequence');

  const incorrectEval = evaluateMemoryGridAnswer(wmRound, [8, 8, 8, 8]);
  assert(incorrectEval.isCorrect === false, 'Detects incorrect memory sequence input');

  // ─── 3. COGNITIVE SET-SHIFTING (WISCONSIN STYLE) ───────────────────────────
  assert(TARGET_REFERENCE_CARDS.length === 4, 'Target reference cards contain 4 standard targets');
  assert(TARGET_REFERENCE_CARDS[0].color === 'red' && TARGET_REFERENCE_CARDS[0].shape === 'circle', 'Card 1 is Red Circle 1');
  assert(TARGET_REFERENCE_CARDS[1].color === 'blue' && TARGET_REFERENCE_CARDS[1].shape === 'square', 'Card 2 is Blue Square 2');
  assert(TARGET_REFERENCE_CARDS[2].color === 'green' && TARGET_REFERENCE_CARDS[2].shape === 'triangle', 'Card 3 is Green Triangle 3');
  assert(TARGET_REFERENCE_CARDS[3].color === 'yellow' && TARGET_REFERENCE_CARDS[3].shape === 'star', 'Card 4 is Yellow Star 4');

  const testCard = { id: 'test_1', color: 'blue' as const, shape: 'circle' as const, count: 3 as const };
  // Matching by color: should match card 2 (blue)
  assert(checkSetShiftingMatch(testCard, TARGET_REFERENCE_CARDS[1], 'color') === true, 'Color rule matches Blue card');
  assert(checkSetShiftingMatch(testCard, TARGET_REFERENCE_CARDS[0], 'color') === false, 'Color rule rejects Red card');

  // Matching by shape: should match card 1 (circle)
  assert(checkSetShiftingMatch(testCard, TARGET_REFERENCE_CARDS[0], 'shape') === true, 'Shape rule matches Circle card');

  // Matching by count: should match card 3 (count 3)
  assert(checkSetShiftingMatch(testCard, TARGET_REFERENCE_CARDS[2], 'count') === true, 'Count rule matches Count 3 card');

  const nextRule = pickNextShiftingRule('color');
  assert(nextRule === 'shape' || nextRule === 'count', 'Shifting rule dynamically transitions away from color');

  // ─── 4. STROOP ATTENTION FILTER TESTS ─────────────────────────────────────
  const stroopSample = generateStroopTrial();
  assert(typeof stroopSample.wordText === 'string' && stroopSample.wordText.length > 0, 'Stroop generates localized word text');
  assert(typeof stroopSample.inkColorHex === 'string' && stroopSample.inkColorHex.startsWith('#'), 'Stroop generates valid hex color');
  assert(['red', 'blue', 'green', 'yellow'].includes(stroopSample.colorName), 'Stroop colorName is valid color enum');

  // ─── 5. ADHD TASK SLICER (EXECUTIVE UNBLOCKER) TESTS ──────────────────────
  const essayTask = sliceTaskIntoMicroSteps('كتابة مقال فلسفة عن الوعي');
  assert(essayTask.steps.length >= 4, 'Essay task sliced into at least 4 micro-steps');
  assert(essayTask.steps.every(s => s.estMinutes <= 3), 'All essay micro-steps are <= 3 minutes to prevent executive friction');
  assert(essayTask.steps.every(s => s.dopamineBonus >= 10), 'Every micro-step awards a positive dopamine bonus');

  const mathTask = sliceTaskIntoMicroSteps('حل شيت فيزياء الحركة الموجية');
  assert(mathTask.steps.some(s => s.titleAr.includes('المعطيات')), 'Math task includes concrete given-extraction scaffold');

  const defaultTask = sliceTaskIntoMicroSteps('مهمة مجهولة');
  assert(defaultTask.steps.length === 3, 'Generic task decomposes into 3 momentum steps');

  // ─── 6. DYSCALCULIA CONCRETE MODELER TESTS ────────────────────────────────
  const tf8 = buildTenFrame(8);
  assert(tf8.value === 8, 'Ten-frame stores value 8');
  assert(tf8.firstFrame.filter(Boolean).length === 8, 'First frame has exactly 8 filled dots');
  assert(tf8.secondFrame.every(f => !f), 'Second frame is empty when value <= 10');

  const tf14 = buildTenFrame(14);
  assert(tf14.firstFrame.every(Boolean), 'First frame is completely full (10 dots) for 14');
  assert(tf14.secondFrame.filter(Boolean).length === 4, 'Second frame has 4 overflow dots for 14');

  assert(Object.keys(CUISENAIRE_RODS).length === 10, 'Cuisenaire rods model all integers 1 to 10');
  assert(CUISENAIRE_RODS[1].widthPercent === 10, 'Rod 1 width is 10%');
  assert(CUISENAIRE_RODS[10].widthPercent === 100, 'Rod 10 width is 100%');

  const mathProb = generateConcreteMathProblem();
  assert(mathProb.a > 0 && mathProb.b > 0, 'Math problem operands are positive');
  assert(mathProb.friendlyDecompositionAr.length > 5, 'Math problem provides friendly Arabic decomposition logic');

  // ─── 7. COMPASSIONATE STREAKS & GRACE DAYS TESTS ──────────────────────────
  const firstSession = evaluateCompassionateStreak(undefined, 0, '2026-10-04');
  assert(firstSession.currentStreak === 1, 'First session starts streak at 1');

  const sameDay = evaluateCompassionateStreak('2026-10-04', 5, '2026-10-04');
  assert(sameDay.currentStreak === 5, 'Same day activity preserves current streak 5');

  const nextDay = evaluateCompassionateStreak('2026-10-03', 5, '2026-10-04');
  assert(nextDay.currentStreak === 6, 'Sequential day increments streak from 5 to 6');

  // Missed 1 day: Compassionate Grace Day Shield!
  const graceDay = evaluateCompassionateStreak('2026-10-02', 12, '2026-10-04');
  assert(graceDay.currentStreak === 12, 'Missed single day activates grace shield without wiping 12-day streak');
  assert(graceDay.graceDayApplied === true, 'Grace day applied flag is true');
  assert(graceDay.shieldActive === true, 'Shield active flag is true');

  // Extended absence (> 2 days): gentle reset
  const resetStreak = evaluateCompassionateStreak('2026-09-01', 12, '2026-10-04');
  assert(resetStreak.currentStreak === 1, 'Extended absence gently restarts streak at 1');

  // ─── 8. AMBIENT NOISE SYNTHESIZER INITIALIZATION ──────────────────────────
  const synth = new AmbientNoiseSynthesizer();
  assert(synth.getState().isPlaying === false, 'Ambient noise synth initializes in stopped state');

  console.log(`\n  Cognitive & Executive Function Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}
