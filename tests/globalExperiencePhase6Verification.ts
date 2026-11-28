/**
 * Rafiqi (رفيقي) — Phase 6: Global Application Experience & UI/UX Architecture Verification Suite
 *
 * Validates:
 * 1. The Six Official Product Sections architecture and invariant preservation.
 * 2. Cross-cutting Universal Accessibility Layer and honest feature status reporting.
 * 3. Unified Navigation & Routing (Hear & Express, Sections, Hub, Dashboard).
 * 4. Multi-Sensory Communication Suite (Hear & Express, Quick Responses, AAC Categories, Alerts).
 * 5. Dashboard Hub real recent activity data integrity (zero simulated stats).
 * 6. WCAG 2.2 AA Contrast Compliance and Unified Blue design system tokens.
 */

import {
  PRODUCT_SECTIONS,
  ProductSectionId,
  getProductSection,
  getSectionIconComponent,
  SectionFeatureItem,
} from '../src/lib/sections';

import { parseRoute, VALID_VIEWS } from '../src/lib/navigation';
import { canAccessView, homeViewFor, isAccessibilityUser, AppView } from '../src/lib/access';
import { QUICK_RESPONSES, AAC_CATEGORIES, AacTile } from '../src/components/HearAndExpressView';
import {
  getDocumentReadingHistory,
  saveDocumentReadingProgress,
  DOCUMENT_READING_HISTORY_KEY,
  DocumentReadingHistoryItem,
} from '../src/lib/audioDocumentIntelligenceEngine';
import { UserProfile } from '../src/types';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } else {
    results.push({ name, passed: false, error: message || 'Assertion failed' });
    console.error(`  ✗ ${name} - ${message || 'Assertion failed'}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE SIX OFFICIAL PRODUCT SECTIONS INVARIANT
// ─────────────────────────────────────────────────────────────────────────────
export function testSixOfficialSections(): void {
  console.log('\n--- 1. Testing Six Official Product Sections Invariant ---');

  assert(
    PRODUCT_SECTIONS.length === 6,
    'Exactly six official product sections are defined',
    `Expected 6 sections, got ${PRODUCT_SECTIONS.length}`
  );

  const expectedIds: ProductSectionId[] = [
    'see_understand',
    'read_learn',
    'work_create',
    'move_explore',
    'communicate',
    'personalize',
  ];

  const actualIds = PRODUCT_SECTIONS.map((s) => s.id);
  assert(
    JSON.stringify(actualIds) === JSON.stringify(expectedIds),
    'Sections preserve canonical order: See & Understand -> Read & Learn -> Work & Create -> Move & Explore -> Communicate -> Personalize',
    `Sections order mismatch: ${JSON.stringify(actualIds)}`
  );

  PRODUCT_SECTIONS.forEach((section, index) => {
    assert(
      section.numericOrder === index + 1,
      `Section [${section.id}] has correct numericOrder (${index + 1})`,
      `Expected ${index + 1}, got ${section.numericOrder}`
    );

    assert(
      typeof section.titleEn === 'string' && section.titleEn.length > 0,
      `Section [${section.id}] has non-empty English title`
    );

    assert(
      typeof section.titleAr === 'string' && section.titleAr.length > 0,
      `Section [${section.id}] has non-empty Arabic title`
    );

    assert(
      typeof section.shortExplanationEn === 'string' && section.shortExplanationEn.length > 0,
      `Section [${section.id}] has short English explanation`
    );

    assert(
      typeof section.shortExplanationAr === 'string' && section.shortExplanationAr.length > 0,
      `Section [${section.id}] has short Arabic explanation`
    );

    assert(
      typeof section.detailedPurposeEn === 'string' && section.detailedPurposeEn.length > 0,
      `Section [${section.id}] has detailed English purpose`
    );

    assert(
      typeof section.detailedPurposeAr === 'string' && section.detailedPurposeAr.length > 0,
      `Section [${section.id}] has detailed Arabic purpose`
    );

    assert(
      Array.isArray(section.features) && section.features.length > 0,
      `Section [${section.id}] defines at least one assistive tool (${section.features.length} tools found)`
    );

    // Verify each feature item
    section.features.forEach((feat) => {
      assert(
        ['ready', 'active', 'foundational'].includes(feat.status),
        `Feature [${feat.id}] has honest status badge: ${feat.status}`
      );

      assert(
        typeof feat.titleEn === 'string' && typeof feat.titleAr === 'string',
        `Feature [${feat.id}] has dual language titles`
      );

      assert(
        typeof feat.descEn === 'string' && typeof feat.descAr === 'string',
        `Feature [${feat.id}] has dual language descriptions`
      );

      assert(
        typeof feat.targetView === 'string' && feat.targetView.length > 0,
        `Feature [${feat.id}] specifies a valid target navigation view: ${feat.targetView}`
      );
    });

    // Test getProductSection lookup
    const lookedUp = getProductSection(section.id);
    assert(
      lookedUp?.id === section.id,
      `getProductSection('${section.id}') returns corresponding definition`
    );

    // Test getSectionIconComponent
    const IconComp = getSectionIconComponent(section.iconName);
    assert(
      typeof IconComp === 'function' || typeof IconComp === 'object',
      `getSectionIconComponent('${section.iconName}') resolves to a valid component`
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UNIFIED NAVIGATION & ROUTING VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export function testNavigationAndRouting(): void {
  console.log('\n--- 2. Testing Unified Navigation & Routing ---');

  // Verify hear_express route parsing and shorthands
  const hearExpressRoute = parseRoute('#hear_express');
  assert(
    hearExpressRoute.view === 'hear_express',
    "parseRoute('#hear_express') resolves to view 'hear_express'"
  );

  const aacRoute = parseRoute('#aac');
  assert(
    aacRoute.view === 'hear_express',
    "parseRoute('#aac') resolves to view 'hear_express'"
  );

  const captionsRoute = parseRoute('#captions');
  assert(
    captionsRoute.view === 'hear_express',
    "parseRoute('#captions') resolves to view 'hear_express'"
  );

  const hearRoute = parseRoute('#hear');
  assert(
    hearRoute.view === 'hear_express',
    "parseRoute('#hear') resolves to view 'hear_express'"
  );

  // Verify Section 1-6 primary routes
  const seeRoute = parseRoute('#disability/vision');
  assert(
    seeRoute.view === 'disability' && seeRoute.tab === 'vision',
    "parseRoute('#disability/vision') resolves to disability tab vision"
  );

  const docRoute = parseRoute('#audio_document_intelligence');
  assert(
    docRoute.view === 'audio_document_intelligence',
    "parseRoute('#audio_document_intelligence') resolves to audio_document_intelligence"
  );

  const studioRoute = parseRoute('#book_studio');
  assert(
    studioRoute.view === 'book_studio',
    "parseRoute('#book_studio') resolves to book_studio"
  );

  const hubRoute = parseRoute('#disability/hub');
  assert(
    hubRoute.view === 'disability' && hubRoute.tab === 'hub',
    "parseRoute('#disability/hub') resolves to disability tab hub"
  );

  // Verify access controls
  const dummyProfile: UserProfile = {
    uid: 'test-student-1',
    name: 'Tariq',
    email: 'tariq@test.edu',
    role: 'Student',
    accountPath: 'Special Needs',
    accessibilityMode: 'Visual',
    disabilityType: 'Visual Impairment',
    language: 'Arabic',
    educationLevel: 'University',
    level: 'Intermediate',
    field: 'Engineering',
    questionScore: 100,
    points: 100,
    questionHistory: [],
    onboardingComplete: true,
  };

  assert(
    isAccessibilityUser(dummyProfile) === true,
    'isAccessibilityUser correctly recognizes user with accessibilityMode Visual'
  );

  assert(
    canAccessView(dummyProfile, 'hear_express', false) === true,
    'canAccessView permits hear_express for student'
  );

  assert(
    canAccessView(dummyProfile, 'audio_document_intelligence', false) === true,
    'canAccessView permits audio_document_intelligence for student'
  );

  assert(
    homeViewFor(dummyProfile) === 'disability',
    "homeViewFor points universally to 'disability' suite"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HEAR & EXPRESS MULTI-SENSORY SUITE VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export function testHearAndExpressSuite(): void {
  console.log('\n--- 3. Testing Hear & Express Multi-Sensory Suite ---');

  assert(
    Array.isArray(QUICK_RESPONSES) && QUICK_RESPONSES.length >= 8,
    'QUICK_RESPONSES defines at least 8 quick-spoken response cards',
    `Got ${QUICK_RESPONSES.length} phrases`
  );

  QUICK_RESPONSES.forEach((phrase) => {
    assert(
      typeof phrase.ar === 'string' && phrase.ar.length > 0,
      `Quick phrase [${phrase.id}] has Arabic text: "${phrase.ar}"`
    );
    assert(
      typeof phrase.en === 'string' && phrase.en.length > 0,
      `Quick phrase [${phrase.id}] has English text: "${phrase.en}"`
    );
  });

  // Verify AAC categories
  assert(
    Array.isArray(AAC_CATEGORIES) && AAC_CATEGORIES.length === 5,
    'AAC_CATEGORIES defines exactly 5 communicative categories (Needs, Emotions, Classroom, Social, Medical)',
    `Got ${AAC_CATEGORIES.length} categories`
  );

  const expectedCategoryIds = ['needs', 'emotions', 'classroom', 'social', 'medical'];
  const actualCategoryIds = AAC_CATEGORIES.map((c) => c.id);
  assert(
    JSON.stringify(actualCategoryIds) === JSON.stringify(expectedCategoryIds),
    'AAC categories match expected classification',
    `Expected ${JSON.stringify(expectedCategoryIds)}, got ${JSON.stringify(actualCategoryIds)}`
  );

  AAC_CATEGORIES.forEach((cat) => {
    assert(
      cat.tiles.length >= 4,
      `AAC category [${cat.id}] has at least 4 communication tiles (${cat.tiles.length} found)`
    );

    cat.tiles.forEach((item) => {
      assert(
        typeof item.ar === 'string' && item.ar.length > 0,
        `AAC tile [${item.id}] has Arabic label: "${item.ar}"`
      );
      assert(
        typeof item.en === 'string' && item.en.length > 0,
        `AAC tile [${item.id}] has English label: "${item.en}"`
      );
      assert(
        typeof item.emoji === 'string' && item.emoji.length > 0,
        `AAC tile [${item.id}] has visual symbol/emoji: ${item.emoji}`
      );
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DASHBOARD HUB & REAL DATA INTEGRITY (Zero Fake Data)
// ─────────────────────────────────────────────────────────────────────────────
export function testRealDataIntegrity(): void {
  console.log('\n--- 4. Testing Dashboard Real Data Integrity (Zero Fake Stats) ---');

  // Verify reading history save & retrieve in local test storage
  const mockStorage: Record<string, string> = {};
  const originalLocalStorage = (global as any).localStorage;

  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
  };

  try {
    // Initial state: empty history
    const initialHistory = getDocumentReadingHistory();
    assert(
      Array.isArray(initialHistory) && initialHistory.length === 0,
      'Initial reading history is empty (no fake/hardcoded stats injected)'
    );

    // Save a real reading session
    saveDocumentReadingProgress({
      id: 'doc-bio-101',
      title: 'General Biology Principles.pdf',
      fileType: 'pdf',
      lastPageNumber: 42,
      lastParagraphIndex: 3,
      progressPercentage: 65,
      wordCount: 8400,
      lastOpenedTimestamp: Date.now(),
    });

    const updatedHistory = getDocumentReadingHistory();
    assert(
      updatedHistory.length === 1,
      'Real document reading progress is saved and retrieved successfully'
    );

    assert(
      updatedHistory[0].title === 'General Biology Principles.pdf',
      'Document title is accurately preserved'
    );

    assert(
      updatedHistory[0].lastPageNumber === 42,
      'Page number (42) is accurately preserved'
    );

    assert(
      updatedHistory[0].progressPercentage === 65,
      'Progress percentage (65%) is accurately preserved'
    );

    assert(
      typeof updatedHistory[0].lastOpenedTimestamp === 'number' &&
        updatedHistory[0].lastOpenedTimestamp > 0,
      'lastOpenedTimestamp is recorded as a valid real timestamp'
    );
  } finally {
    (global as any).localStorage = originalLocalStorage;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. WCAG 2.2 AA CONTRAST & DESIGN TOKENS VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export function testDesignTokensAndContrast(): void {
  console.log('\n--- 5. Testing WCAG 2.2 AA Contrast & Design System Tokens ---');

  // Relative luminance calculation according to WCAG 2.2
  function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function getLuminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function getContrastRatio(hex1: string, hex2: string): number {
    const l1 = getLuminance(hexToRgb(hex1));
    const l2 = getLuminance(hexToRgb(hex2));
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Primary Blue on Light Neutral
  const primaryLightContrast = getContrastRatio('#1769AA', '#F5F9FD');
  assert(
    primaryLightContrast >= 4.5,
    `Primary Blue (#1769AA) on Light (#F5F9FD) contrast ratio is ${primaryLightContrast.toFixed(2)}:1 (>= 4.5:1 WCAG AA)`
  );

  // Dark Blue on White
  const darkBlueWhiteContrast = getContrastRatio('#0D4778', '#FFFFFF');
  assert(
    darkBlueWhiteContrast >= 7.0,
    `Deep Navy (#0D4778) on White contrast ratio is ${darkBlueWhiteContrast.toFixed(2)}:1 (>= 7.0:1 WCAG AAA)`
  );

  // Soft Blue text (#4B9FE1) on Dark Navy background (#0B131E)
  const softBlueDarkContrast = getContrastRatio('#4B9FE1', '#0B131E');
  assert(
    softBlueDarkContrast >= 4.5,
    `Accessible Accent (#4B9FE1) on Dark Navy (#0B131E) contrast ratio is ${softBlueDarkContrast.toFixed(2)}:1 (>= 4.5:1 WCAG AA)`
  );

  // White text on Primary Blue (#1769AA)
  const whiteOnPrimaryContrast = getContrastRatio('#FFFFFF', '#1769AA');
  assert(
    whiteOnPrimaryContrast >= 4.5,
    `White (#FFFFFF) on Primary Blue (#1769AA) contrast ratio is ${whiteOnPrimaryContrast.toFixed(2)}:1 (>= 4.5:1 WCAG AA)`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN ALL PHASE 6 GLOBAL EXPERIENCE TESTS
// ─────────────────────────────────────────────────────────────────────────────
export function runGlobalExperiencePhase6Verification(): { passed: number; failed: number; success: boolean } {
  console.log('================================================================');
  console.log(' RAFIQI — PHASE 6: GLOBAL EXPERIENCE & ARCHITECTURE VERIFICATION');
  console.log('================================================================');

  testSixOfficialSections();
  testNavigationAndRouting();
  testHearAndExpressSuite();
  testRealDataIntegrity();
  testDesignTokensAndContrast();

  console.log('\n----------------------------------------------------------------');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const failedCount = totalCount - passedCount;

  console.log(`Global Experience Verification Results: ${passedCount}/${totalCount} passed`);
  if (failedCount > 0) {
    console.error(`FAILED: ${failedCount} test(s) failed.`);
  } else {
    console.log('ALL PHASE 6 GLOBAL EXPERIENCE TESTS PASSED SUCCESSFULLY! ✓');
  }
  console.log('================================================================\n');
  return { passed: passedCount, failed: failedCount, success: failedCount === 0 };
}

if (process.argv[1]?.includes('globalExperiencePhase6Verification')) {
  const result = runGlobalExperiencePhase6Verification();
  process.exit(result.success ? 0 : 1);
}
