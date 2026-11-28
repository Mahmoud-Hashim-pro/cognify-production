import React, { useMemo, useState } from 'react';
import { scoreFeature } from '../lib/featureSearch';
import { 
  UserProfile, 
  ChatThread 
} from '../types';
import { 
  PRODUCT_SECTIONS, 
  ProductSectionId, 
  getProductSection, 
  getSectionIconComponent,
  SectionFeatureItem 
} from '../lib/sections';
import { isArabicLocale, localize, L, isFrenchActive } from '../lib/translations';
import { 
  Eye, 
  BookOpen, 
  Briefcase, 
  Compass, 
  MessageSquare, 
  Settings, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  ArrowDown,
  Clock, 
  FileText, 
  CheckCircle2, 
  Layers, 
  ChevronRight, 
  Mic, 
  Sliders, 
  HelpCircle, 
  Plus, 
  Activity, 
  Ear,
  LifeBuoy,
  Search,
  X
} from 'lucide-react';

export interface HomeDashboardProps {
  profile: UserProfile;
  onSelectSection: (sectionId: ProductSectionId) => void;
  onSelectTab: (tab: any) => void;
  onNavigate?: (view: string, tab?: string) => void;
  onOpenPassport: () => void;
  isDarkMode: boolean;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  profile,
  onSelectSection,
  onSelectTab,
  onNavigate,
  onOpenPassport,
  isDarkMode,
}) => {
  const isAr = isArabicLocale(profile.language);
  const t = (en: string, ar: string) => (isAr ? ar : L(en));

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Time-of-day personalized greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = profile.name || profile.email?.split('@')[0] || (isAr ? 'صديقي' : isFrenchActive() ? 'ami' : 'Friend');
    if (hour < 12) {
      return isAr ? `صباح الخير، ${name}` : isFrenchActive() ? `Bonjour, ${name}` : `Good morning, ${name}`;
    }
    if (hour < 18) {
      return isAr ? `مساء الخير، ${name}` : isFrenchActive() ? `Bon après-midi, ${name}` : `Good afternoon, ${name}`;
    }
    return isAr ? `مساء الخير، ${name}` : isFrenchActive() ? `Bonsoir, ${name}` : `Good evening, ${name}`;
  }, [profile.name, profile.email, isAr]);

  // 2. Read actual recent reading history (Zero fake data)
  const recentReadingItems = useMemo(() => {
    try {
      const saved = localStorage.getItem('rafiqi_recent_books');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 3);
      }
    } catch {}
    return [];
  }, []);

  // 3. Read actual recent working tasks (Zero fake data)
  const recentTasks = useMemo(() => {
    if (profile.tasks && profile.tasks.length > 0) {
      return profile.tasks.slice(0, 3);
    }
    return [];
  }, [profile.tasks]);

  // 4. Read actual chat threads (Zero fake data)
  const recentThreads = useMemo(() => {
    if (profile.chatThreads && profile.chatThreads.length > 0) {
      return profile.chatThreads.slice(-3).reverse();
    }
    return [];
  }, [profile.chatThreads]);

  // Consolidated Recent Activity: Maximum 3 items across all actual activity
  const consolidatedRecentActivity = useMemo(() => {
    const combined: Array<{
      id: string;
      title: string;
      category: 'reading' | 'task' | 'chat';
      categoryLabel: string;
      desc: string;
      action: () => void;
      actionLabel: string;
      icon: typeof BookOpen;
    }> = [];

    recentReadingItems.forEach((item: any, idx: number) => {
      combined.push({
        id: `reading-${item.id || idx}`,
        title: item.title || t('Saved Document', 'مستند محفوظ'),
        category: 'reading',
        categoryLabel: t('Reading', 'قراءة'),
        desc: item.snippet || item.fileType?.toUpperCase() || t('Book / Document', 'كتاب / مستند'),
        action: () => onSelectSection('read_learn'),
        actionLabel: t('Resume Reading', 'متابعة القراءة'),
        icon: BookOpen,
      });
    });

    recentTasks.forEach((task: any, idx: number) => {
      combined.push({
        id: `task-${task.id || idx}`,
        title: task.title || t('Active Task', 'مهمة قيد التنفيذ'),
        category: 'task',
        categoryLabel: t('Task', 'مهمة'),
        desc: task.category || t('Workspace item', 'عنصر في مساحة العمل'),
        action: () => onSelectSection('work_create'),
        actionLabel: t('View Task', 'عرض المهمة'),
        icon: Briefcase,
      });
    });

    recentThreads.forEach((th: any, idx: number) => {
      combined.push({
        id: `chat-${th.id || idx}`,
        title: th.title || t('Assistive Session', 'جلسة مساندة'),
        category: 'chat',
        categoryLabel: t('Conversation', 'محادثة'),
        desc: th.lastMessageSnippet || t('Active discussion', 'جلسة حوارية'),
        action: () => onNavigate?.('chat'),
        actionLabel: t('Open Chat', 'فتح المحادثة'),
        icon: MessageSquare,
      });
    });

    return combined.slice(0, 3);
  }, [recentReadingItems, recentTasks, recentThreads, isAr, onSelectSection, onNavigate]);

  // Search results across all 6 sections and constituent features
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matches: Array<{
      type: 'feature' | 'section';
      sectionId: ProductSectionId;
      sectionTitle: string;
      title: string;
      desc: string;
      iconName: string;
      targetTab?: string;
      targetView?: string;
      score?: number;
    }> = [];

    PRODUCT_SECTIONS.forEach((sec) => {
      const secTitle = isAr ? sec.titleAr : L(sec.titleEn);
      const secMatch = 
        sec.titleEn.toLowerCase().includes(q) ||
        sec.titleAr.toLowerCase().includes(q) ||
        sec.shortExplanationEn.toLowerCase().includes(q) ||
        sec.shortExplanationAr.toLowerCase().includes(q);

      if (secMatch) {
        matches.push({
          type: 'section',
          sectionId: sec.id,
          sectionTitle: secTitle,
          title: secTitle,
          desc: isAr ? sec.shortExplanationAr : L(sec.shortExplanationEn),
          iconName: sec.iconName,
        });
      }

      sec.features.forEach((feat) => {
        const featScore = scoreFeature(feat, q);

        if (featScore > 0) {
          matches.push({
            score: featScore,
            type: 'feature',
            sectionId: sec.id,
            sectionTitle: secTitle,
            title: isAr ? feat.titleAr : L(feat.titleEn),
            desc: isAr ? feat.descAr : L(feat.descEn),
            iconName: feat.iconName,
            targetTab: feat.targetTab,
            targetView: feat.targetView,
          });
        }
      });
    });

    const secs = matches.filter((m) => m.type === 'section');
    const feats = matches.filter((m) => m.type === 'feature').sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return [...feats, ...secs].slice(0, 8);
  }, [searchQuery, isAr]);

  // Recommended tools customized by authentic user preferences (Phase 3 invariant)
  const recommendedTools = useMemo(() => {
    const mode = profile.accessibilityMode;
    if (mode === 'Visual') {
      return [
        {
          id: 'camera_desc',
          title: t('Scene Description', 'وصف المشهد بالكاميرا'),
          desc: t('Live spatial descriptions and barrier avoidance.', 'أوصاف فورية وتجنب العوائق.'),
          icon: Eye,
          action: () => onSelectTab('vision'),
        },
        {
          id: 'text_ocr',
          title: t('Document & Text OCR', 'قراءة المستندات والنصوص'),
          desc: t('Real-time text readout and document extraction.', 'قراءة فورية للنصوص والأوراق المصورة.'),
          icon: FileText,
          action: () => onSelectSection('read_learn'),
        },
        {
          id: 'object_finder',
          title: t('Object & Key Finder', 'البحث عن الأغراض والمفاتيح'),
          desc: t('Locate personal items using spatial memory.', 'استرجاع موقع الأغراض بالذاكرة المكانية.'),
          icon: Compass,
          action: () => onSelectTab('vision'),
        },
      ];
    }
    if (mode === 'Vocal-Deaf') {
      return [
        {
          id: 'live_captions',
          title: t('Live Speech Captions', 'التفريغ النصي المباشر'),
          desc: t('High-contrast real-time captions with noise immunity.', 'كابشن فوري عالي التباين مقاوم للضوضاء.'),
          icon: Mic,
          action: () => onSelectTab('deaf'),
        },
        {
          id: 'sign_dictionary',
          title: t('Verified Sign Dictionary', 'قاموس لغة الإشارة المعتمد'),
          desc: t('Search expert-reviewed Egyptian sign phrases.', 'بحث فوري في قاموس لغة الإشارة المصرية.'),
          icon: Ear,
          action: () => onSelectSection('communicate'),
        },
        {
          id: 'sound_radar',
          title: t('Acoustic Sound Radar', 'رادار الأصوات المحيطة'),
          desc: t('Vibrational and visual safety sound alerts.', 'تنبيهات بصرية واهتزازية للأصوات الخطرة.'),
          icon: Activity,
          action: () => onSelectTab('deaf'),
        },
      ];
    }
    if (mode === 'Speech') {
      return [
        {
          id: 'aac_composer',
          title: t('AAC Communication Board', 'لوحة التواصل البديل AAC'),
          desc: t('Symbol-to-sentence composition with speech output.', 'تأليف الجمل بالرموز والنطق الصوتي.'),
          icon: MessageSquare,
          action: () => onSelectSection('communicate'),
        },
        {
          id: 'quick_phrases',
          title: t('Emergency Quick Phrases', 'العبارات السريعة للطوارئ'),
          desc: t('One-tap essential communication phrases.', 'عبارات أساسية جاهزة للنطق بنقرة واحدة.'),
          icon: Sparkles,
          action: () => onSelectSection('communicate'),
        },
        {
          id: 'speech_tutor',
          title: t('Accessible Speech Assistant', 'المساعد الصوتي الميسر'),
          desc: t('Conversational mentor with adaptive pacing.', 'مساعد حواري بوتيرة ونبرة مخصصة.'),
          icon: Sliders,
          action: () => onNavigate?.('chat'),
        },
      ];
    }
    // Default / General Learner
    return [
      {
        id: 'visual_assistant',
        title: t('Visual Assistant', 'المساعد البصري الذكي'),
        desc: t('Real-time visual scene and camera guidance.', 'توجيه بصري ذكي ومباشر بالكاميرا.'),
        icon: Eye,
        action: () => onSelectTab('vision'),
      },
      {
        id: 'live_captions',
        title: t('Live Captions', 'التفريغ النصي للكلام'),
        desc: t('Instant multilingual speech-to-text.', 'تحويل الكلام إلى نصوص مقروءة فوراً.'),
        icon: Mic,
        action: () => onSelectTab('deaf'),
      },
      {
        id: 'book_studio',
        title: t('Accessible Library', 'المكتبة التعليمية الميسرة'),
        desc: t('Read books with customizable font and contrast.', 'قراءة الكتب بأحجام خطوط وتباين مخصص.'),
        icon: BookOpen,
        action: () => onSelectSection('read_learn'),
      },
    ];
  }, [profile.accessibilityMode, isAr, onSelectTab, onSelectSection, onNavigate]);

  const handleScrollToSections = () => {
    const el = document.getElementById('six-product-sections');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onSelectSection('see_understand');
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-4 pb-24 text-start select-none"
      aria-label={t('Rafiqi Home Dashboard', 'لوحة التحكم الرئيسية لرفيقي')}
    >
      {/* ── A. COMPACT WELCOME AREA (Replaces Oversized Hero) ── */}
      <section 
        aria-label={t('Personal Welcome', 'الترحيب الشخصي')}
        className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors ${
          isDarkMode 
            ? 'bg-[#112C4F] border-[#24476F]' 
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Concise Greeting + 1 Supporting Sentence */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {greeting}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] font-normal leading-relaxed max-w-2xl">
              {t(
                'Your everyday companion for inclusive learning and independent living.',
                'رفيقك في كل خطوة نحو استقلالية كاملة في التعليم، والتواصل، والحياة اليومية.'
              )}
            </p>
          </div>

          {/* Right: Exactly ONE Primary Action: Explore Your Tools */}
          <div className="hidden flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleScrollToSections}
              className="min-h-[44px] px-5 py-2.5 bg-[#1769AA] hover:bg-[#0D4778] active:bg-[#09355B] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm shadow-[#1769AA]/20 inline-flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
              aria-label={t('Explore Your Tools', 'استكشف أدواتك')}
            >
              <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t('Explore Your Tools', 'استكشف أدواتك')}</span>
              <ArrowDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Global Compact Tool Search Bar */}
        <div className="relative mt-3.5 pt-3 border-t border-slate-200 dark:border-[#24476F]/80">
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search any tool', 'ابحث عن أي أداة')}
              className={`w-full min-h-[48px] text-sm font-medium ps-9 pe-10 py-2 rounded-xl border ${
                isDarkMode 
                  ? 'bg-[#0E2745] border-[#24476F] text-white placeholder-slate-400 focus:border-[#1769AA]' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#1769AA]'
              } transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-[#1769AA]/30`}
              aria-label={t('Global Tool Search', 'البحث في الأدوات والخدمات')}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                aria-label={t('Clear search', 'مسح البحث')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Interactive Search Results Dropdown */}
          {searchQuery.trim().length > 0 && (
            <div className={`mt-2 rounded-xl border ${
              isDarkMode ? 'bg-[#0E2745] border-[#24476F]' : 'bg-white border-slate-200'
            } shadow-lg p-2 space-y-1 z-20`}>
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
                  <button
                    key={`${item.sectionId}-${item.title}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      if (item.type === 'section') {
                        onSelectSection(item.sectionId);
                      } else if (item.targetTab) {
                        onSelectTab(item.targetTab);
                      } else if (item.targetView) {
                        onNavigate?.(item.targetView);
                      } else {
                        onSelectSection(item.sectionId);
                      }
                    }}
                    className={`w-full min-h-[44px] px-3 py-1.5 rounded-lg text-start flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-[#17355C] text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white truncate">{item.title}</span>
                        <span className="text-xs font-semibold px-2 py-0.2 rounded-full bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1] shrink-0">
                          {item.sectionTitle}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.desc}</p>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 ${isAr ? 'rotate-180' : ''}`} />
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  {t('No tools matching your search.', 'لم يتم العثور على نتائج تطابق بحثك.')}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── C. QUICK ACTIONS (Max 2-3 Useful, Compact Shortcuts) ── */}
      <section 
        aria-label={t('Quick Access', 'الوصول السريع للأدوات')}
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#4B9FE1]" aria-hidden="true" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              {t('Quick Access', 'الوصول السريع')}
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
            {t('Direct shortcuts to primary section tools', 'روابط مباشرة لأهم أدوات الأقسام')}
          </span>
        </div>

        {/* Compact 3-action row with standardized touch targets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Action 1: Visual Assistant inside Section 1 (See & Understand) */}
          <button
            type="button"
            onClick={() => onSelectTab('vision')}
            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
              isDarkMode 
                ? 'border-[#24476F] bg-[#112C4F] hover:border-[#1769AA] text-white' 
                : 'border-slate-200 bg-white hover:border-[#1769AA] text-slate-900'
            } shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]`}
            aria-label={t('Launch Visual Assistant (Section 1)', 'تشغيل المساعد البصري (القسم 1)')}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1] flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 text-start">
                <span className="line-clamp-2 break-words block leading-tight">{t('Launch Visual Assistant', 'تشغيل المساعد البصري')}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">{t('See & Understand', 'الرؤية والفهم')}</span>
              </div>
            </div>
            <ArrowRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 ${isAr ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {/* Action 2: Live Captions inside Section 5 (Communicate) */}
          <button
            type="button"
            onClick={() => onSelectTab('deaf')}
            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
              isDarkMode 
                ? 'border-[#24476F] bg-[#112C4F] hover:border-[#1769AA] text-white' 
                : 'border-slate-200 bg-white hover:border-[#1769AA] text-slate-900'
            } shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]`}
            aria-label={t('Live Captions (Section 5)', 'التفريغ الصوتي المباشر (القسم 5)')}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1] flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 text-start">
                <span className="line-clamp-2 break-words block leading-tight">{t('Live Captions', 'التفريغ الصوتي المباشر')}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">{t('Communicate', 'التواصل والتعبير')}</span>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 ${isAr ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {/* Action 3: Accessibility Passport inside Section 6 (Personalize) */}
          <button
            type="button"
            onClick={onOpenPassport}
            className={`hidden min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
              isDarkMode 
                ? 'border-[#24476F] bg-[#112C4F] hover:border-[#1769AA] text-white' 
                : 'border-slate-200 bg-white hover:border-[#1769AA] text-slate-900'
            } shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]`}
            aria-label={t('Accessibility Passport (Section 6)', 'جواز التسهيلات الموحد (القسم 6)')}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 text-start">
                <span className="line-clamp-2 break-words block leading-tight">{t('Accessibility Passport', 'جواز التسهيلات الموحد')}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">{t('Personalize', 'التخصيص')}</span>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 ${isAr ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* ── B. SIX OFFICIAL PRODUCT SECTIONS (Primary Heart of Dashboard) ── */}
      <section 
        id="six-product-sections"
        aria-label={t('The Six Official Product Sections', 'أقسام رفيقي الستة الرسمية')}
        className="space-y-3"
      >
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1]" aria-hidden="true" />
              <span>{t('The Six Official Product Sections', 'أقسام رفيقي الستة الرسمية')}</span>
            </h2>
            <p className="hidden text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {t(
                'Explore the complete assistive ecosystem. Each section holds a specialized suite of tools.',
                'استكشف المنظومة الكاملة. يتضمن كل قسم مجموعة أدوات متخصصة لدعمك في مختلف المهام.'
              )}
            </p>
          </div>
        </div>

        {/* Clean, balanced 6-card grid with consistent height and spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PRODUCT_SECTIONS.map((sec) => {
            const SecIcon = getSectionIconComponent(sec.iconName);
            return (
              <div
                key={sec.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSection(sec.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSection(sec.id);
                  }
                }}
                className={`group p-3 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-xs ${
                  isDarkMode 
                    ? 'bg-[#112C4F] border-[#24476F] hover:border-[#1769AA]' 
                    : 'bg-white border-slate-200 hover:border-[#1769AA]'
                } hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] min-h-[64px]`}
                aria-label={isAr ? sec.titleAr : L(sec.titleEn)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="hidden text-xs font-bold px-2 py-0.5 rounded-full bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1]">
                      {t(`Section ${sec.numericOrder} of 6`, `القسم ${sec.numericOrder} من 6`)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-semibold">
                      {(isFrenchActive() && !isAr ? `${sec.features.length} outils` : t(`${sec.features.length} tools`, `${sec.features.length} أدوات`))}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1] group-hover:bg-[#1769AA] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                      <SecIcon className="w-4.5 h-4.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#1769AA] dark:group-hover:text-[#4B9FE1] transition-colors line-clamp-2 break-words">
                        {isAr ? sec.titleAr : L(sec.titleEn)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] hidden">
                        {isAr ? sec.shortExplanationAr : L(sec.shortExplanationEn)}
                      </p>
                    </div>
                  </div>

                  <p className="hidden text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed line-clamp-2">
                    {isAr ? sec.shortExplanationAr : L(sec.shortExplanationEn)}
                  </p>
                </div>

                <div className="hidden pt-2 border-t border-slate-200 dark:border-[#24476F] flex items-center justify-between text-xs font-bold text-[#1769AA] dark:text-[#4B9FE1]">
                  <span>{t('Explore Section Suite', 'استكشف أدوات القسم')}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isAr ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── D. CONSOLIDATED RECENT ACTIVITY (Small Area, Max 3 Items, Honest Data) ── */}
      <section 
        aria-label={t('Recent Activity', 'النشاط الأخير')}
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#4B9FE1]" aria-hidden="true" />
            <span>{t('Recent Activity', 'النشاط الأخير')}</span>
          </h2>
          {consolidatedRecentActivity.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
              {t(`${consolidatedRecentActivity.length} recent items`, `${consolidatedRecentActivity.length} عناصر حديثة`)}
            </span>
          )}
        </div>

        {consolidatedRecentActivity.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {consolidatedRecentActivity.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border text-start flex flex-col justify-between gap-2 ${
                  isDarkMode ? 'bg-[#112C4F] border-[#24476F]' : 'bg-white border-slate-200'
                } shadow-xs`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1]">
                      {item.categoryLabel}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-1 mt-0.5">
                    {item.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={item.action}
                  className="text-xs font-bold text-[#1769AA] dark:text-[#4B9FE1] hover:underline flex items-center justify-between pt-1 cursor-pointer outline-none focus-visible:underline"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Honest Empty State for new users without reading, tasks, or conversations */
          <div className={`p-4 sm:p-5 rounded-2xl border text-center space-y-2 ${
            isDarkMode ? 'bg-[#112C4F]/60 border-[#24476F]' : 'bg-slate-50 border-slate-200'
          }`}>
            <Clock className="w-5 h-5 text-slate-400 mx-auto" aria-hidden="true" />
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('No recent reading or working history yet', 'لم تبدأ قراءة أي كتاب أو مستند بعد')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto">
                {t(
                  'Explore Section 2 (Read & Learn) to open educational books, convert documents to audio, and access reading rulers. No conversations started yet.',
                  'استكشف قسم القراءة والتعلّم لقراءة الكتب الميسرة، وتحويل النصوص إلى صوت. لا توجد محادثات مسجلة بعد.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectSection('read_learn')}
              className="px-3.5 py-1.5 rounded-xl bg-[#1769AA] text-white text-xs font-bold hover:bg-[#0D4778] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <span>{t('Explore Read & Learn', 'استكشف قسم القراءة والتعلّم')}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </section>

      {/* ── E. ACCESSIBLE SUPPORT SHORTCUT (Compact Footer Bar) ── */}
      <section 
        aria-label={t('Support and Assistance', 'الدعم والمساعدة')}
        className={`px-4 py-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isDarkMode ? 'bg-[#112C4F] border-[#24476F]' : 'bg-slate-50 border-slate-200'
        } transition-colors`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1769AA]/10 text-[#1769AA] dark:text-[#4B9FE1] flex items-center justify-center shrink-0">
            <LifeBuoy className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              {t('Accessible Support & Guides', 'الدعم والمساعدة والإرشادات')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              {t('Reach human specialists, explore accessibility documentation, or report an issue.', 'تواصل مع أخصائي التيسير، أو استكشف أدلة الاستخدام.')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('support')}
          className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
          aria-label={t('Open Support and Assistance', 'فتح قسم الدعم والمساعدة')}
        >
          <span>{t('Open Support', 'فتح الدعم والمساعدة')}</span>
          <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
        </button>
      </section>
    </div>
  );
};

export default HomeDashboard;
