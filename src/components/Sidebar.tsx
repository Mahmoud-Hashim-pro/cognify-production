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
  isDarkMode: boolean;
  toggleTheme: () => void;
  openLiveCaptions: () => void;
  onClose?: () => void;
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
  isDarkMode, 
  toggleTheme, 
  openLiveCaptions, 
  onClose 
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

  // Dedicated Assistive Suites Navigation List
  const assistiveItems = [
    {
      id: 'disability_hub',
      label: localize(profile.language, 'Accessibility Hub', 'منظومة ذوي الهمم (الرئيسية)'),
      icon: Accessibility,
      action: () => navigateToDisabilityTab('hub'),
      active: currentView === 'disability',
      badge: localize(profile.language, 'Hub', 'الرئيسية'),
      badgeColor: 'bg-[#4A1224]/60 text-[#E5A93C] border-[#E5A93C]/40',
    },
    {
      id: 'vision',
      label: localize(profile.language, 'Visual Companion', 'الرفيق البصري (كاميرا وصوت)'),
      icon: Eye,
      action: () => navigateToDisabilityTab('vision'),
      active: false,
      badge: '👁️',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      id: 'hearing',
      label: localize(profile.language, 'Hearing Center', 'المركز السمعي الموحد (الصم)'),
      icon: Ear,
      action: () => navigateToDisabilityTab('deaf'),
      active: false,
      badge: '👂',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    {
      id: 'video',
      label: localize(profile.language, 'Sign Video Studio', 'استوديو لغة الإشارة 3D'),
      icon: Layers,
      action: () => { onClose?.(); setCurrentView('video'); },
      active: currentView === 'video',
      badge: '🤟',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
    {
      id: 'caregiver',
      label: localize(profile.language, 'Caregiver & SOS Hub', 'لوحة المرافق والاستغاثة SOS'),
      icon: Shield,
      action: () => navigateToDisabilityTab('caregiver'),
      active: false,
      badge: '🚨',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
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
      label: localize(profile.language, 'Accessibility Passport', 'جواز الإتاحة والملف الشخصي'),
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
        ? 'bg-gradient-to-r from-[#4A1224]/60 via-[#831843]/20 to-transparent border border-[#E5A93C]/50 text-[#E5A93C] font-bold shadow-sm shadow-[#2D0B16]/50'
        : 'text-slate-300 hover:bg-[#4A1224]/20 hover:text-white border border-transparent hover:border-[#E5A93C]/20 active:scale-[0.98]'
    }`;
  const navIcon = (_active: boolean) => `w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-110 group-focus-visible:scale-110`;

  const userInitial = (profile.name || profile.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="w-[284px] max-w-[85vw] h-full shrink-0 bg-[#0E0610]/95 text-slate-200 border-e border-[#4A1224]/40 backdrop-blur-2xl flex flex-col px-[18px] py-[22px]">
      {/* Brand & Mobile Close Button */}
      <div className="flex items-center justify-between px-1.5 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-[36px] h-[36px] rounded-xl flex items-center justify-center text-[#E5A93C] shrink-0 shadow-lg shadow-[#4A1224]/40 ring-1 ring-[#E5A93C]/30 border border-[#E5A93C]/30" style={{ background: 'linear-gradient(135deg,#4A1224,#831843,#E5A93C)' }}>
            <Logo className="w-[20px] h-[20px]" />
          </div>
          <div className="leading-none">
            <div className="font-serif text-[23px] font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Cognify</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#4A1224]/60 text-[#E5A93C] border border-[#E5A93C]/40">A11y</span>
            </div>
            <div className="text-[11px] text-[#E5A93C]/80 font-medium mt-0.5">
              {localize(profile.language, 'Assistive Technology Suite', 'منظومة ذوي الهمم والإتاحة')}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#4A1224]/40 transition-colors shrink-0"
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
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#4A1224] via-[#831843] to-[#E5A93C] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#4A1224]/40 active:scale-[0.98] transition-all hover:shadow-[#E5A93C]/20 border border-[#E5A93C]/30"
        >
          <Plus className="w-[17px] h-[17px] text-[#E5A93C]" /> {getTranslation(profile.language, 'newThread')}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar -mx-1 my-[16px] px-1 flex flex-col gap-[3px]">
        <div className="text-[10px] font-extrabold text-[#E5A93C]/70 tracking-wider px-3 pt-1.5 pb-1 uppercase">
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
              <span className={`ms-auto text-[10px] font-bold px-[6px] py-[1.5px] rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
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
            <span className="ms-auto text-[10px] font-bold text-slate-300 bg-[#171E2E] border border-slate-700/80 px-[7px] py-[2px] rounded-full">
              {localize(profile.language, 'Staff', 'مقيّد')}
            </span>
          </button>
        )}

        {/* Recent Accessible Tutor Threads */}
        {(profile.chatThreads?.length || 0) > 0 && (
          <>
            <div className="flex items-center justify-between px-3 pt-4 pb-1">
              <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase">
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
                className="text-[10px] font-bold text-rose-400/80 hover:text-rose-300 transition-colors"
                title="Clear all chats"
              >
                {getTranslation(profile.language, 'clearAll')}
              </button>
            </div>
            {profile.chatThreads?.slice().reverse().map((t) => {
              const active = profile.activeThreadId === t.id;
              return (
                <div key={t.id} className={`group flex items-center gap-1 rounded-xl transition-all ${active ? 'bg-[#171E2E] border border-slate-700/80' : 'hover:bg-slate-800/40 border border-transparent'}`}>
                  <button
                    onClick={() => switchThread(t.id)}
                    className="flex flex-col flex-1 items-start justify-center gap-0.5 px-3 min-h-[44px] py-1.5 text-start overflow-hidden min-w-0"
                    aria-current={active ? 'true' : undefined}
                  >
                    <span className="text-[13px] font-semibold text-slate-200 truncate w-full max-w-[200px]">{t.title}</span>
                    <span className="text-[11px] text-slate-400 truncate w-full max-w-[200px]">{t.lastMessageSnippet || (localize(profile.language, 'No messages yet', 'لا رسائل بعد'))}</span>
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
                    className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 min-w-[36px] min-h-[36px] flex items-center justify-center p-2 me-1 text-slate-400 hover:text-rose-400 focus-visible:text-rose-400 rounded-lg transition-all"
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
      <div className="border-t border-[#4A1224]/40 pt-3 flex flex-col gap-2">
        <div className="flex gap-[7px]">
          <button 
            onClick={toggleTheme} 
            className="flex-1 flex items-center justify-center gap-[7px] min-h-[44px] py-2.5 rounded-xl border border-[#4A1224]/50 bg-[#150917] text-slate-200 hover:text-white hover:bg-[#4A1224]/30 text-xs font-semibold transition-all"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#E5A93C]" /> : <Moon className="w-4 h-4 text-slate-300" />}
            {isDarkMode ? (localize(profile.language, 'Light', 'فاتح')) : (localize(profile.language, 'Dark', 'داكن'))}
          </button>
          <div className="flex-1 relative">
            <select
              value={profile.language || 'English'}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full h-full min-h-[44px] appearance-none cursor-pointer text-center py-2.5 px-2 rounded-xl border border-[#4A1224]/50 bg-[#150917] text-slate-200 text-xs font-semibold hover:border-[#E5A93C]/40 transition-all outline-none focus:border-[#E5A93C] [color-scheme:dark]"
              aria-label={localize(profile.language, 'Select Language', 'اختر اللغة')}
            >
              {['English', 'Arabic', 'Egyptian Ammiya', 'French', 'Spanish'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={`flex items-center gap-2.5 w-full px-2.5 min-h-[50px] py-1.5 rounded-2xl border bg-[#150917]/90 backdrop-blur-md transition-all ${currentView === 'profile' || currentView === 'settings' ? 'border-[#E5A93C]/70 shadow-md shadow-[#4A1224]/30' : 'border-[#4A1224]/50 hover:border-[#E5A93C]/40'}`}>
          <button 
            onClick={() => setCurrentView('profile')} 
            className="flex items-center gap-2.5 flex-1 min-w-0 min-h-[44px] text-start group" 
            title={localize(profile.language, 'View Profile', 'الملف الشخصي وجواز الإتاحة')}
          >
            <div className="relative shrink-0">
              <div className="w-[36px] h-[36px] rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden shadow-md group-hover:scale-105 transition-transform ring-1 ring-[#E5A93C]/30" style={{ background: 'linear-gradient(135deg, #4A1224, #831843, #E5A93C)' }}>
                {profile.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : userInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#E5A93C] ring-2 ring-[#0E0610]" />
            </div>
            <div className="leading-tight overflow-hidden flex-1">
              <div className="text-[13px] font-bold text-slate-100 truncate group-hover:text-[#E5A93C] transition-colors">{profile.name || profile.email?.split('@')[0] || 'User'}</div>
              <div className="text-[11px] text-[#E5A93C]/80 truncate">{profile.disabilityType || profile.accessibilityMode || 'Special Needs'}</div>
            </div>
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl transition-all shrink-0 active:scale-95 ${currentView === 'settings' ? 'bg-[#4A1224]/40 text-[#E5A93C] border border-[#E5A93C]/50' : 'text-slate-300 hover:text-[#E5A93C] hover:bg-[#4A1224]/30'}`}
            title={localize(profile.language, 'Settings', 'الإعدادات')}
            aria-label={localize(profile.language, 'Settings', 'الإعدادات')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-[7px]">
          <button 
            onClick={openLiveCaptions} 
            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] py-2.5 rounded-xl border border-[#4A1224]/50 bg-[#150917] text-[#E5A93C] hover:bg-[#4A1224]/30 hover:border-[#E5A93C]/40 text-xs font-semibold transition-all"
          >
            <Mic className="w-4 h-4 text-[#E5A93C]" /> {localize(profile.language, 'Captions', 'الكابشن')}
          </button>
          <button 
            onClick={() => logout()} 
            className="flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#4A1224]/50 bg-[#150917] text-rose-400 hover:bg-rose-950/40 hover:border-rose-700/60 text-xs font-semibold transition-all" 
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
