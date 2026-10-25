import { localize } from '../lib/translations';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  AriaButton, 
  Button, 
  IconButton, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter, 
  Badge, 
  EmptyState, 
  StatusIndicator, 
  FeatureIcon, 
  BrandLogo 
} from './ui';
import { UserProfile, AccessibilityMode, Message, LanguagePreference } from '../types';
import { 
  Settings, Eye, Accessibility, Menu, Sparkles, User, Ear, Mic, Flame,
  ArrowLeft, ArrowRight, MessageSquare, Globe, Check, Brain,
  Building2, Zap, Radio, Shield, ListFilter, Layers, 
  SlidersHorizontal, CheckCircle2, ChevronRight, ChevronDown, Grid, List, BookOpen, ShieldCheck,
  Sun, Moon, Home, Compass, Activity,
  ScanLine, Banknote, Palette, Users, FileText, FileCheck, Volume2,
  GraduationCap, History, Clock, Trash2, Play, FileUp, Download, ExternalLink,
  RotateCcw, Search, X, Database
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
const ProfilePage = React.lazy(() => import('./ProfilePage'));
const StudentSettingsView = React.lazy(() => import('./StudentSettingsView'));
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
import { isAdminUser } from '../lib/roles';
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
  | 'orchestrator'
  | 'progress'
  | 'admin';

export type DashboardCategory =
  | 'all'
  | 'vision'
  | 'reading'
  | 'hearing'
  | 'study'
  | 'saved_recent'
  | 'see_understand'
  | 'read_scan'
  | 'listen_transcribe'
  | 'learn_study'
  | 'create_format'
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
 * Returns default tab for disability mode.
 * Defaults to 'hub' (the Accessibility Dashboard) as the primary home showcase.
 */
function detectDirectDisabilityTab(_profile: UserProfile): DisabilityTab {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cognify_default_disability_tab') : null;
    if (saved === 'chat' || saved === 'deaf' || saved === 'vision' || saved === 'hub') {
      return saved as DisabilityTab;
    }
  } catch {}

  return 'hub';
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
    titleEn: 'All Tools',
    titleAr: 'كافة الأدوات',
    descEn: 'Full view of all assistive and adaptation suites',
    descAr: 'عرض شامل لجميع أدوات ومنظومات إمكانية الوصول والتكيف',
    icon: Sparkles,
  },
  {
    id: 'vision',
    titleEn: 'Vision',
    titleAr: 'الرؤية',
    descEn: 'Conversational visual assistant, cash and text reading, scene and spatial guidance',
    descAr: 'المساعد البصري الذكي، وصف المشاهد، قراءة العملات، والتوجيه المكاني',
    icon: Eye,
  },
  {
    id: 'reading',
    titleEn: 'Reading & Scanning',
    titleAr: 'القراءة والمسح',
    descEn: 'Multi-page camera scanner, printed text OCR, and PDF evidence assistant',
    descAr: 'المسح الضوئي بالكاميرا، قراءة النصوص المطبوعة، ومساعد مستندات PDF',
    icon: ScanLine,
  },
  {
    id: 'hearing',
    titleEn: 'Hearing & Audio',
    titleAr: 'السمع والصوت',
    descEn: 'Live speech captions, 3D sign language studio, and adaptive AAC communication',
    descAr: 'التفريغ الفوري للكلام، استوديو لغة الإشارة 3D، وتفريغ المحاضرات',
    icon: Ear,
  },
  {
    id: 'study',
    titleEn: 'Learning & Study',
    titleAr: 'التعلم والدراسة',
    descEn: 'Adaptive pedagogical AI tutor, exam builder, and concept practice',
    descAr: 'المرشد التعليمي التكيفي، إنشاء الاختبارات، وتثبيت المفاهيم والمراجعة',
    icon: GraduationCap,
  },
  {
    id: 'saved_recent',
    titleEn: 'Saved & Recent',
    titleAr: 'المحفوظ والنشاط الأخير',
    descEn: 'Formatted textbooks, scanned pages, OCR transcripts, and spatial items',
    descAr: 'الوصول للكتب والمستندات المنشأة، الصفحات الممسوحة، والذاكرة المكانية',
    icon: History,
  },
];

// Backwards compatibility alias for CATEGORIES
export const CATEGORIES = DASHBOARD_CATEGORIES;

interface FeatureCardItem {
  id: string;
  category: DashboardCategory;
  legacyCategory?: string;
  categoryLabelEn: string;
  categoryLabelAr: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  tagsEn: string[];
  tagsAr: string[];
  Icon: React.ComponentType<{ className?: string }>;
  isFeatured?: boolean;
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
  isDarkMode = true,
  toggleTheme,
}, ref) {
  const [activeTab, setActiveTab] = useState<DisabilityTab>(() => {
    const directTab = currentTab || detectDirectDisabilityTab(profile);
    return directTab;
  });
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DashboardCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllToolsInAllView, setShowAllToolsInAllView] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Saved data states for category (Saved Results and Recent Activity)
  const [recentDocs, setRecentDocs] = useState<SavedBookStudioItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<ToolkitActivityItem[]>([]);
  const [spatialObjects, setSpatialObjects] = useState<any[]>([]);
  
  const isOrgStaff = !!profile?.isOrgManager && !!(profile?.organization || '').trim();
  const isAdmin = isAdminUser(profile);

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
    } else {
      onMenuClick();
    }
  }, [activeTab, handleSelectTab, onMenuClick]);

  const SUPPORTED_LANGUAGES: { id: LanguagePreference; label: string; flag: string; nativeName: string }[] = [
    { id: 'French', label: 'French', flag: '🇫🇷', nativeName: 'Français' },
    { id: 'English', label: 'English', flag: '🇬🇧', nativeName: 'English' },
    { id: 'Arabic', label: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
    { id: 'Egyptian Ammiya', label: 'Egyptian Ammiya', flag: '🇪🇬', nativeName: 'مصري' },
    { id: 'Spanish', label: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
    { id: 'German', label: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
    { id: 'Italian', label: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
    { id: 'Portuguese', label: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
    { id: 'Russian', label: 'Russian', flag: 'Русский', nativeName: 'Русский' },
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

  // Comprehensive Assistive Feature Cards organized across categories
  const FEATURE_CARDS: FeatureCardItem[] = useMemo(() => [
    // ═══════════════════════════════════════════════════════════════════════
    // The 8 Primary Featured Tools shown in the approved reference image
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'visual_assistant',
      category: 'vision',
      legacyCategory: 'see_understand',
      categoryLabelEn: 'Vision',
      categoryLabelAr: 'الرؤية',
      titleEn: 'Visual Assistant',
      titleAr: 'المساعد البصري',
      descEn: 'Provides audio descriptions of your surroundings and reads text aloud.',
      descAr: 'يقدم وصفاً صوتياً فورياً للمحيط، ويكشف العوائق ويقرأ النصوص بصوت مسموع.',
      tagsEn: ['Scene Vision', 'Obstacle Alert', 'Spoken Guidance'],
      tagsAr: ['وصف المشهد', 'تنبيه العوائق', 'توجيه صوتي'],
      Icon: Eye,
      isFeatured: true,
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },
    {
      id: 'currency_reader',
      category: 'vision',
      legacyCategory: 'see_understand',
      categoryLabelEn: 'Vision',
      categoryLabelAr: 'الرؤية',
      titleEn: 'Cash & Currency Reader',
      titleAr: 'قارئ العملات والنقود',
      descEn: 'Identifies banknotes and coins with high accuracy.',
      descAr: 'يتعرف على فئات العملات النقدية الورقية وينطق قيمتها فوراً بدقة عالية.',
      tagsEn: ['EGP / USD / EUR / SAR', 'Spoken Denomination', 'Instant Audit'],
      tagsAr: ['جنيه / دولار / يورو / ريال', 'نطق القيمة', 'فحص فوري'],
      Icon: Banknote,
      isFeatured: true,
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },
    {
      id: 'color_matcher',
      category: 'vision',
      legacyCategory: 'see_understand',
      categoryLabelEn: 'Vision',
      categoryLabelAr: 'الرؤية',
      titleEn: 'Color & Outfit Matcher',
      titleAr: 'فحص وتنسيق الألوان',
      descEn: 'Helps you choose complementary colors for clothing and objects.',
      descAr: 'يساعدك على اختيار وتنسيق درجات الألوان المتناسقة للملابس والمقتنيات.',
      tagsEn: ['Garment Color', 'Contrast Check', 'Lighting Quality'],
      tagsAr: ['لون الملابس', 'فحص التباين', 'جودة الإضاءة'],
      Icon: Palette,
      isFeatured: true,
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },
    {
      id: 'live_speech_captions',
      category: 'hearing',
      legacyCategory: 'listen_transcribe',
      categoryLabelEn: 'Hearing & Audio',
      categoryLabelAr: 'السمع والصوت',
      titleEn: 'Speech to Text',
      titleAr: 'تحويل الكلام إلى نص',
      descEn: 'Converts spoken words into real-time text captions.',
      descAr: 'يحول الكلمات المنطوقة في المحاضرات والمحادثات إلى نصوص فورية متباينة.',
      tagsEn: ['Live Captions', 'Font Scaling', 'High Contrast'],
      tagsAr: ['تفريغ مباشر', 'تكبير الخط', 'تباين عالي'],
      Icon: Mic,
      isFeatured: true,
      action: ({ handleSelectTab }) => handleSelectTab('deaf'),
    },
    {
      id: 'camera_scanner',
      category: 'reading',
      legacyCategory: 'read_scan',
      categoryLabelEn: 'Reading & Scanning',
      categoryLabelAr: 'القراءة والمسح',
      titleEn: 'Read & Scan',
      titleAr: 'القراءة والمسح الضوئي',
      descEn: 'Scans printed text and reads it aloud with highlighting.',
      descAr: 'يمسح أوراق الكتب والمذكرات بالكاميرا ويقرأها صوتياً مع تظليل الكلمات.',
      tagsEn: ['Edge Detection', 'Perspective Flattening', 'PDF Compilation'],
      tagsAr: ['كشف الحواف', 'تعديل المنظور', 'تصدير PDF'],
      Icon: ScanLine,
      isFeatured: true,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'lecture_audio_transcriber',
      category: 'hearing',
      legacyCategory: 'listen_transcribe',
      categoryLabelEn: 'Hearing & Audio',
      categoryLabelAr: 'السمع والصوت',
      titleEn: 'Listen & Transcribe',
      titleAr: 'الاستماع والتفريغ الصوتي',
      descEn: 'Transcribes audio recordings and provides smart summaries.',
      descAr: 'يفرغ التسجيلات الصوتية والمحاضرات لنصوص دقيقة ويستخرج ملخصات ذكية.',
      tagsEn: ['Audio to Text', 'Study Summaries', 'Timestamps'],
      tagsAr: ['صوت إلى نص', 'ملخص دراسي', 'توقيتات زمنية'],
      Icon: Volume2,
      isFeatured: true,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'memory_study',
      category: 'study',
      legacyCategory: 'learn_study',
      categoryLabelEn: 'Learning & Study',
      categoryLabelAr: 'التعلم والدراسة',
      titleEn: 'Memory & Study',
      titleAr: 'الذاكرة والمذاكرة',
      descEn: 'Generates flashcards and study aids to reinforce learning.',
      descAr: 'ينشئ بطاقات استذكار وأدوات تعليمية مساعدة لترسيخ المفاهيم والاستيعاب.',
      tagsEn: ['Flashcards', 'Worked Examples', 'Concept Practice'],
      tagsAr: ['بطاقات تعليمية', 'أمثلة توضيحية', 'تثبيت المفاهيم'],
      Icon: GraduationCap,
      isFeatured: true,
      action: ({ handleSelectTab }) => handleSelectTab('chat'),
    },
    {
      id: 'cognitive_tutor',
      category: 'study',
      legacyCategory: 'learn_study',
      categoryLabelEn: 'Learning & Study',
      categoryLabelAr: 'التعلم والدراسة',
      titleEn: 'Personal Assistant',
      titleAr: 'المساعد الشخصي',
      descEn: 'An adaptive AI tutor tailored to your unique learning style.',
      descAr: 'مرشد تعليمي تكيفي ذكي يشرح خطوة بخطوة ويتوافق مع وتيرة فهمك الفردية.',
      tagsEn: ['Adaptive Pace', 'Step-by-Step', 'Screen Reader Ready'],
      tagsAr: ['وتيرة متكيفة', 'خطوة بخطوة', 'قارئ الشاشة'],
      Icon: Brain,
      isFeatured: true,
      action: ({ handleSelectTab }) => handleSelectTab('chat'),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // Additional Full Assistive Suite Tools
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'spatial_locator',
      category: 'vision',
      legacyCategory: 'see_understand',
      categoryLabelEn: 'Vision',
      categoryLabelAr: 'الرؤية',
      titleEn: 'Spatial Memory & Item Finder',
      titleAr: 'الذاكرة المكانية والبحث عن الأشياء',
      descEn: 'Remembers physical locations of keys, wallets, phones, and glasses with spatial direction hints.',
      descAr: 'يتذكر أماكن المفاتيح والنظارات والمحفظة داخل الغرف مع توجيه مكاني ونبضات لمسية.',
      tagsEn: ['Item Recall', 'Room Landmarks', 'Directional Hints'],
      tagsAr: ['استرجاع المقتنيات', 'معالم الغرفة', 'توجيه مكاني'],
      Icon: Compass,
      isFeatured: false,
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },
    {
      id: 'person_recognition',
      category: 'vision',
      legacyCategory: 'see_understand',
      categoryLabelEn: 'Vision',
      categoryLabelAr: 'الرؤية',
      titleEn: 'Person & Face Recognition',
      titleAr: 'التعرف على الأشخاص والوجوه',
      descEn: 'Recognizes enrolled friends, family members, teachers, and peers entering your camera frame.',
      descAr: 'التعرف على الوجوه المسجلة للأصدقاء والمعلمين وأفراد العائلة عند ظهورهم في مجال الرؤية.',
      tagsEn: ['Enrolled Contacts', 'Proximity Alert', 'Name Announcement'],
      tagsAr: ['جهات مسجلة', 'تنبيه القرب', 'نطق الاسم'],
      Icon: Users,
      isFeatured: false,
      action: ({ handleSelectTab }) => handleSelectTab('vision'),
    },
    {
      id: 'ocr_sign_reader',
      category: 'reading',
      legacyCategory: 'read_scan',
      categoryLabelEn: 'Reading & Scanning',
      categoryLabelAr: 'القراءة والمسح',
      titleEn: 'Printed Text & Sign OCR Reader',
      titleAr: 'قارئ النصوص المطبوعة واللافتات (OCR)',
      descEn: 'Instant printed text recognition from signs, classroom whiteboards, medicine boxes, and handouts.',
      descAr: 'استخراج وقراءة النصوص من اللافتات والسبورة وعبوات الأدوية والمطبوعات مع القراءة الصوتية الفورية.',
      tagsEn: ['Arabic & English', 'Signboards', 'Audio Playback'],
      tagsAr: ['عربي وإنجليزي', 'لافتات وشاشات', 'تشغيل صوتي'],
      Icon: FileCheck,
      isFeatured: false,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'pdf_evidence_assistant',
      category: 'reading',
      legacyCategory: 'read_scan',
      categoryLabelEn: 'Reading & Scanning',
      categoryLabelAr: 'القراءة والمسح',
      titleEn: 'Accessible PDF Evidence Assistant',
      titleAr: 'مساعد مستندات PDF والاستشهاد بالأدلة',
      descEn: 'Upload PDFs, ask questions, receive cited answers with exact page numbers, and listen to summaries.',
      descAr: 'تصفح مستندات PDF المرفوعة، البحث الدقيق، استخراج النقاط الأساسية، والاستشهاد برقم الصفحة.',
      tagsEn: ['Page Quotes', 'Executive Summary', 'Direct Answers'],
      tagsAr: ['اقتباس الصفحة', 'ملخص تنفيذي', 'إجابات مباشرة'],
      Icon: FileText,
      isFeatured: false,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'media_sticker_explainer',
      category: 'reading',
      legacyCategory: 'read_scan',
      categoryLabelEn: 'Reading & Scanning',
      categoryLabelAr: 'القراءة والمسح',
      titleEn: 'AI Media & Sticker Explainer',
      titleAr: 'شارح الصور وملصقات واتساب',
      descEn: 'Deeply explains photos, complex educational diagrams, memes, and WhatsApp stickers with cultural nuance.',
      descAr: 'شرح تفصيلي للصور والرسوم البيانية التوضيحية والملصقات التعبيرية مع بيان السياق والمغزى.',
      tagsEn: ['Sticker Humor', 'Cultural Context', 'Diagrams'],
      tagsAr: ['مغزى الملصق', 'سياق ثقافي', 'شرح الرسوم'],
      Icon: Sparkles,
      isFeatured: false,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('toolkit');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'book_studio',
      category: 'reading',
      legacyCategory: 'create_format',
      categoryLabelEn: 'Reading & Scanning',
      categoryLabelAr: 'القراءة والمسح',
      titleEn: 'Accessible Book & Document Studio',
      titleAr: 'استوديو الكتب والمناهج الميسرة',
      descEn: 'Transform drafts into publisher-grade Word (.docx) and PDF books with automated TOC and chapter styling.',
      descAr: 'تحويل المسودات والمذكرات إلى كتب تعليمية منسقة بملفات Word DOCX وPDF مع فهرس وغلاف رسمي.',
      tagsEn: ['Word DOCX', 'Auto TOC', 'Screen-Reader Structure'],
      tagsAr: ['ملفات Word', 'فهرس تلقائي', 'هيكلية قارئ الشاشة'],
      Icon: BookOpen,
      isFeatured: false,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('book_studio');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'sign_avatar_3d',
      category: 'hearing',
      legacyCategory: 'listen_transcribe',
      categoryLabelEn: 'Hearing & Audio',
      categoryLabelAr: 'السمع والصوت',
      titleEn: 'Interactive 3D Sign Language Avatar',
      titleAr: 'أفاتار لغة الإشارة التفاعلي 3D',
      descEn: 'Translates spoken speech and typed text into fluid 3D animated Arabic and international sign language.',
      descAr: 'تحويل فوري للكلام المسموع والنصوص المكتوبة إلى حركات إشارية ثلاثية الأبعاد تفاعلية.',
      tagsEn: ['Arabic Sign', 'Script to Sign', 'Speed Control'],
      tagsAr: ['إشارة عربية', 'نص لإشارة', 'تحكم بالسرعة'],
      Icon: Ear,
      isFeatured: false,
      action: ({ handleSelectTab }) => handleSelectTab('deaf'),
    },
    {
      id: 'sign_to_speech_bridge',
      category: 'hearing',
      legacyCategory: 'listen_transcribe',
      categoryLabelEn: 'Hearing & Audio',
      categoryLabelAr: 'السمع والصوت',
      titleEn: 'Camera Sign-to-Speech Bridge',
      titleAr: 'قراءة إشارات اليدين وتحويلها لصوت',
      descEn: 'Real-time hand tracking and sign gesture recognition voiced aloud so deaf users communicate effortlessly.',
      descAr: 'تتبع حركات اليدين عبر الكاميرا وتحويل لغة الإشارة إلى صوت مسموع لتمكين التواصل الحر.',
      tagsEn: ['Live Hand Tracking', 'Sign Vocabulary', 'Voice Speaker'],
      tagsAr: ['تتبع اليدين', 'معجم إشاري', 'نطق صوتي'],
      Icon: Radio,
      isFeatured: false,
      action: ({ handleSelectTab }) => handleSelectTab('deaf'),
    },
    {
      id: 'exam_builder',
      category: 'study',
      legacyCategory: 'learn_study',
      categoryLabelEn: 'Learning & Study',
      categoryLabelAr: 'التعلم والدراسة',
      titleEn: 'Exam & Assessment Generator',
      titleAr: 'منشئ الامتحانات وبنوك الأسئلة',
      descEn: 'Generate accessible multiple-choice, true/false, and short-answer exams with auto-sized answer boxes.',
      descAr: 'إنشاء اختبارات ونماذج تقييم ميسرة مع مساحات إجابة نقطية ونماذج إجابة للمعلم.',
      tagsEn: ['MCQ / Essay', 'Answer Boxes', 'Teacher Key'],
      tagsAr: ['اختيار / مقالي', 'مساحات إجابة', 'نموذج الإجابة'],
      Icon: GraduationCap,
      isFeatured: false,
      action: ({ onNavigate, handleSelectTab }) => {
        if (onNavigate) (onNavigate as any)('book_studio');
        else handleSelectTab('hub');
      },
    },
    {
      id: 'passport_modal',
      category: 'study',
      legacyCategory: 'accessibility_settings',
      categoryLabelEn: 'Settings & A11y',
      categoryLabelAr: 'التسهيلات',
      titleEn: 'Universal Accommodation Passport',
      titleAr: 'جواز السفر الميسر الشامل',
      descEn: 'Manage your personalized accommodations: font scaling, high contrast palette, and reduced motion.',
      descAr: 'إدارة تسهيلاتك الفردية المخصصة: تكبير الخط، تباين الألوان العالي، تقليل الحركة، وضبط التنبيهات الحسية.',
      tagsEn: ['Font Scaling', 'High Contrast', 'Reduced Motion'],
      tagsAr: ['حجم الخط', 'تباين عالي', 'تقليل الحركة'],
      Icon: ShieldCheck,
      isFeatured: false,
      action: ({ setShowPassportModal }) => setShowPassportModal(true),
    },
    {
      id: 'languages_settings',
      category: 'study',
      legacyCategory: 'accessibility_settings',
      categoryLabelEn: 'Settings & A11y',
      categoryLabelAr: 'التسهيلات',
      titleEn: 'Language & Regional Dialects',
      titleAr: 'اللغات واللهجات الإقليمية',
      descEn: 'Choose your primary language from 11 options, including Egyptian Ammiya, Modern Standard Arabic, and English.',
      descAr: 'اختيار لغة النظام والتواصل من بين 11 لغة ولهجة تشمل العامية المصرية والفصحى والإنجليزية.',
      tagsEn: ['Egyptian Ammiya', 'Modern Arabic', 'Instant Switch'],
      tagsAr: ['مصري عامي', 'عربي فصيح', 'تبديل فوري'],
      Icon: Globe,
      isFeatured: false,
      action: ({ handleSelectTab }) => handleSelectTab('settings'),
    },
    {
      id: 'caregiver_hub',
      category: 'study',
      legacyCategory: 'accessibility_settings',
      categoryLabelEn: 'Support',
      categoryLabelAr: 'الدعم',
      titleEn: 'Caregiver & Family Support Hub',
      titleAr: 'بوابة المرافق ودائرة الدعم الأسري',
      descEn: 'Coordinate with trusted caregivers, configure emergency contacts, and safely synchronize accommodation profiles.',
      descAr: 'التنسيق مع المرافقين وأفراد العائلة، ضبط جهات اتصال الطوارئ، ومزامنة إعدادات الوصول بأمان.',
      tagsEn: ['Trusted Caregiver', 'Emergency Setup', 'Profile Sync'],
      tagsAr: ['مرافق موثوق', 'طوارئ', 'مزامنة التسهيلات'],
      Icon: User,
      isFeatured: false,
      action: ({ handleSelectTab }) => handleSelectTab('caregiver'),
    },
    ...(isOrgStaff ? [{
      id: 'org_hub',
      category: 'study' as const,
      legacyCategory: 'accessibility_settings',
      categoryLabelEn: 'Organization',
      categoryLabelAr: 'المؤسسة',
      titleEn: 'My Organization Hub',
      titleAr: 'لوحة تحكم الجمعية / المؤسسة',
      descEn: 'Cohort analytics, enrolled special-needs learners, and accessibility adoption reports.',
      descAr: 'متابعة وإدارة طلاب الجمعية المسجلين، إحصائيات مستويات الاستيعاب المعرفي، وتقارير تبني أدوات الوصول.',
      tagsEn: ['Cohort Analytics', 'Special Needs Support', 'Adoption Metrics'],
      tagsAr: ['إحصائيات الطلاب', 'دعم ذوي الإعاقة', 'تقارير التبني'],
      Icon: Building2,
      isFeatured: false,
      action: ({ handleSelectTab }: { handleSelectTab: (tab: DisabilityTab) => void }) => handleSelectTab('org'),
    }] : []),
    ...(isAdmin ? [{
      id: 'users_database_hub',
      category: 'study' as const,
      legacyCategory: 'accessibility_settings',
      categoryLabelEn: 'Administration',
      categoryLabelAr: 'الإدارة والنظام',
      titleEn: 'Users & Database Hub',
      titleAr: 'إدارة المستخدمين وقاعدة البيانات',
      descEn: 'Inspect registered users, manage roles, monitor database health, and view user analytics.',
      descAr: 'عرض سجل المستخدمين المسجلين، إدارة الصلاحيات والأدوار، ومراقبة صحة ونسخ قاعدة البيانات فيرستور.',
      tagsEn: ['User Directory', 'Firestore DB', 'Roles & Permissions', 'Live Presence'],
      tagsAr: ['دليل المستخدمين', 'قاعدة بيانات فيرستور', 'الأدوار والصلاحيات', 'المستخدمون النشطون'],
      Icon: Database,
      isFeatured: true,
      action: ({ handleSelectTab }: { handleSelectTab: (tab: DisabilityTab) => void }) => handleSelectTab('admin'),
    }] : []),
  ], [isOrgStaff, isAdmin]);

  // Filter features based on selectedCategory, searchQuery, and showAllToolsInAllView
  const displayCards = useMemo(() => {
    let list = FEATURE_CARDS;
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'saved_recent') return [];
      list = list.filter((f) => f.category === selectedCategory || f.legacyCategory === selectedCategory);
    } else if (!searchQuery && !showAllToolsInAllView) {
      // In "All Tools" without search, display the 8 featured cards matching the reference image
      list = list.filter((f) => f.isFeatured);
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;
    return FEATURE_CARDS.filter((f) => {
      const matchEn = f.titleEn.toLowerCase().includes(query) ||
        f.descEn.toLowerCase().includes(query) ||
        f.tagsEn.some((t) => t.toLowerCase().includes(query));
      const matchAr = f.titleAr.toLowerCase().includes(query) ||
        f.descAr.toLowerCase().includes(query) ||
        f.tagsAr.some((t) => t.toLowerCase().includes(query));
      return matchEn || matchAr;
    });
  }, [selectedCategory, searchQuery, showAllToolsInAllView, FEATURE_CARDS]);

  const isAr = profile.language === 'Arabic' || profile.language === 'Egyptian Ammiya';
  const isDeafActive = activeTab === 'deaf' || activeTab === 'radar' || activeTab === 'bridge' || activeTab === 'studio' || activeTab === 'video';

  const handleToggleLanguage = () => {
    if (isAr) {
      updateLanguage('English');
    } else {
      updateLanguage('Arabic');
    }
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="flex flex-col h-full w-full min-h-screen bg-[#061A33] text-[#F5F8FF] font-sans antialiased overflow-hidden selection:bg-[#087F8C]/40 selection:text-white">
      
      {/* ── TOP HEADER (Dark Blue Navy Aesthetic matching the Reference) ── */}
      <header className="relative z-30 h-16 shrink-0 flex items-center justify-between border-b border-[#16395E] bg-[#082344]/95 backdrop-blur-xl px-4 sm:px-6 transition-colors">
        {/* Left Header Group: Logo & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label={localize(profile.language, 'Open navigation menu', 'فتح القائمة الرئيسية')}
            className="lg:hidden p-2 rounded-xl text-[#C4D3E5] hover:text-white bg-[#071F3C] border border-[#16395E] hover:border-[#10B8B0]/50 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0]"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Cognify Brand Logo Anchor */}
          <div 
            onClick={() => {
              if (activeTab !== 'hub') handleSelectTab('hub');
              else if (onNavigate) (onNavigate as any)('learning');
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1769B0] to-[#087F8C] flex items-center justify-center text-white shadow-md shadow-[#087F8C]/25 group-hover:scale-105 transition-transform duration-200">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-[#F5F8FF] leading-none group-hover:text-[#10B8B0] transition-colors">
                Cognify
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#087F8C]/30 text-[#10B8B0] border border-[#087F8C]/50 uppercase tracking-wider">
                A11y
              </span>
            </div>
          </div>
        </div>

        {/* Center: Suite Switcher Tabs (Matching the Reference: All Tools, Visual Assistant, Hearing, Study, AI Tutor) */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-[#071F3C] border border-[#16395E]">
          {[
            { id: 'hub' as const, labelEn: 'All Tools', labelAr: 'جميع الأدوات', Icon: Grid },
            { id: 'vision' as const, labelEn: 'Visual Assistant', labelAr: 'المساعد البصري', Icon: Eye },
            { id: 'deaf' as const, labelEn: 'Hearing', labelAr: 'السمعي', Icon: Ear },
            { id: 'study' as const, labelEn: 'Learning & Study', labelAr: 'التعلم والدراسة', Icon: GraduationCap },
            { id: 'chat' as const, labelEn: 'AI Tutor', labelAr: 'الذكاء الاصطناعي', Icon: Brain },
          ].map((suite) => {
            const isSelected =
              suite.id === 'deaf'
                ? isDeafActive
                : suite.id === 'study'
                ? activeTab === 'hub' && selectedCategory === 'study'
                : activeTab === suite.id;

            return (
              <button
                key={suite.id}
                type="button"
                onClick={() => {
                  if (suite.id === 'study') {
                    handleSelectTab('hub');
                    setSelectedCategory('study');
                  } else {
                    handleSelectTab(suite.id);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer outline-none ${
                  isSelected
                    ? 'bg-[#00AEB8] text-[#061A33] shadow-md font-black'
                    : 'text-[#C4D3E5] hover:text-white hover:bg-[#082344]'
                }`}
              >
                <suite.Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{localize(profile.language, suite.labelEn, suite.labelAr)}</span>
              </button>
            );
          })}
        </div>

        {/* Right Header Controls: Theme Toggle, Language Switch, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          {toggleTheme && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 min-h-[38px] min-w-[38px] rounded-xl border border-[#16395E] bg-[#071F3C] text-[#C4D3E5] hover:text-amber-400 hover:border-[#10B8B0]/50 transition-all flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0]"
              title={isDarkMode ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي'}
              aria-label="Toggle light or dark theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#C4D3E5]" />}
            </button>
          )}

          {/* Language Switcher Pill (EN | AR) */}
          <div className="flex items-center rounded-xl border border-[#16395E] bg-[#071F3C] p-0.5">
            <button
              type="button"
              onClick={() => updateLanguage('English')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isAr ? 'bg-[#00AEB8] text-[#061A33] font-black shadow-xs' : 'text-[#C4D3E5] hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => updateLanguage('Arabic')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isAr ? 'bg-[#00AEB8] text-[#061A33] font-black shadow-xs' : 'text-[#C4D3E5] hover:text-white'
              }`}
            >
              AR
            </button>
          </div>

          {/* User Profile Pill Indicator */}
          <button
            type="button"
            onClick={() => {
              if (onNavigate) (onNavigate as any)('profile');
              else setShowPassportModal(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-full border border-[#16395E] bg-[#071F3C] hover:bg-[#082344] hover:border-[#10B8B0]/50 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0]"
            aria-label={localize(profile.language, 'Open user profile', 'فتح الملف الشخصي')}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#1769B0] to-[#087F8C] flex items-center justify-center text-xs font-bold text-white shadow-xs">
              {profile.name ? profile.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="text-xs font-medium text-[#F5F8FF] max-w-[120px] truncate hidden md:inline">
              {localize(profile.language, `Welcome, ${profile.name || 'User'}`, `مرحباً، ${profile.name || 'المستخدم'}`)}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#C4D3E5]" />
          </button>
        </div>
      </header>

      {/* ── BODY SHELL: DESKTOP SIDEBAR + MAIN CONTENT ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* ── DESKTOP LEFT SIDEBAR ── */}
        <aside className="hidden lg:flex flex-col justify-between w-64 shrink-0 bg-[#082344] border-e border-[#16395E] p-4 overflow-y-auto custom-scrollbar">
          {/* Main Sidebar Navigation Links */}
          <div className="space-y-1">
            {/* Home */}
            <button
              type="button"
              onClick={() => handleSelectTab('hub')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer text-start ${
                activeTab === 'hub'
                  ? 'font-bold bg-[#071F3C] text-[#10B8B0] border border-[#16395E]'
                  : 'font-semibold text-[#C4D3E5] hover:text-[#F5F8FF] hover:bg-[#071F3C]'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>{localize(profile.language, 'Home', 'الرئيسية')}</span>
            </button>

            {/* Visual Assistant (ACTIVE with Teal Pill when activeTab === 'vision') */}
            <button
              type="button"
              onClick={() => handleSelectTab('vision')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer text-start ${
                activeTab === 'vision'
                  ? 'font-bold bg-[#00AEB8] text-[#061A33] shadow-md shadow-[#00AEB8]/30 border border-[#00AEB8]/40'
                  : 'font-semibold text-[#C4D3E5] hover:text-[#F5F8FF] hover:bg-[#071F3C]'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{localize(profile.language, 'Visual Assistant', 'المساعد البصري')}</span>
            </button>

            {/* Learning Path */}
            <button
              type="button"
              onClick={() => {
                if (onNavigate) (onNavigate as any)('learning');
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#C4D3E5] hover:text-[#F5F8FF] hover:bg-[#071F3C] transition-all cursor-pointer text-start"
            >
              <BookOpen className="w-4 h-4" />
              <span>{localize(profile.language, 'Learning Path', 'مسار التعلم')}</span>
            </button>

            {/* My Progress */}
            <button
              type="button"
              onClick={() => {
                if (onNavigate) (onNavigate as any)('profile');
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#C4D3E5] hover:text-[#F5F8FF] hover:bg-[#071F3C] transition-all cursor-pointer text-start"
            >
              <Activity className="w-4 h-4" />
              <span>{localize(profile.language, 'My Progress', 'تقدمي')}</span>
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => handleSelectTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer text-start ${
                activeTab === 'settings'
                  ? 'font-bold bg-[#00AEB8] text-[#061A33] shadow-md shadow-[#00AEB8]/30 border border-[#00AEB8]/40'
                  : 'font-semibold text-[#C4D3E5] hover:text-[#F5F8FF] hover:bg-[#071F3C]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{localize(profile.language, 'Settings', 'الإعدادات')}</span>
            </button>

            {/* Users & Database (Admin Only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleSelectTab('admin')}
                aria-current={activeTab === 'admin' ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer text-start ${
                  activeTab === 'admin'
                    ? 'font-bold bg-[#00AEB8] text-[#061A33] shadow-md shadow-[#00AEB8]/30 border border-[#00AEB8]/40'
                    : 'font-semibold text-[#00AEB8] hover:text-[#F5F8FF] hover:bg-[#071F3C] border border-[#00AEB8]/20 bg-[#00AEB8]/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4" />
                  <span>{localize(profile.language, 'Users & Database', 'إدارة المستخدمين وقاعدة البيانات')}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                  activeTab === 'admin' ? 'bg-[#061A33] text-[#00AEB8]' : 'bg-[#00AEB8]/20 text-[#00AEB8]'
                }`}>
                  {localize(profile.language, 'Admin', 'مشرف')}
                </span>
              </button>
            )}
          </div>

          {/* Bottom Sidebar Accessibility Reassurance Badge */}
          <div className="p-4 rounded-2xl bg-[#071F3C] border border-[#16395E] space-y-2 mt-auto text-start shadow-sm">
            <div className="flex items-center gap-2 text-[#00AEB8]">
              <div className="w-8 h-8 rounded-lg bg-[#00AEB8]/20 flex items-center justify-center text-[#00AEB8] shrink-0">
                <Accessibility className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[#F5F8FF]">
                {localize(profile.language, 'Accessibility First', 'الإتاحة أولاً')}
              </h4>
            </div>
            <p className="text-[11px] text-[#C4D3E5] leading-relaxed">
              {localize(
                profile.language,
                'Cognify supports comprehensive assistive technologies with full accessibility for all.',
                'تدعم تقنيات المساعدة والوصول الشامل مع مراعاة إمكانية الوصول للجميع.'
              )}
            </p>
          </div>
        </aside>

        {/* ── MOBILE SLIDE-IN DRAWER SIDEBAR ── */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden"
              />
              <motion.aside
                initial={{ x: isAr ? '100%' : '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: isAr ? '100%' : '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className={`fixed top-0 bottom-0 ${isAr ? 'right-0' : 'left-0'} w-72 bg-[#082344] border-[#16395E] z-50 p-5 flex flex-col justify-between shadow-2xl lg:hidden`}
              >
                <div className="space-y-4">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#16395E]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#087F8C] flex items-center justify-center text-white">
                        <Brain className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-[#F5F8FF] text-base">Cognify</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="p-2 rounded-lg text-[#C4D3E5] hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        if (activeTab !== 'hub') handleSelectTab('hub');
                        else if (onNavigate) (onNavigate as any)('learning');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-[#C4D3E5] hover:text-[#F5F8FF] hover:bg-[#071F3C]"
                    >
                      <Home className="w-4 h-4" />
                      <span>{localize(profile.language, 'Home', 'الرئيسية')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        handleSelectTab('hub');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold bg-[#087F8C] text-white shadow-md"
                    >
                      <Layers className="w-4 h-4" />
                      <span>{localize(profile.language, 'Accessibility Tools', 'أدوات الإتاحة')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        if (onNavigate) (onNavigate as any)('learning');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-[#C4D3E5] hover:text-[#F5F8FF] hover:bg-[#071F3C]"
                    >
                      <Compass className="w-4 h-4" />
                      <span>{localize(profile.language, 'Learning Path', 'مسار التعلم')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        if (onNavigate) (onNavigate as any)('profile');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-[#C4D3E5] hover:text-[#F5F8FF] hover:bg-[#071F3C]"
                    >
                      <Activity className="w-4 h-4" />
                      <span>{localize(profile.language, 'My Progress', 'تقدمي الدراسي')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        handleSelectTab('settings');
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs transition-all cursor-pointer text-start ${
                        activeTab === 'settings'
                          ? 'font-bold bg-[#00AEB8] text-[#061A33] shadow-md'
                          : 'font-semibold text-[#C4D3E5] hover:text-[#F5F8FF] hover:bg-[#071F3C]'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>{localize(profile.language, 'Settings', 'الإعدادات')}</span>
                    </button>

                    {/* Users & Database (Admin Only) */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileSidebarOpen(false);
                          handleSelectTab('admin');
                        }}
                        aria-current={activeTab === 'admin' ? 'page' : undefined}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs transition-all cursor-pointer text-start ${
                          activeTab === 'admin'
                            ? 'font-bold bg-[#00AEB8] text-[#061A33] shadow-md'
                            : 'font-semibold text-[#00AEB8] hover:text-[#F5F8FF] hover:bg-[#071F3C] border border-[#00AEB8]/20 bg-[#00AEB8]/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Database className="w-4 h-4" />
                          <span>{localize(profile.language, 'Users & Database', 'إدارة المستخدمين وقاعدة البيانات')}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          activeTab === 'admin' ? 'bg-[#061A33] text-[#00AEB8]' : 'bg-[#00AEB8]/20 text-[#00AEB8]'
                        }`}>
                          {localize(profile.language, 'Admin', 'مشرف')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Badge */}
                <div className="p-4 rounded-2xl bg-[#071F3C] border border-[#16395E] space-y-1.5 text-start">
                  <div className="flex items-center gap-2 text-[#10B8B0]">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <h4 className="text-xs font-bold text-[#F5F8FF]">
                      {localize(profile.language, 'Accessibility First', 'الإتاحة أولاً')}
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#C4D3E5] leading-relaxed">
                    {localize(
                      profile.language,
                      'Designed for every learner with high contrast and assistive navigation.',
                      'مصممة لكل متعلم مع تباين عالي وملاحة تيسيرية متوافقة.'
                    )}
                  </p>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── MAIN CONTENT CONTAINER ── */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative pb-16 md:pb-0">
          <AnimatePresence mode="wait">

            {/* ═════════════════════════════════════════════════════════════════════
                VIEW: ACCESSIBLE DASHBOARD HUB (APPROVED BLUE-NAVY UI)
               ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'hub' && (
              <motion.div
                key="hub-features-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 w-full h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8"
              >
                <div className="max-w-7xl mx-auto space-y-8 pb-20">

                  {/* ── 1. WELCOME HERO SECTION (Exact Reference Match) ── */}
                  <section
                    aria-label={localize(profile.language, 'Welcome to Cognify', 'مرحباً بك في كوجنيفاي')}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#082344] via-[#071F3C] to-[#082344] border border-[#16395E] p-6 sm:p-8 lg:p-10 shadow-xl"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                      {/* Left Column: Heading, Subtitle, and Tag */}
                      <div className="lg:col-span-7 space-y-4 text-start">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-[#10B8B0]/15 text-[#10B8B0] border border-[#10B8B0]/30 shadow-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{localize(profile.language, 'Welcome to Cognify', 'مرحباً بك في كوجنيفاي')}</span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#F5F8FF] tracking-tight leading-tight">
                          {localize(
                            profile.language,
                            'Tools for a More Inclusive Learning Experience',
                            'أدوات لتجربة تعليمية أكثر شمولاً واستقلالية'
                          )}
                        </h1>

                        <p className="text-sm sm:text-base text-[#C4D3E5] leading-relaxed max-w-xl font-normal">
                          {localize(
                            profile.language,
                            'Explore assistive tools designed to support diverse learning needs, from vision enhancement to speech and cognitive aids.',
                            'استكشف الأدوات التيسيرية المصممة لدعم مختلف الاحتياجات التعليمية، من تعزيز الرؤية إلى التواصل الصوتي والدعم المعرفي.'
                          )}
                        </p>
                      </div>

                      {/* Right Column: Seamless Transparent Floating Illustration with Ambient Glow */}
                      <div className="lg:col-span-5 relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-radial from-[#087F8C]/35 via-[#1769B0]/20 to-transparent blur-3xl -z-10 rounded-full scale-125 pointer-events-none" />
                        <img
                          src="/assets/inclusive-learners-illustration.png"
                          alt={localize(profile.language, 'Diverse learners collaborating inclusively', 'طلاب متنوعون يتعلمون معاً في بيئة ميسرة')}
                          className="w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] object-contain drop-shadow-[0_15px_35px_rgba(8,127,140,0.35)] select-none pointer-events-none transform transition-transform duration-500 hover:scale-105"
                        />
                      </div>
                    </div>
                  </section>

                  {/* ── 2. SEARCH & HORIZONTAL CATEGORY FILTERS ── */}
                  <div className="space-y-4">
                    {/* Search Bar + Mobile Category Dropdown */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <label htmlFor="dashboard-feature-search" className="sr-only">
                          {localize(profile.language, 'Search for tools', 'البحث عن الأدوات')}
                        </label>
                        <Search className="w-4 h-4 text-[#10B8B0] absolute start-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="dashboard-feature-search"
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={localize(
                            profile.language,
                            'Search for tools (e.g. camera, currency, speech, study)...',
                            'ابحث عن الأدوات (مثال: كاميرا، عملات، تفريغ، مذاكرة)...'
                          )}
                          className="w-full bg-[#082344] border border-[#16395E] rounded-2xl py-3 ps-11 pe-10 text-sm text-[#F5F8FF] placeholder:text-[#C4D3E5]/60 outline-none focus:border-[#10B8B0] focus:ring-2 focus:ring-[#10B8B0]/20 transition-all shadow-inner"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label={localize(profile.language, 'Clear search', 'مسح البحث')}
                            className="absolute inset-y-0 end-0 pe-4 flex items-center text-[#C4D3E5] hover:text-[#F5F8FF] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Mobile Category Dropdown (fallback on very small screens) */}
                      <div className="sm:hidden">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value as DashboardCategory)}
                          className="w-full bg-[#082344] border border-[#16395E] rounded-2xl py-3 px-4 text-xs font-bold text-[#F5F8FF] outline-none"
                        >
                          {DASHBOARD_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {localize(profile.language, cat.titleEn, cat.titleAr)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Horizontal Category Filter Pills */}
                    <div
                      role="tablist"
                      aria-label={localize(profile.language, 'Tool Categories', 'تصنيفات الأدوات')}
                      className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-1"
                    >
                      {DASHBOARD_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        const count =
                          cat.id === 'all'
                            ? (searchQuery || showAllToolsInAllView ? FEATURE_CARDS.length : 8)
                            : cat.id === 'saved_recent'
                            ? recentDocs.length + recentActivities.length + spatialObjects.length
                            : FEATURE_CARDS.filter((f) => f.category === cat.id).length;

                        return (
                          <button
                            key={cat.id}
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => setSelectedCategory(cat.id as DashboardCategory)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0] shrink-0 ${
                              isSelected
                                ? 'bg-[#087F8C] text-white border border-[#10B8B0] shadow-md shadow-[#087F8C]/35'
                                : 'bg-[#082344] text-[#C4D3E5] border border-[#16395E] hover:text-[#F5F8FF] hover:border-[#10B8B0]/40'
                            }`}
                          >
                            <cat.icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{localize(profile.language, cat.titleEn, cat.titleAr)}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isSelected
                                  ? 'bg-[#071F3C] text-[#10B8B0]'
                                  : 'bg-[#071F3C] text-[#C4D3E5]/80'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── 3. FEATURED TOOLS 4-COLUMN RESPONSIVE GRID ── */}
                  {selectedCategory !== 'saved_recent' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {displayCards.map((card) => {
                          const CardIcon = card.Icon;
                          return (
                            <div
                              key={card.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => card.action({ handleSelectTab, onNavigate, setShowPassportModal })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  card.action({ handleSelectTab, onNavigate, setShowPassportModal });
                                }
                              }}
                              aria-label={localize(profile.language, card.titleEn, card.titleAr)}
                              className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#071F3C] border border-[#16395E] hover:border-[#10B8B0]/60 hover:-translate-y-1 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:shadow-[#087F8C]/15 outline-none focus-visible:ring-2 focus-visible:ring-[#10B8B0] text-start"
                            >
                              <div className="space-y-3.5">
                                {/* Top Row: Icon Container + Chevron Action Button */}
                                <div className="flex items-center justify-between">
                                  <div className="w-11 h-11 rounded-xl bg-[#082344] border border-[#16395E] group-hover:border-[#087F8C] group-hover:bg-[#087F8C] text-[#10B8B0] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs">
                                    <CardIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
                                  </div>
                                  <div className="w-8 h-8 rounded-lg bg-[#082344] border border-[#16395E] text-[#C4D3E5] group-hover:bg-[#10B8B0] group-hover:text-white group-hover:border-[#10B8B0] flex items-center justify-center transition-all duration-200">
                                    <ChevronRight className={`w-4 h-4 transition-transform ${isAr ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                                  </div>
                                </div>

                                {/* Title */}
                                <h3 className="text-base font-bold text-[#F5F8FF] group-hover:text-[#10B8B0] transition-colors leading-snug line-clamp-1">
                                  {localize(profile.language, card.titleEn, card.titleAr)}
                                </h3>

                                {/* Description */}
                                <p className="text-xs text-[#C4D3E5] leading-relaxed line-clamp-3 min-h-[3rem]">
                                  {localize(profile.language, card.descEn, card.descAr)}
                                </p>
                              </div>

                              {/* Bottom: Category Tag Badge & Action Hint */}
                              <div className="pt-4 mt-2 border-t border-[#16395E]/60 flex items-center justify-between">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#082344] border border-[#16395E] text-[#10B8B0]">
                                  {localize(profile.language, card.categoryLabelEn, card.categoryLabelAr)}
                                </span>
                                <span className="text-[11px] font-medium text-[#C4D3E5]/70 group-hover:text-[#F5F8FF] transition-colors">
                                  {localize(profile.language, 'Open Tool', 'فتح الأداة')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Expand / Collapse All Tools toggle when in 'all' view without active search */}
                      {selectedCategory === 'all' && !searchQuery && (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAllToolsInAllView(!showAllToolsInAllView)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#16395E] bg-[#082344] text-[#C4D3E5] hover:text-[#F5F8FF] hover:border-[#10B8B0]/50 transition-all text-xs font-bold cursor-pointer"
                          >
                            <span>
                              {showAllToolsInAllView
                                ? localize(profile.language, 'Show Featured 8 Tools Only', 'عرض الأدوات الثمانية المميزة فقط')
                                : localize(profile.language, `Explore All ${FEATURE_CARDS.length} Assistive Tools`, `استكشف كافة الأدوات الـ ${FEATURE_CARDS.length}`)}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showAllToolsInAllView ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      )}

                      {/* Empty Search Result State */}
                      {displayCards.length === 0 && (
                        <div className="p-8 sm:p-12 text-center rounded-3xl border border-dashed border-[#16395E] bg-[#082344]/50 space-y-3">
                          <Search className="w-8 h-8 text-[#10B8B0] mx-auto" />
                          <h3 className="text-base font-bold text-[#F5F8FF]">
                            {localize(profile.language, 'No matching tools found', 'لم يتم العثور على أدوات مطابقة')}
                          </h3>
                          <p className="text-xs sm:text-sm text-[#C4D3E5] max-w-md mx-auto leading-relaxed">
                            {localize(
                              profile.language,
                              `No assistive features found matching "${searchQuery}". Try a different keyword or reset filters.`,
                              `لا توجد أدوات مطابقة لـ "${searchQuery}". جرب كلمة بحث أخرى أو أعد ضبط التصنيف.`
                            )}
                          </p>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                              }}
                              className="px-4 py-2 rounded-xl bg-[#087F8C] text-white text-xs font-bold hover:bg-[#10B8B0] transition-colors cursor-pointer"
                            >
                              {localize(profile.language, 'Reset Search & Categories', 'إعادة ضبط البحث والتصنيفات')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── 4. SAVED RESULTS AND RECENT ACTIVITY SECTION ── */}
                  {(selectedCategory === 'saved_recent') && (
                    <section
                      aria-label={localize(profile.language, 'Saved Results and Recent Activity', 'النتائج المحفوظة والنشاط الأخير')}
                      className="space-y-6 pt-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <History className="w-5 h-5 text-[#10B8B0]" />
                          <h2 className="text-lg font-bold text-[#F5F8FF]">
                            {localize(profile.language, 'Saved Results & Recent Activity', 'النتائج المحفوظة والنشاط الأخير')}
                          </h2>
                        </div>

                        {(recentActivities.length > 0 || recentDocs.length > 0) && (
                          <button
                            type="button"
                            onClick={handleClearActivities}
                            aria-label={localize(profile.language, 'Clear activity history', 'مسح سجل النشاط')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{localize(profile.language, 'Clear History', 'مسح السجل')}</span>
                          </button>
                        )}
                      </div>

                      {/* Sub-Section A: Saved Documents */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#C4D3E5] flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-[#10B8B0]" />
                            <span>{localize(profile.language, 'Saved Educational Documents', 'الكتب والمستندات المحفوظة')}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#071F3C] text-[#10B8B0] border border-[#16395E]">
                              {recentDocs.length}
                            </span>
                          </h3>

                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigate) (onNavigate as any)('book_studio');
                              else handleSelectTab('hub');
                            }}
                            className="text-xs font-bold text-[#10B8B0] hover:underline flex items-center gap-1 cursor-pointer"
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
                                className="p-4 rounded-2xl bg-[#071F3C] border border-[#16395E] flex flex-col justify-between gap-3 text-start shadow-sm"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#082344] text-[#10B8B0] border border-[#16395E]">
                                      {docItem.template}
                                    </span>
                                    <span className="text-[10px] text-[#C4D3E5]/70 font-medium">
                                      {new Date(docItem.updatedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold truncate text-[#F5F8FF]">
                                    {docItem.title}
                                  </h4>
                                  <p className="text-xs text-[#C4D3E5] mt-1">
                                    {localize(
                                      profile.language,
                                      `${docItem.wordCount || 0} words · ${docItem.sectionsCount || 0} sections`,
                                      `${docItem.wordCount || 0} كلمة · ${docItem.sectionsCount || 0} أقسام`
                                    )}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-[#16395E]">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSavedDoc(docItem)}
                                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-[#087F8C] hover:bg-[#10B8B0] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>{localize(profile.language, 'Edit & Export', 'تعديل وتصدير')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSpeakSnippet(docItem.title)}
                                    className="p-1.5 rounded-lg border border-[#16395E] text-[#C4D3E5] hover:text-[#10B8B0] hover:bg-[#082344] transition-colors cursor-pointer"
                                  >
                                    <Volume2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center rounded-2xl bg-[#082344] border border-[#16395E] space-y-2">
                            <BookOpen className="w-6 h-6 text-[#10B8B0] mx-auto" />
                            <p className="text-xs text-[#C4D3E5]">
                              {localize(profile.language, 'No saved documents yet in Book Studio', 'لا توجد مستندات محفوظة حتى الآن في استوديو الكتب')}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Sub-Section B: Recent Scans */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#C4D3E5] flex items-center gap-1.5">
                            <ScanLine className="w-3.5 h-3.5 text-[#10B8B0]" />
                            <span>{localize(profile.language, 'Recent Scans & Toolkit Activity', 'المسح الضوئي والنشاط الأخير')}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#071F3C] text-[#10B8B0] border border-[#16395E]">
                              {recentActivities.length}
                            </span>
                          </h3>

                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigate) (onNavigate as any)('toolkit');
                              else handleSelectTab('hub');
                            }}
                            className="text-xs font-bold text-[#10B8B0] hover:underline flex items-center gap-1 cursor-pointer"
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
                                className="p-4 rounded-2xl bg-[#071F3C] border border-[#16395E] flex flex-col justify-between gap-3 text-start shadow-sm"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#082344] text-[#C4D3E5] border border-[#16395E]">
                                      {act.type}
                                    </span>
                                    <span className="text-[10px] text-[#C4D3E5]/70 font-medium">
                                      {new Date(act.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold truncate text-[#F5F8FF]">
                                    {act.title}
                                  </h4>
                                  <p className="text-xs text-[#C4D3E5] line-clamp-2 mt-1">
                                    {act.snippet}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-[#16395E]">
                                  <button
                                    type="button"
                                    onClick={() => handleSpeakSnippet(act.snippet || act.title)}
                                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-[#082344] hover:bg-[#071F3C] text-[#C4D3E5] hover:text-white border border-[#16395E] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Volume2 className="w-3.5 h-3.5 text-[#10B8B0]" />
                                    <span>{localize(profile.language, 'Listen Aloud', 'استمع صوتياً')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteActivity(act.id)}
                                    className="p-1.5 rounded-lg border border-transparent text-[#C4D3E5] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center rounded-2xl bg-[#082344] border border-[#16395E] space-y-2">
                            <ScanLine className="w-6 h-6 text-[#10B8B0] mx-auto" />
                            <p className="text-xs text-[#C4D3E5]">
                              {localize(profile.language, 'No recent scans or OCR activity', 'لا توجد عمليات مسح ضوئي سابقة')}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* ── 5. BOTTOM REASSURANCE BANNER (Accessibility First) ── */}
                  <section
                    aria-label={localize(profile.language, 'Accessibility Commitment', 'التزام إمكانية الوصول')}
                    className="p-5 sm:p-6 rounded-2xl bg-[#082344] border border-[#16395E] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg"
                  >
                    <div className="flex items-center gap-4 text-start">
                      <div className="w-12 h-12 rounded-2xl bg-[#071F3C] border border-[#16395E] flex items-center justify-center text-[#10B8B0] shrink-0 shadow-inner">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-sm sm:text-base font-bold text-[#F5F8FF]">
                          {localize(profile.language, 'Accessibility First', 'الإتاحة أولاً وأبداً')}
                        </h3>
                        <p className="text-xs text-[#C4D3E5] leading-relaxed max-w-2xl">
                          {localize(
                            profile.language,
                            'Cognify is committed to providing equal learning opportunities through adaptive technologies.',
                            'تلتزم كوجنيفاي بتقديم فرص تعليمية متكافئة للجميع عبر أحدث التقنيات التكيفية الميسرة.'
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPassportModal(true)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#071F3C] hover:bg-[#087F8C] text-[#10B8B0] hover:text-white border border-[#16395E] hover:border-[#10B8B0] transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{localize(profile.language, 'Universal Passport', 'جواز التسهيلات')}</span>
                    </button>
                  </section>

                </div>
              </motion.div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════
                SUB-VIEWS: PRESERVE REAL WORKING FUNCTIONALITY
               ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'vision' && (
              <motion.div
                key="vision-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full h-full min-h-0"
              >
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-[#C4D3E5]">
                    <div className="w-8 h-8 border-2 border-[#10B8B0] border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <VisionCompanionView profile={profile} setProfile={setProfile} onNavigateBack={handleNavigateBack} />
                </React.Suspense>
              </motion.div>
            )}

            {isDeafActive && (
              <motion.div
                key="deaf-unified-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full h-full min-h-0"
              >
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-[#C4D3E5]">
                    <div className="w-8 h-8 border-2 border-[#10B8B0] border-t-transparent rounded-full animate-spin" />
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full h-full min-h-0"
              >
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-[#C4D3E5]">
                    <div className="w-8 h-8 border-2 border-[#10B8B0] border-t-transparent rounded-full animate-spin" />
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full h-full min-h-0"
              >
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-[#C4D3E5]">
                    <div className="w-8 h-8 border-2 border-[#10B8B0] border-t-transparent rounded-full animate-spin" />
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full h-full min-h-0"
              >
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-[#C4D3E5]">
                    <div className="w-8 h-8 border-2 border-[#10B8B0] border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <OrgDashboard profile={profile} />
                </React.Suspense>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div
                key="chat-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full h-full min-h-0 flex flex-col p-2 sm:p-4 pb-0"
              >
                <div className="flex-1 min-h-0 bg-[#0A203A] rounded-2xl shadow-xl border border-[rgba(72,139,190,0.22)] overflow-hidden relative flex flex-col">
                  <React.Suspense fallback={
                    <div className="flex-1 flex items-center justify-center p-8 text-[#C4D3E5]">
                      <div className="w-8 h-8 border-2 border-[#10B8B0] border-t-transparent rounded-full animate-spin" />
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
                      isEmbedded={false}
                      setProfile={setProfile}
                      onNavigateBack={handleNavigateBack}
                    />
                  </React.Suspense>
                </div>
              </motion.div>
            )}

            {activeTab === 'progress' && (
              <motion.div
                key="progress-profile-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full min-h-0 overflow-y-auto custom-scrollbar"
              >
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-[#C4D3E5]">
                    <div className="w-8 h-8 border-2 border-[#10B8B0] border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <ProfilePage
                    profile={profile}
                    onMenuClick={onMenuClick}
                    setProfile={setProfile}
                    onNavigateBack={handleNavigateBack}
                    onNavigate={onNavigate}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                  />
                </React.Suspense>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full min-h-0 overflow-y-auto custom-scrollbar"
              >
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-[#C4D3E5]">
                    <div className="w-8 h-8 border-2 border-[#10B8B0] border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <StudentSettingsView
                    profile={profile}
                    setProfile={setProfile}
                    onNavigateBack={handleNavigateBack}
                    onNavigate={onNavigate}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                  />
                </React.Suspense>
              </motion.div>
            )}

            {activeTab === 'admin' && isAdmin && (
              <motion.div
                key="admin-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full min-h-0 overflow-y-auto custom-scrollbar"
              >
                <React.Suspense fallback={
                  <div className="flex-1 flex items-center justify-center p-8 text-[#C4D3E5]">
                    <div className="w-8 h-8 border-2 border-[#10B8B0] border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <AdminDashboard
                    profile={profile}
                    onMenuClick={() => setIsMobileSidebarOpen(true)}
                    onNavigateBack={handleNavigateBack}
                  />
                </React.Suspense>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

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
