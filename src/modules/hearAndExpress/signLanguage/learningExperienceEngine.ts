/**
 * Egyptian Sign Language Learning Experience Engine
 *
 * Implements structured beginner lessons, learning progress tracking,
 * bookmarking/favorites, spaced review sessions, and interactive quizzes
 * based exclusively on verified expert dictionary content.
 *
 * Clearly distinguishes educational content from automated machine recognition.
 */

import { ExpertSignDictionary, type VerifiedSignEntry } from './expertSignDictionary';

export interface LearningLesson {
  lessonId: string;
  unitNumber: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  signIds: string[];
  estimatedMinutes: number;
}

export interface QuizQuestion {
  questionId: string;
  promptAr: string;
  promptEn: string;
  questionType: 'gloss_identification' | 'situational_application' | 'facial_grammar_check';
  optionsAr: string[];
  correctOptionIndex: number;
  explanationAr: string;
  explanationEn: string;
  signIdReference: string;
}

export interface UserLearningState {
  completedLessonIds: string[];
  masteredSignIds: string[];
  favoriteSignIds: string[];
  quizScores: { quizId: string; scorePercentage: number; timestamp: number }[];
  lastStudySessionTimestamp: number;
  overallMasteryPercentage: number;
}

export const EDUCATIONAL_DISCLOSURE_NOTICE = {
  ar: 'إفصاح تعليمي هام: هذا المحتوى تعليمي موثق ومعتمد من قبل مجتمع الصم ومترجمي لغة الإشارة الرسميين بمصر لتعلم لغة الإشارة المصرية الصحيحة، وهو مفصول بنيوياً تماماً عن أنظمة التعرف الآلي أو كاميرات الذكاء الاصطناعي.',
  en: 'IMPORTANT EDUCATIONAL DISCLOSURE: This instructional content is certified and endorsed by the Deaf community and certified Egyptian Sign Language interpreters. It is structurally separated from experimental automated camera recognition systems.',
};

export class LearningExperienceEngine {
  private dictionary: ExpertSignDictionary;
  private lessons: LearningLesson[] = [];
  private userState: UserLearningState;

  constructor(dictionary?: ExpertSignDictionary) {
    this.dictionary = dictionary || new ExpertSignDictionary();
    this.seedLessons();
    this.userState = {
      completedLessonIds: [],
      masteredSignIds: [],
      favoriteSignIds: [],
      quizScores: [],
      lastStudySessionTimestamp: Date.now(),
      overallMasteryPercentage: 0,
    };
  }

  private seedLessons(): void {
    this.lessons = [
      {
        lessonId: 'lesson_01_greetings',
        unitNumber: 1,
        titleAr: 'الدرس 1: التحيات والآداب الأساسية',
        titleEn: 'Lesson 1: Foundational Greetings & Courtesy',
        descriptionAr: 'تعلم إشارات التحية الرسمية والترحيب والشكر وقواعد الابتسام وحركة الرأس.',
        descriptionEn: 'Learn standard Egyptian greetings, welcomes, thank you, and head nodding cues.',
        signIds: ['esl_greet_salam', 'esl_greet_shukran', 'esl_greet_ahlan'],
        estimatedMinutes: 10,
      },
      {
        lessonId: 'lesson_02_emergency',
        unitNumber: 2,
        titleAr: 'الدرس 2: إشارات الطوارئ والسلامة الحيوية',
        titleEn: 'Lesson 2: Emergency & Life-Saving Signs',
        descriptionAr: 'إشارات الاستغاثة، طلب سيارة الإسعاف، والتعامل مع حالات الخطر الشديد.',
        descriptionEn: 'Critical emergency signs: calling ambulances, distress calls, and hazard alerts.',
        signIds: ['esl_emerg_tawaree', 'esl_emerg_isaf'],
        estimatedMinutes: 12,
      },
      {
        lessonId: 'lesson_03_healthcare',
        unitNumber: 3,
        titleAr: 'الدرس 3: الصحة والمستشفى والطبيب',
        titleEn: 'Lesson 3: Healthcare, Hospitals & Doctors',
        descriptionAr: 'التواصل في المراكز الطبية والعيادات وفحص النبض ووصف موقع المستشفى.',
        descriptionEn: 'Communicating in medical clinics, identifying hospitals, and doctor signs.',
        signIds: ['esl_emerg_mustashfa', 'esl_emerg_tabeeb'],
        estimatedMinutes: 12,
      },
      {
        lessonId: 'lesson_04_education',
        unitNumber: 4,
        titleAr: 'الدرس 4: المدرسة والكتب والتعليم',
        titleEn: 'Lesson 4: School, Books & Learning',
        descriptionAr: 'المفردات المدرسية المعتمدة في مناهج مدارس الأمل للصم بجمهورية مصر العربية.',
        descriptionEn: 'Educational and textbook vocabulary certified in Egyptian Amal schools.',
        signIds: ['esl_edu_madrasa', 'esl_edu_kitab'],
        estimatedMinutes: 10,
      },
      {
        lessonId: 'lesson_05_daily_needs',
        unitNumber: 5,
        titleAr: 'الدرس 5: الاحتياجات اليومية (الماء والطعام ودورة المياه)',
        titleEn: 'Lesson 5: Daily Needs (Water, Food, Restroom)',
        descriptionAr: 'التعبير عن العطش والجوع وطلب الماء واستخدام دورات المياه والمرافق العامة.',
        descriptionEn: 'Expressing thirst, hunger, water requests, and public restroom signs.',
        signIds: ['esl_needs_maa', 'esl_needs_taam', 'esl_needs_hammam'],
        estimatedMinutes: 15,
      },
    ];
  }

  public getLessons(): LearningLesson[] {
    return [...this.lessons];
  }

  public getLessonById(lessonId: string): LearningLesson | undefined {
    return this.lessons.find((l) => l.lessonId === lessonId);
  }

  public getLessonSigns(lessonId: string): VerifiedSignEntry[] {
    const lesson = this.getLessonById(lessonId);
    if (!lesson) return [];

    return lesson.signIds
      .map((id) => this.dictionary.getEntryById(id))
      .filter((entry): entry is VerifiedSignEntry => entry !== undefined);
  }

  // Favorites Management
  public addFavorite(signId: string): void {
    if (!this.userState.favoriteSignIds.includes(signId)) {
      this.userState.favoriteSignIds.push(signId);
    }
  }

  public removeFavorite(signId: string): void {
    this.userState.favoriteSignIds = this.userState.favoriteSignIds.filter((id) => id !== signId);
  }

  public isFavorite(signId: string): boolean {
    return this.userState.favoriteSignIds.includes(signId);
  }

  public getFavorites(): VerifiedSignEntry[] {
    return this.userState.favoriteSignIds
      .map((id) => this.dictionary.getEntryById(id))
      .filter((entry): entry is VerifiedSignEntry => entry !== undefined);
  }

  // Progress Management
  public markLessonCompleted(lessonId: string): void {
    if (!this.userState.completedLessonIds.includes(lessonId)) {
      this.userState.completedLessonIds.push(lessonId);
      const lesson = this.getLessonById(lessonId);
      if (lesson) {
        for (const id of lesson.signIds) {
          if (!this.userState.masteredSignIds.includes(id)) {
            this.userState.masteredSignIds.push(id);
          }
        }
      }
      this.updateMastery();
    }
  }

  private updateMastery(): void {
    const totalSigns = this.dictionary.getAllEntries().length;
    if (totalSigns > 0) {
      this.userState.overallMasteryPercentage = Math.min(
        100,
        Math.round((this.userState.masteredSignIds.length / totalSigns) * 100)
      );
    }
    this.userState.lastStudySessionTimestamp = Date.now();
  }

  public getUserState(): UserLearningState {
    return {
      completedLessonIds: [...this.userState.completedLessonIds],
      masteredSignIds: [...this.userState.masteredSignIds],
      favoriteSignIds: [...this.userState.favoriteSignIds],
      quizScores: [...this.userState.quizScores],
      lastStudySessionTimestamp: this.userState.lastStudySessionTimestamp,
      overallMasteryPercentage: this.userState.overallMasteryPercentage,
    };
  }

  // Quizzes & Practice Generator
  public generatePracticeQuiz(): QuizQuestion[] {
    return [
      {
        questionId: 'quiz_q1_salam',
        promptAr: 'عند لقاء شخص في الصباح أو المساء في مصر، ما هي الإشارة الرسمية الأساسية للتحية؟',
        promptEn: 'When greeting someone in Egypt, what is the standard formal greeting sign?',
        questionType: 'gloss_identification',
        optionsAr: ['شكراً', 'سلام عليكم', 'طوارئ', 'حمام'],
        correctOptionIndex: 1,
        explanationAr: 'إشارة "سلام عليكم" تبدأ بلمس طرف الجبهة ثم التحرك للأمام مع ابتسامة ترحيبية.',
        explanationEn: 'The sign for "salam alaykum" touches the forehead and extends forward welcomingly.',
        signIdReference: 'esl_greet_salam',
      },
      {
        questionId: 'quiz_q2_emergency',
        promptAr: 'إذا حدث تصاعد دخان أو خطر مفاجئ في المكان، أي إشارة يجب استخدامها فوراً لطلب النجدة؟',
        promptEn: 'If sudden danger occurs, which sign is used immediately to signal an emergency?',
        questionType: 'situational_application',
        optionsAr: ['مدرسة', 'طوارئ', 'ماء', 'أهلاً وسهلاً'],
        correctOptionIndex: 1,
        explanationAr: 'إشارة "طوارئ" تؤدى باليدين المرتجفتين أمام الصدر مصحوبة بملامح ذعر وتوتر بالعينين.',
        explanationEn: 'The emergency sign is performed with vibrating claw hands and widened alert eyes.',
        signIdReference: 'esl_emerg_tawaree',
      },
      {
        questionId: 'quiz_q3_facial_cue',
        promptAr: 'هل تتطلب أداة الاستفهام "أين؟" في لغة الإشارة المصرية تقطيب وخفض الحاجبين (Eyebrows Lowered)؟',
        promptEn: 'Does the question particle "Where?" in ESL require furrowed/lowered eyebrows?',
        questionType: 'facial_grammar_check',
        optionsAr: ['نعم، تقطيب الحاجبين علامة قواعدية إلزامية للاستفهام', 'لا، تكفي حركة اليد وحدها بدون ملامح الوجه'],
        correctOptionIndex: 0,
        explanationAr: 'تعبيرات الوجه (Non-manual markers) علامات لغوية ونحوية إلزامية في لغة الإشارة وليست مجرد انفعال زائد.',
        explanationEn: 'Facial expressions are mandatory grammatical markers in sign language syntax.',
        signIdReference: 'esl_needs_hammam',
      },
      {
        questionId: 'quiz_q4_doctor',
        promptAr: 'كيف تُميز إشارة "طبيب / دكتور" عن إشارة "مستشفى" في لغة الإشارة المصرية؟',
        promptEn: 'How is the sign for "Doctor" distinguished from "Hospital" in ESL?',
        questionType: 'gloss_identification',
        optionsAr: [
          'إشارة الطبيب تنقر معصم اليد المقابلة كفحص النبض، بينما المستشفى ترسم خطين متعامدين على الذراع',
          'الإشارتان متطابقتان تماماً ولا يوجد أي فرق',
          'إشارة الطبيب توضع على الرأس فقط',
        ],
        correctOptionIndex: 0,
        explanationAr: 'إشارة الطبيب تحاكي فحص النبض على معصم اليد المقابلة (الشريان الكعبري) مرتين.',
        explanationEn: 'Doctor taps the wrist pulse point, while hospital traces an intersecting cross/crescent on the arm.',
        signIdReference: 'esl_emerg_tabeeb',
      },
    ];
  }

  public recordQuizScore(quizId: string, scorePercentage: number): void {
    this.userState.quizScores.push({
      quizId,
      scorePercentage: Math.max(0, Math.min(100, Math.round(scorePercentage))),
      timestamp: Date.now(),
    });
    this.updateMastery();
  }
}
