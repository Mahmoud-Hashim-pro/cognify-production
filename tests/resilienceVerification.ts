/**
 * Milestone 19 Verification Suite: Production Hardening, Observability & Resilience
 * Tests Circuit Breaker state transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED),
 * Sliding Window Rate Limiting, Latency Percentiles (p50, p95, p99), and Degradation Fallbacks.
 */

import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  SlidingWindowRateLimiter,
  calculateLatencyHistogram,
  getDegradedFallbackResponse,
  compileResilienceTelemetry
} from '../src/lib/resilienceEngine';
import type { ServiceProbe } from '../src/types/resilience';

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

export async function runResilienceVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Running Suite 50: Milestone 19 (Production Hardening & Resilience) ---');

  // ==========================================================================
  // Test Group 1: Circuit Breaker State Machine & Cascade Prevention
  // ==========================================================================
  console.log('Group 1: Circuit Breaker State Transitions');
  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    recoveryTimeoutMs: 50, // Short timeout for unit test speed
    halfOpenMaxProbes: 2
  });

  assert(breaker.getState() === 'CLOSED', 'Breaker initializes in CLOSED state');

  // 1st failure
  breaker.recordFailure();
  assert(breaker.getState() === 'CLOSED', '1 failure leaves breaker CLOSED');

  // 2nd failure
  breaker.recordFailure();
  assert(breaker.getState() === 'CLOSED', '2 failures leaves breaker CLOSED');

  // 3rd failure: Trips breaker to OPEN
  breaker.recordFailure();
  assert(breaker.getState() === 'OPEN', '3 failures trips breaker to OPEN state');
  assert(breaker.getMetrics().totalTrippedCount === 1, 'Records 1 total tripped incident');

  // Fast-fail when OPEN
  let rejectedFast = false;
  try {
    await breaker.execute(async () => 'should_not_run');
  } catch (err: any) {
    if (err instanceof CircuitBreakerOpenError) {
      rejectedFast = true;
    }
  }
  assert(rejectedFast === true, 'Breaker rejects calls with CircuitBreakerOpenError while OPEN');

  // Fallback executed when OPEN
  const fallbackResult = await breaker.execute(
    async () => 'primary_action',
    async () => 'fallback_action'
  );
  assert(fallbackResult === 'fallback_action', 'Breaker executes graceful fallback when OPEN');

  // Auto-recovery to HALF_OPEN after recoveryTimeoutMs
  await new Promise(r => setTimeout(r, 60));
  assert(breaker.getState() === 'HALF_OPEN', 'Breaker auto-transitions to HALF_OPEN after timeout');

  // 1st probe in HALF_OPEN succeeds
  breaker.recordSuccess();
  assert(breaker.getState() === 'HALF_OPEN', '1st successful probe keeps state HALF_OPEN');

  // 2nd probe succeeds: Closes circuit
  breaker.recordSuccess();
  assert(breaker.getState() === 'CLOSED', '2nd successful probe recovers breaker to CLOSED state');

  // Failure in HALF_OPEN immediately re-trips to OPEN
  breaker.forceState('HALF_OPEN');
  breaker.recordFailure();
  assert(breaker.getState() === 'OPEN', 'Failure while HALF_OPEN immediately re-trips circuit to OPEN');

  // ==========================================================================
  // Test Group 2: Sliding Window Rate Limiting
  // ==========================================================================
  console.log('Group 2: Sliding Window Rate Limiting');
  const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, maxRequests: 5 });

  // Consume 3 requests
  const r1 = limiter.consume('user_ip_1', 3);
  assert(r1.allowed === true, 'Allows request within quota (3 consumed, 5 max)');
  assert(r1.remaining === 2, '2 requests remaining in window');

  // Consume 2 more requests (at max)
  const r2 = limiter.consume('user_ip_1', 2);
  assert(r2.allowed === true, 'Allows request reaching exact limit');
  assert(r2.remaining === 0, '0 requests remaining');

  // Next request must be throttled
  const r3 = limiter.consume('user_ip_1', 1);
  assert(r3.allowed === false, 'Throttles request exceeding window quota (HTTP 429)');
  assert(r3.remaining === 0, 'Remaining is 0 when throttled');

  // Different key is completely isolated
  const rOther = limiter.consume('user_ip_2', 1);
  assert(rOther.allowed === true, 'Different IP/key has independent isolated quota');

  // Reset clears limits
  limiter.reset('user_ip_1');
  const rAfterReset = limiter.consume('user_ip_1', 1);
  assert(rAfterReset.allowed === true, 'Resetting key restores available quota');

  // ==========================================================================
  // Test Group 3: Latency Percentile Histogram (p50, p95, p99)
  // ==========================================================================
  console.log('Group 3: Latency Percentiles (p50, p95, p99)');
  // 100 samples from 1 to 100
  const latencies = Array.from({ length: 100 }, (_, i) => i + 1);
  const hist = calculateLatencyHistogram(latencies);

  assert(hist.min === 1, 'Calculates correct minimum latency (1ms)');
  assert(hist.max === 100, 'Calculates correct maximum latency (100ms)');
  assert(hist.average === 50.5, 'Calculates correct average latency (50.5ms)');
  assert(hist.p50 === 50, 'Calculates p50 (median) latency of 50ms');
  assert(hist.p95 === 95, 'Calculates p95 latency of 95ms');
  assert(hist.p99 === 99, 'Calculates p99 tail latency of 99ms');

  // Empty handling
  const emptyHist = calculateLatencyHistogram([]);
  assert(emptyHist.average === 0 && emptyHist.p50 === 0, 'Empty latency array handled safely without NaN');

  // ==========================================================================
  // Test Group 4: Graceful Degradation Matrix & Offline Fallbacks
  // ==========================================================================
  console.log('Group 4: Graceful Degradation Offline Cache');
  const fbPointers = getDegradedFallbackResponse('c_pointers');
  assert(fbPointers.source === 'offline_cache', 'Fallback marked with offline_cache source');
  assert(fbPointers.text.includes('address of another variable'), 'Offline fallback contains valid conceptual explanation');

  const fbUnknown = getDegradedFallbackResponse('unmapped_super_advanced_concept');
  assert(fbUnknown.text.includes('offline mode'), 'Unmapped concept returns safe pedagogical offline fallback');

  // ==========================================================================
  // Test Group 5: Telemetry Aggregation
  // ==========================================================================
  console.log('Group 5: Telemetry Aggregation');
  const healthyProbes: ServiceProbe[] = [
    { serviceId: 's1', name: 'Gemini', status: 'healthy', latencyMs: 120, circuitState: 'CLOSED', lastChecked: Date.now(), errorBudgetRemainingPercent: 99 },
    { serviceId: 's2', name: 'DB', status: 'healthy', latencyMs: 25, circuitState: 'CLOSED', lastChecked: Date.now(), errorBudgetRemainingPercent: 100 }
  ];
  const telemHealthy = compileResilienceTelemetry(healthyProbes, [100, 120]);
  assert(telemHealthy.overallHealth === 'healthy', 'All healthy services produce overall healthy system');
  assert(telemHealthy.degradedModeActive === false, 'Degraded mode is false when healthy');

  const criticalProbes: ServiceProbe[] = [
    { serviceId: 's1', name: 'Gemini', status: 'critical', latencyMs: 5000, circuitState: 'OPEN', lastChecked: Date.now(), errorBudgetRemainingPercent: 0 }
  ];
  const telemCritical = compileResilienceTelemetry(criticalProbes, [5000]);
  assert(telemCritical.overallHealth === 'critical', 'Open circuit probe marks overall system critical');
  assert(telemCritical.degradedModeActive === true, 'Degraded mode activated on critical probe');

  console.log(`\nMilestone 19 Verification Finished: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

if (process.argv[1]?.includes('resilienceVerification')) {
  runResilienceVerification().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
