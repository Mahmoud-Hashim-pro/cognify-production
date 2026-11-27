/**
 * Rafiqi — Phase 1: Unified Blue Design System Verification
 *
 * Verifies:
 * 1. Single source of truth token contract in src/config/theme.ts
 * 2. WCAG 2.2 AA contrast ratios for normal text, large text, and interactive controls
 * 3. Theme integration in src/index.css
 * 4. UI components and views adherence to the blue design system
 */

import {
  RAFIQI_COLORS,
  getContrastRatio,
  RAFIQI_CONTRAST_AUDIT,
} from '../src/config/theme.js';
import * as fs from 'fs';
import * as path from 'path';

export async function runUnifiedBlueThemeVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- [Phase 1: Unified Blue Design System Verification] ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Token Specifications
  assert(RAFIQI_COLORS.primary === '#1769AA', 'Primary must be #1769AA');
  assert(RAFIQI_COLORS.primaryDark === '#0D4778', 'Primary Dark must be #0D4778');
  assert(RAFIQI_COLORS.primaryLight === '#EAF4FC', 'Primary Light must be #EAF4FC');
  assert(RAFIQI_COLORS.appBackgroundLight === '#F5F9FD', 'App Background Light must be #F5F9FD');
  assert(RAFIQI_COLORS.success === '#16845B', 'Success must be #16845B');
  assert(RAFIQI_COLORS.warning === '#C17A16', 'Warning must be #C17A16');
  assert(RAFIQI_COLORS.error === '#C43D4D', 'Error must be #C43D4D');

  // 2. WCAG 2.2 AA Contrast Compliance Checks
  const ratioPrimaryOnWhite = getContrastRatio(RAFIQI_COLORS.primary, '#FFFFFF');
  assert(ratioPrimaryOnWhite >= 4.5, `Primary (#1769AA) on White contrast ratio is ${ratioPrimaryOnWhite}:1 (>= 4.5:1 AA)`);

  const ratioWhiteOnPrimary = getContrastRatio('#FFFFFF', RAFIQI_COLORS.primary);
  assert(ratioWhiteOnPrimary >= 4.5, `White text on Primary Button contrast ratio is ${ratioWhiteOnPrimary}:1 (>= 4.5:1 AA)`);

  const ratioDarkOnLight = getContrastRatio(RAFIQI_COLORS.primaryDark, RAFIQI_COLORS.primaryLight);
  assert(ratioDarkOnLight >= 7.0, `Primary Dark (#0D4778) on Primary Light (#EAF4FC) contrast ratio is ${ratioDarkOnLight}:1 (>= 7.0:1 AAA)`);

  const ratioDarkOnWhite = getContrastRatio(RAFIQI_COLORS.primaryDark, '#FFFFFF');
  assert(ratioDarkOnWhite >= 7.0, `Primary Dark (#0D4778) on White contrast ratio is ${ratioDarkOnWhite}:1 (>= 7.0:1 AAA)`);

  const ratioMediumBlueOnDark = getContrastRatio(RAFIQI_COLORS.primaryMuted, RAFIQI_COLORS.appBackgroundDark);
  assert(ratioMediumBlueOnDark >= 4.5, `Medium Blue (#4B9FE1) on Dark Canvas (#0B131E) contrast ratio is ${ratioMediumBlueOnDark}:1 (>= 4.5:1 AA)`);

  const ratioSuccessOnWhite = getContrastRatio(RAFIQI_COLORS.success, '#FFFFFF');
  assert(ratioSuccessOnWhite >= 4.5, `Success (#16845B) on White contrast ratio is ${ratioSuccessOnWhite}:1 (>= 4.5:1 AA)`);

  const ratioErrorOnWhite = getContrastRatio(RAFIQI_COLORS.error, '#FFFFFF');
  assert(ratioErrorOnWhite >= 4.5, `Error (#C43D4D) on White contrast ratio is ${ratioErrorOnWhite}:1 (>= 4.5:1 AA)`);

  const ratioWarningTextOnWhite = getContrastRatio(RAFIQI_COLORS.warningText, '#FFFFFF');
  assert(ratioWarningTextOnWhite >= 4.5, `Warning Text (#9A5B0B) on White contrast ratio is ${ratioWarningTextOnWhite}:1 (>= 4.5:1 AA)`);

  // 3. CSS Variables & Tailwind Theme Integration
  const cssPath = path.resolve(process.cwd(), 'src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  assert(cssContent.includes('--color-rafiqi-primary: #1769AA;'), 'index.css defines --color-rafiqi-primary');
  assert(cssContent.includes('--color-rafiqi-primary-dark: #0D4778;'), 'index.css defines --color-rafiqi-primary-dark');
  assert(cssContent.includes('--color-rafiqi-primary-light: #EAF4FC;'), 'index.css defines --color-rafiqi-primary-light');
  assert(cssContent.includes('--color-rafiqi-bg: #F5F9FD;'), 'index.css defines --color-rafiqi-bg');
  assert(cssContent.includes('--color-primary: #1769AA;'), 'index.css maps --color-primary to #1769AA');
  assert(cssContent.includes('--color-rafiqi-indigo: #1769AA;'), 'index.css maps legacy indigo to #1769AA');
  assert(cssContent.includes('--color-rafiqi-teal: #1769AA;'), 'index.css maps legacy teal to #1769AA');

  // 4. Shared UI Components Adherence
  const buttonPath = path.resolve(process.cwd(), 'src', 'components', 'ui', 'Button.tsx');
  const buttonContent = fs.readFileSync(buttonPath, 'utf8');
  assert(buttonContent.includes('bg-rafiqi-primary hover:bg-rafiqi-primary-dark'), 'Button.tsx uses rafiqi-primary variant styles');

  const badgePath = path.resolve(process.cwd(), 'src', 'components', 'ui', 'Badge.tsx');
  const badgeContent = fs.readFileSync(badgePath, 'utf8');
  assert(badgeContent.includes('bg-rafiqi-primary-light') && badgeContent.includes('text-rafiqi-primary-dark'), 'Badge.tsx uses primary light and dark tokens');

  const cardPath = path.resolve(process.cwd(), 'src', 'components', 'ui', 'Card.tsx');
  const cardContent = fs.readFileSync(cardPath, 'utf8');
  assert(cardContent.includes('border-rafiqi-primary'), 'Card.tsx uses border-rafiqi-primary for highlighted/interactive state');

  const brandLogoPath = path.resolve(process.cwd(), 'src', 'components', 'ui', 'BrandLogo.tsx');
  const brandLogoContent = fs.readFileSync(brandLogoPath, 'utf8');
  assert(brandLogoContent.includes('from-[#0D4778] to-[#1769AA]'), 'BrandLogo.tsx uses primary dark to primary blue gradient');

  const breadcrumbsPath = path.resolve(process.cwd(), 'src', 'components', 'ui', 'Breadcrumbs.tsx');
  const breadcrumbsContent = fs.readFileSync(breadcrumbsPath, 'utf8');
  assert(breadcrumbsContent.includes('text-rafiqi-primary-dark') && breadcrumbsContent.includes('text-rafiqi-primary-muted'), 'Breadcrumbs.tsx active breadcrumb uses rafiqi-primary tokens');

  // 5. Views Adherence
  const appPath = path.resolve(process.cwd(), 'src', 'App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(appContent.includes('bg-[#F5F9FD]'), 'App.tsx uses #F5F9FD as light background');
  assert(appContent.includes('bg-[#0B131E]'), 'App.tsx uses #0B131E as dark background');

  const sidebarPath = path.resolve(process.cwd(), 'src', 'components', 'Sidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  assert(sidebarContent.includes('bg-rafiqi-primary hover:bg-rafiqi-primary-dark') && sidebarContent.includes('text-rafiqi-primary-dark'), 'Sidebar.tsx active item and action buttons use Rafiqi blue tokens');

  const visionPath = path.resolve(process.cwd(), 'src', 'components', 'VisionCompanionView.tsx');
  const visionContent = fs.readFileSync(visionPath, 'utf8');
  assert(visionContent.includes('#1769AA') && !visionContent.includes('#00AEB8'), 'VisionCompanionView.tsx migrated legacy cyan to Rafiqi blue');

  const disabilityPath = path.resolve(process.cwd(), 'src', 'components', 'DisabilityModeView.tsx');
  const disabilityContent = fs.readFileSync(disabilityPath, 'utf8');
  assert(disabilityContent.includes('#1769AA'), 'DisabilityModeView.tsx active tabs use Rafiqi primary blue');

  console.log(`\nPhase 1 Unified Blue Design System Summary: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}

// Direct execution support
if (process.argv[1]?.endsWith('unifiedBlueThemeVerification.ts')) {
  runUnifiedBlueThemeVerification()
    .then(({ failed }) => {
      if (failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
