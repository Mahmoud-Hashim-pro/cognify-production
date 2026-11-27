/**
 * Nearby Places Proxy
 * Route: GET /api/mobility/nearby?lat=..&lon=..
 *
 * Returns the names of useful nearby places (pharmacies, shops, transport,
 * hospitals...) within ~300m via the Overpass API. Authenticated + rate limited.
 */
import { applyCorsHeaders } from '../_lib/cors.js';
import { verifyRequestAuth } from '../_lib/authGuard.js';
import { checkDistributedRateLimit } from '../_lib/rateLimiter.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

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

  const limit = await checkDistributedRateLimit(`nearby:${auth.uid}`, 10);
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

  const query = `[out:json][timeout:10];(
    node(around:300,${lat},${lon})[amenity][name];
    node(around:300,${lat},${lon})[shop][name];
    node(around:300,${lat},${lon})[public_transport][name];
    node(around:300,${lat},${lon})[tourism][name];
  );out tags 12;`;

  try {
    const upstream = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'rafiqi-accessibility-app/1.0 (nearby places proxy)',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) {
      res.status(502).json({ error: 'Places provider unavailable' });
      return;
    }
    const data: any = await upstream.json();
    const seen = new Set<string>();
    const places: string[] = [];
    for (const el of data?.elements || []) {
      const name = el?.tags?.['name:ar'] || el?.tags?.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        places.push(String(name));
        if (places.length >= 8) break;
      }
    }
    res.status(200).json({ places });
  } catch (err) {
    console.error('[nearby] upstream failure', err);
    res.status(502).json({ error: 'Places provider unavailable' });
  }
}
