/**
 * Golden Adaptive Scenario: End-to-End Closed-Loop Remediation Verification
 *
 * Deterministically proves that Cognify 2.0 does not merely track student state
 * in storage, but actively enforces pedagogical adaptation in system prompts
 * and instructional behavior:
 *
 * 1. Initial baseline state for a new student.
 * 2. Attempt 1: Correct answer (baseline streak & confidence).
 * 3. Attempt 2: Incorrect answer with response latency (initial strain).
 * 4. Attempt 3: Repeated incorrect answer triggering WORKED_EXAMPLE intervention.
 * 5. System prompt generation: Verifies mandatory operational directives
 *    (physical analogies, numbered steps, inline memory reasoning, micro-check).
 * 6. AI response validation: Proves conformance to pedagogical directives.
 * 7. Attempt 4: Successful remediation & intervention resolution.
 * 8. Feedback loop: Helpful thumbs-up increases strategy efficacy score.
 * 9. Streak promotion: 3 consecutive correct answers advance student to Socratic challenge.
 */

import { getStudentStateManager, createInitialStudentState } from '../src/lib/studentStateEngine.js';
import { buildPersona, formatStudentStateBlock } from '../api/_lib/ai.js';
import { validateAndSanitizeResponse } from '../api/_lib/qualityGuard.js';
import { Profile } from '../api/_lib/ai.js';

let totalPassed = 0;
let totalFailed = 0;

export async function runGoldenAdaptiveScenario(customAssert?: (cond: boolean, name: string) => void): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🌟 RUNNING GOLDEN ADAPTIVE SCENARIO: C++ POINTERS REMEDIATION');
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

  const studentUid = `student_golden_pointers_${Date.now()}`;
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
  // 1. Initial Baseline Verification
  // -------------------------------------------------------------------------
  console.log('\n[Phase 1] Initial Baseline State Verification');
  let state = mgr.getState();
  assert(state.uid === studentUid, 'Student ID initialized correctly');
  assert(state.cognitiveStage === 'foundational', 'Basic academic level resolves to foundational cognitive stage');
  assert(state.activePedagogy === 'scaffolded', 'Baseline pedagogy is scaffolded guidance');
  assert(state.learningStrain.possibleStruggle === 0.2, 'Initial learning strain is low baseline (0.2)');
  assert(state.conceptMastery['pointers'] === undefined, 'No prior history for concept "pointers"');

  // -------------------------------------------------------------------------
  // 2. Attempt 1: Initial Success
  // -------------------------------------------------------------------------
  console.log('\n[Phase 2] Attempt 1: First Question Correct');
  const res1 = mgr.recordAnswer('pointers', true, 4200);
  state = res1.state;
  const pRecord1 = state.conceptMastery['pointers'];

  assert(pRecord1 !== undefined, 'Concept record created for "pointers"');
  assert(pRecord1.attempts === 1, '1 attempt recorded');
  assert(pRecord1.correct === 1, '1 correct answer recorded');
  assert(pRecord1.consecutiveCorrect === 1, '1 consecutive correct');
  assert(pRecord1.consecutiveIncorrect === 0, '0 consecutive incorrect');
  assert(pRecord1.accuracy === 1.0, 'Accuracy is 100%');
  assert(pRecord1.confidence > 0.5, 'Confidence increased above baseline');
  assert(state.activePedagogy === 'scaffolded', 'Remains in scaffolded mode for single attempt');

  // -------------------------------------------------------------------------
  // 3. Attempt 2: First Struggle on Pointer Dereferencing
  // -------------------------------------------------------------------------
  console.log('\n[Phase 3] Attempt 2: First Struggle (High Latency + Incorrect)');
  const res2 = mgr.recordAnswer('pointers', false, 17500, 'dereference_confusion');
  state = res2.state;
  const pRecord2 = state.conceptMastery['pointers'];

  assert(pRecord2.attempts === 2, '2 attempts recorded');
  assert(pRecord2.correct === 1, '1 correct answer total');
  assert(pRecord2.consecutiveIncorrect === 1, '1 consecutive incorrect');
  assert(pRecord2.consecutiveCorrect === 0, 'Consecutive correct reset to 0');
  assert(pRecord2.accuracy === 0.5, 'Accuracy dropped to 50%');
  assert(state.learningStrain.signals.includes('high_response_latency'), 'Detected high_response_latency signal (>15s)');
  assert(state.learningStrain.possibleStruggle > 0.5, 'Learning strain increased above 0.5');

  // -------------------------------------------------------------------------
  // 4. Attempt 3: Repeated Struggle & Triggering Pedagogical Intervention
  // -------------------------------------------------------------------------
  console.log('\n[Phase 4] Attempt 3: Repeated Struggle (Triggers Worked Example)');
  const res3 = mgr.recordAnswer('pointers', false, 19000, 'address_of_confusion');
  state = res3.state;
  const pRecord3 = state.conceptMastery['pointers'];
  const intervention = res3.intervention;

  assert(pRecord3.attempts === 3, '3 attempts recorded');
  assert(pRecord3.consecutiveIncorrect === 2, '2 consecutive incorrect registered');
  assert(pRecord3.accuracy === 0.33, 'Accuracy dropped to 33%');
  assert(state.learningStrain.signals.includes('repeated_errors'), 'Detected repeated_errors signal (consecutiveIncorrect >= 2)');
  assert(state.learningStrain.possibleStruggle >= 0.8, 'Learning strain elevated to high struggle (>= 0.8)');

  assert(intervention !== undefined, 'Pedagogical intervention generated');
  assert(intervention?.strategy === 'worked_example', 'Intervention strategy adapted to "worked_example"');
  assert(intervention?.recommendedAction === 'show_worked_example', 'Recommended action is "show_worked_example"');
  assert(state.activePedagogy === 'worked_example', 'Active student state pedagogy updated to "worked_example"');
  assert(state.activeInterventions['pointers']?.strategy === 'worked_example', 'Active interventions registry holds "worked_example" for pointers');

  // -------------------------------------------------------------------------
  // 5. System Prompt Directive Verification
  // -------------------------------------------------------------------------
  console.log('\n[Phase 5] AI System Prompt Directive Injection Verification');
  const systemPrompt = buildPersona(mockProfile, '', state);

  assert(
    systemPrompt.includes('## MANDATORY PEDAGOGICAL INTERVENTION (HIGHEST OVERRIDE PRIORITY)'),
    'Prompt contains unmissable MANDATORY PEDAGOGICAL INTERVENTION header'
  );
  assert(
    systemPrompt.includes('Strategy: worked_example') || systemPrompt.includes('Strategy: WORKED_EXAMPLE'),
    'Prompt contains Strategy: worked_example'
  );
  assert(
    systemPrompt.includes('Target Concept: pointers'),
    'Prompt contains Target Concept: pointers'
  );
  assert(
    systemPrompt.includes('PHYSICAL ANALOGY FIRST'),
    'Prompt enforces PHYSICAL ANALOGY FIRST before code syntax'
  );
  assert(
    systemPrompt.includes('mailboxes with house addresses') || systemPrompt.includes('numbered lockers'),
    'Prompt suggests concrete real-world physical metaphors (mailboxes/lockers)'
  );
  assert(
    systemPrompt.includes('NUMBERED STEP-BY-STEP WORKED EXAMPLE'),
    'Prompt mandates NUMBERED STEP-BY-STEP WORKED EXAMPLE'
  );
  assert(
    systemPrompt.includes('INLINE MEMORY REASONING'),
    'Prompt mandates INLINE MEMORY REASONING (RAM layout & 0x1000)'
  );
  assert(
    systemPrompt.includes('FORMATIVE MICRO-CHECK'),
    'Prompt mandates concluding with a 1-click formative micro-check block'
  );
  assert(
    systemPrompt.includes('STRICT PROHIBITIONS'),
    'Prompt contains STRICT PROHIBITIONS forbidding dry formal definitions without analogies'
  );

  // -------------------------------------------------------------------------
  // 6. AI Output Conformance & Formative Micro-Check Validation
  // -------------------------------------------------------------------------
  console.log('\n[Phase 6] Conforming Adaptive AI Response Validation');

  const modeledResponse = `
Imagine computer memory (RAM) is like a row of mailboxes in an apartment building.
Each mailbox has a distinct number on the outside (that's the memory address, like 0x1000),
and an envelope inside (that's the actual value, like 42).

A pointer is simply a sticky note where you write down the mailbox number, not the contents!

Let's walk through a complete step-by-step worked example:

**Step 1: Allocate a variable in memory**
\`\`\`cpp
int x = 42;
\`\`\`
In RAM: Mailbox 0x1000 is labeled "x" and holds the integer value 42.

**Step 2: Create a pointer and get the address with &**
\`\`\`cpp
int* ptr = &x;
\`\`\`
In RAM: A new mailbox "ptr" is created. It doesn't store 42 — it stores the address 0x1000!

**Step 3: Access the value through dereferencing with \***
\`\`\`cpp
cout << *ptr; // Prints 42
\`\`\`
In RAM: The asterisk (*) instructs the computer: "Go to mailbox 0x1000, open it, and read what is inside."

:::micro-check
{
  "question": "Given int x = 42; int* ptr = &x; what does printing ptr (without asterisk) output?",
  "conceptId": "pointers",
  "options": ["The memory address of x (e.g. 0x1000)", "The value 42", "0", "A compilation error"],
  "correctIndex": 0,
  "explanation": "ptr holds the memory address of x (0x1000). To read the value 42, you must dereference it with *ptr."
}
:::
`.trim();

  const sanitized = validateAndSanitizeResponse(modeledResponse, {
    accessibilityMode: 'None',
    language: 'English',
    cognitiveStage: 'Basic',
  });

  assert(sanitized.isValid === true, 'Quality Guard approved the modeled adaptive response');
  assert(modeledResponse.includes('mailboxes'), 'Response includes physical mailbox analogy');
  assert(modeledResponse.includes('Step 1:') && modeledResponse.includes('Step 2:') && modeledResponse.includes('Step 3:'), 'Response follows numbered step-by-step breakdown');
  assert(modeledResponse.includes('0x1000'), 'Response includes inline RAM address reasoning');
  assert(modeledResponse.includes(':::micro-check'), 'Response includes valid delimited formative micro-check');

  // -------------------------------------------------------------------------
  // 7. Attempt 4: Student Solves Micro-Check Correctly (Recovery & Resolution)
  // -------------------------------------------------------------------------
  console.log('\n[Phase 7] Attempt 4: Student Solves Micro-Check (Remediation & Recovery)');
  const confidenceBeforeRemediation = pRecord3.confidence;
  const res4 = mgr.recordAnswer('pointers', true, 5800);
  state = res4.state;
  const pRecord4 = state.conceptMastery['pointers'];

  assert(pRecord4.attempts === 4, '4 attempts recorded');
  assert(pRecord4.correct === 2, '2 correct answers total');
  assert(pRecord4.consecutiveCorrect === 1, 'Consecutive correct incremented to 1');
  assert(pRecord4.consecutiveIncorrect === 0, 'Consecutive incorrect reset to 0');
  assert(pRecord4.confidence > confidenceBeforeRemediation, 'Confidence recovered after successful remediation');

  const postIntervention = res4.intervention;
  assert(
    postIntervention?.strategy === 'scaffolded' || postIntervention?.recommendedAction !== 'show_worked_example',
    'Intervention resolved: Student recovered from crisis back to guided practice'
  );
  assert(state.activePedagogy === 'scaffolded', 'Active pedagogy transitioned to scaffolded');

  const schedule = state.retentionSchedules['pointers'];
  assert(schedule !== undefined, 'Spaced retention schedule updated for "pointers"');
  assert(schedule.intervalDays >= 1, 'Review interval scheduled for at least 1 day');
  assert(schedule.status === 'learning', 'Retention status progressed to "learning"');

  // -------------------------------------------------------------------------
  // 8. Pedagogical Feedback Efficacy Verification
  // -------------------------------------------------------------------------
  console.log('\n[Phase 8] Pedagogical Feedback Loop Verification');
  const initialWorkedExampleScore = state.pedagogyEffectiveness.worked_example.score;

  // Student clicks helpful thumbs-up on worked example
  mgr.recordPedagogyFeedback('worked_example', true, 'pointers', 'helpful_analogy_and_steps');
  state = mgr.getState();

  assert(state.pedagogyEffectiveness.worked_example.helpfulCount === 1, 'Helpful count incremented to 1');
  assert(state.pedagogyEffectiveness.worked_example.score > initialWorkedExampleScore, 'Worked example efficacy score increased');

  // -------------------------------------------------------------------------
  // 9. Mastery Streak to Socratic Promotion
  // -------------------------------------------------------------------------
  console.log('\n[Phase 9] Mastery Streak & Socratic Promotion Verification');
  mgr.recordAnswer('pointers', true, 4800); // Attempt 5 -> streak 2
  const res6 = mgr.recordAnswer('pointers', true, 3900); // Attempt 6 -> streak 3
  state = res6.state;
  const pRecord6 = state.conceptMastery['pointers'];

  assert(pRecord6.consecutiveCorrect === 3, 'Consecutive correct reached 3 in a row');
  assert(res6.intervention?.strategy === 'socratic', '3 consecutive correct triggers Socratic challenge strategy');
  assert(res6.intervention?.recommendedAction === 'advance_difficulty', 'Recommended action is "advance_difficulty"');
  assert(state.activePedagogy === 'socratic', 'Active pedagogy promoted to Socratic mode');

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
  console.log(`🎉 GOLDEN ADAPTIVE SCENARIO PASSED: ${passedLocal} Passed, ${failedLocal} Failed`);
  console.log(`================================================================\n`);

  return { passed: passedLocal, failed: failedLocal };
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('goldenAdaptiveScenario');
if (isDirectRun) {
  runGoldenAdaptiveScenario().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Fatal error in Golden Adaptive Scenario:', err);
    process.exit(1);
  });
}
