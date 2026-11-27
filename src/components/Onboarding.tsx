import React, { useState, useEffect } from "react";
import { 
  UserProfile, 
  UserRole, 
  EducationLevel, 
  AccessibilityPassport,
  LanguagePreference 
} from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  CheckCircle,
  Eye,
  Ear,
  MessageSquare,
  Volume2,
  Sliders,
  Type,
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Layers,
  LogOut,
  HelpCircle,
  Info,
  Check
} from "lucide-react";
import { auth, logout } from "../lib/firebase";
import { getTranslation, isRTL, localize, isArabicLocale, frOf } from "../lib/translations";
import { speak } from "../lib/tts";
import { PRODUCT_SECTIONS, getSectionIconComponent } from "../lib/sections";
import { ThemeSelector, ThemeMode } from "./ui/ThemeSelector";

interface OnboardingProps {
  onComplete: (data: Partial<UserProfile>) => void | Promise<void>;
  user?: any;
}

export default function Onboarding({ onComplete, user }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preference states
  const [language, setLanguage] = useState<LanguagePreference>('Arabic');
  const [dialect, setDialect] = useState<'ar-EG' | 'ar-MSA' | 'en-US'>('ar-EG');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [highContrast, setHighContrast] = useState(false);
  const [fontSizeScale, setFontSizeScale] = useState<'normal' | 'medium' | 'large' | 'extra-large'>('medium');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [descriptionDetail, setDescriptionDetail] = useState<'concise' | 'balanced' | 'detailed'>('balanced');
  const [readingPronounceTashkeel, setReadingPronounceTashkeel] = useState(false);
  
  // Optional profile info (strictly non-mandatory)
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    level: 'Intermediate',
    role: 'Student',
    educationLevel: 'University',
  });
  const [userRole, setUserRole] = useState<UserRole>('Student');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('University');
  const [optionalAssistiveMode, setOptionalAssistiveMode] = useState<'Visual' | 'Vocal-Deaf' | 'Speech' | 'None'>('None');

  const isRtl = isArabicLocale(language);
  const t = (en: string, ar: string) => (isRtl ? ar : language === 'French' ? frOf(en) : en);

  // Apply real-time visual changes so the user sees the preview immediately
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-scale-normal', 'font-scale-medium', 'font-scale-large', 'font-scale-extra-large');
    root.classList.add(`font-scale-${fontSizeScale}`);
    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('reduce-motion', reduceMotion);
  }, [fontSizeScale, highContrast, reduceMotion]);

  const handleNextStep = () => {
    setStep((prev) => Math.min(5, prev + 1));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const finishOnboarding = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Save local caches
      try {
        localStorage.setItem('rafiqi_font_scale', fontSizeScale);
        localStorage.setItem('rafiqi_high_contrast', String(highContrast));
        localStorage.setItem('rafiqi_reduce_motion', String(reduceMotion));
        localStorage.setItem('rafiqi_tts_rate', String(speechRate));
        localStorage.setItem('rafiqi_dialect', dialect);
        localStorage.setItem('rafiqi_desc_depth', descriptionDetail);
      } catch {}

      const passport: AccessibilityPassport = {
        primaryMode: optionalAssistiveMode === 'None' ? 'None' : optionalAssistiveMode,
        highContrast,
        dyslexiaFont: false,
        fontSizeScale,
        reduceMotion,
        hapticFeedback: true,
        autoSpeak,
        audioSpeed: speechRate,
        allowCameraTriggers: true,
        visualSupport: {
          highContrast,
          autoSpeechReadout: autoSpeak,
          hapticAssistance: true,
        },
        hearingSupport: {
          visualAcousticRadar: optionalAssistiveMode === 'Vocal-Deaf',
          reverseSignToSpeech: optionalAssistiveMode === 'Vocal-Deaf',
          flashingAlerts: optionalAssistiveMode === 'Vocal-Deaf',
        },
        neurodiversitySupport: {
          dyslexiaFont: false,
          readingRuler: false,
          sensoryRegulation: true,
        },
      };

      const finalProfileData: Partial<UserProfile> = {
        email: user?.email || auth.currentUser?.email || "",
        name: user?.displayName || user?.email?.split('@')[0] || "User",
        language,
        role: userRole,
        educationLevel,
        accountPath: optionalAssistiveMode === 'None' ? 'Normal' : 'Special Needs',
        accessibilityMode: optionalAssistiveMode,
        disabilityType: optionalAssistiveMode === 'None' ? '' : (
          optionalAssistiveMode === 'Visual' ? 'Visual Impairment' :
          optionalAssistiveMode === 'Vocal-Deaf' ? 'Hearing Impairment' : 'Speech & Communication'
        ),
        accessibilityPassport: passport,
        voiceFirstMode: optionalAssistiveMode === 'Visual',
        level: formData.level || 'Intermediate',
        points: 150,
        onboardingComplete: true,
      };

      await onComplete(finalProfileData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 1: Language & Dialect Preferences ──────────────────────────────────
  const renderLanguageStep = () => (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-6 w-full max-w-lg"
    >
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/15 text-[#1769AA] dark:text-[#4B9FE1] flex items-center justify-center mx-auto mb-2">
          <Globe className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('Language & Dialect', 'اللغة واللهجة المفضّلة')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
          {t('Choose how Rafiqi reads, speaks, and interacts with you.', 'اختر لغة وتفضيل التفاعل الصوتي والقراءة في رفيقي.')}
        </p>
      </div>

      {/* Language Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { id: 'Arabic', label: 'العربية (Arabic)', badge: 'موصى به' },
          { id: 'English', label: 'English', badge: 'Full Support' },
          { id: 'French', label: 'Français', badge: 'Support complet' },
        ].map((langOpt) => (
          <button
            key={langOpt.id}
            type="button"
            onClick={() => setLanguage(langOpt.id as LanguagePreference)}
            className={`min-h-[48px] p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
              language === langOpt.id
                ? 'border-[#1769AA] bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1] font-bold shadow-xs'
                : 'border-slate-200 dark:border-[#22354E] bg-white dark:bg-[#131E2E] text-slate-700 dark:text-slate-300 hover:border-[#1769AA]/40'
            }`}
          >
            <span className="text-sm font-bold">{langOpt.label}</span>
            {language === langOpt.id && <Check className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1]" />}
          </button>
        ))}
      </div>

      {/* Dialect Selection (for Arabic) */}
      {isRtl && (
        <div className="space-y-2 text-start">
          <label className="text-xs font-bold text-slate-700 dark:text-[#F8FAFC]">
            {t('Arabic Dialect / Variety', 'التنوع اللغوي المفضل')}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDialect('ar-EG')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col gap-1 ${
                dialect === 'ar-EG'
                  ? 'border-[#1769AA] bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1]'
                  : 'border-slate-200 dark:border-[#22354E] bg-white dark:bg-[#131E2E] text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>اللهجة المصرية (Egyptian Arabic)</span>
              <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8]">شروحات وأوصاف مبسطة ودارجة</span>
            </button>
            <button
              type="button"
              onClick={() => setDialect('ar-MSA')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col gap-1 ${
                dialect === 'ar-MSA'
                  ? 'border-[#1769AA] bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1]'
                  : 'border-slate-200 dark:border-[#22354E] bg-white dark:bg-[#131E2E] text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>الفصحى المعاصرة (Modern Standard)</span>
              <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8]">لغة رسمية وأكاديمية دقيقة</span>
            </button>
          </div>
        </div>
      )}

      {/* Speech Voice & Audio Preview */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] text-start space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1]" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {t('Speech & Voice Preview', 'الصوت والنطق الصوتي')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const testPhrase = isRtl
                ? (dialect === 'ar-EG' ? 'أهلاً بك في رفيقي. كل ميزات الإتاحة جاهزة لمساعدتك.' : 'أهلاً بك في رفيقي. جميع ميزات الإتاحة والتيسير جاهزة لدعمك.')
                : 'Welcome to Rafiqi. Your accessibility companion is ready.';
              speak(testPhrase, language as any);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#1769AA] text-white text-xs font-bold hover:bg-[#0D4778] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{t('Test Voice', 'تجربة الصوت')}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">
          {t(
            'Rafiqi vocalizes visual scenes, reads books, and announces actions in your preferred dialect.',
            'يقوم رفيقي بنطق أوصاف المشاهد وقراءة الكتب والمستندات وإعلان التنبيهات بلهجتك وصوتك المفضل.'
          )}
        </p>
      </div>

      {/* Navigation Buttons */}
      <button
        type="button"
        onClick={handleNextStep}
        className="w-full min-h-[48px] bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-[#1769AA]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>{t('Continue to Display Settings', 'المتابعة لإعدادات العرض')}</span>
        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
      </button>
    </motion.div>
  );

  // ── Step 2: Display & Appearance Preferences ─────────────────────────────────
  const renderDisplayStep = () => (
    <motion.div
      key="step-2"
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-6 w-full max-w-lg"
    >
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/15 text-[#1769AA] dark:text-[#4B9FE1] flex items-center justify-center mx-auto mb-2">
          <Sun className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('Display & Appearance', 'المظهر وسهولة القراءة')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
          {t('Adjust theme, text size, and contrast for visual comfort.', 'اضبط المظهر، وحجم الخط، والتباين لراحة عينيك.')}
        </p>
      </div>

      {/* Theme Preference */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] text-start space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 dark:text-white">
            {t('Theme Mode', 'مظهر الواجهة (نهاري / ليلي)')}
          </label>
        </div>
        <ThemeSelector
          currentTheme={themeMode}
          onChange={(mode) => setThemeMode(mode)}
          language={isRtl ? 'Arabic' : 'English'}
          variant="segmented"
          className="w-full"
        />
      </div>

      {/* High Contrast Mode Toggle */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] text-start flex items-center justify-between shadow-xs">
        <div className="space-y-1 pe-4">
          <span className="text-xs font-bold text-slate-900 dark:text-white block">
            {t('High Contrast Mode (WCAG AAA)', 'وضع التباين العالي الفائق')}
          </span>
          <span className="text-xs text-slate-500 dark:text-[#94A3B8] block leading-relaxed">
            {t('Enhances text borders and outlines for maximum readability.', 'يبرز حواف النصوص والعناصر لضمان أقصى وضوح بصري.')}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={highContrast}
          onClick={() => setHighContrast(!highContrast)}
          className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
            highContrast ? 'bg-[#1769AA]' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
            highContrast ? (isRtl ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Font Size Scaling */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] text-start space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Type className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1]" />
            <span>{t('Text Size Scale', 'حجم الخط في المنصة')}</span>
          </label>
          <span className="text-xs font-bold text-[#1769AA] dark:text-[#4B9FE1] capitalize">
            {fontSizeScale}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(['normal', 'medium', 'large', 'extra-large'] as const).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setFontSizeScale(scale)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                fontSizeScale === scale
                  ? 'border-[#1769AA] bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1]'
                  : 'border-slate-300 dark:border-[#31486B] bg-slate-50 dark:bg-[#0B1523] text-slate-700 dark:text-slate-200'
              }`}
            >
              {scale === 'normal' ? t('Normal', 'عادي') :
               scale === 'medium' ? t('Medium', 'متوسط') :
               scale === 'large' ? t('Large', 'كبير') : t('Extra', 'فائق')}
            </button>
          ))}
        </div>
      </div>

      {/* Reduce Motion */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] text-start flex items-center justify-between shadow-xs">
        <div className="space-y-1 pe-4">
          <span className="text-xs font-bold text-slate-900 dark:text-white block">
            {t('Reduce Motion & Animations', 'تقليل الحركة والانتقالات')}
          </span>
          <span className="text-xs text-slate-500 dark:text-[#94A3B8] block leading-relaxed">
            {t('Simplifies page transitions for vestibular and sensory comfort.', 'يلغي المؤثرات الحركية السريعة لراحة الحواس.')}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={reduceMotion}
          onClick={() => setReduceMotion(!reduceMotion)}
          className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
            reduceMotion ? 'bg-[#1769AA]' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
            reduceMotion ? (isRtl ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrevStep}
          className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-[#22354E] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A283D] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('Back', 'السابق')}</span>
        </button>

        <button
          type="button"
          onClick={handleNextStep}
          className="flex-1 min-h-[48px] bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-[#1769AA]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{t('Continue to Audio Preferences', 'المتابعة لتفضيلات الصوت')}</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </motion.div>
  );

  // ── Step 3: Audio & Communication Preferences ────────────────────────────────
  const renderAudioStep = () => (
    <motion.div
      key="step-3"
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-6 w-full max-w-lg"
    >
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/15 text-[#1769AA] dark:text-[#4B9FE1] flex items-center justify-center mx-auto mb-2">
          <Volume2 className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('Audio & Speech', 'الصوت وسرعة النطق')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
          {t('Fine-tune speech rate and explanation depth.', 'تخصيص سرعة القراءة وعمق الشرح المسموع.')}
        </p>
      </div>

      {/* Speech Rate Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] text-start space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 dark:text-white">
            {t('Speech Rate', 'سرعة النطق الصوتي')}
          </label>
          <span className="text-xs font-bold text-[#1769AA] dark:text-[#4B9FE1]">
            {speechRate}x
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setSpeechRate(rate)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                speechRate === rate
                  ? 'border-[#1769AA] bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1]'
                  : 'border-slate-300 dark:border-[#31486B] bg-slate-50 dark:bg-[#0B1523] text-slate-700 dark:text-slate-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Description Depth Preference */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] text-start space-y-3 shadow-xs">
        <label className="text-xs font-bold text-slate-900 dark:text-white block">
          {t('Description Detail Level', 'مستوى تفصيل الأوصاف والشروحات')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'concise', labelEn: 'Concise', labelAr: 'مختصر ومباشر' },
            { id: 'balanced', labelEn: 'Balanced', labelAr: 'شرح متوازن' },
            { id: 'detailed', labelEn: 'Detailed', labelAr: 'شامل وتفصيلي' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDescriptionDetail(item.id as any)}
              className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                descriptionDetail === item.id
                  ? 'border-[#1769AA] bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1]'
                  : 'border-slate-300 dark:border-[#31486B] bg-slate-50 dark:bg-[#0B1523] text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>{t(item.labelEn, item.labelAr)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Auto Speech Readout Toggle */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] text-start flex items-center justify-between shadow-xs">
        <div className="space-y-1 pe-4">
          <span className="text-xs font-bold text-slate-900 dark:text-white block">
            {t('Auto-Read Screen Descriptions', 'القراءة الصوتية التلقائية للمشاهد')}
          </span>
          <span className="text-xs text-slate-500 dark:text-[#94A3B8] block leading-relaxed">
            {t('Automatically vocalizes visual summaries upon capture.', 'ينطق ملخص الكاميرا والمستندات تلقائياً عند الالتقاط.')}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoSpeak}
          onClick={() => setAutoSpeak(!autoSpeak)}
          className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
            autoSpeak ? 'bg-[#1769AA]' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
            autoSpeak ? (isRtl ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrevStep}
          className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-[#22354E] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A283D] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('Back', 'السابق')}</span>
        </button>

        <button
          type="button"
          onClick={handleNextStep}
          className="flex-1 min-h-[48px] bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-[#1769AA]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{t('Continue to Assistive Mode (Optional)', 'المتابعة لنمط المساعدة (اختياري)')}</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </motion.div>
  );

  // ── Step 4: Optional Assistive Mode (Non-mandatory!) ──────────────────────────
  const renderAssistiveModeStep = () => (
    <motion.div
      key="step-4"
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-6 w-full max-w-lg"
    >
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/15 text-[#1769AA] dark:text-[#4B9FE1] flex items-center justify-center mx-auto mb-2">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('Optional Assistive Profile', 'نمط التيسير المقترح (اختياري تماماً)')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
          {t('Select an assistive focus or proceed with general access. No medical proof required.', 'اختر محور المساعدة الأنسب لك أو تابع بالنمط الشامل. لا يلزم أي إثبات طبي.')}
        </p>
      </div>

      {/* Non-Disclosing Privacy Notice */}
      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-start flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 block">
            {t('Universal Access & Privacy Guarantee', 'ضمان الخصوصية والإتاحة الشاملة')}
          </span>
          <span className="text-xs text-emerald-900/80 dark:text-emerald-200/80 block leading-relaxed">
            {t(
              'You are never required to disclose a disability. All features are always available and can be customized at any time in Settings.',
              'لست ملزماً بالإفصاح عن أي حالة صحية. جميع أقسام رفيقي الستة متاحة بالكامل وتستطيع تغيير اختياراتك متى شئت.'
            )}
          </span>
        </div>
      </div>

      {/* Profile Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[
          { 
            id: 'Visual', 
            labelEn: 'Visual Companion', 
            labelAr: 'المساعد البصري', 
            descEn: 'Camera guidance, object recall, and document reading', 
            descAr: 'إرشاد الكاميرا، استرجاع الأغراض، وقراءة الكتب', 
            icon: Eye 
          },
          { 
            id: 'Vocal-Deaf', 
            labelEn: 'Captions & Sign', 
            labelAr: 'التفريغ ولغة الإشارة', 
            descEn: 'Real-time captions and verified sign dictionary', 
            descAr: 'تفريغ فوري للكلام وقاموس إشارة معتمد', 
            icon: Ear 
          },
          { 
            id: 'Speech', 
            labelEn: 'Speech & AAC', 
            labelAr: 'التواصل والـ AAC', 
            descEn: 'AAC communication boards and symbol-to-speech', 
            descAr: 'لوحات التواصل الرمزية وتحويل النص لكلام', 
            icon: MessageSquare 
          },
          { 
            id: 'None', 
            labelEn: 'Comprehensive / All', 
            labelAr: 'الوصول الشامل للجميع', 
            descEn: 'Full access to all six product sections', 
            descAr: 'تفعيل متوازن لكافة أقسام المنصة الستة', 
            icon: Sparkles 
          },
        ].map((profileOpt) => {
          const isSelected = optionalAssistiveMode === profileOpt.id;
          const Icon = profileOpt.icon;
          return (
            <button
              key={profileOpt.id}
              type="button"
              onClick={() => setOptionalAssistiveMode(profileOpt.id as any)}
              className={`p-3.5 rounded-2xl border-2 text-start transition-all cursor-pointer flex flex-col gap-1.5 ${
                isSelected
                  ? 'border-[#1769AA] bg-[#1769AA]/10 text-slate-900 dark:text-white ring-2 ring-[#1769AA]/20 shadow-xs'
                  : 'border-slate-200 dark:border-[#22354E] bg-white dark:bg-[#131E2E] text-slate-700 dark:text-slate-300 hover:border-[#1769AA]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-[#1769AA] text-white' : 'bg-slate-100 dark:bg-[#0B1523] text-[#1769AA] dark:text-[#4B9FE1]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs">{t(profileOpt.labelEn, profileOpt.labelAr)}</span>
                </div>
                {isSelected && <CheckCircle className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1]" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-tight ps-9">
                {t(profileOpt.descEn, profileOpt.descAr)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrevStep}
          className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-[#22354E] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A283D] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('Back', 'السابق')}</span>
        </button>

        <button
          type="button"
          onClick={handleNextStep}
          className="flex-1 min-h-[48px] bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-[#1769AA]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{t('Review & Finish', 'مراجعة التفضيلات والبدء')}</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </motion.div>
  );

  // ── Step 5: Review & Ready Step ──────────────────────────────────────────────
  const renderReadyStep = () => (
    <motion.div
      key="step-5"
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 w-full max-w-lg bg-white dark:bg-[#131E2E] p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-[#22354E] text-center"
    >
      <div className="w-16 h-16 bg-[#1769AA]/15 text-[#1769AA] dark:text-[#4B9FE1] rounded-2xl flex items-center justify-center mx-auto border border-[#1769AA]/30">
        <CheckCircle className="w-9 h-9" />
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('Your Space is Ready', 'مساحتك في رفيقي جاهزة')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
          {t('Your personal preferences have been saved and applied.', 'تم حفظ تفضيلاتك وتطبيقها على تجربة التصفح بنجاح.')}
        </p>
      </div>

      {/* Summary Review Card */}
      <div className="w-full bg-slate-50 dark:bg-[#0B1523] p-4 rounded-2xl border border-slate-200 dark:border-[#22354E] text-start space-y-2.5 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#22354E]/60">
          <span className="text-slate-500 dark:text-[#94A3B8]">{t('Language', 'اللغة')}</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {language === 'Arabic' ? t('Arabic', 'العربية') : t('English', 'الإنجليزية')}
            {dialect ? ` (${dialect === 'ar-EG' ? t('Egyptian', 'مصري') : dialect})` : ''}
          </span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#22354E]/60">
          <span className="text-slate-500 dark:text-[#94A3B8]">{t('Appearance', 'المظهر والتباين')}</span>
          <span className="font-bold text-slate-900 dark:text-white capitalize">
            {themeMode === 'dark' ? t('Dark', 'داكن') : themeMode === 'light' ? t('Light', 'فاتح') : t('System', 'تلقائي')} · {highContrast ? t('High Contrast', 'تباين عالي') : t('Standard', 'قياسي')}
          </span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#22354E]/60">
          <span className="text-slate-500 dark:text-[#94A3B8]">{t('Text Scale', 'حجم الخط')}</span>
          <span className="font-bold text-slate-900 dark:text-white capitalize">
            {fontSizeScale === 'normal' ? t('Normal', 'عادي')
              : fontSizeScale === 'medium' ? t('Medium', 'متوسط')
              : fontSizeScale === 'large' ? t('Large', 'كبير')
              : t('Extra Large', 'كبير جداً')}
          </span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#22354E]/60">
          <span className="text-slate-500 dark:text-[#94A3B8]">{t('Speech Speed', 'سرعة النطق')}</span>
          <span className="font-bold text-slate-900 dark:text-white">{speechRate}x</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-[#94A3B8]">{t('Assistive Focus', 'محور المساعدة')}</span>
          <span className="font-bold text-[#1769AA] dark:text-[#4B9FE1]">
            {!optionalAssistiveMode || optionalAssistiveMode === 'None'
              ? t('General access', 'الوصول الشامل')
              : optionalAssistiveMode === 'Visual' ? t('Visual', 'إعاقة بصرية')
              : optionalAssistiveMode === 'Vocal-Deaf' ? t('Hearing', 'إعاقة سمعية')
              : optionalAssistiveMode === 'Speech' ? t('Speech', 'صعوبات النطق')
              : optionalAssistiveMode}
          </span>
        </div>
      </div>

      {/* Note about editing in Section 6 */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-start flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-200">
        <Info className="w-4 h-4 shrink-0 text-[#1769AA] dark:text-[#4B9FE1]" />
        <span>{t('You can change any of these settings anytime from Section 6 (Personalize).', 'يمكنك تغيير أي من هذه الإعدادات لاحقاً في أي وقت من قسم التخصيص.')}</span>
      </div>

      {/* Finish & Start Button */}
      <div className="w-full flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handlePrevStep}
          className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-[#22354E] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A283D] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('Back', 'السابق')}</span>
        </button>

        <button
          type="button"
          onClick={finishOnboarding}
          disabled={isSubmitting}
          className="flex-1 min-h-[48px] bg-[#1769AA] hover:bg-[#0D4778] active:bg-[#09355B] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-[#1769AA]/25 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{t('Preparing your space...', 'جاري تجهيز مساحتك...')}</span>
            </span>
          ) : (
            <>
              <span>{t('Start Exploring Rafiqi', 'ابدأ استكشاف رفيقي')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'} 
      className="fixed inset-0 bg-slate-50 dark:bg-[#071426] text-slate-900 dark:text-[#F8FAFC] z-[100] flex flex-col items-center justify-start py-8 px-4 sm:px-6 overflow-y-auto custom-scrollbar relative transition-colors"
    >
      {/* Top Header: Skip Directly to Dashboard + Log Out */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 z-50">
        {/* Skip Onboarding Button (Available on every step) */}
        <button
          type="button"
          onClick={finishOnboarding}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#131E2E] hover:bg-slate-100 dark:hover:bg-[#1A283D] text-[#1769AA] dark:text-[#4B9FE1] rounded-xl transition-all text-xs font-bold border border-slate-200 dark:border-[#22354E] shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
          title={t('Skip setup and go directly to Dashboard', 'تخطي الإعداد والدخول للرئيسية فوراً')}
        >
          <span>{t('Skip for now', 'تخطي الآن')}</span>
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>

        {/* Brand identity pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-900 dark:text-white">
            {isRtl ? 'رفيقي' : 'Rafiqi'}
          </span>
          <span className="text-xs text-slate-400 dark:text-[#94A3B8]">
            {t('Onboarding', 'إعداد البداية')}
          </span>
        </div>

        {/* Log Out */}
        <button
          type="button"
          onClick={async () => {
            try {
              await logout();
            } catch {}
            window.location.hash = '';
            window.location.reload();
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#131E2E] hover:bg-slate-100 dark:hover:bg-[#1A283D] text-slate-500 dark:text-[#94A3B8] hover:text-rose-500 rounded-xl transition-all text-xs font-bold border border-slate-200 dark:border-[#22354E] shadow-xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('Log Out', 'تسجيل الخروج')}</span>
        </button>
      </div>

      {/* Progressive Step Progress Indicator (5 Steps) */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between">
          {[
            { id: 1, label: t('Language', 'اللغة') },
            { id: 2, label: t('Display', 'المظهر') },
            { id: 3, label: t('Audio', 'الصوت') },
            { id: 4, label: t('Mode', 'النمط') },
            { id: 5, label: t('Done', 'البدء') },
          ].map((s, i, arr) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center relative">
                <button
                  type="button"
                  onClick={() => s.id < step && setStep(s.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs z-10 ${
                    step === s.id
                      ? 'bg-[#1769AA] text-white ring-4 ring-[#1769AA]/20 scale-105'
                      : step > s.id
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-white dark:bg-[#131E2E] border-2 border-slate-200 dark:border-[#22354E] text-slate-400'
                  }`}
                >
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </button>
                <span className={`text-xs font-bold mt-1.5 whitespace-nowrap transition-colors ${
                  step >= s.id ? 'text-[#1769AA] dark:text-[#4B9FE1]' : 'text-slate-400'
                }`}>
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-colors ${
                  step > s.id ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-[#22354E]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Step Content Carousel / Animated Switch */}
      <div className="flex flex-col items-center justify-center w-full flex-1 max-w-lg mb-8">
        <AnimatePresence mode="wait">
          {step === 1 && renderLanguageStep()}
          {step === 2 && renderDisplayStep()}
          {step === 3 && renderAudioStep()}
          {step === 4 && renderAssistiveModeStep()}
          {step === 5 && renderReadyStep()}
        </AnimatePresence>
      </div>

      {/* Footer Branding Note */}
      <div className="text-xs text-slate-400 dark:text-[#94A3B8] font-mono tracking-widest uppercase pb-4">
        Rafiqi · Universal Accessibility
      </div>
    </div>
  );
}
