import React, { useState, useEffect, useRef } from 'react';
import { L } from '../../../../lib/translations';
import {
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bell,
  AlertTriangle,
  FileText,
  BookOpen,
  Send,
  Edit2,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  ShieldCheck,
  Radio,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
} from 'lucide-react';
import { UnifiedCommunicationEngine } from '../unifiedCommunicationEngine';
import type {
  UnifiedWorkflowMode,
  UnifiedMessage,
  UnifiedSystemStatus,
  UnifiedConversationNote,
} from '../types';
import type { VerifiedSignEntry } from '../../signLanguage';

interface UnifiedTwoWayCommunicationViewProps {
  isArabic?: boolean;
}

export const UnifiedTwoWayCommunicationView: React.FC<UnifiedTwoWayCommunicationViewProps> = ({
  isArabic = true,
}) => {
  const engineRef = useRef<UnifiedCommunicationEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new UnifiedCommunicationEngine();
  }
  const engine = engineRef.current;

  // ─── Reactive State ────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<UnifiedMessage[]>(engine.getMessages());
  const [status, setStatus] = useState<UnifiedSystemStatus>(engine.getSystemStatus());
  const [activeWorkflow, setActiveWorkflow] = useState<UnifiedWorkflowMode>(
    engine.getWorkflowMode()
  );
  const [inputText, setInputText] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [notes, setNotes] = useState<UnifiedConversationNote[]>(engine.getNotes());

  // Dictionary Lookup Drawer State
  const [dictQuery, setDictQuery] = useState('');
  const [dictResults, setDictResults] = useState<VerifiedSignEntry[]>([]);

  // Notes Modal State
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [newNoteInput, setNewNoteInput] = useState('');

  // Confirmation Modal State
  const [confirmModalData, setConfirmModalData] = useState<{ text: string } | null>(null);

  // Subscriptions
  useEffect(() => {
    const unsubMsgs = engine.subscribeMessages((msgs) => setMessages(msgs));
    const unsubStatus = engine.subscribeStatus((st) => setStatus(st));
    return () => {
      unsubMsgs();
      unsubStatus();
    };
  }, [engine]);

  // Handle Send Text
  const handleSend = (forceConfirmed: boolean = false) => {
    if (!inputText.trim()) return;

    const res = engine.sendUserMessage(inputText, {
      confirmedByUser: forceConfirmed,
      dialect: isArabic ? 'Arabic' : 'English',
    });

    if (!res.success && res.error?.includes('Confirmation required')) {
      setConfirmModalData({ text: inputText });
      return;
    }

    if (res.success) {
      setInputText('');
      setLiveAnnouncement(isArabic ? 'تم إرسال الرسالة' : L('Message sent'));
    }
  };

  // Handle Edit Transcript
  const handleSaveEdit = (msgId: string) => {
    if (!editText.trim()) return;
    engine.editTranscript(msgId, editText);
    setEditingMsgId(null);
    setEditText('');
    setLiveAnnouncement(isArabic ? 'تم تعديل النص المنقول' : L('Transcript updated'));
  };

  // Handle Undo
  const handleUndo = () => {
    const undone = engine.undoLastEdit();
    if (undone) {
      setLiveAnnouncement(isArabic ? 'تم التراجع عن التعديل الأخير' : L('Undid last edit'));
    }
  };

  // Handle AAC Sentence Injection
  const handleInjectAac = () => {
    const sent = engine.injectAacSentenceToConversation(true);
    if (sent) {
      setLiveAnnouncement(isArabic ? 'تم إدراج ونطق رسالة AAC' : L('Injected and spoke AAC sentence'));
    }
  };

  // Handle Dictionary Search
  const handleSearchDict = (q: string) => {
    setDictQuery(q);
    if (q.trim()) {
      setDictResults(engine.consultSignDictionary(q));
    } else {
      setDictResults([]);
    }
  };

  // Helper: Provenance Tag Renderer
  const renderProvenanceBadge = (msg: UnifiedMessage) => {
    switch (msg.provenance) {
      case 'original_transcript':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Mic className="w-3 h-3 text-blue-500" />
            {isArabic ? 'نص أصلي منقول' : L('Original Transcript')}
            {msg.isUncertain && (
              <span className="text-amber-500 font-bold ml-1">
                {isArabic ? '(دقة منخفضة ⚠️)' : L('(Low Confidence ⚠️)')}
              </span>
            )}
          </span>
        );
      case 'user_edited_transcript':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Edit2 className="w-3 h-3" />
            {isArabic ? 'معدل بواسطة المستخدم' : L('User Edited')}
          </span>
        );
      case 'ai_generated_summary':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Sparkles className="w-3 h-3" />
            {isArabic ? 'ملخص آلي منفصل' : L('AI Summary')}
          </span>
        );
      case 'recognized_sign':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <BookOpen className="w-3 h-3" />
            {isArabic ? 'إشارة معتمدة' : L('Recognized Sign')}
          </span>
        );
      case 'aac_composed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Layers className="w-3 h-3" />
            {isArabic ? 'تأليف لوحة AAC' : L('AAC Composed')}
          </span>
        );
      case 'ambient_sound_alert':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold animate-pulse">
            <Bell className="w-3 h-3" />
            {isArabic ? 'تنبيه صوتي بيئي' : L('Ambient Alert')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6"
    >
      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* ─── Top Multi-Sensory System Status Header ──────────────────────── */}
      <header className="mb-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Radio className="w-7 h-7" />
            {isArabic ? 'التواصل الموحد ثنائي الاتجاه' : L('Unified Two-Way Communication')}
          </h1>
          <p className="text-xs opacity-75 mt-0.5">
            {isArabic
              ? 'تكامل المحادثة المباشرة، التنبيهات الصوتية، لغة الإشارة، ولوحات AAC'
              : L('Integration of Live Captions, Sound Awareness, Sign Lexicon & AAC')}
          </p>
        </div>

        {/* Real-time Subsystem Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {/* Captions Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Mic className="w-3.5 h-3.5" />
            <span>{isArabic ? 'التسميات: جاهزة' : L('Captions: Ready')}</span>
          </div>

          {/* Sound Awareness Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Bell className="w-3.5 h-3.5" />
            <span>{status.ambientDecibels} dB</span>
          </div>

          {/* AAC Board Active */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Layers className="w-3.5 h-3.5" />
            <span>{isArabic ? 'لوحة AAC: نشطة' : L('AAC Active')}</span>
          </div>

          {/* Offline/Online */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{status.isOffline ? (isArabic ? 'بلا إنترنت (محلي)' : L('Offline')) : (isArabic ? 'متصل' : L('Online'))}</span>
          </div>
        </div>
      </header>

      {/* ─── Workflow Selection Navigation ─────────────────────────────────── */}
      <nav aria-label={isArabic ? 'مسارات التواصل' : L('Communication Workflows')} className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {[
            { id: 'deaf_text_captions', labelAr: 'محادثة نصية وتسميات', labelEn: 'Captions + Text', icon: MessageSquare },
            { id: 'hoh_sound_alerts', labelAr: 'تنبيهات الأصوات المحيطة', labelEn: 'Sound Alerts', icon: Bell },
            { id: 'aac_vocalization', labelAr: 'لوحة AAC ونطق صوتي', labelEn: 'AAC Vocalization', icon: Layers },
            { id: 'sign_dictionary_consult', labelAr: 'استشارة قاموس الإشارة', labelEn: 'Sign Dictionary', icon: BookOpen },
            { id: 'captions_with_saved_notes', labelAr: 'الملاحظات المحفوظة', labelEn: 'Saved Notes', icon: FileText },
          ].map((wf) => {
            const Icon = wf.icon;
            const isSelected = activeWorkflow === wf.id;
            return (
              <button
                key={wf.id}
                onClick={() => {
                  setActiveWorkflow(wf.id as UnifiedWorkflowMode);
                  engine.setWorkflowMode(wf.id as UnifiedWorkflowMode);
                  if (wf.id === 'captions_with_saved_notes') setShowNotesModal(true);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-102'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{isArabic ? wf.labelAr : wf.labelEn}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── Active Error & Recovery Banner ────────────────────────────────── */}
      {status.activeError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <div className="font-bold text-sm text-red-900 dark:text-red-200">
                {isArabic ? status.activeError.messageAr : status.activeError.messageEn}
              </div>
              <div className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                {isArabic ? 'يمكنك اختيار إجراء للتعافي فوراً:' : L('Select a recovery action below:')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status.activeError.allowedActions.includes('retry') && (
              <button
                onClick={() => engine.retryLastOperation()}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                {isArabic ? 'إعادة المحاولة' : L('Retry')}
              </button>
            )}
            {status.activeError.allowedActions.includes('fallback_to_text') && (
              <button
                onClick={() => engine.fallbackToTextMode()}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-red-300 text-red-800 dark:text-red-200 text-xs font-bold"
              >
                {isArabic ? 'تحويل للكتابة النصية' : L('Switch to Text')}
              </button>
            )}
            <button
              onClick={() => engine.clearError()}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              {isArabic ? 'تجاهل' : L('Dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* ─── Central Shared Conversation Stream ────────────────────────────── */}
      <main
        aria-label={isArabic ? 'جدول الرسائل والمحادثة' : L('Conversation Timeline')}
        className="mb-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] max-h-[550px] overflow-y-auto space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center opacity-60">
            <MessageSquare className="w-12 h-12 mb-2 stroke-1" />
            <p className="font-semibold text-sm">
              {isArabic
                ? 'لا توجد رسائل بعد. ابدأ بالتحدث أو الكتابة أو اختيار رموز AAC.'
                : L('No messages yet. Start speaking, typing, or composing AAC cards.')}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isAmbient = msg.sender === 'ambient_sound';
            const isSystem = msg.sender === 'system';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isAmbient
                    ? 'items-center my-3'
                    : isUser
                    ? 'items-end'
                    : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl shadow-xs transition-all ${
                    isAmbient
                      ? 'bg-red-100 dark:bg-red-950/60 border-2 border-red-500 text-red-900 dark:text-red-200 w-full text-center'
                      : isUser
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                  }`}
                >
                  {/* Provenance Badge & Timestamp Bar */}
                  <div className="flex items-center justify-between gap-3 mb-1.5 text-xs opacity-80">
                    <div className="flex items-center gap-1.5">
                      {renderProvenanceBadge(msg)}
                      {msg.status === 'edited' && (
                        <span className="text-xs italic">
                          ({isArabic ? 'معدل' : L('edited')})
                        </span>
                      )}
                    </div>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Message Content or Edit Input */}
                  {editingMsgId === msg.id ? (
                    <div className="space-y-2 mt-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm border"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingMsgId(null)}
                          className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-xs font-semibold"
                        >
                          {isArabic ? 'إلغاء' : L('Cancel')}
                        </button>
                        <button
                          onClick={() => handleSaveEdit(msg.id)}
                          className="px-3 py-1 rounded bg-indigo-700 text-white text-xs font-bold"
                        >
                          {isArabic ? 'حفظ التعديل' : L('Save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm sm:text-base leading-relaxed break-words font-medium">
                      {msg.text}
                    </div>
                  )}

                  {/* Message Sub-actions (Edit, Pin to Notes) */}
                  {!isAmbient && (
                    <div className="mt-2 pt-1 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-2 text-xs">
                      {msg.provenance === 'original_transcript' && (
                        <button
                          onClick={() => {
                            setEditingMsgId(msg.id);
                            setEditText(msg.text);
                          }}
                          className="opacity-70 hover:opacity-100 flex items-center gap-1"
                          aria-label={isArabic ? 'تعديل هذا النص' : L('Edit this transcript')}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{isArabic ? 'تعديل' : L('Edit')}</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          engine.createNoteFromMessages([msg.id], `ملاحظة: ${msg.text}`);
                          setNotes(engine.getNotes());
                          setLiveAnnouncement(isArabic ? 'تم حفظ الرسالة في الملاحظات' : L('Saved to notes'));
                        }}
                        className="opacity-70 hover:opacity-100 flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{isArabic ? 'حفظ كملاحظة' : L('Save Note')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ─── Multi-Modal Input Bar & Controls ───────────────────────────────── */}
      <section
        aria-label={isArabic ? 'شريط إدخال الرسائل والتأليف' : L('Message Composer')}
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
      >
        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <button
              onClick={handleInjectAac}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
            >
              <Layers className="w-3.5 h-3.5" />
              {isArabic ? 'إدراج جملة لوحة AAC الحالية' : L('Insert Current AAC Sentence')}
            </button>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isArabic ? 'تراجع عن آخر تعديل' : L('Undo Edit')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={dictQuery}
              onChange={(e) => handleSearchDict(e.target.value)}
              placeholder={isArabic ? 'بحث سريع بالقاموس الإشاري...' : L('Quick Sign search...')}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
        </div>

        {/* Dictionary Preview Drawer */}
        {dictResults.length > 0 && (
          <div className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 flex flex-wrap gap-2 text-xs">
            <span className="font-bold self-center text-indigo-900 dark:text-indigo-300">
              {isArabic ? 'نتائج القاموس:' : L('Sign Lexicon:')}
            </span>
            {dictResults.slice(0, 3).map((sign) => (
              <button
                key={sign.id}
                onClick={() => {
                  engine.linkSignEntryToConversation(sign.id);
                  setDictQuery('');
                  setDictResults([]);
                }}
                className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-indigo-300 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-800"
              >
                {sign.arabicPhrase} ({sign.verifiedSignLabel})
              </button>
            ))}
          </div>
        )}

        {/* Text Input + Send Button */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(false);
            }}
            placeholder={
              isArabic
                ? 'اكتب رسالتك هنا للتواصل المباشر مع الطرف الآخر...'
                : L('Type your message to communicate...')
            }
            className="flex-1 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
          />

          <button
            onClick={() => handleSend(false)}
            disabled={!inputText.trim()}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-40 shadow-sm transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            {isArabic ? 'إرسال' : L('Send')}
          </button>
        </div>
      </section>

      {/* ─── Modal: Confirmation Safeguard ─────────────────────────────────── */}
      {confirmModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-600 mb-3 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{isArabic ? 'تأكيد الرسالة قبل الإرسال' : L('Confirm Critical Message')}</span>
            </div>
            <p className="text-xs opacity-75 mb-4">
              {isArabic
                ? 'تحتوي الرسالة على تنبيه طارئ أو نداء حسّاس. هل أنت متأكد من رغبتك في إرسالها بالصيغة التالية:'
                : L('This message contains emergency or sensitive terms. Please confirm before sending:')}
            </p>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 font-bold text-sm mb-6">
              "{confirmModalData.text}"
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmModalData(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                {isArabic ? 'إلغاء' : L('Cancel')}
              </button>
              <button
                onClick={() => {
                  handleSend(true);
                  setConfirmModalData(null);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
              >
                {isArabic ? 'تأكيد وإرسال' : L('Confirm & Send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Saved Conversation Notes ───────────────────────────────── */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                {isArabic ? 'ملاحظات الحوار المحفوظة' : L('Saved Conversation Notes')}
              </h3>
              <button
                onClick={() => setShowNotesModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing Notes */}
            <div className="space-y-3 mb-6">
              {notes.length === 0 ? (
                <div className="text-center py-6 opacity-60 text-xs">
                  {isArabic ? 'لا توجد ملاحظات محفوظة بعد.' : L('No saved notes yet.')}
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.noteId}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="font-bold mb-1 text-indigo-700 dark:text-indigo-300">
                      {note.userNotesAr || (isArabic ? 'ملاحظة محادثة' : L('Conversation Note'))}
                    </div>
                    <pre className="text-xs whitespace-pre-wrap font-sans opacity-80 mb-2">
                      {note.rawContent}
                    </pre>
                    <div className="flex justify-between items-center text-xs opacity-60 border-t pt-1.5">
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                      <button
                        onClick={() => {
                          engine.deleteNote(note.noteId);
                          setNotes(engine.getNotes());
                        }}
                        className="text-red-500 hover:underline"
                      >
                        {isArabic ? 'حذف' : L('Delete')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                {isArabic ? 'إغلاق' : L('Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
