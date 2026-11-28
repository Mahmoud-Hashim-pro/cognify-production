import { SectionFeatureItem } from './sections';
import { FEATURE_SHORT_NAMES } from './sectionShortNames';

/** Lowercase, drop Arabic diacritics/tatweel, unify alef/ya/ta-marbuta so Arabic typing variants match. */
export function normalizeSearchText(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score a feature for a query. 0 = no match. Every word of the query must appear somewhere.
 * Higher when the words are in the short name or title, lower for description/tags.
 */
export function scoreFeature(feature: SectionFeatureItem, query: string): number {
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  if (words.length === 0) return 0;
  const short = FEATURE_SHORT_NAMES[feature.id];
  const names = normalizeSearchText([short?.[0], short?.[1], feature.titleEn, feature.titleAr].join(' '));
  const rest = normalizeSearchText(
    [feature.descEn, feature.descAr, ...(feature.tagsEn || []), ...(feature.tagsAr || [])].join(' ')
  );
  let score = 0;
  for (const w of words) {
    if (names.includes(w)) score += names.startsWith(w) ? 12 : 10;
    else if (rest.includes(w)) score += 3;
    else return 0;
  }
  return score;
}
