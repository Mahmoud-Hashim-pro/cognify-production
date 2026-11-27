/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import Sidebar from "./components/Sidebar";
import GlobalHeader from "./components/GlobalHeader";
import ErrorBoundary from "./components/ErrorBoundary";
import ReadAloudSelection from "./components/ReadAloudSelection";
import { motion, AnimatePresence } from "motion/react";
import { Message, UserProfile, AccessibilityMode, CognitiveLevel } from "./types";
import { auth, db, handleFirestoreError, OperationType, cleanDataForFirestore, clearPreLoginState, logout } from "./lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, setDoc, onSnapshot, getDocFromServer, deleteField } from "firebase/firestore";
import { Loader2, Settings, Layers, Menu, Moon, Sun, AlertCircle, RefreshCw, Mail, ArrowLeft, Globe, Check, Key, Shield, Accessibility } from "lucide-react";
import { toast, ToastContainer } from "./components/Toast";
import PwaInstallPrompt from "./components/PwaInstallPrompt";

import { isRTL, isArabicLocale, getTranslation, localize } from "./lib/translations";
import { applySeoMetadata } from "./lib/seoEngine";
import { canAccessSection } from "./lib/academics";
import { canAccessView, homeViewFor, isAccessibilityUser, AppView } from "./lib/access";
import {
  parseRoute,
  buildHash,
  saveReturnDestination,
  getReturnDestination,
  clearReturnDestination,
  isSameRoute,
  RouteState,
  VALID_DISABILITY_TABS,
  smartNavigateBack,
  recordInAppNavigation,
  resetInAppNavigationCount,
} from "./lib/navigation";
import { RouteAnnouncer } from "./components/ui/RouteAnnouncer";
import { isAdminUser } from "./lib/roles";
import { subscribeToStudentMemory, clearStudentMemory, getCachedStudentMemory, DEFAULT_STUDENT_MEMORY } from "./lib/memory";
import { StudentMemory, LanguagePreference } from "./types";
import { ProductSectionId, PRODUCT_SECTIONS, SectionFeatureItem, getProductSection } from "./lib/sections";
import SectionToolBar, { featureKey, sectionToolButtons } from "./components/SectionToolBar";
import { initSecurityTracker } from "./lib/securityTracker";
import { getVisitorCountryCode } from "./lib/geo";
import { recordUserLoginSession } from "./lib/loginHistory";
import { secureLoadKeySync, secureSaveKey, secureRemoveKey, autoMigrateStorageKeys } from "./lib/cryptoShield";

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const lastReload = Number(sessionStorage.getItem('rafiqi_lazy_reload') || '0');
      const now = Date.now();
      if (now - lastReload > 12000) {
        sessionStorage.setItem('rafiqi_lazy_reload', String(now));
        if (typeof caches !== 'undefined') {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch {
            /* ignore */
          }
        }
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

// Heavy, route-specific views are code-split so they don't bloat the initial
// bundle. They load on demand the first time a user opens that screen, which
// keeps the app fast to start (important on mobile / slow connections).
const VisionCompanionView = lazyWithRetry(() => import("./components/VisionCompanionView"));
const DisabilityModeView = lazyWithRetry(() => import("./components/DisabilityModeView"));
import type { DisabilityTab } from "./components/DisabilityModeView";
const Login = lazyWithRetry(() => import("./components/Login"));
const Onboarding = lazyWithRetry(() => import("./components/Onboarding"));
const ProfilePage = lazyWithRetry(() => import("./components/ProfilePage"));
const AdminDashboard = lazyWithRetry(() => import("./components/AdminDashboard"));
const SupportCenter = lazyWithRetry(() => import("./components/SupportCenter"));
const ChatInterface = lazyWithRetry(() => import("./components/ChatInterface"));
const PrivacySecurityCenter = lazyWithRetry(() => import("./components/PrivacySecurityCenter"));
const AccessibilityOverlay = lazyWithRetry(() => import("./components/AccessibilityOverlay"));
const LiveCaptions = lazyWithRetry(() => import("./components/LiveCaptions"));
const AccessibleBookStudioView = lazyWithRetry(() => import("./components/AccessibleBookStudioView"));
const UnifiedAccessibilityToolkitView = lazyWithRetry(() => import("./components/UnifiedAccessibilityToolkitView"));
const AudioDocumentIntelligenceView = lazyWithRetry(() => import("./components/AudioDocumentIntelligenceView"));
const HearAndExpressView = lazyWithRetry(() => import("./components/HearAndExpressView"));
const AccessibleProductivityWorkspaceView = lazyWithRetry(() => import("./components/AccessibleProductivityWorkspaceView"));
const AccessibleMobilityWorkspaceView = lazyWithRetry(() => import("./components/AccessibleMobilityWorkspaceView"));
const AccessibleCommunicateWorkspaceView = lazyWithRetry(() => import("./components/AccessibleCommunicateWorkspaceView"));
const BlindHomeView = lazyWithRetry(() => import("./components/BlindHomeView"));
const VoiceNavigationView = lazyWithRetry(() => import("./components/VoiceNavigationView"));
const DailyAidsView = lazyWithRetry(() => import("./components/DailyAidsView"));
const KnownPeopleView = lazyWithRetry(() => import("./components/KnownPeopleView"));
const GlobalVoiceControls = lazyWithRetry(() => import("./components/GlobalVoiceControls"));
const PrivacyPolicyPage = lazyWithRetry(() => import("./components/LegalPages").then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazyWithRetry(() => import("./components/LegalPages").then(m => ({ default: m.TermsOfServicePage })));

/** Every hash route the app answers to — single source of truth */
const VALID_VIEWS = [
  'disability', 'video', 'chat', 'profile', 'settings', 'book_studio', 'toolkit', 'audio_document_intelligence', 'hear_express', 'productivity', 'mobility', 'communication', 'admin', 'support', 'privacy_security',
 'goals', 'analytics', 'planner', 'gym', 'privacy', 'intelligence', ] as const;

export default function App() {
  const [user, loading, authError] = useAuthState(auth);
  const chatRef = useRef<any>(null);

  const handleLogout = async () => {
    resetInAppNavigationCount();
    setIsMobileMenuOpen(false);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setProfile(null);
    setProfileLoading(false);
    setCurrentView('disability');
    setDisabilityTab('hub');
    window.location.hash = '';
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    toast.success(
      direction === 'rtl' ? 'تم تسجيل الخروج بنجاح' : 'Signed out successfully',
      direction === 'rtl' ? 'تسجيل الخروج' : 'Sign Out'
    );
  };

  // Seed from the URL hash so deep links, sub-tabs, and F5 land on the right screen (default: disability/hub)
  const initialRouteRef = useRef<RouteState>(
    typeof window !== 'undefined'
      ? parseRoute(window.location.hash)
      : { view: 'disability', tab: 'hub' }
  );

  const [currentView, setCurrentView] = useState<AppView>(initialRouteRef.current.view);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  // True once a profile snapshot has actually been applied for the current user.
  // Guards the "ignore our own pending writes" rule so it can only skip AFTER we
  // have real data — otherwise the very first snapshot can be skipped and the
  // loading gate never releases ("SYNCING PROFILE…" forever).
  const profileAppliedRef = useRef(false);
  const initialRouteAppliedRef = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // True when the profile sync failed or timed out (as opposed to "this user
  // genuinely has no profile yet"). Without this the app can't tell the two
  // apart and falls through to Onboarding — which auto-submits for Special
  // Needs and would overwrite a real profile. See the render guard below.
  const [profileSyncFailed, setProfileSyncFailed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [externalMessage, setExternalMessage] = useState("");
  const [currentAIResponse, setCurrentAIResponse] = useState("");
  const [isSTTActive, setIsSTTActive] = useState(false);
  const [isLiveCaptionsOpen, setIsLiveCaptionsOpen] = useState(false);
  const [disabilityTab, setDisabilityTab] = useState<DisabilityTab>(() => {
    if (initialRouteRef.current.tab) return initialRouteRef.current.tab;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rafiqi_default_disability_tab');
        if (saved && (VALID_DISABILITY_TABS as readonly string[]).includes(saved)) {
          return saved as DisabilityTab;
        }
      } catch {}
    }
    return 'hub';
  });

  const [currentSection, setCurrentSection] = useState<ProductSectionId | null>(
    initialRouteRef.current.section || (initialRouteRef.current.params?.section as ProductSectionId) || null
  );

  // Unauthenticated routing: Sign-In Page vs Register Page
  // The splash is handled once at root (main.tsx) via <SplashScreen />, not here.
  const [unauthRoute, setUnauthRoute] = useState<'login' | 'register'>(() => {
    if (typeof window === 'undefined') return 'login';
    const hash = (window.location.hash || '').toLowerCase();
    if (hash.includes('register') || hash.includes('signup')) return 'register';
    return 'login';
  });

  useEffect(() => {
    const handleAuthHashSync = () => {
      const hash = (window.location.hash || '').toLowerCase();
      if (hash.includes('register') || hash.includes('signup')) {
        setUnauthRoute('register');
      } else {
        setUnauthRoute('login');
      }
    };
    window.addEventListener('hashchange', handleAuthHashSync);
    window.addEventListener('popstate', handleAuthHashSync);
    return () => {
      window.removeEventListener('hashchange', handleAuthHashSync);
      window.removeEventListener('popstate', handleAuthHashSync);
    };
  }, []);



  // Rafiqi Memory (Phase 2) state
  const [memoryState, setMemoryState] = useState<StudentMemory | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const lastUid = localStorage.getItem('last_known_uid');
        if (lastUid) {
          const cached = getCachedStudentMemory(lastUid);
          if (cached) return cached;
        }
      } catch {}
    }
    return null;
  });
  const [memoryLoading, setMemoryLoading] = useState<boolean>(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryRetryCount, setMemoryRetryCount] = useState<number>(0);

  // DevTools & Element Inspect Security Tracker
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    autoMigrateStorageKeys();
    return initSecurityTracker(() => profileRef.current);
  }, []);

  // Subscribe to Rafiqi Memory snapshot from Firestore (Single Source of Truth)
  useEffect(() => {
    const activeUid = user?.uid;
    if (!activeUid) {
      setMemoryState(null);
      setMemoryLoading(false);
      setMemoryError(null);
      return;
    }

    try {
      localStorage.setItem('last_known_uid', activeUid);
    } catch {}

    // 1. Immediately hydrate with cached memory if available
    const cached = getCachedStudentMemory(activeUid);
    if (cached) {
      setMemoryState(cached);
      setMemoryLoading(false);
    } else {
      setMemoryLoading(true);
    }
    setMemoryError(null);

    // 2. If local demo profile, use default/cached memory immediately without remote call
    if (activeUid.startsWith('demo-')) {
      setMemoryState(cached || DEFAULT_STUDENT_MEMORY);
      setMemoryLoading(false);
      setMemoryError(null);
      return;
    }

    // 3. Subscribe to real-time updates from Firestore
    const unsubscribe = subscribeToStudentMemory(
      activeUid,
      (mem) => {
        setMemoryState(mem);
        setMemoryLoading(false);
        setMemoryError(null);
      },
      (err) => {
        const errMsg = (err as any)?.message || String(err);
        if (errMsg.includes('permission') || errMsg.includes('PERMISSION_DENIED')) {
          console.warn('[Rafiqi Memory] Cloud sync restricted; operating in resilient local cache mode.');
        } else {
          console.warn('[Rafiqi Memory] Memory subscription notice:', errMsg);
        }
        // Fall back gracefully to cache or default so the user is never stuck
        setMemoryState((prev) => prev || cached || DEFAULT_STUDENT_MEMORY);
        setMemoryError(null);
        setMemoryLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, profile?.uid, memoryRetryCount]);

  // Merge memory snapshot with user profile
  const fullProfile: UserProfile | null = profile
    ? { ...profile, memory: memoryState || undefined }
    : null;

  const direction = isRTL(profile?.language) ? 'rtl' : 'ltr';

  // Keep the document root's dir/lang in sync so screen readers pronounce correctly
  // and portalled/native UI (dialogs, popovers) inherits proper RTL/LTR and language semantics.
  useEffect(() => {
    document.documentElement.dir = direction;
    const langMap: Record<string, string> = {
      'French': 'fr',
      'Arabic': 'ar',
      'Egyptian Ammiya': 'ar',
      'Spanish': 'es',
      'German': 'de',
      'Italian': 'it',
      'Portuguese': 'pt',
      'Russian': 'ru',
      'Chinese': 'zh',
      'Japanese': 'ja',
      'English': 'en',
    };
    document.documentElement.lang = (profile?.language && langMap[profile.language]) || (direction === 'rtl' ? 'ar' : 'en');
    applySeoMetadata({
      view: !user ? 'login' : currentView,
      subTab: currentView === 'disability' ? disabilityTab : undefined,
      language: profile?.language,
    });
  }, [direction, profile?.language, currentView, disabilityTab, user]);

  // Theme management: Default to system, but respect manual override if present
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
    } catch {
      return true;
    }
  });

  // Sync theme with machine/system changes
  useEffect(() => {
    const mediaQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    
    // Function to apply theme based on system or manual selection
    const applyTheme = (e?: MediaQueryListEvent | MediaQueryList) => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem('theme');
      } catch {}

      // If user has a manual preference, prioritize it
      if (saved) {
        const shouldBeDark = saved === 'dark';
        setIsDarkMode(shouldBeDark);
        if (shouldBeDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return;
      }

      // Otherwise follow the system
      const systemIsDark = e ? (e as MediaQueryList).matches : (mediaQuery ? mediaQuery.matches : true);
      setIsDarkMode(systemIsDark);
      if (systemIsDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };

    // Initial check
    applyTheme(mediaQuery);

    if (!mediaQuery) return;

    // Listen for system preference changes
    const handler = (e: MediaQueryListEvent) => applyTheme(e);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if (typeof (mediaQuery as any).addListener === 'function') {
      (mediaQuery as any).addListener(handler);
      return () => (mediaQuery as any).removeListener(handler);
    }
  }, []);

  // Sync manual state change (when user clicks toggle)
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Universal Accessibility Settings Sync (Font Scale, High Contrast, Reduced Motion)
  useEffect(() => {
    try {
      const savedPassport = profile?.accessibilityPassport;
      const root = document.documentElement;

      // Font size scaling
      const fontScale = savedPassport?.fontSizeScale || (localStorage.getItem('rafiqi_font_scale') as any) || 'normal';
      root.classList.remove('font-scale-normal', 'font-scale-medium', 'font-scale-large', 'font-scale-extra-large');
      root.classList.add(`font-scale-${fontScale}`);

      // High contrast mode
      const isHighContrast = Boolean(savedPassport?.highContrast || localStorage.getItem('rafiqi_high_contrast') === 'true');
      root.classList.toggle('high-contrast', isHighContrast);

      // Reduce motion
      const isReduceMotion = Boolean(savedPassport?.reduceMotion || localStorage.getItem('rafiqi_reduce_motion') === 'true');
      root.classList.toggle('reduce-motion', isReduceMotion);
    } catch (e) {
      console.warn('Failed to apply global accessibility attributes:', e);
    }
  }, [profile?.accessibilityPassport]);

  // Handle manual theme toggle
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
    } catch {}
  };

  // Sync navigation with browser history (popstate, hardware back on Android, deep links)
  useEffect(() => {
    const route = parseRoute(window.location.hash);
    const canonicalHash = buildHash(route);

    // If there's no hash on load, only set canonical hash if the user is already authenticated or in preview
    if (!window.location.hash || window.location.hash === '#') {
      if (user) {
        window.history.replaceState({ view: route.view, tab: route.tab }, '', canonicalHash);
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      // 1. If state object is attached to popstate, use it
      if (event.state && event.state.view) {
        setCurrentView(event.state.view);
        if (event.state.tab) {
          setDisabilityTab(event.state.tab);
        }
        setCurrentSection(event.state.section || null);
        return;
      }

      // 2. Otherwise parse from current window.location.hash
      const parsed = parseRoute(window.location.hash);
      setCurrentView(parsed.view);
      if (parsed.tab) {
        setDisabilityTab(parsed.tab);
      }
      setCurrentSection(parsed.section || (parsed.params?.section as ProductSectionId) || null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Custom navigation function that updates URL and history state without duplicates
  const navigateTo = (view: AppView | ProductSectionId, tab?: DisabilityTab, section?: ProductSectionId | null) => {
    let targetView: AppView = view as AppView;
    let targetTab: DisabilityTab | undefined = tab;
    let targetSection: ProductSectionId | null = section !== undefined ? section : null;

    const SECTION_IDS: ProductSectionId[] = ['see_understand', 'read_learn', 'work_create', 'move_explore', 'personalize'];
    if (SECTION_IDS.includes(view as ProductSectionId) || (view === 'communicate' && (tab === 'hub' || section === 'communicate'))) {
      if (SECTION_IDS.includes(view as ProductSectionId) || view === 'communicate') {
        handleSelectSection((view === 'communicate' ? 'communicate' : view) as ProductSectionId);
        return;
      }
      targetView = 'disability';
      targetTab = 'hub';
      targetSection = view as ProductSectionId;
    }

    const targetRoute: RouteState = {
      view: targetView,
      tab: targetTab || (targetView === 'disability' ? (disabilityTab || 'hub') : undefined),
      section: targetSection || undefined,
      params: targetSection ? { section: targetSection } : undefined,
    };
    const currentRoute: RouteState = {
      view: currentView,
      tab: currentView === 'disability' ? (disabilityTab || 'hub') : undefined,
      section: currentSection || undefined,
      params: currentSection ? { section: currentSection } : undefined,
    };

    // Avoid duplicate history entries
    if (isSameRoute(targetRoute, currentRoute)) {
      setIsMobileMenuOpen(false);
      return;
    }

    const newHash = buildHash(targetRoute);
    window.history.pushState({ view: targetRoute.view, tab: targetRoute.tab, section: targetSection }, '', newHash);
    recordInAppNavigation();
    setCurrentView(targetRoute.view);
    if (targetRoute.tab) {
      setDisabilityTab(targetRoute.tab);
    }
    setCurrentSection(targetSection);
    setIsMobileMenuOpen(false);
  };

  // Section access guard: nobody can open a section outside their enrolled path
  // (e.g. a Normal user opening #disability, or a Special-Needs user wandering
  // into the full academic experience). Admins bypass. Redirect + notify.
  useEffect(() => {
    if (!profile) return;
    if (!canAccessView(profile, currentView as any, isAdminUser(profile))) {
      const home = homeViewFor(profile);
      const homeRoute: RouteState = { view: home, tab: 'hub' };
      const homeHash = buildHash(homeRoute);
      window.history.replaceState({ view: home, tab: 'hub' }, '', homeHash);
      setCurrentView(home);
      setDisabilityTab('hub');
      toast.warning(
        direction === 'rtl' ? 'هذه الصفحة مخصصة للمشرفين فقط. تم نقلك لمركز الميزات.' : 'Admin portal is restricted. Redirected to Features Hub.',
        direction === 'rtl' ? 'صلاحيات مقيدة' : 'Access Restricted'
      );
    }
  }, [profile, currentView]);

  const lastFocusedTriggerRef = useRef<HTMLElement | null>(null);

  const handleOpenMobileMenu = (e?: React.MouseEvent) => {
    lastFocusedTriggerRef.current = (e?.currentTarget as HTMLElement) || (document.activeElement as HTMLElement) || null;
    setIsMobileMenuOpen(true);
  };

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      lastFocusedTriggerRef.current?.focus();
    }, 50);
  };

  // A section no longer opens a grid page: it opens its first tool, with every tool of the
  // section as a button row on top (SectionToolBar).
  const [toolbarSection, setToolbarSection] = useState<ProductSectionId | null>(null);
  const openSectionFeature = (sectionId: ProductSectionId, f: SectionFeatureItem) => {
    setToolbarSection(sectionId);
    const view = (f.targetView === 'communicate' ? 'communication' : f.targetView) as AppView;
    navigateTo(view, f.targetTab as DisabilityTab | undefined, null);
  };
  const handleSelectSection = (sectionId: ProductSectionId) => {
    const section = getProductSection(sectionId);
    const first = section ? (section.features.find((f) => f.isPrimaryAction) || section.features[0]) : undefined;
    if (!first) {
      navigateTo('disability', 'hub', sectionId);
      return;
    }
    openSectionFeature(sectionId, first);
  };
  const isFeatureActive = (f: SectionFeatureItem) => {
    if (f.targetView === 'disability') return currentView === 'disability' && disabilityTab === f.targetTab;
    if (f.targetView === 'communicate' || f.targetView === 'communication') {
      return currentView === 'communicate' || currentView === 'communication';
    }
    return currentView === f.targetView;
  };
  const barSection: ProductSectionId | null = (() => {
    if (currentView === 'disability' && (disabilityTab === 'hub' || !disabilityTab)) return null;
    const matches = (id: ProductSectionId) => sectionToolButtons(id).some(isFeatureActive);
    let id: ProductSectionId | null = null;
    if (toolbarSection && matches(toolbarSection)) id = toolbarSection;
    else id = (PRODUCT_SECTIONS.find((sec) => matches(sec.id))?.id as ProductSectionId | undefined) || null;
    // The Visual Assistant page already has its own tool row.
    if (id === 'see_understand' && currentView === 'disability' && disabilityTab === 'vision') return null;
    return id;
  })();

  const handleBack = () => {
    smartNavigateBack(navigateTo, 'disability', 'hub');
  };

  // When view or tab changes, shift focus to the main heading or #main-content
  // so screen readers (VoiceOver, TalkBack, NVDA) immediately read the new page title.
  useEffect(() => {
    const timer = setTimeout(() => {
      const mainHeading = document.querySelector<HTMLElement>(
        '#main-content h1, #main-content [role="heading"][aria-level="1"], #main-content'
      );
      if (mainHeading) {
        if (!mainHeading.getAttribute('tabindex')) {
          mainHeading.setAttribute('tabindex', '-1');
        }
        mainHeading.focus({ preventScroll: true });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentView, disabilityTab]);

  // When the off-canvas menu opens, move focus into it and allow Escape to close.
  // When it closes, restore focus to the trigger element that opened it.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    sidebarRef.current?.querySelector<HTMLElement>('button, a, [tabindex]:not([tabindex="-1"])')?.focus();
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') {
        handleCloseMobileMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);

  // Sync profile from Firestore
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    // Re-show the loading gate on every logged-out -> authenticated transition.
    // Without this, a returning user briefly renders with profile=null and
    // profileLoading=false, flashing <Onboarding/> — which for a Special-Needs
    // account fires its onComplete and overwrites the existing profile (points/level).
    setProfileLoading(true);
    profileAppliedRef.current = false;
    initialRouteAppliedRef.current = false;
    setProfileSyncFailed(false);
    let cancelled = false; // set on cleanup; guards the async auto-create continuation

    // Watchdog: never let the app hang on "SYNCING PROFILE…". If Firestore is
    // unreachable (captive-portal / conference Wi-Fi / offline) onSnapshot can
    // fire NEITHER the success nor the error callback, leaving the gate stuck
    // forever. Release it after 10s so the user reaches a usable screen.
    const watchdog = setTimeout(() => {
      console.warn('[Rafiqi] Profile sync timed out — releasing the loading gate.');
      // Mark it as a FAILURE, not "no profile". Releasing the gate with
      // profile===null would otherwise render Onboarding, whose Special-Needs
      // branch auto-submits and would overwrite the real profile (points/level/
      // history) — the exact hazard on the flaky networks this watchdog exists for.
      setProfileSyncFailed(true);
      setProfileLoading(false);
    }, 10000);

    const path = `users/${user.uid}`;
    const unsubscribe = onSnapshot(doc(db, path), async (snapshot) => {
      // Ignore our own un-acknowledged local writes — applying them would replace
      // the whole profile mid-action and reset activeThreadId (the "new chat
      // refreshes / doesn't save" bug). The server-confirmed snapshot still applies.
      // BUT only skip once we already hold real data: skipping the FIRST snapshot
      // would return before setProfileLoading(false) below and hang the app on
      // "SYNCING PROFILE…" (reported in the field, "fixed" by localStorage.clear()
      // only because that wipes the auth session and forces a fresh login).
      if (snapshot.metadata.hasPendingWrites && profileAppliedRef.current) return;
      if (snapshot.exists()) {
        const rawData = snapshot.data() as UserProfile & { chatHistory?: any };

        // Purge legacy chatHistory from Firestore if it still exists on the doc.
        // chatHistory was migrated to users/{uid}/threads subcollection — any
        // residual top-level array wastes Firestore quota and leaks message data.
        if (rawData.chatHistory !== undefined) {
          delete rawData.chatHistory;
          setDoc(doc(db, path), { chatHistory: deleteField() }, { merge: true }).catch(() => {});
        }

        const data = rawData as UserProfile;

        // Honor user's login-time path selection
        let preLoginPath: string | null = null;
        let preLoginMode: string | null = null;
        let preLoginDis: string | null = null;
        try {
          preLoginPath = localStorage.getItem('preLoginAccountPath');
          preLoginMode = localStorage.getItem('preLoginAccessibilityMode');
          preLoginDis = localStorage.getItem('preLoginDisability');
        } catch {}

        if (preLoginPath === 'Normal') {
          data.accountPath = 'Normal';
          data.accessibilityMode = 'None';
          data.disabilityType = '';
          try {
            localStorage.removeItem('rafiqi_default_disability_tab');
            localStorage.removeItem('preLoginAccessibilityMode');
            localStorage.removeItem('preLoginDisability');
          } catch {}
          setDoc(doc(db, path), { accountPath: 'Normal', accessibilityMode: 'None', disabilityType: '' }, { merge: true }).catch(() => {});
        } else if (preLoginPath === 'Special Needs' && preLoginMode && preLoginMode !== 'None') {
          data.accountPath = 'Special Needs';
          data.accessibilityMode = preLoginMode as AccessibilityMode;
          if (preLoginDis) data.disabilityType = preLoginDis;
          try {
            const mappedTab = preLoginMode === 'Vocal-Deaf' ? 'deaf' : 'vision';
            localStorage.setItem('rafiqi_default_disability_tab', mappedTab);
          } catch {}
          setDoc(doc(db, path), cleanDataForFirestore({ 
            accountPath: 'Special Needs', 
            accessibilityMode: preLoginMode, 
            disabilityType: preLoginDis || data.disabilityType 
          }), { merge: true }).catch(() => {});
        }

        setProfile(data);
        clearPreLoginState();

        // Smart Entry Routing with Session Restoration:
        // Execute ONLY ONCE on initial entry/mount so subsequent background snapshots
        // NEVER override the user's active view or bounce them between screens!
        if (!initialRouteAppliedRef.current) {
          initialRouteAppliedRef.current = true;
          const returnDest = getReturnDestination();
          clearReturnDestination();

          if (returnDest) {
            // Restore exact view and tab from previous session!
            setCurrentView(returnDest.view);
            if (returnDest.tab) {
              setDisabilityTab(returnDest.tab);
            }
            window.history.replaceState({ view: returnDest.view, tab: returnDest.tab }, '', returnDest.hash || buildHash(returnDest));
            toast.info(
              direction === 'rtl' ? 'تمت استعادة جلستك ومتابعة عملك بنجاح' : 'Restored your previous session and active screen',
              direction === 'rtl' ? 'استعادة الجلسة' : 'Session Restored'
            );
          } else {
            // Standard smart routing:
            const route = parseRoute(window.location.hash);
            const isA11y = preLoginPath === 'Normal' ? false : isAccessibilityUser(data);
            if (isA11y) {
              if (route.view === 'chat' && !window.location.hash.includes('chat')) {
                setCurrentView('disability');
                setDisabilityTab('hub');
                window.history.replaceState({ view: 'disability', tab: 'hub' }, '', '#disability/hub');
              } else {
                setCurrentView(route.view);
                if (route.tab) setDisabilityTab(route.tab);
              }
            } else {
              setCurrentView(route.view);
              if (route.tab) setDisabilityTab(route.tab);
            }
          }
        }

        // Record login telemetry (session history, device, country, city)
        recordUserLoginSession(user.uid);
        
        // Update lastActiveDate and country:
        // Self-heal immediately if country is missing or Unknown, or if lastActiveDate is > 1 hr old
        const now = new Date().toISOString();
        const hasNoCountry = !data.country || data.country === 'Unknown' || data.country === 'N/A';
        const isStaleActive = !data.lastActiveDate || (new Date(now).getTime() - new Date(data.lastActiveDate).getTime() > 3600000);

        if (hasNoCountry || isStaleActive) {
           getVisitorCountryCode()
             .then((country) => {
               const updatePayload: Record<string, any> = {};
               if (isStaleActive) updatePayload.lastActiveDate = now;
               if (hasNoCountry && country && country !== 'Unknown') {
                 updatePayload.country = country;
               }
               if (Object.keys(updatePayload).length > 0) {
                 setDoc(doc(db, path), updatePayload, { merge: true });
               }
             })
             .catch((err) => {
               console.error("Failed to update last active date / country:", err);
             });
        }
      } else {
        // If the user selected 'Special Needs' at login but has no profile, auto-create it immediately to bypass onboarding!
        let preLoginPath: string | null = null;
        let preLoginDisability: string | null = null;
        let preLoginMode: string | null = null;
        let preLoginOrgCode: string | null = null;
        try {
          preLoginPath = localStorage.getItem('preLoginAccountPath');
          preLoginDisability = localStorage.getItem('preLoginDisability');
          preLoginMode = localStorage.getItem('preLoginAccessibilityMode');
          preLoginOrgCode = localStorage.getItem('preLoginOrgCode');
        } catch {}

        if (preLoginPath === 'Special Needs') {
          const disabilityType = preLoginDisability || 'Other';

          let accessibilityMode: AccessibilityMode = (preLoginMode as AccessibilityMode) || 'None';
          if (accessibilityMode === 'None') {
            if (disabilityType === 'Visual Impairment') {
              accessibilityMode = 'Visual';
            } else if (disabilityType === 'Hearing Impairment') {
              accessibilityMode = 'Vocal-Deaf';
            } else if (disabilityType === 'Speech Impairment') {
              accessibilityMode = 'Speech';
            }
          }

          try {
            const mappedTab = accessibilityMode === 'Vocal-Deaf' ? 'deaf' : 'vision';
            localStorage.setItem('rafiqi_default_disability_tab', mappedTab);
          } catch {}

          let visitorCountry: string | undefined;
          try {
            const c = await getVisitorCountryCode();
            if (c && c !== 'Unknown') visitorCountry = c;
          } catch {}

          const defaultProfile: UserProfile = {
            uid: user.uid,
            email: user.email || "",
            name: user.displayName || user.email?.split('@')[0] || "User",
            points: 100,
            questionHistory: [],
            level: 'Basic',
            role: 'Student',
            educationLevel: 'University',
            field: 'General',
            accountPath: 'Special Needs',
            disabilityType: disabilityType,
            accessibilityMode: accessibilityMode,
            // Organization is no longer collected at sign-up (nobody should be
            // able to self-claim a charity's roster), so this resolves to '' —
            // an admin assigns it instead. The read is kept so re-introducing a
            // sign-up field would work without touching this again.
            organization: preLoginOrgCode || '',
            questionScore: 0,
            onboardingComplete: true,
            lastActiveDate: new Date().toISOString(),
            country: visitorCountry,
          };

          try {
            await setDoc(doc(db, path), defaultProfile);
            // The awaited write can settle long after this subscription was torn
            // down (it never resolves while offline). Without this guard the
            // continuation would apply THIS user's profile into whatever session
            // is current now — e.g. after a sign-out and sign-in as someone else.
            if (cancelled) return;
            setProfile(defaultProfile);
            clearPreLoginState(); // consumed — must not apply to a future account
            setCurrentView('disability');
            window.history.replaceState(null, '', '#disability');
          } catch (err) {
            console.error("Failed to auto-create special needs profile:", err);
            setProfile(null);
          }
        } else {
          // If the student already completed onboarding on this device (or cached in localStorage),
          // preserve the local profile state instead of clobbering to null and looping back to step 1!
          const cachedProfileJson = typeof window !== 'undefined' ? localStorage.getItem(`rafiqi_profile_${user.uid}`) : null;
          if (cachedProfileJson) {
            try {
              const cached = JSON.parse(cachedProfileJson);
              if (cached && cached.onboardingComplete) {
                setProfile(cached);
                setDoc(doc(db, path), cleanDataForFirestore(cached), { merge: true }).catch(() => {});
                return;
              }
            } catch {}
          }
          setProfile(null);
        }
      }
      // Reached on EVERY delivered snapshot (existing profile, auto-created
      // Special-Needs profile, or no-profile-yet) — so the gate always releases.
      if (cancelled) return;
      profileAppliedRef.current = true;
      clearTimeout(watchdog);
      setProfileLoading(false);
    }, (err) => {
      // Release the gate FIRST: handleFirestoreError throws by design, which
      // would otherwise skip these lines and strand the user on the spinner
      // (e.g. a permission-denied on a stale/mismatched session).
      clearTimeout(watchdog);
      setProfileSyncFailed(true); // sync FAILED — don't fall through to Onboarding
      setProfileLoading(false);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch {
        // Logged cleanly; UI presents recovery retry state
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      unsubscribe();
    };
  }, [user]);

  // Active Presence Heartbeat: Keeps lastActiveDate fresh every 2.5 minutes while user is active
  useEffect(() => {
    if (!user?.uid) return;
    const path = `users/${user.uid}`;
    let lastPing = 0;

    const updatePresence = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const nowMs = Date.now();
      // Throttle: don't ping more than once every 90 seconds
      if (nowMs - lastPing < 90000) return;
      lastPing = nowMs;
      const nowIso = new Date(nowMs).toISOString();
      const payload: Record<string, any> = { lastActiveDate: nowIso };

      if (!profile?.country || profile.country === 'Unknown' || profile.country === 'N/A') {
        try {
          const country = await getVisitorCountryCode();
          if (country && country !== 'Unknown') {
            payload.country = country;
          }
        } catch {}
      }

      setDoc(doc(db, path), payload, { merge: true }).catch(() => {});
    };

    // Immediate initial presence ping on sign-in
    updatePresence();

    // Heartbeat every 2.5 minutes
    const interval = setInterval(updatePresence, 150000);

    // Update on window focus / visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [user?.uid, profile?.country]);

  const handleOnboardingComplete = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const path = `users/${user.uid}`;
    
    let userCountry = data.country || profile?.country;
    if (!userCountry || userCountry === 'Unknown' || userCountry === 'N/A') {
      try {
        const c = await getVisitorCountryCode();
        if (c && c !== 'Unknown') userCountry = c;
      } catch {}
    }

    const newProfile: UserProfile = {
      points: 100,
      questionHistory: [],
      level: 'Intermediate',
      role: 'Student',
      educationLevel: 'University',
      field: 'General',
      accessibilityMode: 'None',
      questionScore: 0,
      name: user.displayName || user.email?.split('@')[0] || "User",
      country: userCountry && userCountry !== 'Unknown' ? userCountry : undefined,
      ...data,
      // Critical: Immutable identity and completion fields MUST come after ...data
      // so they can never be overwritten by empty/stale formData from onboarding steps!
      uid: user.uid,
      email: (user.email || data.email || "").trim(),
      onboardingComplete: true,
    };

    // Cache locally immediately to eliminate any race condition or snapshot reset loop
    try {
      localStorage.setItem(`rafiqi_profile_${user.uid}`, JSON.stringify(newProfile));
      localStorage.setItem(`rafiqi_onboarded_${user.uid}`, 'true');
    } catch {}

    const cleanedProfile = cleanDataForFirestore(newProfile);
    setProfile(cleanedProfile);

    const targetView: AppView = isAccessibilityUser(cleanedProfile) ? 'disability' : 'chat';
    setCurrentView(targetView);
    window.history.replaceState(null, '', `#${targetView}`);

    try {
      await setDoc(doc(db, path), cleanedProfile, { merge: true });
    } catch (err) {
      console.error("Failed to save onboarding profile to Firestore:", err);
      // Even if Firestore write fails, local state and localStorage keep the user in the app!
    }
  };

  const updateQuestionHistory = async (score: number, lastMessageSnippet?: string) => {
    if (!user || !profile) return;
    const path = `users/${user.uid}`;

    // Build from the LATEST profile state (functional update). Writing back the
    // whole (possibly stale) profile used to clobber `tasks` and thread titles
    // that other paths had just saved. We now persist ONLY the fields we change.
    setProfile((prev) => {
      if (!prev) return prev;
      let updatedThreads = prev.chatThreads || [];
      if (prev.activeThreadId && lastMessageSnippet) {
        updatedThreads = updatedThreads.map((t) =>
          t.id === prev.activeThreadId
            ? { ...t, lastMessageSnippet, updatedAt: new Date().toISOString() }
            : t,
        );
      }
      const nextPoints = prev.points + score * 5;
      // Cap history at 200 so the profile doc never grows unbounded (1 MiB cap).
      const nextHistory = [...(prev.questionHistory || []), { score, date: new Date().toISOString() }].slice(-200);
      const threadMeta = updatedThreads.map((t) => ({
        id: t.id, title: t.title, updatedAt: t.updatedAt, lastMessageSnippet: t.lastMessageSnippet,
      }));
      setDoc(
        doc(db, path),
        cleanDataForFirestore({ points: nextPoints, questionHistory: nextHistory, chatThreads: threadMeta }),
        { merge: true },
      ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, path));
      return { ...prev, points: nextPoints, questionHistory: nextHistory, chatThreads: updatedThreads };
    });
  };

  const syncActiveThread = async (updatedHistory: Message[]) => {
    // This is now handled internally by ChatInterface for efficiency
    // But we keep the function signature for compatibility if needed elsewhere
    if (!user || !profile || !profile.activeThreadId) return;
    
    const threadPath = `users/${user.uid}/threads/${profile.activeThreadId}`;
    try {
      const cleanHistory = updatedHistory.map(m => {
        const item: any = {
          id: m.id,
          role: m.role,
          content: m.content || "",
          timestamp: m.timestamp
        };
        if (m.attachments !== undefined && m.attachments !== null) {
          item.attachments = m.attachments.map((a: any) => {
            const att: any = { name: a.name || "", type: a.type || "" };
            if (a.url) att.url = a.url;
            // Never persist large base64 — Firestore caps a doc at 1 MiB.
            if (a.data && !a.url && a.data.length <= 400000) att.data = a.data;
            return att;
          });
        }
        if (m.comparisons !== undefined && m.comparisons !== null) {
          item.comparisons = m.comparisons.map((c: any) => ({
            modelName: c.modelName || "",
            content: c.content || ""
          }));
        }
        return item;
      });
      await setDoc(doc(db, threadPath), { messages: cleanHistory }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, threadPath);
    }
  };

  const updateLanguage = async (language: UserProfile['language']) => {
    if (!user || !profile) return;
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, path), cleanDataForFirestore({ language }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" aria-hidden="true" />
            <p className="text-slate-400 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">
              {loading ? "Authenticating..." : "Syncing Profile..."}
            </p>
          </div>
        </div>
    );
  }

  if (!user) {
    // Preserve unauthenticated deep-link destination before presenting Login
    const rawHash = typeof window !== 'undefined' ? window.location.hash : '';
    const cleanHash = rawHash.replace(/^[#/]+/, '').trim();
    if (cleanHash && cleanHash !== 'disability/hub' && cleanHash !== 'hub' && cleanHash !== 'login' && cleanHash !== 'register') {
      const currentRoute: RouteState = { view: currentView, tab: disabilityTab };
      saveReturnDestination(currentRoute, rawHash);
    }

    {/* Enforce authenticated access for protected views: <Login /> */}
    return (
      <Login />
    );
  }

  // Sync failed/timed out (not "no profile yet"). NEVER fall through to
  // Onboarding here: its Special-Needs branch auto-submits on mount and would
  // overwrite a real profile's points/level/history with defaults. Offer a
  // retry (and a way out) instead — the data is safe on the server.
  if (profileSyncFailed && !profile) {
    // The profile never loaded, so we don't know the user's language — show both.
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-amber-400" />
          <p className="text-slate-300 text-sm leading-relaxed">
            Couldn't reach your profile. Check your connection and try again — your data is safe.
            <span className="block mt-2 text-slate-500" dir="rtl">تعذّر الوصول لملفك. راجع الاتصال وحاول تاني — بياناتك في أمان.</span>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-3 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95"
          >
            <RefreshCw className="w-4 h-4" /> Retry · إعادة المحاولة
          </button>
          <button onClick={() => logout()} className="text-xs text-slate-500 underline">
            Sign out · تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  // If user exists but no profile, show Onboarding
  if (!profile || !profile.onboardingComplete) {
    return <Onboarding user={user} onComplete={handleOnboardingComplete} />;
  }

  const renderView = () => {
    const activeProfile = fullProfile || profile;
    // Public legal pages: reachable by guests too (linked from the consent gate).
    if (currentView === 'privacy_policy') {
      return (
        <Suspense fallback={null}>
          <PrivacyPolicyPage language={activeProfile?.language} onBack={handleBack} />
        </Suspense>
      );
    }
    if (currentView === 'terms') {
      return (
        <Suspense fallback={null}>
          <TermsOfServicePage language={activeProfile?.language} onBack={handleBack} />
        </Suspense>
      );
    }
    if (!activeProfile) return null;
    switch (currentView) {
      case 'blind_home':
        return (
          <BlindHomeView
            profile={activeProfile}
            isArabic={isArabicLocale(activeProfile.language)}
            onNavigate={navigateTo}
          />
        );
      case 'voice_navigation':
        return (
          <VoiceNavigationView
            profile={activeProfile}
            isArabic={isArabicLocale(activeProfile.language)}
            onNavigateBack={handleBack}
          />
        );
      case 'daily_aids':
        return (
          <DailyAidsView
            profile={activeProfile}
            isArabic={isArabicLocale(activeProfile.language)}
            onNavigateBack={handleBack}
          />
        );
      case 'known_people':
        return (
          <KnownPeopleView
            profile={activeProfile}
            isArabic={isArabicLocale(activeProfile.language)}
            onNavigateBack={handleBack}
          />
        );
      case 'chat':
        return (
          <>
            <ChatInterface 
              ref={chatRef}
              profile={activeProfile}
              onQuestionEvaluated={updateQuestionHistory} 
              syncMessages={syncActiveThread} 
              onMenuClick={handleOpenMobileMenu} 
              externalMessage={externalMessage}
              onStreamingUpdate={(text) => setCurrentAIResponse(text)}
              onSTTStateChange={setIsSTTActive}
              setProfile={setProfile}
              onNavigateBack={handleBack}
            />
          </>
        );
      case 'video':
        return (
          <DisabilityModeView
            ref={chatRef}
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigate={navigateTo}
            onQuestionEvaluated={updateQuestionHistory}
            syncMessages={syncActiveThread}
            externalMessage={externalMessage}
            onStreamingUpdate={(text) => setCurrentAIResponse(text)}
            onSTTStateChange={setIsSTTActive}
            currentTab="deaf"
            onTabChange={(newTab) => {
              if (newTab === 'deaf') return;
              setDisabilityTab(newTab);
              navigateTo('disability');
            }}
            setProfile={setProfile}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
        );
      case 'disability':
        return <DisabilityModeView
          ref={chatRef}
          profile={activeProfile}
          onMenuClick={handleOpenMobileMenu}
          onNavigate={navigateTo}
          onQuestionEvaluated={updateQuestionHistory}
          syncMessages={syncActiveThread}
          externalMessage={externalMessage}
          onStreamingUpdate={(text) => setCurrentAIResponse(text)}
          onSTTStateChange={setIsSTTActive}
          currentTab={disabilityTab}
          onTabChange={(newTab) => {
            setDisabilityTab(newTab);
            const targetRoute: RouteState = { view: 'disability', tab: newTab };
            const newHash = buildHash(targetRoute);
            if (window.location.hash !== newHash) {
              window.history.pushState({ view: 'disability', tab: newTab }, '', newHash);
            }
          }}
          initialSection={currentSection}
          onSectionChange={setCurrentSection}
          onOpenSectionTool={handleSelectSection}
          setProfile={setProfile}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />;
      case 'book_studio':
        return (
          <AccessibleBookStudioView
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigateBack={handleBack}
            isDarkMode={isDarkMode}
          />
        );
      case 'gym':
      case 'toolkit':
        if (currentView === 'gym') {
          try { sessionStorage.setItem('rafiqi_toolkit_category', 'cognitive_gym'); } catch {}
        }
        return (
          <UnifiedAccessibilityToolkitView
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigateBack={handleBack}
            onOpenBookStudio={(content, title) => {
              if (content) {
                try {
                  sessionStorage.setItem('rafiqi_book_studio_import', JSON.stringify({ text: content, title }));
                } catch {}
              }
              navigateTo('book_studio');
            }}
            isDarkMode={isDarkMode}
          />
        );
      case 'audio_document_intelligence':
        return (
          <AudioDocumentIntelligenceView
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigateBack={handleBack}
            isDarkMode={isDarkMode}
          />
        );
      case 'hear_express':
        return (
          <HearAndExpressView
            profile={activeProfile}
            onNavigateBack={handleBack}
            onOpenSignStudio={() => navigateTo('disability', 'deaf')}
            isDarkMode={isDarkMode}
          />
        );
      case 'productivity':
        return (
          <AccessibleProductivityWorkspaceView
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigateBack={handleBack}
            onOpenBookStudio={(content, title) => {
              if (content) {
                try {
                  sessionStorage.setItem('rafiqi_book_studio_import', JSON.stringify({ text: content, title }));
                } catch {}
              }
              navigateTo('book_studio');
            }}
            isDarkMode={isDarkMode}
          />
        );
      case 'mobility':
        return (
          <AccessibleMobilityWorkspaceView
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigateBack={handleBack}
            isDarkMode={isDarkMode}
          />
        );
      case 'communication':
      case 'communicate':
        return (
          <AccessibleCommunicateWorkspaceView
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigateBack={handleBack}
            onOpenHearingSuite={() => navigateTo('hear_express')}
            isDarkMode={isDarkMode}
          />
        );
      case 'profile':
        return (
          <DisabilityModeView
            ref={chatRef}
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigate={navigateTo}
            onQuestionEvaluated={updateQuestionHistory}
            syncMessages={syncActiveThread}
            externalMessage={externalMessage}
            onStreamingUpdate={(text) => setCurrentAIResponse(text)}
            onSTTStateChange={setIsSTTActive}
            currentTab="progress"
            onTabChange={(newTab) => {
              if (newTab === 'progress') return;
              if (newTab === 'settings') {
                navigateTo('settings');
              } else {
                setDisabilityTab(newTab);
                navigateTo('disability', newTab);
              }
            }}
            setProfile={setProfile}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
        );
      case 'privacy_security':
      case 'privacy':
        return (
          <div className={`flex-1 flex flex-col ${isDarkMode ? 'bg-[#0A2342] text-stone-100' : 'bg-[#F5F9FD] text-stone-900'} overflow-y-auto custom-scrollbar p-4 md:p-8`}>
            <header className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={handleBack}
                aria-label={localize(activeProfile.language, 'Back to Dashboard Hub', 'الرجوع للوحة الميزات الرئيسية')}
                title={localize(activeProfile.language, 'Back to Dashboard Hub', 'الرجوع للوحة الميزات الرئيسية')}
                className={`min-h-[44px] min-w-[44px] p-2.5 ${isDarkMode ? 'text-stone-300 bg-[#162327] border-stone-800 hover:text-white hover:bg-stone-800' : 'text-stone-700 bg-white border-stone-200 hover:text-stone-950 hover:bg-stone-100'} shadow-sm border rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F59E0B]`}
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                <span className="text-xs font-bold hidden sm:inline">{localize(activeProfile.language, 'Back', 'رجوع')}</span>
              </button>
              <button 
                type="button"
                onClick={handleOpenMobileMenu}
                className={`min-h-[44px] min-w-[44px] p-2.5 ${isDarkMode ? 'text-stone-300 bg-[#162327] border-stone-800 hover:text-white hover:bg-stone-800' : 'text-stone-700 bg-white border-stone-200 hover:text-stone-950 hover:bg-stone-100'} shadow-sm border rounded-2xl active:scale-95 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F59E0B]`}
                aria-label={localize(activeProfile.language, 'Toggle menu', 'فتح القائمة الرئيسية')}
              >
                <Menu className="w-6 h-6" />
              </button>
            </header>
            <PrivacySecurityCenter
              currentStudent={activeProfile.studentState}
              isArabic={isArabicLocale(activeProfile.language)}
            />
          </div>
        );
      case 'admin':
        return (
          <DisabilityModeView
            ref={chatRef}
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigate={navigateTo}
            onQuestionEvaluated={updateQuestionHistory}
            syncMessages={syncActiveThread}
            externalMessage={externalMessage}
            onStreamingUpdate={(text) => setCurrentAIResponse(text)}
            onSTTStateChange={setIsSTTActive}
            currentTab="admin"
            onTabChange={(newTab) => {
              if (newTab === 'admin') return;
              setDisabilityTab(newTab);
              navigateTo('disability');
            }}
            setProfile={setProfile}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
        );
      case 'support':
        return <SupportCenter profile={activeProfile} onMenuClick={handleOpenMobileMenu} onNavigateBack={handleBack} />;

      case 'settings':
        return (
          <DisabilityModeView
            ref={chatRef}
            profile={activeProfile}
            onMenuClick={handleOpenMobileMenu}
            onNavigate={navigateTo}
            onQuestionEvaluated={updateQuestionHistory}
            syncMessages={syncActiveThread}
            externalMessage={externalMessage}
            onStreamingUpdate={(text) => setCurrentAIResponse(text)}
            onSTTStateChange={setIsSTTActive}
            currentTab="settings"
            onTabChange={(newTab) => {
              if (newTab === 'settings') return;
              if (newTab === 'progress') {
                navigateTo('profile');
              } else {
                setDisabilityTab(newTab);
                navigateTo('disability', newTab);
              }
            }}
            setProfile={setProfile}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <DisabilityModeView
            ref={chatRef}
            profile={activeProfile}
            onMenuClick={() => setIsMobileMenuOpen(true)}
            onNavigate={navigateTo}
            onQuestionEvaluated={updateQuestionHistory}
            syncMessages={syncActiveThread}
            externalMessage={externalMessage}
            onStreamingUpdate={(text) => setCurrentAIResponse(text)}
            onSTTStateChange={setIsSTTActive}
            currentTab={disabilityTab}
            onTabChange={setDisabilityTab}
            setProfile={setProfile}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            onLogout={handleLogout}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <div
        className={`app-navy flex w-full h-[100dvh] ${isDarkMode ? 'bg-[#0A2342] text-stone-100' : 'bg-[#F5F9FD] text-stone-900'} font-sans overflow-hidden selection:bg-[#1769AA]/25 transition-all duration-300 ${
          profile?.accessibilityMode === 'Visual' ? 'text-lg contrast-125' : ''
        }`}
        dir={direction}
      >
        <ToastContainer rtl={direction === 'rtl'} />
        <RouteAnnouncer route={{ view: currentView, tab: disabilityTab, section: currentSection || undefined }} language={profile?.language} />

        {/* WCAG 2.4.1 Skip to main content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2.5 focus:bg-[#E5A93C] focus:text-slate-950 focus:font-black focus:rounded-2xl focus:shadow-2xl focus:ring-4 focus:ring-[#E5A93C]/30 transition-all text-xs"
        >
          {localize(profile?.language, 'Skip to main content', 'الانتقال إلى المحتوى الرئيسي')}
        </a>

        <PwaInstallPrompt language={profile?.language} />
        <ReadAloudSelection language={profile?.language} />

        {/* Mobile menu backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm lg:hidden"
            onClick={handleCloseMobileMenu}
          />
        )}

        {/* Sidebar — persistent on desktop (lg:static), off-canvas drawer on mobile */}
        <div
            ref={sidebarRef}
            role="dialog"
            aria-modal={isMobileMenuOpen ? "true" : undefined}
            aria-label={localize(profile?.language, 'Main menu', 'القائمة الرئيسية')}
            className={`fixed lg:static inset-y-0 start-0 z-50 lg:z-auto h-full shrink-0 transform lg:transform-none ${
              isMobileMenuOpen 
                ? 'translate-x-0 visible' 
                : (direction === 'rtl' ? 'translate-x-full invisible lg:visible lg:translate-x-0' : '-translate-x-full invisible lg:visible lg:translate-x-0')
            } transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-2xl lg:shadow-none`}>
            <Sidebar 
              profile={fullProfile || profile}
              setProfile={async (p) => {
                // Update local state instantly so UI is highly reactive
                setProfile(p);
                
                if (!user) return;
                const path = `users/${user.uid}`;
                try {
                  const cleanProfile = JSON.parse(JSON.stringify(p));
                  
                  // Ensure activeThreadId is explicitly preserved as null if not present/undefined, so Firestore overwrites it and doesn't get merged out
                  cleanProfile.activeThreadId = p.activeThreadId !== undefined ? p.activeThreadId : null;
                  
                  // Prune large arrays to stay under 1MB
                  if (cleanProfile.chatThreads) {
                    cleanProfile.chatThreads = cleanProfile.chatThreads.map((t: any) => ({
                      id: t.id || "",
                      title: t.title || "New Chat",
                      updatedAt: t.updatedAt || new Date().toISOString(),
                      lastMessageSnippet: t.lastMessageSnippet || ""
                    }));
                  }
                  delete cleanProfile.chatHistory;

                  const finalProfileToSave = cleanDataForFirestore(cleanProfile);
                  await setDoc(doc(db, path), finalProfileToSave, { merge: true });
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, path);
                }
              }} 
              currentView={currentView}
              setCurrentView={navigateTo}
              activeDisabilityTab={disabilityTab}
              onSelectDisabilityTab={(tab) => {
                setCurrentSection(null);
                setDisabilityTab(tab);
                setIsMobileMenuOpen(false);
              }}
              currentSection={currentSection}
              onSelectSection={(sec) => {
                if (sec) {
                  navigateTo(sec);
                } else {
                  navigateTo('disability', 'hub');
                }
                setIsMobileMenuOpen(false);
              }}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              openLiveCaptions={() => setIsLiveCaptionsOpen(true)}
              onClose={handleCloseMobileMenu}
              onLogout={handleLogout}
            />
        </div>

        {/* Main Application Content Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <GlobalHeader
            profile={fullProfile || profile}
            currentView={currentView}
            currentSection={currentSection}
            activeTab={disabilityTab}
            onMenuClick={handleOpenMobileMenu}
            onSelectSection={(sec) => navigateTo(sec)}
            onNavigate={(view, tab) => {
              if (view === 'disability') {
                if (tab) {
                  setDisabilityTab(tab as DisabilityTab);
                  navigateTo('disability', tab as DisabilityTab);
                } else {
                  setCurrentSection(null);
                  navigateTo('disability', 'hub');
                }
              } else if (view === 'home') {
                setCurrentSection(null);
                navigateTo('disability', 'hub');
              } else {
                navigateTo(view as any, tab as any);
              }
            }}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            setProfile={setProfile}
            onLogout={handleLogout}
          />

          {barSection && (
            <SectionToolBar
              sectionId={barSection}
              isAr={direction === 'rtl'}
              isDarkMode={isDarkMode}
              isActive={isFeatureActive}
              onSelect={(f) => openSectionFeature(barSection, f)}
            />
          )}

          <main id="main-content" tabIndex={-1} className="flex-1 relative overflow-hidden flex flex-col md:flex-row focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]">
            <Suspense
              fallback={
                <div role="status" aria-live="polite" className="flex-1 flex items-center justify-center bg-[#0A2342] text-teal-400">
                  <Loader2 className="w-8 h-8 text-teal-400 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Loading view...</span>
                </div>
              }
            >
              {renderView()}
            </Suspense>
          </main>
        </div>

        {/* The floating accessibility overlay (sign avatar / mic / vision) is ONLY for
            users who actually need it — a real accessibility mode or the Special Needs
            path. Sighted staff who can also open the disability hub (admins, org/charity
            managers viewing their OrgDashboard) must NOT get a camera/mic overlay, so we
            gate on isAccessibilityUser rather than on the current view. */}
        {profile && isAccessibilityUser(profile)
          // Hide completely while inside the dedicated Disability Hub or Sign Studio —
          // all disability tools operate within their dedicated full-screen views
          // without needing the floating accessibility eye button overlay.
          && currentView !== 'disability'
          && currentView !== 'video' && (
          <Suspense fallback={null}>
            <AccessibilityOverlay
              mode={!profile.accessibilityMode || profile.accessibilityMode === 'None' ? 'Vocal-Deaf' : profile.accessibilityMode}
              profile={profile}
              aiResponse={currentAIResponse}
              isListening={isSTTActive}
              onTranscription={(text) => {
                setExternalMessage(text);
                // Reset so it doesn't keep triggering if ChatInterface clears it
                setTimeout(() => setExternalMessage(""), 500);
              }} 
              onToggleListening={() => {
                if (chatRef.current) {
                  chatRef.current.toggleSTT();
                }
              }}
            />
          </Suspense>
        )}

        <AnimatePresence>
          {isLiveCaptionsOpen && (
            <Suspense fallback={null}>
              <LiveCaptions
                language={isArabicLocale(profile?.language) ? 'ar-EG' : 'en-US'}
                onClose={() => setIsLiveCaptionsOpen(false)} 
              />
            </Suspense>
          )}
        </AnimatePresence>

        {/* Global blind-first controls: floating hold-to-talk voice button,
            triple-tap / shake SOS, and the SOS modal — available on EVERY screen
            for blind and low-vision users. */}
        {user && profile?.accessibilityMode === 'Visual' && (
          <Suspense fallback={null}>
            <GlobalVoiceControls
              profile={profile}
              isArabic={isArabicLocale(profile?.language)}
              onNavigate={(view, tab) => navigateTo(view, tab)}
              setProfile={setProfile}
            />
          </Suspense>
        )}


      </div>
    </ErrorBoundary>
  );
}
