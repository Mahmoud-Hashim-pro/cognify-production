import { localize, isArabicLocale, getTranslation } from '../lib/translations';
import React, { useState, useEffect } from "react";
import { UserProfile, CognitiveLevel, UserRole, ChatThread } from "../types";
import { 
  User, 
  Settings, 
  LifeBuoy, 
  MessageSquare, 
  AlertCircle, 
  Database, 
  LogOut, 
  Plus, 
  X, 
  Moon, 
  Sun, 
  Mic, 
  Sparkles, 
  Shield, 
  Eye, 
  Ear, 
  Layers, 
  ShieldCheck, 
  Zap, 
  BookOpen, 
  LayoutDashboard, 
  Headphones, 
  Compass, 
  Briefcase, 
  Activity, 
  Home,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { logout, db, cleanDataForFirestore } from "../lib/firebase";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { isAdminUser } from "../lib/roles";
import { AppView } from "../lib/access";
import type { DisabilityTab } from "./DisabilityModeView";
import { BrandLogo } from "./ui/BrandLogo";
import { PRODUCT_SECTIONS, ProductSectionId, getSectionIconComponent } from "../lib/sections";

export interface SidebarProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  currentView: AppView;
  setCurrentView: (view: any) => void;
  activeDisabilityTab?: DisabilityTab;
  onSelectDisabilityTab?: (tab: DisabilityTab) => void;
  currentSection?: ProductSectionId | null;
  onSelectSection?: (section: ProductSectionId | null) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  openLiveCaptions: () => void;
  onClose?: () => void;
  onLogout?: () => void;
}

export default function Sidebar({ 
  profile, 
  setProfile, 
  currentView, 
  setCurrentView, 
  activeDisabilityTab,
  onSelectDisabilityTab,
  currentSection,
  onSelectSection,
  isDarkMode, 
  toggleTheme, 
  openLiveCaptions, 
  onClose,
  onLogout,
}: SidebarProps) {
  // Collapsible sidebar state for desktop
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cognify_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cognify_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleChange = (key: keyof UserProfile, value: string) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    if (profile.uid && db) {
      setDoc(doc(db, `users/${profile.uid}`), cleanDataForFirestore({ [key]: value }), { merge: true }).catch(() => {});
    }
  };

  const isAdmin = isAdminUser(profile);
  const isAr = isArabicLocale(profile.language);
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const navigateToDisabilityTab = (tab: DisabilityTab) => {
    onClose?.();
    try {
      localStorage.setItem('cognify_default_disability_tab', tab);
    } catch {}
    if (onSelectDisabilityTab) {
      onSelectDisabilityTab(tab);
    }
    setCurrentView('disability');
  };

  const startNewChat = () => {
    onClose?.();
    const existingNewChat = profile.chatThreads?.find((t) => t.title === 'New Chat' && !t.lastMessageSnippet);
    if (existingNewChat) {
      setProfile({ ...profile, activeThreadId: existingNewChat.id });
      setCurrentView('chat');
      return;
    }
    const newThread: ChatThread = { id: Date.now().toString(), title: 'New Chat', updatedAt: new Date().toISOString() };
    setProfile({ ...profile, chatThreads: [...(profile.chatThreads || []), newThread], activeThreadId: newThread.id });
    setCurrentView('chat');
  };

  const switchThread = (threadId: string) => {
    onClose?.();
    setProfile({ ...profile, activeThreadId: threadId });
    setCurrentView('chat');
  };

  // ── GROUP 1: MAIN NAVIGATION (HOME ONLY) ──
  // Note: Visual Assistant (المساعد البصري) is primary feature of Section 1 (See & Understand)
  const isHomeActive = currentView === 'disability' && !currentSection && (activeDisabilityTab === 'hub' || !activeDisabilityTab);
  const handleHomeClick = () => {
    onClose?.();
    if (onSelectSection) onSelectSection(null);
    navigateToDisabilityTab('hub');
    window.location.hash = '#disability/hub';
  };

  // ── GROUP 2: OFFICIAL SIX PRODUCT SECTIONS (1 TO 6) ──
  const primarySectionItems = PRODUCT_SECTIONS.map((sec) => ({
    id: sec.id,
    numericOrder: sec.numericOrder,
    label: isAr ? `${sec.numericOrder}. ${sec.titleAr}` : `${sec.numericOrder}. ${sec.titleEn}`,
    shortTitle: isAr ? sec.titleAr : sec.titleEn,
    icon: getSectionIconComponent(sec.iconName),
    action: () => {
      onClose?.();
      if (onSelectSection) {
        onSelectSection(sec.id);
      }
      setCurrentView('disability');
      window.location.hash = `#${sec.id}`;
    },
    active: currentView === 'disability' && currentSection === sec.id,
  }));

  // ── GROUP 3: WORKSPACE (MY PROGRESS & ASSISTIVE CHAT) ──
  const workspaceItems = [
    {
      id: 'progress',
      label: t('My Progress', 'تقدمي'),
      icon: Activity,
      action: () => {
        onClose?.();
        if (onSelectSection) onSelectSection(null);
        onSelectDisabilityTab?.('progress');
        setCurrentView('profile');
        window.location.hash = '#profile';
      },
      active: currentView === 'profile' || (currentView === 'disability' && !currentSection && activeDisabilityTab === 'progress'),
    },
  ];

  // ── GROUP 4: SUPPORT & SYSTEM CONTROLS ──
  const supportItems = [
    {
      id: 'support',
      label: t('Help & Support', 'الدعم والمساعدة'),
      icon: LifeBuoy,
      action: () => {
        onClose?.();
        if (onSelectSection) onSelectSection(null);
        setCurrentView('support');
        window.location.hash = '#support';
      },
      active: currentView === 'support',
    },
    {
      id: 'settings',
      label: t('Settings', 'الإعدادات'),
      icon: Settings,
      action: () => {
        onClose?.();
        if (onSelectSection) onSelectSection(null);
        onSelectDisabilityTab?.('settings');
        setCurrentView('settings');
        window.location.hash = '#settings';
      },
      active: currentView === 'settings' || (currentView === 'disability' && !currentSection && activeDisabilityTab === 'settings'),
    },
  ];

  const navBtn = (active: boolean) =>
    `group flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} w-full min-h-[44px] py-2 rounded-xl text-[13px] font-medium text-start transition-all relative select-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:outline-none cursor-pointer ${
      active
        ? isDarkMode
          ? 'bg-[#1769AA]/20 border border-[#1769AA]/50 text-white font-bold shadow-xs'
          : 'bg-[#1769AA]/10 border border-[#1769AA]/30 text-rafiqi-primary-dark font-bold shadow-xs'
        : isDarkMode
          ? 'text-slate-300 hover:bg-[#1A283D] hover:text-white border border-transparent hover:border-[#22354E]'
          : 'text-slate-700 hover:bg-[#1769AA]/5 hover:text-slate-950 border border-transparent hover:border-[#1769AA]/20'
    }`;

  const navIcon = (active: boolean) => 
    `w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-105 group-focus-visible:scale-105 ${
      active ? 'text-[#1769AA] dark:text-[#4B9FE1]' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#1769AA] dark:group-hover:text-[#4B9FE1]'
    }`;

  const userInitial = (profile.name || profile.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <aside 
      aria-label={t('Main Navigation Sidebar', 'شريط التنقل الجانبي الرئيسي')}
      className={`${
        isCollapsed ? 'w-[74px]' : 'w-[280px]'
      } max-w-[85vw] h-full shrink-0 ${
        isDarkMode 
          ? 'bg-[#0B1523] text-slate-200 border-[#1E2E44]' 
          : 'bg-white text-slate-800 border-slate-200'
      } border-e backdrop-blur-2xl flex flex-col px-3 py-4 select-none transition-[width] duration-200`}
    >
      {/* ── Brand Logo Header & Mobile Close ── */}
      <div className="flex items-center justify-between px-1 pb-1">
        {isCollapsed ? (
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-tr from-[#0D4778] to-[#1769AA] flex items-center justify-center text-white shadow-xs font-black text-base cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1769AA] outline-none"
            title={t('Expand sidebar', 'توسيع القائمة')}
            aria-label={t('Expand sidebar', 'توسيع القائمة')}
          >
            R
          </button>
        ) : (
          <BrandLogo
            variant="horizontal"
            size="md"
            badgeText="A11y"
            subtitle={t('Your Everyday Companion', 'رفيقك اليومي للإتاحة')}
          />
        )}

        {/* Mobile Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`lg:hidden p-1.5 rounded-xl ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            } transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:outline-none`}
            aria-label={t('Close navigation drawer', 'إغلاق القائمة')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        {/* Desktop Collapse Toggle Button (When expanded) */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            className={`hidden lg:flex p-1.5 rounded-xl ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            } transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:outline-none`}
            title={t('Collapse sidebar', 'طي الشريط الجانبي')}
            aria-label={t('Collapse sidebar', 'طي الشريط الجانبي')}
          >
            <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Primary Action: New Assistive Chat ── */}
      <div className="mt-2.5">
        <button
          type="button"
          onClick={startNewChat}
          title={getTranslation(profile.language, 'newThread')}
          className={`w-full min-h-[44px] flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl bg-rafiqi-primary hover:bg-rafiqi-primary-dark active:bg-[#09355B] text-white font-bold text-xs uppercase tracking-wider shadow-sm shadow-[#1769AA]/20 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:outline-none`}
        >
          <Plus className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
          {!isCollapsed && <span>{getTranslation(profile.language, 'newThread')}</span>}
        </button>
      </div>

      {/* ── Scrollable Navigation Container ── */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar -mx-1 my-2.5 px-1 flex flex-col gap-1">
        
        {/* ── 1. MAIN (HOME ONLY) ── */}
        <div className="flex flex-col gap-0.5">
          {!isCollapsed && (
            <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} tracking-wider px-3 pb-1 uppercase`}>
              {t('Main', 'الرئيسية')}
            </div>
          )}
          <button
            type="button"
            onClick={handleHomeClick}
            className={navBtn(isHomeActive)}
            aria-current={isHomeActive ? 'page' : undefined}
            title={t('Home', 'الرئيسية')}
          >
            <Home className={navIcon(isHomeActive)} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">{t('Home', 'الرئيسية')}</span>}
          </button>
        </div>

        {/* ── 2. OFFICIAL SECTIONS (EXACTLY SIX) ── */}
        <div className="pt-2 pb-0.5">
          {!isCollapsed && (
            <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} tracking-wider px-3 pb-1 uppercase flex items-center justify-between`}>
              <span>{t('Official Sections', 'أقسام رفيقي الستة')}</span>
              <span className="text-[10px] font-mono text-[#1769AA] dark:text-[#4B9FE1] font-bold">1–6</span>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {primarySectionItems.map((sec) => (
              <button
                type="button"
                key={sec.id}
                onClick={sec.action}
                className={navBtn(sec.active)}
                aria-current={sec.active ? 'page' : undefined}
                title={sec.label}
              >
                <sec.icon className={navIcon(sec.active)} aria-hidden="true" />
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1">{sec.label}</span>
                    {sec.active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1769AA] dark:bg-[#4B9FE1] shrink-0" />
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. WORKSPACE (MY PROGRESS & RECENTS) ── */}
        <div className="pt-2 pb-0.5">
          {!isCollapsed && (
            <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} tracking-wider px-3 pb-1 uppercase`}>
              {t('Workspace', 'مساحة العمل')}
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {workspaceItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={item.action}
                className={navBtn(item.active)}
                aria-current={item.active ? 'page' : undefined}
                title={item.label}
              >
                <item.icon className={navIcon(item.active)} aria-hidden="true" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ── 4. SUPPORT & SYSTEM (HELP, SETTINGS, ADMIN) ── */}
        <div className="pt-2 pb-0.5">
          {!isCollapsed && (
            <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} tracking-wider px-3 pb-1 uppercase`}>
              {t('Support & System', 'الدعم والنظام')}
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {supportItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={item.action}
                className={navBtn(item.active)}
                aria-current={item.active ? 'page' : undefined}
                title={item.label}
              >
                <item.icon className={navIcon(item.active)} aria-hidden="true" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}

            {/* Admin Portal (Staff Only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => { 
                  onClose?.(); 
                  setCurrentView('admin'); 
                  window.location.hash = '#admin';
                }}
                className={navBtn(currentView === 'admin' || (currentView === 'disability' && activeDisabilityTab === 'admin')) + ' relative mt-0.5'}
                aria-current={currentView === 'admin' || (currentView === 'disability' && activeDisabilityTab === 'admin') ? 'page' : undefined}
                title={t('Users & Database', 'إدارة المستخدمين وقاعدة البيانات')}
              >
                <Database className={navIcon(currentView === 'admin')} aria-hidden="true" />
                {!isCollapsed && (
                  <>
                    <span className="truncate">{t('Users & Database', 'إدارة المستخدمين وقاعدة البيانات')}</span>
                    <span className={`ms-auto text-[9px] font-bold ${isDarkMode ? 'text-amber-300 bg-amber-950/40 border-amber-800' : 'text-amber-800 bg-amber-50 border-amber-300'} border px-1.5 py-0.5 rounded`}>
                      {t('Admin', 'مشرف')}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── RECENT ASSISTIVE CHATS (When expanded) ── */}
        {!isCollapsed && (profile.chatThreads?.length || 0) > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between px-3 pb-1">
              <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} tracking-wider uppercase`}>
                {getTranslation(profile.language, 'chatHistory')}
              </span>
              <button
                type="button"
                onClick={() => {
                  const threadsToDelete = profile.chatThreads || [];
                  setProfile({ ...profile, chatThreads: [], activeThreadId: undefined });
                  if (profile.uid) {
                    threadsToDelete.forEach((thread) => {
                      deleteDoc(doc(db, `users/${profile.uid}/threads/${thread.id}`)).catch((e) => console.error(e));
                    });
                  }
                }}
                aria-label={t('Clear all chats', 'مسح جميع المحادثات')}
                className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-rose-400 focus:outline-none rounded"
                title="Clear all chats"
              >
                {getTranslation(profile.language, 'clearAll')}
              </button>
            </div>
            {profile.chatThreads?.slice().reverse().map((th) => {
              const active = profile.activeThreadId === th.id;
              return (
                <div key={th.id} className={`group flex items-center gap-1 rounded-xl transition-all ${
                  active 
                    ? isDarkMode ? 'bg-[#1769AA]/20 border border-[#1769AA]/50' : 'bg-[#1769AA]/10 border border-[#1769AA]/30'
                    : isDarkMode ? 'hover:bg-[#1A283D] border border-transparent' : 'hover:bg-slate-100 border border-transparent'
                }`}>
                  <button
                    type="button"
                    onClick={() => switchThread(th.id)}
                    className="flex flex-col flex-1 items-start justify-center gap-0.5 px-3 min-h-[44px] py-1 text-start overflow-hidden min-w-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:outline-none rounded-lg"
                    aria-current={active ? 'true' : undefined}
                  >
                    <span className={`text-xs font-semibold truncate w-full max-w-[190px] ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{th.title}</span>
                    <span className={`text-[10px] truncate w-full max-w-[190px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{th.lastMessageSnippet || t('No messages yet', 'لا توجد رسائل بعد')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = profile.chatThreads?.filter((item) => item.id !== th.id) || [];
                      const nextActive = th.id === profile.activeThreadId
                        ? (updated.length ? updated[updated.length - 1].id : undefined)
                        : profile.activeThreadId;
                      setProfile({ ...profile, chatThreads: updated, activeThreadId: nextActive });
                      if (profile.uid) deleteDoc(doc(db, `users/${profile.uid}/threads/${th.id}`)).catch((er) => console.error(er));
                    }}
                    className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 min-w-[32px] min-h-[32px] flex items-center justify-center p-1.5 me-1 text-slate-400 hover:text-rose-500 focus-visible:text-rose-500 rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400 focus:outline-none"
                    title={t('Delete chat', 'حذف المحادثة')}
                    aria-label={t('Delete chat', 'حذف المحادثة')}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* ── Footer: Profile Chip, Captions + Logout ── */}
      <div className={`border-t ${isDarkMode ? 'border-[#1E2E44]' : 'border-slate-200'} pt-2.5 flex flex-col gap-2`}>
        {/* Profile Card & Settings Quick Trigger */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-1' : 'gap-2.5 px-2.5'} w-full min-h-[48px] py-1 rounded-2xl border ${
          isDarkMode ? 'bg-[#131E2E] border-[#22354E]' : 'bg-slate-50 border-slate-200'
        } backdrop-blur-md transition-all ${
          currentView === 'profile' || currentView === 'settings' 
            ? 'border-[#1769AA] shadow-xs'
            : isDarkMode ? 'hover:border-slate-700' : 'hover:border-[#1769AA]/40'
        }`}>
          <button 
            type="button"
            onClick={() => {
              onClose?.();
              setCurrentView('profile');
              window.location.hash = '#profile';
            }} 
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 flex-1'} min-w-0 min-h-[44px] text-start group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:outline-none rounded-xl`} 
            title={t('View Profile', 'الملف الشخصي وجواز الإتاحة')}
            aria-label={t('View Profile and Accommodation Passport', 'الملف الشخصي وجواز الإتاحة')}
          >
            <div className="relative shrink-0">
              <div className="w-[32px] h-[32px] rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden shadow-xs bg-gradient-to-br from-[#0D4778] to-[#1769AA] group-hover:scale-105 transition-transform ring-1 ring-[#1769AA]/30">
                {profile.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : userInitial}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ${isDarkMode ? 'ring-[#0B1523]' : 'ring-white'}`} aria-hidden="true" />
            </div>
            {!isCollapsed && (
              <div className="leading-tight overflow-hidden flex-1">
                <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} truncate`}>
                  {profile.name || profile.email?.split('@')[0] || 'User'}
                </div>
                <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} truncate`}>
                  {(() => {
                    const raw = profile.disabilityType || profile.accessibilityMode || '';
                    if (!raw || raw === 'None') return t('Assistive Learning', 'التعلم الميسر');
                    const labels: Record<string, [string, string]> = {
                      Visual: ['Visual', 'إعاقة بصرية'],
                      Hearing: ['Hearing', 'إعاقة سمعية'],
                      Motor: ['Motor', 'إعاقة حركية'],
                      Cognitive: ['Cognitive', 'إعاقة ذهنية'],
                    };
                    const l = labels[raw];
                    return l ? t(l[0], l[1]) : raw;
                  })()}
                </div>
              </div>
            )}
          </button>

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => {
                onClose?.();
                setCurrentView('settings');
                window.location.hash = '#settings';
              }}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-xl transition-all shrink-0 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:outline-none ${
                currentView === 'settings'
                  ? 'bg-[#1769AA]/20 text-[#1769AA] dark:text-[#4B9FE1] border border-[#1769AA]/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#1769AA] hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={t('Settings', 'الإعدادات')}
              aria-label={t('Settings', 'الإعدادات')}
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Live Captions and Logout row */}
        <div className={`flex ${isCollapsed ? 'flex-col' : 'flex-row'} gap-1.5`}>
          <button 
            type="button"
            onClick={openLiveCaptions} 
            aria-label={t('Open Live Captions', 'فتح الكابشن المباشر')}
            title={t('Open Live Captions', 'فتح الكابشن المباشر')}
            className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-2 rounded-xl border ${
              isDarkMode 
                ? 'border-[#22354E] bg-[#131E2E] text-slate-200 hover:bg-slate-800' 
                : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
            } text-xs font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:outline-none`}
          >
            <Mic className="w-4 h-4 text-[#1769AA] dark:text-[#4B9FE1] shrink-0" aria-hidden="true" /> 
            {!isCollapsed && <span>{t('Live Captions', 'الكابشن المباشر')}</span>}
          </button>

          <button 
            type="button"
            onClick={async () => {
              onClose?.();
              if (onLogout) {
                onLogout();
              } else {
                await logout();
              }
            }} 
            className={`flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 rounded-xl border ${
              isDarkMode 
                ? 'border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40' 
                : 'border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100'
            } text-xs font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400 focus:outline-none`} 
            title={getTranslation(profile.language, 'logout')} 
            aria-label={getTranslation(profile.language, 'logout')}
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
