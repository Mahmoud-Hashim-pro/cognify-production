/**
 * Walking Directions Proxy
 * Route: GET /api/mobility/directions?from=lat,lon&to=lat,lon
 *
 * Server-side proxy to the public OSRM demo server (foot profile) so the client
 * never talks to a third party directly and every call is authenticated +
 * rate limited. Returns normalized, speakable walking steps.
 */
import { applyCorsHeaders } from '../_lib/cors.js';
import { verifyRequestAuth } from '../_lib/authGuard.js';
import { checkDistributedRateLimit } from '../_lib/rateLimiter.js';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/foot';

function parseLatLon(raw: unknown): { lat: number; lon: number } | null {
  if (typeof raw !== 'string') return null;
  const [latStr, lonStr] = raw.split(',');
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

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

  const limit = await checkDistributedRateLimit(`directions:${auth.uid}`, 20);
  if (!limit.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded', resetMs: limit.resetMs });
    return;
  }

  const from = parseLatLon(req.query?.from);
  const to = parseLatLon(req.query?.to);
  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params are required as lat,lon' });
    return;
  }

  try {
    const url = `${OSRM_BASE}/${from.lon},${from.lat};${to.lon},${to.lat}?steps=true&overview=false&geometries=geojson&annotations=false`;
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'rafiqi-accessibility-app/1.0 (mobility directions proxy)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      res.status(502).json({ error: 'Directions provider unavailable' });
      return;
    }
    const data: any = await upstream.json();
    const route = data?.routes?.[0];
    if (!route) {
      res.status(404).json({ error: 'No walking route found' });
      return;
    }
    const leg = route.legs?.[0];
    const steps = (leg?.steps || []).map((s: any) => ({
      instruction: s?.maneuver?.type
        ? `${s.maneuver.type}${s.maneuver?.modifier ? ' ' + s.maneuver.modifier : ''}`
        : 'continue',
      name: typeof s?.name === 'string' && s.name ? s.name : '',
      distanceMeters: Math.round(s?.distance || 0),
      durationSeconds: Math.round(s?.duration || 0),
      location: {
        lat: s?.maneuver?.location?.[1],
        lon: s?.maneuver?.location?.[0],
      },
    }));
    res.status(200).json({
      distanceMeters: Math.round(route.distance || 0),
      durationSeconds: Math.round(route.duration || 0),
      steps,
    });
  } catch (err) {
    console.error('[directions] upstream failure', err);
    res.status(502).json({ error: 'Directions provider unavailable' });
  }
}
