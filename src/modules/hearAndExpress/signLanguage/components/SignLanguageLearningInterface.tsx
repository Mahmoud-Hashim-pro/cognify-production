import React, { useState, useRef, useEffect } from 'react';
import { L } from '../../../../lib/translations';
import {
  BookOpen,
  Search,
  Heart,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Sparkles,
  Sliders,
  ShieldCheck,
  Award,
  Video,
  Layers,
  HelpCircle,
  Eye,
  Info,
  Clock,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { ExpertSignDictionary, type VerifiedSignEntry, type SignTopicCategory } from '../expertSignDictionary';
import {
  LearningExperienceEngine,
  EDUCATIONAL_DISCLOSURE_NOTICE,
  type LearningLesson,
  type QuizQuestion,
} from '../learningExperienceEngine';
import { AvatarMotionValidator } from '../avatarMotionValidator';

interface SignLanguageLearningInterfaceProps {
  isArabic?: boolean;
}

export const SignLanguageLearningInterface: React.FC<SignLanguageLearningInterfaceProps> = ({
  isArabic = true,
}) => {
  const dictionaryRef = useRef<ExpertSignDictionary | null>(null);
  const learningEngineRef = useRef<LearningExperienceEngine | null>(null);
  const avatarValidatorRef = useRef<AvatarMotionValidator | null>(null);

  if (!dictionaryRef.current) dictionaryRef.current = new ExpertSignDictionary();
  if (!learningEngineRef.current) learningEngineRef.current = new LearningExperienceEngine(dictionaryRef.current);
  if (!avatarValidatorRef.current) avatarValidatorRef.current = new AvatarMotionValidator(dictionaryRef.current);

  const dictionary = dictionaryRef.current;
  const learningEngine = learningEngineRef.current;
  const avatarValidator = avatarValidatorRef.current;

  // Tabs
  const [activeTab, setActiveTab] = useState<'dictionary' | 'lessons' | 'quizzes' | 'favorites'>('dictionary');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SignTopicCategory | undefined>(undefined);

  // Selected Sign for Modal / Video Demonstration
  const [selectedSign, setSelectedSign] = useState<VerifiedSignEntry | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);

  // User State
  const [userState, setUserState] = useState(() => learningEngine.getUserState());

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Update playback speed on video element
  useEffect(() => {
    if (videoElementRef.current) {
      videoElementRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, selectedSign]);

  const searchResults = dictionary.search(searchQuery, selectedCategory);
  const categoriesList = dictionary.getCategoriesCatalog();
  const lessons = learningEngine.getLessons();

  const handleToggleFavorite = (signId: string) => {
    if (learningEngine.isFavorite(signId)) {
      learningEngine.removeFavorite(signId);
    } else {
      learningEngine.addFavorite(signId);
    }
    setUserState(learningEngine.getUserState());
  };

  const handleStartLesson = (lesson: LearningLesson) => {
    const signs = learningEngine.getLessonSigns(lesson.lessonId);
    if (signs.length > 0) {
      setSelectedSign(signs[0]);
    }
  };

  const handleStartQuiz = () => {
    const questions = learningEngine.generatePracticeQuiz();
    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizCompleted(false);
    setActiveTab('quizzes');
  };

  const handleSelectQuizOption = (optionIndex: number) => {
    if (selectedOption !== null) return; // Already answered
    setSelectedOption(optionIndex);

    const q = quizQuestions[currentQuestionIndex];
    if (optionIndex === q.correctOptionIndex) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (currentQuestionIndex + 1 < quizQuestions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      // Quiz finished
      setQuizCompleted(true);
      const finalPercentage = (quizScore / quizQuestions.length) * 100;
      learningEngine.recordQuizScore('general_practice_quiz', finalPercentage);
      setUserState(learningEngine.getUserState());
    }
  };

  return (
    <div
      className="flex flex-col w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* 1. Header with Learning Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">
              {isArabic ? 'منصة تعلم لغة الإشارة المصرية المعتمدة' : L('Egyptian Sign Language Learning Hub')}
            </h1>
            <p className="text-sm text-slate-400">
              {isArabic
                ? 'قاموس معتمد ودروس تأسيسية موثقة من مجتمع الصم'
                : L('Certified Deaf community dictionary and foundational lessons')}
            </p>
          </div>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs">
          <div className="flex flex-col items-center px-2">
            <span className="text-slate-400">{isArabic ? 'الإتقان' : L('Mastery')}</span>
            <span className="text-base font-bold text-emerald-400">{userState.overallMasteryPercentage}%</span>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex flex-col items-center px-2">
            <span className="text-slate-400">{isArabic ? 'المفضلة' : L('Favorites')}</span>
            <span className="text-base font-bold text-indigo-300">{userState.favoriteSignIds.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Educational Disclosure Notice */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-400" />
        <span className="leading-relaxed">
          {isArabic ? EDUCATIONAL_DISCLOSURE_NOTICE.ar : EDUCATIONAL_DISCLOSURE_NOTICE.en}
        </span>
      </div>

      {/* 3. Accessible Tab Navigation */}
      <div
        role="tablist"
        aria-label={isArabic ? 'أقسام المنصة التعليمية' : L('Learning Hub Sections')}
        className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto text-xs"
      >
        {[
          { key: 'dictionary', labelAr: 'القاموس المعتمد', labelEn: 'Verified Dictionary' },
          { key: 'lessons', labelAr: 'الدروس والمسارات', labelEn: 'Lessons' },
          { key: 'quizzes', labelAr: 'تمارين واختبارات', labelEn: 'Practice Quizzes' },
          { key: 'favorites', labelAr: `المفضلة (${userState.favoriteSignIds.length})`, labelEn: 'Favorites' },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-indigo-500 ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isArabic ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* 4. Tab Content Panels */}
      {/* TAB A: Searchable Sign Dictionary */}
      {activeTab === 'dictionary' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Search Bar & Category Filters */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="relative">
              <Search className="absolute start-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isArabic ? 'ابحث في القاموس الإشاري المعتمد (مثال: سلام، مستشفى، ماء)...' : L('Search verified dictionary...')}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl py-3 ps-12 pe-4 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory(undefined)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  selectedCategory === undefined
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isArabic ? 'جميع الإشارات' : L('All Signs')}
              </button>
              {categoriesList.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                    selectedCategory === cat.category
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.labelAr} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          {/* Signs Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedSign(entry)}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-black text-white">{entry.arabicPhrase}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(entry.id);
                      }}
                      aria-label={isArabic ? 'إضافة إلى المفضلة' : L('Toggle Favorite')}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          learningEngine.isFavorite(entry.id)
                            ? 'fill-red-500 text-red-500'
                            : ''
                        }`}
                      />
                    </button>
                  </div>
                  <span className="text-xs text-indigo-400 font-semibold block mb-2">
                    {entry.categoryLabelAr}
                  </span>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {entry.contextAndUsageAr}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isArabic ? 'موثق رسمياً' : L('Verified')}
                  </span>
                  <span className="text-indigo-300 hover:underline flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    {isArabic ? 'عرض الإشارة' : L('View Demonstration')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB B: Beginner Lessons */}
      {activeTab === 'lessons' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lessons.map((lesson) => {
              const isCompleted = userState.completedLessonIds.includes(lesson.lessonId);
              return (
                <div
                  key={lesson.lessonId}
                  className={`p-6 rounded-3xl border transition-all ${
                    isCompleted
                      ? 'bg-slate-900 border-emerald-500/40'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300">
                      الوحدة {lesson.unitNumber}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {lesson.estimatedMinutes} دقائق
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{lesson.titleAr}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {lesson.descriptionAr}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className="text-xs text-slate-400">
                      {lesson.signIds.length} إشارات معتمدة
                    </span>
                    <button
                      onClick={() => handleStartLesson(lesson)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md"
                    >
                      {isArabic ? 'بدء الدرس' : L('Start Lesson')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB C: Practice Quizzes */}
      {activeTab === 'quizzes' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 animate-fadeIn">
          {quizQuestions.length === 0 || quizCompleted ? (
            <div className="flex flex-col items-center text-center py-8 space-y-4 max-w-md mx-auto">
              <div className="p-4 rounded-full bg-indigo-500/20 text-indigo-400">
                <Award className="w-12 h-12" />
              </div>
              <h2 className="text-xl font-black text-white">
                {quizCompleted
                  ? isArabic
                    ? 'اكتمل الاختبار بنجاح!'
                    : L('Quiz Completed!')
                  : isArabic
                  ? 'اختبارات التدريب والتأكيد المعجمي'
                  : L('Verified Practice Quizzes')}
              </h2>
              {quizCompleted && (
                <div className="text-base text-slate-300">
                  {isArabic ? 'درجتك النهائية:' : L('Your final score:')}{' '}
                  <strong className="text-emerald-400 text-xl">
                    {quizScore} من {quizQuestions.length} ({Math.round((quizScore / quizQuestions.length) * 100)}%)
                  </strong>
                </div>
              )}
              <p className="text-xs text-slate-400 leading-relaxed">
                {isArabic
                  ? 'أسئلة تفاعلية مبنية حصرياً على الإشارات المعتمدة وملاحظات تعبيرات الوجه النحوية.'
                  : L('Interactive questions derived strictly from verified signs and grammatical facial cues.')}
              </p>
              <button
                onClick={handleStartQuiz}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg transition-all"
              >
                {quizCompleted
                  ? isArabic
                    ? 'إعادة الاختبار'
                    : L('Retake Quiz')
                  : isArabic
                  ? 'بدء اختبار جديد'
                  : L('Start Practice Quiz')}
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-xl mx-auto">
              {/* Question Header */}
              <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800">
                <span>
                  السؤال {currentQuestionIndex + 1} من {quizQuestions.length}
                </span>
                <span>النتيجة الحالية: {quizScore}</span>
              </div>

              {/* Question Prompt */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white leading-relaxed">
                  {quizQuestions[currentQuestionIndex].promptAr}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {quizQuestions[currentQuestionIndex].optionsAr.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === quizQuestions[currentQuestionIndex].correctOptionIndex;
                  let optionBg = 'bg-slate-800/60 border-slate-700 hover:bg-slate-800';

                  if (selectedOption !== null) {
                    if (isCorrect) optionBg = 'bg-emerald-500/20 border-emerald-500 text-emerald-100';
                    else if (isSelected) optionBg = 'bg-red-500/20 border-red-500 text-red-100';
                  }

                  return (
                    <button
                      key={idx}
                      disabled={selectedOption !== null}
                      onClick={() => handleSelectQuizOption(idx)}
                      className={`w-full p-4 rounded-2xl border text-start text-sm font-semibold transition-all flex items-center justify-between ${optionBg}`}
                    >
                      <span>{option}</span>
                      {selectedOption !== null && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next */}
              {selectedOption !== null && (
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 animate-fadeIn">
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <strong>{isArabic ? 'التفسير اللغوي:' : L('Explanation:')}</strong>{' '}
                    {quizQuestions[currentQuestionIndex].explanationAr}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleNextQuizQuestion}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                    >
                      {currentQuestionIndex + 1 < quizQuestions.length
                        ? isArabic
                          ? 'السؤال التالي'
                          : L('Next Question')
                        : isArabic
                        ? 'إنهاء الاختبار'
                        : L('Finish Quiz')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB D: Favorites */}
      {activeTab === 'favorites' && (
        <div className="space-y-4 animate-fadeIn">
          {learningEngine.getFavorites().length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-3xl border border-slate-800">
              {isArabic
                ? 'لم تقم بحفظ أي إشارات في المفضلة بعد. انقر على رمز القلب لحفظ الإشارات التي تود مراجعتها.'
                : L('No favorites saved yet. Click the heart icon on any sign to save it for review.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {learningEngine.getFavorites().map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedSign(entry)}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition-all cursor-pointer shadow-lg flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white">{entry.arabicPhrase}</h3>
                      <span className="text-xs text-indigo-400 font-semibold">{entry.categoryLabelAr}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(entry.id);
                      }}
                      className="p-1 text-red-500 hover:scale-110 transition-transform"
                    >
                      <Heart className="w-5 h-5 fill-red-500" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">{entry.contextAndUsageAr}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Detailed Sign Demonstration & Avatar Modal */}
      {selectedSign && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div className="flex flex-col w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
              <div>
                <h2 id="sign-modal-title" className="text-xl font-black text-white">
                  {selectedSign.arabicPhrase}
                </h2>
                <span className="text-xs text-indigo-400 font-semibold">
                  {selectedSign.categoryLabelAr} • {selectedSign.verifiedSignLabel}
                </span>
              </div>
              <button
                onClick={() => setSelectedSign(null)}
                aria-label={isArabic ? 'إغلاق' : L('Close')}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Media Demonstration Container */}
              <div className="relative aspect-video w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
                <video
                  ref={videoElementRef}
                  src={selectedSign.videoDemonstrationUrl}
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Demonstration Mode Badge */}
                <div className="absolute top-3 start-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-xs font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'عرض فيديو حقيقي معتمد' : L('Verified Video Demonstration')}</span>
                </div>

                {/* Captions Overlay */}
                {showCaptions && (
                  <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl bg-black/80 backdrop-blur-sm text-center text-xs text-white border border-white/10">
                    <strong className="text-indigo-300">{selectedSign.arabicPhrase}</strong>: {selectedSign.contextAndUsageAr}
                  </div>
                )}
              </div>

              {/* Accessible Controls: Speed, Pause, Replay, Captions */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/80 text-xs">
                {/* Playback Speed Controls */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">{isArabic ? 'السرعة:' : L('Speed:')}</span>
                  {[0.5, 0.75, 1.0, 1.25].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        playbackSpeed === speed
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Caption Toggle */}
                <button
                  onClick={() => setShowCaptions(!showCaptions)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all border ${
                    showCaptions
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isArabic ? 'الترجمة النصية (CC)' : L('Captions (CC)')}
                </button>
              </div>

              {/* Phonological Details (Handshape, Movement, Non-manual cues) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700">
                  <strong className="text-indigo-300 block mb-1">
                    {isArabic ? 'شكل اليد والموقع:' : L('Handshape & Location:')}
                  </strong>
                  <span className="text-slate-200">
                    {selectedSign.handshapeDescriptionAr} • {selectedSign.locationDescriptionAr}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700">
                  <strong className="text-indigo-300 block mb-1">
                    {isArabic ? 'تعبيرات الوجه المصاحبة:' : L('Non-Manual Facial Cues:')}
                  </strong>
                  <span className="text-slate-200">{selectedSign.nonManualCuesAr}</span>
                </div>
              </div>

              {/* Regional Variation if documented */}
              {selectedSign.regionalVariationNotesAr && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                  <strong className="text-amber-300 block mb-1">
                    {isArabic ? 'الفروق الإقليمية واللهجات:' : L('Regional Variations:')}
                  </strong>
                  <span>{selectedSign.regionalVariationNotesAr}</span>
                </div>
              )}

              {/* Screen Reader Detailed Description Announcement */}
              <div
                aria-live="polite"
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400"
              >
                <strong className="text-slate-300 block mb-1">
                  {isArabic ? 'الوصف لقارئ الشاشة:' : L('Screen Reader Accessible Description:')}
                </strong>
                <span>{selectedSign.screenReaderDescriptionAr}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
              <span>{selectedSign.sourceAttribution}</span>
              <button
                onClick={() => setSelectedSign(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
              >
                {isArabic ? 'إغلاق' : L('Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
