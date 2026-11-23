/**
 * liveConversationPhase2Verification.ts — Automated Verification Suite for Phase 2 Live Conversation
 *
 * Verifies real-time captions, speech-to-text integration, high-contrast visual themes,
 * custom vocabulary, in-place corrections, search, export, privacy invariants, and WCAG accessibility.
 */

import {
  ConversationEngine,
  SpeechRecognitionService,
  VocabularyEngine,
  SUPPORTED_LANGUAGES,
  DEFAULT_VISUAL_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  type TranscriptSegment,
  type CaptionTheme,
  type CaptionTextSize,
} from '../src/modules/hearAndExpress/liveConversation/index.js';

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

export async function runLiveConversationPhase2Verification() {
  console.log('\n[27] Rafiqi Live Conversation & Real-Time Captions Verification (Phase 2)');

  // ─── 1. Supported Languages & Honest Engine Disclosures ─────────────────────────────
  console.log('\n  Section 1: Language Support & Engine Capability Disclosures');
  {
    const speechService = new SpeechRecognitionService();
    const supported = speechService.getSupportedLanguages();

    assert(supported.length === 3, 'Exactly 3 vetted languages are cataloged');

    const arSA = supported.find((l) => l.code === 'ar-SA');
    assert(arSA !== undefined, 'Modern Standard Arabic (ar-SA) is cataloged');
    assert(arSA?.dialect === 'Arabic', 'ar-SA maps to Arabic dialect');

    const arEG = supported.find((l) => l.code === 'ar-EG');
    assert(arEG !== undefined, 'Egyptian Arabic (ar-EG) is cataloged');
    assert(arEG?.dialect === 'Egyptian Ammiya', 'ar-EG maps to Egyptian Ammiya dialect');

    const enUS = supported.find((l) => l.code === 'en-US');
    assert(enUS !== undefined, 'English (en-US) is cataloged');
    assert(enUS?.dialect === 'English', 'en-US maps to English dialect');

    // Unsupported language rejection:
    assert(!SpeechRecognitionService.isLanguageSupported('fr-FR'), 'Rejects unsupported language "fr-FR"');
    assert(!SpeechRecognitionService.isLanguageSupported('es-ES'), 'Rejects unsupported language "es-ES"');
    assert(!SpeechRecognitionService.isLanguageSupported('de-DE'), 'Rejects unsupported language "de-DE"');

    // Capability disclosure:
    const caps = speechService.detectEngineCapabilities();
    assert(typeof caps.hasSpeechRecognition === 'boolean', 'Reports genuine browser speech engine capability');
    assert(typeof caps.engineProvider === 'string', 'Discloses engine provider transparently');
    assert(caps.supportsOffline === false, 'Honestly declares that cloud-based Chromium speech engine requires internet');
  }

  // ─── 2. Speech-to-Text State Transitions & Error Recovery ─────────────────────────
  console.log('\n  Section 2: Speech-to-Text State Machine & Error Handling');
  {
    const speechService = new SpeechRecognitionService();
    assert(speechService.getState() === 'idle', 'Initial speech recognition state is "idle"');

    // Test rejection of unsupported language without starting mic
    const unsupportedResult = await speechService.start('zh-CN');
    assert(unsupportedResult === false, 'Calling start() with unsupported language code returns false');
    assert(speechService.getState() === 'error', 'Transitions to "error" state on unsupported language');

    // Test pause and resume state transitions
    speechService.pause();
    assert(speechService.getState() === 'paused', 'pause() transitions state to "paused"');

    speechService.stop();
    assert(speechService.getState() === 'idle', 'stop() transitions state back to "idle"');
  }

  // ─── 3. Transcript Processing, Deduplication & Directionality ──────────────────────
  console.log('\n  Section 3: Transcript Processing, Deduplication & Directionality');
  {
    const engine = new ConversationEngine({ defaultDialect: 'Arabic' });

    // Directionality detection
    assert(ConversationEngine.detectDirection('مرحباً بكم في رفيقي') === 'rtl', 'Arabic text resolves to "rtl"');
    assert(ConversationEngine.detectDirection('Hello and welcome to Rafiqi') === 'ltr', 'English text resolves to "ltr"');
    assert(ConversationEngine.detectDirection('ازيك عامل ايه النهاردة') === 'rtl', 'Egyptian Ammiya text resolves to "rtl"');

    // Adding finalized segments
    const seg1 = engine.addSegment('السلام عليكم ورحمة الله', 'other', 'Arabic', 0.95, 'المحاضر');
    assert(seg1.direction === 'rtl', 'Arabic segment receives rtl direction');
    assert(seg1.speakerLabel === 'المحاضر', 'Custom speaker label preserved');
    assert(seg1.confidence === 0.95, 'Confidence score recorded');
    assert(seg1.isLowConfidence === false, 'High confidence segment is not flagged as low confidence');

    // Low confidence handling (noisy environment)
    const segNoisy = engine.addSegment('صوت غير واضح وشوشرة', 'other', 'Arabic', 0.52);
    assert(segNoisy.isLowConfidence === true, 'Confidence < 0.65 flagged as low confidence for noise warning');

    // Multiple segments timeline
    engine.addSegment('We will start our lecture now', 'other', 'English', 0.92, 'Professor');
    const all = engine.getSegments();
    assert(all.length === 3, 'Maintains 3 segments in chronological order');
    assert(all[2].direction === 'ltr', 'English segment receives ltr direction');
  }

  // ─── 4. Custom Vocabulary Engine & Phonetic Corrections ───────────────────────────
  console.log('\n  Section 4: Custom Vocabulary & Arabic Diacritic Normalization');
  {
    const vocab = new VocabularyEngine();
    vocab.clear();
    assert(vocab.getItems().length === 0, 'Vocabulary starts clean');

    // Add vocabulary corrections
    const item1 = vocab.addItem('رفيق', 'رفيقي', 'اسم المنظومة');
    const item2 = vocab.addItem('دكتور احمد', 'د. أحمد صبري', 'اسم الطبيب');

    assert(vocab.getItems().length === 2, 'Added 2 custom vocabulary items');

    // Apply vocabulary to misheard transcript
    const misheard1 = 'أهلاً بك في تطبيق رفيق للمساعدة';
    const corrected1 = vocab.applyVocabulary(misheard1);
    assert(corrected1.includes('رفيقي'), 'Replaces "رفيق" with "رفيقي" in live transcript');

    const misheard2 = 'الكشف مع دكتور احمد غداً';
    const corrected2 = vocab.applyVocabulary(misheard2);
    assert(corrected2.includes('د. أحمد صبري'), 'Replaces "دكتور احمد" with "د. أحمد صبري"');

    // Arabic normalization checks
    const rawAlef = 'إستماع لآراء أحمد';
    const normAlef = VocabularyEngine.normalizeArabic(rawAlef);
    assert(normAlef === 'استماع لاراء احمد', 'Unifies Alef variants (إ, آ, أ -> ا)');

    const rawTashkeel = 'السَّلَامُ عَلَيْكُمْ';
    const normTashkeel = VocabularyEngine.normalizeArabic(rawTashkeel);
    assert(normTashkeel === 'السلام عليكم', 'Strips Arabic tashkeel / harakat diacritics');

    // Case-insensitive search match with orthographic tolerance
    assert(VocabularyEngine.isSearchMatch('احمد', 'د. أحمد صبري'), 'Matches "احمد" against "أحمد"');
    assert(VocabularyEngine.isSearchMatch('مدرسه', 'في المدرسة الابتدائية'), 'Matches Ta Marbuta (مدرسه vs مدرسة)');

    vocab.removeItem(item1.id);
    assert(vocab.getItems().length === 1, 'Removed 1 vocabulary item successfully');
  }

  // ─── 5. In-Place Segment Editing, Bookmarking & Notes ──────────────────────────────
  console.log('\n  Section 5: In-Place Editing, Bookmarking & Concurrent Notes');
  {
    const engine = new ConversationEngine();
    const seg = engine.addSegment('الاجتماع يوم التلات', 'other', 'Egyptian Ammiya');

    // User in-place correction:
    const edited = engine.updateSegmentText(seg.id, 'الاجتماع يوم الثلاثاء القادم');
    assert(edited === true, 'In-place segment text update succeeded');

    const updated = engine.getSegments().find((s) => s.id === seg.id);
    assert(updated?.text === 'الاجتماع يوم الثلاثاء القادم', 'Updated text reflected in segment');
    assert(updated?.originalText === 'الاجتماع يوم التلات', 'Original raw transcript preserved for transparency');
    assert(updated?.isEdited === true, 'Segment tagged as edited');
    assert(updated?.editHistory?.length === 1, 'Edit history preserved with previous version');

    // Bookmarking
    assert(updated?.isBookmarked === false, 'Initially not bookmarked');
    engine.toggleBookmark(seg.id);
    assert(engine.getBookmarkedSegments().length === 1, 'Bookmarked segment added to starred list');
    engine.toggleBookmark(seg.id);
    assert(engine.getBookmarkedSegments().length === 0, 'Unstarring removes segment from starred list');

    // Concurrent Notes
    const note1 = engine.addNote('تذكير: تسليم التقرير يوم الثلاثاء', seg.id);
    assert(note1.text.includes('تسليم التقرير'), 'Adds note during conversation');
    assert(note1.linkedSegmentId === seg.id, 'Links note to specific transcript segment');
    assert(engine.getNotes().length === 1, 'Notes collection contains 1 note');

    engine.removeNote(note1.id);
    assert(engine.getNotes().length === 0, 'Removed note cleanly');
  }

  // ─── 6. Search, Summarization & Multi-Format Export ────────────────────────────────
  console.log('\n  Section 6: Search, Summary & Multi-Format Export');
  {
    const engine = new ConversationEngine();
    engine.addSegment('أهلاً بكم في جامعة القاهرة', 'other', 'Arabic');
    engine.addSegment('يجب تسليم الواجب قبل يوم الخميس القادم', 'other', 'Arabic');
    engine.addSegment('هل لديك أي استفسار عن المحاضرة؟', 'other', 'Arabic');

    // Search
    const searchRes = engine.search('الخميس');
    assert(searchRes.length === 1, 'Search finds matching segment by keyword');
    assert(searchRes[0].text.includes('الواجب'), 'Search returned exact target segment');

    // Summary generation
    const summary = engine.generateSummary();
    assert(summary.totalSegmentsAnalyzed === 3, 'Summary analyzed all 3 segments');
    assert(summary.keyPoints.length > 0, 'Summary produced key points');
    assert(summary.actionItems.length > 0, 'Summary detected action item containing "يجب"');

    // Export TXT
    const txt = engine.exportTranscript('txt');
    assert(txt.includes('Rafiqi Live Conversation Transcript'), 'Exports valid plain text transcript');
    assert(txt.includes('جامعة القاهرة'), 'Plain text contains segment content');

    // Export Markdown
    const md = engine.exportTranscript('markdown');
    assert(md.includes('# Rafiqi Live Conversation Transcript'), 'Exports valid Markdown headers');
    assert(md.includes('> أهلاً بكم في جامعة القاهرة'), 'Markdown formats speeches as blockquotes');

    // Export JSON
    const jsonStr = engine.exportTranscript('json');
    const parsedJson = JSON.parse(jsonStr);
    assert(parsedJson.segmentsCount === 3, 'JSON export preserves segment count');
    assert(Array.isArray(parsedJson.segments), 'JSON export contains structured segments array');

    // Clear transcript with confirmation
    const cleared = engine.clearWithConfirmation(true);
    assert(cleared === true, 'Clear with confirmation succeeds');
    assert(engine.getSegments().length === 0, 'Transcript is completely emptied');
  }

  // ─── 7. Privacy Invariants & Retention Policies ───────────────────────────────────
  console.log('\n  Section 7: Privacy Invariants & Retention Policies');
  {
    const engine = new ConversationEngine();
    const privacy = engine.getPrivacySettings();

    assert(privacy.rawAudioStored === false, 'Strict invariant: Raw audio is NEVER stored');
    assert(privacy.retentionPolicy === 'session_only', 'Default retention policy is session_only');

    engine.setRetentionPolicy('local_storage');
    assert(engine.getPrivacySettings().retentionPolicy === 'local_storage', 'Updates retention policy to local_storage');

    engine.setRetentionPolicy('session_only');
    assert(engine.getPrivacySettings().retentionPolicy === 'session_only', 'Switches retention back to session_only');
  }

  // ─── 8. Visual Presentation & Accessibility Settings ──────────────────────────────
  console.log('\n  Section 8: Visual Settings, Themes & Accessibility');
  {
    const engine = new ConversationEngine();
    const initialVisual = engine.getVisualSettings();

    assert(initialVisual.textSize === 'large', 'Default text size is large (24px)');
    assert(initialVisual.theme === 'blue_companion', 'Default theme is blue_companion');
    assert(initialVisual.autoScroll === true, 'Default auto-scroll is enabled');

    // Update settings
    engine.updateVisualSettings({
      textSize: 'huge',
      theme: 'dark_high_contrast',
      lineHeight: 'loose',
    });

    const updatedVisual = engine.getVisualSettings();
    assert(updatedVisual.textSize === 'huge', 'Text size updated to huge (36px)');
    assert(updatedVisual.theme === 'dark_high_contrast', 'Theme updated to dark_high_contrast');
    assert(updatedVisual.lineHeight === 'loose', 'Line height updated to loose');
  }

  console.log(`\n  Live Conversation Phase 2 Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

if (process.argv[1] && process.argv[1].includes('liveConversationPhase2Verification')) {
  runLiveConversationPhase2Verification()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
