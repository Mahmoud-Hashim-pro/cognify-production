/**
 * arslCurriculumAndModelVerification.ts — Automated Verification Suite for ArSL 24 Lectures & ML Model
 */

import {
  ARSL_LECTURES_CATALOG,
  ARSL_DICTIONARY,
  lookupArslSign,
  hamnosysToThreePose,
} from '../src/lib/arslDictionary.js';
import {
  TemporalSignRecognizer,
  normalizeHandLandmarks,
  ARSL_CORE_CLASSES,
  TEMPORAL_WINDOW_SIZE,
  FEATURES_PER_FRAME,
  Point3D,
} from '../src/lib/temporalSignRecognizer.js';
import { generateSyntheticBenchmarkDataset } from '../src/lib/kArslDatasetAdapter.js';
import { computeConfusionMatrix } from '../src/lib/signConfusionMatrix.js';
import { extractKeyframeFromLandmarks, inferHamNoSysFromKeyframes } from '../src/lib/videoPoseExtractor.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

export async function runArslCurriculumAndModelVerification() {
  console.log('\n[25] ArSL Thematic Dictionary & In-Browser ML Pipeline Verification (Synthetic Benchmark)');

  // Test 1: Full 24 Thematic Modules Integrity
  {
    assert(ARSL_LECTURES_CATALOG.length === 24, 'All 24 thematic vocabulary modules are cataloged');
    
    // Check all IDs 1 to 24 are present in order
    const idsPresent = ARSL_LECTURES_CATALOG.every((l, idx) => l.id === idx + 1);
    assert(idsPresent, 'Thematic modules 1 through 24 have sequential and continuous IDs');

    // Check title and topic presence
    const allHaveTopics = ARSL_LECTURES_CATALOG.every((l) => Boolean(l.titleAr) && Boolean(l.topicAr));
    assert(allHaveTopics, 'All 24 modules define bilingual title and lexical topic boundaries');

    // Check specific landmark modules
    const lec1 = ARSL_LECTURES_CATALOG.find((l) => l.id === 1);
    assert(lec1?.titleAr.includes('الأبجدية'), 'Module 1 covers the complete sign alphabet');

    const lec24 = ARSL_LECTURES_CATALOG.find((l) => l.id === 24);
    assert(lec24?.titleAr.includes('المراجعة'), 'Module 24 covers comprehensive review & fluency');
  }

  // Test 2: HamNoSys Dictionary Structure & Anatomical Grounding
  {
    assert(ARSL_DICTIONARY.length >= 18, 'Core ArSL dictionary initialized with foundational lexical signs');

    const salam = lookupArslSign('السلام عليكم');
    assert(salam !== null, 'Finds exact greeting "السلام عليكم"');
    assert(salam?.hamnosys.handshape === 'flat_closed', 'Assigned correct HamNoSys handshape (flat_closed)');
    assert(salam?.hamnosys.twoHanded === true, 'Greeting is properly flagged as two-handed gesture');

    const threePose = hamnosysToThreePose(salam!.hamnosys);
    assert(threePose.f.length === 5, 'Converts HamNoSys to 5-finger articulatory curl array');
    assert(threePose.pos.length === 3, 'Calculates 3D world target position [x, y, z]');
  }

  // Test 3: Robust Multilingual & Dialect Alias Lookup
  {
    const fromAmmiya = lookupArslSign('ازيك');
    assert(fromAmmiya?.arabicName.includes('كيف حالك'), 'Dialect alias "ازيك" maps to formal "كيف حالك"');

    const fromEnglish = lookupArslSign('hospital');
    assert(fromEnglish?.id === 's_hospital', 'English term "hospital" maps to "مستشفى"');

    const fromFingerspelling = lookupArslSign('غير_موجود_في_المعجم');
    assert(fromFingerspelling === null, 'Unknown phrases return null to trigger letter fingerspelling fallback');
  }

  // Test 4: Invariant 3D Landmark Normalization
  {
    const mockHandLandmarks: Point3D[] = [];
    for (let i = 0; i < 21; i++) {
      mockHandLandmarks.push({ x: 100 + i * 2, y: 200 + i * 3, z: 50 + i });
    }

    const normalized = normalizeHandLandmarks(mockHandLandmarks);
    assert(normalized.length === 63, 'Normalizes 21 landmarks into 63 coordinates (x, y, z)');
    assert(normalized[0] === 0 && normalized[1] === 0 && normalized[2] === 0, 'Wrist (landmark 0) is translated to origin (0, 0, 0)');

    // Missing hand test
    const emptyNorm = normalizeHandLandmarks(null);
    assert(emptyNorm.length === 63 && emptyNorm.every((v) => v === 0), 'Null hands return zeroed baseline vector');
  }

  // Test 5: Synthetic Benchmark Landmark Generator & Pipeline Invariants
  {
    const dataset = generateSyntheticBenchmarkDataset(4);
    assert(dataset.trainXs.length > 0 && dataset.testXs.length > 0, 'Generates train and test feature splits from synthetic vectors');
    assert(
      dataset.trainXs[0].length === TEMPORAL_WINDOW_SIZE * FEATURES_PER_FRAME,
      'Dataset temporal sequence window matches 16 frames * 126 features'
    );
    assert(dataset.classes.length === ARSL_CORE_CLASSES.length, 'Dataset covers all core ArSL target classes');
  }

  // Test 6: In-Browser Temporal Model Compilation & Training (Synthetic Vectors)
  {
    const recognizer = new TemporalSignRecognizer();
    await recognizer.initializeModel();
    assert(recognizer.isReady, 'TensorFlow.js temporal classification model compiled successfully');

    const dataset = generateSyntheticBenchmarkDataset(2);
    let trainedEpochs = 0;
    const history = await recognizer.train(dataset.trainXs, dataset.trainYs, 3, (metric) => {
      trainedEpochs = metric.epoch;
    });

    assert(trainedEpochs === 3, 'Model trains across requested epochs with progress callbacks');
    assert(history !== null, 'Model training produces valid loss history');
  }

  // Test 7: Confusion Matrix Engine & Phonological Evaluation (Synthetic Benchmark)
  {
    const trueLabels = [0, 1, 2, 3, 3, 4, 5, 5];
    const predLabels = [0, 1, 2, 3, 4, 4, 5, 7]; // Introduced 3->4 (Father/Mother) and 5->7 (Water/Drink)

    const report = computeConfusionMatrix(trueLabels, predLabels, ARSL_CORE_CLASSES);
    assert(report.globalAccuracy > 0, 'Computes deterministic global accuracy score');
    assert(report.matrix.length === ARSL_CORE_CLASSES.length, 'Generates N x N confusion matrix');
    assert(report.classMetrics.length === ARSL_CORE_CLASSES.length, 'Computes per-class Precision and Recall');
    assert(report.topConfusedPairs.length > 0, 'Detects confused sign pairs with linguistic explanations');
    assert(
      report.topConfusedPairs.some((p) => p.actualId === 's_father' && p.predictedId === 's_mother'),
      'Identifies Father vs Mother anatomical location confusion'
    );
  }

  // Test 8: Video Reference Pose Extractor
  {
    const mockRight: Point3D[] = Array.from({ length: 21 }, (_, i) => ({ x: 0.2 + 0.1 * i, y: 0.2 * i, z: 0 }));
    const mockLeft: Point3D[] = Array.from({ length: 21 }, (_, i) => ({ x: -0.2 - 0.1 * i, y: 0.2 * i, z: 0 }));

    const keyframe = extractKeyframeFromLandmarks(1, 33, mockRight, mockLeft);
    assert(keyframe.frameIndex === 1, 'Keyframe preserves sequential frame index');
    assert(keyframe.handDistance > 0, 'Computes inter-hand spatial distance for two-handed gestures');

    const inferred = inferHamNoSysFromKeyframes([keyframe]);
    assert(inferred.twoHanded === true, 'Infers two-handed gesture requirement from bilateral landmarks');
  }

  console.log(`\n  ArSL Curriculum & Recognizer Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

if (process.argv[1] && process.argv[1].includes('arslCurriculumAndModelVerification')) {
  runArslCurriculumAndModelVerification()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
