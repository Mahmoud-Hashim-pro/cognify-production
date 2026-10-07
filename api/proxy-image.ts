/**
 * Resilient Image Proxy Endpoint
 * Route: GET /api/proxy-image?url=...
 *
 * Solves:
 * 1. Strict Referrer-Policy blocking from external image providers (pollinations.ai)
 * 2. Client-side ad-blockers / shields blocking third-party image domains
 * 3. Server-side edge caching (86400s)
 * 4. Enterprise-grade SSRF and DNS Rebinding protection (OWASP SSRF Prevention)
 */

import dns from 'node:dns/promises';
import net from 'node:net';
import { checkDistributedRateLimit } from './_lib/rateLimiter.js';
import { getOrGenerateTraceId, attachTraceId } from './_lib/tracing.js';

// Trusted image provider allowlist — bypasses ad-hoc DNS queries for known CDNs
const ALLOWED_IMAGE_DOMAINS = new Set([
  'pollinations.ai',
  'image.pollinations.ai',
  'images.unsplash.com',
  'images.pexels.com',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
]);

// Private and link-local IP patterns (including loopback, cloud metadata, RFC1918, CGNAT)
const PRIVATE_HOSTNAME_REGEX = /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|169\.254\.|0\.0\.0\.0|100\.(?:6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.|localhost|::1)/i;

/**
 * Validates whether an IPv4 or IPv6 address belongs to private/internal/loopback/link-local space.
 * Prevents DNS Rebinding and decimal/octal/hex IP representation bypasses.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip) return true;

  // Normalize IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
  const normalizedIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  const family = net.isIP(normalizedIp);
  if (!family) return true; // Invalid IP is treated as unsafe

  if (family === 4) {
    const parts = normalizedIp.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [b0, b1] = parts;

    // 0.0.0.0/8 (Current network)
    if (b0 === 0) return true;
    // 10.0.0.0/8 (RFC 1918 Private)
    if (b0 === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 169.254.0.0/16 (Link-local, AWS/GCP/Azure Cloud Metadata 169.254.169.254)
    if (b0 === 169 && b1 === 254) return true;
    // 172.16.0.0/12 (RFC 1918 Private)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16 (RFC 1918 Private)
    if (b0 === 192 && b1 === 168) return true;
    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
    if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;
    if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;
    if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (b0 >= 224) return true;

    return false;
  }

  if (family === 6) {
    const lower = normalizedIp.toLowerCase();
    // ::1 (Loopback)
    if (lower === '::1' || lower === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
    // fe80::/10 (Link-local)
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // fc00::/7 & fd00::/8 (Unique local address)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // :: (Unspecified)
    if (lower === '::' || lower === '0000:0000:0000:0000:0000:0000:0000:0000') return true;
    return false;
  }

  return true;
}

/**
 * Validates whether a target URL is safe against SSRF, Decimal/Hex IP notation, and DNS Rebinding.
 * Asynchronous verification ensures the resolved IP is examined prior to network dispatch.
 */
export async function isSafeImageUrl(rawUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Block non-standard ports (e.g. redis 6379, ssh 22, internal APIs 8080)
    const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
    if (port !== 80 && port !== 443) {
      return false;
    }

    // Fast-path: Check explicit private hostname regex & domain suffixes
    if (PRIVATE_HOSTNAME_REGEX.test(host) || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || host.endsWith('.home.arpa')) {
      return false;
    }

    // Numeric decimal/hex IP literal check (e.g. 2130706433 or 0x7f000001)
    if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
      return false;
    }

    // Allowlist match: High-confidence known safe providers
    if (ALLOWED_IMAGE_DOMAINS.has(host)) {
      return true;
    }

    // Direct IP literal: validate without DNS lookup
    if (net.isIP(host)) {
      return !isPrivateOrReservedIp(host);
    }

    // Enterprise DNS resolution: resolve ALL addresses to foil DNS Rebinding
    try {
      const records = await dns.lookup(host, { all: true });
      if (!records || records.length === 0) return false;
      for (const rec of records) {
        if (isPrivateOrReservedIp(rec.address)) {
          return false;
        }
      }
      return true;
    } catch {
      // DNS resolution failure fails closed
      return false;
    }
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

  // Response helper compatible with both Express res and Node http ServerResponse
  const sendJsonResponse = (status: number, data: any) => {
    if (typeof res.status === 'function') {
      res.status(status);
    } else {
      res.statusCode = status;
    }
    if (typeof res.json === 'function') {
      res.json(data);
    } else {
      res.setHeader?.('Content-Type', 'application/json');
      res.end?.(JSON.stringify(data));
    }
  };

  const rateCheck = await checkDistributedRateLimit(`img_proxy:${clientIp}`, 120);
  if (!rateCheck.allowed) {
    res.setHeader?.('Retry-After', Math.ceil(rateCheck.resetMs / 1000).toString());
    sendJsonResponse(429, { error: 'Image proxy rate limit exceeded' });
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

  // 5. Asynchronous DNS-resolved SSRF Verification
  const safe = targetUrl ? await isSafeImageUrl(targetUrl) : false;
  if (!targetUrl || !safe) {
    sendJsonResponse(400, { error: 'Invalid or forbidden target image URL', traceId });
    return;
  }

  try {
    // redirect: 'error' ensures an upstream 301/302 cannot pivot to cloud metadata or internal subnets
    const upstreamRes = await fetch(targetUrl, {
      redirect: 'error',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!upstreamRes.ok) {
      sendJsonResponse(502, { error: `Upstream image returned HTTP ${upstreamRes.status}`, traceId });
      return;
    }

    const rawContentType = upstreamRes.headers.get('content-type') || '';
    const cleanContentType = rawContentType.split(';')[0].trim().toLowerCase();

    // Strict MIME-type enforcement: MUST be an image type (e.g. image/jpeg, image/png, image/webp, image/gif, image/avif, image/svg+xml)
    // Prevents text/html, application/javascript, or other attacker-controlled content from rendering on this origin.
    if (!cleanContentType.startsWith('image/')) {
      sendJsonResponse(415, { error: 'Upstream response is not a valid image format', traceId });
      return;
    }

    // Response size cap: 10MB limit prevents memory exhaustion attacks
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const contentLengthHeader = upstreamRes.headers.get('content-length');
    if (contentLengthHeader && parseInt(contentLengthHeader, 10) > MAX_IMAGE_BYTES) {
      sendJsonResponse(413, { error: 'Image exceeds maximum allowable size (10MB)', traceId });
      return;
    }

    const arrayBuf = await upstreamRes.arrayBuffer();
    if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
      sendJsonResponse(413, { error: 'Image exceeds maximum allowable size (10MB)', traceId });
      return;
    }
    const buffer = Buffer.from(arrayBuf);

    // Strict security headers: sandbox prevents script execution; nosniff prevents MIME sniffing
    res.setHeader?.('Content-Type', cleanContentType);
    res.setHeader?.('Content-Length', buffer.length.toString());
    res.setHeader?.('Content-Security-Policy', "default-src 'none'; sandbox; base-uri 'none'; form-action 'none';");
    res.setHeader?.('X-Content-Type-Options', 'nosniff');
    res.setHeader?.('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader?.('Cross-Origin-Resource-Policy', 'cross-origin');

    if (typeof res.send === 'function') {
      res.send(buffer);
    } else {
      res.end?.(buffer);
    }
  } catch (err: any) {
    sendJsonResponse(504, { error: 'Failed to retrieve image from upstream provider', traceId });
  }
}
