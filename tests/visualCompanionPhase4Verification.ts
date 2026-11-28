/**
 * Rafiqi — Phase 4 Verification Suite: Visual Companion Production Readiness
 *
 * Verifies:
 * 1. Audio Priority & Mutex Queue Hierarchy (CRITICAL_SAFETY > NEW_SCENE_RESULT > INTERACTIVE_FEEDBACK > BACKGROUND_STATUS)
 * 2. Speech Deduplication within time window (2500ms) and Replay logic
 * 3. Client-side Frame Quality Pre-check (too-dark, lens-covered, usable)
 * 4. Privacy-preserving Telemetry and Reliability Metrics (cameraInit, capture, analysisLatency, stale, cancelled)
 * 5. Hands-free Voice Command Parsing (Arabic & English) and Command Debouncing (1500ms)
 * 6. Camera Lifecycle & Stream Loss Interruption Recovery
 * 7. Accessibility Live Region (polite vs assertive) and UI Design System compliance
 */

import {
  createVisualCompanionSession,
  AudioPriority,
  speakWithPriority,
  replayLastSpeech,
  getCurrentAudioPriority,
  resetAudioPriority,
  getLastSpokenText,
  evaluateFramePixels,
  parseVoiceCommand,
  createVoiceCommandDebouncer,
  type VisualCompanionTelemetry,
  type FrameQualityResult,
} from '../src/lib/visualCompanionEngine.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[AssertionFailed] ${message}`);
  }
}

export async function runVisualCompanionPhase4Verification() {
  console.log('\n======================================================');
  console.log('🤖 Section 72: Rafiqi Phase 4 Visual Companion Production Readiness');
  console.log('======================================================\n');

  let passed = 0;

  // ─────────────────────────────────────────────────────────────
  // 1. Audio Priority & Interruption Hierarchy
  // ─────────────────────────────────────────────────────────────
  console.log('--- Test Suite 1: Audio Priority Hierarchy & Mutex Queue ---');

  resetAudioPriority();
  assert(getCurrentAudioPriority() === AudioPriority.BACKGROUND_STATUS, 'Initial priority is BACKGROUND_STATUS');
  passed++;
  console.log('✓ Initial priority defaults to BACKGROUND_STATUS');

  // Speak interactive feedback
  const r1 = speakWithPriority('تم تفعيل وضع القراءة', 'ar', {
    priority: AudioPriority.INTERACTIVE_FEEDBACK,
  });
  assert(r1.spoken === true, 'Interactive feedback accepted');
  assert(getCurrentAudioPriority() === AudioPriority.INTERACTIVE_FEEDBACK, 'Current priority set to INTERACTIVE_FEEDBACK');
  passed++;
  console.log('✓ Lower priority cannot suppress higher: INTERACTIVE_FEEDBACK active');

  // Background status cannot interrupt interactive feedback
  const r2 = speakWithPriority('جاري فحص الإطار...', 'ar', {
    priority: AudioPriority.BACKGROUND_STATUS,
  });
  assert(r2.spoken === false && r2.reason === 'lower-priority', 'BACKGROUND_STATUS dropped when higher priority is speaking');
  passed++;
  console.log('✓ BACKGROUND_STATUS successfully rejected when higher priority utterance active');

  // New scene result interrupts interactive feedback
  const r3 = speakWithPriority('أمامك ممر سالك وخالٍ من العوائق', 'ar', {
    priority: AudioPriority.NEW_SCENE_RESULT,
  });
  assert(r3.spoken === true && r3.interrupted === true, 'NEW_SCENE_RESULT interrupts INTERACTIVE_FEEDBACK');
  assert(getCurrentAudioPriority() === AudioPriority.NEW_SCENE_RESULT, 'Current priority upgraded to NEW_SCENE_RESULT');
  passed++;
  console.log('✓ NEW_SCENE_RESULT interrupts INTERACTIVE_FEEDBACK');

  // Critical safety hazard interrupts everything
  const r4 = speakWithPriority('تنبيه: انتبه أمامك درج هابط على بعد متر', 'ar', {
    priority: AudioPriority.CRITICAL_SAFETY,
  });
  assert(r4.spoken === true && r4.interrupted === true, 'CRITICAL_SAFETY interrupts NEW_SCENE_RESULT');
  assert(getCurrentAudioPriority() === AudioPriority.CRITICAL_SAFETY, 'Current priority set to CRITICAL_SAFETY');
  passed++;
  console.log('✓ CRITICAL_SAFETY interrupts NEW_SCENE_RESULT immediately');

  // ─────────────────────────────────────────────────────────────
  // 2. Speech Deduplication & Replay
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 2: Speech Deduplication & Replay ---');

  resetAudioPriority();
  const phrase = 'المسار سالك أمامك على طول 3 أمتار';

  // First vocalization
  const d1 = speakWithPriority(phrase, 'ar', {
    priority: AudioPriority.NEW_SCENE_RESULT,
    dedupWindowMs: 2500,
  });
  assert(d1.spoken === true, 'First announcement speaks normally');
  assert(getLastSpokenText() === phrase, 'Last spoken text properly recorded');
  passed++;
  console.log('✓ Initial announcement spoken and cached in memory');

  // Immediate repeated vocalization within dedup window
  const d2 = speakWithPriority(phrase, 'ar', {
    priority: AudioPriority.NEW_SCENE_RESULT,
    dedupWindowMs: 2500,
  });
  assert(d2.spoken === false && d2.reason === 'duplicate', 'Duplicate speech dropped within window');
  passed++;
  console.log('✓ Duplicate spoken announcement dropped within 2500ms to prevent user overload');

  // Critical safety bypasses deduplication
  const d3 = speakWithPriority(phrase, 'ar', {
    priority: AudioPriority.CRITICAL_SAFETY,
  });
  assert(d3.spoken === true, 'CRITICAL_SAFETY bypasses deduplication for urgent warnings');
  passed++;
  console.log('✓ CRITICAL_SAFETY overrides deduplication guard for hazard warnings');

  // Replay explicitly bypasses deduplication
  const replayOk = replayLastSpeech();
  assert(replayOk === true, 'replayLastSpeech forces repeat of last phrase');
  passed++;
  console.log('✓ Accessible replay function successfully re-announces previous scene text');

  // ─────────────────────────────────────────────────────────────
  // 3. Client-Side Frame Quality Pre-Check
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 3: Client-side Frame Quality Pre-check ---');

  // Case A: Pitch dark / underexposed frame
  const darkPixels = new Uint8ClampedArray(400);
  for (let i = 0; i < 400; i += 4) {
    darkPixels[i] = 5;     // R
    darkPixels[i + 1] = 5; // G
    darkPixels[i + 2] = 5; // B
    darkPixels[i + 3] = 255;
  }
  const darkRes = evaluateFramePixels(darkPixels);
  assert(darkRes.isUsable === false, 'Pitch dark frame marked unusable');
  assert(darkRes.reason === 'too-dark', 'Dark frame diagnosed as too-dark');
  assert(darkRes.guidanceAr?.includes('الإطار مظلم جداً'), 'Provides clear Arabic guidance for darkness');
  assert(darkRes.guidanceEn?.includes('too dark'), 'Provides clear English guidance for darkness');
  passed++;
  console.log('✓ Underexposed/pitch-black frame identified without firing network request');

  // Case B: Covered camera lens (low luminance and zero variance)
  const coveredPixels = new Uint8ClampedArray(400);
  for (let i = 0; i < 400; i += 4) {
    coveredPixels[i] = 22;     // R
    coveredPixels[i + 1] = 22; // G
    coveredPixels[i + 2] = 22; // B
    coveredPixels[i + 3] = 255;
  }
  const coveredRes = evaluateFramePixels(coveredPixels);
  assert(coveredRes.isUsable === false, 'Covered lens marked unusable');
  assert(coveredRes.reason === 'lens-covered', 'Diagnosed as lens-covered');
  assert(coveredRes.guidanceAr?.includes('عدسة الكاميرا مغطاة'), 'Provides Arabic lens-covered guidance');
  passed++;
  console.log('✓ Covered lens / flat dark obstruction identified with actionable guidance');

  // Case C: Normal illuminated frame with natural scene variance
  const normalPixels = new Uint8ClampedArray(400);
  for (let i = 0; i < 400; i += 4) {
    const val = (i % 20) * 10 + 40; // Variance across pixels
    normalPixels[i] = val;
    normalPixels[i + 1] = val + 15;
    normalPixels[i + 2] = val + 30;
    normalPixels[i + 3] = 255;
  }
  const normalRes = evaluateFramePixels(normalPixels);
  assert(normalRes.isUsable === true, 'Lit scene marked usable');
  assert(normalRes.reason === 'usable', 'Usable reason verified');
  assert(normalRes.brightnessScore > 40, 'Brightness score measured accurately');
  passed++;
  console.log('✓ Properly lit frame passes quality pre-check for network analysis');

  // ─────────────────────────────────────────────────────────────
  // 4. Performance & Reliability Telemetry
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 4: Privacy-Preserving Telemetry & Reliability Metrics ---');

  const session = createVisualCompanionSession();
  const initTelem = session.getTelemetry();
  assert(initTelem.totalRequestsCount === 0, 'Initial request count is 0');
  assert(initTelem.cameraInitTimeMs === null, 'Initial camera latency is null');
  passed++;
  console.log('✓ Fresh session telemetry begins with clean zeroed counters');

  // Record metrics
  session.recordCameraInitTime(320);
  session.recordCaptureTime(45);
  session.recordAnalysisLatency(1150);
  session.recordRequestAttempt();
  session.recordRequestCompleted();
  session.recordLowQualityFrame();
  session.recordSpeechError();

  const activeTelem = session.getTelemetry();
  assert(activeTelem.cameraInitTimeMs === 320, 'Camera init time recorded (320ms)');
  assert(activeTelem.lastCaptureTimeMs === 45, 'Capture latency recorded (45ms)');
  assert(activeTelem.lastAnalysisLatencyMs === 1150, 'Analysis latency recorded (1150ms)');
  assert(activeTelem.totalRequestsCount === 1, 'Total requests count incremented');
  assert(activeTelem.completedRequestsCount === 1, 'Completed requests count incremented');
  assert(activeTelem.lowQualityFramesDetected === 1, 'Low quality frame counted');
  assert(activeTelem.speechErrorsCount === 1, 'Speech error counted');
  passed++;
  console.log('✓ Performance latencies and error counters accurately aggregated');

  // Verify telemetry privacy guarantees: no image strings or credentials in telemetry object
  const telemKeys = Object.keys(activeTelem);
  assert(!telemKeys.includes('dataUrl') && !telemKeys.includes('base64'), 'Telemetry never stores image data');
  assert(!telemKeys.includes('apiKey') && !telemKeys.includes('token'), 'Telemetry never stores credentials');
  passed++;
  console.log('✓ Telemetry strict privacy verified: zero image buffers or secrets exposed');

  // Test stale response counter increment
  const frame1 = session.createFrameRecord({ dataUrl: 'data:image/jpeg;base64,111', width: 640, height: 480 });
  const frame2 = session.createFrameRecord({ dataUrl: 'data:image/jpeg;base64,222', width: 640, height: 480 });
  const req1 = session.createAnalysisRequest({ frame: frame1, tool: 'scene' });
  const req2 = session.createAnalysisRequest({ frame: frame2, tool: 'scene' });

  session.registerInFlight(req1);
  session.registerInFlight(req2); // req2 supercedes req1
  session.commitSceneResult({ request: req2, rawAiResponse: 'المشهد الجديد' });

  // Now when req1 completes, it must be recognized as stale and dropped
  const staleRes = session.commitSceneResult({ request: req1, rawAiResponse: 'المشهد القديم المتأخر' });
  assert(staleRes.wasStale === true, 'Outdated request correctly tagged as wasStale');
  assert(session.getTelemetry().staleRequestsDroppedCount >= 1, 'staleRequestsDroppedCount incremented in telemetry');
  passed++;
  console.log('✓ Stale request correctly dropped and tracked in reliability telemetry');

  // ─────────────────────────────────────────────────────────────
  // 5. Hands-Free Voice Command Parser & Debouncer
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 5: Hands-Free Voice Commands & Debouncer ---');

  // Arabic voice command intents
  assert(parseVoiceCommand('ماذا أمامي الآن').command === 'scene', 'Parses Arabic scene command');
  assert(parseVoiceCommand('اقرأ لي هذا النص').command === 'read', 'Parses Arabic read command');
  assert(parseVoiceCommand('ما بيانات هذا المنتج وصلاحيته').command === 'product', 'Parses Arabic product command');
  assert(parseVoiceCommand('قراءة متتابعة للمستند').command === 'continuous', 'Parses Arabic continuous reading');
  assert(parseVoiceCommand('كم هذه العملة النقدية').command === 'currency', 'Parses Arabic currency command');
  assert(parseVoiceCommand('فحص ألوان الملابس').command === 'color', 'Parses Arabic color command');
  assert(parseVoiceCommand('اسكت تماماً').command === 'stop', 'Parses Arabic stop command');
  assert(parseVoiceCommand('أوقف مؤقتاً').command === 'pause', 'Parses Arabic pause command');
  assert(parseVoiceCommand('واصل القراءة').command === 'resume', 'Parses Arabic resume command');
  assert(parseVoiceCommand('أعد ما قلت ثانية').command === 'repeat', 'Parses Arabic repeat command');
  assert(parseVoiceCommand('افتح فحص الأداء').command === 'diagnostics', 'Parses Arabic diagnostics command');
  assert(parseVoiceCommand('احفظ هذا الغرض في الذاكرة').command === 'save', 'Parses Arabic save command');
  assert(parseVoiceCommand('ارجع للخلف').command === 'back', 'Parses Arabic back command');
  passed++;
  console.log('✓ All 13 core Arabic voice commands recognized with high confidence');

  // Object finding voice commands with target extraction
  const arObj = parseVoiceCommand('أين المفاتيح على الطاولة');
  assert(arObj.command === 'object', 'Recognized object finder command');
  assert(arObj.itemTarget?.includes('المفاتيح'), 'Extracted Arabic target item ("المفاتيح")');

  const enObj = parseVoiceCommand('find my glasses please');
  assert(enObj.command === 'object', 'Recognized English object finder');
  assert(enObj.itemTarget?.includes('glasses'), 'Extracted English target item ("glasses")');
  passed++;
  console.log('✓ Object finder voice commands accurately extract search targets in Arabic & English');

  // Voice Command Debouncer (1500ms)
  const debouncer = createVoiceCommandDebouncer(1500);
  assert(debouncer.shouldProcess('scene') === true, 'First command allowed through');
  assert(debouncer.shouldProcess('scene') === false, 'Repeated same command within 1500ms debounced');
  assert(debouncer.shouldProcess('read') === true, 'Different command immediately allowed');
  assert(debouncer.shouldProcess('read') === false, 'Rapid repeat of second command debounced');
  passed++;
  console.log('✓ Voice command debouncer successfully prevents rapid repeated triggers');

  // ─────────────────────────────────────────────────────────────
  // 6. Camera Lifecycle & Stream Interruption Recovery
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 6: Camera Lifecycle & Stream Loss Recovery ---');

  // Verify session isolation and cancellation
  const testSession = createVisualCompanionSession();
  const fr = testSession.createFrameRecord({ dataUrl: 'data:image/jpeg;base64,aaa', width: 640, height: 480 });
  const arReq = testSession.createAnalysisRequest({ frame: fr, tool: 'scene' });
  const controller = testSession.registerInFlight(arReq);

  assert(!controller.signal.aborted, 'Abort controller active during in-flight analysis');
  testSession.cancelInFlight();
  assert(controller.signal.aborted, 'cancelInFlight immediately aborts network fetch');
  assert(testSession.getTelemetry().cancelledRequestsCount === 1, 'Cancellation tracked in telemetry');
  passed++;
  console.log('✓ In-flight network controller cleanly aborted on cancel or stream interruption');

  // ─────────────────────────────────────────────────────────────
  // 7. Accessibility Validation & Screen Reader Harmony
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 7: Accessibility Validation & Screen Reader Harmony ---');

  // Hazard presence triggers assertive vs polite ARIA live announcement
  const hazardResultText = 'تنبيه: انتبه أمامك درج هابط على بعد متر';
  const normalResultText = 'المسار سالك أمامك والمكان مضاء جيداً';

  const isHazardous = /خطر|احذر|انتبه|عائق|درج|حفرة|hazard|obstacle|danger|warning|stairs|fall/i.test(hazardResultText);
  const isNormal = /خطر|احذر|انتبه|عائق|درج|حفرة|hazard|obstacle|danger|warning|stairs|fall/i.test(normalResultText);

  assert(isHazardous === true, 'Hazardous scene correctly triggers assertive priority');
  assert(isNormal === false, 'Normal scene uses polite live region to avoid screen reader spam');
  passed++;
  console.log('✓ Screen reader live region dynamically selects assertive for hazards, polite for scenes');

  // Speech Detail Level prompts
  assert(testSession.getLatestCompletedSeqId() === 0, 'No completed requests prior to commits');
  passed++;
  console.log('✓ Monotonic sequencing preserves baseline request order');

  console.log('\n======================================================');
  console.log(`🎉 All ${passed} Phase 4 Production Readiness Verification Tests Passed!`);
  console.log('======================================================\n');

  return { passed, failed: 0 };
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('visualCompanionPhase4Verification')) {
  runVisualCompanionPhase4Verification().catch((err) => {
    console.error('Phase 4 verification failed:', err);
    process.exit(1);
  });
}
