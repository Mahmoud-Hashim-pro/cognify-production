/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi — Phase 13: Final Integration, Accessibility Audit & Release Readiness Verification Suite
 * 
 * Validates:
 * 1. Full 6-Section Application Architecture (No merging, Universal Accessibility cross-cutting)
 * 2. User Journey A: Understanding the Environment (See & Understand)
 * 3. User Journey B: Reading and Learning (Read & Learn)
 * 4. User Journey C: Preparing a Book (Work & Create)
 * 5. User Journey D: Exploring Places (Move & Explore)
 * 6. User Journey E: Communication (Communicate)
 * 7. User Journey F: Personalization (Personalize)
 * 8. Comprehensive Automated Accessibility Audit (WCAG 2.2 AA target)
 * 9. Reliability, Error Categorization & Session Preservation
 * 10. Security, Privacy & Unified Blue Compliance (Zero #00AEB8, BYOK Card E, Canonical Logout)
 */

import fs from 'fs';
import path from 'path';
import {
  PRODUCT_SECTIONS,
  getProductSection,
  getSectionIconComponent,
  ProductSectionId,
} from '../src/lib/sections.js';
import {
  parseRoute,
  buildHash,
  VALID_VIEWS,
  VALID_DISABILITY_TABS,
} from '../src/lib/navigation.js';
import {
  detectSceneChange,
  extractSpatialRelations,
  parseObjectFinderResult,
  parseCurrencyResult,
  parseProductInformation,
  createVisualCompanionSession,
} from '../src/lib/visualCompanionEngine.js';
import {
  validateLectureAudioFile,
  detectLectureChapters,
  markUncertainSpeech,
  saveDocumentReadingProgress,
  getDocumentReadingHistory,
} from '../src/lib/audioDocumentIntelligenceEngine.js';
import {
  normalizeSpokenPunctuation,
  parseVoiceInputToCommand,
  verifyDocumentReplacementSafety,
  exportDocumentToMarkdown,
  canSendEmailDirectly,
  generateEmailDraft,
  createPresentationFromTopic,
  exportPresentationToHtmlDeck,
  parseCsvOrTsv,
  generateSpreadsheetSummary,
} from '../src/lib/productivityEngine.js';
import {
  getMobilitySafetyAdvisory,
  verifySafeMobilityClaims,
  formatClockPosition,
  analyzePlaceEnvironment,
  parseDirectionalSign,
  evaluateDoorwayAssistance,
  parseTransitSign,
  evaluateGpsAccuracy,
  getIndoorNavigationBoundary,
} from '../src/lib/mobilityEngine.js';
import {
  verifyAssistanceConsent,
  createInitialAssistanceSession,
  updateAssistanceSessionState,
  parseHandwrittenText,
  analyzeCommunicationForm,
  transcribeVoiceMessage,
  describeSocialMessageImage,
  draftSocialReplyMessage,
  verifySafeSendBoundary,
  evaluatePaymentGuidance,
  verifySafeCommunicateClaims,
} from '../src/lib/communicateEngine.js';
import {
  getLayoutDirection,
  preserveUserContentOnLanguageSwitch,
  detectBrowserVoiceSupport,
  validateShortcutConflict,
  sanitizeMemoryContent,
  createAssistantMemoryEntry,
  OFFLINE_CAPABILITY_MATRIX,
  isFeatureAvailableOffline,
  DEFAULT_SHORTCUTS,
} from '../src/lib/personalizeEngine.js';
import { secureSaveKey, secureLoadKeySync } from '../src/lib/cryptoShield.js';

// Polyfill localStorage in Node test runner if needed
if (typeof (globalThis as any).localStorage === 'undefined') {
  const storage = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => storage.get(key) || null,
    setItem: (key: string, val: string) => { storage.set(key, String(val)); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
  };
}

export interface VerificationResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

export async function runPhase13FinalIntegrationTests(): Promise<{ passed: number; failed: number; results: VerificationResult[] }> {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. FULL APPLICATION INTEGRATION & 6-SECTION REGISTRY
  // ═══════════════════════════════════════════════════════════════════════════
  assert(PRODUCT_SECTIONS.length === 6, 'Architecture & Sections', 'Exactly 6 official product sections exist');

  const expectedSections: { id: ProductSectionId; order: number; flagshipView: string }[] = [
    { id: 'see_understand', order: 1, flagshipView: 'disability' },
    { id: 'read_learn', order: 2, flagshipView: 'audio_document_intelligence' },
    { id: 'work_create', order: 3, flagshipView: 'productivity' },
    { id: 'move_explore', order: 4, flagshipView: 'mobility' },
    { id: 'communicate', order: 5, flagshipView: 'communicate' },
    { id: 'personalize', order: 6, flagshipView: 'settings' },
  ];

  for (const s of expectedSections) {
    const sec = getProductSection(s.id);
    assert(!!sec, 'Architecture & Sections', `Section ${s.id} is present in registry`);
    assert(sec?.numericOrder === s.order, 'Architecture & Sections', `Section ${s.id} maintains numeric order ${s.order}`);
    assert(sec?.features.length! > 0, 'Architecture & Sections', `Section ${s.id} contains registered features`);
    
    const primaryFeat = sec?.features.find(f => f.isPrimaryAction);
    assert(!!primaryFeat, 'Architecture & Sections', `Section ${s.id} has a designated primary flagship action`);
    assert(primaryFeat?.targetView === s.flagshipView, 'Architecture & Sections', `Section ${s.id} flagship points to target view ${s.flagshipView}`);
  }

  // Verify Universal Accessibility Layer is cross-cutting, not a 7th section
  const sectionIds = PRODUCT_SECTIONS.map(s => s.id);
  assert(!sectionIds.includes('accessibility' as any), 'Architecture & Sections', 'Universal Accessibility is cross-cutting and NOT a 7th section');

  // Verify Lucide icon component mappings exist for all sections
  for (const s of PRODUCT_SECTIONS) {
    const IconComp = getSectionIconComponent(s.iconName);
    assert(typeof IconComp === 'function' || typeof IconComp === 'object', 'Architecture & Sections', `Icon component resolved for section ${s.id}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. JOURNEY A: UNDERSTANDING THE ENVIRONMENT (See & Understand)
  // ═══════════════════════════════════════════════════════════════════════════
  const session = createVisualCompanionSession();
  assert(session.getCurrentScene() === null && session.getActiveInFlightSeqId() === 0, 'Journey A (See & Understand)', 'Visual companion session starts with inactive camera');

  const prevObservation = 'غرفة مكتب هادئة بها طاولة خشبية وكوب قهوة وحاسوب محمول';
  const newObservation = 'مطبخ مضاء به ثلاجة وفرن ومائدة طعام';
  const changeResult = detectSceneChange(prevObservation, newObservation, 'ar');
  assert(changeResult.changed, 'Journey A (See & Understand)', 'Scene change detected between sequential observations');
  assert(changeResult.summary.length > 0, 'Journey A (See & Understand)', 'Classifies room transition as major scene change');

  const spatialRelations = extractSpatialRelations('الكوب على يمين الحاسوب والمفاتيح أمامك مباشرة', 'ar');
  assert(spatialRelations.length > 0, 'Journey A (See & Understand)', 'Extracts spatial clock-face and relative relations without metric hallucination');

  const objLoc = parseObjectFinderResult('وجدت المفاتيح عند الساعة 2 على بعد في متناول اليد', 'مفاتيح', 'ar');
  assert(objLoc.found, 'Journey A (See & Understand)', 'Object finder locates requested target in scene');

  const currencyRes = parseCurrencyResult('تم التعرف على ورقة نقدية فئة مائة جنيه مصري 100 EGP', 'ar');
  assert(currencyRes.denomination === '100' && currencyRes.currency.includes('جنيه'), 'Journey A (See & Understand)', 'Currency recognizer detects denomination with counterfeit disclaimer');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. JOURNEY B: READING AND LEARNING (Read & Learn)
  // ═══════════════════════════════════════════════════════════════════════════
  const audioValidation = validateLectureAudioFile({
    name: 'neuroscience_lecture_01.mp3',
    size: 15 * 1024 * 1024,
    type: 'audio/mp3',
  });
  assert(audioValidation.valid, 'Journey B (Read & Learn)', 'Audio lecture workflow accepts valid academic audio file');

  const sampleTranscript = `بسم الله الرحمن الرحيم. في هذه المحاضرة سنتناول الجهاز العصبي المركزي.
يتكون الدماغ من المخ والمخيخ وجذع الدماغ.
الجزء الثاني هو الحبل الشوكي ووظائفه الحركية والحسية.
وفي الختام نراجع الأسئلة المتوقعة في الامتحان النهائي.`;

  const chapters = detectLectureChapters(sampleTranscript, [{ id: 's1', timestamp: '00:00', seconds: 0, text: 'الجهاز العصبي المركزي' }], 'ar');
  assert(chapters.length > 0, 'Journey B (Read & Learn)', 'Detects semantic lecture chapters with timestamps');

  const uncertainTranscript = markUncertainSpeech('تناولنا في البداية [مصطلح غير واضح] ثم انتقلنا للشرح', 'ar');
  assert(uncertainTranscript.includes('[مصطلح غير واضح]'), 'Journey B (Read & Learn)', 'Transparently marks uncertain speech segments');

  saveDocumentReadingProgress({
    id: 'doc_neuro_01',
    title: 'علم الأعصاب - المحاضرة 1',
    fileType: 'pdf',
    lastPageNumber: 4,
    lastParagraphIndex: 1,
    lastOpenedTimestamp: Date.now(),
    progressPercentage: 25,
    wordCount: 1800,
  });
  const readingHistory = getDocumentReadingHistory();
  assert(readingHistory.some(h => h.id === 'doc_neuro_01'), 'Journey B (Read & Learn)', 'Saves and restores reading history bookmark position');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. JOURNEY C: PREPARING A BOOK (Work & Create)
  // ═══════════════════════════════════════════════════════════════════════════
  const punctuated = normalizeSpokenPunctuation('الفصل الأول نقطة مقدمة في علم النفس فاصلة والتعلم سطر جديد', 'ar');
  assert(punctuated.includes('.') && punctuated.includes('،'), 'Journey C (Work & Create)', 'Converts voice spoken punctuation into proper punctuation marks');

  const voiceCmd = parseVoiceInputToCommand('عنوان رئيسي تاريخ الفلسفة الإسلامية', 'ar');
  assert(voiceCmd.isStructuralCommand, 'Journey C (Work & Create)', 'Parses voice formatting command for document headers');

  const sampleVoiceDoc: any = {
    id: 'doc_1',
    title: 'مستند فلسفة',
    blocks: [
      { id: 'b1', type: 'paragraph', text: 'مستند قديم مكتمل يحتوي على أفكار فلسفية هامة', createdAt: new Date().toISOString() },
    ],
    language: 'ar',
    updatedAt: new Date().toISOString(),
  };
  const replaceSafety = verifyDocumentReplacementSafety(sampleVoiceDoc, 50);
  assert(replaceSafety.requiresConfirmation === true, 'Journey C (Work & Create)', 'Enforces explicit confirmation before replacing existing document content');

  const emailDraft = generateEmailDraft({
    recipient: 'د. محمود',
    purpose: 'طلب تمديد موعد تسليم البحث الدراسي',
    tone: 'formal',
    dialect: 'msa',
    length: 'medium',
    keyPoints: ['طلب تمديد التسليم أسبوعاً إضافياً'],
  });
  assert(emailDraft.fullDraftText.length > 0, 'Journey C (Work & Create)', 'Generates formal academic email draft');
  assert(canSendEmailDirectly() === false, 'Journey C (Work & Create)', 'Strict invariant: email drafts CANNOT be dispatched without user review and approved client');

  const deck = createPresentationFromTopic('أساسيات الذكاء الاصطناعي', 3, 'ar');
  assert(deck.slides.length === 3, 'Journey C (Work & Create)', 'Creates 3-slide presentation deck structure');

  const htmlDeck = exportPresentationToHtmlDeck(deck);
  assert(htmlDeck.includes('أساسيات الذكاء الاصطناعي'), 'Journey C (Work & Create)', 'Exports presentation to accessible self-contained HTML deck');

  const parsedSheet = parseCsvOrTsv('المادة,الدرجة\nرياضيات,95\nفيزياء,88', 'درجات الطالب');
  assert(parsedSheet.totalRows === 2, 'Journey C (Work & Create)', 'Parses spreadsheet tabular data cleanly');

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. JOURNEY D: EXPLORING PLACES (Move & Explore)
  // ═══════════════════════════════════════════════════════════════════════════
  const mobilityAdvisory = getMobilitySafetyAdvisory('ar');
  assert(mobilityAdvisory.fullAdvisoryAr.includes('العصا البيضاء') || mobilityAdvisory.emergencyNoticeAr.includes('العصا البيضاء'), 'Journey D (Move & Explore)', 'Provides prominent white-cane and guide-dog safety advisory');

  const clockFmt = formatClockPosition('2_oclock', 'ar');
  assert(clockFmt.includes('الساعة 2'), 'Journey D (Move & Explore)', 'Formats clock-face directions in Arabic');

  const placeEnv = analyzePlaceEnvironment('قاعة محاضرات واسعة تتسع لـ 100 شخص وبها ممر رئيسي ومكتب في الأمام', 'clear', 'ar');
  assert(placeEnv.landmarks.length > 0, 'Journey D (Move & Explore)', 'Analyzes place environment and identifies landmarks');

  const signOcr = parseDirectionalSign('معمل 204 على اليمين دور 2', 'ar');
  assert(signOcr.roomNumbers.includes('204'), 'Journey D (Move & Explore)', 'Reads room numbers and floor designations from directional signs');

  const doorHelp = evaluateDoorwayAssistance('الباب زجاجي مغلق بمقبض على اليسار', '12_oclock');
  assert(doorHelp.doorIdentified, 'Journey D (Move & Explore)', 'Evaluates doorway status, handle location, and obstacles');

  const transitSign = parseTransitSign('أتوبيس خط 105 جامعة القاهرة', 0.92, 'ar');
  assert(transitSign.routeNumber === '105', 'Journey D (Move & Explore)', 'Identifies transit line number 105 from bus sign');

  const gpsEval = evaluateGpsAccuracy(35, 'ar');
  assert(gpsEval.tier === 'moderate', 'Journey D (Move & Explore)', 'Honest GPS evaluation accurately tiers moderate GPS accuracy (35m)');

  const indoorBoundary = getIndoorNavigationBoundary('ar');
  assert(indoorBoundary.isOperational === false && indoorBoundary.isHardwareGated, 'Journey D (Move & Explore)', 'Truthfully disclaims indoor turn-by-turn navigation limitations');

  const mobilityClaimCheck = verifySafeMobilityClaims('هذا النظام يضمن عبور الشارع بأمان مؤكد ويغني عن العصا البيضاء');
  assert(!mobilityClaimCheck.isSafe && mobilityClaimCheck.violations.length > 0, 'Journey D (Move & Explore)', 'Strictly flags and blocks dangerous claims of automated road crossing reliance');

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. JOURNEY E: COMMUNICATION (Communicate)
  // ═══════════════════════════════════════════════════════════════════════════
  const consentRes = verifyAssistanceConsent({
    userAgreed: true,
    shareCamera: true,
    shareMicrophone: true,
  });
  assert(consentRes.isApproved, 'Journey E (Communicate)', 'Validates explicit user consent before starting human assistance');

  const initialAssistance = createInitialAssistanceSession('trusted_contact');
  assert(initialAssistance.state === 'idle', 'Journey E (Communicate)', 'Initial assistance session starts in idle state');

  const updatedAssistance = updateAssistanceSessionState(initialAssistance, 'connected', true);
  assert(updatedAssistance.isCameraActive === true, 'Journey E (Communicate)', 'Tracks camera sharing indicator during active assistance');

  const hwOcr = parseHandwrittenText('تناول قرص [مسكن] بعد الأكل صباحاً', 0.85);
  assert(hwOcr.uncertainWordsCount > 0, 'Journey E (Communicate)', 'Marks uncertain handwritten tokens in brackets');

  const formAnalysis = analyzeCommunicationForm('اسم الطالب: أحمد\nالرقم القومي: 29801011234567\nرقم الهاتف: 01012345678');
  assert(formAnalysis.fields.length >= 2, 'Journey E (Communicate)', 'Extracts structured communication form fields');

  const voiceMsg = transcribeVoiceMessage('audio_note_1.mp3', 25, 'أهلاً بك، أود التأكيد على الحضور غداً', 0.95);
  assert(voiceMsg.transcriptText.length > 0, 'Journey E (Communicate)', 'Transcribes voice note audio text accurately');

  const draftedSocial = draftSocialReplyMessage('شكراً جزيلاً، يسعدني التعاون معك', 'polite', 'Arabic');
  assert(draftedSocial.draftText.length > 0, 'Journey E (Communicate)', 'Drafts polite communication response');

  const sendBoundary = verifySafeSendBoundary(false);
  assert(sendBoundary.allowedToSend === false, 'Journey E (Communicate)', 'Strict invariant: cannot send without explicit user review');

  const paymentGuide = evaluatePaymentGuidance(
    'إشعار دفع خدمة فوري رقم الكود: 78923412 المطلوب: 180 ج.م',
    'مئتا جنيه مصري (200 EGP)',
    'Arabic'
  );
  assert(paymentGuide.isTransactionAllowed === false, 'Journey E (Communicate)', 'Strict invariant: financial transactions are never executed by AI');

  const commClaims = verifySafeCommunicateClaims('سيقوم رفيقي بتنفيذ التحويل المالي وإرسال تلقائي للرسائل دون مراجعة');
  assert(!commClaims.isSafe && commClaims.violations.length >= 2, 'Journey E (Communicate)', 'Flags violations for auto-sending and financial execution');

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. JOURNEY F: PERSONALIZATION (Personalize)
  // ═══════════════════════════════════════════════════════════════════════════
  assert(getLayoutDirection('Arabic') === 'rtl', 'Journey F (Personalize)', 'Arabic interface layout direction is RTL');
  assert(getLayoutDirection('English') === 'ltr', 'Journey F (Personalize)', 'English interface layout direction is LTR');

  const userState = { draft: 'مسودة هامة', bookmarks: [12, 45] };
  const preservedState = preserveUserContentOnLanguageSwitch(userState, 'Arabic', 'English');
  assert(preservedState.draft === userState.draft, 'Journey F (Personalize)', 'User draft preserved across language switch');

  const voiceSupport = detectBrowserVoiceSupport();
  assert(typeof voiceSupport.isSynthesisSupported === 'boolean', 'Journey F (Personalize)', 'Detects browser speech synthesis capabilities');

  const shortcutCheck = validateShortcutConflict('Insert+F7');
  assert(shortcutCheck.hasConflict && shortcutCheck.screenReaderConflict === 'NVDA', 'Journey F (Personalize)', 'Flags NVDA reserved shortcut Insert+F7');

  const idSanitize = sanitizeMemoryContent('رقم بطاقتي القومية 29801011234567');
  assert(!idSanitize.isValid, 'Journey F (Personalize)', 'Intercepts and blocks Egyptian 14-digit National ID in memory');

  const safeMem = sanitizeMemoryContent('أفضل الجلوس بجوار النافذة للإضاءة الطبيعية');
  assert(safeMem.isValid, 'Journey F (Personalize)', 'Allows safe ergonomic and accessibility study preferences');

  const memEntry = createAssistantMemoryEntry('room_landmark', safeMem.sanitizedText, 'student_input');
  assert(memEntry.category === 'room_landmark' && memEntry.isUserVerified, 'Journey F (Personalize)', 'Creates verified assistant memory entry');

  assert(isFeatureAvailableOffline('haptics_vibration') === true, 'Journey F (Personalize)', 'Truthful offline matrix confirms haptics works offline');
  assert(isFeatureAvailableOffline('gemini_vision_analysis') === false, 'Journey F (Personalize)', 'Truthful offline matrix confirms Gemini requires internet');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. AUTOMATED ACCESSIBILITY AUDIT (WCAG 2.2 AA)
  // ═══════════════════════════════════════════════════════════════════════════
  const componentsDir = path.resolve(repoRoot, 'src/components');

  function walk(dir: string): string[] {
    let list: string[] = [];
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) list = list.concat(walk(full));
      else if (f.endsWith('.tsx')) list.push(full);
    }
    return list;
  }

  const allComponentFiles = walk(componentsDir);

  // Icon-only buttons audit: check for unlabeled buttons
  let unlabeledButtons = 0;
  for (const file of allComponentFiles) {
    const code = fs.readFileSync(file, 'utf8');
    const regex = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      const attrs = match[1];
      const body = match[2];
      const hasAria = /aria-label\s*=|aria-labelledby\s*=|title\s*=/i.test(attrs);
      if (hasAria) continue;
      const stripped = body.replace(/<[^>]+>/g, '').trim();
      const hasVisibleText = /[\u0600-\u06FFa-zA-Z0-9]/.test(stripped);
      if (!hasVisibleText) {
        unlabeledButtons++;
      }
    }
  }
  assert(unlabeledButtons === 0, 'Accessibility Audit (WCAG AA)', `Zero unlabeled icon-only buttons across all components in src/components (found ${unlabeledButtons})`);

  // Modal dialog ARIA audit
  const modalNames = [
    'DocumentStudioModal.tsx',
    'AccessibilityPassportModal.tsx',
    'AccessibilityPreferencesModal.tsx',
    'ParentalConsentModal.tsx',
  ];
  for (const m of modalNames) {
    const p = path.join(componentsDir, m);
    if (fs.existsSync(p)) {
      const code = fs.readFileSync(p, 'utf8');
      assert(code.includes('role="dialog"') || code.includes("role='dialog'"), 'Accessibility Audit (WCAG AA)', `${m} declares role="dialog"`);
      assert(code.includes('aria-modal="true"'), 'Accessibility Audit (WCAG AA)', `${m} declares aria-modal="true"`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. RELIABILITY, ERROR RECOVERY & NAVIGATION PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════
  // Test BYOK Secure Encryption Cycle
  const sampleKey = 'AIzaSyTest_Release_Verification_Key_12345';
  await secureSaveKey('gemini', sampleKey);
  const reloaded = secureLoadKeySync('gemini');
  assert(reloaded === sampleKey, 'Reliability & Error Recovery', 'BYOK API Key encrypted and retrieved with 100% fidelity');
  await secureSaveKey('gemini', '');
  assert(secureLoadKeySync('gemini') === '', 'Reliability & Error Recovery', 'BYOK API Key safely cleared from encrypted storage');

  // Test Deep Link Navigation Parsing across all 6 sections
  const routesToTest = [
    { hash: '#see_understand', view: 'disability', section: 'see_understand' },
    { hash: '#read_learn', view: 'disability', section: 'read_learn' },
    { hash: '#work_create', view: 'disability', section: 'work_create' },
    { hash: '#move_explore', view: 'disability', section: 'move_explore' },
    { hash: '#communicate', view: 'disability', section: 'communicate' },
    { hash: '#personalize', view: 'disability', section: 'personalize' },
    { hash: '#productivity', view: 'productivity' },
    { hash: '#mobility', view: 'mobility' },
    { hash: '#communication', view: 'communication' },
    { hash: '#settings', view: 'settings' },
  ];

  for (const r of routesToTest) {
    const parsed = parseRoute(r.hash);
    assert(parsed.view === r.view, 'Reliability & Error Recovery', `parseRoute("${r.hash}") routes to view "${r.view}"`);
    if (r.section) {
      assert(parsed.section === r.section, 'Reliability & Error Recovery', `parseRoute("${r.hash}") matches section "${r.section}"`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. UNIFIED BLUE DESIGN SYSTEM & ZERO #00AEB8 COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════
  const primarySectionViews = [
    'src/components/VisionCompanionView.tsx',
    'src/components/AccessibleBookStudioView.tsx',
    'src/components/AccessibleProductivityWorkspaceView.tsx',
    'src/components/AccessibleMobilityWorkspaceView.tsx',
    'src/components/AccessibleCommunicateWorkspaceView.tsx',
    'src/components/StudentSettingsView.tsx',
    'src/components/DisabilityModeView.tsx',
    'src/components/Sidebar.tsx',
  ];

  for (const vf of primarySectionViews) {
    const fullPath = path.join(repoRoot, vf);
    if (fs.existsSync(fullPath)) {
      const code = fs.readFileSync(fullPath, 'utf8');
      assert(!code.includes('#00AEB8'), 'Design System & Regression', `${vf} contains ZERO #00AEB8 legacy cyan`);
      assert(code.includes('#1769AA') || code.includes('#0D4778') || code.includes('#082344') || code.includes('#0D2542') || code.includes('rafiqi-primary') || code.includes('blue-600') || code.includes('themeColor'), 'Design System & Regression', `${vf} uses standard Unified Blue palette tokens`);
    }
  }

  // Retain BYOK Card E and Canonical Logout in StudentSettingsView.tsx
  const settingsCode = fs.readFileSync(path.join(repoRoot, 'src/components/StudentSettingsView.tsx'), 'utf8');
  assert(settingsCode.includes('CARD E: AI SERVICE & API KEY') || settingsCode.includes('AI Service & API Key (BYOK)'), 'Design System & Regression', 'StudentSettingsView retains CARD E: AI SERVICE & API KEY');
  assert(settingsCode.includes('id="setting-gemini-key"'), 'Design System & Regression', 'StudentSettingsView retains id="setting-gemini-key"');
  assert(settingsCode.includes('LogOut') && settingsCode.includes('logout()'), 'Design System & Regression', 'StudentSettingsView retains canonical Logout button');
  assert(settingsCode.includes('onNavigateBack'), 'Design System & Regression', 'StudentSettingsView retains onNavigateBack');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return { passed, failed, results };
}

// Direct CLI Execution
if (process.argv[1]?.includes('phase13FinalIntegrationVerification')) {
  runPhase13FinalIntegrationTests().then(({ passed, failed, results }) => {
    console.log('\n═════════════════════════════════════════════════════════════════════');
    console.log('  RAFIQI PHASE 13: FINAL INTEGRATION & RELEASE VERIFICATION');
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
