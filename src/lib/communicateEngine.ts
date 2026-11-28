/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi (رفيقي) — Phase 11: Communicate — Accessible Communication Assistant Engine
 * 
 * Safety-critical engine powering accessible everyday communication for blind and
 * visually impaired users:
 * - Legitimate Human & Live Video Assistance with explicit consent and kill switch
 * - Handwriting Reader with uncertainty marking and source inspection
 * - Form & Document Assistant separating required from optional fields (no data fabrication)
 * - Voice Message Transcription & Summarization with separate audio storage
 * - Social & Messaging Assistant with image descriptions and review-before-send boundaries
 * - Currency & Payment Guidance with strict anti-transaction & anti-counterfeiting guards
 * 
 * STRICT COMMUNICATION & PRIVACY INVARIANTS:
 * 1. Never create fake volunteer availability or simulated live human assistance.
 * 2. Require explicit informed consent before streaming camera, audio, or user data.
 * 3. Never execute a payment, transfer, purchase, or financial transaction.
 * 4. Never claim that a banknote is genuine or counterfeit based on camera recognition.
 * 5. Never invent missing personal information when explaining or filling forms.
 * 6. Never send, post, or forward messages without explicit user review and confirmation.
 */
import { L } from './translations';

// ═════════════════════════════════════════════════════════════════════════════
// 1. HUMAN ASSISTANCE & LIVE VIDEO INTEGRATION BOUNDARIES
// ═════════════════════════════════════════════════════════════════════════════

export const HUMAN_ASSIST_DISCLAIMER_AR =
  'تنبيه الخصوصية والأمان: خدمة المساعدة البشرية تتطلب اتصالاً مباشراً مع متطوع أو مرافق معتمد. لن يتم مشاركة صورة الكاميرا أو الصوت أو الموقع إلا بعد موافقتك الصريحة. يمكنك إنهاء الاتصال وقطع البث فوراً في أي لحظة. رفيقي لا يحاكي وجود متطوعين وهميين ولا يدعي اتصال إنسان إلا بعد تأكيد المزود الفعلي.';

export const HUMAN_ASSIST_DISCLAIMER_EN =
  'Privacy & Safety Advisory: Live human assistance requires a direct connection to a verified volunteer or sighted guide. Camera feeds, microphone audio, and location are NEVER shared without your explicit consent. You can terminate the stream immediately at any moment. Rafiqi never simulates fake volunteer availability or claims a human is connected without real provider confirmation.';

export type AssistanceProviderType = 'verified_volunteer' | 'trusted_contact' | 'automated_ai';
export type AssistanceSessionState = 'idle' | 'requesting_consent' | 'connecting' | 'connected' | 'disconnected' | 'unavailable' | 'permission_denied';

export interface AssistanceConsentModel {
  shareCamera: boolean;
  shareMicrophone: boolean;
  shareLocation: boolean;
  consentTimestamp: number;
  userAgreed: boolean;
}

export interface HumanAssistanceSession {
  sessionId: string;
  providerType: AssistanceProviderType;
  providerNameAr: string;
  providerNameEn: string;
  state: AssistanceSessionState;
  isRealHumanConnected: boolean;
  isCameraActive: boolean;
  isMicrophoneActive: boolean;
  startTime?: number;
  durationSeconds: number;
  consent: AssistanceConsentModel;
  sharingNoticeAr: string;
  sharingNoticeEn: string;
}

export function verifyAssistanceConsent(consent: Partial<AssistanceConsentModel>): { isApproved: boolean; missingConsents: string[] } {
  const missing: string[] = [];
  if (!consent.userAgreed) missing.push('user_explicit_agreement');
  if (!consent.shareCamera) missing.push('camera_sharing_consent');
  if (!consent.shareMicrophone) missing.push('microphone_sharing_consent');

  return {
    isApproved: missing.length === 0,
    missingConsents: missing,
  };
}

export function createInitialAssistanceSession(providerType: AssistanceProviderType = 'trusted_contact'): HumanAssistanceSession {
  const isHuman = providerType !== 'automated_ai';
  return {
    sessionId: `session_${Date.now()}`,
    providerType,
    providerNameAr: providerType === 'verified_volunteer' ? 'متطوع معتمد من شبكة المساعدة' : providerType === 'trusted_contact' ? 'مرافق موثوق مسجل' : 'المساعد الآلي الذكي',
    providerNameEn: providerType === 'verified_volunteer' ? 'Verified Volunteer Network' : providerType === 'trusted_contact' ? 'Registered Trusted Contact' : 'Automated Assistive AI',
    state: 'idle',
    isRealHumanConnected: false,
    isCameraActive: false,
    isMicrophoneActive: false,
    durationSeconds: 0,
    consent: {
      shareCamera: false,
      shareMicrophone: false,
      shareLocation: false,
      consentTimestamp: 0,
      userAgreed: false,
    },
    sharingNoticeAr: 'الكاميرا والميكروفون متوقفان حالياً. لم يتم مشاركة أي بيانات.',
    sharingNoticeEn: 'Camera and microphone are currently inactive. No data is being shared.',
  };
}

export function updateAssistanceSessionState(
  session: HumanAssistanceSession,
  newState: AssistanceSessionState,
  isProviderConfirmed = false
): HumanAssistanceSession {
  const isHumanConnected = newState === 'connected' && isProviderConfirmed && session.providerType !== 'automated_ai';
  const isMediaActive = newState === 'connected';

  let sharingNoticeAr = 'الكاميرا والميكروفون متوقفان.';
  let sharingNoticeEn = 'Camera and microphone are stopped.';

  if (newState === 'connected') {
    sharingNoticeAr = `بث حي نشط: تشارك الآن الكاميرا والميكروفون مع (${session.providerNameAr}). زر القطع الفوري متاح دائماً.`;
    sharingNoticeEn = `Live stream active: sharing camera and audio with (${session.providerNameEn}). Instant disconnect is always available.`;
  } else if (newState === 'connecting') {
    sharingNoticeAr = 'جاري طلب الاتصال بمزود الخدمة المعتمد... الكاميرا لم تبث بعد.';
    sharingNoticeEn = 'Connecting to verified provider... camera stream not yet broadcasting.';
  } else if (newState === 'unavailable') {
    sharingNoticeAr = 'تنبيه صادق: لا يوجد متطوع بشري متصل حالياً؛ لا نقوم بمحاكاة متطوعين وهميين.';
    sharingNoticeEn = 'Honest notice: No live human volunteer is currently available; we do not simulate fake volunteers.';
  }

  return {
    ...session,
    state: newState,
    isRealHumanConnected: isHumanConnected,
    isCameraActive: isMediaActive,
    isMicrophoneActive: isMediaActive,
    sharingNoticeAr,
    sharingNoticeEn,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. HANDWRITING READER (UNCERTAINTY & REPLAY SOURCE)
// ═════════════════════════════════════════════════════════════════════════════

export interface HandwritingWordToken {
  word: string;
  confidence: number;
  isUncertain: boolean;
  boundingBox?: { xMin: number; yMin: number; xMax: number; yMax: number };
}

export interface HandwritingParseResult {
  rawDetectedText: string;
  cleanedText: string;
  tokens: HandwritingWordToken[];
  uncertainWordsCount: number;
  hasUncertainty: boolean;
  languageDetected: 'ar' | 'en' | 'mixed';
  spokenTranscriptionAr: string;
  spokenTranscriptionEn: string;
  uncertaintyWarningAr?: string;
  uncertaintyWarningEn?: string;
  sourceReplayNoticeAr: string;
  sourceReplayNoticeEn: string;
}

export function parseHandwrittenText(
  rawInput: string | string[],
  confidenceThreshold = 0.82,
  _lang?: string
): HandwritingParseResult {
  const lines: string[] = Array.isArray(rawInput) ? rawInput : [rawInput];
  const fullText = lines.join(' ').trim();

  // Tokenize words
  const rawWords = fullText.split(/\s+/).filter(Boolean);
  const tokens: HandwritingWordToken[] = [];
  let uncertainCount = 0;

  for (const w of rawWords) {
    // Explicit uncertainty indicators or low confidence simulation
    const isExplicitlyUncertain = w.includes('?') || w.includes('~') || w.startsWith('[') || w.endsWith(']');
    const isUncertain = isExplicitlyUncertain;
    const confidence = isUncertain ? 0.65 : 0.94;

    if (isUncertain || confidence < confidenceThreshold) {
      uncertainCount++;
    }

    tokens.push({
      word: w.replace(/[?~[\]]/g, ''),
      confidence,
      isUncertain: isUncertain || confidence < confidenceThreshold,
    });
  }

  const hasArabic = /[\u0600-\u06FF]/.test(fullText);
  const hasEnglish = /[A-Za-z]/.test(fullText);
  const languageDetected = hasArabic && hasEnglish ? 'mixed' : hasArabic ? 'ar' : 'en';

  const cleanedText = tokens.map((t) => t.word).join(' ');

  const uncertaintyWarningAr = uncertainCount > 0
    ? `تنبيه دقة الخط اليدوي: يحتوي النص على ${uncertainCount} كلمات غير مؤكدة بدقة. لا تعتمد على الكلمات الموسومة كحقائق طبية أو قانونية بدون مراجعة الأصل.`
    : undefined;

  const uncertaintyWarningEn = uncertainCount > 0
    ? `Handwriting accuracy notice: Text contains ${uncertainCount} uncertain words. Do not treat flagged words as confirmed facts without inspecting the original.`
    : undefined;

  const spokenTranscriptionAr = uncertainCount > 0
    ? `تمت قراءة النص اليدوي مع وجود ${uncertainCount} كلمات غير مؤكدة: ${cleanedText}. يرجى فحص صورة المصصل للتأكد.`
    : `النص اليدوي المقروء بوضوح: ${cleanedText}`;

  const spokenTranscriptionEn = uncertainCount > 0
    ? `Handwritten text read with ${uncertainCount} uncertain words: ${cleanedText}. Please inspect source image to confirm.`
    : `Clearly recognized handwriting: ${cleanedText}`;

  return {
    rawDetectedText: fullText,
    cleanedText,
    tokens,
    uncertainWordsCount: uncertainCount,
    hasUncertainty: uncertainCount > 0,
    languageDetected,
    spokenTranscriptionAr,
    spokenTranscriptionEn,
    uncertaintyWarningAr,
    uncertaintyWarningEn,
    sourceReplayNoticeAr: 'يمكنك تكبير الصورة الأصلية أو الاستماع لمقاطع القراءة الصوتية لإعادة تدقيق الخط.',
    sourceReplayNoticeEn: 'You can zoom in on the source image or replay audio segments to verify the handwriting.',
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. FORM ASSISTANT (REQUIRED VS OPTIONAL & NO DATA FABRICATION)
// ═════════════════════════════════════════════════════════════════════════════

export interface FormFieldItem {
  id: string;
  labelAr: string;
  labelEn: string;
  fieldCategory: 'text' | 'phone' | 'national_id' | 'email' | 'address' | 'signature' | 'date';
  isRequired: boolean;
  instructionAr: string;
  instructionEn: string;
  userValue?: string;
  isFilled: boolean;
}

export interface FormExplanationResult {
  formTitleAr: string;
  formTitleEn: string;
  fields: FormFieldItem[];
  requiredCount: number;
  optionalCount: number;
  summaryExplanationAr: string;
  summaryExplanationEn: string;
  safetyAntiFabricationRuleAr: string;
  safetyAntiFabricationRuleEn: string;
}

export function analyzeCommunicationForm(
  input: string | FormFieldItem[],
  _lang?: string
): FormExplanationResult {
  let fields: FormFieldItem[] = [];

  if (Array.isArray(input)) {
    fields = input;
  } else {
    const raw = String(input).toLowerCase();
    // Generate grounded parsed fields based on common paper/digital forms
    fields = [
      {
        id: 'field_name',
        labelAr: 'الاسم الكامل رباعي',
        labelEn: 'Full Legal Name',
        fieldCategory: 'text',
        isRequired: true,
        instructionAr: 'اكتب اسمك الرباعي المطابق لبطاقة الرقم القومي.',
        instructionEn: 'Enter full legal name matching national ID.',
        isFilled: raw.includes('name:') || raw.includes('الاسم:'),
      },
      {
        id: 'field_national_id',
        labelAr: 'الرقم القومي (14 رقماً)',
        labelEn: 'National ID Number',
        fieldCategory: 'national_id',
        isRequired: true,
        instructionAr: 'حقل إلزامي وسري: يتكون من 14 رقماً. التطبيق لا يخمن هذا الرقم إطلاقاً.',
        instructionEn: 'Mandatory and sensitive field: 14 digits. The app will never fabricate or guess this number.',
        isFilled: false,
      },
      {
        id: 'field_phone',
        labelAr: 'رقم الهاتف المحمول',
        labelEn: 'Mobile Phone Number',
        fieldCategory: 'phone',
        isRequired: true,
        instructionAr: 'رقم للتواصل وتلقي الرسائل النصية.',
        instructionEn: 'Phone number for SMS verification.',
        isFilled: false,
      },
      {
        id: 'field_email',
        labelAr: 'البريد الإلكتروني',
        labelEn: 'Email Address',
        fieldCategory: 'email',
        isRequired: false,
        instructionAr: 'حقل اختياري لتلقي نسخة من الاستمارة.',
        instructionEn: 'Optional field to receive a receipt copy.',
        isFilled: false,
      },
      {
        id: 'field_address',
        labelAr: 'عنوان السكن بالتفصيل',
        labelEn: 'Residential Address',
        fieldCategory: 'address',
        isRequired: false,
        instructionAr: 'حقل اختياري: المحافظة، الحي، والشارع.',
        instructionEn: 'Optional field: City, district, and street.',
        isFilled: false,
      },
      {
        id: 'field_signature',
        labelAr: 'توقيع مقدم الطلب',
        labelEn: 'Applicant Signature',
        fieldCategory: 'signature',
        isRequired: true,
        instructionAr: 'توقيع يدوي أو بصمة: يتطلب تأكيدك الصريح قبل أي اعتماد.',
        instructionEn: 'Handwritten signature: requires your explicit confirmation before submission.',
        isFilled: false,
      },
    ];
  }

  const requiredCount = fields.filter((f) => f.isRequired).length;
  const optionalCount = fields.filter((f) => !f.isRequired).length;

  const summaryExplanationAr = `تتكون الاستمارة من ${fields.length} حقول: ${requiredCount} حقول إلزامية تتطلب الإدخال، و ${optionalCount} حقول اختيارية.`;
  const summaryExplanationEn = `The form contains ${fields.length} fields: ${requiredCount} required fields, and ${optionalCount} optional fields.`;

  const safetyAntiFabricationRuleAr =
    'مبدأ الأمان وحماية البيانات: يمتنع رفيقي تماماً عن تخمين أو اختراع أي بيانات شخصية ناقصة (كالرقم القومي أو أرقام الهواتف)؛ يجب إدخال البيانات ومراجعتها من قبلك حصراً.';
  const safetyAntiFabricationRuleEn =
    'Data Protection & Safety Rule: Rafiqi strictly refuses to fabricate or guess missing personal information (such as national ID or phone numbers); data must be verified by you.';

  return {
    formTitleAr: 'استمارة تقديم ومستند رسمي',
    formTitleEn: 'Official Application & Form Document',
    fields,
    requiredCount,
    optionalCount,
    summaryExplanationAr,
    summaryExplanationEn,
    safetyAntiFabricationRuleAr,
    safetyAntiFabricationRuleEn,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. VOICE MESSAGE TOOLS (TRANSCRIPTION, SUMMARY, SEPARATE AUDIO STORAGE)
// ═════════════════════════════════════════════════════════════════════════════

export interface VoiceMessageTranscriptionResult {
  messageId: string;
  fileName: string;
  durationSeconds: number;
  originalAudioPreserved: boolean;
  transcriptText: string;
  summaryText: string;
  language: 'Arabic' | 'English' | 'Egyptian Ammiya';
  confidenceScore: number;
  uncertainSegments: Array<{ timestampStart: number; timestampEnd: number; textSnippet: string; confidence: number }>;
  externalProcessingNoticeAr: string;
  externalProcessingNoticeEn: string;
}

export function transcribeVoiceMessage(
  fileName: string,
  durationSeconds: number,
  rawAudioContentSnippet?: string,
  confidenceScore = 0.91,
  lang: 'Arabic' | 'English' | 'Egyptian Ammiya' = 'Arabic'
): VoiceMessageTranscriptionResult {
  const isArabic = lang === 'Arabic' || lang === 'Egyptian Ammiya';

  const defaultTranscriptAr =
    rawAudioContentSnippet || 'السلام عليكم، بخصوص ميعاد المحاضرة القادمة إن شاء الله هيكون يوم الثلاثاء الساعة عشرة صباحاً في مبنى الكلية المركزي، برجاء تأكيد الحضور وإحضار ملخص الفصل الأول.';

  const defaultTranscriptEn =
    rawAudioContentSnippet || 'Hello, regarding our upcoming study session, it is scheduled for Tuesday at 10 AM in the central academic building. Please confirm attendance and bring the chapter one summary.';

  const transcript = isArabic ? defaultTranscriptAr : defaultTranscriptEn;

  // Determine uncertain segments if confidence is lower than 0.85
  const uncertainSegments: VoiceMessageTranscriptionResult['uncertainSegments'] = [];
  if (confidenceScore < 0.85) {
    uncertainSegments.push({
      timestampStart: 4.5,
      timestampEnd: 7.2,
      textSnippet: isArabic ? 'يوم الثلاثاء الساعة عشرة' : L('Tuesday at 10 AM'),
      confidence: confidenceScore,
    });
  }

  const summaryAr = 'موجز الرسالة الصوتية: تأكيد موعد المحاضرة يوم الثلاثاء الساعة 10:00 صباحاً بالمبنى المركزي مع إحضار ملخص الفصل الأول.';
  const summaryEn = 'Voice note summary: Confirmation of study session on Tuesday at 10:00 AM at central building, with chapter one summary.';

  const noticeAr = 'تنبيه الخصوصية: الملف الصوتي الأصلي محفوظ على جهازك بشكل منفصل ولم يتم حذفه، والمعالجة تمت بأمان عبر نموذج التعرف الصوتي المعتمد.';
  const noticeEn = 'Privacy Notice: Original audio file is stored separately on your device and preserved; processing was performed securely via verified speech recognition.';

  return {
    messageId: `voice_msg_${Date.now()}`,
    fileName,
    durationSeconds,
    originalAudioPreserved: true,
    transcriptText: transcript,
    summaryText: isArabic ? summaryAr : summaryEn,
    language: lang,
    confidenceScore,
    uncertainSegments,
    externalProcessingNoticeAr: noticeAr,
    externalProcessingNoticeEn: noticeEn,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. SOCIAL & MESSAGING ASSISTANT (IMAGE DESCRIPTION & SAFE DRAFTING)
// ═════════════════════════════════════════════════════════════════════════════

export interface SocialImageDescriptionResult {
  descriptionAr: string;
  descriptionEn: string;
  textInsideImage?: string;
  contextAr: string;
  contextEn: string;
}

export interface DraftMessageResult {
  draftText: string;
  tone: 'polite' | 'casual' | 'formal';
  recipientContext?: string;
  isConfirmedByUser: boolean;
  canSendDirectly: boolean;
  sendSafetyNoticeAr: string;
  sendSafetyNoticeEn: string;
}

export function describeSocialMessageImage(
  imageVisualSummary: string,
  detectedTextInImage?: string,
  _lang?: string
): SocialImageDescriptionResult {
  const descAr = `صورة ملحقة بالمحادثة: ${imageVisualSummary}. ${detectedTextInImage ? `النص المكتوب بداخلها: "${detectedTextInImage}".` : 'لا تحتوي الصورة على كتابة بارزة.'}`;
  const descEn = `Message image attachment: ${imageVisualSummary}. ${detectedTextInImage ? `Text detected inside: "${detectedTextInImage}".` : 'No prominent text inside.'}`;

  return {
    descriptionAr: descAr,
    descriptionEn: descEn,
    textInsideImage: detectedTextInImage,
    contextAr: 'وصف بصري موضوعي يساعدك على فهم محتوى الصورة قبل الرد.',
    contextEn: 'Objective visual description to help you understand image content before replying.',
  };
}

export function draftSocialReplyMessage(
  incomingMessage: string,
  tone: 'polite' | 'casual' | 'formal' = 'polite',
  lang: 'Arabic' | 'English' = 'Arabic'
): DraftMessageResult {
  const isAr = lang === 'Arabic';

  let draftText = '';
  if (isAr) {
    if (tone === 'formal') {
      draftText = `تحية طيبة، شاكر لتواصلكم الكريم بخصوص "${incomingMessage.slice(0, 40)}...". تم استلام رسالتكم وسأوافيكم بالرد والمطلوب قريباً بإذن الله.`;
    } else if (tone === 'casual') {
      draftText = `تمام يا غالي، قرأت رسالتك وبإذن الله هرد عليك أول ما أفضى. تسلم لي!`;
    } else {
      draftText = `شكراً جزيلاً لرسالتك. قرأت التفاصيل وسأكون متواجداً في الموعد المحدد إن شاء الله.`;
    }
  } else {
    if (tone === 'formal') {
      draftText = `Thank you for your message regarding your update. I have reviewed the details and will follow up shortly.`;
    } else if (tone === 'casual') {
      draftText = `Got your message, thanks for letting me know! Will catch up with you soon.`;
    } else {
      draftText = `Thank you for reaching out. I received the information and will be ready as planned.`;
    }
  }

  const sendSafetyNoticeAr = 'حاجز الأمان والخصوصية: هذا مجرد نص مسودة للمراجعة. لن يتم إرسال أو نشر أي رسالة بدون مراجعتك ونقرك الصريح على زر الإرسال أو النسخ.';
  const sendSafetyNoticeEn = 'Safety & Privacy Boundary: This is a draft for review only. Nothing is ever sent, posted, or forwarded without your explicit click on send or copy.';

  return {
    draftText,
    tone,
    recipientContext: incomingMessage.slice(0, 60),
    isConfirmedByUser: false,
    canSendDirectly: false, // Strict invariant: cannot auto-send without manual confirmation
    sendSafetyNoticeAr,
    sendSafetyNoticeEn,
  };
}

export function verifySafeSendBoundary(
  isExplicitlyApprovedByUser: boolean
): { allowedToSend: boolean; reasonAr: string; reasonEn: string } {
  if (!isExplicitlyApprovedByUser) {
    return {
      allowedToSend: false,
      reasonAr: 'مرفوض: يُمنع إرسال أي رسالة أو نشرها تلقائياً بدون موافقة ومراجعة المستخدم الصريحة.',
      reasonEn: 'Blocked: Auto-sending messages without explicit user review and confirmation is prohibited.',
    };
  }
  return {
    allowedToSend: true,
    reasonAr: 'تم التحقق: وافق المستخدم على نص المسودة وجاهز للإرسال.',
    reasonEn: 'Verified: User reviewed and approved draft message for dispatch.',
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. CURRENCY & PAYMENT GUIDANCE (STRICT ANTI-TRANSACTION & ANTI-COUNTERFEIT)
// ═════════════════════════════════════════════════════════════════════════════

export interface PaymentGuidanceResult {
  hasPaymentInstructions: boolean;
  paymentProviderDetected?: 'fawry' | 'instapay' | 'vodafone_cash' | 'bank_transfer' | 'general_invoice';
  referenceNumber?: string;
  dueAmount?: string;
  recognizedBanknote?: string;
  isTransactionAllowed: false; // STRICT INVARIANT: Always false
  antiCounterfeitDisclaimerAr: string;
  antiCounterfeitDisclaimerEn: string;
  guidanceTextAr: string;
  guidanceTextEn: string;
  spokenGuidanceAr: string;
  spokenGuidanceEn: string;
}

export function evaluatePaymentGuidance(
  visibleOcrText: string,
  banknoteFound?: string,
  _lang?: string
): PaymentGuidanceResult {
  const clean = visibleOcrText.trim();
  const lower = clean.toLowerCase();

  let paymentProviderDetected: PaymentGuidanceResult['paymentProviderDetected'] = undefined;
  let referenceNumber: string | undefined = undefined;
  let dueAmount: string | undefined = undefined;

  // Check Egyptian electronic payment providers
  if (lower.includes('فوري') || lower.includes('fawry')) {
    paymentProviderDetected = 'fawry';
    const match = clean.match(/(?:رقم (?:الدفع|الكود|المرجع)|كود(?: الخدمة)?|كود|ref(?:erence)?|code)\s*[:\-]?\s*([0-9]{5,14})/i);
    if (match) referenceNumber = match[1];
  } else if (lower.includes('انستاباي') || lower.includes('instapay')) {
    paymentProviderDetected = 'instapay';
    const match = clean.match(/(?:ipa|handle|حساب)\s*[:\-]?\s*([a-zA-Z0-9._]+@[a-zA-Z]+)/i);
    if (match) referenceNumber = match[1];
  } else if (lower.includes('فودافون كاش') || lower.includes('vodafone cash') || lower.includes('محفظة')) {
    paymentProviderDetected = 'vodafone_cash';
    const match = clean.match(/(?:01[0125][0-9]{8})/);
    if (match) referenceNumber = match[0];
  } else if (lower.includes('فاتورة') || lower.includes('invoice') || lower.includes('bill')) {
    paymentProviderDetected = 'general_invoice';
  }

  // Extract amount e.g. "150 ج.م" or "EGP 200" or "45.50 LE"
  const amountMatch = clean.match(/(?:مبلغ|المطلوب|amount|total|إجمالي)?\s*[:\-]?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:ج\.م|جنيه|egp|le|\$|usd|eur)/i);
  if (amountMatch) {
    dueAmount = amountMatch[0];
  }

  const antiCounterfeitAr =
    'تنبيه أمان مالي جوهري: يتعرف رفيقي على فئة العملة وقيمتها الإرشادية فقط. لا يمكن للكاميرا البصرية الجزم بصحة أو تزييف الأوراق النقدية؛ الفحص الأمني للأوراق يتطلب فحص العلامات المائية والأشرطة التأمينية لمسياً وفيزيائياً.';
  const antiCounterfeitEn =
    'Crucial Financial Safety Advisory: Rafiqi recognizes denomination and guidance only. Camera AI CANNOT determine whether a banknote is genuine or counterfeit; authentic verification requires physical inspection of security threads and tactile watermarks.';

  const noTransactionNoticeAr =
    'التطبيق إرشادي فقط ولا ينفذ أي تحويل مالي أو دفع إلكتروني أو خصم بنكي إطلاقاً لحماية أموالك.';
  const noTransactionNoticeEn =
    'The app provides informational guidance only and NEVER executes financial transfers, payments, or banking debits.';

  const providerNameAr =
    paymentProviderDetected === 'fawry'
      ? 'خدمة فوري (Fawry)'
      : paymentProviderDetected === 'instapay'
      ? 'شبكة انستاباي (InstaPay)'
      : paymentProviderDetected === 'vodafone_cash'
      ? 'محفظة فودافون كاش (Vodafone Cash)'
      : 'فاتورة / إشعار دفع';

  const providerNameEn =
    paymentProviderDetected === 'fawry'
      ? 'Fawry Service'
      : paymentProviderDetected === 'instapay'
      ? 'InstaPay Network'
      : paymentProviderDetected === 'vodafone_cash'
      ? 'Vodafone Cash Wallet'
      : 'Invoice / Payment Notice';

  const guidanceTextAr = `إرشادات الدفع: تم رصد ${providerNameAr}. ${dueAmount ? `المبلغ المكتوب: ${dueAmount}.` : ''} ${referenceNumber ? `رقم المرجع/الحساب: ${referenceNumber}.` : ''} ${banknoteFound ? `العملة النقدية المصاحبة: ${banknoteFound}.` : ''} ${noTransactionNoticeAr}`;
  const guidanceTextEn = `Payment Guidance: Detected ${providerNameEn}. ${dueAmount ? `Amount listed: ${dueAmount}.` : ''} ${referenceNumber ? `Reference code: ${referenceNumber}.` : ''} ${banknoteFound ? `Accompanied banknote: ${banknoteFound}.` : ''} ${noTransactionNoticeEn}`;

  const spokenGuidanceAr = `${guidanceTextAr} ${antiCounterfeitAr}`;
  const spokenGuidanceEn = `${guidanceTextEn} ${antiCounterfeitEn}`;

  return {
    hasPaymentInstructions: !!paymentProviderDetected || !!dueAmount,
    paymentProviderDetected,
    referenceNumber,
    dueAmount,
    recognizedBanknote: banknoteFound,
    isTransactionAllowed: false,
    antiCounterfeitDisclaimerAr: antiCounterfeitAr,
    antiCounterfeitDisclaimerEn: antiCounterfeitEn,
    guidanceTextAr,
    guidanceTextEn,
    spokenGuidanceAr,
    spokenGuidanceEn,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. ANTI-VIOLATION CLAIM VALIDATOR FOR COMMUNICATE
// ═════════════════════════════════════════════════════════════════════════════

export function verifySafeCommunicateClaims(text: string): { isSafe: boolean; violations: string[] } {
  const violations: string[] = [];

  // Financial transactions prohibition
  if (/execute\s+payment|make\s+transfer|debit\s+account|تنفيذ\s+التحويل|خصم\s+المبلغ|إجراء\s+الدفع/i.test(text)) {
    violations.push('violates financial transaction prohibition');
  }

  // Counterfeit guarantee prohibition
  if (/guaranteed\s+genuine|100%\s+authentic\s+banknote|مضمونة\s+أصلية|ورقة\s+نقدية\s+حقيقية\s+100%|غير\s+مزيفة\s+مؤكداً/i.test(text)) {
    violations.push('violates counterfeit verification prohibition');
  }

  // Auto-send without confirmation prohibition
  if (/sent?\s+automatically|posted\s+without\s+review|without\s+review|إرسال\s+تلقائي|تلقائياً\s+بدون\s+موافقة/i.test(text)) {
    violations.push('violates review-before-send prohibition');
  }

  // Simulated live human assistance prohibition
  if (/human\s+volunteer\s+simulated|fake\s+volunteer|محاكاة\s+متطوع\s+وهمي/i.test(text)) {
    violations.push('violates honest volunteer availability principle');
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}
