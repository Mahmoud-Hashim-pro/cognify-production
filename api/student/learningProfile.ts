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

import { generatePersonalLearningProfile } from '../../src/lib/learningProfileService.js';
import { createInitialStudentState } from '../../src/lib/studentStateEngine.js';
import type { PersonalLearningProfile, StudentState } from '../../src/types/studentState.js';
import { verifyRequestAuth, extractBearerToken } from '../_lib/authGuard.js';
import { applyCorsHeaders } from '../_lib/cors.js';

interface ParsedBodyResult {
  body: any;
  malformed?: boolean;
}

async function parseBody(req: any): Promise<ParsedBodyResult> {
  if (req.body && typeof req.body === 'object') return { body: req.body };
  if (typeof req.body === 'string') {
    if (!req.body.trim()) return { body: {} };
    try {
      return { body: JSON.parse(req.body) };
    } catch {
      return { body: {}, malformed: true };
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on?.('data', (chunk: any) => {
      raw += chunk;
    });
    req.on?.('end', () => {
      const trimmed = raw.trim();
      if (!trimmed) return resolve({ body: {} });
      try {
        resolve({ body: JSON.parse(trimmed) });
      } catch {
        resolve({ body: {}, malformed: true });
      }
    });
    if (!req.on) {
      resolve({ body: {} });
    }
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store, max-age=0');
  if (!applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader?.('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed: Only GET and POST requests are supported.',
    });
  }

  try {
    let body: any = {};
    if (req.method === 'POST') {
      const parsed = await parseBody(req);
      if (parsed.malformed) {
        return res.status(400).json({
          success: false,
          error: 'Malformed request: Invalid JSON payload in request body.',
        });
      }
      body = parsed.body || {};
    }

    const query = req.query || {};
    const targetUid = String(body.uid || query.uid || '').trim();
    const displayName = body.displayName || query.displayName;
    const providedState: StudentState | undefined = body.studentState;

    // 1. Schema Validation for Request Metadata
    if (displayName !== undefined && displayName !== null) {
      if (typeof displayName !== 'string' || displayName.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Malformed request: displayName must be a string with maximum length of 100 characters.',
        });
      }
    }

    // 2. Authentication & Object-Level Authorization (OWASP API1 & API2 BOLA/IDOR Defense)
    let effectiveUid = 'guest';
    const token = extractBearerToken(req);

    if (token) {
      const auth = await verifyRequestAuth(req);
      if (!auth.authenticated || !auth.uid) {
        return res.status(401).json({
          success: false,
          error: auth.error || 'Authentication required: Invalid or expired token.',
        });
      }

      // Check for authorized teacher, org manager, or administrator role
      const isStaff = Boolean(
        auth.isSuperAdmin === true ||
        auth.role === 'admin' ||
        auth.role === 'superadmin' ||
        auth.role === 'teacher' ||
        auth.role === 'org_manager' ||
        auth.claims?.role === 'admin' ||
        auth.claims?.role === 'teacher' ||
        auth.claims?.role === 'org_manager' ||
        auth.claims?.role === 'superadmin' ||
        auth.claims?.admin === true
      );

      if (isStaff) {
        // Staff members may read or assess any specific student profile
        effectiveUid = targetUid || auth.uid;
      } else {
        // Standard students are strictly restricted to their own verified identity
        if (targetUid && targetUid !== 'guest' && targetUid !== auth.uid) {
          return res.status(403).json({
            success: false,
            error: `BOLA/IDOR Forbidden: Authenticated user (${auth.uid}) cannot access or modify student profile of (${targetUid}).`,
          });
        }

        // Student State Identity Spoofing Guard
        if (providedState?.uid && providedState.uid !== auth.uid) {
          return res.status(403).json({
            success: false,
            error: `BOLA/IDOR Forbidden: State identity (${providedState.uid}) does not match authenticated identity (${auth.uid}).`,
          });
        }

        // Derive acting user's identity strictly from trusted server-verified authentication
        effectiveUid = auth.uid;
      }
    } else if (process.env.NODE_ENV === 'production' && targetUid && targetUid !== 'guest') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing Authorization Bearer token.',
      });
    } else {
      effectiveUid = targetUid || 'guest';
    }

    // 3. Schema & Integrity Validation on providedState
    if (providedState !== undefined && providedState !== null) {
      if (typeof providedState !== 'object' || Array.isArray(providedState)) {
        return res.status(400).json({
          success: false,
          error: 'Malformed request: studentState must be a valid object.',
        });
      }

      // Concept Mastery Validation
      if (providedState.conceptMastery !== undefined && providedState.conceptMastery !== null) {
        if (typeof providedState.conceptMastery !== 'object' || Array.isArray(providedState.conceptMastery)) {
          return res.status(400).json({
            success: false,
            error: 'Malformed request: conceptMastery must be a valid dictionary of concept records.',
          });
        }

        for (const [conceptId, record] of Object.entries(providedState.conceptMastery as Record<string, any>)) {
          if (!record || typeof record !== 'object' || Array.isArray(record)) {
            return res.status(400).json({
              success: false,
              error: `Malformed request: conceptMastery record for '${conceptId}' must be an object.`,
            });
          }

          const attempts = Number(record.attempts);
          const correct = Number(record.correct);
          const accuracy = Number(record.accuracy);

          if (isNaN(attempts) || isNaN(correct) || isNaN(accuracy)) {
            return res.status(400).json({
              success: false,
              error: `Validation error: attempts, correct, and accuracy in '${conceptId}' must be valid numbers.`,
            });
          }

          if (attempts < 0 || correct < 0 || accuracy < 0) {
            return res.status(400).json({
              success: false,
              error: `Validation error: attempts, correct, and accuracy cannot be negative for concept '${conceptId}'.`,
            });
          }

          if (correct > attempts) {
            return res.status(400).json({
              success: false,
              error: `Integrity validation failed: invalid mastery history (correct > attempts) for concept '${conceptId}'.`,
            });
          }

          // Prevent client spoofing of arbitrary unearned 100% mastery without history
          const claimsFullMastery = accuracy >= 1.0 || accuracy >= 100;
          if (claimsFullMastery && (attempts <= 0 || correct <= 0)) {
            return res.status(400).json({
              success: false,
              error: `Integrity validation failed: arbitrary unearned 100% mastery without history detected for concept '${conceptId}'.`,
            });
          }

          if (accuracy > 0 && attempts === 0) {
            return res.status(400).json({
              success: false,
              error: `Integrity validation failed: arbitrary accuracy with 0 attempts for concept '${conceptId}'.`,
            });
          }
        }
      }

      // Personal Learning Model (PLM) Concept Profiles Validation
      if (
        providedState.personalLearningModel?.conceptProfiles !== undefined &&
        providedState.personalLearningModel.conceptProfiles !== null
      ) {
        if (
          typeof providedState.personalLearningModel.conceptProfiles !== 'object' ||
          Array.isArray(providedState.personalLearningModel.conceptProfiles)
        ) {
          return res.status(400).json({
            success: false,
            error: 'Malformed request: personalLearningModel.conceptProfiles must be an object.',
          });
        }

        for (const [conceptId, profile] of Object.entries(
          providedState.personalLearningModel.conceptProfiles as Record<string, any>
        )) {
          if (!profile || typeof profile !== 'object' || Array.isArray(profile)) continue;
          const totalAttempts = Number(profile.totalAttempts);
          const mastery = Number(profile.mastery);

          if (isNaN(totalAttempts) || isNaN(mastery) || totalAttempts < 0 || mastery < 0) {
            return res.status(400).json({
              success: false,
              error: `Validation error: totalAttempts and mastery must be non-negative numbers in conceptProfile for '${conceptId}'.`,
            });
          }

          if ((mastery >= 1.0 || mastery >= 100 || mastery > 0) && totalAttempts <= 0) {
            return res.status(400).json({
              success: false,
              error: `Integrity validation failed: arbitrary unearned 100% mastery in PLM without history detected for concept '${conceptId}'.`,
            });
          }
        }
      }
    }

    // 4. Construct authoritative StudentState & generate PersonalLearningProfile
    let state: StudentState;
    if (providedState && typeof providedState === 'object' && providedState.conceptMastery) {
      const initial = createInitialStudentState(effectiveUid);
      state = { ...initial, ...providedState, uid: effectiveUid };
    } else {
      state = createInitialStudentState(effectiveUid);
    }

    const profile: PersonalLearningProfile = generatePersonalLearningProfile(state, displayName);

    return res.status(200).json({
      success: true,
      profile,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    // 5. Sanitized Error Handling (Never leak stack traces, tokens, or private data)
    const errorType = err instanceof Error ? err.name : 'UnknownError';
    console.error(`[API /api/student/learningProfile] Service error (${errorType})`);

    const safeError = process.env.NODE_ENV === 'production'
      ? 'Failed to compute personal learning profile. Please try again later.'
      : (err?.message || 'Failed to compute personal learning profile');

    return res.status(500).json({
      success: false,
      error: safeError,
    });
  }
}
