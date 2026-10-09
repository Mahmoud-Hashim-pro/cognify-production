import { localize } from '../lib/translations';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AriaButton } from './ui/AriaButton';
import { UserProfile, AccessibilityMode, Message, LanguagePreference } from '../types';
import { 
  Settings, Eye, Accessibility, Menu, Sparkles, User, Ear, Mic, Flame,
  ArrowLeft, ArrowRight, MessageSquare, Globe, Check, Brain,
  LayoutGrid, Building2, Zap, Radio, Shield, ListFilter, Layers, 
  SlidersHorizontal, CheckCircle2, ChevronRight, Grid, List, BookOpen, ShieldCheck,
  Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanDataForFirestore } from '../lib/firebase';
import { toast } from './Toast';
import type { ChatInterfaceRef } from './ChatInterface';
const VisionCompanionView = React.lazy(() => import('./VisionCompanionView'));
const ChatInterface = React.lazy(() => import('./ChatInterface'));
const OrgDashboard = React.lazy(() => import('./OrgDashboard'));
const CaregiverHub = React.lazy(() => import('./CaregiverHub'));
const AccessibilityPassportModal = React.lazy(() => import('./AccessibilityPassportModal'));
const UnifiedHearingCenter = React.lazy(() => import('./UnifiedHearingCenter'));
const DeafEcosystemView = React.lazy(() => import('./DeafEcosystemView'));
const CrossDisabilityOrchestrator = React.lazy(() => import('./CrossDisabilityOrchestrator'));
import { isAccessibilityUser } from '../lib/access';
import { getTranslation, isArabicLocale } from '../lib/translations';

import StudentCockpitHub from './StudentCockpitHub';

export type DisabilityTab =
  | 'hub'
  | 'chat'
  | 'settings'
  | 'video'
  | 'studio'
  | 'bridge'
  | 'org'
  | 'vision'
  | 'radar'
  | 'caregiver'
  | 'deaf'
  | 'orchestrator';

export type ModuleCategory = 'all' | 'vision' | 'hearing';

interface DisabilityModeViewProps {
  profile: UserProfile;
  onMenuClick: () => void;
  onNavigate?: (view: 'chat' | 'profile' | 'settings' | 'video' | 'disability') => void;
  onQuestionEvaluated?: (score: number, lastMessageSnippet?: string) => void;
  syncMessages?: (updatedHistory: Message[]) => void;
  externalMessage?: string;
  onStreamingUpdate?: (text: string) => void;
  onSTTStateChange?: (active: boolean) => void;
  currentTab?: DisabilityTab;
  onTabChange?: (tab: DisabilityTab) => void;
  setProfile?: (profile: UserProfile) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

/**
 * Auto-detects which suite an accessibility user should land in directly,
 * based on their chosen accessibilityMode (primary) or free-text
 * disabilityType (fallback for older profiles / non-standard entries).
 * Returns 'hub' (the card overview) when nothing maps cleanly — never guess
 * a suite the user didn't actually indicate.
 */
function detectDirectDisabilityTab(_profile: UserProfile): DisabilityTab {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cognify_default_disability_tab') : null;
    if (saved === 'hub' || saved === 'deaf' || saved === 'vision') {
      return saved as DisabilityTab;
    }
  } catch {}

  // Default to student cockpit hub as the primary home
  return 'hub';
}

// Maps a suite tab to its category filter chip, so "Back to Hub" can re-open the
// hub pre-filtered to the single suite the user just left, instead of always
// dumping them into "All Suites" (7 cards) when they only ever use one.
function categoryForTab(tab: DisabilityTab): ModuleCategory {
  switch (tab) {
    case 'vision': return 'vision';
    case 'deaf': return 'hearing';
    default: return 'all';
  }
}

const DisabilityModeView = React.forwardRef<ChatInterfaceRef, DisabilityModeViewProps>(function DisabilityModeView({
  profile,
  onMenuClick,
  onNavigate,
  onQuestionEvaluated,
  syncMessages,
  externalMessage,
  onStreamingUpdate,
  onSTTStateChange,
  currentTab,
  onTabChange,
  setProfile,
  isDarkMode,
  toggleTheme,
}, ref) {
  const [activeTab, setActiveTab] = useState<DisabilityTab>(() => currentTab || detectDirectDisabilityTab(profile));
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const isOrgStaff = !!profile?.isOrgManager && !!(profile?.organization || '').trim();

  // Sync activeTab whenever parent updates currentTab
  useEffect(() => {
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [currentTab]);

  // Tell parent which tab is active
  useEffect(() => { 
    onTabChange?.(activeTab); 
  }, [activeTab, onTabChange]);

  const lastProfileModeRef = useRef<string>(profile?.accessibilityMode || '');
  // Keep activeTab in sync with external profile accessibility mode updates ONLY
  useEffect(() => {
    const currentMode = profile?.accessibilityMode || '';
    if (currentMode && currentMode !== lastProfileModeRef.current) {
      lastProfileModeRef.current = currentMode;
      const directTab = currentTab || detectDirectDisabilityTab(profile);
      setActiveTab(directTab);
    }
  }, [profile?.accessibilityMode, profile?.disabilityType, currentTab]);

  // Set default suite persistently when user chooses a suite
  const handleSelectTab = React.useCallback((tab: DisabilityTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
    if (tab === 'vision' || tab === 'deaf' || tab === 'hub') {
      try {
        localStorage.setItem('cognify_default_disability_tab', tab);
      } catch {}
      let newMode: AccessibilityMode | null = null;
      let newType: string | null = null;
      if (tab === 'vision') { newMode = 'Visual'; newType = 'Visual Impairment'; }
      else if (tab === 'deaf') { newMode = 'Vocal-Deaf'; newType = 'Hearing Impairment'; }

      if (newMode) {
        lastProfileModeRef.current = newMode;
        if (profile?.uid && setProfile) {
          setProfile({ ...profile, accessibilityMode: newMode, disabilityType: newType || profile.disabilityType });
          if (profile.uid !== 'guest-explorer') {
            setDoc(doc(db, `users/${profile.uid}`), cleanDataForFirestore({ accessibilityMode: newMode, disabilityType: newType }), { merge: true }).catch(() => {});
          }
        }
      }
    }
  }, [profile, setProfile, onTabChange]);

  const handleNavigateBack = React.useCallback(() => {
    if (activeTab !== 'hub') {
      setActiveTab('hub');
    } else if (onNavigate) {
      onNavigate('chat');
    } else {
      onMenuClick();
    }
  }, [activeTab, onNavigate, onMenuClick]);

  const SUPPORTED_LANGUAGES: { id: LanguagePreference; label: string; flag: string; nativeName: string }[] = [
    { id: 'French', label: 'French', flag: '🇫🇷', nativeName: 'Français' },
    { id: 'English', label: 'English', flag: '🇬🇧', nativeName: 'English' },
    { id: 'Arabic', label: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
    { id: 'Egyptian Ammiya', label: 'Egyptian Ammiya', flag: '🇪🇬', nativeName: 'مصري' },
    { id: 'Spanish', label: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
    { id: 'German', label: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
    { id: 'Italian', label: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
    { id: 'Portuguese', label: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
    { id: 'Russian', label: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
    { id: 'Chinese', label: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
    { id: 'Japanese', label: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  ];

  const updateLanguage = async (newLang: LanguagePreference) => {
    if (!profile?.uid) return;
    const previousLang = profile.language;
    if (setProfile) setProfile({ ...profile, language: newLang });
    if (profile.uid === 'guest-explorer') {
      toast.success(
        localize(newLang, `Language set to: ${newLang}`, `تم تغيير اللغة إلى: ${newLang}`),
        localize(newLang, 'Language Updated', 'تم تحديث اللغة')
      );
      return;
    }
    const path = `users/${profile.uid}`;
    try {
      await setDoc(doc(db, path), cleanDataForFirestore({ language: newLang }), { merge: true });
      toast.success(
        localize(newLang, `Language set to: ${newLang}`, `تم تغيير اللغة إلى: ${newLang}`),
        localize(newLang, 'Language Updated', 'تم تحديث اللغة')
      );
    } catch (err) {
      console.error('Failed to update language:', err);
      if (setProfile) setProfile({ ...profile, language: previousLang });
      toast.error(
        localize(profile.language, 'Failed to update language.', 'فشل تحديث اللغة.'),
        localize(profile.language, 'Update Error', 'خطأ في التحديث')
      );
    }
  };

  const updateMode = async (mode: AccessibilityMode) => {
    if (!profile?.uid) return;
    const previousMode = profile.accessibilityMode;
    if (setProfile) setProfile({ ...profile, accessibilityMode: mode });
    if (profile.uid === 'guest-explorer') {
      toast.success(
        localize(profile?.language, `Mode set to: ${mode}`, `تم تفعيل نمط: ${mode}`),
        localize(profile?.language, 'Accessibility Mode', 'نمط الوصول')
      );
      return;
    }
    const path = `users/${profile.uid}`;
    try {
      await setDoc(doc(db, path), { accessibilityMode: mode }, { merge: true });
      toast.success(
        localize(profile?.language, `Mode set to: ${mode}`, `تم تفعيل نمط: ${mode}`),
        localize(profile?.language, 'Accessibility Mode', 'نمط الوصول')
      );
    } catch (err) {
      console.error('Failed to update accessibility mode:', err);
      if (setProfile) setProfile({ ...profile, accessibilityMode: previousMode });
      toast.error(
        localize(profile?.language, 'Failed to update accessibility mode.', 'فشل تحديث وضع إمكانية الوصول.'),
        localize(profile?.language, 'Update Error', 'خطأ في التحديث')
      );
    }
  };

  // Grouped Categories Definition
  const CATEGORIES = [
    {
      id: 'all' as const,
      titleEn: 'All Suites',
      titleAr: 'جميع الأدوات',
      emoji: '🌟',
      icon: Sparkles,
      color: 'text-teal-600 dark:text-teal-400',
      activeBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-500/50',
      descAr: 'عرض شامل لجميع أدوات ومنظومات إمكانية الوصول والتكيف',
      descEn: 'Full view of all assistive and adaptation suites',
    },
    {
      id: 'vision' as const,
      titleEn: 'Visual & Blind',
      titleAr: 'المكفوفين وضعاف البصر',
      emoji: '👁️',
      icon: Eye,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
      descAr: 'الرفيق البصري الذكي، قارئ العملات والملابس، حفظ الوجوه، والملاحة بالاهتزاز اللمسي',
      descEn: 'Conversational audio eyes, currency reader, face recall, clothes matching & haptic cane',
    },
    {
      id: 'hearing' as const,
      titleEn: 'Deaf & Hard of Hearing',
      titleAr: 'الصم وضعاف السمع',
      emoji: '👂',
      icon: Ear,
      color: 'text-[#E5A93C]',
      activeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
      descAr: 'تفريغ فوري لكلام المتحدث، نطق صوتي للغرفة، بطاقات تواصل سريعة، ومستشعر أصوات حقيقي في شاشة واحدة',
      descEn: 'Live speech captions, vocal speaker, express AAC cards, and loud sound sentinel in one screen',
    },
  ];

  // Modules metadata definition with Category grouping
  const MODULES = [
    // 1. VISUAL
    {
      id: 'vision' as const,
      category: 'vision' as const,
      titleEn: 'Visual Companion (AI Eyes)',
      titleAr: 'الرفيق البصري الذكي',
      shortEn: 'Visual Eyes',
      shortAr: 'الرفيق البصري',
      badgeEn: 'Blind & Low Vision',
      badgeAr: 'المكفوفين وضعاف البصر',
      descEn: 'Friendly conversational audio companion. Reads Egyptian pounds & currencies, matches clothes colors, recognizes people, and guides with tactile haptic vibration.',
      descAr: 'وصف صوتي بشري فوري، قارئ العملات الورقية (الجنيه المصري والعملات)، تنسيق الملابس، التعرف على الأشخاص والوجوه، والملاحة اللمسية بالاهتزاز.',
      quickFeaturesAr: ['قارئ العملات الفوري', 'التعرف على الأشخاص والوجوه', 'تنسيق ألوان الملابس', 'ملاحة واهتزازات لمسية', 'الذاكرة المكانية للأشياء'],
      quickFeaturesEn: ['Currency Reader', 'Face & Person Memory', 'Color Matching', 'Haptic White Cane', 'Spatial Memory'],
      Icon: Eye,
      accentColor: 'text-emerald-400',
      borderGlow: 'hover:border-emerald-500/60 border-stone-200 dark:border-stone-800',
      bgGlow: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      buttonCls: 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 shadow-teal-500/20',
      matchingMode: 'Visual',
    },
    // 2. HEARING (Unified 3D Sign & Hearing Studio)
    {
      id: 'deaf' as const,
      category: 'hearing' as const,
      titleEn: 'Unified 3D Sign & Hearing Studio',
      titleAr: 'استوديو لغة الإشارة 3D والمحطة السمعية',
      shortEn: '3D Sign Studio',
      shortAr: 'استوديو الإشارة 3D',
      badgeEn: 'Deaf & Hard of Hearing',
      badgeAr: 'الصم وضعاف السمع',
      descEn: 'Unified 1-screen 3D sign language and deaf assistive studio: Interactive 3D Sign Avatar, direct script-to-sign, live camera sign recognition, and instant speech.',
      descAr: 'استوديو ومحطة إشارة ميسرة موحدة في شاشة واحدة: أفاتار تفاعلي 3D، ترجمة النصوص للإشارة مباشرة، وقراءة إشارات اليدين بالكاميرا وتحويلها لصوت فوري.',
      quickFeaturesAr: ['🤟 أفاتار تفاعلي للغة الإشارة 3D', '📝 ترجمة النصوص للإشارة مباشرة', '📷 قراءة إشارات اليدين بالكاميرا', '🔊 نطق صوتي فوري مباشر'],
      quickFeaturesEn: ['🤟 3D Interactive Sign Avatar', '📝 Direct Script-to-Sign', '📷 Live Camera Hand Tracking', '🔊 Instant Voice Speaker'],
      Icon: Ear,
      accentColor: 'text-teal-600 dark:text-teal-400',
      borderGlow: 'hover:border-teal-500/80 border-stone-200 dark:border-stone-800 ring-1 ring-teal-500/20',
      bgGlow: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
      buttonCls: 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm',
      matchingMode: 'Sign-Only',
    },
    {
      id: 'chat' as const,
      category: 'all' as const,
      titleEn: 'Adaptive Cognitive Tutor',
      titleAr: 'المساعد التعليمي الذكي المهيأ',
      shortEn: 'Adaptive Tutor',
      shortAr: 'المساعد المهيأ',
      badgeEn: 'All Learners',
      badgeAr: 'دعم إدراكي متكيف',
      descEn: 'Pedagogical tutoring assistant tailored to individual cognitive speed, worked examples, and screen-reader accessible plain text.',
      descAr: 'مساعد تعليمي ذكي يتكيف مع وتيرتك واستيعابك، يقدم شرحاً خطوة بخطوة ومتوافق مع قارئات الشاشة والأجهزة المساعدة.',
      quickFeaturesAr: ['تكيف مع سرعة الاستيعاب', 'شرح خطوة بخطوة', 'دعم قارئات الشاشة بالكامل'],
      quickFeaturesEn: ['Adaptive Pace', 'Step-by-Step Guidance', 'Full Screen Reader Support'],
      Icon: MessageSquare,
      accentColor: 'text-teal-600 dark:text-teal-400',
      borderGlow: 'hover:border-teal-500/60 border-stone-200 dark:border-stone-800',
      bgGlow: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
      buttonCls: 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm',
      matchingMode: 'None',
    },
    {
      id: 'settings' as const,
      category: 'all' as const,
      titleEn: 'Preferences & Dialects',
      titleAr: 'التفضيلات واللغات',
      shortEn: 'Settings',
      shortAr: 'الإعدادات',
      badgeEn: '11 Dialects & Options',
      badgeAr: 'اللغات وأنماط الوصول',
      descEn: 'Customize system languages (including Egyptian Ammiya), choose active accessibility profiles, and adjust display settings.',
      descAr: 'اختيار لغة النظام واللهجة المصرية المحكية، تفعيل ملفات إمكانية الوصول الخاصة، وضبط التباين العالي بما يلائم احتياجاتك.',
      quickFeaturesAr: ['11 لغة ولهجة محكية', 'تفعيل الأنماط المخصصة', 'التحكم في التباين'],
      quickFeaturesEn: ['11 Languages & Dialects', 'Custom Profile Activation', 'Contrast Options'],
      Icon: Settings,
      accentColor: 'text-stone-600 dark:text-stone-300',
      borderGlow: 'hover:border-stone-400 dark:hover:border-stone-600 border-stone-200 dark:border-stone-800',
      bgGlow: 'bg-stone-100 dark:bg-[#162327] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700',
      buttonCls: 'bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-700',
      matchingMode: '',
    },
    ...(isOrgStaff ? [{
      id: 'org' as const,
      category: 'all' as const,
      titleEn: 'My Organization Hub',
      titleAr: 'لوحة تحكم الجمعية / المؤسسة',
      shortEn: 'Org Hub',
      shortAr: 'المؤسسة',
      badgeEn: 'Charity & NGO Staff Portal',
      badgeAr: 'خاص بمشرفي الجمعيات والمؤسسات',
      descEn: 'Cohort analytics, enrolled special-needs learners, cognitive distributions, and accessibility adoption reports for your registered organization.',
      descAr: 'متابعة وإدارة طلاب الجمعية المسجلين، إحصائيات مستويات الاستيعاب المعرفي، ومعدلات تفعيل تقنيات إمكانية الوصول.',
      quickFeaturesAr: ['إحصائيات طلاب المؤسسة', 'تقارير تبني أدوات الوصول'],
      quickFeaturesEn: ['Cohort Analytics', 'Adoption Reports'],
      Icon: Building2,
      accentColor: 'text-teal-400',
      borderGlow: 'hover:border-teal-500/60 border-stone-200 dark:border-stone-800',
      bgGlow: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      buttonCls: 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-teal-500/20',
      matchingMode: '',
    }] : []),
  ];

  // Whether a module card is the one the user's accessibilityMode actually lands them
  // in — kept in sync with detectDirectDisabilityTab's mapping (Vocal-Deaf/Sign-Only -> deaf)
  // so the "Active Mode" badge and quick-launch card never point at a different suite.
  const isModuleActiveForProfile = (m: (typeof MODULES)[number]) => {
    if (!profile.accessibilityMode || profile.accessibilityMode === 'None') return false;
    if (m.matchingMode === profile.accessibilityMode) return true;
    if (m.id === 'deaf' && (profile.accessibilityMode === 'Sign-Only' || profile.accessibilityMode === 'Vocal-Deaf')) return true;
    return false;
  };

  // Filter modules based on selectedCategory
  const filteredModules = useMemo(() => {
    if (selectedCategory === 'all') return MODULES;
    return MODULES.filter((m) => m.category === selectedCategory);
  }, [selectedCategory, MODULES]);

  const isAr = profile.language === 'Arabic' || profile.language === 'Egyptian Ammiya';
  const isDeafActive = activeTab === 'deaf' || activeTab === 'radar' || activeTab === 'bridge' || activeTab === 'studio' || activeTab === 'video';

  // Current active module metadata for sibling bar
  const currentModule = MODULES.find((m) => m.id === (isDeafActive ? 'deaf' : activeTab));
  const siblingModules = useMemo(() => {
    if (isDeafActive || !currentModule || currentModule.category === 'all') return [];
    return MODULES.filter((m) => m.category === currentModule.category);
  }, [isDeafActive, currentModule, MODULES]);

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className={`flex-1 flex flex-col h-full overflow-hidden relative select-none transition-colors duration-300 ${isDarkMode ? 'bg-[#0E1416] text-stone-100' : 'bg-[#FAF8F5] text-stone-900'}`}>
      
      {/* ── TOP NAVIGATION BAR (Always visible for seamless cross-disability jumping) ── */}
      <header className={`relative z-[9995] px-3 py-2 sm:px-6 sm:py-3 shrink-0 flex items-center justify-between border-b transition-colors duration-300 ${
        isDarkMode 
          ? 'border-stone-800 bg-[#0E1416]/95 backdrop-blur-xl shadow-lg text-white' 
          : 'border-stone-200/90 bg-white/95 backdrop-blur-xl shadow-sm text-stone-900'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          {/* Main App Menu Drawer Button */}
          <AriaButton
            onPress={() => {
              if (isAccessibilityUser(profile) || !onNavigate) onMenuClick();
              else onNavigate('chat');
            }}
            aria-label={isAccessibilityUser(profile)
              ? localize(profile.language, 'Open menu', 'افتح القائمة')
              : getTranslation(profile.language, 'back')}
            className={`p-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer shrink-0 ${
              isDarkMode
                ? 'text-stone-300 bg-[#162327] border border-stone-800 hover:text-white hover:bg-stone-800'
                : 'text-stone-700 bg-stone-100 border border-stone-200 hover:text-stone-950 hover:bg-stone-200'
            }`}
          >
            {isAccessibilityUser(profile)
              ? <Menu className="w-4 h-4" />
              : <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />}
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
              {isAccessibilityUser(profile)
                ? localize(profile.language, 'Menu', 'القائمة')
                : getTranslation(profile.language, 'back')}
            </span>
          </AriaButton>

          {/* Primary Disability Mode Switcher: Instant, Uncluttered, Accessible Across All Suites */}
          <div
            role="tablist"
            aria-label={localize(profile.language, 'Primary Accessibility Suites', 'منظومات الإتاحة الرئيسية')}
            className={`flex items-center p-1 rounded-2xl shadow-inner gap-1 outline-none overflow-x-auto custom-scrollbar transition-colors ${
              isDarkMode
                ? 'bg-[#121B1E] border border-stone-800'
                : 'bg-stone-100/90 border border-stone-200'
            }`}
          >
            {[
              { id: 'hub' as const, labelAr: 'الرئيسية', labelEn: 'Hub', Icon: LayoutGrid },
              { id: 'chat' as const, labelAr: 'المرشد الذكي', labelEn: 'AI Tutor', Icon: Brain },
              { id: 'vision' as const, labelAr: 'البصري', labelEn: 'Visual', Icon: Eye },
              { id: 'deaf' as const, labelAr: 'السمعي', labelEn: 'Hearing', Icon: Ear },
            ].map((suite) => {
              const isSelected = suite.id === 'deaf' ? isDeafActive : activeTab === suite.id;
              return (
                <button
                  key={suite.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectTab(suite.id)}
                  className={`px-2.5 sm:px-3 min-h-[38px] sm:min-h-[40px] py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer outline-none shrink-0 ${
                    isSelected
                      ? 'bg-teal-700 text-white font-black shadow-sm'
                      : isDarkMode
                        ? 'text-stone-300 hover:text-white hover:bg-stone-800'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/80'
                  } focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${isDarkMode ? 'focus-visible:ring-offset-stone-900' : 'focus-visible:ring-offset-white'}`}
                >
                  <suite.Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{localize(profile.language, suite.labelEn, suite.labelAr)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Header Status / Sibling Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sibling module pills when inside a suite */}
          {activeTab !== 'hub' && siblingModules.length > 1 ? (
            <div
              role="tablist"
              aria-label={localize(profile.language, 'Suite Sub-modules', 'أقسام المنظومة')}
              className={`flex items-center p-1 rounded-xl max-w-[280px] sm:max-w-md overflow-x-auto custom-scrollbar gap-1 outline-none transition-colors ${
                isDarkMode ? 'bg-[#121B1E] border border-stone-800' : 'bg-stone-100 border border-stone-200'
              }`}
            >
              {siblingModules.map((m) => {
                const isSelected = activeTab === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(m.id as DisabilityTab)}
                    className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer outline-none ${
                      isSelected
                        ? 'bg-teal-700 text-white font-black shadow-sm'
                        : isDarkMode
                          ? 'text-stone-300 hover:text-white'
                          : 'text-stone-600 hover:text-stone-950'
                    } focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 ${isDarkMode ? 'focus-visible:ring-offset-stone-900' : 'focus-visible:ring-offset-white'}`}
                  >
                    <span
                      title={localize(profile.language, m.titleEn, m.titleAr)}
                      className="flex items-center gap-1.5"
                    >
                      <m.Icon className="w-3.5 h-3.5" />
                      <span>{localize(profile.language, m.shortEn, m.shortAr)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Standard accessibility utilities: Theme toggle, Passport & Settings */
            <div className="flex items-center gap-1.5 sm:gap-2">
              {toggleTheme && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`p-2 sm:p-2.5 min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-xl border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer shrink-0 ${
                    isDarkMode
                      ? 'text-amber-400 bg-[#162327] border-stone-800 hover:bg-stone-800'
                      : 'text-stone-600 bg-stone-100 border-stone-200 hover:bg-stone-200'
                  }`}
                  title={isDarkMode ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي'}
                  aria-label="Toggle light or dark theme"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              <AriaButton
                onPress={() => setShowPassportModal(true)}
                aria-label={localize(profile.language, 'Universal Accessibility Passport', 'جواز السفر الميسر الشامل')}
                className={`px-2.5 sm:px-3.5 min-h-[38px] sm:min-h-[44px] py-1.5 sm:py-2 rounded-xl ${
                  isDarkMode
                    ? 'bg-teal-950/40 border-teal-800 text-teal-300 hover:bg-teal-900/60'
                    : 'bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100 font-bold'
                } border transition-all text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer`}
              >
                <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                <span className="hidden sm:inline">{localize(profile.language, 'Accommodation Passport', 'جواز السفر الميسر')}</span>
              </AriaButton>
              <AriaButton
                onPress={() => setActiveTab('settings')}
                aria-label={localize(profile.language, 'Settings & Languages', 'الإعدادات واللغات')}
                className={`p-2 sm:p-2.5 min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center ${
                  isDarkMode
                    ? 'text-stone-300 hover:text-white bg-[#162327] border-stone-800'
                    : 'text-stone-700 hover:text-stone-950 bg-stone-100 border-stone-200 hover:bg-stone-200'
                } border rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer shrink-0`}
              >
                <Settings className="w-4 h-4" />
              </AriaButton>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative pb-16 md:pb-0">
        <AnimatePresence mode="wait">

          {/* ═════════════════════════════════════════════════════════════════════
              VIEW: DISABILITY MODULES HUB & LAUNCHER
             ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'hub' && (
            <motion.div
              key="hub-cockpit-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center overflow-y-auto p-4 sm:p-6 md:p-8 select-none custom-scrollbar"
            >
              <StudentCockpitHub
                profile={profile}
                onSelectSuite={(suiteId) => handleSelectTab(suiteId)}
                onOpenPassport={() => setShowPassportModal(true)}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                onSTTStateChange={onSTTStateChange}
                setProfile={setProfile}
              />
            </motion.div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              ACTIVE MODULE VIEWS (CLEAN & DEDICATED)
             ═════════════════════════════════════════════════════════════════════ */}

          {activeTab === 'vision' && (
            <motion.div
              key="vision-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <React.Suspense fallback={
                <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <VisionCompanionView profile={profile} setProfile={setProfile} />
              </React.Suspense>
            </motion.div>
          )}

          {isDeafActive && (
            <motion.div
              key="deaf-unified-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <React.Suspense fallback={
                <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <UnifiedHearingCenter
                  profile={profile}
                  onNavigateBack={handleNavigateBack}
                  onMenuClick={onMenuClick}
                  isDarkMode={isDarkMode}
                />
              </React.Suspense>
            </motion.div>
          )}

          {activeTab === 'caregiver' && (
            <motion.div
              key="caregiver-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <React.Suspense fallback={
                <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
                  <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <CaregiverHub
                  profile={profile}
                  onNavigateBack={handleNavigateBack}
                  setProfile={setProfile}
                  onOpenPassport={() => setShowPassportModal(true)}
                />
              </React.Suspense>
            </motion.div>
          )}

          {activeTab === 'orchestrator' && (
            <motion.div
              key="orchestrator-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <React.Suspense fallback={
                <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
                  <div className="w-8 h-8 border-2 border-[#E5A93C] border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <CrossDisabilityOrchestrator
                  profile={profile}
                  onNavigateBack={handleNavigateBack}
                  onMenuClick={onMenuClick}
                />
              </React.Suspense>
            </motion.div>
          )}

          {activeTab === 'org' && (
            <motion.div
              key="org-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <React.Suspense fallback={
                <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
                  <div className="w-8 h-8 border-2 border-[#E5A93C] border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <OrgDashboard profile={profile} />
              </React.Suspense>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0 flex flex-col p-3 sm:p-4 md:p-6 lg:p-8 pb-0"
            >
              <div className="flex-1 min-h-0 bg-white dark:bg-[#0E1416] rounded-t-3xl shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden relative flex flex-col">
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-stone-400">
                    <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <ChatInterface
                    ref={ref}
                    profile={profile}
                    onQuestionEvaluated={onQuestionEvaluated || (() => {})}
                    syncMessages={syncMessages || (() => {})}
                    onMenuClick={onMenuClick}
                    externalMessage={externalMessage}
                    onStreamingUpdate={onStreamingUpdate}
                    onSTTStateChange={onSTTStateChange}
                    isEmbedded={true}
                    setProfile={setProfile}
                  />
                </React.Suspense>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-10"
            >
              <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Language Selection Card */}
                <div className="bg-white dark:bg-[#121B1E] border border-stone-200 dark:border-stone-800 p-6 sm:p-8 rounded-[28px] shadow-sm backdrop-blur-xl">
                  <div className="mb-6 text-start">
                    <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 mb-1">
                      <Globe className="w-5 h-5" />
                      <h2 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">
                        {localize(profile.language, 'Language Selection', 'اختيار اللغة')}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                      {localize(
                        profile.language,
                        'Choose your preferred system & AI communication language',
                        'اختر لغة النظام والتواصل مع المساعد الذكي'
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = profile.language === lang.id;
                      return (
                        <button
                          key={lang.id}
                          onClick={() => updateLanguage(lang.id)}
                          className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between transition-all active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 shadow-sm text-teal-800 dark:text-teal-300 font-bold'
                              : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#162327] hover:border-teal-500 text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg shrink-0">{lang.flag}</span>
                            <div className="text-start truncate">
                              <p className="text-xs font-bold leading-none">{lang.nativeName}</p>
                              <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">{lang.label}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accessibility Mode Selector */}
                <div className="bg-white dark:bg-[#121B1E] border border-stone-200 dark:border-stone-800 p-6 sm:p-8 rounded-[28px] shadow-sm backdrop-blur-xl">
                  <div className="mb-6 text-start">
                    <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 mb-1">
                      <Accessibility className="w-5 h-5" />
                      <h2 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">
                        {localize(profile.language, 'Accessibility Accommodations', 'تسهيلات إمكانية الوصول')}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                      {localize(
                        profile.language,
                        'Select the accessibility profile that best fits your interaction needs.',
                        'اختر ملف التسهيلات الذي يناسب احتياجاتك التفاعلية على النحو الأمثل.'
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { mode: 'None' as const, labelEn: 'Standard', labelAr: 'الوضع القياسي', icon: User },
                      { mode: 'Speech' as const, labelEn: 'Speech & Audio', labelAr: 'الصوت والنسخ الصوتي', icon: Mic },
                      { mode: 'Visual' as const, labelEn: 'Visual & Screen Adaptation', labelAr: 'التكيف البصري وضعاف البصر', icon: Eye },
                      { mode: 'Vocal-Deaf' as const, labelEn: 'Vocal-Deaf Bridge', labelAr: 'الصم المتحدثين وجسر السمع', icon: Ear },
                      { mode: 'Sign-Only' as const, labelEn: 'Sign Language', labelAr: 'لغة الإشارة التفاعلية', icon: Accessibility },
                    ].map(({ mode, labelEn, labelAr, icon: ModeIcon }) => {
                      const isSelected = profile.accessibilityMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => updateMode(mode)}
                          className={`p-4 rounded-2xl border text-start flex items-start gap-3 transition-all active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 shadow-sm ring-1 ring-teal-600'
                              : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#162327] hover:border-stone-300 dark:hover:border-stone-700 text-stone-800 dark:text-stone-300'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-teal-700 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}>
                            <ModeIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-stone-900 dark:text-white">{localize(profile.language, labelEn, labelAr)}</span>
                              {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                            </div>
                            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                              {mode === 'None' && localize(profile.language, 'Standard cognitive experience without overlays.', 'واجهة قياسية طبيعية.')}
                              {mode === 'Speech' && localize(profile.language, 'Voice synthesis, continuous STT, and spoken narration.', 'نطق صوتي، وتفريغ صوتي مستمر.')}
                              {mode === 'Visual' && localize(profile.language, 'Spoken scene description, currency reader, and haptic white cane.', 'وصف بصري فوري، قارئ عملات، ونبضات لمسية.')}
                              {mode === 'Vocal-Deaf' && localize(profile.language, 'High-contrast text captions and direct two-way bridge.', 'نصوص متباينة وتواصل مباشر.')}
                              {mode === 'Sign-Only' && localize(profile.language, '3D sign avatar, reverse sign-to-speech, and sign lexicons.', 'أفاتار إشارة ونطق الإشارة لصوت.')}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Universal Accessibility Passport Modal */}
      <AccessibilityPassportModal
        isOpen={showPassportModal}
        onClose={() => setShowPassportModal(false)}
        profile={profile}
        setProfile={setProfile}
      />

      {/* ── MOBILE BOTTOM NAVIGATION BAR (Comfortable thumb reach on phones) ── */}
      <nav
        aria-label={localize(profile.language, 'Mobile Bottom Navigation', 'شريط التنقل السفلي للهاتف')}
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 py-1.5 border-t backdrop-blur-md flex items-center justify-around shadow-lg transition-colors ${
          isDarkMode
            ? 'bg-[#0E1416]/95 border-stone-800 text-stone-300'
            : 'bg-white/95 border-stone-200/90 text-stone-700'
        }`}
      >
        {[
          { id: 'hub' as const, labelAr: 'الرئيسية', labelEn: 'Hub', icon: LayoutGrid },
          { id: 'chat' as const, labelAr: 'المرشد', labelEn: 'Tutor', icon: Brain },
          { id: 'vision' as const, labelAr: 'البصري', labelEn: 'Vision', icon: Eye },
          { id: 'deaf' as const, labelAr: 'السمعي', labelEn: 'Hearing', icon: Ear },
        ].map((item) => {
          const isSelected = item.id === 'deaf' ? isDeafActive : activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'text-teal-700 dark:text-teal-400 font-black'
                  : 'hover:text-stone-950 dark:hover:text-white opacity-75'
              }`}
            >
              <div className={`p-1 rounded-lg ${isSelected ? 'bg-teal-50 dark:bg-teal-950/60' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight font-bold mt-0.5">
                {localize(profile.language, item.labelEn, item.labelAr)}
              </span>
            </button>
          );
        })}

        {/* Passport quick access on mobile */}
        <button
          type="button"
          onClick={() => setShowPassportModal(true)}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer text-teal-700 dark:text-teal-400 hover:opacity-100 opacity-80"
        >
          <div className="p-1 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight font-bold mt-0.5">
            {localize(profile.language, 'Passport', 'الجواز')}
          </span>
        </button>
      </nav>
    </div>
  );
});

export default DisabilityModeView;
