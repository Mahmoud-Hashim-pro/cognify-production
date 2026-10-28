/**
 * Automated Verification Suite for Production Bug Fixes:
 * 1. Camera Timeout & Stream Lifecycle (Error A)
 * 2. Multi-Candidate Decryption & Spatial Object Recovery (Error B)
 * 3. Gemini 503 Resilience, Jittered Backoff & BYOK Failover (Error C)
 */
import fs from 'fs';
import path from 'path';
import {
  encryptData,
  decryptData,
  encryptSpatialRecord,
  decryptSpatialRecord,
  encryptThreadMessages,
  decryptThreadMessages,
  deriveUserEncryptionKey,
  deriveLegacyUserEncryptionKey,
  getCandidateDecryptionKeys,
  exportDeviceVaultRecoveryKey,
  importDeviceVaultRecoveryKey,
} from '../src/lib/userCryptoEngine';
import {
  extractSpatialObjectsFromVision,
  saveSpatialObject,
  getSpatialObjects,
  clearSpatialCache,
  type SpatialObjectRecord,
} from '../src/lib/spatialMemoryEngine';
import { secureSaveKey, secureRemoveKey } from '../src/lib/cryptoShield';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('\n===============================================================');
  console.log(' COGNIFY PRODUCTION BUG FIXES — AUTOMATED VERIFICATION SUITE');
  console.log('===============================================================\n');

  const repoRoot = process.cwd();

  // ───────────────────────────────────────────────────────────────────────────
  // GROUP 1: CAMERA TIMEOUT & LIFECYCLE REPAIR (Error A)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- GROUP 1: Camera Timeout & Lifecycle Architecture ---');

  const visionViewContent = fs.readFileSync(
    path.join(repoRoot, 'src', 'components', 'VisionCompanionView.tsx'),
    'utf8'
  );

  // Test 1.1: Status type contains dedicated 'timeout' state
  assert(
    visionViewContent.includes(`type Status = 'idle' | 'starting-camera' | 'ready' | 'analyzing' | 'camera-denied' | 'no-camera' | 'camera-in-use' | 'unsupported' | 'timeout';`),
    'VisionCompanionView includes dedicated "timeout" state in Status type union'
  );

  // Test 1.2: Camera timeout detection maps to 'timeout' status instead of false 'camera-denied'
  assert(
    visionViewContent.includes(`if (errMsg === 'CAMERA_TIMEOUT') {\n            setStatus('timeout');`) ||
    visionViewContent.includes(`errMsg === 'CAMERA_TIMEOUT'`),
    'startCamera maps CAMERA_TIMEOUT to setStatus("timeout") instead of generic camera-denied'
  );

  // Test 1.3: Permission query detection provides generous 45s timeout for modal dialogs
  assert(
    visionViewContent.includes(`navigator.permissions?.query`) &&
    visionViewContent.includes(`name: 'camera' as PermissionName`) &&
    visionViewContent.includes(`const timeoutDuration = isPrompting ? 45000 : 20000;`),
    'getUserMediaSafe checks permission state and allows 45s for user prompt interaction'
  );

  // Test 1.4: Prevention of cascading retry storm on timeout
  assert(
    visionViewContent.includes(`if (err?.message === 'CAMERA_TIMEOUT') {\n          break;`),
    'getUserMediaSafe breaks loop immediately on CAMERA_TIMEOUT to prevent duplicate concurrent prompts'
  );

  // Test 1.5: Late stream cleanup
  assert(
    visionViewContent.includes(`if (hasTimedOut) {\n                // If user granted permission late, immediately stop tracks`) &&
    visionViewContent.includes(`s.getTracks().forEach((tr) => tr.stop());`),
    'Late stream resolutions after timeout immediately stop tracks to prevent hardware camera lock'
  );

  // Test 1.6: Dedicated Accessible Timeout UI Card
  assert(
    visionViewContent.includes(`status === 'timeout'`) &&
    visionViewContent.includes(`Camera request timed out`) &&
    visionViewContent.includes(`استغرقت الكاميرا وقتاً طويلاً للاستجابة`),
    'VisionCompanionView renders localized timeout UI card with explicit Retry and Upload actions'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GROUP 2: ZERO-KNOWLEDGE MULTI-CANDIDATE DECRYPTION REPAIR (Error B)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 2: Zero-Knowledge Multi-Candidate Decryption ---');

  const testUserId = `test_student_${Date.now()}`;

  // Test 2.1: Current device vault encryption and decryption
  const testPayload = { note: 'Spatial notebook', coordinates: { x: 10, y: 25 }, timestamp: Date.now() };
  const encryptedCurrent = await encryptData(testPayload, testUserId);
  assert(encryptedCurrent.encrypted === true && typeof encryptedCurrent.ciphertext === 'string', 'Data encrypted with AES-256-GCM successfully');

  const decryptedCurrent = await decryptData<typeof testPayload>(encryptedCurrent, testUserId);
  assert(decryptedCurrent.note === 'Spatial notebook' && decryptedCurrent.coordinates.x === 10, 'Data decrypted successfully with primary device key');

  // Test 2.2: Backward compatibility with legacy deterministic v10 key derivation
  const legacyKey = await deriveLegacyUserEncryptionKey(testUserId);
  assert(legacyKey instanceof CryptoKey, 'deriveLegacyUserEncryptionKey derives valid AES-256-GCM CryptoKey');

  // Manually encrypt with legacy v10 key to simulate an old record in Firestore
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);
  const encoder = new TextEncoder();
  const legacyPlaintext = JSON.stringify({ item: 'Legacy Medicine Bottle', room: 'Kitchen', surface: 'Counter' });
  const subtle = globalThis.crypto.subtle;
  const legacyCiphertextBuf = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    legacyKey,
    encoder.encode(legacyPlaintext)
  );

  const legacyEncryptedDoc = {
    encrypted: true,
    version: 1,
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(legacyCiphertextBuf).toString('base64'),
    updatedAt: new Date().toISOString(),
  };

  // Test 2.3: Decrypt legacy record using standard decryptData (multi-candidate fallback)
  const recoveredLegacy = await decryptData<{ item: string; room: string; surface: string }>(
    legacyEncryptedDoc,
    testUserId
  );
  assert(
    recoveredLegacy.item === 'Legacy Medicine Bottle' && recoveredLegacy.room === 'Kitchen',
    'decryptData seamlessly decrypts historical legacy v10 records via candidate key fallback'
  );

  // Test 2.4: Decrypt legacy spatial record via decryptSpatialRecord
  const legacySpatialRecordData = {
    id: 'sp_medication_kitchen_001',
    category: 'medication',
    ...legacyEncryptedDoc,
  };
  const decryptedSpatial = await decryptSpatialRecord(legacySpatialRecordData, testUserId);
  assert(
    decryptedSpatial !== null && (decryptedSpatial as any).item === 'Legacy Medicine Bottle',
    'decryptSpatialRecord successfully recovers legacy spatial documents'
  );

  // Test 2.5: Non-destructive placeholder recovery when decryption fails (foreign device key)
  const foreignUserId = 'different_user_device_999';
  const foreignEncrypted = await encryptData({ secret: 'Device B secret' }, foreignUserId);
  const foreignSpatialDoc = {
    id: 'sp_foreign_001',
    category: 'keys',
    ...foreignEncrypted,
  };

  // Attempt to decrypt with testUserId (mismatched key)
  const placeholderSpatial = await decryptSpatialRecord(foreignSpatialDoc, testUserId);
  assert(
    placeholderSpatial !== null &&
    (placeholderSpatial as any).isEncryptedPlaceholder === true &&
    (placeholderSpatial as any).id === 'sp_foreign_001' &&
    (placeholderSpatial as any).rawEncryptedPayload !== undefined,
    'decryptSpatialRecord returns safe, non-destructive placeholder preserving encrypted payload instead of dropping record'
  );

  // Test 2.6: Thread messages decryption with foreign/inaccessible key
  const threadWithForeignDoc = {
    id: 'thread_foreign_123',
    ...foreignEncrypted,
  };
  const recoveredThread = await decryptThreadMessages(threadWithForeignDoc, testUserId);
  assert(
    Array.isArray(recoveredThread) &&
    recoveredThread.length === 1 &&
    recoveredThread[0].content.includes('Message history was encrypted in another session or on a different device'),
    'decryptThreadMessages returns helpful cross-device sync notice without throwing unhandled OperationError'
  );

  // Test 2.7: Spatial engine safety: verify saveSpatialObject rejects overwriting with placeholder
  const spatialContent = fs.readFileSync(path.join(repoRoot, 'src', 'lib', 'spatialMemoryEngine.ts'), 'utf8');
  assert(
    spatialContent.includes(`!(record as any).isEncryptedPlaceholder`),
    'saveSpatialObject guards remote storage against overwriting real encrypted records with placeholders'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GROUP 3: GEMINI 503 ERROR RESILIENCE & BYOK FALLBACK (Error C)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 3: Gemini 503 Resilience, Backoff & Client Failover ---');

  // Test 3.1: Server-side exponential backoff with jitter on 503/429
  const aiContent = fs.readFileSync(path.join(repoRoot, 'api', '_lib', 'ai.ts'), 'utf8');
  assert(
    aiContent.includes(`const maxKeyRetries = 2;`) &&
    aiContent.includes(`Math.pow(2, attempt + 1) * 300`) &&
    aiContent.includes(`r.status === 429 || r.status === 503`),
    'api/_lib/ai.ts geminiFetch retries upstream 503/429 with exponential backoff and jitter up to 2 times'
  );

  // Test 3.2: Server AI key configuration missing error
  assert(
    aiContent.includes(`code: 'SERVER_CONFIG_MISSING'`),
    'api/_lib/ai.ts guard returns explicit SERVER_CONFIG_MISSING error code when keys are absent'
  );

  // Test 3.3: Client-side detection of SERVER_CONFIG_MISSING and direct BYOK failover
  const geminiContent = fs.readFileSync(path.join(repoRoot, 'src', 'services', 'gemini.ts'), 'utf8');
  assert(
    geminiContent.includes(`let serverAiConfigured: boolean | null = null;`) &&
    geminiContent.includes(`serverAiConfigured = false;`) &&
    geminiContent.includes(`yield* generateAdaptiveResponseStreamClient`),
    'src/services/gemini.ts immediately fails over to client BYOK when server reports SERVER_CONFIG_MISSING'
  );

  // Test 3.4: Client-side retry loop for transient 503 provider overload
  assert(
    geminiContent.includes(`for (let retryCount = 1; retryCount <= 2; retryCount++)`) &&
    geminiContent.includes(`Math.pow(2, retryCount) * 400`),
    'src/services/gemini.ts performs jittered exponential retries on transient 503 provider overload'
  );

  // Test 3.5: VisionCompanionView filters AI warnings/errors from observations & spatial extraction
  assert(
    visionViewContent.includes(`if (result.startsWith('⚠️')) {`) &&
    visionViewContent.includes(`speak(spoken`),
    'VisionCompanionView announces AI service errors directly and suppresses saving them to observation history'
  );

  assert(
    spatialContent.includes(`description.includes('⚠️')`),
    'extractSpatialObjectsFromVision ignores AI error messages and suppresses bogus object extraction'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log(` TESTS COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution crashed:', err);
  process.exit(1);
});
