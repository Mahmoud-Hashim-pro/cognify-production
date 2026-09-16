/**
 * Cognify 2.0 - Milestone 17 / Requirement 13 Benchmark Suite
 * Pedagogical & Strategy Effectiveness Benchmark
 *
 * Standalone executable test suite verifying:
 * Group 1: Hake normalized gain calculations under boundary conditions (Pre >= 100, negative gains, zero gains).
 * Group 2: Welch's two-sample t-test statistical significance (p < 0.05) and Cohen's d effect sizes (d > 0.8 for high effectiveness).
 * Group 3: Strategy promotion and fallback rules (N >= 3 sample guard, auto-adapting away from unhelpful strategies).
 * Group 4: Longitudinal retention preservation over simulated 30-day Ebbinghaus curve (1-day, 3-day, 7-day, 30-day intervals).
 * Group 5: Full 500-trial simulation asserting overall system learning gain g > 0.60 across cohorts.
 */

import {
  calculateHakeGain,
  classifyHakeTier,
  calculateCohortStats,
  computeWelchTTest,
  evaluatePedagogicalABTrial,
} from '../../src/lib/pedagogicalEvaluationEngine';

import {
  ALL_PEDAGOGY_STRATEGIES,
  runPedagogicalBenchmark,
  simulateSingleTrial,
  simulateCohortTrials,
  computeEbbinghausRetention,
  computeSpacedRetention,
  evaluateRetentionDecayMitigation,
  evaluateStrategyPromotion,
  evaluateAutoAdaptation,
  SeededRandom,
} from '../../src/lib/pedagogicalBenchmarkRunner';

import type { PedagogyStrategy } from '../../src/types/studentState';
import type { HakeGainTier } from '../../src/types/evaluation';

let passed = 0;
let failed = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    const msg = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
    console.error(`  ${msg}`);
    failureDetails.push(msg);
    failed++;
  }
}

export async function runInterventionEffectivenessBenchmark(): Promise<{ passed: number; failed: number }> {
  console.log('\n=============================================================================');
  console.log(' COGNIFY 2.0: PEDAGOGICAL & STRATEGY EFFECTIVENESS BENCHMARK (REQ 13)');
  console.log('=============================================================================\n');

  // ==========================================================================
  // Group 1: Hake Normalized Gain Calculations & Boundary Conditions
  // ==========================================================================
  console.log('Group 1: Hake Gain Calculations & Boundary Conditions');
  console.log('----------------------------------------------------');

  // Boundary condition 1: Pre >= 100 with Post >= 100
  const gPerfect = calculateHakeGain(100, 100);
  assert(gPerfect === 1.0, 'Pre=100 and Post=100 yields g = 1.0 without division by zero');
  assert(classifyHakeTier(gPerfect) === 'high', 'Pre=100 and Post=100 is classified as "high" gain tier');

  const gPre100Over = calculateHakeGain(105, 100);
  assert(gPre100Over === 1.0, 'Pre clamped at 100 with Post=100 safely yields g = 1.0');

  // Boundary condition 2: Pre >= 100 with Post < 100
  const gPre100Drop = calculateHakeGain(100, 90);
  assert(gPre100Drop === 0.0, 'Pre=100 and Post=90 safely yields g = 0.0 without NaN');
  assert(classifyHakeTier(gPre100Drop) === 'low', 'Pre=100 and Post=90 is classified as "low" gain tier');

  const gPre100Zero = calculateHakeGain(100, 0);
  assert(gPre100Zero === 0.0, 'Pre=100 and Post=0 safely yields g = 0.0');

  // Boundary condition 3: Negative gains (learning regression)
  const gRegression = calculateHakeGain(70, 50);
  assert(gRegression < 0, `calculateHakeGain(70, 50) yields negative gain (got ${gRegression})`);
  assert(gRegression === -0.6667, `calculateHakeGain(70, 50) matches expected exact -0.6667 (got ${gRegression})`);
  assert(classifyHakeTier(gRegression) === 'regression', 'Negative gain is classified as "regression"');

  const gDeepRegression = calculateHakeGain(80, 20);
  assert(gDeepRegression === -1.0, 'Large score drop is strictly bounded to -1.0 lower bound');
  assert(classifyHakeTier(gDeepRegression) === 'regression', 'Deep regression clamped to -1.0 is in "regression" tier');

  // Boundary condition 4: Zero gains (no score change)
  const gZero50 = calculateHakeGain(50, 50);
  assert(gZero50 === 0.0, 'calculateHakeGain(50, 50) yields exactly 0.0');
  assert(classifyHakeTier(gZero50) === 'low', 'Zero gain is classified as "low" tier');

  const gZero0 = calculateHakeGain(0, 0);
  assert(gZero0 === 0.0, 'calculateHakeGain(0, 0) yields exactly 0.0 without division errors');

  // Boundary condition 5: Standard canonical positive gains
  const gMedium = calculateHakeGain(20, 60);
  assert(gMedium === 0.5, 'calculateHakeGain(20, 60) yields exact g = 0.5');
  assert(classifyHakeTier(gMedium) === 'medium', 'classifyHakeTier(0.5) is "medium"');

  const gHigh = calculateHakeGain(20, 84);
  assert(gHigh === 0.8, 'calculateHakeGain(20, 84) yields exact g = 0.8');
  assert(classifyHakeTier(gHigh) === 'high', 'classifyHakeTier(0.8) is "high"');

  const gLow = calculateHakeGain(20, 36);
  assert(gLow === 0.2, 'calculateHakeGain(20, 36) yields exact g = 0.2');
  assert(classifyHakeTier(gLow) === 'low', 'classifyHakeTier(0.2) is "low"');

  const gMaxGain = calculateHakeGain(0, 100);
  assert(gMaxGain === 1.0, 'calculateHakeGain(0, 100) yields maximal g = 1.0');
  assert(classifyHakeTier(gMaxGain) === 'high', 'classifyHakeTier(1.0) is "high"');

  // Invariant bound check
  const testPairs = [
    [-10, 50], [20, 120], [100, 100], [0, 0], [99, 100], [99, 98], [50, 25]
  ];
  const allBounded = testPairs.every(([pre, post]) => {
    const g = calculateHakeGain(pre, post);
    return !Number.isNaN(g) && Number.isFinite(g) && g >= -1.0 && g <= 1.0;
  });
  assert(allBounded, 'All test pairs strictly satisfy -1.0 <= g <= 1.0 without NaN');

  // ==========================================================================
  // Group 2: Welch t-test Significance (p < 0.05) and Cohen's d (d > 0.8)
  // ==========================================================================
  console.log('\nGroup 2: Welch t-test Statistical Significance & Cohen\'s d Effect Size');
  console.log('----------------------------------------------------------------------');

  // Synthesize two cohorts: Control (low gain) vs Treatment (high effectiveness)
  // Cohort A (Control/Weak Strategy): gains ~0.24, variance ~0.003
  const gainsA = [0.20, 0.22, 0.25, 0.28, 0.24, 0.26, 0.21, 0.23, 0.27, 0.24, 0.25, 0.22, 0.26, 0.21, 0.24];
  const preA = gainsA.map(() => 30);
  const postA = gainsA.map((g) => Math.round(30 + g * 70));
  const statsA = calculateCohortStats(gainsA, preA, postA, 'socratic');

  // Cohort B (High Effectiveness / Worked Examples): gains ~0.78, variance ~0.003
  const gainsB = [0.75, 0.80, 0.78, 0.82, 0.76, 0.79, 0.81, 0.74, 0.77, 0.80, 0.83, 0.76, 0.78, 0.81, 0.77];
  const preB = gainsB.map(() => 30);
  const postB = gainsB.map((g) => Math.round(30 + g * 70));
  const statsB = calculateCohortStats(gainsB, preB, postB, 'worked_example');

  assert(statsA.sampleSize === 15, 'Cohort A sample size is 15');
  assert(statsB.sampleSize === 15, 'Cohort B sample size is 15');
  assert(statsA.meanGain < 0.30, `Cohort A mean gain is in low tier (got ${statsA.meanGain})`);
  assert(statsB.meanGain > 0.70, `Cohort B mean gain is in high tier (got ${statsB.meanGain})`);

  const tTest = computeWelchTTest(statsA, statsB);

  assert(tTest.degreesOfFreedom > 20, `Welch-Satterthwaite degrees of freedom computed (${tTest.degreesOfFreedom})`);
  assert(tTest.tStatistic > 15, `Welch t-statistic demonstrates massive directional difference (${tTest.tStatistic})`);
  assert(tTest.pValue < 0.05, `Welch t-test achieves statistical significance p < 0.05 (got p = ${tTest.pValue})`);
  assert(tTest.pValue <= 0.001, `Welch t-test achieves strong statistical significance p <= 0.001 (got p = ${tTest.pValue})`);
  assert(tTest.cohensD > 0.8, `Cohen's d effect size indicates high effectiveness d > 0.8 (got d = ${tTest.cohensD})`);
  assert(tTest.cohensD > 2.0, `Cohen's d shows huge practical effect size d > 2.0 (got d = ${tTest.cohensD})`);

  // Evaluate A/B Trial wrapper with promotion recommendation
  const recordsA = gainsA.map((_, i) => ({ pre: preA[i], post: postA[i] }));
  const recordsB = gainsB.map((_, i) => ({ pre: preB[i], post: postB[i] }));

  const abTrial = evaluatePedagogicalABTrial(
    'exp_bench_001',
    'pointers',
    'Pointers & Memory',
    'socratic',
    recordsA,
    'worked_example',
    recordsB,
    5
  );

  assert(abTrial.status === 'concluded', 'A/B trial status is "concluded"');
  assert(abTrial.isStatisticallySignificant === true, 'A/B trial isStatisticallySignificant is true');
  assert(abTrial.winner === 'worked_example', 'A/B trial winner correctly identified as "worked_example"');
  assert(abTrial.promotionRecommendation !== undefined, 'A/B trial includes promotion recommendation');
  assert(
    abTrial.promotionRecommendation?.recommendedStrategy === 'worked_example',
    'Promotion recommendation specifies "worked_example"'
  );
  assert(
    abTrial.promotionRecommendation?.confidence! >= 0.95,
    `Promotion recommendation confidence is >= 0.95 (got ${abTrial.promotionRecommendation?.confidence})`
  );

  // ==========================================================================
  // Group 3: Strategy Promotion & Fallback Rules (N >= 3 Guard & Auto-Adapting)
  // ==========================================================================
  console.log('\nGroup 3: Strategy Promotion & Fallback Rules (N >= 3 Guard)');
  console.log('----------------------------------------------------------');

  // Sub-test 1: N >= 3 Sample Size Guard on Strategy Promotion
  // Trial count 1: should be blocked by guard
  const promo1 = evaluateStrategyPromotion(1, 1, 'analogies');
  assert(promo1.isCalibrated === false, 'N=1 strategy is not calibrated');
  assert(promo1.calibrationStage === 'early_calibration', 'N=1 stage is "early_calibration"');
  assert(promo1.isPromoted === false, 'N=1 strategy cannot be promoted despite 100% win rate');
  assert(promo1.promotionEligible === false, 'N=1 strategy is not promotion eligible');

  // Trial count 2: should still be blocked by guard
  const promo2 = evaluateStrategyPromotion(2, 2, 'analogies');
  assert(promo2.isCalibrated === false, 'N=2 strategy is not calibrated');
  assert(promo2.calibrationStage === 'early_calibration', 'N=2 stage is "early_calibration"');
  assert(promo2.isPromoted === false, 'N=2 strategy cannot be promoted prematurely');

  // Trial count 3 with 3 successes: meets N >= 3 guard and qualifies for promotion
  const promo3 = evaluateStrategyPromotion(3, 3, 'analogies');
  assert(promo3.isCalibrated === true, 'N=3 strategy satisfies sample guard and is calibrated');
  assert(promo3.calibrationStage === 'calibrated', 'N=3 stage is "calibrated"');
  assert(promo3.isPromoted === true, 'N=3 strategy with 3/3 successes is promoted to default');
  assert(promo3.winRate === 1.0, 'N=3 strategy winRate is 1.0');

  // Sub-test 2: Auto-adapting away from unhelpful strategies
  // Case A: 2 initial failed attempts (N < 3 guard prevents premature switching)
  const history2Fails = [{ success: false }, { success: false }];
  const adapt2 = evaluateAutoAdaptation('socratic', history2Fails);
  assert(adapt2.sampleGuardMet === false, 'Auto-adaptation honors sample guard (N < 3 not yet met)');
  assert(adapt2.shouldAdaptAway === false, 'Does not prematurely adapt away after only 2 attempts');
  assert(adapt2.recommendedStrategy === 'socratic', 'Retains current strategy while under sample guard');

  // Case B: 3 consecutive failed attempts (N = 3 meets guard and triggers auto-adaptation)
  const history3Fails = [{ success: false }, { success: false }, { success: false }];
  const adapt3 = evaluateAutoAdaptation('socratic', history3Fails, 'worked_example');
  assert(adapt3.sampleGuardMet === true, 'Sample guard satisfied (N = 3)');
  assert(adapt3.shouldAdaptAway === true, 'Auto-adapts away from unhelpful strategy (0/3 successes)');
  assert(adapt3.recommendedStrategy === 'worked_example', 'Switches to fallback strategy "worked_example"');
  assert(adapt3.isFallback === true, 'Identified as fallback activation');

  // Case C: Low win rate after N = 4 trials (1 success out of 4 = 25% win rate)
  const historyLowWin = [{ success: false }, { success: true }, { success: false }, { success: false }];
  const adaptLow = evaluateAutoAdaptation('advanced_rigor', historyLowWin, 'scaffolded');
  assert(adaptLow.sampleGuardMet === true, 'Sample guard satisfied (N = 4)');
  assert(adaptLow.shouldAdaptAway === true, 'Auto-adapts away from strategy with 25% win rate');
  assert(adaptLow.recommendedStrategy === 'scaffolded', 'Switches to fallback "scaffolded"');

  // Case D: Performing strategy retained (3 successes out of 4 = 75% win rate)
  const historyGood = [{ success: true }, { success: true }, { success: false }, { success: true }];
  const adaptGood = evaluateAutoAdaptation('worked_example', historyGood);
  assert(adaptGood.shouldAdaptAway === false, 'Does not adapt away from well-performing strategy');
  assert(adaptGood.recommendedStrategy === 'worked_example', 'Retains "worked_example"');

  // ==========================================================================
  // Group 4: Longitudinal Retention Preservation over 30-Day Ebbinghaus Curve
  // ==========================================================================
  console.log('\nGroup 4: Longitudinal Retention Preservation over 30-Day Ebbinghaus Curve');
  console.log('-----------------------------------------------------------------------');

  const retentionEval = evaluateRetentionDecayMitigation([1, 3, 7, 14, 21, 30]);

  // Checkpoint: Day 1
  assert(
    retentionEval.day1.retentionWithoutIntervention >= 0.55 &&
    retentionEval.day1.retentionWithoutIntervention <= 0.65,
    `Day 1 unreviewed retention reflects Ebbinghaus decay ~60% (got ${retentionEval.day1.retentionWithoutIntervention})`
  );
  assert(
    retentionEval.day1.retentionWithSpacedReviews >= 0.85,
    `Day 1 spaced retention reinforced to >= 85% (got ${retentionEval.day1.retentionWithSpacedReviews})`
  );
  assert(retentionEval.day1.isMitigated === true, 'Day 1 retention decay is mitigated');

  // Checkpoint: Day 3
  assert(
    retentionEval.day3.retentionWithoutIntervention >= 0.20 &&
    retentionEval.day3.retentionWithoutIntervention <= 0.25,
    `Day 3 unreviewed retention decays sharply to ~22% (got ${retentionEval.day3.retentionWithoutIntervention})`
  );
  assert(
    retentionEval.day3.retentionWithSpacedReviews >= 0.80,
    `Day 3 spaced retention preserved at >= 80% (got ${retentionEval.day3.retentionWithSpacedReviews})`
  );
  assert(retentionEval.day3.isMitigated === true, 'Day 3 retention decay is mitigated');

  // Checkpoint: Day 7
  assert(
    retentionEval.day7.retentionWithoutIntervention < 0.05,
    `Day 7 unreviewed retention drops below 5% (got ${retentionEval.day7.retentionWithoutIntervention})`
  );
  assert(
    retentionEval.day7.retentionWithSpacedReviews >= 0.80,
    `Day 7 spaced retention preserved at >= 80% (got ${retentionEval.day7.retentionWithSpacedReviews})`
  );
  assert(
    retentionEval.day7.gainPreserved > 0.70,
    `Day 7 gain preserved exceeds 70 percentage points (got ${retentionEval.day7.gainPreserved})`
  );
  assert(retentionEval.day7.isMitigated === true, 'Day 7 retention decay is mitigated');

  // Checkpoint: Day 30
  assert(
    retentionEval.day30.retentionWithoutIntervention < 0.001,
    `Day 30 unreviewed retention experiences complete decay ~0% (got ${retentionEval.day30.retentionWithoutIntervention})`
  );
  assert(
    retentionEval.day30.retentionWithSpacedReviews >= 0.75,
    `Day 30 spaced retention preserved at >= 75% (got ${retentionEval.day30.retentionWithSpacedReviews})`
  );
  assert(
    retentionEval.day30.gainPreserved >= 0.70,
    `Day 30 gain preserved is >= 70 percentage points (got ${retentionEval.day30.gainPreserved})`
  );
  assert(retentionEval.day30.isMitigated === true, 'Day 30 retention decay is mitigated');

  // Summary assertion
  assert(
    retentionEval.preservesLongitudinalRetention === true,
    'preservesLongitudinalRetention is true across 30-day Ebbinghaus curve'
  );
  assert(
    retentionEval.averageMitigationDelta > 0.50,
    `Average retention preservation delta across all intervals > 50% (got ${(retentionEval.averageMitigationDelta * 100).toFixed(1)}%)`
  );

  // ==========================================================================
  // Group 5: Full 500-Trial Simulation Asserting System Learning Gain g > 0.60
  // ==========================================================================
  console.log('\nGroup 5: Full 500-Trial Simulation Across All 5 Pedagogical Strategies');
  console.log('--------------------------------------------------------------------');

  const benchmarkReport = runPedagogicalBenchmark({ totalTrials: 500, seed: 101 });

  // Verify trial count
  assert(
    benchmarkReport.totalTrials >= 500,
    `Total simulated learning trials is >= 500 (simulated ${benchmarkReport.totalTrials} trials)`
  );

  // Verify all 5 strategies are simulated and calibrated
  for (const strategy of ALL_PEDAGOGY_STRATEGIES) {
    const cohort = benchmarkReport.cohorts[strategy];
    assert(cohort !== undefined, `Cohort for strategy '${strategy}' exists in benchmark`);
    assert(cohort.trialCount >= 90, `Strategy '${strategy}' has >= 90 trials (got ${cohort.trialCount})`);
    assert(cohort.stats.sampleSize >= 90, `Strategy '${strategy}' stats sample size >= 90`);
    assert(cohort.stats.meanPre > 15, `Strategy '${strategy}' mean pre-score is realistic (> 15, got ${cohort.stats.meanPre})`);
    assert(cohort.stats.meanPost > cohort.stats.meanPre, `Strategy '${strategy}' post-score exceeds pre-score (${cohort.stats.meanPost} vs ${cohort.stats.meanPre})`);
    assert(cohort.stats.meanGain > 0.55, `Strategy '${strategy}' mean normalized gain > 0.55 (got ${cohort.stats.meanGain})`);
    assert(cohort.stats.varianceGain > 0, `Strategy '${strategy}' variance of gain > 0 (got ${cohort.stats.varianceGain})`);
    assert(cohort.stats.standardDeviationGain > 0, `Strategy '${strategy}' std dev > 0 (got ${cohort.stats.standardDeviationGain})`);
    assert(cohort.isCalibrated === true, `Strategy '${strategy}' is fully calibrated (N >= 3)`);
  }

  // Verify pairwise Welch t-tests
  assert(
    benchmarkReport.pairwiseComparisons.length === 10,
    `Generated 10 pairwise comparisons for 5 strategies (5 choose 2 = 10, got ${benchmarkReport.pairwiseComparisons.length})`
  );

  const workedVsRigor = benchmarkReport.pairwiseComparisons.find(
    (p) => (p.strategyA === 'worked_example' && p.strategyB === 'advanced_rigor') ||
           (p.strategyA === 'advanced_rigor' && p.strategyB === 'worked_example')
  );
  assert(workedVsRigor !== undefined, 'Pairwise comparison exists between worked_example and advanced_rigor');
  assert(workedVsRigor?.isSignificant === true, 'worked_example vs advanced_rigor demonstrates statistically significant difference (p < 0.05)');
  assert(Math.abs(workedVsRigor?.cohensD || 0) > 0.8, `worked_example vs advanced_rigor has large effect size |d| > 0.8 (got |d| = ${Math.abs(workedVsRigor?.cohensD || 0)})`);

  // Primary System-Wide Assertion: overall system learning gain g > 0.60 across cohorts
  console.log(`\n  [METRIC] Overall System Pre-Score:  ${benchmarkReport.overallMeanPre.toFixed(2)}`);
  console.log(`  [METRIC] Overall System Post-Score: ${benchmarkReport.overallMeanPost.toFixed(2)}`);
  console.log(`  [METRIC] Overall System Gain (g):   ${benchmarkReport.overallMeanGain.toFixed(4)}`);
  console.log(`  [METRIC] System Gain Tier:          ${benchmarkReport.overallGainTier}`);

  assert(
    benchmarkReport.overallMeanGain > 0.60,
    `Overall system learning gain g exceeds requirement 0.60 across cohorts (achieved g = ${benchmarkReport.overallMeanGain})`
  );
  assert(
    benchmarkReport.meetsSystemTargetGain === true,
    'Benchmark report explicitly flags meetsSystemTargetGain as true'
  );
  assert(
    benchmarkReport.overallGainTier === 'high' || benchmarkReport.overallGainTier === 'medium',
    `Overall gain tier is medium or high (got ${benchmarkReport.overallGainTier})`
  );

  console.log('\n=============================================================================');
  console.log(` BENCHMARK SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================================\n');

  if (failed > 0) {
    console.error('Failure Details:');
    failureDetails.forEach((f) => console.error(`  - ${f}`));
  }

  return { passed, failed };
}

if (process.argv[1]?.includes('interventionEffectivenessBenchmark')) {
  runInterventionEffectivenessBenchmark().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
