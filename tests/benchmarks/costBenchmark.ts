/**
 * Cognify 2.0 - Benchmark Test Suite: Token Economics, Quota Tracking & Margins
 * Milestone Benchmark (Phase B: Requirements 18 & 19)
 * 
 * Validates:
 * 1. Monthly token cost forecasting across all 4 providers & models
 * 2. Monthly student cost bounds (< $0.50/month on Gemini 1.5 Flash default)
 * 3. Cohort aggregate cost models (1,000 students < $60.00 total monthly AI compute)
 * 4. Quota alerts triggered accurately at 80% (warning) and 100% (exceeded)
 * 5. Emergency Circuit Cutoff behavior and deterministic safe fallback routing
 * 6. Institutional tiered seat margins (Pilot, School, District > 85% gross margin)
 * 
 * Execution: npx tsx tests/benchmarks/costBenchmark.ts
 */

import {
  PROVIDER_PRICING_MODELS,
  calculateTurnCost,
  calculateStudentMonthlyCost,
  calculateCohortMonthlyCost,
  calculateInstitutionalMargins,
  CostQuotaTracker,
  STUDENT_TIER_SPECS,
  INSTITUTIONAL_TIERS,
} from '../../src/lib/aiProviderBenchmark';

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

export async function runCostBenchmark(): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================================');
  console.log('--- Running Suite: AI Provider Cost & Quota Benchmark (Req 18 & 19) ---');
  console.log('================================================================================\n');

  // ==========================================================================
  // Test Group 1: Monthly Token Cost Forecasting Across 4 Providers
  // ==========================================================================
  console.log('Group 1: Token Pricing & Turn Cost Models Across All 4 Providers');

  // 1. Google Gemini 1.5 Flash Pricing
  const flashModel = PROVIDER_PRICING_MODELS['gemini-1.5-flash'];
  assert(flashModel.inputCostPerMillion === 0.075, 'Gemini 1.5 Flash input cost is $0.075 / 1M tokens');
  assert(flashModel.outputCostPerMillion === 0.30, 'Gemini 1.5 Flash output cost is $0.30 / 1M tokens');

  // Turn cost calculation on Flash: 1,000 input tokens, 500 output tokens
  const flashTurn = calculateTurnCost('gemini-1.5-flash', 1000, 500);
  // (1000 / 1e6) * 0.075 = 0.000075 ; (500 / 1e6) * 0.30 = 0.00015 -> total = 0.000225
  assert(flashTurn.totalCostUSD === 0.000225, `Gemini Flash turn cost accurately calculated ($${flashTurn.totalCostUSD})`);

  // 2. Google Gemini 1.5 Pro Pricing
  const proModel = PROVIDER_PRICING_MODELS['gemini-1.5-pro'];
  assert(proModel.inputCostPerMillion === 1.25, 'Gemini 1.5 Pro input cost is $1.25 / 1M tokens');
  assert(proModel.outputCostPerMillion === 5.00, 'Gemini 1.5 Pro output cost is $5.00 / 1M tokens');
  const proTurn = calculateTurnCost('gemini-1.5-pro', 1000, 500);
  assert(proTurn.totalCostUSD === 0.00375, `Gemini Pro turn cost calculated ($${proTurn.totalCostUSD})`);

  // 3. Groq (Llama-3.3-70b) Pricing
  const groqModel = PROVIDER_PRICING_MODELS['groq-llama-3.3-70b'];
  assert(groqModel.inputCostPerMillion === 0.59, 'Groq Llama-3.3-70b input cost is $0.59 / 1M tokens');
  assert(groqModel.outputCostPerMillion === 0.79, 'Groq Llama-3.3-70b output cost is $0.79 / 1M tokens');
  const groqTurn = calculateTurnCost('groq-llama-3.3-70b', 1000, 500);
  assert(groqTurn.totalCostUSD === 0.000985, `Groq turn cost calculated ($${groqTurn.totalCostUSD})`);

  // 4. NVIDIA NIM (Nemotron-70b) Pricing
  const nvidiaModel = PROVIDER_PRICING_MODELS['nvidia-nemotron-70b'];
  assert(nvidiaModel.inputCostPerMillion === 0.70, 'NVIDIA NIM Nemotron-70b input cost is $0.70 / 1M tokens');
  assert(nvidiaModel.outputCostPerMillion === 0.80, 'NVIDIA NIM Nemotron-70b output cost is $0.80 / 1M tokens');
  const nvidiaTurn = calculateTurnCost('nvidia-nemotron-70b', 1000, 500);
  assert(nvidiaTurn.totalCostUSD === 0.0011, `NVIDIA NIM turn cost calculated ($${nvidiaTurn.totalCostUSD})`);

  // 5. xAI (Grok-2) Pricing
  const xaiModel = PROVIDER_PRICING_MODELS['xai-grok-2'];
  assert(xaiModel.inputCostPerMillion === 2.00, 'xAI Grok-2 input cost is $2.00 / 1M tokens');
  assert(xaiModel.outputCostPerMillion === 10.00, 'xAI Grok-2 output cost is $10.00 / 1M tokens');
  const xaiTurn = calculateTurnCost('xai-grok-2', 1000, 500);
  assert(xaiTurn.totalCostUSD === 0.007, `xAI Grok-2 turn cost calculated ($${xaiTurn.totalCostUSD})`);

  // 6. Multimodal turn cost calculation (Audio & Vision)
  const multimodalTurn = calculateTurnCost('gemini-1.5-flash', 1000, 500, {
    audioSeconds: 30, // 30 seconds of speech
    visionImages: 1,  // 1 webcam snapshot
  });
  assert(multimodalTurn.multimodalCostUSD > 0, 'Multimodal audio/vision cost modeled accurately');
  assert(multimodalTurn.totalCostUSD > flashTurn.totalCostUSD, 'Total cost reflects input + output + multimodal');

  // ==========================================================================
  // Test Group 2: Monthly Student Cost Bounds (< $0.50/month on Flash default)
  // ==========================================================================
  console.log('\nGroup 2: Monthly Student Cost Bounds (< $0.50/month on Flash Default)');

  // Light Student: 5 turns/day * 20 days = 100 turns
  const lightCost = calculateStudentMonthlyCost('light', 'gemini-1.5-flash');
  assert(lightCost.totalMonthlyCostUSD < 0.50, `Light student monthly cost ($${lightCost.totalMonthlyCostUSD}) is < $0.50`);
  assert(lightCost.totalMonthlyCostUSD <= 0.02, `Light student is exceptionally economical (<= $0.02/mo)`);
  assert(lightCost.isWithinDefaultSLA === true, 'Light student flagged isWithinDefaultSLA = true');

  // Moderate Student: 15 turns/day * 22 days = 330 turns + audio + vision
  const moderateCost = calculateStudentMonthlyCost('moderate', 'gemini-1.5-flash');
  assert(moderateCost.totalMonthlyCostUSD < 0.50, `Moderate student monthly cost ($${moderateCost.totalMonthlyCostUSD}) is < $0.50`);
  assert(moderateCost.totalMonthlyCostUSD <= 0.06, `Moderate student is highly economical (<= $0.06/mo)`);
  assert(moderateCost.isWithinDefaultSLA === true, 'Moderate student flagged isWithinDefaultSLA = true');

  // Heavy Student: 35 turns/day * 25 days = 875 turns + audio + vision
  const heavyCost = calculateStudentMonthlyCost('heavy', 'gemini-1.5-flash');
  assert(heavyCost.totalMonthlyCostUSD < 0.50, `Heavy student monthly cost ($${heavyCost.totalMonthlyCostUSD}) is strictly < $0.50 SLA`);
  assert(heavyCost.isWithinDefaultSLA === true, 'Heavy student satisfies SLA bounds');

  // Power Student (Extreme outlier power user)
  const powerCost = calculateStudentMonthlyCost('power', 'gemini-1.5-flash');
  assert(powerCost.monthlyTurns === 2240, 'Power user executes 2,240 turns per month');
  assert(powerCost.totalMonthlyCostUSD < 1.00, `Even power user is < $1.00/month ($${powerCost.totalMonthlyCostUSD})`);

  // Cohort Simulation: 1,000 active students (50% light, 35% moderate, 12% heavy, 3% power)
  const cohort1000 = calculateCohortMonthlyCost(1000, undefined, 'gemini-1.5-flash');
  assert(cohort1000.cohortSize === 1000, 'Cohort size is 1,000 students');
  assert(cohort1000.averageCostPerStudentUSD < 0.50, `Cohort blended average ($${cohort1000.averageCostPerStudentUSD}) is < $0.50`);
  assert(cohort1000.averageCostPerStudentUSD < 0.07, `Cohort blended average is under $0.07 per student/month`);
  assert(cohort1000.totalMonthlyCostUSD < 60.00, `Total monthly AI compute bill for 1,000 students is < $60.00 ($${cohort1000.totalMonthlyCostUSD})`);
  assert(cohort1000.withinBudgetSLA === true, 'Cohort satisfies institutional budget SLA');

  // ==========================================================================
  // Test Group 3: Quota Alerts at 80% and 100%
  // ==========================================================================
  console.log('\nGroup 3: Quota Alert Triggers at 80% (Warning) and 100% (Exceeded)');

  const budget = 100.00; // $100 monthly budget
  const quotaTracker = new CostQuotaTracker(budget);

  // 1. Initial State
  const state0 = quotaTracker.getState();
  assert(state0.status === 'normal', 'Initial quota state is normal');
  assert(state0.alert === null, 'No alert fired initially');
  assert(state0.percentageUsed === 0, 'Percentage used is 0%');

  // 2. Spend $50 (50%) -> Normal
  const state50 = quotaTracker.recordSpend(50.00);
  assert(state50.status === 'normal', '50% spend remains in normal status');
  assert(state50.alert === null, 'No alert fired at 50%');
  assert(state50.warningAlertFired === false, 'warningAlertFired is false at 50%');
  assert(state50.emergencyCutoffActive === false, 'Emergency cutoff is inactive at 50%');

  // 3. Spend $30 more -> Total $80 (80%) -> Triggers ALERT_80_PERCENT_WARNING
  const state80 = quotaTracker.recordSpend(30.00);
  assert(state80.percentageUsed === 80, 'Usage reached exactly 80.00%');
  assert(state80.status === 'warning_80', 'Status transitioned to warning_80');
  assert(state80.alert === 'ALERT_80_PERCENT_WARNING', 'ALERT_80_PERCENT_WARNING triggered at 80% threshold');
  assert(state80.warningAlertFired === true, 'warningAlertFired flag set to true');
  assert(state80.emergencyCutoffActive === false, 'Emergency cutoff is NOT active yet at 80% warning');

  // 4. Spend $15 more -> Total $95 (95%) -> Remains warning_80
  const state95 = quotaTracker.recordSpend(15.00);
  assert(state95.percentageUsed === 95, 'Usage reached 95.00%');
  assert(state95.status === 'warning_80', 'Status remains warning_80 between 80% and 100%');
  assert(state95.emergencyCutoffActive === false, 'Cutoff still inactive at 95%');

  // 5. Spend $5 more -> Total $100 (100%) -> Triggers ALERT_100_PERCENT_EXCEEDED
  const state100 = quotaTracker.recordSpend(5.00);
  assert(state100.percentageUsed === 100, 'Usage reached exactly 100.00%');
  assert(state100.status === 'exceeded_100', 'Status transitioned to exceeded_100');
  assert(state100.alert === 'ALERT_100_PERCENT_EXCEEDED', 'ALERT_100_PERCENT_EXCEEDED triggered at 100% threshold');
  assert(state100.exceededAlertFired === true, 'exceededAlertFired flag set to true');
  assert(state100.emergencyCutoffActive === true, 'Emergency circuit cutoff is ACTIVATED at 100%');

  // ==========================================================================
  // Test Group 4: Emergency Circuit Cutoff Behavior
  // ==========================================================================
  console.log('\nGroup 4: Emergency Circuit Cutoff Behavior & Fallback Enforcement');

  // While cutoff is active, verifyCanExecute must reject paid calls
  const execCheck = quotaTracker.verifyCanExecute(0.01);
  assert(execCheck.allowed === false, 'Paid AI calls rejected when emergency cutoff is active');
  assert(execCheck.reason?.includes('EMERGENCY_CIRCUIT_CUTOFF_ACTIVE') === true, 'Clear reason provided for cutoff rejection');

  const executionRecord = {
    expensiveCallExecuted: false,
    deterministicFallbackExecuted: false,
  };

  const result = quotaTracker.executeSafely(
    () => {
      executionRecord.expensiveCallExecuted = true;
      return 'expensive_ai_generation';
    },
    () => {
      executionRecord.deterministicFallbackExecuted = true;
      return 'cached_zero_cost_fallback';
    },
    0.005
  );

  assert(executionRecord.expensiveCallExecuted === false, 'Expensive AI generation call was blocked by circuit cutoff');
  assert(executionRecord.deterministicFallbackExecuted === true, 'Deterministic zero-cost fallback was safely executed instead');
  assert(result === 'cached_zero_cost_fallback', 'Fallback result returned smoothly without unhandled exceptions');

  // Reset Quota Tracker (e.g. at start of new billing month or budget increase)
  quotaTracker.reset(150.00);
  const resetState = quotaTracker.getState();
  assert(resetState.budgetUSD === 150.00, 'Budget updated to $150.00 on reset');
  assert(resetState.spentUSD === 0, 'Spent amount reset to 0');
  assert(resetState.emergencyCutoffActive === false, 'Emergency cutoff released after reset');
  assert(resetState.status === 'normal', 'Status returned to normal');

  // ==========================================================================
  // Test Group 5: Institutional Tiered Seat Margins
  // ==========================================================================
  console.log('\nGroup 5: Institutional Tiered Seat Margins (Requirements 18 & 19)');

  // 1. Pilot Tier (Small: 25 seats @ $5.00/seat/mo)
  const pilotMargin = calculateInstitutionalMargins('pilot', 50, 'gemini-1.5-flash');
  assert(pilotMargin.monthlyRevenueUSD === 250.00, 'Pilot tier revenue for 50 seats is $250.00/mo');
  assert(pilotMargin.grossMarginPercentage > 90.0, `Pilot gross margin is > 90% (${pilotMargin.grossMarginPercentage}%)`);
  assert(pilotMargin.isHighMargin === true, 'Pilot tier qualifies as high-margin');

  // 2. School Tier (Medium: 500 seats @ $3.50/seat/mo)
  const schoolMargin = calculateInstitutionalMargins('school', 500, 'gemini-1.5-flash');
  assert(schoolMargin.monthlyRevenueUSD === 1750.00, 'School tier revenue for 500 seats is $1,750.00/mo');
  assert(schoolMargin.grossMarginPercentage > 90.0, `School tier gross margin is > 90% (${schoolMargin.grossMarginPercentage}%)`);
  assert(schoolMargin.grossProfitUSD > 1500.00, `School tier yields > $1,500 monthly gross profit ($${schoolMargin.grossProfitUSD})`);

  // 3. District Tier (Enterprise: 5,000 seats @ $2.00/seat/mo)
  const districtMargin = calculateInstitutionalMargins('district', 5000, 'gemini-1.5-flash');
  assert(districtMargin.monthlyRevenueUSD === 10000.00, 'District tier revenue for 5,000 seats is $10,000.00/mo');
  assert(districtMargin.grossMarginPercentage > 85.0, `District tier gross margin is > 85% (${districtMargin.grossMarginPercentage}%)`);
  assert(districtMargin.blendedAiCostPerSeatUSD < 0.07, 'Blended AI compute cost per seat is < $0.07/mo');

  console.log('================================================================================');
  console.log(`Cost Benchmark Finished: ${passed} passed, ${failed} failed.`);
  console.log('================================================================================\n');

  return { passed, failed };
}

// Direct CLI execution check
if (process.argv[1]?.includes('costBenchmark')) {
  runCostBenchmark().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
