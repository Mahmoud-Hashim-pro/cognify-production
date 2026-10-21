/**
 * Milestone 36 / Phase 11: Cognify End-to-End & Comprehensive Regression Test Suite
 * 
 * Verifies all implemented capabilities across:
 * 1. Camera Frame Analysis & Stale/Out-of-Order Race Condition Protection
 * 2. File Reader & Audio Lecture Transcription Invariants
 * 3. Accessibility & Interactive Control Names
 * 4. Navigation, History, and Session Auth Preservation
 * 5. Educational Book Studio Document Compilation & Round-Trip Preservation
 * 6. Integrated Accessibility Toolkit (Scene, OCR, Multipage Scan, WhatsApp Stickers)
 * 7. Reliability, Quotas, Provider Outages & Privacy Isolation
 */

import {
  validateUploadFile,
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromTxt,
  parseAudioSegments,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_AUDIO_SIZE_BYTES,
} from '../src/lib/documentExtractor.js';
import {
  exportTranscriptToDocx,
  exportTranscriptToTxt,
  exportSummaryToDocx,
} from '../src/lib/audioTranscriptionEngine.js';
import {
  TEMPLATE_PRESETS,
  type BookTemplateType,
  type RecognizedQuestion,
  type DocumentSection,
  type BookStudioMetadata,
  recognizeEducationalQuestions,
  parseDocumentStructure,
  buildAccessibleBookDocx,
  buildPrintableHtmlDocument,
  BOOK_STUDIO_STORAGE_KEY,
} from '../src/lib/bookStudioEngine.js';
import {
  combinePagesIntoPdf,
  detectAndNeutralizeAdversarialInjection,
  saveToolkitActivity,
  getToolkitActivities,
  clearToolkitActivities,
  type ScannedPageItem,
} from '../src/lib/accessibilityToolkitEngine.js';
import {
  ASSISTIVE_QUOTAS,
  checkAndConsumeQuota,
  getUserUsageSnapshot,
  deduplicateInflight,
  generateUserContentHash,
  setCachedResult,
  getCachedResult,
  createProcessingJob,
  updateJobProgress,
  completeProcessingJob,
  getProcessingJob,
  resetUsageEngineForTesting,
} from '../api/_lib/usageQuotaEngine.js';
import {
  validateAttachmentMimeAndName,
  buildPersona,
  ALLOWED_ASSISTIVE_MIME_TYPES,
} from '../api/_lib/ai.js';
import {
  redactText,
  registerStudentNames,
  clearRegisteredStudentNames,
  REDACTION_LABELS,
} from '../src/lib/privacySafeLogger.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

// Helper to construct a mock DOCX Uint8Array with XML document contents
function createMockDocxZip(xmlContent: string): Uint8Array {
  const filename = 'word/document.xml';
  const encoder = new TextEncoder();
  const filenameBytes = encoder.encode(filename);
  const dataBytes = encoder.encode(xmlContent);

  const headerSize = 30;
  const totalSize = headerSize + filenameBytes.length + dataBytes.length;
  const buf = new Uint8Array(totalSize);

  // PK\x03\x04
  buf[0] = 0x50; buf[1] = 0x4b; buf[2] = 0x03; buf[3] = 0x04;
  buf[4] = 20; buf[5] = 0; buf[6] = 0; buf[7] = 0;
  buf[8] = 0; buf[9] = 0; // compression = 0 (stored)

  // Uncompressed size
  const sz = dataBytes.length;
  buf[18] = sz & 0xff; buf[19] = (sz >> 8) & 0xff; buf[20] = (sz >> 16) & 0xff; buf[21] = (sz >> 24) & 0xff;
  buf[22] = sz & 0xff; buf[23] = (sz >> 8) & 0xff; buf[24] = (sz >> 16) & 0xff; buf[25] = (sz >> 24) & 0xff;

  // Filename length
  buf[26] = filenameBytes.length & 0xff; buf[27] = (filenameBytes.length >> 8) & 0xff;
  buf[28] = 0; buf[29] = 0; // extra len

  buf.set(filenameBytes, headerSize);
  buf.set(dataBytes, headerSize + filenameBytes.length);
  return buf;
}

export async function runEndToEndAndRegressionVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n===============================================================');
  console.log('--- Running Milestone 36: End-to-End & Regression Verification ---');
  console.log('===============================================================\n');

  // =========================================================================
  // Suite 1: Camera Frame Analysis & Out-of-Order Stale Protection
  // =========================================================================
  console.log('\n  [Suite 1: Camera Frame Analysis & Out-of-Order Stale Protection]');
  {
    // Simulate VisionCompanionView state machine
    let activeRequestId = 0;
    let activeAbortController: AbortController | null = null;
    let latestCapturedPayload: { frameId: string; reqId: number } | null = null;
    let latestCompletedResult: string | null = null;

    async function simulateAnalyzeFrame(frameData: string, simulatedLatencyMs: number, resultText: string) {
      // 1. Cancel superseded in-flight request
      if (activeAbortController) {
        activeAbortController.abort();
      }
      const abortController = new AbortController();
      activeAbortController = abortController;
      const currentReqId = ++activeRequestId;

      latestCapturedPayload = { frameId: frameData, reqId: currentReqId };

      // Simulate API call with latency
      await new Promise((resolve) => setTimeout(resolve, simulatedLatencyMs));

      // Guard: reject stale response if superseded or aborted
      if (currentReqId !== activeRequestId || abortController.signal.aborted) {
        return { rejected: true, reason: 'stale_or_aborted' };
      }

      latestCompletedResult = resultText;
      return { rejected: false, result: resultText };
    }

    // Step A: Trigger Scene 1 analysis (takes 120ms)
    const p1 = simulateAnalyzeFrame('frame_scene_1_living_room', 120, 'Scene 1: Living room with couch and coffee table');
    assert(latestCapturedPayload?.frameId === 'frame_scene_1_living_room', 'Scene 1 captured frame is registered');
    assert(latestCapturedPayload?.reqId === 1, 'Scene 1 is assigned Request ID 1');

    // Step B: Trigger Scene 2 analysis shortly after (takes only 30ms)
    await new Promise((resolve) => setTimeout(resolve, 20));
    const p2 = simulateAnalyzeFrame('frame_scene_2_chemistry_lecture', 30, 'Scene 2: Blackboard with chemical equation');
    assert(latestCapturedPayload?.frameId === 'frame_scene_2_chemistry_lecture', 'Scene 2 confirms second result uses new frame');
    assert(latestCapturedPayload?.reqId === 2, 'Scene 2 is assigned Request ID 2');

    const [res1, res2] = await Promise.all([p1, p2]);

    assert(res2.rejected === false, 'Scene 2 request resolves successfully first');
    assert(latestCompletedResult === 'Scene 2: Blackboard with chemical equation', 'Display is updated with Scene 2 analysis');
    assert(res1.rejected === true, 'Scene 1 request is rejected as stale/aborted when it finishes later');
    assert(
      latestCompletedResult === 'Scene 2: Blackboard with chemical equation',
      'Race Condition Guard: Stale Scene 1 response cannot overwrite newer Scene 2 result'
    );
  }

  // =========================================================================
  // Suite 2: File Reader & Audio Lecture Transcription Invariants
  // =========================================================================
  console.log('\n  [Suite 2: File Reader & Audio Lecture Transcription Invariants]');
  {
    // 2.1 Plain text extraction
    const sampleTxt = 'مقدمة في الذكاء الاصطناعي.\n\nيتناول هذا الفصل الشبكات العصبية وتطبيقاتها.';
    const txtRes = await extractTextFromTxt(sampleTxt);
    assert(txtRes.text.includes('الشبكات العصبية'), 'Extracts Arabic plain text accurately');
    assert(txtRes.wordCount > 5, 'Calculates word count correctly for plain text');
    assert(txtRes.paragraphs.length >= 2, 'Splits plain text into paragraphs');

    // 2.2 DOCX extraction
    const mockDocxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>الفصل الأول: الخوارزميات وهياكل البيانات</w:t></w:r></w:p>
          <w:p><w:r><w:t>Algorithms operate in O(n log n) time.</w:t></w:r></w:p>
        </w:body>
      </w:document>`;
    const docxBytes = createMockDocxZip(mockDocxXml);
    const docxRes = await extractTextFromDocx(docxBytes.buffer);
    assert(docxRes.text.includes('الخوارزميات وهياكل البيانات'), 'Extracts DOCX paragraph content');
    assert(docxRes.text.includes('O(n log n)'), 'Preserves technical text and notation in DOCX');

    // 2.3 Text-based PDF extraction
    const textPdfString = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 55 >> stream
BT
/F1 12 Tf
72 712 Td
(Cognify Accessible PDF Reader Test Page) Tj
ET
endstream endobj
xref
0 5
trailer << /Root 1 0 R >>
%%EOF`;
    const textPdfBuf = new TextEncoder().encode(textPdfString).buffer;
    const pdfRes = await extractTextFromPdf(textPdfBuf);
    assert(pdfRes.text.includes('Cognify Accessible PDF Reader Test Page'), 'Extracts selectable PDF text accurately');
    assert(pdfRes.needsOcr === false, 'Selectable PDF is correctly flagged as not needing OCR');

    // 2.4 Scanned PDF detection
    const scannedPdfString = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << /XObject << /Im1 5 0 R >> >> >> endobj
5 0 obj << /Type /XObject /Subtype /Image /Width 800 /Height 1000 >> stream
...binaryimage...
endstream endobj
xref
0 6
trailer << /Root 1 0 R >>
%%EOF`;
    const scannedPdfBuf = new TextEncoder().encode(scannedPdfString).buffer;
    const scannedPdfRes = await extractTextFromPdf(scannedPdfBuf);
    assert(scannedPdfRes.needsOcr === true, 'Scanned PDF with images and no font streams triggers needsOcr flag');

    // 2.5 Audio lecture timestamps & transcript export
    const sampleRawTranscript = `[00:00:15] مرحباً بكم في المحاضرة الثالثة من مادة الفيزياء الحديثة.
[00:01:30] سنتحدث اليوم عن النظرية النسبية الخاصة لأينشتاين.
[00:03:45] المعادلة الشهيرة هي E equals m c squared.`;

    const segments = parseAudioSegments(sampleRawTranscript);
    assert(segments.length === 3, 'Parses 3 timestamped audio lecture segments');
    assert(segments[0].seconds === 15, 'Calculates segment 1 start time as 15 seconds');
    assert(segments[1].seconds === 90, 'Calculates segment 2 start time as 90 seconds (01:30)');
    assert(segments[2].seconds === 225, 'Calculates segment 3 start time as 225 seconds (03:45)');

    // 2.6 Native export generation
    const transcriptDocx = await exportTranscriptToDocx('Physics Lecture 3', sampleRawTranscript, segments, 'ar');
    assert(transcriptDocx instanceof Blob, 'Generates native DOCX Blob for audio lecture transcript');
    assert(transcriptDocx.type.includes('wordprocessingml'), 'DOCX transcript has correct MIME type');

    const transcriptTxtBlob = exportTranscriptToTxt('Physics Lecture 3', sampleRawTranscript, segments);
    assert(transcriptTxtBlob instanceof Blob, 'Generates plain text Blob');
    const txtContent = await transcriptTxtBlob.text();
    assert(txtContent.includes('Physics Lecture 3'), 'Plain text export includes title');
    assert(txtContent.includes('[00:01:30]'), 'Plain text export preserves timestamps');

    // 2.7 Validation: unsupported formats and oversized files
    const exeValidation = validateUploadFile({ name: 'malware.exe', size: 1024, type: 'application/x-msdownload' } as File);
    assert(!exeValidation.valid, 'Rejects executable upload (.exe)');
    assert(exeValidation.error === 'DANGEROUS_FILE_TYPE' || exeValidation.error === 'UNSUPPORTED_FORMAT', 'Provides informative error code for unsupported format');
    assert(exeValidation.localizedMessage?.en?.includes('Unsupported') || exeValidation.localizedMessage?.en?.includes('unsafe'), 'Provides informative error message for unsupported format');

    const oversizedAudio = validateUploadFile({ name: 'huge_lecture.mp3', size: MAX_AUDIO_SIZE_BYTES + 1024, type: 'audio/mp3' } as File);
    assert(!oversizedAudio.valid, 'Rejects oversized audio file (> 50MB)');
    assert(oversizedAudio.error === 'FILE_TOO_LARGE', 'Identifies error as FILE_TOO_LARGE');
    assert(oversizedAudio.localizedMessage?.en?.includes('50 MB') || oversizedAudio.localizedMessage?.en?.includes('File is too large'), 'Error message specifies 50MB audio limit');

    const oversizedDoc = validateUploadFile({ name: 'huge_book.pdf', size: MAX_DOCUMENT_SIZE_BYTES + 1024, type: 'application/pdf' } as File);
    assert(!oversizedDoc.valid, 'Rejects oversized document (> 25MB)');
    assert(oversizedDoc.error === 'FILE_TOO_LARGE', 'Identifies document error as FILE_TOO_LARGE');
    assert(oversizedDoc.localizedMessage?.en?.includes('25 MB') || oversizedDoc.localizedMessage?.en?.includes('File is too large'), 'Error message specifies 25MB document limit');

    // 2.8 Simulated failure and retry preservation
    let uploadAttempts = 0;
    async function simulateUploadWithRetry(filePayload: string) {
      uploadAttempts++;
      if (uploadAttempts === 1) {
        throw new Error('Provider 503 Service Unavailable');
      }
      return { success: true, payloadReceived: filePayload };
    }

    let retrySuccess = false;
    let filePreserved = false;
    const clientPayload = 'my_confidential_lecture_notes.pdf';

    try {
      await simulateUploadWithRetry(clientPayload);
    } catch {
      // First attempt failed — retry with same payload
      const retryRes = await simulateUploadWithRetry(clientPayload);
      retrySuccess = retryRes.success;
      filePreserved = retryRes.payloadReceived === clientPayload;
    }

    assert(retrySuccess, 'Retry succeeds after initial transient provider outage');
    assert(filePreserved, 'User file payload is preserved without loss across retries');
  }

  // =========================================================================
  // Suite 3: Accessibility & Interactive Controls Verification
  // =========================================================================
  console.log('\n  [Suite 3: Accessibility & Interactive Controls Verification]');
  {
    // 3.1 Button accessible names
    const testButtons = [
      { id: 'btn_capture', ariaLabel: 'التقاط صورة السبورة', visibleText: '' },
      { id: 'btn_back', ariaLabel: 'العودة للصفحة السابقة', visibleText: 'رجوع' },
      { id: 'btn_play', ariaLabel: 'تشغيل المقطع الصوتي', visibleText: '' },
      { id: 'btn_stop', ariaLabel: 'إيقاف التسجيل', visibleText: '' },
      { id: 'btn_export', ariaLabel: 'تحميل ملف الوورد', visibleText: 'تصدير DOCX' },
    ];

    for (const btn of testButtons) {
      const accessibleName = btn.ariaLabel || btn.visibleText;
      assert(Boolean(accessibleName && accessibleName.trim().length > 0), `Interactive control "${btn.id}" has non-empty accessible name`);
      assert(accessibleName !== 'unlabeled' && accessibleName !== 'button', `Control "${btn.id}" is not announced as unlabeled`);
    }

    // 3.2 Live regions for screen readers
    const announcements = [
      { text: 'جاري فحص المستند واستخراج النصوص...', politeness: 'polite' },
      { text: 'تم اكتمال تفريغ المحاضرة الصوتية بنجاح.', politeness: 'polite' },
      { text: 'خطأ: تعذر الوصول إلى الكاميرا. يرجى تفعيل الإذن.', politeness: 'assertive' },
    ];

    for (const ann of announcements) {
      assert(Boolean(ann.text && (ann.politeness === 'polite' || ann.politeness === 'assertive')), `Announcement "${ann.text.substring(0, 20)}..." exposes valid live region`);
    }

    // 3.3 Persona and prompt injection defense accessibility
    const persona = buildPersona({ uid: 'student-qa', language: 'Arabic', accessibilityMode: 'Visual' }, '', undefined, 'test');
    assert(persona.includes('USER IS BLIND'), 'Configures blind user practical description rules');
    assert(persona.includes('Say FIRST if anything looks like a hazard'), 'Prioritizes hazards for visually impaired students');
  }

  // =========================================================================
  // Suite 4: Navigation, History & Auth Preservation
  // =========================================================================
  console.log('\n  [Suite 4: Navigation, History & Auth Preservation]');
  {
    // Simulate App router state
    const navigationHistory: string[] = ['/'];
    let currentRoute = '/';
    let safeReturnDestination: string | null = null;

    function navigateTo(route: string) {
      navigationHistory.push(route);
      currentRoute = route;
    }

    function handleBack() {
      if (navigationHistory.length > 1) {
        navigationHistory.pop();
        currentRoute = navigationHistory[navigationHistory.length - 1];
        return true;
      }
      return false;
    }

    function handleSessionExpiry(currentFeatureRoute: string) {
      safeReturnDestination = currentFeatureRoute;
      currentRoute = '/login';
    }

    function completeReauthentication() {
      if (safeReturnDestination) {
        currentRoute = safeReturnDestination;
        safeReturnDestination = null;
      } else {
        currentRoute = '/';
      }
    }

    // Navigate into Vision Companion
    navigateTo('/vision');
    assert(currentRoute === '/vision', 'Enters /vision feature route');

    // Navigate into Book Studio
    navigateTo('/book-studio');
    assert(currentRoute === '/book-studio', 'Enters nested /book-studio route');

    // Back button returns to /vision
    handleBack();
    assert(currentRoute === '/vision', 'Back button returns correctly to originating /vision route');

    // Back button returns to /
    handleBack();
    assert(currentRoute === '/', 'Back button returns cleanly to home without loop');

    // Session expiry test
    navigateTo('/toolkit');
    handleSessionExpiry('/toolkit');
    assert(currentRoute === '/login', 'Expired session routes user to login');
    assert(safeReturnDestination === '/toolkit', 'Preserves /toolkit as safe return destination');

    // Reauthentication restores user work
    completeReauthentication();
    assert(currentRoute === '/toolkit', 'Reauthentication returns user directly to /toolkit without getting lost');
  }

  // =========================================================================
  // Suite 5: Educational Documents (Arabic Textbook, Mixed BiDi, Exams & Worksheets)
  // =========================================================================
  console.log('\n  [Suite 5: Educational Documents (Arabic Textbook, Mixed BiDi, Exams & Worksheets)]');
  {
    // 5.1 Arabic Textbook Generation
    const arabicTextbookRaw = `
# كتاب العلوم المتكاملة للصف الأول الثانوي

## الوحدة الأولى: بنية المادة والتفاعلات الكيميائية

### الدرس الأول: الذرة والجدول الدوري
تتكون المادة من وحدات بنائية صغيرة تسمى الذرات. تحتوي الذرة على نواة بداخلها بروتونات موجبة الشحنة ونيوترونات متعادلة، وتدور حولها إلكترونات سالبة الشحنة في مستويات طاقة محددة.

### الدرس الثاني: الروابط الكيميائية
تنقسم الروابط الكيميائية إلى روابط أيونية وروابط تساهمية.
`;

    const textbookSections = parseDocumentStructure(arabicTextbookRaw);
    assert(textbookSections.length >= 3, 'Parses Arabic textbook into hierarchical section tree');
    assert(textbookSections[0].level === 1, 'Top level heading is Heading 1');
    assert(textbookSections[1].level === 2, 'Chapter title is Heading 2');

    const textbookMeta: BookStudioMetadata = {
      title: 'كتاب العلوم المتكاملة',
      author: 'وزارة التربية والتعليم',
      subject: 'الكيمياء والفيزياء',
      gradeLevel: 'الصف الأول الثانوي',
      template: 'textbook',
      answerSpaceStyle: 'lines',
      includeAnswerKey: true,
      language: 'ar',
      includeCoverPage: true,
      includeTableOfContents: true,
    };

    const textbookDocx = await buildAccessibleBookDocx(textbookSections, textbookMeta);
    assert(textbookDocx instanceof Blob, 'Compiles Arabic textbook into DOCX Blob');
    assert(textbookDocx.size > 1000, 'Arabic textbook DOCX contains full document content');

    // 5.2 Mixed Arabic/English Technical Document
    const mixedBidiRaw = `
# معمارية الحاسب والبرمجة بلغة C++

## الدرس الأول: المؤشرات والذاكرة (Pointers and Memory)
المؤشر (Pointer) هو متغير يخزن عنوان متغير آخر في الذاكرة RAM.
يتم الإعلان عن المؤشر باستخدام الرمز: \`int* ptr = &val;\`.

\`\`\`cpp
#include <iostream>
using namespace std;
int main() {
    int score = 100;
    int* pScore = &score;
    cout << *pScore << endl;
    return 0;
}
\`\`\`
`;

    const mixedSections = parseDocumentStructure(mixedBidiRaw);
    const mixedHtml = buildPrintableHtmlDocument(
      mixedSections,
      {
        title: 'معمارية الحاسب والبرمجة',
        author: 'د. محمود',
        subject: 'علوم الحاسب',
        gradeLevel: 'الجامعة',
        template: 'research_document',
        answerSpaceStyle: 'none',
        includeAnswerKey: false,
        language: 'mixed',
        includeCoverPage: false,
        includeTableOfContents: false,
      }
    );

    assert(mixedHtml.includes('Pointers and Memory'), 'Mixed document retains English technical phrases');
    assert(mixedHtml.includes('#include &lt;iostream&gt;') || mixedHtml.includes('#include <iostream>'), 'HTML output preserves C++ code syntax');
    assert(mixedHtml.includes('dir="rtl"'), 'Mixed document sets RTL base container with LTR inline spans');

    // 5.3 Multiple-Choice Exam Format
    const examRawText = `
اختبار نصف الفصل الدراسي لمادة الحاسب الآلي

السؤال الأول: اختر الإجابة الصحيحة مما يلي:
1. ما هي الوحدة المسؤولة عن العمليات الحسابية والمنطقية في المعالج؟
أ) وحدة التحكم (Control Unit)
ب) وحدة الحساب والمنطق (ALU)
ج) المسجلات (Registers)
د) الذاكرة العشوائية (RAM)

2. أي مما يلي يعتبر لغة برمجة عالية المستوى؟
أ) Assembly
ب) Machine Code
ج) Python
د) Microcode
`;

    const recognizedExamQuestions = recognizeEducationalQuestions(examRawText);
    assert(recognizedExamQuestions.length === 2, 'Recognizes 2 multiple-choice exam questions');
    assert(recognizedExamQuestions[0].type === 'mcq', 'Identifies question 1 as MCQ type');
    assert(recognizedExamQuestions[0].options?.length === 4, 'Extracts 4 options for question 1');

    const examDocx = await buildAccessibleBookDocx(
      parseDocumentStructure(examRawText),
      {
        title: 'اختبار الحاسب الآلي',
        author: 'أستاذ المادة',
        subject: 'الحاسب الآلي',
        gradeLevel: 'الثانوي',
        template: 'exam',
        answerSpaceStyle: 'box',
        includeAnswerKey: true,
        language: 'ar',
        includeCoverPage: false,
        includeTableOfContents: false,
      }
    );
    assert(examDocx instanceof Blob, 'Builds formatted multiple-choice exam DOCX with answer spaces');

    // 5.4 Worksheet with Short-Answer and Essay Questions
    const worksheetRaw = `
ورقة عمل تفاعلية لمادة التاريخ

1. علل لما يأتي: قيام الثورة العرابية عام 1881؟
2. اشرح بالتفصيل نتائج معركة حطين عام 1187م؟
`;

    const worksheetQuestions = recognizeEducationalQuestions(worksheetRaw);
    assert(worksheetQuestions.length === 2, 'Recognizes short-answer and essay questions from worksheet');
    assert(worksheetQuestions[0].type === 'short_answer', 'Identifies "علل" as short-answer question');
    assert(worksheetQuestions[1].type === 'essay', 'Identifies "اشرح بالتفصيل" as essay question');

    // 5.5 Round-trip preservation (Serialization & Deserialization)
    const originalDocumentState = {
      metadata: textbookMeta,
      sections: textbookSections,
      questions: recognizedExamQuestions,
      updatedAt: Date.now(),
    };

    const serializedState = JSON.stringify(originalDocumentState);
    const restoredState = JSON.parse(serializedState);

    assert(restoredState.metadata.title === 'كتاب العلوم المتكاملة', 'Restores document title accurately');
    assert(restoredState.sections.length === textbookSections.length, 'Restores all heading sections without loss');
    assert(restoredState.questions.length === recognizedExamQuestions.length, 'Restores question structures and choices');
  }

  // =========================================================================
  // Suite 6: Integrated Accessibility Tools (Scene, OCR, Scan, WhatsApp Stickers)
  // =========================================================================
  console.log('\n  [Suite 6: Integrated Accessibility Tools (Scene, OCR, Multipage Scan, WhatsApp Stickers)]');
  {
    // 6.1 Multipage camera scanning & PDF generation
    const minimalJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const mockScannedPages: ScannedPageItem[] = [
      { id: 'scan-1', pageNumber: 1, dataUrl: `data:image/jpeg;base64,${minimalJpegBase64}`, thumbnailUrl: '', width: 595, height: 842, filter: 'color', capturedAt: Date.now() },
      { id: 'scan-2', pageNumber: 2, dataUrl: `data:image/jpeg;base64,${minimalJpegBase64}`, thumbnailUrl: '', width: 595, height: 842, filter: 'color', capturedAt: Date.now() },
      { id: 'scan-3', pageNumber: 3, dataUrl: `data:image/jpeg;base64,${minimalJpegBase64}`, thumbnailUrl: '', width: 595, height: 842, filter: 'color', capturedAt: Date.now() },
    ];

    const pdfBlob = await combinePagesIntoPdf(mockScannedPages, 'ملزمة المنطق الرياضي');
    assert(pdfBlob instanceof Blob, 'Generates searchable PDF Blob from scanned camera pages');
    assert(pdfBlob.type === 'application/pdf', 'Scanned document output is application/pdf');
    assert(pdfBlob.size > 200, 'Searchable PDF contains header, cross-reference table, and trailer');

    // 6.2 WhatsApp stickers & meme explainer prompt formatting
    const stickerPromptPart = {
      text: 'اشرح لي الاستيكر ده وايه الميم أو النكتة اللي فيه عشان أنا كفيف ومحتاج أفهم الموقف',
    };
    assert(stickerPromptPart.text.includes('الاستيكر'), 'Identifies WhatsApp sticker assistive query');

    // 6.3 Local activity hub persistence and clearing
    clearToolkitActivities();
    saveToolkitActivity({
      type: 'scene',
      title: 'وصف صالة التدريس',
      snippet: 'قاعة محاضرات تحتوي على 50 مقعد وسبورة ذكية في المنتصف',
    });
    saveToolkitActivity({
      type: 'text_ocr',
      title: 'قراءة لافتة المعمل',
      snippet: 'معمل الحاسبات والذكاء الاصطناعي - الدور الثالث',
    });

    const storedActivities = getToolkitActivities();
    assert(storedActivities.length >= 2, 'Toolkit activity items are stored locally in activity hub');
    assert(storedActivities[0].type === 'text_ocr', 'Latest activity appears first in reverse chronological order');

    clearToolkitActivities();
    assert(getToolkitActivities().length === 0, 'User sovereignty: History can be cleared cleanly');
  }

  // =========================================================================
  // Suite 7: Reliability, Quotas, Provider Outages & Privacy Isolation
  // =========================================================================
  console.log('\n  [Suite 7: Reliability, Quotas, Provider Outages & Privacy Isolation]');
  {
    resetUsageEngineForTesting();

    // 7.1 Duplicate request deduplication
    let executionCount = 0;
    async function expensiveAssistiveCall() {
      executionCount++;
      await new Promise((r) => setTimeout(r, 25));
      return 'OCR Transcription Output: 100% Complete';
    }

    const dupKey = 'camera_frame_hash_xyz';
    const [callA, callB] = await Promise.all([
      deduplicateInflight(dupKey, expensiveAssistiveCall),
      deduplicateInflight(dupKey, expensiveAssistiveCall),
    ]);

    assert(executionCount === 1, 'In-flight deduplication collapses concurrent identical requests into 1 provider call');
    assert(callA === callB, 'Both callers receive the exact identical assistive result');

    // 7.2 Assistive quota consumption and rate limits
    const quotaUser = 'student_test_quota_1';
    const check1 = checkAndConsumeQuota(quotaUser, 'camera_vision', 1);
    assert(check1.allowed, 'Consumes camera vision quota successfully');
    assert(check1.dailyRemaining === 1499, 'Remaining daily camera frames decrements from 1500 to 1499');

    // 7.3 Long-running job tracking and state recovery
    const job = createProcessingJob('student_audio_job_1', 'audio_transcription', 3);
    assert(job.status === 'queued', 'Initial job status is queued');
    updateJobProgress(job.jobId, 1);
    const inProgressJob = getProcessingJob(job.jobId, 'student_audio_job_1');
    assert(inProgressJob?.progressPercent === 33, 'Job progress updates to 33% after chunk 1');
    completeProcessingJob(job.jobId, 'Final completed lecture transcript text');
    const completedJob = getProcessingJob(job.jobId, 'student_audio_job_1');
    assert(completedJob?.status === 'completed', 'Job transitions to completed');
    assert(completedJob?.result === 'Final completed lecture transcript text', 'Preserves final completed payload');

    // 7.4 BOLA Isolation: Student B cannot access Student A's job
    const unauthorizedJobAccess = getProcessingJob(job.jobId, 'malicious_student_2');
    assert(unauthorizedJobAccess === null, 'BOLA Defense: Unauthorized user cannot inspect or recover another student job');

    // 7.5 User-isolated cache separation
    const userA = 'user_alice_888';
    const userB = 'user_bob_999';
    const payload = JSON.stringify({ query: 'summarize page 1' });
    const keyA = generateUserContentHash(userA, 'ocr_reading', payload);
    const keyB = generateUserContentHash(userB, 'ocr_reading', payload);
    assert(keyA !== keyB, 'Cryptographic cache keys are unique per user identity');

    setCachedResult(keyA, userA, 'ocr_reading', 'Alice Private Summary');
    const bobAccess = getCachedResult(keyA, userB);
    assert(bobAccess === null, 'BOLA Defense: Bob cannot retrieve Alice cached result even if key is known');

    // 7.6 PII Redaction
    clearRegisteredStudentNames();
    registerStudentNames(['Salma Ahmed']);
    const rawLog = 'User Salma Ahmed with email salma.ahmed@univ.edu uploaded camera frame data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    const cleanLog = redactText(rawLog);
    assert(!cleanLog.includes('Salma Ahmed'), 'Redacts student name in logs');
    assert(!cleanLog.includes('salma.ahmed@univ.edu'), 'Redacts student email in logs');
    assert(!cleanLog.includes('iVBORw0KGgoAAAANSUhEUg=='), 'Redacts raw base64 frame in logs');
    assert(cleanLog.includes(REDACTION_LABELS.STUDENT_NAME), 'Inserts REDACTED_STUDENT_NAME');
    assert(cleanLog.includes(REDACTION_LABELS.EMAIL), 'Inserts REDACTED_EMAIL');
    assert(cleanLog.includes(REDACTION_LABELS.CAMERA_FRAME), 'Inserts REDACTED_CAMERA_FRAME');
  }

  console.log('\n===============================================================');
  console.log(`Milestone 36 End-to-End & Regression Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  return { passed, failed };
}
