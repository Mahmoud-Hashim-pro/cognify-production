/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi (رفيقي) — Phase 11: Accessible Communication Assistant Workspace
 * 
 * Comprehensive communication suite for blind and visually impaired users:
 * 1. Legitimate Human Assistance & Live Video Sharing with explicit consent and kill switch
 * 2. Handwriting Reader with uncertainty marking and source inspection
 * 3. Form & Document Reader separating required from optional fields (no data fabrication)
 * 4. Voice Message Transcriber & Summarizer preserving original audio
 * 5. Social Image Describer & Reply Drafter with strict review-before-send boundaries
 * 6. Currency & Payment Guidance with anti-transaction and anti-counterfeiting guards
 * 7. Unified Navigation to Deaf/Hearing Suite for cross-disability inclusion
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Video,
  FileText,
  Volume2,
  Image as ImageIcon,
  Banknote,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Menu,
  Play,
  Square,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Camera,
  Mic,
  MicOff,
  PhoneOff,
  AlertCircle,
  HelpCircle,
  Send,
  ZoomIn,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Ear,
  Info,
} from 'lucide-react';
import { UserProfile } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { speak, stopSpeaking } from '../lib/tts';
import { toast } from './Toast';
import {
  HUMAN_ASSIST_DISCLAIMER_AR,
  HUMAN_ASSIST_DISCLAIMER_EN,
  HumanAssistanceSession,
  AssistanceSessionState,
  AssistanceProviderType,
  createInitialAssistanceSession,
  updateAssistanceSessionState,
  verifyAssistanceConsent,
  parseHandwrittenText,
  HandwritingParseResult,
  analyzeCommunicationForm,
  FormExplanationResult,
  transcribeVoiceMessage,
  VoiceMessageTranscriptionResult,
  describeSocialMessageImage,
  SocialImageDescriptionResult,
  draftSocialReplyMessage,
  DraftMessageResult,
  verifySafeSendBoundary,
  evaluatePaymentGuidance,
  PaymentGuidanceResult,
} from '../lib/communicateEngine';

export type CommunicateToolId =
  | 'human_assist'
  | 'handwriting'
  | 'form_reader'
  | 'voice_notes'
  | 'social_assistant'
  | 'payment_guidance'
  | 'hearing_suite_link';

interface AccessibleCommunicateWorkspaceViewProps {
  profile: UserProfile;
  onMenuClick: () => void;
  onNavigateBack: () => void;
  onOpenHearingSuite?: () => void;
  initialTool?: CommunicateToolId;
  isDarkMode?: boolean;
}

export default function AccessibleCommunicateWorkspaceView({
  profile,
  onMenuClick,
  onNavigateBack,
  onOpenHearingSuite,
  initialTool = 'human_assist',
  isDarkMode = true,
}: AccessibleCommunicateWorkspaceViewProps) {
  const isAr = isArabicLocale(profile.language);

  // Active Tool state
  const [activeTool, setActiveTool] = useState<CommunicateToolId>(initialTool);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // ── 1. HUMAN ASSISTANCE STATE ──
  const [session, setSession] = useState<HumanAssistanceSession>(() => createInitialAssistanceSession('trusted_contact'));
  const [consentCamera, setConsentCamera] = useState(false);
  const [consentMic, setConsentMic] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AssistanceProviderType>('trusted_contact');

  // ── 2. HANDWRITING READER STATE ──
  const [handwritingInput, setHandwritingInput] = useState(
    'عقار ميتفورمين 500mg قرص واحد يومياً بعد العشاء مع فحص السكر [أسبوعياً?]'
  );
  const [handwritingResult, setHandwritingResult] = useState<HandwritingParseResult | null>(() =>
    parseHandwrittenText('عقار ميتفورمين 500mg قرص واحد يومياً بعد العشاء مع فحص السكر [أسبوعياً?]', 0.82, 'Arabic')
  );
  const [isInspectingSource, setIsInspectingSource] = useState(false);

  // ── 3. FORM ASSISTANT STATE ──
  const [formInput, setFormInput] = useState(
    'استمارة تسجيل بطاقة الخدمات المتكاملة\nالاسم: أحمد مصطفى\nالرقم القومي: \nرقم الهاتف: \nالبريد: \nالتوقيع: '
  );
  const [formResult, setFormResult] = useState<FormExplanationResult | null>(() =>
    analyzeCommunicationForm('استمارة تسجيل بطاقة الخدمات المتكاملة', 'Arabic')
  );
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);

  // ── 4. VOICE MESSAGE STATE ──
  const [voiceResult, setVoiceResult] = useState<VoiceMessageTranscriptionResult | null>(() =>
    transcribeVoiceMessage('audio_voice_note_01.m4a', 32, undefined, 0.94, 'Arabic')
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // ── 5. SOCIAL ASSISTANT STATE ──
  const [socialImageDescription, setSocialImageDescription] = useState<SocialImageDescriptionResult | null>(() =>
    describeSocialMessageImage(
      'جدول مواعيد رحلات القطار المتجهة من القاهرة إلى الإسكندرية',
      'قطار 905 مكيف - قيام 08:00 صباحاً - رصيف 4'
    )
  );
  const [incomingMessageText, setIncomingMessageText] = useState(
    'السلام عليكم، هل يمكنك تأكيد ميعاد التجمع في الكلية غداً؟'
  );
  const [replyTone, setReplyTone] = useState<'polite' | 'casual' | 'formal'>('polite');
  const [replyDraft, setReplyDraft] = useState<DraftMessageResult | null>(() =>
    draftSocialReplyMessage('السلام عليكم، هل يمكنك تأكيد ميعاد التجمع في الكلية غداً؟', 'polite', 'Arabic')
  );
  const [isCopied, setIsCopied] = useState(false);

  // ── 6. PAYMENT GUIDANCE STATE ──
  const [paymentOcrText, setPaymentOcrText] = useState(
    'إشعار دفع خدمة فوري رقم الكود: 78923412 المطلوب: 180 ج.م صلاحية الكود: 24 ساعة'
  );
  const [paymentResult, setPaymentResult] = useState<PaymentGuidanceResult | null>(() =>
    evaluatePaymentGuidance(
      'إشعار دفع خدمة فوري رقم الكود: 78923412 المطلوب: 180 ج.م',
      'مئتا جنيه مصري (200 EGP)',
      'Arabic'
    )
  );

  // Speech helper
  const speakText = (text: string) => {
    if (!text) return;
    stopSpeaking();
    setIsSpeaking(true);
    speak(text, isAr ? 'ar-SA' : 'en-US', {
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const stopAudio = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setIsPlayingAudio(false);
  };

  // Human Assistance Actions
  const handleStartAssistanceRequest = () => {
    const consentCheck = verifyAssistanceConsent({
      userAgreed: true,
      shareCamera: consentCamera,
      shareMicrophone: consentMic,
      consentTimestamp: Date.now(),
    });

    if (!consentCheck.isApproved) {
      const msg = isAr
        ? 'يرجى تحديد الموافقة الصريحة على مشاركة الكاميرا والميكروفون قبل بدء الاتصال.'
        : 'Please provide explicit consent to share camera and microphone before connecting.';
      toast.error(msg);
      speakText(msg);
      return;
    }

    // Update state to connecting
    let updated = updateAssistanceSessionState(session, 'connecting');
    updated.consent = {
      userAgreed: true,
      shareCamera: consentCamera,
      shareMicrophone: consentMic,
      shareLocation: false,
      consentTimestamp: Date.now(),
    };
    updated.providerType = selectedProvider;
    setSession(updated);

    const connectingMsg = isAr
      ? 'جاري إنشاء الاتصال الآمن مع المرافق المعتمد... الكاميرا لم تبث بعد.'
      : 'Initiating secure stream with verified companion... video not yet broadcasting.';
    toast.loading(connectingMsg, { id: 'connect_toast' });
    speakText(connectingMsg);

    // Simulate verified connection establishment
    setTimeout(() => {
      toast.dismiss('connect_toast');
      const connectedSession = updateAssistanceSessionState(updated, 'connected', true);
      setSession(connectedSession);
      const successMsg = isAr
        ? `تم الاتصال بنجاح. البث الحي نشط الآن وتشارك الكاميرا والميكروفون مع (${connectedSession.providerNameAr}). زر القطع الفوري متاح دائماً.`
        : `Connected successfully. Live sharing is active with (${connectedSession.providerNameEn}). Instant disconnect button is always accessible.`;
      toast.success(successMsg);
      speakText(successMsg);
    }, 1800);
  };

  const handleDisconnectAssistance = () => {
    const disconnectedSession = updateAssistanceSessionState(session, 'disconnected');
    setSession(disconnectedSession);
    const msg = isAr ? 'تم إنهاء جلسة المساعدة وقطع بث الكاميرا والميكروفون فوراً.' : 'Assistance stream terminated immediately. Camera and audio stopped.';
    toast.success(msg);
    speakText(msg);
  };

  // Tools definition
  const tools: Array<{ id: CommunicateToolId; titleAr: string; titleEn: string; icon: any }> = [
    { id: 'human_assist', titleAr: 'المساعدة البشرية المباشرة', titleEn: 'Human & Video Assist', icon: Users },
    { id: 'handwriting', titleAr: 'قارئ الخط اليدوي', titleEn: 'Handwriting Reader', icon: FileText },
    { id: 'form_reader', titleAr: 'مساعد تعبئة النماذج', titleEn: 'Form & Invoice Assistant', icon: CheckCircle2 },
    { id: 'voice_notes', titleAr: 'تفريغ وتلخيص الرسائل الصوتية', titleEn: 'Voice Notes & Summaries', icon: Volume2 },
    { id: 'social_assistant', titleAr: 'وصف صور وصياغة الردود', titleEn: 'Social & Messaging', icon: ImageIcon },
    { id: 'payment_guidance', titleAr: 'إرشادات الدفع والعملات', titleEn: 'Payment & Currency', icon: Banknote },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isDarkMode ? 'bg-[#061A33] text-[#F8FAFC]' : 'bg-[#F5F9FD] text-[#061A33]'
      } font-sans selection:bg-[#1769AA]/30`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Screen reader live announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isSpeaking ? (isAr ? 'جاري القراءة الصوتية للإرشادات...' : 'Speaking communication guidance...') : ''}
        {session.sharingNoticeAr}
      </div>

      {/* ── HEADER ── */}
      <header
        role="banner"
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#131E2E]/95 backdrop-blur-md border-b border-[#22354E] shadow-md"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateBack}
            aria-label={localize(profile.language, 'Back to Move & Explore', 'الرجوع للقسم السابق')}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1A283D] border border-[#22354E] text-[#94A3B8] hover:text-white hover:border-[#1769AA] transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
          >
            <ArrowLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onMenuClick}
            aria-label={localize(profile.language, 'Open navigation menu', 'فتح القائمة الرئيسية')}
            className="md:hidden min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1A283D] border border-[#22354E] text-[#94A3B8] hover:text-white cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#1769AA]/20 text-[#4B9FE1] border border-[#1769AA]/40">
                {localize(profile.language, 'Section 5 · Communication', 'القسم 5 · التواصل والتعبير')}
              </span>
              {session.state === 'connected' && (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-600/30 text-red-400 border border-red-500 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {localize(profile.language, 'Live Stream Active', 'بث حي نشط')}
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-black text-[#F8FAFC]">
              {localize(profile.language, 'Accessible Communication Assistant', 'مساعد التواصل الشامل')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              type="button"
              onClick={stopAudio}
              aria-label={localize(profile.language, 'Stop Voice', 'إيقاف نطق الصوت')}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-red-500/30 transition-all focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">{localize(profile.language, 'Stop Audio', 'إيقاف الصوت')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            aria-label={localize(profile.language, 'Communication Safety & Privacy Guidelines', 'إرشادات أمان وخصوصية التواصل')}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1A283D] border border-[#22354E] text-[#4B9FE1] hover:border-[#1769AA] transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── EMERGENCY NOTICE BANNER ── */}
      <section
        role="region"
        aria-label={localize(profile.language, 'Privacy and Assistance Boundary Notice', 'تنبيه الخصوصية وحدود المساعدة')}
        className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-[#0D4778]/50 via-[#131E2E] to-[#0D4778]/50 border-b border-[#22354E] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2.5 text-[#94A3B8]">
          <ShieldCheck className="w-4 h-4 text-[#4B9FE1] shrink-0" />
          <p className="leading-relaxed">
            <strong className="text-[#F8FAFC]">
              {localize(profile.language, 'Strict Privacy Invariant:', 'مبدأ الخصوصية الصارم:')}
            </strong>{' '}
            {localize(
              profile.language,
              'No live video, microphone, or private data is ever shared without your explicit consent. Auto-sending is strictly prohibited.',
              'لن يتم مشاركة أي فيديو حي أو صوت أو بيانات شخصية دون موافقتك الصريحة. يُمنع إرسال الرسائل تلقائياً.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPrivacyModal(true)}
          className="text-[#4B9FE1] hover:underline font-bold text-xs shrink-0 cursor-pointer"
        >
          {localize(profile.language, 'Read Privacy Rules', 'قراءة قواعد الخصوصية')}
        </button>
      </section>

      {/* ── TOOL NAVIGATION BAR (TABLIST) ── */}
      <nav
        role="tablist"
        aria-label={localize(profile.language, 'Communication Tools', 'أدوات التواصل')}
        className="sticky top-[69px] z-20 flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-[#0D4778]/80 backdrop-blur-md border-b border-[#22354E] overflow-x-auto custom-scrollbar"
      >
        {tools.map((t) => {
          const IconComponent = t.icon;
          const isSelected = activeTool === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setActiveTool(t.id);
                speakText(isAr ? t.titleAr : t.titleEn);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] shrink-0 ${
                isSelected
                  ? 'bg-[#1769AA] text-white shadow-md shadow-[#1769AA]/40 border border-[#4B9FE1]'
                  : 'bg-[#1A283D] text-[#94A3B8] border border-[#22354E] hover:text-[#F8FAFC] hover:border-[#1769AA]/50'
              }`}
            >
              <IconComponent className="w-4 h-4 text-[#4B9FE1]" />
              <span>{isAr ? t.titleAr : t.titleEn}</span>
            </button>
          );
        })}
      </nav>

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TOOL 1: HUMAN & LIVE VIDEO ASSISTANCE                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTool === 'human_assist' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#131E2E] border border-[#22354E] space-y-4 text-start shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/20 border border-[#1769AA]/40 flex items-center justify-center text-[#4B9FE1]">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#F8FAFC]">
                      {localize(profile.language, 'Legitimate Human Assistance & Live Video', 'المساعدة البشرية ومشاركة الفيديو الحي')}
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {localize(
                        profile.language,
                        'Connect directly with a verified sighted companion or trusted family member with clear consent controls.',
                        'تواصل مباشرة مع مرافق مبصر معتمد أو أحد أفراد الأسرة الموثوقين مع تحكم صارم بالموافقة.'
                      )}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      session.state === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : session.state === 'connecting'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : 'bg-[#1A283D] text-[#94A3B8] border-[#22354E]'
                    }`}
                  >
                    {session.state === 'connected'
                      ? localize(profile.language, 'Stream Active', 'البث نشط')
                      : session.state === 'connecting'
                      ? localize(profile.language, 'Connecting...', 'جاري الاتصال...')
                      : localize(profile.language, 'Disconnected', 'غير متصل')}
                  </span>
                </div>
              </div>

              {/* Live Streaming Notification */}
              {session.state === 'connected' ? (
                <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
                      <Camera className="w-5 h-5 animate-pulse" />
                      <span>{session.sharingNoticeAr}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectAssistance}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>{localize(profile.language, 'End & Stop Stream Now', 'إنهاء الاتصال وقطع البث فوراً')}</span>
                    </button>
                  </div>
                  <p className="text-xs text-red-300/80 leading-relaxed">
                    {localize(
                      profile.language,
                      'Your camera feed and microphone audio are being shared. You can terminate the call at any moment.',
                      'يتم الآن بث إشارة الكاميرا وصوت الميكروفون للطرف الآخر. يمكنك إنهاء الجلسة فوراً بالضغط على الزر أعلاه.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#94A3B8]">
                      {localize(profile.language, 'Select Assistance Provider Type', 'اختر نوع مزود المساعدة:')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedProvider('trusted_contact')}
                        className={`p-3.5 rounded-2xl border text-start flex items-center gap-3 transition-all cursor-pointer ${
                          selectedProvider === 'trusted_contact'
                            ? 'bg-[#1769AA]/20 border-[#1769AA] text-white shadow-md'
                            : 'bg-[#1A283D] border-[#22354E] text-[#94A3B8]'
                        }`}
                      >
                        <Users className="w-5 h-5 text-[#4B9FE1]" />
                        <div>
                          <h4 className="text-xs font-bold">{localize(profile.language, 'Trusted Contact (Family / Guide)', 'مرافق موثوق (الأسرة / صديق)')}</h4>
                          <p className="text-[11px] text-[#94A3B8]">{localize(profile.language, 'Direct connection with a known person', 'اتصال مباشر بشخص تعرفه ومعتمد في حسابك')}</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedProvider('verified_volunteer')}
                        className={`p-3.5 rounded-2xl border text-start flex items-center gap-3 transition-all cursor-pointer ${
                          selectedProvider === 'verified_volunteer'
                            ? 'bg-[#1769AA]/20 border-[#1769AA] text-white shadow-md'
                            : 'bg-[#1A283D] border-[#22354E] text-[#94A3B8]'
                        }`}
                      >
                        <ShieldCheck className="w-5 h-5 text-[#4B9FE1]" />
                        <div>
                          <h4 className="text-xs font-bold">{localize(profile.language, 'Verified Volunteer Network', 'شبكة المتطوعين المعتمدة')}</h4>
                          <p className="text-[11px] text-[#94A3B8]">{localize(profile.language, 'Vetted assistance partner network', 'شبكة متطوعين مدربة ومسجلة رسمياً')}</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Informed Consent Checkboxes */}
                  <div className="p-4 rounded-2xl bg-[#1A283D] border border-[#22354E] space-y-3">
                    <h4 className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#4B9FE1]" />
                      <span>{localize(profile.language, 'Explicit Privacy Consent (Mandatory)', 'الموافقة الصريحة على مشاركة الوسائط (إلزامية)')}</span>
                    </h4>

                    <label className="flex items-center gap-3 text-xs text-[#94A3B8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentCamera}
                        onChange={(e) => setConsentCamera(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1769AA] focus:ring-[#1769AA] border-[#22354E] bg-[#131E2E]"
                      />
                      <span>{localize(profile.language, 'I explicitly agree to share my real-time camera feed with the sighted companion.', 'أوافق صراحة على بث كاميرا الهاتف للمرافق المبصر أثناء المكالمة فقط.')}</span>
                    </label>

                    <label className="flex items-center gap-3 text-xs text-[#94A3B8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentMic}
                        onChange={(e) => setConsentMic(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1769AA] focus:ring-[#1769AA] border-[#22354E] bg-[#131E2E]"
                      />
                      <span>{localize(profile.language, 'I explicitly agree to share my microphone audio for two-way voice conversation.', 'أوافق صراحة على فتح الميكروفون للتحدث الصوتي المتبادل أثناء المكالمة.')}</span>
                    </label>
                  </div>

                  {/* Connect Button */}
                  <button
                    type="button"
                    onClick={handleStartAssistanceRequest}
                    disabled={session.state === 'connecting'}
                    className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                  >
                    <Video className="w-5 h-5" />
                    <span>
                      {session.state === 'connecting'
                        ? localize(profile.language, 'Connecting to companion...', 'جاري الاتصال بالمرافق...')
                        : localize(profile.language, 'Start Live Assistance Session', 'بدء جلسة المساعدة الحية الآن')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TOOL 2: HANDWRITING READER                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTool === 'handwriting' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#131E2E] border border-[#22354E] space-y-4 text-start shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/20 border border-[#1769AA]/40 flex items-center justify-center text-[#4B9FE1]">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#F8FAFC]">
                    {localize(profile.language, 'Handwriting & Doctor Note Reader', 'قارئ الخط اليدوي والروشتات الطبية')}
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {localize(
                      profile.language,
                      'Reads handwritten prescriptions, memos, and letters with explicit uncertainty marking.',
                      'قراءة الخطوط اليدوية والملاحظات الورقية مع تمييز الكلمات غير المؤكدة بدقة.'
                    )}
                  </p>
                </div>
              </div>

              {/* Sample Handwriting Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#94A3B8]">
                  {localize(profile.language, 'Handwritten Text Sample or Camera Capture', 'النص اليدوي الملتقط عبر الكاميرا:')}
                </label>
                <textarea
                  value={handwritingInput}
                  onChange={(e) => setHandwritingInput(e.target.value)}
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-[#1A283D] border border-[#22354E] text-sm text-[#F8FAFC] focus:border-[#1769AA] focus:ring-1 focus:ring-[#1769AA] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const res = parseHandwrittenText(handwritingInput, 0.82, 'Arabic');
                    setHandwritingResult(res);
                    speakText(res.spokenTranscriptionAr);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{localize(profile.language, 'Re-analyze Handwriting', 'إعادة تحليل الخط اليدوي')}</span>
                </button>
              </div>

              {/* Results Breakdown */}
              {handwritingResult && (
                <div className="p-5 rounded-2xl bg-[#1A283D] border border-[#22354E] space-y-4">
                  {handwritingResult.hasUncertainty && (
                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center gap-2.5 text-amber-300 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{handwritingResult.uncertaintyWarningAr}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-[#94A3B8]">
                      {localize(profile.language, 'Parsed Word Tokens (Uncertain Words Highlighted):', 'الكلمات المستخلصة (الكلمات غير المؤكدة مميزة بأقواس):')}
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {handwritingResult.tokens.map((token, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            token.isUncertain
                              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/50'
                              : 'bg-[#131E2E] text-[#F8FAFC] border border-[#22354E]'
                          }`}
                        >
                          {token.isUncertain ? `[${token.word}?]` : token.word}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => speakText(handwritingResult.spokenTranscriptionAr)}
                      className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{localize(profile.language, 'Listen to Transcript', 'استمع للنص كاملاً')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsInspectingSource(!isInspectingSource);
                        speakText(handwritingResult.sourceReplayNoticeAr);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#131E2E] border border-[#22354E] text-[#4B9FE1] hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <ZoomIn className="w-4 h-4" />
                      <span>
                        {isInspectingSource
                          ? localize(profile.language, 'Hide Source Zoom', 'إخفاء معاينة الأصل')
                          : localize(profile.language, 'Inspect Source Image', 'معاينة وفحص الأصل')}
                      </span>
                    </button>
                  </div>

                  {isInspectingSource && (
                    <div className="p-4 rounded-xl bg-[#131E2E] border border-[#22354E] space-y-2">
                      <p className="text-xs text-[#94A3B8]">{handwritingResult.sourceReplayNoticeAr}</p>
                      <div className="p-6 rounded-lg bg-[#061A33] border border-[#22354E] text-center font-mono text-sm text-[#4B9FE1]">
                        [عالية التباين: صورة الوثيقة اليدوية مكبرة 200%]
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TOOL 3: FORM & INVOICE ASSISTANT                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTool === 'form_reader' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#131E2E] border border-[#22354E] space-y-4 text-start shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/20 border border-[#1769AA]/40 flex items-center justify-center text-[#4B9FE1]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#F8FAFC]">
                    {localize(profile.language, 'Form & Official Document Assistant', 'مساعد تعبئة النماذج والاستمارات الرسمية')}
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {localize(
                      profile.language,
                      'Explains required vs optional fields with a strict rule against inventing missing personal data.',
                      'يشرح الحقول الإلزامية والاختيارية مع مبدأ صارم يمنع تخمين أي بيانات شخصية.'
                    )}
                  </p>
                </div>
              </div>

              {/* Anti-Fabrication Notice */}
              <div className="p-4 rounded-2xl bg-[#1A283D] border border-[#22354E] flex items-center gap-3 text-xs text-[#94A3B8]">
                <ShieldCheck className="w-5 h-5 text-[#4B9FE1] shrink-0" />
                <p>{formResult?.safetyAntiFabricationRuleAr}</p>
              </div>

              {/* Form Fields List */}
              {formResult && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#F8FAFC]">
                    {formResult.summaryExplanationAr}
                  </h3>

                  <div className="space-y-2.5">
                    {formResult.fields.map((field) => (
                      <div
                        key={field.id}
                        className="p-4 rounded-2xl bg-[#1A283D] border border-[#22354E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-start"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-[#F8FAFC]">{field.labelAr}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                field.isRequired
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {field.isRequired
                                ? localize(profile.language, 'Required *', 'إلزامي *')
                                : localize(profile.language, 'Optional', 'اختياري')}
                            </span>
                          </div>
                          <p className="text-xs text-[#94A3B8]">{field.instructionAr}</p>
                        </div>

                        <div className="text-xs text-[#4B9FE1] font-bold">
                          {field.isFilled ? 'تم إدخاله سابقاً' : 'بانتظار إدخالك الشخصي'}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsReviewConfirmed(!isReviewConfirmed);
                        speakText(
                          isAr
                            ? 'تمت مراجعة الحقول الإلزامية. تذكر: لا يتم اعتماد أو إرسال الاستمارة دون موافقتك الصريحة.'
                            : 'Required fields reviewed. Remember: no form is submitted without your explicit confirmation.'
                        );
                      }}
                      className="px-5 py-3 rounded-2xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                    >
                      <Check className="w-4 h-4" />
                      <span>{localize(profile.language, 'Confirm and Prepare Submission Review', 'تأكيد المراجعة واعتماد الاستمارة')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TOOL 4: VOICE MESSAGE TOOLS                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTool === 'voice_notes' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#131E2E] border border-[#22354E] space-y-4 text-start shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/20 border border-[#1769AA]/40 flex items-center justify-center text-[#4B9FE1]">
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#F8FAFC]">
                    {localize(profile.language, 'Voice Note Transcription & Summary', 'تفريغ وتلخيص الرسائل الصوتية')}
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {localize(
                      profile.language,
                      'Transcribes incoming voice messages in Arabic and English while keeping the original audio safe.',
                      'يحول الرسائل الصوتية لنص مكتوب مع تلخيصها والاحتفاظ بالملف الصوتي الأصلي.'
                    )}
                  </p>
                </div>
              </div>

              {/* Privacy Disclosure */}
              <div className="p-4 rounded-2xl bg-[#1A283D] border border-[#22354E] text-xs text-[#94A3B8] flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#4B9FE1] shrink-0" />
                <p>{voiceResult?.externalProcessingNoticeAr}</p>
              </div>

              {/* Voice Message Content Card */}
              {voiceResult && (
                <div className="p-5 rounded-2xl bg-[#1A283D] border border-[#22354E] space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#22354E]">
                    <div>
                      <h4 className="text-sm font-bold text-[#F8FAFC]">{voiceResult.fileName}</h4>
                      <p className="text-xs text-[#94A3B8]">
                        {localize(
                          profile.language,
                          `Duration: ${voiceResult.durationSeconds}s · Confidence: ${Math.round(voiceResult.confidenceScore * 100)}%`,
                          `المدة: ${voiceResult.durationSeconds} ثانية · نسبة الثقة: ${Math.round(voiceResult.confidenceScore * 100)}%`
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayingAudio(!isPlayingAudio);
                          speakText(voiceResult.transcriptText);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{localize(profile.language, 'Play Original Audio', 'تشغيل الصوت الأصلي')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 rounded-xl bg-[#131E2E] border border-[#22354E] space-y-1.5">
                    <h5 className="text-xs font-bold text-[#4B9FE1] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{localize(profile.language, 'AI Summary', 'ملخص الرسالة الذكي')}</span>
                    </h5>
                    <p className="text-xs text-[#F8FAFC] leading-relaxed">{voiceResult.summaryText}</p>
                  </div>

                  {/* Full Transcript */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-[#94A3B8]">
                      {localize(profile.language, 'Full Transcript', 'النص الكامل المفرغ:')}
                    </h5>
                    <p className="p-4 rounded-xl bg-[#131E2E] border border-[#22354E] text-xs text-[#F8FAFC] leading-relaxed">
                      {voiceResult.transcriptText}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TOOL 5: SOCIAL & MESSAGING ASSISTANT                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTool === 'social_assistant' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#131E2E] border border-[#22354E] space-y-4 text-start shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/20 border border-[#1769AA]/40 flex items-center justify-center text-[#4B9FE1]">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#F8FAFC]">
                    {localize(profile.language, 'Social Image Describer & Reply Drafter', 'واصف صور المحادثات ومساعد الصياغة')}
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {localize(
                      profile.language,
                      'Explains photos received in messages and drafts replies with strict review-before-send protections.',
                      'يشرح الصور المرفقة في رسائل الواتساب والرسائل النصية ويصيغ ردوداً مسبقة مع حماية منع الإرسال التلقائي.'
                    )}
                  </p>
                </div>
              </div>

              {/* Image Description Box */}
              {socialImageDescription && (
                <div className="p-5 rounded-2xl bg-[#1A283D] border border-[#22354E] space-y-3">
                  <h4 className="text-xs font-bold text-[#4B9FE1] flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{localize(profile.language, 'Image Description in Message:', 'وصف الصورة المرفقة في الرسالة:')}</span>
                  </h4>
                  <p className="text-xs text-[#F8FAFC] leading-relaxed">{socialImageDescription.descriptionAr}</p>
                  <button
                    type="button"
                    onClick={() => speakText(socialImageDescription.descriptionAr)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#131E2E] border border-[#22354E] text-[#4B9FE1] hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{localize(profile.language, 'Listen to Description', 'استمع للوصف')}</span>
                  </button>
                </div>
              )}

              {/* Reply Drafter */}
              <div className="p-5 rounded-2xl bg-[#1A283D] border border-[#22354E] space-y-4">
                <h4 className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#4B9FE1]" />
                  <span>{localize(profile.language, 'Draft Suggested Reply', 'صياغة رد مقترح:')}</span>
                </h4>

                {/* Tone Select */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#94A3B8]">{localize(profile.language, 'Tone:', 'نبرة الرد:')}</span>
                  {(['polite', 'casual', 'formal'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setReplyTone(t);
                        const draft = draftSocialReplyMessage(incomingMessageText, t, 'Arabic');
                        setReplyDraft(draft);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        replyTone === t
                          ? 'bg-[#1769AA] text-white shadow-sm'
                          : 'bg-[#131E2E] text-[#94A3B8] border border-[#22354E]'
                      }`}
                    >
                      {t === 'polite'
                        ? localize(profile.language, 'Polite', 'مهذب')
                        : t === 'casual'
                        ? localize(profile.language, 'Casual', 'ودي')
                        : localize(profile.language, 'Formal', 'رسمي')}
                    </button>
                  ))}
                </div>

                {replyDraft && (
                  <div className="space-y-3">
                    <textarea
                      value={replyDraft.draftText}
                      onChange={(e) => setReplyDraft({ ...replyDraft, draftText: e.target.value })}
                      rows={3}
                      className="w-full p-4 rounded-xl bg-[#131E2E] border border-[#22354E] text-xs text-[#F8FAFC] leading-relaxed outline-none"
                    />

                    {/* Strict review-before-send disclaimer */}
                    <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{replyDraft.sendSafetyNoticeAr}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(replyDraft.draftText);
                          setIsCopied(true);
                          const msg = isAr ? 'تم نسخ الرد المقترح إلى الحافظة بنجاح.' : 'Reply copied to clipboard.';
                          toast.success(msg);
                          speakText(msg);
                          setTimeout(() => setIsCopied(false), 2500);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{isCopied ? localize(profile.language, 'Copied!', 'تم النسخ!') : localize(profile.language, 'Review & Copy to Clipboard', 'مراجعة ونسخ الرد')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => speakText(replyDraft.draftText)}
                        className="px-4 py-2.5 rounded-xl bg-[#131E2E] border border-[#22354E] text-[#4B9FE1] hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>{localize(profile.language, 'Listen to Draft', 'استمع للمسودة')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TOOL 6: PAYMENT & CURRENCY GUIDANCE                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTool === 'payment_guidance' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#131E2E] border border-[#22354E] space-y-4 text-start shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1769AA]/20 border border-[#1769AA]/40 flex items-center justify-center text-[#4B9FE1]">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#F8FAFC]">
                    {localize(profile.language, 'Payment Guidance & Banknote Explainer', 'إرشادات الدفع وشرح العملات الورقية')}
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {localize(
                      profile.language,
                      'Explains visible payment instructions (Fawry, InstaPay) and recognized cash with anti-transaction safeguards.',
                      'يشرح تعليمات الدفع المكتوبة (فوري، انستاباي) وفئات النقود مع حظر كامل لأي معاملات مالية تلقائية.'
                    )}
                  </p>
                </div>
              </div>

              {/* Strict Anti-Transaction Banner */}
              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                <p>
                  <strong>{localize(profile.language, 'Crucial Invariant:', 'مبدأ مالي صارم:')}</strong>{' '}
                  {localize(
                    profile.language,
                    'Rafiqi NEVER executes money transfers, payments, or banking debits. It also CANNOT certify banknotes as genuine or counterfeit.',
                    'رفيقي لا ينفذ أي تحويل مالي أو خصم بنكي إطلاقاً، ولا يمكنه الجزم بصحة أو تزييف الأوراق النقدية بصرياً.'
                  )}
                </p>
              </div>

              {/* Payment OCR Sample Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#94A3B8]">
                  {localize(profile.language, 'Payment Slip or Invoice Text:', 'نص إيصال الدفع أو الفاتورة:')}
                </label>
                <textarea
                  value={paymentOcrText}
                  onChange={(e) => setPaymentOcrText(e.target.value)}
                  rows={2}
                  className="w-full p-4 rounded-2xl bg-[#1A283D] border border-[#22354E] text-xs text-[#F8FAFC] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const res = evaluatePaymentGuidance(paymentOcrText, 'مئتا جنيه مصري (200 EGP)', 'Arabic');
                    setPaymentResult(res);
                    speakText(res.spokenGuidanceAr);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{localize(profile.language, 'Analyze Payment Guidance', 'تحليل إرشادات الدفع')}</span>
                </button>
              </div>

              {/* Payment Guidance Breakdown */}
              {paymentResult && (
                <div className="p-5 rounded-2xl bg-[#1A283D] border border-[#22354E] space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#131E2E] border border-[#22354E]">
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase">{localize(profile.language, 'Service Provider', 'جهة الخدمة')}</span>
                      <p className="text-sm font-bold text-[#4B9FE1] mt-0.5">
                        {paymentResult.paymentProviderDetected?.toUpperCase() || 'إشعار عام'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#131E2E] border border-[#22354E]">
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase">{localize(profile.language, 'Reference Code', 'رقم الكود / المرجع')}</span>
                      <p className="text-sm font-bold text-[#F8FAFC] mt-0.5">
                        {paymentResult.referenceNumber || 'غير مذكور'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#131E2E] border border-[#22354E]">
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase">{localize(profile.language, 'Amount Due', 'المبلغ المطلوب')}</span>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">
                        {paymentResult.dueAmount || 'غير محدد'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#131E2E] border border-[#22354E] space-y-1.5">
                    <h5 className="text-xs font-bold text-[#F8FAFC]">{localize(profile.language, 'Guidance Summary:', 'ملخص الإرشادات:')}</h5>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{paymentResult.guidanceTextAr}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakText(paymentResult.spokenGuidanceAr)}
                    className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{localize(profile.language, 'Listen to Payment Guidance', 'استمع لتعليمات الدفع')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── SAFETY & PRIVACY NOTICE MODAL ── */}
      {showPrivacyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={localize(profile.language, 'Communication Privacy & Safety Principles', 'مبادئ أمان وخصوصية التواصل')}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="max-w-lg w-full rounded-3xl bg-[#131E2E] border border-[#22354E] p-6 space-y-5 text-start shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1769AA]/20 border border-[#1769AA]/40 flex items-center justify-center text-[#4B9FE1]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">
                  {localize(profile.language, 'Communication Safety & Privacy Charter', 'ميثاق أمان وخصوصية التواصل')}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {localize(profile.language, 'Strict boundaries for blind & visually impaired users', 'حدود حماية صارمة لخصوصية واستقلالية المستخدم')}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[#94A3B8] leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[#1A283D] border border-[#22354E] space-y-1">
                <strong className="text-[#F8FAFC] block">1. لا محاكاة لمساعدين بشريين وهميين:</strong>
                <p>نلتزم بالشفافية الكاملة وتوضيح ما إذا كانت المساعدة آلية أو بشرية حقيقية، مع اشتراط الموافقة الصريحة قبل فتح الكاميرا.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1A283D] border border-[#22354E] space-y-1">
                <strong className="text-[#F8FAFC] block">2. حظر تنفيذ المعاملات المالية المباشرة:</strong>
                <p>التطبيق إرشادي فقط ولا ينفذ أي مدفوعات أو تحويلات، ولا يدعي قدرة الكاميرا على كشف الأوراق النقدية المزيفة.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1A283D] border border-[#22354E] space-y-1">
                <strong className="text-[#F8FAFC] block">3. منع الإرسال التلقائي دون مراجعة:</strong>
                <p>لن يتم إرسال أو نشر أي رسالة نصية أو بريد إلكتروني دون مراجعتك ونقرك الصريح على زر الإرسال أو النسخ.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-3 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold text-xs cursor-pointer shadow-md transition-all focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            >
              {localize(profile.language, 'Close and Understand', 'فهمت وأوافق على المتابعة')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
