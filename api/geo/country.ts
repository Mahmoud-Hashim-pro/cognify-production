/**
 * Returns the visitor's country using Vercel's built-in edge geolocation
 * headers — no external API call, no IP sent to any third party.
 *
 * On Vercel, every request automatically carries:
 *   x-vercel-ip-country       → "EG", "US", ...        (ISO 3166-1 alpha-2)
 *   x-vercel-ip-country-region → "11", "CA", ...        (region/state code)
 *   x-vercel-ip-city          → "Cairo", "New York"     (URL-encoded)
 *
 * Locally (npm run dev) these headers don't exist, so we fall back to
 * "Unknown" — see server.ts for the matching local dev route.
 */
export default async function handler(req: any, res: any) {
  const countryCode = (req.headers['x-vercel-ip-country'] as string) || 'Unknown';
  const region = (req.headers['x-vercel-ip-country-region'] as string) || null;
  const rawCity = req.headers['x-vercel-ip-city'] as string | undefined;
  const city = rawCity ? decodeURIComponent(rawCity) : null;

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ countryCode, region, city });
}
