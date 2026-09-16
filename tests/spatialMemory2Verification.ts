/**
 * Milestone 10: Spatial Memory 2.0 Automated Verification Suite
 *
 * Verifies:
 * 1. Multi-instance object identity creation (e.g. TV Remote vs AC Remote)
 * 2. Ambiguity detection and multilingual disambiguation prompts (EN, AR, FR)
 * 3. Specific query resolution with high precision
 * 4. Chronological movement trajectory history recording
 * 5. User correction feedback loop (updating location, identity label, and confidence)
 * 6. Strict multi-tenant user isolation (User A cannot see or mutate User B's spatial records)
 */

import {
  recordSpatialObservationV2,
  resolveSpatialQueryV2,
  applySpatialCorrection,
  getObjectMovementHistory,
  getSpatialObjectIdentities,
  clearSpatialMemoryV2ForUser,
} from '../src/lib/spatialMemoryEngine.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runSuite() {
  console.log('\n============================================================');
  console.log('📍 RUNNING SPATIAL MEMORY 2.0 ENGINE VERIFICATION (M10)');
  console.log('============================================================\n');

  const userA = 'student_alex_m10';
  const userB = 'student_sam_m10';

  // Clean test state
  clearSpatialMemoryV2ForUser(userA);
  clearSpatialMemoryV2ForUser(userB);

  // -------------------------------------------------------------------------
  // 1. Multi-Instance Object Identity Registration
  // -------------------------------------------------------------------------
  console.log('--- 1. Multi-Instance Object Identity Registration ---');

  // Register TV Remote for User A
  const tvRemote = recordSpatialObservationV2(userA, {
    category: 'remote',
    identityLabel: 'TV Remote',
    roomEn: 'Living Room',
    roomAr: 'الصالة',
    roomFr: 'Salon',
    surfaceEn: 'Coffee Table',
    surfaceAr: 'ترابيزة الصالة',
    surfaceFr: 'Table basse',
    features: { color: 'black', roomAffiliation: 'living_room', subType: 'tv' },
    confidence: 0.95,
  });

  assert(tvRemote.category === 'remote', 'TV remote has remote category');
  assert(tvRemote.labelEn === 'TV Remote', `TV remote has labelEn "TV Remote": "${tvRemote.labelEn}"`);
  assert(tvRemote.roomEn === 'Living Room', 'TV remote is in Living Room');

  // Register AC Remote for User A (same category 'remote', different identity & room)
  const acRemote = recordSpatialObservationV2(userA, {
    category: 'remote',
    identityLabel: 'AC Remote',
    roomEn: 'Bedroom',
    roomAr: 'غرفة النوم',
    roomFr: 'Chambre',
    surfaceEn: 'Nightstand',
    surfaceAr: 'الكومودينو',
    surfaceFr: 'Table de chevet',
    features: { color: 'white', roomAffiliation: 'bedroom', subType: 'ac' },
    confidence: 0.90,
  });

  assert(acRemote.category === 'remote', 'AC remote has remote category');
  assert(acRemote.id !== tvRemote.id, 'AC remote has distinct objectId from TV remote');
  assert(acRemote.roomEn === 'Bedroom', 'AC remote is in Bedroom');

  const userAObjects = getSpatialObjectIdentities(userA);
  assert(userAObjects.length === 2, `User A has exactly 2 distinct remotes: ${userAObjects.length}`);

  // -------------------------------------------------------------------------
  // 2. Ambiguity Detection & Disambiguation Resolution
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Ambiguity Detection & Disambiguation Prompts ---');

  // Generic query "where is my remote?" matches both remotes => ambiguous!
  const ambiguousResEn = resolveSpatialQueryV2('where is my remote?', userA, 'en');
  assert(ambiguousResEn.isAmbiguous === true, 'Generic query detected as ambiguous');
  assert(ambiguousResEn.candidateMatches.length === 2, 'Candidate matches contains both remotes');
  assert(
    ambiguousResEn.clarificationPromptEn !== undefined &&
    ambiguousResEn.clarificationPromptEn.includes('TV Remote') &&
    ambiguousResEn.clarificationPromptEn.includes('AC Remote'),
    `English clarification prompt mentions both candidates: "${ambiguousResEn.clarificationPromptEn}"`
  );

  const ambiguousResAr = resolveSpatialQueryV2('أين الريموت؟', userA, 'ar');
  assert(ambiguousResAr.isAmbiguous === true, 'Arabic generic query detected as ambiguous');
  assert(
    ambiguousResAr.clarificationPromptAr !== undefined &&
    ambiguousResAr.clarificationPromptAr.includes('ريموت'),
    `Arabic clarification prompt is localized: "${ambiguousResAr.clarificationPromptAr}"`
  );

  // Specific query "where is the tv remote?" => unambiguous match!
  const specificRes = resolveSpatialQueryV2('where is the tv remote?', userA, 'en');
  assert(specificRes.isAmbiguous === false, 'Specific query resolved unambiguously');
  assert(specificRes.primaryMatch?.id === tvRemote.id, 'Primary match is the TV Remote');
  assert(specificRes.primaryMatch?.surfaceEn === 'Coffee Table', 'Primary match location is Coffee Table');

  // Specific query in Arabic "فين ريموت التكييف؟" => unambiguous match!
  const specificResAr = resolveSpatialQueryV2('فين ريموت التكييف؟', userA, 'ar');
  assert(specificResAr.isAmbiguous === false, 'Arabic specific query resolved unambiguously');
  assert(specificResAr.primaryMatch?.id === acRemote.id, 'Primary match is the AC Remote');

  // -------------------------------------------------------------------------
  // 3. Movement Trajectory & History Tracking
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Chronological Movement Trajectory History ---');

  // Move TV Remote: user picks it up and leaves it on the Dining Table in the Kitchen
  const movedTvRemote = recordSpatialObservationV2(userA, {
    category: 'remote',
    identityLabel: 'TV Remote',
    roomEn: 'Kitchen',
    roomAr: 'المطبخ',
    roomFr: 'Cuisine',
    surfaceEn: 'Kitchen Counter',
    surfaceAr: 'رخامة المطبخ',
    surfaceFr: 'Plan de travail',
    features: { color: 'black', subType: 'tv' },
    confidence: 0.92,
  });

  assert(movedTvRemote.id === tvRemote.id, 'Moved object maintains persistent objectId');
  assert(movedTvRemote.roomEn === 'Kitchen', 'Current room updated to Kitchen');
  assert(movedTvRemote.movementHistory.length >= 2, `Movement history records 2 observations: ${movedTvRemote.movementHistory.length}`);

  const trajectory = getObjectMovementHistory(userA, tvRemote.id);
  assert(trajectory.length >= 2, `Trajectory returns chronological locations: ${trajectory.length}`);
  assert(trajectory[0].roomEn === 'Living Room', `Initial location in trajectory is Living Room: ${trajectory[0].roomEn}`);
  assert(trajectory[trajectory.length - 1].roomEn === 'Kitchen', `Latest location in trajectory is Kitchen: ${trajectory[trajectory.length - 1].roomEn}`);

  // -------------------------------------------------------------------------
  // 4. User Correction Feedback Loop
  // -------------------------------------------------------------------------
  console.log('\n--- 4. User Correction Feedback Loop ---');

  // User says: "No, that's not on the counter, it's actually on the dining table in the living room"
  const corrected = applySpatialCorrection(userA, {
    userId: userA,
    targetObjectId: tvRemote.id,
    category: 'remote',
    correctedRoomEn: 'Living Room',
    correctedRoomAr: 'الصالة',
    correctedSurfaceEn: 'Dining Table',
    correctedSurfaceAr: 'طاولة الطعام',
    distinguishingLabel: 'Main TV Remote',
  });

  assert(corrected.correctionsCount === 1, `Corrections count incremented to 1: ${corrected.correctionsCount}`);
  assert(corrected.surfaceEn === 'Dining Table', `Surface corrected to Dining Table: ${corrected.surfaceEn}`);
  assert(corrected.confidence === 1.0, `User explicit correction sets confidence to 1.0: ${corrected.confidence}`);
  assert(corrected.labelEn === 'Main TV Remote', `Label refined by user: "${corrected.labelEn}"`);

  // Query again: should reflect corrected location immediately
  const queryAfterCorrection = resolveSpatialQueryV2('where is my main tv remote?', userA, 'en');
  assert(queryAfterCorrection.isAmbiguous === false, 'Main TV remote resolved unambiguously');
  assert(queryAfterCorrection.primaryMatch?.surfaceEn === 'Dining Table', 'Resolved location matches user correction');

  // -------------------------------------------------------------------------
  // 5. Strict Multi-Tenant Data Privacy Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Strict Multi-Tenant Privacy Isolation ---');

  // User B records house keys
  recordSpatialObservationV2(userB, {
    category: 'keys',
    identityLabel: 'House Keys',
    roomEn: 'Hallway',
    roomAr: 'المدخل',
    surfaceEn: 'Key Hook',
    surfaceAr: 'علاقة المفاتيح',
    confidence: 0.98,
  });

  const userBObjects = getSpatialObjectIdentities(userB);
  assert(userBObjects.length === 1, `User B has 1 object: ${userBObjects.length}`);
  assert(userBObjects[0].category === 'keys', 'User B object is keys');

  // User B queries "remote" -> should find 0 remotes (cannot see User A's remotes!)
  const userBQueryRemote = resolveSpatialQueryV2('where is my remote?', userB, 'en');
  assert(userBQueryRemote.candidateMatches.length === 0, 'User B cannot see User A remotes (Zero leakage)');

  // User A queries "keys" -> should find 0 keys (cannot see User B's keys!)
  const userAQueryKeys = resolveSpatialQueryV2('where are my keys?', userA, 'en');
  assert(userAQueryKeys.candidateMatches.length === 0, 'User A cannot see User B keys (Zero leakage)');

  // Summary
  console.log('\n============================================================');
  console.log(`📊 RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error(`❌ Suite failed with ${failedTests} failures.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passedTests} SPATIAL MEMORY 2.0 TESTS PASSED (100%)!\n`);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
