/**
 * Weather Proxy
 * Route: GET /api/weather?lat=..&lon=..
 *
 * Authenticated + rate limited proxy over Open-Meteo (no API key required).
 * Returns a tiny current-weather payload suitable for spoken answers.
 */
import { applyCorsHeaders } from '../cors.js';
import { verifyRequestAuth } from '../authGuard.js';
import { checkDistributedRateLimit } from '../rateLimiter.js';

const WMO_DESCRIPTIONS_AR: Record<number, string> = {
  0: 'صافي', 1: 'صافي في الغالب', 2: 'غائم جزئيا', 3: 'غائم',
  45: 'فيه ضباب', 48: 'فيه ضباب متجمد',
  51: 'رذاذ خفيف', 53: 'رذاذ', 55: 'رذاذ كثيف',
  61: 'مطر خفيف', 63: 'مطر', 65: 'مطر غزير',
  66: 'مطر متجمد خفيف', 67: 'مطر متجمد',
  71: 'ثلج خفيف', 73: 'ثلج', 75: 'ثلج كثيف', 77: 'حبيبات ثلج',
  80: 'زخات مطر خفيفة', 81: 'زخات مطر', 82: 'زخات مطر غزيرة',
  85: 'زخات ثلج خفيفة', 86: 'زخات ثلج غزيرة',
  95: 'عاصفة رعدية', 96: 'عاصفة رعدية مع برد خفيف', 99: 'عاصفة رعدية مع برد غزير',
};

const WMO_DESCRIPTIONS_EN: Record<number, string> = {
  0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'foggy', 48: 'icy fog',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain',
  66: 'light freezing rain', 67: 'freezing rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'light showers', 81: 'showers', 82: 'heavy showers',
  85: 'light snow showers', 86: 'heavy snow showers',
  95: 'a thunderstorm', 96: 'a thunderstorm with light hail', 99: 'a thunderstorm with heavy hail',
};

export default async function handler(req: any, res: any) {
  if (applyCorsHeaders(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await verifyRequestAuth(req);
  if (!auth.authenticated) {
    res.status(401).json({ error: auth.error || 'Authentication required' });
    return;
  }

  const limit = await checkDistributedRateLimit(`weather:${auth.uid}`, 20);
  if (!limit.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded', resetMs: limit.resetMs });
    return;
  }

  const lat = Number(req.query?.lat);
  const lon = Number(req.query?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    res.status(400).json({ error: 'lat & lon query params are required' });
    return;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) {
      res.status(502).json({ error: 'Weather provider unavailable' });
      return;
    }
    const data: any = await upstream.json();
    const code = Number(data?.current?.weather_code ?? -1);
    const isArabic = req.headers['accept-language']?.startsWith('ar');
    const descriptions = isArabic ? WMO_DESCRIPTIONS_AR : WMO_DESCRIPTIONS_EN;
    res.status(200).json({
      temp: data?.current?.temperature_2m,
      windSpeed: data?.current?.wind_speed_10m,
      weatherCode: code,
      description: descriptions[code] || (isArabic ? 'غير معروف' : 'unknown'),
    });
  } catch (err) {
    console.error('[weather] upstream failure', err);
    res.status(502).json({ error: 'Weather provider unavailable' });
  }
}
