/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cognify Automated Verification Suite: Milestone 32
 * Phase 6: Accessible Educational Book & Document Studio Engine
 */

import {
  TEMPLATE_PRESETS,
  BookTemplateType,
  QuestionType,
  AnswerSpaceStyle,
  RecognizedQuestion,
  DocumentSection,
  BookStudioMetadata,
  recognizeEducationalQuestions,
  parseDocumentStructure,
  buildAccessibleBookDocx,
  buildPrintableHtmlDocument,
  BOOK_STUDIO_STORAGE_KEY,
} from '../src/lib/bookStudioEngine.js';

export async function runEducationalBookStudioVerification(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✓ ${description}`);
      passed++;
    } else {
      console.error(`  ✗ ${description}`);
      failed++;
    }
  }

  console.log('\n--- Running Educational Book & Document Studio Suite (Milestone 32) ---');

  // =========================================================================
  // Test Suite 1: Template Presets Coverage (8 Distinct Educational Types)
  // =========================================================================
  console.log('\n  [Suite 1: Template Presets & Layout Constraints]');
  
  const expectedTemplates: BookTemplateType[] = [
    'textbook',
    'teacher_guide',
    'worksheet',
    'exam',
    'question_bank',
    'lesson_notes',
    'workbook',
    'research_document',
  ];

  for (const t of expectedTemplates) {
    const preset = TEMPLATE_PRESETS[t];
    assert(!!preset, `Template preset "${t}" is fully registered`);
    assert(typeof preset.labelEn === 'string' && preset.labelEn.length > 0, `Template "${t}" has English title`);
    assert(typeof preset.labelAr === 'string' && preset.labelAr.length > 0, `Template "${t}" has Arabic title`);
    assert(typeof preset.defaultCover === 'boolean', `Template "${t}" specifies cover page default`);
    assert(typeof preset.defaultToc === 'boolean', `Template "${t}" specifies TOC default`);
    assert(typeof preset.defaultAnswerStyle === 'string', `Template "${t}" specifies default answer style`);
  }

  assert(TEMPLATE_PRESETS.textbook.defaultCover === true, 'Textbook enables cover page by default');
  assert(TEMPLATE_PRESETS.textbook.defaultToc === true, 'Textbook enables TOC by default');
  assert(TEMPLATE_PRESETS.worksheet.defaultCover === false, 'Worksheet disables cover page for single-session use');
  assert(TEMPLATE_PRESETS.exam.defaultAnswerStyle === 'lines' || TEMPLATE_PRESETS.exam.defaultAnswerStyle === 'box', 'Exam provides physical writing answer space');

  // =========================================================================
  // Test Suite 2: Question Pattern Recognition (Arabic & English)
  // =========================================================================
  console.log('\n  [Suite 2: Question Pattern Recognition & Type Classification]');

  const sampleRawQuestions = `
الفصل الأول: مدخل إلى الذكاء الاصطناعي

س 1: اختر الإجابة الصحيحة مما بين القوسين:
ما هي لغة البرمجة الأكثر شيوعاً في الذكاء الاصطناعي؟
أ) بايثون
ب) جافا
ج) سي بلس بلس
د) بي إتش بي

س 2: ضع علامة (✓) أمام العبارة الصحيحة وعلامة (✗) أمام العبارة الخاطئة:
يعتبر التعلم العميق فرعاً من فروع تعلم الآلة.

س 3: أكمل ما يأتي بما يناسبه:
تعتمد الشبكات العصبية الاصطناعية على محاكاة طريقة عمل الخلايا _____ في المخ البشري.

س 4: علل لما يأتي:
أهمية إتاحة التطبيقات الرقمية لذوي الإعاقة البصرية؟

س 5: اشرح بالتفصيل مراحل معالجة اللغات الطبيعية (NLP).

س 6: صِل من العمود (أ) ما يناسبه من العمود (ب):
- التعلم الإشرافي : وجود بيانات مصنفة مسبقاً
- التعلم غير الإشرافي : اكتشاف الأنماط دون تصنيف مسبق
- التعلم التعزيزي : التعلم من خلال التجربة والمكافأة

Q 7: What does OCR stand for in assistive computer vision?
A) Optical Character Recognition
B) Open Camera Rendering
C) Online Caption Reader
D) Optimal Contrast Ratio

Q 8: True or False: Screen readers rely on semantic headings for non-visual navigation.

Q 9: Fill in the blank:
WCAG stands for Web Content _____ Guidelines.
`;

  const recognized = recognizeEducationalQuestions(sampleRawQuestions);
  assert(recognized.length >= 8, `Detected ${recognized.length} questions from mixed educational text (expected >= 8)`);

  const mcqAr = recognized.find(q => q.type === 'mcq' && q.prompt.includes('البرمجة'));
  assert(!!mcqAr, 'Identified Arabic MCQ question');
  assert(!!mcqAr && Array.isArray(mcqAr.options) && mcqAr.options.length >= 4, 'Extracted 4 MCQ choices for Arabic question');

  const tfAr = recognized.find(q => q.type === 'true_false' && q.prompt.includes('التعلم العميق'));
  assert(!!tfAr, 'Identified Arabic True/False question');

  const fillAr = recognized.find(q => q.type === 'fill_blank' && q.prompt.includes('أكمل'));
  assert(!!fillAr, 'Identified Arabic Fill in the Blank question');

  const shortAr = recognized.find(q => q.type === 'short_answer' && q.prompt.includes('علل'));
  assert(!!shortAr, 'Identified Arabic Short Answer question (علل)');

  const essayAr = recognized.find(q => q.type === 'essay' && q.prompt.includes('اشرح بالتفصيل'));
  assert(!!essayAr, 'Identified Arabic Essay question (اشرح بالتفصيل)');

  const matchAr = recognized.find(q => q.type === 'matching' && q.prompt.includes('صِل'));
  assert(!!matchAr, 'Identified Arabic Matching question (صل)');
  assert(!!matchAr && Array.isArray(matchAr.matchingPairs) && matchAr.matchingPairs.length === 3, 'Extracted 3 matching pairs');

  const mcqEn = recognized.find(q => q.type === 'mcq' && q.prompt.includes('OCR stand for'));
  assert(!!mcqEn, 'Identified English MCQ question');
  assert(!!mcqEn && Array.isArray(mcqEn.options) && mcqEn.options.length === 4, 'Extracted 4 English MCQ choices');

  const tfEn = recognized.find(q => q.type === 'true_false' && q.prompt.includes('True or False'));
  assert(!!tfEn, 'Identified English True/False question');

  const fillEn = recognized.find(q => q.type === 'fill_blank' && q.prompt.includes('WCAG'));
  assert(!!fillEn, 'Identified English Fill in the Blank question');

  // =========================================================================
  // Test Suite 3: Document Section Hierarchy & Heading Tree Parser
  // =========================================================================
  console.log('\n  [Suite 3: Hierarchical Heading Tree & Sectioning]');

  const sampleBookText = `
المقدمة
مرحبا بكم في هذا الكتاب الميسر لتعليم تقنيات الذكاء الاصطناعي.

# الفصل الأول: أساسيات الرؤية الحاسوبية
الرؤية الحاسوبية هي مجال يهدف لتمكين الحواسيب من فهم الصور الرقمية.

## المبحث الأول: استخراج النصوص والتعرف الضوئي (OCR)
يساعد التعرف الضوئي المكفوفين في قراءة المستندات المطبوعة.

### تطبيقات عملية في الحياة اليومية
قراءة لوحات الشوارع، فواتير الكهرباء، وأوراق الأدوية.

## المبحث الثاني: التعرف على العملات والألوان
التعرف على الجنيه المصري والعملات النقدية الأخرى.

# الفصل الثاني: تفريغ المحاضرات الصوتية
تحويل التسجيلات إلى نصوص مكتوبة قابلة للقراءة والبحث.
`;

  const sections = parseDocumentStructure(sampleBookText);
  assert(sections.length >= 4, `Parsed ${sections.length} structural sections`);

  const introSec = sections.find(s => s.title.includes('المقدمة'));
  assert(!!introSec, 'Identified introductory section');

  const chap1 = sections.find(s => s.level === 1 && s.title.includes('الفصل الأول'));
  assert(!!chap1, 'Identified Chapter 1 as Level 1 heading');

  const sub1 = sections.find(s => s.level === 2 && s.title.includes('المبحث الأول'));
  assert(!!sub1, 'Identified Sub-section 1 as Level 2 heading');

  const subSub1 = sections.find(s => s.level === 3 && s.title.includes('تطبيقات عملية'));
  assert(!!subSub1, 'Identified Sub-sub-section as Level 3 heading');

  const chap2 = sections.find(s => s.level === 1 && s.title.includes('الفصل الثاني'));
  assert(!!chap2, 'Identified Chapter 2 as Level 1 heading');

  // Verify non-empty content extraction
  for (const s of sections) {
    assert(s.content.length > 0, `Section "${s.title}" contains paragraph content lines`);
  }

  // =========================================================================
  // Test Suite 4: Native DOCX Generation (docx npm package integration)
  // =========================================================================
  console.log('\n  [Suite 4: Native DOCX Document Compilation & Styles]');

  const testMetadataAr: BookStudioMetadata = {
    title: 'دليل الذكاء الاصطناعي الميسر للمكفوفين',
    subtitle: 'دليل شامل لتقنيات الوصول المدمجة',
    author: 'فريق كوجنيفاي للمنظومات الميسرة',
    subject: 'علوم الحاسب والتربية الخاصة',
    gradeLevel: 'التعليم الجامعي والمتقدم',
    language: 'ar',
    template: 'textbook',
    includeCoverPage: true,
    includeTableOfContents: true,
    includeAnswerKey: false,
    answerSpaceStyle: 'lines',
    lineSpacing: 1.25,
    fontFamily: 'Traditional Arabic',
  };

  const docxBlobAr = await buildAccessibleBookDocx(sampleBookText, testMetadataAr);
  assert(!!docxBlobAr, 'Generated Arabic DOCX blob successfully');
  assert(docxBlobAr.size > 2000, `Arabic DOCX size is ${docxBlobAr.size} bytes (valid non-empty archive)`);
  assert(docxBlobAr.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'DOCX mime type is correct Word openxml format');

  // Generate English Exam DOCX with Questions & Answer Boxes
  const testMetadataEnExam: BookStudioMetadata = {
    title: 'Assistive Technologies Final Examination',
    subtitle: 'Fall Semester Assessment',
    author: 'Department of Computer Science',
    subject: 'Human-Computer Interaction',
    gradeLevel: 'Undergraduate',
    language: 'en',
    template: 'exam',
    includeCoverPage: false,
    includeTableOfContents: false,
    includeAnswerKey: false,
    answerSpaceStyle: 'box',
    lineSpacing: 1.15,
    fontFamily: 'Calibri',
  };

  const docxBlobEnExam = await buildAccessibleBookDocx(sampleRawQuestions, testMetadataEnExam);
  assert(!!docxBlobEnExam, 'Generated English Exam DOCX blob successfully');
  assert(docxBlobEnExam.size > 2000, `English Exam DOCX size is ${docxBlobEnExam.size} bytes`);

  // =========================================================================
  // Test Suite 5: Accessible Printable HTML & PDF Layout Generation
  // =========================================================================
  console.log('\n  [Suite 5: Printable HTML Rendering & Accessibility]');

  const htmlDocAr = buildPrintableHtmlDocument(sampleBookText, testMetadataAr);
  assert(typeof htmlDocAr === 'string' && htmlDocAr.length > 500, 'Rendered printable HTML document');
  assert(htmlDocAr.includes('dir="rtl"'), 'Printable HTML sets RTL direction for Arabic');
  assert(htmlDocAr.includes('lang="ar"'), 'Printable HTML specifies Arabic lang code');
  assert(htmlDocAr.includes('@page'), 'Printable HTML includes @page CSS print rules');
  assert(htmlDocAr.includes('page-break-after'), 'Printable HTML includes page breaks');
  assert(htmlDocAr.includes('دليل الذكاء الاصطناعي الميسر للمكفوفين'), 'Printable HTML includes document title');
  assert(htmlDocAr.includes('فريق كوجنيفاي للمنظومات الميسرة'), 'Printable HTML includes author credit');

  const htmlDocEn = buildPrintableHtmlDocument(sampleRawQuestions, testMetadataEnExam);
  assert(htmlDocEn.includes('dir="ltr"'), 'Printable HTML sets LTR direction for English');
  assert(htmlDocEn.includes('lang="en"'), 'Printable HTML specifies English lang code');
  assert(htmlDocEn.includes('Assistive Technologies Final Examination'), 'Printable HTML includes exam title');

  // Verify answer space rendering in HTML
  assert(htmlDocEn.includes('answer-box') || htmlDocEn.includes('border: 1.5px solid'), 'Printable HTML renders boxed answer spaces for exams');

  // =========================================================================
  // Test Suite 6: Answer Spaces Configurations ('dots', 'lines', 'box', 'none')
  // =========================================================================
  console.log('\n  [Suite 6: Configurable Answer Spaces]');

  const styles: AnswerSpaceStyle[] = ['dots', 'lines', 'box', 'none'];
  for (const style of styles) {
    const meta: BookStudioMetadata = {
      ...testMetadataEnExam,
      answerSpaceStyle: style,
    };
    const blob = await buildAccessibleBookDocx('Q 1: Explain the importance of accessibility.\n\nQ 2: Describe WCAG 2.2 principles.', meta);
    assert(!!blob && blob.size > 1500, `Generated DOCX with answer space style "${style}"`);
  }

  // =========================================================================
  // Test Suite 7: Storage Key & Non-Visual State Persistence
  // =========================================================================
  console.log('\n  [Suite 7: Storage Keys & Navigation Consistency]');
  assert(BOOK_STUDIO_STORAGE_KEY === 'cognify_book_studio_history_v1', 'Persistent storage key is stable');

  console.log(`\nEducational Book Studio Verification Complete: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}
