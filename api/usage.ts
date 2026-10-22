/**
 * Unified API Endpoint: /api/usage
 * Consolidated endpoint handling:
 * 1. /api/usage/quota — Transparent usage statistics and allowances
 * 2. /api/usage/jobs — Async long-running job progress tracking and state recovery
 */

import { verifyRequestAuth } from './_lib/authGuard.js';
import { applyCorsHeaders } from './_lib/cors.js';
import {
  getUserUsageSnapshot,
  createProcessingJob,
  getProcessingJob,
  updateJobProgress,
  completeProcessingJob,
  failProcessingJob,
  type AssistiveQuotaCategory,
} from './_lib/usageQuotaEngine.js';

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  const url = (req.url || '').toLowerCase();
  const isJobs = url.includes('/jobs') || req.query?.type === 'jobs';

  if (isJobs) {
    const auth = await verifyRequestAuth(req);
    if (!auth.authenticated || !auth.uid) {
      res.status(401).json({ error: 'Authentication required to track processing jobs.' });
      return;
    }
    const uid = auth.uid;

    if (req.method === 'GET') {
      const parsedUrl = new URL(req.url || '', 'http://localhost');
      const jobId = parsedUrl.searchParams.get('jobId') || req.query?.jobId;

      if (!jobId) {
        res.status(400).json({ error: 'jobId query parameter is required' });
        return;
      }

      const job = getProcessingJob(jobId, uid);
      if (!job) {
        res.status(404).json({ error: 'Job not found or access denied' });
        return;
      }

      res.status(200).json(job);
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = req.body || {};
        const { action, jobId, category = 'audio_transcription', totalChunks = 1, completedChunks, result, error } = body;

        if (action === 'create') {
          const newJob = createProcessingJob(uid, category as AssistiveQuotaCategory, totalChunks);
          res.status(201).json(newJob);
          return;
        }

        if (!jobId) {
          res.status(400).json({ error: 'jobId is required for this action' });
          return;
        }

        const existing = getProcessingJob(jobId, uid);
        if (!existing) {
          res.status(404).json({ error: 'Job not found or access denied' });
          return;
        }

        if (action === 'update') {
          const updated = updateJobProgress(jobId, completedChunks ?? existing.completedChunks);
          res.status(200).json(updated);
          return;
        }

        if (action === 'complete') {
          const completed = completeProcessingJob(jobId, result);
          res.status(200).json(completed);
          return;
        }

        if (action === 'fail') {
          const failed = failProcessingJob(jobId, error || 'Processing failed');
          res.status(200).json(failed);
          return;
        }

        res.status(400).json({ error: 'Invalid action. Supported: create, update, complete, fail' });
      } catch (err: any) {
        console.error('[api/usage/jobs] Error processing job action:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
      }
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Otherwise, handle quota request (/api/usage/quota or default /api/usage)
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
