/**
 * Client-side helper for reading the visitor's country.
 * Calls /api/geo/country (backed by Vercel's edge geo headers, see
 * api/geo/country.ts) and caches the result in sessionStorage so it's
 * only fetched once per browser tab/session.
 */

export interface VisitorGeo {
  countryCode: string; // ISO 3166-1 alpha-2, e.g. "EG" — or "Unknown"
  region: string | null;
  city: string | null;
}

const CACHE_KEY = 'cognify_visitor_geo';

export async function getVisitorGeo(): Promise<VisitorGeo> {
  if (typeof window !== 'undefined') {
    const cached = window.sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as VisitorGeo;
      } catch {
        // fall through and re-fetch on parse failure
      }
    }
  }

  try {
    const res = await fetch('/api/geo/country');
    const data = (await res.json()) as VisitorGeo;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }
    return data;
  } catch {
    return { countryCode: 'Unknown', region: null, city: null };
  }
}

/** Convenience: just the ISO country code, e.g. "EG". */
export async function getVisitorCountryCode(): Promise<string> {
  const geo = await getVisitorGeo();
  return geo.countryCode;
}
