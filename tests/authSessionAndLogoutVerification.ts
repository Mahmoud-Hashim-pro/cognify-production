/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Authentication, Session Cleanup & Canonical Logout Verification Suite
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
// 1. Redundant Top-Right Header Logout Removal
// ─────────────────────────────────────────────────────────────────────────────
const dmvPath = path.join(repoRoot, 'src/components/DisabilityModeView.tsx');
const dmvCode = fs.readFileSync(dmvPath, 'utf8');

// Ensure top header does not have the redundant Logout button
const lines = dmvCode.split('\n');
let headerStart = -1;
let headerEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('HEADER BAR: BRANDING + SUITES SELECTOR + ACTIONS')) {
    headerStart = i;
  }
  if (headerStart !== -1 && lines[i].includes('</header>')) {
    headerEnd = i;
    break;
  }
}

const headerCode = headerStart !== -1 && headerEnd !== -1 ? lines.slice(headerStart, headerEnd).join('\n') : '';
const headerHasLogout = headerCode.includes('LogOut') || headerCode.includes('onLogout') || headerCode.includes('logout()');

assert(!headerHasLogout, 'Logout Elimination', 'Top header bar does NOT contain the redundant logout button',
  headerHasLogout ? 'Failed: Top header still contains a logout button' : 'Clean: Top header contains zero logout buttons');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Canonical Logout Retention
// ─────────────────────────────────────────────────────────────────────────────
// A. Sidebar footer
const sidebarCode = fs.readFileSync(path.join(repoRoot, 'src/components/Sidebar.tsx'), 'utf8');
assert(sidebarCode.includes('LogOut') && sidebarCode.includes('onLogout'),
  'Canonical Logout', 'Off-canvas Sidebar footer retains canonical onLogout button');

// B. Desktop left sidebar
assert(dmvCode.includes('<LogOut className="w-4 h-4 rtl:rotate-180"') && dmvCode.includes('onLogout'),
  'Canonical Logout', 'DisabilityModeView desktop sidebar footer retains canonical onLogout button');

// C. Mobile slide-in drawer
assert(dmvCode.includes('isMobileSidebarOpen') && dmvCode.includes('setIsMobileSidebarOpen(false)') && dmvCode.includes('onLogout'),
  'Canonical Logout', 'DisabilityModeView mobile drawer retains canonical onLogout button');

// D. Student Settings View
const settingsCode = fs.readFileSync(path.join(repoRoot, 'src/components/StudentSettingsView.tsx'), 'utf8');
assert(settingsCode.includes('LogOut') && settingsCode.includes('logout()'),
  'Canonical Logout', 'StudentSettingsView retains canonical Account Sign Out button');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Session Cleanup & Private Data Purge
// ─────────────────────────────────────────────────────────────────────────────
const fbCode = fs.readFileSync(path.join(repoRoot, 'src/lib/firebase.ts'), 'utf8');
assert(fbCode.includes('export const logout = async () => {'),
  'Session Cleanup', 'firebase.ts exports logout async function');

assert(fbCode.includes('PER_USER_LOCAL_KEYS.forEach'),
  'Session Cleanup', 'logout purges per-user sensitive localStorage keys');

assert(fbCode.includes('sessionStorage.clear()'),
  'Session Cleanup', 'logout clears all sessionStorage');

assert(fbCode.includes('cognify_student_memory_') && fbCode.includes('cognify_spatial_v2_'),
  'Session Cleanup', 'logout purges AI student memory and spatial cache prefixes to prevent cross-user leakage');

assert(fbCode.includes('await signOut(auth)'),
  'Session Cleanup', 'logout executes Firebase Auth signOut to invalidate server session token');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Route Protection & Unauthenticated Access Gate
// ─────────────────────────────────────────────────────────────────────────────
const appCode = fs.readFileSync(path.join(repoRoot, 'src/App.tsx'), 'utf8');
assert(appCode.includes('if (!user && !isGuestPreview) {') && appCode.includes('<Login onDirectPreview='),
  'Route Protection', 'App gates all views with <Login /> when unauthenticated (!user && !isGuestPreview)');

assert(appCode.includes('handleLogout = async () => {') && appCode.includes('setProfile(null)'),
  'Session Termination', 'handleLogout sets profile to null upon sign out');

assert(appCode.includes('setIsGuestPreview(false)'),
  'Session Termination', 'handleLogout resets guest preview flag upon sign out');

assert(appCode.includes("window.location.hash = ''") && appCode.includes('window.history.replaceState'),
  'Session Termination', 'handleLogout cleanses URL hash and history state upon sign out');

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n======================================================================');
console.log(' COGNIFY — AUTHENTICATION, LOGOUT & SESSION VERIFICATION REPORT');
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
