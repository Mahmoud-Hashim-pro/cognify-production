/**
 * Rafiqi — Phase 2: Visual Companion Intelligence Core Verification Suite
 *
 * Verifies all 6 priorities:
 * 1. Scene Freshness, Unique Frame IDs, and Stale-Response Protection
 * 2. Intelligent Scene Understanding, Spatial Clock-Face Positions & Uncertainty
 * 3. Visual Question Answering (VQA) with Fresh Frame Association
 * 4. Arabic and English Printed Text OCR with Reading Order Preservation
 * 5. Accessible Voice Interaction, Interruptibility, Pause/Resume & Controls
 * 6. Performance, Reliability, Safety & Privacy Guards
 */

import {
  createVisualCompanionSession,
  buildCompanionPrompt,
  detectUncertainty,
  detectSceneChange,
  extractSpatialRelations,
  QUICK_VQA_PRESETS,
  SAFETY_DISCLAIMER_AR,
  SAFETY_DISCLAIMER_EN,
  type VisualAnalysisRequest,
  type CameraFrameRecord,
} from '../src/lib/visualCompanionEngine.js';
import { cleanVisionDescription } from '../src/lib/visionCleaner.js';
import { pauseSpeech, resumeSpeech, isSpeechPaused, cancelSpeech, cleanForSpeech } from '../src/lib/tts.js';
import * as fs from 'fs';
import * as path from 'path';

export async function runVisualCompanionPhase2Verification(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- [Phase 2: Visual Companion Intelligence Core Verification] ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // =========================================================================
  // PRIORITY 1: Scene Freshness, Monotonic Sequencing & Stale-Response Protection
  // =========================================================================
  console.log('\n  [Priority 1: Scene Freshness & Request Ordering]');
  {
    const session = createVisualCompanionSession();

    // 1.1 Monotonic sequence numbers
    const seq1 = session.nextSeqId();
    const seq2 = session.nextSeqId();
    const seq3 = session.nextSeqId();
    assert(seq1 < seq2 && seq2 < seq3, 'Sequence IDs strictly increment monotonically');

    // 1.2 Unique Frame ID generation
    const frame1 = session.createFrameRecord({
      dataUrl: 'data:image/jpeg;base64,dummyframe1',
      width: 1280,
      height: 720,
      source: 'live-camera',
    });
    const frame2 = session.createFrameRecord({
      dataUrl: 'data:image/jpeg;base64,dummyframe2',
      width: 1280,
      height: 720,
      source: 'live-camera',
    });
    assert(frame1.frameId.startsWith('frame_') && frame2.frameId.startsWith('frame_'), 'Frames are tagged with frame_ prefix');
    assert(frame1.frameId !== frame2.frameId, 'Each captured frame receives a distinct unique frameId');
    assert(frame1.timestamp > 0 && frame2.timestamp >= frame1.timestamp, 'Frames carry capture timestamps');

    // 1.3 Analysis Request creation referencing exact frame
    const req1 = session.createAnalysisRequest({ frame: frame1, tool: 'scene', lang: 'ar' });
    const req2 = session.createAnalysisRequest({ frame: frame2, tool: 'scene', lang: 'ar' });
    assert(req1.frameId === frame1.frameId, 'Analysis request #1 references exact frameId #1');
    assert(req2.frameId === frame2.frameId, 'Analysis request #2 references exact frameId #2');
    assert(req1.seqId === frame1.seqId && req2.seqId === frame2.seqId, 'Request sequence IDs match frame sequence IDs');

    // 1.4 In-flight request registration & abort management
    const ctrl1 = session.registerInFlight(req1);
    assert(!ctrl1.signal.aborted, 'Initial request AbortController is active and not aborted');

    // Starting request #2 automatically cancels request #1 to prevent overlapping requests
    const ctrl2 = session.registerInFlight(req2);
    assert(ctrl1.signal.aborted, 'Starting request #2 cancels request #1 AbortController');
    assert(!ctrl2.signal.aborted, 'Request #2 AbortController is active');

    // 1.5 Stale Response Protection: An older or superseded request must NEVER overwrite a newer frame
    const commitReq2 = session.commitSceneResult({
      request: req2,
      rawAiResponse: 'المسار سالك أمامك والمكتب على يمينك عند الساعة 2.',
      snapshotDataUrl: frame2.dataUrl,
    });
    assert(!commitReq2.wasStale, 'Newest request #2 commits successfully as current scene');
    assert(session.getCurrentScene()?.frameId === frame2.frameId, 'Current scene is bound to frame #2');

    // Now if delayed response for req1 arrives AFTER req2 has completed:
    const commitReq1 = session.commitSceneResult({
      request: req1,
      rawAiResponse: 'المشهد القديم: زجاجة ماء أمامك.',
      snapshotDataUrl: frame1.dataUrl,
    });
    assert(commitReq1.wasStale, 'Delayed response for older frame #1 is rejected as stale');
    assert(session.getCurrentScene()?.frameId === frame2.frameId, 'Older frame #1 response did NOT overwrite current scene #2');
    assert(session.getCurrentScene()?.description.includes('المسار سالك'), 'Current scene retains fresh result from frame #2');

    // 1.6 Separation between Current Scene and Scene History
    const history = session.getSceneHistory();
    assert(Array.isArray(history), 'Session maintains scene history array');
  }

  // =========================================================================
  // PRIORITY 2: Intelligent Scene Understanding & Uncertainty Communication
  // =========================================================================
  console.log('\n  [Priority 2: Intelligent Scene Understanding & Uncertainty]');
  {
    // 2.1 Spatial clock-face and directional position extraction
    const arabicSpatialDesc = 'المسار سالك أمامك مباشرة، وهناك كوب ماء عند الساعة 2 على بعد 40 سم، ومفاتيح على يسارك.';
    const spatialRelations = extractSpatialRelations(arabicSpatialDesc, 'ar');
    assert(spatialRelations.some((r) => r.clockPosition === 2), 'Extracts 2 o\'clock position from Arabic description');
    assert(spatialRelations.some((r) => r.direction === 'front'), 'Extracts directly in front position');
    assert(spatialRelations.some((r) => r.direction === 'left'), 'Extracts left side position');

    const englishSpatialDesc = 'The path is clear. A mug is located at 10 o\'clock about 50 cm away on your desk.';
    const spatialEn = extractSpatialRelations(englishSpatialDesc, 'en');
    assert(spatialEn.some((r) => r.clockPosition === 10), 'Extracts 10 o\'clock position from English description');

    // 2.2 Explicit Uncertainty Communication
    const uncertainDescAr = 'الصورة غير واضحة تماماً بسبب الإضاءة الخافتة، يبدو كأنه كتاب على الطاولة.';
    const certDescAr = 'أمامك طاولة بيضاء واضحة عليها حاسوب محمول أسود وكوب قهوة.';
    assert(detectUncertainty(uncertainDescAr, 'ar').isUncertain === true, 'Detects explicit uncertainty in Arabic description');
    assert(detectUncertainty(certDescAr, 'ar').isUncertain === false, 'Detects confident certainty in clear Arabic description');

    const uncertainDescEn = 'The image is dimly lit and blurry, appears to be a chair in the background.';
    const certDescEn = 'Area directly ahead is clear with an open doorway at 12 o\'clock.';
    assert(detectUncertainty(uncertainDescEn, 'en').isUncertain === true, 'Detects explicit uncertainty in English description');
    assert(detectUncertainty(certDescEn, 'en').isUncertain === false, 'Detects confident certainty in clear English description');

    // 2.3 Material Scene Change Detection (Avoids Redundant Repetition)
    const sceneA = 'المسار سالك أمامك ويوجد مكتب دراسي أبيض وحاسوب.';
    const sceneSame = 'المسار سالك أمامك ويوجد مكتب دراسي وحاسوب.';
    const sceneDifferent = 'أنت الآن في ممر مفتوح أمامك درج هابط على بعد مترين.';

    const changeResultSame = detectSceneChange(sceneA, sceneSame, 'ar');
    assert(changeResultSame.changed === false, 'Detects scene is virtually unchanged');
    assert(changeResultSame.summary.includes('المشهد'), 'Produces concise scene unchanged summary');

    const changeResultDiff = detectSceneChange(sceneA, sceneDifferent, 'ar');
    assert(changeResultDiff.changed === true, 'Detects material scene change when view transitions');
  }

  // =========================================================================
  // PRIORITY 3: Visual Question Answering (VQA)
  // =========================================================================
  console.log('\n  [Priority 3: Visual Question Answering (VQA)]');
  {
    // 3.1 Presets availability
    assert(QUICK_VQA_PRESETS.length >= 5, 'At least 5 quick VQA presets defined');
    const ids = QUICK_VQA_PRESETS.map((p) => p.id);
    assert(ids.includes('in_front'), 'Includes "What is in front of me" preset');
    assert(ids.includes('find_items'), 'Includes "Find nearby items" preset');
    assert(ids.includes('read_text'), 'Includes "Read written text" preset');
    assert(ids.includes('describe_room'), 'Includes "Describe room layout" preset');
    assert(ids.includes('check_obstacles'), 'Includes "Check obstacles" preset');

    // 3.2 VQA Prompt Construction
    const vqaPromptAr = buildCompanionPrompt({
      tool: 'scene',
      queryType: 'vqa',
      question: 'أين كوب القهوة؟',
      detailLevel: 'standard',
      lang: 'ar',
      previousDescription: 'أمامك مكتب دراسي.',
    });
    assert(vqaPromptAr.includes('أين كوب القهوة؟'), 'VQA prompt embeds user question');
    assert(vqaPromptAr.includes('بالساعة والمسافة التقديرية'), 'VQA prompt instructs clock and distance localization');
    assert(vqaPromptAr.includes('غير مرئي'), 'VQA prompt instructs stating if item is not visible without inventing');

    const vqaPromptEn = buildCompanionPrompt({
      tool: 'scene',
      queryType: 'vqa',
      question: 'Where is the cup?',
      detailLevel: 'standard',
      lang: 'en',
    });
    assert(vqaPromptEn.includes('Where is the cup?'), 'English VQA prompt embeds user question');
    assert(vqaPromptEn.includes('Never invent object positions'), 'English VQA enforces truthfulness mandate');
  }

  // =========================================================================
  // PRIORITY 4: Arabic and English OCR with Reading Order Preservation
  // =========================================================================
  console.log('\n  [Priority 4: Arabic and English Printed Text OCR]');
  {
    const ocrPromptAr = buildCompanionPrompt({
      tool: 'read',
      queryType: 'ocr',
      detailLevel: 'standard',
      lang: 'ar',
    });
    assert(ocrPromptAr.includes('الترتيب الطبيعي للقراءة'), 'Arabic OCR enforces natural reading order');
    assert(ocrPromptAr.includes('من اليمين لليسار للسطور العربية'), 'Arabic OCR specifies RTL order');
    assert(ocrPromptAr.includes('لا تدّعي قراءة خط اليد'), 'Arabic OCR enforces printed text honesty');

    const ocrPromptEn = buildCompanionPrompt({
      tool: 'read',
      queryType: 'ocr',
      detailLevel: 'standard',
      lang: 'en',
    });
    assert(ocrPromptEn.includes('preserving natural reading order'), 'English OCR enforces reading order');
    assert(ocrPromptEn.includes('Do not claim handwriting recognition'), 'English OCR enforces printed text honesty');
  }

  // =========================================================================
  // PRIORITY 5: Accessible Voice Interaction, Interruptibility & Controls
  // =========================================================================
  console.log('\n  [Priority 5: Accessible Voice Interaction & Speech Controls]');
  {
    // 5.1 Speech functions export check
    assert(typeof pauseSpeech === 'function', 'pauseSpeech function is exported');
    assert(typeof resumeSpeech === 'function', 'resumeSpeech function is exported');
    assert(typeof isSpeechPaused === 'function', 'isSpeechPaused function is exported');
    assert(typeof cancelSpeech === 'function', 'cancelSpeech function is exported');

    // 5.2 Speech synthesis text cleaning
    const rawSpeechAr = '**وصف المشهد:** أمامك كرسي ومكتب. **المخاطر:** لا توجد أخطار. نجمة استريك';
    const cleanedAr = cleanForSpeech(rawSpeechAr);
    assert(!cleanedAr.includes('**'), 'TTS cleaner strips bold asterisks');
    assert(!cleanedAr.includes('المخاطر:'), 'TTS cleaner strips robotic hazards header');
    assert(!cleanedAr.includes('استريك') && !cleanedAr.includes('نجمة'), 'TTS cleaner strips spoken asterisk words');

    // 5.3 Verbosity level prompts
    const concisePrompt = buildCompanionPrompt({
      tool: 'scene',
      queryType: 'scene',
      detailLevel: 'concise',
      lang: 'ar',
    });
    assert(concisePrompt.includes('في جملة واحدة فقط'), 'Concise prompt requests exactly 1 sentence');

    const detailedPrompt = buildCompanionPrompt({
      tool: 'scene',
      queryType: 'scene',
      detailLevel: 'detailed',
      lang: 'ar',
    });
    assert(detailedPrompt.includes('3 إلى 4 جمل'), 'Detailed prompt requests 3-4 sentences with spatial layout');
  }

  // =========================================================================
  // PRIORITY 6: Performance, Reliability, Safety & Privacy Guards
  // =========================================================================
  console.log('\n  [Priority 6: Reliability, Safety & Privacy]');
  {
    // 6.1 Safety disclaimers
    assert(SAFETY_DISCLAIMER_AR.includes('أداة استرشادية ذكية ولا يضمن الأمان التام'), 'Arabic safety disclaimer is defined and accurate');
    assert(SAFETY_DISCLAIMER_EN.includes('cannot guarantee navigational safety'), 'English safety disclaimer is defined and accurate');

    // 6.2 Strict Privacy: Face recognition prohibits naming private individuals
    const facePromptAr = buildCompanionPrompt({
      tool: 'face',
      queryType: 'face',
      detailLevel: 'standard',
      lang: 'ar',
    });
    assert(facePromptAr.includes('لا تذكر أبداً أسماء شخصية حقيقية'), 'Face tool enforces privacy and prohibits naming private individuals');

    const facePromptEn = buildCompanionPrompt({
      tool: 'face',
      queryType: 'face',
      detailLevel: 'standard',
      lang: 'en',
    });
    assert(facePromptEn.includes('Never guess or output real names of private individuals'), 'English Face tool enforces privacy');

    // 6.3 UI View Verification: Ensure VisionCompanionView incorporates Phase 2 features
    const viewPath = path.resolve(process.cwd(), 'src', 'components', 'VisionCompanionView.tsx');
    const viewCode = fs.readFileSync(viewPath, 'utf8');
    assert(viewCode.includes('createVisualCompanionSession'), 'VisionCompanionView connects visualCompanionEngine session');
    assert(viewCode.includes('QUICK_VQA_PRESETS'), 'VisionCompanionView renders QUICK_VQA_PRESETS bar');
    assert(viewCode.includes('SAFETY_DISCLAIMER_AR'), 'VisionCompanionView renders Safety Disclaimer');
    assert(viewCode.includes('handlePauseSpeech') && viewCode.includes('handleResumeSpeech'), 'VisionCompanionView has speech pause/resume controls');
    assert(viewCode.includes('showHistoryModal'), 'VisionCompanionView has scene observation history modal');
  }

  console.log(`\nPhase 2 Visual Companion Intelligence Core Summary: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}

// Direct execution support
if (process.argv[1]?.endsWith('visualCompanionPhase2Verification.ts')) {
  runVisualCompanionPhase2Verification()
    .then(({ failed }) => {
      if (failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
