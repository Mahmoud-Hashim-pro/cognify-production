/**
 * Phase 2A: Real Adaptive API Verification & Outcome Tracking
 *
 * Exercises and verifies the complete end-to-end closed loop through the
 * actual production serverless API handler (`api/gemini/generateAdaptiveResponse.ts`):
 *
 * 1. Initial Baseline: Verify initial student state and default parameters.
 * 2. Attempt 1: Baseline correct answer (streak 1, 100% accuracy).
 * 3. Attempt 2: Incorrect answer with high response latency (>15s).
 * 4. Attempt 3: Repeated incorrect answer triggering high learning strain (>=0.8)
 *    and mandatory `worked_example` intervention.
 * 5. Real Serverless API Pipeline:
 *    - Calls `generateAdaptiveResponse.ts` `handler(req, res)` directly.
 *    - Authenticated guard validation.
 *    - Deterministic state-aware classification (`learningStrain >= 0.8` -> `category: 'reasoning'`).
 *    - System persona dynamically injected with mandatory `WORKED_EXAMPLE` directives.
 *    - Model inference via provider fallback pipeline with Quality Guard sanitation.
 *    - HTTP 200 response with validated output, category, and active pedagogy.
 * 6. Formative Micro-Check Extraction:
 *    - Parse `:::micro-check` JSON block from the real API response.
 * 7. Remediation Execution:
 *    - Student solves the micro-check successfully.
 * 8. Outcome Tracking & Strategy Effectiveness Verification:
 *    - Verify `InterventionOutcomeRecord` logged in `state.interventionHistory` with `outcome: 'success'`.
 *    - Verify `strategyOutcomes` win-rate metrics for `worked_example` on `pointers`.
 *    - Verify `bestObservedStrategy` resolves to `worked_example`.
 *    - Verify `pedagogyEffectiveness['worked_example'].helpfulCount` incremented.
 *    - Verify intervention resolves back to `scaffolded` guided practice.
 * 9. Feedback Loop Verification:
 *    - Explicit feedback registered and updates global effectiveness scores.
 * 10. Mastery Streak & Socratic Promotion:
 *    - Two subsequent correct answers establish a 3-in-a-row streak.
 *    - Automatic promotion to `socratic` challenge and advanced industry scale.
 */

import { getStudentStateManager, createInitialStudentState, StudentState } from '../src/lib/studentStateEngine.js';
import { buildPersona, Profile } from '../api/_lib/ai.js';
import handler from '../api/gemini/generateAdaptiveResponse.js';

let totalPassed = 0;
let totalFailed = 0;

export async function runRealAdaptiveApiVerification(
  customAssert?: (cond: boolean, name: string) => void
): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🧪 PHASE 2A: REAL ADAPTIVE API VERIFICATION & OUTCOME TRACKING');
  console.log('================================================================');

  let passedLocal = 0;
  let failedLocal = 0;

  const assert = (cond: boolean, name: string) => {
    if (customAssert) {
      customAssert(cond, name);
    } else {
      if (cond) {
        console.log(`  ✓ PASS: ${name}`);
        totalPassed++;
      } else {
        console.error(`  ✗ FAIL: ${name}`);
        totalFailed++;
      }
    }
    if (cond) passedLocal++;
    else failedLocal++;
  };

  const studentUid = `student_real_api_${Date.now()}`;
  const mgr = getStudentStateManager(studentUid, 'Basic');

  const mockProfile: Profile = {
    uid: studentUid,
    level: 'Basic',
    role: 'Student',
    field: 'Computer Science',
    language: 'English',
    accessibilityMode: 'None',
  };

  // -------------------------------------------------------------------------
  // Step 1: Initial Baseline Verification
  // -------------------------------------------------------------------------
  console.log('\n[Step 1] Initial Baseline State Verification');
  let state = mgr.getState();
  assert(state.uid === studentUid, 'Student ID initialized correctly');
  assert(state.cognitiveStage === 'foundational', 'Basic level mapped to foundational cognitive stage');
  assert(state.activePedagogy === 'scaffolded', 'Initial baseline pedagogy is scaffolded guidance');
  assert(state.learningStrain.possibleStruggle === 0.2, 'Initial learning strain at baseline (0.2)');
  assert(state.totalExercisesCompleted === 0, 'Zero exercises completed at start');

  // -------------------------------------------------------------------------
  // Step 2: Attempt 1 - Baseline Correct Answer
  // -------------------------------------------------------------------------
  console.log('\n[Step 2] Attempt 1: Baseline Correct Answer');
  const res1 = mgr.recordAnswer('pointers', true, 4500);
  state = res1.state;
  const pRecord1 = state.conceptMastery['pointers'];

  assert(pRecord1 !== undefined, 'Concept "pointers" recorded in state');
  assert(pRecord1.attempts === 1, '1 attempt registered');
  assert(pRecord1.correct === 1, '1 correct answer registered');
  assert(pRecord1.accuracy === 1.0, 'Accuracy is 100%');
  assert(pRecord1.consecutiveCorrect === 1, 'Streak of 1 established');

  // -------------------------------------------------------------------------
  // Step 3: Attempt 2 - Incorrect Answer with Response Latency
  // -------------------------------------------------------------------------
  console.log('\n[Step 3] Attempt 2: Incorrect Answer with High Response Latency');
  const res2 = mgr.recordAnswer('pointers', false, 16800, 'syntax_confusion');
  state = res2.state;
  const pRecord2 = state.conceptMastery['pointers'];

  assert(pRecord2.attempts === 2, '2 attempts registered');
  assert(pRecord2.correct === 1, '1 correct answer total');
  assert(pRecord2.accuracy === 0.5, 'Accuracy dropped to 50%');
  assert(pRecord2.consecutiveIncorrect === 1, '1 consecutive incorrect registered');
  assert(state.learningStrain.signals.includes('high_response_latency'), 'Detected high_response_latency signal (>15s)');
  assert(state.learningStrain.possibleStruggle > 0.5, 'Learning strain elevated above 0.5');

  // -------------------------------------------------------------------------
  // Step 4: Attempt 3 - Repeated Error Triggering WORKED_EXAMPLE Intervention
  // -------------------------------------------------------------------------
  console.log('\n[Step 4] Attempt 3: Repeated Error Triggering WORKED_EXAMPLE Intervention');
  const res3 = mgr.recordAnswer('pointers', false, 17500, 'dereference_null');
  state = res3.state;
  const pRecord3 = state.conceptMastery['pointers'];

  assert(pRecord3.attempts === 3, '3 attempts registered');
  assert(pRecord3.consecutiveIncorrect === 2, '2 consecutive incorrect registered');
  assert(pRecord3.accuracy === 0.33, 'Accuracy dropped to 33%');
  assert(state.learningStrain.signals.includes('repeated_errors'), 'Detected repeated_errors signal');
  assert(state.learningStrain.possibleStruggle >= 0.8, 'Learning strain elevated to high struggle (>= 0.8)');

  const intervention = res3.intervention;
  assert(intervention !== undefined, 'Intervention directive generated');
  assert(intervention?.strategy === 'worked_example', 'Intervention strategy set to "worked_example"');
  assert(intervention?.recommendedAction === 'show_worked_example', 'Recommended action is "show_worked_example"');
  assert(state.activePedagogy === 'worked_example', 'State active pedagogy adapted to "worked_example"');
  assert(state.activeInterventions['pointers']?.strategy === 'worked_example', 'Active interventions registry holds "worked_example"');

  // -------------------------------------------------------------------------
  // Step 5: Real Serverless API Pipeline Execution
  // -------------------------------------------------------------------------
  console.log('\n[Step 5] Invoking Actual Serverless API Handler: /api/gemini/generateAdaptiveResponse');

  const originalFetch = globalThis.fetch;
  const originalEnvKey = process.env.NVIDIA_API_KEY;
  let interceptedSystemPrompt = '';

  const sampleAiWorkedExample = `
Imagine computer memory (RAM) is like a row of numbered lockers in a high school hallway.
Each locker has a distinct address plate on the door (that is the memory address, like 0x1000),
and books inside (that is the actual value, like 42).

A pointer is simply an index card where you write down the locker number, not the contents!

Here is the step-by-step worked example:

**Step 1: Allocate a variable**
\`\`\`cpp
int x = 42;
\`\`\`
In RAM: Locker 0x1000 is labeled "x" and stores the number 42.

**Step 2: Obtain the address using &**
\`\`\`cpp
int* ptr = &x;
\`\`\`
In RAM: A new pointer variable "ptr" is created. It stores the address 0x1000!

**Step 3: Dereference the pointer using \***
\`\`\`cpp
cout << *ptr;
\`\`\`
In RAM: The asterisk instructs the processor: "Visit locker 0x1000 and read the value inside (42)."

:::micro-check
{
  "question": "Given int x = 42; int* ptr = &x; what does printing ptr (without asterisk) output?",
  "conceptId": "pointers",
  "options": ["The memory address of x (0x1000)", "The value 42", "0", "A compilation error"],
  "correctIndex": 0,
  "explanation": "ptr stores the memory address of x (0x1000). To read the value 42, you must dereference it with *ptr."
}
:::
`.trim();

  // Install test interception provider
  process.env.NVIDIA_API_KEY = 'nvapi-mock-test-key';
  (globalThis as any).fetch = async (url: string, init: any) => {
    if (url.includes('nvidia.com')) {
      const parsedBody = JSON.parse(init.body || '{}');
      const messages = parsedBody.messages || [];
      const systemMsg = messages.find((m: any) => m.role === 'system');
      if (systemMsg) {
        interceptedSystemPrompt = systemMsg.content;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: sampleAiWorkedExample,
              },
            },
          ],
        }),
      } as any;
    }
    return originalFetch(url, init);
  };

  // Construct mock HTTP request and response
  const req = {
    method: 'POST',
    authenticatedUid: studentUid,
    body: {
      message: 'I am struggling to understand pointers in C++. Can you explain how memory addresses and dereferencing work?',
      profile: mockProfile,
      studentState: state,
    },
    headers: {
      'content-type': 'application/json',
    },
  };

  let httpStatusCode = 0;
  let httpResponseBody: any = null;

  const res = {
    headersSent: false,
    status(code: number) {
      httpStatusCode = code;
      return this;
    },
    json(data: any) {
      httpResponseBody = data;
      this.headersSent = true;
      return this;
    },
    setHeader() {
      return this;
    },
  };

  try {
    await handler(req, res);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnvKey !== undefined) {
      process.env.NVIDIA_API_KEY = originalEnvKey;
    } else {
      delete process.env.NVIDIA_API_KEY;
    }
  }

  assert(httpStatusCode === 200, 'Serverless API handler returned HTTP 200 OK');
  assert(httpResponseBody !== null, 'Serverless API returned valid JSON body');
  assert(httpResponseBody.category === 'reasoning', 'Deterministic router classified request as "reasoning" (due to strain >= 0.8)');
  assert(httpResponseBody.activePedagogy === 'worked_example', 'Serverless API confirmed active pedagogy: "worked_example"');

  // Verify that the system prompt passed to the provider contained all required directives
  assert(
    interceptedSystemPrompt.includes('MANDATORY PEDAGOGICAL INTERVENTION'),
    'System prompt injected MANDATORY PEDAGOGICAL INTERVENTION header'
  );
  assert(
    interceptedSystemPrompt.includes('Strategy: worked_example'),
    'System prompt specified Strategy: worked_example'
  );
  assert(
    interceptedSystemPrompt.includes('PHYSICAL ANALOGY FIRST'),
    'System prompt enforced PHYSICAL ANALOGY FIRST directive'
  );
  assert(
    interceptedSystemPrompt.includes('NUMBERED STEP-BY-STEP WORKED EXAMPLE'),
    'System prompt enforced NUMBERED STEP-BY-STEP WORKED EXAMPLE directive'
  );
  assert(
    interceptedSystemPrompt.includes('INLINE MEMORY REASONING'),
    'System prompt enforced INLINE MEMORY REASONING directive'
  );
  assert(
    interceptedSystemPrompt.includes('FORMATIVE MICRO-CHECK'),
    'System prompt enforced FORMATIVE MICRO-CHECK directive'
  );

  // Verify response output formatting
  const apiResultText: string = httpResponseBody.result || '';
  assert(apiResultText.includes('lockers'), 'API response contains physical lockers analogy');
  assert(apiResultText.includes('Step 1:') && apiResultText.includes('Step 2:') && apiResultText.includes('Step 3:'), 'API response includes numbered step-by-step breakdown');
  assert(apiResultText.includes('0x1000'), 'API response includes inline RAM memory reasoning');
  assert(apiResultText.includes(':::micro-check'), 'API response includes delimited :::micro-check block');

  // -------------------------------------------------------------------------
  // Step 6: Formative Micro-Check Extraction
  // -------------------------------------------------------------------------
  console.log('\n[Step 6] Parsing Formative Micro-Check from Real API Response');
  const microCheckMatch = apiResultText.match(/:::micro-check\s*([\s\S]*?):::/);
  assert(microCheckMatch !== null, 'Formative micro-check block matched successfully');

  let parsedMicroCheck: any = null;
  try {
    parsedMicroCheck = JSON.parse(microCheckMatch![1].trim());
  } catch (err) {
    console.error('Failed to parse micro-check JSON:', err);
  }

  assert(parsedMicroCheck !== null, 'Micro-check payload parsed as valid JSON');
  assert(parsedMicroCheck.conceptId === 'pointers', 'Micro-check targets concept "pointers"');
  assert(Array.isArray(parsedMicroCheck.options) && parsedMicroCheck.options.length === 4, 'Micro-check has 4 answer options');
  assert(parsedMicroCheck.correctIndex === 0, 'Micro-check specifies correct answer index 0');
  assert(
    parsedMicroCheck.options[parsedMicroCheck.correctIndex].includes('memory address'),
    'Correct answer option correctly describes memory address'
  );

  // -------------------------------------------------------------------------
  // Step 7: Formative Micro-Check Remediation
  // -------------------------------------------------------------------------
  console.log('\n[Step 7] Student Submits Correct Answer to Micro-Check (Remediation)');
  const res4 = mgr.recordAnswer('pointers', true, 4200);
  state = res4.state;
  const pRecord4 = state.conceptMastery['pointers'];

  assert(pRecord4.attempts === 4, '4 attempts registered');
  assert(pRecord4.correct === 2, '2 correct answers registered');
  assert(pRecord4.consecutiveCorrect === 1, 'Consecutive correct incremented to 1');
  assert(pRecord4.consecutiveIncorrect === 0, 'Consecutive incorrect reset to 0');
  assert(pRecord4.accuracy === 0.5, 'Accuracy recovered to 50%');

  // -------------------------------------------------------------------------
  // Step 8: Outcome Tracking & Strategy Effectiveness Verification
  // -------------------------------------------------------------------------
  console.log('\n[Step 8] Outcome Tracking & Strategy Effectiveness Verification');

  // 1. Concept-level strategy outcome tracking
  const workedExampleMetrics = pRecord4.strategyOutcomes?.['worked_example'];
  assert(workedExampleMetrics !== undefined, 'Strategy outcome metrics recorded for "worked_example"');
  assert(workedExampleMetrics?.attempts === 1, '1 attempt under worked_example logged');
  assert(workedExampleMetrics?.successes === 1, '1 success under worked_example logged');
  assert(workedExampleMetrics?.rate === 1.0, 'Worked example strategy outcome rate is 100% (1.0)');
  assert(pRecord4.bestObservedStrategy === 'worked_example', 'Best observed strategy for "pointers" updated to "worked_example"');

  // 2. Intervention history record
  const history = state.interventionHistory || [];
  assert(history.length >= 1, 'Intervention history record appended');
  const latestOutcome = history[history.length - 1];
  assert(latestOutcome.conceptId === 'pointers', 'Outcome record targets "pointers"');
  assert(latestOutcome.strategy === 'worked_example', 'Outcome record strategy is "worked_example"');
  assert(latestOutcome.outcome === 'success', 'Outcome record marked as "success"');
  assert(latestOutcome.preInterventionAccuracy === 0.33, 'Pre-intervention accuracy recorded accurately (0.33)');
  assert(latestOutcome.postInterventionAccuracy === 0.5, 'Post-intervention accuracy recorded accurately (0.50)');
  assert(typeof latestOutcome.resolvedTimestamp === 'number', 'Resolution timestamp recorded');

  // 3. Pedagogy transition back to guided practice
  assert(
    res4.intervention?.strategy === 'scaffolded' || res4.intervention?.recommendedAction === 'guided_question',
    'Intervention successfully resolved: pedagogy returned to scaffolded guided practice'
  );
  assert(state.activePedagogy === 'scaffolded', 'State active pedagogy returned to "scaffolded"');

  // -------------------------------------------------------------------------
  // Step 9: Pedagogical Feedback Loop Verification
  // -------------------------------------------------------------------------
  console.log('\n[Step 9] Explicit Pedagogical Feedback Verification');
  const scoreBeforeFeedback = state.pedagogyEffectiveness.worked_example.score;
  mgr.recordPedagogyFeedback('worked_example', true, 'pointers', 'helpful_breakdown');
  state = mgr.getState();

  assert(state.pedagogyEffectiveness.worked_example.helpfulCount === 1, 'Helpful count incremented to 1');
  assert(state.pedagogyEffectiveness.worked_example.score > scoreBeforeFeedback, 'Effectiveness score increased after feedback');

  // -------------------------------------------------------------------------
  // Step 10: Mastery Streak & Socratic Promotion Verification
  // -------------------------------------------------------------------------
  console.log('\n[Step 10] Mastery Streak & Socratic Promotion Verification');
  mgr.recordAnswer('pointers', true, 3800); // Attempt 5 -> streak 2
  const res6 = mgr.recordAnswer('pointers', true, 3100); // Attempt 6 -> streak 3
  state = res6.state;
  const pRecord6 = state.conceptMastery['pointers'];

  assert(pRecord6.consecutiveCorrect === 3, 'Consecutive correct reached 3 in a row');
  assert(res6.intervention?.strategy === 'socratic', '3 consecutive correct triggers Socratic challenge strategy');
  assert(res6.intervention?.recommendedAction === 'advance_difficulty', 'Recommended action is "advance_difficulty"');
  assert(state.activePedagogy === 'socratic', 'Active pedagogy promoted to "socratic"');

  const socraticPrompt = buildPersona(mockProfile, '', state);
  assert(
    socraticPrompt.includes('Strategy: socratic') || socraticPrompt.includes('Strategy: SOCRATIC'),
    'Prompt reflects upgraded Socratic strategy'
  );
  assert(
    socraticPrompt.includes('OPERATIONAL DIRECTIVES FOR ADVANCED MASTERY: SOCRATIC INQUIRY') ||
    socraticPrompt.includes('SOCRATIC INQUIRY'),
    'Prompt contains Socratic challenge directives for advanced mastery'
  );

  console.log(`\n================================================================`);
  console.log(`🎉 REAL ADAPTIVE API VERIFICATION PASSED: ${passedLocal} Passed, ${failedLocal} Failed`);
  console.log(`================================================================\n`);

  return { passed: passedLocal, failed: failedLocal };
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('realAdaptiveApiVerification');
if (isDirectRun) {
  runRealAdaptiveApiVerification()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal error in Real Adaptive API Verification:', err);
      process.exit(1);
    });
}
