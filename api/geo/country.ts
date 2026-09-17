/**
 * Returns the visitor's country using Vercel's built-in edge geolocation
 * headers (or Cloudflare / reverse-proxy headers), with a graceful edge fallback.
 *
 * On Vercel, every request automatically carries:
 *   x-vercel-ip-country        → "EG", "US", ...        (ISO 3166-1 alpha-2)
 *   x-vercel-ip-country-region → "11", "CA", ...        (region/state code)
 *   x-vercel-ip-city           → "Cairo", "New York"     (URL-encoded)
 */
export default async function handler(req: any, res: any) {
  let countryCode = (req.headers['x-vercel-ip-country'] as string)
    || (req.headers['cf-ipcountry'] as string)
    || (req.headers['x-country-code'] as string);

  const region = (req.headers['x-vercel-ip-country-region'] as string) || null;
  const rawCity = req.headers['x-vercel-ip-city'] as string | undefined;
  const city = rawCity ? decodeURIComponent(rawCity) : null;

  if (!countryCode || countryCode === 'Unknown') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const fallbackRes = await fetch('https://api.country.is', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (fallbackRes.ok) {
        const data = (await fallbackRes.json()) as any;
        if (data && data.country && typeof data.country === 'string' && data.country.length === 2) {
          countryCode = data.country.toUpperCase();
        }
      }
    } catch {
      // Fall through silently
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ countryCode: countryCode || 'Unknown', region, city });
}
