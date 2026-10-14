/**
 * Milestone 21 Verification Suite: Open Developer API & Webhooks Ecosystem
 * Tests API Key generation, SHA-256 hashed storage, scope-based authentication,
 * RFC 2104 HMAC-SHA256 webhook signatures, replay attack prevention, and OpenAPI 3.1 spec.
 */

import {
  hmacSha256,
  generateApiKey,
  verifyApiKey,
  revokeApiKey,
  signWebhookPayload,
  verifyWebhookSignature,
  generateOpenApiSpec
} from '../src/lib/developerApiEngine';
import type { ApiKeyRecord } from '../src/types/developerApi';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

export async function runDeveloperApiVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Running Suite 52: Milestone 21 (Open Developer API & Webhooks) ---');

  // ==========================================================================
  // Test Group 1: RFC 2104 HMAC-SHA256 Engine
  // ==========================================================================
  console.log('Group 1: RFC 2104 HMAC-SHA256 Engine');
  const hmac1 = hmacSha256('secret_key_1', 'message_alpha');
  assert(hmac1.length === 64, 'HMAC-SHA256 returns 64-character hex digest');

  const hmacSame = hmacSha256('secret_key_1', 'message_alpha');
  assert(hmac1 === hmacSame, 'HMAC-SHA256 is deterministic for identical inputs');

  const hmacDiffMsg = hmacSha256('secret_key_1', 'message_beta');
  assert(hmac1 !== hmacDiffMsg, 'Modifying message alters HMAC digest');

  const hmacDiffKey = hmacSha256('secret_key_2', 'message_alpha');
  assert(hmac1 !== hmacDiffKey, 'Modifying secret alters HMAC digest');

  // ==========================================================================
  // Test Group 2: API Key Management & Hashed Storage
  // ==========================================================================
  console.log('Group 2: API Key Management & Scope Verification');
  const keyGen = generateApiKey('tenant_cu', 'Canvas LMS Sync', ['read:analytics', 'write:events']);
  assert(keyGen.rawKey.startsWith('cog_live_'), 'Raw API key begins with standard prefix "cog_live_"');
  assert(keyGen.record.keyHash.length === 64, 'Stored record has 64-char SHA-256 hash');
  assert(!JSON.stringify(keyGen.record).includes(keyGen.rawKey), 'Plaintext secret is strictly NOT stored in record');

  const records: ApiKeyRecord[] = [keyGen.record];

  // Verify Valid Key with Matching Scope
  const authOk = verifyApiKey(keyGen.rawKey, 'read:analytics', records);
  assert(authOk.authenticated === true, 'Authenticates valid API key with granted scope');
  assert(authOk.keyRecord?.name === 'Canvas LMS Sync', 'Resolves key record name');

  // Verify Valid Key with Missing Scope
  const authScopeFail = verifyApiKey(keyGen.rawKey, 'admin:sync', records);
  assert(authScopeFail.authenticated === false, 'Rejects authentication when required scope is missing');
  assert(authScopeFail.error?.includes('admin:sync'), 'Error message cites missing scope');

  // Revoke Key
  const revokedOk = revokeApiKey(keyGen.record.keyId, records);
  assert(revokedOk === true, 'Revokes API key successfully');
  const authAfterRevoke = verifyApiKey(keyGen.rawKey, 'read:analytics', records);
  assert(authAfterRevoke.authenticated === false, 'Revoked API key rejected on subsequent calls');

  // Invalid Key
  const authFake = verifyApiKey('cog_live_fakefakefakefakefakefakefakefake', undefined, records);
  assert(authFake.authenticated === false, 'Non-existent API key rejected');

  // Malformed Key
  const authMalformed = verifyApiKey('bad_prefix_123', undefined, records);
  assert(authMalformed.authenticated === false, 'Malformed API key lacking prefix rejected');

  // ==========================================================================
  // Test Group 3: Webhooks Dispatch & Replay Attack Defense
  // ==========================================================================
  console.log('Group 3: Webhooks Stamping & Replay Prevention');
  const webhookSecret = 'whsec_test_secret_994827';
  const payload = JSON.stringify({ event: 'student.mastery_achieved', studentUid: 'stu_10', conceptId: 'c_pointers' });

  const now = Date.now();
  const { signatureHeader } = signWebhookPayload(payload, webhookSecret, now);

  assert(signatureHeader.startsWith('t=') && signatureHeader.includes(',v1='), 'Signature header uses standard Stripe-style t=...,v1=... format');

  // Verify Valid Signature
  const validSig = verifyWebhookSignature(payload, signatureHeader, webhookSecret);
  assert(validSig === true, 'Valid webhook signature successfully verified');

  // Tampered Payload
  const tamperedPayload = JSON.stringify({ event: 'student.mastery_achieved', studentUid: 'stu_10', conceptId: 'c_pointers', hacked: true });
  const tamperedSig = verifyWebhookSignature(tamperedPayload, signatureHeader, webhookSecret);
  assert(tamperedSig === false, 'Tampered payload rejected (HMAC mismatch)');

  // Wrong Secret
  const wrongSecretSig = verifyWebhookSignature(payload, signatureHeader, 'whsec_wrong_secret_123');
  assert(wrongSecretSig === false, 'Webhook verified with wrong secret returns false');

  // Replay Attack (Stale timestamp beyond 5 min maxAgeMs)
  const staleTimestamp = now - (10 * 60 * 1000); // 10 minutes ago
  const { signatureHeader: staleHeader } = signWebhookPayload(payload, webhookSecret, staleTimestamp);
  const replayAttackResult = verifyWebhookSignature(payload, staleHeader, webhookSecret, 5 * 60 * 1000);
  assert(replayAttackResult === false, 'Replay attack with stale timestamp (> 5 min) strictly rejected');

  // ==========================================================================
  // Test Group 4: OpenAPI 3.1 Specification Generator
  // ==========================================================================
  console.log('Group 4: OpenAPI 3.1 Specification');
  const spec = generateOpenApiSpec();
  assert(spec.openapi === '3.1.0', 'Spec specifies OpenAPI version 3.1.0');
  assert(spec.info.title.includes('Cognify'), 'Spec title references Cognify');
  assert(spec.paths['/student/state'] !== undefined, 'Spec defines /student/state endpoint');
  assert(spec.paths['/events/emit'] !== undefined, 'Spec defines /events/emit endpoint');
  assert(spec.paths['/ai/guard'] !== undefined, 'Spec defines /ai/guard endpoint');
  assert(spec.paths['/privacy/export'] !== undefined, 'Spec defines /privacy/export endpoint');
  assert(spec.components.securitySchemes.BearerAuth !== undefined, 'Spec defines BearerAuth security scheme');

  console.log(`\nMilestone 21 Verification Finished: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

if (process.argv[1]?.includes('developerApiVerification')) {
  runDeveloperApiVerification().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
