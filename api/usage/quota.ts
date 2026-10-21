/**
 * API Endpoint: /api/usage/quota
 * Returns current user's transparent usage statistics, remaining daily allowances,
 * and next UTC reset time.
 */

import { verifyRequestAuth } from '../_lib/authGuard.js';
import { applyCorsHeaders } from '../_lib/cors.js';
import { getUserUsageSnapshot } from '../_lib/usageQuotaEngine.js';

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await verifyRequestAuth(req);
    const effectiveUid = auth.authenticated && auth.uid ? auth.uid : 'guest-preview';

    const snapshot = getUserUsageSnapshot(effectiveUid);

    res.status(200).json(snapshot);
  } catch (err: any) {
    console.error('[api/usage/quota] Error fetching usage snapshot:', err);
    res.status(500).json({ error: 'Failed to retrieve usage stats' });
  }
}
