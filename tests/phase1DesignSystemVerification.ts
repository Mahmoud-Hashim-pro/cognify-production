/**
 * Rafiqi — Phase 1: Design Tokens, Typography & Brand Foundations Verification Suite
 *
 * Verifies:
 * 1. Brand identity, name resolution, and approved taglines (English & Arabic)
 * 2. Unified Rafiqi Blue color palette anchors and semantic status colors
 * 3. Mathematical WCAG 2.2 AA / AAA contrast ratios across light and dark surfaces
 * 4. Typography tokens, font families (Arabic & English), and RTL ligature protections
 * 5. Corner radii, balanced density scales, and touch target parameters (>= 48px)
 * 6. High-visibility focus indicators and restrained futuristic AI glow tokens
 */

import {
  BRAND_CONFIG,
  getBrandName,
  getBrandTagline,
} from '../src/config/brand';
import {
  RAFIQI_COLORS,
  RAFIQI_TYPOGRAPHY,
  RAFIQI_RADII,
  RAFIQI_GLOWS,
  RAFIQI_DENSITY,
  RAFIQI_SPACING,
  RAFIQI_ELEVATION,
  RAFIQI_SHADOWS,
  RAFIQI_ICON_SIZING,
  RAFIQI_MOTION,
  RAFIQI_TEXT_HIERARCHY,
  RAFIQI_ACTIONS,
  RAFIQI_SEMANTIC_TOKENS,
  getContrastRatio,
  getRelativeLuminance,
} from '../src/config/theme';
import * as UI from '../src/components/ui';

export async function runPhase1DesignSystemVerification(): Promise<{
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
  console.log('--- Rafiqi Redesign Phase 1: Design System & Token Foundation ---');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // SECTION 1: Brand Identity & Message Alignment
  // -------------------------------------------------------------------------
  console.log('--- [Section 1] Brand Identity & Taglines ---');
  assert(BRAND_CONFIG.nameEn === 'Rafiqi', 'English brand name is "Rafiqi"');
  assert(BRAND_CONFIG.nameAr === 'رفيقي', 'Arabic brand name is "رفيقي"');
  assert(BRAND_CONFIG.appNameEn === 'Rafiqi AI', 'App name English is "Rafiqi AI"');
  assert(BRAND_CONFIG.appNameAr === 'رفيقي AI', 'App name Arabic is "رفيقي AI"');
  assert(
    BRAND_CONFIG.taglineEn === 'Your Everyday Accessibility Companion',
    'Approved English Tagline matches "Your Everyday Accessibility Companion"'
  );
  assert(
    BRAND_CONFIG.taglineAr === 'رفيقك في الحياة، والتعلم، والعمل.',
    'Approved Arabic Tagline matches "رفيقك في الحياة، والتعلم، والعمل."'
  );

  assert(getBrandName('Arabic') === 'رفيقي', 'getBrandName resolves "رفيقي" for Arabic');
  assert(getBrandName('English') === 'Rafiqi', 'getBrandName resolves "Rafiqi" for English');
  assert(getBrandTagline('Arabic').includes('رفيقك في الحياة'), 'getBrandTagline returns approved Arabic brand message');
  assert(getBrandTagline('English').includes('Accessibility Companion'), 'getBrandTagline returns approved English tagline');

  // -------------------------------------------------------------------------
  // SECTION 2: Unified Rafiqi Blue Palette Anchors
  // -------------------------------------------------------------------------
  console.log('\n--- [Section 2] Unified Rafiqi Blue Color Anchors ---');
  assert(RAFIQI_COLORS.primary === '#1769AA', 'Primary Brand Blue is #1769AA');
  assert(RAFIQI_COLORS.primaryDark === '#0D4778', 'Primary Dark Blue is #0D4778');
  assert(RAFIQI_COLORS.primaryLight === '#EAF4FC', 'Primary Light Ice Blue is #EAF4FC');
  assert(RAFIQI_COLORS.primaryMuted === '#4B9FE1', 'Primary Muted Accent is #4B9FE1');
  assert(RAFIQI_COLORS.appBackgroundLight === '#F5F9FD', 'Light Canvas Background is #F5F9FD');
  assert(RAFIQI_COLORS.appBackgroundDark === '#0B131E', 'Dark Canvas Background is #0B131E');
  assert(RAFIQI_COLORS.surfaceDark === '#131E2E', 'Dark Surface is #131E2E');
  assert(RAFIQI_COLORS.surfaceDarkElevated === '#1A283D', 'Dark Elevated Surface is #1A283D');
  assert(RAFIQI_COLORS.borderDark === '#22354E', 'Dark Border is #22354E');
  assert(RAFIQI_COLORS.success === '#16845B', 'Accessible Success Green is #16845B');
  assert(RAFIQI_COLORS.warning === '#C17A16', 'Accessible Warning Amber is #C17A16');
  assert(RAFIQI_COLORS.error === '#C43D4D', 'Accessible Error Crimson is #C43D4D');
  assert(RAFIQI_COLORS.focusGold === '#F59E0B', 'Universal Focus Gold is #F59E0B');

  // -------------------------------------------------------------------------
  // SECTION 3: Mathematical WCAG 2.2 AA / AAA Contrast Audits
  // -------------------------------------------------------------------------
  console.log('\n--- [Section 3] Mathematical WCAG 2.2 Contrast Verification ---');

  // Primary Blue on White
  const primaryOnWhite = getContrastRatio(RAFIQI_COLORS.primary, '#FFFFFF');
  assert(primaryOnWhite >= 4.5, `Primary #1769AA on White has contrast ratio ${primaryOnWhite}:1 (>= 4.5:1 WCAG AA)`);

  // Primary Dark on White
  const darkOnWhite = getContrastRatio(RAFIQI_COLORS.primaryDark, '#FFFFFF');
  assert(darkOnWhite >= 7.0, `Primary Dark #0D4778 on White has contrast ratio ${darkOnWhite}:1 (>= 7.0:1 WCAG AAA)`);

  // Primary Dark on Primary Light
  const darkOnLight = getContrastRatio(RAFIQI_COLORS.primaryDark, RAFIQI_COLORS.primaryLight);
  assert(darkOnLight >= 7.0, `Primary Dark on Primary Light has contrast ratio ${darkOnLight}:1 (>= 7.0:1 WCAG AAA)`);

  // Primary Muted Accent on Dark Canvas
  const mutedOnDark = getContrastRatio(RAFIQI_COLORS.primaryMuted, RAFIQI_COLORS.appBackgroundDark);
  assert(mutedOnDark >= 4.5, `Primary Muted on Dark Canvas has contrast ratio ${mutedOnDark}:1 (>= 4.5:1 WCAG AA)`);

  // Primary Text on Light Background
  const textLightRatio = getContrastRatio(RAFIQI_COLORS.textLightPrimary, RAFIQI_COLORS.appBackgroundLight);
  assert(textLightRatio >= 7.0, `Primary Text on Light Canvas has contrast ratio ${textLightRatio}:1 (>= 7.0:1 WCAG AAA)`);

  // Primary Text on Dark Background
  const textDarkRatio = getContrastRatio(RAFIQI_COLORS.textDarkPrimary, RAFIQI_COLORS.appBackgroundDark);
  assert(textDarkRatio >= 7.0, `Primary Text on Dark Canvas has contrast ratio ${textDarkRatio}:1 (>= 7.0:1 WCAG AAA)`);

  // Success Green on White
  const successOnWhite = getContrastRatio(RAFIQI_COLORS.success, '#FFFFFF');
  assert(successOnWhite >= 4.5, `Success #16845B on White has contrast ratio ${successOnWhite}:1 (>= 4.5:1 WCAG AA)`);

  // Error Crimson on White
  const errorOnWhite = getContrastRatio(RAFIQI_COLORS.error, '#FFFFFF');
  assert(errorOnWhite >= 4.5, `Error #C43D4D on White has contrast ratio ${errorOnWhite}:1 (>= 4.5:1 WCAG AA)`);

  // Warning Text on White
  const warningTextOnWhite = getContrastRatio(RAFIQI_COLORS.warningText, '#FFFFFF');
  assert(warningTextOnWhite >= 4.5, `Warning Text #9A5B0B on White has contrast ratio ${warningTextOnWhite}:1 (>= 4.5:1 WCAG AA)`);

  // -------------------------------------------------------------------------
  // SECTION 4: Typography Tokens & Font Hierarchy
  // -------------------------------------------------------------------------
  console.log('\n--- [Section 4] Typography Tokens & Font Hierarchy ---');
  assert(RAFIQI_TYPOGRAPHY.fontFamilies.sans.includes('Inter'), 'Sans font includes "Inter"');
  assert(RAFIQI_TYPOGRAPHY.fontFamilies.sans.includes('IBM Plex Sans Arabic'), 'Sans font includes "IBM Plex Sans Arabic"');
  assert(RAFIQI_TYPOGRAPHY.fontFamilies.arabic.includes('Tajawal'), 'Arabic font includes "Tajawal"');
  assert(RAFIQI_TYPOGRAPHY.fontSizeScale.xs === '12px', 'Accessible minimum font size scale is 12px (no sub-12px microtext)');
  assert(Number(RAFIQI_TYPOGRAPHY.lineHeights.arabicBody) >= 1.6, 'Arabic body line height is >= 1.6 for vertical diacritic clarity');
  assert(Number(RAFIQI_TYPOGRAPHY.lineHeights.arabicHeading) >= 1.5, 'Arabic heading line height is >= 1.5');

  // -------------------------------------------------------------------------
  // SECTION 5: Corner Radii, Density & Touch Target Parameters
  // -------------------------------------------------------------------------
  console.log('\n--- [Section 5] Radii, Density & Touch Targets ---');
  assert(RAFIQI_RADII.md === '0.75rem', 'Medium radius token is 0.75rem (12px)');
  assert(RAFIQI_RADII.lg === '1rem', 'Large radius token is 1rem (16px)');
  assert(RAFIQI_RADII['2xl'] === '1.5rem', '2XL radius token is 1.5rem (24px)');

  assert(RAFIQI_DENSITY.defaultDensity === 'balanced', 'Default density is "balanced"');
  assert(RAFIQI_DENSITY.scales.balanced.touchTargetMinPx === 48, 'Balanced density enforces 48px minimum touch target');
  assert(RAFIQI_DENSITY.scales.compact.touchTargetMinPx === 44, 'Compact density enforces 44px minimum touch target');
  assert(RAFIQI_DENSITY.scales.spacious.touchTargetMinPx === 56, 'Spacious density enforces 56px touch target');

  // -------------------------------------------------------------------------
  // SECTION 6: Restrained Futuristic AI Glow & Elevation
  // -------------------------------------------------------------------------
  console.log('\n--- [Section 6] Restrained Futuristic AI Glow Tokens ---');
  assert(RAFIQI_GLOWS.primary.includes('rgba(23, 105, 170'), 'Primary glow is rooted in Rafiqi Blue #1769AA');
  assert(RAFIQI_GLOWS.accent.includes('rgba(75, 159, 225'), 'Accent glow is rooted in medium blue #4B9FE1');
  assert(RAFIQI_GLOWS.subtle.includes('0.15'), 'Subtle glow maintains low opacity to prevent excessive brightness');

  // -------------------------------------------------------------------------
  // SECTION 7: Spacing, Elevation, Shadows & Motion Tokens
  // -------------------------------------------------------------------------
  console.log('\n--- [Section 7] Spacing, Elevation, Shadows & Motion ---');
  assert(RAFIQI_SPACING.base === '1rem', 'Base spacing token is 1rem (16px)');
  assert(RAFIQI_SPACING['4xl'] === '3rem', '4XL spacing token is 3rem (48px)');
  assert(Boolean(RAFIQI_ELEVATION.md && RAFIQI_ELEVATION.lg), 'Elevation scale defines md and lg shadows');
  assert(Boolean(RAFIQI_SHADOWS.light.card && RAFIQI_SHADOWS.dark.card), 'Light and Dark card shadows are defined');
  assert(RAFIQI_ICON_SIZING.md === 20, 'Default icon sizing token md is 20px');
  assert(RAFIQI_ICON_SIZING.lg === 24, 'Large icon sizing token lg is 24px');
  assert(RAFIQI_MOTION.durations.fast === 150, 'Fast motion duration is 150ms for buttons and micro-interactions');
  assert(RAFIQI_MOTION.durations.normal === 250, 'Normal motion duration is 250ms for dialogs and modals');
  assert(Boolean(RAFIQI_MOTION.easings.standard), 'Standard cubic-bezier easing curve is defined');

  // -------------------------------------------------------------------------
  // SECTION 8: Text Hierarchy & Typographic Scale
  // -------------------------------------------------------------------------
  console.log('\n--- [Section 8] Text Hierarchy & Typographic Scale ---');
  assert(RAFIQI_TEXT_HIERARCHY.display.fontSize === '2.25rem', 'Display font size is 2.25rem (36px)');
  assert(RAFIQI_TEXT_HIERARCHY.heading1.fontSize === '1.875rem', 'Heading1 font size is 1.875rem (30px)');
  assert(RAFIQI_TEXT_HIERARCHY.heading2.fontSize === '1.5rem', 'Heading2 font size is 1.5rem (24px)');
  assert(RAFIQI_TEXT_HIERARCHY.body.fontSize === '1rem', 'Body font size is 1rem (16px)');
  assert(RAFIQI_TEXT_HIERARCHY.small.fontSize === '0.875rem', 'Small text font size is 0.875rem (14px)');
  assert(RAFIQI_TEXT_HIERARCHY.label.fontSize === '0.75rem', 'Label font size is 0.75rem (12px)');
  assert(RAFIQI_TEXT_HIERARCHY.numeric.fontVariantNumeric === 'tabular-nums', 'Numeric text uses tabular-nums for vertical alignment');

  // -------------------------------------------------------------------------
  // SECTION 9: Light & Dark Semantic Tokens & Action Variants
  // -------------------------------------------------------------------------
  console.log('\n--- [Section 9] Light & Dark Semantic Tokens & Action Variants ---');
  assert(RAFIQI_SEMANTIC_TOKENS.light.canvas === '#F5F9FD', 'Light semantic canvas token is #F5F9FD');
  assert(RAFIQI_SEMANTIC_TOKENS.dark.canvas === '#0B131E', 'Dark semantic canvas token is #0B131E');
  assert(RAFIQI_SEMANTIC_TOKENS.dark.surface === '#131E2E', 'Dark semantic surface token is #131E2E');
  assert(RAFIQI_SEMANTIC_TOKENS.dark.surfaceElevated === '#1A283D', 'Dark semantic elevated surface token is #1A283D');
  assert(RAFIQI_ACTIONS.primary.light.bg === '#1769AA', 'Primary action light background is #1769AA');
  assert(RAFIQI_ACTIONS.primary.dark.bg === '#1769AA', 'Primary action dark background is #1769AA');
  assert(RAFIQI_ACTIONS.destructive.light.bg === '#C43D4D', 'Destructive action background is #C43D4D');
  assert(RAFIQI_ACTIONS.secondary.light.focusRing === '#1769AA', 'Secondary action light focus ring is #1769AA');

  // -------------------------------------------------------------------------
  // SECTION 10: Reusable UI Component Suite Verification
  // -------------------------------------------------------------------------
  console.log('\n--- [Section 10] Reusable UI Component Suite Verification ---');
  const requiredComponents = [
    'Button',
    'IconButton',
    'Input',
    'Textarea',
    'Select',
    'Checkbox',
    'Radio',
    'RadioGroup',
    'Toggle',
    'Card',
    'CardHeader',
    'CardTitle',
    'CardContent',
    'CardFooter',
    'Badge',
    'Alert',
    'Dialog',
    'Drawer',
    'Tooltip',
    'Breadcrumbs',
    'Tabs',
    'TabPanel',
    'Dropdown',
    'Progress',
    'Skeleton',
    'LoadingSpinner',
    'EmptyState',
    'ErrorState',
    'ThemeSelector',
    'toast',
  ];

  requiredComponents.forEach((compName) => {
    assert(Boolean((UI as any)[compName]), `Component UI.${compName} is exported and available`);
  });

  console.log('\n================================================================');
  console.log(`Phase 1 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  return { passed, failed, errors };
}

if (process.argv[1]?.includes('phase1DesignSystemVerification.ts')) {
  runPhase1DesignSystemVerification().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
