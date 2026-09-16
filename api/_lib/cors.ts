/**
 * CORS Security Guard for Cognify 2.0 (Point 1 Hardening)
 * Strictly restricts allowed origins, supports dynamic Vercel / environment origins,
 * and handles preflight OPTIONS requests cleanly.
 */

/**
 * Checks whether the specified origin is permitted.
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin || typeof origin !== 'string') {
    return false;
  }

  const cleanOrigin = origin.trim().replace(/\/$/, '');
  if (!cleanOrigin) {
    return false;
  }

  const allowedOrigins: string[] = ['https://my-cognify-app.vercel.app'];

  // 1. Configured custom origins (comma-separated)
  if (process.env.ALLOWED_ORIGINS) {
    const custom = process.env.ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean);
    allowedOrigins.push(...custom);
  }

  // 2. Vercel deployment URL (with https://)
  if (process.env.VERCEL_URL) {
    const rawVercel = process.env.VERCEL_URL.trim();
    const vercelOrigin = rawVercel.startsWith('http://') || rawVercel.startsWith('https://')
      ? rawVercel
      : `https://${rawVercel}`;
    allowedOrigins.push(vercelOrigin.replace(/\/$/, ''));
  }

  // 3. Local development origins allowed only in non-production
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173'
    );
  }

  const lowerTarget = cleanOrigin.toLowerCase();
  return allowedOrigins.some(
    (allowed) => allowed === '*' || allowed.toLowerCase() === lowerTarget
  );
}

/**
 * Applies strict CORS headers to the response based on the request origin.
 * Handles preflight OPTIONS requests cleanly.
 *
 * @returns true if the request is permitted to proceed; false if rejected or handled as OPTIONS preflight.
 */
export function applyCorsHeaders(req: any, res: any): boolean {
  const origin = req.headers?.origin || req.headers?.Origin;

  res.setHeader?.('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader?.('Access-Control-Max-Age', '86400');

  if (origin) {
    if (!isAllowedOrigin(origin)) {
      if (typeof res.status === 'function') {
        const s = res.status(403);
        if (s && typeof s.json === 'function') {
          s.json({ error: 'CORS: Origin not allowed' });
        } else if (typeof res.json === 'function') {
          res.json({ error: 'CORS: Origin not allowed' });
        }
      } else if (typeof res.writeHead === 'function') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'CORS: Origin not allowed' }));
      }
      return false;
    }
    res.setHeader?.('Access-Control-Allow-Origin', origin);
    res.setHeader?.('Vary', 'Origin');
  } else {
    // Non-browser / same-origin / internal test requests without Origin header
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader?.('Access-Control-Allow-Origin', '*');
    } else {
      res.setHeader?.('Access-Control-Allow-Origin', 'https://my-cognify-app.vercel.app');
    }
  }

  // Preflight OPTIONS handling
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      const s = res.status(204);
      if (s && typeof s.end === 'function') {
        s.end();
      } else if (typeof res.end === 'function') {
        res.end();
      }
    } else if (typeof res.writeHead === 'function') {
      res.writeHead(204);
      res.end();
    }
    return false;
  }

  return true;
}
