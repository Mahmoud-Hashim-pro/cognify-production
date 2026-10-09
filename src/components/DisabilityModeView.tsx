import { localize } from '../lib/translations';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AriaButton } from './ui/AriaButton';
import { UserProfile, AccessibilityMode, Message, LanguagePreference } from '../types';
import { 
  Settings, Eye, Accessibility, Menu, Sparkles, User, Ear, Mic, Flame,
  ArrowLeft, ArrowRight, MessageSquare, Globe, Check, Brain,
  LayoutGrid, Building2, Zap, Radio, Shield, ListFilter, Layers, 
  SlidersHorizontal, CheckCircle2, ChevronRight, Grid, List, BookOpen, ShieldCheck
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

import BurgundyConstellationHero from './BurgundyConstellationHero';
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
      color: 'text-[#E5A93C]',
      activeBg: 'bg-[#4A1224]/50 text-[#E5A93C] border-[#E5A93C]/50',
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
      borderGlow: 'hover:border-emerald-500/60 border-[#4A1224]/60',
      bgGlow: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      buttonCls: 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 shadow-teal-500/20',
      matchingMode: 'Visual',
    },
    // 2. HEARING (Unified Deaf & Hearing Center)
    {
      id: 'deaf' as const,
      category: 'hearing' as const,
      titleEn: 'Unified Deaf & Hearing Center',
      titleAr: 'المركز السمعي الموحد (الصم وضعاف السمع)',
      shortEn: 'Hearing Center',
      shortAr: 'المركز السمعي',
      badgeEn: 'Deaf & Hard of Hearing',
      badgeAr: 'الصم وضعاف السمع',
      descEn: 'Unified 1-screen deaf assistive center: Live speech-to-text captions, instant voice speaker, express AAC cards, and real loud sound hazard sentinel.',
      descAr: 'مركز تيسير سمعي موحد في شاشة واحدة: تفريغ كلام فوري، نطق صوتي للغرفة، بطاقات تواصل سريعة، ومستشعر أصوات مرتفعة ومخاطر حقيقي.',
      quickFeaturesAr: ['🎙️ تفريغ كلام المتحدث فورياً', '🔊 تحدث بالصوت للغرفة', '⚡ بطاقات تواصل ومواقف ناطقة', '🚨 كاشف أصوات مرتفعة ووميض حقيقي'],
      quickFeaturesEn: ['🎙️ Live Speech Captions', '🔊 Text-to-Speech Voice', '⚡ Express AAC Cards', '🚨 Real Loud Sound Strobe'],
      Icon: Ear,
      accentColor: 'text-[#E5A93C]',
      borderGlow: 'hover:border-indigo-500/80 border-[#E5A93C]/30 ring-1 ring-indigo-500/20',
      bgGlow: 'bg-indigo-500/15 text-[#E5A93C] border-[#E5A93C]/30',
      buttonCls: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-600 text-white shadow-indigo-500/25',
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
      accentColor: 'text-[#E5A93C]',
      borderGlow: 'hover:border-[#E5A93C]/60 border-[#4A1224]/60',
      bgGlow: 'bg-[#4A1224]/30 text-[#E5A93C] border-[#E5A93C]/30',
      buttonCls: 'bg-gradient-to-r from-amber-400 via-[#E5A93C] to-rose-600 text-white shadow-[#E5A93C]/20',
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
      accentColor: 'text-slate-300',
      borderGlow: 'hover:border-slate-600 border-[#4A1224]/60',
      bgGlow: 'bg-[#150917]/80 text-slate-300 border-[#4A1224]/50',
      buttonCls: 'bg-slate-800 hover:bg-slate-700 text-white border border-[#4A1224]/50',
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
      borderGlow: 'hover:border-teal-500/60 border-[#4A1224]/60',
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
    <div dir={isAr ? 'rtl' : 'ltr'} className={`flex-1 flex flex-col h-full overflow-hidden relative select-none transition-colors duration-300 ${isDarkMode ? 'bg-[#080409] text-slate-100' : 'bg-[#FAF8F5] text-slate-900'}`}>
      
      {/* ── TOP NAVIGATION BAR (Always visible for seamless cross-disability jumping) ── */}
      <header className={`relative z-[9995] px-3 py-2 sm:px-6 sm:py-3 shrink-0 flex items-center justify-between border-b transition-colors duration-300 ${
        isDarkMode 
          ? 'border-[#4A1224]/60 bg-[#0E0610]/95 backdrop-blur-xl shadow-lg text-white' 
          : 'border-amber-200/80 bg-white/95 backdrop-blur-xl shadow-sm text-slate-900'
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
            className={`p-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93C] cursor-pointer shrink-0 ${
              isDarkMode
                ? 'text-slate-400 bg-[#150917] border border-[#4A1224]/60 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 bg-amber-50/80 border border-amber-200 hover:text-slate-950 hover:bg-amber-100'
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
                ? 'bg-[#150917] border border-[#4A1224]/60'
                : 'bg-amber-50/90 border border-amber-200'
            }`}
          >
            {[
              { id: 'hub' as const, labelAr: 'الرئيسية', labelEn: 'Hub', Icon: LayoutGrid },
              { id: 'vision' as const, labelAr: 'بصرية', labelEn: 'Visual', Icon: Eye },
              { id: 'deaf' as const, labelAr: 'سمعية', labelEn: 'Hearing', Icon: Ear },
              { id: 'chat' as const, labelAr: 'المعلم الذكي', labelEn: 'AI Tutor', Icon: Brain },
            ].map((suite) => {
              const isSelected = suite.id === 'deaf' ? isDeafActive : activeTab === suite.id;
              return (
                <button
                  key={suite.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectTab(suite.id)}
                  className={`px-2 sm:px-3 min-h-[38px] sm:min-h-[40px] py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer outline-none shrink-0 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : isDarkMode
                        ? 'text-slate-300 hover:text-white hover:bg-[#150917]/70'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-amber-100/80'
                  } focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${isDarkMode ? 'focus-visible:ring-offset-slate-900' : 'focus-visible:ring-offset-white'}`}
                >
                  <suite.Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{localize(profile.language, suite.labelEn, suite.labelAr)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Header Status / Sibling Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Sibling module pills when inside a suite */}
          {activeTab !== 'hub' && siblingModules.length > 1 ? (
            <div
              role="tablist"
              aria-label={localize(profile.language, 'Suite Sub-modules', 'أقسام المنظومة')}
              className={`flex items-center p-1 rounded-xl max-w-[280px] sm:max-w-md overflow-x-auto custom-scrollbar gap-1 outline-none transition-colors ${
                isDarkMode ? 'bg-[#150917] border border-[#4A1224]/60' : 'bg-amber-50/90 border border-amber-200'
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
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : isDarkMode
                          ? 'text-slate-300 hover:text-white'
                          : 'text-slate-600 hover:text-slate-950'
                    } focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 ${isDarkMode ? 'focus-visible:ring-offset-slate-900' : 'focus-visible:ring-offset-white'}`}
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
            /* Standard accessibility utilities: Passport & Settings */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <AriaButton
                onPress={() => setShowPassportModal(true)}
                aria-label={localize(profile.language, 'Universal Accessibility Passport', 'جواز السفر الميسر الشامل')}
                className={`px-2.5 sm:px-3.5 min-h-[38px] sm:min-h-[44px] py-1.5 sm:py-2 rounded-xl ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border-amber-500/40 text-amber-200 hover:text-white hover:bg-amber-500/30'
                    : 'bg-amber-100/80 border-amber-400/80 text-amber-950 hover:bg-amber-100 hover:text-black font-extrabold'
                } border transition-all text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="hidden sm:inline">{localize(profile.language, 'Accommodation Passport', 'جواز السفر الميسر')}</span>
              </AriaButton>
              <AriaButton
                onPress={() => setActiveTab('settings')}
                aria-label={localize(profile.language, 'Settings & Languages', 'الإعدادات واللغات')}
                className={`p-2 sm:p-2.5 min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center ${
                  isDarkMode
                    ? 'text-slate-300 hover:text-white bg-[#150917] border-[#4A1224]/60'
                    : 'text-slate-700 hover:text-slate-950 bg-amber-50/90 border-amber-200 hover:bg-amber-100'
                } border rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer shrink-0`}
              >
                <Settings className="w-4 h-4" />
              </AriaButton>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">

          {/* ═════════════════════════════════════════════════════════════════════
              VIEW: DISABILITY MODULES HUB & LAUNCHER
             ═════════════════════════════════════════════════════════════════════ */}
          {/* ═════════════════════════════════════════════════════════════════════
              VIEW: CLEAN DIRECT ACCESSIBILITY SUITE SELECTOR (NO CARD CLUTTER)
             ═════════════════════════════════════════════════════════════════════ */}
          {/* ═════════════════════════════════════════════════════════════════════
              VIEW: ROYAL BURGUNDY CONSTELLATION HERO & ASSISTIVE SUITES HUB
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
              <div className="flex-1 min-h-0 bg-[#0E0610] rounded-t-3xl shadow-2xl border border-[#4A1224]/60 overflow-hidden relative flex flex-col">
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
                    <div className="w-8 h-8 border-2 border-[#E5A93C] border-t-transparent rounded-full animate-spin" />
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
                <div className="bg-[#150917]/90 border border-[#4A1224]/60 p-6 sm:p-8 rounded-[28px] shadow-2xl backdrop-blur-xl">
                  <div className="mb-6 text-start">
                    <div className="flex items-center gap-2 text-[#E5A93C] mb-1">
                      <Globe className="w-5 h-5" />
                      <h2 className="text-xl font-black text-white tracking-tight">
                        {localize(profile.language, 'Language Selection', 'اختيار اللغة')}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400">
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
                          className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between transition-all active:scale-95 ${
                            isSelected
                              ? 'border-[#E5A93C] bg-[#4A1224]/40 shadow-sm text-[#E5A93C] font-bold'
                              : 'border-[#4A1224]/60 bg-[#150917] hover:border-[#4A1224]/50 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg shrink-0">{lang.flag}</span>
                            <div className="text-start truncate">
                              <p className="text-xs font-bold leading-none">{lang.nativeName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lang.label}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#E5A93C] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accessibility Mode Selector */}
                <div className="bg-[#150917]/90 border border-[#4A1224]/60 p-6 sm:p-8 rounded-[28px] shadow-2xl backdrop-blur-xl">
                  <div className="mb-6 text-start">
                    <div className="flex items-center gap-2 text-[#E5A93C] mb-1">
                      <Accessibility className="w-5 h-5" />
                      <h2 className="text-xl font-black text-white tracking-tight">
                        {localize(profile.language, 'Accessibility Accommodations', 'تسهيلات إمكانية الوصول')}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400">
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
                          className={`p-4 rounded-2xl border text-start flex items-start gap-3 transition-all active:scale-95 ${
                            isSelected
                              ? 'border-[#E5A93C] bg-[#4A1224]/40 shadow-sm ring-1 ring-[#E5A93C]'
                              : 'border-[#4A1224]/60 bg-[#150917] hover:border-[#4A1224]/50 text-slate-300'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-[#4A1224]/50 text-[#E5A93C]' : 'bg-slate-800 text-slate-400'}`}>
                            <ModeIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-white">{localize(profile.language, labelEn, labelAr)}</span>
                              {isSelected && <Check className="w-4 h-4 text-[#E5A93C] shrink-0" />}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
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
    </div>
  );
});

export default DisabilityModeView;
