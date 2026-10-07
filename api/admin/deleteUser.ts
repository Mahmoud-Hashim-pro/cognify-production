/**
 * Cognify Server-Side Admin User Deletion Endpoint
 * 
 * Complies with GDPR Art. 17 (Right to Erasure) and Enterprise Admin Access Control.
 * Allows verified Super Admins to permanently purge a user account:
 * 1. Verifies caller authentication ID token and enforces Super Admin privileges.
 * 2. Rate-limited to prevent abuse (10 deletions/min per operator).
 * 3. Enforces protected account safeguards (self-deletion & permanent accounts).
 * 4. Cascade deletes all 11 user Firestore subcollections and root document server-side using authorized REST requests.
 * 5. Purges Firebase Auth user account via Google Identity Toolkit when service credentials are present.
 * 6. Returns deterministic audit manifest.
 */
import { applyCorsHeaders } from '../_lib/cors.js';
import { verifyRequestAuth, extractBearerToken } from '../_lib/authGuard.js';
import { checkDistributedRateLimit } from '../_lib/rateLimiter.js';

// Parses comma-separated email lists from environment variables
function parseEnvEmails(...keys: string[]): string[] {
  for (const k of keys) {
    const val = process.env[k];
    if (val && typeof val === 'string') {
      return val.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    }
  }
  return [];
}

// Protected permanent super-admins and admins (read from environment variables)
export function getProtectedSuperAdmins(): string[] {
  const envList = parseEnvEmails('FOUNDER_SUPERADMIN_EMAILS', 'VITE_FOUNDER_SUPERADMIN_EMAILS');
  if (envList.length > 0) return envList;
  // In non-production test mode, fallback to standard fixture emails.
  // In production, strictly fail-closed with empty list to prevent unconfigured placeholder takeovers.
  if (process.env.NODE_ENV !== 'production') {
    return ['admin@cognify.com', 'superadmin@cognify.edu'];
  }
  return [];
}

export function getProtectedAdmins(): string[] {
  return parseEnvEmails('ADMIN_EMAILS', 'VITE_ADMIN_EMAILS');
}

export function getBlockedSuperAdmins(): string[] {
  return parseEnvEmails('BLOCKED_SUPERADMIN_EMAILS', 'VITE_BLOCKED_SUPERADMIN_EMAILS');
}

import { USER_SUBCOLLECTIONS } from '../../src/types/privacySecurity.js';
export { USER_SUBCOLLECTIONS };

/**
 * Validates whether the caller has Super Admin privileges.
 * Checks Custom Claims, Environment Variable allowlists, and caller's Firestore document.
 */
export async function verifySuperAdminPrivileges(
  auth: { uid?: string; email?: string; emailVerified?: boolean; role?: string; isSuperAdmin?: boolean; claims?: any },
  bearerToken: string,
  projectId: string
): Promise<boolean> {
  if (!auth?.uid) return false;
  const callerEmail = (auth.email || '').toLowerCase().trim();

  // 1. Explicitly revoked / blocked super admins cannot perform deletions
  const blocked = getBlockedSuperAdmins();
  if (callerEmail && blocked.includes(callerEmail)) {
    return false;
  }

  // 2. Custom Claims role check (primary cryptographically verified check)
  if (auth.isSuperAdmin === true || auth.role === 'superadmin' || auth.claims?.role === 'superadmin') {
    return true;
  }

  // 3. Environment Variable Super Admin allowlist check — STRICT REQUIREMENT: email MUST be verified!
  const founderSuperAdmins = getProtectedSuperAdmins();
  if (auth.emailVerified === true && callerEmail && founderSuperAdmins.includes(callerEmail)) {
    return true;
  }

  // 4. Test mode deterministic bypass for local test suites (ONLY when explicitly permitted)
  const isTestAuthPermitted = process.env.NODE_ENV !== 'production' && (
    process.env.ALLOW_TEST_AUTH === '1' ||
    process.env.ALLOW_TEST_AUTH === 'true' ||
    process.env.NODE_ENV === 'test'
  );
  if (isTestAuthPermitted && (auth.uid.includes('superadmin') || auth.uid.includes('founder'))) {
    return true;
  }

  // 5. Check caller's own Firestore user document (/users/{callerUid})
  // Since every authenticated user can read their own document per firestore.rules, this query is authorized.
  try {
    const callerDocUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${auth.uid}`;
    const callerRes = await fetch(callerDocUrl, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (callerRes.ok) {
      const data = await callerRes.json();
      const isSuper = data.fields?.isSuperAdmin?.booleanValue === true;
      const docEmail = data.fields?.email?.stringValue?.toLowerCase().trim();
      if (docEmail && blocked.includes(docEmail)) {
        return false;
      }
      if (isSuper || (auth.emailVerified === true && docEmail && founderSuperAdmins.includes(docEmail))) {
        return true;
      }
    }
  } catch (fsErr) {
    console.warn('[adminDeleteUser] Error verifying caller profile in Firestore:', fsErr);
  }

  return false;
}

export default async function deleteUserHandler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const bearerToken = extractBearerToken(req);

  // 1. Authentication Guard: require valid Firebase token
  const auth = await verifyRequestAuth(req);
  if (!auth.authenticated || !auth.uid || !bearerToken) {
    return res.status(401).json({ error: 'Unauthorized: Valid Firebase Bearer token required' });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0347404066';

  // 2. Authorization Guard: verify caller possesses Super Admin privileges
  const hasSuperAdminPrivileges = await verifySuperAdminPrivileges(auth, bearerToken, projectId);
  if (!hasSuperAdminPrivileges) {
    return res.status(403).json({ error: 'Forbidden: Super Admin privileges required to delete users' });
  }

  // 3. Rate Limiting (10 deletions per minute per operator UID / IP)
  const clientIp = (req.headers && req.headers['x-forwarded-for']) || req.socket?.remoteAddress || auth.uid;
  const rateLimitKey = `admin_delete_user_${auth.uid || clientIp}`;
  const rateResult = await checkDistributedRateLimit(rateLimitKey, 10);
  if (!rateResult.allowed) {
    return res.status(429).json({ error: 'Too Many Requests: Rate limit exceeded (maximum 10 deletions per minute)' });
  }

  const { targetUid, targetEmail } = req.body || {};
  if (!targetUid || typeof targetUid !== 'string' || !targetUid.trim()) {
    return res.status(400).json({ error: 'Missing or invalid targetUid in request body' });
  }

  // 4. Safety Guard: Self-deletion via admin endpoint is strictly forbidden
  if (auth.uid === targetUid) {
    return res.status(400).json({ error: 'Self-deletion via admin endpoint is not permitted' });
  }

  // 5. Safety Guard: Protected Permanent Accounts cannot be deleted
  const protectedEmails = [...getProtectedSuperAdmins(), ...getProtectedAdmins()];
  if (targetEmail && protectedEmails.includes(targetEmail.toLowerCase().trim())) {
    return res.status(403).json({ error: 'Protected Account: Permanent Super Admins and Founders cannot be deleted' });
  }

  // Configure authorization headers for Firestore REST calls
  const firestoreHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${bearerToken}`,
  };

  const serviceToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN || process.env.FIREBASE_ADMIN_TOKEN;
  if (serviceToken) {
    firestoreHeaders['Authorization'] = `Bearer ${serviceToken}`;
  }

  // 6. Safety Guard: Inspect target document in Firestore to prevent UID-only deletion bypass
  try {
    const targetDocUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${targetUid}`;
    const targetDocRes = await fetch(targetDocUrl, { headers: firestoreHeaders });
    if (targetDocRes.ok) {
      const targetData = await targetDocRes.json();
      const storedEmail = targetData.fields?.email?.stringValue?.toLowerCase().trim();
      if (storedEmail && protectedEmails.includes(storedEmail)) {
        return res.status(403).json({ error: 'Protected Account: Permanent Super Admins and Founders cannot be deleted' });
      }
      if (targetData.fields?.isFounder?.booleanValue === true) {
        return res.status(403).json({ error: 'Protected Account: Founder accounts cannot be deleted' });
      }
    }
  } catch (inspectErr) {
    console.warn('[adminDeleteUser] Target doc inspection error:', inspectErr);
  }

  let firestorePurged = false;
  let userDocDeleted = false;
  let authPurged = false;
  let subcollectionsPurgedCount = 0;
  const deletionFailures: string[] = [];

  // 7. Server-Side Cascade Delete of Firestore Data with Authorization Headers & Pagination Loop
  try {
    for (const sub of USER_SUBCOLLECTIONS) {
      try {
        let pageToken: string | undefined;
        let subCollectionHadDocs = false;

        do {
          const pageTokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
          const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${targetUid}/${sub}?pageSize=100${pageTokenParam}`;
          const listRes = await fetch(listUrl, { headers: firestoreHeaders });

          if (!listRes.ok) {
            deletionFailures.push(`${sub}: list failed with HTTP ${listRes.status}`);
            break;
          }

          const data = await listRes.json();
          if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
            subCollectionHadDocs = true;

            const results = await Promise.all(
              data.documents.map(async (docItem: any) => {
                try {
                  const deleteRes = await fetch(`https://firestore.googleapis.com/v1/${docItem.name}`, {
                    method: 'DELETE',
                    headers: firestoreHeaders,
                  });
                  if (!deleteRes.ok && deleteRes.status !== 404) {
                    return `${docItem.name}: HTTP ${deleteRes.status}`;
                  }
                  return null;
                } catch (deleteErr: any) {
                  return `${docItem.name}: ${deleteErr?.message || 'delete request failed'}`;
                }
              })
            );

            const failedDocs = results.filter(Boolean) as string[];
            if (failedDocs.length > 0) {
              deletionFailures.push(...failedDocs);
            }
          }

          pageToken = data.nextPageToken;
        } while (pageToken);

        if (subCollectionHadDocs && !deletionFailures.some((failure) => failure.startsWith(`${sub}:`))) {
          subcollectionsPurgedCount++;
        }
      } catch (subErr: any) {
        deletionFailures.push(`${sub}: ${subErr?.message || 'unexpected deletion error'}`);
        console.warn(`[adminDeleteUser] Subcollection ${sub} wipe warning:`, subErr);
      }
    }

    // Delete root user document only after attempting every subcollection.
    const userDocUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${targetUid}`;
    const userDelRes = await fetch(userDocUrl, {
      method: 'DELETE',
      headers: firestoreHeaders,
    });

    if (userDelRes.ok || userDelRes.status === 404) {
      userDocDeleted = true;
    } else {
      deletionFailures.push(`users/${targetUid}: HTTP ${userDelRes.status}`);
    }

    firestorePurged = userDocDeleted && deletionFailures.length === 0;
  } catch (fsErr: any) {
    deletionFailures.push(`firestore: ${fsErr?.message || 'unexpected Firestore purge error'}`);
    console.warn('[adminDeleteUser] Firestore purge notice:', fsErr);
  }

  // 8. Firebase Auth deletion requires explicit server credentials.
  if (serviceToken) {
    try {
      const deleteAuthUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`;
      const authDelRes = await fetch(deleteAuthUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceToken}`
        },
        body: JSON.stringify({ localId: [targetUid] })
      });
      if (authDelRes.ok) {
        authPurged = true;
      } else {
        deletionFailures.push(`firebaseAuth: HTTP ${authDelRes.status}`);
      }
    } catch (authErr: any) {
      deletionFailures.push(`firebaseAuth: ${authErr?.message || 'Auth deletion failed'}`);
      console.warn('[adminDeleteUser] Auth purge warning:', authErr);
    }
  } else {
    deletionFailures.push('firebaseAuth: service credentials are not configured');
  }

  const fullyPurged = firestorePurged && userDocDeleted && authPurged;
  const partialDeletion = !fullyPurged;
  const statusCode = fullyPurged ? 200 : 500;

  return res.status(statusCode).json({
    success: fullyPurged,
    targetUid,
    firestorePurged,
    userDocDeleted,
    subcollectionsPurgedCount,
    authPurged,
    fullyPurged,
    partialDeletion,
    operatorUid: auth.uid,
    timestamp: new Date().toISOString(),
    failures: deletionFailures.slice(0, 20),
    message: fullyPurged
      ? `User ${targetUid} records, subcollections, and Firebase Auth account permanently purged from system.`
      : `User ${targetUid} deletion is incomplete. Review failures and retry the purge after fixing the reported configuration or deletion errors.`
  });
}
