/**
 * Rafiqi (رفيقي) — Single-Source-of-Truth Brand & Identity Configuration
 *
 * Adheres to SOLID Principles:
 * - Single Responsibility Principle (SRP): Centralizes brand names, localized
 *   titles, team attribution, and domain metadata in one immutable contract.
 * - Open/Closed Principle (OCP): Extensible for additional locales or white-label
 *   institutional deployments without modifying consumer components.
 */

export interface BrandConfig {
  readonly id: string;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly appNameEn: string;
  readonly appNameAr: string;
  readonly taglineEn: string;
  readonly taglineAr: string;
  readonly taglineFr: string;
  readonly descriptionEn: string;
  readonly descriptionAr: string;
  readonly teamNameEn: string;
  readonly teamNameAr: string;
  readonly canonicalUrl: string;
  readonly themeColor: string;
  readonly backgroundColor: string;
}

export const BRAND_CONFIG: BrandConfig = Object.freeze({
  id: 'rafiqi',
  nameEn: 'Rafiqi',
  nameAr: 'رفيقي',
  appNameEn: 'Rafiqi AI',
  appNameAr: 'رفيقي AI',
  taglineEn: 'Your Everyday Accessibility Companion',
  taglineAr: 'رفيقك في الحياة، والتعلم، والعمل.',
  taglineFr: 'Votre Compagnon d’Accessibilité au Quotidien',
  descriptionEn:
    'Rafiqi (رفيقي) is an AI-powered adaptive personal assistant and inclusive learning platform that tailors every interaction to your cognitive level, academic field, and accessibility needs.',
  descriptionAr:
    'رفيقي (Rafiqi) هو مساعدك الشخصي الذكي ومنصة التعلم الشامل والتكيفي المصممة لدعم الطلاب وذوي الهمم بأعلى معايير الإتاحة العالمية.',
  teamNameEn: 'The Rafiqi Team / Graduation Project Team',
  teamNameAr: 'فريق تطوير منصة رفيقي',
  canonicalUrl: 'https://rafiqi-ai.vercel.app',
  themeColor: '#0F172A',
  backgroundColor: '#071426',
});

/**
 * Returns the localized brand name ('رفيقي' for Arabic locales, 'Rafiqi' otherwise).
 */
export function getBrandName(language?: string): string {
  if (!language) return BRAND_CONFIG.nameEn;
  const normalized = language.trim().toLowerCase();
  if (normalized === 'ar' || normalized === 'arabic' || normalized === 'egyptian ammiya') {
    return BRAND_CONFIG.nameAr;
  }
  return BRAND_CONFIG.nameEn;
}

/**
 * Returns the localized tagline for the given language.
 */
export function getBrandTagline(language?: string): string {
  if (!language) return BRAND_CONFIG.taglineEn;
  const normalized = language.trim().toLowerCase();
  if (normalized === 'ar' || normalized === 'arabic' || normalized === 'egyptian ammiya') {
    return BRAND_CONFIG.taglineAr;
  }
  if (normalized === 'fr' || normalized === 'french') {
    return BRAND_CONFIG.taglineFr;
  }
  return BRAND_CONFIG.taglineEn;
}
