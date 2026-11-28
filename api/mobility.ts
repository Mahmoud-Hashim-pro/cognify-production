/**
 * Mobility Router (consolidated serverless function)
 *
 * Vercel Hobby allows at most 12 serverless functions per deployment, so the
 * three mobility endpoints (directions, geocode, nearby) are served by this
 * single function. External routes are preserved via vercel.json rewrites:
 *   /api/mobility/directions -> /api/mobility?action=directions
 *   /api/mobility/geocode    -> /api/mobility?action=geocode
 *   /api/mobility/nearby     -> /api/mobility?action=nearby
 */
import directionsHandler from './_lib/mobility/directions.js';
import geocodeHandler from './_lib/mobility/geocode.js';
import nearbyHandler from './_lib/mobility/nearby.js';

export default async function handler(req: any, res: any) {
  const action = String(req.query?.action || 'directions');
  if (action === 'geocode') return geocodeHandler(req, res);
  if (action === 'nearby') return nearbyHandler(req, res);
  return directionsHandler(req, res);
}
