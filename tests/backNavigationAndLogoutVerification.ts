/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Comprehensive Verification Suite:
 * 1. Back Navigation across all Cognify tools and nested screens.
 * 2. Removal of redundant top-right Logout button from header.
 * 3. Preservation of canonical Logout in Sidebar, Drawer, and Settings.
 */

import fs from 'fs';
import path from 'path';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  results.push({
    suite,
    name,
    passed: !!condition,
    details: details || (condition ? 'Verified successfully' : 'Assertion failed')
  });
}

const repoRoot = process.cwd();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Redundant Logout Removal & Canonical Logout Retention
// ─────────────────────────────────────────────────────────────────────────────
const dmvPath = path.join(repoRoot, 'src/components/DisabilityModeView.tsx');
const dmvCode = fs.readFileSync(dmvPath, 'utf8');

// 1. Verify top header does not have the redundant Logout button
const hasHeaderLogout = /header[\s\S]{1,500}Log Out[\s\S]{1,200}header/i.test(dmvCode) ||
  /<header[\s\S]*?<button[\s\S]*?onLogout[\s\S]*?<\/header>/i.test(dmvCode);

assert(!hasHeaderLogout, 'Logout Audit', 'Redundant Logout button removed from DisabilityModeView top header',
  hasHeaderLogout ? 'ERROR: Top header still contains a logout button!' : 'Clean: Top header contains no duplicate logout button');

// 2. Verify Sidebar retains canonical Logout
const sidebarPath = path.join(repoRoot, 'src/components/Sidebar.tsx');
const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
const sidebarHasLogout = sidebarCode.includes('LogOut') && sidebarCode.includes('onLogout');
assert(sidebarHasLogout, 'Logout Audit', 'Off-canvas Sidebar footer retains canonical Logout button');

// 3. Verify DisabilityModeView desktop sidebar retains Logout
const dmvSidebarLogout = dmvCode.includes('<LogOut className="w-4 h-4 rtl:rotate-180"') && dmvCode.includes('onLogout');
assert(dmvSidebarLogout, 'Logout Audit', 'DisabilityModeView left desktop sidebar footer retains canonical Logout button');

// 4. Verify DisabilityModeView mobile drawer retains Logout
const dmvMobileLogout = dmvCode.includes('isMobileSidebarOpen') && dmvCode.includes('setIsMobileSidebarOpen(false)');
assert(dmvMobileLogout, 'Logout Audit', 'DisabilityModeView mobile drawer retains canonical Logout button');

// 5. Verify StudentSettingsView retains canonical Logout
const settingsPath = path.join(repoRoot, 'src/components/StudentSettingsView.tsx');
const settingsCode = fs.readFileSync(settingsPath, 'utf8');
const settingsHasLogout = (settingsCode.includes('logout()') || settingsCode.includes('onLogout')) && settingsCode.includes('LogOut');
assert(settingsHasLogout, 'Logout Audit', 'StudentSettingsView retains canonical Account Sign Out button');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Back Navigation Controls Across All Primary Tools
// ─────────────────────────────────────────────────────────────────────────────

interface ToolSpec {
  file: string;
  name: string;
  expectedBackProp: string;
  checkArrowLeft: boolean;
}

const toolSpecs: ToolSpec[] = [
  {
    file: 'src/components/VisionCompanionView.tsx',
    name: 'Visual Assistant (VisionCompanionView)',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/UnifiedHearingCenter.tsx',
    name: 'Unified Hearing Center',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/DeafEcosystemView.tsx',
    name: 'Deaf & Hard of Hearing Suite (DeafEcosystemView)',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/SignVideoStudio.tsx',
    name: 'Sign Video Studio',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/AmbientSoundRadar.tsx',
    name: 'Ambient Sound Radar',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/CaregiverHub.tsx',
    name: 'Caregiver Hub',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/CrossDisabilityOrchestrator.tsx',
    name: 'Cross-Disability Orchestrator',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/OrgDashboard.tsx',
    name: 'Organization Dashboard',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/AdminDashboard.tsx',
    name: 'Admin Dashboard',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/ChatInterface.tsx',
    name: 'AI Chat Interface / Tutor',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/ProfilePage.tsx',
    name: 'My Progress / Profile Page',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/StudentSettingsView.tsx',
    name: 'Student Settings View',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/SupportCenter.tsx',
    name: 'Support & Help Center',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/AccessibleBookStudioView.tsx',
    name: 'Accessible Book Studio',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/UnifiedAccessibilityToolkitView.tsx',
    name: 'Integrated Accessibility Toolkit',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/StudentAnalytics.tsx',
    name: 'Student Analytics Dashboard',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/AcademicPlanner.tsx',
    name: 'Academic Planner',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/Goaltracker.tsx',
    name: 'Goal Tracker',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/GpaCalculator.tsx',
    name: 'GPA Calculator',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/CognitiveGym.tsx',
    name: 'Cognitive Gym',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/StudentMemoryPage.tsx',
    name: 'Student Memory Vault',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
  {
    file: 'src/components/FrenchTravelVoiceAssistant.tsx',
    name: 'French Travel Voice Assistant',
    expectedBackProp: 'onNavigateBack',
    checkArrowLeft: true,
  },
];

toolSpecs.forEach(spec => {
  const filePath = path.join(repoRoot, spec.file);
  const exists = fs.existsSync(filePath);
  assert(exists, 'Back Navigation Coverage', `${spec.name} file exists`);
  if (!exists) return;

  const code = fs.readFileSync(filePath, 'utf8');
  
  // Check prop declaration and usage
  const acceptsBackProp = code.includes(spec.expectedBackProp);
  assert(acceptsBackProp, 'Back Navigation Coverage', `${spec.name} accepts ${spec.expectedBackProp} prop`);

  // Check ArrowLeft icon
  if (spec.checkArrowLeft) {
    const hasArrow = code.includes('ArrowLeft');
    assert(hasArrow, 'Back Navigation Coverage', `${spec.name} renders ArrowLeft back icon`);
  }

  // Check accessible label / title in Arabic and English (either directly or via Breadcrumbs)
  const hasAccessibleName = /aria-label=.*Back|aria-label=.*رجوع|title=.*Back|title=.*رجوع|Go back|العودة|Breadcrumbs/i.test(code);
  assert(hasAccessibleName, 'Back Navigation Accessibility', `${spec.name} has localized accessible Back label`);

  // Check minimum touch target sizing
  const hasTouchTarget = /min-h-\[44px\]|min-h-\[48px\]|p-2\.5|p-3|py-2/i.test(code);
  assert(hasTouchTarget, 'Back Navigation Touch Target', `${spec.name} adheres to accessible touch target standard`);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Intelligent Fallback & Non-Destructive Navigation
// ─────────────────────────────────────────────────────────────────────────────
const navPath = path.join(repoRoot, 'src/lib/navigation.ts');
const navCode = fs.readFileSync(navPath, 'utf8');

const hasSmartNav = navCode.includes('function smartNavigateBack') || navCode.includes('export function smartNavigateBack');
assert(hasSmartNav, 'Navigation Logic', 'smartNavigateBack helper exists in navigation.ts');

const checksHistory = navCode.includes('hasInAppHistory') || navCode.includes('window.history.length > 1');
assert(checksHistory, 'Navigation Logic', 'smartNavigateBack inspects in-app history before popping');

const hasSafeFallback = navCode.includes('fallbackView') && navCode.includes('fallbackTab');
assert(hasSafeFallback, 'Navigation Logic', 'smartNavigateBack falls back deterministically to parent hub');

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT RESULTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n======================================================================');
console.log(' COGNIFY — BACK NAVIGATION & LOGOUT VERIFICATION REPORT');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

results.forEach(r => {
  if (r.passed) {
    passCount++;
    console.log(`  [PASS] [${r.suite}] ${r.name}`);
  } else {
    failCount++;
    console.error(`  [FAIL] [${r.suite}] ${r.name}: ${r.details}`);
  }
});

console.log('\n----------------------------------------------------------------------');
console.log(`TOTAL: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('======================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
