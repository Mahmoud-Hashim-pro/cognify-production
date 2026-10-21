/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cognify Accessible Educational Book & Document Studio Engine
 * (Phase 6: Professional Word Formatting, Semantic Outline, and Question Recognition)
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  TableOfContents,
} from 'docx';

type DocxAlignmentType = (typeof AlignmentType)[keyof typeof AlignmentType];

export type BookTemplateType =
  | 'textbook'
  | 'teacher_guide'
  | 'worksheet'
  | 'exam'
  | 'question_bank'
  | 'lesson_notes'
  | 'workbook'
  | 'research_document';

export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'essay'
  | 'matching';

export type AnswerSpaceStyle = 'dots' | 'lines' | 'box' | 'none';

export type StudioLanguage = 'ar' | 'en' | 'mixed';

export interface RecognizedQuestion {
  id: string;
  type: QuestionType;
  questionNumber: number;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points?: number;
  answerLines?: number;
  matchingPairs?: { left: string; right: string }[];
}

export interface DocumentSection {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  content: string[];
  questions?: RecognizedQuestion[];
  isChapter?: boolean;
}

export interface BookStudioMetadata {
  title: string;
  subtitle?: string;
  author: string;
  subject: string;
  gradeLevel: string;
  institution?: string;
  date?: string;
  language: StudioLanguage;
  template: BookTemplateType;
  answerSpaceStyle: AnswerSpaceStyle;
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  includeAnswerKey: boolean;
  fontFamily?: string;
  fontSizeScale?: 'normal' | 'large' | 'extralarge';
  lineSpacing?: number; // e.g. 240 = 1.0, 276 = 1.15, 360 = 1.5
}

export interface SavedBookStudioItem {
  id: string;
  title: string;
  template: BookTemplateType;
  language: StudioLanguage;
  updatedAt: string;
  rawSource: string;
  metadata: BookStudioMetadata;
  sectionsCount: number;
  questionsCount: number;
  wordCount: number;
}

export const BOOK_STUDIO_STORAGE_KEY = 'cognify_book_studio_history_v1';

export const TEMPLATE_PRESETS: Record<BookTemplateType, {
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
  iconName: string;
  defaultCover: boolean;
  defaultToc: boolean;
  defaultAnswerStyle: AnswerSpaceStyle;
}> = {
  textbook: {
    labelAr: 'كتاب مدرسي / جامعي',
    labelEn: 'Educational Textbook',
    descriptionAr: 'هيكل أكاديمي متكامل بغلاف رسمي، فهرس محتويات، فصول مقسمة، وملخصات وحدات',
    descriptionEn: 'Full academic textbook with cover page, table of contents, partitioned chapters, and unit summaries',
    iconName: 'BookOpen',
    defaultCover: true,
    defaultToc: true,
    defaultAnswerStyle: 'dots',
  },
  teacher_guide: {
    labelAr: 'دليل المعلم النموذجي',
    labelEn: 'Teacher Guide',
    descriptionAr: 'خطة درس شاملة، نواتج التعلم، استراتيجيات التدريس، وتوجيهات تمايز الطلاب ذوي الهمم',
    descriptionEn: 'Comprehensive lesson plan, learning outcomes, teaching strategies, and accommodations for special needs',
    iconName: 'GraduationCap',
    defaultCover: true,
    defaultToc: true,
    defaultAnswerStyle: 'none',
  },
  worksheet: {
    labelAr: 'ورقة عمل وتطبيقات',
    labelEn: 'Student Worksheet',
    descriptionAr: 'تطبيقات صفية مركزة مع ترويسة اسم الطالب وتاريخ الحصة ومساحات إجابة مريحة',
    descriptionEn: 'Focused classroom worksheet with student name header, objectives, and clean response lines',
    iconName: 'FileCheck',
    defaultCover: false,
    defaultToc: false,
    defaultAnswerStyle: 'lines',
  },
  exam: {
    labelAr: 'امتحان واختبار فصلي',
    labelEn: 'Exam & Assessment',
    descriptionAr: 'ورقة اختبار نظامية مع خانات الدرجات، تعليمات الاختبار، وتوزيع الأسئلة ومساحات الحل',
    descriptionEn: 'Formal exam paper with marks rubric, test instructions, question sections, and answer spaces',
    iconName: 'Award',
    defaultCover: false,
    defaultToc: false,
    defaultAnswerStyle: 'lines',
  },
  question_bank: {
    labelAr: 'بنك أسئلة شامل',
    labelEn: 'Question Bank',
    descriptionAr: 'تجميعة أسئلة مصنفة حسب مخرجات التعلم مع مفتاح إجابة نموذجي وتفسير علمي',
    descriptionEn: 'Categorized repository of questions sorted by learning outcome with model answer keys',
    iconName: 'HelpCircle',
    defaultCover: true,
    defaultToc: true,
    defaultAnswerStyle: 'box',
  },
  lesson_notes: {
    labelAr: 'مذكرة وشرح درس',
    labelEn: 'Lesson Notes',
    descriptionAr: 'شرح مبسط ومباشر للنقاط الجوهرية مع صناديق تعريفات وأسئلة مراجعة وتأكيد فهم',
    descriptionEn: 'Structured summary notes with key definitions, callouts, and comprehension check questions',
    iconName: 'Bookmark',
    defaultCover: false,
    defaultToc: false,
    defaultAnswerStyle: 'dots',
  },
  workbook: {
    labelAr: 'كراسة تدريبات وأنشطة',
    labelEn: 'Student Workbook',
    descriptionAr: 'تمارين تدريجية الصعوبة مع صناديق مخصصة لخطوات الحل ومتابعة أداء الطالب',
    descriptionEn: 'Graduated difficulty problem sets with dedicated working space boxes and progress check',
    iconName: 'Layers',
    defaultCover: true,
    defaultToc: false,
    defaultAnswerStyle: 'box',
  },
  research_document: {
    labelAr: 'بحث أكاديمي ومستند تدريبي',
    labelEn: 'Research & Instructional Document',
    descriptionAr: 'هيكل بحثي علمي يشمل الملخص، المقدمة، المنهجية، النتائج، والمراجع المعتمدة',
    descriptionEn: 'Formal scholarly layout including abstract, methodology, findings, and references',
    iconName: 'FileText',
    defaultCover: true,
    defaultToc: true,
    defaultAnswerStyle: 'none',
  },
};

function cleanPromptText(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '').trim();
}

/**
 * Conservative educational question recognition engine.
 * Parses raw text lines, identifies standard question patterns, and extracts options/answers.
 * NEVER invents answers or drops questions.
 */
export function recognizeEducationalQuestions(rawText: string): RecognizedQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  const questions: RecognizedQuestion[] = [];
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  let current: Partial<RecognizedQuestion> | null = null;
  let qNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Detect Question Start: "س 1:", "س1-", "Q1:", "Question 1:", "1.", "(1)", "1 -", "سؤال:"
    const qHeaderMatch = line.match(
      /^(?:(?:س\s*|سؤال\s*|q\s*|question\s*)(\d+)[:.-]|(\d+)[\.\)\-]\s+|سؤال[:.-]\s*)(.+)$/i
    );

    if (qHeaderMatch) {
      if (current && current.prompt) {
        questions.push(finalizeRecognizedQuestion(current, ++qNum));
      }
      const promptText = (qHeaderMatch[3] || line).trim();
      const cleanPrompt = cleanPromptText(promptText);

      let initialType: QuestionType = 'short_answer';
      if (cleanPrompt.includes('اختر') || cleanPrompt.includes('اختيار') || /choose\s+the\s+correct/i.test(cleanPrompt)) {
        initialType = 'mcq';
      } else if (
        cleanPrompt.includes('صح') ||
        cleanPrompt.includes('خطأ') ||
        cleanPrompt.includes('صواب') ||
        cleanPrompt.includes('العبارة الصحيحة') ||
        cleanPrompt.includes('العبارة الخاطئة') ||
        cleanPrompt.includes('True or False') ||
        cleanPrompt.includes('True/False') ||
        cleanPrompt.includes('(✓)') ||
        cleanPrompt.includes('(✗)') ||
        cleanPrompt.includes('(√)') ||
        cleanPrompt.includes('(×)')
      ) {
        initialType = 'true_false';
      } else if (
        cleanPrompt.includes('صل') ||
        cleanPrompt.includes('طابق') ||
        /match\s+column/i.test(cleanPrompt)
      ) {
        initialType = 'matching';
      } else if (
        cleanPrompt.includes('أكمل') ||
        cleanPrompt.includes('الفراغ') ||
        cleanPrompt.includes('_____') ||
        cleanPrompt.includes('.....') ||
        /fill\s+in\s+the\s+blank/i.test(cleanPrompt)
      ) {
        initialType = 'fill_blank';
      } else if (
        cleanPrompt.includes('اشرح بالتفصيل') ||
        cleanPrompt.includes('قارن بالتفصيل') ||
        cleanPrompt.includes('ناقش') ||
        /discuss\s+in\s+detail/i.test(cleanPrompt)
      ) {
        initialType = 'essay';
      }

      current = {
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        prompt: promptText,
        options: [],
        type: initialType,
        answerLines: initialType === 'essay' ? 6 : initialType === 'short_answer' ? 3 : 1,
      };
      continue;
    }

    // 2. Detect Matching Pair Line: "- Left : Right" or "Left -> Right"
    if (
      current &&
      (current.type === 'matching' ||
        (current.prompt && /صل|طابق|match/i.test(cleanPromptText(current.prompt))))
    ) {
      const matchPair = line.match(/^[-•*]?\s*(.+?)\s*(?::|->|—|–)\s*(.+)$/);
      if (matchPair) {
        current.type = 'matching';
        current.matchingPairs = current.matchingPairs || [];
        current.matchingPairs.push({ left: matchPair[1].trim(), right: matchPair[2].trim() });
        continue;
      }
    }

    // 3. Detect Matching Exercise Header: "صل من العمود (أ) ما يناسبه من العمود (ب)" or "Match Column A with Column B"
    if (
      current &&
      (line.includes('صل من العمود') ||
        cleanPromptText(line).includes('صل من العمود') ||
        line.includes('طابق بين') ||
        /match\s+column/i.test(line) ||
        /matching/i.test(line))
    ) {
      current.type = 'matching';
      continue;
    }

    // 4. Detect True/False indicators: "صح أم خطأ", "True or False", "ضع علامة (√) أو (×)"
    if (
      current &&
      (line.includes('صح أم خطأ') ||
        line.includes('صح أو خطأ') ||
        line.includes('العبارة الصحيحة') ||
        line.includes('العبارة الخاطئة') ||
        line.includes('True or False') ||
        line.includes('True/False') ||
        line.includes('Vrai ou Faux') ||
        line.includes('(✓)') ||
        line.includes('(✗)') ||
        line.includes('(√) أو (×)'))
    ) {
      current.type = 'true_false';
    }

    // 5. Detect Fill-in-the-blank indicators: contains "....." or "_____" or "أكمل ما يأتي"
    if (
      current &&
      (line.includes('.....') ||
        line.includes('_____') ||
        line.includes('أكمل الفراغ') ||
        line.includes('أكمل العبارات') ||
        line.includes('أكمل ما يأتي') ||
        /fill\s+in\s+the\s+blank/i.test(line))
    ) {
      current.type = 'fill_blank';
    }

    // 6. Detect MCQ Options: "[A]", "(A)", "A)", "A.", "أ-", "أ)", "(أ)", "1)", "(1)"
    const optMatch = line.match(
      /^(?:\[([A-Da-d\u0623-\u062F])\]|\(([A-Da-d\u0623-\u062F])\)|([A-Da-d\u0623-\u062F])[\.\)\-]|([1-4])[\)\-])\s*(.+)$/
    );

    if (optMatch && current) {
      current.type = 'mcq';
      current.options = current.options || [];
      current.options.push(line);
      continue;
    }

    // 7. Detect Essay indicators: "اشرح بالتفصيل", "قارن موضحاً", "ناقش بالتفصيل", "Discuss in detail", "Analyze"
    if (
      current &&
      (line.includes('اشرح بالتفصيل') ||
        line.includes('قارن بالتفصيل') ||
        line.includes('ناقش بالتفصيل') ||
        /discuss\s+in\s+detail/i.test(line) ||
        /analyze\s+and\s+evaluate/i.test(line))
    ) {
      current.type = 'essay';
      current.answerLines = 6;
      continue;
    }

    // 8. Detect Correct Answer: "الإجابة:", "الحل:", "الجواب:", "Answer:", "Correct Answer:"
    const ansMatch = line.match(/^(?:[اإ]ل[اإ]جاب[ةه]|الحل|الجواب|Answer|Correct Answer|Key)[:.-]\s*(.+)$/i);
    if (ansMatch && current) {
      current.correctAnswer = ansMatch[1].trim();
      continue;
    }

    // 9. Detect Explanation: "الشرح:", "التوضيح:", "Explanation:", "Reason:"
    const expMatch = line.match(/^(?:الشرح|التوضيح|التفسير|Explanation|Reason)[:.-]\s*(.+)$/i);
    if (expMatch && current) {
      current.explanation = expMatch[1].trim();
      continue;
    }

    // 10. Detect Marks / Points: "[5 درجات]", "(10 Marks)", "[2 Marks]"
    const pointsMatch = line.match(/(?:\[|\()(\d+)\s*(?:درجات?|علامات?|marks?|points?)(?:\]|\))/i);
    if (pointsMatch && current) {
      current.points = parseInt(pointsMatch[1], 10);
      continue;
    }

    // If still accumulating prompt
    if (current && (!current.options || current.options.length === 0)) {
      current.prompt = `${current.prompt} ${line}`.trim();
    }
  }

  if (current && current.prompt) {
    questions.push(finalizeRecognizedQuestion(current, ++qNum));
  }

  return questions;
}

function finalizeRecognizedQuestion(q: Partial<RecognizedQuestion>, fallbackNum: number): RecognizedQuestion {
  let finalType: QuestionType = q.type || 'short_answer';
  const cleanP = cleanPromptText(q.prompt || '');

  if (q.options && q.options.length >= 2) {
    finalType = 'mcq';
  } else if (q.matchingPairs && q.matchingPairs.length > 0) {
    finalType = 'matching';
  } else if (
    cleanP.includes('صح') ||
    cleanP.includes('خطأ') ||
    cleanP.includes('صواب') ||
    cleanP.includes('العبارة الصحيحة') ||
    cleanP.includes('العبارة الخاطئة') ||
    cleanP.includes('True or False') ||
    cleanP.includes('True/False') ||
    cleanP.includes('(✓)') ||
    cleanP.includes('(✗)') ||
    cleanP.includes('(√)') ||
    cleanP.includes('(×)')
  ) {
    finalType = 'true_false';
  } else if (
    cleanP.includes('صل') ||
    cleanP.includes('طابق') ||
    /match\s+column/i.test(cleanP)
  ) {
    finalType = 'matching';
  } else if (
    cleanP.includes('أكمل') ||
    cleanP.includes('الفراغ') ||
    cleanP.includes('_____') ||
    cleanP.includes('.....') ||
    /fill\s+in\s+the\s+blank/i.test(cleanP)
  ) {
    finalType = 'fill_blank';
  } else if (
    cleanP.includes('اشرح بالتفصيل') ||
    cleanP.includes('قارن بالتفصيل') ||
    cleanP.includes('ناقش') ||
    /discuss\s+in\s+detail/i.test(cleanP)
  ) {
    finalType = 'essay';
  }

  return {
    id: q.id || `q-${Date.now()}-${fallbackNum}`,
    type: finalType,
    questionNumber: q.questionNumber || fallbackNum,
    prompt: q.prompt || '',
    options: q.options || [],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    points: q.points || (finalType === 'essay' ? 5 : finalType === 'mcq' ? 1 : 2),
    answerLines: q.answerLines || (finalType === 'essay' ? 6 : finalType === 'short_answer' ? 3 : 1),
    matchingPairs: q.matchingPairs,
  };
}

/**
 * Parses raw textbook or study notes text into structured hierarchical sections (Chapters, Units, Topics).
 */
export function parseDocumentStructure(rawText: string): DocumentSection[] {
  if (!rawText || !rawText.trim()) return [];

  const sections: DocumentSection[] = [];
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  let currentSection: DocumentSection | null = null;
  let sectionCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Introduction / Preface / Overview
    const introMatch = line.match(/^(?:#\s*)?(?:المقدمة|مقدمة|تمهيد|Introduction|Preface|Overview)[:.-]?$/i);
    if (introMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        id: `sec-${++sectionCounter}`,
        level: 1,
        title: line.replace(/^#\s*/, '').trim(),
        content: [],
      };
      continue;
    }

    // Detect Major Chapter / Unit Header (Level 1)
    const chapterMatch = line.match(/^(?:الفصل\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|\d+)|الوحدة\s+(?:الأولى|الثانية|الثالثة|الرابعة|\d+)|Chapter\s+\d+|Unit\s+\d+)[:.-]?\s*(.*)$/i);
    if (chapterMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        id: `sec-${++sectionCounter}`,
        level: 1,
        title: line,
        content: [],
        isChapter: true,
      };
      continue;
    }

    // Detect Standard Markdown Headings or Numbered Topic Headings (Level 2 or 3)
    if (line.startsWith('# ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        id: `sec-${++sectionCounter}`,
        level: 1,
        title: line.replace(/^#\s+/, '').trim(),
        content: [],
      };
      continue;
    }

    if (line.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        id: `sec-${++sectionCounter}`,
        level: 2,
        title: line.replace(/^##\s+/, '').trim(),
        content: [],
      };
      continue;
    }

    if (line.startsWith('### ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        id: `sec-${++sectionCounter}`,
        level: 3,
        title: line.replace(/^###\s+/, '').trim(),
        content: [],
      };
      continue;
    }

    // Detect Arabic Subheading keywords: "أولاً:", "ثانياً:", "المبحث:", "المطلب:"
    const arabicSubheadMatch = line.match(/^(?:أولاً|ثانياً|ثالثاً|رابعاً|خامساً|المبحث\s+الأول|المبحث\s+الثاني|المحور\s+الأول|المحور\s+الثاني)[:.-]\s*(.*)$/);
    if (arabicSubheadMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        id: `sec-${++sectionCounter}`,
        level: 2,
        title: line,
        content: [],
      };
      continue;
    }

    // Accumulate regular content paragraphs
    if (!currentSection) {
      currentSection = {
        id: `sec-${++sectionCounter}`,
        level: 1,
        title: 'مقدمة ومحتوى الدرس',
        content: [],
      };
    }
    currentSection.content.push(line);
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // Parse questions inside each section's content
  for (const sec of sections) {
    const textJoined = sec.content.join('\n');
    sec.questions = recognizeEducationalQuestions(textJoined);
  }

  return sections;
}

/**
 * Builds a native Word (.docx) binary package using the `docx` library.
 * Implements real heading styles, accessible tables, running headers/footers,
 * cover page, table of contents, and right-to-left formatting for Arabic.
 */
export async function buildAccessibleBookDocx(
  input: string | DocumentSection[],
  metadata: BookStudioMetadata
): Promise<Blob> {
  const sections = typeof input === 'string' ? parseDocumentStructure(input) : input;
  const isAr = metadata.language === 'ar' || metadata.language === 'mixed';
  const fontName = metadata.fontFamily || (isAr ? 'Segoe UI' : 'Calibri');
  const alignment = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;

  // Font sizing scale (half-points: 24 = 12pt)
  const sizeMap = {
    normal: { title: 52, h1: 36, h2: 28, h3: 24, body: 22, small: 18 },
    large: { title: 60, h1: 42, h2: 32, h3: 28, body: 26, small: 22 },
    extralarge: { title: 68, h1: 48, h2: 38, h3: 32, body: 30, small: 26 },
  };
  const sizes = sizeMap[metadata.fontSizeScale || 'normal'];

  const docChildren: (Paragraph | Table | TableOfContents)[] = [];

  // ═════════════════════════════════════════════════════════════════════════
  // 1. COVER PAGE (Optional for textbooks, guides, research documents)
  // ═════════════════════════════════════════════════════════════════════════
  if (metadata.includeCoverPage) {
    // Institution Header
    if (metadata.institution) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: metadata.institution,
              font: fontName,
              size: sizes.h3,
              bold: true,
              color: '475569',
              rightToLeft: isAr,
            }),
          ],
        })
      );
    }

    // Spacing before Title
    docChildren.push(new Paragraph({ spacing: { before: 1200 } }));

    // Book Title (Heading Level Title)
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 200 },
        children: [
          new TextRun({
            text: metadata.title || (isAr ? 'المستند التعليمي الشامل' : 'Cognify Educational Document'),
            font: fontName,
            size: sizes.title,
            bold: true,
            color: '0F172A',
            rightToLeft: isAr,
          }),
        ],
      })
    );

    // Subtitle / Subject
    if (metadata.subtitle || metadata.subject) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: metadata.subtitle || metadata.subject,
              font: fontName,
              size: sizes.h2,
              italics: true,
              color: '2563EB',
              rightToLeft: isAr,
            }),
          ],
        })
      );
    }

    // Decorative Horizontal Divider Bar
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 },
        border: {
          bottom: {
            color: '2563EB',
            space: 8,
            style: BorderStyle.SINGLE,
            size: 24,
          },
        },
      })
    );

    // Author & Educational Metadata Block
    const metaDetails = [
      metadata.author ? (isAr ? `إعداد / تأليف: ${metadata.author}` : `Author / Instructor: ${metadata.author}`) : '',
      metadata.gradeLevel ? (isAr ? `المستوى / المرحلة الدراسية: ${metadata.gradeLevel}` : `Grade / Level: ${metadata.gradeLevel}`) : '',
      metadata.subject ? (isAr ? `المادة التخصصية: ${metadata.subject}` : `Course / Subject: ${metadata.subject}`) : '',
      metadata.date || new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US'),
    ].filter(Boolean);

    for (const detail of metaDetails) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: detail,
              font: fontName,
              size: sizes.body,
              color: '334155',
              rightToLeft: isAr,
            }),
          ],
        })
      );
    }

    // Page Break after Cover
    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. EXAM & WORKSHEET HEADER (When Cover Page is skipped)
  // ═════════════════════════════════════════════════════════════════════════
  if (!metadata.includeCoverPage && (metadata.template === 'exam' || metadata.template === 'worksheet')) {
    const isExam = metadata.template === 'exam';

    // Exam Title
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: metadata.title || (isAr ? 'اختبار تقييمي فصلي' : 'Assessment Examination'),
            font: fontName,
            size: sizes.h1,
            bold: true,
            color: '0F172A',
            rightToLeft: isAr,
          }),
        ],
      })
    );

    // 2-Column Info Table: Student Name, Seat/ID, Subject, Date, Score
    const headerRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment,
                children: [
                  new TextRun({
                    text: isAr ? 'اسم الطالب: .................................................' : 'Student Name: .................................................',
                    font: fontName,
                    size: sizes.body,
                    bold: true,
                    rightToLeft: isAr,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment,
                children: [
                  new TextRun({
                    text: isAr ? `المادة: ${metadata.subject || 'عام'}` : `Subject: ${metadata.subject || 'General'}`,
                    font: fontName,
                    size: sizes.body,
                    bold: true,
                    rightToLeft: isAr,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment,
                children: [
                  new TextRun({
                    text: isAr
                      ? `الصف / الفرقة: ${metadata.gradeLevel || 'العام الدراسي'}`
                      : `Grade / Class: ${metadata.gradeLevel || 'Standard'}`,
                    font: fontName,
                    size: sizes.body,
                    rightToLeft: isAr,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment,
                children: [
                  new TextRun({
                    text: isAr
                      ? (isExam ? 'الدرجة الكلية: [      / 100 ]' : 'التقييم: [ مميز / جيد جداً / جيد ]')
                      : (isExam ? 'Total Marks: [      / 100 ]' : 'Rating: [ Excellent / Good ]'),
                    font: fontName,
                    size: sizes.body,
                    bold: true,
                    rightToLeft: isAr,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: headerRows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 240 } }));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. TABLE OF CONTENTS (Optional)
  // ═════════════════════════════════════════════════════════════════════════
  if (metadata.includeTableOfContents) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment,
        spacing: { before: 240, after: 200 },
        children: [
          new TextRun({
            text: isAr ? '📑 فهرس المحتويات والأبواب' : '📑 Table of Contents',
            font: fontName,
            size: sizes.h1,
            bold: true,
            color: '1E3A8A',
            rightToLeft: isAr,
          }),
        ],
      })
    );

    docChildren.push(
      new TableOfContents(isAr ? 'فهرس المحتويات' : 'Table of Contents', {
        hyperlink: true,
        headingStyleRange: '1-3',
      })
    );

    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. STRUCTURED SECTIONS & BODY CONTENT
  // ═════════════════════════════════════════════════════════════════════════
  let totalQuestionsRendered = 0;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];

    // Page Break before major chapters
    if (sec.isChapter && sIdx > 0) {
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Section Heading (H1, H2, or H3)
    const headingLevel =
      sec.level === 1 ? HeadingLevel.HEADING_1 : sec.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
    const headingSize = sec.level === 1 ? sizes.h1 : sec.level === 2 ? sizes.h2 : sizes.h3;
    const headingColor = sec.level === 1 ? '1E3A8A' : sec.level === 2 ? '0F766E' : '334155';

    docChildren.push(
      new Paragraph({
        heading: headingLevel,
        alignment,
        spacing: { before: 300, after: 140 },
        children: [
          new TextRun({
            text: sec.title,
            font: fontName,
            size: headingSize,
            bold: true,
            color: headingColor,
            rightToLeft: isAr,
          }),
        ],
      })
    );

    // Section Paragraphs
    for (const para of sec.content) {
      // If the paragraph is already part of a detected question prompt, skip rendering raw text to avoid duplication
      const isQuestionPrompt = sec.questions?.some((q) => q.prompt && para.includes(q.prompt.substring(0, 30)));
      if (isQuestionPrompt && sec.questions && sec.questions.length > 0) {
        continue;
      }

      // Check if it's a bullet point
      const isBullet = para.startsWith('- ') || para.startsWith('• ') || para.startsWith('* ');
      const cleanParaText = isBullet ? para.replace(/^[-•*]\s+/, '') : para;

      docChildren.push(
        new Paragraph({
          alignment,
          bullet: isBullet ? { level: 0 } : undefined,
          spacing: { after: 120, line: metadata.lineSpacing || 280 },
          children: [
            new TextRun({
              text: cleanParaText,
              font: fontName,
              size: sizes.body,
              color: '1E293B',
              rightToLeft: isAr,
            }),
          ],
        })
      );
    }

    // Render Educational Questions if present in this section
    if (sec.questions && sec.questions.length > 0) {
      for (const q of sec.questions) {
        totalQuestionsRendered++;
        renderDocxQuestionItem(docChildren, q, totalQuestionsRendered, metadata, sizes, fontName, alignment, isAr);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. MODEL ANSWER KEY & EXPLANATIONS APPENDIX (Optional)
  // ═════════════════════════════════════════════════════════════════════════
  const questionsWithAnswers = sections
    .flatMap((s) => s.questions || [])
    .filter((q) => q.correctAnswer || q.explanation);

  if (metadata.includeAnswerKey && questionsWithAnswers.length > 0) {
    docChildren.push(new Paragraph({ children: [new PageBreak()] }));

    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment,
        spacing: { before: 240, after: 160 },
        children: [
          new TextRun({
            text: isAr ? '🔑 ملحق نموذج الإجابات والشروح الإرشادية' : '🔑 Model Answer Key & Explanations Appendix',
            font: fontName,
            size: sizes.h1,
            bold: true,
            color: '15803D',
            rightToLeft: isAr,
          }),
        ],
      })
    );

    // Answer Key Table
    const answerRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: isAr ? 'رقم السؤال' : 'Q #',
                    font: fontName,
                    size: sizes.body,
                    bold: true,
                    rightToLeft: isAr,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment,
                children: [
                  new TextRun({
                    text: isAr ? 'الإجابة النموذجية' : 'Model Answer',
                    font: fontName,
                    size: sizes.body,
                    bold: true,
                    rightToLeft: isAr,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment,
                children: [
                  new TextRun({
                    text: isAr ? 'التوضيح والأساس العلمي' : 'Explanation & Rationale',
                    font: fontName,
                    size: sizes.body,
                    bold: true,
                    rightToLeft: isAr,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ];

    questionsWithAnswers.forEach((q, idx) => {
      answerRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${idx + 1}`,
                      font: fontName,
                      size: sizes.body,
                      bold: true,
                      rightToLeft: isAr,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment,
                  children: [
                    new TextRun({
                      text: q.correctAnswer || (isAr ? 'انظر الشرح' : 'See explanation'),
                      font: fontName,
                      size: sizes.body,
                      bold: true,
                      color: '15803D',
                      rightToLeft: isAr,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment,
                  children: [
                    new TextRun({
                      text: q.explanation || (isAr ? 'لا يوجد شرح إضافي' : 'Standard definition'),
                      font: fontName,
                      size: sizes.small,
                      color: '475569',
                      rightToLeft: isAr,
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    });

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: answerRows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
          left: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
          right: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
        },
      })
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 6. RUNNING HEADERS AND FOOTERS
  // ═════════════════════════════════════════════════════════════════════════
  const docHeader = new Header({
    children: [
      new Paragraph({
        alignment: isAr ? AlignmentType.LEFT : AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: `${metadata.title} • ${metadata.subject || ''}`,
            font: fontName,
            size: sizes.small,
            color: '94A3B8',
            rightToLeft: isAr,
          }),
        ],
      }),
    ],
  });

  const docFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: isAr ? 'صفحة ' : 'Page ',
            font: fontName,
            size: sizes.small,
            color: '64748B',
            rightToLeft: isAr,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: fontName,
            size: sizes.small,
            color: '64748B',
          }),
          new TextRun({
            text: isAr ? ' من ' : ' of ',
            font: fontName,
            size: sizes.small,
            color: '64748B',
            rightToLeft: isAr,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: fontName,
            size: sizes.small,
            color: '64748B',
          }),
        ],
      }),
    ],
  });

  // Construct Document Object
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: docHeader,
        },
        footers: {
          default: docFooter,
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Renders an educational question item with appropriate formatting, option layout,
 * and configurable response spaces (dot leaders, blank ruled lines, or response boxes).
 */
function renderDocxQuestionItem(
  children: (Paragraph | Table)[],
  q: RecognizedQuestion,
  index: number,
  metadata: BookStudioMetadata,
  sizes: { title: number; h1: number; h2: number; h3: number; body: number; small: number },
  fontName: string,
  alignment: DocxAlignmentType,
  isAr: boolean
): void {
  // Question Header & Prompt
  const prefix = isAr ? `س ${index}:` : `Q ${index}:`;
  const pointsBadge = q.points ? ` [${q.points} ${isAr ? (q.points === 1 ? 'درجة' : 'درجات') : 'Marks'}]` : '';

  children.push(
    new Paragraph({
      alignment,
      spacing: { before: 180, after: 80 },
      children: [
        new TextRun({
          text: `${prefix} `,
          font: fontName,
          size: sizes.body,
          bold: true,
          color: '1E3A8A',
          rightToLeft: isAr,
        }),
        new TextRun({
          text: `${q.prompt}${pointsBadge}`,
          font: fontName,
          size: sizes.body,
          bold: true,
          color: '0F172A',
          rightToLeft: isAr,
        }),
      ],
    })
  );

  // 1. Render MCQ Options
  if (q.type === 'mcq' && q.options && q.options.length > 0) {
    for (const opt of q.options) {
      children.push(
        new Paragraph({
          alignment,
          indent: { left: isAr ? 0 : 360, right: isAr ? 360 : 0 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `[   ]  ${opt.replace(/^[\[\(]?[A-Da-d\u0623-\u062F][\]\)\.-]?\s*/, '')}`,
              font: fontName,
              size: sizes.body,
              color: '334155',
              rightToLeft: isAr,
            }),
          ],
        })
      );
    }
  }

  // 2. Render True / False Options
  if (q.type === 'true_false') {
    children.push(
      new Paragraph({
        alignment,
        indent: { left: isAr ? 0 : 360, right: isAr ? 360 : 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: isAr
              ? '(    ) صـح                      (    ) خـطـأ'
              : '(    ) True                      (    ) False',
            font: fontName,
            size: sizes.body,
            bold: true,
            color: '334155',
            rightToLeft: isAr,
          }),
        ],
      })
    );
  }

  // 3. Render Fill in the Blank
  if (q.type === 'fill_blank') {
    // If not already in prompt, render dot leaders
    if (!q.prompt.includes('.....') && !q.prompt.includes('_____')) {
      renderAnswerSpace(children, metadata.answerSpaceStyle, 1, fontName, alignment, isAr);
    }
  }

  // 4. Render Short Answer Response Spaces
  if (q.type === 'short_answer') {
    const lineCount = Math.min(Math.max(q.answerLines || 3, 1), 6);
    renderAnswerSpace(children, metadata.answerSpaceStyle, lineCount, fontName, alignment, isAr);
  }

  // 5. Render Essay Response Box
  if (q.type === 'essay') {
    const lineCount = Math.min(Math.max(q.answerLines || 6, 4), 12);
    renderAnswerSpace(children, metadata.answerSpaceStyle === 'none' ? 'none' : 'box', lineCount, fontName, alignment, isAr);
  }

  // 6. Render Matching Table
  if (q.type === 'matching' && q.matchingPairs && q.matchingPairs.length > 0) {
    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment,
                children: [new TextRun({ text: isAr ? 'العمود (أ)' : 'Column A', font: fontName, bold: true, rightToLeft: isAr })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: isAr ? 'التوصيل' : 'Match', font: fontName, bold: true })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment,
                children: [new TextRun({ text: isAr ? 'العمود (ب)' : 'Column B', font: fontName, bold: true, rightToLeft: isAr })],
              }),
            ],
          }),
        ],
      }),
    ];

    q.matchingPairs.forEach((pair) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ alignment, children: [new TextRun({ text: pair.left, font: fontName, rightToLeft: isAr })] })],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(   )', font: fontName })] })],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ alignment, children: [new TextRun({ text: pair.right, font: fontName, rightToLeft: isAr })] })],
            }),
          ],
        })
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
          insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
        },
      })
    );
  }
}

/**
 * Creates configurable answer spaces (dot leaders, ruled lines, or bordered answer box).
 */
function renderAnswerSpace(
  children: (Paragraph | Table)[],
  style: AnswerSpaceStyle,
  count: number,
  fontName: string,
  alignment: DocxAlignmentType,
  isAr: boolean
): void {
  if (style === 'none') return;

  if (style === 'dots') {
    for (let i = 0; i < count; i++) {
      children.push(
        new Paragraph({
          alignment,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: '....................................................................................................................................................',
              font: fontName,
              size: 20,
              color: '94A3B8',
              rightToLeft: isAr,
            }),
          ],
        })
      );
    }
    return;
  }

  if (style === 'lines') {
    for (let i = 0; i < count; i++) {
      children.push(
        new Paragraph({
          alignment,
          spacing: { before: 80, after: 120 },
          border: {
            bottom: {
              color: 'CBD5E1',
              space: 4,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          children: [new TextRun({ text: ' ' })],
        })
      );
    }
    return;
  }

  if (style === 'box') {
    // Bordered response box for calculations or essays
    const boxHeightParas: Paragraph[] = [];
    for (let i = 0; i < count; i++) {
      boxHeightParas.push(
        new Paragraph({
          alignment,
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: isAr ? ' ' : ' ',
              font: fontName,
              size: 20,
            }),
          ],
        })
      );
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                shading: { fill: 'FAFAFA', type: ShadingType.CLEAR },
                children: boxHeightParas,
              }),
            ],
          }),
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: '94A3B8' },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: '94A3B8' },
          left: { style: BorderStyle.SINGLE, size: 8, color: '94A3B8' },
          right: { style: BorderStyle.SINGLE, size: 8, color: '94A3B8' },
        },
      })
    );
  }
}

/**
 * Builds a print-friendly accessible HTML string for direct browser printing / PDF export.
 */
export function buildPrintableHtmlDocument(
  input: string | DocumentSection[],
  metadata: BookStudioMetadata
): string {
  const sections = typeof input === 'string' ? parseDocumentStructure(input) : input;
  const isAr = metadata.language === 'ar' || metadata.language === 'mixed';
  const dir = isAr ? 'rtl' : 'ltr';
  const textAlign = isAr ? 'right' : 'left';

  const sectionsHtml = sections
    .map((sec, sIdx) => {
      const isChapter = sec.isChapter && sIdx > 0;
      const pageBreakStyle = isChapter ? 'page-break-before: always;' : '';
      const questionsHtml = (sec.questions || [])
        .map((q, qIdx) => {
          let qBody = '';
          if (q.type === 'mcq') {
            qBody = `<div class="mcq-options">${(q.options || [])
              .map((opt) => `<div class="option-item">[ &nbsp; ] ${opt}</div>`)
              .join('')}</div>`;
          } else if (q.type === 'true_false') {
            qBody = `<div class="tf-options">${
              isAr ? '( &nbsp; ) صـح &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) خـطـأ' : '( &nbsp; ) True &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) False'
            }</div>`;
          } else if (q.type === 'essay' || q.type === 'short_answer') {
            if (metadata.answerSpaceStyle === 'dots') {
              qBody = `<div class="answer-dots">${'<div class="dots-line">....................................................................................................</div>'.repeat(
                q.answerLines || 3
              )}</div>`;
            } else if (metadata.answerSpaceStyle === 'lines') {
              qBody = `<div class="answer-lines">${'<div class="ruled-line"></div>'.repeat(q.answerLines || 3)}</div>`;
            } else if (metadata.answerSpaceStyle === 'box') {
              qBody = `<div class="answer-box" style="height: ${(q.answerLines || 4) * 24}px;"></div>`;
            }
          }

          return `
            <div class="question-block">
              <div class="question-title">
                <b>${isAr ? 'س ' + (qIdx + 1) : 'Q ' + (qIdx + 1)}:</b> ${q.prompt}
                ${q.points ? `<span class="points-badge">[${q.points} ${isAr ? 'درجات' : 'Marks'}]</span>` : ''}
              </div>
              ${qBody}
            </div>
          `;
        })
        .join('');

      return `
        <section class="doc-section" style="${pageBreakStyle}">
          <h${sec.level} class="sec-heading">${sec.title}</h${sec.level}>
          <div class="sec-content">
            ${sec.content.map((p) => `<p>${p}</p>`).join('')}
          </div>
          ${questionsHtml ? `<div class="sec-questions">${questionsHtml}</div>` : ''}
        </section>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html dir="${dir}" lang="${isAr ? 'ar' : 'en'}">
    <head>
      <meta charset="utf-8"/>
      <title>${metadata.title || 'Cognify Educational Document'}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          direction: ${dir};
          text-align: ${textAlign};
          color: #0f172a;
          line-height: 1.7;
          margin: 0;
          padding: 24px;
        }
        .cover-page {
          text-align: center;
          page-break-after: always;
          padding-top: 60px;
        }
        .cover-institution { font-size: 16pt; color: #475569; font-weight: bold; }
        .cover-title { font-size: 28pt; color: #1e3a8a; margin: 40px 0 16px 0; font-weight: 900; }
        .cover-subtitle { font-size: 16pt; color: #2563eb; margin-bottom: 40px; }
        .cover-divider { width: 120px; height: 4px; background: #2563eb; margin: 0 auto 50px auto; border-radius: 2px; }
        .cover-meta { font-size: 12pt; color: #334155; margin: 8px 0; }
        .sec-heading { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
        h1.sec-heading { font-size: 20pt; }
        h2.sec-heading { font-size: 15pt; color: #0f766e; }
        h3.sec-heading { font-size: 13pt; color: #334155; }
        p { margin: 8px 0; font-size: 11pt; }
        .question-block { margin: 16px 0; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .question-title { font-size: 11pt; margin-bottom: 8px; }
        .points-badge { color: #059669; font-weight: bold; font-size: 9pt; }
        .option-item { margin: 4px 12px; font-size: 10.5pt; }
        .tf-options { margin: 8px 12px; font-weight: bold; }
        .ruled-line { border-bottom: 1px solid #cbd5e1; height: 26px; }
        .dots-line { color: #94a3b8; font-size: 10pt; line-height: 22px; }
        .answer-box { border: 1px solid #94a3b8; background: #fff; border-radius: 6px; margin-top: 8px; }
        @media print {
          body { padding: 0; }
          .question-block { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      ${
        metadata.includeCoverPage
          ? `
        <div class="cover-page">
          ${metadata.institution ? `<div class="cover-institution">${metadata.institution}</div>` : ''}
          <div class="cover-title">${metadata.title || 'كتاب تعليمي ميسر'}</div>
          ${metadata.subtitle ? `<div class="cover-subtitle">${metadata.subtitle}</div>` : ''}
          <div class="cover-divider"></div>
          ${metadata.author ? `<div class="cover-meta">${isAr ? 'إعداد: ' : 'Author: '}${metadata.author}</div>` : ''}
          ${metadata.subject ? `<div class="cover-meta">${isAr ? 'المادة: ' : 'Subject: '}${metadata.subject}</div>` : ''}
          ${metadata.gradeLevel ? `<div class="cover-meta">${isAr ? 'المرحلة: ' : 'Level: '}${metadata.gradeLevel}</div>` : ''}
          <div class="cover-meta">${metadata.date || new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
        </div>
      `
          : ''
      }
      <main>
        ${sectionsHtml}
      </main>
    </body>
    </html>
  `;
}
