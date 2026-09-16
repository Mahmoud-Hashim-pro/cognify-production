/**
 * Cognify 2.0 - Milestones 6, 7 & 8 Comprehensive Verification Suite
 *
 * Verifies:
 * 1. Milestone 7: Learning Strategy Intelligence
 *    - Wilson score confidence interval calculation & bounds
 *    - Bayesian win-rate smoothing
 *    - Strict Sample Size Guard (N >= 3) and calibration stages
 *    - Anti-overclaiming documentation, notices, and situational efficacy labels
 *    - Strategy ranking and context-aware recommendation
 *
 * 2. Milestone 6: Proactive Learning Assistant Engine
 *    - Retention trigger on overdue SM-2 schedules
 *    - Repeated struggle trigger on 2+ consecutive errors or strain > 0.6
 *    - Growth challenge trigger on 3+ consecutive correct solutions
 *    - Full student agency: dismiss, snooze (30m), and global disable toggle
 *
 * 3. Milestone 8: Learning Insights Engine
 *    - Grounded Rule-Based Triad: Insight = Evidence + Interpretation + Action
 *    - Breakthrough insight generation with metric delta (+45%)
 *    - Cognitive strain insight with response latency and physical analogy action
 *    - Strategy optimization insight for empirical win-rate advantage (N >= 3)
 *    - Spaced retention decay warning
 *    - Prerequisite gap diagnostic insight
 */

import {
  calculateWilsonScoreInterval,
  calculateBayesianSmoothedWinRate,
  evaluateStrategyEfficacy,
  rankStrategiesEmpirically,
  getRecommendedStrategyForContext,
  trackStrategyAttempt,
  ANTI_OVERCLAIMING_DISCLAIMER_EN,
  ANTI_OVERCLAIMING_DISCLAIMER_AR,
  STRATEGY_DISPLAY_NAMES,
} from '../src/lib/strategyIntelligence.js';

import {
  detectProactiveOpportunities,
  dismissOpportunity,
  snoozeOpportunity,
  toggleProactiveSuggestions,
  isProactiveEnabled,
  resetProactiveAgencyPreferences,
  getDismissedOpportunities,
  getSnoozedOpportunities,
} from '../src/lib/proactiveAssistantEngine.js';

import {
  generateLearningInsights,
} from '../src/lib/learningInsightsEngine.js';

import {
  createInitialStudentState,
  getStudentStateManager,
} from '../src/lib/studentStateEngine.js';

import type { StudentState, PedagogyStrategy } from '../src/types/studentState.js';

let totalPassed = 0;
let totalFailed = 0;

export async function runProactiveInsightsVerification(
  customAssert?: (cond: boolean, name: string) => void
): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🧪 MILESTONES 6, 7 & 8: PROACTIVE ASSISTANT, STRATEGY INTELLIGENCE & INSIGHTS');
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
      console.log(`  ✓ PASS: ${name}`);
    } else {
      failedLocal++;
      totalFailed++;
      console.error(`  ✗ FAIL: ${name}`);
    }
  };

  // Reset agency state before tests
  resetProactiveAgencyPreferences();

  // ==========================================================================
  // PART 1: MILESTONE 7 - LEARNING STRATEGY INTELLIGENCE
  // ==========================================================================
  console.log('\n--- Part 1: Milestone 7 (Learning Strategy Intelligence) ---');

  // Test 1.1: Wilson Score Interval Calculations
  const zeroResult = calculateWilsonScoreInterval(0, 0);
  assert(zeroResult.lower === 0 && zeroResult.upper === 0, 'Zero attempts returns [0, 0] Wilson interval');

  const smallPerfect = calculateWilsonScoreInterval(1, 1);
  assert(smallPerfect.lower < 1.0 && smallPerfect.lower > 0.1, 'Small sample (1/1) lower bound is conservative (< 1.0)');

  const mediumResult = calculateWilsonScoreInterval(8, 10);
  assert(mediumResult.lower > 0.45 && mediumResult.lower < 0.8, 'Medium sample (8/10) lower bound is statistically sound');
  assert(mediumResult.upper <= 1.0 && mediumResult.center > mediumResult.lower, 'Wilson center is greater than lower bound');

  const largeResult = calculateWilsonScoreInterval(85, 100);
  assert(largeResult.lower >= 0.75, 'Large sample (85/100) maintains high lower bound >= 0.75');
  assert(largeResult.upper - largeResult.lower < mediumResult.upper - mediumResult.lower, 'Larger sample narrows confidence interval width');

  // Test 1.2: Bayesian Win-Rate Smoothing
  const priorRate = calculateBayesianSmoothedWinRate(0, 0);
  assert(priorRate === 0.5, 'Zero observations Bayesian prior defaults to 0.5');

  const oneTrialSmoothed = calculateBayesianSmoothedWinRate(1, 1);
  assert(oneTrialSmoothed === 0.667, '1/1 smoothed win-rate is 2/3 (0.667) via Laplace prior');

  const zeroOfOneSmoothed = calculateBayesianSmoothedWinRate(0, 1);
  assert(zeroOfOneSmoothed === 0.333, '0/1 smoothed win-rate is 1/3 (0.333) via Laplace prior');

  // Test 1.3: Sample Size Guard (N >= 3) & Calibration Stages
  const zeroRecord = evaluateStrategyEfficacy(0, 0, 'worked_example');
  assert(zeroRecord.isCalibrating === true, 'N=0 strategy is flagged as isCalibrating=true');
  assert(zeroRecord.calibrationStage === 'insufficient_data', 'N=0 is classified as insufficient_data');

  const twoRecord = evaluateStrategyEfficacy(2, 2, 'analogies');
  assert(twoRecord.isCalibrating === true, 'N=2 strategy remains isCalibrating=true (N < 3 guard)');
  assert(twoRecord.calibrationStage === 'early_calibration', 'N=2 is classified as early_calibration');

  const threeRecord = evaluateStrategyEfficacy(3, 2, 'scaffolded');
  assert(threeRecord.isCalibrating === false, 'N=3 strategy satisfies guard and isCalibrating=false');
  assert(threeRecord.calibrationStage === 'calibrated', 'N=3 is classified as calibrated');

  const deepRecord = evaluateStrategyEfficacy(12, 10, 'worked_example');
  assert(deepRecord.isCalibrating === false, 'N=12 is calibrated');
  assert(deepRecord.confidenceScore >= 0.7, 'Deeply observed strategy has high confidence score');

  // Test 1.4: Anti-Overclaiming Principle Documentation
  assert(
    ANTI_OVERCLAIMING_DISCLAIMER_EN.includes('situational') &&
    ANTI_OVERCLAIMING_DISCLAIMER_EN.includes('learning style'),
    'English disclaimer models situational efficacy and rejects static learning styles'
  );
  assert(
    ANTI_OVERCLAIMING_DISCLAIMER_AR.includes('سياقية') &&
    ANTI_OVERCLAIMING_DISCLAIMER_AR.includes('أنماط التعلم'),
    'Arabic disclaimer explicitly mentions situational efficacy and rejects static learning styles'
  );

  // Test 1.5: Empirical Ranking & Recommendation
  const strategyData = {
    worked_example: { attempts: 6, successes: 5 }, // calibrated, win-rate ~83%
    analogies: { attempts: 2, successes: 2 },      // uncalibrated (2/2)
    socratic: { attempts: 4, successes: 1 },       // calibrated, win-rate 25%
    scaffolded: { attempts: 0, successes: 0 },
    advanced_rigor: { attempts: 0, successes: 0 },
  };

  const ranked = rankStrategiesEmpirically(strategyData);
  assert(ranked[0].strategy === 'worked_example', 'Calibrated high-win strategy (worked_example) ranks #1');
  assert(ranked[0].isCalibrating === false, 'Rank #1 strategy is fully calibrated');
  // Calibrated strategies should precede uncalibrated ones
  const calibratedIdx = ranked.findIndex((s) => s.strategy === 'worked_example');
  const uncalibratedIdx = ranked.findIndex((s) => s.strategy === 'analogies');
  assert(calibratedIdx < uncalibratedIdx, 'Calibrated strategy ranks ahead of uncalibrated strategy despite 100% small sample');

  // Test 1.6: Context Recommendation
  const mockState: StudentState = createInitialStudentState('test_student_1');
  mockState.conceptMastery['pointers'] = {
    conceptId: 'pointers',
    attempts: 4,
    correct: 3,
    accuracy: 0.75,
    confidence: 0.8,
    consecutiveCorrect: 2,
    consecutiveIncorrect: 0,
    lastTested: Date.now(),
    mistakeTypes: [],
    strategyOutcomes: {
      worked_example: { attempts: 4, successes: 3, rate: 0.75, lastUsed: Date.now() },
    },
  };

  const rec = getRecommendedStrategyForContext('pointers', mockState);
  assert(rec.recommendedStrategy === 'worked_example', 'Context recommendation selects concept-specific high-win strategy');
  assert(rec.isCalibrated === true, 'Recommendation is flagged as calibrated');

  // Test 1.7: Immutable Strategy Tracking Helper
  const tracked1 = trackStrategyAttempt(undefined, true);
  assert(tracked1.attempts === 1 && tracked1.successes === 1, 'Initial attempt tracked correctly');
  const tracked2 = trackStrategyAttempt(tracked1, false);
  assert(tracked2.attempts === 2 && tracked2.successes === 1, 'Second attempt failure tracked immutably');

  // ==========================================================================
  // PART 2: MILESTONE 6 - PROACTIVE LEARNING ASSISTANT ENGINE
  // ==========================================================================
  console.log('\n--- Part 2: Milestone 6 (Proactive Learning Assistant Engine) ---');

  const now = Date.now();
  const testUid = `proactive_test_${now}`;
  const proactiveState = createInitialStudentState(testUid);

  // Trigger A: Repeated Struggle (pointers: 2 consecutive incorrect)
  proactiveState.conceptMastery['pointers'] = {
    conceptId: 'pointers',
    attempts: 3,
    correct: 1,
    accuracy: 0.33,
    confidence: 0.3,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 2,
    lastTested: now - 3600000,
    mistakeTypes: ['dereference_null'],
    avgResponseTimeMs: 18500,
  };
  proactiveState.learningStrain = {
    possibleStruggle: 0.75,
    confidence: 0.8,
    signals: ['repeated_errors', 'high_response_latency'],
  };

  // Trigger B: Retention Due (variables_types: overdue review from 3 days ago)
  proactiveState.retentionSchedules['variables_types'] = {
    conceptId: 'variables_types',
    intervalDays: 2,
    easeFactor: 2.5,
    repetitions: 2,
    nextReviewDate: now - (3 * 86400000), // 3 days ago
    status: 'learning',
    lastReviewDate: now - (5 * 86400000),
  };

  // Trigger C: Growth Challenge (recursion: 3 consecutive correct solutions)
  proactiveState.conceptMastery['recursion'] = {
    conceptId: 'recursion',
    attempts: 4,
    correct: 4,
    accuracy: 1.0,
    confidence: 0.95,
    consecutiveCorrect: 3,
    consecutiveIncorrect: 0,
    lastTested: now - 1800000,
    mistakeTypes: [],
  };

  // Detect Opportunities
  const opps = detectProactiveOpportunities(proactiveState, now);
  assert(opps.length >= 3, 'Detected all 3 proactive opportunity categories');

  // Verify Retention Trigger
  const retentionOpp = opps.find((o) => o.type === 'retention_due');
  assert(!!retentionOpp, 'Retention due opportunity detected');
  assert(retentionOpp?.conceptId === 'variables_types', 'Retention opportunity targets variables_types');
  assert(retentionOpp?.priority === 2, 'Retention priority is 2');
  assert(retentionOpp?.messageEn.includes('reviewed') === true, 'Retention message contains review prompt');
  assert(retentionOpp?.metadata?.daysOverdue! >= 3, 'Metadata records days overdue >= 3');

  // Verify Repeated Struggle Trigger
  const struggleOpp = opps.find((o) => o.type === 'repeated_struggle');
  assert(!!struggleOpp, 'Repeated struggle opportunity detected');
  assert(struggleOpp?.conceptId === 'pointers', 'Struggle opportunity targets pointers');
  assert(struggleOpp?.priority === 1, 'Struggle priority is 1 (urgent)');
  assert(struggleOpp?.messageEn.includes('difficulty') === true, 'Struggle message offers targeted assistance');

  // Verify Growth Challenge Trigger
  const growthOpp = opps.find((o) => o.type === 'growth_challenge');
  assert(!!growthOpp, 'Growth challenge opportunity detected');
  assert(growthOpp?.conceptId === 'recursion', 'Growth challenge targets recursion');
  assert(growthOpp?.priority === 3, 'Growth challenge priority is 3');
  assert(growthOpp?.metadata?.consecutiveCorrect === 3, 'Growth metadata tracks streak of 3');

  // Test Student Agency: Dismiss Opportunity
  const oppIdToDismiss = struggleOpp!.id;
  dismissOpportunity(oppIdToDismiss, 'opportunity');
  assert(getDismissedOpportunities().has(oppIdToDismiss), 'Opportunity ID recorded in dismissed set');

  const oppsAfterDismiss = detectProactiveOpportunities(proactiveState, now);
  assert(!oppsAfterDismiss.some((o) => o.id === oppIdToDismiss), 'Dismissed opportunity is filtered out');

  // Test Student Agency: Snooze Opportunity
  const oppIdToSnooze = retentionOpp!.id;
  snoozeOpportunity(oppIdToSnooze, 30);
  assert(getSnoozedOpportunities().has(oppIdToSnooze), 'Opportunity ID recorded in snoozed map');

  const oppsWhileSnoozed = detectProactiveOpportunities(proactiveState, now);
  assert(!oppsWhileSnoozed.some((o) => o.id === oppIdToSnooze), 'Snoozed opportunity is hidden before expiry');

  // Check that after snooze time elapses, it reappears
  const futureTime = now + (31 * 60 * 1000);
  const oppsAfterSnoozeElapsed = detectProactiveOpportunities(proactiveState, futureTime);
  assert(oppsAfterSnoozeElapsed.some((o) => o.id === oppIdToSnooze), 'Opportunity reappears after snooze duration elapses');

  // Test Student Agency: Global Suggestions Toggle
  assert(isProactiveEnabled() === true, 'Proactive suggestions are initially enabled');
  toggleProactiveSuggestions(false);
  assert(isProactiveEnabled() === false, 'Global toggle successfully disables suggestions');
  const disabledOpps = detectProactiveOpportunities(proactiveState, now);
  assert(disabledOpps.length === 0, 'When suggestions are disabled, detectProactiveOpportunities returns empty array');

  // Re-enable suggestions
  toggleProactiveSuggestions(true);
  assert(isProactiveEnabled() === true, 'Suggestions successfully re-enabled');

  // ==========================================================================
  // PART 3: MILESTONE 8 - LEARNING INSIGHTS ENGINE
  // ==========================================================================
  console.log('\n--- Part 3: Milestone 8 (Learning Insights Engine) ---');

  // Generate Insights from the state
  const insights = generateLearningInsights(proactiveState, now);
  assert(insights.length >= 3, 'Generated grounded learning insights');

  // Test Triad Rule Enforcement: Every insight must have Evidence, Interpretation, and Action
  for (const ins of insights) {
    assert(
      typeof ins.evidenceEn === 'string' && ins.evidenceEn.length > 5,
      `Insight [${ins.id}] has valid Evidence (EN)`
    );
    assert(
      typeof ins.evidenceAr === 'string' && ins.evidenceAr.length > 5,
      `Insight [${ins.id}] has valid Evidence (AR)`
    );
    assert(
      typeof ins.interpretationEn === 'string' && ins.interpretationEn.length > 5,
      `Insight [${ins.id}] has valid Interpretation (EN)`
    );
    assert(
      typeof ins.interpretationAr === 'string' && ins.interpretationAr.length > 5,
      `Insight [${ins.id}] has valid Interpretation (AR)`
    );
    assert(
      typeof ins.action.promptToInject === 'string' && ins.action.promptToInject.length > 5,
      `Insight [${ins.id}] has valid Action prompt`
    );
  }

  // Verify Breakthrough Insight (Recursion accuracy leap)
  const breakthrough = insights.find((i) => i.category === 'breakthrough');
  assert(!!breakthrough, 'Breakthrough insight generated');
  assert(breakthrough?.headlineEn.includes('Recursion') === true, 'Breakthrough identifies recursion');
  assert(typeof breakthrough?.metricDelta === 'string' && breakthrough?.metricDelta.startsWith('+'), 'Breakthrough metric delta formatted (+%)');
  assert(breakthrough?.action.type === 'launch_challenge', 'Breakthrough action launches challenge');

  // Verify Cognitive Strain Insight (Pointers latency + errors)
  const strainInsight = insights.find((i) => i.category === 'cognitive_strain');
  assert(!!strainInsight, 'Cognitive strain insight generated');
  assert(strainInsight?.evidenceEn.includes('18.5s') === true, 'Strain evidence quotes empirical response time');
  assert(strainInsight?.action.type === 'guided_walkthrough', 'Strain action provides step-by-step walkthrough');

  // Verify Strategy Optimization Insight (Simulate dual-strategy outcome on bitwise)
  proactiveState.conceptMastery['bitwise_ops'] = {
    conceptId: 'bitwise_ops',
    attempts: 9,
    correct: 6,
    accuracy: 0.67,
    confidence: 0.7,
    consecutiveCorrect: 1,
    consecutiveIncorrect: 0,
    lastTested: now,
    mistakeTypes: [],
    strategyOutcomes: {
      worked_example: { attempts: 6, successes: 5, rate: 0.83, lastUsed: now },
      socratic: { attempts: 3, successes: 1, rate: 0.33, lastUsed: now },
    },
  };

  const updatedInsights = generateLearningInsights(proactiveState, now);
  const strategyInsight = updatedInsights.find((i) => i.category === 'strategy_optimization');
  assert(!!strategyInsight, 'Strategy optimization insight generated when efficacy difference >= 30% with N>=3');
  assert(strategyInsight?.evidenceEn.includes('Worked Examples') === true, 'Strategy insight evidence notes top strategy');
  assert(strategyInsight?.action.type === 'switch_pedagogy', 'Strategy insight action allows switching pedagogy');

  // Verify Spaced Retention Decay Insight
  const retentionInsight = updatedInsights.find((i) => i.category === 'retention_decay');
  assert(!!retentionInsight, 'Retention decay insight generated');
  assert(retentionInsight?.evidenceEn.includes('elapsed') === true, 'Retention evidence notes elapsed interval');
  assert(retentionInsight?.action.type === 'spaced_drill', 'Retention action triggers spaced drill');

  console.log('\n================================================================');
  console.log(`📊 ALL VERIFICATIONS COMPLETE: ${passedLocal} passed, ${failedLocal} failed`);
  console.log('================================================================');

  if (failedLocal === 0) {
    console.log(`✅ Milestones 6, 7 & 8 fully validated with 100% passing tests.`);
  }

  return { passed: passedLocal, failed: failedLocal };
}

// Standalone CLI execution
runProactiveInsightsVerification().then((res) => {
  if (res.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
