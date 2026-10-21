/**
 * API Endpoint: /api/usage/jobs
 * Manages async long-running job progress tracking and state recovery
 * for audio transcription and multi-page document processing.
 */

import { verifyRequestAuth } from '../_lib/authGuard.js';
import { applyCorsHeaders } from '../_lib/cors.js';
import {
  createProcessingJob,
  getProcessingJob,
  updateJobProgress,
  completeProcessingJob,
  failProcessingJob,
  type AssistiveQuotaCategory,
} from '../_lib/usageQuotaEngine.js';

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  const auth = await verifyRequestAuth(req);
  if (!auth.authenticated || !auth.uid) {
    res.status(401).json({ error: 'Authentication required to track processing jobs.' });
    return;
  }
  const uid = auth.uid;

  if (req.method === 'GET') {
    const url = new URL(req.url || '', 'http://localhost');
    const jobId = url.searchParams.get('jobId') || req.query?.jobId;

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

      // Verify ownership before modifying
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
}
