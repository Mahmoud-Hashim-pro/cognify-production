/**
 * Rafiqi UI Redesign — Phase 0 Architecture, Navigation & Dual-Sidebar Verification
 * 
 * Validates:
 * 1. Single source of truth for the 6 official product sections.
 * 2. Hash routing, deep linking, and navigation sync.
 * 3. Dual-sidebar defect resolution (single drawer invariant).
 * 4. Section parity across desktop and mobile.
 * 5. Admin security and utility routing accessibility.
 */

import { PRODUCT_SECTIONS, ProductSectionId, getProductSection } from '../src/lib/sections';
import { parseRoute, VALID_VIEWS } from '../src/lib/navigation';
import { isAdminUser } from '../src/lib/roles';
import { UserProfile } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export async function runUiPhase0NavigationAndAuditVerification(): Promise<{
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

  console.log('\n================================================================');
  console.log('--- Rafiqi Redesign Phase 0: Navigation & Dual-Sidebar Audit ---');
  console.log('================================================================\n');

  // ── [Section 1] Six Official Product Sections Single Source of Truth ──
  console.log('--- [Section 1] Six Official Product Sections Invariant ---');
  assert(PRODUCT_SECTIONS.length === 6, 'Exactly six official product sections must exist');
  
  const expectedOrder: ProductSectionId[] = [
    'see_understand',
    'read_learn',
    'work_create',
    'move_explore',
    'communicate',
    'personalize'
  ];

  PRODUCT_SECTIONS.forEach((sec, idx) => {
    assert(sec.id === expectedOrder[idx], `Section at index ${idx} must be "${expectedOrder[idx]}"`);
    assert(sec.numericOrder === idx + 1, `Section "${sec.id}" numericOrder must equal ${idx + 1}`);
    assert(Boolean(sec.titleEn && sec.titleAr), `Section "${sec.id}" must have both English and Arabic titles`);
    assert(Boolean(sec.shortExplanationEn && sec.shortExplanationAr), `Section "${sec.id}" must have short explanations in both languages`);
    assert(Boolean(sec.iconName), `Section "${sec.id}" must declare an iconName`);
    assert(Array.isArray(sec.features) && sec.features.length > 0, `Section "${sec.id}" must contain at least 1 feature`);
  });

  // Verify Communicate hosts Hear & Express
  const communicateSec = getProductSection('communicate');
  assert(communicateSec !== undefined, 'Communicate section must be defined');
  const hearExpressFeature = communicateSec?.features.find(f => 
    f.id.includes('hear_express') || 
    f.tagsEn.includes('Hear & Express') || 
    f.titleEn.includes('Hear & Express') ||
    f.id.includes('speech_captions') ||
    f.id.includes('aac_board')
  );
  assert(hearExpressFeature !== undefined, 'Communicate section must host Hear & Express feature group');

  // ── [Section 2] Deep Linking & Hash Routing Synchronization ──
  console.log('\n--- [Section 2] Deep Linking & URL Hash Routing ---');
  
  // Section routes
  expectedOrder.forEach(secId => {
    const parsed = parseRoute(`#${secId}`);
    assert(parsed.section === secId || parsed.view === 'disability', `Hash #${secId} should resolve correctly`);
  });

  // Shorthands and direct views
  assert(String(parseRoute('#vision').view) === 'vision' || parseRoute('#vision').tab === 'vision', '#vision parses to vision');
  assert(parseRoute('#deaf').tab === 'deaf', '#deaf parses to deaf tab');
  assert(parseRoute('#hub').tab === 'hub', '#hub parses to hub tab');
  assert(parseRoute('#settings').view === 'settings', '#settings parses to settings view');
  assert(parseRoute('#productivity').view === 'productivity', '#productivity parses to productivity view');
  assert(parseRoute('#mobility').view === 'mobility', '#mobility parses to mobility view');
  assert(parseRoute('#communicate').view === 'communication' || parseRoute('#communicate').section === 'communicate', '#communicate parses to communication');

  // ── [Section 3] Dual-Sidebar Defect Resolution Invariant ──
  console.log('\n--- [Section 3] Dual-Sidebar Defect Resolution Invariant ---');
  const projectRoot = process.cwd();
  const disabilityModePath = path.resolve(projectRoot, 'src/components/DisabilityModeView.tsx');
  const disabilityModeCode = fs.readFileSync(disabilityModePath, 'utf8');

  // 1. Mobile hamburger button must delegate to onMenuClick if provided
  const hasGuardedClick = disabilityModeCode.includes('if (onMenuClick) {') &&
    disabilityModeCode.includes('onMenuClick();') &&
    disabilityModeCode.includes('setIsMobileSidebarOpen(true);');
  assert(hasGuardedClick, 'DisabilityModeView must delegate hamburger click exclusively to onMenuClick when provided');

  // 2. Internal mobile drawer must NOT mount when onMenuClick is provided
  const hasGuardedDrawer = disabilityModeCode.includes('{!onMenuClick && (') &&
    disabilityModeCode.includes('isMobileSidebarOpen');
  assert(hasGuardedDrawer, 'DisabilityModeView must not mount internal mobile drawer when onMenuClick is supplied by App shell');

  // 3. App.tsx must supply onMenuClick
  const appPath = path.resolve(projectRoot, 'src/App.tsx');
  const appCode = fs.readFileSync(appPath, 'utf8');
  assert(appCode.includes('onMenuClick={handleOpenMobileMenu}'), 'App.tsx must pass onMenuClick handler to DisabilityModeView');
  assert(appCode.includes('<Sidebar'), 'App.tsx must mount the universal Sidebar component');

  // ── [Section 4] Desktop & Mobile Section Parity ──
  console.log('\n--- [Section 4] Desktop & Mobile Section Parity ---');
  const sidebarPath = path.resolve(projectRoot, 'src/components/Sidebar.tsx');
  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

  // Both must map PRODUCT_SECTIONS
  assert(sidebarCode.includes('PRODUCT_SECTIONS.map'), 'Sidebar.tsx must map over PRODUCT_SECTIONS');
  assert(disabilityModeCode.includes('PRODUCT_SECTIONS.map'), 'DisabilityModeView.tsx must map over PRODUCT_SECTIONS');

  // ── [Section 5] Security & Admin Protection ──
  console.log('\n--- [Section 5] Role-Based Admin Protection ---');
  const regularUser: UserProfile = {
    uid: 'student-1',
    email: 'student@example.com',
    role: 'Student',
    points: 100,
    level: 'Intermediate',
    educationLevel: 'University',
    field: 'General',
    questionScore: 0,
    questionHistory: [],
    onboardingComplete: true,
    accessibilityMode: 'None',
    language: 'English',
  };
  const adminUser: UserProfile = {
    uid: 'admin-1',
    email: 'admin@rafiqi.ai',
    role: 'Professional',
    points: 100,
    level: 'Advanced',
    educationLevel: 'Professional',
    field: 'General',
    questionScore: 0,
    questionHistory: [],
    onboardingComplete: true,
    isAdmin: true,
    accessibilityMode: 'None',
    language: 'English',
  };

  assert(!isAdminUser(regularUser), 'Regular student user must NOT be recognized as admin');
  assert(isAdminUser(adminUser), 'Admin user must be recognized as admin');

  // ── [Section 6] Component Inventory Workspace Verification ──
  console.log('\n--- [Section 6] Workspace File Verification ---');
  const requiredFiles = [
    'src/App.tsx',
    'src/components/Sidebar.tsx',
    'src/components/DisabilityModeView.tsx',
    'src/components/SectionLandingView.tsx',
    'src/components/VisionCompanionView.tsx',
    'src/components/AudioDocumentIntelligenceView.tsx',
    'src/components/AccessibleProductivityWorkspaceView.tsx',
    'src/components/AccessibleMobilityWorkspaceView.tsx',
    'src/components/AccessibleCommunicateWorkspaceView.tsx',
    'src/components/StudentSettingsView.tsx',
    'src/lib/sections.ts',
    'src/lib/navigation.ts',
    'src/config/theme.ts',
    'src/config/brand.ts',
  ];

  requiredFiles.forEach(file => {
    const fullPath = path.resolve(projectRoot, file);
    assert(fs.existsSync(fullPath), `Required core file "${file}" must exist on disk`);
  });

  console.log('\n================================================================');
  console.log(`Phase 0 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  return { passed, failed, errors };
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('uiPhase0NavigationAndAuditVerification.ts')) {
  runUiPhase0NavigationAndAuditVerification()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Phase 0 Verification Failed:', err);
      process.exit(1);
    });
}
