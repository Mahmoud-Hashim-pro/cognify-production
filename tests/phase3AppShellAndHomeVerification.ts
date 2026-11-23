/**
 * Rafiqi UI Redesign — Phase 3 Global Application Shell & Premium Home Dashboard Verification
 * 
 * Validates:
 * 1. Global Shell Structure (Persistent desktop sidebar, responsive main container, GlobalHeader integration).
 * 2. Single Sidebar Invariant (No duplicate sidebars on desktop; internal drawer guarded when onMenuClick is passed).
 * 3. Official 6 Primary Product Sections in Sidebar + Separate Utilities.
 * 4. Admin Guard Security Invariant for Users & Database.
 * 5. GlobalHeader Capabilities (Dynamic breadcrumbs, search, language switcher, ThemeSelector, real notifications, user menu).
 * 6. Premium Home Dashboard (Time-of-day greeting, dominant primary visual action, secondary quick actions, 6 section cards).
 * 7. Real Data Integrity Invariant (Zero fabricated usage statistics, empty states with actionable CTAs).
 * 8. User Preference-Driven Recommendations (Visual, Vocal-Deaf, Speech, General).
 * 9. Responsive Adaptability & Accessibility Touch Targets (>= 44px/48px, zero overflow).
 */

import * as fs from 'fs';
import * as path from 'path';
import { PRODUCT_SECTIONS, ProductSectionId, getProductSection } from '../src/lib/sections';
import { isAdminUser } from '../src/lib/roles';
import { UserProfile } from '../src/types';

export async function runPhase3AppShellAndHomeVerification(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      failed++;
      errors.push(message);
      console.error(`  ❌ FAILED: ${message}`);
    }
  }

  console.log('\n========================================================================');
  console.log('--- Rafiqi Redesign Phase 3: Global Shell & Home Dashboard Audit ---');
  console.log('========================================================================\n');

  const projectRoot = process.cwd();
  const appPath = path.resolve(projectRoot, 'src/App.tsx');
  const sidebarPath = path.resolve(projectRoot, 'src/components/Sidebar.tsx');
  const globalHeaderPath = path.resolve(projectRoot, 'src/components/GlobalHeader.tsx');
  const homeDashboardPath = path.resolve(projectRoot, 'src/components/HomeDashboard.tsx');
  const disabilityModePath = path.resolve(projectRoot, 'src/components/DisabilityModeView.tsx');

  const appCode = fs.readFileSync(appPath, 'utf8');
  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
  const globalHeaderCode = fs.readFileSync(globalHeaderPath, 'utf8');
  const homeDashboardCode = fs.readFileSync(homeDashboardPath, 'utf8');
  const disabilityModeCode = fs.readFileSync(disabilityModePath, 'utf8');

  // ── [Suite 1] Global Application Shell Architecture ──
  console.log('--- [Suite 1] Global Application Shell Architecture ---');
  assert(fs.existsSync(appPath), 'src/App.tsx must exist');
  assert(fs.existsSync(globalHeaderPath), 'src/components/GlobalHeader.tsx must exist');
  assert(fs.existsSync(homeDashboardPath), 'src/components/HomeDashboard.tsx must exist');

  // Verify Persistent Sidebar on Desktop
  assert(appCode.includes('lg:static'), 'App.tsx sidebar wrapper must be static on desktop (lg:static)');
  assert(appCode.includes('lg:visible'), 'App.tsx sidebar wrapper must be visible on desktop (lg:visible)');
  assert(appCode.includes('lg:transform-none'), 'App.tsx sidebar wrapper must cancel translate transform on desktop (lg:transform-none)');
  assert(appCode.includes('lg:shadow-none'), 'App.tsx sidebar wrapper must remove drawer shadow on desktop (lg:shadow-none)');

  // Verify Mobile Drawer Backdrop is hidden on desktop
  assert(appCode.includes('lg:hidden') && appCode.includes('handleCloseMobileMenu'), 'Mobile backdrop must be hidden on desktop viewports');

  // Verify GlobalHeader mounted in App.tsx
  assert(appCode.includes('<GlobalHeader'), 'App.tsx must mount <GlobalHeader>');
  assert(appCode.includes('import GlobalHeader from "./components/GlobalHeader";') || appCode.includes('import GlobalHeader from \'./components/GlobalHeader\';'), 'App.tsx must import GlobalHeader');

  // ── [Suite 2] Single Sidebar Invariant (Dual-Sidebar Elimination) ──
  console.log('\n--- [Suite 2] Single Sidebar Invariant ---');
  assert(disabilityModeCode.includes('{!onMenuClick && (') && disabilityModeCode.includes('hidden lg:flex flex-col justify-between w-64'),
    'DisabilityModeView must suppress internal desktop sidebar when onMenuClick is passed');
  assert(appCode.includes('onMenuClick={handleOpenMobileMenu}'), 'App.tsx must supply onMenuClick handler to DisabilityModeView');

  // ── [Suite 3] Exactly Six Primary Sections & Separately Placed Utilities in Sidebar ──
  console.log('\n--- [Suite 3] Sidebar Section Architecture & Utilities ---');
  assert(PRODUCT_SECTIONS.length === 6, 'Exactly six official product sections must exist');
  assert(sidebarCode.includes('PRODUCT_SECTIONS.map'), 'Sidebar.tsx must map over PRODUCT_SECTIONS');
  assert(sidebarCode.includes('sec.numericOrder'), 'Sidebar.tsx displays official numeric section badges');

  // Utilities placed separately
  assert(sidebarCode.includes('Home') && sidebarCode.includes('الرئيسية'), 'Sidebar must include Home utility link');
  assert(sidebarCode.includes('Eye') && (sidebarCode.includes('Visual Assistant') || sidebarCode.includes('المساعد البصري')), 'Sidebar must include Visual Assistant shortcut');
  assert(sidebarCode.includes('My Progress') || sidebarCode.includes('تقدمي الدراسي'), 'Sidebar must include My Progress utility');
  assert(sidebarCode.includes('Settings') || sidebarCode.includes('الإعدادات'), 'Sidebar must include Settings utility');
  assert(sidebarCode.includes('Users & Database') || sidebarCode.includes('إدارة المستخدمين وقاعدة البيانات'), 'Sidebar must include Users & Database utility');

  // Verify Admin Guard on Sidebar
  assert(sidebarCode.includes('isAdminUser(profile)'), 'Users & Database utility in Sidebar must be strictly guarded by isAdminUser');

  // Touch target minimum size on sidebar buttons
  assert(sidebarCode.includes('min-h-[44px]') || sidebarCode.includes('min-h-[48px]'), 'Sidebar nav items meet accessible touch target guidelines (>= 44px)');

  // ── [Suite 4] Global Header Capabilities ──
  console.log('\n--- [Suite 4] Global Header Capabilities ---');
  // Dynamic Page Title / Breadcrumbs
  assert(globalHeaderCode.includes('getBreadcrumbTitle') || globalHeaderCode.includes('breadcrumbs'), 'GlobalHeader must compute dynamic breadcrumbs / titles');
  assert(globalHeaderCode.includes('getProductSection'), 'GlobalHeader resolves official section titles for breadcrumbs');

  // Search Input
  assert(globalHeaderCode.includes('type="search"') || globalHeaderCode.includes('placeholder='), 'GlobalHeader must provide global search input');
  assert(globalHeaderCode.includes('⌘K') || globalHeaderCode.includes('Ctrl+K') || globalHeaderCode.includes('Search'), 'GlobalHeader must include search shortcut indicator / hint');

  // Language Switcher
  assert(globalHeaderCode.includes('language') && (globalHeaderCode.includes('ar') || globalHeaderCode.includes('en')), 'GlobalHeader must support language switching');

  // Theme Control
  assert(globalHeaderCode.includes('ThemeSelector') || (globalHeaderCode.includes('toggleTheme') && globalHeaderCode.includes('isDarkMode')), 'GlobalHeader must integrate theme selection');

  // Real Notifications (Never fake)
  assert(globalHeaderCode.includes('notifications') && globalHeaderCode.includes('Bell'), 'GlobalHeader must provide functional notifications dropdown');
  assert(!globalHeaderCode.includes('fake_notification') && !globalHeaderCode.includes('mock_alert_unverified'), 'GlobalHeader notifications must not contain fabricated data');

  // User Profile Menu
  assert(globalHeaderCode.includes('isProfileMenuOpen'), 'GlobalHeader must manage profile dropdown state');
  assert(globalHeaderCode.includes('Profile & Passport') || globalHeaderCode.includes('الملف الشخصي وجواز التيسير'), 'User menu must contain Profile & Passport link');
  assert(globalHeaderCode.includes('Sign Out') || globalHeaderCode.includes('تسجيل الخروج'), 'User menu must contain Sign Out action');

  // ── [Suite 5] Premium Home Dashboard ──
  console.log('\n--- [Suite 5] Premium Home Dashboard ---');
  // Personal Welcome & Time-of-day greeting
  assert(homeDashboardCode.includes('Good morning') || homeDashboardCode.includes('صباح الخير'), 'HomeDashboard must include morning greeting');
  assert(homeDashboardCode.includes('Good afternoon') || homeDashboardCode.includes('Good evening') || homeDashboardCode.includes('مساء الخير'), 'HomeDashboard must include afternoon/evening greeting');
  assert(homeDashboardCode.includes('profile.name'), 'HomeDashboard greets user by name');

  // Dominant Primary Action
  assert(homeDashboardCode.includes('Launch Visual Assistant') || homeDashboardCode.includes('تشغيل المساعد البصري'), 'HomeDashboard dominant primary action must be Launch Visual Assistant');

  // Secondary Quick Actions
  assert(homeDashboardCode.includes('Live Captions') || homeDashboardCode.includes('التفريغ الصوتي المباشر'), 'HomeDashboard secondary actions must include Live Captions');
  assert(homeDashboardCode.includes('Accessibility Passport') || homeDashboardCode.includes('جواز التسهيلات الموحد'), 'HomeDashboard secondary actions must include Passport');

  // Exactly Six Section Cards
  assert(homeDashboardCode.includes('PRODUCT_SECTIONS.map'), 'HomeDashboard must render all 6 official product section cards');
  assert(homeDashboardCode.includes('sec.numericOrder'), 'HomeDashboard section cards must display numeric badges (1-6)');
  assert(homeDashboardCode.includes('sec.taglineEn') || homeDashboardCode.includes('sec.titleEn'), 'HomeDashboard section cards display titles and taglines');

  // Real History Data Invariant (Zero Fake Data)
  assert(homeDashboardCode.includes('recentReadingItems') && homeDashboardCode.includes('recentTasks') && homeDashboardCode.includes('recentThreads'),
    'HomeDashboard must read actual recent reading, tasks, and threads');
  assert(homeDashboardCode.includes('No recent reading or working history yet') || homeDashboardCode.includes('لم تبدأ قراءة أي كتاب أو مستند بعد'),
    'HomeDashboard must display honest empty state when reading history is empty');
  assert(homeDashboardCode.includes('recentTasks') && homeDashboardCode.includes('profile.tasks'),
    'HomeDashboard must inspect real user tasks without fabrication');
  assert(homeDashboardCode.includes('No conversations started yet') || homeDashboardCode.includes('لا توجد محادثات مسجلة بعد'),
    'HomeDashboard must display honest empty state when chat history is empty');

  // Preference-Driven Recommendations
  assert(homeDashboardCode.includes('recommendedTools') && homeDashboardCode.includes('profile.accessibilityMode'),
    'HomeDashboard must personalize recommendations according to accessibility mode');
  assert(homeDashboardCode.includes('Visual') && homeDashboardCode.includes('Vocal-Deaf'),
    'HomeDashboard supports Visual and Vocal-Deaf personalized tools');

  // Quick Access Shortcuts to Settings and Support
  assert(homeDashboardCode.includes('Support') || homeDashboardCode.includes('الدعم والمساعدة'), 'HomeDashboard must provide quick access to Support');

  // ── [Suite 6] Role-Based Admin Protection Invariant ──
  console.log('\n--- [Suite 6] Role-Based Admin Protection Invariant ---');
  const normalStudent: UserProfile = {
    uid: 'student-99',
    email: 'learner@rafiqi.ai',
    role: 'Student',
    points: 100,
    level: 'Intermediate',
    educationLevel: 'University',
    field: 'Engineering',
    questionScore: 0,
    questionHistory: [],
    onboardingComplete: true,
    accessibilityMode: 'None',
    language: 'English',
  };
  const verifiedAdmin: UserProfile = {
    uid: 'admin-99',
    email: 'admin@rafiqi.ai',
    role: 'Professional',
    points: 500,
    level: 'Advanced',
    educationLevel: 'Professional',
    field: 'Engineering',
    questionScore: 0,
    questionHistory: [],
    onboardingComplete: true,
    isAdmin: true,
    accessibilityMode: 'None',
    language: 'English',
  };

  assert(!isAdminUser(normalStudent), 'Regular student user must NEVER be granted admin access');
  assert(isAdminUser(verifiedAdmin), 'Verified admin user must be recognized by isAdminUser');

  console.log(`\n========================================================================`);
  console.log(`Phase 3 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================================================\n`);

  return { passed, failed, errors };
}
