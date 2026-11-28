import type { Dialect } from '../types';
import type {
  TranscriptSegment,
  ConversationNote,
  TranscriptSummary,
  LiveConversationConfig,
  ConversationListener,
  LiveStreamListener,
  CaptionVisualSettings,
  PrivacySettings,
} from './types';
import { VocabularyEngine } from './vocabularyEngine';
import { SpeechRecognitionService } from './speechRecognitionService';

export const DEFAULT_VISUAL_SETTINGS: CaptionVisualSettings = {
  textSize: 'large',
  theme: 'blue_companion',
  fontFamily: 'system',
  lineHeight: 'relaxed',
  showTimestamps: true,
  showSpeakerLabels: true,
  autoScroll: true,
  reducedMotion: false,
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  retentionPolicy: 'session_only',
  dataProcessingDisclosureAcknowledged: false,
  rawAudioStored: false, // Strict safety invariant
};

export class ConversationEngine {
  private segments: TranscriptSegment[] = [];
  private notes: ConversationNote[] = [];
  private listeners: Set<ConversationListener> = new Set();
  private streamListeners: Set<LiveStreamListener> = new Set();

  public vocabulary: VocabularyEngine;
  public speechService: SpeechRecognitionService;
  private config: LiveConversationConfig;

  // Real-time live interim preview
  private currentInterimText = '';
  private currentInterimConfidence = 0.7;

  constructor(config?: Partial<LiveConversationConfig>) {
    this.vocabulary = new VocabularyEngine();
    this.speechService = new SpeechRecognitionService();

    this.config = {
      defaultDialect: 'Arabic',
      autoSpeakOutgoing: false,
      hapticOnIncoming: true,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS, ...config?.visualSettings },
      privacy: { ...DEFAULT_PRIVACY_SETTINGS, ...config?.privacy },
      ...config,
    };

    this.loadPersistedIfAllowed();
  }

  private loadPersistedIfAllowed(): void {
    if (this.config.privacy.retentionPolicy !== 'local_storage') return;
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('rafiqi_hear_express_transcript');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.segments = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  private persistIfAllowed(): void {
    if (typeof localStorage === 'undefined') return;
    if (this.config.privacy.retentionPolicy === 'local_storage') {
      try {
        localStorage.setItem('rafiqi_hear_express_transcript', JSON.stringify(this.segments));
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem('rafiqi_hear_express_transcript');
      } catch {
        // ignore
      }
    }
  }

  public getSegments(): TranscriptSegment[] {
    return [...this.segments];
  }

  public getVisualSettings(): CaptionVisualSettings {
    return { ...this.config.visualSettings };
  }

  public updateVisualSettings(settings: Partial<CaptionVisualSettings>): void {
    this.config.visualSettings = { ...this.config.visualSettings, ...settings };
  }

  public getPrivacySettings(): PrivacySettings {
    return { ...this.config.privacy };
  }

  public setRetentionPolicy(policy: PrivacySettings['retentionPolicy']): void {
    this.config.privacy.retentionPolicy = policy;
    this.persistIfAllowed();
  }

  public subscribe(listener: ConversationListener): () => void {
    this.listeners.add(listener);
    listener(this.getSegments());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeStream(listener: LiveStreamListener): () => void {
    this.streamListeners.add(listener);
    listener(this.currentInterimText, this.currentInterimConfidence);
    return () => {
      this.streamListeners.delete(listener);
    };
  }

  private notify(): void {
    const list = this.getSegments();
    this.listeners.forEach((l) => l(list));
    this.persistIfAllowed();
  }

  private notifyStream(text: string, confidence: number): void {
    this.currentInterimText = text;
    this.currentInterimConfidence = confidence;
    this.streamListeners.forEach((l) => l(text, confidence));
  }

  /**
   * Evaluates text directionality for proper RTL / LTR presentation.
   */
  public static detectDirection(text: string, dialect?: Dialect): 'rtl' | 'ltr' {
    if (dialect === 'English') return 'ltr';
    if (dialect === 'Arabic' || dialect === 'Egyptian Ammiya') return 'rtl';

    // Fallback: check first strong letter unicode
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    return arabicRegex.test(text) ? 'rtl' : 'ltr';
  }

  /**
   * Adds a finalized transcript segment. Automatically applies vocabulary substitutions.
   */
  public addSegment(
    rawText: string,
    speaker: 'user' | 'other' | string = 'other',
    dialect?: Dialect,
    confidence = 0.9,
    speakerLabel?: string
  ): TranscriptSegment {
    const rawClean = rawText.trim();
    if (!rawClean) {
      throw new Error('Segment text cannot be empty');
    }

    const effectiveDialect = dialect || this.config.defaultDialect;
    const transformedText = this.vocabulary.applyVocabulary(rawClean);
    const direction = ConversationEngine.detectDirection(transformedText, effectiveDialect);

    const defaultLabel =
      speaker === 'user'
        ? effectiveDialect === 'English' ? 'You' : 'أنت'
        : effectiveDialect === 'English' ? 'Speaker' : 'المتحدث';

    const segment: TranscriptSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: speaker,
      speaker,
      speakerLabel: speakerLabel?.trim() || defaultLabel,
      text: transformedText,
      originalText: rawClean,
      isEdited: false,
      timestamp: Date.now(),
      dialect: effectiveDialect,
      confidence,
      isFinal: true,
      isBookmarked: false,
      isLowConfidence: confidence < 0.65,
      direction,
    };

    this.segments.push(segment);
    this.notify();

    if (speaker === 'user' && this.config.autoSpeakOutgoing) {
      this.speak(segment.text, segment.dialect);
    }

    return segment;
  }

  /**
   * Allows user in-place editing of any segment without silently losing original raw text.
   */
  public updateSegmentText(segmentId: string, newText: string): boolean {
    const target = this.segments.find((s) => s.id === segmentId);
    if (!target) return false;

    const trimmed = newText.trim();
    if (!trimmed || trimmed === target.text) return false;

    if (!target.editHistory) {
      target.editHistory = [];
    }
    target.editHistory.push({ text: target.text, timestamp: Date.now() });

    target.text = trimmed;
    target.isEdited = true;
    target.direction = ConversationEngine.detectDirection(trimmed, target.dialect);

    this.notify();
    return true;
  }

  public toggleBookmark(segmentId: string): boolean {
    const target = this.segments.find((s) => s.id === segmentId);
    if (!target) return false;

    target.isBookmarked = !target.isBookmarked;
    this.notify();
    return target.isBookmarked;
  }

  public getBookmarkedSegments(): TranscriptSegment[] {
    return this.segments.filter((s) => s.isBookmarked);
  }

  /**
   * Search conversation history using Arabic diacritic and orthographic normalization.
   */
  public search(query: string): TranscriptSegment[] {
    const q = query.trim();
    if (!q) return [];
    return this.segments.filter((s) => VocabularyEngine.isSearchMatch(q, s.text) || VocabularyEngine.isSearchMatch(q, s.originalText));
  }

  // ─── Concurrent Notes ──────────────────────────────────────────────
  public addNote(text: string, linkedSegmentId?: string): ConversationNote {
    const note: ConversationNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      timestamp: Date.now(),
      linkedSegmentId,
    };
    this.notes.push(note);
    return note;
  }

  public getNotes(): ConversationNote[] {
    return [...this.notes];
  }

  public removeNote(id: string): boolean {
    const idx = this.notes.findIndex((n) => n.id === id);
    if (idx !== -1) {
      this.notes.splice(idx, 1);
      return true;
    }
    return false;
  }

  // ─── Real-Time Speech Recognition Integration ──────────────────────
  public async startListening(dialect: Dialect = this.config.defaultDialect): Promise<boolean> {
    const langCode = SpeechRecognitionService.dialectToCode(dialect);

    const started = await this.speechService.start(langCode, {
      onInterim: (text, conf) => {
        const transformed = this.vocabulary.applyVocabulary(text);
        this.notifyStream(transformed, conf);
      },
      onFinal: (text, conf) => {
        this.notifyStream('', 1.0);
        this.addSegment(text, 'other', dialect, conf);
      },
    });

    return started;
  }

  public pauseListening(): void {
    this.speechService.pause();
    this.notifyStream('', 1.0);
  }

  public resumeListening(): void {
    this.speechService.resume();
  }

  public stopListening(): void {
    this.speechService.stop();
    this.notifyStream('', 1.0);
  }

  public getRecognitionState() {
    return this.speechService.getState();
  }

  public getIsListening(): boolean {
    const st = this.speechService.getState();
    return st === 'listening' || st === 'processing';
  }

  /**
   * Compatibility alias for addSegment.
   */
  public addMessage(
    sender: 'user' | 'other',
    text: string,
    dialect?: Dialect,
    confidence = 1.0
  ): TranscriptSegment {
    return this.addSegment(text, sender, dialect, confidence);
  }

  /**
   * Compatibility alias for getSegments.
   */
  public getMessages(): TranscriptSegment[] {
    return this.getSegments();
  }

  /**
   * Compatibility alias for clearWithConfirmation.
   */
  public clear(): void {
    this.clearWithConfirmation(true);
  }

  // ─── Export & Copy ─────────────────────────────────────────────────
  public exportTranscript(format: 'txt' | 'markdown' | 'json' = 'txt'): string {
    const dateStr = new Date().toLocaleString();

    if (format === 'json') {
      return JSON.stringify(
        {
          title: 'Rafiqi Live Conversation Transcript',
          exportedAt: new Date().toISOString(),
          segmentsCount: this.segments.length,
          segments: this.segments,
          notes: this.notes,
        },
        null,
        2
      );
    }

    if (format === 'markdown') {
      let md = `# Rafiqi Live Conversation Transcript\n\n`;
      md += `*Exported on: ${dateStr}*\n\n---\n\n`;

      for (const seg of this.segments) {
        const time = new Date(seg.timestamp).toLocaleTimeString();
        const bookmarked = seg.isBookmarked ? ' ⭐' : '';
        const edited = seg.isEdited ? ' *(edited)*' : '';
        md += `**[${time}] ${seg.speakerLabel}**${bookmarked}${edited}:\n> ${seg.text}\n\n`;
      }

      if (this.notes.length > 0) {
        md += `\n## Conversation Notes\n\n`;
        for (const n of this.notes) {
          const time = new Date(n.timestamp).toLocaleTimeString();
          md += `- **[${time}]**: ${n.text}\n`;
        }
      }

      return md;
    }

    // Default plain text
    let txt = `Rafiqi Live Conversation Transcript\nExported: ${dateStr}\n====================================\n\n`;
    for (const seg of this.segments) {
      const time = new Date(seg.timestamp).toLocaleTimeString();
      txt += `[${time}] ${seg.speakerLabel}: ${seg.text}\n`;
    }

    if (this.notes.length > 0) {
      txt += `\n====================================\nNotes:\n`;
      for (const n of this.notes) {
        const time = new Date(n.timestamp).toLocaleTimeString();
        txt += `[${time}] ${n.text}\n`;
      }
    }

    return txt;
  }

  /**
   * Generates a structured overview of the conversation without hallucinating or rewriting original meaning.
   */
  public generateSummary(): TranscriptSummary {
    const total = this.segments.length;
    if (total === 0) {
      return {
        title: 'محادثة فارغة / Empty Conversation',
        topic: 'لا توجد بيانات مسجلة / No data recorded',
        keyPoints: [],
        actionItems: [],
        generatedAt: Date.now(),
        totalSegmentsAnalyzed: 0,
      };
    }

    // Group segments and extract key topics and potential action items
    const actionKeywords = ['سأقوم', 'يرجى', 'يجب', 'موعد', 'اتفقنا', 'will', 'please', 'must', 'deadline', 'agreed', 'schedule'];
    const actionItems: string[] = [];
    const keyPoints: string[] = [];

    for (const seg of this.segments) {
      const lower = seg.text.toLowerCase();
      const hasAction = actionKeywords.some((kw) => lower.includes(kw));

      if (hasAction && actionItems.length < 5) {
        actionItems.push(`${seg.speakerLabel}: "${seg.text}"`);
      } else if (seg.text.length > 15 && keyPoints.length < 6) {
        keyPoints.push(`${seg.speakerLabel}: "${seg.text}"`);
      }
    }

    return {
      title: 'ملخص المحادثة الفورية / Live Conversation Summary',
      topic: `${total} عبارات متحدث بها / spoken segments`,
      keyPoints: keyPoints.length > 0 ? keyPoints : [this.segments[0].text],
      actionItems,
      generatedAt: Date.now(),
      totalSegmentsAnalyzed: total,
    };
  }

  public clearWithConfirmation(confirmed: boolean): boolean {
    if (!confirmed) return false;
    this.segments = [];
    this.notes = [];
    this.currentInterimText = '';
    this.notify();
    this.persistIfAllowed();
    return true;
  }

  // ─── Outgoing Speech ───────────────────────────────────────────────
  public speak(text: string, dialect: Dialect = this.config.defaultDialect): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SpeechRecognitionService.dialectToCode(dialect);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  }

  public getQuickPhrases(dialect: Dialect = 'Arabic'): Array<{ label: string; text: string }> {
    if (dialect === 'English') {
      return [
        { label: 'Deaf Notice', text: 'I am Deaf or Hard of Hearing. Please speak clearly or write here.' },
        { label: 'One Moment', text: 'Please wait one moment.' },
        { label: 'Need Help', text: 'I need assistance, please.' },
        { label: 'Repeat', text: 'Could you please repeat what you just said?' },
        { label: 'Thank You', text: 'Thank you very much.' },
        { label: 'Yes', text: 'Yes, I agree.' },
        { label: 'No', text: 'No, thank you.' },
      ];
    }

    if (dialect === 'Egyptian Ammiya') {
      return [
        { label: 'إشعار صمم', text: 'أنا أصم أو ضعيف السمع، لو سمحت اكتبلي هنا أو اتكلم بوضوح.' },
        { label: 'لحظة واحدة', text: 'لو سمحت ثانية واحدة معايا.' },
        { label: 'محتاج مساعدة', text: 'أنا محتاج مساعدة من فضلك.' },
        { label: 'أعد من فضلك', text: 'ممكن تعيد اللي قلته ببطء لو سمحت؟' },
        { label: 'شكراً', text: 'شكراً جزيلاً لحضرتك.' },
        { label: 'تمام', text: 'تمام وموافق.' },
        { label: 'لا شكراً', text: 'لا شكراً، مش محتاج.' },
      ];
    }

    return [
      { label: 'إشعار صمم', text: 'أنا أصم أو ضعيف السمع، يُرجى الكتابة هنا أو التحدث بوضوح.' },
      { label: 'لحظة واحدة', text: 'لحظة واحدة من فضلك.' },
      { label: 'أحتاج مساعدة', text: 'أحتاج إلى مساعدة من فضلك.' },
      { label: 'أعد من فضلك', text: 'هل يمكنك إعادة ما قلته ببطء؟' },
      { label: 'شكراً جزيلاً', text: 'شكراً جزيلاً لك.' },
      { label: 'نعم', text: 'نعم، موافق.' },
      { label: 'لا شكراً', text: 'لا شكراً.' },
    ];
  }
}
