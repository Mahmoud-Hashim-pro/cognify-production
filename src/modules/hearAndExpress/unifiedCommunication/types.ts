import type { Dialect } from '../types';
import type { SoundAlert } from '../soundAwareness';
import type { VerifiedSignEntry } from '../signLanguage';
import type { AacSymbol } from '../personalAac';

export type UnifiedWorkflowMode =
  | 'deaf_text_captions'           // مستخدم أصم يقرأ التسميات التوضيحية المباشرة ويتواصل بالكتابة
  | 'hoh_sound_alerts'             // مستخدم ضعيف السمع يتلقى تنبيهات الأصوات المحيطة مع الحوار
  | 'aac_vocalization'             // مستخدم غير ناطق يؤلف الرسائل عبر لوحة AAC وينطقها صوتياً
  | 'sign_dictionary_consult'      // استشارة القاموس الإشاري المعتمد أثناء المحادثة
  | 'captions_with_saved_notes';   // دمج التسميات الحية مع تدوين وحفظ الملاحظات

export type UnifiedMessageProvenance =
  | 'original_transcript'          // نص منقول حرفياً من محرك التعرف الصوتي (الأصل الخام)
  | 'user_edited_transcript'       // نص منقول قام المستخدم بتعديله يدوياً مع الاحتفاظ بالأصل
  | 'ai_generated_summary'         // ملخص تم توليده آلياً مفصول ومستند لمعرفات الرسائل الأصلية
  | 'recognized_sign'              // إشارة تم التعرف عليها مع وسم الشك عند انخفاض الدقة
  | 'suggested_response'           // رد مقترح ذكي من النظام
  | 'user_typed'                   // رسالة نصية كتبها المستخدم مباشرة
  | 'aac_composed'                 // رسالة ألفها المستخدم باستخدام رموز لوحة AAC
  | 'ambient_sound_alert';         // تنبيه صوتي بيئي عاجل التقطه محرك الوعي الصوتي

export interface UnifiedMessage {
  id: string;
  sender: 'user' | 'other' | 'system' | 'ambient_sound';
  provenance: UnifiedMessageProvenance;
  text: string;
  originalRawText?: string;        // النص الخام الأصلي لمنع استبداله أو تحريفه
  timestamp: number;
  dialect?: Dialect;
  confidence?: number;
  isUncertain?: boolean;           // وسم صريح بعدم اليقين عند تدني الدقة
  isFinal: boolean;
  hasUserConfirmation?: boolean;   // تأكيد صريح من المستخدم قبل الإرسال
  soundAlertMetadata?: SoundAlert;
  signEntryMetadata?: VerifiedSignEntry;
  aacSymbolsUsed?: AacSymbol[];
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'edited';
  error?: string | null;
}

export interface UnifiedErrorState {
  errorId: string;
  type:
    | 'permission_denied'
    | 'network_interruption'
    | 'unsupported_language'
    | 'audio_device_disconnected'
    | 'recognition_timeout';
  messageAr: string;
  messageEn: string;
  isRecoverable: boolean;
  allowedActions: ('retry' | 'edit' | 'undo' | 'cancel' | 'fallback_to_text')[];
  timestamp: number;
}

export interface UnifiedConversationNote {
  noteId: string;
  sourceMessageIds: string[];
  rawContent: string;
  userNotesAr: string;
  userNotesEn: string;
  aiSummary?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UnifiedSystemStatus {
  captionsListening: boolean;
  soundAwarenessActive: boolean;
  ambientDecibels: number;
  latestSoundAlert: SoundAlert | null;
  activeAacBoardId: string;
  isOffline: boolean;
  activeError: UnifiedErrorState | null;
}

export type UnifiedMessageListener = (messages: UnifiedMessage[]) => void;
export type UnifiedStatusListener = (status: UnifiedSystemStatus) => void;
