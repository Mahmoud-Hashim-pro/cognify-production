/**
 * Cognify 2.0 - Benchmark Test Suite: AI Provider Cascade & Performance
 * Milestone Benchmark (Phase B: Requirements 14 & 18)
 * 
 * Validates:
 * 1. Provider fallback cascade order (Gemini -> Groq -> NVIDIA -> xAI)
 * 2. HTTP 429 & 503 upstream error simulation and failover handling
 * 3. Provider Circuit Breaker state machine (CLOSED -> OPEN -> HALF_OPEN -> CLOSED) & fast-bypass
 * 4. LaTeX math ($$, $) and Code markdown (```) preservation across all 4 providers
 * 5. Latency Percentiles (P50, P90, P99), TTFT, and Fallback Latency Penalty accounting
 * 6. Zero-token deterministic routing latency SLA (< 5.0ms)
 * 
 * Execution: npx tsx tests/benchmarks/aiProviderBenchmark.ts
 */

import {
  PROVIDER_PRICING_MODELS,
  PROVIDER_FALLBACK_CASCADE,
  calculateLatencyPercentiles,
  calculateTTFT,
  calculateFallbackLatencyPenalty,
  evaluateDeterministicRouting,
  ProviderCircuitBreaker,
  ProviderCascadeManager,
  preserveAndVerifyFormatting,
  CognifyProviderId,
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

export async function runAiProviderBenchmark(): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================================');
  console.log('--- Running Suite: AI Provider Benchmark & Cascade Engine (Req 14 & 18) ---');
  console.log('================================================================================\n');

  // ==========================================================================
  // Test Group 1: Provider Models & Cascade Ordering Verification
  // ==========================================================================
  console.log('Group 1: Provider Models & Cascade Hierarchy');
  assert(
    PROVIDER_FALLBACK_CASCADE[0] === 'gemini' &&
    PROVIDER_FALLBACK_CASCADE[1] === 'groq' &&
    PROVIDER_FALLBACK_CASCADE[2] === 'nvidia' &&
    PROVIDER_FALLBACK_CASCADE[3] === 'xai',
    'Cascade order strictly adheres to: Gemini -> Groq -> NVIDIA -> xAI'
  );

  assert(
    PROVIDER_PRICING_MODELS['gemini-1.5-flash'] !== undefined &&
    PROVIDER_PRICING_MODELS['gemini-1.5-pro'] !== undefined,
    'Google Gemini Flash & Pro pricing models are registered'
  );
  assert(
    PROVIDER_PRICING_MODELS['groq-llama-3.3-70b'] !== undefined,
    'Groq Cloud (Llama-3.3-70b) pricing model is registered'
  );
  assert(
    PROVIDER_PRICING_MODELS['nvidia-nemotron-70b'] !== undefined,
    'NVIDIA NIM (Nemotron-70b) pricing model is registered'
  );
  assert(
    PROVIDER_PRICING_MODELS['xai-grok-2'] !== undefined,
    'xAI (Grok-2) pricing model is registered'
  );

  // ==========================================================================
  // Test Group 2: Provider Fallback Cascade Execution (Gemini -> Groq -> NVIDIA -> xAI)
  // ==========================================================================
  console.log('\nGroup 2: Provider Fallback Cascade & HTTP Error Simulation');
  const cascadeManager = new ProviderCascadeManager();

  // 1. Primary Success: Gemini answers cleanly
  const resGemini = await cascadeManager.dispatchWithFallback(
    'What is photosynthetic efficiency?',
    async (providerId) => {
      if (providerId === 'gemini') {
        return { text: 'Photosynthetic efficiency is typically between 1% and 2% in plants.' };
      }
      return { text: 'fallback', statusCode: 500 };
    }
  );
  assert(resGemini.success === true, 'Primary Gemini invocation succeeds');
  assert(resGemini.succeededProvider === 'gemini', 'Response served by primary provider (Gemini)');
  assert(resGemini.attempts.length === 1, 'Cascade terminates on first provider without cascading');

  // 2. HTTP 429 Simulation: Gemini is rate-limited -> cascades to Groq
  const resGroq = await cascadeManager.dispatchWithFallback(
    'Explain binary search trees.',
    async (providerId) => {
      if (providerId === 'gemini') {
        return { text: 'Rate limit exceeded', statusCode: 429 };
      }
      if (providerId === 'groq') {
        return { text: 'A binary search tree has ordered nodes where left < root < right.' };
      }
      return { text: 'unexpected', statusCode: 500 };
    }
  );
  assert(resGroq.success === true, 'Cascade succeeds when Gemini returns HTTP 429');
  assert(resGroq.succeededProvider === 'groq', 'Successfully fell back to Groq');
  assert(resGroq.attempts.length === 2, 'Two attempts recorded: Gemini (429) then Groq (200)');
  assert(resGroq.attempts[0].errorCode === 429, 'Gemini attempt recorded with HTTP 429 error code');

  // 3. HTTP 503 Simulation: Gemini 503, Groq 503 -> cascades to NVIDIA NIM
  const resNvidia = await cascadeManager.dispatchWithFallback(
    'Describe matrix multiplication in CUDA.',
    async (providerId) => {
      if (providerId === 'gemini') return { text: 'Service Unavailable', statusCode: 503 };
      if (providerId === 'groq') return { text: 'Service Unavailable', statusCode: 503 };
      if (providerId === 'nvidia') {
        return { text: 'CUDA tile-based shared memory multiplication avoids global memory bottleneck.' };
      }
      return { text: 'unexpected', statusCode: 500 };
    }
  );
  assert(resNvidia.success === true, 'Cascade succeeds when Gemini & Groq return HTTP 503');
  assert(resNvidia.succeededProvider === 'nvidia', 'Successfully cascaded to NVIDIA NIM');
  assert(resNvidia.attempts.length === 3, 'Three attempts recorded before NVIDIA succeeded');
  assert(resNvidia.attempts[0].providerId === 'gemini' && resNvidia.attempts[1].providerId === 'groq', 'Correct fallback cascade sequence (Gemini -> Groq -> NVIDIA)');

  // 4. Triple upstream failure: Gemini, Groq, NVIDIA fail -> cascades to xAI
  const resXai = await cascadeManager.dispatchWithFallback(
    'Derive the Schwarzschild radius.',
    async (providerId) => {
      if (providerId === 'gemini') return { text: 'Internal error', statusCode: 500 };
      if (providerId === 'groq') return { text: 'Quota exceeded', statusCode: 429 };
      if (providerId === 'nvidia') return { text: 'Gateway timeout', statusCode: 504 };
      if (providerId === 'xai') {
        return { text: '$$r_s = \\frac{2GM}{c^2}$$' };
      }
      return { text: 'unexpected', statusCode: 500 };
    }
  );
  assert(resXai.success === true, 'Cascade reaches xAI when first 3 providers fail');
  assert(resXai.succeededProvider === 'xai', 'xAI successfully handles query as 4th-tier frontier fallback');
  assert(resXai.attempts.length === 4, 'Full 4-tier cascade path exercised');

  // 5. Total Cascade Failure: All 4 fail
  const resAllFail = await cascadeManager.dispatchWithFallback(
    'Complex query',
    async () => ({ text: 'Fatal error', statusCode: 503 })
  );
  assert(resAllFail.success === false, 'Cascade correctly reports total failure when all 4 providers fail');
  assert(resAllFail.succeededProvider === null, 'succeededProvider is null on total cascade failure');
  assert(resAllFail.attempts.length === 4, 'All 4 providers recorded attempts before giving up');

  // ==========================================================================
  // Test Group 3: Provider Circuit Breaker (Trip, Fast-Bypass, and Reset)
  // ==========================================================================
  console.log('\nGroup 3: Circuit Breaker State Machine & Fast-Bypass');
  const breaker = new ProviderCircuitBreaker('gemini', {
    failureThreshold: 3,
    recoveryTimeoutMs: 50, // Short timeout for rapid unit testing
    halfOpenSuccessProbes: 2,
  });

  assert(breaker.getState() === 'CLOSED', 'Breaker initializes in CLOSED state');
  
  // Failure 1 & 2
  breaker.recordFailure();
  assert(breaker.getState() === 'CLOSED', '1st failure keeps breaker CLOSED');
  breaker.recordFailure();
  assert(breaker.getState() === 'CLOSED', '2nd failure keeps breaker CLOSED');
  
  // Failure 3 trips breaker
  breaker.recordFailure();
  assert(breaker.getState() === 'OPEN', '3rd consecutive failure trips breaker to OPEN state');
  assert(breaker.getMetrics().totalTrippedCount === 1, 'Records tripped count increment');

  // Fast-Bypass in Manager when OPEN
  const fastBypassManager = new ProviderCascadeManager(PROVIDER_FALLBACK_CASCADE, {
    failureThreshold: 1,
    recoveryTimeoutMs: 10000,
    halfOpenSuccessProbes: 1,
  });
  // Trip Gemini breaker
  fastBypassManager.getBreaker('gemini').forceState('OPEN');

  const bypassResult = await fastBypassManager.dispatchWithFallback(
    'Test fast bypass',
    async (providerId) => {
      if (providerId === 'gemini') {
        throw new Error('Should NEVER be called because breaker is OPEN!');
      }
      return { text: 'Groq served instantly' };
    }
  );
  assert(bypassResult.success === true, 'Dispatch succeeds with Gemini breaker OPEN');
  assert(bypassResult.succeededProvider === 'groq', 'Request immediately forwarded to Groq');
  assert(bypassResult.attempts[0].durationMs === 0, 'OPEN provider bypassed with 0ms duration penalty');
  assert(bypassResult.attempts[0].errorCode === 'CIRCUIT_OPEN', 'Recorded CIRCUIT_OPEN error code for bypassed provider');

  // Breaker Auto-Recovery to HALF_OPEN after recoveryTimeoutMs
  await new Promise((r) => setTimeout(r, 60));
  assert(breaker.getState() === 'HALF_OPEN', 'Breaker transitions to HALF_OPEN after timeout');

  // 1st probe in HALF_OPEN succeeds
  breaker.recordSuccess();
  assert(breaker.getState() === 'HALF_OPEN', '1st successful probe keeps state HALF_OPEN');

  // 2nd probe in HALF_OPEN succeeds -> transitions to CLOSED
  breaker.recordSuccess();
  assert(breaker.getState() === 'CLOSED', '2nd successful probe resets breaker to CLOSED');

  // Manual reset test
  breaker.forceState('OPEN');
  breaker.reset();
  assert(breaker.getState() === 'CLOSED', 'Manual reset restores breaker to CLOSED state');

  // ==========================================================================
  // Test Group 4: LaTeX Math & Code Markdown Preservation
  // ==========================================================================
  console.log('\nGroup 4: LaTeX Math & Code Markdown Preservation Across Providers');

  // 1. Display and Inline LaTeX formulas
  const cleanLatex = 'The Schrödinger equation is $i\\hbar \\frac{\\partial}{\\partial t} \\Psi = \\hat{H}\\Psi$, with density $$\\rho = |\\Psi|^2$$.';
  const latexCheck = preserveAndVerifyFormatting(cleanLatex);
  assert(latexCheck.isLatexValid === true, 'Balanced LaTeX formulas verified valid');
  assert(latexCheck.wasRepaired === false, 'Balanced LaTeX requires no repairs');
  assert(latexCheck.repairedText === cleanLatex, 'Pristine LaTeX text preserved verbatim');

  // 2. Unclosed Display LaTeX repair across provider response
  const unclosedDisplay = 'Energy formula:\n$$E = mc^2';
  const displayFixed = preserveAndVerifyFormatting(unclosedDisplay);
  assert(displayFixed.wasRepaired === true, 'Unclosed display $$ detected and repaired');
  assert(displayFixed.repairedText.endsWith('$$'), 'Display math successfully balanced with closing $$');
  assert(displayFixed.isLatexValid === true, 'Repaired LaTeX satisfies validity check');

  // 3. Unclosed Inline LaTeX repair
  const unclosedInline = 'where $x > 0 is strictly positive.';
  const inlineFixed = preserveAndVerifyFormatting(unclosedInline);
  assert(inlineFixed.wasRepaired === true, 'Unclosed inline $ detected and repaired');
  assert(inlineFixed.isLatexValid === true, 'Repaired inline LaTeX satisfies validity check');

  // 4. Code Markdown block preservation
  const cleanCode = '```typescript\nconst add = (a: number, b: number): number => a + b;\n```';
  const codeCheck = preserveAndVerifyFormatting(cleanCode);
  assert(codeCheck.isCodeFenceValid === true, 'Balanced code fence verified valid');
  assert(codeCheck.wasRepaired === false, 'Balanced code fence left unmodified');

  // 5. Unclosed Code block repair
  const brokenCode = 'Here is the Python implementation:\n```python\ndef fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)';
  const brokenCodeFixed = preserveAndVerifyFormatting(brokenCode);
  assert(brokenCodeFixed.wasRepaired === true, 'Unclosed code block detected and repaired');
  assert(brokenCodeFixed.repairedText.includes('```'), 'Code block closed with closing triple backticks');
  assert(brokenCodeFixed.isCodeFenceValid === true, 'Repaired code block passes fence balance check');

  // 6. Preservation verified during Cascade Dispatch
  const formattingCascade = new ProviderCascadeManager();
  const formatCascadeRes = await formattingCascade.dispatchWithFallback(
    'Calculate integral',
    async () => ({ text: 'The integral is $$\\int_0^1 x dx' }) // Unclosed by upstream provider
  );
  assert(formatCascadeRes.wasRepaired === true, 'Cascade automatically self-heals unclosed upstream LaTeX');
  assert(formatCascadeRes.latexBalanced === true, 'Output from cascade manager is guaranteed latexBalanced');

  // ==========================================================================
  // Test Group 5: Latency Percentiles (P50, P90, P99) & TTFT
  // ==========================================================================
  console.log('\nGroup 5: Latency Percentiles, TTFT & Fallback Latency Penalty');

  const sampleLatencies = [120, 150, 160, 180, 200, 210, 250, 300, 450, 950];
  const percentiles = calculateLatencyPercentiles(sampleLatencies);
  assert(percentiles.count === 10, 'Sample size accurately recorded as 10');
  assert(percentiles.min === 120, 'Minimum latency is 120ms');
  assert(percentiles.max === 950, 'Maximum latency is 950ms');
  assert(percentiles.p50 >= 190 && percentiles.p50 <= 220, `P50 median is within expected range (${percentiles.p50}ms)`);
  assert(percentiles.p90 >= 450, `P90 is >= 450ms (${percentiles.p90}ms)`);
  assert(percentiles.p99 >= 900, `P99 is >= 900ms (${percentiles.p99}ms)`);

  // TTFT calculation
  const ttft = calculateTTFT(1000, 1280);
  assert(ttft === 280, 'TTFT calculated accurately (280ms)');

  // Fallback latency penalty calculation
  const penalty = calculateFallbackLatencyPenalty([
    { providerId: 'gemini', durationMs: 250, status: 'failed', errorCode: 429 },
    { providerId: 'groq', durationMs: 140, status: 'succeeded' },
  ]);
  assert(penalty.totalLatencyMs === 390, 'Total latency is sum of failed attempt + success (390ms)');
  assert(penalty.standaloneProviderLatencyMs === 140, 'Standalone provider latency is 140ms');
  assert(penalty.fallbackLatencyPenaltyMs === 250, 'Fallback latency penalty is exactly 250ms upstream overhead');
  assert(penalty.isCascaded === true, 'Marked isCascaded = true');

  // ==========================================================================
  // Test Group 6: Zero-Token Deterministic Routing Efficiency (< 5ms)
  // ==========================================================================
  console.log('\nGroup 6: Zero-Token Deterministic Routing Efficiency (< 5ms SLA)');

  // 1. Simple greeting
  const greetingRoute = evaluateDeterministicRouting('Hello Cognify!');
  assert(greetingRoute.isDeterministic === true, 'Greeting is routed deterministically');
  assert(greetingRoute.intent === 'greeting', 'Intent recognized as greeting');
  assert(greetingRoute.tokensConsumed === 0, 'Zero tokens consumed for greeting');
  assert(greetingRoute.costUSD === 0, 'Zero cost ($0.00) for deterministic routing');
  assert(greetingRoute.meetsLatencySLA === true, `Execution meets < 5ms SLA (${greetingRoute.executionTimeMs}ms)`);
  assert(greetingRoute.executionTimeMs < 5.0, 'Measured execution time strictly < 5.0ms');

  // 2. Simple arithmetic
  const mathRoute = evaluateDeterministicRouting('42 + 58');
  assert(mathRoute.isDeterministic === true, 'Simple arithmetic is routed deterministically');
  assert(mathRoute.intent === 'simple_math', 'Intent recognized as simple_math');
  assert(mathRoute.cachedResponse === '42 + 58 = 100', 'Arithmetic accurately calculated deterministically');
  assert(mathRoute.tokensConsumed === 0, 'Zero tokens consumed for arithmetic calculation');
  assert(mathRoute.executionTimeMs < 5.0, `Arithmetic calculation executed in ${mathRoute.executionTimeMs}ms (< 5ms)`);

  // 3. Local cache hit
  const mockCache = new Map<string, string>([
    ['what is the capital of france?', 'Paris is the capital of France.'],
  ]);
  const cacheRoute = evaluateDeterministicRouting('What is the capital of France?', mockCache);
  assert(cacheRoute.isDeterministic === true, 'Cache lookup routed deterministically');
  assert(cacheRoute.intent === 'cache_hit', 'Intent marked as cache_hit');
  assert(cacheRoute.cachedResponse?.includes('Paris') === true, 'Correct cached answer returned');
  assert(cacheRoute.tokensConsumed === 0, 'Zero tokens consumed for cache hit');
  assert(cacheRoute.executionTimeMs < 5.0, `Cache hit evaluated in ${cacheRoute.executionTimeMs}ms (< 5ms)`);

  // 4. Academic question requires LLM (non-deterministic)
  const llmRoute = evaluateDeterministicRouting('Analyze the epistemic nuances of Kantian transcendental idealism.');
  assert(llmRoute.isDeterministic === false, 'Complex philosophical query not intercepted deterministically');
  assert(llmRoute.intent === null, 'No deterministic intent matched');
  assert(llmRoute.executionTimeMs < 5.0, `Negative routing check completes in ${llmRoute.executionTimeMs}ms (< 5ms)`);

  console.log('================================================================================');
  console.log(`AI Provider Benchmark Finished: ${passed} passed, ${failed} failed.`);
  console.log('================================================================================\n');

  return { passed, failed };
}

// Direct CLI execution check
if (process.argv[1]?.includes('aiProviderBenchmark')) {
  runAiProviderBenchmark().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
