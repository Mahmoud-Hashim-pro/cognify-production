/**
 * Adaptive Learning Hub & Cognitive Curriculum Comprehensive Verification Suite
 *
 * Verifies:
 * 1. Rich local curriculum generation for all 7 subjects (math, reading, writing, memory, comprehension, science, english).
 * 2. Elimination of dummy placeholder options (e.g. ['A', 'B', 'C', 'D']) across all 5 difficulty levels in both English and Arabic.
 * 3. Specialized module assets (syllables for ReadingModule, letterTiles for WritingModule).
 * 4. Dynamic difficulty adaptation (3 consecutive correct -> level up; 2 consecutive incorrect -> level down, bounded 1-5).
 * 5. Learning style inference engine (visual, auditory, kinesthetic, repetition).
 * 6. Spaced repetition mistake queue: tracking errors, recording user answers, and resolving review challenges.
 * 7. Learning hub settings persistence (curriculum level, dyslexia font, audio toggles).
 * 8. Resilient Web Audio synthesizer integration.
 */

import { generateAdaptiveExercise, generateLocalExercise } from '../src/services/learningAI.js';
import {
  adaptDifficulty,
  detectLearningStyle,
  recordExerciseResult,
  resolveMistakeReview,
  updateLearningSettings,
} from '../src/lib/learningProfile.js';
import { learningAudio } from '../src/lib/learningAudio.js';
import {
  SubjectType,
  LearningProfile,
  createDefaultLearningProfile,
  DifficultyLevel,
  Exercise,
  ExerciseResult,
} from '../src/types/learning.js';

let totalPassed = 0;
let totalFailed = 0;

export async function runLearningHubComprehensiveVerification(
  customAssert?: (cond: boolean, name: string) => void
): Promise<{ passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('🧪 ADAPTIVE LEARNING HUB: COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================');

  let passedLocal = 0;
  let failedLocal = 0;

  const assert = (cond: boolean, name: string) => {
    if (customAssert) {
      customAssert(cond, name);
    }
    if (cond) {
      passedLocal++;
      totalPassed++;
      console.log(`  ✅ PASS: ${name}`);
    } else {
      failedLocal++;
      totalFailed++;
      console.error(`  ❌ FAIL: ${name}`);
    }
  };

  const ALL_SUBJECTS: SubjectType[] = [
    'math',
    'reading',
    'writing',
    'memory',
    'comprehension',
    'science',
    'english',
  ];

  // --------------------------------------------------------------------------
  // TEST 1: Curriculum Generators for All 7 Subjects in Both Languages (EN & AR)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Curriculum Generators Coverage & Elimination of Dummy Fallbacks ---');

  for (const subject of ALL_SUBJECTS) {
    for (const lang of ['en', 'ar'] as const) {
      for (let diff = 1; diff <= 5; diff++) {
        // Exercise generation through local generator & adaptive generator
        const exercise = generateLocalExercise(subject, diff as DifficultyLevel, lang);

        assert(Boolean(exercise && exercise.id), `[${subject} L${diff} ${lang}] Exercise generated with valid ID`);
        assert(Boolean(exercise.question && exercise.question.length > 3), `[${subject} L${diff} ${lang}] Has non-trivial question text`);
        assert(Boolean(exercise.options && exercise.options.length >= 2), `[${subject} L${diff} ${lang}] Has at least 2 selectable options`);

        // Crucial Check: Dummy fallback ['A', 'B', 'C', 'D'] must NEVER occur
        const isDummyOptions =
          exercise.options &&
          exercise.options.length === 4 &&
          exercise.options[0] === 'A' &&
          exercise.options[1] === 'B' &&
          exercise.options[2] === 'C' &&
          exercise.options[3] === 'D';
        assert(!isDummyOptions, `[${subject} L${diff} ${lang}] No dummy ['A','B','C','D'] fallback`);

        // Check correct answer is present in options
        const containsCorrect = exercise.options?.some(
          (opt) => opt.trim().toLowerCase() === exercise.correctAnswer.trim().toLowerCase()
        );
        assert(Boolean(containsCorrect), `[${subject} L${diff} ${lang}] Correct answer is included in options`);

        // Check explanation exists
        assert(Boolean(exercise.explanation && exercise.explanation.length > 3), `[${subject} L${diff} ${lang}] Has informative explanation`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // TEST 2: Specialized Module Payload Enhancements (Syllables & Letter Tiles)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Specialized Module Payload Enhancements ---');

  // Reading Module: Syllable breakdown
  const readingExercise = generateLocalExercise('reading', 2, 'en');
  assert(Boolean(readingExercise.syllables && readingExercise.syllables.length > 0), 'Reading exercise includes syllable phonetic breakdown');

  // Writing Module: Letter/Word tiles
  const writingExercise = generateLocalExercise('writing', 1, 'en');
  assert(Boolean(writingExercise.letterTiles && writingExercise.letterTiles.length >= 3), 'Writing exercise includes interactive letter/word tiles');

  // Adaptive Generator fallback integration
  const adaptiveEx = await generateAdaptiveExercise({
    subject: 'math',
    difficulty: 3,
    teachingMethod: 'visual',
    language: 'en',
    curriculumLevel: 'elementary',
  });
  assert(Boolean(adaptiveEx && adaptiveEx.question), 'Adaptive generator gracefully yields complete exercise in offline mode');

  // --------------------------------------------------------------------------
  // TEST 3: Dynamic Difficulty Adaptation Engine (adaptDifficulty)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Dynamic Difficulty Adaptation Engine ---');

  // 3 consecutive correct -> level up
  assert(adaptDifficulty(1, 3, 0) === 2, 'Level 1 with 3 consecutive correct advances to Level 2');
  assert(adaptDifficulty(4, 3, 0) === 5, 'Level 4 with 3 consecutive correct advances to Level 5');
  assert(adaptDifficulty(5, 5, 0) === 5, 'Level 5 with consecutive correct is capped at max Level 5');

  // 2 consecutive incorrect -> level down
  assert(adaptDifficulty(3, 0, 2) === 2, 'Level 3 with 2 consecutive incorrect drops to Level 2');
  assert(adaptDifficulty(2, 0, 2) === 1, 'Level 2 with 2 consecutive incorrect drops to Level 1');
  assert(adaptDifficulty(1, 0, 4) === 1, 'Level 1 with consecutive incorrect is bounded at min Level 1');

  // Neutral streak keeps difficulty unchanged
  assert(adaptDifficulty(3, 1, 0) === 3, 'Level 3 with 1 correct maintains Level 3');
  assert(adaptDifficulty(4, 0, 1) === 4, 'Level 4 with 1 incorrect maintains Level 4');

  // --------------------------------------------------------------------------
  // TEST 4: Learning Style Inference Engine (detectLearningStyle)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Learning Style Inference Engine ---');

  const profile = createDefaultLearningProfile();
  // Kinesthetic: high math, writing & memory
  profile.subjects.math.accuracy = 95;
  profile.subjects.writing.accuracy = 90;
  profile.subjects.memory.accuracy = 92;
  profile.subjects.reading.accuracy = 50;
  profile.subjects.comprehension.accuracy = 45;
  assert(detectLearningStyle(profile) === 'kinesthetic', 'Infers kinesthetic learning style when hands-on subjects dominate');

  // Auditory: high reading and english
  profile.subjects.math.accuracy = 40;
  profile.subjects.writing.accuracy = 40;
  profile.subjects.memory.accuracy = 40;
  profile.subjects.reading.accuracy = 95;
  profile.subjects.english.accuracy = 92;
  assert(detectLearningStyle(profile) === 'auditory', 'Infers auditory learning style when phonetic & language subjects dominate');

  // --------------------------------------------------------------------------
  // TEST 5: Spaced Repetition Mistake Queue & Review Deck
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Spaced Repetition Mistake Queue ---');

  const testUid = `hub_test_user_${Date.now()}`;
  let userProfile = createDefaultLearningProfile();

  const failedResult: ExerciseResult = {
    exerciseId: 'test_mistake_math_1',
    subject: 'math',
    difficulty: 2,
    isCorrect: false,
    childAnswer: '12',
    userAnswer: '12',
    correctAnswer: '15',
    responseTimeMs: 3200,
    attemptNumber: 1,
    teachingMethodUsed: 'visual',
    topic: 'addition',
    timestamp: Date.now(),
    question: 'What is 7 + 8?',
    options: ['13', '14', '15', '16'],
    explanation: '7 + 8 = 15.',
  };

  // Record incorrect answer -> should add to mistakeQueue
  userProfile = await recordExerciseResult(testUid, failedResult, userProfile);
  assert(Boolean(userProfile.mistakeQueue && userProfile.mistakeQueue.length === 1), 'Incorrect exercise is added to mistakeQueue');
  assert(userProfile.mistakeQueue![0].id === 'test_mistake_math_1', 'Queued mistake retains correct exercise ID');
  assert(userProfile.mistakeQueue![0].userAnswer === '12', 'Queued mistake stores user incorrect answer for reflection');
  assert(userProfile.mistakeQueue![0].correctAnswer === '15', 'Queued mistake stores correct answer');

  // Duplicate mistake should update rather than duplicate
  userProfile = await recordExerciseResult(testUid, failedResult, userProfile);
  assert(userProfile.mistakeQueue!.length === 1, 'Duplicate mistake updates existing entry without inflating queue');

  // Successful resolution via resolveMistakeReview
  const prevStars = userProfile.totalStarsEarned;
  userProfile = await resolveMistakeReview(testUid, 'test_mistake_math_1', userProfile);
  assert(userProfile.mistakeQueue!.length === 0, 'Resolved mistake is removed from mistakeQueue');
  assert(userProfile.totalStarsEarned === prevStars + 5, 'Mastering a mistake awards +5 bonus stars');

  // --------------------------------------------------------------------------
  // TEST 6: Learning Settings & Accessibility Customizations
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Learning Settings & Accessibility Customizations ---');

  userProfile = await updateLearningSettings(
    testUid,
    {
      dyslexiaFont: true,
      curriculumLevel: 'advanced',
      audioEnabled: false,
      speechRate: 0.85,
    },
    userProfile
  );

  assert(userProfile.dyslexiaFont === true, 'Dyslexia-friendly font setting updated successfully');
  assert(userProfile.curriculumLevel === 'advanced', 'Curriculum level updated to advanced');
  assert(userProfile.audioEnabled === false, 'Audio mute setting updated successfully');
  assert(userProfile.speechRate === 0.85, 'Custom speech rate updated successfully');

  // --------------------------------------------------------------------------
  // TEST 7: Web Audio Synthesizer Engine Resiliency
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Web Audio Synthesizer Engine Resiliency ---');

  // Mute toggle
  learningAudio.setMuted(true);
  assert(learningAudio.getMuted() === true, 'Web Audio engine muted successfully');

  // Audio methods must execute safely without throwing in node / browser environments
  let audioThrew = false;
  try {
    learningAudio.playClick();
    learningAudio.playCorrect();
    learningAudio.playIncorrect();
    learningAudio.playStreak();
    learningAudio.playCelebration();
  } catch (e) {
    audioThrew = true;
  }
  assert(!audioThrew, 'Web Audio triggers execute gracefully without throwing in headless/server environments');

  // Unmute toggle
  learningAudio.setMuted(false);
  assert(learningAudio.getMuted() === false, 'Web Audio engine unmuted successfully');

  console.log(`\nLearning Hub Verification Results: ${passedLocal} Passed, ${failedLocal} Failed\n`);
  return { passed: passedLocal, failed: failedLocal };
}

// Standalone execution support
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').includes('learningHubComprehensiveVerification')) {
  runLearningHubComprehensiveVerification()
    .then((res) => {
      if (res.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
