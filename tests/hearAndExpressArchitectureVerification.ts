/**
 * hearAndExpressArchitectureVerification.ts — Comprehensive Verification Suite
 *
 * Verifies the removal of legacy unreliable components, safety invariants,
 * and empirical modular foundation for the Hear & Express architecture.
 */

import fs from 'fs';
import path from 'path';
import {
  getHearAndExpressSystem,
  HearAndExpressOrchestrator,
  ConversationEngine,
  SoundAwarenessEngine,
  SignLanguageService,
  SignSmoother,
  PersonalAacEngine,
  DEFAULT_AAC_SYMBOLS,
  type SoundMeasurement,
  type AacSymbol,
} from '../src/modules/hearAndExpress/index.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

export async function runHearAndExpressArchitectureVerification() {
  console.log('\n[26] Hear & Express Modular Architecture & Legacy Cleanup Verification');

  const projectRoot = process.cwd();

  // ─── 1. Legacy Cleanup Verification (Assert 12 removed files/folders do not exist) ───
  console.log('\n  Section 1: Legacy Code & Clinical Fabrication Removal');
  {
    const deletedTargets = [
      'docs/CLINICAL_SIGN_LANGUAGE_VALIDATION.md',
      'src/lib/kArslDatasetAdapter.ts',
      'src/lib/signConfusionMatrix.ts',
      'src/lib/temporalSignRecognizer.ts',
      'src/lib/videoPoseExtractor.ts',
      'src/lib/signClassifier.ts',
      'public/models/sign',
      'src/components/ArSLTrainingStudio.tsx',
      'src/components/HumanCommunicationBridge.tsx',
      'src/components/AmbientSoundRadar.tsx',
      'src/components/DeafEcosystemView.tsx',
      'src/components/SignVideoStudio.tsx',
    ];

    for (const target of deletedTargets) {
      const fullPath = path.join(projectRoot, target);
      const exists = fs.existsSync(fullPath);
      assert(!exists, `Legacy unreliable asset deleted: ${target}`);
    }
  }

  // ─── 2. Physical Realism & Safety Invariants (Sound Awareness) ──────────────────────
  console.log('\n  Section 2: Acoustic Physical Realism & Invariant Enforcement');
  {
    // A: Invariant violation thrown on spatial directional radar data
    let threwOnSpatial = false;
    try {
      SoundAwarenessEngine.invariantSpatialValidation({ angle: 180, distance: 2.5 });
    } catch (e: any) {
      threwOnSpatial = true;
      assert(
        e.message.includes('PHYSICAL_INVARIANT_VIOLATION'),
        'SoundAwarenessEngine strictly rejects fake sound direction angle & distance'
      );
    }
    assert(threwOnSpatial, 'Throws runtime invariant error on attempt to inject spatial vectors');

    // B: Real acoustic measurement processing (RMS, SPL dB, Frequency Bands)
    const engine = new SoundAwarenessEngine({ alertThresholdDb: 75, dangerThresholdDb: 88 });
    
    // Simulate ambient room noise (low amplitude, balanced frequencies)
    const ambientTime = new Float32Array(512).fill(0.02);
    const ambientFreq = new Uint8Array(256).fill(25);
    const ambientMeasurement = engine.processAudioBuffers(ambientTime, ambientFreq, 44100);

    assert(ambientMeasurement.decibels > 0 && ambientMeasurement.decibels < 75, 'Computes realistic ambient decibel SPL');
    assert(ambientMeasurement.frequencyBand.low >= 0, 'Extracts low frequency band energy');
    assert(ambientMeasurement.frequencyBand.mid >= 0, 'Extracts mid frequency band energy');
    assert(ambientMeasurement.frequencyBand.high >= 0, 'Extracts high frequency band energy');
    assert(!('angle' in (ambientMeasurement as any)), 'Measurement contains NO spatial angle attribute');
    assert(!('distance' in (ambientMeasurement as any)), 'Measurement contains NO spatial distance attribute');

    // C: High-frequency smoke/fire alarm pattern detection
    const alarmTime = new Float32Array(512).fill(0.4); // Loud signal
    const alarmFreq = new Uint8Array(256);
    // Fill high frequencies (bin > 30 represents > 2500Hz with 44100Hz / 512)
    for (let i = 35; i < 256; i++) alarmFreq[i] = 230;

    let receivedAlert = false;
    engine.subscribeAlert((alert) => {
      if (alert.type === 'alarm' && alert.severity === 'danger') {
        receivedAlert = true;
      }
    });

    const alarmMeasurement = engine.processAudioBuffers(alarmTime, alarmFreq, 44100);
    assert(alarmMeasurement.detectedPattern === 'alarm', 'Identifies high-frequency acoustic alarm pattern');
    assert(receivedAlert, 'Dispatches high-priority danger alert for detected alarm');
  }

  // ─── 3. Live Conversation Engine ──────────────────────────────────────────────────
  console.log('\n  Section 3: Two-Way Live Conversation Engine');
  {
    const conv = new ConversationEngine({ defaultDialect: 'Arabic' });
    assert(conv.getMessages().length === 0, 'Conversation initializes with empty timeline');

    const msg1 = conv.addMessage('other', 'مرحباً، كيف يمكنني مساعدتك؟', 'Arabic');
    assert(msg1.sender === 'other', 'Correctly attributes incoming speaker');
    assert(msg1.text === 'مرحباً، كيف يمكنني مساعدتك؟', 'Preserves incoming transcript');

    const msg2 = conv.addMessage('user', 'أنا أصم، أرجو كتابة التعليمات هنا', 'Egyptian Ammiya');
    assert(msg2.sender === 'user', 'Correctly attributes outgoing user response');
    assert(conv.getMessages().length === 2, 'Maintains sequential multi-turn dialog timeline');

    // Quick phrases validation
    const quickAr = conv.getQuickPhrases('Arabic');
    assert(quickAr.length >= 6, 'Provides essential barrier-free quick replies in Arabic');
    const deafNotice = quickAr.find((q) => q.label === 'إشعار صمم');
    assert(deafNotice !== undefined && deafNotice.text.includes('أنا أصم'), 'Includes explicit Deaf accessibility notice');

    const quickEg = conv.getQuickPhrases('Egyptian Ammiya');
    assert(quickEg.length >= 6, 'Provides essential quick replies in Egyptian Ammiya');

    const quickEn = conv.getQuickPhrases('English');
    assert(quickEn.length >= 6, 'Provides essential quick replies in English');

    conv.clear();
    assert(conv.getMessages().length === 0, 'Clears dialog timeline cleanly');
  }

  // ─── 4. Sign Language Service & Lexicon Integrity ─────────────────────────────────
  console.log('\n  Section 4: Sign Language Service & Lexicon Grounding');
  {
    const signService = new SignLanguageService();

    // A: Master Lexicon Count & Lookup
    const lexiconCount = signService.getMasterLexiconCount();
    assert(lexiconCount >= 1413, `Master lexicon integrates verified dictionary signs (${lexiconCount} >= 1413)`);

    const salamResult = signService.search('السلام عليكم');
    assert(salamResult.exactMatch !== null, 'Exact lookup finds "السلام عليكم" in master lexicon');
    assert(salamResult.exactMatch?.hamnosys.handshape === 'flat_closed', 'Sign retains anatomical HamNoSys handshape');

    // B: 3D Pose Mapping
    const threePose = signService.resolve3DPose(salamResult.exactMatch!);
    assert(threePose.f.length === 5, 'Converts sign HamNoSys into 5-finger articulatory target array');
    assert(threePose.pos.length === 3, 'Calculates 3D world coordinates target vector');

    // C: Fingerspelling fallback for terms not in dictionary
    const fallbackResult = signService.search('قطار_سريع_جديد');
    assert(fallbackResult.exactMatch === null, 'Unknown word triggers null exact match');
    assert(fallbackResult.fingerspellingFallback.length > 0, 'Provides fallback characters for fingerspelling');

    // D: Landmark Normalization
    const mockLandmarks = Array.from({ length: 21 }, (_, i) => ({ x: 50 + i * 2, y: 100 + i * 3, z: i }));
    const normalized = signService.normalizeLandmarks(mockLandmarks);
    assert(normalized.length === 63, 'Normalizes 21 landmarks into 63 normalized coordinates');
    assert(normalized[0] === 0 && normalized[1] === 0 && normalized[2] === 0, 'Wrist translated to origin');

    // E: Temporal Smoother
    const smoother = new SignSmoother(8, 4, 0.6);
    smoother.push({ letter: 'A', confidence: 0.9 });
    smoother.push({ letter: 'A', confidence: 0.95 });
    smoother.push({ letter: 'A', confidence: 0.92 });
    const committed = smoother.push({ letter: 'A', confidence: 0.94 });
    assert(committed === 'A', 'Temporal smoother commits letter after consensus');
    // Anti-repetition test: subsequent frame without hand leaving should not commit
    const duplicate = smoother.push({ letter: 'A', confidence: 0.95 });
    assert(duplicate === null, 'Smoother suppresses duplicate letter repetition without hand-leave');

    // F: Honest Scientific Boundary Status
    const status = signService.getRecognitionStatus(true, true);
    assert(status.isHandTracked === true, 'Reports accurate hand tracking state');
    assert(
      status.disclaimerAr.includes('الترجمة الفورية للغة الإشارة تتطلب نماذج ذكاء اصطناعي مخصصة'),
      'Discloses honest scientific boundary regarding real-time continuous sign recognition'
    );
  }

  // ─── 5. Personal AAC Engine ────────────────────────────────────────────────────────
  console.log('\n  Section 5: Personal AAC Engine & Life-Safety Boards');
  {
    const aac = new PersonalAacEngine();

    // A: Symbol Board Counts & Categories
    const allSymbols = aac.getSymbols();
    assert(allSymbols.length >= 18, `Initializes full offline AAC symbol set (${allSymbols.length} >= 18)`);

    const categories = aac.getCategories();
    assert(categories.includes('emergency'), 'Includes emergency safety category');
    assert(categories.includes('medical'), 'Includes medical & wellbeing category');
    assert(categories.includes('daily'), 'Includes daily life category');
    assert(categories.includes('academic'), 'Includes academic & education category');

    // B: Emergency category integrity
    const emergencySymbols = aac.getSymbols('emergency');
    assert(emergencySymbols.length >= 4, 'Emergency category contains life-safety communication cards');
    assert(emergencySymbols.some((s) => s.id === 'aac_em_help'), 'Includes urgent Help card');
    assert(emergencySymbols.some((s) => s.id === 'aac_em_pain'), 'Includes Severe Pain card');
    assert(emergencySymbols.some((s) => s.id === 'aac_em_doctor'), 'Includes Doctor card');

    // C: Sentence Builder
    aac.clearSentence();
    assert(aac.getCurrentSentence().symbols.length === 0, 'Sentence buffer starts empty');

    const helpSym = emergencySymbols.find((s) => s.id === 'aac_em_help')!;
    const doctorSym = emergencySymbols.find((s) => s.id === 'aac_em_doctor')!;

    aac.addSymbolToSentence(helpSym);
    aac.addSymbolToSentence(doctorSym);

    const built = aac.getCurrentSentence();
    assert(built.symbols.length === 2, 'Builds compound multi-symbol sentence');
    assert(built.textAr.includes('مساعدة') && built.textAr.includes('طبيب'), 'Assembles coherent Arabic spoken string');
    assert(built.textEn.includes('help') && built.textEn.includes('doctor'), 'Assembles coherent English spoken string');

    aac.removeSymbolFromSentence(1);
    assert(aac.getCurrentSentence().symbols.length === 1, 'Allows removing symbol from sentence builder');
    aac.clearSentence();
    assert(aac.getCurrentSentence().symbols.length === 0, 'Clears sentence buffer');

    // D: Custom Symbol Creation
    const customSym = aac.addCustomSymbol({
      labelAr: 'نظارتي',
      labelEn: 'My Glasses',
      icon: 'Glasses',
      category: 'daily',
      spokenTextAr: 'أين نظارتي الطبية؟',
      spokenTextEn: 'Where are my glasses?',
    });
    assert(customSym.id.startsWith('aac_custom_'), 'Generates unique custom AAC symbol ID');
    assert(aac.getSymbols('daily').some((s) => s.labelEn === 'My Glasses'), 'Integrates custom symbol into category');
  }

  // ─── 6. Master Orchestrator & Safety Verification ─────────────────────────────────
  console.log('\n  Section 6: Master Orchestrator & Safety Verification');
  {
    const orchestrator = getHearAndExpressSystem();
    assert(orchestrator instanceof HearAndExpressOrchestrator, 'Provides singleton orchestrator instance');

    const state = orchestrator.getSystemState();
    assert(state.liveConversation.isInitialized, 'Live conversation sub-module initialized');
    assert(state.soundAwareness.isInitialized, 'Sound awareness sub-module initialized');
    assert(state.signLanguage.isInitialized, 'Sign language sub-module initialized');
    assert(state.personalAac.isInitialized, 'Personal AAC sub-module initialized');

    const safetyCheck = orchestrator.verifySafetyInvariants();
    assert(safetyCheck.spatialDirectionProhibited, 'Safety invariant: Directional radar is prohibited and rejected');
    assert(safetyCheck.offlineAacReady, 'Safety invariant: Offline AAC boards ready with complete coverage');
    assert(safetyCheck.masterLexiconBacked, 'Safety invariant: Sign language backed by authentic master lexicon');
  }

  console.log(`\n  Hear & Express Architecture Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

if (process.argv[1] && process.argv[1].includes('hearAndExpressArchitectureVerification')) {
  runHearAndExpressArchitectureVerification()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
