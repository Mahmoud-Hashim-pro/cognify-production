import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Brain,
  Eye,
  Ear,
  CheckCircle2,
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
  Layers,
  HelpCircle,
  Clock
} from 'lucide-react';
import { UserProfile, PlannerTask, PedagogyStyle } from '../types';
import { isArabicLocale } from '../lib/translations';
import { subscribeToTasks, saveTask } from '../lib/planner';
import {
  categorizeRetentionState,
  generateMicroReview,
  evaluateMicroReviewSubmission,
  resolveConceptTitle
} from '../lib/retentionProductEngine';
import { createInitialRetentionSchedule } from '../lib/spacedRetention';
import { speak, cancelSpeech } from '../lib/tts';
import { toast } from './Toast';
import CognifyPathwaysHero from './CognifyPathwaysHero';

interface StudentCockpitHubProps {
  profile: UserProfile;
  onSelectSuite: (suiteId: 'vision' | 'deaf' | 'chat') => void;
  onOpenPassport: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onSTTStateChange?: (active: boolean) => void;
  setProfile?: (profile: UserProfile) => void;
}

export default function StudentCockpitHub({
  profile,
  onSelectSuite,
  onOpenPassport,
  isDarkMode = false,
  toggleTheme,
  onSTTStateChange,
  setProfile,
}: StudentCockpitHubProps) {
  const isAr = isArabicLocale(profile.language);
  const isFr = profile.language === 'French';

  const t = (en: string, ar: string, fr?: string) => {
    if (isAr) return ar;
    if (isFr && fr) return fr;
    return en;
  };

  // ── Quick Accessibility State ───────────────────────────────────────────────
  const [fontScale, setFontScale] = useState<'normal' | 'large'>(() => {
    try {
      const saved = localStorage.getItem('cognify_font_scale');
      return saved === 'large' || saved === 'extra-large' ? 'large' : 'normal';
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

  // ── Preferred Pedagogy State (Wired to Engine) ──────────────────────────────
  const [activePedagogy, setActivePedagogy] = useState<PedagogyStyle>(() => {
    try {
      const saved = localStorage.getItem('cognify_preferred_pedagogy') as PedagogyStyle;
      if (saved) return saved;
    } catch {}
    return profile.preferredPedagogyStyle || 'scaffolded';
  });

  useEffect(() => {
    if (profile.preferredPedagogyStyle && profile.preferredPedagogyStyle !== activePedagogy) {
      setActivePedagogy(profile.preferredPedagogyStyle);
    }
  }, [profile.preferredPedagogyStyle]);

  const applyFontScale = (scale: 'normal' | 'large') => {
    setFontScale(scale);
    try {
      localStorage.setItem('cognify_font_scale', scale);
      const root = document.documentElement;
      root.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-medium', 'font-scale-extra-large');
      root.classList.add(`font-scale-${scale}`);
      toast.success(
        t('Text size adjusted', 'تم تعديل حجم الخط', 'Taille du texte ajustée'),
        t('Accessibility', 'إمكانية الوصول', 'Accessibilité')
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

    const greeting = profile.name
      ? `${t('Hello', 'أهلاً بك يا', 'Bonjour')} ${profile.name}.`
      : t('Welcome back.', 'أهلاً بك في كوجنيفاي.', 'Bienvenue sur Cognify.');
    
    const summary = isAr
      ? `${greeting} مساحتك التعليمية الهادئة جاهزة. طريقتك المفضلة الحالية في الشرح هي ${getPedagogyLabel(activePedagogy)}. يمكنك بدء الدرس في أي وقت، ومراجعة مفاهيمك المستحقة براحة تامة وبدون أي ضغط.`
      : isFr
      ? `${greeting} Votre espace d'apprentissage calme est prêt. Votre style d'explication actif est ${getPedagogyLabel(activePedagogy)}. Vous pouvez commencer votre leçon à tout moment.`
      : `${greeting} Your serene learning space is ready. Your active explanation style is ${getPedagogyLabel(activePedagogy)}. You can launch your lesson or review concepts at your own pace.`;

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

  const handleSelectPedagogy = (styleKey: PedagogyStyle | 'voice') => {
    if (styleKey === 'voice') {
      handleToggleReadAloud();
      return;
    }
    setActivePedagogy(styleKey);
    try {
      localStorage.setItem('cognify_preferred_pedagogy', styleKey);
      if (setProfile) {
        setProfile({ ...profile, preferredPedagogyStyle: styleKey });
      }
      toast.success(
        isAr
          ? `تم ضبط أسلوب الشرح على: ${getPedagogyLabel(styleKey)}`
          : `Pedagogy style set to: ${getPedagogyLabel(styleKey)}`,
        t('Learning Adaptation', 'التكيف التعليمي', 'Adaptation pédagogique')
      );
    } catch {}
  };

  function getPedagogyLabel(key: PedagogyStyle | 'voice'): string {
    switch (key) {
      case 'simplified':
        return t('Simplified Plain Text', 'نص مبسط وواضح', 'Texte clair et simplifié');
      case 'voice':
        return t('Voice & Audio Narration', 'صوت واستماع مسموع', 'Écoute audio et voix');
      case 'scaffolded':
        return t('Scaffolded Step-by-Step', 'شرح متدرج خطوة بخطوة', 'Explication progressive pas à pas');
      case 'analogies':
        return t('Visual Analogies & Models', 'تشبيهات ونماذج بصرية', 'Analogies et modèles visuels');
      case 'practical':
        return t('Practical Worked Examples', 'أمثلة وتطبيقات عملية', 'Exemples pratiques appliqués');
      case 'socratic':
        return t('Socratic Guiding Questions', 'حوار استكشافي سقراطي', 'Dialogue socratique guidé');
      case 'technical':
        return t('Technical In-Depth Analysis', 'تحليل تقني وأكاديمي متعمق', 'Analyse technique approfondie');
      default:
        return t('Step-by-Step Learning', 'شرح متدرج', 'Apprentissage progressif');
    }
  }

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
  const currentSubject = profile.field || (isAr ? 'المهارات الأكاديمية وهياكل البيانات' : 'Core Academic Foundations');
  const activeSuggestedReview = retentionState.dueToday[0] || null;
  const activeTask = tasks.find((t) => !t.completed) || tasks[0] || null;

  // ── Pedagogical Choices Definition ─────────────────────────────────────────
  const PEDAGOGY_CHOICES = [
    {
      id: 'simplified' as const,
      labelAr: 'نص مبسط وواضح',
      labelEn: 'Plain Simplified Text',
      labelFr: 'Texte clair & simple',
      descAr: 'شرح بأسلوب مباشر ولغة يسيرة خالية من التعقيد',
      descEn: 'Clear, direct language without confusing jargon',
      descFr: 'Langage direct sans jargon complexe',
      icon: BookOpen,
    },
    {
      id: 'voice' as const,
      labelAr: 'صوت واستماع',
      labelEn: 'Voice & Audio',
      labelFr: 'Voix & Audio',
      descAr: 'قراءة مسموعة فورية للشروحات مع وتيرة صوتية مريحة',
      descEn: 'Instant spoken narration with comfortable auditory pace',
      descFr: 'Narration vocale instantanée au rythme calme',
      icon: Volume2,
    },
    {
      id: 'scaffolded' as const,
      labelAr: 'شرح متدرج خطوة بخطوة',
      labelEn: 'Scaffolded Step-by-Step',
      labelFr: 'Progression pas à pas',
      descAr: 'تفكيك الفكرة إلى محطات صغيرة ونقاط تحقق للتثبيت',
      descEn: 'Deconstructs ideas into sequential checkpoints',
      descFr: 'Découpage du concept en petites étapes claires',
      icon: Layers,
    },
    {
      id: 'analogies' as const,
      labelAr: 'تشبيهات ونماذج بصرية',
      labelEn: 'Visual Analogies',
      labelFr: 'Analogies visuelles',
      descAr: 'تقريب المفاهيم بنماذج ذهنية وتشبيهات من واقع الحياة',
      descEn: 'Mental models and relatable daily-life analogies',
      descFr: 'Modèles mentaux et exemples de la vie courante',
      icon: Sparkles,
    },
    {
      id: 'practical' as const,
      labelAr: 'أمثلة وتطبيقات عملية',
      labelEn: 'Practical Worked Examples',
      labelFr: 'Cas pratiques concrets',
      descAr: 'حالات تطبيقية وأمثلة واقعية توضح كيف يُطبّق المفهوم',
      descEn: 'Real-world worked examples and concrete use cases',
      descFr: 'Exemples résolus montrant l’application concrète',
      icon: Zap,
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 select-none">
      
      {/* ═══════════════════════════════════════════════════════════════════════
          1. UNIVERSAL ACCESSIBILITY & COMFORT TOOLBAR (Visible & Accessible)
         ═══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label={t('Universal Accessibility & Comfort Controls', 'شريط أدوات الوصول والراحة الفورية', 'Contrôles d\'accessibilité rapide')}
        className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-2.5 shadow-sm ${
          isDarkMode
            ? 'bg-[#111A1E]/90 border-stone-800 text-stone-200'
            : 'bg-white border-stone-200/90 text-stone-800'
        }`}
      >
        {/* Left: Text Scaling, Contrast & Motion */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Font Scale Toggle */}
          <div className="flex items-center gap-1 border-e pe-2 border-stone-200 dark:border-stone-800">
            <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">{t('Text', 'الخط', 'Texte')}</span>
            </span>
            <button
              type="button"
              onClick={() => applyFontScale('normal')}
              className={`px-2.5 py-1 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                fontScale === 'normal'
                  ? 'bg-teal-700 text-white font-black shadow-sm'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
              }`}
              title={t('Standard font size (16px)', 'حجم خط قياسي', 'Taille standard')}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => applyFontScale('large')}
              className={`px-2.5 py-1 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                fontScale === 'large'
                  ? 'bg-teal-700 text-white font-black shadow-sm'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
              }`}
              title={t('Large font size for visual comfort', 'تكبير الخط للراحة البصرية', 'Grande taille')}
            >
              A+
            </button>
          </div>

          {/* High Contrast Toggle */}
          <button
            type="button"
            onClick={toggleHighContrast}
            className={`px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              highContrast
                ? 'bg-teal-700 text-white border-teal-800 font-black shadow-sm'
                : 'hover:bg-stone-100 dark:hover:bg-stone-800 border-transparent text-stone-700 dark:text-stone-300'
            }`}
            title={t('Toggle high contrast for maximum clarity', 'تبديل التباين العالي لقراءة أوضح', 'Contraste élevé')}
          >
            <Sliders className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{t('High Contrast', 'تباين فائق', 'Contraste')}</span>
          </button>

          {/* Reduce Motion Toggle */}
          <button
            type="button"
            onClick={toggleReduceMotion}
            className={`px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              reduceMotion
                ? 'bg-teal-700 text-white border-teal-800 font-black shadow-sm'
                : 'hover:bg-stone-100 dark:hover:bg-stone-800 border-transparent text-stone-700 dark:text-stone-300'
            }`}
            title={t('Reduce animations and motion', 'تقليل الحركة والمؤثرات البصرية', 'Réduire animations')}
          >
            <Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="hidden md:inline">{t('Reduce Motion', 'تقليل الحركة', 'Sans mouvement')}</span>
          </button>
        </div>

        {/* Right: Audio Narration, Speech Captions, Theme & Passport */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Read Screen Aloud */}
          <button
            type="button"
            onClick={handleToggleReadAloud}
            className={`px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              isSpeakingOverview
                ? 'bg-teal-700 text-white border-teal-800 animate-pulse font-black'
                : 'hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200'
            }`}
            title={t('Read screen summary aloud', 'استمع إلى ملخص الشاشة صوتياً', 'Lecture vocale')}
          >
            {isSpeakingOverview ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
            <span>{isSpeakingOverview ? t('Stop Speech', 'إيقاف الصوت', 'Arrêter') : t('Read Aloud', 'قراءة صوتية', 'Écouter')}</span>
          </button>

          {/* Live Captions Toggle */}
          <button
            type="button"
            onClick={handleToggleCaptions}
            className={`px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              isCaptionsActive
                ? 'bg-teal-700 text-white border-teal-800 font-black'
                : 'hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200'
            }`}
            title={t('Toggle real-time live captions', 'تفعيل التفريغ النصي للكلام المسموع', 'Sous-titres en direct')}
          >
            <Mic className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">{t('Captions', 'تفريغ فوري', 'Sous-titres')}</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          {toggleTheme && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 min-h-[36px] min-w-[36px] rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
              title={isDarkMode ? t('Switch to Light Mode', 'التبديل إلى الوضع النهاري', 'Passer au mode clair') : t('Switch to Dark Mode', 'التبديل إلى الوضع الليلي', 'Passer au mode sombre')}
              aria-label={isDarkMode ? t('Switch to Light Mode', 'التبديل إلى الوضع النهاري', 'Passer au mode clair') : t('Switch to Dark Mode', 'التبديل إلى الوضع الليلي', 'Passer au mode sombre')}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-600" />}
            </button>
          )}

          {/* Accommodation Passport */}
          <button
            type="button"
            onClick={onOpenPassport}
            className="px-3 py-1 min-h-[36px] rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 flex items-center gap-1.5 border border-stone-300 dark:border-stone-700 transition-all cursor-pointer"
            title={t('Universal Accommodation Passport', 'جواز السفر الميسر الموحد', 'Passeport d\'accessibilité')}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{t('Passport', 'جواز الإتاحة', 'Passeport')}</span>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. INCLUSIVE ANIMATED HERO & LEARNING PATHWAYS CONSTELLATION
         ═══════════════════════════════════════════════════════════════════════ */}
      <CognifyPathwaysHero
        profile={profile}
        activePedagogy={activePedagogy}
        onSelectPedagogy={handleSelectPedagogy}
        onStartLearning={() => onSelectSuite('chat')}
        onOpenAccessibility={onOpenPassport}
        isDarkMode={isDarkMode}
        reduceMotion={reduceMotion}
        studentName={studentName}
        streakDays={streakDays}
        masteredCount={retentionState.mastered.length + 4}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          3. PROMINENT LESSON SPACE (Showing Active Suggested Pedagogy Style)
         ═══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label={t('Current Lesson Space', 'مساحة الدرس واستكماله', 'Espace de leçon en cours')}
        className={`p-6 sm:p-7 rounded-3xl border transition-all text-start relative overflow-hidden shadow-sm ${
          isDarkMode
            ? 'bg-gradient-to-br from-[#121B1E] via-[#162327] to-[#121B1E] border-teal-800/40 text-white'
            : 'bg-gradient-to-br from-teal-50/60 via-white to-stone-50 border-teal-200/90 text-stone-900'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                {t('Current Learning Focus', 'موضوع الدرس الحالي المقترح', 'Sujet de cours suggéré')}
              </span>
              
              {/* Prominently showing the suggested explanation style */}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-300/60 dark:border-teal-800">
                ✦ {t('Explanation Style:', 'طريقة الشرح المقترحة:', 'Style d\'explication :')} {getPedagogyLabel(activePedagogy)}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white leading-tight">
              {currentSubject}
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-normal max-w-2xl">
              {t(
                'Explore concepts broken down into gentle steps with worked examples, instant speech narration, or visual models based on your selection below.',
                'شرح تفاعلي يفكك المفاهيم المعقدة إلى خطوات مبسطة وأمثلة واقعية، مع إمكانية الاستماع الصوتي أو الشرح المباشر حسب اختيارك.',
                'Explication pas-à-pas adaptée à vos préférences, avec exemples concrets ou narration vocale.'
              )}
            </p>
          </div>

          {/* Launch Lesson Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => onSelectSuite('chat')}
              className="px-6 py-3.5 rounded-2xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-teal-700/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('Start Lesson with AI Tutor', 'بدء الدرس مع المرشد الذكي', 'Démarrer avec le Tuteur')}</span>
              <ChevronRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          4. CONCRETE CHOICES TO SWITCH LEARNING METHOD (Tied to Real Engine)
         ═══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label={t('Switch Learning Methods', 'خيارات ملموسة لطريقة التعلم', 'Changer la méthode d\'apprentissage')}
        className="text-start space-y-3"
      >
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>{t('How do you prefer to understand concepts?', 'كيف تفضل أن نشرح لك المفاهيم؟', 'Comment préférez-vous apprendre ?')}</span>
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              {t('Select any mode below to immediately adjust the AI explanation tone and format.', 'اختر أي أسلوب ليقوم المرشد الذكي بتكييف لغته فورياً بما يوافق راحتك.', 'Sélectionnez un style pour adapter instantanément le tuteur.')}
            </p>
          </div>

          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 hidden sm:inline">
            {t('5 Adaptive Styles', '٥ أساليب ملموسة', '5 styles adaptatifs')}
          </span>
        </div>

        {/* 5 Tangible Pedagogy Choice Pills / Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PEDAGOGY_CHOICES.map((choice) => {
            const isSelected = activePedagogy === choice.id;
            const Icon = choice.icon;
            const label = isAr ? choice.labelAr : isFr ? choice.labelFr : choice.labelEn;
            const desc = isAr ? choice.descAr : isFr ? choice.descFr : choice.descEn;

            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleSelectPedagogy(choice.id)}
                className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex items-start gap-3 relative group ${
                  isSelected
                    ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-600 dark:border-teal-500 shadow-sm ring-1 ring-teal-600 dark:ring-teal-500'
                    : isDarkMode
                    ? 'bg-[#121B1E] border-stone-800 hover:border-teal-700/60 text-stone-200'
                    : 'bg-white border-stone-200 hover:border-teal-400 text-stone-800'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-teal-700 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 group-hover:text-teal-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-black ${isSelected ? 'text-teal-800 dark:text-teal-300' : 'text-stone-900 dark:text-stone-100'}`}>
                      {label}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px] shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed font-normal">
                    {desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          5. FOUR CORE ASSISTIVE TOOLS (Human Names & Clear Descriptions)
         ═══════════════════════════════════════════════════════════════════════ */}
      <section
        id="assistive-suites"
        aria-label={t('Assistive Tools', 'أدوات المساندة المتاحة', 'Outils d\'assistance')}
        className="pt-1 text-start space-y-3"
      >
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('Comprehensive Assistive Ecosystem', 'أدوات المساندة الشاملة المتاحة', 'Outils d\'accessibilité')}</span>
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              {t('Autonomy-focused tools designed for visual, hearing, cognitive, and accommodation needs.', 'أدوات تعزز استقلاليتك وتلبي الاحتياجات البصرية والسمعية والمعرفية والترتيبات الأكاديمية.', 'Outils pour votre autonomie visuelle, auditive et cognitive.')}
            </p>
          </div>

          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 hidden sm:inline">
            {t('Instant 1-Click Launch', 'دخول مباشر بنقرة واحدة', 'Accès direct')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Tool 1: AI Vision Companion */}
          <button
            type="button"
            onClick={() => onSelectSuite('vision')}
            className={`p-5 rounded-3xl border transition-all active:scale-[0.98] shadow-sm flex flex-col justify-between cursor-pointer group text-start min-h-[170px] ${
              isDarkMode
                ? 'bg-[#121B1E] border-stone-800 hover:border-teal-500/60'
                : 'bg-white border-stone-200 hover:border-teal-500 hover:bg-teal-50/20'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-3 group-hover:scale-105 transition-transform">
                <Eye className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-stone-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                {t('AI Vision Companion', 'الرفيق البصري الذكي', 'Compagnon Visuel')}
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                {t(
                  'Currency reader, clothes color matching, face memory, document reader, and haptic cane vibration.',
                  'قارئ العملات الورقية، فحص ألوان الملابس، حفظ وجوه الأشخاص، قراءة المستندات، والنبضات اللمسية بالاهتزاز.',
                  'Lecteur de devises, reconnaissance de visages, couleurs et canne haptique.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400">
              <span>{t('Open Companion', 'تشغيل الرفيق', 'Ouvrir')}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Tool 2: Unified Hearing Center */}
          <button
            type="button"
            onClick={() => onSelectSuite('deaf')}
            className={`p-5 rounded-3xl border transition-all active:scale-[0.98] shadow-sm flex flex-col justify-between cursor-pointer group text-start min-h-[170px] ${
              isDarkMode
                ? 'bg-[#121B1E] border-stone-800 hover:border-teal-500/60'
                : 'bg-white border-stone-200 hover:border-teal-500 hover:bg-teal-50/20'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-3 group-hover:scale-105 transition-transform">
                <Ear className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-stone-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                {t('Unified Hearing Center', 'المركز السمعي الموحد', 'Centre Auditif')}
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                {t(
                  'Live speech-to-text captions, instant voice speaker, express AAC cards, and hazard sound sentinel.',
                  'تفريغ فوري لكلام المتحدث، نطق صوتي للغرفة، بطاقات تواصل ميسرة، ومستشعر أصوات مرتفعة ووميض.',
                  'Sous-titrage direct, synthèse vocale, cartes CAA rapides et alerte sonore.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400">
              <span>{t('Open Center', 'تشغيل المركز', 'Ouvrir')}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Tool 3: Accessible AI Tutor */}
          <button
            type="button"
            onClick={() => onSelectSuite('chat')}
            className={`p-5 rounded-3xl border transition-all active:scale-[0.98] shadow-sm flex flex-col justify-between cursor-pointer group text-start min-h-[170px] ${
              isDarkMode
                ? 'bg-[#121B1E] border-stone-800 hover:border-teal-500/60'
                : 'bg-white border-stone-200 hover:border-teal-500 hover:bg-teal-50/20'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-3 group-hover:scale-105 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-stone-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                {t('Accessible AI Tutor', 'المرشد التعليمي الذكي', 'Tuteur IA Accessible')}
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                {t(
                  'Adaptive pedagogical pace, worked examples, simplified text, visual analogies, and screen-reader support.',
                  'معلم ذكي يتكيف مع استيعابك، يقدم أمثلة عملية وشرحاً متدرجاً، ويدعم قارئات الشاشة تماماً.',
                  'Rythme adaptatif, exemples concrets et compatibilité totale avec les lecteurs d\'écran.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400">
              <span>{t('Launch Tutor', 'بدء الحوار', 'Démarrer')}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Tool 4: Accommodation Passport */}
          <button
            type="button"
            onClick={onOpenPassport}
            className={`p-5 rounded-3xl border transition-all active:scale-[0.98] shadow-sm flex flex-col justify-between cursor-pointer group text-start min-h-[170px] ${
              isDarkMode
                ? 'bg-[#121B1E] border-stone-800 hover:border-teal-500/60'
                : 'bg-white border-stone-200 hover:border-teal-500 hover:bg-teal-50/20'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-3 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-stone-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                {t('Accommodation Passport', 'جواز السفر الميسر', 'Passeport d\'accessibilité')}
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                {t(
                  'Portable record of academic exam arrangements, sensory accommodations, and verification QR code.',
                  'ملفك الشخصي الموحد لتسهيلات الامتحانات، تفضيلات الراحة الحسية، ورمز التحقق للمؤسسات التعليمية.',
                  'Dossier d\'aménagements d\'examens et préférences sensorielles avec QR code.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400">
              <span>{t('View Passport', 'عرض الجواز', 'Voir')}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </button>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          6. SUGGESTED SINGLE TASK OR SHORT MICRO-REVIEW (Calm & Pressure-free)
         ═══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label={t('Calm Activity & Suggested Step', 'النشاط المقترح والتقدم الهادئ', 'Activité suggérée')}
        className={`p-6 sm:p-7 rounded-3xl border transition-all text-start shadow-sm ${
          isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                {t('Suggested Micro-Step (2 mins)', 'خطوة مراجعة قصيرة ومقترحة (دقيقتان)', 'Micro-étape suggérée (2 min)')}
              </h3>
            </div>

            {activeSuggestedReview ? (
              <div>
                <h4 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
                  {resolveConceptTitle(activeSuggestedReview.conceptId, isAr ? 'ar' : isFr ? 'fr' : 'en')}
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {t(
                    'A gentle 1-question check to reinforce memory stability based on the spacing curve. No scores or penalties.',
                    'سؤال واحد خفيف لتثبيت المفهوم في الذاكرة طويلة المدى، دون درجات محبطة أو أي منافسة.',
                    'Une question légère pour consolider votre mémoire à long terme.'
                  )}
                </p>
              </div>
            ) : activeTask ? (
              <div>
                <h4 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
                  {activeTask.title}
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {t(
                    'Your top milestone for today. Mark it when you are ready, entirely at your own pace.',
                    'المهمة الأكاديمية المقترحة لك لليوم. أكملها عندما تكون جاهزاً وبوتيرتك الخاصة.',
                    'Votre prochaine étape du jour. Cochez-la à votre convenance.'
                  )}
                </p>
              </div>
            ) : (
              <div>
                <h4 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
                  {t('All concepts and tasks are up to date!', 'كافة المفاهيم والمهام مستقرة ومحدثة — أحسنت!', 'Tous les concepts sont maîtrisés !')}
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {t(
                    'Take a comfortable break, explore a new topic, or review previous notes at your leisure.',
                    'خذ قسطاً من الراحة، أو استكشف موضوعاً جديداً مع المرشد الذكي براحتك التامة.',
                    'Profitez d\'une pause ou explorez un nouveau sujet avec le tuteur.'
                  )}
                </p>
              </div>
            )}

            {/* Gentle Progress Note */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
              <span className="font-bold text-teal-700 dark:text-teal-400">● {t('Steady progress', 'تقدم هادئ وثابت', 'Rythme serein')}</span>
              <span>·</span>
              <span>{t('Focus on comprehension over speed', 'الأولوية للفهم والراحة، لا للسرعة', 'Priorité à la compréhension')}</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="shrink-0 w-full sm:w-auto">
            {activeSuggestedReview ? (
              <button
                type="button"
                onClick={() => handleStartReview(activeSuggestedReview.conceptId)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('Review Now (2 mins)', 'مراجعة الآن (دقيقتان)', 'Réviser (2 min)')}</span>
              </button>
            ) : activeTask ? (
              <button
                type="button"
                onClick={() => handleToggleTask(activeTask)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-teal-600" />
                <span>{t('Mark as Completed', 'تعليم كمكتملة', 'Marquer terminé')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectSuite('chat')}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>{t('Open AI Tutor', 'متابعة التعلم مع المرشد', 'Ouvrir le Tuteur')}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          MICRO-REVIEW MODAL (1-Question Pressure-free Reinforcement)
         ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeReviewConceptId && reviewQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl space-y-4 text-start ${
                isDarkMode ? 'bg-[#121B1E] border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {t('Micro-Review Check', 'فحص المراجعة السريعة', 'Contrôle de micro-révision')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveReviewConceptId(null)}
                  className="p-1 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 block mb-1">
                  {reviewQuestion.conceptTitle}
                </span>
                <p className="text-sm font-black leading-relaxed">
                  {isAr
                    ? (reviewQuestion.promptAr || reviewQuestion.promptEn)
                    : isFr
                    ? (reviewQuestion.promptFr || reviewQuestion.promptEn)
                    : (reviewQuestion.promptEn || reviewQuestion.promptAr)}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2 pt-2">
                {reviewQuestion.options.map((opt: any, idx: number) => {
                  const isSelected = selectedReviewOption === idx;
                  const isCorrect = reviewSubmitted && idx === reviewQuestion.correctIndex;
                  const isWrong = reviewSubmitted && isSelected && !reviewResult?.isCorrect;
                  const optionLabel = isAr
                    ? (opt.textAr || opt.textEn)
                    : isFr
                    ? (opt.textFr || opt.textEn)
                    : (opt.textEn || opt.textAr);

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={reviewSubmitted}
                      onClick={() => setSelectedReviewOption(idx)}
                      className={`w-full p-3 rounded-2xl border text-start text-xs font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isCorrect
                          ? 'bg-teal-500/20 border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                          : isWrong
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-300 font-bold'
                          : isSelected
                          ? 'bg-teal-100 dark:bg-teal-950/60 border-teal-600 text-teal-800 dark:text-teal-300 font-bold'
                          : isDarkMode
                          ? 'bg-[#162327] border-stone-800 hover:border-stone-600 text-stone-200'
                          : 'bg-stone-50 border-stone-200 hover:border-stone-400 text-stone-800'
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
                    ? 'bg-teal-500/15 border-teal-500/30 text-teal-800 dark:text-teal-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300'
                }`}>
                  <p className="font-black">
                    {reviewResult.isCorrect
                      ? t('🎉 Excellent recall!', '🎉 استرجاع ممتاز وصحيح!', '🎉 Excellent rappel !')
                      : t('💡 Gentle concept reinforcement:', '💡 راجع المفهوم لتثبيته بهدوء:', '💡 Renforcement du concept :')}
                  </p>
                  <p className="leading-relaxed opacity-90">
                    {isAr
                      ? (reviewQuestion.explanationAr || reviewQuestion.explanationEn)
                      : isFr
                      ? (reviewQuestion.explanationFr || reviewQuestion.explanationEn)
                      : (reviewQuestion.explanationEn || reviewQuestion.explanationAr)}
                  </p>
                </div>
              )}

              {/* Footer action */}
              <div className="pt-2 flex justify-end gap-2">
                {!reviewSubmitted ? (
                  <button
                    type="button"
                    disabled={selectedReviewOption === null}
                    onClick={handleSubmitReview}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 disabled:opacity-50 text-white font-black text-xs hover:bg-teal-800 transition-all cursor-pointer"
                  >
                    {t('Check Answer', 'تحقق من الإجابة', 'Vérifier')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveReviewConceptId(null)}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-black text-xs hover:bg-teal-800 transition-all cursor-pointer"
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
