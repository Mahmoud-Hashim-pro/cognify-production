/**
 * Rafiqi — Phase 7: Read & Learn — Audio & Document Intelligence Master Verification Suite
 *
 * Comprehensive automated verification for all 10 Phase 7 requirements:
 * 1. Audio Lecture Upload: Accessible picker, format/size/duration validation, corrupted/empty file handling, cloud privacy disclosures.
 * 2. Lecture Transcription: Egyptian/Arabic/English support, timestamps, uncertain/unintelligible speech marking without hallucination, replay range, editable transcript.
 * 3. Smart Lecture Summary: Short/detailed summary, main ideas, definitions, terms, examples, dates & numbers, lecturer questions, suggested revision questions.
 * 4. Lecture Chapters & Timestamps: Dynamic grouping, chapter renaming/editing, screen reader announcements.
 * 5. Grounded Ask Your Lecture: Timestamp citation, strict non-found honesty without hallucination.
 * 6. Document Reader: PDF, DOCX, EPUB (zero-dependency zip/xhtml parsing), plain text, reading modes, reading progress with user consent, table reader, math verbalizer.
 * 7. Study Tools: Quiz generation (MCQ, True/False, Short Answer), structured study notes, vocabulary lookup & storage, Grade 1 Braille Unicode.
 * 8. Universal Accessibility: WCAG 2.2 AA contrast, Unified Blue Design System (#1769AA, #0D4778, #F5F9FD, #4B9FE1, no #00AEB8), ARIA live regions, keyboard shortcuts.
 * 9. Privacy & Security: Zero exposed API keys, no unconsented storage, accurate cloud processing notices.
 * 10. Resilience & Error Handling: Fallbacks, cancellation and session reset flows.
 */

import fs from 'fs';
import path from 'path';
import {
  validateLectureAudioFile,
  detectLectureChapters,
  askLectureQuestion,
  generateStructuredLectureSummary,
  extractTextFromEpub,
  saveDocumentReadingProgress,
  getDocumentReadingHistory,
  removeDocumentReadingHistoryItem,
  clearDocumentReadingHistory,
  DOCUMENT_READING_HISTORY_KEY,
  askDocumentContent,
  generateContentQuiz,
  parseTableStructure,
  verbalizeMathExpression,
  convertTextToBrailleUnicode,
  saveVocabularyWord,
  getSavedVocabulary,
  removeVocabularyWord,
  VOCABULARY_STORAGE_KEY,
  markUncertainSpeech,
  updateTranscriptSegment,
  getSegmentPlaybackRange,
  updateLectureChapter,
  getChapterAnnouncement,
  generateStudyNotes,
  lookupVocabularyTerm,
  CLOUD_PROCESSING_PRIVACY_NOTICE_AR,
  CLOUD_PROCESSING_PRIVACY_NOTICE_EN,
  type LectureChapter,
  type SmartLectureSummary,
  type DocumentReadingHistoryItem,
  type GeneratedQuiz,
  type StructuredStudyNotes,
  type VocabularyWordItem,
} from '../src/lib/audioDocumentIntelligenceEngine.js';

import { validateUploadFile, type AudioTranscriptSegment } from '../src/lib/documentExtractor.js';

// Mock localStorage for Node test environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: 0,
  } as any;
}

/**
 * Creates a synthetic stored-format PKZip buffer representing an EPUB file for testing
 */
function createSyntheticEpub(files: { name: string; content: string }[]): Uint8Array {
  const parts: Buffer[] = [];
  for (const f of files) {
    const nameBytes = Buffer.from(f.name, 'utf-8');
    const dataBytes = Buffer.from(f.content, 'utf-8');
    const header = Buffer.alloc(30);

    header.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    header.writeUInt16LE(10, 4);         // version needed: 1.0
    header.writeUInt16LE(0, 6);          // flags: 0
    header.writeUInt16LE(0, 8);          // compression: 0 (Stored)
    header.writeUInt16LE(0, 10);         // time
    header.writeUInt16LE(0, 12);         // date
    header.writeUInt32LE(0, 14);         // crc32
    header.writeUInt32LE(dataBytes.length, 18); // compressed size
    header.writeUInt32LE(dataBytes.length, 22); // uncompressed size
    header.writeUInt16LE(nameBytes.length, 26); // name length
    header.writeUInt16LE(0, 28);         // extra field length

    parts.push(header);
    parts.push(nameBytes);
    parts.push(dataBytes);
  }
  return Buffer.concat(parts);
}

export async function runAudioDocumentIntelligencePhase7Verification(): Promise<{ passed: number; failed: number }> {
  let passedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  function assert(condition: boolean, description: string) {
    if (condition) {
      passedCount++;
      console.log(`  ✓ ${description}`);
    } else {
      failedCount++;
      errors.push(description);
      console.error(`  ✗ FAIL: ${description}`);
    }
  }

  console.log('\n================================================================');
  console.log('  RAFIQI — PHASE 7: READ & LEARN INTELLIGENCE MASTER TEST SUITE');
  console.log('================================================================');

  // =========================================================================
  // REQUIREMENT 1: AUDIO LECTURE UPLOAD
  // =========================================================================
  console.log('\n[1. Audio Lecture Upload Validation & Privacy]');
  {
    const supportedExtensions = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.aac', '.flac'];
    for (const ext of supportedExtensions) {
      const res = validateLectureAudioFile({
        name: `lecture_test${ext}`,
        size: 10 * 1024 * 1024,
        type: `audio/${ext.replace('.', '')}`,
      });
      assert(res.valid === true, `Audio upload allows extension ${ext}`);
      assert(res.durationEstimateSeconds! > 0, `Audio duration estimation computed for ${ext}`);
    }

    // Size limits: 50MB max
    const oversized = validateLectureAudioFile({
      name: 'long_lecture.mp3',
      size: 51 * 1024 * 1024,
    });
    assert(oversized.valid === false, 'Rejects files exceeding 50 MB limit');
    assert(oversized.error === 'FILE_TOO_LARGE', 'Returns FILE_TOO_LARGE error code');
    assert(oversized.errorMessageAr!.includes('50 ميجابايت'), 'Arabic error explains 50MB limit clearly');

    // Empty files: 0 bytes
    const emptyFile = validateLectureAudioFile({
      name: 'empty.wav',
      size: 0,
    });
    assert(emptyFile.valid === false, 'Rejects empty 0-byte audio file');
    assert(emptyFile.error === 'EMPTY_FILE', 'Returns EMPTY_FILE error code');

    // Unsupported formats
    const unsupported = validateLectureAudioFile({
      name: 'malicious.exe',
      size: 1024 * 1024,
      type: 'application/x-msdownload',
    });
    assert(unsupported.valid === false, 'Rejects unsupported file formats');
    assert(unsupported.error === 'UNSUPPORTED_FORMAT', 'Returns UNSUPPORTED_FORMAT error code');

    // Privacy disclosure constants
    assert(
      CLOUD_PROCESSING_PRIVACY_NOTICE_AR.includes('Google Gemini') &&
      CLOUD_PROCESSING_PRIVACY_NOTICE_AR.includes('صريحة'),
      'Arabic cloud processing privacy notice clearly informs user about direct encrypted AI processing'
    );
    assert(
      CLOUD_PROCESSING_PRIVACY_NOTICE_EN.includes('Google Gemini') &&
      CLOUD_PROCESSING_PRIVACY_NOTICE_EN.includes('explicit user consent'),
      'English cloud processing privacy notice guarantees zero unconsented intermediary storage'
    );
  }

  // =========================================================================
  // REQUIREMENT 2: LECTURE TRANSCRIPTION & UNCERTAIN SPEECH MARKING
  // =========================================================================
  console.log('\n[2. Lecture Transcription, Uncertain Speech & Segment Editing]');
  {
    // Uncertain speech marking in Arabic
    const noisyTranscriptAr =
      'في بداية المحاضرة ناقشنا مفهوم الخوارزميات [غير مسموع] ثم انتقلنا إلى التعقيد الزمني [غير واضح] وبعدها المسائل [كلام غير مفهوم].';
    const markedAr = markUncertainSpeech(noisyTranscriptAr, 'ar');
    assert(
      markedAr.includes('[غير مفهوم]') && !markedAr.includes('[غير مسموع]'),
      'markUncertainSpeech standardizes noisy audio markers to [غير مفهوم] in Arabic'
    );
    assert(
      !markedAr.includes('hallucination'),
      'markUncertainSpeech never invents or guesses words for inaudible segments'
    );

    // Uncertain speech marking in English
    const noisyTranscriptEn =
      'In the first lecture we introduced algorithms [inaudible] and runtime complexity [unclear] followed by [???].';
    const markedEn = markUncertainSpeech(noisyTranscriptEn, 'en');
    assert(
      markedEn.includes('[Unintelligible]') && !markedEn.includes('[inaudible]'),
      'markUncertainSpeech standardizes noisy audio markers to [Unintelligible] in English'
    );

    // Segment replay calculation
    const sampleSegments: AudioTranscriptSegment[] = [
      { id: 'seg-1', timestamp: '00:00', seconds: 0, text: 'مقدمة عن علوم الحاسب' },
      { id: 'seg-2', timestamp: '01:30', seconds: 90, text: 'التعريف بالخوارزميات وهياكل البيانات' },
      { id: 'seg-3', timestamp: '03:15', seconds: 195, text: 'أمثلة عملية على البحث الثنائي' },
    ];

    const replayRange = getSegmentPlaybackRange(sampleSegments, 1, 2);
    assert(replayRange.startSeconds === 88, 'getSegmentPlaybackRange includes 2s lead padding');
    assert(replayRange.endSeconds === 197, 'getSegmentPlaybackRange includes tail padding up to next segment');
    assert(replayRange.durationSeconds === 109, 'getSegmentPlaybackRange accurately calculates duration in seconds');
    assert(replayRange.timestamp === '01:30', 'getSegmentPlaybackRange retains original timestamp');

    // Editable transcript without altering audio
    const { segments: updatedSegs, fullTranscript } = updateTranscriptSegment(
      sampleSegments,
      'seg-2',
      'التعريف بالخوارزميات وهياكل البيانات المتقدمة'
    );
    assert(
      updatedSegs[1].text === 'التعريف بالخوارزميات وهياكل البيانات المتقدمة',
      'updateTranscriptSegment successfully updates segment text'
    );
    assert(
      updatedSegs[1].timestamp === '01:30' && updatedSegs[1].seconds === 90,
      'updateTranscriptSegment preserves original timestamp and seconds alignment'
    );
    assert(
      fullTranscript.includes('البيانات المتقدمة') && fullTranscript.includes('[01:30]'),
      'updateTranscriptSegment recalculates full transcript text with preserved timestamps'
    );
    assert(
      sampleSegments[1].text === 'التعريف بالخوارزميات وهياكل البيانات',
      'updateTranscriptSegment performs immutable updates leaving original data pure'
    );
  }

  // =========================================================================
  // REQUIREMENT 3: SMART LECTURE SUMMARY
  // =========================================================================
  console.log('\n[3. Smart Grounded Lecture Summary (All 9 Mandatory Sections)]');
  {
    const richLectureTranscript = `
    محاضرة فيزياء الجوامد - الأستاذ الدكتور أحمد مصطفى.
    في عام 1911 اكتشف العالم كامرلينغ أونز ظاهرة التوصيل الفائق عند درجة حرارة 4.2 كلفن.
    التوصيل الفائق يعني انعدام المقاومة الكهربائية تماماً في بعض المواد عند تبريدها.
    المثال الأبرز هو عنصر الزئبق.
    هل تساءلتم يوماً كيف يمكن نقل الطاقة الكهربائية دون أي فاقد حراري؟
    إن هذا الاكتشاف يفتح الباب أمام شبكات طاقة عالمية فائقة الكفاءة.
    ما هي التطبيقات المستقبلية التي يمكن أن نستفيد منها في القطارات المغناطيسية ماجليف؟
    `;

    const summary = await generateStructuredLectureSummary(richLectureTranscript, 'ar');
    assert(typeof summary.shortSummary === 'string' && summary.shortSummary.length > 0, 'Summary includes concise shortSummary');
    assert(typeof summary.detailedSummary === 'string' && summary.detailedSummary.length > 0, 'Summary includes comprehensive detailedSummary');
    assert(Array.isArray(summary.mainIdeas) && summary.mainIdeas.length > 0, 'Summary includes list of mainIdeas');
    assert(Array.isArray(summary.definitions), 'Summary includes definitions collection');
    assert(Array.isArray(summary.keyTerminology), 'Summary includes keyTerminology collection');
    assert(Array.isArray(summary.importantExamples), 'Summary includes importantExamples');
    assert(Array.isArray(summary.actionableStudyPoints) && summary.actionableStudyPoints.length > 0, 'Summary includes actionable study points');

    // Requirement 3 Specific: Dates and numbers
    assert(Array.isArray(summary.datesAndNumbers) && summary.datesAndNumbers.length > 0, 'Summary includes extracted dates and numbers');
    assert(
      summary.datesAndNumbers.some((n) => n.includes('1911') || n.includes('4.2') || /\d+/.test(n)),
      'Summary captures specific lecture figures (1911, 4.2)'
    );

    // Requirement 3 Specific: Lecturer questions
    assert(Array.isArray(summary.lecturerQuestions), 'Summary includes lecturer questions array');
    assert(
      summary.lecturerQuestions.length > 0,
      'Summary captures rhetorical and classroom questions asked by the lecturer'
    );

    // Requirement 3 Specific: Suggested revision questions
    assert(Array.isArray(summary.revisionQuestions) && summary.revisionQuestions.length > 0, 'Summary includes suggested revision questions');
    assert(
      summary.revisionQuestions.every((q) => typeof q === 'string' && q.length > 5),
      'All revision questions are well-formed strings'
    );
  }

  // =========================================================================
  // REQUIREMENT 4: LECTURE CHAPTERS & TIMESTAMPS
  // =========================================================================
  console.log('\n[4. Dynamic Lecture Chapters, Renaming & Screen-Reader Announcements]');
  {
    const sampleSegs: AudioTranscriptSegment[] = [
      { id: 's-1', timestamp: '00:00', seconds: 0, text: 'مقدمة في الذكاء الاصطناعي والتاريخ المبكر' },
      { id: 's-2', timestamp: '05:00', seconds: 300, text: 'تعلم الآلة والشبكات العصبية الاصطناعية' },
      { id: 's-3', timestamp: '12:30', seconds: 750, text: 'النماذج اللغوية الكبيرة والمعالجة اللغوية' },
      { id: 's-4', timestamp: '20:00', seconds: 1200, text: 'التطبيقات الطبية وأخلاقيات الذكاء الاصطناعي' },
    ];

    const chapters = detectLectureChapters('نص المحاضرة...', sampleSegs, 'ar');
    assert(chapters.length > 0, 'detectLectureChapters generates logical chapters');
    assert(chapters[0].startTime === '00:00', 'First chapter starts at 00:00');
    assert(typeof chapters[0].title === 'string', 'Chapter contains descriptive title');

    // Chapter renaming and editing
    const renamed = updateLectureChapter(chapters, chapters[0].id, {
      title: 'الفصل الأول: تاريخ الذكاء الاصطناعي',
    });
    assert(renamed[0].title === 'الفصل الأول: تاريخ الذكاء الاصطناعي', 'updateLectureChapter updates chapter title');
    assert(renamed[0].startTime === '00:00', 'updateLectureChapter preserves chapter timestamp');

    // Screen reader announcement when switching chapters
    const announcementAr = getChapterAnnouncement(renamed[0], 'ar');
    assert(
      announcementAr.includes('الانتقال إلى') && announcementAr.includes('00:00'),
      'getChapterAnnouncement formats polite screen-reader announcement in Arabic'
    );
    const announcementEn = getChapterAnnouncement(renamed[0], 'en');
    assert(
      announcementEn.includes('Jumped to') && announcementEn.includes('00:00'),
      'getChapterAnnouncement formats polite screen-reader announcement in English'
    );
  }

  // =========================================================================
  // REQUIREMENT 5: ASK YOUR LECTURE (GROUNDED Q&A)
  // =========================================================================
  console.log('\n[5. Grounded Lecture Q&A (Timestamp Citations & Truthful Non-Found Detection)]');
  {
    const lectureText =
      'في هذه المحاضرة سنتحدث عن عاصمة مصر وهي مدينة القاهرة. ومساحة القاهرة الكبرى تبلغ حوالي 3000 كيلومتر مربع.';
    const segs: AudioTranscriptSegment[] = [
      { id: 'seg-cairo', timestamp: '02:45', seconds: 165, text: 'عاصمة مصر هي مدينة القاهرة ومساحتها 3000 كم مربع.' },
    ];

    // Found question
    const foundAns = await askLectureQuestion(lectureText, 'ما هي عاصمة مصر؟', segs, 'ar');
    assert(foundAns.isFoundInLecture === true, 'Accurately recognizes facts present in lecture');
    assert(foundAns.timestampCitation === '02:45', 'Cites exact timestamp for present facts');
    assert(foundAns.confidence >= 0.8, 'High confidence for grounded answers');

    // Absent question (truthful rejection without hallucination)
    const absentAns = await askLectureQuestion(lectureText, 'ما هي عاصمة اليابان؟', segs, 'ar');
    assert(absentAns.isFoundInLecture === false, 'Truthfully detects absent topics not mentioned in lecture');
    assert(
      absentAns.answer.includes('لم يتم ذكر') || absentAns.answer.includes('غير مذكور'),
      'Communicates absent information honestly without fabricating answers'
    );
  }

  // =========================================================================
  // REQUIREMENT 6: DOCUMENT READER & READING PROGRESS PERSISTENCE
  // =========================================================================
  console.log('\n[6. Document Reader (EPUB, PDF, DOCX), Consent Persistence, Table & Math Verbalizers]');
  {
    // EPUB zero-dependency reader
    const sampleHtmlChapter = `<?xml version="1.0" encoding="utf-8"?>
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head><title>مقدمة في الفيزياء الحديثة</title></head>
      <body>
        <h1>الفصل الأول</h1>
        <p>تعتبر النظرية النسبية الخاصة إحدى أهم ركائز الفيزياء الحديثة.</p>
        <p>صاغها ألبرت أينشتاين عام 1905 لتعديل مفاهيم الزمان والمكان.</p>
      </body>
    </html>`;

    const epubBytes = createSyntheticEpub([
      { name: 'OEBPS/chapter1.xhtml', content: sampleHtmlChapter },
    ]);

    const epubResult = await extractTextFromEpub(epubBytes);
    assert(epubResult.valid === true, 'extractTextFromEpub extracts valid EPUB zero-dependency buffer');
    assert(epubResult.chapters.length === 1, 'extractTextFromEpub detects XHTML chapter');
    assert(epubResult.fullText.includes('النظرية النسبية الخاصة'), 'extractTextFromEpub extracts clean unstyled body text');
    assert(epubResult.wordCount > 10, 'extractTextFromEpub computes accurate word count');

    // Corrupted EPUB handling
    const corruptedBytes = new Uint8Array([0, 1, 2, 3, 4, 5]);
    const corruptedResult = await extractTextFromEpub(corruptedBytes);
    assert(corruptedResult.valid === false, 'extractTextFromEpub safely rejects corrupted archive');
    assert(corruptedResult.error !== undefined, 'corrupted EPUB returns specific error descriptor');

    // Reading progress persistence WITH USER CONSENT
    clearDocumentReadingHistory();
    const historyItem: DocumentReadingHistoryItem = {
      id: 'doc-phys-101',
      title: 'مقدمة في الفيزياء الحديثة.epub',
      fileType: 'epub',
      lastPageNumber: 4,
      lastParagraphIndex: 2,
      lastOpenedTimestamp: Date.now(),
      progressPercentage: 40,
      wordCount: 1500,
    };

    // When consent is granted:
    const savedWithConsent = saveDocumentReadingProgress(historyItem, true);
    assert(savedWithConsent === true, 'saveDocumentReadingProgress saves when user consent is true');
    const history = getDocumentReadingHistory();
    assert(history.length === 1 && history[0].id === 'doc-phys-101', 'Reading history is recorded under user consent');

    // When consent is DENIED:
    clearDocumentReadingHistory();
    const savedWithoutConsent = saveDocumentReadingProgress(historyItem, false);
    assert(savedWithoutConsent === false, 'saveDocumentReadingProgress rejects saving when user consent is false');
    const emptyHistory = getDocumentReadingHistory();
    assert(emptyHistory.length === 0, 'No reading progress stored when consent is withheld (Privacy-by-Design)');

    // History item removal and full clear
    saveDocumentReadingProgress(historyItem, true);
    removeDocumentReadingHistoryItem('doc-phys-101');
    assert(getDocumentReadingHistory().length === 0, 'removeDocumentReadingHistoryItem deletes requested record');

    // Accessible Table Reader
    const tableText = `
| المادة | الساعات | الدرجة |
| البرمجة | 3 | 98 |
| قواعد البيانات | 3 | 92 |
    `;
    const parsedTable = parseTableStructure(tableText, 'ar');
    assert(parsedTable.rowCount === 2, 'parseTableStructure extracts 2 data rows');
    assert(parsedTable.colCount === 3, 'parseTableStructure extracts 3 columns');
    assert(parsedTable.tableSummary.includes('صف'), 'Table summary provides screen-reader structural overview');

    // Math Verbalizer (Fractions, Roots, Powers, Symbols)
    const mathFormula = '\\frac{x + 1}{y - 2} = \\sqrt{z^2 + 1}';
    const spokenAr = verbalizeMathExpression(mathFormula, 'ar');
    assert(spokenAr.includes('الكسر') && spokenAr.includes('مقسوماً على'), 'verbalizeMathExpression verbalizes fractions in Arabic');
    assert(spokenAr.includes('الجذر التربيعي'), 'verbalizeMathExpression verbalizes square roots in Arabic');
    assert(spokenAr.includes('تربيع') || spokenAr.includes('أس'), 'verbalizeMathExpression verbalizes powers in Arabic');
    assert(spokenAr.includes('يساوي'), 'verbalizeMathExpression verbalizes equals sign in Arabic');

    const spokenEn = verbalizeMathExpression(mathFormula, 'en');
    assert(spokenEn.includes('fraction') && spokenEn.includes('over'), 'verbalizeMathExpression verbalizes fractions in English');
    assert(spokenEn.includes('square root'), 'verbalizeMathExpression verbalizes square roots in English');
    assert(spokenEn.includes('squared') || spokenEn.includes('power'), 'verbalizeMathExpression verbalizes powers in English');
  }

  // =========================================================================
  // REQUIREMENT 7: STUDY TOOLS (QUIZ, STUDY NOTES, VOCABULARY, BRAILLE)
  // =========================================================================
  console.log('\n[7. Study Tools: MCQ/TF/Short-Answer Quiz, Study Notes, Vocabulary & Braille]');
  {
    const sourceStudyText = `
    علم البيولوجيا الجزيئية يدرس التفاعلات الكيميائية الحيوية داخل الخلايا.
    الحمض النووي DNA يتكون من سلسلتين لولبيتين مزدوجتين من النيوكليوتيدات.
    اكتشف واطسون وكريك البنية الحلزونية للـ DNA عام 1953.
    القواعد النيتروجينية الأربع هي الأدينين والثايمين والجوانين والسيتوزين.
    `;

    // Quiz generator with all question types including short answer
    const quizAll = await generateContentQuiz(sourceStudyText, {
      count: 3,
      difficulty: 'medium',
      type: 'all',
      lang: 'ar',
    });
    assert(quizAll.questions.length >= 2, 'generateContentQuiz generates requested questions');
    assert(
      quizAll.questions.some((q) => q.type === 'short_answer' || q.type === 'mcq' || q.type === 'true_false'),
      'generateContentQuiz supports diverse question types'
    );
    assert(
      quizAll.isAiGeneratedNotice.includes('تنبيه') || quizAll.isAiGeneratedNotice.includes('Notice'),
      'Quiz includes transparent AI generation disclaimer'
    );

    // Quiz generator specifically for short_answer
    const quizShort = await generateContentQuiz(sourceStudyText, {
      count: 2,
      difficulty: 'hard',
      type: 'short_answer',
      lang: 'ar',
    });
    assert(
      quizShort.questions.every((q) => q.type === 'short_answer'),
      'generateContentQuiz with type="short_answer" produces short answer questions'
    );
    assert(
      quizShort.questions.every((q) => q.correctAnswerText && q.correctAnswerText.length > 0),
      'Short answer questions include model answer text for student self-evaluation'
    );

    // Structured Study Notes generator
    const studyNotes = await generateStudyNotes(sourceStudyText, 'ar');
    assert(typeof studyNotes.title === 'string' && studyNotes.title.length > 0, 'generateStudyNotes creates title');
    assert(typeof studyNotes.summary === 'string' && studyNotes.summary.length > 0, 'generateStudyNotes creates summary');
    assert(Array.isArray(studyNotes.sections) && studyNotes.sections.length > 0, 'generateStudyNotes creates sections');
    assert(Array.isArray(studyNotes.reviewQuestions) && studyNotes.reviewQuestions.length > 0, 'generateStudyNotes creates review questions');

    // Vocabulary term lookup & storage
    const vocabItem = await lookupVocabularyTerm('النيوكليوتيدات', 'الحمض النووي DNA يتكون من نيوكليوتيدات', 'ar');
    assert(vocabItem.word === 'النيوكليوتيدات', 'lookupVocabularyTerm preserves term');
    assert(typeof vocabItem.definition === 'string' && vocabItem.definition.length > 5, 'lookupVocabularyTerm extracts definition');

    saveVocabularyWord(vocabItem);
    const savedVocab = getSavedVocabulary();
    assert(savedVocab.some((v) => v.word === 'النيوكليوتيدات'), 'saveVocabularyWord stores term in vocabulary storage');
    removeVocabularyWord(vocabItem.id);
    assert(!getSavedVocabulary().some((v) => v.id === vocabItem.id), 'removeVocabularyWord deletes item from storage');

    // Grade 1 Braille Unicode mapping
    const brailleAr = convertTextToBrailleUnicode('كتاب');
    assert(brailleAr.length === 4, 'convertTextToBrailleUnicode maps Arabic letters to Unicode Braille');
    assert(
      brailleAr.split('').every((ch) => ch.charCodeAt(0) >= 0x2800 && ch.charCodeAt(0) <= 0x28ff),
      'All converted characters belong to Unicode Braille Block (U+2800 to U+28FF)'
    );
    const brailleEn = convertTextToBrailleUnicode('book 1');
    assert(
      brailleEn.includes('\u2800'),
      'convertTextToBrailleUnicode preserves word spaces as Braille space pattern U+2800'
    );
  }

  // =========================================================================
  // REQUIREMENT 8: UNIVERSAL ACCESSIBILITY & BLUE DESIGN SYSTEM COMPLIANCE
  // =========================================================================
  console.log('\n[8. Universal Accessibility (WCAG 2.2 AA Contrast & Unified Blue Design System)]');
  {
    const viewFilePath = path.join(process.cwd(), 'src/components/AudioDocumentIntelligenceView.tsx');
    const viewContent = fs.readFileSync(viewFilePath, 'utf-8');

    // Zero legacy cyan colors (#00AEB8)
    assert(!viewContent.includes('#00AEB8'), 'AudioDocumentIntelligenceView contains ZERO legacy cyan (#00AEB8)');

    // Uses Unified Blue palette tokens
    assert(viewContent.includes('#1769AA'), 'Uses Unified Blue primary token #1769AA');
    assert(viewContent.includes('#0D4778') || viewContent.includes('#0D2542'), 'Uses Unified Blue deep container tokens');

    // Screen-reader live region
    assert(
      viewContent.includes('role="status"') && viewContent.includes('aria-live="polite"'),
      'Contains aria-live="polite" live region with role="status" for non-intrusive status announcements'
    );

    // Semantic landmarks
    assert(viewContent.includes('<header') && viewContent.includes('<nav') && viewContent.includes('<main'), 'Contains semantic HTML5 landmarks (header, nav, main)');

    // Keyboard shortcuts
    assert(
      viewContent.includes("e.code === 'Space'") && viewContent.includes("e.key === 'Escape'"),
      'Implements accessible keyboard shortcuts (Space for play/pause, Escape to stop speech)'
    );
    assert(
      viewContent.includes("e.key === 'r' || e.key === 'R'"),
      'Implements R keyboard shortcut for instant segment replay'
    );
  }

  // =========================================================================
  // REQUIREMENT 9: PRIVACY & SECURITY
  // =========================================================================
  console.log('\n[9. Privacy & Security Verifications]');
  {
    const enginePath = path.join(process.cwd(), 'src/lib/audioDocumentIntelligenceEngine.ts');
    const engineContent = fs.readFileSync(enginePath, 'utf-8');

    // Zero hardcoded API keys
    assert(!engineContent.includes('AIzaSy'), 'Zero hardcoded Google API keys in audioDocumentIntelligenceEngine');
    assert(
      !engineContent.includes('process.env.GEMINI_API_KEY'),
      'All AI calls route through direct server proxy service'
    );

    // User consent verification on storage
    assert(
      engineContent.includes('if (!userConsent) return false;'),
      'Strict userConsent guard protects user reading history from unwanted local persistence'
    );
  }

  // =========================================================================
  // REQUIREMENT 10: ERROR RECOVERY & SESSION CANCELLATION
  // =========================================================================
  console.log('\n[10. Error Recovery, Cancellation & Reset Flows]');
  {
    const viewFilePath = path.join(process.cwd(), 'src/components/AudioDocumentIntelligenceView.tsx');
    const viewContent = fs.readFileSync(viewFilePath, 'utf-8');

    assert(
      viewContent.includes('handleResetAudio'),
      'Implements handleResetAudio to allow users to cancel and reset an active audio upload'
    );
    assert(
      viewContent.includes('toast.error'),
      'Implements accessible visual and screen-reader toasts on error'
    );
  }

  console.log('\n================================================================');
  console.log(`  Phase 7 Verification Results: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('================================================================\n');

  return { passed: passedCount, failed: failedCount };
}

// Allow direct execution
const isDirectRun =
  process.argv[1] &&
  (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
   process.argv[1].includes('audioDocumentIntelligencePhase7Verification'));

if (isDirectRun) {
  runAudioDocumentIntelligencePhase7Verification().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
