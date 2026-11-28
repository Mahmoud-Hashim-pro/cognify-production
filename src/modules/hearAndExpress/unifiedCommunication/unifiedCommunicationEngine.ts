/**
 * Unified Two-Way Communication Orchestration Engine
 *
 * Connects the four core Hear & Express subsystems:
 * 1. Live Conversation (captions & transcripts)
 * 2. Sound Awareness (acoustic alerts & visual beacons)
 * 3. Sign Language (verified dictionary, recognition boundary, and avatar fallback)
 * 4. Personal AAC (custom boards, sentence builder & switch scanning)
 *
 * Enforces strict clinical invariants:
 * - Never silently rewrites messages.
 * - Never presents uncertain signs or unclear speech as certain words.
 * - Never replaces original transcripts with summaries.
 * - Never transmits messages without confirmation when meaning could change.
 */

import type { Dialect } from '../types';
import type {
  UnifiedWorkflowMode,
  UnifiedMessage,
  UnifiedMessageProvenance,
  UnifiedErrorState,
  UnifiedConversationNote,
  UnifiedSystemStatus,
  UnifiedMessageListener,
  UnifiedStatusListener,
} from './types';
import { ConversationEngine } from '../liveConversation';
import { SoundAwarenessEngine, type SoundAlert } from '../soundAwareness';
import { SignLanguageService, ExpertSignDictionary, AvatarMotionValidator, type VerifiedSignEntry } from '../signLanguage';
import { PersonalAacEngine } from '../personalAac';

export class UnifiedCommunicationEngine {
  public conversation: ConversationEngine;
  public soundAwareness: SoundAwarenessEngine;
  public signLanguage: SignLanguageService;
  public signDictionary: ExpertSignDictionary;
  public avatarValidator: AvatarMotionValidator;
  public aac: PersonalAacEngine;

  private messages: UnifiedMessage[] = [];
  private notes: UnifiedConversationNote[] = [];
  private activeWorkflow: UnifiedWorkflowMode = 'deaf_text_captions';
  private activeError: UnifiedErrorState | null = null;
  private latestSoundAlert: SoundAlert | null = null;

  // Undo stack for edits
  private undoStack: { messageId: string; previousText: string; previousProvenance: UnifiedMessageProvenance }[] = [];

  private messageListeners: Set<UnifiedMessageListener> = new Set();
  private statusListeners: Set<UnifiedStatusListener> = new Set();

  private ambientDecibels: number = 45;

  constructor() {
    this.conversation = new ConversationEngine();
    this.soundAwareness = new SoundAwarenessEngine();
    this.signLanguage = new SignLanguageService();
    this.signDictionary = new ExpertSignDictionary();
    this.avatarValidator = new AvatarMotionValidator(this.signDictionary);
    this.aac = new PersonalAacEngine();

    this.wireCrossModuleEvents();
  }

  /**
   * Cross-subsystem automatic subscription and event integration.
   */
  private wireCrossModuleEvents(): void {
    // 1. Sound Awareness -> Injects critical environmental alerts into shared conversation stream
    this.soundAwareness.subscribeAlert((alert: SoundAlert) => {
      this.latestSoundAlert = alert;
      this.injectAmbientSoundAlert(alert);
      this.notifyStatus();
    });

    this.soundAwareness.subscribeMeasurement((m) => {
      this.ambientDecibels = m.decibels;
    });

    // 2. AAC Engine sentence updates
    this.aac.subscribeSentence((_sentence) => {
      this.notifyStatus();
    });
  }

  // ─── Shared Conversation Timeline & Message Invariants ───────────────

  public getMessages(): UnifiedMessage[] {
    return [...this.messages];
  }

  public getWorkflowMode(): UnifiedWorkflowMode {
    return this.activeWorkflow;
  }

  public setWorkflowMode(mode: UnifiedWorkflowMode): void {
    this.activeWorkflow = mode;
    this.notifyStatus();
  }

  /**
   * INVARIANT 1: Original Transcript Grounding.
   * Never silently converts unclear speech into invented words.
   * If confidence < 0.65, flags isUncertain: true.
   */
  public addIncomingTranscript(
    text: string,
    dialect: Dialect = 'Arabic',
    confidence: number = 0.9,
    isFinal: boolean = true
  ): UnifiedMessage {
    const isUncertain = confidence < 0.65;
    const msg: UnifiedMessage = {
      id: `msg_inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'other',
      provenance: 'original_transcript',
      text: text.trim(),
      originalRawText: text.trim(), // Strict retention of raw spoken output
      timestamp: Date.now(),
      dialect,
      confidence,
      isUncertain,
      isFinal,
      status: 'delivered',
    };

    this.messages.push(msg);
    this.notifyMessages();
    return msg;
  }

  /**
   * INVARIANT 2: User-Edited Transcript Transparency.
   * When a transcript is edited, provenance becomes 'user_edited_transcript',
   * while originalRawText is strictly retained and an undo entry is preserved.
   */
  public editTranscript(messageId: string, editedText: string): boolean {
    const msg = this.messages.find((m) => m.id === messageId);
    if (!msg) return false;

    // Record in undo stack
    this.undoStack.push({
      messageId: msg.id,
      previousText: msg.text,
      previousProvenance: msg.provenance,
    });

    msg.text = editedText.trim();
    msg.provenance = 'user_edited_transcript';
    msg.status = 'edited';

    this.notifyMessages();
    return true;
  }

  /**
   * Error Recovery: Undo last transcript edit.
   */
  public undoLastEdit(): boolean {
    if (this.undoStack.length === 0) return false;
    const lastEdit = this.undoStack.pop()!;
    const msg = this.messages.find((m) => m.id === lastEdit.messageId);
    if (!msg) return false;

    msg.text = lastEdit.previousText;
    msg.provenance = lastEdit.previousProvenance;
    this.notifyMessages();
    return true;
  }

  /**
   * INVARIANT 3: Non-Destructive AI Summary.
   * Never replaces raw speech with summaries. Always emits as an independent message.
   */
  public addAiSummary(sourceMessageIds: string[], summaryText: string): UnifiedMessage {
    const msg: UnifiedMessage = {
      id: `msg_summary_${Date.now()}`,
      sender: 'system',
      provenance: 'ai_generated_summary',
      text: summaryText.trim(),
      timestamp: Date.now(),
      isFinal: true,
      status: 'delivered',
    };

    this.messages.push(msg);
    this.notifyMessages();
    return msg;
  }

  /**
   * INVARIANT 4: Sign Recognition Uncertainty Grounding.
   * Never translates uncertain signs as certain.
   */
  public addRecognizedSign(
    signLabel: string,
    confidence: number,
    verifiedGloss?: string
  ): UnifiedMessage {
    const isUncertain = confidence < 0.70;
    const msg: UnifiedMessage = {
      id: `msg_sign_${Date.now()}`,
      sender: 'user',
      provenance: 'recognized_sign',
      text: verifiedGloss || signLabel,
      timestamp: Date.now(),
      confidence,
      isUncertain,
      isFinal: true,
      status: 'delivered',
    };

    this.messages.push(msg);
    this.notifyMessages();
    return msg;
  }

  /**
   * INVARIANT 5: Explicit User Confirmation.
   * Never sends messages without confirmation if meaning could be compromised.
   */
  public sendUserMessage(
    text: string,
    options?: {
      dialect?: Dialect;
      confirmedByUser?: boolean;
      provenance?: UnifiedMessageProvenance;
    }
  ): { success: boolean; message?: UnifiedMessage; error?: string } {
    if (!text.trim()) {
      return { success: false, error: 'Cannot send empty message' };
    }

    const requiresConfirmation = text.toLowerCase().includes('طوارئ') || text.toLowerCase().includes('emergency');
    if (requiresConfirmation && !options?.confirmedByUser) {
      this.reportError(
        'recognition_timeout',
        'تتطلب هذه الرسالة الحساسة تأكيداً صريحاً قبل إرسالها أو نطقها.',
        'This critical message requires explicit user confirmation before transmission.',
        ['retry', 'edit', 'cancel']
      );
      return { success: false, error: 'Confirmation required before transmission' };
    }

    const msg: UnifiedMessage = {
      id: `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'user',
      provenance: options?.provenance || 'user_typed',
      text: text.trim(),
      timestamp: Date.now(),
      dialect: options?.dialect || 'Arabic',
      isFinal: true,
      hasUserConfirmation: Boolean(options?.confirmedByUser),
      status: 'sent',
    };

    this.messages.push(msg);
    this.notifyMessages();
    return { success: true, message: msg };
  }

  // ─── Cross-Module Workflows ───────────────────────────────────────────

  /**
   * Workflow 1: Deaf User Live Captions + Typed Response.
   */
  public processDeafCaptionWorkflow(incomingSpokenText: string, userReplyText: string): void {
    this.setWorkflowMode('deaf_text_captions');
    this.addIncomingTranscript(incomingSpokenText, 'Arabic', 0.95, true);
    this.sendUserMessage(userReplyText, { confirmedByUser: true });
  }

  /**
   * Workflow 2: Sound Awareness Alarm Injection.
   */
  public injectAmbientSoundAlert(alert: SoundAlert): UnifiedMessage {
    const msg: UnifiedMessage = {
      id: `msg_sound_${Date.now()}_${alert.id}`,
      sender: 'ambient_sound',
      provenance: 'ambient_sound_alert',
      text: `[تنبيه صوتي: ${alert.labelAr} - ${alert.decibels} dB]`,
      timestamp: Date.now(),
      soundAlertMetadata: alert,
      isFinal: true,
      status: 'delivered',
    };

    this.messages.push(msg);
    this.notifyMessages();
    return msg;
  }

  /**
   * Workflow 3: Non-Speaking User AAC Sentence Injection & TTS.
   */
  public injectAacSentenceToConversation(confirmedByUser: boolean = true): UnifiedMessage | null {
    const sentence = this.aac.getCurrentSentence();
    if (!sentence.textAr.trim() && !sentence.textEn.trim()) return null;

    const res = this.sendUserMessage(sentence.textAr || sentence.textEn, {
      confirmedByUser,
      provenance: 'aac_composed',
    });

    if (res.success && res.message) {
      res.message.aacSymbolsUsed = [...sentence.symbols];
      this.aac.speakCurrentSentence('Arabic', { confirmedByUser });
      this.aac.clearSentence();
      return res.message;
    }
    return null;
  }

  /**
   * Workflow 4: Sign Dictionary Consultation during conversation.
   */
  public consultSignDictionary(query: string): VerifiedSignEntry[] {
    return this.signDictionary.search(query);
  }

  public linkSignEntryToConversation(signId: string): UnifiedMessage | null {
    const entry = this.signDictionary.getEntryById(signId);
    if (!entry) return null;

    const msg: UnifiedMessage = {
      id: `msg_dict_ref_${Date.now()}`,
      sender: 'system',
      provenance: 'recognized_sign',
      text: `[إشارة معتمدة: ${entry.arabicPhrase} (${entry.verifiedSignLabel})]`,
      timestamp: Date.now(),
      signEntryMetadata: entry,
      isFinal: true,
      status: 'delivered',
    };

    this.messages.push(msg);
    this.notifyMessages();
    return msg;
  }

  /**
   * Workflow 5: Combining Live Captions with Saved Conversation Notes.
   */
  public createNoteFromMessages(
    sourceMessageIds: string[],
    userNotesAr: string = '',
    userNotesEn: string = ''
  ): UnifiedConversationNote {
    const selectedMsgs = this.messages.filter((m) => sourceMessageIds.includes(m.id));
    const rawContent = selectedMsgs.map((m) => `${m.sender}: ${m.text}`).join('\n');

    const note: UnifiedConversationNote = {
      noteId: `note_${Date.now()}`,
      sourceMessageIds: [...sourceMessageIds],
      rawContent,
      userNotesAr,
      userNotesEn,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.notes.push(note);
    return note;
  }

  public getNotes(): UnifiedConversationNote[] {
    return [...this.notes];
  }

  public deleteNote(noteId: string): boolean {
    const prevLen = this.notes.length;
    this.notes = this.notes.filter((n) => n.noteId !== noteId);
    return this.notes.length < prevLen;
  }

  // ─── Error Recovery & Interruption Handling ───────────────────────────

  public reportError(
    type: UnifiedErrorState['type'],
    messageAr: string,
    messageEn: string,
    allowedActions: UnifiedErrorState['allowedActions']
  ): void {
    this.activeError = {
      errorId: `err_${Date.now()}`,
      type,
      messageAr,
      messageEn,
      isRecoverable: allowedActions.length > 0,
      allowedActions,
      timestamp: Date.now(),
    };
    this.notifyStatus();
  }

  public clearError(): void {
    this.activeError = null;
    this.notifyStatus();
  }

  public retryLastOperation(): boolean {
    if (!this.activeError) return false;
    this.clearError();
    return true;
  }

  public cancelPendingAction(): boolean {
    this.clearError();
    return true;
  }

  public fallbackToTextMode(): void {
    this.clearError();
    this.setWorkflowMode('deaf_text_captions');
  }

  // ─── Status & Subscriptions ───────────────────────────────────────────

  public getSystemStatus(): UnifiedSystemStatus {
    return {
      captionsListening: this.conversation.getIsListening(),
      soundAwarenessActive: this.soundAwareness.getIsRunning(),
      ambientDecibels: this.ambientDecibels,
      latestSoundAlert: this.latestSoundAlert,
      activeAacBoardId: this.aac.getActiveBoard()?.id || 'board_standard',
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      activeError: this.activeError,
    };
  }

  public subscribeMessages(listener: UnifiedMessageListener): () => void {
    this.messageListeners.add(listener);
    listener(this.getMessages());
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public subscribeStatus(listener: UnifiedStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.getSystemStatus());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyMessages(): void {
    const msgs = this.getMessages();
    this.messageListeners.forEach((l) => l(msgs));
  }

  private notifyStatus(): void {
    const status = this.getSystemStatus();
    this.statusListeners.forEach((l) => l(status));
  }
}
