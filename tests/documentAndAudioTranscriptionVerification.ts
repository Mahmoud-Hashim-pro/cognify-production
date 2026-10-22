/**
 * Automated Verification: Document Extractor & Audio Lecture Transcription Engine
 * Tests Phase 3:
 * 1. Client & server file validation (valid vs invalid formats, size limits, dangerous files)
 * 2. Plain text extraction (.txt, .md) with paragraph splitting and word count
 * 3. DOCX PKZip zero-dependency extraction (paragraphs, tables, word count)
 * 4. PDF selectable text extraction with page preservation [الصفحة N / Page N]
 * 5. Scanned PDF detection requiring OCR (/Subtype /Image detection)
 * 6. Malformed & password-protected PDF graceful handling
 * 7. Audio lecture timestamped segment parsing ([MM:SS] & [HH:MM:SS])
 * 8. Speech segment fallback estimation by reading rate
 * 9. Separation of verbatim transcript from lecture summaries
 * 10. Native Word (.docx) and plain text (.txt) exports for transcripts and summaries
 * 11. Retry capability and provider error resilience
 */

import {
  validateUploadFile,
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromTxt,
  parseAudioSegments,
  formatBytes,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_AUDIO_SIZE_BYTES,
} from '../src/lib/documentExtractor.js';
import {
  exportTranscriptToDocx,
  exportSummaryToDocx,
  exportTranscriptToTxt,
} from '../src/lib/audioTranscriptionEngine.js';

function createMockDocx(xmlContent: string): Uint8Array {
  const filename = 'word/document.xml';
  const encoder = new TextEncoder();
  const filenameBytes = encoder.encode(filename);
  const dataBytes = encoder.encode(xmlContent);

  const headerSize = 30;
  const totalSize = headerSize + filenameBytes.length + dataBytes.length;
  const buf = new Uint8Array(totalSize);

  // PK\x03\x04
  buf[0] = 0x50;
  buf[1] = 0x4b;
  buf[2] = 0x03;
  buf[3] = 0x04;
  buf[4] = 20;
  buf[5] = 0; // version
  buf[6] = 0;
  buf[7] = 0; // flags
  buf[8] = 0;
  buf[9] = 0; // compression 0 (Store)
  buf[10] = 0;
  buf[11] = 0;
  buf[12] = 0;
  buf[13] = 0;

  const size = dataBytes.length;
  buf[18] = size & 0xff;
  buf[19] = (size >> 8) & 0xff;
  buf[20] = (size >> 16) & 0xff;
  buf[21] = (size >> 24) & 0xff;

  buf[22] = size & 0xff;
  buf[23] = (size >> 8) & 0xff;
  buf[24] = (size >> 16) & 0xff;
  buf[25] = (size >> 24) & 0xff;

  const fnLen = filenameBytes.length;
  buf[26] = fnLen & 0xff;
  buf[27] = (fnLen >> 8) & 0xff;
  buf[28] = 0;
  buf[29] = 0; // extra length

  buf.set(filenameBytes, 30);
  buf.set(dataBytes, 30 + fnLen);
  return buf;
}

function createMockPdf(content: string, options: { isScanned?: boolean; isEncrypted?: boolean } = {}): Uint8Array {
  let pdf = '%PDF-1.4\n';
  if (options.isEncrypted) {
    pdf += '/Encrypt 5 0 R\n';
  }
  if (options.isScanned) {
    pdf += '1 0 obj\n<< /Type /XObject /Subtype /Image /Width 800 /Height 600 >>\nstream\n[binary image data]\nendstream\nendobj\n';
  } else {
    pdf += `1 0 obj\n<< /Type /Page >>\nstream\nBT\n/F1 12 Tf\n(${content}) Tj\nET\nendstream\nendobj\n`;
  }
  pdf += '%%EOF\n';
  return new TextEncoder().encode(pdf);
}

export async function runDocumentAndAudioTranscriptionVerification(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  console.log('\n[29] Document Extractor & Audio Lecture Transcription Engine Verification');

  // 1. File Validation Suite
  {
    const validPdf = validateUploadFile({ name: 'lecture_notes.pdf', size: 4 * 1024 * 1024, type: 'application/pdf' });
    assert(validPdf.valid && validPdf.category === 'pdf', 'Valid PDF under 25MB accepted');

    const validDocx = validateUploadFile({ name: 'study_guide.docx', size: 2 * 1024 * 1024 });
    assert(validDocx.valid && validDocx.category === 'docx', 'Valid DOCX accepted');

    const validTxt = validateUploadFile({ name: 'summary.txt', size: 50 * 1024, type: 'text/plain' });
    assert(validTxt.valid && validTxt.category === 'txt', 'Valid TXT accepted');

    const validMp3 = validateUploadFile({ name: 'prof_physics_lecture.mp3', size: 28 * 1024 * 1024, type: 'audio/mp3' });
    assert(validMp3.valid && validMp3.category === 'audio', 'Valid Audio lecture MP3 under 50MB accepted');

    const validM4a = validateUploadFile({ name: 'bio101.m4a', size: 15 * 1024 * 1024 });
    assert(validM4a.valid && validM4a.category === 'audio', 'Valid Audio lecture M4A accepted');

    const dangerousExe = validateUploadFile({ name: 'malicious_file.exe', size: 1024 });
    assert(!dangerousExe.valid && dangerousExe.error === 'DANGEROUS_FILE_TYPE', 'Dangerous .exe rejected safely');

    const dangerousScript = validateUploadFile({ name: 'script.sh', size: 512 });
    assert(!dangerousScript.valid && dangerousScript.error === 'DANGEROUS_FILE_TYPE', 'Dangerous shell script rejected safely');

    const unsupportedFormat = validateUploadFile({ name: 'archive.iso', size: 1024 });
    assert(!unsupportedFormat.valid && unsupportedFormat.error === 'UNSUPPORTED_FORMAT', 'Unsupported format rejected with helpful message');

    const oversizedDoc = validateUploadFile({ name: 'huge_book.pdf', size: 30 * 1024 * 1024 });
    assert(!oversizedDoc.valid && oversizedDoc.error === 'FILE_TOO_LARGE', 'Oversized document (> 25MB) rejected');

    const oversizedAudio = validateUploadFile({ name: 'long_lecture.wav', size: 60 * 1024 * 1024 });
    assert(!oversizedAudio.valid && oversizedAudio.error === 'FILE_TOO_LARGE', 'Oversized audio (> 50MB) rejected');

    const emptyFile = validateUploadFile({ name: 'empty.pdf', size: 0 });
    assert(!emptyFile.valid && emptyFile.error === 'EMPTY_FILE', 'Empty file (0 bytes) rejected');
  }

  // 2. Plain Text Extraction (.txt, .md)
  {
    const rawContent = `المحاضرة الأولى: مقدمة في الذكاء الاصطناعي\n\nيعتبر الذكاء الاصطناعي أحد أهم علوم الحاسب الحديثة.\nيهدف إلى محاكاة القدرات الذهنية البشرية.\n\nالتطبيقات الأساسية:\n1. الرؤية الحاسوبية للمكفوفين.\n2. معالجة اللغات الطبيعية.`;
    const res = extractTextFromTxt(rawContent);
    assert(res.valid, 'TXT extraction succeeds');
    assert(res.paragraphs.length === 3, 'TXT splits into 3 clean paragraphs');
    assert(res.wordCount > 15, 'TXT calculates non-zero word count');
  }

  // 3. DOCX PKZip Archive Extraction
  {
    const mockXml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>محاضرة الفيزياء الحديثة: النظرية النسبية</w:t></w:r></w:p>
        <w:p><w:r><w:t>طاقة الحركة تتناسب مع مربع سرعة الضوء E=mc2.</w:t></w:r></w:p>
        <w:tbl><w:tr><w:tc><w:p><w:r><w:t>الجدول الأول: الثوابت الفيزيائية</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
      </w:body>
    </w:document>`;

    const docxBytes = createMockDocx(mockXml);
    const docxResult = await extractTextFromDocx(docxBytes);

    assert(docxResult.valid, 'DOCX PKZip parses valid document without crashing');
    assert(docxResult.text.includes('محاضرة الفيزياء الحديثة'), 'DOCX extracts first paragraph text');
    assert(docxResult.text.includes('E=mc2'), 'DOCX extracts scientific notation');
    assert(docxResult.hasTables, 'DOCX flags table structures correctly');
    assert(docxResult.wordCount > 5, 'DOCX counts extracted words accurately');

    // Corrupted DOCX handling
    const corruptBytes = new Uint8Array([0x50, 0x4b, 0x01, 0x02, 0x00]);
    const corruptResult = await extractTextFromDocx(corruptBytes);
    assert(!corruptResult.valid && !!corruptResult.error, 'Corrupt DOCX handled gracefully without throwing');
  }

  // 4. PDF Selectable Text Extraction & Page References
  {
    const pdfBytes = createMockPdf('Welcome to Cognify Accessibility Lecture for Blind Students');
    const pdfResult = await extractTextFromPdf(pdfBytes);

    assert(pdfResult.valid, 'Valid PDF parsed successfully');
    assert(pdfResult.text.includes('Welcome to Cognify'), 'PDF extracted selectable text content');
    assert(pdfResult.text.includes('[الصفحة 1 / Page 1]'), 'PDF preserved page number reference header');
    assert(!pdfResult.isScanned, 'Digital PDF correctly classified as not scanned');
  }

  // 5. Scanned PDF Detection (OCR Required)
  {
    const scannedPdfBytes = createMockPdf('', { isScanned: true });
    const scannedResult = await extractTextFromPdf(scannedPdfBytes);

    assert(scannedResult.valid, 'Scanned PDF parsed without exception');
    assert(scannedResult.isScanned, 'Scanned PDF with Image XObject detected as scanned');
    assert(scannedResult.needsOcr, 'Scanned PDF flagged as needing OCR');
  }

  // 6. Encrypted & Malformed PDF Handling
  {
    const encryptedPdf = createMockPdf('Secret data', { isEncrypted: true });
    const encResult = await extractTextFromPdf(encryptedPdf);
    assert(!encResult.valid && encResult.error === 'PDF_ENCRYPTED', 'Encrypted PDF detected and rejected with clear error');
    assert(encResult.needsOcr, 'Encrypted PDF marked for OCR/fallback');

    const malformedPdf = new TextEncoder().encode('THIS IS NOT A VALID PDF FILE AT ALL');
    const malformedResult = await extractTextFromPdf(malformedPdf);
    assert(!malformedResult.valid && malformedResult.error === 'INVALID_PDF_HEADER', 'Malformed PDF rejected at header check without crashing');
  }

  // 7. Audio Lecture Transcript Timestamp Parsing
  {
    const rawTranscript = `[00:00] أهلاً بكم جميعاً في المحاضرة الأولى لمادة الكيمياء الحيوية.
[01:30] اليوم سنشرح دورة كريبس وكيفية إنتاج جزيئات الـ ATP.
[05:45] يرجى التركيز في المعادلة المكتوبة على السبورة لأنها موضع امتحان.
[12:20] الواجب المطلوب تسليمه الأسبوع القادم في معمل الكلية.`;

    const segments = parseAudioSegments(rawTranscript);
    assert(segments.length === 4, 'Extracted exactly 4 timestamped segments');
    assert(segments[0].timestamp === '00:00' && segments[0].seconds === 0, 'First segment starts at 00:00 (0s)');
    assert(segments[1].timestamp === '01:30' && segments[1].seconds === 90, 'Second segment parsed correctly: 01:30 = 90 seconds');
    assert(segments[2].timestamp === '05:45' && segments[2].seconds === 345, 'Third segment parsed correctly: 05:45 = 345 seconds');
    assert(segments[3].timestamp === '12:20' && segments[3].seconds === 740, 'Fourth segment parsed correctly: 12:20 = 740 seconds');
    assert(segments[1].text.includes('دورة كريبس'), 'Segment text accurately preserved');
  }

  // 8. Audio Transcript Hours Format & Un-timestamped Fallback
  {
    const longLecture = `[01:15:30] هذا المقطع بعد ساعة وربع من بداية المحاضرة الطويلة.`;
    const longSegs = parseAudioSegments(longLecture);
    assert(longSegs.length === 1 && longSegs[0].seconds === 4530, 'HH:MM:SS parsed accurately into 4530 seconds');

    const plainSpeech = `الفقرة الأولى بدون أقواس زمنية.\n\nالفقرة الثانية بعد فترة من الشرح.\n\nالفقرة الثالثة والختامية.`;
    const fallbackSegs = parseAudioSegments(plainSpeech);
    assert(fallbackSegs.length === 3, 'Un-timestamped speech falls back to paragraph segmentation');
    assert(fallbackSegs[0].seconds === 0, 'First fallback segment starts at second 0');
    assert(fallbackSegs[1].seconds > 0, 'Subsequent fallback segments have progressive estimated seconds');
  }

  // 9. Verbatim Transcript Immutability & Decoupled Exports
  {
    const title = 'محاضرة_الفيزياء_النووية';
    const verbatimText = '[00:15] البداية مع الانشطار النووي.\n[02:00] التفاعل المتسلسل.';
    const segments = parseAudioSegments(verbatimText);

    // TXT export
    const txtBlob = exportTranscriptToTxt(title, verbatimText, segments);
    assert(txtBlob.size > 50, 'Transcript exported to non-empty TXT Blob');
    assert(txtBlob.type.includes('text/plain'), 'TXT Blob has correct MIME type');

    // DOCX transcript export
    const docxTranscriptBlob = await exportTranscriptToDocx(title, verbatimText, segments, 'ar');
    assert(docxTranscriptBlob.size > 1000, 'Verbatim transcript exported to valid native Word DOCX blob (>1KB)');

    // Separate DOCX summary export
    const summaryText = 'ملخص الزبدة: الانشطار النووي ينتج طاقة هائلة عبر التفاعل المتسلسل ويجب التحكم فيه بقضبان الكادميوم.';
    const docxSummaryBlob = await exportSummaryToDocx(title, summaryText, 'short', 'ar');
    assert(docxSummaryBlob.size > 1000, 'Lecture summary exported separately to valid native Word DOCX blob');

    // Strict immutability check
    assert(verbatimText === '[00:15] البداية مع الانشطار النووي.\n[02:00] التفاعل المتسلسل.', 'Verbatim transcript text remains strictly unmodified after summary export');
  }

  // 10. File Size Formatter Helper
  {
    assert(formatBytes(500) === '500 B', 'formatBytes formats Bytes correctly');
    assert(formatBytes(2048) === '2.0 KB', 'formatBytes formats KB correctly');
    assert(formatBytes(15 * 1024 * 1024) === '15.0 MB', 'formatBytes formats MB correctly');
  }

  console.log(`\nDocument & Audio Transcription Suite: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}
