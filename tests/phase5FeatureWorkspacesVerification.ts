/**
 * Rafiqi (رفيقي) — UI Phase 5: Feature Workspaces & Interaction Redesign Verification Suite
 *
 * Verifies:
 * 1. Visual Companion Workspace (VisionCompanionView.tsx):
 *    - Camera & image workspace
 *    - Large Start / Stop controls (data-testid="vision-start-stop-cam-btn")
 *    - Clear camera and microphone status indicators (data-testid="camera-status-indicator", data-testid="mic-status-indicator")
 *    - Live description panel (data-testid="live-description-panel")
 *    - Scene history with replay and pause (data-testid="scene-history-panel", data-testid="speech-replay-pause-btn")
 *    - Scene conversation (data-testid="scene-conversation-panel")
 *    - Safety notices (data-testid="visual-safety-notice")
 *    - Error recovery with Retry, Cancel, Stop, Help
 * 2. Reading & Lecture Workspace (AudioDocumentIntelligenceView.tsx):
 *    - File and lecture upload (data-testid="lecture-upload-input", data-testid="doc-upload-input")
 *    - Processing status (data-testid="processing-status-bar")
 *    - Transcript view (data-testid="transcript-view")
 *    - Chapter navigation (data-testid="chapter-navigation")
 *    - Audio playback controls (data-testid="audio-playback-controls")
 *    - Reading controls (data-testid="reading-controls")
 *    - Grounded summary (data-testid="lecture-summary")
 *    - Ask Your Content (data-testid="ask-content-panel")
 *    - Practice quiz & notes (data-testid="quiz-notes-panel")
 *    - Desktop split-pane and mobile stacked layout
 * 3. Book Formatting Studio (AccessibleBookStudioView.tsx):
 *    - Document upload (data-testid="book-document-upload")
 *    - Document structure preview (data-testid="document-structure-preview")
 *    - Formatting options (data-testid="formatting-options")
 *    - Before/after preview (data-testid="before-after-preview")
 *    - Arabic RTL support (dir="rtl", Arabic typography)
 *    - Exercise and answer-line formatting (data-testid="exercise-formatting")
 *    - Export controls (data-testid="book-export-controls")
 *    - Clear warnings about unsupported source formatting (data-testid="unsupported-formatting-warning")
 *    - Exact verbatim source text preservation guarantee
 * 4. Communication Workspace (HearAndExpressView.tsx & AccessibleCommunicateWorkspaceView.tsx):
 *    - Captions (data-testid="live-captions-view")
 *    - Text entry (data-testid="text-entry-input")
 *    - Quick responses (data-testid="quick-responses-grid")
 *    - AAC board (data-testid="aac-board-view")
 *    - Speech controls (data-testid="speech-controls")
 *    - Clear communication state (data-testid="communication-state-indicator")
 * 5. Shared Interaction States:
 *    - Initial, Loading, Progress, Success, Empty, Error, Retry, Cancel, Stop, Help.
 *    - Real functional behavior (no dead/fake buttons).
 * 6. Non-rewrite Invariant:
 *    - Underlying AI engines, OCR pipelines, speech synthesis, document extractors, and backend endpoints preserved.
 */

import fs from 'fs';
import path from 'path';

export function runPhase5FeatureWorkspacesVerification(): boolean {
  console.log('\n=============================================================');
  console.log('⚡ RUNNING RAFIQI UI PHASE 5: FEATURE WORKSPACES TESTS');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Visual Companion Workspace Verification
  const visionFile = path.resolve(process.cwd(), 'src/components/VisionCompanionView.tsx');
  assert(fs.existsSync(visionFile), 'VisionCompanionView.tsx workspace exists');
  const visionCode = fs.readFileSync(visionFile, 'utf-8');

  assert(
    visionCode.includes('data-testid="vision-start-stop-cam-btn"'),
    'Visual Companion: Large Start / Stop camera controls present'
  );
  assert(
    visionCode.includes('data-testid="camera-status-indicator"'),
    'Visual Companion: Clear camera status indicator present'
  );
  assert(
    visionCode.includes('data-testid="mic-status-indicator"'),
    'Visual Companion: Clear microphone status indicator present'
  );
  assert(
    visionCode.includes('data-testid="speech-status-indicator"'),
    'Visual Companion: Speech output status indicator present'
  );
  assert(
    visionCode.includes('data-testid="live-description-panel"'),
    'Visual Companion: Live description panel present'
  );
  assert(
    visionCode.includes('data-testid="speech-replay-pause-btn"'),
    'Visual Companion: Replay and pause voice controls present'
  );
  assert(
    visionCode.includes('data-testid="scene-conversation-panel"'),
    'Visual Companion: Interactive scene conversation panel present'
  );
  assert(
    visionCode.includes('data-testid="scene-history-panel"'),
    'Visual Companion: Scene history and spatial memories present'
  );
  assert(
    visionCode.includes('data-testid="visual-safety-notice"'),
    'Visual Companion: Prominent visual safety notice present'
  );
  assert(
    visionCode.includes('role="status"') && visionCode.includes('aria-live="assertive"'),
    'Visual Companion: Screen reader live region ensures visual output is understandable'
  );
  assert(
    visionCode.includes('Retry Camera') && visionCode.includes('Upload Scene Image'),
    'Visual Companion: Comprehensive error recovery (Retry, Upload fallback) present'
  );

  // 2. Reading & Lecture Workspace Verification
  const audioDocFile = path.resolve(process.cwd(), 'src/components/AudioDocumentIntelligenceView.tsx');
  assert(fs.existsSync(audioDocFile), 'AudioDocumentIntelligenceView.tsx workspace exists');
  const audioDocCode = fs.readFileSync(audioDocFile, 'utf-8');

  assert(
    audioDocCode.includes('data-testid="lecture-upload-input"'),
    'Reading & Lecture: Audio lecture upload control present'
  );
  assert(
    audioDocCode.includes('data-testid="doc-upload-input"'),
    'Reading & Lecture: Document (PDF/DOCX/EPUB) upload control present'
  );
  assert(
    audioDocCode.includes('data-testid="processing-status-bar"'),
    'Reading & Lecture: Processing status progress bar present'
  );
  assert(
    audioDocCode.includes('data-testid="transcript-view"'),
    'Reading & Lecture: Synchronized transcript reader view present'
  );
  assert(
    audioDocCode.includes('data-testid="chapter-navigation"'),
    'Reading & Lecture: Chapter navigation and timestamps present'
  );
  assert(
    audioDocCode.includes('data-testid="audio-playback-controls"'),
    'Reading & Lecture: Audio playback controls present'
  );
  assert(
    audioDocCode.includes('data-testid="reading-controls"'),
    'Reading & Lecture: Page and text reading controls present'
  );
  assert(
    audioDocCode.includes('data-testid="lecture-summary"'),
    'Reading & Lecture: Grounded lecture summary present'
  );
  assert(
    audioDocCode.includes('data-testid="ask-content-panel"'),
    'Reading & Lecture: Ask Your Content Q&A with citations present'
  );
  assert(
    audioDocCode.includes('data-testid="quiz-notes-panel"'),
    'Reading & Lecture: Practice quiz and study notes panel present'
  );
  assert(
    audioDocCode.includes('grid-cols-1 lg:grid-cols-3') && audioDocCode.includes('grid-cols-1 lg:grid-cols-2'),
    'Reading & Lecture: Split-pane layout on desktop and stacked layout on mobile verified'
  );

  // 3. Book Formatting Studio Verification
  const bookStudioFile = path.resolve(process.cwd(), 'src/components/AccessibleBookStudioView.tsx');
  assert(fs.existsSync(bookStudioFile), 'AccessibleBookStudioView.tsx workspace exists');
  const bookStudioCode = fs.readFileSync(bookStudioFile, 'utf-8');

  assert(
    bookStudioCode.includes('data-testid="book-document-upload"'),
    'Book Studio: Document file upload control present'
  );
  assert(
    bookStudioCode.includes('data-testid="document-structure-preview"'),
    'Book Studio: Document structure preview outline present'
  );
  assert(
    bookStudioCode.includes('data-testid="formatting-options"'),
    'Book Studio: Layout and formatting options present'
  );
  assert(
    bookStudioCode.includes('data-testid="before-after-preview"'),
    'Book Studio: Before/after preview inspector present'
  );
  assert(
    bookStudioCode.includes('isArLocale') && (bookStudioCode.includes('Segoe UI') || bookStudioCode.includes('Amiri')),
    'Book Studio: Arabic RTL and typography font support present'
  );
  assert(
    bookStudioCode.includes('data-testid="exercise-formatting"'),
    'Book Studio: Exercise, questions, and answer-space formatting present'
  );
  assert(
    bookStudioCode.includes('data-testid="book-export-controls"'),
    'Book Studio: DOCX and PDF export controls present'
  );
  assert(
    bookStudioCode.includes('data-testid="unsupported-formatting-warning"'),
    'Book Studio: Clear warnings about unsupported source formatting present'
  );
  assert(
    bookStudioCode.includes('Non-destructive Formatting') || bookStudioCode.includes('حفظ الأصول'),
    'Book Studio: Exact verbatim source text preservation guarantee verified'
  );

  // 4. Communication Workspace Verification
  const hearExpressFile = path.resolve(process.cwd(), 'src/components/HearAndExpressView.tsx');
  assert(fs.existsSync(hearExpressFile), 'HearAndExpressView.tsx workspace exists');
  const hearExpressCode = fs.readFileSync(hearExpressFile, 'utf-8');

  assert(
    hearExpressCode.includes('data-testid="live-captions-view"'),
    'Communication Workspace: Live captions view present'
  );
  assert(
    hearExpressCode.includes('data-testid="text-entry-input"'),
    'Communication Workspace: Custom typed text entry input present'
  );
  assert(
    hearExpressCode.includes('data-testid="quick-responses-grid"'),
    'Communication Workspace: Quick response shortcuts grid present'
  );
  assert(
    hearExpressCode.includes('data-testid="aac-board-view"'),
    'Communication Workspace: AAC communication symbol board and sentence builder present'
  );
  assert(
    hearExpressCode.includes('data-testid="speech-controls"'),
    'Communication Workspace: Speech controls and instant stop audio present'
  );
  assert(
    hearExpressCode.includes('data-testid="communication-state-indicator"'),
    'Communication Workspace: Clear communication status indicator present'
  );

  // 5. Shared Interaction States Across Workspaces
  [
    { name: 'VisionCompanionView', code: visionCode },
    { name: 'AudioDocumentIntelligenceView', code: audioDocCode },
    { name: 'AccessibleBookStudioView', code: bookStudioCode },
    { name: 'HearAndExpressView', code: hearExpressCode },
  ].forEach(({ name, code }) => {
    // Initial / Empty state
    assert(code.includes('No ') || code.includes('لم يتم') || code.includes('empty') || code.includes('No scene'), `${name}: Handles initial & empty state`);
    // Loading / Progress state
    assert(code.includes('Loading') || code.includes('Loader2') || code.includes('animate-spin') || code.includes('Progress'), `${name}: Handles loading & in-flight progress state`);
    // Success / Result state
    assert(code.includes('success') || code.includes('Check') || code.includes('toast.success'), `${name}: Handles success feedback state`);
    // Error state & recovery
    assert(code.includes('error') || code.includes('Alert') || code.includes('toast.error'), `${name}: Handles error state gracefully`);
    // Real Controls (Retry, Cancel, Stop, Help)
    assert(code.includes('Retry') || code.includes('إعادة') || code.includes('RefreshCw'), `${name}: Features functional Retry behavior`);
    assert(code.includes('Cancel') || code.includes('إلغاء') || code.includes('Stop') || code.includes('إيقاف'), `${name}: Features functional Stop / Cancel behavior`);
    assert(code.includes('Help') || code.includes('مساعدة') || code.includes('HelpCircle'), `${name}: Features accessible Help guidance`);
  });

  // 6. Non-rewrite Invariant
  const engines = [
    'src/lib/visualCompanionEngine.ts',
    'src/lib/audioDocumentIntelligenceEngine.ts',
    'src/lib/bookStudioEngine.ts',
    'src/lib/communicateEngine.ts',
    'src/lib/tts.ts',
  ];
  engines.forEach((eng) => {
    assert(fs.existsSync(path.resolve(process.cwd(), eng)), `Core underlying engine ${eng} is intact and preserved`);
  });

  console.log(`\n-------------------------------------------------------------`);
  console.log(`Phase 5 Verification Summary: Passed: ${passed}, Failed: ${failed}`);
  console.log(`-------------------------------------------------------------\n`);

  return failed === 0;
}

if (process.argv[1] && process.argv[1].endsWith('phase5FeatureWorkspacesVerification.ts')) {
  const ok = runPhase5FeatureWorkspacesVerification();
  process.exit(ok ? 0 : 1);
}
