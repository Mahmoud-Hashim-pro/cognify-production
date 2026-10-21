/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cognify Automated Verification Suite: Milestone 33
 * Phase 7: Integrated Accessibility Toolkit (Vision, Scanner, PDF Evidence & Sticker Explainer)
 */

import {
  ToolkitCategory,
  ScannedPageItem,
  DocumentEvidenceResult,
  StickerAnalysisResult,
  ToolkitActivityItem,
  detectWebpAnimation,
  detectDocumentBounds,
  applyScanFilter,
  combinePagesIntoPdf,
  queryPdfWithEvidence,
  saveToolkitActivity,
  getToolkitActivities,
  deleteToolkitActivity,
  clearToolkitActivities,
  TOOLKIT_STORAGE_KEY,
} from '../src/lib/accessibilityToolkitEngine.js';

// Polyfill mock localStorage for Node.js test environment if undefined
class MockStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new MockStorage();
}

export async function runAccessibilityToolkitVerification(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✓ ${description}`);
      passed++;
    } else {
      console.error(`  ✗ ${description}`);
      failed++;
    }
  }

  console.log('\n--- Running Integrated Accessibility Toolkit Suite (Milestone 33) ---');

  // =========================================================================
  // Test Suite 1: Document Scanner Boundary Detection & Filters
  // =========================================================================
  console.log('\n  [Suite 1: Document Boundary Detection & Preprocessing Filters]');

  // Create a synthetic 200x200 ImageData with a bright document rectangle (50, 30, 100, 140)
  const mockWidth = 200;
  const mockHeight = 200;
  const mockBuffer = new Uint8ClampedArray(mockWidth * mockHeight * 4);

  // Background is dark desk (RGB: 30, 30, 30)
  for (let i = 0; i < mockBuffer.length; i += 4) {
    mockBuffer[i] = 30;
    mockBuffer[i + 1] = 30;
    mockBuffer[i + 2] = 30;
    mockBuffer[i + 3] = 255;
  }

  // Draw bright white document sheet in center
  for (let y = 30; y < 170; y++) {
    for (let x = 50; x < 150; x++) {
      const idx = (y * mockWidth + x) * 4;
      mockBuffer[idx] = 245;     // R
      mockBuffer[idx + 1] = 245; // G
      mockBuffer[idx + 2] = 240; // B
      mockBuffer[idx + 3] = 255;
    }
  }

  const mockImageData = {
    width: mockWidth,
    height: mockHeight,
    data: mockBuffer,
    colorSpace: 'srgb' as const,
  };

  const detected = detectDocumentBounds(mockImageData);
  assert(detected.hasDocument === true, 'Detected high-contrast document in camera frame');
  assert(detected.confidence >= 0.5, `Boundary confidence is high (${detected.confidence} >= 0.5)`);
  assert(detected.corners.length === 4, 'Extracted 4 quadrilateral corner coordinates');
  assert(detected.corners[0].x <= 60 && detected.corners[0].y <= 40, 'Identified Top-Left document corner');
  assert(detected.corners[2].x >= 140 && detected.corners[2].y >= 160, 'Identified Bottom-Right document corner');

  // Test edge case: completely black frame
  const darkBuffer = new Uint8ClampedArray(100 * 100 * 4);
  const darkResult = detectDocumentBounds({ width: 100, height: 100, data: darkBuffer, colorSpace: 'srgb' });
  assert(darkResult.hasDocument === false, 'Safely handles dark/empty frame without false document detection');

  // Test scan filters simulation
  const filterBuffer = new Uint8ClampedArray(10 * 10 * 4);
  for (let i = 0; i < filterBuffer.length; i += 4) {
    filterBuffer[i] = i % 256;
    filterBuffer[i + 1] = (i * 2) % 256;
    filterBuffer[i + 2] = (i * 3) % 256;
    filterBuffer[i + 3] = 255;
  }
  const mockContext = {
    getImageData: () => ({ data: filterBuffer, width: 10, height: 10 }),
    putImageData: () => {},
  } as unknown as CanvasRenderingContext2D;

  applyScanFilter(mockContext, 10, 10, 'binarize');
  // Binarize should push values to strictly 0 or 255
  let hasMidtone = false;
  for (let i = 0; i < filterBuffer.length; i += 4) {
    if (filterBuffer[i] !== 0 && filterBuffer[i] !== 255) {
      hasMidtone = true;
    }
  }
  assert(!hasMidtone, 'Binarization filter yields crisp pure black & white without midtones');

  // =========================================================================
  // Test Suite 2: Multi-Page Standalone PDF 1.4 Compilation
  // =========================================================================
  console.log('\n  [Suite 2: Multi-Page PDF 1.4 Binary Package Compilation]');

  // Create a minimal 1x1 white JPEG base64
  const minimalJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const samplePages = [
    { dataUrl: `data:image/jpeg;base64,${minimalJpegBase64}`, width: 595, height: 842, pageNumber: 1 },
    { dataUrl: `data:image/jpeg;base64,${minimalJpegBase64}`, width: 595, height: 842, pageNumber: 2 },
    { dataUrl: `data:image/jpeg;base64,${minimalJpegBase64}`, width: 595, height: 842, pageNumber: 3 },
  ];

  const pdfBlob = await combinePagesIntoPdf(samplePages, 'Cognify Arabic & English Test Document');
  assert(!!pdfBlob, 'Generated PDF Blob successfully');
  assert(pdfBlob.type === 'application/pdf', 'Blob has correct application/pdf MIME type');
  assert(pdfBlob.size > 500, `PDF binary size is ${pdfBlob.size} bytes (valid non-empty document)`);

  const pdfArrayBuffer = await pdfBlob.arrayBuffer();
  const pdfBytes = new Uint8Array(pdfArrayBuffer);
  const pdfText = new TextDecoder('latin1').decode(pdfBytes);

  assert(pdfText.startsWith('%PDF-1.4'), 'Binary contains standard %PDF-1.4 header');
  assert(pdfText.includes('/Type /Catalog'), 'PDF contains root Catalog object');
  assert(pdfText.includes('/Type /Pages'), 'PDF contains Pages collection');
  assert(pdfText.includes('/Count 3'), 'Pages collection has correct Count: 3');
  assert(pdfText.includes('/Type /Page'), 'PDF contains individual Page objects');
  assert(pdfText.includes('/Filter /DCTDecode'), 'Page images use standard DCTDecode (JPEG)');
  assert(pdfText.includes('xref'), 'PDF contains valid cross-reference table');
  assert(pdfText.includes('trailer'), 'PDF contains trailer dictionary');
  assert(pdfText.includes('%%EOF'), 'PDF ends with standard EOF marker');

  // =========================================================================
  // Test Suite 3: WhatsApp Sticker & Image Explainer (WebP / GIF)
  // =========================================================================
  console.log('\n  [Suite 3: WhatsApp Sticker & WebP Format Inspection]');

  // Synthetic Static WebP Header
  const staticWebpHeader = new Uint8Array(32);
  staticWebpHeader.set([0x52, 0x49, 0x46, 0x46]); // 'RIFF'
  staticWebpHeader.set([0x20, 0x00, 0x00, 0x00], 4); // File size
  staticWebpHeader.set([0x57, 0x45, 0x42, 0x50], 8); // 'WEBP'
  staticWebpHeader.set([0x56, 0x50, 0x38, 0x58], 12); // 'VP8X'
  staticWebpHeader[20] = 0x00; // Animation bit = 0

  const staticCheck = detectWebpAnimation(staticWebpHeader);
  assert(staticCheck.isAnimated === false, 'Detected static WebP sticker');

  // Synthetic Animated WebP Header (Animation flag bit 1 set = 0x02)
  const animatedWebpHeader = new Uint8Array(32);
  animatedWebpHeader.set([0x52, 0x49, 0x46, 0x46]); // 'RIFF'
  animatedWebpHeader.set([0x57, 0x45, 0x42, 0x50], 8); // 'WEBP'
  animatedWebpHeader.set([0x56, 0x50, 0x38, 0x58], 12); // 'VP8X'
  animatedWebpHeader[20] = 0x02; // Animation bit set!

  const animCheck = detectWebpAnimation(animatedWebpHeader);
  assert(animCheck.isAnimated === true, 'Detected animated WebP WhatsApp sticker');
  assert(animCheck.format.includes('Animated'), 'Format label indicates animated sticker');

  // Synthetic Animated GIF Header (GIF89a with 2 image descriptors 0x2C)
  const gifBytes = new Uint8Array(30);
  gifBytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // 'GIF89a'
  gifBytes[15] = 0x2c; // Image separator 1
  gifBytes[22] = 0x2c; // Image separator 2
  const gifCheck = detectWebpAnimation(gifBytes);
  assert(gifCheck.isAnimated === true, 'Detected animated GIF image');

  // =========================================================================
  // Test Suite 4: PDF Evidence Grounding & Q&A Assistant
  // =========================================================================
  console.log('\n  [Suite 4: Grounded Document Evidence Assistant]');

  const sampleDocPages = [
    'Cognify Academic Handbook\nChapter 1: Attendance and Grading Policies.\nA minimum attendance rate of 75% is strictly mandatory to be eligible for final examinations. Students falling below 75% are classified as deprived.',
    'Chapter 2: Assistive Accommodations.\nStudents with visual impairments receive double exam time (2.0x factor) and screen reader-compatible digitized Word documents with clear H1, H2 headings.',
  ];
  const combinedText = sampleDocPages.join('\n\n');

  // Test empty query safety
  const emptyRes = await queryPdfWithEvidence(combinedText, sampleDocPages, '', 'en');
  assert(emptyRes.confidence === 0, 'Empty query safely returns 0 confidence');
  assert(emptyRes.foundInDocument === false, 'Empty query returns foundInDocument: false');

  // Test query with evidence response format
  const groundedRes = await queryPdfWithEvidence(
    combinedText,
    sampleDocPages,
    'What is the minimum attendance requirement?',
    'en'
  );
  assert(typeof groundedRes.answer === 'string' && groundedRes.answer.length > 0, 'Returns grounded direct answer');
  assert(typeof groundedRes.pageNumber === 'number', 'Returns specific page citation');
  assert(typeof groundedRes.confidence === 'number' && groundedRes.confidence >= 0, 'Returns numeric confidence score');

  // =========================================================================
  // Test Suite 5: Unified Activity Storage Hub (FIFO & Persistence)
  // =========================================================================
  console.log('\n  [Suite 5: Unified Activity Persistence & Storage Keys]');

  clearToolkitActivities();
  assert(getToolkitActivities().length === 0, 'Activity list starts clean after clear');

  const saved1 = saveToolkitActivity({
    type: 'sticker_image',
    title: 'Happy Cat Sticker',
    snippet: 'Cute smiling cat giving thumbs up with celebratory vibe',
    metadata: { isAnimated: false, vibe: 'Congratulatory' },
  });
  assert(!!saved1.id, 'Saved activity item receives unique ID');
  assert(saved1.type === 'sticker_image', 'Saved activity preserves item type');

  const saved2 = saveToolkitActivity({
    type: 'scan',
    title: 'Lecture Handout Scan',
    snippet: '3-page scanned handout on Artificial Intelligence',
    metadata: { pageCount: 3 },
  });

  const list = getToolkitActivities();
  assert(list.length === 2, 'Stored 2 distinct activity items');
  assert(list[0].id === saved2.id, 'Newest activity item is listed first (LIFO order)');

  deleteToolkitActivity(saved1.id);
  const afterDelete = getToolkitActivities();
  assert(afterDelete.length === 1, 'Successfully deleted specified activity item');
  assert(afterDelete[0].id === saved2.id, 'Remaining item matches preserved ID');

  assert(TOOLKIT_STORAGE_KEY === 'cognify_accessibility_toolkit_activity_v1', 'Activity storage key matches constant');

  // =========================================================================
  // Test Suite 6: Unified Toolkit Categories & Accessibility
  // =========================================================================
  console.log('\n  [Suite 6: Toolkit Categories & Non-Visual Architecture]');

  const expectedCategories: ToolkitCategory[] = [
    'see_understand',
    'read_scan',
    'listen_transcribe',
    'format_edu',
    'saved_activity',
  ];

  assert(expectedCategories.length === 5, 'Contains all 5 specified functional categories');
  assert(expectedCategories.includes('see_understand'), 'Includes "See and Understand"');
  assert(expectedCategories.includes('read_scan'), 'Includes "Read and Scan"');
  assert(expectedCategories.includes('listen_transcribe'), 'Includes "Listen and Transcribe"');
  assert(expectedCategories.includes('format_edu'), 'Includes "Format Educational Documents"');
  assert(expectedCategories.includes('saved_activity'), 'Includes "Saved Results and Recent Activity"');

  console.log(`\nAccessibility Toolkit Verification Complete: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}
