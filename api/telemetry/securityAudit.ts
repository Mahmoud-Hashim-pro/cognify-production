/**
 * Serverless API endpoint to extract and return client public IP.
 * Used by Cognify's Security Tracker for DevTools / Element Inspect tracking.
 */
import { applyCorsHeaders } from '../_lib/cors.js';
import { checkRateLimit } from '../_lib/rateLimiter.js';

export function extractClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  const realIp = req.headers?.['x-real-ip'];
  const socketIp = req.socket?.remoteAddress || req.connection?.remoteAddress;

  let ip = '127.0.0.1';
  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim();
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    ip = forwarded[0].trim();
  } else if (typeof realIp === 'string') {
    ip = realIp.trim();
  } else if (socketIp) {
    ip = socketIp.trim();
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  // Regex extraction: find valid IPv4
  const ipv4Match = ip.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  if (ipv4Match) {
    return ipv4Match[0];
  }

  // Regex extraction: find valid IPv6
  const ipv6Match = ip.match(/\b(?:[a-fA-F0-9]{1,4}:){1,7}[a-fA-F0-9]{1,4}\b/);
  if (ipv6Match) {
    return ipv6Match[0];
  }

  if (ip === '::1' || ip === '0.0.0.0' || !ip) {
    return '127.0.0.1 (Local)';
  }

  return ip;
}

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store, max-age=0');

  // 1. CORS Guard
  if (!applyCorsHeaders(req, res)) {
    return;
  }

  try {
    // 2. Validate payload size (< 4KB = 4096 bytes) and reject malformed/oversized requests
    const contentLength = req.headers?.['content-length'];
    if (contentLength !== undefined && contentLength !== null) {
      const parsedLen = parseInt(contentLength, 10);
      if (isNaN(parsedLen) || parsedLen < 0) {
        return res.status(400).json({
          success: false,
          error: 'Malformed request: Invalid Content-Length header.',
        });
      }
      if (parsedLen >= 4096) {
        return res.status(413).json({
          success: false,
          error: 'Payload Too Large: Security audit payload must be under 4KB.',
        });
      }
    }

    if (req.body !== undefined && req.body !== null && req.body !== '') {
      let bodySize = 0;
      if (typeof req.body === 'string') {
        bodySize = Buffer.byteLength(req.body, 'utf8');
        if (req.headers?.['content-type']?.includes('application/json')) {
          try {
            JSON.parse(req.body);
          } catch {
            return res.status(400).json({
              success: false,
              error: 'Malformed request: Invalid JSON payload.',
            });
          }
        }
      } else if (typeof req.body === 'object') {
        try {
          const jsonStr = JSON.stringify(req.body);
          bodySize = Buffer.byteLength(jsonStr, 'utf8');
        } catch {
          return res.status(400).json({
            success: false,
            error: 'Malformed request: Unserializable payload.',
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Malformed request: Unsupported body type.',
        });
      }

      if (bodySize >= 4096) {
        return res.status(413).json({
          success: false,
          error: 'Payload Too Large: Security audit payload must be under 4KB.',
        });
      }
    }

    // 3. Rate limiting per IP using checkRateLimit (max 15 requests/min per IP, returning 429 if exceeded)
    const ip = extractClientIp(req);
    const rateLimit = checkRateLimit(`security_audit:${ip}`, 15);
    if (typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', '15');
      res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
    }
    if (!rateLimit.allowed) {
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', Math.ceil(rateLimit.resetMs / 1000).toString());
      }
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Rate limit exceeded (maximum 15 requests per minute).',
      });
    }

    return res.status(200).json({
      success: true,
      ip,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      ip: '127.0.0.1 (Fallback)',
      error: err.message,
    });
  }
}
