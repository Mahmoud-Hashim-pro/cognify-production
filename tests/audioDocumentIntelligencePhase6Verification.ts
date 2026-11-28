/**
 * Rafiqi — Phase 6: Audio & Document Intelligence Test Suite
 *
 * Comprehensive verification for:
 * - Phase 6.1: Lecture Intelligence (audio validation, chapters, timestamps, grounded QA, summaries)
 * - Phase 6.2: Document Reader (file formats, EPUB parser, scanned PDF notices, reading history privacy)
 * - Phase 6.3: Ask Your Content (grounded Q&A, quiz generator, AI disclosures)
 * - Phase 6.4: Advanced Reading (Table reader with coords, Math LaTeX verbalizer, Braille Unicode, Vocabulary)
 * - Universal Accessibility & Privacy Compliance (WCAG 2.2 AA contrast, privacy-by-design)
 */

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
  type LectureChapter,
  type DocumentReadingHistoryItem,
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

export interface TestResultSummary {
  section: string;
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

/**
 * Creates a synthetic stored-format PKZip buffer representing an EPUB file
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
    header.writeUInt32LE(0, 14);         // crc32 (unused for stored)
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

export async function runAudioDocumentIntelligencePhase6Verification(): Promise<{ passed: number; failed: number }> {
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
  console.log('  RAFIQI — PHASE 6: AUDIO & DOCUMENT INTELLIGENCE MASTER TEST');
  console.log('================================================================');

  // =========================================================================
  // SUBPHASE 6.1: LECTURE INTELLIGENCE TESTS
  // =========================================================================
  console.log('\n[Subphase 6.1: Lecture Intelligence]');

  // Test 1: Audio file validation (valid formats)
  {
    const validFormats = ['lecture.mp3', 'audio.wav', 'memo.m4a', 'record.webm', 'speech.ogg', 'track.aac', 'sound.flac'];
    for (const name of validFormats) {
      const res = validateLectureAudioFile({ name, size: 5 * 1024 * 1024, type: 'audio/' + name.split('.')[1] });
      assert(res.valid === true, `Audio file ${name} is recognized as valid`);
      assert(res.error === undefined, `Audio file ${name} has no validation errors`);
    }
  }

  // Test 2: Audio file validation (empty file rejected)
  {
    const emptyRes = validateLectureAudioFile({ name: 'empty.mp3', size: 0 });
    assert(emptyRes.valid === false, 'Empty audio file (0 bytes) is strictly rejected');
    assert(emptyRes.error === 'EMPTY_FILE', 'Empty audio file triggers EMPTY_FILE error code');
    assert(emptyRes.errorMessageAr!.includes('فارغ'), 'Arabic error explains that file is empty');
  }

  // Test 3: Audio file validation (oversized file rejected)
  {
    const largeRes = validateLectureAudioFile({ name: 'huge.mp3', size: 55 * 1024 * 1024 });
    assert(largeRes.valid === false, 'Audio file exceeding 50MB is strictly rejected');
    assert(largeRes.error === 'FILE_TOO_LARGE', 'Oversized file triggers FILE_TOO_LARGE error code');
    assert(largeRes.errorMessageEn!.includes('50 MB'), 'Error explains 50 MB limit');
  }

  // Test 4: Audio file validation (unsupported formats)
  {
    const badRes = validateLectureAudioFile({ name: 'malware.exe', size: 1024 * 1024 });
    assert(badRes.valid === false, 'Non-audio format .exe is rejected');
    assert(badRes.error === 'UNSUPPORTED_FORMAT', 'Unsupported format triggers UNSUPPORTED_FORMAT');
  }

  // Test 5: Lecture chapter and timestamp detection
  {
    const sampleSegments: AudioTranscriptSegment[] = [
      { id: 'seg-1', text: 'أهلاً بكم في مقدمة مادة الذكاء الاصطناعي والتطبيقات الحديثة.', timestamp: '00:00', seconds: 0 },
      { id: 'seg-2', text: 'سنتناول اليوم تعريف الخوارزميات وتاريخ تطورها السريع.', timestamp: '03:15', seconds: 195 },
      { id: 'seg-3', text: 'ننتقل الآن إلى مفهوم الشبكات العصبية الاصطناعية وطبقاتها المتعددة.', timestamp: '08:45', seconds: 525 },
      { id: 'seg-4', text: 'وفي الختام نلخص أهم ما درسناه اليوم ونحدد تكليف الأسبوع القادم.', timestamp: '14:20', seconds: 860 },
    ];

    const chapters = detectLectureChapters('Full transcript text here', sampleSegments, 'ar');
    assert(chapters.length > 0, 'Chapters successfully detected from segments');
    assert(chapters[0].startTime === '00:00', 'First chapter starts at 00:00');
    assert(chapters[chapters.length - 1].endSeconds === 860, 'Last chapter end timestamp is accurate');
    assert(chapters[0].title.includes('الفصل 1'), 'Arabic chapter numbering is present in title');
  }

  // Test 6: Grounded Lecture Q&A with timestamp citation
  {
    const segments: AudioTranscriptSegment[] = [
      { id: 'seg-1', text: 'أهلاً بكم في مقدمة الذكاء الاصطناعي.', timestamp: '00:00', seconds: 0 },
      { id: 'seg-2', text: 'تم تأسيس علم الذكاء الاصطناعي في مؤتمر دارتموث عام 1956.', timestamp: '04:30', seconds: 270 },
      { id: 'seg-3', text: 'الشبكات العصبية تحاكي الدماغ البشري في معالجة الإشارات.', timestamp: '09:15', seconds: 555 },
    ];
    const fullTranscript = segments.map((s) => s.text).join(' ');

    const groundedAns = await askLectureQuestion(fullTranscript, 'متى تأسس علم الذكاء الاصطناعي؟', segments, 'ar');
    assert(groundedAns.isFoundInLecture === true, 'Grounded lecture QA confirms information is present');
    assert(groundedAns.timestampCitation === '04:30', 'Grounded lecture QA cites exact segment timestamp [04:30]');
  }

  // Test 7: Grounded Lecture Q&A honest absence response
  {
    const segments: AudioTranscriptSegment[] = [
      { id: 'seg-1', text: 'محاضرة اليوم عن تاريخ الأندلس وتأسيس قرطبة.', timestamp: '00:00', seconds: 0 },
    ];
    const fullTranscript = 'محاضرة اليوم عن تاريخ الأندلس وتأسيس قرطبة.';

    // Ask about quantum physics which was never mentioned
    const honestAns = await askLectureQuestion(fullTranscript, 'ما هي معادلة شرودنجر الكمية في الفيزياء؟', segments, 'ar');
    assert(
      honestAns.answer.includes('لم يتم ذكر') ||
      honestAns.answer.includes('غير مذكور') ||
      honestAns.isFoundInLecture === false,
      'Truthful absence response when question asks about topic absent from lecture'
    );
  }

  // Test 8: Structured lecture summary fallback and completeness
  {
    const transcript = 'بدأت المحاضرة بشرح مفهوم التعلم الآلي. التعلم الآلي هو فرع من فروع الذكاء الاصطناعي يهتم بتطوير خوارزميات تتعلم من البيانات. من أمثلته تصنيف رسائل البريد الإلكتروني. يجب على الطلاب قراءة الفصل الأول ومراجعة التمارين.';
    const summary = await generateStructuredLectureSummary(transcript, 'ar');
    assert(summary.shortSummary.length > 0, 'Short summary is generated');
    assert(summary.detailedSummary.length > 0, 'Detailed summary is generated');
    assert(summary.actionableStudyPoints.length > 0, 'Actionable study points are extracted');
  }

  // =========================================================================
  // SUBPHASE 6.2: DOCUMENT READER & EPUB TESTS
  // =========================================================================
  console.log('\n[Subphase 6.2: Document Reader & EPUB]');

  // Test 9: File format validation in documentExtractor
  {
    const pdfVal = validateUploadFile({ name: 'syllabus.pdf', size: 1024 * 1024, type: 'application/pdf' });
    assert(pdfVal.valid === true && pdfVal.category === 'pdf', 'PDF upload file is recognized as valid');

    const docxVal = validateUploadFile({ name: 'assignment.docx', size: 1024 * 1024 });
    assert(docxVal.valid === true && docxVal.category === 'docx', 'DOCX upload file is recognized as valid');

    const epubVal = validateUploadFile({ name: 'textbook.epub', size: 2 * 1024 * 1024 });
    assert(epubVal.valid === true && epubVal.category === 'epub', 'EPUB upload file is recognized as valid');

    const badVal = validateUploadFile({ name: 'script.bat', size: 500 });
    assert(badVal.valid === false, 'Disallowed file extension .bat is rejected');
  }

  // Test 10: Real zero-dependency EPUB ZIP extraction
  {
    const synthEpub = createSyntheticEpub([
      {
        name: 'mimetype',
        content: 'application/epub+zip',
      },
      {
        name: 'META-INF/container.xml',
        content: '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>',
      },
      {
        name: 'OEBPS/chapter1.xhtml',
        content: '<?xml version="1.0"?><html><head><title>الفصل الأول: البدايات</title></head><body><h1>البدايات</h1><p>هذه هي الفقرة الأولى من الكتاب التعليمي.</p><p>وهذه فقرة ثانية تشرح التفاصيل بدقة ووضوح.</p></body></html>',
      },
      {
        name: 'OEBPS/chapter2.xhtml',
        content: '<?xml version="1.0"?><html><head><title>الفصل الثاني: التطبيقات</title></head><body><h1>التطبيقات</h1><p>في هذا الفصل نستعرض التطبيقات العملية على أرض الواقع.</p></body></html>',
      },
    ]);

    const result = await extractTextFromEpub(synthEpub);
    assert(result.valid === true, 'Synthetic EPUB is parsed successfully without external dependencies');
    assert(result.chapterCount === 2, 'Parsed exactly 2 chapters from EPUB');
    assert(result.chapters[0].title.includes('الفصل الأول'), 'First chapter title extracted accurately');
    assert(result.chapters[0].paragraphs.length === 3, 'Chapter paragraphs extracted accurately (1 heading + 2 body paragraphs)');
    assert(result.fullText.includes('الفقرة الأولى'), 'Full text contains content from chapter 1');
    assert(result.fullText.includes('التطبيقات العملية'), 'Full text contains content from chapter 2');
    assert(result.wordCount > 10, 'Calculates word count of the document');
  }

  // Test 11: Corrupted EPUB handling
  {
    const corruptedBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    const corruptedResult = await extractTextFromEpub(corruptedBuffer);
    assert(corruptedResult.valid === false, 'Invalid non-PKZip buffer is rejected');
    assert(corruptedResult.error === 'NOT_A_VALID_EPUB_OR_ZIP', 'Corrupted file returns explicit error code');
  }

  // Test 12: Privacy-preserving reading history
  {
    clearDocumentReadingHistory();
    const historyBefore = getDocumentReadingHistory();
    assert(historyBefore.length === 0, 'Reading history starts empty after clear');

    const item: DocumentReadingHistoryItem = {
      id: 'doc-hist-1',
      title: 'مقدمة في علوم الحاسب',
      fileType: 'pdf',
      lastPageNumber: 12,
      lastParagraphIndex: 3,
      lastOpenedTimestamp: Date.now(),
      progressPercentage: 45,
      wordCount: 15400,
    };

    saveDocumentReadingProgress(item);
    const historyAfter = getDocumentReadingHistory();
    assert(historyAfter.length === 1, 'Document progress successfully saved to history');
    assert(historyAfter[0].title === 'مقدمة في علوم الحاسب', 'Saved title matches');
    assert(historyAfter[0].lastPageNumber === 12, 'Saved page number matches');

    // PRIVACY AUDIT: Verify raw document text is NOT stored in history!
    const rawStored = localStorage.getItem(DOCUMENT_READING_HISTORY_KEY);
    assert(!rawStored!.includes('rawSource'), 'Privacy check: rawSource is NOT stored in localStorage');
    assert(!rawStored!.includes('fullText'), 'Privacy check: fullText is NOT stored in localStorage');

    // Remove single item
    removeDocumentReadingHistoryItem('doc-hist-1');
    assert(getDocumentReadingHistory().length === 0, 'Item successfully removed from reading history');
  }

  // =========================================================================
  // SUBPHASE 6.3: ASK YOUR CONTENT & QUIZZES TESTS
  // =========================================================================
  console.log('\n[Subphase 6.3: Ask Your Content & Quizzes]');

  // Test 13: Grounded document Q&A with page citations
  {
    const documentPages = [
      { pageNum: 1, text: 'الفصل الأول: الحوسبة السحابية. ظهرت الحوسبة السحابية كوسيلة لمشاركة الموارد الحاسوبية بكفاءة عالية.' },
      { pageNum: 2, text: 'الفصل الثاني: نماذج الخدمة السحابية. تنقسم نماذج الخدمة إلى SaaS و PaaS و IaaS.' },
    ];
    const fullDoc = documentPages.map((p) => p.text).join('\n\n');

    const answer = await askDocumentContent(fullDoc, 'ما هي نماذج الخدمة السحابية؟', documentPages, 'ar');
    assert(answer.isFound === true, 'Grounded document Q&A found answer in document');
    assert(answer.citationPage === 2, 'Grounded answer accurately cited Page 2');
  }

  // Test 14: Grounded document Q&A honest absence response
  {
    const documentPages = [
      { pageNum: 1, text: 'مقدمة في قواعد البيانات وطرائق تنظيم الجداول.' },
    ];
    const fullDoc = 'مقدمة في قواعد البيانات وطرائق تنظيم الجداول.';

    const answer = await askDocumentContent(fullDoc, 'ما هي مراحل الانقسام الميتوزي في علم الأحياء؟', documentPages, 'ar');
    assert(
      answer.answer.includes('غير موجودة في المستند') ||
      answer.answer.includes('لم يتم العثور') ||
      answer.isFound === false,
      'Truthful disclosure when concept is absent from document'
    );
  }

  // Test 15: Content Quiz Generator with AI disclaimer
  {
    const sampleText = 'الحوسبة السحابية تقدم خدمات التخزين والمعالجة عبر الإنترنت. من أهم فوائدها تقليل التكاليف وزيادة المرونة. نماذج النشر تشمل السحابة العامة والسحابة الخاصة والسحابة الهجينة.';
    const quiz = await generateContentQuiz(sampleText, {
      count: 3,
      difficulty: 'medium',
      lang: 'ar',
    });

    assert(quiz.difficulty === 'medium', 'Quiz retains requested difficulty level');
    assert(quiz.isAiGeneratedNotice.length > 0, 'Quiz mandates AI-generated notice for transparency');
    assert(quiz.isAiGeneratedNotice.includes('الذكاء الاصطناعي'), 'Arabic notice discloses AI generation');
  }

  // =========================================================================
  // SUBPHASE 6.4: ADVANCED READING — TABLES, MATH, BRAILLE, VOCABULARY
  // =========================================================================
  console.log('\n[Subphase 6.4: Advanced Reading (Tables, Math, Braille, Vocabulary)]');

  // Test 16: Accessible Table Reader & Navigation
  {
    const tableMarkdown = `
| المادة | الساعات | الدرجة |
| الحاسب | 3 | ممتاز |
| الرياضيات | 4 | جيد جداً |
| الفيزياء | 3 | ممتاز |
    `;
    const parsed = parseTableStructure(tableMarkdown, 'ar');
    assert(parsed.rowCount === 3, 'Table parser identifies exactly 3 data rows');
    assert(parsed.colCount === 3, 'Table parser identifies exactly 3 columns');
    assert(parsed.headers.length === 3, 'Table headers extracted accurately');
    assert(parsed.headers[0] === 'المادة', 'First header column is المادة');
    assert(parsed.tableSummary.includes('3 صفوف'), 'Spoken table summary mentions 3 rows');
    assert(parsed.tableSummary.includes('3 أعمدة'), 'Spoken table summary mentions 3 columns');
  }

  // Test 17: Accessible Math Reader & LaTeX Verbalizer (Arabic)
  {
    // Fractions
    const fracExpr = '\\frac{a}{b}';
    const spokenFrac = verbalizeMathExpression(fracExpr, 'ar');
    assert(spokenFrac.includes('الكسر: a مقسوماً على b'), 'LaTeX fraction verbalized correctly in Arabic');

    // Square roots
    const sqrtExpr = '\\sqrt{x}';
    const spokenSqrt = verbalizeMathExpression(sqrtExpr, 'ar');
    assert(spokenSqrt.includes('الجذر التربيعي لـ x'), 'LaTeX square root verbalized correctly in Arabic');

    // Powers
    const powExpr = 'x^2 + y^3';
    const spokenPow = verbalizeMathExpression(powExpr, 'ar');
    assert(spokenPow.includes('x تربيع') && spokenPow.includes('y تكعيب'), 'Powers verbalized correctly in Arabic');

    // Symbols
    const symExpr = 'a + b = c \\times d';
    const spokenSym = verbalizeMathExpression(symExpr, 'ar');
    assert(spokenSym.includes('زائد') && spokenSym.includes('يساوي') && spokenSym.includes('في'), 'Math symbols verbalized in Arabic');
  }

  // Test 18: Accessible Math Reader & LaTeX Verbalizer (English)
  {
    const fracExpr = '\\frac{x}{y}';
    const spokenFrac = verbalizeMathExpression(fracExpr, 'en');
    assert(spokenFrac.includes('fraction: x over y'), 'LaTeX fraction verbalized correctly in English');

    const sqrtExpr = '\\sqrt{16}';
    const spokenSqrt = verbalizeMathExpression(sqrtExpr, 'en');
    assert(spokenSqrt.includes('square root of 16'), 'LaTeX square root verbalized correctly in English');

    const symExpr = 'x + y = z';
    const spokenSym = verbalizeMathExpression(symExpr, 'en');
    assert(spokenSym.includes('plus') && spokenSym.includes('equals'), 'Math symbols verbalized in English');
  }

  // Test 19: Vocabulary Assistant storage and retrieval
  {
    const vocabItem: VocabularyWordItem = {
      id: 'vocab-1',
      word: 'الخوارزمية',
      definition: 'مجموعة متسلسلة من الخطوات المنطقية لحل مسألة معينة.',
      pronunciation: 'Al-Khawarizmiyya',
      contextSentence: 'تم تصميم الخوارزمية لفرز البيانات بأعلى كفاءة.',
      language: 'ar',
      addedTimestamp: Date.now(),
    };

    saveVocabularyWord(vocabItem);
    const list = getSavedVocabulary();
    assert(list.length >= 1, 'Vocabulary word saved to list');
    assert(list.some((w) => w.word === 'الخوارزمية'), 'Saved word retrieved accurately');

    removeVocabularyWord('vocab-1');
    const listAfter = getSavedVocabulary();
    assert(!listAfter.some((w) => w.id === 'vocab-1'), 'Vocabulary word removed successfully');
  }

  // Test 20: Unicode Braille Transcriber
  {
    // Arabic Braille
    const arabicText = 'كتاب';
    const arabicBraille = convertTextToBrailleUnicode(arabicText);
    assert(arabicBraille.length === 4, 'Arabic word converts to exactly 4 Braille Unicode glyphs');
    for (let i = 0; i < arabicBraille.length; i++) {
      const code = arabicBraille.charCodeAt(i);
      assert(code >= 0x2800 && code <= 0x28ff, `Glyph ${arabicBraille[i]} is within Unicode Braille range U+2800..U+28FF`);
    }

    // English Braille
    const englishText = 'braille';
    const englishBraille = convertTextToBrailleUnicode(englishText);
    assert(englishBraille.length === 7, 'English word converts to exactly 7 Braille Unicode glyphs');
    for (let i = 0; i < englishBraille.length; i++) {
      const code = englishBraille.charCodeAt(i);
      assert(code >= 0x2800 && code <= 0x28ff, `Glyph ${englishBraille[i]} is within Unicode Braille range U+2800..U+28FF`);
    }
  }

  // =========================================================================
  // SUBPHASE 6.5: UNIVERSAL ACCESSIBILITY & SECURITY AUDITS
  // =========================================================================
  console.log('\n[Subphase 6.5: Accessibility & Security Audits]');

  // Test 21: WCAG 2.2 AA Color Contrast on Rafiqi Design Tokens
  {
    function getRelativeLuminance(hex: string): number {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16) / 255;
      const g = parseInt(clean.substring(2, 4), 16) / 255;
      const b = parseInt(clean.substring(4, 6), 16) / 255;
      const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function getContrastRatio(hex1: string, hex2: string): number {
      const l1 = getRelativeLuminance(hex1);
      const l2 = getRelativeLuminance(hex2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    const primaryRatio = getContrastRatio('#1769AA', '#FFFFFF');
    assert(primaryRatio >= 4.5, `Rafiqi Primary (#1769AA) on white meets WCAG AA contrast (ratio: ${primaryRatio.toFixed(2)}:1 >= 4.5:1)`);

    const darkPrimaryRatio = getContrastRatio('#0D4778', '#FFFFFF');
    assert(darkPrimaryRatio >= 7.0, `Rafiqi Primary Dark (#0D4778) on white meets WCAG AAA contrast (ratio: ${darkPrimaryRatio.toFixed(2)}:1 >= 7.0:1)`);
  }

  // Test 22: Privacy Audit — Zero Sensitive Data Leakage in History & LocalStorage
  {
    const keys = [DOCUMENT_READING_HISTORY_KEY, VOCABULARY_STORAGE_KEY];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        assert(!raw.includes('apiKey'), `Storage key ${key} contains zero API keys`);
        assert(!raw.includes('password'), `Storage key ${key} contains zero passwords`);
        assert(!raw.includes('blob:'), `Storage key ${key} contains zero temporary audio blobs`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`  PHASE 6 TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (errors.length > 0) {
    console.error('Failed Assertions:');
    errors.forEach((err) => console.error(` - ${err}`));
  }

  return { passed: passedCount, failed: failedCount };
}

// Execute directly if run as script
if (process.argv[1]?.includes('audioDocumentIntelligencePhase6Verification')) {
  runAudioDocumentIntelligencePhase6Verification().then((result) => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
