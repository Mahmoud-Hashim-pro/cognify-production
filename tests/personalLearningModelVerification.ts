/**
 * Phase 2B: Personal Learning Model (PLM) Verification Suite
 *
 * Verifies the consolidation of granular event-driven learning signals into a
 * stable, empirical Personal Learning Model per student and per concept:
 *
 * 1. Initial State: Empty / baseline PLM initialized.
 * 2. Multi-Attempt Empirical Learning History:
 *    - Pointers: high latency (>16s), repeated error ('dereference_null'),
 *      worked_example remediation success, SM-2 retention schedule.
 *    - Recursion: analogies strategy success.
 * 3. PLM Consolidation Engine Verification:
 *    - ConceptLearningProfile for 'pointers':
 *      * normalized mastery & confidence
 *      * commonError synthesized as 'dereference_null'
 *      * latencyProfile classified as 'high'
 *      * bestStrategy resolves to 'worked_example'
 *      * retentionRisk evaluates to 'medium'
 *    - ConceptLearningProfile for 'recursion':
 *      * bestStrategy resolves to 'analogies'
 *    - Global primaryPreferredStrategy identified across concepts.
 * 4. Proactive Remediation & Prompt Persona Verification:
 *    - buildPersona() called with fresh query about 'pointers' (zero current-turn errors).
 *    - Verifies injection of PROACTIVE PEDAGOGICAL MANDATE pre-empting 'dereference_null'
 *      and commanding worked example + physical analogy upfront before student struggles.
 * 5. Real Serverless API Pipeline Verification:
 *    - Calls handler(req, res) for generateAdaptiveResponse.ts.
 *    - Confirms HTTP 200, plmSummary diagnostic telemetry in response JSON,
 *      and intercepted system prompt containing the proactive mandate.
 * 6. Topic Isolation:
 *    - Queries on unrelated topics do not trigger the pointers-specific mandate.
 */

import { getStudentStateManager, StudentState } from '../src/lib/studentStateEngine.js';
import {
  buildPersonalLearningModel,
  deriveLatencyProfile,
  deriveRetentionRisk,
  synthesizeCommonError,
  rankStrategies,
  generateProactiveDirectives,
} from '../src/lib/personalLearningModel.js';
import { buildPersona, Profile } from '../api/_lib/ai.js';
import handler from '../api/gemini/generateAdaptiveResponse.js';

let totalPassed = 0;
let totalFailed = 0;

export async function runPersonalLearningModelVerification(
  customAssert?: (cond: boolean, name: string) => void
): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🧪 PHASE 2B: PERSONAL LEARNING MODEL (PLM) VERIFICATION');
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

  const studentUid = `student_plm_${Date.now()}`;
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
  // Step 1: Baseline Pure Function & Classification Unit Checks
  // -------------------------------------------------------------------------
  console.log('\n[Step 1] Pure Function Unit Checks');
  assert(deriveLatencyProfile(4500) === 'low', 'Latency < 8000ms is "low"');
  assert(deriveLatencyProfile(11000) === 'medium', 'Latency 8000-15000ms is "medium"');
  assert(deriveLatencyProfile(17200) === 'high', 'Latency > 15000ms is "high"');

  const now = Date.now();
  assert(deriveRetentionRisk(undefined, now) === 'high', 'Missing schedule has "high" retention risk');
  assert(
    deriveRetentionRisk(
      { conceptId: 'c1', intervalDays: 1, easeFactor: 2.5, repetitions: 1, nextReviewDate: now - 1000, lastReviewDate: now - 86400000, status: 'learning' },
      now
    ) === 'high',
    'Overdue schedule has "high" retention risk'
  );
  assert(
    deriveRetentionRisk(
      { conceptId: 'c1', intervalDays: 1, easeFactor: 2.5, repetitions: 1, nextReviewDate: now + 36 * 3600 * 1000, lastReviewDate: now, status: 'learning' },
      now
    ) === 'medium',
    'Schedule due in 36 hours has "medium" retention risk'
  );
  assert(
    deriveRetentionRisk(
      { conceptId: 'c1', intervalDays: 7, easeFactor: 2.5, repetitions: 3, nextReviewDate: now + 5 * 86400 * 1000, lastReviewDate: now, status: 'retained' },
      now
    ) === 'low',
    'Schedule due in 5 days has "low" retention risk'
  );

  const ranked = rankStrategies({
    worked_example: { attempts: 3, successes: 3, rate: 1.0, lastUsed: now },
    analogies: { attempts: 4, successes: 3, rate: 0.75, lastUsed: now },
    socratic: { attempts: 2, successes: 1, rate: 0.5, lastUsed: now },
  });
  assert(ranked.best === 'worked_example', 'rankStrategies accurately identifies highest win-rate (worked_example 100%)');
  assert(ranked.secondBest === 'analogies', 'rankStrategies accurately identifies second best (analogies 75%)');

  const synthesizedErr = synthesizeCommonError(['syntax_err', 'dereference_null', 'dereference_null']);
  assert(synthesizedErr === 'dereference_null', 'synthesizeCommonError detects top repeated mistake');

  // -------------------------------------------------------------------------
  // Step 2: Build Empirical Multi-Attempt Learning History
  // -------------------------------------------------------------------------
  console.log('\n[Step 2] Establishing Empirical History for "pointers" & "recursion"');

  // Attempt 1: Baseline correct answer with high processing latency
  mgr.recordAnswer('pointers', true, 16200);

  // Attempt 2: Incorrect answer with high latency and specific mistake
  mgr.recordAnswer('pointers', false, 17500, 'dereference_null');

  // Attempt 3: Second consecutive incorrect answer triggering worked_example intervention
  const r3 = mgr.recordAnswer('pointers', false, 18200, 'dereference_null');
  assert(r3.state.conceptMastery['pointers'].consecutiveIncorrect === 2, '2 consecutive incorrect registered for pointers');
  assert(r3.state.conceptMastery['pointers'].mistakeTypes.includes('dereference_null'), 'Mistake "dereference_null" recorded');
  assert(r3.state.activeInterventions['pointers'] !== undefined, 'Active intervention triggered for pointers');

  // Remediate with worked_example: answering correctly under active intervention automatically evaluates it!
  const r4 = mgr.recordAnswer('pointers', true, 16800);
  assert(r4.state.conceptMastery['pointers'].strategyOutcomes?.['worked_example']?.successes === 1, 'Worked example outcome tracked as success');

  // Establish SM-2 schedule for pointers: due in 36 hours (medium risk)
  let state = mgr.getState();
  state.retentionSchedules['pointers'] = {
    conceptId: 'pointers',
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 1,
    lastReviewDate: Date.now(),
    nextReviewDate: Date.now() + 36 * 3600 * 1000,
    status: 'learning',
  };

  // Simulate learning events for "recursion" with analogies
  mgr.recordAnswer('recursion', false, 9000);
  mgr.recordAnswer('recursion', false, 9000);
  if (state.activeInterventions['recursion']) {
    state.activeInterventions['recursion'].strategy = 'analogies';
  }
  mgr.recordAnswer('recursion', true, 4200);

  // Refresh and re-derive PLM with the updated retention schedule
  state.personalLearningModel = buildPersonalLearningModel(state);

  // -------------------------------------------------------------------------
  // Step 3: Verify Consolidated Personal Learning Model (PLM)
  // -------------------------------------------------------------------------
  console.log('\n[Step 3] Verifying Consolidated PLM Attributes');
  const plm = state.personalLearningModel;
  assert(plm !== undefined, 'PersonalLearningModel exists in student state');
  assert(plm.uid === studentUid, 'PLM contains student UID');
  assert(typeof plm.updatedAt === 'number', 'PLM contains updatedAt timestamp');

  const ptrProf = plm.conceptProfiles['pointers'];
  assert(ptrProf !== undefined, 'PLM contains concept profile for "pointers"');
  assert(ptrProf.conceptId === 'pointers', 'Profile conceptId is "pointers"');
  assert(ptrProf.conceptNameEn.length > 0, 'Profile contains English concept name');
  assert(ptrProf.mastery >= 0.5 && ptrProf.mastery <= 1.0, `Mastery is normalized (${ptrProf.mastery})`);
  assert(ptrProf.confidence >= 0.4 && ptrProf.confidence <= 1.0, `Confidence is normalized (${ptrProf.confidence})`);
  assert(ptrProf.commonError === 'dereference_null', 'Profile commonError correctly identified as "dereference_null"');
  assert(ptrProf.latencyProfile === 'high', 'Profile latencyProfile correctly classified as "high"');
  assert(ptrProf.bestStrategy === 'worked_example', 'Profile bestStrategy correctly resolved to "worked_example"');
  assert(ptrProf.retentionRisk === 'medium', 'Profile retentionRisk correctly derived as "medium"');
  assert(ptrProf.successfulRemediations >= 1, 'Successful remediations tracked');

  const recProf = plm.conceptProfiles['recursion'];
  assert(recProf !== undefined, 'PLM contains concept profile for "recursion"');
  assert(recProf.bestStrategy === 'analogies', 'Profile for recursion has bestStrategy "analogies"');

  assert(plm.primaryPreferredStrategy === 'worked_example' || plm.primaryPreferredStrategy === 'analogies',
    `Global primaryPreferredStrategy derived (${plm.primaryPreferredStrategy})`);

  // -------------------------------------------------------------------------
  // Step 4: Proactive Remediation Prompt Injection (buildPersona)
  // -------------------------------------------------------------------------
  console.log('\n[Step 4] Proactive Persona Directives Injection');

  // Case A: Fresh user query specifically about pointers with zero errors this turn
  const testQueryPointers = 'Hey Cognify, could you explain pointers and memory addresses to me?';
  const personaWithPointers = buildPersona(mockProfile, '', state, testQueryPointers);

  assert(personaWithPointers.includes('## PERSONAL LEARNING MODEL: LONGITUDINAL STUDENT INTELLIGENCE'),
    'Persona includes PLM longitudinal intelligence header');
  assert(personaWithPointers.includes('Pointers & Memory Addresses') || personaWithPointers.includes('pointers'),
    'Persona detects pointers topic from user query');
  assert(personaWithPointers.includes('dereference_null'),
    'Persona explicitly flags historical stumbling block "dereference_null"');
  assert(personaWithPointers.includes('HIGH cognitive processing time'),
    'Persona notes high cognitive processing time');
  assert(personaWithPointers.includes('PROACTIVE PEDAGOGICAL MANDATE FOR THIS TOPIC (DO NOT WAIT FOR STUDENT TO FAIL)'),
    'Persona commands PROACTIVE pedagogical mandate before student fails');
  assert(personaWithPointers.includes('OPEN WITH WORKED EXAMPLE & PHYSICAL ANALOGY'),
    'Persona instructs opening with worked example & physical analogy');

  // Case B: Topic Isolation - query about unrelated topic
  const testQueryGeneral = 'Can you tell me a funny story about a robot?';
  const personaGeneral = buildPersona(mockProfile, '', state, testQueryGeneral);
  assert(!personaGeneral.includes('dereference_null'),
    'Unrelated query does NOT inject pointers-specific stumbling block');
  assert(personaGeneral.includes('## PERSONAL LEARNING MODEL: LONGITUDINAL STUDENT INTELLIGENCE'),
    'Global student intelligence profile remains present for general assistance');

  // -------------------------------------------------------------------------
  // Step 5: Real Serverless API Pipeline Verification
  // -------------------------------------------------------------------------
  console.log('\n[Step 5] Real Serverless API Execution with PLM Payload');

  const originalFetch = globalThis.fetch;
  let interceptedSystemPrompt = '';

  const mockAiProactiveResponse = `
Pointers are one of the most powerful concepts in computing! Think of computer memory like a hallway of numbered lockers in a school.

**Step 1: The Locker and its Number**
Every locker has a number painted on the door (its memory address, like Locker #100) and an item inside (the value stored inside, like a book).

**Step 2: Storing Addresses**
A pointer is simply a special sticky note where you write down the *locker number*, not the item itself.

:::micro-check
{
  "question": "If int x = 10; and int* p = &x; what does 'p' hold?",
  "conceptId": "pointers",
  "options": ["The value 10", "The memory address of x", "A null reference", "A copy of x"],
  "correctIndex": 1,
  "explanation": "p holds the address of x. To get the value 10, you dereference it with *p."
}
:::
`.trim();

  process.env.NVIDIA_API_KEY = 'nvapi-plm-test-key';
  (globalThis as any).fetch = async (url: string, init: any) => {
    if (url.includes('nvidia.com') || url.includes('groq.com')) {
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
                content: mockAiProactiveResponse,
              },
            },
          ],
        }),
      } as any;
    }
    return originalFetch(url, init);
  };

  try {
    const apiReq = {
      method: 'POST',
      authenticatedUid: studentUid,
      headers: { 'content-type': 'application/json' },
      body: {
        message: 'Could you introduce pointers to me?',
        profile: mockProfile,
        studentState: state,
        history: [],
      },
    };

    let responseStatus = 0;
    let responseJson: any = null;

    const apiRes = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseJson = data;
        return this;
      },
      setHeader() {},
      headersSent: false,
    };

    await handler(apiReq, apiRes);

    assert(responseStatus === 200, 'Serverless API returned HTTP 200');
    assert(responseJson !== null, 'Response body received');
    assert(typeof responseJson.result === 'string', 'AI output text returned');
    assert(responseJson.result.includes('hallway of numbered lockers'), 'Proactive physical analogy present in output');
    assert(responseJson.plmSummary !== undefined, 'plmSummary included in response JSON');
    assert(responseJson.plmSummary.trackedConceptsCount >= 2, 'plmSummary reflects tracked concepts count');
    assert(interceptedSystemPrompt.includes('PROACTIVE PEDAGOGICAL MANDATE'), 'Intercepted system prompt contains proactive mandate');
    assert(interceptedSystemPrompt.includes('dereference_null'), 'Intercepted system prompt alerted model to dereference_null');
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.NVIDIA_API_KEY;
  }

  // -------------------------------------------------------------------------
  // Step 6: Direct Manager Accessor & Event Sourcing Projection
  // -------------------------------------------------------------------------
  console.log('\n[Step 6] Manager Accessor & Projection');
  const directPlm = mgr.getPersonalLearningModel();
  assert(directPlm.conceptProfiles['pointers'] !== undefined, 'mgr.getPersonalLearningModel() returns authoritative PLM');
  assert(directPlm.uid === studentUid, 'Direct PLM UID matches');

  console.log('\n================================================================');
  console.log(`📊 PHASE 2B VERIFICATION COMPLETE: ${passedLocal} passed, ${failedLocal} failed`);
  console.log('================================================================');

  return { passed: passedLocal, failed: failedLocal };
}

// Direct CLI execution support
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('personalLearningModelVerification');
if (isDirectRun) {
  runPersonalLearningModelVerification().then(({ passed, failed }) => {
    if (failed > 0) {
      console.error(`❌ Suite failed with ${failed} failure(s).`);
      process.exit(1);
    } else {
      console.log(`✅ Suite completed successfully with ${passed} passing assertions.`);
      process.exit(0);
    }
  }).catch((err) => {
    console.error('Fatal error during verification:', err);
    process.exit(1);
  });
}
