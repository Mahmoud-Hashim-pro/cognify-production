/**
 * Rafiqi — Phase 3: Sound Awareness Engine Verification Suite
 *
 * Verifies:
 * 1. Exactly 11 sound categories supported in the catalog.
 * 2. Honest classification declarations (verified acoustic signatures vs deep learning model requirements).
 * 3. Acoustic analyzer (RMS, peak, dB SPL, 3-frequency bands, adaptive noise floor, and SNR).
 * 4. Temporal signature engine (NFPA 72 T3 smoke alarm cadence, knock transient impacts, doorbell chime).
 * 5. Alert lifecycle, cooldown deduplication, snooze, and dismiss.
 * 6. Vibration pattern dispatch with distinct category patterns.
 * 7. Strict safety & privacy invariants (spatial direction prohibition, zero audio retention, safety notices).
 */

import { SoundAwarenessEngine } from '../src/modules/hearAndExpress/soundAwareness/soundEngine';
import { AcousticAnalyzer } from '../src/modules/hearAndExpress/soundAwareness/acousticAnalyzer';
import { TemporalSignatureEngine } from '../src/modules/hearAndExpress/soundAwareness/temporalSignatureEngine';
import { ModelClassifierAdapter } from '../src/modules/hearAndExpress/soundAwareness/modelClassifierAdapter';
import {
  SAFETY_LIMITATION_NOTICE,
  type SoundEventCategory,
  type SoundAlert,
} from '../src/modules/hearAndExpress/soundAwareness/types';

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

export async function runSoundAwarenessPhase3Verification(): Promise<{ passed: number; failed: number }> {
  console.log('\n[Phase 3] Sound Awareness Engine Verification Suite\n');

  // =========================================================================
  // Section 1: Catalog & Sound Event Categories (11)
  // =========================================================================
  console.log('Section 1: Sound Categories Catalog (11 Categories)');
  const configs = ModelClassifierAdapter.DEFAULT_CATEGORY_CONFIGS;
  const categories = Object.keys(configs) as SoundEventCategory[];

  assert(categories.length === 11, 'Catalog contains exactly 11 sound event categories');

  const requiredCategories: SoundEventCategory[] = [
    'fire_alarm',
    'smoke_alarm',
    'doorbell',
    'knocking',
    'baby_crying',
    'dog_barking',
    'car_horn',
    'emergency_siren',
    'glass_breaking',
    'appliance_alert',
    'household_custom',
  ];

  for (const cat of requiredCategories) {
    assert(cat in configs, `Required category "${cat}" is cataloged`);
    const c = configs[cat];
    assert(Boolean(c.nameAr && c.nameEn), `"${cat}" has complete bilingual names`);
    assert(Boolean(c.descriptionAr && c.descriptionEn), `"${cat}" has bilingual descriptions`);
    assert(Array.isArray(c.vibrationPattern) && c.vibrationPattern.length > 0, `"${cat}" has a defined vibration pattern`);
  }

  // =========================================================================
  // Section 2: Detection Method Declarations & Model Honesty
  // =========================================================================
  console.log('\nSection 2: Detection Method Declarations & Model Honesty');
  const adapter = new ModelClassifierAdapter();

  // Rule-based / verified cadence signatures
  assert(configs.fire_alarm.detectionMethod === 'temporal_cadence_signature', 'Fire alarm uses temporal cadence signature');
  assert(configs.smoke_alarm.detectionMethod === 'temporal_cadence_signature', 'Smoke alarm uses NFPA 72 temporal cadence');
  assert(configs.knocking.detectionMethod === 'transient_impact_signature', 'Knocking uses transient impact signature');
  assert(configs.doorbell.detectionMethod === 'temporal_cadence_signature', 'Doorbell uses harmonic cadence signature');

  // Categories requiring deep learning models
  assert(configs.baby_crying.modelStatus === 'model_weights_required', 'Baby crying honestly declared as model_weights_required');
  assert(configs.dog_barking.modelStatus === 'model_weights_required', 'Dog barking honestly declared as model_weights_required');
  assert(configs.car_horn.modelStatus === 'model_weights_required', 'Car horn honestly declared as model_weights_required');
  assert(configs.emergency_siren.modelStatus === 'model_weights_required', 'Emergency siren honestly declared as model_weights_required');
  assert(configs.glass_breaking.modelStatus === 'model_weights_required', 'Glass breaking honestly declared as model_weights_required');

  // Configurable appliance/custom profiles
  assert(configs.appliance_alert.modelStatus === 'user_configured', 'Appliance alert is user_configured');
  assert(configs.household_custom.modelStatus === 'user_configured', 'Household custom is user_configured');

  // Check readiness
  assert(adapter.isCategoryReady('smoke_alarm') === true, 'Smoke alarm is ready via verified cadence');
  assert(adapter.isCategoryReady('knocking') === true, 'Knocking is ready via verified transient signature');
  assert(adapter.isCategoryReady('baby_crying') === false, 'Baby crying is NOT marked ready without neural weights');
  assert(adapter.isCategoryReady('dog_barking') === false, 'Dog barking is NOT marked ready without neural weights');

  // Test disclosure
  const babyDisclosure = adapter.getCategoryStatusDisclosure('baby_crying');
  assert(babyDisclosure.isSupported === false, 'Baby crying disclosure indicates unsupported without weights');
  assert(babyDisclosure.disclosureEn.includes('deep neural network'), 'Disclosure explicitly states deep neural network requirement');
  assert(babyDisclosure.disclosureAr.includes('شبكة عصبية'), 'Arabic disclosure explicitly states neural network requirement');

  // Classification without weights produces no fake predictions
  const fakePredictions = await adapter.classifyAudioBuffer(new Float32Array(1024), 44100);
  assert(fakePredictions.length === 0, 'Classify returns empty array without model weights (never fakes predictions)');

  // =========================================================================
  // Section 3: Acoustic Analyzer (RMS, SPL, Bands, Noise Floor & SNR)
  // =========================================================================
  console.log('\nSection 3: Acoustic Spectral & Temporal Analysis');
  const analyzer = new AcousticAnalyzer();

  // Test silence buffer
  const silenceTime = new Float32Array(1024).fill(0);
  const silenceFreq = new Uint8Array(512).fill(0);
  const silenceFrame = analyzer.analyzeFrame(silenceTime, silenceFreq, 44100);

  assert(silenceFrame.rms === 0, 'Silence frame calculates 0 RMS');
  assert(silenceFrame.peak === 0, 'Silence frame calculates 0 peak');
  assert(silenceFrame.decibels === 0, 'Silence frame calculates 0 dB SPL');
  assert(silenceFrame.noiseFloorDb >= 25, 'Noise floor is initialized to realistic baseline');
  assert(silenceFrame.snrDb === 0, 'Silence has 0 dB SNR');

  // Test high-frequency tone (~3000 Hz)
  const toneTime = new Float32Array(1024);
  const toneFreq = new Uint8Array(512).fill(0);
  const sampleRate = 44100;
  const targetHz = 3000;

  for (let i = 0; i < toneTime.length; i++) {
    toneTime[i] = 0.5 * Math.sin((2 * Math.PI * targetHz * i) / sampleRate);
  }
  // Nyquist = 22050 Hz. 512 bins -> ~43.06 Hz per bin. 3000 Hz / 43.06 ≈ bin 70
  const bin70 = Math.round(targetHz / (sampleRate / 2 / 512));
  toneFreq[bin70] = 230; // High magnitude in bin ~70

  const toneFrame = analyzer.analyzeFrame(toneTime, toneFreq, sampleRate);
  assert(toneFrame.rms > 0.3, 'Tone frame calculates realistic RMS amplitude');
  assert(toneFrame.peak > 0.45, 'Tone frame calculates peak near 0.5');
  assert(toneFrame.decibels >= 85, '0.5 amplitude maps to calibrated SPL >= 85 dB');
  assert(toneFrame.frequencyBand.high > toneFrame.frequencyBand.low, 'High band dominates for 3000 Hz tone');
  assert(Math.abs(toneFrame.dominantFrequencyHz - targetHz) < 100, `Dominant frequency (${toneFrame.dominantFrequencyHz} Hz) matches ~3000 Hz`);
  assert(toneFrame.snrDb > 40, 'Loud tone exhibits high SNR above ambient noise floor');

  // =========================================================================
  // Section 4: Temporal Signatures (T3 Smoke Alarm & Knocking)
  // =========================================================================
  console.log('\nSection 4: Deterministic Temporal Signature Engine');
  const tempEngine = new TemporalSignatureEngine();

  // Test knocking transient burst: sharp peak, low frequency
  const knockFrame: any = {
    timestamp: 1000,
    rms: 0.35,
    peak: 0.8,
    decibels: 78,
    frequencyBand: { low: 0.65, mid: 0.25, high: 0.1 },
    dominantFrequencyHz: 450,
    noiseFloorDb: 35,
    snrDb: 43,
  };

  const knockResult = tempEngine.evaluateFrame(knockFrame, 1000);
  assert(knockResult !== null, 'Sharp low-frequency impact triggers knock transient detection');
  assert(knockResult?.category === 'knocking', 'Knock result identifies category "knocking"');
  assert(knockResult!.confidence >= 0.75, 'Knock confidence is clinically grounded');

  tempEngine.reset();

  // Test NFPA 72 T3 Smoke Alarm Cadence
  // Pulse 1: 0 to 500ms ON, 500 to 1000ms OFF
  // Pulse 2: 1000 to 1500ms ON, 1500 to 2000ms OFF
  // Pulse 3: 2000 to 2500ms ON, 2500ms -> fires T3
  const activeAlarmFrame: any = {
    timestamp: 0,
    rms: 0.4,
    peak: 0.7,
    decibels: 84,
    frequencyBand: { low: 0.05, mid: 0.2, high: 0.75 },
    dominantFrequencyHz: 3100,
    noiseFloorDb: 35,
    snrDb: 49,
  };
  const quietAlarmFrame: any = {
    timestamp: 0,
    rms: 0.02,
    peak: 0.05,
    decibels: 40,
    frequencyBand: { low: 0.1, mid: 0.1, high: 0.1 },
    dominantFrequencyHz: 500,
    noiseFloorDb: 35,
    snrDb: 5,
  };

  // Pulse 1
  tempEngine.evaluateFrame(activeAlarmFrame, 100);
  tempEngine.evaluateFrame(activeAlarmFrame, 300);
  tempEngine.evaluateFrame(quietAlarmFrame, 600); // 500ms pulse ended

  // Pulse 2
  tempEngine.evaluateFrame(activeAlarmFrame, 1100);
  tempEngine.evaluateFrame(activeAlarmFrame, 1400);
  tempEngine.evaluateFrame(quietAlarmFrame, 1600); // Pulse 2 ended

  // Pulse 3
  tempEngine.evaluateFrame(activeAlarmFrame, 2100);
  tempEngine.evaluateFrame(activeAlarmFrame, 2400);
  const t3Result = tempEngine.evaluateFrame(quietAlarmFrame, 2600); // Pulse 3 ended -> cadence verified!

  assert(t3Result !== null, '3-pulse sequence triggers NFPA 72 T3 smoke alarm cadence detection');
  assert(t3Result?.category === 'smoke_alarm', 'T3 cadence identifies "smoke_alarm"');
  assert(t3Result!.confidence >= 0.9, 'T3 cadence exhibits high confidence (>= 0.9)');

  // =========================================================================
  // Section 5: Alert Lifecycle, Cooldown Deduplication & Snooze
  // =========================================================================
  console.log('\nSection 5: Alert Engine, Cooldown Deduplication & Snooze');
  const engine = new SoundAwarenessEngine({ enableVibration: false });

  let receivedAlert: SoundAlert | null = null;
  engine.subscribeAlert((a) => {
    receivedAlert = a;
  });

  // Synthesize dangerous audio frame to trigger alert
  const dangerousTime = new Float32Array(1024).fill(0.9);
  const dangerousFreq = new Uint8Array(512).fill(250);

  engine.processAudioBuffers(dangerousTime, dangerousFreq, 44100);

  assert(receivedAlert !== null, 'Engine dispatches alert upon detecting hazardous sound level');
  assert(receivedAlert?.severity === 'danger', 'Dangerous volume triggers "danger" severity alert');
  assert(receivedAlert?.decibels !== undefined && receivedAlert.decibels >= 88, 'Alert decibels accurately recorded');

  // Check cooldown deduplication
  const firstAlertId = receivedAlert?.id;
  receivedAlert = null;
  // Immediate second loud frame within cooldown (e.g. 50ms later)
  engine.processAudioBuffers(dangerousTime, dangerousFreq, 44100);
  assert(receivedAlert === null, 'Cooldown suppresses duplicate alerts within cooldown window');

  // Test Snooze
  engine.snoozeCategory('fire_alarm', 15);
  assert(engine.isCategorySnoozed('fire_alarm') === true, 'Category marked as snoozed');
  engine.cancelSnooze('fire_alarm');
  assert(engine.isCategorySnoozed('fire_alarm') === false, 'Cancel snooze restores active status');

  // Test Dismiss
  if (firstAlertId) {
    engine.dismissAlert(firstAlertId);
    const history = engine.getAlertHistory();
    const dismissedItem = history.find((a) => a.id === firstAlertId);
    assert(dismissedItem?.isDismissed === true, 'Dismiss alert updates isDismissed flag to true');
  }

  // =========================================================================
  // Section 6: Vibration Pattern Resolution
  // =========================================================================
  console.log('\nSection 6: Vibration Patterns for Deaf Accessibility');
  const firePattern = engine.getCategoryConfig('fire_alarm').vibrationPattern;
  const knockPattern = engine.getCategoryConfig('knocking').vibrationPattern;
  const doorPattern = engine.getCategoryConfig('doorbell').vibrationPattern;

  assert(firePattern.length === 5, 'Fire alarm has distinct 5-pulse urgent vibration pattern');
  assert(knockPattern.length === 3, 'Knocking has distinct 3-pulse rhythmic vibration pattern');
  assert(doorPattern.length === 3, 'Doorbell has distinct 3-stage chime vibration pattern');
  assert(JSON.stringify(firePattern) !== JSON.stringify(knockPattern), 'Fire alarm and knocking have distinguishable vibration patterns');

  // =========================================================================
  // Section 7: Safety & Privacy Invariants
  // =========================================================================
  console.log('\nSection 7: Privacy & Safety Invariants');

  // Physical realism check: Prohibits 360-degree direction and distance
  let caughtAngle = false;
  try {
    SoundAwarenessEngine.invariantSpatialValidation({ angle: 180 });
  } catch (err: any) {
    caughtAngle = err.message.includes('PHYSICAL_INVARIANT_VIOLATION');
  }
  assert(caughtAngle, 'Invariant: Single-microphone angle/radar simulation is strictly prohibited');

  let caughtDistance = false;
  try {
    SoundAwarenessEngine.invariantSpatialValidation({ distance: 4.2 });
  } catch (err: any) {
    caughtDistance = err.message.includes('PHYSICAL_INVARIANT_VIOLATION');
  }
  assert(caughtDistance, 'Invariant: Distance-in-meters estimation is strictly prohibited');

  assert(SoundAwarenessEngine.invariantSpatialValidation() === true, 'Invariant: Clean data passes validation');

  // Privacy invariant: zero raw audio storage
  const config = engine.getConfig();
  assert(config.privacy.rawAudioStored === false, 'Privacy invariant: Raw audio is NEVER stored or persisted');
  assert(config.privacy.processingLocation === 'local_device_audio_worklet', 'Privacy invariant: Processing is strictly local');

  // Safety notice presence
  const notice = engine.getSafetyNotice();
  assert(notice.en.includes('NOT a certified fire alarm'), 'Safety notice states tool is NOT a certified fire alarm');
  assert(notice.ar.includes('ليست نظام إنذار حريق معتمد'), 'Arabic safety notice clearly states non-certified assistive nature');

  console.log(`\nSound Awareness Phase 3 Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

// Direct execution support
if (process.argv[1]?.includes('soundAwarenessPhase3Verification')) {
  runSoundAwarenessPhase3Verification().then(({ passed, failed }) => {
    if (failed > 0) process.exit(1);
  });
}
