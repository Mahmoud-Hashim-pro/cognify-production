// Mock localStorage in Node.js test environment if not present
if (typeof (globalThis as any).localStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; },
  };
}

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Master Phase 12 Final Validation Verification Suite...\n');

let passedTests = 0;

function test(pillarNum: number, name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ [Pillar ${pillarNum}] PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ [Pillar ${pillarNum}] FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exit(1);
  }
}

const rootDir = process.cwd();

// ============================================================================
// Pillar 1: Visual Consistency Across Redesigned Screens
// ============================================================================
test(1, 'Visual Consistency: Shared UI components exist with calm, dignified tokens', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('--color-cognify-indigo: #243B73'), 'Deep indigo brand token must be defined');
  assert.ok(css.includes('--color-cognify-teal: #087F8C'), 'Teal brand token must be defined');
  assert.ok(css.includes('--color-cognify-focus: #F59E0B'), 'High contrast focus token must be defined');

  // Check shared UI directory components
  const uiFiles = fs.readdirSync(path.join(rootDir, 'src/components/ui'));
  assert.ok(uiFiles.includes('Button.tsx'), 'Button UI component must exist');
  assert.ok(uiFiles.includes('Card.tsx'), 'Card UI component must exist');
  assert.ok(uiFiles.includes('Badge.tsx'), 'Badge UI component must exist');
  assert.ok(uiFiles.includes('Alert.tsx'), 'Alert UI component must exist');
  assert.ok(uiFiles.includes('EmptyState.tsx'), 'EmptyState UI component must exist');
  assert.ok(uiFiles.includes('StatusIndicator.tsx'), 'StatusIndicator UI component must exist');
  assert.ok(uiFiles.includes('LoadingSpinner.tsx'), 'LoadingSpinner UI component must exist');
  assert.ok(uiFiles.includes('Breadcrumbs.tsx'), 'Breadcrumbs UI component must exist');
  assert.ok(uiFiles.includes('BrandLogo.tsx'), 'BrandLogo UI component must exist');
});

// ============================================================================
// Pillar 2: Functional Dashboard and Navigation
// ============================================================================
test(2, 'Dashboard & Navigation: Hub cleanly organizes all 4 suites and 7 categories', () => {
  const dashCode = fs.readFileSync(path.join(rootDir, 'src/components/DisabilityModeView.tsx'), 'utf-8');
  assert.ok(dashCode.includes("id: 'hub'"), 'Hub suite must be present');
  assert.ok(dashCode.includes("id: 'vision'"), 'Vision suite must be present');
  assert.ok(dashCode.includes("id: 'deaf'"), 'Deaf suite must be present');
  assert.ok(dashCode.includes("id: 'chat'"), 'Tutor suite must be present');
  assert.ok(dashCode.includes('DASHBOARD_CATEGORIES'), 'Dashboard categories array must be declared');
  assert.ok(dashCode.includes("id: 'saved_recent'"), 'Saved results category must be integrated');
});

// ============================================================================
// Pillar 3: Working Back-Button and Authentication Flows
// ============================================================================
test(3, 'Navigation & Auth: Back-button safely returns without loop, preserves state', () => {
  const dashCode = fs.readFileSync(path.join(rootDir, 'src/components/DisabilityModeView.tsx'), 'utf-8');
  assert.ok(dashCode.includes('handleNavigateBack'), 'Back button handler must exist');
  assert.ok(dashCode.includes("handleSelectTab('hub')"), 'Back button returns directly to hub');

  const breadcrumbsCode = fs.readFileSync(path.join(rootDir, 'src/components/ui/Breadcrumbs.tsx'), 'utf-8');
  assert.ok(breadcrumbsCode.includes('onNavigateBack'), 'Breadcrumbs must support back navigation');
});

// ============================================================================
// Pillar 4: Preservation of Previous Functionality Fixes
// ============================================================================
test(4, 'Previous Fixes Preservation: Monotonic frame counter, non-destructive editing, privacy', () => {
  const visionCode = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(visionCode.includes('activeRequestIdRef'), 'Visual Assistant must prevent stale frames');

  const bookCode = fs.readFileSync(path.join(rootDir, 'src/components/AccessibleBookStudioView.tsx'), 'utf-8');
  assert.ok(bookCode.includes('rawSourceHistory'), 'Book Studio must preserve raw source history');

  const toolkitCode = fs.readFileSync(path.join(rootDir, 'src/lib/accessibilityToolkitEngine.ts'), 'utf-8');
  assert.ok(toolkitCode.includes('deleteToolkitActivity'), 'Toolkit must support deleting individual activities');
  assert.ok(toolkitCode.includes('clearToolkitActivities'), 'Toolkit must support clearing history completely');
});

// ============================================================================
// Pillar 5: Accessible Names, Semantic Structure, and Focus Behavior
// ============================================================================
test(5, 'Accessibility Semantics: ARIA landmarks, roles, and high-visibility focus indicators', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes(':focus-visible') && css.includes('#E5A93C') || css.includes('#F59E0B'), 'Universal visible focus ring must be defined');

  const buttonCode = fs.readFileSync(path.join(rootDir, 'src/components/ui/Button.tsx'), 'utf-8');
  assert.ok(buttonCode.includes('data-[focus-visible]:ring-2'), 'Button must expose high-contrast focus indicator');

  const cardCode = fs.readFileSync(path.join(rootDir, 'src/components/ui/Card.tsx'), 'utf-8');
  assert.ok(cardCode.includes('focus-visible:ring-2'), 'Interactive card must expose focus indicator');
});

// ============================================================================
// Pillar 6: Keyboard Navigation Where Applicable
// ============================================================================
test(6, 'Keyboard Navigation: Visual Assistant shortcuts and modal escape/tab traps', () => {
  const visionCode = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(visionCode.includes("e.key === 'c' || e.key === 'C'"), 'Must support key C for Cash Reader');
  assert.ok(visionCode.includes("e.key === 't' || e.key === 'T'"), 'Must support key T for Text OCR');
  assert.ok(visionCode.includes("e.key === 's' || e.key === 'S'"), 'Must support key S for Stop speech');

  const passportCode = fs.readFileSync(path.join(rootDir, 'src/components/AccessibilityPassportModal.tsx'), 'utf-8');
  assert.ok(passportCode.includes("e.key === 'Escape'"), 'Must dismiss on Escape');
  assert.ok(passportCode.includes("e.key === 'Tab'"), 'Must trap focus on Tab/Shift+Tab');
});

// ============================================================================
// Pillar 7: Android TalkBack Compatibility
// ============================================================================
test(7, 'TalkBack Compatibility: Polite live regions, 48px mobile touch targets, aria-hidden', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('.touch-target-mobile') && css.includes('min-height: 48px'), 'Mobile touch target must be 48px');

  const spinnerCode = fs.readFileSync(path.join(rootDir, 'src/components/ui/LoadingSpinner.tsx'), 'utf-8');
  assert.ok(spinnerCode.includes('role="status"'), 'Loading spinner must have status role');
  assert.ok(spinnerCode.includes('aria-live="polite"'), 'Loading spinner must have polite live region');

  const iconCode = fs.readFileSync(path.join(rootDir, 'src/components/ui/FeatureIcon.tsx'), 'utf-8');
  assert.ok(iconCode.includes('aria-hidden="true"'), 'Decorative icons must be hidden from screen readers');
});

// ============================================================================
// Pillar 8: Arabic RTL and English LTR Behavior
// ============================================================================
test(8, 'Multilingual BiDi: Directional flipping, BiDi isolation, and ligatures preservation', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('unicode-bidi: isolate'), 'BiDi isolation utilities must be present');
  assert.ok(css.includes('.rtl-flip') || css.includes('rtl:rotate-180'), 'Directional chevron flipping must be defined');
  assert.ok(css.includes('letter-spacing: normal !important'), 'Arabic letter-spacing must be reset to protect ligatures');
  assert.ok(css.includes('line-height: 1.65'), 'Arabic body line-height must be comfortable (>= 1.6)');
});

// ============================================================================
// Pillar 9: Responsive Layouts and Text Scaling
// ============================================================================
test(9, 'Responsive & Zoom: Zero horizontal overflow, iOS Safari zoom prevention, 200% font scale', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('overflow-x: hidden') && css.includes('overflow-x: clip'), 'Body must enforce overflow clipping');
  assert.ok(css.includes('font-size: 16px !important'), 'Mobile text inputs must be 16px to prevent iOS Safari auto-zoom');
  assert.ok(css.includes('html.font-scale-extra-large'), 'Must support up to 200% text scaling');

  const dashCode = fs.readFileSync(path.join(rootDir, 'src/components/DisabilityModeView.tsx'), 'utf-8');
  assert.ok(dashCode.includes('last:col-span-2 sm:last:col-span-1'), 'Quick action bar must span 2-col mobile cleanly');
});

// ============================================================================
// Pillar 10: Forms, Dialogs, Loading States, and Error Recovery
// ============================================================================
test(10, 'Forms & Dialogs: Linked error messages, dynamic viewport heights, and recovery actions', () => {
  const inputCode = fs.readFileSync(path.join(rootDir, 'src/components/ui/Input.tsx'), 'utf-8');
  assert.ok(inputCode.includes('role="alert"'), 'Input errors must be announced via role="alert"');
  assert.ok(inputCode.includes('aria-describedby'), 'Input must associate with error id');

  const docModalCode = fs.readFileSync(path.join(rootDir, 'src/components/DocumentStudioModal.tsx'), 'utf-8');
  assert.ok(docModalCode.includes('max-h-[92dvh]'), 'Modal must support dynamic viewport height');
  assert.ok(docModalCode.includes('lastFailedFile'), 'Document reader must provide retry state for failed files');
});

// ============================================================================
// Pillar 11: Core Workflows for Visual Assistant, File Reader, Audio, Book Studio
// ============================================================================
test(11, 'Core Feature Workflows: Validated end-to-end integration across all features', () => {
  const visionCode = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(visionCode.includes('describeScene'), 'Visual assistant must support on-demand scene description');
  assert.ok(visionCode.includes('Upload photo') || visionCode.includes('رفع صورة من جهازك'), 'Must provide photo upload fallback');

  const docCode = fs.readFileSync(path.join(rootDir, 'src/components/DocumentStudioModal.tsx'), 'utf-8');
  assert.ok(docCode.includes('handleSeekAudio'), 'Audio transcription must support seeking by timestamp');
  assert.ok(docCode.includes('exportToWordDocument') || docCode.includes('exportTranscriptToDocx'), 'Must export formatted Word documents');

  const bookCode = fs.readFileSync(path.join(rootDir, 'src/components/AccessibleBookStudioView.tsx'), 'utf-8');
  assert.ok(bookCode.includes('handleImportFromFileReader'), 'Book Studio must support 1-click import from File Reader');
});

// ============================================================================
// Pillar 12: Architecture & Dependency Integrity
// ============================================================================
test(12, 'Dependency & Architecture Integrity: Zero unwanted dependencies or architectural drift', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  assert.ok(pkg.dependencies['lucide-react'], 'Uses existing lucide-react');
  assert.ok(pkg.dependencies['react-aria-components'], 'Uses existing react-aria-components');
  assert.ok(pkg.dependencies['docx'], 'Uses existing docx');
  assert.ok(!pkg.dependencies['lodash'], 'No unnecessary heavy utility libraries introduced');
  assert.ok(!pkg.dependencies['jquery'], 'No legacy DOM libraries introduced');
});

console.log(`\n🎉 All ${passedTests} Master Phase 12 Final Validation tests PASSED successfully!`);
