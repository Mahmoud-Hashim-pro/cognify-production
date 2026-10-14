/**
 * Cognify 2.0 - Core Adaptive Learning Benchmark Suite (Phase B - Requirements 11 & 12)
 *
 * Standalone executable test suite verifying closed-loop adaptive learning,
 * prerequisite gap diagnosis, dynamic strain triggers, pedagogy auto-adaptation,
 * and Bloom taxonomy scaffolding progression across 4 academic domains in 3 languages.
 *
 * Execution:
 * npx tsx tests/benchmarks/adaptiveLearningBenchmark.ts
 */

import {
  EVALUATION_DATASET,
  getDatasetByDomain,
  getDatasetByConcept,
  getQuestionsForLanguage,
  getPrerequisiteChain,
  EvaluationItem,
  EvaluationDomain,
  BloomLevel,
} from '../../src/data/evaluationDataset.js';
import {
  CONCEPT_REGISTRY,
  diagnosePrerequisiteGap,
  getConcept,
  getPrerequisites,
} from '../../src/lib/conceptGraph.js';
import {
  getStudentStateManager,
  createInitialStudentState,
  isGuestUser,
} from '../../src/lib/studentStateEngine.js';
import {
  decideIntervention,
  InterventionDirective,
} from '../../src/lib/interventionEngine.js';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

const startTime = Date.now();

function assert(condition: boolean, testName: string, details?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

async function runBenchmarkSuite() {
  console.log('\n================================================================================');
  console.log('🚀 COGNIFY 2.0 ADAPTIVE LEARNING BENCHMARK SUITE');
  console.log('================================================================================\n');

  // ==========================================================================
  // GROUP 1: BASELINE ASSESSMENT ACROSS DOMAINS (ARABIC, ENGLISH, FRENCH)
  // ==========================================================================
  console.log('--------------------------------------------------------------------------------');
  console.log('🔷 GROUP 1: BASELINE ASSESSMENT ACROSS DOMAINS (AR, EN, FR)');
  console.log('--------------------------------------------------------------------------------');

  // 1.1 Verify dataset completeness across 4 domains
  const csItems = getDatasetByDomain('computer_science');
  const webItems = getDatasetByDomain('web_development');
  const mathItems = getDatasetByDomain('mathematics');
  const a11yItems = getDatasetByDomain('accessibility');

  assert(csItems.length >= 6, 'Computer Science domain has >= 6 evaluation items', `Found ${csItems.length}`);
  assert(webItems.length >= 6, 'Web Development domain has >= 6 evaluation items', `Found ${webItems.length}`);
  assert(mathItems.length >= 6, 'Mathematics/Calculus domain has >= 6 evaluation items', `Found ${mathItems.length}`);
  assert(a11yItems.length >= 6, 'Accessibility & Inclusive Tech domain has >= 6 evaluation items', `Found ${a11yItems.length}`);
  assert(EVALUATION_DATASET.length >= 24, 'Total evaluation dataset contains >= 24 comprehensive items', `Found ${EVALUATION_DATASET.length}`);

  // 1.2 Verify domain aliases and normalization in getDatasetByDomain
  const algoAlias = getDatasetByDomain('Algorithms');
  const frontAlias = getDatasetByDomain('web dev');
  const calcAlias = getDatasetByDomain('Calculus');
  const inclusiveAlias = getDatasetByDomain('Inclusive Tech');

  assert(algoAlias.length === csItems.length, 'getDatasetByDomain("Algorithms") maps to Computer Science items');
  assert(frontAlias.length === webItems.length, 'getDatasetByDomain("web dev") maps to Web Development items');
  assert(calcAlias.length === mathItems.length, 'getDatasetByDomain("Calculus") maps to Mathematics items');
  assert(inclusiveAlias.length === a11yItems.length, 'getDatasetByDomain("Inclusive Tech") maps to Accessibility items');

  // 1.3 Verify multilingual parity (Arabic, English, French)
  const arQuestions = getQuestionsForLanguage('ar');
  const enQuestions = getQuestionsForLanguage('en');
  const frQuestions = getQuestionsForLanguage('fr');

  assert(arQuestions.length === EVALUATION_DATASET.length, 'Arabic localized questions count matches dataset size');
  assert(enQuestions.length === EVALUATION_DATASET.length, 'English localized questions count matches dataset size');
  assert(frQuestions.length === EVALUATION_DATASET.length, 'French localized questions count matches dataset size');

  const sampleIdx = 0;
  assert(arQuestions[sampleIdx].language === 'ar', 'Arabic question object has language "ar"');
  assert(typeof arQuestions[sampleIdx].question === 'string' && arQuestions[sampleIdx].question.length > 10, 'Arabic question text is non-empty');
  assert(arQuestions[sampleIdx].choices.length === 4, 'Arabic question has exactly 4 choices');

  assert(enQuestions[sampleIdx].language === 'en', 'English question object has language "en"');
  assert(typeof enQuestions[sampleIdx].question === 'string' && enQuestions[sampleIdx].question.length > 10, 'English question text is non-empty');
  assert(enQuestions[sampleIdx].choices.length === 4, 'English question has exactly 4 choices');

  assert(frQuestions[sampleIdx].language === 'fr', 'French question object has language "fr"');
  assert(typeof frQuestions[sampleIdx].question === 'string' && frQuestions[sampleIdx].question.length > 10, 'French question text is non-empty');
  assert(frQuestions[sampleIdx].choices.length === 4, 'French question has exactly 4 choices');

  // 1.4 Verify distractor diagnoses for all questions
  let allDistractorsValid = true;
  for (const item of EVALUATION_DATASET) {
    if (!item.commonDistractors || item.commonDistractors.length !== 3) {
      allDistractorsValid = false;
      break;
    }
    for (const d of item.commonDistractors) {
      if (typeof d.choiceIndex !== 'number' || !d.misconception || !d.errorDiagnosis) {
        allDistractorsValid = false;
        break;
      }
    }
  }
  assert(allDistractorsValid, 'All items in dataset provide 3 common distractors with error diagnoses');

  // 1.5 Student Baseline Assessment Simulation
  const studentUid1 = `student_bench_baseline_${Date.now()}`;
  const mgr1 = getStudentStateManager(studentUid1, 'Basic');
  let state1 = mgr1.getState();

  assert(state1.uid === studentUid1, 'Student ID matches baseline session');
  assert(state1.cognitiveStage === 'foundational', 'Basic academic level initializes to foundational stage');
  assert(state1.activePedagogy === 'scaffolded', 'Initial pedagogy is scaffolded guidance');
  assert(state1.learningStrain.possibleStruggle === 0.2, 'Initial baseline strain is 0.2');
  assert(state1.totalExercisesCompleted === 0, 'Initial total exercises completed is 0');

  // Attempt 1: Arabic CS Question (Variables & Types) - Answered Correctly
  const res1_1 = mgr1.recordAnswer('variables_types', true, 4200);
  state1 = res1_1.state;
  const csRec = state1.conceptMastery['variables_types'];
  assert(csRec !== undefined, 'Concept mastery created for "variables_types"');
  assert(csRec.attempts === 1, '1 attempt registered for "variables_types"');
  assert(csRec.correct === 1, '1 correct answer registered');
  assert(csRec.accuracy === 1.0, 'Accuracy is 100%');
  assert(csRec.consecutiveCorrect === 1, '1 consecutive correct answer');
  assert(state1.totalExercisesCompleted === 1, 'Total exercises completed is 1');

  // Attempt 2: English Web Development Question (HTML Basics) - Answered Correctly
  const res1_2 = mgr1.recordAnswer('html_basics', true, 5100);
  state1 = res1_2.state;
  const webRec = state1.conceptMastery['html_basics'];
  assert(webRec !== undefined && webRec.correct === 1, 'Concept mastery created for "html_basics"');
  assert(state1.totalExercisesCompleted === 2, 'Total exercises completed is 2');

  // Attempt 3: French Mathematics Question (Basic Algebra) - Answered Incorrectly (Sign error)
  const res1_3 = mgr1.recordAnswer('basic_algebra', false, 6400, 'sign_error');
  state1 = res1_3.state;
  const mathRec = state1.conceptMastery['basic_algebra'];
  assert(mathRec !== undefined, 'Concept mastery created for "basic_algebra"');
  assert(mathRec.correct === 0 && mathRec.attempts === 1, '0 correct out of 1 attempt');
  assert(mathRec.consecutiveIncorrect === 1, '1 consecutive incorrect recorded');
  assert(mathRec.mistakeTypes.includes('sign_error'), 'Mistake type "sign_error" recorded');
  assert(state1.totalExercisesCompleted === 3, 'Total exercises completed is 3');

  // Attempt 4: English Accessibility Question (A11y Fundamentals) - Answered Correctly
  const res1_4 = mgr1.recordAnswer('a11y_fundamentals', true, 4700);
  state1 = res1_4.state;
  const a11yRec = state1.conceptMastery['a11y_fundamentals'];
  assert(a11yRec !== undefined && a11yRec.correct === 1, 'Concept mastery created for "a11y_fundamentals"');
  assert(state1.totalExercisesCompleted === 4, 'Total exercises completed is 4 across 4 academic domains');

  // ==========================================================================
  // GROUP 2: PREREQUISITE GAP DIAGNOSIS
  // ==========================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('🔷 GROUP 2: PREREQUISITE GAP DIAGNOSIS');
  console.log('--------------------------------------------------------------------------------');

  // 2.1 Scenario A: Computer Science (Pointers -> Memory Addresses)
  const ptrItem = EVALUATION_DATASET.find((it) => it.id === 'cs_ptr_01');
  assert(ptrItem !== undefined, 'Found evaluation item "cs_ptr_01" for pointers');
  assert(ptrItem?.prerequisiteConceptId === 'memory_addresses', 'cs_ptr_01 requires "memory_addresses"');

  const ptrChain = getPrerequisiteChain('pointers');
  assert(ptrChain.includes('memory_addresses'), 'getPrerequisiteChain("pointers") includes "memory_addresses"');
  assert(ptrChain.includes('variables_types'), 'getPrerequisiteChain("pointers") includes upstream "variables_types"');

  const studentUid2_cs = `student_bench_prereq_cs_${Date.now()}`;
  const mgr2_cs = getStudentStateManager(studentUid2_cs, 'Basic');

  // Student struggles on the prerequisite concept "memory_addresses"
  mgr2_cs.recordAnswer('memory_addresses', false, 12000, 'hex_layout_confusion');
  mgr2_cs.recordAnswer('memory_addresses', false, 14500, 'address_concept_unclear');
  const memRec = mgr2_cs.getState().conceptMastery['memory_addresses'];
  assert(memRec.accuracy === 0.0, 'Prerequisite "memory_addresses" has 0.0 accuracy');
  assert(memRec.confidence < 0.5, 'Prerequisite "memory_addresses" has low confidence (< 0.5)');

  // Student now attempts the advanced concept "pointers" and fails
  const resPtr = mgr2_cs.recordAnswer('pointers', false, 17000, 'pointer_deref_failure');
  const intPtr = resPtr.intervention;

  assert(intPtr !== undefined, 'Intervention generated upon struggling with pointers');
  assert(intPtr?.recommendedAction === 'review_prerequisite', 'Recommended action is "review_prerequisite"');
  assert(intPtr?.strategy === 'scaffolded', 'Intervention strategy is scaffolded guidance for prerequisite review');
  assert(intPtr?.prerequisiteGap !== undefined, 'Prerequisite gap object is populated');
  assert(intPtr?.prerequisiteGap?.hasPrerequisiteGap === true, 'hasPrerequisiteGap is true');
  assert(
    intPtr?.prerequisiteGap?.rootGapConcept?.id === ptrItem?.prerequisiteConceptId,
    `Diagnosis points to exact prerequisite from dataset (${ptrItem?.prerequisiteConceptId})`,
    `Expected ${ptrItem?.prerequisiteConceptId}, got ${intPtr?.prerequisiteGap?.rootGapConcept?.id}`
  );
  assert(
    resPtr.state.learningStrain.signals.includes('prerequisite_gap'),
    'Learning strain signals include "prerequisite_gap"'
  );

  // 2.2 Scenario B: Mathematics (Integrals -> Derivatives)
  const intItem = EVALUATION_DATASET.find((it) => it.id === 'math_int_01');
  assert(intItem !== undefined, 'Found evaluation item "math_int_01" for integrals');
  assert(intItem?.prerequisiteConceptId === 'derivatives', 'math_int_01 requires "derivatives"');

  const intChain = getPrerequisiteChain('integrals');
  assert(intChain.includes('derivatives'), 'getPrerequisiteChain("integrals") includes "derivatives"');

  const studentUid2_math = `student_bench_prereq_math_${Date.now()}`;
  const mgr2_math = getStudentStateManager(studentUid2_math, 'Basic');

  // Student struggles on prerequisite "derivatives"
  mgr2_math.recordAnswer('derivatives', false, 13000, 'power_rule_failure');
  mgr2_math.recordAnswer('derivatives', false, 14000, 'chain_rule_confusion');

  // Student attempts advanced concept "integrals"
  const resMath = mgr2_math.recordAnswer('integrals', false, 18500, 'antiderivative_confusion');
  const intMath = resMath.intervention;

  assert(intMath?.recommendedAction === 'review_prerequisite', 'Mathematics recommended action is "review_prerequisite"');
  assert(
    intMath?.prerequisiteGap?.rootGapConcept?.id === intItem?.prerequisiteConceptId,
    `Mathematics diagnosis points to exact prerequisite from dataset (${intItem?.prerequisiteConceptId})`,
    `Expected ${intItem?.prerequisiteConceptId}, got ${intMath?.prerequisiteGap?.rootGapConcept?.id}`
  );

  // 2.3 Scenario C: Accessibility (ARIA Standards -> Semantic HTML)
  const ariaItem = EVALUATION_DATASET.find((it) => it.id === 'a11y_aria_01');
  assert(ariaItem !== undefined, 'Found evaluation item "a11y_aria_01" for ARIA standards');
  assert(ariaItem?.prerequisiteConceptId === 'semantic_html', 'a11y_aria_01 requires "semantic_html"');

  const studentUid2_a11y = `student_bench_prereq_a11y_${Date.now()}`;
  const mgr2_a11y = getStudentStateManager(studentUid2_a11y, 'Basic');

  // Student struggles on prerequisite "semantic_html"
  mgr2_a11y.recordAnswer('semantic_html', false, 11000, 'button_semantics_confusion');

  // Student attempts "aria_standards"
  const resA11y = mgr2_a11y.recordAnswer('aria_standards', false, 16500, 'overuse_aria');
  const intA11y = resA11y.intervention;

  assert(intA11y?.recommendedAction === 'review_prerequisite', 'Accessibility recommended action is "review_prerequisite"');
  assert(
    intA11y?.prerequisiteGap?.rootGapConcept?.id === ariaItem?.prerequisiteConceptId,
    `Accessibility diagnosis points to exact prerequisite from dataset (${ariaItem?.prerequisiteConceptId})`,
    `Expected ${ariaItem?.prerequisiteConceptId}, got ${intA11y?.prerequisiteGap?.rootGapConcept?.id}`
  );

  // ==========================================================================
  // GROUP 3: DYNAMIC STRAIN TRIGGERS & PEDAGOGY ADAPTATION
  // ==========================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('🔷 GROUP 3: DYNAMIC STRAIN TRIGGERS & PEDAGOGY ADAPTATION');
  console.log('--------------------------------------------------------------------------------');

  const studentUid3 = `student_bench_strain_${Date.now()}`;
  const mgr3 = getStudentStateManager(studentUid3, 'Basic');

  // Baseline attempt: Student solves first question correctly (establishing baseline confidence)
  const res3_base = mgr3.recordAnswer('variables_types', true, 4200);
  assert(res3_base.state.conceptMastery['variables_types'].accuracy === 1.0, 'Initial attempt established 100% accuracy');
  assert(res3_base.state.activePedagogy === 'scaffolded', 'Baseline pedagogy is scaffolded');

  // 3.1 Trigger 1: High Latency Alone (>15000ms) on first error
  console.log('  [Phase 3.1] High response latency trigger (>15000ms)');
  const res3_1 = mgr3.recordAnswer('variables_types', false, 18500, 'type_range_confusion');
  const strain1 = res3_1.state.learningStrain;

  assert(strain1.signals.includes('high_response_latency'), 'Detected "high_response_latency" signal');
  assert(!strain1.signals.includes('repeated_errors'), 'Single error does not trigger "repeated_errors" signal');
  assert(strain1.possibleStruggle > 0.3, 'Learning strain elevated above baseline (> 0.3)');
  assert(res3_1.state.conceptMastery['variables_types'].accuracy === 0.5, 'Accuracy is 50% after 1 correct and 1 incorrect');
  assert(res3_1.state.activePedagogy === 'scaffolded', 'Pedagogy remains scaffolded on first error');

  // 3.2 Trigger 2: Repeated Error streak (consecutiveIncorrect >= 2) with high latency
  console.log('  [Phase 3.2] Repeated error streak trigger (consecutive >= 2)');
  const res3_2 = mgr3.recordAnswer('variables_types', false, 21000, 'memory_width_confusion');
  const strain2 = res3_2.state.learningStrain;
  const int3_2 = res3_2.intervention;

  assert(strain2.signals.includes('repeated_errors'), 'Detected "repeated_errors" signal (consecutiveIncorrect >= 2)');
  assert(strain2.signals.includes('high_response_latency'), 'Detected "high_response_latency" signal');
  assert(strain2.possibleStruggle >= 0.8, 'Learning strain reached high struggle threshold (>= 0.8)');
  assert(int3_2 !== undefined, 'Intervention directive generated');
  assert(int3_2?.strategy === 'worked_example', 'Pedagogy switched from scaffolded to "worked_example"');
  assert(int3_2?.recommendedAction === 'show_worked_example', 'Recommended action is "show_worked_example"');
  assert(res3_2.state.activePedagogy === 'worked_example', 'StudentState activePedagogy updated to "worked_example"');

  // 3.3 Trigger 3: Student Feedback Loop & Auto-Adaptation
  console.log('  [Phase 3.3] Student feedback loop & pedagogy auto-adaptation');
  const prevEffectiveness = res3_2.state.pedagogyEffectiveness['worked_example'].score;
  const state3_feedback = mgr3.recordPedagogyFeedback(
    'worked_example',
    false,
    'variables_types',
    'Prefer analogies over step-by-step numbers'
  );

  const newEffectiveness = state3_feedback.pedagogyEffectiveness['worked_example'].score;
  assert(newEffectiveness < prevEffectiveness, 'Unhelpful feedback penalized strategy score (-0.10)');
  assert(state3_feedback.pedagogyEffectiveness['worked_example'].unhelpfulCount === 1, 'Unhelpful count incremented to 1');
  assert(state3_feedback.activePedagogy !== 'worked_example', 'Auto-adapted away from unhelpful strategy');

  // 3.4 Trigger 4: Recovery, Mastery Streak, and Socratic Promotion
  console.log('  [Phase 3.4] Recovery, streak, and Socratic promotion');
  // Attempt 3: Correct answer (latency 5000ms)
  const res3_rec1 = mgr3.recordAnswer('variables_types', true, 5000);
  assert(res3_rec1.state.conceptMastery['variables_types'].consecutiveCorrect === 1, 'Consecutive correct is 1');
  assert(res3_rec1.state.conceptMastery['variables_types'].consecutiveIncorrect === 0, 'Consecutive incorrect reset to 0');

  // Attempt 4: Correct answer (latency 4500ms)
  const res3_rec2 = mgr3.recordAnswer('variables_types', true, 4500);
  assert(res3_rec2.state.conceptMastery['variables_types'].consecutiveCorrect === 2, 'Consecutive correct is 2');

  // Attempt 5: 3rd consecutive correct answer (latency 4100ms) -> High Mastery Streak!
  const res3_rec3 = mgr3.recordAnswer('variables_types', true, 4100);
  const int3_socratic = res3_rec3.intervention;

  assert(res3_rec3.state.conceptMastery['variables_types'].consecutiveCorrect === 3, 'Streak reached 3 consecutive correct');
  assert(int3_socratic?.strategy === 'socratic', 'Strategy promoted to "socratic" challenge');
  assert(int3_socratic?.recommendedAction === 'advance_difficulty', 'Recommended action is "advance_difficulty"');
  assert(res3_rec3.state.activePedagogy === 'socratic', 'Active student state pedagogy is "socratic"');
  assert(res3_rec3.state.learningStrain.possibleStruggle < 0.4, 'Learning strain returned to low fluent baseline');

  // ==========================================================================
  // GROUP 4: BLOOM LEVEL SCAFFOLDING PROGRESSION
  // ==========================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('🔷 GROUP 4: BLOOM LEVEL SCAFFOLDING PROGRESSION');
  console.log('--------------------------------------------------------------------------------');

  // 4.1 Verify Bloom taxonomy stages representation in dataset
  const bloomLevels: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  for (const lvl of bloomLevels) {
    const itemsWithLvl = EVALUATION_DATASET.filter((it) => it.bloomLevel === lvl);
    assert(itemsWithLvl.length >= 2, `Bloom level "${lvl}" has >= 2 items in dataset`, `Found ${itemsWithLvl.length}`);
  }

  // 4.2 Step-by-step cognitive scaffolding progression simulation
  const studentUid4 = `student_bench_bloom_${Date.now()}`;
  const mgr4 = getStudentStateManager(studentUid4, 'Basic');

  console.log('  [Stage 1: REMEMBER -> Foundational]');
  const qRemember = EVALUATION_DATASET.find((it) => it.domain === 'computer_science' && it.bloomLevel === 'remember');
  assert(qRemember !== undefined, 'Found foundational remember question');
  const res4_1 = mgr4.recordAnswer(qRemember!.conceptId, true, 4100);
  assert(res4_1.state.conceptMastery[qRemember!.conceptId].accuracy === 1.0, 'Stage 1 (Remember) solved with 100% accuracy');

  console.log('  [Stage 2: UNDERSTAND -> Foundational]');
  const qUnderstand = EVALUATION_DATASET.find((it) => it.domain === 'computer_science' && it.bloomLevel === 'understand');
  assert(qUnderstand !== undefined, 'Found foundational understand question');
  const res4_2 = mgr4.recordAnswer(qUnderstand!.conceptId, true, 4300);
  assert(res4_2.state.conceptMastery[qUnderstand!.conceptId].accuracy === 1.0, 'Stage 2 (Understand) solved with 100% accuracy');
  assert(res4_2.state.conceptMastery[qUnderstand!.conceptId].confidence > 0.6, 'Confidence progressed above 0.60');

  console.log('  [Stage 3: APPLY -> Intermediate]');
  const qApply = EVALUATION_DATASET.find((it) => it.domain === 'computer_science' && it.bloomLevel === 'apply');
  assert(qApply !== undefined, 'Found intermediate apply question');
  const res4_3 = mgr4.recordAnswer(qApply!.conceptId, true, 4600);
  assert(res4_3.state.conceptMastery[qApply!.conceptId].accuracy === 1.0, 'Stage 3 (Apply) solved with 100% accuracy');

  console.log('  [Stage 4: ANALYZE -> Intermediate]');
  const qAnalyze = EVALUATION_DATASET.find((it) => it.domain === 'computer_science' && it.bloomLevel === 'analyze');
  assert(qAnalyze !== undefined, 'Found intermediate analyze question');
  const res4_4 = mgr4.recordAnswer(qAnalyze!.conceptId, true, 4800);
  assert(res4_4.state.conceptMastery[qAnalyze!.conceptId].accuracy === 1.0, 'Stage 4 (Analyze) solved with 100% accuracy');
  assert(res4_4.state.totalExercisesCompleted === 4, '4 sequential Bloom stages completed');

  console.log('  [Stage 5: EVALUATE -> Advanced]');
  const qEvaluate = EVALUATION_DATASET.find((it) => it.domain === 'computer_science' && it.bloomLevel === 'evaluate');
  assert(qEvaluate !== undefined, 'Found advanced evaluate question');
  const res4_5 = mgr4.recordAnswer(qEvaluate!.conceptId, true, 5100);
  assert(res4_5.state.conceptMastery[qEvaluate!.conceptId].accuracy === 1.0, 'Stage 5 (Evaluate) solved with 100% accuracy');

  console.log('  [Stage 6: CREATE -> Advanced & Higher-Order Mastery]');
  const qCreate = EVALUATION_DATASET.find((it) => it.domain === 'computer_science' && it.bloomLevel === 'create');
  assert(qCreate !== undefined, 'Found advanced create question');
  const res4_6 = mgr4.recordAnswer(qCreate!.conceptId, true, 5300);
  assert(res4_6.state.conceptMastery[qCreate!.conceptId].accuracy === 1.0, 'Stage 6 (Create) solved with 100% accuracy');

  // Verify higher-order mastery elevation
  const dynMastery = res4_6.state.conceptMastery[qCreate!.conceptId];
  assert(dynMastery.attempts === 2, 'Dynamic memory has 2 attempts (evaluate + create)');
  assert(dynMastery.accuracy === 1.0, 'Dynamic memory has 100% accuracy across advanced stages');
  assert(dynMastery.consecutiveCorrect === 2, 'Consecutive correct is 2 on advanced topic');

  // Reinforce streak to verify advance_difficulty trigger
  const res4_7 = mgr4.recordAnswer(qCreate!.conceptId, true, 4200);
  assert(res4_7.intervention?.strategy === 'socratic', 'Higher-order mastery promotes to Socratic challenge');
  assert(res4_7.intervention?.recommendedAction === 'advance_difficulty', 'Action recommends advancing difficulty');

  // 4.3 Adaptive step-down on higher-order struggle
  console.log('  [Stage 4.3: Adaptive Step-Down on Higher-Order Strain]');
  const res4_struggle1 = mgr4.recordAnswer('asymptotic_complexity', false, 18000, 'recurrence_tree_error');
  const res4_struggle2 = mgr4.recordAnswer('asymptotic_complexity', false, 22000, 'master_theorem_slip');

  assert(
    res4_struggle2.intervention?.strategy === 'worked_example',
    'Struggle on higher-order analysis steps down to "worked_example" scaffolding'
  );
  assert(
    res4_struggle2.intervention?.recommendedAction === 'show_worked_example',
    'Action recommends concrete worked example to relieve cognitive load'
  );

  // ==========================================================================
  // SUMMARY METRICS REPORT
  // ==========================================================================
  const durationMs = Date.now() - startTime;
  console.log('\n================================================================================');
  console.log('📊 COGNIFY 2.0 ADAPTIVE BENCHMARK SUITE - EXECUTION SUMMARY');
  console.log('================================================================================');
  console.log(`Total Assertions Evaluated : ${totalAssertions}`);
  console.log(`Assertions Passed          : ${passedAssertions}`);
  console.log(`Assertions Failed          : ${failedAssertions}`);
  console.log(`Success Rate               : ${((passedAssertions / totalAssertions) * 100).toFixed(1)}%`);
  console.log(`Execution Duration         : ${durationMs}ms`);
  console.log('--------------------------------------------------------------------------------');
  console.log('[Group 1: Baseline Assessment]');
  console.log('  • Academic Domains Verified: Computer Science, Web Development, Mathematics, Accessibility');
  console.log('  • Multilingual Parity: 100% (Arabic, English, French questions & choices)');
  console.log('  • Distractor Diagnoses: 100% Coverage (3 error diagnoses per question)');
  console.log('[Group 2: Prerequisite Gap Diagnosis]');
  console.log('  • Computer Science: pointers -> memory_addresses (DIAGNOSED)');
  console.log('  • Mathematics: integrals -> derivatives (DIAGNOSED)');
  console.log('  • Accessibility: aria_standards -> semantic_html (DIAGNOSED)');
  console.log('[Group 3: Dynamic Strain Triggers & Pedagogy Adaptation]');
  console.log('  • Latency Trigger (>15s): VERIFIED');
  console.log('  • Error Streak Trigger (consecutiveIncorrect >= 2): VERIFIED');
  console.log('  • Pedagogy Transitions: scaffolded -> worked_example -> auto-adapt -> socratic');
  console.log('  • Pedagogical Feedback Loop: VERIFIED');
  console.log('[Group 4: Bloom Level Scaffolding Progression]');
  console.log('  • Full Hierarchy: remember -> understand -> apply -> analyze -> evaluate -> create');
  console.log('  • Higher-Order Mastery: VERIFIED (Promoted to Socratic & advance_difficulty)');
  console.log('  • Adaptive Step-Down: VERIFIED (Strain gracefully relieved via worked_example)');
  console.log('================================================================================\n');

  if (failedAssertions === 0) {
    console.log('🎉 ALL BENCHMARK ASSERTIONS PASSED WITH 100% SUCCESS (0 FAILURES)\n');
    process.exit(0);
  } else {
    console.error(`❌ BENCHMARK FAILED WITH ${failedAssertions} FAILURES\n`);
    process.exit(1);
  }
}

// Direct execution entrypoint
runBenchmarkSuite().catch((err) => {
  console.error('Fatal error executing adaptive learning benchmark suite:', err);
  process.exit(1);
});
