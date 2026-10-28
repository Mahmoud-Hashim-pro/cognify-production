/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cognify Inclusive Platform — Central Navigation, Routing & History Orchestrator
 * (Phase 5: Seamless Navigation, Android/Browser Back Sync, Session Restoration)
 */

import { AppView, isAccessibilityUser, homeViewFor } from './access';
import { UserProfile } from '../types';

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

export interface RouteState {
  view: AppView;
  tab?: DisabilityTab;
  params?: Record<string, string>;
}

export const VALID_VIEWS: readonly AppView[] = [
  'disability', 'video', 'chat', 'profile', 'settings', 'book_studio', 'toolkit', 'admin', 'support', 'privacy_security',
  'learning', 'goals', 'gpa', 'analytics', 'planner', 'memory', 'gym', 'iq',
  'institution', 'france', 'privacy', 'intelligence', 'teacher', 'parent',
  'evaluation', 'ai_quality', 'resilience', 'tenancy', 'developer_api', 'retention',
] as const;

export const VALID_DISABILITY_TABS: readonly DisabilityTab[] = [
  'hub', 'chat', 'vision', 'deaf', 'caregiver', 'orchestrator', 'org', 'settings', 'video', 'studio', 'bridge', 'radar', 'progress', 'admin'
] as const;

export const STORAGE_KEYS = {
  RETURN_DESTINATION: 'cognify_return_destination',
  SESSION_EXPIRED: 'cognify_session_expired',
  DEFAULT_TAB: 'cognify_default_disability_tab',
  CHAT_DRAFT: 'cognify_chat_draft_input',
  VISION_OBSERVATION: 'cognify_vision_last_observation',
  DOC_STUDIO_DRAFT: 'cognify_doc_studio_active',
} as const;

/**
 * Parses an arbitrary hash or URL path into a canonical RouteState.
 * Supports deep links such as:
 * - #disability/vision, #disability/hub, #disability/deaf, #disability/chat
 * - Friendly shorthands: #vision, #deaf, #hub, #caregiver, #orchestrator
 * - Aliases: #privacy -> privacy_security, #intelligence -> profile
 */
export function parseRoute(hashString: string): RouteState {
  if (!hashString) {
    return { view: 'disability', tab: 'hub' };
  }

  // Strip leading '#', '/', '?'
  const clean = hashString.replace(/^[#/]+/, '').trim();
  if (!clean) {
    return { view: 'disability', tab: 'hub' };
  }

  // Handle direct aliases
  if (clean === 'privacy') return { view: 'privacy_security' };
  if (clean === 'intelligence') return { view: 'profile' };
  if (clean === 'admin' || clean === 'users' || clean === 'database') return { view: 'admin' };

  // Handle direct disability tab shorthands (e.g. #vision, #deaf, #hub, #book_studio, #toolkit)
  if (clean === 'toolkit' || clean === 'assistant' || clean === 'scanner' || clean === 'stickers') return { view: 'toolkit' };
  if (clean === 'studio' || clean === 'book_studio' || clean === 'book-studio' || clean === 'books') return { view: 'book_studio' };
  if (clean === 'vision') return { view: 'disability', tab: 'vision' };
  if (clean === 'deaf' || clean === 'hearing') return { view: 'disability', tab: 'deaf' };
  if (clean === 'hub') return { view: 'disability', tab: 'hub' };
  if (clean === 'caregiver') return { view: 'disability', tab: 'caregiver' };
  if (clean === 'orchestrator') return { view: 'disability', tab: 'orchestrator' };

  // Split view and sub-tab if formatted as view/tab (e.g. disability/vision)
  const segments = clean.split('/').filter(Boolean);
  const primaryView = segments[0] as AppView;

  if (primaryView === 'disability') {
    const rawTab = segments[1] as DisabilityTab | undefined;
    if (rawTab && (VALID_DISABILITY_TABS as readonly string[]).includes(rawTab)) {
      return { view: 'disability', tab: rawTab };
    }
    return { view: 'disability', tab: 'hub' };
  }

  if (primaryView === 'video') {
    return { view: 'video', tab: 'deaf' };
  }

  if ((VALID_VIEWS as readonly string[]).includes(primaryView)) {
    return { view: primaryView };
  }

  // Fallback for unknown or malformed routes
  return { view: 'disability', tab: 'hub' };
}

/**
 * Builds a canonical URL hash from a RouteState.
 */
export function buildHash(route: RouteState): string {
  if (route.view === 'disability') {
    if (route.tab && route.tab !== 'hub') {
      return `#disability/${route.tab}`;
    }
    return '#disability/hub';
  }
  return `#${route.view}`;
}

export interface ReturnDestination {
  view: AppView;
  tab?: DisabilityTab;
  hash: string;
  timestamp: number;
}

/**
 * Stores the user's current destination before redirecting to login or auth challenge.
 */
export function saveReturnDestination(route: RouteState, explicitHash?: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const payload: ReturnDestination = {
      view: route.view,
      tab: route.tab,
      hash: explicitHash || buildHash(route),
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEYS.RETURN_DESTINATION, JSON.stringify(payload));
  } catch (err) {
    console.warn('[Cognify Nav] Failed to save return destination:', err);
  }
}

/**
 * Retrieves the saved return destination if valid and within 24 hours.
 */
export function getReturnDestination(): ReturnDestination | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.RETURN_DESTINATION);
    if (!raw) return null;
    const data: ReturnDestination = JSON.parse(raw);
    if (Date.now() - data.timestamp > 86400000) {
      sessionStorage.removeItem(STORAGE_KEYS.RETURN_DESTINATION);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Clears the saved return destination after successful restoration.
 */
export function clearReturnDestination(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEYS.RETURN_DESTINATION);
  } catch {}
}

/**
 * Records that an active session expired unexpectedly.
 */
export function markSessionExpired(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRED, 'true');
  } catch {}
}

/**
 * Checks if a session expiration notice is pending. Consumes the flag.
 */
export function checkAndClearSessionExpired(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const expired = sessionStorage.getItem(STORAGE_KEYS.SESSION_EXPIRED) === 'true';
    if (expired) {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRED);
    }
    return expired;
  } catch {
    return false;
  }
}

/**
 * Checks whether two RouteStates are identical to prevent duplicate history pushes.
 */
export function isSameRoute(a: RouteState, b: RouteState): boolean {
  if (a.view !== b.view) return false;
  if (a.view === 'disability') {
    const tabA = a.tab || 'hub';
    const tabB = b.tab || 'hub';
    return tabA === tabB;
  }
  return true;
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  view: AppView;
  tab?: DisabilityTab;
  current?: boolean;
}

/**
 * Returns human-readable page title for given RouteState and locale.
 */
export function getRouteTitle(route: RouteState, lang?: string): string {
  const isAr = lang === 'Arabic' || lang === 'Egyptian Ammiya' || lang === 'ar';
  
  if (route.view === 'disability') {
    switch (route.tab) {
      case 'vision':
        return isAr ? 'الرفيق البصري' : 'Visual Companion';
      case 'deaf':
      case 'bridge':
      case 'radar':
        return isAr ? 'استوديو لغة الإشارة والسمع 3D' : '3D Sign & Hearing Studio';
      case 'caregiver':
        return isAr ? 'بوابة المعلم والأسرة' : 'Caregiver & Educator Hub';
      case 'orchestrator':
        return isAr ? 'منسق الإعاقات المتعددة' : 'Cross-Disability Orchestrator';
      case 'chat':
        return isAr ? 'المعلم الذكي المهيأ' : 'Accessible AI Tutor';
      case 'hub':
      default:
        return isAr ? 'لوحة الميزات الرئيسية' : 'Dashboard Hub';
    }
  }

  switch (route.view) {
    case 'book_studio':
      return isAr ? 'استوديو الكتب والمستندات' : 'Accessible Book Studio';
    case 'toolkit':
      return isAr ? 'منظومة أدوات الوصول' : 'Accessibility Toolkit';
    case 'chat':
      return isAr ? 'المعلم الذكي المهيأ' : 'Accessible AI Tutor';
    case 'profile':
      return isAr ? 'جواز الإتاحة والملف الشخصي' : 'Accommodation Passport';
    case 'settings':
      return isAr ? 'إعدادات النظام واللغة' : 'System Settings';
    case 'privacy_security':
    case 'privacy':
      return isAr ? 'الخصوصية وأمان البيانات' : 'Privacy & Security';
    case 'support':
      return isAr ? 'الدعم والمساعدة' : 'Accessible Support';
    case 'admin':
      return isAr ? 'لوحة الإدارة' : 'Admin Portal';
    case 'video':
      return isAr ? 'استوديو لغة الإشارة 3D' : '3D Sign Video Studio';
    default:
      return isAr ? 'لوحة الميزات الرئيسية' : 'Dashboard Hub';
  }
}

/**
 * Generates an informative screen-reader announcement when route changes.
 */
export function getRouteAnnouncement(route: RouteState, lang?: string): string {
  const isAr = lang === 'Arabic' || lang === 'Egyptian Ammiya' || lang === 'ar';
  const title = getRouteTitle(route, lang);

  if (isAr) {
    return `تم الانتقال إلى ${title}.`;
  }
  return `Navigated to ${title}.`;
}

/**
 * Builds breadcrumbs hierarchy for deep screens.
 */
export function getRouteBreadcrumbs(route: RouteState, lang?: string): BreadcrumbItem[] {
  const isAr = lang === 'Arabic' || lang === 'Egyptian Ammiya' || lang === 'ar';
  const hubLabel = isAr ? 'لوحة الميزات' : 'Dashboard Hub';
  
  const rootBreadcrumb: BreadcrumbItem = {
    id: 'hub',
    label: hubLabel,
    view: 'disability',
    tab: 'hub',
    current: route.view === 'disability' && (!route.tab || route.tab === 'hub'),
  };

  // If we are at the hub root, return single item
  if (route.view === 'disability' && (!route.tab || route.tab === 'hub')) {
    return [rootBreadcrumb];
  }

  const currentTitle = getRouteTitle(route, lang);
  const currentBreadcrumb: BreadcrumbItem = {
    id: route.tab ? `${route.view}-${route.tab}` : route.view,
    label: currentTitle,
    view: route.view,
    tab: route.tab,
    current: true,
  };

  return [rootBreadcrumb, currentBreadcrumb];
}

/**
 * Safely navigates backwards using browser history if available,
 * or cleanly falls back to the specified route to prevent leaving the application.
 */
export function smartNavigateBack(
  onNavigateFallback?: (view: AppView, tab?: DisabilityTab) => void,
  fallbackView: AppView = 'disability',
  fallbackTab: DisabilityTab = 'hub'
): void {
  if (typeof window !== 'undefined') {
    // If window.history has entries and referrer is Cognify origin
    if (window.history.length > 1 && (document.referrer === '' || document.referrer.includes(window.location.host))) {
      window.history.back();
      return;
    }
  }
  if (onNavigateFallback) {
    onNavigateFallback(fallbackView, fallbackTab);
  } else if (typeof window !== 'undefined') {
    window.location.hash = buildHash({ view: fallbackView, tab: fallbackTab });
  }
}

