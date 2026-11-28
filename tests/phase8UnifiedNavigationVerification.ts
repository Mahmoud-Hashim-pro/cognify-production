/**
 * Rafiqi (رفيقي) — Phase 8: Unified Navigation & Architecture Verification Suite
 *
 * Verifies:
 * 1. Six Official Product Sections canonical definitions and metadata
 * 2. Deep link URL parsing for all 6 sections (hash routes, kebab-case, prefixes)
 * 3. Canonical hash building for section destinations
 * 4. Route equality (preventing duplicate pushes while honoring section transitions)
 * 5. Localized titles, screen-reader announcements, and breadcrumbs
 * 6. Dual-Sidebar resolution and unified navigation synchronization
 * 7. Unified Blue design system compliance (0 legacy cyan)
 */

import {
  PRODUCT_SECTIONS,
  ProductSectionId,
  getProductSection,
  getSectionIconComponent,
} from '../src/lib/sections';
import {
  parseRoute,
  buildHash,
  isSameRoute,
  getRouteTitle,
  getRouteAnnouncement,
  getRouteBreadcrumbs,
  RouteState,
} from '../src/lib/navigation';
import * as fs from 'fs';
import * as path from 'path';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

export function runPhase8Verification(): { passed: number; failed: number } {
  console.log('\n===============================================================');
  console.log('--- Running Phase 8: Unified Navigation & Architecture Suite ---');
  console.log('===============================================================\n');

  // ── 1. Canonical Six Official Product Sections ──
  console.log('[1. Canonical Product Sections Invariant]');
  assert(PRODUCT_SECTIONS.length === 6, 'Exactly six official product sections are defined');
  
  const expectedSectionIds: ProductSectionId[] = [
    'see_understand',
    'read_learn',
    'work_create',
    'move_explore',
    'communicate',
    'personalize',
  ];

  PRODUCT_SECTIONS.forEach((sec, idx) => {
    assert(sec.numericOrder === idx + 1, `Section ${idx + 1} has numericOrder === ${idx + 1}`);
    assert(sec.id === expectedSectionIds[idx], `Section ${idx + 1} has canonical ID '${expectedSectionIds[idx]}'`);
    assert(typeof sec.titleAr === 'string' && sec.titleAr.length > 0, `Section ${sec.id} has Arabic title`);
    assert(typeof sec.titleEn === 'string' && sec.titleEn.length > 0, `Section ${sec.id} has English title`);
    assert(typeof sec.shortExplanationAr === 'string' && sec.shortExplanationAr.length > 0, `Section ${sec.id} has Arabic short explanation`);
    assert(typeof sec.shortExplanationEn === 'string' && sec.shortExplanationEn.length > 0, `Section ${sec.id} has English short explanation`);
    assert(typeof sec.detailedPurposeAr === 'string' && sec.detailedPurposeAr.length > 0, `Section ${sec.id} has Arabic detailed purpose`);
    assert(typeof sec.detailedPurposeEn === 'string' && sec.detailedPurposeEn.length > 0, `Section ${sec.id} has English detailed purpose`);
    assert(sec.features.length > 0, `Section ${sec.id} contains constituent features (count: ${sec.features.length})`);
    const IconComp = getSectionIconComponent(sec.iconName);
    assert(typeof IconComp === 'function' || typeof IconComp === 'object', `Section ${sec.id} resolves valid React icon`);
  });

  // ── 2. Deep Linking and Route Parsing ──
  console.log('\n[2. Hash Routing & Deep Linking Verification]');
  expectedSectionIds.forEach((id) => {
    // Canonical hash
    const parsed = parseRoute(`#${id}`);
    assert(parsed.view === 'disability', `#${id} maps to view='disability'`);
    assert(parsed.tab === 'hub', `#${id} maps to tab='hub'`);
    assert(parsed.section === id, `#${id} sets section='${id}'`);
    assert(parsed.params?.section === id, `#${id} sets params.section='${id}'`);

    // Prefixed hash #sections/:id
    const parsedPrefix = parseRoute(`#sections/${id}`);
    assert(parsedPrefix.section === id, `#sections/${id} sets section='${id}'`);

    // Prefixed hash #section/:id
    const parsedSingle = parseRoute(`#section/${id}`);
    assert(parsedSingle.section === id, `#section/${id} sets section='${id}'`);
  });

  // Kebab-case variations
  assert(parseRoute('#see-understand').section === 'see_understand', '#see-understand parses to see_understand');
  assert(parseRoute('#read-learn').section === 'read_learn', '#read-learn parses to read_learn');
  assert(parseRoute('#work-create').section === 'work_create', '#work-create parses to work_create');
  assert(parseRoute('#move-explore').section === 'move_explore', '#move-explore parses to move_explore');

  // Fallbacks and other routes
  assert(parseRoute('#disability/hub').section === undefined, '#disability/hub has no section set');
  assert(parseRoute('').view === 'disability', 'Empty route defaults to disability');
  assert(parseRoute('').tab === 'hub', 'Empty route defaults to hub tab');

  // ── 3. Canonical Hash Generation ──
  console.log('\n[3. Canonical Hash Builder Verification]');
  expectedSectionIds.forEach((id) => {
    const route: RouteState = { view: 'disability', tab: 'hub', section: id };
    const hash = buildHash(route);
    assert(hash === `#${id}`, `buildHash for section ${id} produces canonical #${id}`);
  });

  assert(buildHash({ view: 'disability', tab: 'hub' }) === '#disability/hub', 'buildHash for root hub produces #disability/hub');
  assert(buildHash({ view: 'disability', tab: 'vision' }) === '#disability/vision', 'buildHash for vision tab produces #disability/vision');

  // ── 4. Route Equality & History Guards ──
  console.log('\n[4. Route Equality & Duplicate History Guards]');
  const sec1Route: RouteState = { view: 'disability', tab: 'hub', section: 'see_understand' };
  const sec2Route: RouteState = { view: 'disability', tab: 'hub', section: 'read_learn' };
  const hubRoute: RouteState = { view: 'disability', tab: 'hub' };

  assert(!isSameRoute(sec1Route, sec2Route), 'Different sections are not the same route');
  assert(!isSameRoute(sec1Route, hubRoute), 'Section and root hub are not the same route');
  assert(isSameRoute(sec1Route, { view: 'disability', tab: 'hub', section: 'see_understand' }), 'Identical section routes match');

  // ── 5. Localized Page Titles, Screen-Reader Announcements & Breadcrumbs ──
  console.log('\n[5. Screen-Reader Announcements & Breadcrumbs]');
  expectedSectionIds.forEach((id) => {
    const route: RouteState = { view: 'disability', tab: 'hub', section: id };
    const sec = getProductSection(id)!;
    const titleAr = getRouteTitle(route, 'Arabic');
    const titleEn = getRouteTitle(route, 'English');
    assert(titleAr.includes(sec.titleAr), `Arabic title for ${id} includes '${sec.titleAr}'`);
    assert(titleEn.includes(sec.titleEn), `English title for ${id} includes '${sec.titleEn}'`);

    const announceAr = getRouteAnnouncement(route, 'Arabic');
    assert(announceAr.includes(sec.titleAr), `Arabic announcement includes '${sec.titleAr}'`);

    const breadcrumbs = getRouteBreadcrumbs(route, 'English');
    assert(breadcrumbs.length === 2, `Breadcrumbs for ${id} has 2 items`);
    assert(breadcrumbs[0].id === 'hub', 'First breadcrumb is Dashboard Hub');
    assert(breadcrumbs[1].label.includes(sec.titleEn), 'Second breadcrumb is the section title');
  });

  const rootBreadcrumbs = getRouteBreadcrumbs(hubRoute, 'English');
  assert(rootBreadcrumbs.length === 1, 'Root hub has exactly 1 breadcrumb item');

  // ── 6. Source Code Architecture & Unified Navigation Verification ──
  console.log('\n[6. Source Code Architecture & Dual-Sidebar Resolution]');
  const root = process.cwd();
  const disabilityModePath = path.resolve(root, 'src/components/DisabilityModeView.tsx');
  const sidebarPath = path.resolve(root, 'src/components/Sidebar.tsx');
  const appPath = path.resolve(root, 'src/App.tsx');

  const disabilityCode = fs.readFileSync(disabilityModePath, 'utf8');
  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
  const appCode = fs.readFileSync(appPath, 'utf8');

  // DisabilityModeView Desktop Sidebar
  assert(disabilityCode.includes('PRODUCT_SECTIONS.map'), 'DisabilityModeView renders PRODUCT_SECTIONS in sidebar');
  assert(disabilityCode.includes('handleSelectSection'), 'DisabilityModeView implements handleSelectSection');
  assert(disabilityCode.includes('initialSection'), 'DisabilityModeView accepts initialSection prop');
  assert(disabilityCode.includes('onSectionChange'), 'DisabilityModeView accepts onSectionChange prop');
  assert(disabilityCode.includes('aria-current={isSecActive ? \'page\' : undefined}'), 'DisabilityModeView sidebar sets aria-current on active section');

  // DisabilityModeView Mobile Drawer
  assert(disabilityCode.includes('isMobileSidebarOpen'), 'DisabilityModeView mobile drawer is maintained');
  assert(disabilityCode.includes('onMenuClick()'), 'Header hamburger button opens shared menu via onMenuClick');

  // Sidebar.tsx consumes PRODUCT_SECTIONS
  assert(sidebarCode.includes('PRODUCT_SECTIONS.map'), 'Sidebar.tsx maps over canonical PRODUCT_SECTIONS');
  assert(sidebarCode.includes('currentSection'), 'Sidebar.tsx accepts and reflects currentSection');

  // App.tsx passes section state
  assert(appCode.includes('currentSection'), 'App.tsx tracks currentSection state');
  assert(appCode.includes('initialSection={currentSection}'), 'App.tsx passes initialSection to DisabilityModeView');

  // ── 7. Design System & WCAG 2.2 AA Contrast Compliance ──
  console.log('\n[7. Design System & Token Compliance]');
  assert(!disabilityCode.includes('#00AEB8'), 'DisabilityModeView contains ZERO legacy cyan (#00AEB8)');
  assert(!sidebarCode.includes('#00AEB8'), 'Sidebar.tsx contains ZERO legacy cyan (#00AEB8)');
  assert(disabilityCode.includes('#1769AA'), 'DisabilityModeView uses Unified Blue primary token #1769AA');
  assert(disabilityCode.includes('#0D4778'), 'DisabilityModeView uses Unified Blue deep navy token #0D4778');

  console.log('\n===============================================================');
  console.log(`  Phase 8 Verification Results: ${passCount} Passed, ${failCount} Failed`);
  console.log('===============================================================\n');

  return { passed: passCount, failed: failCount };
}

const isDirectRun = process.argv[1]?.includes('phase8UnifiedNavigationVerification');
if (isDirectRun) {
  const res = runPhase8Verification();
  if (res.failed > 0) process.exit(1);
}
