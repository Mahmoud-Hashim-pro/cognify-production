/**
 * Geocoding Proxy (forward + reverse)
 * Routes:
 *   GET /api/mobility/geocode?lat=..&lon=..   reverse geocode
 *   GET /api/mobility/geocode?q=...           forward search (Egypt-biased)
 *
 * Authenticated + rate limited proxy over OpenStreetMap Nominatim with the
 * required identifying User-Agent, so the client never calls it directly.
 */
import { applyCorsHeaders } from '../_lib/cors.js';
import { verifyRequestAuth } from '../_lib/authGuard.js';
import { checkDistributedRateLimit } from '../_lib/rateLimiter.js';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const UA = 'rafiqi-accessibility-app/1.0 (contact: app operator)';

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

  const limit = await checkDistributedRateLimit(`geocode:${auth.uid}`, 20);
  if (!limit.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded', resetMs: limit.resetMs });
    return;
  }

  try {
    const { lat, lon, q } = req.query || {};
    if (q && typeof q === 'string' && q.trim()) {
      const params = new URLSearchParams({
        q: q.trim().slice(0, 200),
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
        'accept-language': req.headers['accept-language']?.startsWith('ar') ? 'ar' : 'en',
      });
      const upstream = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(8000),
      });
      if (!upstream.ok) {
        res.status(502).json({ error: 'Geocoding provider unavailable' });
        return;
      }
      const results: any = await upstream.json();
      res.status(200).json({
        results: (Array.isArray(results) ? results : []).map((r: any) => ({
          displayName: r.display_name,
          lat: Number(r.lat),
          lon: Number(r.lon),
          type: r.type,
        })),
      });
      return;
    }

    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) || Math.abs(latNum) > 90 || Math.abs(lonNum) > 180) {
      res.status(400).json({ error: 'Provide lat & lon, or q' });
      return;
    }
    const params = new URLSearchParams({
      lat: String(latNum),
      lon: String(lonNum),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
      'accept-language': req.headers['accept-language']?.startsWith('ar') ? 'ar' : 'en',
    });
    const upstream = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      res.status(502).json({ error: 'Geocoding provider unavailable' });
      return;
    }
    const data = await upstream.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('[geocode] upstream failure', err);
    res.status(502).json({ error: 'Geocoding provider unavailable' });
  }
}
