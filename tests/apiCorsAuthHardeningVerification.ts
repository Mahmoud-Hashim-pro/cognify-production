/**
 * Verification Test Suite: API, CORS & Auth Guard Hardening
 *
 * Verifies:
 * 1. isAllowedOrigin & applyCorsHeaders (ALLOWED_ORIGINS, VERCEL_URL, dev origins, preflight OPTIONS)
 * 2. api/student/learningProfile CORS & integrity validation (preventing unearned 100% mastery spoofing)
 * 3. api/telemetry/securityAudit CORS, IP rate limiting (15 req/min), and payload size/format validation (<4KB)
 * 4. api/_lib/authGuard fail-closed behavior in production (throws without Vercel/Cloud Run fallback)
 * 5. server.ts 2MB body limit verification
 * 6. api/gemini/generateAdaptiveResponse & Stream payload validation (32k char cap & 5 attachments cap)
 */

import { isAllowedOrigin, applyCorsHeaders } from '../api/_lib/cors.js';
import { getExpectedProjectId } from '../api/_lib/authGuard.js';
import learningProfileHandler from '../api/student/learningProfile.js';
import securityAuditHandler from '../api/telemetry/securityAudit.js';
import generateAdaptiveResponseHandler from '../api/gemini/generateAdaptiveResponse.js';
import generateAdaptiveResponseStreamHandler from '../api/gemini/generateAdaptiveResponseStream.js';
import fs from 'fs';
import path from 'path';

export async function runApiCorsAuthHardeningVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n====================================================================');
  console.log('🛡️ API, CORS & AUTH GUARD HARDENING VERIFICATION');
  console.log('====================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // Group 1: CORS & Origin Validation (api/_lib/cors.ts)
  // --------------------------------------------------------------------------
  console.log('\nGroup 1: CORS & Origin Validation (api/_lib/cors.ts)');
  {
    // Canonical production origin
    assert(isAllowedOrigin('https://my-cognify-app.vercel.app') === true, 'Allows canonical production origin');

    // Non-production localhost / dev origins
    assert(isAllowedOrigin('http://localhost:5173') === true, 'Allows http://localhost:5173 in non-production');
    assert(isAllowedOrigin('http://localhost:3000') === true, 'Allows http://localhost:3000 in non-production');
    assert(isAllowedOrigin('http://127.0.0.1:5173') === true, 'Allows http://127.0.0.1:5173 in non-production');

    // Disallowed origins
    assert(isAllowedOrigin('https://malicious-site.com') === false, 'Rejects arbitrary malicious origin');
    assert(isAllowedOrigin('http://localhost:8080') === false, 'Rejects unauthorized port');
    assert(isAllowedOrigin(undefined) === false, 'Rejects undefined origin');
    assert(isAllowedOrigin('') === false, 'Rejects empty origin');

    // Dynamic ALLOWED_ORIGINS env variable
    const prevAllowed = process.env.ALLOWED_ORIGINS;
    try {
      process.env.ALLOWED_ORIGINS = 'https://custom-partner.edu, https://staging.cognify.internal';
      assert(isAllowedOrigin('https://custom-partner.edu') === true, 'Allows origin from ALLOWED_ORIGINS');
      assert(isAllowedOrigin('https://staging.cognify.internal') === true, 'Allows second origin from ALLOWED_ORIGINS');
    } finally {
      if (prevAllowed !== undefined) process.env.ALLOWED_ORIGINS = prevAllowed;
      else delete process.env.ALLOWED_ORIGINS;
    }

    // Dynamic VERCEL_URL env variable (with & without https://)
    const prevVercel = process.env.VERCEL_URL;
    try {
      process.env.VERCEL_URL = 'preview-branch-abc.vercel.app';
      assert(isAllowedOrigin('https://preview-branch-abc.vercel.app') === true, 'Allows VERCEL_URL with prepended https://');

      process.env.VERCEL_URL = 'https://explicit-preview.vercel.app';
      assert(isAllowedOrigin('https://explicit-preview.vercel.app') === true, 'Allows explicit https:// VERCEL_URL');
    } finally {
      if (prevVercel !== undefined) process.env.VERCEL_URL = prevVercel;
      else delete process.env.VERCEL_URL;
    }

    // In production mode, non-prod origins must NOT be allowed
    const prevNodeEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      assert(isAllowedOrigin('http://localhost:5173') === false, 'Rejects localhost in production NODE_ENV');
      assert(isAllowedOrigin('https://my-cognify-app.vercel.app') === true, 'Still allows canonical origin in production');
    } finally {
      (process.env as any).NODE_ENV = prevNodeEnv;
    }

    // applyCorsHeaders behavior: Preflight OPTIONS
    const preflight = { ended: false, status: 0 };
    const preflightHeaders: Record<string, string> = {};
    const mockOptionsReq = {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:5173' },
    };
    const mockOptionsRes = {
      setHeader: (k: string, v: string) => { preflightHeaders[k] = v; },
      status: (code: number) => {
        preflight.status = code;
        return {
          end: () => { preflight.ended = true; },
        };
      },
    };

    const optionsAllowed = applyCorsHeaders(mockOptionsReq, mockOptionsRes);
    assert(optionsAllowed === false, 'applyCorsHeaders returns false for OPTIONS preflight');
    assert(preflight.status === 204, 'OPTIONS preflight responds with HTTP 204');
    assert(preflight.ended === true, 'OPTIONS preflight ends response cleanly');
    assert(preflightHeaders['Access-Control-Allow-Origin'] === 'http://localhost:5173', 'OPTIONS sets matched origin');
    assert(preflightHeaders['Access-Control-Allow-Methods'].includes('OPTIONS'), 'OPTIONS sets Allow-Methods');

    // applyCorsHeaders behavior: Disallowed Origin
    let blockedStatus = 0;
    let blockedBody: any = null;
    const mockDisallowedReq = {
      method: 'POST',
      headers: { origin: 'https://attacker.com' },
    };
    const mockDisallowedRes = {
      setHeader: () => {},
      status: (code: number) => {
        blockedStatus = code;
        return {
          json: (b: any) => { blockedBody = b; return b; },
          end: () => {},
        };
      },
    };
    const disallowedAllowed = applyCorsHeaders(mockDisallowedReq, mockDisallowedRes);
    assert(disallowedAllowed === false, 'applyCorsHeaders rejects disallowed origin with false');
    assert(blockedStatus === 403, 'applyCorsHeaders responds with HTTP 403 Forbidden');
    assert(blockedBody?.error?.includes('Origin not allowed'), 'applyCorsHeaders error message cites origin disallowed');
  }

  // --------------------------------------------------------------------------
  // Group 2: Student Learning Profile Integrity Validation
  // --------------------------------------------------------------------------
  console.log('\nGroup 2: Student Learning Profile Integrity Validation (api/student/learningProfile.ts)');
  {
    const makeRes = () => {
      let code = 0;
      let body: any = null;
      return {
        res: {
          setHeader: () => {},
          status: (c: number) => {
            code = c;
            return {
              json: (b: any) => { body = b; return b; },
              end: () => {},
            };
          },
        },
        getCode: () => code,
        getBody: () => body,
      };
    };

    // 1. Spoofed unearned 100% mastery without history (attempts: 0)
    const spoofReq1 = {
      method: 'POST',
      body: {
        uid: 'guest',
        studentState: {
          uid: 'guest',
          conceptMastery: {
            pointers: {
              conceptId: 'pointers',
              accuracy: 1.0, // 100% mastery
              attempts: 0,   // Zero attempts!
              correct: 0,
            },
          },
        },
      },
      headers: { 'content-type': 'application/json' },
    };
    const m1 = makeRes();
    await learningProfileHandler(spoofReq1, m1.res);
    assert(m1.getCode() === 400, 'Rejects unearned 100% mastery with 0 attempts (HTTP 400)');
    assert(m1.getBody()?.error?.includes('unearned 100% mastery without history'), 'Error message cites unearned 100% mastery without history');

    // 2. Spoofed impossible ratio (correct > attempts)
    const spoofReq2 = {
      method: 'POST',
      body: {
        uid: 'guest',
        studentState: {
          uid: 'guest',
          conceptMastery: {
            pointers: {
              conceptId: 'pointers',
              accuracy: 1.0,
              attempts: 2,
              correct: 5, // More correct than attempts!
            },
          },
        },
      },
      headers: { 'content-type': 'application/json' },
    };
    const m2 = makeRes();
    await learningProfileHandler(spoofReq2, m2.res);
    assert(m2.getCode() === 400, 'Rejects invalid history where correct > attempts (HTTP 400)');

    // 3. Legitimate earned mastery with valid history
    const validReq = {
      method: 'POST',
      body: {
        uid: 'guest',
        studentState: {
          uid: 'guest',
          conceptMastery: {
            pointers: {
              conceptId: 'pointers',
              accuracy: 1.0,
              attempts: 5,
              correct: 5, // Earned 5/5
              confidence: 0.9,
            },
          },
        },
      },
      headers: { 'content-type': 'application/json' },
    };
    const m3 = makeRes();
    await learningProfileHandler(validReq, m3.res);
    assert(m3.getCode() === 200, 'Accepts legitimate earned mastery with valid history (HTTP 200)');
    assert(m3.getBody()?.success === true, 'Legitimate profile generated successfully');
  }

  // --------------------------------------------------------------------------
  // Group 3: Telemetry Security Audit (Rate Limit & Payload Guard)
  // --------------------------------------------------------------------------
  console.log('\nGroup 3: Telemetry Security Audit (api/telemetry/securityAudit.ts)');
  {
    const makeRes = () => {
      let code = 0;
      let body: any = null;
      let headers: Record<string, string> = {};
      return {
        res: {
          setHeader: (k: string, v: string) => { headers[k] = v; },
          status: (c: number) => {
            code = c;
            return {
              json: (b: any) => { body = b; return b; },
              end: () => {},
            };
          },
        },
        getCode: () => code,
        getBody: () => body,
        getHeaders: () => headers,
      };
    };

    // 1. IP Rate Limiting: 15 requests allowed, 16th throttled with 429
    const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
    let rateLimitedOn16 = false;
    for (let i = 1; i <= 15; i++) {
      const m = makeRes();
      await securityAuditHandler({
        headers: { 'x-forwarded-for': testIp },
      }, m.res);
      assert(m.getCode() === 200, `Audit request ${i}/15 permitted within rate limit`);
    }

    const throttledM = makeRes();
    await securityAuditHandler({
      headers: { 'x-forwarded-for': testIp },
    }, throttledM.res);
    assert(throttledM.getCode() === 429, '16th audit request within 1 minute throttled with HTTP 429');
    assert(throttledM.getBody()?.error?.includes('Rate limit exceeded'), 'Error message cites rate limit exceeded');
    assert(!!throttledM.getHeaders()['Retry-After'], 'Sets Retry-After header on 429');

    // 2. Oversized payload (> 4KB) rejected with HTTP 413
    const oversizedM = makeRes();
    const largeBody = { data: 'X'.repeat(5000) };
    await securityAuditHandler({
      headers: {
        'x-forwarded-for': '127.0.0.99',
        'content-length': String(Buffer.byteLength(JSON.stringify(largeBody))),
      },
      body: largeBody,
    }, oversizedM.res);
    assert(oversizedM.getCode() === 413, 'Oversized payload (>= 4KB) rejected with HTTP 413 Payload Too Large');

    // 3. Malformed JSON payload rejected with HTTP 400
    const malformedM = makeRes();
    await securityAuditHandler({
      headers: {
        'x-forwarded-for': '127.0.0.98',
        'content-type': 'application/json',
      },
      body: '{"unclosed_json: true',
    }, malformedM.res);
    assert(malformedM.getCode() === 400, 'Malformed JSON body rejected with HTTP 400 Bad Request');
  }

  // --------------------------------------------------------------------------
  // Group 4: Auth Guard Fail-Closed in Production (api/_lib/authGuard.ts)
  // --------------------------------------------------------------------------
  console.log('\nGroup 4: Auth Guard Fail-Closed in Production (api/_lib/authGuard.ts)');
  {
    const prevEnv = process.env.NODE_ENV;
    const prevProjectId = process.env.FIREBASE_PROJECT_ID;
    const prevViteProjectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const prevVercel = process.env.VERCEL;
    const prevPort = process.env.PORT;

    try {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.VITE_FIREBASE_PROJECT_ID;
      process.env.VERCEL = '1';
      process.env.PORT = '3000';

      let threwInProduction = false;
      let thrownMessage = '';
      try {
        getExpectedProjectId();
      } catch (err: any) {
        threwInProduction = true;
        thrownMessage = err.message;
      }

      assert(threwInProduction === true, 'getExpectedProjectId strictly throws in production when FIREBASE_PROJECT_ID is missing');
      assert(thrownMessage.includes('CRITICAL CONFIGURATION ERROR'), 'Error message cites CRITICAL CONFIGURATION ERROR (Fail-Closed)');

      // In non-production, fallback is permitted
      (process.env as any).NODE_ENV = 'development';
      const devProjectId = getExpectedProjectId();
      assert(devProjectId === 'gen-lang-client-0347404066', 'In non-production, falls back to default project ID');
    } finally {
      (process.env as any).NODE_ENV = prevEnv;
      if (prevProjectId !== undefined) process.env.FIREBASE_PROJECT_ID = prevProjectId;
      else delete process.env.FIREBASE_PROJECT_ID;
      if (prevViteProjectId !== undefined) process.env.VITE_FIREBASE_PROJECT_ID = prevViteProjectId;
      else delete process.env.VITE_FIREBASE_PROJECT_ID;
      if (prevVercel !== undefined) process.env.VERCEL = prevVercel;
      else delete process.env.VERCEL;
      if (prevPort !== undefined) process.env.PORT = prevPort;
      else delete process.env.PORT;
    }
  }

  // --------------------------------------------------------------------------
  // Group 5: Server Global Body Limit Configuration (server.ts)
  // --------------------------------------------------------------------------
  console.log('\nGroup 5: Server Global Body Limit Configuration (server.ts)');
  {
    const serverCode = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');
    assert(serverCode.includes("express.json({ limit: '2mb' })"), "server.ts configures express.json({ limit: '2mb' })");
    assert(!serverCode.includes("express.json({ limit: '50mb' })"), 'server.ts eliminated 50mb body limit');
  }

  // --------------------------------------------------------------------------
  // Group 6: Gemini Endpoints Payload Caps (api/gemini/*.ts)
  // --------------------------------------------------------------------------
  console.log('\nGroup 6: Gemini Endpoints Payload Caps (32,000 chars & 5 attachments)');
  {
    const makeRes = () => {
      let code = 0;
      let body: any = null;
      return {
        res: {
          setHeader: () => {},
          status: (c: number) => {
            code = c;
            return {
              json: (b: any) => { body = b; return b; },
              end: () => {},
            };
          },
        },
        getCode: () => code,
        getBody: () => body,
      };
    };

    // 1. generateAdaptiveResponse: message > 32,000 chars
    const oversizedMessageReq = {
      method: 'POST',
      authenticatedUid: 'test_user',
      body: {
        message: 'A'.repeat(32001),
      },
      headers: { 'content-type': 'application/json' },
    };
    const mGen1 = makeRes();
    await generateAdaptiveResponseHandler(oversizedMessageReq, mGen1.res);
    assert(mGen1.getCode() === 400, 'generateAdaptiveResponse rejects message > 32,000 chars with HTTP 400');
    assert(mGen1.getBody()?.error?.includes('32,000'), 'Error message cites 32,000 character limit');

    // 2. generateAdaptiveResponse: attachments > 5
    const tooManyAttachmentsReq = {
      method: 'POST',
      authenticatedUid: 'test_user',
      body: {
        message: 'Explain this diagram',
        attachments: [1, 2, 3, 4, 5, 6].map((i) => ({ mimeType: 'image/png', data: `data_${i}` })),
      },
      headers: { 'content-type': 'application/json' },
    };
    const mGen2 = makeRes();
    await generateAdaptiveResponseHandler(tooManyAttachmentsReq, mGen2.res);
    assert(mGen2.getCode() === 400, 'generateAdaptiveResponse rejects > 5 attachments with HTTP 400');
    assert(mGen2.getBody()?.error?.includes('5 items limit'), 'Error message cites 5 attachments limit');

    // 3. generateAdaptiveResponseStream: message > 32,000 chars
    const streamOversizedReq = {
      method: 'POST',
      authenticatedUid: 'test_user',
      body: {
        message: 'B'.repeat(35000),
      },
      headers: { 'content-type': 'application/json' },
    };
    const mStream1 = makeRes();
    await generateAdaptiveResponseStreamHandler(streamOversizedReq, mStream1.res);
    assert(mStream1.getCode() === 400, 'generateAdaptiveResponseStream rejects message > 32,000 chars with HTTP 400');

    // 4. generateAdaptiveResponseStream: attachments > 5
    const streamTooManyAttachmentsReq = {
      method: 'POST',
      authenticatedUid: 'test_user',
      body: {
        message: 'Summarize attachments',
        attachments: [1, 2, 3, 4, 5, 6, 7].map((i) => ({ mimeType: 'image/png', data: `data_${i}` })),
      },
      headers: { 'content-type': 'application/json' },
    };
    const mStream2 = makeRes();
    await generateAdaptiveResponseStreamHandler(streamTooManyAttachmentsReq, mStream2.res);
    assert(mStream2.getCode() === 400, 'generateAdaptiveResponseStream rejects > 5 attachments with HTTP 400');
  }

  console.log(`\n====================================================================`);
  console.log(`Hardening Verification Complete: ${passed} passed, ${failed} failed.`);
  console.log(`====================================================================\n`);

  return { passed, failed };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('apiCorsAuthHardeningVerification')) {
  runApiCorsAuthHardeningVerification().then(({ failed }) => {
    if (failed > 0) process.exit(1);
    else process.exit(0);
  });
}
