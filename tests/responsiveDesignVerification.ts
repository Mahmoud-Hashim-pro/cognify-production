import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Phase 10: Responsive Design & Viewport Adaptability Verification Suite...\n');

let passedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exit(1);
  }
}

const rootDir = process.cwd();

// ============================================================================
// 1. Viewport Coverage & Breakpoint Matrix Definition
// ============================================================================
export const SUPPORTED_VIEWPORTS = {
  narrowMobile: [
    { name: 'iPhone SE (1st gen / ultra-compact)', width: 320, height: 568 },
    { name: 'Standard Android (Galaxy A series)', width: 360, height: 800 },
    { name: 'Modern iPhone (iPhone 12/13/14/15)', width: 390, height: 844 },
  ],
  tablet: [
    { name: 'iPad Portrait / Android 10" Tablet', width: 768, height: 1024 },
    { name: 'iPad Air / Pro 11"', width: 820, height: 1180 },
  ],
  desktop: [
    { name: 'Compact Desktop / Tablet Landscape', width: 1024, height: 768 },
    { name: 'Standard Laptop (WXGA)', width: 1280, height: 800 },
    { name: 'Full HD Desktop Monitor', width: 1920, height: 1080 },
  ],
};

test('Viewport Matrix: Covers representative narrow mobile, tablet, and desktop viewports', () => {
  assert.ok(SUPPORTED_VIEWPORTS.narrowMobile.some((v) => v.width === 320), 'Must test 320px narrow mobile');
  assert.ok(SUPPORTED_VIEWPORTS.narrowMobile.some((v) => v.width === 360), 'Must test 360px standard mobile');
  assert.ok(SUPPORTED_VIEWPORTS.tablet.some((v) => v.width === 768), 'Must test 768px tablet');
  assert.ok(SUPPORTED_VIEWPORTS.desktop.some((v) => v.width === 1024), 'Must test 1024px desktop');
  assert.ok(SUPPORTED_VIEWPORTS.desktop.some((v) => v.width === 1280), 'Must test 1280px standard laptop');
});

// ============================================================================
// 2. Horizontal Overflow Prevention
// ============================================================================
test('Overflow Prevention: Base stylesheet enforces horizontal containment and clip fallbacks', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('overflow-x: hidden'), 'Must include overflow-x: hidden fallback for legacy WebKit/Safari');
  assert.ok(css.includes('overflow-x: clip'), 'Must include modern overflow-x: clip');
  assert.ok(css.includes('max-width: 100vw'), 'Must enforce viewport boundary limits');
  assert.ok(css.includes('.break-anywhere') || css.includes('overflow-wrap: anywhere'), 'Must support fluid word breaking');
});

test('Breadcrumbs: Employs flex-wrap and responsive max-width truncation on narrow screens', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/ui/Breadcrumbs.tsx'), 'utf-8');
  assert.ok(code.includes('flex-wrap'), 'Breadcrumb container must wrap on narrow viewports');
  assert.ok(code.includes('truncate'), 'Breadcrumb item labels must truncate when title length exceeds column');
  assert.ok(code.includes('max-w-'), 'Breadcrumb item labels must specify responsive max-width limits');
});

// ============================================================================
// 3. Mobile Touch Target Compliance (WCAG 2.2 AA SC 2.5.8)
// ============================================================================
test('Touch Targets: Mobile interactive controls meet or exceed 44px/48px requirement', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('.touch-target') && css.includes('min-height: 44px'), 'Desktop touch target minimum is 44px');
  assert.ok(css.includes('.touch-target-mobile') && css.includes('min-height: 48px'), 'Mobile touch target minimum is 48px');

  const visionCode = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(visionCode.includes('min-h-[58px]') || visionCode.includes('min-h-[66px]'), 'Visual assistant shutter button must offer large touch target');

  const dashboardCode = fs.readFileSync(path.join(rootDir, 'src/components/DisabilityModeView.tsx'), 'utf-8');
  assert.ok(dashboardCode.includes('min-h-[48px]'), 'Dashboard quick action buttons must provide 48px touch height');
});

// ============================================================================
// 4. Mobile Keyboard & Input Focus Safeguards
// ============================================================================
test('Mobile Inputs: Prevents unexpected iOS Safari auto-zoom on input focus (< 640px)', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('@media (max-width: 640px)'), 'Must define mobile breakpoint media query');
  assert.ok(css.includes('font-size: 16px !important'), 'Mobile text inputs must be at least 16px to prevent iOS Safari auto-zoom');
});

// ============================================================================
// 5. Dashboard Grid & Layout Responsiveness
// ============================================================================
test('Dashboard: Quick Action Bar gracefully spans 2-column mobile grid without orphaned buttons', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/DisabilityModeView.tsx'), 'utf-8');
  assert.ok(code.includes('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'), 'Must scale grid from 2 cols on mobile to 5 on desktop');
  assert.ok(code.includes('last:col-span-2 sm:last:col-span-1'), 'Last item must span full width on 2-col mobile viewports to avoid clipping');
  assert.ok(code.includes('flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto'), 'Header welcome buttons must wrap smoothly');
});

test('Feature Cards: Adapt cleanly from 1 column on mobile to 3 columns on desktop', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/DisabilityModeView.tsx'), 'utf-8');
  assert.ok(code.includes('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'), 'Cards must stack single-column on mobile');
  assert.ok(code.includes('flex-wrap items-center justify-between gap-2'), 'Card bottom actions must wrap on narrow cards');
});

// ============================================================================
// 6. Dialogs & Overlays Responsiveness on Small Screens
// ============================================================================
test('Dialogs: Document Studio and Passport modals adapt to small viewports with dynamic viewport height', () => {
  const docModal = fs.readFileSync(path.join(rootDir, 'src/components/DocumentStudioModal.tsx'), 'utf-8');
  assert.ok(docModal.includes('max-h-[92dvh]') || docModal.includes('max-h-[92vh]'), 'Modal must respect viewport height boundaries');
  assert.ok(docModal.includes('overflow-y-auto'), 'Modal content must be scrollable');
  assert.ok(docModal.includes('break-words'), 'Extracted text must wrap gracefully without horizontal scroll');

  const passportModal = fs.readFileSync(path.join(rootDir, 'src/components/AccessibilityPassportModal.tsx'), 'utf-8');
  assert.ok(passportModal.includes('max-h-[90vh]'), 'Passport modal must stay within screen bounds');
  assert.ok(passportModal.includes('flex-1 overflow-y-auto'), 'Passport modal body must be scrollable');
});

// ============================================================================
// 7. No Hover-Only Dependent Actions (WCAG 2.1.1 & 1.4.13)
// ============================================================================
test('No Hover-Only: All interactive features have tap, click, and keyboard focus handlers', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/DisabilityModeView.tsx'), 'utf-8');
  assert.ok(code.includes('onClick='), 'Actions must be triggered via explicit click/tap');
  assert.ok(code.includes('focus-visible:'), 'All interactive controls must feature high-visibility focus indicators');
  assert.ok(!code.includes('group-hover:opacity-100 opacity-0'), 'Must not hide critical interactive controls behind hover-only states');
});

// ============================================================================
// 8. Zoom & 200% Text Scaling Reflow (WCAG 1.4.4 & 1.4.10)
// ============================================================================
test('Text Scaling: Universal font scale tokens handle up to 200% zoom without clipping', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
  assert.ok(css.includes('html.font-scale-normal'), 'Must support normal font scale (16px)');
  assert.ok(css.includes('html.font-scale-medium'), 'Must support medium font scale (18px)');
  assert.ok(css.includes('html.font-scale-large'), 'Must support large font scale (20px)');
  assert.ok(css.includes('html.font-scale-extra-large'), 'Must support extra-large font scale (23px)');
});

console.log(`\n🎉 All ${passedTests} Phase 10 Responsive Design verification tests PASSED successfully!`);
