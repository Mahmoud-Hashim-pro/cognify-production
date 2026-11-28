/**
 * Proxy Router (consolidated serverless function)
 *
 * Vercel Hobby allows at most 12 serverless functions per deployment, so the
 * weather proxy and the resilient image proxy are served by this single
 * function. External routes are preserved via vercel.json rewrites:
 *   /api/weather      -> /api/proxy?action=weather
 *   /api/proxy-image  -> /api/proxy?action=image
 */
import weatherHandler from './_lib/proxy/weather.js';
import proxyImageHandler from './_lib/proxy/proxy-image.js';

export default async function handler(req: any, res: any) {
  const action = String(req.query?.action || '');
  if (action === 'image') return proxyImageHandler(req, res);
  if (action === 'weather') return weatherHandler(req, res);
  res.status(400).json({ error: 'Unknown proxy action' });
}
