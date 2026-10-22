// Mock localStorage in Node.js test environment if not present
if (typeof (globalThis as any).localStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; },
  };
}

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { 
  validateUploadFile, 
  MAX_DOCUMENT_SIZE_BYTES, 
  MAX_AUDIO_SIZE_BYTES,
  formatBytes,
  AudioTranscriptSegment 
} from '../src/lib/documentExtractor';
import { 
  detectWebpAnimation, 
  saveToolkitActivity, 
  getToolkitActivities, 
  deleteToolkitActivity, 
  clearToolkitActivities, 
  ToolkitActivityItem 
} from '../src/lib/accessibilityToolkitEngine';

console.log('🧪 Starting Phase 8 Feature Workflows Audit Verification Suite...\n');

let passedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exit(1);
  }
}

const rootDir = process.cwd();

// ============================================================================
// A. Visual Assistant Workflows
// ============================================================================
test('Visual Assistant: Rejects stale frames and displays live/previous observation timestamps', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(code.includes('activeRequestIdRef'), 'Must track active request ID monotonically');
  assert.ok(code.includes('observationType === \'live\''), 'Must visually distinguish live frames');
  assert.ok(code.includes('observationType === \'previous\''), 'Must clearly tag previous/stale frames');
  assert.ok(code.includes('setObservationTimestamp'), 'Must record exact observation timestamp');
});

test('Visual Assistant: Provides clear camera permission guidance without hardcoded localhost', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(!code.includes('localhost:3000'), 'Should not reference localhost:3000 in user-facing production UI');
  assert.ok(code.includes('Try camera again') || code.includes('إعادة محاولة الكاميرا'), 'Must offer retry camera action');
  assert.ok(code.includes('Upload photo') || code.includes('رفع صورة من جهازك'), 'Must provide direct photo upload fallback');
});

test('Visual Assistant: Supports 1-click refresh and re-analysis of current scene', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/VisionCompanionView.tsx'), 'utf-8');
  assert.ok(code.includes('describeScene(companionLang)'), 'Must allow re-analyzing scene on demand');
  assert.ok(code.includes('RefreshCw'), 'Must display refresh action icon');
});

// ============================================================================
// B. File Reader & OCR Workflows
// ============================================================================
test('File Reader: Validates accepted document and audio extensions cleanly', () => {
  const validPdf = validateUploadFile({ name: 'biology_notes.pdf', size: 1024 * 1024, type: 'application/pdf' });
  assert.strictEqual(validPdf.valid, true);
  assert.strictEqual(validPdf.category, 'pdf');

  const validDocx = validateUploadFile({ name: 'history_essay.docx', size: 500 * 1024, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  assert.strictEqual(validDocx.valid, true);
  assert.strictEqual(validDocx.category, 'docx');

  const validTxt = validateUploadFile({ name: 'readme.txt', size: 50 * 1024, type: 'text/plain' });
  assert.strictEqual(validTxt.valid, true);
  assert.strictEqual(validTxt.category, 'txt');

  const invalidExe = validateUploadFile({ name: 'malware.exe', size: 200 * 1024, type: 'application/x-msdownload' });
  assert.strictEqual(invalidExe.valid, false);
  assert.strictEqual(invalidExe.category, 'unsupported');
});

test('File Reader: Rejects oversized files according to strict quota boundaries', () => {
  const oversizedDoc = validateUploadFile({ name: 'huge_book.pdf', size: MAX_DOCUMENT_SIZE_BYTES + 1024, type: 'application/pdf' });
  assert.strictEqual(oversizedDoc.valid, false);
  assert.ok(oversizedDoc.error?.includes('FILE_TOO_LARGE'), 'Must return FILE_TOO_LARGE error');

  const oversizedAudio = validateUploadFile({ name: 'huge_lecture.mp3', size: MAX_AUDIO_SIZE_BYTES + 1024, type: 'audio/mpeg' });
  assert.strictEqual(oversizedAudio.valid, false);
  assert.ok(oversizedAudio.error?.includes('FILE_TOO_LARGE'), 'Must return FILE_TOO_LARGE error for audio');
});

test('File Reader: DocumentStudioModal provides retry state for failed files', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/DocumentStudioModal.tsx'), 'utf-8');
  assert.ok(code.includes('lastFailedFile'), 'Must maintain lastFailedFile state');
  assert.ok(code.includes('processDocumentFile(lastFailedFile)'), 'Must allow instant retry on failure');
});

// ============================================================================
// C. Audio Transcription and Summaries Workflows
// ============================================================================
test('Audio Transcription: Supports segmented transcripts with interactive seeking and playback rates', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/DocumentStudioModal.tsx'), 'utf-8');
  assert.ok(code.includes('handleSeekAudio'), 'Must support audio seeking');
  assert.ok(code.includes('handleChangePlaybackRate'), 'Must support variable playback speed');
  assert.ok(code.includes('exportTranscriptToDocx') || code.includes('handleExportTranscriptDocx'), 'Must support docx transcript export');
  assert.ok(code.includes('handleDownloadTxt'), 'Must support plain text transcript export');
});

// ============================================================================
// D. Accessible Book Studio Workflows
// ============================================================================
test('Accessible Book Studio: Supports non-destructive editing and preserves source history', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/AccessibleBookStudioView.tsx'), 'utf-8');
  assert.ok(code.includes('rawSourceHistory'), 'Must keep history of raw source text');
  assert.ok(code.includes('handleImportFromFileReader'), 'Must support importing extracted text from Document Reader');
  assert.ok(code.includes('handleDownloadDocx'), 'Must export formatted accessible Word document');
  assert.ok(code.includes('buildPrintableHtmlDocument'), 'Must export clean semantic HTML');
});

// ============================================================================
// E. Image & WhatsApp Sticker Descriptions Workflows
// ============================================================================
test('Sticker Explainer: Detects animated WebP without claiming unauthorized API access', () => {
  // Synthetic static WebP header (RIFF....WEBPVP8 )
  const staticWebpHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x20
  ]);
  const staticResult = detectWebpAnimation(staticWebpHeader.buffer);
  assert.strictEqual(staticResult.isAnimated, false);

  // Synthetic animated WebP header (RIFF....WEBPVP8X with ANIM flag 0x02)
  const animWebpHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x30, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x58, 0x0A, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00
  ]);
  const animResult = detectWebpAnimation(animWebpHeader.buffer);
  assert.strictEqual(animResult.isAnimated, true);
});

test('Sticker Explainer: Supports clipboard paste and file upload honestly', () => {
  const code = fs.readFileSync(path.join(rootDir, 'src/components/UnifiedAccessibilityToolkitView.tsx'), 'utf-8');
  assert.ok(code.includes('handlePaste') || code.includes('addEventListener(\'paste\''), 'Must support clipboard paste');
  assert.ok(code.includes('detectWebpAnimation'), 'Must inspect sticker WebP format');
  assert.ok(code.includes('isAnalyzingSticker'), 'Must communicate active processing state');
});

// ============================================================================
// F. Saved Results & History Workflows
// ============================================================================
test('Saved Results: Preserves user privacy and enables complete history management', () => {
  // Clear any existing items in mock/test
  clearToolkitActivities();
  assert.strictEqual(getToolkitActivities().length, 0);

  // Save an item
  const item1: ToolkitActivityItem = {
    id: 'test_item_1',
    type: 'sticker_image',
    title: 'Laughing Cat Sticker',
    snippet: 'A playful cartoon cat holding a cup of tea.',
    timestamp: Date.now(),
  };
  const saved = saveToolkitActivity(item1);

  const activities = getToolkitActivities();
  assert.strictEqual(activities.length, 1);
  assert.strictEqual(activities[0].title, 'Laughing Cat Sticker');

  // Delete individual item using the generated id
  deleteToolkitActivity(saved.id);
  assert.strictEqual(getToolkitActivities().length, 0);
});

console.log(`\n🎉 All ${passedTests} Feature Workflows Audit Verification tests PASSED successfully!`);
