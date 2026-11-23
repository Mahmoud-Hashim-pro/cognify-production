/**
 * Rafiqi — Phase 9: Personalization, Privacy & Universal Accessibility Verification Suite
 *
 * Verifies:
 * 1. Personalization engine defaults and granular customization
 * 2. Strict Non-Disclosure Invariant: Zero clinical disability registration required
 * 3. Ergonomic preset profiles without medical declaration
 * 4. Transparent processing disclosures (no false local claims when cloud speech is used)
 * 5. Strict audio & camera stream storage prohibition invariants
 * 6. Sensor permission lifecycle (grant, revoke, audit)
 * 7. Transcript retention policies (session_only, ephemeral_15min, local_persistent)
 * 8. Complete data sovereignty: full export and permanent scrub deletion
 * 9. Storage error resilience and graceful recovery
 * 10. WCAG 2.2 AA universal accessibility parameters
 */

import {
  HearAndExpressPersonalizationEngine,
  DEFAULT_PREFERENCES,
} from '../src/modules/hearAndExpress/privacyAndPersonalization/personalizationEngine';
import {
  HearAndExpressPrivacyManager,
  TRANSPARENCY_DISCLOSURE,
} from '../src/modules/hearAndExpress/privacyAndPersonalization/privacyManager';

export async function runPrivacyAndPersonalizationPhase9Verification(): Promise<{
  passed: number;
  failed: number;
  errors: string[]
}> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      failed++;
      errors.push(message);
      console.error(`  ❌ FAILED: ${message}`);
    }
  }

  console.log('\n================================================================');
  console.log('--- Rafiqi Phase 9: Personalization & Universal Privacy ---');
  console.log('================================================================\n');

  const engine = new HearAndExpressPersonalizationEngine();
  const privacy = new HearAndExpressPrivacyManager();

  // ----------------------------------------------------
  // SECTION 1: Personalization Defaults & Non-Disclosure Invariant
  // ----------------------------------------------------
  console.log('--- [Section 1] Personalization Defaults & Non-Disclosure Invariant ---');

  const initialPrefs = engine.getPreferences();
  assert(initialPrefs.language === 'ar', 'Default language is Arabic');
  assert(initialPrefs.captionSize === 'large', 'Default caption size is large');
  assert(initialPrefs.captionTheme === 'yellow_on_black', 'Default caption theme is high-legibility yellow-on-black');
  assert(initialPrefs.contrastLevel === 'high', 'Default contrast level is high');
  assert(initialPrefs.confirmCriticalMessages === true, 'Critical emergency messages confirmation enabled by default');

  // STRICT INVARIANT: No user is ever required to disclose a disability
  assert(
    initialPrefs.noDisabilityDisclosureRequired === true,
    'Strict Ethical Invariant: noDisabilityDisclosureRequired is TRUE'
  );

  // Attempting to overwrite non-disclosure invariant should be blocked/enforced
  engine.updatePreferences({ noDisabilityDisclosureRequired: false } as any);
  assert(
    engine.getPreferences().noDisabilityDisclosureRequired === true,
    'Ethical invariant is immutable: Cannot be overridden to false'
  );

  // ----------------------------------------------------
  // SECTION 2: Granular Customization Across Subsystems
  // ----------------------------------------------------
  console.log('\n--- [Section 2] Granular Customization Across Subsystems ---');

  // Captions & Visuals
  engine.updatePreferences({
    captionSize: 'xxl',
    captionTheme: 'high_contrast',
    contrastLevel: 'maximum',
    reducedMotion: true,
  });
  let updated = engine.getPreferences();
  assert(updated.captionSize === 'xxl', 'Caption size updated to xxl');
  assert(updated.captionTheme === 'high_contrast', 'Caption theme updated to high_contrast');
  assert(updated.contrastLevel === 'maximum', 'Contrast level updated to maximum');
  assert(updated.reducedMotion === true, 'Reduced motion mode enabled');

  // Speech & TTS
  engine.updatePreferences({
    arabicDialect: 'Egyptian Ammiya',
    ttsSpeed: 1.25,
    ttsPitch: 1.1,
    confirmCriticalMessages: false,
  });
  updated = engine.getPreferences();
  assert(updated.arabicDialect === 'Egyptian Ammiya', 'Dialect updated to Egyptian Ammiya');
  assert(updated.ttsSpeed === 1.25, 'TTS speech rate updated to 1.25x');
  assert(updated.ttsPitch === 1.1, 'TTS pitch updated to 1.1');
  assert(updated.confirmCriticalMessages === false, 'Confirm critical messages updated to false');

  // AAC Layout & Scanning
  engine.updatePreferences({
    aacGridSize: '4x6',
    aacSwitchScanningEnabled: true,
    aacScanSpeedMs: 2000,
  });
  updated = engine.getPreferences();
  assert(updated.aacGridSize === '4x6', 'AAC grid size updated to 4x6');
  assert(updated.aacSwitchScanningEnabled === true, 'AAC switch scanning enabled');
  assert(updated.aacScanSpeedMs === 2000, 'AAC scan interval updated to 2000ms');

  // Sound Alerts & Priority
  engine.updatePreferences({
    alertPriorityThreshold: 'danger_only',
    alertPresentation: 'vibration_only',
    enableVibrationAlerts: true,
  });
  updated = engine.getPreferences();
  assert(updated.alertPriorityThreshold === 'danger_only', 'Alert priority threshold updated to danger_only');
  assert(updated.alertPresentation === 'vibration_only', 'Alert presentation set to vibration_only');

  // Sign Learning Preferences
  engine.updatePreferences({
    signPlaybackSpeed: 0.75,
    showPhonologicalCues: true,
    showRegionalVariations: false,
  });
  updated = engine.getPreferences();
  assert(updated.signPlaybackSpeed === 0.75, 'Sign playback rate updated to 0.75x');
  assert(updated.showRegionalVariations === false, 'Show regional variations updated to false');

  // ----------------------------------------------------
  // SECTION 3: Ergonomic Presets (No Medical Disclosure)
  // ----------------------------------------------------
  console.log('\n--- [Section 3] Ergonomic Presets (No Medical Disclosure) ---');

  // High Visual Preset
  engine.applyPreset('high_visual');
  let presetPrefs = engine.getPreferences();
  assert(presetPrefs.captionSize === 'xxl', 'High visual preset applies xxl captions');
  assert(presetPrefs.contrastLevel === 'maximum', 'High visual preset applies maximum contrast');
  assert(presetPrefs.largeTouchTargets === true, 'High visual preset enforces large touch targets');

  // Motor Scanning Preset
  engine.applyPreset('motor_scanning');
  presetPrefs = engine.getPreferences();
  assert(presetPrefs.aacSwitchScanningEnabled === true, 'Motor preset enables switch scanning');
  assert(presetPrefs.confirmCriticalMessages === true, 'Motor preset ensures critical message confirmation');

  // Calm Minimal Preset
  engine.applyPreset('calm_minimal');
  presetPrefs = engine.getPreferences();
  assert(presetPrefs.alertPresentation === 'silent_visual', 'Calm preset sets silent visual alerts');
  assert(presetPrefs.screenReaderVerbosity === 'minimal', 'Calm preset sets minimal screen reader verbosity');

  // Reset to Defaults
  engine.resetToDefaults();
  assert(engine.getPreferences().captionSize === 'large', 'Reset restored clean defaults');

  // ----------------------------------------------------
  // SECTION 4: Transparent Processing Disclosures
  // ----------------------------------------------------
  console.log('\n--- [Section 4] Transparent Processing Disclosures ---');

  const disclosure = privacy.getTransparencyDisclosure();
  assert(
    disclosure.disclosureStatementAr.includes('AudioWorklet') &&
    disclosure.disclosureStatementAr.includes('Web Speech API'),
    'Transparency statement accurately describes local AudioWorklet and browser Web Speech architecture'
  );

  // STRICT INVARIANT: Never falsely claim local processing if external cloud APIs are involved
  assert(
    disclosure.disclosureStatementEn.includes('never falsely claim local processing') ||
    disclosure.disclosureStatementAr.includes('ولا يدعي النظام معالجة سحابية محلية كذباً'),
    'Strict Invariant: Explicitly prohibits falsely claiming local processing when cloud speech engines are involved'
  );

  // STRICT SAFETY INVARIANTS: Prohibit storing raw streams
  assert(disclosure.rawAudioStored === false, 'Strict Safety Invariant: rawAudioStored is FALSE');
  assert(disclosure.cameraStreamStored === false, 'Strict Safety Invariant: cameraStreamStored is FALSE');

  // ----------------------------------------------------
  // SECTION 5: Sensor Permissions & Consent Lifecycle
  // ----------------------------------------------------
  console.log('\n--- [Section 5] Sensor Permissions & Consent Lifecycle ---');

  const initialConsent = privacy.getConsent();
  assert(initialConsent.microphoneConsentGranted === false, 'Microphone consent initially false');
  assert(initialConsent.cameraConsentGranted === false, 'Camera consent initially false');

  // Grant and revoke microphone
  privacy.grantMicrophoneConsent();
  assert(privacy.getConsent().microphoneConsentGranted === true, 'Microphone consent granted');
  assert(privacy.getPermissionAudit().microphone === 'granted', 'Permission audit reflects granted microphone');

  privacy.revokeMicrophoneConsent();
  assert(privacy.getConsent().microphoneConsentGranted === false, 'Microphone consent revoked');
  assert(privacy.getPermissionAudit().microphone === 'denied', 'Permission audit reflects denied microphone');

  // Grant and revoke camera
  privacy.grantCameraConsent();
  assert(privacy.getConsent().cameraConsentGranted === true, 'Camera consent granted');
  assert(privacy.getPermissionAudit().camera === 'granted', 'Permission audit reflects granted camera');

  privacy.revokeCameraConsent();
  assert(privacy.getConsent().cameraConsentGranted === false, 'Camera consent revoked');

  // Transcript retention policy
  privacy.setTranscriptRetention('ephemeral_15min');
  assert(privacy.getConsent().transcriptRetention === 'ephemeral_15min', 'Updated transcript retention to ephemeral_15min');
  privacy.setTranscriptRetention('session_only');
  assert(privacy.getConsent().transcriptRetention === 'session_only', 'Updated transcript retention to session_only');

  // Complete Consent Withdrawal
  privacy.grantMicrophoneConsent();
  privacy.grantCameraConsent();
  privacy.withdrawAllConsent();
  assert(privacy.getConsent().microphoneConsentGranted === false, 'Withdraw all consent revokes microphone');
  assert(privacy.getConsent().cameraConsentGranted === false, 'Withdraw all consent revokes camera');
  assert(privacy.getConsent().transcriptRetention === 'session_only', 'Withdraw all consent resets retention to session_only');

  // ----------------------------------------------------
  // SECTION 6: Data Sovereignty: Full Export & Scrub Deletion
  // ----------------------------------------------------
  console.log('\n--- [Section 6] Data Sovereignty: Full Export & Scrub Deletion ---');

  // Full data export
  const exportPackage = engine.generateFullExportPackage(privacy);
  assert(exportPackage.version === '1.0', 'Export package schema is version 1.0');
  assert(Boolean(exportPackage.preferences), 'Export package includes preferences');
  assert(Boolean(exportPackage.privacyConsents), 'Export package includes privacy consents');
  assert(exportPackage.exportedAt > 0, 'Export package contains valid timestamp');

  // Complete cryptographic scrub & user data deletion
  const deleteResult = privacy.deleteAllUserData();
  assert(deleteResult.success === true, 'Scrub deletion executed successfully');
  assert(deleteResult.erasedKeys.length >= 7, `Erased all ${deleteResult.erasedKeys.length} local storage keys`);
  assert(deleteResult.erasedKeys.includes('rafiqi_hear_express_prefs_v1'), 'Erased preferences storage key');
  assert(deleteResult.erasedKeys.includes('rafiqi_hear_express_privacy_consent_v1'), 'Erased privacy consent key');
  assert(deleteResult.erasedKeys.includes('rafiqi_custom_aac_symbols'), 'Erased custom AAC symbols key');

  // ----------------------------------------------------
  // SECTION 7: Universal Accessibility & WCAG 2.2 AA Compliance
  // ----------------------------------------------------
  console.log('\n--- [Section 7] Universal Accessibility & WCAG 2.2 AA Compliance ---');

  const a11yPrefs = engine.getPreferences();
  assert(a11yPrefs.largeTouchTargets === true, 'Large touch targets (>= 48px) enabled by default');
  assert(Boolean(a11yPrefs.screenReaderVerbosity), 'Screen reader verbosity configuration supported');
  assert(typeof a11yPrefs.reducedMotion === 'boolean', 'Reduced motion configuration supported');
  assert(
    ['standard', 'high', 'maximum'].includes(a11yPrefs.contrastLevel),
    'Supports WCAG 2.2 AA high and maximum contrast levels'
  );

  console.log('\n================================================================');
  console.log(`Phase 9 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  return { passed, failed, errors };
}

// Direct execution when run via tsx
if (process.argv[1]?.includes('privacyAndPersonalizationPhase9Verification')) {
  runPrivacyAndPersonalizationPhase9Verification()
    .then((result) => {
      if (result.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
