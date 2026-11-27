import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Home, 
  ChevronRight,
  ShieldCheck, 
  Sparkles,
  X,
  Volume2,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { UserProfile } from '../types';
import { ProductSectionId, getProductSection, PRODUCT_SECTIONS } from '../lib/sections';
import { isArabicLocale, localize } from '../lib/translations';
import { ThemeSelector, ThemeMode } from './ui/ThemeSelector';
import { logout } from '../lib/firebase';

export interface GlobalHeaderProps {
  profile: UserProfile;
  currentView: string;
  currentSection?: ProductSectionId | null;
  activeTab?: string;
  onMenuClick?: () => void;
  onNavigate?: (view: string, tab?: string) => void;
  onSelectSection?: (section: ProductSectionId) => void;
  onSearch?: (query: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setProfile: (p: UserProfile) => void;
  onLogout?: () => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  profile,
  currentView,
  currentSection,
  activeTab,
  onMenuClick,
  onNavigate,
  onSelectSection,
  onSearch,
  isDarkMode,
  toggleTheme,
  setProfile,
  onLogout,
}) => {
  const isAr = isArabicLocale(profile.language);
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Real global search over every section feature (title + tags, AR & EN)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const out: Array<{ id: string; title: string; section: string; targetView: string; targetTab?: string }> = [];
    for (const section of PRODUCT_SECTIONS) {
      for (const f of section.features) {
        const hay = [f.titleEn, f.titleAr, ...(f.tagsEn || []), ...(f.tagsAr || [])]
          .join(' ')
          .toLowerCase();
        if (hay.includes(q)) {
          out.push({
            id: f.id,
            title: isAr ? f.titleAr : f.titleEn,
            section: isAr ? section.titleAr : section.titleEn,
            targetView: f.targetView,
            targetTab: f.targetTab || f.targetTool,
          });
        }
      }
    }
    return out.slice(0, 8);
  }, [searchQuery, isAr]);

  const handlePickResult = (r: { targetView: string; targetTab?: string }) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onNavigate) onNavigate(r.targetView, r.targetTab);
  };

  // Cmd/Ctrl+K focuses the search box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Close the results dropdown on outside click / escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (sectionsRef.current && !sectionsRef.current.contains(e.target as Node)) {
        setIsSectionsOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSectionsOpen(false);
        setIsProfileMenuOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute Dynamic Breadcrumbs / Title
  const getBreadcrumbTitle = () => {
    if (currentSection) {
      const secDef = getProductSection(currentSection);
      if (secDef) {
        return {
          sectionTitle: isAr ? `${secDef.numericOrder}. ${secDef.titleAr}` : `${secDef.numericOrder}. ${secDef.titleEn}`,
          subTab: null,
        };
      }
    }

    if (currentView === 'disability') {
      if (activeTab === 'vision') {
        return {
          sectionTitle: t('1. See & Understand', '1. الرؤية والفهم'),
          subTab: t('Visual Assistant', 'المساعد البصري'),
        };
      }
      if (activeTab === 'deaf') {
        return {
          sectionTitle: t('5. Communicate', '5. التواصل والتعبير'),
          subTab: t('Captions & Sign', 'التفريغ ولغة الإشارة'),
        };
      }
      if (activeTab === 'chat') {
        return {
          sectionTitle: t('Assistive Tutor', 'المعلم الميسر الذكي'),
          subTab: null,
        };
      }
      if (activeTab === 'settings') {
        return {
          sectionTitle: t('6. Personalize', '6. التخصيص والإعدادات'),
          subTab: t('Settings', 'الإعدادات'),
        };
      }
      if (activeTab === 'progress') {
        return {
          sectionTitle: t('My Progress', 'تقدمي'),
          subTab: null,
        };
      }
      return {
        sectionTitle: t('Home Dashboard', 'الرئيسية'),
        subTab: null,
      };
    }

    if (currentView === 'chat') {
      return {
        sectionTitle: t('Assistive Tutor', 'المعلم الميسر الذكي'),
        subTab: null,
      };
    }
    if (currentView === 'settings') {
      return {
        sectionTitle: t('6. Personalize', '6. التخصيص والإعدادات'),
        subTab: t('Settings', 'الإعدادات'),
      };
    }
    if (currentView === 'profile') {
      return {
        sectionTitle: t('My Progress & Profile', 'الملف الشخصي وتقدمي'),
        subTab: null,
      };
    }
    if (currentView === 'admin') {
      return {
        sectionTitle: t('Administration', 'لوحة الإدارة'),
        subTab: t('Users & Database', 'المستخدمين وقاعدة البيانات'),
      };
    }

    return {
      sectionTitle: t('Home Dashboard', 'الرئيسية'),
      subTab: null,
    };
  };

  const breadcrumbs = getBreadcrumbTitle();
  const userInitial = (profile.name || profile.email || 'U').trim().charAt(0).toUpperCase();

  // Functional Notifications (Never fake: reads authentic system state)
  const functionalNotifications = useMemo(() => {
    const list: Array<{ id: string; title: string; desc: string; icon: any; type: string }> = [];
    if (profile.accessibilityMode && profile.accessibilityMode !== 'None') {
      list.push({
        id: 'a11y_active',
        title: t('Accessibility Passport Active', 'جواز التيسير مفعّل'),
        desc: t('Visual, speech, and contrast preferences applied.', 'تم تطبيق تفضيلات العرض والنطق والتباين.'),
        icon: ShieldCheck,
        type: 'info',
      });
    }
    if (!profile.onboardingComplete) {
      list.push({
        id: 'onboarding_pending',
        title: t('Complete your setup', 'أكمل إعداد حسابك'),
        desc: t('Finish the accessibility setup so Rafiqi adapts to you.', 'أكمل إعداد إمكانية الوصول عشان رفيقي يتظبط على احتياجك.'),
        icon: Sparkles,
        type: 'info',
      });
    }
    return list;
  }, [profile.accessibilityMode, profile.onboardingComplete, isAr]);

  const handleLanguageChange = (newLang: string) => {
    setProfile({ ...profile, language: newLang as any });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handlePickResult(searchResults[0]);
    } else if (onSearch) {
      onSearch(searchQuery);
    } else if (onNavigate) {
      // Default to section search
      onNavigate('disability', 'hub');
    }
  };

  return (
    <header 
      aria-label={t('Global Application Header', 'شريط العنوان والتحكم الرئيسي')}
      className={`h-16 w-full shrink-0 border-b ${
        isDarkMode 
          ? 'bg-[#0B1523]/95 border-[#1E2E44] text-slate-100' 
          : 'bg-white/95 border-slate-200 text-slate-900'
      } backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-3 z-30 transition-colors select-none`}
    >
      {/* ── LEFT ZONE: HAMBURGER (Mobile) + BRAND IDENTITY + BREADCRUMBS ── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button (Only on < lg screens) */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={t('Open navigation menu', 'فتح القائمة الرئيسية')}
            className={`lg:hidden p-2 min-h-[44px] min-w-[44px] rounded-xl border ${
              isDarkMode 
                ? 'border-[#22354E] text-slate-300 hover:text-white hover:bg-slate-800' 
                : 'border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            } flex items-center justify-center cursor-pointer transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]`}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        {/* Brand Mark and Name */}
        <button
          type="button"
          onClick={() => onNavigate?.('disability', 'hub')}
          className="flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] rounded-xl p-1 -m-1 transition-transform active:scale-95 text-start"
          title={t('Rafiqi Home', 'رئيسية رفيقي')}
          aria-label={t('Rafiqi Home', 'رئيسية رفيقي')}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0D4778] to-[#1769AA] flex items-center justify-center text-white shadow-xs shrink-0">
            <span className="font-black text-sm tracking-tighter">R</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">
              Rafiqi
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-xs font-extrabold bg-[#1769AA]/15 text-[#1769AA] dark:text-[#4B9FE1] border border-[#1769AA]/30 uppercase">
              A11y
            </span>
          </div>
        </button>

        {/* Separator */}
        <div className="hidden sm:block h-5 w-[1px] bg-slate-200 dark:bg-[#1E2E44] shrink-0" aria-hidden="true" />

        {/* Dynamic Breadcrumbs */}
        <nav aria-label={t('Breadcrumbs', 'مسار الصفحة')} className="flex items-center gap-1.5 text-xs sm:text-sm font-bold min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => onNavigate?.('disability', 'hub')}
            className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#1769AA] dark:hover:text-[#4B9FE1] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]`}
            title={t('Return to Home Dashboard', 'الرجوع للرئيسية')}
          >
            <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">{t('Home', 'الرئيسية')}</span>
          </button>

          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 ${isAr ? 'rotate-180' : ''}`} aria-hidden="true" />

          <span className="text-slate-900 dark:text-white font-extrabold truncate min-w-0 max-w-[38vw] sm:max-w-none" title={breadcrumbs.sectionTitle}>
            {breadcrumbs.sectionTitle}
          </span>

          {breadcrumbs.subTab && (
            <>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 ${isAr ? 'rotate-180' : ''}`} aria-hidden="true" />
              <span className="text-[#1769AA] dark:text-[#4B9FE1] font-bold truncate min-w-0 max-w-[26vw]" title={breadcrumbs.subTab}>
                {breadcrumbs.subTab}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* ── SECTIONS MENU (desktop): the six sections in one place ── */}
      <div className="hidden lg:block relative shrink-0" ref={sectionsRef}>
        <button
          type="button"
          onClick={() => setIsSectionsOpen((v) => !v)}
          aria-expanded={isSectionsOpen}
          aria-haspopup="true"
          data-testid="header-sections-menu"
          className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
            isDarkMode ? 'border-[#22354E] text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-800 hover:bg-slate-100'
          }`}
        >
          <span>{t('Sections', 'الأقسام')}</span>
          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        {isSectionsOpen && (
          <div
            role="menu"
            aria-label={t('Sections', 'الأقسام')}
            className={`absolute top-full mt-2 start-0 w-64 p-1.5 rounded-2xl border shadow-xl z-50 ${
              isDarkMode ? 'bg-[#131E2E] border-[#22354E] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {PRODUCT_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsSectionsOpen(false);
                  onSelectSection?.(sec.id);
                }}
                className={`w-full min-h-[44px] px-3 rounded-xl text-start text-sm font-semibold flex items-center justify-between gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
                  currentSection === sec.id
                    ? 'bg-[#1769AA]/15 text-[#1769AA] dark:text-[#4B9FE1]'
                    : isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{sec.numericOrder}. {isAr ? sec.titleAr : sec.titleEn}</span>
                <span className="text-xs opacity-60 shrink-0">{sec.features.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CENTER ZONE: SEARCH INPUT ── */}
      <div className="hidden md:flex flex-1 max-w-md mx-2" ref={searchBoxRef}>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" aria-hidden="true" />
          </div>
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            role="combobox"
            aria-expanded={isSearchOpen && searchQuery.trim().length > 0}
            aria-controls="global-search-results"
            aria-autocomplete="list"
            placeholder={t('Search tools, features, sign dictionary...', 'ابحث في الأدوات، الميزات، وقاموس الإشارة...')}
            className={`w-full min-h-[40px] text-xs font-medium ps-9 pe-12 py-2 rounded-xl border ${
              isDarkMode 
                ? 'bg-[#131E2E] border-[#22354E] text-white placeholder-slate-400 focus:border-[#1769AA]' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#1769AA]'
            } transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-[#1769AA]/30`}
            aria-label={t('Global search', 'البحث العام في رفيقي')}
          />
          <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center pointer-events-none">
            <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs font-mono text-slate-400 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
              ⌘K
            </kbd>
          </div>

          {/* Live results dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div
              id="global-search-results"
              role="listbox"
              aria-label={t('Search results', 'نتائج البحث')}
              className={`absolute top-full mt-2 start-0 end-0 rounded-2xl border shadow-xl z-50 overflow-hidden ${
                isDarkMode ? 'bg-[#131E2E] border-[#22354E] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4 px-3">
                  {t('No tools match your search.', 'مفيش أدوات مطابقة لبحثك.')}
                </p>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => handlePickResult(r)}
                    className={`w-full text-start px-3.5 py-2.5 flex flex-col gap-0.5 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1769AA] ${
                      isDarkMode ? 'hover:bg-[#1A283D]' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight">{r.title}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{r.section}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </form>
      </div>

      {/* ── RIGHT ZONE: LANGUAGE, THEME, NOTIFICATIONS & PROFILE MENU ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* The one primary action of the whole app */}
        <button
          type="button"
          onClick={() => onNavigate?.('disability', 'vision')}
          data-testid="header-primary-action"
          className="min-h-[44px] px-3 sm:px-4 rounded-full bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1769AA] transition-colors"
          aria-label={t('What is in front of me? Open the visual assistant', 'ماذا أمامي الآن؟ افتح المساعد البصري')}
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('What is in front of me?', 'ماذا أمامي الآن؟')}</span>
        </button>

        {/* Language Switcher */}
        <div
          role="group"
          aria-label={t('Language Selector', 'اختيار اللغة')}
          className="hidden sm:flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-[#131E2E] border border-slate-200 dark:border-[#22354E] rounded-full"
        >
          <button
            type="button"
            onClick={() => handleLanguageChange('Arabic')}
            aria-pressed={isAr}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
              isAr
                ? 'bg-[#1769AA] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            عربي
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange('English')}
            aria-pressed={!isAr}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
              !isAr
                ? 'bg-[#1769AA] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            EN
          </button>
        </div>

        {/* Theme Selector (Light, Dark, System) */}
        <ThemeSelector
          variant="compact"
          language={isAr ? 'Arabic' : 'English'}
          className="shadow-xs"
        />

        {/* Functional Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            aria-expanded={isNotificationsOpen}
            aria-haspopup="true"
            aria-label={t('Functional notifications', 'التنبيهات والإشعارات الوظيفية')}
            className={`p-2 min-h-[44px] min-w-[44px] rounded-xl border ${
              isDarkMode 
                ? 'border-[#22354E] text-slate-300 hover:text-white hover:bg-slate-800' 
                : 'border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            } flex items-center justify-center relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]`}
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {functionalNotifications.length > 0 && (
              <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-[#1769AA] ring-2 ring-white dark:ring-[#0B1523]" />
            )}
          </button>

          {isNotificationsOpen && (
            <div 
              role="region"
              aria-label={t('Notifications panel', 'لوحة الإشعارات')}
              className={`absolute end-0 mt-2 w-72 sm:w-80 rounded-2xl border ${
                isDarkMode ? 'bg-[#131E2E] border-[#22354E] text-white' : 'bg-white border-slate-200 text-slate-900'
              } shadow-xl p-3 z-50 text-start space-y-2.5 animate-in fade-in duration-150`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#22354E]">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {t('Functional Notifications', 'الإشعارات والتنبيهات')}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {functionalNotifications.length > 0
                    ? `${functionalNotifications.length} ${t('active', 'نشط')}`
                    : t('none', 'لا يوجد')}
                </span>
              </div>

              <div className="space-y-1.5">
                {functionalNotifications.length === 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">
                    {t('No notifications right now.', 'مفيش إشعارات دلوقتي.')}
                  </p>
                )}
                {functionalNotifications.map((notif) => (
                  <div key={notif.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-[#22354E] flex items-start gap-2.5">
                    <notif.icon className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-tight">{notif.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{notif.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu Dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="true"
            aria-label={t('Open user profile menu', 'فتح قائمة المستخدم')}
            className={`flex items-center gap-2 p-1.5 min-h-[44px] rounded-xl border ${
              isDarkMode 
                ? 'border-[#22354E] bg-[#131E2E] hover:bg-slate-800' 
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            } cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] transition-all`}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0D4778] to-[#1769AA] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                userInitial
              )}
            </div>
            <span className="text-xs font-bold hidden sm:inline max-w-[100px] truncate text-slate-800 dark:text-slate-200">
              {profile.name || profile.email?.split('@')[0] || 'User'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileMenuOpen && (
            <div 
              role="menu"
              aria-label={t('User options', 'خيارات الحساب')}
              className={`absolute end-0 mt-2 w-64 rounded-2xl border ${
                isDarkMode ? 'bg-[#131E2E] border-[#22354E] text-white' : 'bg-white border-slate-200 text-slate-900'
              } shadow-xl p-2 z-50 text-start space-y-1 animate-in fade-in duration-150`}
            >
              {/* User info chip */}
              <div className="p-2.5 pb-2 border-b border-slate-200 dark:border-[#22354E] mb-1">
                <p className="text-xs font-black truncate">{profile.name || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile.email || 'user@rafiqi.app'}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-[#1769AA]/15 text-[#1769AA] dark:text-[#4B9FE1]">
                  {profile.accessibilityMode || t('General Access', 'وصول شامل')}
                </span>
              </div>

              {/* Menu items */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onNavigate?.('profile');
                }}
                className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <User className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1]" />
                <span>{t('Profile & Passport', 'الملف الشخصي وجواز التيسير')}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onNavigate?.('settings');
                }}
                className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <Settings className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1]" />
                <span>{t('Settings', 'الإعدادات')}</span>
              </button>

              <div className="pt-1 border-t border-slate-200 dark:border-[#22354E]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setIsProfileMenuOpen(false);
                    if (onLogout) {
                      onLogout();
                    } else {
                      await logout();
                    }
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('Sign Out', 'تسجيل الخروج')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default GlobalHeader;
