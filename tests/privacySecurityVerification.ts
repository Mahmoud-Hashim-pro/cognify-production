/**
 * Milestone 16 Verification Suite: Privacy & Security Intelligence
 * Tests Differential Privacy Noise bounds, budget constraints,
 * GDPR/FERPA Cascade Erasure, Data Portability Packaging, and Chained Audit Verification.
 */

import fs from 'fs';
import path from 'path';
import { isSafeImageUrl } from '../api/proxy-image.js';
import {
  sha256,
  sampleLaplace,
  applyDifferentialPrivacy,
  createDefaultDPBudget,
  packageStudentExport,
  executeCascadeErasure,
  createAuditEntry,
  verifyAuditChain,
  GENESIS_PREV_HASH
} from '../src/lib/privacySecurityEngine';
import {
  encryptThreadMessages,
  decryptThreadMessages,
  encryptSpatialRecord,
  decryptSpatialRecord,
  isEncryptedPayload,
} from '../src/lib/userCryptoEngine';
import type { StudentState } from '../src/types/studentState';
import type { AuditLogEntry } from '../src/types/privacySecurity';

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

export async function runPrivacySecurityVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Running Suite 47: Milestone 16 (Privacy & Security Intelligence) ---');

  // ==========================================================================
  // Test Group 1: Cryptographic SHA-256 Verification
  // ==========================================================================
  console.log('Group 1: Cryptographic SHA-256 Engine');
  const emptyHash = sha256('');
  assert(
    emptyHash === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'sha256 standard empty string hash matches NIST vector'
  );

  const abcHash = sha256('abc');
  assert(
    abcHash === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'sha256 standard "abc" test vector matches NIST vector'
  );

  // ==========================================================================
  // Test Group 2: Differential Privacy & Laplace Noise Mechanism
  // ==========================================================================
  console.log('Group 2: Differential Privacy Mechanism');
  const deterministicRngHigh = () => 0.8;
  const deterministicRngLow = () => 0.2;

  const sampleHigh = sampleLaplace(50, 2.0, deterministicRngHigh);
  assert(sampleHigh !== 50, 'sampleLaplace correctly perturbs baseline mean value');

  const budget = createDefaultDPBudget(5.0);
  assert(budget.remainingBudget === 5.0, 'Default DP budget initialized with 5.0 epsilon units');

  const dpRes1 = applyDifferentialPrivacy(
    80,
    { epsilon: 0.5, sensitivity: 1.0, minBounds: 0, maxBounds: 100 },
    budget,
    deterministicRngHigh
  );
  assert(dpRes1.perturbedValue >= 0 && dpRes1.perturbedValue <= 100, 'DP perturbed value strictly respects bounds [0, 100]');
  assert(budget.consumedBudget === 0.5, 'DP budget properly records 0.5 epsilon consumption');
  assert(budget.remainingBudget === 4.5, 'DP budget remaining decreased to 4.5');
  assert(budget.queryLog.length === 1, 'Query log records 1 execution');

  // Exhaust the budget
  applyDifferentialPrivacy(50, { epsilon: 4.5, sensitivity: 1.0, minBounds: 0, maxBounds: 100 }, budget);
  assert(budget.remainingBudget === 0.0, 'Budget successfully consumed down to 0.0');

  let budgetExhaustedError = false;
  try {
    applyDifferentialPrivacy(50, { epsilon: 0.1, sensitivity: 1.0, minBounds: 0, maxBounds: 100 }, budget);
  } catch (err: any) {
    budgetExhaustedError = true;
  }
  assert(budgetExhaustedError, 'Attempting to query with exhausted DP budget throws security violation');

  // Test Boundary Clamping
  const clampedRes = applyDifferentialPrivacy(
    99,
    { epsilon: 0.01, sensitivity: 5.0, minBounds: 0, maxBounds: 100 },
    undefined,
    () => 0.9999
  );
  assert(clampedRes.perturbedValue === 100, 'Extreme positive noise is cleanly clamped to maxBounds (100)');

  const clampedLower = applyDifferentialPrivacy(
    1,
    { epsilon: 0.01, sensitivity: 5.0, minBounds: 0, maxBounds: 100 },
    undefined,
    () => 0.0001
  );
  assert(clampedLower.perturbedValue === 0, 'Extreme negative noise is cleanly clamped to minBounds (0)');

  // ==========================================================================
  // Test Group 3: Self-Service Data Portability Packaging (FERPA / GDPR)
  // ==========================================================================
  console.log('Group 3: Self-Service Data Portability Packaging');
  const mockStudentState: StudentState = {
    uid: 'stu_export_test_01',
    cognitiveStage: 'developing',
    activePedagogy: 'scaffolded',
    pedagogyEffectiveness: {
      analogies: { helpfulCount: 4, unhelpfulCount: 1, score: 0.8 },
      scaffolded: { helpfulCount: 6, unhelpfulCount: 0, score: 1.0 },
      worked_example: { helpfulCount: 2, unhelpfulCount: 2, score: 0.5 },
      socratic: { helpfulCount: 1, unhelpfulCount: 3, score: 0.25 },
      advanced_rigor: { helpfulCount: 0, unhelpfulCount: 1, score: 0.1 }
    },
    learningStrain: { possibleStruggle: 0.3, confidence: 0.7, signals: [] },
    struggleSignal: 0.3,
    cognitiveLoadScore: 0.3,
    conceptMastery: {
      loops: {
        conceptId: 'loops',
        accuracy: 0.85,
        attempts: 10,
        correct: 8,
        confidence: 0.9,
        consecutiveCorrect: 4,
        consecutiveIncorrect: 0,
        lastTested: Date.now(),
        mistakeTypes: []
      }
    },
    retentionSchedules: {},
    activeInterventions: {},
    totalExercisesCompleted: 25,
    lastActiveTimestamp: Date.now()
  };

  const exportPkg = packageStudentExport(mockStudentState, {
    learningEventsCount: 50,
    spatialMemoriesCount: 3,
    presenceStatus: 'online'
  });

  assert(exportPkg.studentUid === 'stu_export_test_01', 'Export package contains correct student UID');
  assert(exportPkg.formatVersion === 'cognify-export-v2.0', 'Export package uses standardized format version');
  assert(exportPkg.integrityChecksum.length === 64, 'Export package has valid 64-character SHA-256 checksum');

  // Verify integrity by recalculating
  const recalculatedChecksum = sha256(JSON.stringify(exportPkg.data));
  assert(recalculatedChecksum === exportPkg.integrityChecksum, 'Recalculated SHA-256 matches package integrity checksum');

  // ==========================================================================
  // Test Group 4: GDPR/FERPA Cascade Erasure Orchestration
  // ==========================================================================
  console.log('Group 4: Cascade Erasure (Right to be Forgotten)');
  const profileStore = new Map<string, StudentState>();
  profileStore.set(mockStudentState.uid, mockStudentState);
  profileStore.set('stu_other_99', { ...mockStudentState, uid: 'stu_other_99' });

  const eventStore = [
    { studentUid: mockStudentState.uid, type: 'EXERCISE_SUBMIT', payload: 'Private Answer text', timestamp: Date.now() },
    { studentUid: 'stu_other_99', type: 'EXERCISE_SUBMIT', payload: 'Other Student text', timestamp: Date.now() },
    { studentUid: mockStudentState.uid, type: 'CHAT_MESSAGE', payload: 'Student confidential question', timestamp: Date.now() }
  ];

  const spatialStore = [
    { userId: mockStudentState.uid, objectName: 'desk_laptop' },
    { userId: 'stu_other_99', objectName: 'lab_microscope' }
  ];

  const presenceStore = new Map<string, any>();
  presenceStore.set(mockStudentState.uid, { status: 'away', lastSeen: Date.now() });

  const auditStore: AuditLogEntry[] = [
    createAuditEntry('teacher_01', 'PROFILE_UPDATE', mockStudentState.uid, {}, GENESIS_PREV_HASH)
  ];

  const manifest = executeCascadeErasure(
    {
      requestId: 'req_erasure_001',
      studentUid: mockStudentState.uid,
      requestedAt: Date.now(),
      confirmedByActor: mockStudentState.uid,
      reason: 'gdpr_article_17'
    },
    {
      profileStore,
      eventStore,
      spatialMemoryStore: spatialStore,
      presenceStore,
      auditStore
    }
  );

  assert(manifest.recordsWiped.profileState === true, 'Profile store erased targeted student');
  assert(!profileStore.has(mockStudentState.uid), 'Targeted student absent from profile store');
  assert(profileStore.has('stu_other_99'), 'Other student preserved in profile store');

  assert(manifest.recordsWiped.learningEventsRedacted === 2, 'Cascade erasure redacted 2 student learning events');
  assert(eventStore[0].payload === '[REDACTED_UNDER_GDPR_ARTICLE_17]', 'Event payload replaced with GDPR Article 17 redaction note');
  assert(eventStore[0].studentUid.startsWith('ANONYMIZED_TOMBSTONE_'), 'Event studentUid replaced with anonymized tombstone hash');
  assert(eventStore[1].studentUid === 'stu_other_99', 'Other student event preserved intact');

  assert(manifest.recordsWiped.spatialMemoriesWiped === 1, 'Cascade erasure wiped 1 spatial memory item');
  assert(spatialStore.length === 1 && spatialStore[0].userId === 'stu_other_99', 'Other student spatial memory preserved');

  assert(manifest.recordsWiped.presenceCleaned === true, 'Presence record cleaned');
  assert(!presenceStore.has(mockStudentState.uid), 'Presence record absent');

  assert(manifest.receiptHash.length === 64, 'Cryptographic erasure receipt hash issued');

  // ==========================================================================
  // Test Group 5: Tamper-Resistant Chained Audit Logging
  // ==========================================================================
  console.log('Group 5: Chained Cryptographic Audit Logging');
  const block0 = createAuditEntry('admin', 'SECURITY_SCAN', 'sys', { mode: 'full' }, GENESIS_PREV_HASH, 1000);
  assert(block0.prevHash === GENESIS_PREV_HASH, 'Block 0 has genesis prevHash');

  const block1 = createAuditEntry('officer', 'DATA_EXPORT', 'stu_01', { id: 'exp_1' }, block0.entryHash, 2000);
  assert(block1.prevHash === block0.entryHash, 'Block 1 chains prevHash to Block 0 entryHash');

  const block2 = createAuditEntry('officer', 'CASCADE_ERASURE', 'stu_01', { id: 'erase_1' }, block1.entryHash, 3000);
  assert(block2.prevHash === block1.entryHash, 'Block 2 chains prevHash to Block 1 entryHash');

  const validChain = [block0, block1, block2];
  const verifOk = verifyAuditChain(validChain);
  assert(verifOk.isValid === true, 'Audit chain with 3 blocks verifies unbroken');
  assert(verifOk.tamperedIndex === -1, 'No tampering detected in valid chain');

  // Tamper with Block 1 action
  const tamperedChainAction = [
    block0,
    { ...block1, action: 'ROLE_CHANGE' as any },
    block2
  ];
  const verifTamperedAction = verifyAuditChain(tamperedChainAction);
  assert(verifTamperedAction.isValid === false, 'Tampered block action detected');
  assert(verifTamperedAction.tamperedIndex === 1, 'Tampered block index correctly identified as 1');

  // Tamper with Block 1 payload digest
  const tamperedChainPayload = [
    block0,
    { ...block1, payloadDigest: sha256('evil_hacker_modification') },
    block2
  ];
  const verifTamperedPayload = verifyAuditChain(tamperedChainPayload);
  assert(verifTamperedPayload.isValid === false, 'Tampered block payload detected');
  assert(verifTamperedPayload.tamperedIndex === 1, 'Tampered payload index correctly identified as 1');

  // Break linkage (wrong prevHash)
  const brokenLinkChain = [
    block0,
    block1,
    { ...block2, prevHash: 'broken_hash_00000000000000000000000000000000000000000000000000000000' }
  ];
  const verifBrokenLink = verifyAuditChain(brokenLinkChain);
  assert(verifBrokenLink.isValid === false, 'Broken hash linkage detected');
  // ==========================================================================
  // Test Group 6: Zero-Knowledge Student Chat Privacy & Architecture
  // ==========================================================================
  console.log('Group 6: Zero-Knowledge Student Chat Privacy & Proxy Security');

  // 1. Verify firestore.rules enforces owner-only on /threads/{threadId}
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  assert(
    rulesContent.includes('match /threads/{threadId}') &&
    rulesContent.includes('allow read, write, delete: if isOwner(userId);'),
    'firestore.rules strictly isolates student threads with Owner-Only rule (admins blocked)'
  );
  assert(
    rulesContent.includes('!("chatHistory" in data)'),
    'firestore.rules blocks chatHistory from being written to /users/{userId} document'
  );

  // 2. Verify types.ts does not include chatHistory in UserProfile
  const typesPath = path.resolve(process.cwd(), 'src/types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  assert(
    !typesContent.includes('chatHistory: Message[];'),
    'src/types.ts has eradicated chatHistory: Message[] from UserProfile'
  );

  // 3. Verify App.tsx auto-purges legacy chatHistory on document read
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(
    appContent.includes('deleteField()') && appContent.includes('delete rawData.chatHistory'),
    'src/App.tsx automatically purges legacy chatHistory from Firestore with deleteField()'
  );

  // 4. Verify Image Proxy SSRF security
  assert(
    isSafeImageUrl('http://127.0.0.1/admin') === false,
    'isSafeImageUrl blocks loopback IPv4 (127.0.0.1)'
  );
  assert(
    isSafeImageUrl('http://localhost:3000/env') === false,
    'isSafeImageUrl blocks localhost SSRF'
  );
  assert(
    isSafeImageUrl('http://169.254.169.254/latest/meta-data') === false,
    'isSafeImageUrl blocks AWS/GCP cloud metadata IP (169.254.169.254)'
  );
  assert(
    isSafeImageUrl('http://10.0.0.1/internal') === false,
    'isSafeImageUrl blocks private RFC1918 range (10.0.0.0/8)'
  );
  assert(
    isSafeImageUrl('https://image.pollinations.ai/prompt/test?width=1024') === true,
    'isSafeImageUrl permits public HTTPS pollinations.ai image'
  );
  assert(
    isSafeImageUrl('https://images.unsplash.com/photo-example') === true,
    'isSafeImageUrl permits public HTTPS CDN images'
  );

  // ==========================================================================
  // Test Group 7: Client-Side AES-256-GCM Zero-Knowledge Encryption & Isolation
  // ==========================================================================
  console.log('Group 7: Client-Side AES-256-GCM Zero-Knowledge Encryption & Spatial Isolation');

  const testUid = 'student_zk_alice_99';
  const otherUid = 'attacker_bob_66';

  const plainMessages = [
    {
      id: 'm1',
      role: 'user' as const,
      content: 'Can you help me solve this sensitive calculus exam problem?',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'm2',
      role: 'assistant' as const,
      content: 'Let us break down the integral into parts step by step.',
      timestamp: new Date().toISOString(),
    },
  ];

  // 1. Encrypt thread messages
  const encryptedDoc = await encryptThreadMessages(plainMessages, testUid, 'thread_123');
  assert(encryptedDoc.encrypted === true, 'Encrypted document has encrypted: true flag');
  assert(encryptedDoc.version === 1, 'Encrypted document has version 1');
  assert(typeof encryptedDoc.iv === 'string' && encryptedDoc.iv.length > 0, 'Encrypted document has Base64 IV');
  assert(typeof encryptedDoc.ciphertext === 'string' && encryptedDoc.ciphertext.length > 0, 'Encrypted document has Base64 ciphertext');
  assert(!JSON.stringify(encryptedDoc).includes('calculus exam'), 'Ciphertext document does NOT leak plaintext tokens');

  // 2. Decrypt with correct UID
  const decrypted = await decryptThreadMessages(encryptedDoc, testUid);
  assert(decrypted.length === 2, 'Decrypted messages array matches original length');
  assert(decrypted[0].content === plainMessages[0].content, 'Decrypted user message content exactly matches original');
  assert(decrypted[1].content === plainMessages[1].content, 'Decrypted assistant message content exactly matches original');

  // 3. Decrypt with wrong UID (zero-knowledge isolation)
  const failedDecrypt = await decryptThreadMessages(encryptedDoc, otherUid);
  assert(
    failedDecrypt.length === 1 && failedDecrypt[0].id === 'decrypt_error',
    'Decrypting with unauthorized UID fails and returns decrypt_error fallback (Zero-Knowledge)'
  );

  // 4. Spatial object encryption roundtrip
  const testSpatialObj = {
    id: 'obj_keys_44',
    uid: testUid,
    objectName: 'Car Keys',
    category: 'keys' as const,
    surface: 'wooden desk',
    room: 'study room',
    lastSeenTimestamp: Date.now(),
    confidence: 0.98,
  };

  const encryptedSpatial = await encryptSpatialRecord(testSpatialObj, testUid);
  assert(encryptedSpatial.encrypted === true, 'Encrypted spatial object has encrypted: true flag');
  assert(isEncryptedPayload(encryptedSpatial) === true, 'isEncryptedPayload validates encrypted spatial record');
  assert(!JSON.stringify(encryptedSpatial).includes('wooden desk'), 'Encrypted spatial record does NOT leak surface in plaintext');

  const decryptedSpatial = await decryptSpatialRecord(encryptedSpatial, testUid);
  assert(decryptedSpatial.category === 'keys', 'Decrypted spatial record preserves category');
  assert(decryptedSpatial.surface === 'wooden desk', 'Decrypted spatial record preserves surface');

  // 5. Verify firestore.rules blocks spatialMemories on root user document
  assert(
    rulesContent.includes('!("spatialMemories" in data)') && rulesContent.includes('!("spatialMemoriesV2" in data)'),
    'firestore.rules explicitly rejects spatialMemories and spatialMemoriesV2 on /users/{userId}'
  );
  assert(
    rulesContent.includes('match /spatialObjects/{objectId}') &&
    rulesContent.includes('allow read, write, delete: if isOwner(userId);'),
    'firestore.rules enforces Owner-Only rule on /users/{userId}/spatialObjects/{objectId}'
  );

  console.log(`\nMilestone 16 Verification Finished: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

if (process.argv[1]?.includes('privacySecurityVerification')) {
  runPrivacySecurityVerification().then(res => {
    if (res.failed > 0) process.exit(1);
    else process.exit(0);
  });
}
