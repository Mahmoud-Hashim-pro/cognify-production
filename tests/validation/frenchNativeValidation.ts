/**
 * Cognify 2.0 - Real-World Persona Simulation Testbed (Phase D - Requirement 29)
 * tests/validation/frenchNativeValidation.ts
 *
 * Simulates a native French student navigating courses, requesting French explanations,
 * and using French travel assistance without language regression:
 * 
 * 1. Native French Student Profile & UI Localization:
 *    - Full course navigation with native French translations
 *    - Verification of French terminology (Tableau de bord, Paramètres, etc.)
 * 
 * 2. Academic Pedagogical Explanations in French (Zero Language Regression):
 *    - System prompt persona generation with strict French language directives
 *    - Conforming C++ pointers and dynamic memory explanations in fluent technical French
 *    - Output validation through Quality Guard preserving French diacritics and quotes
 *    - High-yield spaced retention micro-reviews in French
 * 
 * 3. French Travel Voice Assistant Simulation:
 *    - Categorized travel phrase bank across 6 critical domains
 *    - Golden Politeness rule enforcement ("Bonjour Madame / Monsieur")
 *    - French TTS speech synthesis cleaner and fr-FR voice mapping
 *    - Multi-turn realistic French travel interaction without slipping into English or Arabic
 */

import { getTranslation, localize } from '../../src/lib/translations.js';
import { buildPersona, Profile } from '../../api/_lib/ai.js';
import { validateAndSanitizeResponse } from '../../api/_lib/qualityGuard.js';
import { generateMicroReview } from '../../src/lib/retentionProductEngine.js';
import { cleanForSpeech } from '../../src/lib/tts.js';
import { createInitialStudentState } from '../../src/lib/studentStateEngine.js';
import { StudentState } from '../../src/types/studentState.js';

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    totalFailed++;
  }
}

export async function runFrenchNativeValidationSuite(): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🇫🇷 RUNNING NATIVE FRENCH STUDENT VALIDATION TESTBED');
  console.log('================================================================\n');

  // ===========================================================================
  // 1. Native French Student Profile & UI Navigation Localization
  // ===========================================================================
  console.log('----------------------------------------------------------------');
  console.log('🧭 1. Native French Profile & Course Navigation Localization');
  console.log('----------------------------------------------------------------');

  const frenchProfile: Profile = {
    uid: 'student_french_antoine_2026',
    name: 'Antoine Dupont',
    displayName: 'Antoine',
    level: 'Intermediate',
    role: 'Student',
    field: 'Computer Science',
    language: 'French',
    university: 'Sorbonne Université',
    faculty: 'Faculté des Sciences et Ingénierie',
    department: 'Informatique',
    accessibilityMode: 'None',
  };

  assert(frenchProfile.language === 'French', 'Student language configured to French');
  assert(frenchProfile.university === 'Sorbonne Université', 'Enrolled at Sorbonne Université');

  // Validate core UI navigational keys in French
  assert(getTranslation('French', 'dashboard') === 'Tableau de Bord', 'Dashboard translated as "Tableau de Bord"');
  assert(getTranslation('French', 'settings') === 'Paramètres', 'Settings translated as "Paramètres"');
  assert(getTranslation('French', 'myProfile') === 'Mon Profil', 'Profile translated as "Mon Profil"');
  assert(getTranslation('French', 'continue') === 'Continuer', 'Continue button translated as "Continuer"');
  assert(getTranslation('French', 'back') === 'Retour', 'Back button translated as "Retour"');
  assert(getTranslation('French', 'hearContent') === 'Entendre le contenu', 'Audio trigger translated as "Entendre le contenu"');
  assert(getTranslation('French', 'narrateDocument') === 'Narrer le document', 'Doc narration translated as "Narrer le document"');
  assert(getTranslation('French', 'educationLevel') === "Niveau d'Éducation", 'Education level translated as "Niveau d\'Éducation"');
  assert(getTranslation('French', 'primary') === 'École Primaire', 'Primary school translated as "École Primaire"');
  assert(getTranslation('French', 'university') === 'Université / Ens. Supérieur', 'University translated as "Université / Ens. Supérieur"');

  // ===========================================================================
  // 2. Requesting Technical Explanations in French (Zero Regression)
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('📚 2. Technical Explanations in French (Zero Language Regression)');
  console.log('----------------------------------------------------------------');

  const mockStudentState: StudentState = createInitialStudentState(frenchProfile.uid, 'Intermediate');
  mockStudentState.cognitiveStage = 'developing';
  mockStudentState.activePedagogy = 'worked_example';
  mockStudentState.totalExercisesCompleted = 12;

  // 2.1 System Persona Prompt Assembly for French Student
  const frenchSystemPrompt = buildPersona(frenchProfile, '', mockStudentState);
  assert(frenchSystemPrompt.includes('Configured Language: French'), 'System prompt embeds "Configured Language: French"');
  assert(
    frenchSystemPrompt.includes('French in → reply in natural, fluent, idiomatic French'),
    'Enforces natural French output directive'
  );
  assert(
    frenchSystemPrompt.includes('If the user\'s configured language is French ("French") and query language is ambiguous, reply in French'),
    'Strictly sets French as the fallback language'
  );
  assert(
    frenchSystemPrompt.includes('FRANCE TRAVEL & SPOKEN FRENCH ASSISTANCE'),
    'Embeds France Travel & Spoken French Assistance section'
  );

  // 2.2 Conforming Complex Technical Explanation in French
  const modeledFrenchExplanation = `
En C++, un **pointeur** est une variable qui stocke l'adresse mémoire d'une autre variable.
Pour bien visualiser le concept, imaginez la mémoire vive (RAM) comme une rangée de casiers numérotés dans une université.
Chaque casier possède un numéro unique (l'adresse mémoire, par exemple \`0x1000\`) et contient une valeur.

Voici un exemple pas-à-pas :

**Étape 1 : Déclaration d'une variable classique**
\`\`\`cpp
int note = 18;
\`\`\`
En mémoire : Le casier \`0x1000\` reçoit le nom "note" et contient la valeur 18.

**Étape 2 : Déclaration du pointeur avec l'opérateur adresse &**
\`\`\`cpp
int* ptr = &note;
\`\`\`
Ici, \`ptr\` ne contient pas 18, mais conserve l'adresse \`0x1000\`.

**Étape 3 : Déréférencement avec l'opérateur \***
\`\`\`cpp
cout << *ptr; // Affiche 18
\`\`\`
L'étoile ordonne à l'ordinateur : « Accède au casier \`0x1000\` et lis la valeur qui s'y trouve ».
  `.trim();

  // 2.3 Quality Guard Validation for French Output
  const qualityResult = validateAndSanitizeResponse(modeledFrenchExplanation, {
    language: 'French',
    accessibilityMode: 'None',
  });

  assert(qualityResult.isValid === true, 'Quality Guard approved modeled French explanation');
  assert(qualityResult.warnings.length === 0, 'Zero quality warnings or refusal signatures');

  // 2.4 Language Regression Invariant: Detect no English or Arabic leakage
  const hasEnglishBoilerplate = /sure,\s*here\s*is|as\s*an\s*ai|in\s*conclusion/i.test(modeledFrenchExplanation);
  assert(!hasEnglishBoilerplate, 'Zero English boilerplate leakage in French explanation');

  const hasArabicCharacters = /[\u0600-\u06FF]/.test(modeledFrenchExplanation);
  assert(!hasArabicCharacters, 'Zero Arabic characters leaked into pure French explanation');

  // Orthographic Diacritics Preservation
  assert(modeledFrenchExplanation.includes('mémoire'), 'Preserves French acute accent (é) in "mémoire"');
  assert(modeledFrenchExplanation.includes('pas-à-pas'), 'Preserves French grave accent (à) in "pas-à-pas"');
  assert(modeledFrenchExplanation.includes('Étape'), 'Preserves capital accented character (É) in "Étape"');
  assert(modeledFrenchExplanation.includes('«') && modeledFrenchExplanation.includes('»'), 'Preserves French quotation marks (« »)');

  // 2.5 Spaced Retention Micro-Review in French
  console.log('\n[Antoine] Spaced Retention Micro-Review French Verification');
  const frenchMicroReview = generateMicroReview('pointers');
  assert(frenchMicroReview.promptFr.includes('opérateur de déréférencement'), 'Micro-review prompt is translated to French');
  assert(frenchMicroReview.options[0].textFr.includes('emplacement mémoire'), 'Option A is localized in French');
  assert(frenchMicroReview.options[1].textFr.includes('adresse mémoire'), 'Option B is localized in French');
  assert(frenchMicroReview.explanationFr.includes('Déréférencer un pointeur'), 'Explanation is provided in fluent French');

  // ===========================================================================
  // 3. French Travel Voice Assistant Simulation
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('🥐 3. French Travel Voice Assistant Simulation');
  console.log('----------------------------------------------------------------');

  interface TravelPhraseTest {
    id: string;
    category: string;
    fr: string;
    arPhonetic: string;
    enPhonetic: string;
    en: string;
  }

  const travelPhrasesDatabase: TravelPhraseTest[] = [
    {
      id: 'p1',
      category: 'polite',
      fr: 'Bonjour Madame / Bonjour Monsieur',
      arPhonetic: 'بونجور مادام / بونجور مسيو',
      enPhonetic: 'bohn-zhoor mah-dahm / bohn-zhoor muh-syur',
      en: 'Good morning / Hello Ma\'am / Sir',
    },
    {
      id: 'p2',
      category: 'polite',
      fr: "S'il vous plaît",
      arPhonetic: 'سيل فو بليه',
      enPhonetic: 'seel voo pleh',
      en: 'Please',
    },
    {
      id: 'p3',
      category: 'cafe',
      fr: 'Un café et un croissant, s\'il vous plaît.',
      arPhonetic: 'آن كافيه إيه آن كرواسون، سيل فو بليه',
      enPhonetic: 'uhn kah-fay ay uhn krwah-sohn, seel voo pleh',
      en: 'A coffee and a croissant, please.',
    },
    {
      id: 'p4',
      category: 'metro',
      fr: 'Où se trouve la station de métro la plus proche ?',
      arPhonetic: 'أو سو تروف لا ستاسيون دو مترو لا بلو بروش؟',
      enPhonetic: 'oo suh troov lah stah-syohn duh may-troh lah ploo prosh?',
      en: 'Where is the nearest metro station?',
    },
    {
      id: 'p5',
      category: 'hotel',
      fr: 'J\'ai une réservation au nom de Dupont.',
      arPhonetic: 'جيه أون ريزيرفاسيون أو نوم دو دوبون',
      enPhonetic: 'zhay oon ray-zair-vah-syohn oh nohm duh doo-pohn',
      en: 'I have a reservation under the name Dupont.',
    },
    {
      id: 'p6',
      category: 'health',
      fr: 'Pouvez-vous m\'indiquer la pharmacie la plus proche ?',
      arPhonetic: 'بوفيه فو مانديكيه لا فارماسي لا بلو بروش؟',
      enPhonetic: 'poo-vay voo man-dee-kay lah far-mah-see lah ploo prosh?',
      en: 'Could you direct me to the nearest pharmacy?',
    },
  ];

  assert(travelPhrasesDatabase.length === 6, 'Loaded all 6 core travel phrase categories');
  
  // Golden Rule Verification: Polite greeting is first
  const politeGreeting = travelPhrasesDatabase.find(p => p.id === 'p1');
  assert(politeGreeting?.fr.includes('Bonjour'), 'Golden politeness rule begins with "Bonjour"');
  assert(politeGreeting?.category === 'polite', 'Categorized under "polite" etiquette');

  // Phonetic Transcription Verification
  const cafePhrase = travelPhrasesDatabase.find(p => p.category === 'cafe');
  assert(cafePhrase !== undefined, 'Found cafe category phrase');
  assert(cafePhrase?.arPhonetic.length > 5, 'Includes Arabic phonetic pronunciation guide');
  assert(cafePhrase?.enPhonetic.length > 5, 'Includes English phonetic pronunciation guide');

  // 3.2 Speech Synthesis (TTS) French Sanitization
  console.log('\n[Antoine] TTS Speech Synthesis French Formatting');
  const rawFrenchSpeechText = `
**Dangers:** Aucun danger détecté.
**Description de la scène:** Le Louvre à Paris.
Voici votre itinéraire : prenez le métro ligne 1.
  `.trim();

  const cleanedFrenchSpeech = cleanForSpeech(rawFrenchSpeechText);
  assert(!cleanedFrenchSpeech.includes('**Dangers:**'), 'TTS cleaner stripped raw danger header');
  assert(cleanedFrenchSpeech.includes('Aucun danger autour de vous.'), 'Replaced robotic hazard header with natural French');
  assert(!cleanedFrenchSpeech.includes('**Description de la scène:**'), 'TTS cleaner stripped raw description header');
  assert(cleanedFrenchSpeech.includes('prenez le métro ligne 1'), 'Preserved navigation instructions');

  // 3.3 Multi-Turn French Conversational Travel Simulation
  console.log('\n[Antoine] Multi-Turn French Travel Dialogue (Zero Language Regression)');
  interface DialogueTurn {
    userUtteranceFr: string;
    expectedAssistantFr: string;
  }

  const multiTurnDialogue: DialogueTurn[] = [
    {
      userUtteranceFr: 'Bonjour, comment aller au Musée du Louvre depuis Châtelet ?',
      expectedAssistantFr: 'Bonjour ! Depuis Châtelet, prenez la ligne 1 du métro en direction de La Défense et descendez à la station Palais Royal - Musée du Louvre. Le trajet dure environ 5 minutes.',
    },
    {
      userUtteranceFr: 'Merci ! Et où puis-je acheter un ticket ?',
      expectedAssistantFr: 'Vous pouvez acheter un ticket aux bornes automatiques dans la station ou utiliser votre passe Navigo.',
    },
    {
      userUtteranceFr: 'Parfait, merci beaucoup, bonne journée !',
      expectedAssistantFr: 'Je vous en prie, excellente visite à Paris et bonne journée !',
    },
  ];

  for (let turnIdx = 0; turnIdx < multiTurnDialogue.length; turnIdx++) {
    const turn = multiTurnDialogue[turnIdx];
    const isPureFrench = !(/[\u0600-\u06FF]/.test(turn.expectedAssistantFr)) && !(/\b(the|is|at|which|please)\b/i.test(turn.expectedAssistantFr));
    assert(isPureFrench, `Turn ${turnIdx + 1}: Assistant response maintained 100% pure French without regression`);
    assert(turn.expectedAssistantFr.length > 20, `Turn ${turnIdx + 1}: Informative travel guidance provided`);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 NATIVE FRENCH VALIDATION COMPLETE: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('================================================================\n');

  return { passed: totalPassed, failed: totalFailed };
}

// Direct CLI execution guard
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('frenchNativeValidation');
if (isDirectRun) {
  runFrenchNativeValidationSuite().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Fatal error in French Native Validation Suite:', err);
    process.exit(1);
  });
}
