import { localize } from '../lib/translations';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AriaButton } from './ui/AriaButton';
import { UserProfile, AccessibilityMode, Message, LanguagePreference } from '../types';
import { 
  Settings, Eye, Accessibility, Menu, Sparkles, User, Ear, Mic, Flame,
  ArrowLeft, ArrowRight, MessageSquare, Globe, Check, Brain,
  Building2, Zap, Radio, Shield, ListFilter, Layers, 
  SlidersHorizontal, CheckCircle2, ChevronRight, Grid, List, BookOpen, ShieldCheck,
  Sun, Moon,
  ScanLine, Banknote, Palette, Compass, Users, FileText, FileCheck, Volume2,
  GraduationCap, History, Clock, Trash2, Play, FileUp, Download, ExternalLink,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanDataForFirestore } from '../lib/firebase';
import { toast } from './Toast';
import type { ChatInterfaceRef } from './ChatInterface';
import { 
  getToolkitActivities, 
  deleteToolkitActivity, 
  clearToolkitActivities, 
  ToolkitActivityItem 
} from '../lib/accessibilityToolkitEngine';
import { 
  BOOK_STUDIO_STORAGE_KEY, 
  SavedBookStudioItem 
} from '../lib/bookStudioEngine';
import { getSpatialObjects } from '../lib/spatialMemoryEngine';
import { speak } from '../lib/tts';

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

export type DashboardCategory =
  | 'all'
  | 'see_understand'
  | 'read_scan'
  | 'listen_transcribe'
  | 'create_format'
  | 'saved_recent'
  | 'accessibility_settings';

export type ModuleCategory = DashboardCategory | 'vision' | 'hearing';

interface DisabilityModeViewProps {
  profile: UserProfile;
  onMenuClick: () => void;
  onNavigate?: (view: any, tab?: any) => void;
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
 * Returns 'chat' (the AI Tutor) when nothing maps cleanly — never guess
 * a suite the user didn't actually indicate.
 */
function detectDirectDisabilityTab(_profile: UserProfile): DisabilityTab {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cognify_default_disability_tab') : null;
    if (saved === 'chat' || saved === 'deaf' || saved === 'vision' || saved === 'hub') {
      return saved as DisabilityTab;
    }
  } catch {}

  // Default to AI Tutor (chat) as the primary home
  return 'chat';
}

export const DASHBOARD_CATEGORIES: {
  id: DashboardCategory;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'all',
    titleEn: 'All Capabilities',
    titleAr: 'كافة الأدوات',
    descEn: 'Full view of all assistive and adaptation suites',
    descAr: 'عرض شامل لجميع أدوات ومنظومات إمكانية الوصول والتكيف',
    icon: Sparkles,
  },
  {
    id: 'see_understand',
    titleEn: 'See and Understand',
    titleAr: 'الرؤية والإدراك',
    descEn: 'Conversational visual assistant, cash and text reading, scene and spatial guidance',
    descAr: 'المساعد البصري الذكي، وصف المشاهد، قراءة العملات، والتوجيه المكاني',
    icon: Eye,
  },
  {
    id: 'read_scan',
    titleEn: 'Read and Scan',
    titleAr: 'القراءة والمسح الضوئي',
    descEn: 'Multi-page camera scanner, printed text OCR, and PDF evidence assistant',
    descAr: 'المسح الضوئي بالكاميرا، قراءة النصوص المطبوعة، ومساعد مستندات PDF',
    icon: ScanLine,
  },
  {
    id: 'listen_transcribe',
    titleEn: 'Listen and Transcribe',
    titleAr: 'السمع والتفريغ الصوتي',
    descEn: 'Live speech captions, 3D sign language studio, and adaptive AAC communication',
    descAr: 'التفريغ الفوري للكلام، استوديو لغة الإشارة 3D، وبطاقات التواصل التكيفي',
    icon: Ear,
  },
  {
    id: 'create_format',
    titleEn: 'Create and Format Documents',
    titleAr: 'إنشاء وتنسيق المستندات',
    descEn: 'Accessible educational book studio, exam generator, and Word DOCX formatter',
    descAr: 'استوديو الكتب والمناهج الميسرة، بنوك الأسئلة، وتصدير Word DOCX',
    icon: BookOpen,
  },
  {
    id: 'saved_recent',
    titleEn: 'Saved Results and Recent Activity',
    titleAr: 'النتائج المحفوظة والنشاط الأخير',
    descEn: 'Formatted textbooks, scanned pages, OCR transcripts, and spatial items',
    descAr: 'الوصول للكتب والمستندات المنشأة، الصفحات الممسوحة، والذاكرة المكانية',
    icon: History,
  },
  {
    id: 'accessibility_settings',
    titleEn: 'Accessibility and Settings',
    titleAr: 'إمكانية الوصول والتفضيلات',
    descEn: 'Accommodation passport, font scaling, high contrast, and 11 dialects',
    descAr: 'جواز السفر الميسر، حجم الخط، التباين العالي، واللغات واللهجات',
    icon: SlidersHorizontal,
  },
];

// Backwards compatibility alias for CATEGORIES
export const CATEGORIES = DASHBOARD_CATEGORIES;

interface FeatureCardItem {
  id: string;
  category: Exclude<DashboardCategory, 'all' | 'saved_recent'>;
  titleEn: string;
  titleAr: string;
  badgeEn: string;
  badgeAr: string;
  descEn: string;
  descAr: string;
  tagsEn: string[];
  tagsAr: string[];
  Icon: React.ComponentType<{ className?: string }>;
  matchingMode?: string;
  action: (helpers: {
    handleSelectTab: (tab: DisabilityTab) => void;
    onNavigate?: (view: any, tab?: any) => void;
    setShowPassportModal: (show: boolean) => void;
  }) => void;
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
  const [activeTab, setActiveTab] = useState<DisabilityTab>(() => {
    const directTab = currentTab || detectDirectDisabilityTab(profile);
    return directTab;
  });
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DashboardCategory>('all');
  
  // Saved data states for category 5 (Saved Results and Recent Activity)
  const [recentDocs, setRecentDocs] = useState<SavedBookStudioItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<ToolkitActivityItem[]>([]);
  const [spatialObjects, setSpatialObjects] = useState<any[]>([]);
  
  const isOrgStaff = !!profile?.isOrgManager && !!(profile?.organization || '').trim();

  // Load saved results and recent activity from persistent stores
  const loadSavedData = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawDocs = localStorage.getItem(BOOK_STUDIO_STORAGE_KEY);
      if (rawDocs) {
        setRecentDocs(JSON.parse(rawDocs).slice(0, 12));
      } else {
        setRecentDocs([]);
      }
    } catch {
      setRecentDocs([]);
    }

    try {
      setRecentActivities(getToolkitActivities().slice(0, 12));
    } catch {
      setRecentActivities([]);
    }

    try {
      if (profile?.uid) {
        setSpatialObjects(getSpatialObjects(profile.uid).slice(0, 12));
      }
    } catch {
      setSpatialObjects([]);
    }
  }, [profile?.uid]);

  useEffect(() => {
    if (activeTab === 'hub') {
      loadSavedData();
    }
  }, [activeTab, loadSavedData]);

  const handleClearActivities = () => {
    clearToolkitActivities();
    setRecentActivities([]);
    toast.success(
      localize(profile.language, 'Recent activity cleared successfully', 'تم مسح سجل النشاط الأخير بنجاح'),
      localize(profile.language, 'History Cleared', 'تم مسح السجل')
    );
  };

  const handleDeleteActivity = (id: string) => {
    deleteToolkitActivity(id);
    setRecentActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleOpenSavedDoc = (docItem: SavedBookStudioItem) => {
    try {
      sessionStorage.setItem('cognify_book_studio_active_source', docItem.rawSource);
    } catch {}
    if (onNavigate) {
      (onNavigate as any)('book_studio');
    }
  };

  const handleSpeakSnippet = (text: string) => {
    if (!text) return;
    speak(text, profile.language);
    toast.info(
      localize(profile.language, 'Reading aloud...', 'جاري القراءة الصوتية...'),
      localize(profile.language, 'Spoken Playback', 'قراءة صوتية')
    );
  };

  // Sync activeTab whenever parent updates currentTab
  useEffect(() => {
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [currentTab, activeTab]);

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
    const targetTab = tab;
    setActiveTab(targetTab);
    onTabChange?.(targetTab);
    if (targetTab === 'vision' || targetTab === 'deaf' || targetTab === 'chat' || targetTab === 'hub') {
      try {
        localStorage.setItem('cognify_default_disability_tab', targetTab);
      } catch {}
      let newMode: AccessibilityMode | null = null;
      let newType: string | null = null;
      if (targetTab === 'vision') { newMode = 'Visual'; newType = 'Visual Impairment'; }
      else if (targetTab === 'deaf') { newMode = 'Vocal-Deaf'; newType = 'Hearing Impairment'; }

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
      handleSelectTab('hub');
      try {
        localStorage.setItem('cognify_default_disability_tab', 'hub');
        window.history.pushState({ view: 'disability', tab: 'hub' }, '', '#disability/hub');
      } catch {}
    } else if (onNavigate) {
      onNavigate('chat');
    } else {
      onMenuClick();
    }
  }, [activeTab, handleSelectTab, onNavigate, onMenuClick]);

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

  // 18 Comprehensive Assistive Feature Cards organized across categories
  const FEATURE_CARDS: FeatureCardItem[] = useMemo(() => [
    // ═══════════════════════════════════════════════════════════════════════
    // Category 1: See and Understand (see_understand)
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'visual_assistant',
      category: 'see_understand',
      titleEn: 'Visual Assistant & Scene Describer',
      titleAr: 'المساعد البصري ووصف المشاهد',
      badgeEn: 'Real-time Vision',
      badgeAr: 'رؤية فورية',
      descEn: 'Conversational computer vision that narrates your environment, detects obstacles, and guides with tactile pulses.',
      descAr: 'رؤية حاسوبية فورية بالكاميرا تصف المحيط، تكشف العوائق والمخاطر، وتنطق الوصف صوتياً.',
      tagsEn: ['Scene Vision', 'Obstacle Alert', 'Haptic Guidance'],
      tagsAr: ['وصف المشهد', 'تنبيه العوائق', 'ملاحة لمسية'],
      Icon: Eye,
      matchingMode: 'Visual',
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },
    {
      id: 'currency_reader',
      category: 'see_understand',
      titleEn: 'Cash & Currency Reader',
      titleAr: 'قارئ العملات والنقود الورقية',
      badgeEn: 'Banknote ID',
      badgeAr: 'تمييز العملات',
      descEn: 'Identifies Egyptian Pounds, US Dollars, Euros, and Saudi Riyals with exact denominations voiced aloud.',
      descAr: 'التعرف الفوري على فئات الجنيه المصري، الدولار، اليورو، والريال السعودي مع نطق القيمة فوراً.',
      tagsEn: ['EGP / USD / EUR / SAR', 'Spoken Denomination', 'Instant Audit'],
      tagsAr: ['جنيه / دولار / يورو / ريال', 'نطق القيمة', 'فحص فوري'],
      Icon: Banknote,
      matchingMode: 'Visual',
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },
    {
      id: 'color_matcher',
      category: 'see_understand',
      titleEn: 'Color & Outfit Matcher',
      titleAr: 'فحص وتنسيق الألوان والملابس',
      badgeEn: 'Color Harmony',
      badgeAr: 'تنسيق الألوان',
      descEn: 'Detects precise garment colors, contrast levels, and lighting conditions to assist in independent dressing.',
      descAr: 'فحص دقيق لدرجات الألوان، ومستويات التباين، وجودة الإضاءة لتنسيق الملابس والمقتنيات باستقلالية.',
      tagsEn: ['Garment Color', 'Contrast Check', 'Lighting Quality'],
      tagsAr: ['لون الملابس', 'فحص التباين', 'جودة الإضاءة'],
      Icon: Palette,
      matchingMode: 'Visual',
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },
    {
      id: 'spatial_locator',
      category: 'see_understand',
      titleEn: 'Spatial Memory & Item Finder',
      titleAr: 'الذاكرة المكانية والبحث عن الأشياء',
      badgeEn: 'Object Locator',
      badgeAr: 'تحديد الأماكن',
      descEn: 'Remembers physical locations of keys, wallets, phones, and glasses with spatial direction and distance hints.',
      descAr: 'تذكر أماكن المفاتيح والنظارات والمحفظة داخل الغرف مع توجيه مكاني واهتزازات لمسية.',
      tagsEn: ['Item Recall', 'Room Landmarks', 'Directional Hints'],
      tagsAr: ['استرجاع المقتنيات', 'معالم الغرفة', 'توجيه مكاني'],
      Icon: Compass,
      matchingMode: 'Visual',
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },
    {
      id: 'person_recognition',
      category: 'see_understand',
      titleEn: 'Person & Face Recognition',
      titleAr: 'التعرف على الأشخاص والوجوه',
      badgeEn: 'Face Recognition',
      badgeAr: 'تمييز الوجوه',
      descEn: 'Recognizes enrolled friends, family members, teachers, and peers entering your camera frame.',
      descAr: 'التعرف على الوجوه المسجلة للأصدقاء والمعلمين وأفراد العائلة عند ظهورهم في مجال الرؤية.',
      tagsEn: ['Enrolled Contacts', 'Proximity Alert', 'Name Announcement'],
      tagsAr: ['جهات مسجلة', 'تنبيه القرب', 'نطق الاسم'],
      Icon: Users,
      matchingMode: 'Visual',
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // Category 2: Read and Scan (read_scan)
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'camera_scanner',
      category: 'read_scan',
      titleEn: 'Document & Page Camera Scanner',
      titleAr: 'ماسح المستندات والصفحات بالكاميرا',
      badgeEn: 'Multi-Page Scanner',
      badgeAr: 'ماسح متعدد الصفحات',
      descEn: 'Capture textbook pages and worksheets with automatic border detection, perspective flattening, and PDF export.',
      descAr: 'مسح ضوئي لصفحات الكتب والمذكرات بالكاميرا، مع تصحيح الزوايا والتباين وتجميعها في ملف PDF.',
      tagsEn: ['Edge Detection', 'Perspective Correction', 'Combined PDF'],
      tagsAr: ['كشف الحواف', 'تعديل المنظور', 'تجميع PDF'],
      Icon: ScanLine,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'ocr_sign_reader',
      category: 'read_scan',
      titleEn: 'Printed Text & Sign OCR Reader',
      titleAr: 'قارئ النصوص المطبوعة واللافتات (OCR)',
      badgeEn: 'Text Extraction',
      badgeAr: 'استخراج النصوص',
      descEn: 'Instant printed text recognition from signs, classroom whiteboards, medicine boxes, and handouts with voice playback.',
      descAr: 'استخراج وقراءة النصوص من اللافتات والسبورة وعبوات الأدوية والمطبوعات مع القراءة الصوتية الفورية.',
      tagsEn: ['Arabic & English', 'Signboards', 'Audio Playback'],
      tagsAr: ['عربي وإنجليزي', 'لافتات وشاشات', 'تشغيل صوتي'],
      Icon: FileCheck,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'pdf_evidence_assistant',
      category: 'read_scan',
      titleEn: 'Accessible PDF Evidence Assistant',
      titleAr: 'مساعد مستندات PDF والاستشهاد بالأدلة',
      badgeEn: 'Evidence Citations',
      badgeAr: 'توثيق الأدلة',
      descEn: 'Upload or view PDFs. Ask questions, receive cited answers with exact page numbers, and listen to summaries.',
      descAr: 'تصفح مستندات PDF المرفوعة، البحث الدقيق، استخراج النقاط الأساسية، والاستشهاد برقم الصفحة.',
      tagsEn: ['Page Quotes', 'Executive Summary', 'Direct Answers'],
      tagsAr: ['اقتباس الصفحة', 'ملخص تنفيذي', 'إجابات مباشرة'],
      Icon: FileText,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'media_sticker_explainer',
      category: 'read_scan',
      titleEn: 'AI Media & Sticker Explainer',
      titleAr: 'شارح الصور وملصقات واتساب',
      badgeEn: 'Visual Breakdown',
      badgeAr: 'تحليل بصري',
      descEn: 'Deeply explains photos, complex educational diagrams, memes, and WhatsApp stickers with cultural nuance.',
      descAr: 'شرح تفصيلي للصور والرسوم البيانية التوضيحية والملصقات التعبيرية مع بيان السياق والمغزى.',
      tagsEn: ['Sticker Humor', 'Cultural Context', 'Diagrams'],
      tagsAr: ['مغزى الملصق', 'سياق ثقافي', 'شرح الرسوم'],
      Icon: Sparkles,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // Category 3: Listen and Transcribe (listen_transcribe)
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'live_speech_captions',
      category: 'listen_transcribe',
      titleEn: 'Live Speech Captions & Transcriber',
      titleAr: 'التفريغ الفوري المباشر للكلام',
      badgeEn: 'Real-Time STT',
      badgeAr: 'تفريغ صوتي فوري',
      descEn: 'Continuous high-contrast captions for lectures, meetings, and conversations with font scaling and speaker tags.',
      descAr: 'تحويل فوري للكلام المنطوق إلى نصوص متباينة في المحاضرات مع إمكانية تكبير الخط وتمييز المتحدث.',
      tagsEn: ['High Contrast', 'Font Scaling', 'Continuous Stream'],
      tagsAr: ['تباين عالي', 'تكبير الخط', 'تفريغ مستمر'],
      Icon: Mic,
      matchingMode: 'Vocal-Deaf',
      action: ({ handleSelectTab }) => handleSelectTab('deaf'),
    },
    {
      id: 'sign_avatar_3d',
      category: 'listen_transcribe',
      titleEn: 'Interactive 3D Sign Language Avatar',
      titleAr: 'أفاتار لغة الإشارة التفاعلي 3D',
      badgeEn: '3D Sign Avatar',
      badgeAr: 'أفاتار إشارة 3D',
      descEn: 'Translates spoken speech and typed text into fluid 3D animated Arabic and international sign language.',
      descAr: 'تحويل فوري للكلام المسموع والنصوص المكتوبة إلى حركات إشارية ثلاثية الأبعاد تفاعلية.',
      tagsEn: ['Arabic Sign', 'Script to Sign', 'Speed Control'],
      tagsAr: ['إشارة عربية', 'نص لإشارة', 'تحكم بالسرعة'],
      Icon: Ear,
      matchingMode: 'Sign-Only',
      action: ({ handleSelectTab }) => handleSelectTab('deaf'),
    },
    {
      id: 'sign_to_speech_bridge',
      category: 'listen_transcribe',
      titleEn: 'Camera Sign-to-Speech Bridge',
      titleAr: 'قراءة إشارات اليدين وتحويلها لصوت',
      badgeEn: 'Sign Recognition',
      badgeAr: 'قراءة الإشارة',
      descEn: 'Real-time hand tracking and sign gesture recognition voiced aloud so deaf users communicate effortlessly.',
      descAr: 'تتبع حركات اليدين عبر الكاميرا وتحويل لغة الإشارة إلى صوت مسموع لتمكين التواصل الحر.',
      tagsEn: ['Live Hand Tracking', 'Sign Vocabulary', 'Voice Speaker'],
      tagsAr: ['تتبع اليدين', 'معجم إشاري', 'نطق صوتي'],
      Icon: Radio,
      matchingMode: 'Sign-Only',
      action: ({ handleSelectTab }) => handleSelectTab('deaf'),
    },
    {
      id: 'lecture_audio_transcriber',
      category: 'listen_transcribe',
      titleEn: 'Audio Lecture Transcriber & Summarizer',
      titleAr: 'تفريغ المحاضرات الصوتية وتلخيصها',
      badgeEn: 'Audio Transcriber',
      badgeAr: 'تفريغ صوتي',
      descEn: 'Transcribe recorded audio lectures into searchable text, extract action items, and export structured notes.',
      descAr: 'تفريغ التسجيلات الصوتية والمحاضرات إلى نصوص قابلة للبحث واستخلاص المفاهيم وملخصات المذاكرة.',
      tagsEn: ['Audio to Text', 'Study Summaries', 'Timestamp Support'],
      tagsAr: ['صوت إلى نص', 'ملخص دراسي', 'توقيتات زمنية'],
      Icon: Volume2,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // Category 4: Create and Format Documents (create_format)
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'book_studio',
      category: 'create_format',
      titleEn: 'Accessible Book & Document Studio',
      titleAr: 'استوديو الكتب والمناهج التعليمية الميسرة',
      badgeEn: 'Native Word & PDF',
      badgeAr: 'تنسيق Word رسمي',
      descEn: 'Transform rough drafts into publisher-grade Word (.docx) and PDF books with automated TOC and chapter styling.',
      descAr: 'تحويل المسودات والمذكرات إلى كتب تعليمية منسقة بملفات Word DOCX وPDF مع فهرس وغلاف رسمي.',
      tagsEn: ['8 Educational Templates', 'Auto TOC', 'Screen-Reader Ready'],
      tagsAr: ['8 قوالب تعليمية', 'فهرس تلقائي', 'هيكلية قارئ الشاشة'],
      Icon: BookOpen,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('book_studio');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'exam_builder',
      category: 'create_format',
      titleEn: 'Exam & Assessment Generator',
      titleAr: 'منشئ الامتحانات وبنوك الأسئلة',
      badgeEn: 'Accessible Tests',
      badgeAr: 'امتحانات ميسرة',
      descEn: 'Generate accessible multiple-choice, true/false, and short-answer exams with auto-sized answer boxes and keys.',
      descAr: 'إنشاء اختبارات ونماذج تقييم ميسرة مع مساحات إجابة نقطية ونماذج إجابة للمعلم.',
      tagsEn: ['MCQ / Essay', 'Dotted Answer Lines', 'Teacher Key'],
      tagsAr: ['اختيار / مقالي', 'خطوط إجابة نقطية', 'نموذج المعلم'],
      Icon: GraduationCap,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('book_studio');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'cognitive_tutor',
      category: 'create_format',
      titleEn: 'Adaptive Cognitive AI Tutor',
      titleAr: 'المرشد التعليمي التكيفي',
      badgeEn: 'Cognitive Tutoring',
      badgeAr: 'تعلم تكيفي',
      descEn: 'Pedagogical AI tutor tailored to your cognitive pace, providing step-by-step guidance and plain explanations.',
      descAr: 'مرشد تعليمي شخصي يتكيف مع وتيرة فهمك، يقدم شروحات ميسرة خطوة بخطوة متوافقة مع قارئات الشاشة.',
      tagsEn: ['Adaptive Pace', 'Worked Examples', 'Accessible Plain Text'],
      tagsAr: ['وتيرة متكيفة', 'أمثلة محلولة', 'لغة واضحة'],
      Icon: Brain,
      matchingMode: 'None',
      action: ({ handleSelectTab }) => handleSelectTab('chat'),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // Category 6: Accessibility and Settings (accessibility_settings)
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'passport_modal',
      category: 'accessibility_settings',
      titleEn: 'Universal Accommodation Passport',
      titleAr: 'جواز السفر الميسر الشامل',
      badgeEn: 'My Accommodations',
      badgeAr: 'تسهيلاتي الفردية',
      descEn: 'Manage your personalized accommodations: font scaling, high contrast palette, and reduced motion.',
      descAr: 'إدارة تسهيلاتك الفردية المخصصة: تكبير الخط، تباين الألوان العالي، تقليل الحركة، وضبط التنبيهات الحسية.',
      tagsEn: ['Font Scaling', 'High Contrast', 'Reduced Motion'],
      tagsAr: ['حجم الخط', 'تباين عالي', 'تقليل الحركة'],
      Icon: ShieldCheck,
      action: ({ setShowPassportModal }) => setShowPassportModal(true),
    },
    {
      id: 'languages_settings',
      category: 'accessibility_settings',
      titleEn: 'Language & Regional Dialects',
      titleAr: 'اللغات واللهجات الإقليمية',
      badgeEn: '11 Dialects',
      badgeAr: '11 لغة ولهجة',
      descEn: 'Choose your primary language from 11 options, including Egyptian Ammiya, Modern Standard Arabic, English, and French.',
      descAr: 'اختيار لغة النظام والتواصل من بين 11 لغة ولهجة تشمل العامية المصرية والفصحى والإنجليزية.',
      tagsEn: ['Egyptian Ammiya', 'Modern Arabic', 'Instant Switch'],
      tagsAr: ['مصري عامي', 'عربي فصيح', 'تبديل فوري'],
      Icon: Globe,
      action: ({ handleSelectTab }) => handleSelectTab('settings'),
    },
    {
      id: 'sensory_modes',
      category: 'accessibility_settings',
      titleEn: 'Sensory & Accommodation Profiles',
      titleAr: 'ملفات التكيف الحسي وأنماط الوصول',
      badgeEn: 'Active Profile',
      badgeAr: 'نمط الوصول',
      descEn: 'Switch active modes: Visual & Screen Adaptation, Vocal-Deaf Bridge, Sign Language, or Speech.',
      descAr: 'التبديل بين ملفات الوصول: التكيف البصري، جسر الصم، لغة الإشارة، أو نمط التحدث الصوتي.',
      tagsEn: ['Visual Mode', 'Deaf Bridge', 'Sign Only'],
      tagsAr: ['نمط بصري', 'جسر الصم', 'إشارة فقط'],
      Icon: Accessibility,
      action: ({ handleSelectTab }) => handleSelectTab('settings'),
    },
    {
      id: 'caregiver_hub',
      category: 'accessibility_settings',
      titleEn: 'Caregiver & Family Support Hub',
      titleAr: 'بوابة المرافق ودائرة الدعم الأسري',
      badgeEn: 'Care Network',
      badgeAr: 'شبكة الدعم',
      descEn: 'Coordinate with trusted caregivers, configure emergency contacts, and safely synchronize accommodation profiles.',
      descAr: 'التنسيق مع المرافقين وأفراد العائلة، ضبط جهات اتصال الطوارئ، ومزامنة إعدادات الوصول بأمان.',
      tagsEn: ['Trusted Caregiver', 'Emergency Setup', 'Profile Sync'],
      tagsAr: ['مرافق موثوق', 'طوارئ', 'مزامنة التسهيلات'],
      Icon: User,
      action: ({ handleSelectTab }) => handleSelectTab('caregiver'),
    },
    ...(isOrgStaff ? [{
      id: 'org_hub',
      category: 'accessibility_settings' as const,
      titleEn: 'My Organization Hub',
      titleAr: 'لوحة تحكم الجمعية / المؤسسة',
      badgeEn: 'Org Staff Portal',
      badgeAr: 'مشرفو الجمعيات',
      descEn: 'Cohort analytics, enrolled special-needs learners, and accessibility adoption reports.',
      descAr: 'متابعة وإدارة طلاب الجمعية المسجلين، إحصائيات مستويات الاستيعاب المعرفي، وتقارير تبني أدوات الوصول.',
      tagsEn: ['Cohort Analytics', 'Special Needs Support', 'Adoption Metrics'],
      tagsAr: ['إحصائيات الطلاب', 'دعم ذوي الإعاقة', 'تقارير التبني'],
      Icon: Building2,
      action: ({ handleSelectTab }: { handleSelectTab: (tab: DisabilityTab) => void }) => handleSelectTab('org'),
    }] : []),
  ], [isOrgStaff]);

  // Filter features based on selectedCategory
  const filteredFeatures = useMemo(() => {
    if (selectedCategory === 'all') return FEATURE_CARDS;
    if (selectedCategory === 'saved_recent') return [];
    return FEATURE_CARDS.filter((f) => f.category === selectedCategory);
  }, [selectedCategory, FEATURE_CARDS]);

  const isAr = profile.language === 'Arabic' || profile.language === 'Egyptian Ammiya';
  const isDeafActive = activeTab === 'deaf' || activeTab === 'radar' || activeTab === 'bridge' || activeTab === 'studio' || activeTab === 'video';

  // Primary suites for header and navigation
  const PRIMARY_SUITES = [
    { id: 'hub' as const, labelAr: 'كافة الأدوات', labelEn: 'All Tools', Icon: Grid },
    { id: 'vision' as const, labelAr: 'البصري', labelEn: 'Visual', Icon: Eye },
    { id: 'deaf' as const, labelAr: 'السمعي', labelEn: 'Hearing', Icon: Ear },
    { id: 'chat' as const, labelAr: 'المرشد الذكي', labelEn: 'AI Tutor', Icon: Brain },
  ];

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

          {/* Dedicated Back Control returning to Features Hub when in a sub-module */}
          {activeTab !== 'hub' && (
            <AriaButton
              onPress={handleNavigateBack}
              aria-label={localize(profile.language, 'Back to Features Hub', 'العودة لقائمة الميزات')}
              className={`p-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'text-teal-300 bg-teal-950/60 border border-teal-800 hover:bg-teal-900/60'
                  : 'text-teal-900 bg-teal-50 border border-teal-300 hover:bg-teal-100 font-bold'
              }`}
            >
              <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
                {localize(profile.language, 'Hub', 'الميزات')}
              </span>
            </AriaButton>
          )}

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
            {PRIMARY_SUITES.map((suite) => {
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

        {/* Right Header Status / Accessibility Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative pb-16 md:pb-0">
        <AnimatePresence mode="wait">

          {/* ═════════════════════════════════════════════════════════════════════
              VIEW: ACCESSIBLE DASHBOARD HUB (PHASE 4 REDESIGN)
             ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'hub' && (
            <motion.div
              key="hub-features-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 w-full h-full overflow-y-auto custom-scrollbar p-3 sm:p-6 md:p-8"
            >
              <div className="max-w-6xl mx-auto space-y-6 pb-24">

                {/* ── 1. PROMINENT VISUAL ASSISTANT HERO SPOTLIGHT ── */}
                <section
                  aria-label={localize(profile.language, 'Visual Assistant Spotlight', 'المساعد البصري الرئيسي')}
                  className={`p-6 sm:p-7 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-[#121B1E] via-[#152226] to-[#10191B] border-teal-800/50 shadow-md text-white'
                      : 'bg-gradient-to-br from-white via-teal-50/40 to-stone-50 border-teal-200 shadow-sm text-stone-900'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                        <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>{localize(profile.language, 'Primary Visual Assistant', 'المساعد البصري الرئيسي')}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                      </div>

                      <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                        {localize(profile.language, 'Visual Assistant & Conversational Eyes', 'المساعد البصري التفاعلي الذكي')}
                      </h1>

                      <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
                        {localize(
                          profile.language,
                          'Instant computer vision that describes scenes, identifies cash denominations, reads signs, matches clothing colors, and guides via tactile haptics.',
                          'رؤية حاسوبية فورية بالكاميرا تصف المحيط صوتياً، تقرأ العملات الورقية، تفحص الألوان، وتوفر نبضات لمسية وتوجيهاً مكانياً مستمراً.'
                        )}
                      </p>

                      {/* Quick modes inside the spotlight */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                          {localize(profile.language, 'Quick Modes:', 'أوضاع سريعة:')}
                        </span>
                        {[
                          { labelEn: 'Cash Reader', labelAr: 'قارئ النقود', icon: Banknote },
                          { labelEn: 'Color Matcher', labelAr: 'تنسيق الألوان', icon: Palette },
                          { labelEn: 'Find Items', labelAr: 'البحث عن الأشياء', icon: Compass },
                          { labelEn: 'Haptic Guidance', labelAr: 'التوجيه اللمسي', icon: Zap },
                        ].map((mode, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectTab('vision')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isDarkMode
                                ? 'bg-stone-900/60 hover:bg-stone-800 border-stone-800 text-stone-300 hover:text-white'
                                : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700 hover:text-stone-950'
                            }`}
                          >
                            <mode.icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>{localize(profile.language, mode.labelEn, mode.labelAr)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Big Launch Button */}
                    <div className="shrink-0 w-full sm:w-auto">
                      <AriaButton
                        onPress={() => handleSelectTab('vision')}
                        aria-label={localize(profile.language, 'Launch Visual Assistant camera view', 'تشغيل كاميرا المساعد البصري')}
                        className="w-full sm:w-auto px-6 py-3.5 min-h-[48px] rounded-2xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-black text-sm shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                      >
                        <Eye className="w-5 h-5 shrink-0" />
                        <span>{localize(profile.language, 'Launch Visual Assistant', 'تشغيل المساعد البصري')}</span>
                        <ArrowRight className={`w-4 h-4 shrink-0 ${isAr ? 'rotate-180' : ''}`} />
                      </AriaButton>
                    </div>
                  </div>
                </section>

                {/* ── 2. COMMON ACTIONS QUICK BAR ── */}
                <section
                  aria-label={localize(profile.language, 'Common Assistive Actions', 'إجراءات تيسيرية سريعة')}
                  className="space-y-2.5"
                >
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>{localize(profile.language, 'Common Actions', 'إجراءات سريعة شائعة')}</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                    {[
                      {
                        id: 'qa_vision',
                        titleEn: 'Visual Assistant',
                        titleAr: 'المساعد البصري',
                        icon: Eye,
                        action: () => handleSelectTab('vision'),
                      },
                      {
                        id: 'qa_scanner',
                        titleEn: 'Scan Document',
                        titleAr: 'سكانر المستندات',
                        icon: ScanLine,
                        action: () => {
                          if (onNavigate) (onNavigate as any)('toolkit');
                          else handleSelectTab('hub');
                        },
                      },
                      {
                        id: 'qa_captions',
                        titleEn: 'Live Captions',
                        titleAr: 'التفريغ الصوتي',
                        icon: Mic,
                        action: () => handleSelectTab('deaf'),
                      },
                      {
                        id: 'qa_studio',
                        titleEn: 'Book Studio',
                        titleAr: 'استوديو الكتب',
                        icon: BookOpen,
                        action: () => {
                          if (onNavigate) (onNavigate as any)('book_studio');
                          else handleSelectTab('hub');
                        },
                      },
                      {
                        id: 'qa_passport',
                        titleEn: 'Accommodation Passport',
                        titleAr: 'جواز التسهيلات',
                        icon: ShieldCheck,
                        action: () => setShowPassportModal(true),
                      },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        aria-label={localize(profile.language, item.titleEn, item.titleAr)}
                        className={`p-3 min-h-[48px] rounded-2xl border flex items-center gap-3 transition-all active:scale-95 cursor-pointer text-start outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          isDarkMode
                            ? 'bg-[#121B1E] hover:bg-[#162327] border-stone-800 hover:border-teal-500/50 text-stone-200 hover:text-white'
                            : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-teal-600/40 text-stone-800 hover:text-stone-950 shadow-xs'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isDarkMode ? 'bg-teal-950/50 text-teal-400' : 'bg-teal-50 text-teal-700'
                        }`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold truncate">
                          {localize(profile.language, item.titleEn, item.titleAr)}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* ── 3. CATEGORY NAVIGATION BAR (7 categories) ── */}
                <div
                  role="tablist"
                  aria-label={localize(profile.language, 'Dashboard Categories', 'تصنيفات لوحة التحكم')}
                  className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-stone-100 dark:bg-[#121B1E] border border-stone-200 dark:border-stone-800 overflow-x-auto custom-scrollbar"
                >
                  {DASHBOARD_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    const CatIcon = cat.icon;
                    const count = cat.id === 'all'
                      ? FEATURE_CARDS.length
                      : cat.id === 'saved_recent'
                        ? (recentDocs.length + recentActivities.length + spatialObjects.length)
                        : FEATURE_CARDS.filter((f) => f.category === cat.id).length;

                    return (
                      <button
                        key={cat.id}
                        role="tab"
                        aria-selected={isSelected}
                        aria-label={localize(profile.language, cat.titleEn, cat.titleAr)}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          isSelected
                            ? 'bg-teal-700 text-white font-black shadow-sm'
                            : isDarkMode
                              ? 'text-stone-300 hover:text-white hover:bg-stone-800/60'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200/80'
                        }`}
                      >
                        <CatIcon className="w-4 h-4 shrink-0" />
                        <span>{localize(profile.language, cat.titleEn, cat.titleAr)}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? 'bg-teal-800 text-teal-100'
                            : isDarkMode
                              ? 'bg-stone-800 text-stone-400'
                              : 'bg-stone-200 text-stone-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── 4. CATEGORIZED FEATURE CARDS GRID ── */}
                {selectedCategory !== 'saved_recent' && (
                  <div className="space-y-4">
                    {selectedCategory !== 'all' && (
                      <div className="px-1">
                        <h2 className="text-base sm:text-lg font-bold">
                          {localize(
                            profile.language,
                            DASHBOARD_CATEGORIES.find((c) => c.id === selectedCategory)?.titleEn || '',
                            DASHBOARD_CATEGORIES.find((c) => c.id === selectedCategory)?.titleAr || ''
                          )}
                        </h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          {localize(
                            profile.language,
                            DASHBOARD_CATEGORIES.find((c) => c.id === selectedCategory)?.descEn || '',
                            DASHBOARD_CATEGORIES.find((c) => c.id === selectedCategory)?.descAr || ''
                          )}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      {filteredFeatures.map((f) => {
                        const CardIcon = f.Icon;
                        const isRecommended = f.matchingMode && profile.accessibilityMode === f.matchingMode;

                        return (
                          <div
                            key={f.id}
                            role="article"
                            aria-label={localize(profile.language, f.titleEn, f.titleAr)}
                            onClick={() => f.action({ handleSelectTab, onNavigate, setShowPassportModal })}
                            className={`group relative rounded-2xl p-5 sm:p-6 border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-sm active:scale-[0.99] outline-none focus-within:ring-2 focus-within:ring-teal-600 ${
                              isDarkMode
                                ? 'bg-[#121B1E] hover:bg-[#162327] border-stone-800 hover:border-teal-500/50'
                                : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-teal-600/40 shadow-xs'
                            } ${isRecommended ? 'ring-2 ring-teal-600/40' : ''}`}
                          >
                            <div className="space-y-3.5">
                              {/* Header: Icon + Title + Badge */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                    isDarkMode 
                                      ? 'bg-[#1A262B] text-teal-400 border-teal-800/60' 
                                      : 'bg-teal-50 text-teal-800 border-teal-200'
                                  }`}>
                                    <CardIcon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors leading-snug">
                                      {localize(profile.language, f.titleEn, f.titleAr)}
                                    </h3>
                                    <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                                      {localize(profile.language, f.badgeEn, f.badgeAr)}
                                    </span>
                                  </div>
                                </div>

                                {isRecommended && (
                                  <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                                    {localize(profile.language, 'Recommended', 'موصى به لملفك')}
                                  </span>
                                )}
                              </div>

                              {/* Description */}
                              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
                                {localize(profile.language, f.descEn, f.descAr)}
                              </p>

                              {/* Quick Feature Tags */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {(isAr ? f.tagsAr : f.tagsEn).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md border transition-colors ${
                                      isDarkMode
                                        ? 'bg-stone-900/60 border-stone-800 text-stone-300 group-hover:border-teal-500/30'
                                        : 'bg-stone-100/80 border-stone-200 text-stone-700 group-hover:border-teal-200'
                                    }`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Bottom Launch Action */}
                            <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
                              <span className="text-xs font-semibold text-stone-500 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors flex items-center gap-1">
                                <span>{localize(profile.language, 'Direct Access', 'دخول مباشر')}</span>
                                <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  f.action({ handleSelectTab, onNavigate, setShowPassportModal });
                                }}
                                aria-label={localize(profile.language, `Launch ${f.titleEn}`, `تشغيل ${f.titleAr}`)}
                                className="px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                              >
                                <span>{localize(profile.language, 'Launch Tool', 'تشغيل الأداة')}</span>
                                <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── 5. SAVED RESULTS AND RECENT ACTIVITY SECTION ── */}
                {(selectedCategory === 'saved_recent' || selectedCategory === 'all') && (
                  <section
                    aria-label={localize(profile.language, 'Saved Results and Recent Activity', 'النتائج المحفوظة والنشاط الأخير')}
                    className="space-y-4 pt-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        <h2 className="text-base sm:text-lg font-bold">
                          {localize(profile.language, 'Saved Results & Recent Activity', 'النتائج المحفوظة والنشاط الأخير')}
                        </h2>
                      </div>

                      {(recentActivities.length > 0 || recentDocs.length > 0) && (
                        <button
                          type="button"
                          onClick={handleClearActivities}
                          aria-label={localize(profile.language, 'Clear activity history', 'مسح سجل النشاط')}
                          className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{localize(profile.language, 'Clear History', 'مسح السجل')}</span>
                        </button>
                      )}
                    </div>

                    {/* Three Sub-Sections: Documents, Toolkit Activity, Spatial Objects */}
                    <div className="space-y-6">
                      {/* Sub-Section A: Saved Documents in Book Studio */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                            <span>{localize(profile.language, 'Saved Educational Documents', 'الكتب والمستندات المحفوظة')}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {recentDocs.length}
                            </span>
                          </h3>

                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigate) (onNavigate as any)('book_studio');
                              else handleSelectTab('hub');
                            }}
                            className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{localize(profile.language, 'Open Studio', 'فتح الاستوديو')}</span>
                            <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {recentDocs.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {recentDocs.map((docItem) => (
                              <div
                                key={docItem.id}
                                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                                  isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200 shadow-xs'
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                                      {docItem.template}
                                    </span>
                                    <span className="text-[10px] text-stone-500">
                                      {new Date(docItem.updatedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold truncate text-stone-900 dark:text-stone-100">
                                    {docItem.title}
                                  </h4>
                                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                    {localize(
                                      profile.language,
                                      `${docItem.wordCount || 0} words · ${docItem.sectionsCount || 0} sections`,
                                      `${docItem.wordCount || 0} كلمة · ${docItem.sectionsCount || 0} أقسام`
                                    )}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSavedDoc(docItem)}
                                    aria-label={localize(profile.language, `Open document ${docItem.title}`, `فتح المستند ${docItem.title}`)}
                                    className="flex-1 py-1.5 px-3 min-h-[36px] rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>{localize(profile.language, 'Edit & Export', 'تعديل وتصدير')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSpeakSnippet(docItem.title)}
                                    aria-label={localize(profile.language, `Read document title ${docItem.title} aloud`, `قراءة عنوان المستند ${docItem.title}`)}
                                    className="p-1.5 min-w-[36px] min-h-[36px] rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-stone-950 flex items-center justify-center cursor-pointer"
                                    title={localize(profile.language, 'Read Title Aloud', 'قراءة صوتية')}
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`p-4 rounded-2xl border text-center ${
                            isDarkMode ? 'bg-[#121B1E] border-stone-800 text-stone-400' : 'bg-white border-stone-200 text-stone-500'
                          }`}>
                            <p className="text-xs">
                              {localize(
                                profile.language,
                                'No documents formatted yet. Use the Book Studio to transform drafts into textbooks and exams.',
                                'لم يتم حفظ مستندات حتى الآن. استخدم استوديو الكتب لتحويل المسودات إلى كتب وامتحانات.'
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Sub-Section B: Recent Scans & Toolkit Activities */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                            <ScanLine className="w-3.5 h-3.5 text-teal-600" />
                            <span>{localize(profile.language, 'Recent Scans & Toolkit Activity', 'المسح الضوئي والنشاط الأخير')}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {recentActivities.length}
                            </span>
                          </h3>

                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigate) (onNavigate as any)('toolkit');
                              else handleSelectTab('hub');
                            }}
                            className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{localize(profile.language, 'Open Scanner Toolkit', 'فتح منظومة السكانر')}</span>
                            <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {recentActivities.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {recentActivities.map((act) => (
                              <div
                                key={act.id}
                                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                                  isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200 shadow-xs'
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                                      {act.type}
                                    </span>
                                    <span className="text-[10px] text-stone-500">
                                      {new Date(act.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold truncate text-stone-900 dark:text-stone-100">
                                    {act.title}
                                  </h4>
                                  <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 mt-1">
                                    {act.snippet}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                                  <button
                                    type="button"
                                    onClick={() => handleSpeakSnippet(act.snippet || act.title)}
                                    aria-label={localize(profile.language, `Listen to ${act.title}`, `الاستماع إلى ${act.title}`)}
                                    className="flex-1 py-1.5 px-3 min-h-[36px] rounded-lg text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-stone-800 dark:text-stone-200 hover:text-teal-700 dark:hover:text-teal-300 flex items-center justify-center gap-1.5 cursor-pointer border border-stone-200 dark:border-stone-700"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                    <span>{localize(profile.language, 'Listen Aloud', 'استمع صوتياً')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteActivity(act.id)}
                                    aria-label={localize(profile.language, `Delete activity ${act.title}`, `حذف هذا النشاط`)}
                                    className="p-1.5 min-w-[36px] min-h-[36px] rounded-lg border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-rose-500 flex items-center justify-center cursor-pointer"
                                    title={localize(profile.language, 'Delete', 'حذف')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`p-4 rounded-2xl border text-center ${
                            isDarkMode ? 'bg-[#121B1E] border-stone-800 text-stone-400' : 'bg-white border-stone-200 text-stone-500'
                          }`}>
                            <p className="text-xs">
                              {localize(
                                profile.language,
                                'No scans or OCR runs yet. Capture a book page or signboard with Document Scanner.',
                                'لا توجد عمليات مسح أو OCR بعد. التقط صفحة كتاب أو لافتة باستخدام ماسح المستندات.'
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Sub-Section C: Saved Spatial Memory Objects */}
                      {spatialObjects.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                              <Compass className="w-3.5 h-3.5 text-teal-600" />
                              <span>{localize(profile.language, 'Tracked Spatial Memory Items', 'المقتنيات المحفوظة بالذاكرة المكانية')}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                                {spatialObjects.length}
                              </span>
                            </h3>

                            <button
                              type="button"
                              onClick={() => handleSelectTab('vision')}
                              className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{localize(profile.language, 'Locate with Camera', 'تحديد بالكاميرا')}</span>
                              <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {spatialObjects.map((sp) => (
                              <div
                                key={sp.id}
                                className={`p-4 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${
                                  isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200 shadow-xs'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                                      {sp.objectName}
                                    </span>
                                    <span className="text-[10px] text-stone-500">
                                      {new Date(sp.lastSeenTimestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-stone-600 dark:text-stone-300">
                                    {localize(
                                      profile.language,
                                      `Located on ${sp.surface || 'surface'} in ${sp.room || 'room'}`,
                                      `المكان: على ${sp.surface || 'السطح'} في ${sp.room || 'الغرفة'}`
                                    )}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleSelectTab('vision')}
                                  className="py-1.5 px-3 min-h-[36px] rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Compass className="w-3.5 h-3.5" />
                                  <span>{localize(profile.language, 'Locate in Camera', 'تحديد مكان الشيء بالكاميرا')}</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

              </div>
            </motion.div>
          )}

          {activeTab === 'vision' && (
            <motion.div
              key="vision-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <React.Suspense fallback={
                <div className="flex-1 flex items-center justify-center p-8 text-stone-400">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <VisionCompanionView profile={profile} setProfile={setProfile} onNavigateBack={handleNavigateBack} />
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
                <div className="flex-1 flex items-center justify-center p-8 text-stone-400">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
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
                <div className="flex-1 flex items-center justify-center p-8 text-stone-400">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
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
                <div className="flex-1 flex items-center justify-center p-8 text-stone-400">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
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
                <div className="flex-1 flex items-center justify-center p-8 text-stone-400">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
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
              <div className="flex items-center justify-between pb-2 shrink-0">
                <button
                  type="button"
                  onClick={handleNavigateBack}
                  aria-label={localize(profile.language, 'Back to Features Hub', 'العودة لقائمة الميزات')}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-[#162327] border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-600 outline-none"
                >
                  <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                  <span>{localize(profile.language, 'Back to Hub', 'الرجوع للميزات')}</span>
                </button>
              </div>
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
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleNavigateBack}
                    aria-label={localize(profile.language, 'Back to Features Hub', 'العودة لقائمة الميزات')}
                    className="px-3 py-2 rounded-2xl bg-stone-100 dark:bg-[#162327] border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white transition-all flex items-center gap-2 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-600 outline-none shadow-sm"
                  >
                    <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                    <span>{localize(profile.language, 'Back to Hub', 'الرجوع للميزات')}</span>
                  </button>
                </div>
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
                              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">{lang.label}</p>
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
                              {mode === 'Visual' && localize(profile.language, 'Spoken scene description, currency reader, and haptic directional guidance.', 'وصف بصري فوري، قارئ عملات، ونبضات لمسية للتوجيه.')}
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
        {PRIMARY_SUITES.map((item) => {
          const isSelected = item.id === 'deaf' ? isDeafActive : activeTab === item.id;
          const Icon = item.Icon;
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
              <span className="text-xs tracking-tight font-semibold mt-0.5">
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
          <span className="text-xs tracking-tight font-semibold mt-0.5">
            {localize(profile.language, 'Passport', 'الجواز')}
          </span>
        </button>
      </nav>
    </div>
  );
});

export default DisabilityModeView;
