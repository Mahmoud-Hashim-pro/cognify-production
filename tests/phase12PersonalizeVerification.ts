/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi — Phase 12: Personalize & Personal Accessibility Profile Verification Suite
 * 
 * Tests all 10 domains:
 * 1. Section 6 Registration in sections.ts
 * 2. Language Preferences & Content Preservation
 * 3. Voice Preferences & Browser Limitation Disclosures
 * 4. Description Preferences & Spoken Formatting
 * 5. Keyboard Shortcuts Matrix & Conflict Validation
 * 6. Reading History Storage & Transparency
 * 7. Privacy-First Assistant Memory & Sensitive Data Guard
 * 8. Offline Capability Classification Matrix
 * 9. Navigation Deep Linking (#settings and #settings/:tab)
 * 10. Design System & Regression Audit (Zero #00AEB8, Card E BYOK, Canonical Logout)
 */

import fs from 'fs';
import path from 'path';
import {
  getProductSection,
  SECTION_DEFINITIONS,
} from '../src/lib/sections';
import {
  parseRoute,
  buildHash,
} from '../src/lib/navigation';
import {
  getLayoutDirection,
  preserveUserContentOnLanguageSwitch,
  detectBrowserVoiceSupport,
  explainUnsupportedVoiceSetting,
  formatNumeralSpoken,
  formatCurrencySpoken,
  formatMeasurementSpoken,
  validateShortcutConflict,
  announceShortcutAction,
  getReadingHistoryStorageExplanation,
  parseReadingHistory,
  addReadingHistoryItem,
  removeReadingHistoryItem,
  clearAllReadingHistory,
  getMemoryPrivacyNotice,
  getMemoryErasureDisclaimer,
  sanitizeMemoryContent,
  createAssistantMemoryEntry,
  OFFLINE_CAPABILITY_MATRIX,
  getOfflineCapabilities,
  isFeatureAvailableOffline,
  DEFAULT_SHORTCUTS,
  DEFAULT_PERSONALIZE_PREFERENCES,
  ReadingHistoryItem,
} from '../src/lib/personalizeEngine';

export interface VerificationResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

export async function runPhase12PersonalizeTests(): Promise<{ passed: number; failed: number; results: VerificationResult[] }> {
  const results: VerificationResult[] = [];

  function assert(condition: boolean, suite: string, name: string, details?: string) {
    results.push({
      suite,
      name,
      passed: !!condition,
      details: details || (condition ? 'Verified successfully' : 'Assertion failed'),
    });
  }

  const repoRoot = process.cwd();

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 1: Section 6 Registration in sections.ts
  // ─────────────────────────────────────────────────────────────────────────────
  const personalizeSection = getProductSection('personalize');
  assert(!!personalizeSection, 'Section 6 Registration', 'Product Section 6 (personalize) exists in registry');
  assert(personalizeSection?.titleAr.includes('التخصيص'), 'Section 6 Registration', 'Section 6 has proper Arabic title (التخصيص)');
  assert(personalizeSection?.id === 'personalize', 'Section 6 Registration', 'Section id is "personalize"');

  const passportFeature = personalizeSection?.features.find(f => f.id === 'feat_accessibility_passport');
  assert(!!passportFeature, 'Section 6 Registration', 'Flagship feature feat_accessibility_passport is registered');
  assert(passportFeature?.targetView === 'settings', 'Section 6 Registration', 'Flagship feature targets settings view');
  assert(passportFeature?.isPrimaryAction === true, 'Section 6 Registration', 'Flagship feature is flagged as primary action');

  const voiceFeature = personalizeSection?.features.find(f => f.id === 'feat_voice_audio_preferences');
  assert(!!voiceFeature, 'Section 6 Registration', 'Sub-feature feat_voice_audio_preferences is registered');

  const descFeature = personalizeSection?.features.find(f => f.id === 'feat_description_reading_preferences');
  assert(!!descFeature, 'Section 6 Registration', 'Sub-feature feat_description_reading_preferences is registered');

  const shortcutsFeature = personalizeSection?.features.find(f => f.id === 'feat_shortcuts_commands');
  assert(!!shortcutsFeature, 'Section 6 Registration', 'Sub-feature feat_shortcuts_commands is registered');

  const historyFeature = personalizeSection?.features.find(f => f.id === 'feat_reading_history_manager');
  assert(!!historyFeature, 'Section 6 Registration', 'Sub-feature feat_reading_history_manager is registered');

  const memoryFeature = personalizeSection?.features.find(f => f.id === 'feat_assistant_memory_privacy');
  assert(!!memoryFeature, 'Section 6 Registration', 'Sub-feature feat_assistant_memory_privacy is registered');

  const offlineFeature = personalizeSection?.features.find(f => f.id === 'feat_offline_connectivity_status');
  assert(!!offlineFeature, 'Section 6 Registration', 'Sub-feature feat_offline_connectivity_status is registered');

  // Preserved features
  const studentProfile = personalizeSection?.features.find(f => f.id === 'feat_student_profile');
  assert(!!studentProfile, 'Section 6 Registration', 'Preserved feature feat_student_profile is intact');

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 2: Language Preferences & Layout Direction
  // ─────────────────────────────────────────────────────────────────────────────
  assert(getLayoutDirection('Arabic') === 'rtl', 'Language Preferences', 'Arabic interface maps to RTL');
  assert(getLayoutDirection('English') === 'ltr', 'Language Preferences', 'English interface maps to LTR');

  const dummyWorkspace = {
    draftDocument: 'بحث عن الجهاز العصبي',
    audioLectureId: 'lec_982',
    currentPosition: 120,
  };
  const preserved = preserveUserContentOnLanguageSwitch(dummyWorkspace, 'Arabic', 'English');
  assert(preserved.draftDocument === dummyWorkspace.draftDocument, 'Language Preferences', 'Draft document text preserved on language switch');
  assert(preserved.audioLectureId === dummyWorkspace.audioLectureId, 'Language Preferences', 'Lecture ID preserved on language switch');
  assert(preserved.currentPosition === dummyWorkspace.currentPosition, 'Language Preferences', 'Current position preserved on language switch');

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 3: Voice Preferences & Browser Disclosures
  // ─────────────────────────────────────────────────────────────────────────────
  const voiceSupport = detectBrowserVoiceSupport();
  assert(typeof voiceSupport.isSynthesisSupported === 'boolean', 'Voice Preferences', 'Voice synthesis capability detected');
  assert(typeof voiceSupport.explanationAr === 'string' && voiceSupport.explanationAr.length > 0, 'Voice Preferences', 'Voice explanation provided in Arabic');
  assert(typeof voiceSupport.explanationEn === 'string' && voiceSupport.explanationEn.length > 0, 'Voice Preferences', 'Voice explanation provided in English');

  const pitchExplanationAr = explainUnsupportedVoiceSetting('pitch', 'Arabic');
  assert(pitchExplanationAr.includes('طبقة الصوت') && pitchExplanationAr.includes('المتصفح'), 'Voice Preferences', 'Clear pitch limitation explanation in Arabic');

  const pitchExplanationEn = explainUnsupportedVoiceSetting('pitch', 'English');
  assert(pitchExplanationEn.toLowerCase().includes('pitch') && pitchExplanationEn.toLowerCase().includes('browser'), 'Voice Preferences', 'Clear pitch limitation explanation in English');

  const spokenDigits = formatNumeralSpoken(25, 'individual_digits', 'Arabic');
  assert(spokenDigits === 'اثنان خمسة', 'Voice Preferences', 'Numeral pronunciation as individual digits in Arabic');

  const spokenWords = formatNumeralSpoken(25, 'arabic_words', 'Arabic');
  assert(spokenWords === 'خمسة وعشرون', 'Voice Preferences', 'Numeral pronunciation as full words in Arabic');

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 4: Description Preferences & Currency/Measurement Formatting
  // ─────────────────────────────────────────────────────────────────────────────
  const egpSpokenAr = formatCurrencySpoken(150, 'EGP', 'Arabic');
  assert(egpSpokenAr.includes('جنيه مصري'), 'Description Preferences', 'EGP spoken currency formatted in Arabic');

  const sarSpokenAr = formatCurrencySpoken(50, 'SAR', 'Arabic');
  assert(sarSpokenAr.includes('ريال سعودي'), 'Description Preferences', 'SAR spoken currency formatted in Arabic');

  const usdSpokenEn = formatCurrencySpoken(20, 'USD', 'English');
  assert(usdSpokenEn.includes('US Dollars'), 'Description Preferences', 'USD spoken currency formatted in English');

  const metricDistAr = formatMeasurementSpoken(3.5, 'distance', 'metric', 'Arabic');
  assert(metricDistAr.includes('متر'), 'Description Preferences', 'Metric distance formatted in Arabic');

  const imperialDistEn = formatMeasurementSpoken(10, 'distance', 'imperial', 'English');
  assert(imperialDistEn.includes('feet'), 'Description Preferences', 'Imperial distance formatted in English');

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 5: Personal Shortcuts & Conflict Validation
  // ─────────────────────────────────────────────────────────────────────────────
  assert(DEFAULT_SHORTCUTS.length >= 8, 'Shortcuts & Commands', 'Default shortcuts contains at least 8 key bindings');
  
  const escapeKey = DEFAULT_SHORTCUTS.find(s => s.keyCombo === 'Escape');
  assert(!!escapeKey && escapeKey.category === 'safety', 'Shortcuts & Commands', 'Emergency kill switch shortcut (Escape) exists in safety category');

  const altV = DEFAULT_SHORTCUTS.find(s => s.keyCombo === 'Alt+V');
  assert(!!altV && altV.action === 'open_vision_companion', 'Shortcuts & Commands', 'Alt+V shortcut opens vision companion');

  // Screen reader conflict checks
  const nvdaConflict = validateShortcutConflict('Insert+F7');
  assert(nvdaConflict.hasConflict && nvdaConflict.screenReaderConflict === 'NVDA', 'Shortcuts & Commands', 'NVDA Insert+F7 conflict correctly flagged');

  const jawsConflict = validateShortcutConflict('Insert+Down');
  assert(jawsConflict.hasConflict && jawsConflict.screenReaderConflict === 'JAWS', 'Shortcuts & Commands', 'JAWS Insert+Down conflict correctly flagged');

  const voiceOverConflict = validateShortcutConflict('Ctrl+Alt+R');
  assert(voiceOverConflict.hasConflict && voiceOverConflict.screenReaderConflict === 'VoiceOver', 'Shortcuts & Commands', 'VoiceOver Ctrl+Alt+R conflict correctly flagged');

  const validCombo = validateShortcutConflict('Alt+Q');
  assert(!validCombo.hasConflict, 'Shortcuts & Commands', 'Valid non-conflicting shortcut Alt+Q passes validation');

  const announcement = announceShortcutAction('Alt+V', 'Arabic');
  assert(announcement.includes('فتح الرفيق البصري'), 'Shortcuts & Commands', 'Shortcut action announcement formatted properly');

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 6: Reading History Storage & Transparency
  // ─────────────────────────────────────────────────────────────────────────────
  const storageNotice = getReadingHistoryStorageExplanation('Arabic');
  assert(storageNotice.includes('محلياً') && storageNotice.includes('الملفات الصوتية الأصلية'), 'Reading History', 'Transparent storage explanation clarifies local-only bookmarks without raw media duplication');

  const rawCorrupt = '{invalid json}';
  const parsedCorrupt = parseReadingHistory(rawCorrupt);
  assert(Array.isArray(parsedCorrupt) && parsedCorrupt.length === 0, 'Reading History', 'parseReadingHistory handles corrupt JSON safely');

  const initialItems: ReadingHistoryItem[] = [
    {
      id: 'item_1',
      title: 'محاضرة 1',
      type: 'audio_lecture',
      lastPosition: 100,
      totalLength: 300,
      progressPercent: 33,
      timestamp: Date.now(),
      storageProvenance: 'local_browser_only',
    }
  ];

  const added = addReadingHistoryItem(initialItems, {
    id: 'item_2',
    title: 'كتاب 2',
    type: 'epub_book',
    lastPosition: 10,
    totalLength: 100,
    progressPercent: 10,
    timestamp: Date.now(),
    storageProvenance: 'local_browser_only',
  });
  assert(added.length === 2 && added[0].id === 'item_2', 'Reading History', 'addReadingHistoryItem prepends newest item');

  const removed = removeReadingHistoryItem(added, 'item_1');
  assert(removed.length === 1 && removed[0].id === 'item_2', 'Reading History', 'removeReadingHistoryItem removes item by id');

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 7: Privacy-First Assistant Memory & Sensitive Data Guard
  // ─────────────────────────────────────────────────────────────────────────────
  assert(DEFAULT_PERSONALIZE_PREFERENCES.memoryOptIn === false, 'Assistant Memory', 'Assistant memory is strictly opt-in (disabled by default)');
  assert(DEFAULT_PERSONALIZE_PREFERENCES.isMemoryPaused === false, 'Assistant Memory', 'Pause state initialized safely');

  // Test Egyptian 14-digit National ID blocker
  const egyptianIdBlocked = sanitizeMemoryContent('الرقم القومي للطالب هو 29801011234567 للتسجيل');
  assert(!egyptianIdBlocked.isValid, 'Assistant Memory', 'Blocks 14-digit Egyptian National ID');
  assert(egyptianIdBlocked.blockedReasonAr?.includes('القومي') || egyptianIdBlocked.blockedReasonAr?.includes('هوية'), 'Assistant Memory', 'Explains National ID blocked reason in Arabic');

  // Test Credit Card blocker
  const cardBlocked = sanitizeMemoryContent('Credit card is 4111 2222 3333 4444 expiration 12/28');
  assert(!cardBlocked.isValid, 'Assistant Memory', 'Blocks credit card numbers');

  // Test Password / Secret token blocker
  const passwordBlocked = sanitizeMemoryContent('password: superSecretPassword123');
  assert(!passwordBlocked.isValid, 'Assistant Memory', 'Blocks passwords and credentials');

  // Test safe memory content
  const safeContent = sanitizeMemoryContent('مكتبتي الخاصة تقع بجانب النافذة على اليمين');
  assert(safeContent.isValid, 'Assistant Memory', 'Allows safe accessibility and spatial notes');

  const memoryEntry = createAssistantMemoryEntry('room_landmark', safeContent.sanitizedText, 'user_input');
  assert(memoryEntry.category === 'room_landmark', 'Assistant Memory', 'Creates memory entry with correct category');
  assert(memoryEntry.isUserVerified === true, 'Assistant Memory', 'Flags user-added entry as verified');

  const privacyNotice = getMemoryPrivacyNotice('Arabic');
  assert(privacyNotice.includes('اختيارية') && privacyNotice.includes('مشفرة'), 'Assistant Memory', 'Privacy notice emphasizes opt-in and local encryption');

  const erasureDisclaimer = getMemoryErasureDisclaimer('Arabic');
  assert(erasureDisclaimer.includes('مسح') && erasureDisclaimer.includes('فوري'), 'Assistant Memory', 'Erasure disclaimer emphasizes complete one-click deletion');

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 8: Offline Capability Classification Matrix
  // ─────────────────────────────────────────────────────────────────────────────
  assert(OFFLINE_CAPABILITY_MATRIX.length >= 7, 'Offline Capabilities', 'Offline matrix contains all classified features');

  const haptics = OFFLINE_CAPABILITY_MATRIX.find(c => c.featureId === 'haptics_vibration');
  assert(!!haptics && haptics.worksOffline === true && haptics.requiresInternet === false, 'Offline Capabilities', 'Haptics & vibration works genuinely offline');

  const localTts = OFFLINE_CAPABILITY_MATRIX.find(c => c.featureId === 'local_browser_tts');
  assert(!!localTts && localTts.worksOffline === true && localTts.requiresInternet === false, 'Offline Capabilities', 'Local browser TTS works genuinely offline');

  const bookmarks = OFFLINE_CAPABILITY_MATRIX.find(c => c.featureId === 'local_bookmarks_history');
  assert(!!bookmarks && bookmarks.worksOffline === true && bookmarks.requiresInternet === false, 'Offline Capabilities', 'Bookmarks & history work genuinely offline');

  const geminiVision = OFFLINE_CAPABILITY_MATRIX.find(c => c.featureId === 'gemini_vision_analysis');
  assert(!!geminiVision && geminiVision.worksOffline === false && geminiVision.requiresInternet === true, 'Offline Capabilities', 'Gemini vision analysis truthfully classified as requiring cloud internet');

  const transcription = OFFLINE_CAPABILITY_MATRIX.find(c => c.featureId === 'lecture_audio_transcription');
  assert(!!transcription && transcription.worksOffline === false && transcription.requiresInternet === true, 'Offline Capabilities', 'Lecture audio transcription truthfully classified as requiring cloud internet');

  assert(isFeatureAvailableOffline('haptics_vibration') === true, 'Offline Capabilities', 'isFeatureAvailableOffline confirms haptics works offline');
  assert(isFeatureAvailableOffline('gemini_vision_analysis') === false, 'Offline Capabilities', 'isFeatureAvailableOffline confirms gemini requires internet');

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 9: Navigation Deep Linking (#settings and #settings/:tab)
  // ─────────────────────────────────────────────────────────────────────────────
  const routeSettings = parseRoute('#settings');
  assert(routeSettings.view === 'settings', 'Navigation Routing', 'parseRoute parses #settings to view: settings');

  const routeVoice = parseRoute('#settings/voice');
  assert(routeVoice.view === 'settings' && routeVoice.tab === 'voice', 'Navigation Routing', 'parseRoute parses #settings/voice to tab: voice');

  const routeMemory = parseRoute('#settings/memory');
  assert(routeMemory.view === 'settings' && routeMemory.tab === 'memory', 'Navigation Routing', 'parseRoute parses #settings/memory to tab: memory');

  const routeOffline = parseRoute('#settings/offline');
  assert(routeOffline.view === 'settings' && routeOffline.tab === 'offline', 'Navigation Routing', 'parseRoute parses #settings/offline to tab: offline');

  const hashSettings = buildHash({ view: 'settings' });
  assert(hashSettings === '#settings', 'Navigation Routing', 'buildHash formats #settings cleanly');

  const hashVoice = buildHash({ view: 'settings', tab: 'voice' as any });
  assert(hashVoice === '#settings/voice', 'Navigation Routing', 'buildHash formats #settings/voice cleanly');

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN 10: Unified Blue Design System & Regression Audit
  // ─────────────────────────────────────────────────────────────────────────────
  const settingsFilePath = path.join(repoRoot, 'src/components/StudentSettingsView.tsx');
  const settingsCode = fs.readFileSync(settingsFilePath, 'utf8');

  // 1. Zero #00AEB8 legacy cyan instances
  const has00AEB8 = /#00AEB8/i.test(settingsCode);
  assert(!has00AEB8, 'Design System & Regression', 'StudentSettingsView.tsx contains ZERO #00AEB8 cyan instances');

  // 2. Card E BYOK retained
  const hasCardE = settingsCode.includes('CARD E: AI SERVICE & API KEY') || settingsCode.includes('AI Service & API Key (BYOK)');
  assert(hasCardE, 'Design System & Regression', 'StudentSettingsView retains CARD E: AI SERVICE & API KEY');

  // 3. BYOK CryptoShield functions retained
  const hasCrypto = settingsCode.includes('secureSaveKey') && settingsCode.includes('secureLoadKeySync');
  assert(hasCrypto, 'Design System & Regression', 'StudentSettingsView retains secureSaveKey and secureLoadKeySync');

  // 4. BYOK Actions retained
  const hasByokActions = settingsCode.includes('handleSaveApiKey') && settingsCode.includes('handleClearApiKey');
  assert(hasByokActions, 'Design System & Regression', 'StudentSettingsView retains handleSaveApiKey and handleClearApiKey');

  // 5. Accessible input id retained
  const hasInputId = settingsCode.includes('id="setting-gemini-key"');
  assert(hasInputId, 'Design System & Regression', 'StudentSettingsView retains id="setting-gemini-key"');

  // 6. Canonical Logout retained
  const hasLogout = settingsCode.includes('LogOut') && settingsCode.includes('logout()');
  assert(hasLogout, 'Design System & Regression', 'StudentSettingsView retains canonical Account Sign Out button (LogOut & logout())');

  // 7. Back navigation retained
  const hasBack = settingsCode.includes('onNavigateBack') && settingsCode.includes('ArrowLeft');
  assert(hasBack, 'Design System & Regression', 'StudentSettingsView retains onNavigateBack and ArrowLeft');

  // 8. Unified Blue palette tokens used
  const usesUnifiedBlue = settingsCode.includes('#1769AA') && settingsCode.includes('#0D2542') && settingsCode.includes('#082344');
  assert(usesUnifiedBlue, 'Design System & Regression', 'StudentSettingsView uses standard Unified Blue tokens (#1769AA, #0D2542, #082344)');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return { passed, failed, results };
}

// Direct execution when run via CLI
if (process.argv[1]?.includes('phase12PersonalizeVerification')) {
  runPhase12PersonalizeTests().then(({ passed, failed, results }) => {
    console.log('\n═════════════════════════════════════════════════════════════════════');
    console.log('  RAFIQI PHASE 12: PERSONALIZE VERIFICATION RESULTS');
    console.log('═════════════════════════════════════════════════════════════════════\n');

    let currentSuite = '';
    for (const r of results) {
      if (r.suite !== currentSuite) {
        currentSuite = r.suite;
        console.log(`\n── ${currentSuite} ──`);
      }
      const icon = r.passed ? '✅' : '❌';
      console.log(`  ${icon} ${r.name}: ${r.details || (r.passed ? 'Passed' : 'Failed')}`);
    }

    console.log('\n─────────────────────────────────────────────────────────────────────');
    console.log(`Total Tests: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('─────────────────────────────────────────────────────────────────────\n');

    if (failed > 0) {
      process.exit(1);
    }
  }).catch((err) => {
    console.error('Fatal verification error:', err);
    process.exit(1);
  });
}
