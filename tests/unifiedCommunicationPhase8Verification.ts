/**
 * Rafiqi — Phase 8: Unified Two-Way Communication Verification Suite
 *
 * Verifies:
 * 1. Cross-subsystem integration (Live Conversation, Sound Awareness, Sign Language, AAC)
 * 2. Five canonical accessibility workflows:
 *    - Deaf user: live captions + typed text
 *    - Hard-of-hearing user: ambient sound alerts in timeline
 *    - Non-speaking user: AAC composition + text-to-speech injection
 *    - Sign dictionary consultation & in-dialogue reference
 *    - Captions with persistent saved conversation notes
 * 3. Strict Meaning Preservation Invariants:
 *    - Retention of originalRawText on user edits
 *    - Undo last edit capability
 *    - Non-destructive AI summaries (independent provenance)
 *    - Honest uncertainty flagging for low-confidence speech/signs
 *    - Confirmation safeguard for critical/emergency messages
 * 4. Error Recovery & Interruption Handling (retry, fallback to text, cancel)
 */

import { UnifiedCommunicationEngine } from '../src/modules/hearAndExpress/unifiedCommunication/unifiedCommunicationEngine';
import type { SoundAlert } from '../src/modules/hearAndExpress/soundAwareness';

export async function runUnifiedCommunicationPhase8Verification(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      failed++;
      errors.push(message);
      console.error(`  ❌ FAILED: ${message}`);
    }
  }

  console.log('\n================================================================');
  console.log('--- Rafiqi Phase 8: Unified Two-Way Communication ---');
  console.log('================================================================\n');

  const engine = new UnifiedCommunicationEngine();

  // ----------------------------------------------------
  // SECTION 1: Cross-Module Subsystems Initialization
  // ----------------------------------------------------
  console.log('--- [Section 1] Cross-Module Subsystems Initialization ---');

  assert(Boolean(engine.conversation), 'Subsystem initialized: Live Conversation Engine');
  assert(Boolean(engine.soundAwareness), 'Subsystem initialized: Sound Awareness Engine');
  assert(Boolean(engine.signLanguage), 'Subsystem initialized: Sign Language Service');
  assert(Boolean(engine.signDictionary), 'Subsystem initialized: Expert Sign Dictionary');
  assert(Boolean(engine.avatarValidator), 'Subsystem initialized: Avatar Motion Validator');
  assert(Boolean(engine.aac), 'Subsystem initialized: Personal AAC Engine');

  const initialStatus = engine.getSystemStatus();
  assert(initialStatus.ambientDecibels > 0, 'Status reports ambient acoustic level');
  assert(initialStatus.activeAacBoardId === 'board_standard', 'Status reports active AAC board');

  // Test workflow mode switching
  engine.setWorkflowMode('hoh_sound_alerts');
  assert(engine.getWorkflowMode() === 'hoh_sound_alerts', 'Switches workflow mode to hard-of-hearing sound alerts');
  engine.setWorkflowMode('deaf_text_captions');
  assert(engine.getWorkflowMode() === 'deaf_text_captions', 'Switches workflow mode to deaf text captions');

  // ----------------------------------------------------
  // SECTION 2: Workflow 1 — Deaf User Captions + Typed Reply
  // ----------------------------------------------------
  console.log('\n--- [Section 2] Workflow 1: Deaf User Captions + Typed Reply ---');

  const incomingMsg = engine.addIncomingTranscript('مرحباً بك، كيف يمكننا مساعدتك اليوم؟', 'Arabic', 0.95, true);
  assert(incomingMsg.sender === 'other', 'Incoming speaker attributed correctly');
  assert(incomingMsg.provenance === 'original_transcript', 'Incoming speech tagged as original_transcript');
  assert(incomingMsg.originalRawText === 'مرحباً بك، كيف يمكننا مساعدتك اليوم؟', 'Original raw text preserved');
  assert(incomingMsg.isUncertain === false, 'High confidence speech marked isUncertain: false');

  const userReply = engine.sendUserMessage('أنا أصم، أرجو إطلاعي على التعليمات مكتوبة هنا.', {
    confirmedByUser: true,
  });
  assert(userReply.success === true && userReply.message !== undefined, 'User typed reply transmitted');
  assert(userReply.message?.sender === 'user', 'User sender attributed correctly');
  assert(userReply.message?.provenance === 'user_typed', 'User message tagged as user_typed');

  // ----------------------------------------------------
  // SECTION 3: Workflow 2 — Sound Awareness Alert Injection
  // ----------------------------------------------------
  console.log('\n--- [Section 3] Workflow 2: Sound Awareness Alert Injection ---');

  const mockFireAlert: SoundAlert = {
    id: 'alert_fire_123',
    type: 'alarm',
    category: 'emergency_siren',
    labelAr: 'إنذار حريق / طوارئ',
    labelEn: 'Fire Alarm / Emergency',
    decibels: 92,
    severity: 'danger',
    confidence: 0.96,
    confidenceScore: 0.96,
    timestamp: Date.now(),
    explanationAr: 'تم رصد صافرة إنذار مستمرة عالية التردد.',
    explanationEn: 'High-frequency continuous alarm siren detected.',
  };

  const soundAlertMsg = engine.injectAmbientSoundAlert(mockFireAlert);
  assert(soundAlertMsg.sender === 'ambient_sound', 'Alert attributed to ambient_sound sender');
  assert(soundAlertMsg.provenance === 'ambient_sound_alert', 'Alert tagged as ambient_sound_alert provenance');
  assert(soundAlertMsg.soundAlertMetadata?.decibels === 92, 'Preserves sound alert acoustic decibel metadata');
  assert(soundAlertMsg.text.includes('إنذار حريق'), 'Visual banner message generated for deaf user timeline');

  // ----------------------------------------------------
  // SECTION 4: Workflow 3 — Non-Speaking AAC Injection & TTS
  // ----------------------------------------------------
  console.log('\n--- [Section 4] Workflow 3: Non-Speaking AAC Injection & TTS ---');

  const waterCard = engine.aac.getSymbols('food_and_drink').find((s) => s.id === 'aac_day_water')!;
  const thanksCard = engine.aac.getSymbols('social_communication').find((s) => s.id === 'aac_day_thanks')!;

  engine.aac.clearSentence();
  engine.aac.addSymbolToSentence(waterCard);
  engine.aac.addSymbolToSentence(thanksCard);

  const aacInjectedMsg = engine.injectAacSentenceToConversation(true);
  assert(aacInjectedMsg !== null, 'AAC sentence successfully injected into conversation timeline');
  assert(aacInjectedMsg?.sender === 'user', 'Injected AAC message attributed to user');
  assert(aacInjectedMsg?.provenance === 'aac_composed', 'Tagged as aac_composed provenance');
  assert(aacInjectedMsg?.aacSymbolsUsed?.length === 2, 'Preserves AAC symbol cards metadata');
  assert(engine.aac.getCurrentSentence().symbols.length === 0, 'Clears sentence buffer in AAC engine after injection');

  // ----------------------------------------------------
  // SECTION 5: Workflow 4 — Sign Dictionary In-Conversation Consult
  // ----------------------------------------------------
  console.log('\n--- [Section 5] Workflow 4: Sign Dictionary Consultation ---');

  const lookupResults = engine.consultSignDictionary('سلام عليكم');
  assert(lookupResults.length > 0, 'Consults verified sign dictionary and returns matching entries');

  const salamSignId = lookupResults[0].id;
  const linkedSignMsg = engine.linkSignEntryToConversation(salamSignId);
  assert(linkedSignMsg !== null, 'Links verified sign entry into conversation timeline');
  assert(linkedSignMsg?.provenance === 'recognized_sign', 'Linked sign tagged as recognized_sign');
  assert(linkedSignMsg?.signEntryMetadata?.verifiedSignLabel === 'salam_alaykum', 'Preserves verified gloss label');

  // ----------------------------------------------------
  // SECTION 6: Workflow 5 — Saved Conversation Notes
  // ----------------------------------------------------
  console.log('\n--- [Section 6] Workflow 5: Saved Conversation Notes ---');

  const allMsgs = engine.getMessages();
  const targetIds = [incomingMsg.id, userReply.message!.id];

  const note = engine.createNoteFromMessages(targetIds, 'ملخص اتفاق اللقاء والمواعيد');
  assert(note.sourceMessageIds.length === 2, 'Note references 2 source conversation messages');
  assert(note.rawContent.includes('مرحباً بك') && note.rawContent.includes('أنا أصم'), 'Note aggregates raw conversation content');
  assert(engine.getNotes().length === 1, 'Note saved in persistent notes registry');

  const deleteNoteSuccess = engine.deleteNote(note.noteId);
  assert(deleteNoteSuccess === true && engine.getNotes().length === 0, 'Allows deleting conversation note');

  // ----------------------------------------------------
  // SECTION 7: Strict Meaning Preservation Invariants
  // ----------------------------------------------------
  console.log('\n--- [Section 7] Strict Meaning Preservation Invariants ---');

  // Invariant 1: Editing preserves originalRawText
  const rawMsg = engine.addIncomingTranscript('أريد أن أذهب إلى المحطة', 'Arabic', 0.90, true);
  engine.editTranscript(rawMsg.id, 'أريد أن أذهب إلى محطة القطار المركزية');

  const updatedMsg = engine.getMessages().find((m) => m.id === rawMsg.id)!;
  assert(updatedMsg.text === 'أريد أن أذهب إلى محطة القطار المركزية', 'Transcript text updated with user correction');
  assert(updatedMsg.provenance === 'user_edited_transcript', 'Provenance transparently updated to user_edited_transcript');
  assert(updatedMsg.originalRawText === 'أريد أن أذهب إلى المحطة', 'Strict invariant: originalRawText remains intact');

  // Invariant 2: Undo edit restores previous state
  const undoSuccess = engine.undoLastEdit();
  assert(undoSuccess === true, 'Successfully undid transcript edit');
  const restoredMsg = engine.getMessages().find((m) => m.id === rawMsg.id)!;
  assert(restoredMsg.text === 'أريد أن أذهب إلى المحطة', 'Restores previous text');
  assert(restoredMsg.provenance === 'original_transcript', 'Restores original provenance');

  // Invariant 3: Non-destructive AI summary
  const summaryMsg = engine.addAiSummary([rawMsg.id], 'ملخص: المستخدم يرغب في التوجه إلى المحطة.');
  assert(summaryMsg.provenance === 'ai_generated_summary', 'Summary created with independent ai_generated_summary provenance');
  assert(engine.getMessages().find((m) => m.id === rawMsg.id)?.text === 'أريد أن أذهب إلى المحطة', 'Original message was NOT replaced or overwritten by summary');

  // Invariant 4: Low-confidence speech & sign uncertainty grounding
  const lowConfSpeech = engine.addIncomingTranscript('كلمة غير واضحة في الضوضاء', 'Arabic', 0.45, true);
  assert(lowConfSpeech.isUncertain === true, 'Low confidence speech (< 0.65) strictly flagged isUncertain: true');

  const lowConfSign = engine.addRecognizedSign('hand_wave', 0.50, 'إشارة مشكوك فيها');
  assert(lowConfSign.isUncertain === true, 'Low confidence sign gesture strictly flagged isUncertain: true');

  // Invariant 5: Emergency Confirmation Guard
  const unconfirmedEmergency = engine.sendUserMessage('هناك حالة طوارئ بالخارج!', {
    confirmedByUser: false,
  });
  assert(
    unconfirmedEmergency.success === false && unconfirmedEmergency.error?.includes('Confirmation required'),
    'Emergency message blocked without explicit confirmation'
  );

  const confirmedEmergency = engine.sendUserMessage('هناك حالة طوارئ بالخارج!', {
    confirmedByUser: true,
  });
  assert(confirmedEmergency.success === true, 'Emergency message allowed with explicit confirmation');

  // ----------------------------------------------------
  // SECTION 8: Error Recovery & Interruption Handling
  // ----------------------------------------------------
  console.log('\n--- [Section 8] Error Recovery & Interruption Handling ---');

  // Report error
  engine.reportError(
    'network_interruption',
    'انقطع الاتصال بالشبكة مؤقتاً.',
    'Network connection temporarily interrupted.',
    ['retry', 'fallback_to_text', 'cancel']
  );

  let currentStatus = engine.getSystemStatus();
  assert(currentStatus.activeError !== null, 'Active error reported in system status');
  assert(currentStatus.activeError?.type === 'network_interruption', 'Error type correctly recorded');
  assert(currentStatus.activeError?.isRecoverable === true, 'Error flagged as recoverable');

  // Test fallback to text
  engine.fallbackToTextMode();
  currentStatus = engine.getSystemStatus();
  assert(currentStatus.activeError === null, 'Error cleared on fallback to text');
  assert(engine.getWorkflowMode() === 'deaf_text_captions', 'Workflow safely switched to deaf_text_captions');

  // Test retry operation
  engine.reportError('permission_denied', 'تم رفض إذن الميكروفون', 'Microphone permission denied', ['retry']);
  const retryResult = engine.retryLastOperation();
  assert(retryResult === true && engine.getSystemStatus().activeError === null, 'Retry operation clears error state');

  console.log('\n================================================================');
  console.log(`Phase 8 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  return { passed, failed, errors };
}

// Direct execution when run via tsx
if (process.argv[1]?.includes('unifiedCommunicationPhase8Verification')) {
  runUnifiedCommunicationPhase8Verification()
    .then((result) => {
      if (result.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
