/**
 * Rafiqi (رفيقي) — Six Official Product Sections Architecture
 *
 * Implements the single source of truth for the 6 permanent product sections:
 * 1. See & Understand (الرؤية والفهم)
 * 2. Read & Learn (القراءة والتعلّم)
 * 3. Work & Create (العمل والإبداع)
 * 4. Move & Explore (الحركة والاستكشاف)
 * 5. Communicate (التواصل والتعبير) - including Hear & Express (السمع والتعبير)
 * 6. Personalize (التخصيص والإعدادات)
 *
 * The Universal Accessibility Layer is cross-cutting and serves all six sections.
 */

import React from 'react';
import {
  Eye,
  BookOpen,
  Briefcase,
  Compass,
  MessageSquare,
  Settings,
  ScanLine,
  Banknote,
  Palette,
  Users,
  Headphones,
  GraduationCap,
  Sparkles,
  BarChart3,
  Calendar,
  Brain,
  Radio,
  Ear,
  Mic,
  ShieldCheck,
  User,
  Shield,
  LifeBuoy,
  Volume2,
  Mail,
  Presentation,
  Table,
  CheckSquare,
  FileText,
} from 'lucide-react';

export type ProductSectionId =
  | 'see_understand'
  | 'read_learn'
  | 'work_create'
  | 'move_explore'
  | 'communicate'
  | 'personalize';

export type FeatureStatus = 'ready' | 'active' | 'foundational';

export interface SectionFeatureItem {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  iconName: string;
  status: FeatureStatus;
  statusLabelEn: string;
  statusLabelAr: string;
  tagsEn: string[];
  tagsAr: string[];
  targetView: string;
  targetTab?: string;
  targetTool?: string;
  isPrimaryAction?: boolean;
}

export interface ProductSectionDefinition {
  id: ProductSectionId;
  numericOrder: number;
  titleEn: string;
  titleAr: string;
  shortExplanationEn: string;
  shortExplanationAr: string;
  detailedPurposeEn: string;
  detailedPurposeAr: string;
  iconName: string;
  themeColor: string;
  accentBg: string;
  features: SectionFeatureItem[];
}

export const PRODUCT_SECTIONS: ProductSectionDefinition[] = [
  {
    id: 'see_understand',
    numericOrder: 1,
    titleEn: 'See & Understand',
    titleAr: 'الرؤية والفهم',
    shortExplanationEn: 'Real-time AI camera descriptions, object finder, text OCR, currency reader, and spatial guidance.',
    shortExplanationAr: 'وصف فوري للمحيط بالكاميرا، البحث عن الأشياء، قراءة النصوص والعملات، والتوجيه البصري الذكي.',
    detailedPurposeEn: 'Transforms the camera into a trustworthy, fresh visual companion for blind and visually impaired users without stale hallucinations.',
    detailedPurposeAr: 'يحول كاميرا الهاتف إلى رفيق بصري ذكي وموثوق يقدم أوصافاً فورية دقيقة بدون هلوسة أو تأخير.',
    iconName: 'Eye',
    themeColor: '#1769AA',
    accentBg: 'rgba(23, 105, 170, 0.12)',
    features: [
      {
        id: 'feat_visual_assistant',
        titleEn: 'Visual Assistant & Scene Understanding',
        titleAr: 'المساعد البصري ووصف المشهد',
        descEn: 'Conversational visual assistant describing surrounding scenes, obstacles, and spatial landmarks.',
        descAr: 'مساعد بصري تحاوري يصف المشاهد المحيطة، يرصد العوائق، وينبهك للمسارات المفتوحة.',
        iconName: 'Eye',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Scene Vision', 'Obstacle Alert', 'Spatial Clock'],
        tagsAr: ['وصف المشهد', 'تنبيه العوائق', 'ساعة الاتجاهات'],
        targetView: 'disability',
        targetTab: 'vision',
        targetTool: 'scene',
        isPrimaryAction: true,
      },
      {
        id: 'feat_text_reader',
        titleEn: 'Smart Text & Document OCR',
        titleAr: 'قارئ النصوص واللافتات (OCR)',
        descEn: 'Reads printed books, product packaging, street signs, and letters aloud in Arabic and English.',
        descAr: 'قراءة المستندات المطبوعة واللافتات والعبوات بصوت واضح مع الحفاظ على الترتيب الأصلي.',
        iconName: 'ScanLine',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Arabic/English OCR', 'Continuous Reading', 'No Fabrication'],
        tagsAr: ['تعرف ضوئي عربي/إنجليزي', 'قراءة مستمرة', 'أمانة في النقل'],
        targetView: 'disability',
        targetTab: 'vision',
        targetTool: 'read',
      },
      {
        id: 'feat_currency_reader',
        titleEn: 'Cash & Currency Reader',
        titleAr: 'قارئ العملات والنقود',
        descEn: 'Accurately identifies banknotes and denominations with certainty levels and counterfeit notices.',
        descAr: 'التعرف على فئات النقود الورقية (جنيه، دولار، يورو، ريال) مع توضيح مستوى الثقة وتنبيه الأمان.',
        iconName: 'Banknote',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['EGP / USD / EUR / SAR', 'Voice Denomination', 'Safe Auditing'],
        tagsAr: ['جنيه / دولار / يورو / ريال', 'نطق القيمة', 'فحص آمن'],
        targetView: 'disability',
        targetTab: 'vision',
        targetTool: 'currency',
      },
      {
        id: 'feat_object_finder',
        titleEn: 'Object & Essential Item Finder',
        titleAr: 'البحث عن الأشياء والمقتنيات',
        descEn: 'Locates requested keys, phone, glasses, or cup in camera view with directional movement hints.',
        descAr: 'العثور على المفاتيح، الهاتف، النظارة، أو الكوب مع توجيه حركة الكاميرا (يمين، يسار، أمام).',
        iconName: 'Compass',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Directional Guidance', 'Key Objects', 'No Metric Hallucination'],
        tagsAr: ['توجيه نسبي', 'مقتنيات أساسية', 'بدون مسافات وهمية'],
        targetView: 'disability',
        targetTab: 'vision',
        targetTool: 'object',
      },
      {
        id: 'feat_color_matcher',
        titleEn: 'Color & Outfit Matcher',
        titleAr: 'فحص وتنسيق الألوان',
        descEn: 'Announces exact garment and object colors with contrast and complementary coordination advice.',
        descAr: 'التعرف على درجات الألوان بدقة للملابس والمقتنيات وتقديم نصائح التنسيق والتباين.',
        iconName: 'Palette',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Garment Colors', 'Color Contrast', 'Coordination Advice'],
        tagsAr: ['ألوان الملابس', 'تباين الألوان', 'نصائح التنسيق'],
        targetView: 'disability',
        targetTab: 'vision',
        targetTool: 'color',
      },
      {
        id: 'feat_person_recognition',
        titleEn: 'Person & Contact Recognition',
        titleAr: 'التعرف على الأشخاص والوجوه',
        descEn: 'Recognizes registered friends, family, and teachers when they enter the camera field of view.',
        descAr: 'التعرف على الوجوه المسجلة للأصدقاء والأساتذة وأفراد العائلة عند ظهورهم في الكاميرا.',
        iconName: 'Users',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Enrolled Contacts', 'Proximity Alert', 'Voice Announcement'],
        tagsAr: ['جهات مسجلة', 'تنبيه الاقتراب', 'نطق الاسم'],
        targetView: 'disability',
        targetTab: 'vision',
        targetTool: 'face',
      },
      {
        id: 'feat_product_scanner',
        titleEn: 'Product, Barcode & Expiry Scanner',
        titleAr: 'فاحص المنتجات والباركود والصلاحية',
        descEn: 'Scans packaging barcodes, reads labels, and checks expiration and manufacturing dates.',
        descAr: 'مسح الباركود، قراءة بيانات الملصقات، وتدقيق تاريخ الإنتاج والصلاحية بدقة.',
        iconName: 'ShoppingBag',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Barcode Scanner', 'Expiry Date', 'Packaging OCR'],
        tagsAr: ['ماسح الباركود', 'تاريخ الصلاحية', 'ملصقات العبوات'],
        targetView: 'disability',
        targetTab: 'vision',
        targetTool: 'product',
      },
    ],
  },
  {
    id: 'read_learn',
    numericOrder: 2,
    titleEn: 'Read & Learn',
    titleAr: 'القراءة والتعلّم',
    shortExplanationEn: 'Accessible document reading, lecture transcription, EPUB/PDF parser, and study intelligence.',
    shortExplanationAr: 'قراءة الكتب والمستندات التعليمية، تفريغ المحاضرات الصوتية، دعم EPUB و PDF، والتلخيص الذكي.',
    detailedPurposeEn: 'Transforms textbooks and lecture recordings into an accessible non-visual learning environment with honest grounded Q&A.',
    detailedPurposeAr: 'يحول الكتب والمحاضرات إلى بيئة تعليمية غير بصرية متكاملة مع أسئلة مدعومة بالمصادر وبدون تزييف.',
    iconName: 'BookOpen',
    themeColor: '#1769AA',
    accentBg: 'rgba(23, 105, 170, 0.12)',
    features: [
      {
        id: 'feat_audio_doc_intelligence',
        titleEn: 'Audio & Document Intelligence',
        titleAr: 'ذكاء الصوت والمستندات',
        descEn: 'Lecture intelligence, native EPUB/PDF reader, grounded content Q&A, and interactive quiz generator.',
        descAr: 'تفريغ المحاضرات الصوتية، قارئ كتب EPUB و PDF، أسئلة معتمدة على المستند، واختبارات تفاعلية.',
        iconName: 'Headphones',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['EPUB/PDF', 'Lecture Transcriber', 'Quiz Generator', 'Math & Braille'],
        tagsAr: ['كتب ومستندات', 'تفريغ محاضرات', 'اختبارات ذكية', 'رياضيات وبرايل'],
        targetView: 'audio_document_intelligence',
        isPrimaryAction: true,
      },
      {
        id: 'feat_book_studio',
        titleEn: 'Educational Book Studio',
        titleAr: 'استوديو الكتب والمناهج التعليمية',
        descEn: 'Converts textbooks into structured, screen-reader friendly digital books with chapter bookmarks.',
        descAr: 'تحويل المناهج إلى كتب رقمية مهيأة بالكامل لقارئات الشاشة مع علامات مرجعية للفصول.',
        iconName: 'BookOpen',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Textbook Formatting', 'Chapter Marks', 'Offline Export'],
        tagsAr: ['تنسيق المناهج', 'علامات الفصول', 'تصدير للقراءة'],
        targetView: 'book_studio',
      },
      {
        id: 'feat_accessible_tutor',
        titleEn: 'Accessible AI Tutor',
        titleAr: 'المساعد الأكاديمي المهيأ',
        descEn: 'Adaptive multi-modal tutor explaining academic concepts step-by-step with zero markdown clutter.',
        descAr: 'معلم ذكي متكيف يشرح المفاهيم الأكاديمية خطوة بخطوة بلغة واضحة متوافقة مع قارئ الشاشة.',
        iconName: 'MessageSquare',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Step-by-Step', 'Screen Reader Ready', 'Adaptive Pace'],
        tagsAr: ['شرح تفصيلي', 'جاهز لقارئ الشاشة', 'وتيرة متكيفة'],
        targetView: 'chat',
      },
      {
        id: 'feat_math_table_reader',
        titleEn: 'Accessible Table & Math Reader',
        titleAr: 'قارئ الجداول والمعادلات الرياضية',
        descEn: 'Cell-by-cell table navigation with coordinates and spoken verbalization of LaTeX fractions and roots.',
        descAr: 'تصفح الجداول خلية بخلية مع نطق الإحداثيات، وشرح لفظي صوتي لمعادلات LaTeX والكسور والجذور.',
        iconName: 'Volume2',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Cell Coordinates', 'Spoken LaTeX', 'Semantics Intact'],
        tagsAr: ['إحداثيات الخلايا', 'نطق المعادلات', 'حفظ المعنى الرياضي'],
        targetView: 'audio_document_intelligence',
        targetTab: 'advanced',
      },
      {
        id: 'feat_braille_transcriber',
        titleEn: 'Braille Unicode Transcriber & .BRF',
        titleAr: 'محول برايل وقارئ ملفات BRF',
        descEn: 'Transcribes Arabic and English text into Unicode Braille patterns (U+2800..U+28FF) with downloadable .BRF.',
        descAr: 'تحويل النصوص العربية والإنجليزية إلى رموز برايل المعتمدة وتصدير ملفات BRF للطباعة البارزة.',
        iconName: 'Sparkles',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Arabic/English Braille', 'BRF Download', 'Grade 1 Mapping'],
        tagsAr: ['برايل عربي وإنجليزي', 'تحميل BRF', 'المستوى الأول'],
        targetView: 'audio_document_intelligence',
        targetTab: 'advanced',
      },
    ],
  },
  {
    id: 'work_create',
    numericOrder: 3,
    titleEn: 'Work & Create',
    titleAr: 'العمل والإبداع',
    shortExplanationEn: 'Accessible academic command center, study planners, goal tracking, and cognitive tools.',
    shortExplanationAr: 'مركز القيادة الأكاديمي، جدول المذاكرة الميسر، تتبع الأهداف والمعدل، والتمارين الإدراكية.',
    detailedPurposeEn: 'Equips students and professionals with accessible executive tools to manage schedules, assignments, and learning velocity.',
    detailedPurposeAr: 'يمكّن الطلاب والمهنيين من إدارة مهامهم وجداولهم ومعدلاتهم التعليمية باستقلالية تامة.',
    iconName: 'Briefcase',
    themeColor: '#1769AA',
    accentBg: 'rgba(23, 105, 170, 0.12)',
    features: [
      {
        id: 'feat_productivity_workspace',
        titleEn: 'Accessible Productivity Workspace & AI Assistant',
        titleAr: 'مساحة الإنتاجية ومساعد العمل والإبداع الذكي',
        descEn: 'Voice-dictated documents, writing & email assistant, PowerPoint presentation creator, spreadsheet & formula analyst, chart describer, and accessible form filling.',
        descAr: 'إنشاء المستندات بالصوت، مساعد الصياغة والبريد الإلكتروني، صانع العروض التقديمية، مساعد الجداول والصيغ، واصف المخططات، وتعبئة النماذج الذكية.',
        iconName: 'Briefcase',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Voice Docs', 'Email Assistant', 'PowerPoint PPTX', 'Excel Formulas', 'Chart Description', 'Form Assistant'],
        tagsAr: ['مستندات صوتية', 'صياغة البريد', 'عروض PPTX', 'صيغ إكسل', 'وصف المخططات', 'مساعد النماذج'],
        targetView: 'productivity',
        isPrimaryAction: true,
      },
      {
        id: 'feat_voice_doc_creation',
        titleEn: 'Voice Document Creation & Dictation',
        titleAr: 'إنشاء المستندات بالصوت والإملاء الذكي',
        descEn: 'Dictate headings, paragraphs, lists, and punctuation with real-time spoken confirmation, safe replacement guards, and editable transcript.',
        descAr: 'إملاء العناوين والفقرات والقوائم وعلامات الترقيم بالصوت مع تأكيد صوتي فوري، حماية المستندات من الاستبدال، وتعديل النص المفرغ.',
        iconName: 'Mic',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Voice Dictation', 'Punctuation Commands', 'Spoken Feedback', 'DOCX Export'],
        tagsAr: ['إملاء صوتي', 'أوامر الترقيم', 'تأكيد صوتي', 'تصدير DOCX'],
        targetView: 'productivity',
        targetTab: 'voice_doc',
      },
      {
        id: 'feat_writing_email_assistant',
        titleEn: 'Writing & Email Assistant',
        titleAr: 'مساعد الصياغة وتحرير البريد الإلكتروني',
        descEn: 'Draft, polish, and summarize messages in formal Arabic, Egyptian Ammiya, and English with tone/length controls and zero unauthorized sending.',
        descAr: 'صياغة وتنقيح وتلخيص الرسائل بالفصحى والعامية المصرية والإنجليزية مع ضبط النبرة والحجم وبدون إرسال غير مصرح.',
        iconName: 'Mail',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Tone & Length', 'Formal/Egyptian/English', 'Subject & Sign-off', 'Draft Review'],
        tagsAr: ['النبرة والحجم', 'فصحى/عامية/إنجليزية', 'العنوان والتوقيع', 'مراجعة المسودة'],
        targetView: 'productivity',
        targetTab: 'writing_assistant',
      },
      {
        id: 'feat_powerpoint_creator',
        titleEn: 'Accessible PowerPoint & Slide Creator',
        titleAr: 'صانع العروض التقديمية الميسر (PowerPoint)',
        descEn: 'Generate structured presentations with titles, bullet points, speaker notes, screen-reader sequential review, and verified .PPTX export.',
        descAr: 'إنشاء عروض تقديمية منظمة مع عناوين ونقاط وملاحظات المتحدث، تصفح تتابعي لقارئ الشاشة، وتصدير PPTX حقيقي مجرب.',
        iconName: 'Presentation',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Slide Titles', 'Speaker Notes', 'Screen Reader Review', 'Verified PPTX'],
        tagsAr: ['عناوين الشرائح', 'ملاحظات المتحدث', 'تصفح تتابعي', 'تصدير PPTX مجرب'],
        targetView: 'productivity',
        targetTab: 'powerpoint_creator',
      },
      {
        id: 'feat_excel_assistant',
        titleEn: 'Excel & Data Spreadsheet Assistant',
        titleAr: 'مساعد الجداول والبيانات وصيغ إكسل',
        descEn: 'Inspect table dimensions, summarize numeric columns, evaluate formulas (SUM, AVERAGE, IF), and safely update cells without silent overwriting.',
        descAr: 'قراءة أبعاد الجداول، تلخيص الأعمدة الرقمية، تقييم وشرح الصيغ (SUM, AVERAGE, IF)، والتعديل الآمن بدون الكتابة فوق البيانات دون تأكيد.',
        iconName: 'Table',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Table Summary', 'Formula Explainer', 'Formula Safety', 'CSV/TSV Export'],
        tagsAr: ['ملخص الجدول', 'شرح الصيغ', 'أمان المعادلات', 'تصدير CSV/TSV'],
        targetView: 'productivity',
        targetTab: 'excel_assistant',
      },
      {
        id: 'feat_chart_describer',
        titleEn: 'Chart & Visual Data Describer',
        titleAr: 'واصف الرسوم البيانية والمخططات',
        descEn: 'Explains chart types, axes, series, trends, comparisons, and limitations with structured text equivalents and zero hallucinated numbers.',
        descAr: 'شرح نوع المخطط والمحاور والسلاسل والاتجاهات والمقارنات والقيود مع جدول بديل كامل وبدون افتعال أرقام غير موجودة.',
        iconName: 'BarChart3',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Axes & Scales', 'Trend Analysis', 'Text Equivalent', 'Grounded Data'],
        tagsAr: ['المحاور والمقاييس', 'تحليل الاتجاهات', 'بديل نصي كامل', 'بيانات مثبتة'],
        targetView: 'productivity',
        targetTab: 'chart_describer',
      },
      {
        id: 'feat_smart_form_filler',
        titleEn: 'Smart Form Assistant & Reviewer',
        titleAr: 'مساعد تعبئة النماذج والاستمارات الذكي',
        descEn: 'Step-by-step form guidance explaining required vs optional fields, accessible entry, zero sensitive guessing, and explicit confirmation before submission.',
        descAr: 'إرشاد خطوة بخطوة للنماذج، توضيح الحقول الإلزامية والاختيارية، عدم تخمين البيانات الحساسة، وتأكيد صريح قبل أي اعتماد.',
        iconName: 'CheckSquare',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Required/Optional', 'Sensitive Data Guard', 'Step-by-Step Review', 'Safe Confirmation'],
        tagsAr: ['إلزامي واختياري', 'حماية البيانات الحساسة', 'مراجعة خطوة بخطوة', 'تأكيد صريح'],
        targetView: 'productivity',
        targetTab: 'form_filler',
      },
      {
        id: 'feat_academic_planner',
        titleEn: 'Academic Command Center & Planner',
        titleAr: 'الجدول الأكاديمي والمهام الدراسية',
        descEn: 'Accessible calendar, exam timetable, assignment deadlines, and auditory milestone reminders.',
        descAr: 'تقويم أكاديمي ميسر، جدول مواعيد الاختبارات والتكليفات، وتنبيهات صوتية بمواعيد الإنجاز.',
        iconName: 'Calendar',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Exam Timetable', 'Deadlines', 'Auditory Reminders'],
        tagsAr: ['جدول الاختبارات', 'مواعيد التسليم', 'تنبيهات صوتية'],
        targetView: 'planner',
      },
      {
        id: 'feat_goals_gpa',
        titleEn: 'Accessible Goal Tracker & GPA Calculator',
        titleAr: 'تتبع الأهداف ومحاكي المعدل التراكمي',
        descEn: 'Tracks academic milestones and simulates target GPA scores with high-contrast breakdown.',
        descAr: 'تتبع أهداف الفصل الدراسي ومحاكاة المعدل التراكمي (GPA) مع تباين عالي لقارئات الشاشة.',
        iconName: 'BarChart3',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['GPA Simulator', 'Milestones', 'Screen Reader Ready'],
        tagsAr: ['محاكي GPA', 'أهداف مرحلية', 'مهيأ لقارئ الشاشة'],
        targetView: 'goals',
      },
      {
        id: 'feat_cognitive_gym',
        titleEn: 'Cognitive Gym & Executive Functions',
        titleAr: 'الصالة المعرفية وتمارين الذاكرة',
        descEn: 'Auditory and logic exercises designed to sharpen working memory and focus for neurodivergent learners.',
        descAr: 'تمارين منطقية وصوتية مصممة لتقوية الذاكرة العاملة والتركيز لذوي التنوع العصبي وصعوبات التعلم.',
        iconName: 'Brain',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Working Memory', 'Auditory Logic', 'Focus Training'],
        tagsAr: ['الذاكرة العاملة', 'المنطق الصوتي', 'تدريب التركيز'],
        targetView: 'gym',
      },
      {
        id: 'feat_analytics',
        titleEn: 'Student Learning Analytics',
        titleAr: 'تحليلات التقدم الدراسي والإتقان',
        descEn: 'Transparent reporting of learning gains, concept mastery, and retention intervals without fake statistics.',
        descAr: 'تقارير شفافة لمعدلات الاستيعاب وإتقان المفاهيم وفترات التكرار المتباعد بدون أرقام مصطنعة.',
        iconName: 'BarChart3',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Normalized Gain', 'Concept Mastery', 'Transparent Data'],
        tagsAr: ['معدل التحصيل', 'إتقان المفاهيم', 'بيانات حقيقية'],
        targetView: 'analytics',
      },
    ],
  },
  {
    id: 'move_explore',
    numericOrder: 4,
    titleEn: 'Move & Explore',
    titleAr: 'الحركة والاستكشاف',
    shortExplanationEn: 'Spatial memory for room items, environmental hazard detection, and ambient sound radar.',
    shortExplanationAr: 'الذاكرة المكانية للمقتنيات داخل الغرف، كشف العوائق بنبضات الاهتزاز، ورادار الأصوات المحيطة.',
    detailedPurposeEn: 'Supports physical orientation and independent room mobility with qualitative directional hints and zero metric distance hallucination.',
    detailedPurposeAr: 'يدعم التوجه المكاني والاستقلالية في الحركة داخل الغرف والمباني مع توجيهات نوعية صادقة.',
    iconName: 'Compass',
    themeColor: '#1769AA',
    accentBg: 'rgba(23, 105, 170, 0.12)',
    features: [
      {
        id: 'feat_spatial_locator',
        titleEn: 'Spatial Memory & Item Locator',
        titleAr: 'الذاكرة المكانية واسترجاع المقتنيات',
        descEn: 'Remembers physical locations of keys, glasses, phone, and wallet in rooms with direction hints.',
        descAr: 'يتذكر مواقع المفاتيح والنظارة والمحفظة داخل الغرف مع إرشادات اتجاهية صوتية ونبضات لمسية.',
        iconName: 'Compass',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Room Landmarks', 'Directional Hints', 'Qualitative Distance'],
        tagsAr: ['معالم الغرفة', 'إرشادات اتجاهية', 'مسافات نوعية'],
        targetView: 'disability',
        targetTab: 'vision',
        targetTool: 'object',
        isPrimaryAction: true,
      },
      {
        id: 'feat_hazard_pulse',
        titleEn: 'Hazard Detection & Haptic Pulse Guidance',
        titleAr: 'تنبيه العوائق والتوجيه اللمسي (Haptic)',
        descEn: 'Classifies physical hazards (stairs, vehicles, drops, chairs) and emits haptic vibration pulses.',
        descAr: 'تصنيف العوائق الفيزيائية (سلالم، مركبات، حفر، كراسي) وإصدار اهتزازات لمسية فورية للأمان.',
        iconName: 'Sparkles',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Stairs Alert', 'Haptic Vibration', 'Danger Classification'],
        tagsAr: ['تنبيه السلالم', 'اهتزاز لمسي', 'تصنيف مستويات الخطر'],
        targetView: 'disability',
        targetTab: 'vision',
        targetTool: 'scene',
      },
      {
        id: 'feat_ambient_radar',
        titleEn: 'Ambient Sound Radar & Environmental Awareness',
        titleAr: 'رادار الأصوات المحيطة والوعي البيئي',
        descEn: 'Visualizes and alerts to sudden noises, sirens, alarms, and spoken calls in the surrounding environment.',
        descAr: 'رصد بصري ولمسي للأصوات المفاجئة، أجهزة الإنذار، وأبواق السيارات لتأمين الصم وضعاف السمع.',
        iconName: 'Radio',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Siren Detection', 'Visual Direction', 'Vibration Alert'],
        tagsAr: ['كشف الإنذار', 'توجيه بصري للأصوات', 'تنبيه اهتزازي'],
        targetView: 'toolkit',
        targetTab: 'radar',
      },
    ],
  },
  {
    id: 'communicate',
    numericOrder: 5,
    titleEn: 'Communicate (Hear & Express)',
    titleAr: 'التواصل والتعبير (السمع والتعبير)',
    shortExplanationEn: 'Live speech captions, AAC boards, text-to-speech, quick responses, visual alerts, and sign language.',
    shortExplanationAr: 'التفريغ الفوري للكلام، لوحات التواصل البديل (AAC)، تحويل النص لكلام، وتنبيهات بصرية واهتزازية.',
    detailedPurposeEn: 'Provides a unified multi-sensory communication suite for deaf, hard of hearing, non-speaking, and blind users alike.',
    detailedPurposeAr: 'منظومة تواصل متكاملة تدعم الصم وضعاف السمع وغير الناطقين عبر وسائل مرئية وصوتية ولمسية متناسقة.',
    iconName: 'MessageSquare',
    themeColor: '#1769AA',
    accentBg: 'rgba(23, 105, 170, 0.12)',
    features: [
      {
        id: 'feat_hear_express',
        titleEn: 'Hear & Express Communication Center',
        titleAr: 'مركز السمع والتعبير المتكامل',
        descEn: 'Live captions, quick spoken phrases, AAC express boards, and visual/vibration alert beacons.',
        descAr: 'تفريغ فوري للكلام، عبارات نطق سريعة، لوحات تواصل رمزي (AAC)، ومنارة التنبيه البصري والاهتزازي.',
        iconName: 'Ear',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Live Captions', 'AAC Boards', 'Visual Flash', 'Quick Speech'],
        tagsAr: ['تفريغ مباشر', 'لوحات AAC', 'فلاش بصري', 'نطق سريع'],
        targetView: 'hear_express',
        isPrimaryAction: true,
      },
      {
        id: 'feat_live_captions',
        titleEn: 'Live Speech-to-Text Captions',
        titleAr: 'التفريغ الفوري للكلام (STT)',
        descEn: 'Real-time captions for lectures, meetings, and conversation with adjustable font scaling and high contrast.',
        descAr: 'تحويل الكلام المنطوق في المحاضرات والمحادثات إلى نصوص فورية متباينة مع تكبير الخط.',
        iconName: 'Mic',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Live Transcribe', 'Font Scaling', 'High Contrast'],
        tagsAr: ['تفريغ مباشر', 'تكبير الخط', 'تباين عالي'],
        targetView: 'hear_express',
        targetTab: 'captions',
      },
      {
        id: 'feat_aac_boards',
        titleEn: 'Accessible AAC Communication Board',
        titleAr: 'لوحات التواصل البديل والمعزز (AAC)',
        descEn: 'Configurable word and symbol tiles for non-speaking users (Daily Needs, Emotions, Medical, Study, Social).',
        descAr: 'لوحات رموز وكلمات قابلة للنطق الفوري للأشخاص غير الناطقين (احتياجات، مشاعر، طوارئ، دراسة، تحية).',
        iconName: 'Volume2',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Symbol Tiles', 'Sentence Builder', 'Instant Speech'],
        tagsAr: ['بطاقات الرموز', 'بناء الجمل', 'نطق فوري'],
        targetView: 'hear_express',
        targetTab: 'aac',
      },
      {
        id: 'feat_two_way_bridge',
        titleEn: 'Two-Way Communication Bridge',
        titleAr: 'جسر التواصل التبادلي (بين الصم والسامعين)',
        descEn: 'Split-screen interface allowing a deaf person to type and speak, while hearing person speaks into captions.',
        descAr: 'واجهة مزدوجة تتيح للأصم الكتابة والنطق بصوت، بينما يتحدث الطرف السامع لتتحول كلماته لنص مقروء.',
        iconName: 'MessageSquare',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Split Screen', 'Deaf-Hearing Bridge', 'Real-Time'],
        tagsAr: ['شاشة مزدوجة', 'جسر الصم والسامعين', 'فوري'],
        targetView: 'disability',
        targetTab: 'bridge',
      },
      {
        id: 'feat_egyptian_sign_avatar',
        titleEn: 'Egyptian Sign Language (ESL/ArSL) 3D Avatar',
        titleAr: 'استوديو لغة الإشارة المصرية (3D Avatar)',
        descEn: 'Foundational integration for Egyptian Sign Language using validated textbook vocabulary poses.',
        descAr: 'أساس تكاملي للغة الإشارة المصرية (ESL) يعتمد على القاموس الإشاري المعتمد والمجسم ثلاثي الأبعاد.',
        iconName: 'Sparkles',
        status: 'foundational',
        statusLabelEn: 'Foundational Integration',
        statusLabelAr: 'أساس تكاملي معتمد',
        tagsEn: ['Egyptian Sign Language', 'HamNoSys 3D', 'Curriculum Dataset'],
        tagsAr: ['لغة الإشارة المصرية', 'أفاتار 3D', 'قاموس معتمد'],
        targetView: 'disability',
        targetTab: 'deaf',
      },
    ],
  },
  {
    id: 'personalize',
    numericOrder: 6,
    titleEn: 'Personalize',
    titleAr: 'التخصيص والإعدادات',
    shortExplanationEn: 'Accessibility passport, privacy & security controls, student progress, and care circle.',
    shortExplanationAr: 'جواز التيسير، إعدادات الخصوصية والأمان، تقدم الطالب، وإدارة دائرة الرعاية والدعم.',
    detailedPurposeEn: 'A central privacy-first control hub where users customize speech, text size, contrast, language, and security settings.',
    detailedPurposeAr: 'مركز تحكم موحد يضمن الخصوصية ويتيح تخصيص الصوت والخطوط والتباين واللغات ومشاركة التقدم بأمان.',
    iconName: 'Settings',
    themeColor: '#1769AA',
    accentBg: 'rgba(23, 105, 170, 0.12)',
    features: [
      {
        id: 'feat_accessibility_passport',
        titleEn: 'Unified Accessibility Passport & Preferences',
        titleAr: 'جواز التيسير وإعدادات الوصول',
        descEn: 'Personalized accessibility adjustments (speech rate, voice, contrast, screen reader font scaling, haptics).',
        descAr: 'تخصيص شامل لتفضيلات الإتاحة (سرعة الصوت، التباين، حجم الخط، الاهتزاز اللمسي) وحفظها محلياً.',
        iconName: 'ShieldCheck',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Speech Rate', 'High Contrast', 'Passport Export'],
        tagsAr: ['سرعة الصوت', 'تباين فائق', 'تصدير الجواز'],
        targetView: 'settings',
        isPrimaryAction: true,
      },
      {
        id: 'feat_student_profile',
        titleEn: 'Student Progress & Identity Passport',
        titleAr: 'تقدمي التعليمي وجواز الهوية',
        descEn: 'Summary of completed study modules, learning streaks, earned badges, and assistive preferences.',
        descAr: 'سجل إنجاز الموديولات التعليمية، شارات الإتقان المكتسبة، وخطة التيسير الأكاديمية.',
        iconName: 'User',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Learning Streaks', 'Mastery Badges', 'Academic Plan'],
        tagsAr: ['استمرارية التعلم', 'شارات الإتقان', 'الخطة الأكاديمية'],
        targetView: 'profile',
      },
      {
        id: 'feat_privacy_security',
        titleEn: 'Privacy & Security Center',
        titleAr: 'الخصوصية وأمان البيانات',
        descEn: 'Zero-knowledge client encryption controls, data export, local cache clearing, and permission manager.',
        descAr: 'إدارة أذونات الكاميرا والميكروفون، تصدير البيانات، مسح السجلات محلياً، والتشفير الكامل للبيانات.',
        iconName: 'Shield',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Zero Knowledge', 'Audit Logs', 'Clear Cache'],
        tagsAr: ['تشفير تام', 'سجل الفحص', 'مسح الذاكرة المؤقتة'],
        targetView: 'privacy_security',
      },
      {
        id: 'feat_caregiver_support',
        titleEn: 'Caregiver Hub & Accessible Support',
        titleAr: 'دائرة الرعاية والدعم التيسيري',
        descEn: 'Consent-based caregiver linking and instant accessible technical support for assistive software.',
        descAr: 'ربط اختياري مع أولياء الأمور والمعلمين بموافقة صريحة، مع دعم فني ميسر لكافة الأدوات.',
        iconName: 'LifeBuoy',
        status: 'ready',
        statusLabelEn: 'Ready',
        statusLabelAr: 'جاهز للاستخدام',
        tagsEn: ['Consent Linking', 'Direct Support', 'Safety Circle'],
        tagsAr: ['ربط بموافقة', 'دعم مباشر', 'دائرة الأمان'],
        targetView: 'support',
      },
    ],
  },
];

/**
 * Helper: Find section by ID
 */
export function getProductSection(id: ProductSectionId): ProductSectionDefinition | undefined {
  return PRODUCT_SECTIONS.find((s) => s.id === id);
}

/**
 * Helper: Resolve icon component dynamically
 */
export function getSectionIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  switch (iconName) {
    case 'Eye': return Eye;
    case 'BookOpen': return BookOpen;
    case 'Briefcase': return Briefcase;
    case 'Compass': return Compass;
    case 'MessageSquare': return MessageSquare;
    case 'Settings': return Settings;
    case 'ScanLine': return ScanLine;
    case 'Banknote': return Banknote;
    case 'Palette': return Palette;
    case 'Users': return Users;
    case 'Headphones': return Headphones;
    case 'GraduationCap': return GraduationCap;
    case 'Sparkles': return Sparkles;
    case 'BarChart3': return BarChart3;
    case 'Calendar': return Calendar;
    case 'Brain': return Brain;
    case 'Radio': return Radio;
    case 'Ear': return Ear;
    case 'Mic': return Mic;
    case 'ShieldCheck': return ShieldCheck;
    case 'User': return User;
    case 'Shield': return Shield;
    case 'LifeBuoy': return LifeBuoy;
    case 'Volume2': return Volume2;
    case 'Mail': return Mail;
    case 'Presentation': return Presentation;
    case 'Table': return Table;
    case 'CheckSquare': return CheckSquare;
    case 'FileText': return FileText;
    default: return Sparkles;
  }
}
