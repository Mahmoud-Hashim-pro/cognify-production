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
} from 'docx';

export interface DocxQuestionItem {
  type: 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'essay';
  questionNumber: number;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

export interface DocxExportOptions {
  title: string;
  summary: string;
  fullText?: string;
  lang?: 'ar' | 'en' | 'fr';
  authorOrSource?: string;
  date?: string;
  quiz?: Array<{
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }>;
  flashcards?: Array<{
    front: string;
    back: string;
  }>;
  customQuestions?: DocxQuestionItem[];
}

/**
 * Intelligent question pattern parser that parses raw textbook / exam text into structured questions
 */
export function detectQuestionPatterns(rawText: string): DocxQuestionItem[] {
  if (!rawText || !rawText.trim()) return [];

  const questions: DocxQuestionItem[] = [];
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  let currentItem: Partial<DocxQuestionItem> | null = null;
  let qCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect question start: "س 1:", "Q1:", "Question 1:", "1.", "(1)", "1 -", "سؤال:"
    const qMatch = line.match(/^(?:س\s*(\d+)[:.-]|question\s*(\d+)[:.-]|q\s*(\d+)[:.-]|(\d+)[.)-]|سؤال\s*(\d*)[:.-])\s*(.+)$/i);

    if (qMatch) {
      if (currentItem && currentItem.prompt) {
        questions.push(finalizeQuestionItem(currentItem, ++qCounter));
      }

      const promptText = qMatch[6] || line;
      currentItem = {
        prompt: promptText,
        options: [],
        type: 'short_answer',
      };
      continue;
    }

    // Check for True/False indicators
    if (currentItem && (line.includes('صح أم خطأ') || line.includes('True or False') || line.includes('Vrai ou Faux'))) {
      currentItem.type = 'true_false';
      continue;
    }

    // Check for Fill-in-the-blank indicators: contains "....." or "_____"
    if (currentItem && (line.includes('.....') || line.includes('_____') || line.includes('أكمل العبارة') || line.includes('Fill in the blank'))) {
      currentItem.type = 'fill_blank';
      continue;
    }

    // Detect options: "[A]", "(A)", "A)", "A.", "أ-", "أ)", "(أ)"
    const optMatch = line.match(/^(?:\[([A-Da-d\u0623-\u062F])\]|\(([A-Da-d\u0623-\u062F])\)|([A-Da-d\u0623-\u062F])[.)-])\s*(.+)$/);
    if (optMatch && currentItem) {
      currentItem.type = 'mcq';
      currentItem.options = currentItem.options || [];
      currentItem.options.push(line);
      continue;
    }

    // Detect Answer / Explanation line: "الإجابة:", "Answer:", "Solution:", "الشرح:"
    const ansMatch = line.match(/^(?:الإجابة|الحل|الجواب|Answer|Correct Answer|Solution|الشرح|Explanation)[:.-]\s*(.+)$/i);
    if (ansMatch && currentItem) {
      currentItem.correctAnswer = ansMatch[1].trim();
      continue;
    }

    // If we have an active question, append text to prompt if no options yet
    if (currentItem && (!currentItem.options || currentItem.options.length === 0)) {
      currentItem.prompt = `${currentItem.prompt} ${line}`.trim();
    }
  }

  if (currentItem && currentItem.prompt) {
    questions.push(finalizeQuestionItem(currentItem, ++qCounter));
  }

  return questions;
}

function finalizeQuestionItem(item: Partial<DocxQuestionItem>, fallbackNum: number): DocxQuestionItem {
  let itemType: DocxQuestionItem['type'] = item.type || 'short_answer';

  if (item.options && item.options.length >= 2) {
    itemType = 'mcq';
  } else if (item.prompt && (item.prompt.includes('.....') || item.prompt.includes('_____'))) {
    itemType = 'fill_blank';
  } else if (item.prompt && (item.prompt.includes('صح أم خطأ') || item.prompt.includes('True/False') || item.prompt.includes('صح أو خطأ'))) {
    itemType = 'true_false';
  }

  return {
    type: itemType,
    questionNumber: item.questionNumber || fallbackNum,
    prompt: item.prompt || '',
    options: item.options || [],
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
  };
}

/**
 * Builds an accessible native Word (.docx) document with proper Heading styles,
 * RTL alignment for Arabic, and structured question tables.
 */
export async function generateNativeDocxBlob(options: DocxExportOptions): Promise<Blob> {
  const isAr = options.lang === 'ar' || !options.lang;
  const alignment = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const fontName = isAr ? 'Segoe UI' : 'Calibri';

  const children: (Paragraph | Table)[] = [];

  // Title (Heading 1)
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: options.title || (isAr ? 'مستند كوجنيفاي التعليمي الميسر' : 'Cognify Accessible Educational Document'),
          bold: true,
          size: 32, // 16pt
          font: fontName,
          rightToLeft: isAr,
          color: '1E1B4B',
        }),
      ],
    })
  );

  // Metadata Subtitle
  const dateStr = options.date || new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
  const sourceStr = options.authorOrSource || (isAr ? 'تم استخراجه وتنسيقه بواسطة منصة كوجنيفاي الذكية' : 'Generated by Cognify AI Educational Studio');

  children.push(
    new Paragraph({
      alignment,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `${sourceStr} • ${dateStr}`,
          italics: true,
          size: 20, // 10pt
          font: fontName,
          rightToLeft: isAr,
          color: '64748B',
        }),
      ],
    })
  );

  // Section 1: Core Takeaways & Summary (Heading 2)
  if (options.summary && options.summary.trim()) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({
            text: isAr ? '📌 الزبدة وخلاصة المحتوى التعليمي' : '📌 Core Takeaways & Executive Summary',
            bold: true,
            size: 26, // 13pt
            font: fontName,
            rightToLeft: isAr,
            color: '312E81',
          }),
        ],
      })
    );

    const summaryClean = options.summary.replace(/\*\*/g, '').replace(/###/g, '');
    const summaryParas = summaryClean.split('\n').filter((p) => p.trim());

    for (const para of summaryParas) {
      children.push(
        new Paragraph({
          alignment,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: para,
              size: 22, // 11pt
              font: fontName,
              rightToLeft: isAr,
              color: '1E293B',
            }),
          ],
        })
      );
    }
  }

  // Section 2: Quizzes & Question Banks (Heading 2)
  const allQuestions: DocxQuestionItem[] = [];

  if (options.quiz && options.quiz.length > 0) {
    options.quiz.forEach((q, idx) => {
      allQuestions.push({
        type: 'mcq',
        questionNumber: idx + 1,
        prompt: q.question,
        options: q.options,
        correctAnswer: q.options[q.answerIndex] ? `${q.options[q.answerIndex]} ✅` : undefined,
        explanation: q.explanation,
      });
    });
  }

  if (options.customQuestions && options.customQuestions.length > 0) {
    allQuestions.push(...options.customQuestions);
  }

  if (allQuestions.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 300, after: 140 },
        children: [
          new TextRun({
            text: isAr ? '📝 بنك الأسئلة والتدريبات النموذجية' : '📝 Interactive Practice & Question Bank',
            bold: true,
            size: 26,
            font: fontName,
            rightToLeft: isAr,
            color: '166534',
          }),
        ],
      })
    );

    for (const q of allQuestions) {
      const qCells: Paragraph[] = [];

      qCells.push(
        new Paragraph({
          alignment,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${isAr ? 'سؤال' : 'Question'} ${q.questionNumber} (${getQuestionTypeLabel(q.type, isAr)}): `,
              bold: true,
              size: 22,
              font: fontName,
              rightToLeft: isAr,
              color: '166534',
            }),
            new TextRun({
              text: q.prompt,
              bold: true,
              size: 22,
              font: fontName,
              rightToLeft: isAr,
              color: '0F172A',
            }),
          ],
        })
      );

      if (q.options && q.options.length > 0) {
        for (const opt of q.options) {
          qCells.push(
            new Paragraph({
              alignment,
              spacing: { after: 40 },
              indent: isAr ? undefined : { left: 400 },
              children: [
                new TextRun({
                  text: `  • ${opt}`,
                  size: 20,
                  font: fontName,
                  rightToLeft: isAr,
                  color: '334155',
                }),
              ],
            })
          );
        }
      }

      if (q.correctAnswer) {
        qCells.push(
          new Paragraph({
            alignment,
            spacing: { before: 60, after: 40 },
            children: [
              new TextRun({
                text: `${isAr ? 'الإجابة النموذجية' : 'Model Answer'}: `,
                bold: true,
                size: 20,
                font: fontName,
                rightToLeft: isAr,
                color: '15803D',
              }),
              new TextRun({
                text: q.correctAnswer,
                size: 20,
                font: fontName,
                rightToLeft: isAr,
                color: '15803D',
              }),
            ],
          })
        );
      }

      if (q.explanation) {
        qCells.push(
          new Paragraph({
            alignment,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `💡 ${isAr ? 'التوضيح الأكاديمي' : 'Explanation'}: `,
                italics: true,
                size: 20,
                font: fontName,
                rightToLeft: isAr,
                color: '4338CA',
              }),
              new TextRun({
                text: q.explanation,
                size: 20,
                font: fontName,
                rightToLeft: isAr,
                color: '4338CA',
              }),
            ],
          })
        );
      }

      // Render each question inside an accessible styled single-cell table
      const questionTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                margins: { top: 140, bottom: 140, left: 180, right: 180 },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  left: { style: isAr ? BorderStyle.NONE : BorderStyle.SINGLE, size: isAr ? 0 : 16, color: '166534' },
                  right: { style: isAr ? BorderStyle.SINGLE : BorderStyle.NONE, size: isAr ? 16 : 0, color: '166534' },
                },
                children: qCells,
              }),
            ],
          }),
        ],
      });

      children.push(questionTable);
      children.push(new Paragraph({ spacing: { after: 160 } }));
    }
  }

  // Section 3: Spaced Repetition Flashcards (Heading 2)
  if (options.flashcards && options.flashcards.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 300, after: 140 },
        children: [
          new TextRun({
            text: isAr ? '🗂️ بطاقات الاستذكار السريع (Flashcards)' : '🗂️ Spaced Repetition Flashcards',
            bold: true,
            size: 26,
            font: fontName,
            rightToLeft: isAr,
            color: '6B21A8',
          }),
        ],
      })
    );

    for (let fIdx = 0; fIdx < options.flashcards.length; fIdx++) {
      const card = options.flashcards[fIdx];
      const cardTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'FAF5FF' },
                margins: { top: 120, bottom: 120, left: 140, right: 140 },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: 'E9D5FF' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E9D5FF' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: 'E9D5FF' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: 'E9D5FF' },
                },
                children: [
                  new Paragraph({
                    alignment,
                    children: [
                      new TextRun({
                        text: `${isAr ? 'البطاقة' : 'Card'} ${fIdx + 1}: `,
                        bold: true,
                        size: 20,
                        font: fontName,
                        rightToLeft: isAr,
                        color: '6B21A8',
                      }),
                      new TextRun({
                        text: card.front,
                        size: 20,
                        font: fontName,
                        rightToLeft: isAr,
                        color: '0F172A',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F3E8FF' },
                margins: { top: 120, bottom: 120, left: 140, right: 140 },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: 'E9D5FF' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E9D5FF' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: 'E9D5FF' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: 'E9D5FF' },
                },
                children: [
                  new Paragraph({
                    alignment,
                    children: [
                      new TextRun({
                        text: `${isAr ? 'المفهوم / الحل' : 'Concept / Answer'}: `,
                        bold: true,
                        size: 20,
                        font: fontName,
                        rightToLeft: isAr,
                        color: '581C87',
                      }),
                      new TextRun({
                        text: card.back,
                        size: 20,
                        font: fontName,
                        rightToLeft: isAr,
                        color: '0F172A',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      children.push(cardTable);
      children.push(new Paragraph({ spacing: { after: 100 } }));
    }
  }

  // Section 4: Full Extracted Text (Heading 2)
  if (options.fullText && options.fullText.trim()) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 300, after: 120 },
        children: [
          new TextRun({
            text: isAr ? '📝 النص الكامل المستخرج والمترجم' : '📝 Full Extracted & Translated Text',
            bold: true,
            size: 26,
            font: fontName,
            rightToLeft: isAr,
            color: '0F172A',
          }),
        ],
      })
    );

    const fullClean = options.fullText.replace(/\*\*/g, '').replace(/###/g, '');
    const fullParas = fullClean.split('\n').filter((p) => p.trim());

    for (const para of fullParas) {
      children.push(
        new Paragraph({
          alignment,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: para,
              size: 20,
              font: fontName,
              rightToLeft: isAr,
              color: '334155',
            }),
          ],
        })
      );
    }
  }

  // Footer note
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: 'Cognify Inclusive Learning Platform • Accessible Educational Studio',
          size: 18,
          italics: true,
          font: fontName,
          color: '94A3B8',
        }),
      ],
    })
  );

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
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function getQuestionTypeLabel(type: DocxQuestionItem['type'], isAr: boolean): string {
  switch (type) {
    case 'mcq':
      return isAr ? 'اختيار من متعدد' : 'Multiple Choice';
    case 'true_false':
      return isAr ? 'صح أم خطأ' : 'True or False';
    case 'fill_blank':
      return isAr ? 'أكمل الفراغات' : 'Fill in the blank';
    case 'essay':
      return isAr ? 'سؤال مقالي' : 'Essay';
    default:
      return isAr ? 'سؤال تدريبي' : 'Practice Question';
  }
}

/**
 * Triggers an immediate browser download of the genuine .docx file
 */
export async function downloadNativeDocx(options: DocxExportOptions) {
  if (typeof window === 'undefined') return;
  const blob = await generateNativeDocxBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (options.title || 'cognify-document')
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  a.download = `${safeTitle || 'cognify-document'}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
