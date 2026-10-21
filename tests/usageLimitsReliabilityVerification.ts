/**
 * Milestone 34 Verification Suite: Cognify Usage Limits & Reliability Engine
 * (Phase 8: Assistive Quotas, Deduplication, User-Isolated Caching & Job Recovery)
 */

import {
  ASSISTIVE_QUOTAS,
  checkAndConsumeQuota,
  getUserUsageSnapshot,
  deduplicateInflight,
  generateUserContentHash,
  setCachedResult,
  getCachedResult,
  createProcessingJob,
  updateJobProgress,
  completeProcessingJob,
  getProcessingJob,
  resetUsageEngineForTesting,
  setUserDailyUsageForTesting,
  type AssistiveQuotaCategory,
} from '../api/_lib/usageQuotaEngine.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

export async function runUsageLimitsReliabilityVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Running Usage Limits & Reliability Suite (Milestone 34) ---');

  resetUsageEngineForTesting();

  // ==========================================================================
  // Suite 1: Generous Assistive Quota Definitions & Distinct Accounting
  // ==========================================================================
  console.log('\n  [Suite 1: Generous Assistive Quota Definitions & Distinct Accounting]');
  {
    assert(Boolean(ASSISTIVE_QUOTAS.camera_vision), 'Camera vision quota category is defined');
    assert(ASSISTIVE_QUOTAS.camera_vision.burstPerMinute === 120, 'Camera vision allows 120 req/min burst (2 frames/sec)');
    assert(ASSISTIVE_QUOTAS.camera_vision.dailyAllowance === 1500, 'Camera vision provides generous 1,500 daily allowance');

    assert(Boolean(ASSISTIVE_QUOTAS.ocr_reading), 'OCR reading quota category is defined');
    assert(ASSISTIVE_QUOTAS.ocr_reading.dailyAllowance === 500, 'OCR text recognition provides generous 500 daily scans');

    assert(Boolean(ASSISTIVE_QUOTAS.stickers_images), 'Stickers & images quota category is defined');
    assert(ASSISTIVE_QUOTAS.stickers_images.dailyAllowance === 300, 'Sticker explainer provides 300 daily explanations');

    assert(Boolean(ASSISTIVE_QUOTAS.audio_transcription), 'Audio lecture transcription quota category is defined');
    assert(ASSISTIVE_QUOTAS.audio_transcription.costWeight === 5, 'Audio lecture transcription accounts for expensive compute separately (costWeight 5)');
    assert(ASSISTIVE_QUOTAS.audio_transcription.dailyAllowance === 30, 'Audio transcription provides 30 daily lectures (~150 minutes)');

    assert(Boolean(ASSISTIVE_QUOTAS.document_studio), 'Educational Book Studio & PDF quota category is defined');
    assert(ASSISTIVE_QUOTAS.document_studio.dailyAllowance === 200, 'Document Studio & PDF Assistant provides 200 daily operations');

    assert(Boolean(ASSISTIVE_QUOTAS.general_chat), 'General tutor chat quota category is defined');
    assert(ASSISTIVE_QUOTAS.general_chat.dailyAllowance === 1000, 'General chat provides 1,000 daily messages');
  }

  // ==========================================================================
  // Suite 2: Quota Consumption, Burst & Daily Fair-Use Enforcement
  // ==========================================================================
  console.log('\n  [Suite 2: Quota Consumption, Burst & Daily Fair-Use Enforcement]');
  {
    resetUsageEngineForTesting();
    const testUser = 'user_student_alpha';

    // 1. Initial consumption within allowance
    const initialCheck = checkAndConsumeQuota(testUser, 'camera_vision', 1);
    assert(initialCheck.allowed === true, 'Initial camera vision request is allowed');
    assert(initialCheck.burstRemaining === 119, 'Burst remaining decrements to 119');
    assert(initialCheck.dailyRemaining === 1499, 'Daily remaining decrements to 1499');
    assert(Boolean(initialCheck.resetTimeUtc), 'Includes ISO UTC reset timestamp');
    assert(initialCheck.resetInSeconds > 0, 'Includes positive reset countdown seconds');

    // 2. Separate accounting: Audio consumption does NOT deplete Camera Vision
    const audioCheck = checkAndConsumeQuota(testUser, 'audio_transcription', 1);
    assert(audioCheck.allowed === true, 'Audio transcription request allowed in separate bucket');
    assert(audioCheck.dailyRemaining === 29, 'Audio daily remaining is 29 (independent from vision)');

    const cameraCheckAfterAudio = checkAndConsumeQuota(testUser, 'camera_vision', 1);
    assert(cameraCheckAfterAudio.dailyRemaining === 1498, 'Camera vision remaining still 1498 (unaffected by audio)');

    // 3. Daily Allowance Exhaustion & Accessible Explanation
    const testUserLimited = 'user_exhausted_student';
    // Set daily count to allowance limit (30) directly
    setUserDailyUsageForTesting(testUserLimited, 'audio_transcription', 30);
    const blockedCheck = checkAndConsumeQuota(testUserLimited, 'audio_transcription', 1);

    assert(blockedCheck.allowed === false, 'Blocked when daily allowance exhausted');
    assert(blockedCheck.limitType === 'daily', 'Reports limitType as daily');
    assert(blockedCheck.dailyRemaining === 0, 'Daily remaining is 0');
    assert(Boolean(blockedCheck.explanation?.en), 'Provides accessible English explanation');
    assert(blockedCheck.explanation?.en.includes('daily allowance of 30'), 'English message mentions daily allowance of 30');
    assert(Boolean(blockedCheck.explanation?.ar), 'Provides accessible Arabic explanation');
    assert(blockedCheck.explanation?.ar.includes('الحصة اليومية'), 'Arabic message mentions daily allowance');
    assert(Boolean(blockedCheck.explanation?.fr), 'Provides accessible French explanation');

    // 4. Other categories remain operational when one is exhausted!
    const stickerCheckWhenAudioExhausted = checkAndConsumeQuota(testUserLimited, 'stickers_images', 1);
    assert(stickerCheckWhenAudioExhausted.allowed === true, 'Other features (stickers) continue working when audio is exhausted');
  }

  // ==========================================================================
  // Suite 3: In-Flight Request Deduplication (Coalescing Concurrent Calls)
  // ==========================================================================
  console.log('\n  [Suite 3: In-Flight Request Deduplication (Coalescing Concurrent Calls)]');
  {
    resetUsageEngineForTesting();

    let actualProviderCallCount = 0;
    const mockProviderOperation = async () => {
      actualProviderCallCount++;
      await new Promise((r) => setTimeout(r, 25));
      return 'Scene contains a chemistry blackboard with molecular formulas';
    };

    const dedupKey = 'dedup_user_123_scene_frame_hash';

    // Fire 4 simultaneous calls with the same key (e.g. rapid multiple clicks)
    const [res1, res2, res3, res4] = await Promise.all([
      deduplicateInflight(dedupKey, mockProviderOperation),
      deduplicateInflight(dedupKey, mockProviderOperation),
      deduplicateInflight(dedupKey, mockProviderOperation),
      deduplicateInflight(dedupKey, mockProviderOperation),
    ]);

    assert(actualProviderCallCount === 1, '4 simultaneous calls coalesced into exactly 1 provider execution');
    assert(res1 === res2 && res2 === res3 && res3 === res4, 'All concurrent callers received the identical valid result');

    // Subsequent call after completion runs fresh
    await deduplicateInflight(dedupKey, mockProviderOperation);
    assert(actualProviderCallCount === 2, 'Subsequent call after completion executes fresh producer');
  }

  // ==========================================================================
  // Suite 4: User-Isolated Idempotent Response Caching (Zero Cross-User Exposure)
  // ==========================================================================
  console.log('\n  [Suite 4: User-Isolated Idempotent Response Caching (Zero Cross-User Exposure)]');
  {
    resetUsageEngineForTesting();

    const userA = 'student_nadia_id_101';
    const userB = 'student_omar_id_202';
    const sharedStickerData = 'base64_webp_sticker_payload_data_thumbs_up';

    const hashA = generateUserContentHash(userA, 'stickers_images', sharedStickerData);
    const hashB = generateUserContentHash(userB, 'stickers_images', sharedStickerData);

    assert(hashA !== hashB, 'User A and User B generate distinct cache hashes for identical media data');

    // Store User A's private analysis result
    const resultUserA = 'A cheerful animated cartoon character giving a thumbs up in Arabic approval';
    setCachedResult(hashA, userA, 'stickers_images', resultUserA);

    // User A can read their own cached result
    const retrievedA = getCachedResult(hashA, userA);
    assert(retrievedA === resultUserA, 'User A retrieves their own cached result successfully');

    // CRITICAL SECURITY INVARIANT: User B CANNOT read User A's cached result!
    const crossUserAttempt = getCachedResult(hashA, userB);
    assert(crossUserAttempt === null, 'SECURITY: User B cannot retrieve User A cached result (BOLA protection)');

    // Non-existent key returns null
    const nonExistent = getCachedResult('non_existent_key', userA);
    assert(nonExistent === null, 'Missing cache entry safely returns null');
  }

  // ==========================================================================
  // Suite 5: Long-Running Job Progress & Recovery Engine
  // ==========================================================================
  console.log('\n  [Suite 5: Long-Running Job Progress & Recovery Engine]');
  {
    resetUsageEngineForTesting();

    const studentUid = 'user_audio_lecture_learner';

    // 1. Create a 4-chunk audio transcription job
    const job = createProcessingJob(studentUid, 'audio_transcription', 4);
    assert(Boolean(job.jobId), 'Created job receives unique jobId');
    assert(job.status === 'queued', 'Initial job status is "queued"');
    assert(job.progressPercent === 0, 'Initial progress is 0%');
    assert(job.totalChunks === 4, 'Job totalChunks is 4');

    // 2. Update progress chunk 1
    const p1 = updateJobProgress(job.jobId, 1);
    assert(p1?.progressPercent === 25, 'Progress after chunk 1 is 25%');
    assert(p1?.status === 'processing', 'Status transitions to "processing"');

    // 3. Update progress chunk 2
    const p2 = updateJobProgress(job.jobId, 2);
    assert(p2?.progressPercent === 50, 'Progress after chunk 2 is 50%');

    // 4. Client network recovery check: retrieve job by ID
    const recovered = getProcessingJob(job.jobId, studentUid);
    assert(recovered?.progressPercent === 50, 'Recovered job status retains 50% progress');
    assert(recovered?.completedChunks === 2, 'Recovered job retains completedChunks count 2');

    // 5. Complete job with transcript result
    const completed = completeProcessingJob(job.jobId, {
      fullTranscript: 'Welcome to Lecture 5 on Data Structures and Binary Trees...',
      segmentsCount: 24,
    });
    assert(completed?.status === 'completed', 'Final job status is "completed"');
    assert(completed?.progressPercent === 100, 'Completed job progress is 100%');
    assert(Boolean(completed?.result?.fullTranscript), 'Completed job preserves final transcript payload');

    // 6. Cross-user access blocked
    const unauthorizedInspect = getProcessingJob(job.jobId, 'malicious_user_spy');
    assert(unauthorizedInspect === null, 'BOLA: Unauthorized user cannot inspect or recover another student job');
  }

  // ==========================================================================
  // Suite 6: Transparent Snapshot & User Accounting Snapshot
  // ==========================================================================
  console.log('\n  [Suite 6: Transparent Snapshot & User Accounting Snapshot]');
  {
    resetUsageEngineForTesting();
    const testUser = 'user_transparency_student';

    checkAndConsumeQuota(testUser, 'camera_vision', 10);
    checkAndConsumeQuota(testUser, 'ocr_reading', 5);

    const snapshot = getUserUsageSnapshot(testUser);
    assert(snapshot.uid === testUser, 'Snapshot contains user UID');
    assert(Boolean(snapshot.resetTimeUtc), 'Snapshot contains next UTC reset time');

    const visionStats = snapshot.categories.camera_vision;
    assert(visionStats.dailyUsed === 10, 'Snapshot reflects 10 camera frames used');
    assert(visionStats.dailyRemaining === 1490, 'Snapshot reflects 1490 camera frames remaining');
    assert(visionStats.dailyLimit === 1500, 'Snapshot reflects 1500 daily limit');

    const ocrStats = snapshot.categories.ocr_reading;
    assert(ocrStats.dailyUsed === 5, 'Snapshot reflects 5 OCR reads used');
    assert(ocrStats.dailyRemaining === 495, 'Snapshot reflects 495 OCR reads remaining');

    const audioStats = snapshot.categories.audio_transcription;
    assert(audioStats.dailyUsed === 0, 'Unused category reports 0 used');
    assert(audioStats.dailyRemaining === 30, 'Unused category reports full allowance remaining (30)');
  }

  console.log(`\nUsage Limits & Reliability Verification Complete: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Direct execution when run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('usageLimitsReliabilityVerification.ts')) {
  runUsageLimitsReliabilityVerification().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
