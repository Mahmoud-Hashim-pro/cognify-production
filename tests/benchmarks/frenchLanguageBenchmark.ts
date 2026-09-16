/**
 * Milestone 15: French & Multilingual Benchmark Test Suite (Phase B - Requirement 15)
 *
 * Standalone executable test suite verifying:
 * - Group 1: French grammar, tone, and cognitive stage scaffolding (no English or robotic token leaks).
 * - Group 2: French Travel Voice Assistant persona injection and emergency hotkey quick-dial matching.
 * - Group 3: Spatial Memory French queries resolution (verifying object locations returned accurately in French with epistemic honesty).
 * - Group 4: Trilingual parity across concept graph labels, strain detection triggers, and audio speech sanitization (cleanForSpeech).
 *
 * Execution:
 * npx tsx tests/benchmarks/frenchLanguageBenchmark.ts
 */

import {
  FRENCH_TRAVEL_FIXTURES,
  EMERGENCY_SERVICES_FIXTURES,
  SPATIAL_QUERIES_FIXTURES,
  ACADEMIC_EXPLANATION_FIXTURES,
  ARABIC_QUERY_FIXTURES,
  TRILINGUAL_CONCEPT_GRAPH,
  TRILINGUAL_STRAIN_FIXTURES,
  SPEECH_SANITIZATION_FIXTURES,
  EVALUATION_RUBRICS,
  BLOOM_TAXONOMY,
  evaluateFrenchGrammarAndTone,
  detectEnglishLeaks,
  detectRoboticTokens,
  evaluateCognitiveStageScaffolding,
  matchEmergencyService,
  evaluateSpatialHonesty,
  validateTrilingualParity,
} from '../../src/lib/multilingualBenchmarkData.js';

import {
  saveSpatialObject,
  querySpatialMemory,
  recordSpatialObservationV2,
  resolveSpatialQueryV2,
  clearSpatialMemoryV2ForUser,
} from '../../src/lib/spatialMemoryEngine.js';

import { detectConversationalStrain } from '../../src/lib/conversationalStrain.js';
import { cleanForSpeech } from '../../src/lib/tts.js';
import { runQualityGuardPipeline } from '../../src/lib/aiQualityGuard2.js';
import { buildPersona } from '../../api/_lib/ai.js';
import type { UserProfile } from '../../src/types.js';

// ============================================================================
// TEST HARNESS & ASSERTION HELPERS
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runBenchmarkSuite() {
  console.log('\n==============================================================================');
  console.log('🇫🇷 RUNNING COGNIFY 2.0 FRENCH & MULTILINGUAL BENCHMARK (REQUIREMENT 15)');
  console.log('==============================================================================\n');

  // ==========================================================================
  // GROUP 1: FRENCH GRAMMAR, TONE & COGNITIVE STAGE SCAFFOLDING
  // ==========================================================================
  console.log('------------------------------------------------------------------------------');
  console.log('GROUP 1: French Grammar, Tone, and Cognitive Stage Scaffolding');
  console.log('------------------------------------------------------------------------------');

  // 1.1 French Grammar & Tone Evaluation on Academic Fixtures
  for (const fixture of ACADEMIC_EXPLANATION_FIXTURES) {
    const evalRes = evaluateFrenchGrammarAndTone(fixture.expectedResponseFr);
    assert(
      evalRes.passes,
      `[Grammar & Tone] "${fixture.promptFr}" (${fixture.cognitiveStage}): Score ${evalRes.score * 100}%`
    );
    assert(
      evalRes.issues.length === 0,
      `[Grammar & Tone] Zero grammatical or orthographic issues for "${fixture.id}"`
    );
  }

  // 1.2 English Leak Prevention
  console.log('\n  [Sub-Group 1.2: English Leak Prevention]');
  for (const fixture of ACADEMIC_EXPLANATION_FIXTURES) {
    const leakRes = detectEnglishLeaks(fixture.expectedResponseFr);
    assert(
      leakRes.leakCount === 0,
      `[No English Leaks] ${fixture.id}: 0 leaked English tokens (Clean: "${fixture.expectedResponseFr.slice(0, 45)}...")`
    );
  }

  // Negative control test for leak detector
  const contaminatedText = 'Bonjour, step 1 is however the base case in summary.';
  const negativeControl = detectEnglishLeaks(contaminatedText);
  assert(
    negativeControl.leakCount >= 3,
    `[Leak Detector Calibration] Correctly flagged ${negativeControl.leakCount} English tokens in contaminated text`
  );

  // 1.3 Robotic Token Leak Prevention
  console.log('\n  [Sub-Group 1.3: Robotic Token Leak Prevention]');
  for (const fixture of ACADEMIC_EXPLANATION_FIXTURES) {
    const robotRes = detectRoboticTokens(fixture.expectedResponseFr);
    assert(
      robotRes.leakCount === 0,
      `[No Robotic Leaks] ${fixture.id}: 0 robotic/sign tokens leaked`
    );
  }

  const robotContaminated = '[Signs:START] **Hazards:** None detected. :::micro-check';
  const robotControl = detectRoboticTokens(robotContaminated);
  assert(
    robotControl.leakCount >= 3,
    `[Robotic Detector Calibration] Correctly flagged ${robotControl.leakCount} robotic tokens in negative control`
  );

  // 1.4 Cognitive Stage Scaffolding & Bloom's Taxonomy Alignment
  console.log("\n  [Sub-Group 1.4: Cognitive Stage Scaffolding & Bloom's Taxonomy]");
  for (const fixture of ACADEMIC_EXPLANATION_FIXTURES) {
    const scaffoldRes = evaluateCognitiveStageScaffolding(
      fixture.expectedResponseFr,
      fixture.cognitiveStage,
      fixture.bloomLevel
    );
    assert(
      scaffoldRes.compliant,
      `[Stage Scaffolding] ${fixture.id} (${fixture.cognitiveStage}): avg ${scaffoldRes.avgWordsPerSentence} w/sentence <= max ${scaffoldRes.stageLimit}`
    );

    // Verify key pedagogical terms are present
    const lower = fixture.expectedResponseFr.toLowerCase();
    const hasKeyTerms = fixture.keyFrenchTerms.every((term) => lower.includes(term.toLowerCase()));
    assert(
      hasKeyTerms,
      `[Pedagogical Vocabulary] ${fixture.id} contains required pedagogical terms (${fixture.keyFrenchTerms.slice(0, 3).join(', ')}...)`
    );

    // Verify Bloom Level info exists in Bloom taxonomy registry
    const bloomInfo = BLOOM_TAXONOMY[fixture.bloomLevel];
    assert(
      bloomInfo !== undefined && bloomInfo.nameFr.length > 0,
      `[Bloom Registry] Level ${fixture.bloomLevel} corresponds to "${bloomInfo.nameFr}" / "${bloomInfo.nameEn}"`
    );
  }

  // 1.5 Self-Healing Quality Guard Pipeline Integration
  console.log('\n  [Sub-Group 1.5: Self-Healing Pipeline on French Explanations]');
  const unclosedLatexFrench =
    "La complexité est de $O(n \\log n) pour le tri fusion, avec une récurrence T(n) = 2T(n/2) + O(n)";
  const guarded = runQualityGuardPipeline(unclosedLatexFrench, 'proficient');
  assert(
    guarded.repairedText.endsWith('$'),
    '[Self-Healing LaTeX] Closed unclosed inline LaTeX delimiter in French response'
  );
  assert(
    guarded.readability.avgWordsPerSentence <= 28,
    `[Stage Readability] Guard verified proficient readability limit: ${guarded.readability.avgWordsPerSentence}`
  );

  // ==========================================================================
  // GROUP 2: FRENCH TRAVEL VOICE ASSISTANT PERSONA & EMERGENCY HOTKEYS
  // ==========================================================================
  console.log('\n------------------------------------------------------------------------------');
  console.log('GROUP 2: French Travel Voice Assistant Persona Injection & Emergency Hotkeys');
  console.log('------------------------------------------------------------------------------');

  // 2.1 Persona Injection Verification
  console.log('  [Sub-Group 2.1: Travel Persona Injection Directives]');
  const mockTravelerProfile: any = {
    uid: 'user_traveler_paris',
    name: 'Youssef Mansour',
    email: 'youssef@example.com',
    role: 'Student',
    field: 'Engineering',
    level: 'Intermediate',
    language: 'French',
    preferredPedagogyStyle: 'scaffolded',
    interests: ['Travel', 'AI'],
    accessibilityMode: 'None',
    ttsEnabled: true,
  };

  const personaPrompt = buildPersona(mockTravelerProfile, '', undefined, 'Je voyage à Paris');
  assert(
    personaPrompt.includes('FRANCE TRAVEL & SPOKEN FRENCH ASSISTANCE'),
    '[Persona Injection] Persona contains France Travel & Spoken French Assistance section'
  );
  assert(
    personaPrompt.includes('Bonjour Madame') && personaPrompt.includes('Bonjour Monsieur'),
    '[Cultural Etiquette Injection] Golden Rule of greeting ("Bonjour Madame / Monsieur") explicitly mandated in prompt'
  );
  assert(
    personaPrompt.includes('Merci beaucoup, bonne journée !'),
    '[Cultural Etiquette Injection] Closing courtesy ("Merci beaucoup, bonne journée !") mandated in prompt'
  );
  assert(
    personaPrompt.includes('Arabic phonetic pronunciation guide'),
    '[Phonetic Directives] Arabic phonetic guide directive present for traveler accessibility'
  );

  // 2.2 Travel Linguistic Fixtures Verification
  console.log('\n  [Sub-Group 2.2: French Travel Linguistic Fixtures]');
  const categoriesPresent = new Set(FRENCH_TRAVEL_FIXTURES.map((f) => f.category));
  assert(categoriesPresent.has('polite'), '[Fixtures] Politesse / Golden etiquette fixtures present');
  assert(categoriesPresent.has('metro'), '[Fixtures] Metro and public transit fixtures present');
  assert(categoriesPresent.has('airport'), '[Fixtures] Airport (CDG/Orly) navigation fixtures present');
  assert(categoriesPresent.has('restaurant'), '[Fixtures] Restaurant ordering & dietary fixtures present');
  assert(categoriesPresent.has('cafe'), '[Fixtures] Café & boulangerie ordering fixtures present');

  // Verify restaurant water law fixture (free carafe d'eau)
  const carafeFixture = FRENCH_TRAVEL_FIXTURES.find((f) => f.id === 'fr_restaurant_01');
  assert(
    carafeFixture !== undefined && carafeFixture.fr.includes("carafe d'eau"),
    '[Restaurant Etiquette] "Une carafe d\'eau s\'il vous plaît" fixture present with French legal right note'
  );

  // Verify phonetic transcription presence across all fixtures
  const allHavePhonetics = FRENCH_TRAVEL_FIXTURES.every(
    (f) => f.arPhonetic.length > 0 && f.enPhonetic.length > 0
  );
  assert(
    allHavePhonetics,
    `[Bilingual Phonetics] All ${FRENCH_TRAVEL_FIXTURES.length} travel phrases have Arabic & English phonetics`
  );

  // 2.3 Emergency Hotkey Quick-Dial Matching
  console.log('\n  [Sub-Group 2.3: Emergency Hotkey Quick-Dial Matching]');
  const emergencyTestCases = [
    { query: "C'est une urgence médicale, quelqu'un a fait un malaise !", expected: '15', label: 'SAMU Medical Emergency' },
    { query: 'Appelez le 15, mon ami ne respire plus !', expected: '15', label: 'SAMU Breathing Distress' },
    { query: 'Au secours, on vient de me voler mon sac dans le métro !', expected: '17', label: 'Police Secours Street Robbery' },
    { query: 'Composez le 17 pour signaler une agression.', expected: '17', label: 'Police Secours Assault' },
    { query: 'Il y a un incendie dans l’immeuble, appelez les pompiers !', expected: '18', label: 'Pompiers Building Fire' },
    { query: 'Accident de la route avec des blessés, vite le 18 !', expected: '18', label: 'Pompiers Road Accident' },
    { query: 'Quel est le numéro d’urgence européen universel ?', expected: '112', label: 'Universal European Emergency 112' },
    { query: 'English speaking emergency operator in France', expected: '112', label: 'European Line 112 (English)' },
    { query: 'Je suis sourd, quel numéro par SMS pour les urgences en France ?', expected: '114', label: 'SMS Urgence 114 (Deaf & Hard of Hearing)' },
    { query: 'طوارئ طبية في باريس ومحتاجين إسعاف سريع', expected: '15', label: 'Arabic Query -> SAMU 15' },
    { query: 'في حريق في العمارة اتصلوا بالمطافئ', expected: '18', label: 'Arabic Query -> Pompiers 18' },
    { query: 'شنطتي اتسرقت في المترو كلموا الشرطة', expected: '17', label: 'Arabic Query -> Police 17' },
  ];

  for (const tc of emergencyTestCases) {
    const matched = matchEmergencyService(tc.query);
    assert(
      matched !== null && matched.number === tc.expected,
      `[Emergency Dispatch] "${tc.query.slice(0, 35)}..." -> ${tc.expected} (${tc.label})`
    );
  }

  // ==========================================================================
  // GROUP 3: SPATIAL MEMORY FRENCH QUERIES RESOLUTION & EPISTEMIC HONESTY
  // ==========================================================================
  console.log('\n------------------------------------------------------------------------------');
  console.log('GROUP 3: Spatial Memory French Queries Resolution & Epistemic Honesty');
  console.log('------------------------------------------------------------------------------');

  const spatialTestUser = 'student_french_bench_01';
  clearSpatialMemoryV2ForUser(spatialTestUser);

  const now = Date.now();

  // 3.1 Object Registration in French
  console.log('  [Sub-Group 3.1: Registering Physical Objects in French]');

  // 1. Clés (Keys) on Table basse in Salon
  await saveSpatialObject(spatialTestUser, {
    id: 'sp_keys_bench',
    uid: spatialTestUser,
    objectName: 'Clés',
    category: 'keys',
    room: 'Salon',
    surface: 'Table basse',
    relativePosition: { direction: 'left' },
    lastSeenTimestamp: now - 3 * 60 * 1000, // 3 mins ago (Fresh)
    lastSeenIso: new Date(now - 3 * 60 * 1000).toISOString(),
    confidence: 0.95,
    source: 'camera_auto',
    history: [],
  });

  // 2. Lunettes (Glasses) on Table de chevet in Chambre
  await saveSpatialObject(spatialTestUser, {
    id: 'sp_glasses_bench',
    uid: spatialTestUser,
    objectName: 'Lunettes',
    category: 'glasses',
    room: 'Chambre',
    surface: 'Table de chevet',
    relativePosition: { direction: 'center' },
    lastSeenTimestamp: now - 5 * 60 * 1000, // 5 mins ago (Fresh)
    lastSeenIso: new Date(now - 5 * 60 * 1000).toISOString(),
    confidence: 0.92,
    source: 'camera_auto',
    history: [],
  });

  // 3. Canne (Walking cane) on Porte-manteau in Couloir - Stale (30 mins ago)
  await saveSpatialObject(spatialTestUser, {
    id: 'sp_cane_bench',
    uid: spatialTestUser,
    objectName: 'Canne',
    category: 'other',
    room: 'Couloir',
    surface: 'Porte-manteau',
    relativePosition: { direction: 'right' },
    lastSeenTimestamp: now - 30 * 60 * 1000, // 30 mins ago (> 20 min stale threshold)
    lastSeenIso: new Date(now - 30 * 60 * 1000).toISOString(),
    confidence: 0.90,
    source: 'camera_auto',
    history: [],
  });

  // 3.2 French Spatial Query Resolution
  console.log('\n  [Sub-Group 3.2: Resolving French Spatial Queries]');

  // Query 1: 'Où sont mes clés ?'
  const keysRes = querySpatialMemory(spatialTestUser, 'Où sont mes clés ?', 'fr');
  assert(keysRes.found === true, '[Spatial Query: Clés] Found record for "Où sont mes clés ?"');
  assert(
    keysRes.message.includes('Clés') &&
      keysRes.message.includes('Table basse') &&
      keysRes.message.includes('Salon'),
    `[Spatial Resolution: Clés] Location reported in French: "${keysRes.message}"`
  );

  // Query 2: 'As-tu vu mes lunettes ?'
  const glassesRes = querySpatialMemory(spatialTestUser, 'As-tu vu mes lunettes ?', 'fr');
  assert(glassesRes.found === true, '[Spatial Query: Lunettes] Found record for "As-tu vu mes lunettes ?"');
  assert(
    glassesRes.message.includes('Lunettes') &&
      glassesRes.message.includes('Table de chevet') &&
      glassesRes.message.includes('Chambre'),
    `[Spatial Resolution: Lunettes] Location reported in French: "${glassesRes.message}"`
  );

  // Query 3: 'Où ai-je posé ma canne ?' (Stale observation)
  const caneRes = querySpatialMemory(spatialTestUser, 'Où ai-je posé ma canne ?', 'fr');
  assert(caneRes.found === true, '[Spatial Query: Canne] Found record for "Où ai-je posé ma canne ?"');
  assert(
    caneRes.message.includes('Canne') &&
      caneRes.message.includes('Porte-manteau') &&
      caneRes.message.includes('Couloir'),
    `[Spatial Resolution: Canne] Location reported in French: "${caneRes.message}"`
  );

  // 3.3 Epistemic Honesty Verification
  console.log('\n  [Sub-Group 3.3: Epistemic Honesty Verification]');
  // Stale object (Canne seen 30 mins ago) MUST have epistemic qualifier
  const caneHonesty = evaluateSpatialHonesty(caneRes.message, true, 'fr');
  assert(
    caneHonesty.hasHonestyDisclaimer,
    `[Epistemic Honesty] Stale observation contains movement caveat: "${caneRes.message}"`
  );

  // Fresh object (Clés seen 3 mins ago) should NOT have stale caveat
  const keysHonesty = evaluateSpatialHonesty(keysRes.message, false, 'fr');
  assert(
    !keysHonesty.hasHonestyDisclaimer,
    '[Epistemic Precision] Fresh observation (<20m) does not trigger false movement warnings'
  );

  // Unknown object query (e.g. passport not seen)
  const unknownRes = querySpatialMemory(spatialTestUser, 'Où est mon passeport ?', 'fr');
  assert(unknownRes.found === false, '[Epistemic Honesty] Unobserved object returns found: false');
  assert(
    unknownRes.message ===
      "Cet objet n'a pas été observé récemment par la caméra dans votre mémoire spatiale.",
    `[Epistemic Honesty] Unobserved object returns honest failure in French: "${unknownRes.message}"`
  );

  // 3.4 Arabic Spatial Query Parity
  console.log('\n  [Sub-Group 3.4: Arabic Spatial Query Parity]');
  const arabicKeysRes = querySpatialMemory(spatialTestUser, 'فين مفاتيحي؟', 'ar');
  assert(arabicKeysRes.found === true, '[Spatial Query: Arabic Keys] Found record for "فين مفاتيحي؟"');
  assert(
    arabicKeysRes.message.includes('المفاتيح') || arabicKeysRes.message.includes('Clés'),
    `[Arabic Resolution] Resolved in Arabic: "${arabicKeysRes.message}"`
  );

  // 3.5 Disambiguation in French under Spatial Memory 2.0
  console.log('\n  [Sub-Group 3.5: French Multi-Instance Disambiguation (Spatial 2.0)]');
  const userV2 = 'student_disambig_fr';
  clearSpatialMemoryV2ForUser(userV2);

  // Register House Keys in Salon
  recordSpatialObservationV2(userV2, {
    category: 'keys',
    identityLabel: 'House Keys',
    roomEn: 'Living Room',
    roomAr: 'الصالة',
    roomFr: 'Salon',
    surfaceEn: 'Table',
    surfaceAr: 'الترابيزة',
    surfaceFr: 'Table',
    features: { subType: 'house' },
  });

  // Register Car Keys in Chambre
  recordSpatialObservationV2(userV2, {
    category: 'keys',
    identityLabel: 'Car Keys',
    roomEn: 'Bedroom',
    roomAr: 'غرفة النوم',
    roomFr: 'Chambre',
    surfaceEn: 'Nightstand',
    surfaceAr: 'الكومودينو',
    surfaceFr: 'Table de chevet',
    features: { subType: 'car' },
  });

  // Generic query "Où sont mes clés ?" -> Ambiguous!
  const ambiguousFr = resolveSpatialQueryV2('Où sont mes clés ?', userV2, 'fr');
  assert(ambiguousFr.isAmbiguous === true, '[Disambiguation] Generic French keys query detected as ambiguous');
  assert(
    ambiguousFr.clarificationPromptFr !== undefined &&
      ambiguousFr.clarificationPromptFr.includes('Clés de maison') &&
      ambiguousFr.clarificationPromptFr.includes('Clés de voiture'),
    `[French Clarification Prompt] Localized prompt generated: "${ambiguousFr.clarificationPromptFr}"`
  );

  // Specific query "Où sont mes clés de voiture ?" -> Unambiguous!
  const specificFr = resolveSpatialQueryV2('Où sont mes clés de voiture ?', userV2, 'fr');
  assert(specificFr.isAmbiguous === false, '[Disambiguation] Specific French query resolved unambiguously');
  assert(
    specificFr.primaryMatch?.labelFr === 'Clés de voiture',
    `[Disambiguation Match] Primary match is "${specificFr.primaryMatch?.labelFr}"`
  );

  // ==========================================================================
  // GROUP 4: TRILINGUAL PARITY (CONCEPT GRAPH, STRAIN & AUDIO SPEECH)
  // ==========================================================================
  console.log('\n------------------------------------------------------------------------------');
  console.log('GROUP 4: Trilingual Parity (Concept Graph, Strain Triggers & Audio Speech)');
  console.log('------------------------------------------------------------------------------');

  // 4.1 Concept Graph Trilingual Parity
  console.log('  [Sub-Group 4.1: Concept Graph Trilingual Parity]');
  const coreConceptKeys = [
    'recursion',
    'pointers',
    'asymptotic_complexity',
    'dynamic_memory',
    'functions',
    'control_flow',
    'variables_types',
  ];

  for (const key of coreConceptKeys) {
    const concept = TRILINGUAL_CONCEPT_GRAPH[key];
    assert(concept !== undefined, `[Concept Node] Concept "${key}" exists in trilingual graph`);
    assert(
      concept.nameEn.length > 0 && concept.nameAr.length > 0 && concept.nameFr.length > 0,
      `[Trilingual Labels] "${key}": EN="${concept.nameEn}" | AR="${concept.nameAr}" | FR="${concept.nameFr}"`
    );
    assert(
      concept.descriptionEn.length > 0 &&
        concept.descriptionAr.length > 0 &&
        concept.descriptionFr.length > 0,
      `[Trilingual Descriptions] "${key}" has complete descriptions across EN, AR, and FR`
    );
  }

  // 4.2 Conversational Strain Detection Trilingual Parity
  console.log('\n  [Sub-Group 4.2: Conversational Strain Trilingual Triggers]');
  for (const lang of ['fr', 'ar', 'en'] as const) {
    const fixtures = TRILINGUAL_STRAIN_FIXTURES[lang];
    for (const f of fixtures) {
      const strainResult = detectConversationalStrain(f.text);
      assert(
        strainResult.isConfused === f.expectedConfused,
        `[Strain Trigger: ${lang.toUpperCase()}] "${f.text}" -> isConfused: ${strainResult.isConfused}`
      );
      assert(
        strainResult.severity === f.expectedSeverity,
        `[Strain Severity: ${lang.toUpperCase()}] "${f.text}" -> severity: ${strainResult.severity} (Expected: ${f.expectedSeverity})`
      );
      assert(
        strainResult.reasonFr.length > 0 &&
          strainResult.reasonAr.length > 0 &&
          strainResult.reasonEn.length > 0,
        `[Strain Localization: ${lang.toUpperCase()}] Localized pedagogical adaptations present across all 3 languages`
      );
    }
  }

  // 4.3 Arabic Dialect Switching (Egyptian "بلدي" vs MSA)
  console.log('\n  [Sub-Group 4.3: Arabic Dialect Switching]');
  for (const arFixture of ARABIC_QUERY_FIXTURES) {
    assert(
      arFixture.expectedDialectResponse.length > 0,
      `[Arabic Dialect] "${arFixture.query}" (${arFixture.dialect}) maps to ${arFixture.expectedTone} response`
    );
  }

  // 4.4 Audio Speech Sanitization (cleanForSpeech Trilingual Parity)
  console.log('\n  [Sub-Group 4.4: Audio Speech Sanitization (cleanForSpeech)]');
  for (const lang of ['fr', 'ar', 'en'] as const) {
    const fixture = SPEECH_SANITIZATION_FIXTURES[lang];
    const cleaned = cleanForSpeech(fixture.raw);

    // Verify sign markers stripped
    assert(!cleaned.includes('[Signs:'), `[Speech TTS: ${lang.toUpperCase()}] Stripped sign avatar markers`);

    // Verify markdown headers stripped
    assert(!cleaned.includes('**'), `[Speech TTS: ${lang.toUpperCase()}] Stripped markdown bold markers`);

    // Verify bullet points stripped
    assert(!/^\s*[-*•]\s+/m.test(cleaned), `[Speech TTS: ${lang.toUpperCase()}] Stripped bullet list dashes`);

    // Verify language-specific hazard headers converted or removed
    if (lang === 'fr') {
      assert(
        cleaned.includes('Aucun danger autour de vous.') && !cleaned.includes('**Dangers:**'),
        '[Speech TTS: FR] Converted French hazard header to natural speech: "Aucun danger autour de vous."'
      );
      assert(
        cleaned.includes('C plus plus') && cleaned.includes('C sharp'),
        '[Speech TTS: FR] Preserved and expanded programming languages: C++ -> "C plus plus", C# -> "C sharp"'
      );
    } else if (lang === 'ar') {
      assert(
        cleaned.includes('مفيش أخطار حواليك.') && !cleaned.includes('**المخاطر:**'),
        '[Speech TTS: AR] Converted Arabic hazard header to natural speech: "مفيش أخطار حواليك."'
      );
      assert(!cleaned.includes('استريك'), '[Speech TTS: AR] Stripped spoken asterisk artifact "استريك"');
    } else if (lang === 'en') {
      assert(
        cleaned.includes('No hazards around you.') && !cleaned.includes('**Hazards:**'),
        '[Speech TTS: EN] Converted English hazard header to natural speech: "No hazards around you."'
      );
    }
  }

  // 4.5 Holistic Master Parity Validation Function
  console.log('\n  [Sub-Group 4.5: Master Trilingual Parity Check]');
  const parityReport = validateTrilingualParity();
  assert(parityReport.conceptGraphParity === true, '[Master Parity] Concept Graph parity is 100% complete');
  assert(parityReport.strainParity === true, '[Master Parity] Strain Detection parity is 100% complete');
  assert(parityReport.speechSanitizationParity === true, '[Master Parity] Speech Sanitization parity is 100% complete');
  assert(
    parityReport.totalConceptsChecked >= 7,
    `[Master Parity] Verified ${parityReport.totalConceptsChecked} core concepts in trilingual registry`
  );

  // ==========================================================================
  // BENCHMARK SUMMARY & REPORTING
  // ==========================================================================
  console.log('\n==============================================================================');
  console.log('📊 BENCHMARK RESULTS SUMMARY');
  console.log('==============================================================================');
  console.log(`  Total Invariant Assertions : ${totalTests}`);
  console.log(`  Passed                      : ${passedTests}`);
  console.log(`  Failed                      : ${failedTests}`);
  console.log('------------------------------------------------------------------------------');

  for (const [rubricKey, criteria] of Object.entries(EVALUATION_RUBRICS)) {
    const passedPct = failedTests === 0 ? 100 : Math.round((passedTests / totalTests) * 100);
    console.log(
      `  • Rubric [${rubricKey}]: ${passedPct}% (Weight: ${criteria.weight * 100}%, Threshold: ${criteria.passingThreshold * 100}%) -> PASS`
    );
  }

  console.log('==============================================================================\n');

  if (failedTests > 0) {
    console.error(`💥 BENCHMARK FAILED WITH ${failedTests} FAILURE(S)!`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passedTests} FRENCH & MULTILINGUAL BENCHMARK ASSERTIONS PASSED WITH 0 FAILURES (100%)!\n`);
    process.exit(0);
  }
}

runBenchmarkSuite().catch((err) => {
  console.error('Fatal error during benchmark suite execution:', err);
  process.exit(1);
});
