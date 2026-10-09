import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Brain,
  Eye,
  Ear,
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  RotateCcw,
  Volume2,
  VolumeX,
  Type,
  Sun,
  Moon,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowLeft,
  Plus,
  Flame,
  Award,
  BookOpen,
  Mic,
  Sliders,
  Check,
  X,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { UserProfile, PlannerTask, PlannerTaskType } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { subscribeToTasks, saveTask, daysUntilDue, isOverdue } from '../lib/planner';
import {
  categorizeRetentionState,
  generateMicroReview,
  evaluateMicroReviewSubmission,
  resolveConceptTitle
} from '../lib/retentionProductEngine';
import { createInitialRetentionSchedule } from '../lib/spacedRetention';
import { speak, cancelSpeech } from '../lib/tts';
import { toast } from './Toast';

interface StudentCockpitHubProps {
  profile: UserProfile;
  onSelectSuite: (suiteId: 'vision' | 'deaf' | 'chat') => void;
  onOpenPassport: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onSTTStateChange?: (active: boolean) => void;
}

export default function StudentCockpitHub({
  profile,
  onSelectSuite,
  onOpenPassport,
  isDarkMode = false,
  toggleTheme,
  onSTTStateChange,
}: StudentCockpitHubProps) {
  const isAr = isArabicLocale(profile.language);
  const isFr = profile.language === 'French';

  const t = (en: string, ar: string, fr?: string) => {
    if (isAr) return ar;
    if (isFr && fr) return fr;
    return en;
  };

  // ── Quick Accessibility State ───────────────────────────────────────────────
  const [fontScale, setFontScale] = useState<'normal' | 'medium' | 'large' | 'extra-large'>(() => {
    try {
      return (localStorage.getItem('cognify_font_scale') as any) || 'normal';
    } catch {
      return 'normal';
    }
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cognify_high_contrast') === 'true';
    } catch {
      return false;
    }
  });

  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cognify_reduce_motion') === 'true';
    } catch {
      return false;
    }
  });

  const [isSpeakingOverview, setIsSpeakingOverview] = useState(false);
  const [isCaptionsActive, setIsCaptionsActive] = useState(false);

  const applyFontScale = (scale: 'normal' | 'medium' | 'large' | 'extra-large') => {
    setFontScale(scale);
    try {
      localStorage.setItem('cognify_font_scale', scale);
      const root = document.documentElement;
      root.classList.remove('font-scale-normal', 'font-scale-medium', 'font-scale-large', 'font-scale-extra-large');
      root.classList.add(`font-scale-${scale}`);
      toast.success(
        t(`Text size adjusted`, `تم تعديل حجم الخط`, `Taille du texte ajustée`),
        t(`Accessibility`, `إمكانية الوصول`, `Accessibilité`)
      );
    } catch {}
  };

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    try {
      localStorage.setItem('cognify_high_contrast', String(next));
      document.documentElement.classList.toggle('high-contrast', next);
      toast.success(
        next
          ? t('High Contrast mode active', 'تم تفعيل وضع التباين العالي', 'Mode Contraste Élevé activé')
          : t('High Contrast disabled', 'تم إيقاف التباين العالي', 'Mode Contraste Élevé désactivé'),
        t('Visual Comfort', 'الراحة البصرية', 'Confort Visuel')
      );
    } catch {}
  };

  const toggleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    try {
      localStorage.setItem('cognify_reduce_motion', String(next));
      document.documentElement.classList.toggle('reduce-motion', next);
      toast.success(
        next
          ? t('Animations reduced', 'تم تقليل المؤثرات الحركية', 'Animations réduites')
          : t('Animations enabled', 'تم تفعيل المؤثرات الحركية', 'Animations activées'),
        t('Accessibility', 'إمكانية الوصول', 'Accessibilité')
      );
    } catch {}
  };

  const handleToggleReadAloud = () => {
    if (isSpeakingOverview) {
      cancelSpeech();
      setIsSpeakingOverview(false);
      return;
    }

    const greeting = profile.name ? `${t('Hello', 'أهلاً بك يا', 'Bonjour')} ${profile.name}.` : t('Welcome back.', 'أهلاً بك في كوجنيفاي.', 'Bienvenue sur Cognify.');
    const summary = isAr
      ? `${greeting} خطوتك التعليمية التالية المقترحة هي متابعة التدريب مع المعلم الذكي المهيأ. لديك مراجعات ومهمات يمكنك استعراضها بسهولة.`
      : isFr
      ? `${greeting} Votre prochaine étape recommandée est de poursuivre avec le Tuteur Adaptatif. Vous avez des révisions prêtes.`
      : `${greeting} Your suggested next step is to continue with the Accessible AI Tutor. You have active reviews and tasks ready.`;

    setIsSpeakingOverview(true);
    speak(summary, isAr ? 'Arabic' : isFr ? 'French' : 'English', {
      onEnd: () => setIsSpeakingOverview(false),
      onError: () => setIsSpeakingOverview(false),
    });
  };

  const handleToggleCaptions = () => {
    const next = !isCaptionsActive;
    setIsCaptionsActive(next);
    onSTTStateChange?.(next);
    toast.info(
      next
        ? t('Speech transcription active', 'تم تفعيل الاستماع والتفريغ الفوري', 'Transcription vocale activée')
        : t('Speech transcription paused', 'تم إيقاف التفريغ الصوتي', 'Transcription vocale désactivée'),
      t('Hearing Assistive', 'التيسير السمعي', 'Assistance Auditive')
    );
  };

  // ── Tasks & Planner ────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => {
    if (!profile.uid || profile.uid === 'guest-explorer') return;
    const unsub = subscribeToTasks(profile.uid, (taskList) => {
      setTasks(taskList);
    });
    return () => unsub?.();
  }, [profile.uid]);

  const handleToggleTask = async (task: PlannerTask) => {
    const updated = { ...task, completed: !task.completed };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    if (profile.uid && profile.uid !== 'guest-explorer') {
      try {
        await saveTask(profile.uid, updated);
      } catch {}
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: PlannerTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      type: 'assignment',
      course: profile.field || 'General',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
    setIsAddingTask(false);

    if (profile.uid && profile.uid !== 'guest-explorer') {
      try {
        await saveTask(profile.uid, newTask);
        toast.success(
          t('Task saved to your plan', 'تمت إضافة المهمة بنجاح إلى خطتك', 'Tâche ajoutée à votre plan'),
          t('Academic Planner', 'التخطيط الأكاديمي', 'Planificateur')
        );
      } catch {}
    }
  };

  // ── Due Spaced Reviews (SuperMemo-2) ────────────────────────────────────────
  const retentionState = useMemo(() => {
    return categorizeRetentionState(undefined, undefined, Date.now());
  }, []);

  const [activeReviewConceptId, setActiveReviewConceptId] = useState<string | null>(null);
  const [reviewQuestion, setReviewQuestion] = useState<any>(null);
  const [selectedReviewOption, setSelectedReviewOption] = useState<number | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<any>(null);

  const handleStartReview = (conceptId: string) => {
    const langKey = isAr ? 'ar' : isFr ? 'fr' : 'en';
    const q = generateMicroReview(conceptId, langKey);
    setActiveReviewConceptId(conceptId);
    setReviewQuestion(q);
    setSelectedReviewOption(null);
    setReviewSubmitted(false);
    setReviewResult(null);
  };

  const handleSubmitReview = () => {
    if (selectedReviewOption === null || !reviewQuestion || !activeReviewConceptId) return;
    const schedule = createInitialRetentionSchedule(activeReviewConceptId);
    const result = evaluateMicroReviewSubmission(
      {
        conceptId: activeReviewConceptId,
        selectedIndex: selectedReviewOption,
        responseTimeMs: 3000,
      },
      schedule
    );
    setReviewResult(result);
    setReviewSubmitted(true);
  };

  // ── Student Context & Metrics ──────────────────────────────────────────────
  const studentName = profile.name || (isAr ? 'عزيزي الطالب' : 'Learner');
  const streakDays = (profile as any).studentState?.streakDays || 3;
  const points = profile.points || 280;
  const questionScore = profile.questionScore || 95;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 select-none">
      
      {/* ═══════════════════════════════════════════════════════════════════════
          1. UNIVERSAL QUICK ACCESSIBILITY & COMFORT TOOLBAR
         ═══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label={t('Quick Accessibility & Comfort Controls', 'شريط أدوات الوصول والراحة الفورية', 'Contrôles d\'accessibilité rapide')}
        className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-2.5 shadow-sm ${
          isDarkMode
            ? 'bg-[#150917]/90 border-[#4A1224]/70 text-slate-200'
            : 'bg-white border-slate-200/90 text-slate-800'
        }`}
      >
        {/* Left: Text Scaling & Visual Contrast */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 border-e pe-2 border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">{t('Text', 'الخط', 'Texte')}</span>
            </span>
            <button
              onClick={() => applyFontScale('normal')}
              className={`px-2 py-1 min-h-[36px] rounded-lg text-xs font-bold transition-all ${
                fontScale === 'normal'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              title={t('Standard font size (16px)', 'حجم خط قياسي', 'Taille standard')}
            >
              A
            </button>
            <button
              onClick={() => applyFontScale('large')}
              className={`px-2 py-1 min-h-[36px] rounded-lg text-xs font-bold transition-all ${
                fontScale === 'large' || fontScale === 'extra-large'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              title={t('Large font size (20px)', 'تكبير الخط للراحة البصرية', 'Grande taille')}
            >
              A+
            </button>
          </div>

          {/* High Contrast Toggle */}
          <button
            onClick={toggleHighContrast}
            className={`px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              highContrast
                ? 'bg-amber-400 text-slate-950 border-amber-500 font-black shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent text-slate-600 dark:text-slate-300'
            }`}
            title={t('Toggle high contrast for maximum clarity', 'تبديل التباين العالي لقراءة أوضح', 'Contraste élevé')}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('High Contrast', 'تباين فائق', 'Contraste')}</span>
          </button>

          {/* Reduce Motion Toggle */}
          <button
            onClick={toggleReduceMotion}
            className={`px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              reduceMotion
                ? 'bg-amber-400 text-slate-950 border-amber-500 font-black shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent text-slate-600 dark:text-slate-300'
            }`}
            title={t('Reduce animations and motion', 'تقليل الحركة والمؤثرات البصرية', 'Réduire animations')}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">{t('Reduce Motion', 'تقليل الحركة', 'Sans mouvement')}</span>
          </button>
        </div>

        {/* Right: Audio Reading & Speech Captions & Passport */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleToggleReadAloud}
            className={`px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              isSpeakingOverview
                ? 'bg-emerald-500 text-white border-emerald-600 animate-pulse font-black'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
            }`}
            title={t('Read screen summary aloud', 'استمع إلى ملخص الشاشة صوتياً', 'Lecture vocale')}
          >
            {isSpeakingOverview ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{isSpeakingOverview ? t('Stop Speech', 'إيقاف الصوت', 'Arrêter') : t('Read Aloud', 'قراءة صوتية', 'Écouter')}</span>
          </button>

          <button
            onClick={handleToggleCaptions}
            className={`px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              isCaptionsActive
                ? 'bg-indigo-600 text-white border-indigo-700 font-black'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
            }`}
            title={t('Toggle real-time live captions', 'تفعيل التفريغ النصي للكلام المسموع', 'Sous-titres en direct')}
          >
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{t('Captions', 'تفريغ فوري', 'Sous-titres')}</span>
          </button>

          <button
            onClick={onOpenPassport}
            className="px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 text-slate-950 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            title={t('Universal Accommodation Passport', 'جواز السفر الميسر الموحد', 'Passeport d\'accessibilité')}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('Passport', 'جواز الإتاحة', 'Passeport')}</span>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. HUMAN PERSONALIZED GREETING & CONTEXT
         ═══════════════════════════════════════════════════════════════════════ */}
      <section
        className={`p-6 sm:p-8 rounded-3xl border transition-all relative overflow-hidden shadow-sm ${
          isDarkMode
            ? 'bg-gradient-to-br from-[#1A0B1B] via-[#120614] to-[#0A040B] border-[#4A1224]/80 text-white'
            : 'bg-gradient-to-br from-[#FAF8F5] via-[#FFFDF9] to-[#F5F2EB] border-amber-200/70 text-slate-900'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-start">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-500 dark:text-amber-300 border border-amber-400/30">
                Cognify · مساحتك الأكاديمية
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                {profile.field || 'General Studies'} · {profile.level || 'Intermediate'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              {t('Welcome back,', 'أهلاً بك،', 'Bienvenue,')} <span className="text-amber-500 dark:text-amber-400">{studentName}</span> 👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              {t(
                'A calm, adaptive space designed for your pace and focus. Everything here respects your autonomy, sensory comfort, and learning style.',
                'بيئة تعليمية هادئة تتكيف مع وتيرتك وتركيزك. صُممت لتمكينك باستقلالية تامة، وتوفير كافة ركائز التيسير والراحة البصرية والسمعية والمعرفية.',
                'Un espace calme et adaptatif conçu pour votre rythme et votre concentration, avec une accessibilité totale.'
              )}
            </p>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={`p-3.5 rounded-2xl border text-center min-w-[90px] shadow-sm ${
              isDarkMode ? 'bg-[#150917]/80 border-[#4A1224]/60' : 'bg-white border-amber-200/80'
            }`}>
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                <Flame className="w-4 h-4" />
                <span className="text-lg font-black">{streakDays}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{t('Days Streak', 'أيام مستمرة', 'Jours consécutifs')}</span>
            </div>

            <div className={`p-3.5 rounded-2xl border text-center min-w-[90px] shadow-sm ${
              isDarkMode ? 'bg-[#150917]/80 border-[#4A1224]/60' : 'bg-white border-amber-200/80'
            }`}>
              <div className="flex items-center justify-center gap-1 text-emerald-500 mb-0.5">
                <Award className="w-4 h-4" />
                <span className="text-lg font-black">{points}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{t('XP Points', 'نقاط الإنجاز', 'Points XP')}</span>
            </div>

            <div className={`p-3.5 rounded-2xl border text-center min-w-[90px] shadow-sm ${
              isDarkMode ? 'bg-[#150917]/80 border-[#4A1224]/60' : 'bg-white border-amber-200/80'
            }`}>
              <div className="flex items-center justify-center gap-1 text-indigo-400 mb-0.5">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-lg font-black">{questionScore}%</span>
              </div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{t('Mastery', 'معدل الإتقان', 'Maîtrise')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. RECOMMENDED NEXT EDUCATIONAL STEP (NEXT BEST ACTION)
         ═══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label={t('Recommended Next Step', 'الخطوة التعليمية التالية المقترحة', 'Prochaine étape recommandée')}
        className={`p-5 sm:p-6 rounded-3xl border transition-all text-start relative overflow-hidden shadow-sm ${
          isDarkMode
            ? 'bg-gradient-to-r from-amber-500/10 via-[#150917] to-purple-500/10 border-amber-500/30'
            : 'bg-gradient-to-r from-amber-50 via-white to-orange-50/60 border-amber-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
                {t('Immediate Next Best Action', 'الخطوة التالية المقترحة لك الآن', 'Prochaine action recommandée')}
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                ⏱️ 5 - 10 {t('mins', 'دقائق', 'min')}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {t(
                'Continue Learning with Accessible AI Tutor',
                'متابعة الدرس والتطبيق العملي مع المعلم الذكي المهيأ',
                'Poursuivre l\'apprentissage avec le Tuteur Adaptatif'
              )}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {t(
                'Explore concepts deconstructed into your preferred pace, with worked examples and active checkpoints.',
                'شرح تفاعلي متكيف مع استيعابك، يتضمن خطوات متتابعة ونقاط تحقق للتأكد من ثبات المعلومة.',
                'Explication pas-à-pas adaptée à votre rythme avec des exemples concrets.'
              )}
            </p>
          </div>

          <button
            onClick={() => onSelectSuite('chat')}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-[#E5A93C] to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>{t('Launch Tutor Now', 'ابدأ جلستك الآن', 'Démarrer')}</span>
            <ChevronRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          4. TWO-COLUMN WORKSPACE: TODAY'S PLAN & SHORT SPACED REVIEWS
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 text-start">
        
        {/* ── CARD A: TODAY'S PLAN & ACADEMIC TASKS ── */}
        <div className={`p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between shadow-sm ${
          isDarkMode ? 'bg-[#150917]/90 border-[#4A1224]/70' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                <CalendarDays className="w-4 h-4 text-amber-500" />
                <h3>{t('Today\'s Plan & Tasks', 'خطة ومهام اليوم', 'Plan & Tâches du jour')}</h3>
              </div>
              <button
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('Add Task', 'إضافة مهمة', 'Ajouter')}</span>
              </button>
            </div>

            {/* Quick Add Form */}
            {isAddingTask && (
              <form onSubmit={handleCreateTask} className="mb-3 flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={t('Task title or assignment...', 'عنوان المهمة أو الواجب...', 'Titre de la tâche...')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-[#0E0610] border-[#4A1224] text-white focus:border-amber-400'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                  }`}
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-all cursor-pointer"
                >
                  {t('Save', 'حفظ', 'Enregistrer')}
                </button>
              </form>
            )}

            {/* Task list */}
            <div className="space-y-2 mt-2">
              {tasks.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-center">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 mx-auto mb-1.5 opacity-80" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('All tasks clear for today!', 'لا توجد مهام متأخرة اليوم — أحسنت!', 'Toutes les tâches sont terminées !')}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('Add an assignment or continue reviewing at your leisure.', 'أضف تكليفاً قادماً أو استمتع بيومك التعليمي.', 'Ajoutez une tâche ou continuez vos révisions.')}
                  </p>
                </div>
              ) : (
                tasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                      task.completed
                        ? 'opacity-60 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                        : isDarkMode
                        ? 'bg-[#0E0610]/70 border-[#4A1224]/50 hover:border-amber-400/50'
                        : 'bg-slate-50/80 border-slate-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        aria-label={task.completed ? t('Mark incomplete', 'تعليم كغير مكتمل', 'Marquer incomplet') : t('Mark complete', 'تعليم كمكتمل', 'Marquer complet')}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          task.completed
                            ? 'bg-emerald-500 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 group-hover:border-amber-400'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                      <span className={`text-xs font-medium truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {task.title}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold shrink-0">
                      {task.course || 'General'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#4A1224]/50 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
            <span>{tasks.filter((t) => t.completed).length} / {tasks.length} {t('Completed', 'مكتملة', 'Terminées')}</span>
            <span className="font-bold text-amber-500 dark:text-amber-400">
              {tasks.length > 0 && Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100)}%
            </span>
          </div>
        </div>

        {/* ── CARD B: SHORT DUE SPACED REVIEWS ── */}
        <div className={`p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between shadow-sm ${
          isDarkMode ? 'bg-[#150917]/90 border-[#4A1224]/70' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                <RotateCcw className="w-4 h-4 text-emerald-500" />
                <h3>{t('Due Spaced Reviews', 'المراجعات القصيرة المستحقة', 'Révisions espacées')}</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                SuperMemo-2 · 3 {t('mins', 'د', 'min')}
              </span>
            </div>

            <div className="space-y-2 mt-2">
              {retentionState.dueToday.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('All concepts retained and up to date!', 'كافة المفاهيم مثبتة ومحدثة — رائع!', 'Tous les concepts sont maîtrisés !')}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('Next scheduled review triggers tomorrow.', 'المراجعة التالية تبدأ غداً حسب منحنى النسيان.', 'Prochaine révision demain selon la courbe.')}
                  </p>
                </div>
              ) : (
                retentionState.dueToday.slice(0, 3).map((item) => {
                  const title = resolveConceptTitle(item.conceptId, isAr ? 'ar' : isFr ? 'fr' : 'en');
                  return (
                    <div
                      key={item.conceptId}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isDarkMode
                          ? 'bg-[#0E0610]/70 border-[#4A1224]/50'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {title}
                        </p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">
                          {t('Interval:', 'دورة التكرار:', 'Intervalle:')} {item.intervalDays} {t('days', 'أيام', 'jours')}
                        </p>
                      </div>

                      <button
                        onClick={() => handleStartReview(item.conceptId)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
                      >
                        {t('Review Now', 'مراجعة الآن', 'Réviser')}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#4A1224]/50 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
            <span>{t('Mastered Concepts:', 'المفاهيم المتقنة:', 'Concepts maîtrisés:')} {retentionState.mastered.length}</span>
            <span className="text-emerald-500 font-bold">{t('Retention Stable', 'تثبيت مستقر', 'Rétention stable')}</span>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          5. THREE CORE ASSISTIVE SUITES (DEDICATED & CALM)
         ═══════════════════════════════════════════════════════════════════════ */}
      <section
        id="suites-grid"
        aria-label={t('Dedicated Assistive Suites', 'منظومات التيسير المتخصصة', 'Suites d\'assistance')}
        className="pt-2 text-start"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('Primary Assistive Pillars', 'الركائز الأساسية للتيسير والتعلم', 'Piliers d\'assistance')}</span>
          </h3>
          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
            {t('Direct access anytime', 'دخول مباشر في أي وقت', 'Accès direct')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Pillar 1: Visual Companion */}
          <button
            onClick={() => onSelectSuite('vision')}
            className={`p-5 rounded-3xl border transition-all active:scale-[0.98] shadow-sm flex flex-col justify-between cursor-pointer group text-start min-h-[160px] ${
              isDarkMode
                ? 'bg-[#150917] border-[#4A1224]/70 hover:border-rose-500/60 hover:bg-[#1A0B1D]'
                : 'bg-white border-slate-200 hover:border-rose-400 hover:bg-rose-50/30'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-3 group-hover:scale-105 transition-transform">
                <Eye className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-rose-500 transition-colors">
                {t('Visual Companion (AI Eyes)', 'الرفيق البصري الذكي', 'Compagnon Visuel (Yeux IA)')}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {t(
                  'Currency reader, clothes matching, face memory, lecture scanner, and tactile haptic navigation.',
                  'قارئ العملات الورقية، فحص ألوان الملابس، التعرف على الوجوه، ماسح المحاضرات، والعصا البيضاء اللمسية.',
                  'Lecteur de devises, reconnaissance des couleurs et objets, et guidage haptique.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-rose-500">
              <span>{t('Open Suite', 'تشغيل المنظومة', 'Ouvrir')}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Pillar 2: Unified Deaf & Hearing Center */}
          <button
            onClick={() => onSelectSuite('deaf')}
            className={`p-5 rounded-3xl border transition-all active:scale-[0.98] shadow-sm flex flex-col justify-between cursor-pointer group text-start min-h-[160px] ${
              isDarkMode
                ? 'bg-[#150917] border-[#4A1224]/70 hover:border-amber-500/60 hover:bg-[#1A0B1D]'
                : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/30'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3 group-hover:scale-105 transition-transform">
                <Ear className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                {t('Unified Hearing Center', 'المركز السمعي الموحد', 'Centre Auditif Unifié')}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {t(
                  'Live speech-to-text captions, instant voice speaker, express AAC cards, and hazard sound sentinel.',
                  'تفريغ فوري لكلام المتحدث، نطق صوتي للغرفة، بطاقات تواصل سريعة، ومستشعر أصوات مرتفعة ومخاطر.',
                  'Sous-titrage direct, synthèse vocale, cartes CAA rapides et alerte sonore stroboscopique.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-amber-500">
              <span>{t('Open Suite', 'تشغيل المنظومة', 'Ouvrir')}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Pillar 3: Accessible AI Tutor */}
          <button
            onClick={() => onSelectSuite('chat')}
            className={`p-5 rounded-3xl border transition-all active:scale-[0.98] shadow-sm flex flex-col justify-between cursor-pointer group text-start min-h-[160px] ${
              isDarkMode
                ? 'bg-[#150917] border-[#4A1224]/70 hover:border-purple-500/60 hover:bg-[#1A0B1D]'
                : 'bg-white border-slate-200 hover:border-purple-400 hover:bg-purple-50/30'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">
                {t('Accessible AI Tutor', 'المعلم الذكي المهيأ', 'Tuteur IA Accessible')}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {t(
                  'Adaptive pedagogical pace, worked examples, visual analogies, simplified steps, and screen-reader support.',
                  'شرح متكيف مع سرعتك الذهنية، أمثلة عملية، تشبيهات بصرية، خطوات متتابعة، وتوافق تام مع قارئات الشاشة.',
                  'Rythme adaptatif, exemples concrets, analogies visuelles et compatibilité lecteur d\'écran.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-purple-500">
              <span>{t('Open Suite', 'تشغيل المنظومة', 'Ouvrir')}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </button>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          MICRO-REVIEW MODAL (1-QUESTION SUPERMEMO-2 REINFORCEMENT)
         ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeReviewConceptId && reviewQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl space-y-4 text-start ${
                isDarkMode ? 'bg-[#150917] border-[#4A1224] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-emerald-500">
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {t('Micro-Review Check', 'فحص المراجعة السريعة', 'Contrôle de micro-révision')}
                  </span>
                </div>
                <button
                  onClick={() => setActiveReviewConceptId(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <span className="text-[11px] font-bold text-amber-500 block mb-1">
                  {reviewQuestion.conceptTitle}
                </span>
                <p className="text-sm font-black leading-relaxed">
                  {isAr ? (reviewQuestion.promptAr || reviewQuestion.promptEn) : isFr ? (reviewQuestion.promptFr || reviewQuestion.promptEn) : (reviewQuestion.promptEn || reviewQuestion.promptAr)}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2 pt-2">
                {reviewQuestion.options.map((opt: any, idx: number) => {
                  const isSelected = selectedReviewOption === idx;
                  const isCorrect = reviewSubmitted && idx === reviewQuestion.correctIndex;
                  const isWrong = reviewSubmitted && isSelected && !reviewResult?.isCorrect;
                  const optionLabel = isAr ? (opt.textAr || opt.textEn) : isFr ? (opt.textFr || opt.textEn) : (opt.textEn || opt.textAr);

                  return (
                    <button
                      key={idx}
                      disabled={reviewSubmitted}
                      onClick={() => setSelectedReviewOption(idx)}
                      className={`w-full p-3 rounded-2xl border text-start text-xs font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isCorrect
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : isWrong
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                          : isSelected
                          ? 'bg-amber-400/20 border-amber-400 text-amber-500 dark:text-amber-300 font-bold'
                          : isDarkMode
                          ? 'bg-[#0E0610] border-[#4A1224]/60 hover:border-slate-600 text-slate-200'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-400 text-slate-800'
                      }`}
                    >
                      <span>{optionLabel}</span>
                      {isSelected && <span className="text-xs font-black">●</span>}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Outcome */}
              {reviewSubmitted && reviewResult && (
                <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                  reviewResult.isCorrect
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}>
                  <p className="font-black">
                    {reviewResult.isCorrect ? t('🎉 Excellent recall!', '🎉 استرجاع ممتاز وصحيح!', '🎉 Excellent rappel !') : t('💡 Keep building memory:', '💡 راجع المفهوم لتثبيته:', '💡 Révision du concept :')}
                  </p>
                  <p className="leading-relaxed opacity-90">
                    {isAr ? (reviewQuestion.explanationAr || reviewQuestion.explanationEn) : isFr ? (reviewQuestion.explanationFr || reviewQuestion.explanationEn) : (reviewQuestion.explanationEn || reviewQuestion.explanationAr)}
                  </p>
                  <p className="text-[10px] opacity-75 font-bold pt-1">
                    {t('Next review interval:', 'دورة التكرار القادمة:', 'Prochain intervalle :')} {reviewResult.newIntervalDays || 1} {t('days', 'أيام', 'jours')}
                  </p>
                </div>
              )}

              {/* Footer action */}
              <div className="pt-2 flex justify-end gap-2">
                {!reviewSubmitted ? (
                  <button
                    disabled={selectedReviewOption === null}
                    onClick={handleSubmitReview}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all cursor-pointer"
                  >
                    {t('Check Answer', 'تحقق من الإجابة', 'Vérifier')}
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveReviewConceptId(null)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    {t('Done', 'تم', 'Terminer')}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
