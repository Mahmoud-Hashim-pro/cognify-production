/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi (رفيقي) — Phase 11 Accessible Communication Assistant Verification Suite
 * 
 * Comprehensive automated verification test suite for Phase 11:
 * - Section 5 (Communicate) Architecture & Registration
 * - Legitimate Human Assistance & Live Video Stream (Explicit Consent & Kill Switch)
 * - Anti-Simulation Rules (Zero fake volunteers, truthful provider confirmation)
 * - Handwriting Reader (Uncertainty marking, source inspection, no fabricated facts)
 * - Form & Document Assistant (Required vs. optional fields, anti-fabrication guard)
 * - Voice Message Tools (Transcription, bulleted summaries, separate audio storage)
 * - Social & Messaging Assistant (Image descriptions, tone drafter, review-before-send)
 * - Currency & Payment Guidance (Strict anti-transaction & anti-counterfeiting guards)
 * - Anti-Violation Claim Validator (Financial, counterfeit, and auto-dispatch rules)
 * - Navigation Routing, Breadcrumbs, and Zero #00AEB8 Theme Invariant
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PRODUCT_SECTIONS,
  getProductSection,
} from '../src/lib/sections';
import {
  parseRoute,
  buildHash,
  getRouteTitle,
  VALID_VIEWS,
} from '../src/lib/navigation';
import {
  HUMAN_ASSIST_DISCLAIMER_AR,
  HUMAN_ASSIST_DISCLAIMER_EN,
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
} from '../src/lib/communicateEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

export async function runPhase11CommunicateTests() {
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('   RAFIQI — PHASE 11 COMMUNICATE ASSISTANT VERIFICATION SUITE    ');
  console.log('══════════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SECTION 5 (COMMUNICATE) REGISTRATION & ARCHITECTURE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ 1. Section 5 (Communicate) Architecture & Registration');
  const commSection = getProductSection('communicate');
  assert(!!commSection, 'Section 5 (communicate) is defined in sections registry');
  assert(commSection?.numericOrder === 5, 'Section 5 numericOrder is strictly 5');
  assert(commSection?.titleAr.includes('التواصل'), 'Section 5 Arabic title includes "التواصل"');
  assert(commSection?.titleEn.includes('Communicate'), 'Section 5 English title includes "Communicate"');

  // Check Flagship feature
  const flagshipFeat = commSection?.features.find((f) => f.id === 'feat_accessible_communication_workspace');
  assert(!!flagshipFeat, 'Flagship feature feat_accessible_communication_workspace is registered');
  assert(flagshipFeat?.targetView === 'communicate', 'feat_accessible_communication_workspace routes to targetView="communicate"');
  assert(flagshipFeat?.isPrimaryAction === true, 'feat_accessible_communication_workspace is marked as primary action');

  // Check Sub-features for Phase 11
  const subFeatureIds = [
    'feat_human_assistance',
    'feat_live_video_assist',
    'feat_handwriting_reader',
    'feat_form_communication_assistant',
    'feat_voice_message_transcription',
    'feat_social_message_describer',
    'feat_payment_currency_guidance',
  ];
  for (const id of subFeatureIds) {
    const feat = commSection?.features.find((f) => f.id === id);
    assert(!!feat, `Communicate feature "${id}" is registered`);
    assert(feat?.targetView === 'communicate', `Feature "${id}" targets view="communicate"`);
    assert(!!feat?.targetTab, `Feature "${id}" targets sub-tool tab "${feat?.targetTab}"`);
  }

  // Check Preserved Deaf & Hard-of-Hearing Features
  const hearExpressFeat = commSection?.features.find((f) => f.id === 'feat_hear_express');
  assert(!!hearExpressFeat, 'Preserved legacy feat_hear_express in Section 5');
  const aacFeat = commSection?.features.find((f) => f.id === 'feat_aac_boards');
  assert(!!aacFeat, 'Preserved legacy feat_aac_boards in Section 5');
  const captionsFeat = commSection?.features.find((f) => f.id === 'feat_live_captions');
  assert(!!captionsFeat, 'Preserved legacy feat_live_captions in Section 5');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. LEGITIMATE HUMAN ASSISTANCE & LIVE VIDEO (CONSENT & KILL SWITCH)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 2. Legitimate Human Assistance & Live Video (Consent & Kill Switch)');
  assert(
    HUMAN_ASSIST_DISCLAIMER_AR.includes('موافقتك الصريحة') && HUMAN_ASSIST_DISCLAIMER_AR.includes('لا يحاكي وجود متطوعين وهميين'),
    'Arabic disclaimer requires explicit consent and forbids fake volunteers'
  );
  assert(
    HUMAN_ASSIST_DISCLAIMER_EN.includes('explicit consent') && HUMAN_ASSIST_DISCLAIMER_EN.includes('never simulates fake volunteer'),
    'English disclaimer requires explicit consent and forbids fake volunteers'
  );

  // Consent verification guards
  const emptyConsent = verifyAssistanceConsent({});
  assert(emptyConsent.isApproved === false, 'Rejects empty consent without user agreement');
  assert(emptyConsent.missingConsents.includes('user_explicit_agreement'), 'Flags missing user explicit agreement');

  const partialConsent = verifyAssistanceConsent({ userAgreed: true, shareCamera: true, shareMicrophone: false });
  assert(partialConsent.isApproved === false, 'Rejects partial consent missing microphone authorization');
  assert(partialConsent.missingConsents.includes('microphone_sharing_consent'), 'Flags missing microphone sharing consent');

  const validConsent = verifyAssistanceConsent({ userAgreed: true, shareCamera: true, shareMicrophone: true });
  assert(validConsent.isApproved === true, 'Approves complete explicit consent (userAgreed, camera, mic)');

  // Initial session invariants
  const session = createInitialAssistanceSession('trusted_contact');
  assert(session.state === 'idle', 'Initial assistance session starts in "idle" state');
  assert(session.isRealHumanConnected === false, 'Initial assistance session does not claim connected human');
  assert(session.isCameraActive === false, 'Camera is inactive on initial session');
  assert(session.durationSeconds === 0, 'Initial duration is 0 seconds');

  // Connecting state
  const connectingSession = updateAssistanceSessionState(session, 'connecting');
  assert(connectingSession.state === 'connecting', 'Transitions to connecting state');
  assert(connectingSession.isRealHumanConnected === false, 'Does not claim connected human while connecting');
  assert(connectingSession.sharingNoticeAr.includes('لم تبث بعد'), 'Arabic notice confirms camera is not yet streaming');

  // Connected state: Only real human if provider confirmed
  const fakeConnected = updateAssistanceSessionState(connectingSession, 'connected', false);
  assert(fakeConnected.isRealHumanConnected === false, 'Refuses to claim human connected without real provider confirmation');

  const realConnected = updateAssistanceSessionState(connectingSession, 'connected', true);
  assert(realConnected.isRealHumanConnected === true, 'Confirms human connected only with verified provider confirmation');
  assert(realConnected.isCameraActive === true, 'Camera active when verified stream is established');
  assert(realConnected.isMicrophoneActive === true, 'Microphone active when verified stream is established');
  assert(realConnected.sharingNoticeAr.includes('بث حي نشط'), 'Provides prominent Arabic live sharing notification');

  // Instant Kill Switch
  const killedSession = updateAssistanceSessionState(realConnected, 'disconnected');
  assert(killedSession.state === 'disconnected', 'Kill switch transitions to disconnected state');
  assert(killedSession.isRealHumanConnected === false, 'Human connection is severed immediately');
  assert(killedSession.isCameraActive === false, 'Camera feed terminated immediately');
  assert(killedSession.isMicrophoneActive === false, 'Microphone audio terminated immediately');

  // Unavailable honest disclosure (no fake volunteers)
  const unavailableSession = updateAssistanceSessionState(session, 'unavailable');
  assert(unavailableSession.sharingNoticeAr.includes('لا يوجد متطوع بشري') && unavailableSession.sharingNoticeAr.includes('لا نقوم بمحاكاة'), 'Truthfully discloses volunteer unavailability without simulation');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. HANDWRITING READER (UNCERTAINTY & REPLAY SOURCE)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 3. Handwriting Reader (Uncertainty & Source Inspection)');
  const sampleHandwriting = 'عقار ميتفورمين 500mg قرص واحد يومياً بعد العشاء مع فحص السكر [أسبوعياً?]';
  const hwResult = parseHandwrittenText(sampleHandwriting, 0.82, 'Arabic');

  assert(hwResult.cleanedText.includes('ميتفورمين'), 'Recognizes medications in Arabic handwriting');
  assert(hwResult.hasUncertainty === true, 'Flags uncertain bracketed handwriting tokens');
  assert(hwResult.uncertainWordsCount >= 1, 'Records at least 1 uncertain word');

  const uncertainToken = hwResult.tokens.find((t) => t.isUncertain);
  assert(!!uncertainToken, 'Found designated uncertain token in token list');
  assert(uncertainToken?.confidence! < 0.82, 'Uncertain token confidence is below threshold');

  assert(!!hwResult.uncertaintyWarningAr && hwResult.uncertaintyWarningAr.includes('غير مؤكدة'), 'Includes explicit Arabic uncertainty warning');
  assert(hwResult.sourceReplayNoticeAr.includes('تكبير الصورة الأصلية') || hwResult.sourceReplayNoticeAr.includes('الأصل'), 'Provides source image replay and zoom instructions');

  // Clear handwriting without uncertainty
  const clearHandwriting = 'Doctor clinic prescription clear notes';
  const clearHwResult = parseHandwrittenText(clearHandwriting, 0.82, 'English');
  assert(clearHwResult.hasUncertainty === false, 'Clear handwriting with high confidence has no uncertainty flags');
  assert(clearHwResult.uncertainWordsCount === 0, 'Uncertain words count is zero');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. FORM ASSISTANT (REQUIRED VS. OPTIONAL & NO DATA FABRICATION)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 4. Form Assistant (Required vs. Optional & Anti-Fabrication)');
  const formExplanation = analyzeCommunicationForm('استمارة تسجيل كارت الخدمات المتكاملة', 'Arabic');

  assert(formExplanation.fields.length >= 5, 'Extracted at least 5 form fields');
  assert(formExplanation.requiredCount > 0, 'Identified required fields count');
  assert(formExplanation.optionalCount > 0, 'Identified optional fields count');

  const nationalIdField = formExplanation.fields.find((f) => f.fieldCategory === 'national_id');
  assert(!!nationalIdField, 'Form includes sensitive national ID field');
  assert(nationalIdField?.isRequired === true, 'National ID field is designated as required');
  assert(nationalIdField?.instructionAr.includes('لا يخمن') || nationalIdField?.instructionAr.includes('سري'), 'Instruction warns that app never guesses national ID');

  const optionalField = formExplanation.fields.find((f) => f.fieldCategory === 'email' || f.fieldCategory === 'address');
  assert(!!optionalField && optionalField.isRequired === false, 'Correctly marks non-critical fields as optional');

  assert(
    formExplanation.safetyAntiFabricationRuleAr.includes('يمتنع رفيقي تماماً عن تخمين أو اختراع أي بيانات شخصية'),
    'Enforces explicit anti-fabrication rule for missing personal data'
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. VOICE MESSAGE TOOLS (TRANSCRIPTION & SUMMARY WITH AUDIO PRESERVED)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 5. Voice Message Tools (Transcription & Separate Audio Storage)');
  const voiceTranscription = transcribeVoiceMessage(
    'incoming_voice_note.m4a',
    28,
    'السلام عليكم، بخصوص ميعاد المحاضرة يوم الثلاثاء الساعة عشرة صباحاً في المبنى المركزي.',
    0.93,
    'Arabic'
  );

  assert(voiceTranscription.originalAudioPreserved === true, 'Explicitly preserves original audio file separately');
  assert(voiceTranscription.transcriptText.includes('الثلاثاء'), 'Transcribes voice note content accurately');
  assert(voiceTranscription.summaryText.length > 10, 'Generates concise summary of voice message');
  assert(voiceTranscription.externalProcessingNoticeAr.includes('محفوظ على جهازك'), 'Privacy notice explains audio storage and processing');

  // Low confidence audio flags uncertain segments
  const noisyVoice = transcribeVoiceMessage('noisy_memo.m4a', 15, 'صوت غير واضح بالمرة', 0.72, 'Arabic');
  assert(noisyVoice.uncertainSegments.length > 0, 'Low confidence voice audio (0.72) marks uncertain segments with timestamps');

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. SOCIAL & MESSAGING ASSISTANT (IMAGE DESCRIPTION & SAFE DRAFTING)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 6. Social & Messaging Assistant (Image Description & Safe Drafting)');
  const imageDesc = describeSocialMessageImage(
    'جدول مواعيد القطارات المتجهة من القاهرة للإسكندرية',
    'قطار 905 مكيف قيام 08:00 صباحاً',
    'Arabic'
  );
  assert(imageDesc.descriptionAr.includes('جدول مواعيد'), 'Provides objective description of incoming message image');
  assert(imageDesc.textInsideImage?.includes('قطار 905') === true, 'Extracts text embedded within social image');

  // Reply Drafter
  const draftPolite = draftSocialReplyMessage('هل يمكنك تأكيد الحضور غداً؟', 'polite', 'Arabic');
  assert(draftPolite.tone === 'polite', 'Drafts polite reply tone');
  assert(draftPolite.canSendDirectly === false, 'Strict invariant: canSendDirectly is always false');
  assert(draftPolite.sendSafetyNoticeAr.includes('لن يتم إرسال أو نشر أي رسالة بدون مراجعتك'), 'Includes review-before-send boundary notice');

  const draftFormal = draftSocialReplyMessage('Meeting scheduled', 'formal', 'English');
  assert(draftFormal.tone === 'formal', 'Drafts formal English reply');

  // Safe Send Boundary Validator
  const unapprovedDispatch = verifySafeSendBoundary(false);
  assert(unapprovedDispatch.allowedToSend === false, 'Blocks automated dispatch when user has not explicitly approved');
  assert(unapprovedDispatch.reasonAr.includes('مرفوض') || unapprovedDispatch.reasonAr.includes('يُمنع'), 'Explains rejection reason in Arabic');

  const approvedDispatch = verifySafeSendBoundary(true);
  assert(approvedDispatch.allowedToSend === true, 'Allows copy/dispatch once user explicitly approves review');

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. CURRENCY & PAYMENT GUIDANCE (STRICT ANTI-TRANSACTION & ANTI-COUNTERFEIT)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 7. Currency & Payment Guidance (Anti-Transaction & Anti-Counterfeit)');
  const fawrySlip = 'إشعار دفع خدمة فوري رقم الكود: 78923412 المطلوب: 180 ج.م';
  const paymentFawry = evaluatePaymentGuidance(fawrySlip, 'مئتا جنيه مصري (200 EGP)', 'Arabic');

  assert(paymentFawry.hasPaymentInstructions === true, 'Identifies payment slip instructions');
  assert(paymentFawry.paymentProviderDetected === 'fawry', 'Detects Fawry payment service');
  assert(paymentFawry.referenceNumber === '78923412', 'Extracts reference payment code 78923412');
  assert(paymentFawry.dueAmount?.includes('180') === true, 'Extracts due amount 180 EGP');
  assert(paymentFawry.isTransactionAllowed === false, 'Strict invariant: isTransactionAllowed is always false');
  assert(
    paymentFawry.antiCounterfeitDisclaimerAr.includes('لا يمكن للكاميرا البصرية الجزم بصحة أو تزييف الأوراق النقدية'),
    'Strict anti-counterfeiting invariant: camera cannot certify genuine or counterfeit banknotes'
  );
  assert(
    paymentFawry.guidanceTextAr.includes('لا ينفذ أي تحويل مالي أو دفع إلكتروني'),
    'Strict no-transaction invariant: forbids executing payments or transfers'
  );

  const instapaySlip = 'InstaPay Transfer to user@instapay amount 500 EGP';
  const paymentInstapay = evaluatePaymentGuidance(instapaySlip, undefined, 'English');
  assert(paymentInstapay.paymentProviderDetected === 'instapay', 'Detects InstaPay service');
  assert(paymentInstapay.antiCounterfeitDisclaimerEn.includes('CANNOT determine whether a banknote is genuine or counterfeit'), 'English anti-counterfeit disclaimer present');

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. ANTI-VIOLATION CLAIM VALIDATOR FOR COMMUNICATE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 8. Anti-Violation Claim Validator for Communicate');
  const safeText = 'Here is the Fawry payment code 12345. Please check the amount and pay at your local store.';
  assert(verifySafeCommunicateClaims(safeText).isSafe === true, 'Approves safe informational payment guidance');

  const dangerousTx = 'Rafiqi will execute payment and debit your account immediately';
  assert(verifySafeCommunicateClaims(dangerousTx).isSafe === false, 'Flags violation: executing payment transaction');

  const dangerousCounterfeit = 'This 200 EGP bill is guaranteed genuine and 100% authentic banknote';
  assert(verifySafeCommunicateClaims(dangerousCounterfeit).isSafe === false, 'Flags violation: guaranteeing counterfeit-free banknote visually');

  const dangerousAutoSend = 'Message was sent automatically without review';
  assert(verifySafeCommunicateClaims(dangerousAutoSend).isSafe === false, 'Flags violation: auto-sending messages without review');

  const dangerousFakeVolunteer = 'A live human volunteer simulated in background';
  assert(verifySafeCommunicateClaims(dangerousFakeVolunteer).isSafe === false, 'Flags violation: simulated fake volunteer');

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. NAVIGATION ROUTING & DEEP LINKING
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 9. Navigation Routing & Deep Linking');
  assert(VALID_VIEWS.includes('communication') || VALID_VIEWS.includes('communicate'), 'VALID_VIEWS includes "communication"');

  const routeClean = parseRoute('#communication');
  assert(routeClean.view === 'communication', 'parseRoute("#communication") returns view="communication"');

  const routeTool = parseRoute('#communication/handwriting');
  assert(routeTool.view === 'communication', 'parseRoute("#communication/handwriting") returns view="communication"');
  assert((routeTool.tab as any) === 'handwriting', 'parseRoute parses tab="handwriting"');
  assert(routeTool.params?.tool === 'handwriting', 'parseRoute parses params.tool="handwriting"');

  const hashComm = buildHash({ view: 'communication' });
  assert(hashComm === '#communication', 'buildHash({ view: "communication" }) returns "#communication"');

  const hashCommTool = buildHash({ view: 'communication', tab: 'voice_notes' as any });
  assert(hashCommTool === '#communication/voice_notes', 'buildHash with tool returns "#communication/voice_notes"');

  const titleAr = getRouteTitle({ view: 'communication' }, 'Arabic');
  assert(titleAr.includes('التواصل'), 'getRouteTitle in Arabic returns Communicate title');

  const titleEn = getRouteTitle({ view: 'communication' }, 'English');
  assert(titleEn.includes('Communicate'), 'getRouteTitle in English returns Communicate title');

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. UNIFIED BLUE DESIGN SYSTEM & ZERO #00AEB8 COMPLIANCE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 10. Unified Blue Design System & Zero #00AEB8 Compliance');
  const engineContent = readFileSync(resolve('src/lib/communicateEngine.ts'), 'utf8');
  assert(!engineContent.includes('#00AEB8'), 'src/lib/communicateEngine.ts contains ZERO legacy cyan #00AEB8');

  const viewContent = readFileSync(resolve('src/components/AccessibleCommunicateWorkspaceView.tsx'), 'utf8');
  assert(!viewContent.includes('#00AEB8'), 'src/components/AccessibleCommunicateWorkspaceView.tsx contains ZERO legacy cyan #00AEB8');
  assert(viewContent.includes('#1769AA'), 'AccessibleCommunicateWorkspaceView uses Unified Blue #1769AA primary brand');
  assert(viewContent.includes('#0D4778'), 'AccessibleCommunicateWorkspaceView uses Unified Blue #0D4778 navy dark');
  assert(viewContent.includes('#112C4F'), 'AccessibleCommunicateWorkspaceView uses Unified Blue #112C4F surface');
  assert(viewContent.includes('#0A2342'), 'AccessibleCommunicateWorkspaceView uses Unified Blue #0A2342 deep background');
  assert(viewContent.includes('role="region"'), 'AccessibleCommunicateWorkspaceView provides semantic ARIA regions');
  assert(viewContent.includes('aria-live'), 'AccessibleCommunicateWorkspaceView provides aria-live announcements');

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`   PHASE 11 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED   `);
  console.log('══════════════════════════════════════════════════════════════════\n');

  return { passed, failed };
}

// Allow direct CLI execution
if (process.argv[1]?.includes('phase11CommunicateVerification')) {
  runPhase11CommunicateTests()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal Phase 11 test execution error:', err);
      process.exit(1);
    });
}
