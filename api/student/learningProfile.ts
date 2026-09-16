/**
 * Personal Learning Profile API Endpoint
 * Phase 2C - Sprint 1 (Intelligence -> Product)
 *
 * Exposes the canonical PersonalLearningProfile contract computed strictly
 * from the student's unified state and Personal Learning Model (PLM).
 *
 * Route: GET /api/student/learningProfile?uid=...&displayName=...
 *        POST /api/student/learningProfile { uid, displayName, studentState? }
 */

import { generatePersonalLearningProfile } from '../../src/lib/learningProfileService';
import { createInitialStudentState } from '../../src/lib/studentStateEngine';
import type { PersonalLearningProfile, StudentState } from '../../src/types/studentState';

async function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on?.('data', (chunk: any) => {
      raw += chunk;
    });
    req.on?.('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    if (!req.on) {
      resolve({});
    }
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store, max-age=0');
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    let body: any = {};
    if (req.method === 'POST') {
      body = await parseBody(req);
    }

    const query = req.query || {};
    const uid = body.uid || query.uid || 'guest';
    const displayName = body.displayName || query.displayName;
    const providedState: StudentState | undefined = body.studentState;

    let state: StudentState;
    if (providedState && typeof providedState === 'object' && providedState.conceptMastery) {
      state = providedState;
    } else {
      state = createInitialStudentState(uid);
    }

    const profile: PersonalLearningProfile = generatePersonalLearningProfile(state, displayName);

    return res.status(200).json({
      success: true,
      profile,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[API /api/student/learningProfile] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to compute personal learning profile',
    });
  }
}
