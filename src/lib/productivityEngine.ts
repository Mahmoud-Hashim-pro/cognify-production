/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi (رفيقي) — Phase 9: Work & Create Productivity Assistant Engine
 * 
 * Production engine powering accessible productivity for blind and visually impaired users:
 * 1. Voice Document Creation & Dictation with spoken feedback and replacement guards.
 * 2. Writing and Email Assistant (MSA, Egyptian Ammiya, English) with tone/length controls and zero unauthorized send.
 * 3. PowerPoint Creator with verified OpenXML .pptx export, speaker notes, and screen-reader sequential review.
 * 4. Excel Assistant with CSV/TSV parsing, table summarization, formula evaluation/explanation, and overwrite protection.
 * 5. Chart Description Engine with honest grounded trends, comparisons, and tabular equivalents without hallucination.
 * 6. Smart Form Filling with required/optional explanations, sensitive field guards, and explicit confirmation.
 */

import { createZip, ZipEntry } from './zipWriter';

// ═════════════════════════════════════════════════════════════════════════════
// 1. VOICE DOCUMENT CREATION & DICTATION
// ═════════════════════════════════════════════════════════════════════════════

export type VoiceBlockType = 'heading1' | 'heading2' | 'paragraph' | 'bullet' | 'numbered';

export interface VoiceDocumentBlock {
  id: string;
  type: VoiceBlockType;
  text: string;
  createdAt: string;
}

export interface VoiceDocument {
  id: string;
  title: string;
  blocks: VoiceDocumentBlock[];
  language: 'ar' | 'en';
  updatedAt: string;
}

export interface ParsedVoiceCommand {
  isStructuralCommand: boolean;
  blockType: VoiceBlockType;
  text: string;
  spokenFeedbackAr: string;
  spokenFeedbackEn: string;
  isClearRequest?: boolean;
}

/**
 * Punctuation normalizer that transforms spoken punctuation tokens into real typographic symbols
 */
export function normalizeSpokenPunctuation(text: string, lang: 'ar' | 'en'): string {
  if (!text) return '';
  let cleaned = text;

  if (lang === 'ar') {
    cleaned = cleaned
      .replace(/\s*(علامة استفهام|علامه استفهام)\s*/gi, '؟ ')
      .replace(/\s*(علامة تعجب|علامه تعجب)\s*/gi, '! ')
      .replace(/\s*(نقطة جديدة|نقطه جديده|نقطة|نقطه)(?=\s|$)/gi, '. ')
      .replace(/\s*(فاصلة منقوطة|فاصله منقوطه)\s*/gi, '؛ ')
      .replace(/\s*(فاصلة جديدة|فاصله جديده|فاصلة|فاصله)\s*/gi, '، ')
      .replace(/\s*(نقطتان راسيتان|نقطتين راسيتين|نقطتان|نقطتين)\s*/gi, ': ')
      .replace(/\s*(بين قوسين|فتح قوس|افتح قوس)\s*/gi, ' (')
      .replace(/\s*(اغلق القوس|قفل القوس)\s*/gi, ') ')
      .replace(/\s*(شرطة|علامة ناقص)\s*/gi, ' - ');
  } else {
    cleaned = cleaned
      .replace(/\s*(question mark)\s*/gi, '? ')
      .replace(/\s*(exclamation mark|exclamation point)\s*/gi, '! ')
      .replace(/\s*(period|full stop)(?=\s|$)/gi, '. ')
      .replace(/\s*(semicolon)\s*/gi, '; ')
      .replace(/\s*(comma)\s*/gi, ', ')
      .replace(/\s*(colon)\s*/gi, ': ')
      .replace(/\s*(open parenthesis|open bracket)\s*/gi, ' (')
      .replace(/\s*(close parenthesis|close bracket)\s*/gi, ') ')
      .replace(/\s*(dash|hyphen)\s*/gi, ' - ');
  }

  // Clean double spaces
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Parses spoken input for headings, paragraphs, bullet points, numbers, and punctuation
 */
export function parseVoiceInputToCommand(rawInput: string, lang: 'ar' | 'en'): ParsedVoiceCommand {
  const trimmed = rawInput.trim();
  const normalized = normalizeSpokenPunctuation(trimmed, lang);

  // Check for clear/reset request
  if (
    /^(مسح الكل|ابدأ من جديد|امسح المستند|تفريغ المستند)$/i.test(trimmed) ||
    /^(clear document|start over|erase all|reset document)$/i.test(trimmed)
  ) {
    return {
      isStructuralCommand: true,
      blockType: 'paragraph',
      text: '',
      isClearRequest: true,
      spokenFeedbackAr: 'طلب مسح المستند، يتطلب تأكيدك أولاً للحفاظ على بياناتك.',
      spokenFeedbackEn: 'Document clear requested, requires your confirmation first to safeguard your data.',
    };
  }

  // Arabic structural commands
  if (lang === 'ar') {
    const h1Match = trimmed.match(/^(?:عنوان رئيسي|عنوان أول|عنوان كبير)[:\s]+(.+)$/i);
    if (h1Match) {
      const content = normalizeSpokenPunctuation(h1Match[1], 'ar');
      return {
        isStructuralCommand: true,
        blockType: 'heading1',
        text: content,
        spokenFeedbackAr: `تمت إضافة عنوان رئيسي: ${content}`,
        spokenFeedbackEn: `Added main heading: ${content}`,
      };
    }

    const h2Match = trimmed.match(/^(?:عنوان فرعي|عنوان ثاني|عنوان صغير)[:\s]+(.+)$/i);
    if (h2Match) {
      const content = normalizeSpokenPunctuation(h2Match[1], 'ar');
      return {
        isStructuralCommand: true,
        blockType: 'heading2',
        text: content,
        spokenFeedbackAr: `تمت إضافة عنوان فرعي: ${content}`,
        spokenFeedbackEn: `Added sub-heading: ${content}`,
      };
    }

    const bulletMatch = trimmed.match(/^(?:نقطة جديدة|تعداد نقطي|نقطة)[:\s]+(.+)$/i);
    if (bulletMatch) {
      const content = normalizeSpokenPunctuation(bulletMatch[1], 'ar');
      return {
        isStructuralCommand: true,
        blockType: 'bullet',
        text: content,
        spokenFeedbackAr: `تمت إضافة عنصر نقطي: ${content}`,
        spokenFeedbackEn: `Added bullet point: ${content}`,
      };
    }

    const numMatch = trimmed.match(/^(?:قائمة مرقمة|رقم جديد|تعداد رقمي|بند)[:\s]+(.+)$/i);
    if (numMatch) {
      const content = normalizeSpokenPunctuation(numMatch[1], 'ar');
      return {
        isStructuralCommand: true,
        blockType: 'numbered',
        text: content,
        spokenFeedbackAr: `تمت إضافة بند مرقم: ${content}`,
        spokenFeedbackEn: `Added numbered item: ${content}`,
      };
    }

    const pMatch = trimmed.match(/^(?:فقرة جديدة|سطر جديد)[:\s]+(.+)$/i);
    if (pMatch) {
      const content = normalizeSpokenPunctuation(pMatch[1], 'ar');
      return {
        isStructuralCommand: true,
        blockType: 'paragraph',
        text: content,
        spokenFeedbackAr: `تمت إضافة فقرة جديدة: ${content}`,
        spokenFeedbackEn: `Added new paragraph: ${content}`,
      };
    }
  } else {
    // English structural commands
    const h1Match = trimmed.match(/^(?:heading 1|main heading|title)[:\s]+(.+)$/i);
    if (h1Match) {
      const content = normalizeSpokenPunctuation(h1Match[1], 'en');
      return {
        isStructuralCommand: true,
        blockType: 'heading1',
        text: content,
        spokenFeedbackAr: `تمت إضافة عنوان رئيسي: ${content}`,
        spokenFeedbackEn: `Added main heading: ${content}`,
      };
    }

    const h2Match = trimmed.match(/^(?:heading 2|sub heading|section)[:\s]+(.+)$/i);
    if (h2Match) {
      const content = normalizeSpokenPunctuation(h2Match[1], 'en');
      return {
        isStructuralCommand: true,
        blockType: 'heading2',
        text: content,
        spokenFeedbackAr: `تمت إضافة عنوان فرعي: ${content}`,
        spokenFeedbackEn: `Added sub-heading: ${content}`,
      };
    }

    const bulletMatch = trimmed.match(/^(?:new bullet|bullet point|bullet)[:\s]+(.+)$/i);
    if (bulletMatch) {
      const content = normalizeSpokenPunctuation(bulletMatch[1], 'en');
      return {
        isStructuralCommand: true,
        blockType: 'bullet',
        text: content,
        spokenFeedbackAr: `تمت إضافة عنصر نقطي: ${content}`,
        spokenFeedbackEn: `Added bullet item: ${content}`,
      };
    }

    const numMatch = trimmed.match(/^(?:numbered list|new number|item)[:\s]+(.+)$/i);
    if (numMatch) {
      const content = normalizeSpokenPunctuation(numMatch[1], 'en');
      return {
        isStructuralCommand: true,
        blockType: 'numbered',
        text: content,
        spokenFeedbackAr: `تمت إضافة بند مرقم: ${content}`,
        spokenFeedbackEn: `Added numbered item: ${content}`,
      };
    }

    const pMatch = trimmed.match(/^(?:new paragraph|new line)[:\s]+(.+)$/i);
    if (pMatch) {
      const content = normalizeSpokenPunctuation(pMatch[1], 'en');
      return {
        isStructuralCommand: true,
        blockType: 'paragraph',
        text: content,
        spokenFeedbackAr: `تمت إضافة فقرة جديدة: ${content}`,
        spokenFeedbackEn: `Added new paragraph: ${content}`,
      };
    }
  }

  // Default: plain text block / paragraph
  return {
    isStructuralCommand: false,
    blockType: 'paragraph',
    text: normalized,
    spokenFeedbackAr: `أضيف: ${normalized}`,
    spokenFeedbackEn: `Added: ${normalized}`,
  };
}

/**
 * Replacement safety guard: Prevents silent overwrite of document content
 */
export function verifyDocumentReplacementSafety(
  currentDoc: VoiceDocument,
  incomingContentLength: number
): {
  requiresConfirmation: boolean;
  warningAr: string;
  warningEn: string;
  existingWordCount: number;
} {
  const currentText = currentDoc.blocks.map((b) => b.text).join(' ');
  const words = currentText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount > 0) {
    return {
      requiresConfirmation: true,
      warningAr: `المستند الحالي يحتوي على ${wordCount} كلمة. هل ترغب بالتأكيد في استبدال المحتوى بالكامل؟`,
      warningEn: `Current document contains ${wordCount} words. Are you sure you want to replace its entire content?`,
      existingWordCount: wordCount,
    };
  }

  return {
    requiresConfirmation: false,
    warningAr: '',
    warningEn: '',
    existingWordCount: 0,
  };
}

/**
 * Exports Voice Document to standard Markdown
 */
export function exportDocumentToMarkdown(doc: VoiceDocument): string {
  let md = `# ${doc.title}\n\n`;
  let numberedIndex = 1;

  for (const block of doc.blocks) {
    switch (block.type) {
      case 'heading1':
        md += `\n# ${block.text}\n\n`;
        numberedIndex = 1;
        break;
      case 'heading2':
        md += `\n## ${block.text}\n\n`;
        numberedIndex = 1;
        break;
      case 'bullet':
        md += `• ${block.text}\n`;
        numberedIndex = 1;
        break;
      case 'numbered':
        md += `${numberedIndex++}. ${block.text}\n`;
        break;
      case 'paragraph':
      default:
        md += `\n${block.text}\n\n`;
        numberedIndex = 1;
        break;
    }
  }

  return md.trim();
}

/**
 * Exports Voice Document to accessible plain text
 */
export function exportDocumentToPlainText(doc: VoiceDocument): string {
  return doc.blocks.map((b) => b.text).join('\n\n');
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. WRITING & EMAIL ASSISTANT
// ═════════════════════════════════════════════════════════════════════════════

export type WritingTask = 'draft' | 'revise' | 'summarize' | 'structure';
export type WritingDialect = 'msa' | 'egyptian' | 'english';
export type WritingTone = 'formal' | 'academic' | 'friendly' | 'concise' | 'empathetic';
export type WritingLength = 'short' | 'medium' | 'detailed';

export interface EmailAssistantInput {
  recipient: string;
  purpose: string;
  keyPoints: string[];
  deadlineOrNextStep?: string;
  tone: WritingTone;
  dialect: WritingDialect;
  length: WritingLength;
}

export interface GeneratedEmailDraft {
  subject: string;
  salutation: string;
  bodyParagraphs: string[];
  callToAction?: string;
  signOff: string;
  fullDraftText: string;
  wordCount: number;
  disclaimer: string;
}

/**
 * Security rule: Rafiqi NEVER transmits messages or emails automatically
 */
export function canSendEmailDirectly(): boolean {
  return false;
}

export const EMAIL_SECURITY_DISCLAIMER_AR =
  'حماية الخصوصية: رفيقي لا يرسل البريد الإلكتروني أو الرسائل تلقائياً أبداً. يمكنك نسخ المسودة ومراجعتها واعتماد إرسالها بنفسك عبر تطبيق بريدك المفضل.';
export const EMAIL_SECURITY_DISCLAIMER_EN =
  'Privacy Protection: Rafiqi never sends emails or messages automatically. You can copy and review this draft, then send it via your approved email client.';

/**
 * Deterministic, offline-capable Writing & Email Assistant
 */
export function generateEmailDraft(input: EmailAssistantInput): GeneratedEmailDraft {
  const isAr = input.dialect === 'msa' || input.dialect === 'egyptian';
  const isEgyptian = input.dialect === 'egyptian';

  // 1. Salutation
  let salutation = '';
  if (isEgyptian) {
    switch (input.tone) {
      case 'formal':
      case 'academic':
        salutation = `حضرة الأستاذ / ${input.recipient || 'الفاضل'}، تحياتي واحترامي لحضرتك.`;
        break;
      case 'friendly':
        salutation = `أهلاً بك يا ${input.recipient || 'صديقي العزيز'}، يا رب تكون بخير.`;
        break;
      case 'empathetic':
        salutation = `عزيزي ${input.recipient || 'الفاضل'}، أتمنى تكون بأحسن حال وراحة بال.`;
        break;
      case 'concise':
      default:
        salutation = `تحياتي يا ${input.recipient || 'أستاذ'}.`;
        break;
    }
  } else if (isAr) {
    switch (input.tone) {
      case 'formal':
        salutation = `سعادة الأستاذ / ${input.recipient || 'المحترم'}،\nتحية طيبة وبعد،،`;
        break;
      case 'academic':
        salutation = `سعادة الدكتور / ${input.recipient || 'الفاضل'}، الأستاذ الموقر،\nالسلام عليكم ورحمة الله وبركاته،،`;
        break;
      case 'friendly':
        salutation = `أخي الكريم / ${input.recipient || 'العزيز'}،\nأتمنى أن تصلك رسالتي وأنت بأتم الصحة والعافية،،`;
        break;
      case 'empathetic':
        salutation = `عزيزي / ${input.recipient || 'المحترم'}،\nتقبل خالص تقديري ومودتي، وأتمنى لك دوام التوفيق والسكينة،،`;
        break;
      case 'concise':
      default:
        salutation = `الأستاذ / ${input.recipient || 'المحترم'}،\nتحية طيبة،،`;
        break;
    }
  } else {
    // English
    switch (input.tone) {
      case 'formal':
        salutation = `Dear ${input.recipient || 'Sir/Madam'},`;
        break;
      case 'academic':
        salutation = `Dear Professor ${input.recipient || 'Colleague'},`;
        break;
      case 'friendly':
        salutation = `Hi ${input.recipient || 'there'}, hope you are doing well!`;
        break;
      case 'empathetic':
        salutation = `Dear ${input.recipient || 'Friend'}, I hope this message finds you in good health and high spirits.`;
        break;
      case 'concise':
      default:
        salutation = `Hello ${input.recipient || 'Team'},`;
        break;
    }
  }

  // 2. Subject Line
  let subject = '';
  if (isAr) {
    subject = input.purpose
      ? `${input.tone === 'formal' ? 'بشأن: ' : ''}${input.purpose}`
      : 'بخصوص المتابعة والتنسيق المشترك';
  } else {
    subject = input.purpose
      ? `${input.tone === 'formal' ? 'Regarding: ' : ''}${input.purpose}`
      : 'Regarding Follow-up and Coordination';
  }

  // 3. Body paragraphs
  const bodyParagraphs: string[] = [];

  // Opening purpose statement
  if (isEgyptian) {
    bodyParagraphs.push(
      `حبيت أتواصل مع حضرتك بخصوص ${input.purpose || 'الموضوع اللي اتكلمنا فيه'}، وعاوز أعرض لحضرتك النقط الأساسية:`
    );
  } else if (isAr) {
    bodyParagraphs.push(
      `يسرني التواصل معكم بشأن ${input.purpose || 'الموضوع المشار إليه أعلاه'}، ونود إحاطتكم علماً بالنقاط التالية:`
    );
  } else {
    bodyParagraphs.push(
      `I am writing to you regarding ${input.purpose || 'our ongoing coordination'}, and I would like to highlight the following key points:`
    );
  }

  // Key points
  const points = (input.keyPoints || []).filter(Boolean);
  if (points.length > 0) {
    if (input.length === 'short') {
      const joined = points.join(isAr ? '، مع ' : ', as well as ');
      bodyParagraphs.push(isAr ? `الموضوع يرتكز على: ${joined}.` : `The core aspects include: ${joined}.`);
    } else {
      points.forEach((pt, idx) => {
        bodyParagraphs.push(isAr ? `• ${pt}` : `• ${pt}`);
      });
    }
  }

  // 4. Call to Action / Next steps
  let callToAction = '';
  if (input.deadlineOrNextStep) {
    if (isEgyptian) {
      callToAction = `يا ريت لو في فرصة نراجع ده قبل ${input.deadlineOrNextStep} علشان نلحق نرتب الخطوة الجاية.`;
    } else if (isAr) {
      callToAction = `نرجو التكرم بمراجعة ما ورد وموافاتنا بملاحظاتكم قبل ${input.deadlineOrNextStep} ليتسنى لنا اتخاذ الإجراءات اللازمة.`;
    } else {
      callToAction = `We kindly appreciate your review and feedback before ${input.deadlineOrNextStep} so we can proceed with the next milestone.`;
    }
  } else {
    if (isEgyptian) {
      callToAction = 'مستني رد حضرتك وأي استفسار أنا تحت أمرك في أي وقت.';
    } else if (isAr) {
      callToAction = 'شاكرين لكم حسن تعاونكم الدائم، ونسعد بتلقي أي استفسارات أو ملاحظات لديكم.';
    } else {
      callToAction = 'Thank you for your continuous support, and please let me know if you have any questions.';
    }
  }
  bodyParagraphs.push(callToAction);

  // 5. Sign-off
  let signOff = '';
  if (isEgyptian) {
    signOff = 'مع خالص الود والشكر لحضرتك،\nفريق العمل';
  } else if (isAr) {
    signOff = 'وتفضلوا بقبول فائق الاحترام والتقدير،،\nالمرسل';
  } else {
    signOff = input.tone === 'formal' || input.tone === 'academic' ? 'Sincerely,\nSender' : 'Best regards,\nSender';
  }

  // Combine full text
  const fullDraftText = [
    `${isAr ? 'الموضوع:' : 'Subject:'} ${subject}`,
    '',
    salutation,
    '',
    ...bodyParagraphs,
    '',
    signOff,
  ].join('\n');

  const wordCount = fullDraftText.trim().split(/\s+/).filter(Boolean).length;

  return {
    subject,
    salutation,
    bodyParagraphs,
    callToAction,
    signOff,
    fullDraftText,
    wordCount,
    disclaimer: isAr ? EMAIL_SECURITY_DISCLAIMER_AR : EMAIL_SECURITY_DISCLAIMER_EN,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. POWERPOINT CREATOR & OPENXML PPTX GENERATOR
// ═════════════════════════════════════════════════════════════════════════════

export interface SlideItem {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  speakerNotes: string;
  layout?: 'title' | 'content' | 'summary';
}

export interface PresentationModel {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  slides: SlideItem[];
  createdAt: string;
}

/**
 * Creates structured presentations from a topic outline without meaningless AI hallucination
 */
export function createPresentationFromTopic(
  topic: string,
  slideCount: number = 4,
  lang: 'ar' | 'en' = 'ar'
): PresentationModel {
  const isAr = lang === 'ar';
  const cleanTopic = topic.trim() || (isAr ? 'الموضوع العام' : 'General Topic');

  const slides: SlideItem[] = [];

  // Slide 1: Title
  slides.push({
    slideNumber: 1,
    title: cleanTopic,
    bulletPoints: isAr
      ? [
          'عرض تقديمي ميسر تم إعداده عبر منصة رفيقي للإنتاجية',
          'محتوى منظم ومفهرس بالكامل لقارئات الشاشة',
          'تسلسل منطقي يضمن الاستيعاب التام دون تشتيت بصري',
        ]
      : [
          'Accessible presentation created via Rafiqi Productivity Assistant',
          'Structured and fully indexed for screen readers',
          'Logical progression designed for clear cognitive comprehension',
        ],
    speakerNotes: isAr
      ? `مرحباً بالحضور الكريم، نناقش اليوم موضوع: ${cleanTopic}. سنمر عبر النقاط المحورية بتسلسل ميسر ومنظم.`
      : `Welcome everyone, today we examine ${cleanTopic} across structured, accessible milestones.`,
    layout: 'title',
  });

  // Slide 2: Core Concept & Objectives
  slides.push({
    slideNumber: 2,
    title: isAr ? `الأهداف والمفاهيم الأساسية: ${cleanTopic}` : `Core Concepts: ${cleanTopic}`,
    bulletPoints: isAr
      ? [
          'تحديد الإطار النظري والتطبيقي للموضوع',
          'بيان الفوائد والمخرجات المتوقعة بوضوح',
          'مراعاة المعايير القياسية وسهولة الوصول لكافة المستفيدين',
        ]
      : [
          'Define the theoretical and practical framework',
          'Articulate expected outcomes and strategic value',
          'Ensure standard compliance and universal accessibility',
        ],
    speakerNotes: isAr
      ? `في هذه الشريحة نركز على الركائز الأساسية التي يبنى عليها موضوع ${cleanTopic}، ونحدد الأهداف القابلة للقياس.`
      : `Here we establish the fundamental pillars supporting ${cleanTopic} with measurable objectives.`,
    layout: 'content',
  });

  // Slide 3: Practical Implementation & Analysis
  slides.push({
    slideNumber: 3,
    title: isAr ? 'خطوات التنفيذ والتحليل العملي' : 'Implementation & Practical Analysis',
    bulletPoints: isAr
      ? [
          'المرحلة الأولى: جمع البيانات وحصر المتطلبات بدقة',
          'المرحلة الثانية: التطبيق التدريجي ومراقبة الجودة',
          'المرحلة الثالثة: التقييم المستمر وتصحيح المسار',
        ]
      : [
          'Phase 1: Accurate data gathering and requirement scoping',
          'Phase 2: Staged execution with quality guardrails',
          'Phase 3: Continuous assessment and iterative feedback',
        ],
    speakerNotes: isAr
      ? 'نشرح هنا خطة العمل ثلاثية المراحل لتطبيق هذا الموضوع على أرض الواقع بكفاءة وأمان.'
      : 'Explaining the 3-phase execution roadmap to ensure reliable, high-integrity implementation.',
    layout: 'content',
  });

  // Slide 4: Summary & Recommendations
  slides.push({
    slideNumber: 4,
    title: isAr ? 'الخلاصة والتوصيات المستقبلية' : 'Summary & Strategic Recommendations',
    bulletPoints: isAr
      ? [
          'الالتزام بالتوثيق الشفاف وحفظ السجلات',
          'توفير بدائل ميسرة تناسب جميع احتياجات المستخدمين',
          'فتح باب النقاش والأسئلة لتعزيز الفهم المشترك',
        ]
      : [
          'Adhere to transparent documentation and verifiable records',
          'Provide accessible alternatives suited for all user abilities',
          'Open discussion and Q&A to reinforce shared comprehension',
        ],
    speakerNotes: isAr
      ? 'نختتم بتقديم التوصيات النهائية ونفتح المجال للاستفسارات والمناقشة البناءة.'
      : 'Concluding with actionable recommendations and opening the floor for constructive Q&A.',
    layout: 'summary',
  });

  return {
    id: `pres_${Date.now()}`,
    title: cleanTopic,
    subtitle: isAr ? 'عرض ميسر وشامل' : 'Accessible Comprehensive Presentation',
    slides: slides.slice(0, Math.max(1, slideCount)),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates presentation from raw outline text
 */
export function createPresentationFromOutline(outlineText: string, lang: 'ar' | 'en' = 'ar'): PresentationModel {
  const isAr = lang === 'ar';
  const lines = outlineText.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    return createPresentationFromTopic(isAr ? 'عرض تقديمي جديد' : 'New Presentation', 3, lang);
  }

  const slides: SlideItem[] = [];
  let currentSlide: Partial<SlideItem> | null = null;
  let slideCounter = 0;

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('شريحة') || line.startsWith('Slide')) {
      if (currentSlide && currentSlide.title) {
        slides.push({
          slideNumber: ++slideCounter,
          title: currentSlide.title,
          bulletPoints: currentSlide.bulletPoints || [],
          speakerNotes: currentSlide.speakerNotes || '',
          layout: slideCounter === 1 ? 'title' : 'content',
        });
      }
      currentSlide = {
        title: line.replace(/^[#\d.:-\s]+/, '').replace(/^(?:شريحة|Slide)\s*\d*[:.-]?\s*/i, '').trim(),
        bulletPoints: [],
        speakerNotes: '',
      };
    } else if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      if (!currentSlide) {
        currentSlide = { title: isAr ? 'مقدمة' : 'Introduction', bulletPoints: [], speakerNotes: '' };
      }
      currentSlide.bulletPoints?.push(line.replace(/^[-•*]\s*/, '').trim());
    } else if (line.toLowerCase().startsWith('notes:') || line.startsWith('ملاحظات:')) {
      if (currentSlide) {
        currentSlide.speakerNotes = line.replace(/^(?:notes:|ملاحظات:)\s*/i, '').trim();
      }
    } else {
      if (!currentSlide) {
        currentSlide = { title: line, bulletPoints: [], speakerNotes: '' };
      } else {
        currentSlide.bulletPoints?.push(line);
      }
    }
  }

  if (currentSlide && currentSlide.title) {
    slides.push({
      slideNumber: ++slideCounter,
      title: currentSlide.title,
      bulletPoints: currentSlide.bulletPoints || [],
      speakerNotes: currentSlide.speakerNotes || '',
      layout: slideCounter === 1 ? 'title' : 'content',
    });
  }

  return {
    id: `pres_${Date.now()}`,
    title: slides[0]?.title || (isAr ? 'عرض تقديمي ميسر' : 'Accessible Presentation'),
    slides: slides.length > 0 ? slides : createPresentationFromTopic('Presentation', 3, lang).slides,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Escapes raw XML characters safely
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates genuine OpenXML .pptx presentation package using createZip
 */
export async function generatePptxBlob(presentation: PresentationModel): Promise<Blob> {
  const entries: ZipEntry[] = [];
  const slideCount = presentation.slides.length;

  // 1. [Content_Types].xml
  let contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`;

  for (let i = 1; i <= slideCount; i++) {
    contentTypesXml += `\n  <Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    contentTypesXml += `\n  <Override PartName="/ppt/notesSlides/notesSlide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`;
  }
  contentTypesXml += `\n</Types>`;
  entries.push({ name: '[Content_Types].xml', blob: new Blob([contentTypesXml], { type: 'application/xml' }) });

  // 2. _rels/.rels
  const globalRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
  entries.push({ name: '_rels/.rels', blob: new Blob([globalRelsXml], { type: 'application/xml' }) });

  // 3. ppt/presentation.xml
  let presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>`;
  for (let i = 1; i <= slideCount; i++) {
    presXml += `\n    <p:sldId id="${255 + i}" r:id="rId${i + 1}"/>`;
  }
  presXml += `\n  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
  entries.push({ name: 'ppt/presentation.xml', blob: new Blob([presXml], { type: 'application/xml' }) });

  // 4. ppt/_rels/presentation.xml.rels
  let presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`;
  for (let i = 1; i <= slideCount; i++) {
    presRelsXml += `\n  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`;
  }
  presRelsXml += `\n</Relationships>`;
  entries.push({ name: 'ppt/_rels/presentation.xml.rels', blob: new Blob([presRelsXml], { type: 'application/xml' }) });

  // 5. ppt/theme/theme1.xml (Navy blue accessible palette)
  const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Rafiqi Navy Blue">
  <a:themeElements>
    <a:clrScheme name="Rafiqi">
      <a:dk1><a:srgbClr val="061A33"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="131E2E"/></a:dk2>
      <a:lt2><a:srgbClr val="F5F9FD"/></a:lt2>
      <a:accent1><a:srgbClr val="1769AA"/></a:accent1>
      <a:accent2><a:srgbClr val="0D4778"/></a:accent2>
      <a:accent3><a:srgbClr val="4B9FE1"/></a:accent3>
      <a:accent4><a:srgbClr val="22C55E"/></a:accent4>
      <a:accent5><a:srgbClr val="EAB308"/></a:accent5>
      <a:accent6><a:srgbClr val="EF4444"/></a:accent6>
      <a:hlink><a:srgbClr val="1769AA"/></a:hlink>
      <a:folHlink><a:srgbClr val="0D4778"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Rafiqi Typography">
      <a:majorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface="Arial"/></a:majorFont>
      <a:minorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface="Arial"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme>
  </a:themeElements>
</a:theme>`;
  entries.push({ name: 'ppt/theme/theme1.xml', blob: new Blob([themeXml], { type: 'application/xml' }) });

  // 6. ppt/slideMasters/slideMaster1.xml & rels
  const slideMasterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;
  entries.push({ name: 'ppt/slideMasters/slideMaster1.xml', blob: new Blob([slideMasterXml], { type: 'application/xml' }) });

  const slideMasterRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;
  entries.push({ name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', blob: new Blob([slideMasterRelsXml], { type: 'application/xml' }) });

  // 7. ppt/slideLayouts/slideLayout1.xml & rels
  const slideLayoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="title">
  <p:cSld name="Title Slide"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
</p:sldLayout>`;
  entries.push({ name: 'ppt/slideLayouts/slideLayout1.xml', blob: new Blob([slideLayoutXml], { type: 'application/xml' }) });

  const slideLayoutRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;
  entries.push({ name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', blob: new Blob([slideLayoutRelsXml], { type: 'application/xml' }) });

  // 8. Generate each slide and notes slide
  for (let i = 0; i < slideCount; i++) {
    const s = presentation.slides[i];
    const sNum = i + 1;

    // Slide XML
    let bulletsXml = '';
    for (const b of s.bulletPoints) {
      bulletsXml += `
        <a:p>
          <a:pPr lvl="0"><a:buChar char="•"/></a:pPr>
          <a:r>
            <a:rPr lang="ar-SA" sz="2000"><a:solidFill><a:srgbClr val="131E2E"/></a:solidFill></a:rPr>
            <a:t>${escapeXml(b)}</a:t>
          </a:r>
        </a:p>`;
    }

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <!-- Slide Title Shape -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title ${sNum}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="914400" y="548640"/><a:ext cx="10363200" cy="1143000"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:rPr lang="ar-SA" sz="3600" b="1"><a:solidFill><a:srgbClr val="1769AA"/></a:solidFill></a:rPr>
              <a:t>${escapeXml(s.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <!-- Content Bullets Shape -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content ${sNum}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="914400" y="1920240"/><a:ext cx="10363200" cy="4389120"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          ${bulletsXml}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    entries.push({ name: `ppt/slides/slide${sNum}.xml`, blob: new Blob([slideXml], { type: 'application/xml' }) });

    // Slide rels
    const slideRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${sNum}.xml"/>
</Relationships>`;
    entries.push({ name: `ppt/slides/_rels/slide${sNum}.xml.rels`, blob: new Blob([slideRelsXml], { type: 'application/xml' }) });

    // Notes Slide XML (with speaker notes)
    const notesSlideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Notes Text"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:rPr lang="ar-SA" sz="1400"/>
              <a:t>${escapeXml(s.speakerNotes || 'ملاحظات الشريحة الميسرة لقارئ الشاشة.')}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;
    entries.push({ name: `ppt/notesSlides/notesSlide${sNum}.xml`, blob: new Blob([notesSlideXml], { type: 'application/xml' }) });

    const notesSlideRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${sNum}.xml"/>
</Relationships>`;
    entries.push({ name: `ppt/notesSlides/_rels/notesSlide${sNum}.xml.rels`, blob: new Blob([notesSlideRelsXml], { type: 'application/xml' }) });
  }

  // Pack all entries into OpenXML ZIP archive
  return await createZip(entries);
}

/**
 * Exports presentation to accessible HTML Slide Deck for non-visual and screen-reader review
 */
export function exportPresentationToHtmlDeck(presentation: PresentationModel): string {
  let html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${escapeXml(presentation.title)}</title>
  <style>
    body { font-family: Segoe UI, system-ui, sans-serif; background: #061A33; color: #F8FAFC; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    .slide-card { background: #131E2E; border: 2px solid #1769AA; border-radius: 1rem; padding: 2rem; margin-bottom: 2rem; }
    h1 { color: #4B9FE1; margin-top: 0; }
    h2 { color: #F8FAFC; border-bottom: 1px solid #22354E; padding-bottom: 0.5rem; }
    ul { padding-inline-start: 1.5rem; }
    li { margin-bottom: 0.75rem; font-size: 1.1rem; }
    .speaker-notes { background: #1A283D; border-inline-start: 4px solid #E5A93C; padding: 1rem; border-radius: 0.5rem; margin-top: 1.5rem; font-size: 0.95rem; color: #CBD5E1; }
  </style>
</head>
<body>
  <h1>${escapeXml(presentation.title)}</h1>
  <main>`;

  presentation.slides.forEach((s) => {
    html += `
    <article class="slide-card" aria-label="شريحة ${s.slideNumber}: ${escapeXml(s.title)}">
      <h2>شريحة ${s.slideNumber}: ${escapeXml(s.title)}</h2>
      <ul>
        ${s.bulletPoints.map((b) => `<li>${escapeXml(b)}</li>`).join('')}
      </ul>
      ${s.speakerNotes ? `<div class="speaker-notes" role="note" aria-label="ملاحظات المتحدث"><strong style="color: #F8FAFC;">ملاحظات المتحدث:</strong> ${escapeXml(s.speakerNotes)}</div>` : ''}
    </article>`;
  });

  html += `\n  </main>\n</body>\n</html>`;
  return html;
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. EXCEL ASSISTANT & SPREADSHEET ENGINE
// ═════════════════════════════════════════════════════════════════════════════

export interface SpreadsheetModel {
  id: string;
  name: string;
  headers: string[];
  rows: (string | number)[][];
  totalRows: number;
  totalColumns: number;
}

export interface ColumnStatistics {
  sum: number;
  average: number;
  min: number;
  max: number;
  count: number;
}

export interface SpreadsheetSummary {
  summaryTextAr: string;
  summaryTextEn: string;
  totalCells: number;
  numericColumns: string[];
  textColumns: string[];
  statistics: Record<string, ColumnStatistics>;
}

/**
 * Parses raw CSV or TSV string into structured SpreadsheetModel
 */
export function parseCsvOrTsv(rawText: string, defaultName = 'جدول بيانات'): SpreadsheetModel {
  if (!rawText || !rawText.trim()) {
    return {
      id: `sheet_${Date.now()}`,
      name: defaultName,
      headers: ['A', 'B', 'C'],
      rows: [],
      totalRows: 0,
      totalColumns: 3,
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      id: `sheet_${Date.now()}`,
      name: defaultName,
      headers: ['A', 'B', 'C'],
      rows: [],
      totalRows: 0,
      totalColumns: 3,
    };
  }

  // Detect delimiter: tab, comma, semicolon, or pipe
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
  else if (firstLine.includes('|')) delimiter = '|';

  const parseLine = (line: string): string[] => {
    if (delimiter === ',') {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    }
    return line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
  };

  const rawHeaders = parseLine(lines[0]);
  const rows: (string | number)[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const parsedRow = cells.map((cell) => {
      const num = Number(cell);
      return !isNaN(num) && cell.trim() !== '' ? num : cell;
    });
    // Pad to match headers length
    while (parsedRow.length < rawHeaders.length) {
      parsedRow.push('');
    }
    rows.push(parsedRow);
  }

  return {
    id: `sheet_${Date.now()}`,
    name: defaultName,
    headers: rawHeaders,
    rows,
    totalRows: rows.length,
    totalColumns: rawHeaders.length,
  };
}

/**
 * Generates comprehensive verbalized summary of a spreadsheet for blind users
 */
export function generateSpreadsheetSummary(model: SpreadsheetModel): SpreadsheetSummary {
  const numericColumns: string[] = [];
  const textColumns: string[] = [];
  const statistics: Record<string, ColumnStatistics> = {};

  model.headers.forEach((h, colIdx) => {
    const colValues = model.rows.map((r) => r[colIdx]);
    const numValues = colValues.filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (numValues.length > 0 && numValues.length >= colValues.length * 0.5) {
      numericColumns.push(h);
      const sum = numValues.reduce((a, b) => a + b, 0);
      const average = sum / numValues.length;
      const min = Math.min(...numValues);
      const max = Math.max(...numValues);
      statistics[h] = {
        sum: Number(sum.toFixed(2)),
        average: Number(average.toFixed(2)),
        min,
        max,
        count: numValues.length,
      };
    } else {
      textColumns.push(h);
    }
  });

  const totalCells = model.totalRows * model.totalColumns;

  // Build Arabic verbal description
  let summaryTextAr = `الجدول "${model.name}" يتألف من ${model.totalColumns} أعمدة و ${model.totalRows} صفاً بإجمالي ${totalCells} خلية.\n`;
  summaryTextAr += `الأعمدة المتاحة: ${model.headers.join('، ')}.\n`;
  if (numericColumns.length > 0) {
    summaryTextAr += `الأعمدة الرقمية القابلة للحساب: ${numericColumns.join('، ')}.\n`;
    numericColumns.forEach((col) => {
      const st = statistics[col];
      summaryTextAr += `• العمود "${col}": المجموع = ${st.sum}، المتوسط = ${st.average}، أدنى قيمة = ${st.min}، أقصى قيمة = ${st.max}.\n`;
    });
  }

  // Build English verbal description
  let summaryTextEn = `Spreadsheet "${model.name}" contains ${model.totalColumns} columns and ${model.totalRows} rows, totaling ${totalCells} cells.\n`;
  summaryTextEn += `Available headers: ${model.headers.join(', ')}.\n`;
  if (numericColumns.length > 0) {
    summaryTextEn += `Numeric columns: ${numericColumns.join(', ')}.\n`;
    numericColumns.forEach((col) => {
      const st = statistics[col];
      summaryTextEn += `• Column "${col}": Total = ${st.sum}, Average = ${st.average}, Min = ${st.min}, Max = ${st.max}.\n`;
    });
  }

  return {
    summaryTextAr: summaryTextAr.trim(),
    summaryTextEn: summaryTextEn.trim(),
    totalCells,
    numericColumns,
    textColumns,
    statistics,
  };
}

/**
 * Formula Evaluator & Plain-Language Explainer
 * Evaluates SUM, AVERAGE, COUNT, MIN, MAX, IF, and arithmetic formulas
 */
export function evaluateSpreadsheetFormula(
  formula: string,
  model: SpreadsheetModel
): {
  result: number | string;
  explanationAr: string;
  explanationEn: string;
  isValid: boolean;
  error?: string;
} {
  const clean = formula.trim().toUpperCase();

  if (!clean.startsWith('=')) {
    return {
      result: formula,
      explanationAr: 'القيمة المدخلة نصية وليست صيغة حسابية.',
      explanationEn: 'Entered value is literal text, not a formula.',
      isValid: true,
    };
  }

  // Helper to convert cell letter to col index (A -> 0, B -> 1)
  const colLetterToIndex = (letter: string) => letter.charCodeAt(0) - 65;

  // Helper to get range numbers: e.g. "A1:A5" or "B2:B10"
  const getRangeValues = (rangeStr: string): number[] => {
    const match = rangeStr.match(/([A-Z])(\d+):([A-Z])(\d+)/i);
    if (!match) return [];
    const colStart = colLetterToIndex(match[1].toUpperCase());
    const rowStart = parseInt(match[2], 10) - 1; // 1-indexed to 0-indexed row
    const colEnd = colLetterToIndex(match[3].toUpperCase());
    const rowEnd = parseInt(match[4], 10) - 1;

    const values: number[] = [];
    for (let r = Math.min(rowStart, rowEnd); r <= Math.max(rowStart, rowEnd); r++) {
      for (let c = Math.min(colStart, colEnd); c <= Math.max(colStart, colEnd); c++) {
        if (model.rows[r] && model.rows[r][c] !== undefined) {
          const val = Number(model.rows[r][c]);
          if (!isNaN(val)) values.push(val);
        }
      }
    }
    return values;
  };

  // Helper to get single cell value: e.g. "A1"
  const getCellValue = (cellStr: string): number | string => {
    const match = cellStr.match(/([A-Z])(\d+)/i);
    if (!match) return 0;
    const col = colLetterToIndex(match[1].toUpperCase());
    const row = parseInt(match[2], 10) - 1;
    if (model.rows[row] && model.rows[row][col] !== undefined) {
      return model.rows[row][col];
    }
    return 0;
  };

  // 1. SUM
  const sumMatch = clean.match(/^=SUM\((.+)\)$/);
  if (sumMatch) {
    const range = sumMatch[1];
    const vals = getRangeValues(range);
    if (vals.length === 0) {
      return {
        result: 0,
        explanationAr: `حساب مجموع النطاق (${range}): لم يتم العثور على قيم رقمية. المجموع = 0.`,
        explanationEn: `Calculating SUM of range (${range}): no numeric values found. Total = 0.`,
        isValid: true,
      };
    }
    const sum = Number(vals.reduce((a, b) => a + b, 0).toFixed(2));
    return {
      result: sum,
      explanationAr: `صيغة المجموع SUM(${range}): تجمع ${vals.length} خلايا في النطاق المحدد، والنتيجة الإجمالية هي ${sum}.`,
      explanationEn: `Formula SUM(${range}): sums ${vals.length} cells in the specified range, resulting in ${sum}.`,
      isValid: true,
    };
  }

  // 2. AVERAGE
  const avgMatch = clean.match(/^=AVERAGE\((.+)\)$/);
  if (avgMatch) {
    const range = avgMatch[1];
    const vals = getRangeValues(range);
    if (vals.length === 0) {
      return {
        result: 0,
        explanationAr: `حساب المتوسط AVERAGE(${range}): لا توجد قيم، المتوسط = 0.`,
        explanationEn: `Calculating AVERAGE(${range}): no values, average = 0.`,
        isValid: true,
      };
    }
    const avg = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
    return {
      result: avg,
      explanationAr: `صيغة المتوسط الحسابي AVERAGE(${range}): تحسب متوسط ${vals.length} قيم، والنتيجة هي ${avg}.`,
      explanationEn: `Formula AVERAGE(${range}): calculates the arithmetic mean of ${vals.length} cells, resulting in ${avg}.`,
      isValid: true,
    };
  }

  // 3. COUNT
  const countMatch = clean.match(/^=COUNT\((.+)\)$/);
  if (countMatch) {
    const range = countMatch[1];
    const vals = getRangeValues(range);
    return {
      result: vals.length,
      explanationAr: `صيغة العدد COUNT(${range}): تحصي عدد الخلايا الرقمية في النطاق، والعدد هو ${vals.length}.`,
      explanationEn: `Formula COUNT(${range}): counts numeric cells in the specified range, resulting in ${vals.length}.`,
      isValid: true,
    };
  }

  // 4. MIN / MAX
  const minMatch = clean.match(/^=MIN\((.+)\)$/);
  if (minMatch) {
    const range = minMatch[1];
    const vals = getRangeValues(range);
    const min = vals.length > 0 ? Math.min(...vals) : 0;
    return {
      result: min,
      explanationAr: `صيغة أدنى قيمة MIN(${range}): تستخرج أقل رقم بين قيم النطاق، والنتيجة هي ${min}.`,
      explanationEn: `Formula MIN(${range}): finds the lowest value in the range, resulting in ${min}.`,
      isValid: true,
    };
  }

  const maxMatch = clean.match(/^=MAX\((.+)\)$/);
  if (maxMatch) {
    const range = maxMatch[1];
    const vals = getRangeValues(range);
    const max = vals.length > 0 ? Math.max(...vals) : 0;
    return {
      result: max,
      explanationAr: `صيغة أعلى قيمة MAX(${range}): تستخرج أكبر رقم بين قيم النطاق، والنتيجة هي ${max}.`,
      explanationEn: `Formula MAX(${range}): finds the highest value in the range, resulting in ${max}.`,
      isValid: true,
    };
  }

  // 5. IF
  const ifMatch = clean.match(/^=IF\(([^,]+),\s*([^,]+),\s*(.+)\)$/);
  if (ifMatch) {
    const condition = ifMatch[1].trim();
    const trueVal = ifMatch[2].trim().replace(/^["']|["']$/g, '');
    const falseVal = ifMatch[3].trim().replace(/^["']|["']$/g, '');

    // Simple comparison evaluator e.g. A1>10 or B2=100
    const compMatch = condition.match(/([A-Z]\d+)\s*(>=|<=|>|<|=|!=)\s*(\d+|"[^"]*")/);
    let isTrue = false;
    if (compMatch) {
      const cellVal = getCellValue(compMatch[1]);
      const op = compMatch[2];
      const target = isNaN(Number(compMatch[3])) ? compMatch[3].replace(/^["']|["']$/g, '') : Number(compMatch[3]);

      if (op === '>') isTrue = Number(cellVal) > Number(target);
      else if (op === '>=') isTrue = Number(cellVal) >= Number(target);
      else if (op === '<') isTrue = Number(cellVal) < Number(target);
      else if (op === '<=') isTrue = Number(cellVal) <= Number(target);
      else if (op === '=') isTrue = cellVal == target;
      else if (op === '!=') isTrue = cellVal != target;
    }

    const evaluatedResult = isTrue ? trueVal : falseVal;
    return {
      result: evaluatedResult,
      explanationAr: `الصيغة الشرطية IF: الشرط (${condition}) كانت نتيجته (${isTrue ? 'متحقق' : 'غير متحقق'})، وبالتالي النتيجة هي "${evaluatedResult}".`,
      explanationEn: `Conditional Formula IF: condition (${condition}) evaluated to (${isTrue ? 'True' : 'False'}), resulting in "${evaluatedResult}".`,
      isValid: true,
    };
  }

  // 6. Simple Arithmetic: e.g. =A1+B1 or =A1*1.14
  const arithMatch = clean.match(/^=([A-Z]\d+)\s*([+\-*/])\s*([A-Z]\d+|\d+(?:\.\d+)?)$/);
  if (arithMatch) {
    const val1 = Number(getCellValue(arithMatch[1])) || 0;
    const op = arithMatch[2];
    const val2 = arithMatch[3].match(/^[A-Z]\d+$/) ? Number(getCellValue(arithMatch[3])) || 0 : Number(arithMatch[3]);

    if (op === '/' && val2 === 0) {
      return {
        result: '#DIV/0!',
        explanationAr: 'خطأ: محاولة قسمة على صفر، وهي عملية غير معرفة رياضياً.',
        explanationEn: 'Error: Division by zero is undefined.',
        isValid: false,
        error: 'Division by zero',
      };
    }

    let res = 0;
    if (op === '+') res = val1 + val2;
    else if (op === '-') res = val1 - val2;
    else if (op === '*') res = val1 * val2;
    else if (op === '/') res = val1 / val2;

    const finalRes = Number(res.toFixed(2));
    return {
      result: finalRes,
      explanationAr: `عملية حسابية: ${arithMatch[1]} (${val1}) ${op} ${arithMatch[3]} (${val2}) = ${finalRes}.`,
      explanationEn: `Arithmetic operation: ${arithMatch[1]} (${val1}) ${op} ${arithMatch[3]} (${val2}) = ${finalRes}.`,
      isValid: true,
    };
  }

  return {
    result: '#NAME?',
    explanationAr: `الصيغة "${formula}" غير مدعومة حالياً أو تحتوي على خطأ في البنية. يدعم رفيقي صيغ: SUM, AVERAGE, COUNT, MIN, MAX, IF والعمليات الأساسية.`,
    explanationEn: `Formula "${formula}" is unsupported or malformed. Rafiqi supports: SUM, AVERAGE, COUNT, MIN, MAX, IF and basic arithmetic.`,
    isValid: false,
    error: 'Unsupported formula pattern',
  };
}

/**
 * Formula & Data Overwrite Safety Guard
 * Prevents silent overwriting of formulas or data
 */
export function verifyCellUpdateSafety(
  oldValue: string | number | undefined,
  newValue: string | number,
  hasExistingFormula = false
): {
  safeToApplyDirectly: boolean;
  warningAr?: string;
  warningEn?: string;
} {
  if (oldValue === undefined || oldValue === '') {
    return { safeToApplyDirectly: true };
  }

  if (oldValue === newValue) {
    return { safeToApplyDirectly: true };
  }

  if (hasExistingFormula) {
    return {
      safeToApplyDirectly: false,
      warningAr: `تنبيه أمان: الخلية تحتوي على صيغة حسابية سابقة (${oldValue}). الكتابة فوقها ستستبدل المعادلة بالقيمة (${newValue}). هل تؤكد التعديل؟`,
      warningEn: `Safety Alert: This cell contains an active formula (${oldValue}). Overwriting will replace the formula with (${newValue}). Confirm overwrite?`,
    };
  }

  return {
    safeToApplyDirectly: false,
    warningAr: `تنبيه: الخلية تحتوي بالفعل على قيمة سابقة (${oldValue}). هل تؤكد استبدالها بالقيمة الجديدة (${newValue})؟`,
    warningEn: `Notice: This cell already has a value (${oldValue}). Do you confirm replacing it with (${newValue})?`,
  };
}

/**
 * Exports spreadsheet to standard CSV format
 */
export function exportSpreadsheetToCsv(model: SpreadsheetModel): string {
  const escapeCell = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerRow = model.headers.map(escapeCell).join(',');
  const dataRows = model.rows.map((row) => row.map(escapeCell).join(','));
  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Exports spreadsheet to standard TSV format
 */
export function exportSpreadsheetToTsv(model: SpreadsheetModel): string {
  const headerRow = model.headers.join('\t');
  const dataRows = model.rows.map((row) => row.join('\t'));
  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Exports spreadsheet to genuine Microsoft Excel XML (SpreadsheetML) format
 */
export function exportSpreadsheetToExcelXml(model: SpreadsheetModel): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(model.name)}">
  <Table>`;

  // Headers
  xml += '\n   <Row>';
  model.headers.forEach((h) => {
    xml += `\n    <Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
  });
  xml += '\n   </Row>';

  // Data
  model.rows.forEach((r) => {
    xml += '\n   <Row>';
    r.forEach((c) => {
      const isNum = typeof c === 'number' && !isNaN(c);
      xml += `\n    <Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(String(c ?? ''))}</Data></Cell>`;
    });
    xml += '\n   </Row>';
  });

  xml += `\n  </Table>
 </Worksheet>
</Workbook>`;
  return xml;
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. CHART DESCRIPTION ENGINE (STRICT ANTI-HALLUCINATION)
// ═════════════════════════════════════════════════════════════════════════════

export type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'area' | 'scatter';

export interface ChartDataPoint {
  label: string;
  value: number;
  series?: string;
}

export interface ChartModel {
  title: string;
  chartType: ChartType;
  xAxisTitle: string;
  yAxisTitle: string;
  dataPoints: ChartDataPoint[];
  units?: string;
  sourceNote?: string;
}

export interface ChartAnalysisResult {
  title: string;
  chartTypeDescriptionAr: string;
  chartTypeDescriptionEn: string;
  axesSummaryAr: string;
  axesSummaryEn: string;
  keyTrendsAr: string[];
  keyTrendsEn: string[];
  comparisons: {
    highest: { label: string; value: number };
    lowest: { label: string; value: number };
    range: number;
    average: number;
    total: number;
  };
  limitationsAr: string[];
  limitationsEn: string[];
  fullAccessibleDescriptionAr: string;
  fullAccessibleDescriptionEn: string;
  tabularEquivalent: Array<{ label: string; value: number; percentage: string }>;
}

/**
 * Analyzes and generates honest, verifiable, non-hallucinated chart descriptions for blind users
 */
export function describeChartData(chart: ChartModel): ChartAnalysisResult {
  const points = chart.dataPoints.filter((p) => typeof p.value === 'number' && !isNaN(p.value));

  if (points.length === 0) {
    return {
      title: chart.title || 'مخطط بياني بدون بيانات',
      chartTypeDescriptionAr: 'مخطط فارغ لا يحتوي على نقاط قياس رقمية.',
      chartTypeDescriptionEn: 'Empty chart with no numeric data points.',
      axesSummaryAr: 'المحاور غير محددة لغياب البيانات.',
      axesSummaryEn: 'Axes undefined due to absence of data.',
      keyTrendsAr: ['لا يمكن استخلاص أي اتجاهات لغياب البيانات.'],
      keyTrendsEn: ['No trends can be derived due to absence of data.'],
      comparisons: {
        highest: { label: 'N/A', value: 0 },
        lowest: { label: 'N/A', value: 0 },
        range: 0,
        average: 0,
        total: 0,
      },
      limitationsAr: ['لا توجد أي بيانات رقمية مدخلة في المخطط.'],
      limitationsEn: ['No numeric data entered in the chart.'],
      fullAccessibleDescriptionAr: 'مخطط فارغ.',
      fullAccessibleDescriptionEn: 'Empty chart.',
      tabularEquivalent: [],
    };
  }

  // Exact mathematical computations (ZERO invention)
  const total = Number(points.reduce((sum, p) => sum + p.value, 0).toFixed(2));
  const average = Number((total / points.length).toFixed(2));

  let highest = points[0];
  let lowest = points[0];
  for (const p of points) {
    if (p.value > highest.value) highest = p;
    if (p.value < lowest.value) lowest = p;
  }
  const range = Number((highest.value - lowest.value).toFixed(2));

  // Tabular equivalent with exact percentages
  const tabularEquivalent = points.map((p) => {
    const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) + '%' : '0%';
    return {
      label: p.label,
      value: p.value,
      percentage: pct,
    };
  });

  // Trend analysis
  const keyTrendsAr: string[] = [];
  const keyTrendsEn: string[] = [];

  let strictlyIncreasing = true;
  let strictlyDecreasing = true;
  for (let i = 1; i < points.length; i++) {
    if (points[i].value <= points[i - 1].value) strictlyIncreasing = false;
    if (points[i].value >= points[i - 1].value) strictlyDecreasing = false;
  }

  if (strictlyIncreasing) {
    keyTrendsAr.push(`يسجل المخطط اتجاهاً تصاعدياً مستمراً من النقطة الأولى (${points[0].label}: ${points[0].value}) حتى الأخيرة (${points[points.length - 1].label}: ${points[points.length - 1].value}).`);
    keyTrendsEn.push(`The chart demonstrates a strictly upward trend from the first point (${points[0].label}: ${points[0].value}) to the last (${points[points.length - 1].label}: ${points[points.length - 1].value}).`);
  } else if (strictlyDecreasing) {
    keyTrendsAr.push(`يسجل المخطط اتجاهاً تنازلياً مستمراً من النقطة الأولى (${points[0].label}: ${points[0].value}) حتى الأخيرة (${points[points.length - 1].label}: ${points[points.length - 1].value}).`);
    keyTrendsEn.push(`The chart demonstrates a strictly downward trend from the first point (${points[0].label}: ${points[0].value}) to the last (${points[points.length - 1].label}: ${points[points.length - 1].value}).`);
  } else {
    keyTrendsAr.push(`القيم تظهر تذبذباً بين الصعود والهبوط عبر الفئات المختلفة.`);
    keyTrendsEn.push(`Values show periodic fluctuations across categories without uniform monotonic trajectory.`);
  }

  keyTrendsAr.push(`أعلى قيمة مسجلة هي "${highest.label}" بقيمة ${highest.value}، في حين أن أدنى قيمة هي "${lowest.label}" بقيمة ${lowest.value}.`);
  keyTrendsEn.push(`Peak observation is "${highest.label}" at ${highest.value}, while the lowest is "${lowest.label}" at ${lowest.value}.`);

  // Chart type description
  const typeMapAr: Record<ChartType, string> = {
    bar: 'مخطط شريطي أفقي لمقارنة الفئات المستقلة',
    column: 'مخطط أعمدة راسية لقياس التغير والمقارنة',
    line: 'مخطط خطي لتتبع مسار التغير والاتجاه عبر الفترات',
    pie: 'مخطط دائري يوضح الحصص النسبية من الإجمالي الكلي',
    area: 'مخطط مساحي يوضح الحجم التراكمي للبيانات',
    scatter: 'مخطط انتشار يرصد العلاقة وتوزيع النقاط بين متغيرين',
  };
  const typeMapEn: Record<ChartType, string> = {
    bar: 'Horizontal bar chart comparing discrete categories',
    column: 'Vertical column chart measuring comparison across categories',
    line: 'Line chart tracking continuous change trajectory',
    pie: 'Pie chart illustrating proportional shares of a whole',
    area: 'Area chart illustrating cumulative volume over time',
    scatter: 'Scatter plot mapping relationship and distribution between two variables',
  };

  const chartTypeDescriptionAr = typeMapAr[chart.chartType] || 'مخطط بياني';
  const chartTypeDescriptionEn = typeMapEn[chart.chartType] || 'Data Chart';

  // Axes summary
  const unitsStr = chart.units ? ` (${chart.units})` : '';
  const axesSummaryAr = `المحور الأفقي يمثل: "${chart.xAxisTitle || 'الفئات'}"، والمحور الرأسي يقيس: "${chart.yAxisTitle || 'القيم'}"${unitsStr}.`;
  const axesSummaryEn = `Horizontal axis represents: "${chart.xAxisTitle || 'Categories'}", and vertical axis measures: "${chart.yAxisTitle || 'Values'}"${unitsStr}.`;

  // Limitations
  const limitationsAr: string[] = [
    `المخطط يغطي ${points.length} نقاط قياس محددة، ولا يتضمن أي استقراء لقيم خارج هذا النطاق.`,
    'الوصف مبني حصراً على الأرقام الواردة في مصدر البيانات دون افتعال أي قيم افتراضية.',
  ];
  const limitationsEn: string[] = [
    `Chart covers ${points.length} discrete data points; no interpolation or extrapolation outside this range is assumed.`,
    'Description is strictly grounded in provided data points with zero fabricated values.',
  ];

  // Full accessible text equivalent for screen readers
  const fullAccessibleDescriptionAr = [
    `عنوان المخطط: ${chart.title || 'رسم بياني'}.`,
    `نوع المخطط: ${chartTypeDescriptionAr}.`,
    axesSummaryAr,
    `الملخص الإحصائي: المجموع الكلي = ${total}، المتوسط = ${average}، الفارق بين الأعلى والأدنى = ${range}.`,
    `أبرز الاتجاهات: ${keyTrendsAr.join(' ')}`,
    `الجدول البديل للبيانات:`,
    ...tabularEquivalent.map((t) => `• ${t.label}: ${t.value}${unitsStr} (تمثل ${t.percentage} من الإجمالي)`),
    `القيود والملاحظات: ${limitationsAr.join(' ')}`,
  ].join('\n');

  const fullAccessibleDescriptionEn = [
    `Chart Title: ${chart.title || 'Data Chart'}.`,
    `Chart Type: ${chartTypeDescriptionEn}.`,
    axesSummaryEn,
    `Statistical Summary: Total = ${total}, Average = ${average}, Range = ${range}.`,
    `Key Trends: ${keyTrendsEn.join(' ')}`,
    `Data Table Equivalent:`,
    ...tabularEquivalent.map((t) => `• ${t.label}: ${t.value}${unitsStr} (${t.percentage} of total)`),
    `Limitations: ${limitationsEn.join(' ')}`,
  ].join('\n');

  return {
    title: chart.title || 'مخطط بياني',
    chartTypeDescriptionAr,
    chartTypeDescriptionEn,
    axesSummaryAr,
    axesSummaryEn,
    keyTrendsAr,
    keyTrendsEn,
    comparisons: {
      highest,
      lowest,
      range,
      average,
      total,
    },
    limitationsAr,
    limitationsEn,
    fullAccessibleDescriptionAr,
    fullAccessibleDescriptionEn,
    tabularEquivalent,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. SMART FORM FILLING (PRIVACY & CONFIRMATION GUARDS)
// ═════════════════════════════════════════════════════════════════════════════

export type FormFieldType = 'text' | 'email' | 'phone' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox';

export interface FormFieldDefinition {
  id: string;
  labelEn: string;
  labelAr: string;
  type: FormFieldType;
  required: boolean;
  explanationEn: string;
  explanationAr: string;
  options?: string[];
  isSensitive?: boolean;
  currentValue?: string | boolean;
}

export interface FormSchema {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  fields: FormFieldDefinition[];
}

/**
 * Sensitive field identifier: Detects National ID, passwords, and financial data
 */
export function isSensitiveFormField(fieldId: string, label: string): boolean {
  const combined = `${fieldId} ${label}`.toLowerCase();
  const sensitivePatterns = [
    'ssn',
    'national_id',
    'nationalid',
    'passport',
    'password',
    'passcode',
    'pin',
    'credit_card',
    'card_number',
    'cvv',
    'cvc',
    'secret',
    'private_key',
    'bank_account',
    'iban',
    'الرقم القومي',
    'رقم الهوية',
    'جواز السفر',
    'كلمة المرور',
    'الرقم السري',
    'بطاقة الائتمان',
    'الحساب البنكي',
  ];
  return sensitivePatterns.some((p) => combined.includes(p));
}

/**
 * Security Rule: Forms are NEVER submitted automatically
 */
export function canSubmitFormDirectly(): boolean {
  return false;
}

export const FORM_SECURITY_DISCLAIMER_AR =
  'حماية الخصوصية: رفيقي لا يرسل النماذج ولا يخمن بياناتك الحساسة أو بطاقاتك البنكية أبداً. يجب عليك مراجعة كافة الحقول وتأكيد حفظها بنفسك.';
export const FORM_SECURITY_DISCLAIMER_EN =
  'Privacy Protection: Rafiqi never submits forms or guesses sensitive personal/financial values. You must review and confirm entries yourself.';

/**
 * Standard accessible form templates
 */
export const ACCESSIBLE_FORM_TEMPLATES: FormSchema[] = [
  {
    id: 'academic_accommodations_form',
    titleAr: 'طلب تيسيرات أكاديمية واختبارات مهيأة',
    titleEn: 'Academic Accommodations & Exam Accessibility Request',
    descriptionAr: 'نموذج تسجيل الاحتياجات التيسيرية للطلاب ذوي الإعاقة البصرية والحركية لدى عمادة شؤون الطلاب.',
    descriptionEn: 'Official request form for visual and physical accommodations submitted to university administration.',
    fields: [
      {
        id: 'student_name',
        labelAr: 'اسم الطالب رباعي',
        labelEn: 'Full Student Name',
        type: 'text',
        required: true,
        explanationAr: 'الاسم الرسمي المسجل في بطاقة الهوية الجامعية.',
        explanationEn: 'Official student name as registered on the university ID.',
      },
      {
        id: 'student_id',
        labelAr: 'الرقم الجامعي / الأكاديمي',
        labelEn: 'Student Academic ID',
        type: 'text',
        required: true,
        explanationAr: 'رقم القيد الأكاديمي المكون من أرقام فقط.',
        explanationEn: 'University registration ID number.',
      },
      {
        id: 'email',
        labelAr: 'البريد الإلكتروني الجامعي',
        labelEn: 'University Email',
        type: 'email',
        required: true,
        explanationAr: 'البريد المعتمد لتلقي ردود لجنة التيسيرات الأكاديمية.',
        explanationEn: 'Official university email to receive committee decisions.',
      },
      {
        id: 'accommodation_type',
        labelAr: 'نوع التيسير المطلوب',
        labelEn: 'Requested Accommodation Type',
        type: 'select',
        required: true,
        options: [
          'قارئ شاشة وبرامج ناطقة (Screen Reader)',
          'وقت إضافي للاختبار (50% Extra Time)',
          'أسئلة مطبوعة بطريقة برايل (Braille Print)',
          'مرافق لقراءة الأسئلة وكتابة الإجابة (Scribe)',
          'أوراق اختبار مكبرة الخط عالي التباين (Large Print)',
        ],
        explanationAr: 'اختر نوع الترتيب الذي يتناسب مع طبيعة احتياجك الدراسي.',
        explanationEn: 'Select the primary accommodation that matches your learning access requirements.',
      },
      {
        id: 'notes',
        labelAr: 'تفاصيل وملاحظات إضافية',
        labelEn: 'Additional Notes or Equipment Requirements',
        type: 'textarea',
        required: false,
        explanationAr: 'حقل اختياري لتوضيح أي برمجيات خاصة مثل NVDA أو JAWS أو تفضيلات القاعات.',
        explanationEn: 'Optional field for software specifications (NVDA/JAWS) or room preferences.',
      },
      {
        id: 'sensitive_national_id',
        labelAr: 'الرقم القومي / رقم الهوية الوطنية',
        labelEn: 'National ID Number',
        type: 'text',
        required: true,
        isSensitive: true,
        explanationAr: 'بيانات حساسة لا يخمنها الذكاء الاصطناعي. يجب إدخالها يدوياً بنفسك للتحقق الرسمي.',
        explanationEn: 'Sensitive data not predicted by AI. Must be manually entered by you for official verification.',
      },
    ],
  },
  {
    id: 'course_registration_form',
    titleAr: 'استمارة تسجيل المقررات والمساقات الدراسية',
    titleEn: 'Course Enrollment & Registration Form',
    descriptionAr: 'استمارة اختيار المقررات وإضافة الشعب والمواعيد المتوافقة مع أوقات الطالب.',
    descriptionEn: 'Course selection and timetable arrangement form.',
    fields: [
      {
        id: 'semester',
        labelAr: 'الفصل الدراسي',
        labelEn: 'Academic Semester',
        type: 'select',
        required: true,
        options: ['الفصل الأول (خريف)', 'الفصل الثاني (ربيع)', 'الفصل الصيفي'],
        explanationAr: 'حدد الفصل الدراسي المراد تسجيل مواده.',
        explanationEn: 'Select target semester for enrollment.',
      },
      {
        id: 'course_code',
        labelAr: 'رمز المقرر الدراسي',
        labelEn: 'Course Code',
        type: 'text',
        required: true,
        explanationAr: 'رمز المادة مثل CS101 أو MATH201.',
        explanationEn: 'Course identifier code (e.g. CS101, MATH201).',
      },
      {
        id: 'credit_hours',
        labelAr: 'عدد الساعات المعتمدة',
        labelEn: 'Credit Hours',
        type: 'number',
        required: true,
        explanationAr: 'عدد الساعات المعتمدة للمقرر (عادة بين 2 إلى 4 ساعات).',
        explanationEn: 'Number of credit hours assigned to the course (usually 2-4).',
      },
    ],
  },
];

/**
 * Validates form values and checks for missing required fields
 */
export function validateFormValues(
  schema: FormSchema,
  values: Record<string, any>
): {
  isValid: boolean;
  errorsAr: Record<string, string>;
  errorsEn: Record<string, string>;
  missingRequiredCount: number;
} {
  const errorsAr: Record<string, string> = {};
  const errorsEn: Record<string, string> = {};

  for (const field of schema.fields) {
    const val = values[field.id];

    if (field.required) {
      if (val === undefined || val === null || String(val).trim() === '') {
        errorsAr[field.id] = `حقل "${field.labelAr}" إلزامي ويجب تعبئته.`;
        errorsEn[field.id] = `Field "${field.labelEn}" is required.`;
      }
    }

    if (val && field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(val).trim())) {
        errorsAr[field.id] = `صيغة البريد الإلكتروني غير صالحة.`;
        errorsEn[field.id] = `Invalid email format.`;
      }
    }

    if (val && field.type === 'number') {
      if (isNaN(Number(val))) {
        errorsAr[field.id] = `القيمة يجب أن تكون رقماً صالحاً.`;
        errorsEn[field.id] = `Value must be a valid number.`;
      }
    }
  }

  const missingCount = Object.keys(errorsAr).length;
  return {
    isValid: missingCount === 0,
    errorsAr,
    errorsEn,
    missingRequiredCount: missingCount,
  };
}
