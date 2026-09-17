/**
 * Resilient Image Proxy Endpoint
 * Route: GET /api/proxy-image?url=...
 *
 * Solves:
 * 1. Strict Referrer-Policy blocking from external image providers (pollinations.ai)
 * 2. Client-side ad-blockers / shields blocking third-party image domains
 * 3. Adds server-side edge caching (86400s) and SSRF protection
 */

import { checkRateLimit } from './_lib/rateLimiter.js';
import { getOrGenerateTraceId, attachTraceId } from './_lib/tracing.js';

// Private and link-local IP patterns to prevent SSRF
const PRIVATE_IP_REGEX = /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|169\.254\.|0\.0\.0\.0|localhost|::1)/i;

/**
 * Validates whether a target URL is a safe, valid external image URL
 */
export function isSafeImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    if (PRIVATE_IP_REGEX.test(host) || host.endsWith('.local') || host.endsWith('.internal')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  // 1. CORS headers - images are public visual assets
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead?.(204);
    res.end?.();
    return;
  }

  // 2. Correlation trace
  const traceId = getOrGenerateTraceId(req);
  attachTraceId(res, traceId);

  // 3. Rate limiting per IP
  const forwarded = req.headers?.['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || '127.0.0.1';

  const rateCheck = checkRateLimit(`img_proxy:${clientIp}`, 120);
  if (!rateCheck.allowed) {
    res.setHeader?.('Retry-After', Math.ceil(rateCheck.resetMs / 1000).toString());
    res.status ? res.status(429) : (res.statusCode = 429);
    res.json ? res.json({ error: 'Image proxy rate limit exceeded' }) : res.end(JSON.stringify({ error: 'Too Many Requests' }));
    return;
  }

  // 4. Parse URL parameter
  let targetUrl: string | null = null;
  if (req.query?.url && typeof req.query.url === 'string') {
    targetUrl = req.query.url;
  } else if (req.url) {
    try {
      const parsedReq = new URL(req.url, 'http://localhost');
      targetUrl = parsedReq.searchParams.get('url');
    } catch {
      targetUrl = null;
    }
  }

  if (!targetUrl || !isSafeImageUrl(targetUrl)) {
    res.status ? res.status(400) : (res.statusCode = 400);
    const err = { error: 'Invalid or forbidden target image URL', traceId };
    res.json ? res.json(err) : res.end(JSON.stringify(err));
    return;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!upstreamRes.ok) {
      res.status ? res.status(502) : (res.statusCode = 502);
      const err = { error: `Upstream image returned HTTP ${upstreamRes.status}`, traceId };
      res.json ? res.json(err) : res.end(JSON.stringify(err));
      return;
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const arrayBuf = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    res.setHeader?.('Content-Type', contentType);
    res.setHeader?.('Content-Length', buffer.length.toString());
    res.setHeader?.('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader?.('Cross-Origin-Resource-Policy', 'cross-origin');

    if (typeof res.send === 'function') {
      res.send(buffer);
    } else {
      res.end?.(buffer);
    }
  } catch (err: any) {
    res.status ? res.status(504) : (res.statusCode = 504);
    const errPayload = { error: 'Failed to retrieve image from upstream provider', details: err?.message, traceId };
    res.json ? res.json(errPayload) : res.end(JSON.stringify(errPayload));
  }
}
