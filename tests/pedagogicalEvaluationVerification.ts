/**
 * Milestone 17 Verification Suite: Automated Pedagogical Evaluation Engine
 * Tests Longitudinal Hake Normalized Gain ($g$), Welch's two-sample t-test,
 * Cohen's d Effect Size, A/B strategy evaluation, and promotion recommendations.
 */

import {
  calculateHakeGain,
  classifyHakeTier,
  erf,
  normalCDF,
  calculateCohortStats,
  computeWelchTTest,
  evaluatePedagogicalABTrial,
  aggregateLongitudinalWindows
} from '../src/lib/pedagogicalEvaluationEngine';
import type { LongitudinalStudentGain } from '../src/types/evaluation';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

export async function runPedagogicalEvaluationVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Running Suite 48: Milestone 17 (Automated Pedagogical Evaluation Engine) ---');

  // ==========================================================================
  // Test Group 1: Hake Normalized Gain Formula
  // ==========================================================================
  console.log('Group 1: Hake Normalized Gain Formula & Boundary Conditions');
  const gMedium = calculateHakeGain(20, 60);
  assert(gMedium === 0.5, 'calculateHakeGain(20, 60) yields exact g = 0.5');
  assert(classifyHakeTier(gMedium) === 'medium', 'classifyHakeTier(0.5) is "medium"');

  const gHigh = calculateHakeGain(20, 84);
  assert(gHigh === 0.8, 'calculateHakeGain(20, 84) yields exact g = 0.8');
  assert(classifyHakeTier(gHigh) === 'high', 'classifyHakeTier(0.8) is "high"');

  const gLow = calculateHakeGain(20, 36);
  assert(gLow === 0.2, 'calculateHakeGain(20, 36) yields exact g = 0.2');
  assert(classifyHakeTier(gLow) === 'low', 'classifyHakeTier(0.2) is "low"');

  const gRegression = calculateHakeGain(70, 50);
  assert(gRegression < 0, 'calculateHakeGain(70, 50) correctly yields negative gain');
  assert(classifyHakeTier(gRegression) === 'regression', 'classifyHakeTier negative is "regression"');

  // Boundary condition Pre >= 100
  const gPerfect = calculateHakeGain(100, 100);
  assert(gPerfect === 1.0, 'Pre=100 and Post=100 safely yields g = 1.0 without division by zero');

  const gPre100Drop = calculateHakeGain(100, 90);
  assert(gPre100Drop === 0.0, 'Pre=100 and Post=90 safely yields g = 0.0 without NaN');

  // ==========================================================================
  // Test Group 2: Statistical Functions (erf, normalCDF)
  // ==========================================================================
  console.log('Group 2: Mathematical Approximations (erf and normalCDF)');
  assert(Math.abs(erf(0)) < 0.0001, 'erf(0) evaluates to 0');
  assert(Math.abs(erf(1) - 0.8427) < 0.001, 'erf(1) matches standard mathematical value ~0.8427');

  assert(Math.abs(normalCDF(0) - 0.5) < 0.0001, 'normalCDF(0) is exactly 0.5 (symmetric mean)');
  assert(Math.abs(normalCDF(1.96) - 0.975) < 0.005, 'normalCDF(1.96) matches two-tailed 95% critical value ~0.975');

  // ==========================================================================
  // Test Group 3: Cohort Statistics & Welch's t-test
  // ==========================================================================
  console.log('Group 3: Cohort Stats & Welch\'s Two-Sample t-test');
  const gainsA = [0.2, 0.25, 0.3, 0.22, 0.28];
  const preA = [30, 35, 40, 32, 38];
  const postA = [44, 51, 58, 47, 55];
  const statsA = calculateCohortStats(gainsA, preA, postA, 'socratic');

  assert(statsA.sampleSize === 5, 'Stats A sample size is 5');
  assert(statsA.meanGain === 0.25, 'Stats A mean gain is 0.25');
  assert(statsA.standardDeviationGain > 0, 'Stats A standard deviation is strictly positive');

  const gainsB = [0.75, 0.8, 0.72, 0.78, 0.82];
  const preB = [30, 35, 40, 32, 38];
  const postB = [82, 87, 83, 85, 89];
  const statsB = calculateCohortStats(gainsB, preB, postB, 'worked_example');

  assert(statsB.sampleSize === 5, 'Stats B sample size is 5');
  assert(statsB.meanGain === 0.774, 'Stats B mean gain is 0.774');

  const tTestResult = computeWelchTTest(statsA, statsB);
  assert(tTestResult.tStatistic > 10, 't-statistic shows massive separation between Group A and Group B');
  assert(tTestResult.pValue < 0.001, 'Two-tailed p-value is extremely small (p < 0.001)');
  assert(tTestResult.cohensD > 2.0, 'Cohen\'s d shows massive effect size (> 2.0)');

  // ==========================================================================
  // Test Group 4: Pedagogical A/B Trial & Automated Promotion
  // ==========================================================================
  console.log('Group 4: Pedagogical A/B Trial & Automated Strategy Promotion');
  const recordsA = [
    { pre: 25, post: 45 }, { pre: 30, post: 50 }, { pre: 20, post: 42 },
    { pre: 35, post: 52 }, { pre: 28, post: 48 }, { pre: 32, post: 51 }
  ];
  const recordsB = [
    { pre: 25, post: 85 }, { pre: 30, post: 88 }, { pre: 20, post: 82 },
    { pre: 35, post: 90 }, { pre: 28, post: 86 }, { pre: 32, post: 87 }
  ];

  const abTrial = evaluatePedagogicalABTrial(
    'trial_test_001',
    'pointers',
    'C Memory Pointers',
    'socratic',
    recordsA,
    'worked_example',
    recordsB,
    5
  );

  assert(abTrial.status === 'concluded', 'A/B trial status is "concluded" when data is sufficient and significant');
  assert(abTrial.isStatisticallySignificant === true, 'Trial achieves statistical significance (p < 0.05)');
  assert(abTrial.winner === 'worked_example', 'Winner is properly identified as worked_example');
  assert(abTrial.promotionRecommendation !== undefined, 'Automated promotion recommendation generated');
  assert(abTrial.promotionRecommendation?.recommendedStrategy === 'worked_example', 'Recommended strategy is worked_example');
  assert(abTrial.promotionRecommendation?.confidence! >= 0.95, 'Promotion recommendation confidence >= 95%');

  // Test insufficient sample size
  const smallA = [{ pre: 20, post: 40 }];
  const smallB = [{ pre: 20, post: 80 }];
  const smallTrial = evaluatePedagogicalABTrial(
    'trial_small_002',
    'sorting',
    'Merge Sort',
    'analogies',
    smallA,
    'scaffolded',
    smallB,
    5
  );
  assert(smallTrial.status === 'insufficient_data', 'Trial with small sample size marked "insufficient_data"');
  assert(smallTrial.isStatisticallySignificant === false, 'Small sample trial cannot be marked statistically significant');

  // ==========================================================================
  // Test Group 5: Longitudinal Trajectory Windows
  // ==========================================================================
  console.log('Group 5: Longitudinal Trajectory Windows');
  const now = Date.now();
  const mockHistory: LongitudinalStudentGain[] = [
    { studentUid: 's1', conceptId: 'c1', preScore: 30, postScore: 85, normalizedGain: 0.7857, gainTier: 'high', strategyUsed: 'worked_example', timestamp: now - 100000 },
    { studentUid: 's2', conceptId: 'c1', preScore: 20, postScore: 80, normalizedGain: 0.75, gainTier: 'high', strategyUsed: 'worked_example', timestamp: now - 200000 },
    { studentUid: 's3', conceptId: 'c2', preScore: 40, postScore: 65, normalizedGain: 0.4167, gainTier: 'medium', strategyUsed: 'analogies', timestamp: now - (15 * 86400000) }
  ];

  const windows = aggregateLongitudinalWindows(mockHistory);
  assert(windows.length === 3, 'Returns 3 trajectory windows (weekly, monthly, semester)');

  const weekly = windows.find(w => w.window === 'weekly');
  assert(weekly !== undefined && weekly.sampleCount === 2, 'Weekly window correctly aggregates 2 recent records');
  assert(weekly?.topPerformingStrategy === 'worked_example', 'Weekly top performing strategy is worked_example');

  const monthly = windows.find(w => w.window === 'monthly');
  assert(monthly !== undefined && monthly.sampleCount === 3, 'Monthly window includes older record from 15 days ago (3 records total)');

  console.log(`\nMilestone 17 Verification Finished: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

if (process.argv[1]?.includes('pedagogicalEvaluationVerification')) {
  runPedagogicalEvaluationVerification().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
