/**
 * Rafiqi — Phase 5: Egyptian Sign Language Recognition Engine Verification Suite
 *
 * Verifies:
 * 1. Pre-Implementation Gate evaluation and refusal to fabricate artificial models.
 * 2. Initial core vocabulary specification (25 signs across 5 categories from MCIT dictionary).
 * 3. Video preprocessing, 21-hand landmark normalization, and non-manual facial cue extraction.
 * 4. Temporal sliding window buffering and idle/rest posture detection.
 * 5. Out-of-vocabulary (OOV) rejection and uncertainty threshold handling.
 * 6. Rigorous mathematical computation of Precision, Recall, F1, Confusion Matrix, and OOD metrics.
 * 7. Signer generalization gap calculation between dependent and independent splits.
 * 8. Performance profiling (latency stats, WebGL/WebGPU probing, low lighting, hand occlusion).
 */

import { EslPreImplementationGate } from '../src/modules/hearAndExpress/signLanguage/preImplementationGate';
import { EslVocabularyCatalog } from '../src/modules/hearAndExpress/signLanguage/vocabularyCatalog';
import {
  EslRecognitionPipeline,
  type HolisticFrameFeatures,
  type IEslRecognitionModel,
} from '../src/modules/hearAndExpress/signLanguage/recognitionPipeline';
import { EslEvaluationFramework } from '../src/modules/hearAndExpress/signLanguage/evaluationFramework';
import { EslPerformanceBenchmark } from '../src/modules/hearAndExpress/signLanguage/performanceBenchmark';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

export async function runSignLanguagePhase5Verification(): Promise<{ passed: number; failed: number }> {
  console.log('\n[Phase 5] Egyptian Sign Language Recognition Engine Verification Suite\n');

  // =========================================================================
  // Section 1: Pre-Implementation Gate Evaluation
  // =========================================================================
  console.log('Section 1: Pre-Implementation Gate Evaluation');
  const gateAudit = EslPreImplementationGate.evaluateGate();

  assert(gateAudit.isGatePassed === false, 'Gate accurately reports isGatePassed is FALSE (no commercial multi-signer continuous data exists)');
  assert(gateAudit.canTrainOrDeployModel === false, 'Strict invariant: canTrainOrDeployModel is FALSE');
  assert(gateAudit.mandatedNextAction === 'implement_pipeline_foundation_only', 'Mandates fallback: implement_pipeline_foundation_only');
  assert(gateAudit.formalAuditSummaryEn.includes('DO NOT FABRICATE A MODEL'), 'English gate summary explicitly directs NOT to fabricate a model');
  assert(gateAudit.formalAuditSummaryAr.includes('عدم اختلاق أي نموذج ذكاء اصطناعي زائف'), 'Arabic gate summary directs zero artificial model fabrication');

  // Audit 8 individual criteria
  assert(gateAudit.criteria.datasetSource.isSatisfied === false, 'Criterion: Dataset Source is unsatisfied');
  assert(gateAudit.criteria.licensingAndPermittedUse.isSatisfied === false, 'Criterion: Licensing is unsatisfied (academic only CC-BY-NC)');
  assert(gateAudit.criteria.validSamplesCount.isSatisfied === false, 'Criterion: Valid Samples Count is unsatisfied (0 stored)');
  assert(gateAudit.criteria.signersCountAndDiversity.isSatisfied === false, 'Criterion: Signers Count is unsatisfied (0 enrolled)');
  assert(gateAudit.criteria.supportedVocabulary.isSatisfied === true, 'Criterion: Supported Vocabulary is satisfied (25 core signs documented)');
  assert(gateAudit.criteria.annotationQuality.isSatisfied === false, 'Criterion: Active Video Annotation Passes is unsatisfied');
  assert(gateAudit.criteria.trainValTestSplit.isSatisfied === true, 'Criterion: Train/Val/Test Split protocol is satisfied');
  assert(gateAudit.criteria.signerIndependentFeasibility.isSatisfied === false, 'Criterion: Signer-Independent Feasibility requires multi-signer videos');

  // =========================================================================
  // Section 2: Initial Documented Core Vocabulary (25 Signs)
  // =========================================================================
  console.log('\nSection 2: Initial Core Vocabulary Specification (25 Signs)');
  const vocab = EslVocabularyCatalog.INITIAL_CORE_VOCABULARY;
  assert(vocab.length === 25, 'Catalog contains exactly 25 core documented Egyptian Sign Language signs');

  // Check category coverage
  const categories = ['emergency', 'courtesy', 'needs', 'question_particles', 'directions'];
  for (const cat of categories) {
    const subset = EslVocabularyCatalog.getEntriesByCategory(cat as any);
    assert(subset.length >= 3, `Category "${cat}" has at least 3 documented signs`);
  }

  // Check specific emergency and question signs
  const emergencySign = EslVocabularyCatalog.getEntryByGlossId('tawaree');
  assert(Boolean(emergencySign), 'Emergency sign "tawaree" (طوارئ) is cataloged');
  assert(emergencySign!.nonManualFacialCue.includes('الخطر'), 'tawaree documents urgent facial affect');

  const ambulanceSign = EslVocabularyCatalog.getEntryByGlossId('isaf');
  assert(Boolean(ambulanceSign), 'Ambulance sign "isaf" (إسعاف) is cataloged');

  const hospitalSign = EslVocabularyCatalog.getEntryByGlossId('mustashfa');
  assert(Boolean(hospitalSign), 'Hospital sign "mustashfa" (مستشفى) is cataloged');

  const whereSign = EslVocabularyCatalog.getEntryByGlossId('ayna');
  assert(Boolean(whereSign), 'Question particle "ayna" (أين؟) is cataloged');
  assert(whereSign!.nonManualFacialCue.includes('الحاجبين'), 'ayna documents mandatory eyebrow furrowing');

  for (const entry of vocab) {
    assert(Boolean(entry.arabicGloss && entry.arabicMeaning), `"${entry.glossId}" has bilingual gloss and meaning`);
    assert(Boolean(entry.movementDescription && entry.nonManualFacialCue), `"${entry.glossId}" has phonological and facial cue descriptors`);
    assert(Array.isArray(entry.confusableSiblingSigns), `"${entry.glossId}" has confusable sibling signs cataloged`);
    assert(entry.minimumConfidenceThreshold >= 0.70, `"${entry.glossId}" enforces minimum confidence threshold >= 0.70`);
  }

  // =========================================================================
  // Section 3: Feature Extraction & Landmark Normalization
  // =========================================================================
  console.log('\nSection 3: Feature Extraction & Normalization');

  // Test 21 hand keypoint normalization
  const rawHand: any = [
    { x: 100, y: 200, z: 0 }, // 0: Wrist
    ...Array.from({ length: 8 }, (_, i) => ({ x: 105 + i, y: 205 + i, z: 0 })),
    { x: 150, y: 300, z: 0 }, // 9: Middle MCP
    ...Array.from({ length: 11 }, (_, i) => ({ x: 110 + i, y: 210 + i, z: 0 })),
  ];

  const normalizedHand = EslRecognitionPipeline.normalizeHandKeypoints(rawHand);
  assert(normalizedHand !== null && normalizedHand.length === 21, 'Normalizes 21 3D hand keypoints');
  assert(normalizedHand![0].x === 0 && normalizedHand![0].y === 0, 'Wrist landmark centered at coordinate origin (0, 0)');

  // Test facial non-manual cue extraction
  const raisedEyebrowsFacialData: any = {
    eyebrowElevationRatio: 1.25,
    mouthAspectRatio: 0.2,
    eyeAspectRatio: 0.8,
    headPitchDegrees: 2,
    headYawDegrees: 0,
    headRollDegrees: 0,
  };
  const raisedCues = EslRecognitionPipeline.extractNonManualCues(raisedEyebrowsFacialData);
  assert(raisedCues.some((c) => c.includes('eyebrow_raised')), 'Detects eyebrow_raised for Yes/No question or surprise');

  const furrowedEyebrowsFacialData: any = {
    eyebrowElevationRatio: 0.82,
    mouthAspectRatio: 0.2,
    eyeAspectRatio: 0.6,
    headPitchDegrees: 0,
    headYawDegrees: 0,
    headRollDegrees: 0,
  };
  const furrowedCues = EslRecognitionPipeline.extractNonManualCues(furrowedEyebrowsFacialData);
  assert(furrowedCues.some((c) => c.includes('eyebrow_lowered_furrowed')), 'Detects eyebrow_lowered_furrowed for WH inquiry');

  const headShakeFacialData: any = {
    eyebrowElevationRatio: 1.0,
    mouthAspectRatio: 0.2,
    eyeAspectRatio: 0.7,
    headPitchDegrees: 0,
    headYawDegrees: -18,
    headRollDegrees: 0,
  };
  const headShakeCues = EslRecognitionPipeline.extractNonManualCues(headShakeFacialData);
  assert(headShakeCues.some((c) => c.includes('head_shake')), 'Detects head_shake for grammatical negation');

  // =========================================================================
  // Section 4: Temporal Sliding Buffer & Idle Rest Detection
  // =========================================================================
  console.log('\nSection 4: Temporal Buffer & Idle Rest Detection');
  const pipeline = new EslRecognitionPipeline(32);

  assert(pipeline.getBufferedFramesCount() === 0, 'Pipeline initializes with empty buffer');

  // Ingest underflow frames (< 12 frames)
  for (let i = 0; i < 5; i++) {
    pipeline.ingestFrame({
      timestamp: Date.now() + i * 33,
      leftHandLandmarks: null,
      rightHandLandmarks: null,
      upperBodyPoseLandmarks: null,
      facialNonManualFeatures: null,
      overallLightingScore: 0.8,
      isSigningActive: false,
    });
  }

  const underflowResult = await pipeline.processSequence();
  assert(underflowResult.status === 'idle_rest', 'Buffer underflow correctly returns idle_rest status');
  assert(underflowResult.uncertaintyReasonEn!.includes('minimum 12 frames'), 'Explains buffer underflow requirement');

  // Ingest rest/idle posture (15 frames with isSigningActive = false)
  for (let i = 0; i < 15; i++) {
    pipeline.ingestFrame({
      timestamp: Date.now() + (i + 5) * 33,
      leftHandLandmarks: null,
      rightHandLandmarks: null,
      upperBodyPoseLandmarks: null,
      facialNonManualFeatures: null,
      overallLightingScore: 0.8,
      isSigningActive: false,
    });
  }
  const idleResult = await pipeline.processSequence();
  assert(idleResult.status === 'idle_rest', 'Inactive hands correctly detected as idle_rest');

  // =========================================================================
  // Section 5: Rejection of Synthetic Predictions & Uncertainty
  // =========================================================================
  console.log('\nSection 5: Rejection of Synthetic Predictions & Uncertainty Handling');

  // Ingest active signing frames
  for (let i = 0; i < 15; i++) {
    pipeline.ingestFrame({
      timestamp: Date.now() + (i + 20) * 33,
      leftHandLandmarks: null,
      rightHandLandmarks: rawHand,
      upperBodyPoseLandmarks: null,
      facialNonManualFeatures: furrowedEyebrowsFacialData,
      overallLightingScore: 0.8,
      isSigningActive: true,
    });
  }

  // When no model is loaded (as commanded by gate)
  const noModelResult = await pipeline.processSequence();
  assert(noModelResult.status === 'out_of_vocabulary', 'Without model weights, returns out_of_vocabulary status');
  assert(noModelResult.confidenceScore === 0.0, 'Strict invariant: confidenceScore is 0.0 without model');
  assert(noModelResult.primaryCandidate === null, 'Strict invariant: primaryCandidate is null');
  assert(noModelResult.uncertaintyReasonEn!.includes('synthetic predictions are strictly prohibited'), 'English disclaimer refuses synthetic predictions');
  assert(noModelResult.uncertaintyReasonAr!.includes('يمتنع النظام تماماً عن توليد تنبؤات عشوائية زائفة'), 'Arabic disclaimer refuses random mock predictions');

  // Test uncertain handling when model outputs low confidence (< 0.65)
  const mockLowConfidenceModel: IEslRecognitionModel = {
    modelId: 'mock_test_model',
    architectureName: 'TestSequenceModel',
    targetVocabularySize: 25,
    isModelLoaded: true,
    loadWeights: async () => true,
    inferSequence: async () => [
      {
        glossId: 'mustashfa',
        arabicGloss: 'مستشفى',
        arabicMeaning: 'المستشفى',
        confidence: 0.45, // Low confidence
        category: 'emergency',
      },
    ],
  };

  pipeline.registerModel(mockLowConfidenceModel);
  const lowConfResult = await pipeline.processSequence();
  assert(lowConfResult.status === 'uncertain', 'Confidence < 0.65 triggers uncertain status');
  assert(lowConfResult.isLowConfidence === true, 'isLowConfidence flag set to true');
  assert(lowConfResult.uncertaintyReasonEn!.includes('Low confidence score'), 'Explains low confidence explicitly');

  // =========================================================================
  // Section 6: Mathematical Accuracy of Evaluation Framework
  // =========================================================================
  console.log('\nSection 6: Mathematical Accuracy of Evaluation Framework');

  const classLabels = ['salam_alaykum', 'shukran', 'mustashfa'];
  const groundTruth = ['salam_alaykum', 'salam_alaykum', 'shukran', 'mustashfa', 'mustashfa'];
  const predictions = ['salam_alaykum', 'shukran',       'shukran', 'mustashfa', 'salam_alaykum'];

  const report = EslEvaluationFramework.computeEvaluationReport(
    groundTruth,
    predictions,
    classLabels,
    'signer_independent_test',
    10,
    9
  );

  assert(report.totalSamplesEvaluated === 5, 'Evaluated exact sample count (5)');
  assert(report.overallAccuracy === 0.6, 'Calculates exact overall accuracy (3/5 = 0.6)');
  assert(report.isSyntheticData === false, 'Strict invariant: isSyntheticData is FALSE');
  assert(report.oodRejectionRate === 0.9, 'Calculates exact OOD rejection rate (9/10 = 0.9)');

  // Test per-class metrics for 'shukran':
  // Ground truth: 1 'shukran' at index 2. Predicted: index 1 and index 2.
  // TP = 1 (index 2), FP = 1 (index 1), FN = 0.
  // Precision = 1 / (1 + 1) = 0.5. Recall = 1 / (1 + 0) = 1.0. F1 = 2 * (0.5 * 1.0) / 1.5 = 0.667.
  const shukranMetrics = report.perClassMetrics['shukran'];
  assert(shukranMetrics.truePositives === 1, 'shukran: TP = 1');
  assert(shukranMetrics.falsePositives === 1, 'shukran: FP = 1');
  assert(shukranMetrics.falseNegatives === 0, 'shukran: FN = 0');
  assert(shukranMetrics.precision === 0.5, 'shukran: Precision = 0.5');
  assert(shukranMetrics.recall === 1.0, 'shukran: Recall = 1.0');
  assert(Math.abs(shukranMetrics.f1Score - 0.667) < 0.005, 'shukran: F1 score ≈ 0.667');

  // Verify confusion matrix dimensions
  assert(report.confusionMatrix.matrix.length === 3, 'Confusion matrix has 3 rows');
  assert(report.confusionMatrix.matrix[0].length === 3, 'Confusion matrix has 3 columns');

  // Test Signer Generalization Gap
  const gap = EslEvaluationFramework.calculateSignerGeneralizationGap(0.85, 0.60);
  assert(gap.accuracyDropAbsolute === 0.25, 'Calculates exact 0.25 absolute accuracy drop');
  assert(Math.abs(gap.accuracyDropPercentage - 29.4) < 0.1, 'Calculates exact 29.4% relative drop');
  assert(gap.analysisNoteEn.includes('Signer generalization gap'), 'Reports analysis note on unseen signer degradation');

  // =========================================================================
  // Section 7: Performance Profiling & Hardware Acceleration
  // =========================================================================
  console.log('\nSection 7: Performance Profiling & Hardware Acceleration');

  const hw = EslPerformanceBenchmark.probeHardwareCapabilities();
  assert(Boolean(hw.preferredInferenceBackend), 'Probes preferred inference backend');
  assert(hw.estimatedMaxFps > 0, 'Estimates max achievable FPS for environment');

  const perf = new EslPerformanceBenchmark();
  perf.recordLatencySample(25);
  perf.recordLatencySample(30);
  perf.recordLatencySample(35);
  perf.recordLatencySample(40);

  const stats = perf.getLatencyStats();
  assert(stats.sampleCount === 4, 'Records 4 latency samples');
  assert(stats.averageLatencyMs === 32.5, 'Calculates exact average latency (32.5 ms)');
  assert(stats.isInteractiveRealtime === true, 'Latency < 65ms qualifies as interactive realtime (>= 15 fps)');

  // Test environmental degradation (low light and occlusion)
  const degradedQuality = EslPerformanceBenchmark.evaluateEnvironmentalQuality(0.20, 10, true);
  assert(degradedQuality.isLowLighting === true, 'Flags low lighting when luma < 0.35');
  assert(degradedQuality.isHandOccluded === true, 'Flags hand occlusion when landmarks < 80% visible');

  const goodQuality = EslPerformanceBenchmark.evaluateEnvironmentalQuality(0.70, 21, true);
  assert(goodQuality.isLowLighting === false, 'Passes good lighting condition');
  assert(goodQuality.isHandOccluded === false, 'Passes full 21/21 hand keypoint visibility');

  console.log(`\nSign Language Phase 5 Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

// Direct execution support
if (process.argv[1]?.includes('signLanguagePhase5Verification')) {
  runSignLanguagePhase5Verification().then(({ passed, failed }) => {
    if (failed > 0) process.exit(1);
  });
}
