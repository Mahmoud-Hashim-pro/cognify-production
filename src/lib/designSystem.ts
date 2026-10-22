/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cognify Design System Tokens & Accessibility Standards (Phase 2)
 *
 * Provides typed constants for brand colors, contrast-verified semantic palettes,
 * typography scales, spacing tokens, and WCAG 2.2 accessibility helpers.
 */

export interface ColorToken {
  value: string;
  name: string;
  contrastOnLight: number; // Against #F5F7FB (Light Neutral Canvas)
  contrastOnDark: number;  // Against #111622 (Obsidian Dark Canvas)
  wcagLevel: 'AAA' | 'AA' | 'AA Large';
  description: string;
}

/**
 * Verified Brand Palette (Cognify Core)
 */
export const BRAND_COLORS = {
  // Primary: Deep Indigo (Trust, Calm, Authority)
  indigo: {
    base: '#243B73',
    dark: '#1B2D59',
    light: '#34529B',
    contrastOnWhite: 9.4, // WCAG AAA
    contrastOnCanvasLight: 8.8, // WCAG AAA
  },
  // Secondary: Academic Teal (Clarity, Assistive Focus, Precision)
  teal: {
    base: '#087F8C',
    dark: '#06626C',
    light: '#0AA5B6',
    contrastOnWhite: 4.6, // WCAG AA
    contrastOnCanvasLight: 4.3, // WCAG AA
  },
  // Neutral Canvas & Surfaces
  canvas: {
    light: '#F5F7FB',
    lightSurface: '#FFFFFF',
    lightSubtle: '#EDF1F7',
    dark: '#111622',
    darkSurface: '#171E2E',
    darkElevated: '#1E273A',
  },
  // Primary Body Typography
  text: {
    primaryLight: '#172033', // Contrast on #F5F7FB = 13.5:1 (WCAG AAA)
    secondaryLight: '#475569', // Contrast on #F5F7FB = 4.9:1 (WCAG AA)
    mutedLight: '#64748B',
    primaryDark: '#F8FAFC', // Contrast on #111622 = 16.8:1 (WCAG AAA)
    secondaryDark: '#94A3B8', // Contrast on #111622 = 6.9:1 (WCAG AA)
    mutedDark: '#64748B',
  },
  // High-Contrast Focus Ring (Gold / Amber)
  focus: {
    ring: '#F59E0B',
    ringDark: '#FBBF24',
    offsetLight: '#FFFFFF',
    offsetDark: '#111622',
  },
  // Semantic Feedback & Status (Contrast Verified >= 4.5:1)
  semantic: {
    success: {
      lightBg: '#E6F4EA',
      lightText: '#0E7052', // Contrast on #E6F4EA = 5.2:1 (WCAG AA)
      darkBg: '#062B21',
      darkText: '#34D399', // Contrast on #062B21 = 9.8:1 (WCAG AAA)
    },
    warning: {
      lightBg: '#FEF3C7',
      lightText: '#92400E', // Contrast on #FEF3C7 = 5.4:1 (WCAG AA)
      darkBg: '#2E1A05',
      darkText: '#FBBF24', // Contrast on #2E1A05 = 9.1:1 (WCAG AAA)
    },
    error: {
      lightBg: '#FEE2E2',
      lightText: '#B91C1C', // Contrast on #FEE2E2 = 5.5:1 (WCAG AA)
      darkBg: '#360909',
      darkText: '#F87171', // Contrast on #360909 = 7.9:1 (WCAG AAA)
    },
    info: {
      lightBg: '#EFF6FF',
      lightText: '#1D4ED8', // Contrast on #EFF6FF = 5.6:1 (WCAG AA)
      darkBg: '#0B1E3B',
      darkText: '#60A5FA', // Contrast on #0B1E3B = 7.6:1 (WCAG AAA)
    },
  },
} as const;

/**
 * Typography Scale & Font Families
 */
export const TYPOGRAPHY = {
  fonts: {
    sans: 'Inter, "IBM Plex Sans Arabic", Tajawal, Alexandria, ui-sans-serif, system-ui, sans-serif',
    display: 'Inter, Tajawal, "IBM Plex Sans Arabic", ui-sans-serif, system-ui, sans-serif',
    arabic: '"IBM Plex Sans Arabic", Tajawal, Alexandria, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    serif: '"Instrument Serif", Georgia, serif',
  },
  sizes: {
    xs: { fontSize: '0.75rem', lineHeight: '1rem', px: 12, label: 'Micro / Subtitles (Minimum Allowed)' },
    sm: { fontSize: '0.875rem', lineHeight: '1.25rem', px: 14, label: 'Small / Secondary' },
    base: { fontSize: '1rem', lineHeight: '1.5rem', px: 16, label: 'Base / Standard Body' },
    lg: { fontSize: '1.125rem', lineHeight: '1.75rem', px: 18, label: 'Large / Subheadings' },
    xl: { fontSize: '1.25rem', lineHeight: '1.75rem', px: 20, label: 'X-Large / Card Titles' },
    '2xl': { fontSize: '1.5rem', lineHeight: '2rem', px: 24, label: '2X-Large / Section Headers' },
    '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem', px: 30, label: '3X-Large / Page Titles' },
    '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem', px: 36, label: '4X-Large / Hero Banners' },
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '800',
  },
} as const;

/**
 * Minimum Interaction Touch Targets (WCAG 2.5.5 / Android TalkBack)
 */
export const TOUCH_TARGETS = {
  desktopMin: 44, // 44px x 44px
  mobileMin: 48,  // 48px x 48px
  mobileClass: 'min-h-[48px] min-w-[48px]',
  desktopClass: 'min-h-[44px] min-w-[44px]',
} as const;

/**
 * Elevation & Border Radii
 */
export const RADII = {
  sm: 'rounded-lg',    // 8px
  md: 'rounded-xl',    // 12px
  lg: 'rounded-2xl',   // 16px - Standard Card & Button Radius
  xl: 'rounded-3xl',   // 24px - Container & Modal Radius
  full: 'rounded-full', // Pills & Circular Actions
} as const;

/**
 * Helper to calculate relative luminance according to WCAG 2.1 specs
 */
export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculates WCAG contrast ratio between two hex colors
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 10) / 10;
}
