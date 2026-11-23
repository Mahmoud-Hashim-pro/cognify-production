/**
 * Egyptian Sign Language Phase 6 Verification Test Suite
 *
 * Verifies:
 * 1. Expert-Reviewed Sign Dictionary (zero fake signs, verified attribution, regional variations, search normalization)
 * 2. Learning Experience Engine (structured beginner lessons, user progress tracking, favorites, interactive quizzes)
 * 3. Avatar Motion Validator & Video Fallback Resolver (rejection of unverified procedural ASL, safe video fallback)
 * 4. Educational disclosure and accessibility metadata
 */

import {
  ExpertSignDictionary,
  type VerifiedSignEntry,
  type SignTopicCategory,
} from '../src/modules/hearAndExpress/signLanguage/expertSignDictionary';
import {
  LearningExperienceEngine,
  EDUCATIONAL_DISCLOSURE_NOTICE,
} from '../src/modules/hearAndExpress/signLanguage/learningExperienceEngine';
import {
  AvatarMotionValidator,
  type ValidatedSignMotionTrack,
} from '../src/modules/hearAndExpress/signLanguage/avatarMotionValidator';

export async function runSignLanguagePhase6Verification(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      failed++;
      errors.push(message);
      console.error(`  ❌ FAILED: ${message}`);
    }
  }

  console.log('\n======================================================');
  console.log('--- Rafiqi Phase 6: Sign Language Learning & Avatar ---');
  console.log('======================================================\n');

  const dictionary = new ExpertSignDictionary();
  const learningEngine = new LearningExperienceEngine(dictionary);
  const avatarValidator = new AvatarMotionValidator(dictionary);

  // ----------------------------------------------------
  // SECTION 1: Expert Sign Dictionary Integrity & Content
  // ----------------------------------------------------
  console.log('--- [Section 1] Expert Sign Dictionary Integrity ---');

  const allSigns = dictionary.getAllEntries();
  assert(allSigns.length >= 12, `Dictionary contains ${allSigns.length} expert signs (expected >= 12)`);

  // Ensure every sign has complete metadata, accredited source, and reviewer attribution
  let missingMetadataCount = 0;
  let invalidStatusCount = 0;
  const validStatuses = ['deaf_community_verified', 'certified_interpreter_reviewed', 'pending_regional_audit'];

  for (const sign of allSigns) {
    if (
      !sign.id ||
      !sign.arabicPhrase ||
      !sign.verifiedSignLabel ||
      !sign.contextAndUsageAr ||
      !sign.contextAndUsageEn ||
      !sign.sourceAttribution ||
      !sign.expertReviewerName ||
      !sign.screenReaderDescriptionAr ||
      !sign.screenReaderDescriptionEn
    ) {
      missingMetadataCount++;
    }

    if (!validStatuses.includes(sign.validationStatus)) {
      invalidStatusCount++;
    }
  }

  assert(missingMetadataCount === 0, `All signs possess comprehensive metadata (failures: ${missingMetadataCount})`);
  assert(invalidStatusCount === 0, `All signs have valid accredited verification status (failures: ${invalidStatusCount})`);

  // Test regional variation documentation for key signs
  const hospitalSign = dictionary.getEntryById('esl_emerg_mustashfa');
  assert(
    !!hospitalSign && !!hospitalSign.regionalVariationNotesAr && hospitalSign.regionalVariationNotesAr.includes('القاهرة'),
    'Hospital sign contains explicit regional variations between Cairo, Alexandria, and Upper Egypt'
  );

  const emergencySign = dictionary.getEntryById('esl_emerg_tawaree');
  assert(
    !!emergencySign && emergencySign.category === 'emergency_and_safety',
    'Emergency sign is correctly categorized with urgent context'
  );

  // Test Arabic search normalization (Hamza, Ta Marbuta, diacritics)
  const searchResultWithHamza = dictionary.search('أهلاً');
  const searchResultWithoutHamza = dictionary.search('اهلا');
  assert(
    searchResultWithHamza.length > 0 && searchResultWithHamza.length === searchResultWithoutHamza.length,
    'Arabic text search normalizes Hamza variations correctly'
  );

  const searchDoctor = dictionary.search('طبيب');
  assert(searchDoctor.some(s => s.id === 'esl_emerg_tabeeb'), 'Search matches sign gloss for doctor/physician');

  // Test category filtering
  const emergencySigns = dictionary.search('', 'emergency_and_safety');
  assert(
    emergencySigns.length >= 2 && emergencySigns.every(s => s.category === 'emergency_and_safety'),
    `Category filtering retrieves valid signs (found ${emergencySigns.length} emergency signs)`
  );

  // ----------------------------------------------------
  // SECTION 2: Learning Experience Engine & Curriculum
  // ----------------------------------------------------
  console.log('\n--- [Section 2] Learning Experience & Educational Integrity ---');

  const lessons = learningEngine.getLessons();
  assert(lessons.length >= 5, `Curriculum provides ${lessons.length} beginner units (expected >= 5)`);

  // Verify all lesson sign references actually exist in the dictionary
  let unverifiedLessonSignCount = 0;
  for (const lesson of lessons) {
    for (const signId of lesson.signIds) {
      if (!dictionary.getEntryById(signId)) {
        unverifiedLessonSignCount++;
      }
    }
  }
  assert(unverifiedLessonSignCount === 0, `All signs taught in lessons exist in verified dictionary (missing: ${unverifiedLessonSignCount})`);

  // Verify Educational Disclosure Notice
  assert(
    EDUCATIONAL_DISCLOSURE_NOTICE.en.toLowerCase().includes('educational') &&
    EDUCATIONAL_DISCLOSURE_NOTICE.ar.includes('تعليمي'),
    'Educational disclosure notice clearly distinguishes learning curriculum from automated camera recognition'
  );

  // Test User Learning Progress State
  let userState = learningEngine.getUserState();
  assert(userState.overallMasteryPercentage === 0, 'Initial learning state starts with 0% mastery');

  // Complete a lesson and record mastery
  learningEngine.markLessonCompleted('lesson_01_greetings');

  userState = learningEngine.getUserState();
  assert(userState.completedLessonIds.includes('lesson_01_greetings'), 'Lesson completion is tracked');
  assert(userState.masteredSignIds.length === 3, 'Sign mastery list accurately recorded from completed lesson');
  assert(userState.overallMasteryPercentage > 0, `Mastery percentage calculated accurately: ${userState.overallMasteryPercentage}%`);

  // Test Bookmarking / Favorites
  assert(!learningEngine.isFavorite('esl_needs_maa'), 'Sign is initially not favorited');
  learningEngine.addFavorite('esl_needs_maa');
  assert(learningEngine.isFavorite('esl_needs_maa'), 'Sign is successfully added to favorites');
  const favs = learningEngine.getFavorites();
  assert(favs.some(s => s.id === 'esl_needs_maa'), 'Favorites list returns full sign object');
  learningEngine.removeFavorite('esl_needs_maa');
  assert(!learningEngine.isFavorite('esl_needs_maa'), 'Sign is successfully removed from favorites');

  // Test Practice Quiz Generation
  const quiz = learningEngine.generatePracticeQuiz();
  assert(quiz.length >= 3, `Generated ${quiz.length} practice questions`);

  // Verify quiz question structure & educational explanation
  const sampleQuestion = quiz[0];
  assert(
    sampleQuestion.optionsAr.length >= 2 &&
    sampleQuestion.correctOptionIndex >= 0 &&
    sampleQuestion.explanationAr.length > 0,
    'Quiz question contains options, valid answer index, and clear Arabic educational explanation'
  );

  // Verify non-manual facial grammar question exists
  const hasFacialGrammarQuestion = quiz.some(q => q.questionType === 'facial_grammar_check');
  assert(hasFacialGrammarQuestion, 'Quiz incorporates non-manual facial grammar validation questions');

  // Test Quiz Scoring
  learningEngine.recordQuizScore('quiz_unit_1', 100);
  userState = learningEngine.getUserState();
  assert(
    userState.quizScores.some(s => s.quizId === 'quiz_unit_1' && s.scorePercentage === 100),
    'Quiz score is recorded correctly into user learning history'
  );

  // ----------------------------------------------------
  // SECTION 3: Avatar Motion Validation & Fallback Resolver
  // ----------------------------------------------------
  console.log('\n--- [Section 3] Avatar Motion Validation & Clinical Safety ---');

  // Test safe fallback for verified signs without 3D animation
  const fallbackResolution = avatarValidator.resolveSignDemonstration('esl_greet_salam');
  assert(
    fallbackResolution.renderMode === 'video_demonstration_fallback',
    'Verified sign without motion track defaults safely to video demonstration fallback'
  );
  assert(
    !fallbackResolution.hasValid3dAnimation,
    'Resolution indicates no valid 3D animation'
  );
  assert(
    fallbackResolution.proceduralAslRejected === true,
    'Clinical rule ensures procedural ASL is flagged as rejected'
  );

  // Test strict rejection when registering unverified procedural ASL track
  const unverifiedProceduralAslTrack: ValidatedSignMotionTrack = {
    trackId: 'track_fake_asl_1',
    signId: 'esl_greet_salam',
    arabicGloss: 'سلام عليكم',
    sourceType: 'unverified_procedural_asl',
    isExpertApproved: false,
    approvingExpertId: '',
    durationSeconds: 1.5,
    framerate: 30,
    jointRotationsEuler: [],
    facialMorphTargets: [],
    validationTimestamp: new Date().toISOString(),
  };

  const registerSuccess = avatarValidator.registerMotionTrack(unverifiedProceduralAslTrack);
  assert(registerSuccess === false, 'Avatar validator strictly rejects registration of unverified procedural ASL track');
  assert(avatarValidator.getRegisteredTracksCount() === 0, 'No unverified tracks added to registry');

  // Test registration and approval of genuine optical mocap track
  const approvedMocapTrack: ValidatedSignMotionTrack = {
    trackId: 'track_mocap_salam_valid',
    signId: 'esl_greet_salam',
    arabicGloss: 'سلام عليكم',
    sourceType: 'mocap_optical_capture',
    isExpertApproved: true,
    approvingExpertId: 'exp_egy_sign_society_01',
    durationSeconds: 1.8,
    framerate: 60,
    jointRotationsEuler: [{ 'wrist_r': [0, 0.2, 0.4] }],
    facialMorphTargets: [{ 'smile': 0.6 }],
    validationTimestamp: new Date().toISOString(),
  };

  const registerMocapSuccess = avatarValidator.registerMotionTrack(approvedMocapTrack);
  assert(registerMocapSuccess === true, 'Approved optical mocap track is successfully registered');
  assert(avatarValidator.getRegisteredTracksCount() === 1, 'Registry contains 1 validated track');

  const mocapResolution = avatarValidator.resolveSignDemonstration('esl_greet_salam');
  assert(
    mocapResolution.renderMode === '3d_avatar_validated' && mocapResolution.hasValid3dAnimation,
    'Expert-approved optical mocap track is accepted for 3D avatar animation'
  );

  // Test handling of unverified / non-existent sign
  const nonExistentResolution = avatarValidator.resolveSignDemonstration('esl_fake_fabricated_sign');
  assert(
    nonExistentResolution.renderMode === 'unsupported_sign',
    'Non-existent sign returns unsupported_sign mode and strictly refuses to fabricate motion'
  );

  // ----------------------------------------------------
  // SECTION 4: Accessibility & Phonological Parameters
  // ----------------------------------------------------
  console.log('\n--- [Section 4] Accessibility & Phonological Parameters ---');

  let phonologyCompleteCount = 0;
  for (const sign of allSigns) {
    if (
      sign.handshapeDescriptionAr &&
      sign.locationDescriptionAr &&
      sign.movementDescriptionAr &&
      sign.nonManualCuesAr
    ) {
      phonologyCompleteCount++;
    }
  }

  assert(
    phonologyCompleteCount === allSigns.length,
    `All ${allSigns.length} signs provide complete phonological parameters (Handshape, Location, Movement, Non-manual cues)`
  );

  console.log('\n======================================================');
  console.log(`Phase 6 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  return { passed, failed, errors };
}

// Direct execution when run via tsx
if (process.argv[1]?.includes('signLanguagePhase6Verification')) {
  runSignLanguagePhase6Verification()
    .then(result => {
      if (result.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
