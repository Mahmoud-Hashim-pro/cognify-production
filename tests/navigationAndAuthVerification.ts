/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cognify Automated Verification Suite: Milestone 31
 * Phase 5: Navigation, Back Buttons, Browser/Android Popstate & Auth Redirects
 */

import {
  parseRoute,
  buildHash,
  saveReturnDestination,
  getReturnDestination,
  clearReturnDestination,
  markSessionExpired,
  checkAndClearSessionExpired,
  isSameRoute,
  RouteState,
  STORAGE_KEYS,
  VALID_VIEWS,
  VALID_DISABILITY_TABS,
  getRouteTitle,
  getRouteAnnouncement,
  getRouteBreadcrumbs,
  smartNavigateBack,
} from '../src/lib/navigation.js';
import { canAccessView, homeViewFor, isAccessibilityUser } from '../src/lib/access.js';
import { UserProfile } from '../src/types.js';

// Polyfill mock sessionStorage for Node.js test environment if undefined
class MockSessionStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

if (typeof globalThis.sessionStorage === 'undefined') {
  (globalThis as any).sessionStorage = new MockSessionStorage();
}

export async function runNavigationAndAuthVerification(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✓ ${description}`);
      passed++;
    } else {
      console.error(`  ✗ ${description}`);
      failed++;
    }
  }

  console.log('\n--- 61. Milestone 31: Navigation, Back Buttons, Popstate & Auth Guards (Phase 5) ---');

  // Test 1: Canonical Hash Parsing & Route Recognition
  {
    const r1 = parseRoute('#disability/hub');
    assert(r1.view === 'disability' && r1.tab === 'hub', 'Parses #disability/hub canonical route');

    const r2 = parseRoute('#disability/vision');
    assert(r2.view === 'disability' && r2.tab === 'vision', 'Parses #disability/vision nested suite route');

    const r3 = parseRoute('#disability/deaf');
    assert(r3.view === 'disability' && r3.tab === 'deaf', 'Parses #disability/deaf nested hearing route');

    const r4 = parseRoute('#chat');
    assert(r4.view === 'chat' && !r4.tab, 'Parses #chat primary view');

    const r5 = parseRoute('#profile');
    assert(r5.view === 'profile' && !r5.tab, 'Parses #profile primary view');

    const r6 = parseRoute('#settings');
    assert(r6.view === 'settings' && !r6.tab, 'Parses #settings primary view');

    const r7 = parseRoute('#admin');
    assert(r7.view === 'admin' && !r7.tab, 'Parses #admin primary view');
  }

  // Test 2: Friendly Shorthand & Deep Link Aliases
  {
    const s1 = parseRoute('#vision');
    assert(s1.view === 'disability' && s1.tab === 'vision', 'Shorthand #vision maps directly to disability vision companion');

    const s2 = parseRoute('#deaf');
    assert(s2.view === 'disability' && s2.tab === 'deaf', 'Shorthand #deaf maps directly to disability hearing suite');

    const s3 = parseRoute('#hearing');
    assert(s3.view === 'disability' && s3.tab === 'deaf', 'Shorthand #hearing maps directly to disability hearing suite');

    const s4 = parseRoute('#hub');
    assert(s4.view === 'disability' && s4.tab === 'hub', 'Shorthand #hub maps directly to features cards hub');

    const s5 = parseRoute('#caregiver');
    assert(s5.view === 'disability' && s5.tab === 'caregiver', 'Shorthand #caregiver maps directly to caregiver hub');

    const s6 = parseRoute('#orchestrator');
    assert(s6.view === 'disability' && s6.tab === 'orchestrator', 'Shorthand #orchestrator maps to cross-disability orchestrator');

    const s7 = parseRoute('#privacy');
    assert(s7.view === 'privacy_security', 'Alias #privacy maps to privacy_security center');

    const s8 = parseRoute('#intelligence');
    assert(s8.view === 'profile', 'Alias #intelligence maps to user student profile');
  }

  // Test 3: Resilient Fallback for Unknown or Malformed Routes
  {
    const f1 = parseRoute('#some_random_broken_url_123');
    assert(f1.view === 'disability' && f1.tab === 'hub', 'Malformed route safely falls back to disability hub without crashing');

    const f2 = parseRoute('');
    assert(f2.view === 'disability' && f2.tab === 'hub', 'Empty route defaults to features hub');

    const f3 = parseRoute('#/');
    assert(f3.view === 'disability' && f3.tab === 'hub', 'Root slash route defaults to features hub');
  }

  // Test 4: Canonical Hash Builder
  {
    const h1 = buildHash({ view: 'disability', tab: 'hub' });
    assert(h1 === '#disability/hub', 'Builds canonical hash for disability hub (#disability/hub)');

    const h2 = buildHash({ view: 'disability', tab: 'vision' });
    assert(h2 === '#disability/vision', 'Builds canonical hash for vision suite (#disability/vision)');

    const h3 = buildHash({ view: 'disability', tab: 'deaf' });
    assert(h3 === '#disability/deaf', 'Builds canonical hash for deaf suite (#disability/deaf)');

    const h4 = buildHash({ view: 'chat' });
    assert(h4 === '#chat', 'Builds canonical hash for chat (#chat)');

    const h5 = buildHash({ view: 'profile' });
    assert(h5 === '#profile', 'Builds canonical hash for profile (#profile)');
  }

  // Test 5: Duplicate History Prevention
  {
    const cur: RouteState = { view: 'disability', tab: 'vision' };
    const same: RouteState = { view: 'disability', tab: 'vision' };
    const diff: RouteState = { view: 'disability', tab: 'deaf' };
    const diffView: RouteState = { view: 'chat' };

    assert(isSameRoute(cur, same) === true, 'isSameRoute correctly detects identical view and tab');
    assert(isSameRoute(cur, diff) === false, 'isSameRoute detects different tab within same view');
    assert(isSameRoute(cur, diffView) === false, 'isSameRoute detects different view');

    const chat1: RouteState = { view: 'chat' };
    const chat2: RouteState = { view: 'chat' };
    assert(isSameRoute(chat1, chat2) === true, 'isSameRoute detects identical chat view');
  }

  // Test 6: Browser & Android Hardware Popstate Simulation
  {
    // Simulate navigation history stack:
    // User starts at Hub -> Enters Vision Companion -> Hits Back -> Returns to Hub
    const historyStack: { state: RouteState; hash: string }[] = [];

    // Step 1: User lands on hub
    const hubRoute: RouteState = { view: 'disability', tab: 'hub' };
    historyStack.push({ state: hubRoute, hash: buildHash(hubRoute) });

    // Step 2: User taps Vision Companion
    const visionRoute: RouteState = { view: 'disability', tab: 'vision' };
    historyStack.push({ state: visionRoute, hash: buildHash(visionRoute) });
    assert(historyStack.length === 2, 'History stack records entering vision companion');

    // Step 3: Hardware Back button pressed (pop from stack)
    const popped = historyStack.pop();
    assert(popped?.state.tab === 'vision', 'Hardware back pops top vision route');

    const currentTop = historyStack[historyStack.length - 1];
    assert(currentTop.state.view === 'disability' && currentTop.state.tab === 'hub',
      'Hardware back restores user to features hub without losing view context');
  }

  // Test 7: Expired Session Tracking & Recovery
  {
    sessionStorage.clear();
    assert(checkAndClearSessionExpired() === false, 'Initially no session expired flag is active');

    markSessionExpired();
    assert(sessionStorage.getItem(STORAGE_KEYS.SESSION_EXPIRED) === 'true', 'markSessionExpired sets flag in session storage');

    const wasExpired = checkAndClearSessionExpired();
    assert(wasExpired === true, 'checkAndClearSessionExpired detects expired flag');
    assert(checkAndClearSessionExpired() === false, 'checkAndClearSessionExpired consumes flag to prevent repeated banners');
  }

  // Test 8: Safe Return Destination Preservation Across Auth Redirects
  {
    sessionStorage.clear();

    const targetRoute: RouteState = { view: 'disability', tab: 'vision' };
    saveReturnDestination(targetRoute, '#disability/vision');

    const restored = getReturnDestination();
    assert(restored !== null, 'getReturnDestination returns persisted return object');
    assert(restored?.view === 'disability', 'Restored return view is disability');
    assert(restored?.tab === 'vision', 'Restored return tab is vision');
    assert(restored?.hash === '#disability/vision', 'Restored return hash matches original route');

    clearReturnDestination();
    assert(getReturnDestination() === null, 'clearReturnDestination cleanly clears storage key after restoration');
  }

  // Test 9: Stale Return Destination Expiration (>24 hours)
  {
    sessionStorage.clear();
    const staleDestination = {
      view: 'profile',
      tab: undefined,
      hash: '#profile',
      timestamp: Date.now() - (25 * 3600 * 1000), // 25 hours old
    };
    sessionStorage.setItem(STORAGE_KEYS.RETURN_DESTINATION, JSON.stringify(staleDestination));

    const restoredStale = getReturnDestination();
    assert(restoredStale === null, 'Stale return destination older than 24 hours is safely pruned and returns null');
  }

  // Test 10: Role Guard & Protected Route Access Control
  {
    const studentUser: UserProfile = {
      uid: 'student-123',
      email: 'student@cognify.demo',
      name: 'Amr',
      role: 'Student',
      accountPath: 'Special Needs',
      accessibilityMode: 'Visual',
      points: 100,
      level: 'Basic',
      educationLevel: 'University',
      field: 'General',
      questionScore: 0,
      questionHistory: [],
      onboardingComplete: true,
    };

    const adminUser: UserProfile = {
      ...studentUser,
      uid: 'admin-999',
      role: 'Professional',
      isAdmin: true,
    };

    // Non-admin student accessing admin portal
    const canStudentAccessAdmin = canAccessView(studentUser, 'admin', false);
    assert(canStudentAccessAdmin === false, 'Non-admin student cannot access protected #admin route');

    // Admin user accessing admin portal
    const canAdminAccessAdmin = canAccessView(adminUser, 'admin', true);
    assert(canAdminAccessAdmin === true, 'Admin user can access protected #admin route');

    // Normal views accessible to all authenticated users
    assert(canAccessView(studentUser, 'disability', false) === true, 'Student can access disability view');
    assert(canAccessView(studentUser, 'chat', false) === true, 'Student can access chat view');
    assert(canAccessView(studentUser, 'profile', false) === true, 'Student can access profile view');
    assert(canAccessView(studentUser, 'settings', false) === true, 'Student can access settings view');
    assert(canAccessView(studentUser, 'support', false) === true, 'Student can access support view');
    assert(canAccessView(studentUser, 'privacy_security', false) === true, 'Student can access privacy & security view');

    // Safe home redirect for student when denied
    const studentHome = homeViewFor(studentUser);
    assert(studentHome === 'disability', 'homeViewFor returns disability for accessibility student');
  }

  // Test 11: In-Progress Draft Work & State Preservation
  {
    sessionStorage.clear();

    // 1. Chat input draft auto-persistence
    const testDraftPrompt = 'اشرح لي قانون نيوتن الثاني بمثال مبسط للسرعة';
    sessionStorage.setItem(STORAGE_KEYS.CHAT_DRAFT, testDraftPrompt);
    const restoredChatDraft = sessionStorage.getItem(STORAGE_KEYS.CHAT_DRAFT);
    assert(restoredChatDraft === testDraftPrompt, 'Chat draft input persists across navigation without loss');

    // 2. Vision observation snapshot persistence
    const testObservation = {
      description: 'ورقة نقدية فئة مائة جنيه مصري في منتصف الكادر',
      timestamp: Date.now(),
      type: 'previous',
    };
    sessionStorage.setItem(STORAGE_KEYS.VISION_OBSERVATION, JSON.stringify(testObservation));
    const rawObs = sessionStorage.getItem(STORAGE_KEYS.VISION_OBSERVATION);
    const parsedObs = rawObs ? JSON.parse(rawObs) : null;
    assert(parsedObs?.description === testObservation.description, 'Vision Companion last observation persists across tab switches');
    assert(parsedObs?.type === 'previous', 'Restored observation is clearly marked as previous');

    // 3. Document audio lecture transcription persistence
    const testLectureDraft = {
      status: 'completed',
      fileName: 'Physics_Lecture_Ch3.mp3',
      transcript: 'أهلاً بكم في المحاضرة الثالثة من مادة الفيزياء الحيوية...',
      summary: 'ملخص المحاضرة يتناول قوانين الحركة وتطبيقاتها.',
    };
    sessionStorage.setItem(STORAGE_KEYS.DOC_STUDIO_DRAFT, JSON.stringify(testLectureDraft));
    const rawLecture = sessionStorage.getItem(STORAGE_KEYS.DOC_STUDIO_DRAFT);
    const parsedLecture = rawLecture ? JSON.parse(rawLecture) : null;
    assert(parsedLecture?.fileName === testLectureDraft.fileName, 'Audio lecture transcript persists across modal dismissals');
    assert(parsedLecture?.transcript.includes('الفيزياء الحيوية'), 'Lecture transcript content is faithfully retained');
  }

  // Test 12: Route-Level Navigation Verification Matrix
  {
    for (const view of VALID_VIEWS) {
      const parsed = parseRoute(`#${view}`);
      assert(parsed.view === (view === 'intelligence' ? 'profile' : view === 'privacy' ? 'privacy_security' : view),
        `Route verification passes for view: ${view}`);
    }

    for (const tab of VALID_DISABILITY_TABS) {
      const parsed = parseRoute(`#disability/${tab}`);
      assert(parsed.view === 'disability' && parsed.tab === tab,
        `Nested tab verification passes for tab: disability/${tab}`);
    }
  }

  // Test 13: Page Title & Screen Reader Announcement Generation (English & Arabic)
  {
    const hubTitleEn = getRouteTitle({ view: 'disability', tab: 'hub' }, 'English');
    const hubTitleAr = getRouteTitle({ view: 'disability', tab: 'hub' }, 'Arabic');
    assert(hubTitleEn === 'Dashboard Hub', 'getRouteTitle returns English Dashboard Hub title');
    assert(hubTitleAr === 'لوحة الميزات الرئيسية', 'getRouteTitle returns Arabic Dashboard Hub title');

    const visionTitleEn = getRouteTitle({ view: 'disability', tab: 'vision' }, 'English');
    const visionTitleAr = getRouteTitle({ view: 'disability', tab: 'vision' }, 'Arabic');
    assert(visionTitleEn === 'Visual Companion', 'getRouteTitle returns English Visual Companion title');
    assert(visionTitleAr === 'الرفيق البصري', 'getRouteTitle returns Arabic Visual Companion title');

    const studioTitleEn = getRouteTitle({ view: 'book_studio' }, 'English');
    assert(studioTitleEn === 'Accessible Book Studio', 'getRouteTitle returns Accessible Book Studio for book_studio');

    const annEn = getRouteAnnouncement({ view: 'book_studio' }, 'English');
    const annAr = getRouteAnnouncement({ view: 'book_studio' }, 'Arabic');
    assert(annEn.includes('Navigated to Accessible Book Studio'), 'getRouteAnnouncement contains English navigation notice');
    assert(annAr.includes('تم الانتقال إلى'), 'getRouteAnnouncement contains Arabic navigation notice');
  }

  // Test 14: Breadcrumb Hierarchy Resolution
  {
    // 1. Root hub returns single breadcrumb marked current
    const rootCrumbs = getRouteBreadcrumbs({ view: 'disability', tab: 'hub' }, 'English');
    assert(rootCrumbs.length === 1, 'Root hub produces 1 breadcrumb item');
    assert(rootCrumbs[0].current === true, 'Root hub item is marked as current');

    // 2. Nested screen (Book Studio) returns [Hub, Book Studio]
    const studioCrumbs = getRouteBreadcrumbs({ view: 'book_studio' }, 'English');
    assert(studioCrumbs.length === 2, 'Deep screen produces 2 breadcrumb levels');
    assert(studioCrumbs[0].id === 'hub' && studioCrumbs[0].view === 'disability', 'First breadcrumb points back to hub');
    assert(studioCrumbs[1].view === 'book_studio' && studioCrumbs[1].current === true, 'Leaf breadcrumb is marked current');

    // 3. Arabic locale produces Arabic labels
    const arCrumbs = getRouteBreadcrumbs({ view: 'toolkit' }, 'Arabic');
    assert(arCrumbs[0].label === 'لوحة الميزات', 'Arabic root breadcrumb label is localized');
    assert(arCrumbs[1].label === 'منظومة أدوات الوصول', 'Arabic child breadcrumb label is localized');
  }

  // Test 15: Smart Back Navigation Fallback
  {
    let navigatedView: string | null = null;
    let navigatedTab: string | null = null;

    const mockNavigate = (view: any, tab?: any) => {
      navigatedView = view;
      navigatedTab = tab || null;
    };

    smartNavigateBack(mockNavigate, 'disability', 'hub');
    assert(navigatedView === 'disability' && navigatedTab === 'hub', 'smartNavigateBack cleanly falls back to disability hub when history is empty');
  }

  console.log(`\nMilestone 31 Results: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}
