import { localize, isArabicLocale, getTranslation } from '../lib/translations';
import { useState } from "react";
import { UserProfile, CognitiveLevel, UserRole, ChatThread } from "../types";
import { 
  User, Settings, Accessibility, LifeBuoy, MessageSquare, AlertCircle, 
  LogOut, Plus, X, Moon, Sun, Mic, Sparkles, Shield, Eye, Ear, Layers, ShieldCheck, Zap
} from "lucide-react";
import { logout, db, cleanDataForFirestore } from "../lib/firebase";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { isAdminUser } from "../lib/roles";
import { AppView } from "../lib/access";
import type { DisabilityTab } from "./DisabilityModeView";

interface SidebarProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeDisabilityTab?: DisabilityTab;
  onSelectDisabilityTab?: (tab: DisabilityTab) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  openLiveCaptions: () => void;
  onClose?: () => void;
  onLogout?: () => void;
}

// Cognify Assistive "constellation" logomark
const Logo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="6.5" cy="7" r="2.1" fill="currentColor" />
    <circle cx="17" cy="6" r="2.1" fill="currentColor" opacity="0.85" />
    <circle cx="13" cy="17.5" r="2.1" fill="currentColor" opacity="0.7" />
    <path d="M8 8 12 16M8.4 6.7 15 6.1M15.4 7.6 13.4 15.6" stroke="currentColor" strokeWidth="1.25" opacity="0.5" />
  </svg>
);

export default function Sidebar({ 
  profile, 
  setProfile, 
  currentView, 
  setCurrentView, 
  activeDisabilityTab,
  onSelectDisabilityTab,
  isDarkMode, 
  toggleTheme, 
  openLiveCaptions, 
  onClose,
  onLogout,
}: SidebarProps) {
  const handleChange = (key: keyof UserProfile, value: string) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    if (profile.uid && db) {
      setDoc(doc(db, `users/${profile.uid}`), cleanDataForFirestore({ [key]: value }), { merge: true }).catch(() => {});
    }
  };

  const isAdmin = isAdminUser(profile);

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

  const isTabActive = (tab: DisabilityTab) => {
    if (currentView !== 'disability') return false;
    const currentTab = activeDisabilityTab || 'hub';
    if (tab === 'hub') return currentTab === 'hub';
    if (tab === 'deaf') return currentTab === 'deaf' || currentTab === 'bridge' || currentTab === 'radar';
    return currentTab === tab;
  };

  // Dedicated Assistive Suites Navigation List
  const assistiveItems = [
    {
      id: 'disability_hub',
      label: localize(profile.language, 'Accessibility Hub', 'منظومة ذوي الهمم (الرئيسية)'),
      icon: Accessibility,
      action: () => navigateToDisabilityTab('hub'),
      active: isTabActive('hub'),
      badge: localize(profile.language, 'Hub', 'الرئيسية'),
      badgeColor: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    },
    {
      id: 'vision',
      label: localize(profile.language, 'Visual Companion', 'الرفيق البصري (كاميرا وصوت)'),
      icon: Eye,
      action: () => navigateToDisabilityTab('vision'),
      active: isTabActive('vision'),
      badge: '👁️',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      id: 'hearing',
      label: localize(profile.language, '3D Sign & Hearing Studio', 'استوديو لغة الإشارة 3D والمحطة السمعية'),
      icon: Ear,
      action: () => navigateToDisabilityTab('deaf'),
      active: isTabActive('deaf') || currentView === 'video',
      badge: '🤟',
      badgeColor: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    },
    {
      id: 'chat',
      label: localize(profile.language, 'Accessible AI Tutor', 'المساعد الذكي المهيأ'),
      icon: MessageSquare,
      action: () => { onClose?.(); setCurrentView('chat'); },
      active: currentView === 'chat',
    },
    {
      id: 'profile',
      label: localize(profile.language, 'Accommodation Passport', 'جواز الإتاحة والملف الشخصي'),
      icon: User,
      action: () => { onClose?.(); setCurrentView('profile'); },
      active: currentView === 'profile',
    },
    {
      id: 'privacy_security',
      label: localize(profile.language, 'Privacy & Security', 'الخصوصية وأمان البيانات'),
      icon: ShieldCheck,
      action: () => { onClose?.(); setCurrentView('privacy_security'); },
      active: currentView === 'privacy_security',
    },
    {
      id: 'support',
      label: localize(profile.language, 'Accessible Support', 'الدعم والمساعدة'),
      icon: LifeBuoy,
      action: () => { onClose?.(); setCurrentView('support'); },
      active: currentView === 'support',
    },
  ];

  const navBtn = (active: boolean) =>
    `group flex items-center gap-3 w-full px-3 min-h-[44px] py-2 rounded-xl text-[13px] font-medium text-start transition-all relative select-none ${
      active
        ? isDarkMode
          ? 'bg-teal-950/60 border border-teal-600/50 text-teal-300 font-bold shadow-sm'
          : 'bg-teal-50 border border-teal-600/40 text-teal-900 font-bold shadow-sm'
        : isDarkMode
          ? 'text-stone-300 hover:bg-[#162327] hover:text-white border border-transparent hover:border-teal-700/40 active:scale-[0.98]'
          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-950 border border-transparent hover:border-stone-200 active:scale-[0.98]'
    }`;
  const navIcon = (_active: boolean) => `w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-110 group-focus-visible:scale-110 text-teal-700 dark:text-teal-400`;

  const userInitial = (profile.name || profile.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className={`w-[284px] max-w-[85vw] h-full shrink-0 ${
      isDarkMode 
        ? 'bg-[#0E1416]/98 text-stone-200 border-stone-800' 
        : 'bg-[#FAF8F5]/98 text-stone-800 border-stone-200'
    } border-e backdrop-blur-2xl flex flex-col px-[18px] py-[22px]`}>
      {/* Brand & Mobile Close Button */}
      <div className="flex items-center justify-between px-1.5 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-[36px] h-[36px] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md bg-gradient-to-br from-teal-600 to-teal-800 ring-1 ring-teal-500/30">
            <Logo className="w-[20px] h-[20px]" />
          </div>
          <div className="leading-none">
            <div className={`font-serif text-[23px] font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'} tracking-tight flex items-center gap-1.5`}>
              <span>Cognify</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-teal-950/60 text-teal-300 border-teal-800' : 'bg-teal-50 text-teal-900 border-teal-200'} border`}>A11y</span>
            </div>
            <div className={`text-[11px] ${isDarkMode ? 'text-stone-400' : 'text-stone-600'} font-medium mt-0.5`}>
              {localize(profile.language, 'Assistive Technology Suite', 'منظومة ذوي الهمم والإتاحة')}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl ${isDarkMode ? 'text-stone-400 hover:text-white hover:bg-stone-800' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200'} transition-colors shrink-0 cursor-pointer`}
            aria-label={localize(profile.language, 'Close menu', 'إغلاق القائمة')}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New chat with Accessible Tutor */}
      <div className="mt-3">
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-teal-700/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-[17px] h-[17px] text-white" /> {getTranslation(profile.language, 'newThread')}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar -mx-1 my-[16px] px-1 flex flex-col gap-[3px]">
        <div className={`text-[10px] font-extrabold ${isDarkMode ? 'text-stone-400' : 'text-stone-500'} tracking-wider px-3 pt-1.5 pb-1 uppercase`}>
          {localize(profile.language, 'Assistive Ecosystem', 'أدوات الإتاحة والتكيّف')}
        </div>

        {assistiveItems.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            className={navBtn(item.active)}
            aria-current={item.active ? 'page' : undefined}
          >
            <item.icon className={navIcon(item.active)} />
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className={`ms-auto text-[10px] font-bold px-[6px] py-[1.5px] rounded-full border ${item.badgeColor || (isDarkMode ? 'bg-stone-800 text-stone-300 border-stone-700' : 'bg-stone-100 text-stone-900 border-stone-300')}`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}

        {/* Admin Portal (Staff Only) */}
        {isAdmin && (
          <button
            onClick={() => { onClose?.(); setCurrentView('admin'); }}
            className={navBtn(currentView === 'admin') + ' relative mt-2'}
            aria-current={currentView === 'admin' ? 'page' : undefined}
          >
            <AlertCircle className={navIcon(currentView === 'admin')} />
            {localize(profile.language, 'Admin Portal', 'لوحة الإدارة')}
            <span className={`ms-auto text-[10px] font-bold ${isDarkMode ? 'text-stone-300 bg-stone-800 border-stone-700' : 'text-stone-800 bg-stone-100 border-stone-300'} border px-[7px] py-[2px] rounded-full`}>
              {localize(profile.language, 'Staff', 'مقيّد')}
            </span>
          </button>
        )}

        {/* Recent Accessible Tutor Threads */}
        {(profile.chatThreads?.length || 0) > 0 && (
          <>
            <div className="flex items-center justify-between px-3 pt-4 pb-1">
              <span className={`text-[10px] font-extrabold ${isDarkMode ? 'text-stone-400' : 'text-stone-500'} tracking-wider uppercase`}>
                {getTranslation(profile.language, 'chatHistory')}
              </span>
              <button
                onClick={() => {
                  const threadsToDelete = profile.chatThreads || [];
                  setProfile({ ...profile, chatThreads: [], activeThreadId: undefined });
                  if (profile.uid) {
                    threadsToDelete.forEach((thread) => {
                      deleteDoc(doc(db, `users/${profile.uid}/threads/${thread.id}`)).catch((e) => console.error(e));
                    });
                  }
                }}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Clear all chats"
              >
                {getTranslation(profile.language, 'clearAll')}
              </button>
            </div>
            {profile.chatThreads?.slice().reverse().map((t) => {
              const active = profile.activeThreadId === t.id;
              return (
                <div key={t.id} className={`group flex items-center gap-1 rounded-xl transition-all ${
                  active 
                    ? isDarkMode ? 'bg-[#162327] border border-teal-800' : 'bg-teal-50 border border-teal-200'
                    : isDarkMode ? 'hover:bg-stone-800/40 border border-transparent' : 'hover:bg-stone-100 border border-transparent'
                }`}>
                  <button
                    onClick={() => switchThread(t.id)}
                    className="flex flex-col flex-1 items-start justify-center gap-0.5 px-3 min-h-[44px] py-1.5 text-start overflow-hidden min-w-0 cursor-pointer"
                    aria-current={active ? 'true' : undefined}
                  >
                    <span className={`text-[13px] font-semibold truncate w-full max-w-[200px] ${isDarkMode ? 'text-stone-200' : 'text-stone-900'}`}>{t.title}</span>
                    <span className={`text-[11px] truncate w-full max-w-[200px] ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>{t.lastMessageSnippet || (localize(profile.language, 'No messages yet', 'لا رسائل بعد'))}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = profile.chatThreads?.filter((th) => th.id !== t.id) || [];
                      const nextActive = t.id === profile.activeThreadId
                        ? (updated.length ? updated[updated.length - 1].id : undefined)
                        : profile.activeThreadId;
                      setProfile({ ...profile, chatThreads: updated, activeThreadId: nextActive });
                      if (profile.uid) deleteDoc(doc(db, `users/${profile.uid}/threads/${t.id}`)).catch((er) => console.error(er));
                    }}
                    className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 min-w-[36px] min-h-[36px] flex items-center justify-center p-2 me-1 text-stone-400 hover:text-rose-500 focus-visible:text-rose-500 rounded-lg transition-all cursor-pointer"
                    title={localize(profile.language, 'Delete chat', 'حذف المحادثة')}
                    aria-label={localize(profile.language, 'Delete chat', 'حذف المحادثة')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer: theme + language, profile chip, captions + logout */}
      <div className={`border-t ${isDarkMode ? 'border-stone-800' : 'border-stone-200'} pt-3 flex flex-col gap-2`}>
        <div className="flex gap-[7px]">
          <button 
            onClick={toggleTheme} 
            className={`flex-1 flex items-center justify-center gap-[7px] min-h-[44px] py-2.5 rounded-xl border ${
              isDarkMode 
                ? 'border-stone-800 bg-[#162327] text-stone-200 hover:text-white hover:bg-stone-800' 
                : 'border-stone-200 bg-white text-stone-800 hover:text-stone-950 hover:bg-stone-100'
            } text-xs font-semibold transition-all cursor-pointer`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
            {isDarkMode ? (localize(profile.language, 'Light', 'فاتح')) : (localize(profile.language, 'Dark', 'داكن'))}
          </button>
          <div className="flex-1 relative">
            <select
              value={profile.language || 'English'}
              onChange={(e) => handleChange('language', e.target.value)}
              className={`w-full h-full min-h-[44px] appearance-none cursor-pointer text-center py-2.5 px-2 rounded-xl border ${
                isDarkMode
                  ? 'border-stone-800 bg-[#162327] text-stone-200 hover:border-teal-500 focus:border-teal-500 [color-scheme:dark]'
                  : 'border-stone-200 bg-white text-stone-800 hover:border-teal-500 focus:border-teal-500 [color-scheme:light]'
              } text-xs font-semibold transition-all outline-none`}
              aria-label={localize(profile.language, 'Select Language', 'اختر اللغة')}
            >
              {['English', 'Arabic', 'Egyptian Ammiya', 'French', 'Spanish'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={`flex items-center gap-2.5 w-full px-2.5 min-h-[50px] py-1.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200'
        } backdrop-blur-md transition-all ${
          currentView === 'profile' || currentView === 'settings' 
            ? 'border-teal-600 shadow-sm'
            : isDarkMode ? 'hover:border-stone-700' : 'hover:border-teal-400'
        }`}>
          <button 
            onClick={() => setCurrentView('profile')} 
            className="flex items-center gap-2.5 flex-1 min-w-0 min-h-[44px] text-start group cursor-pointer" 
            title={localize(profile.language, 'View Profile', 'الملف الشخصي وجواز الإتاحة')}
          >
            <div className="relative shrink-0">
              <div className="w-[36px] h-[36px] rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden shadow-sm bg-gradient-to-br from-teal-600 to-teal-800 group-hover:scale-105 transition-transform ring-1 ring-teal-500/30">
                {profile.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : userInitial}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ${isDarkMode ? 'ring-[#0E1416]' : 'ring-white'}`} />
            </div>
            <div className="leading-tight overflow-hidden flex-1">
              <div className={`text-[13px] font-bold ${isDarkMode ? 'text-stone-100 group-hover:text-teal-400' : 'text-stone-900 group-hover:text-teal-700'} truncate transition-colors`}>{profile.name || profile.email?.split('@')[0] || 'User'}</div>
              <div className={`text-[11px] ${isDarkMode ? 'text-stone-400' : 'text-stone-500'} truncate`}>{profile.disabilityType || profile.accessibilityMode || 'Special Needs'}</div>
            </div>
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl transition-all shrink-0 active:scale-95 cursor-pointer ${
              currentView === 'settings'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-500'
                : 'text-stone-600 dark:text-stone-400 hover:text-teal-700 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title={localize(profile.language, 'Settings', 'الإعدادات')}
            aria-label={localize(profile.language, 'Settings', 'الإعدادات')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-[7px]">
          <button 
            onClick={openLiveCaptions} 
            className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] py-2.5 rounded-xl border ${
              isDarkMode 
                ? 'border-stone-800 bg-[#162327] text-stone-200 hover:bg-stone-800 hover:border-teal-700' 
                : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-100 hover:border-teal-400'
            } text-xs font-semibold transition-all cursor-pointer`}
          >
            <Mic className={`w-4 h-4 text-teal-600 dark:text-teal-400`} /> {localize(profile.language, 'Captions', 'الكابشن')}
          </button>
          <button 
            onClick={async () => {
              onClose?.();
              if (onLogout) {
                onLogout();
              } else {
                await logout();
              }
            }} 
            className={`flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-3.5 py-2.5 rounded-xl border ${
              isDarkMode 
                ? 'border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 hover:border-rose-700/60' 
                : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-400'
            } text-xs font-semibold transition-all cursor-pointer`} 
            title={getTranslation(profile.language, 'logout')} 
            aria-label={getTranslation(profile.language, 'logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
