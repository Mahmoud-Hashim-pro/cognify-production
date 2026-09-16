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
import { verifyRequestAuth, extractBearerToken } from '../_lib/authGuard.js';
import { applyCorsHeaders } from '../_lib/cors.js';

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
  if (!applyCorsHeaders(req, res)) {
    return;
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

    // OWASP API Security API1:2023 (BOLA / IDOR Defense) & API2:2023 (Authentication)
    const token = extractBearerToken(req);
    if (token) {
      const auth = await verifyRequestAuth(req);
      if (!auth.authenticated || !auth.uid) {
        return res.status(401).json({
          success: false,
          error: auth.error || 'Authentication required: Invalid or expired token.',
        });
      }

      // Check for Cross-User IDOR / BOLA Attempt
      if (uid !== 'guest' && uid !== auth.uid) {
        return res.status(403).json({
          success: false,
          error: `BOLA/IDOR Forbidden: Authenticated user (${auth.uid}) cannot access or modify student profile of (${uid}).`,
        });
      }

      // Check for Student State Spoofing
      if (providedState?.uid && providedState.uid !== auth.uid) {
        return res.status(403).json({
          success: false,
          error: `BOLA/IDOR Forbidden: State identity (${providedState.uid}) does not match authenticated identity (${auth.uid}).`,
        });
      }
    } else if (process.env.NODE_ENV === 'production' && uid !== 'guest') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing Authorization Bearer token.',
      });
    }

    // Integrity Validation: Validate incoming providedState to prevent client spoofing of arbitrary unearned 100% mastery without history
    if (providedState?.conceptMastery && typeof providedState.conceptMastery === 'object') {
      for (const [conceptId, record] of Object.entries(providedState.conceptMastery as Record<string, any>)) {
        if (!record || typeof record !== 'object') continue;
        const attempts = Number(record.attempts) || 0;
        const correct = Number(record.correct) || 0;
        const accuracy = Number(record.accuracy) || 0;

        // Prevent client spoofing of arbitrary unearned 100% mastery without history
        const claimsFullMastery = accuracy >= 1.0 || accuracy >= 100;
        if (claimsFullMastery && (attempts <= 0 || correct <= 0)) {
          return res.status(400).json({
            success: false,
            error: `Integrity validation failed: arbitrary unearned 100% mastery without history detected for concept '${conceptId}'.`,
          });
        }
        if (correct > attempts) {
          return res.status(400).json({
            success: false,
            error: `Integrity validation failed: invalid mastery history (correct > attempts) for concept '${conceptId}'.`,
          });
        }
      }
    }

    if (providedState?.personalLearningModel?.conceptProfiles && typeof providedState.personalLearningModel.conceptProfiles === 'object') {
      for (const [conceptId, profile] of Object.entries(providedState.personalLearningModel.conceptProfiles as Record<string, any>)) {
        if (!profile || typeof profile !== 'object') continue;
        const totalAttempts = Number(profile.totalAttempts) || 0;
        const mastery = Number(profile.mastery) || 0;
        if ((mastery >= 1.0 || mastery >= 100) && totalAttempts <= 0) {
          return res.status(400).json({
            success: false,
            error: `Integrity validation failed: arbitrary unearned 100% mastery in PLM without history detected for concept '${conceptId}'.`,
          });
        }
      }
    }

    let state: StudentState;
    if (providedState && typeof providedState === 'object' && providedState.conceptMastery) {
      const initial = createInitialStudentState(uid);
      state = { ...initial, ...providedState, uid };
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
