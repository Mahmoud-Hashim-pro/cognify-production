/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi (رفيقي) — Phase 9: Work & Create Productivity Workspace
 * 
 * Accessible, production-ready productivity command center for blind and visually impaired users:
 * 1. Voice Document Creation (speech dictation, punctuation normalizer, headings/bullets/paragraphs, spoken feedback, replacement guards)
 * 2. Writing & Email Assistant (Formal MSA, Egyptian Ammiya, English, tone & length controls, review mode, zero unauthorized send)
 * 3. PowerPoint Creator (outline & topic parsing, speaker notes, accessible sequential slide review, verified .pptx download)
 * 4. Excel Assistant (spreadsheet summary, formula evaluation & explanation, cell safety guards, CSV/TSV/XML export)
 * 5. Chart Description Engine (grounded axes, trends, comparisons, and tabular equivalent with zero hallucination)
 * 6. Smart Form Assistant (field-by-field guidance, sensitive data protection, validation, and explicit confirmation)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Mic,
  MicOff,
  FileText,
  Mail,
  Presentation,
  Table,
  BarChart3,
  CheckSquare,
  ArrowLeft,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  ChevronLeft,
  Layers,
  Send,
  FileDown,
  ShieldCheck,
  Edit3,
  Eye,
  Menu,
} from 'lucide-react';
import { UserProfile } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { speak, cancelSpeech } from '../lib/tts';
import { toast } from './Toast';
import { Breadcrumbs } from './ui/Breadcrumbs';
import { downloadNativeDocx } from '../lib/docxExport';
import {
  VoiceBlockType,
  VoiceDocumentBlock,
  VoiceDocument,
  parseVoiceInputToCommand,
  verifyDocumentReplacementSafety,
  exportDocumentToMarkdown,
  exportDocumentToPlainText,
  WritingDialect,
  WritingTone,
  WritingLength,
  EmailAssistantInput,
  GeneratedEmailDraft,
  generateEmailDraft,
  EMAIL_SECURITY_DISCLAIMER_AR,
  EMAIL_SECURITY_DISCLAIMER_EN,
  SlideItem,
  PresentationModel,
  createPresentationFromTopic,
  createPresentationFromOutline,
  generatePptxBlob,
  exportPresentationToHtmlDeck,
  SpreadsheetModel,
  parseCsvOrTsv,
  generateSpreadsheetSummary,
  evaluateSpreadsheetFormula,
  verifyCellUpdateSafety,
  exportSpreadsheetToCsv,
  exportSpreadsheetToTsv,
  exportSpreadsheetToExcelXml,
  ChartType,
  ChartDataPoint,
  ChartModel,
  describeChartData,
  ChartAnalysisResult,
  FormFieldDefinition,
  FormSchema,
  ACCESSIBLE_FORM_TEMPLATES,
  validateFormValues,
  FORM_SECURITY_DISCLAIMER_AR,
  FORM_SECURITY_DISCLAIMER_EN,
} from '../lib/productivityEngine';

export type ProductivityToolId =
  | 'voice_doc'
  | 'writing_assistant'
  | 'powerpoint_creator'
  | 'excel_assistant'
  | 'chart_describer'
  | 'form_filler';

const VALID_PRODUCTIVITY_TOOLS: readonly ProductivityToolId[] = ['voice_doc', 'writing_assistant', 'powerpoint_creator', 'excel_assistant', 'chart_describer', 'form_filler'];


interface AccessibleProductivityWorkspaceViewProps {
  profile: UserProfile;
  onNavigateBack: () => void;
  onMenuClick?: () => void;
  initialTool?: ProductivityToolId;
  onOpenBookStudio?: (content?: string, title?: string) => void;
  isDarkMode?: boolean;
}

export default function AccessibleProductivityWorkspaceView({
  profile,
  onNavigateBack,
  onMenuClick,
  initialTool = 'voice_doc',
  onOpenBookStudio,
  isDarkMode = true,
}: AccessibleProductivityWorkspaceViewProps) {
  const isAr = isArabicLocale(profile.language);
  const langKey = isAr ? 'ar' : 'en';

  const [activeTool, setActiveTool] = useState<ProductivityToolId>(() =>
    VALID_PRODUCTIVITY_TOOLS.includes(initialTool) ? initialTool : 'voice_doc'
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. VOICE DOCUMENT STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [voiceDoc, setVoiceDoc] = useState<VoiceDocument>({
    id: 'doc_1',
    title: isAr ? 'مستند عمل ميسر جديد' : 'New Accessible Workspace Document',
    blocks: [
      {
        id: 'b1',
        type: 'heading1',
        text: isAr ? 'خطة العمل والمستهدفات الأسبوعية' : 'Weekly Project Action Plan',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'b2',
        type: 'paragraph',
        text: isAr
          ? 'تم إعداد هذا المستند باستخدام نظام الإملاء الميسر في منصة رفيقي لضمان أعلى درجات سهولة الوصول.'
          : 'Drafted using Rafiqi accessible dictation suite ensuring full non-visual navigation.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'b3',
        type: 'bullet',
        text: isAr ? 'مراجعة الملاحظات الأكاديمية وجدول الاختبارات' : 'Review academic milestones and exam dates',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'b4',
        type: 'bullet',
        text: isAr ? 'صياغة التقرير الإداري وإرساله للمشرف' : 'Draft summary report for department lead',
        createdAt: new Date().toISOString(),
      },
    ],
    language: isAr ? 'ar' : 'en',
    updatedAt: new Date().toISOString(),
  });

  const [dictationInput, setDictationInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showReplacementWarning, setShowReplacementWarning] = useState(false);
  const [pendingVoiceAction, setPendingVoiceAction] = useState<(() => void) | null>(null);
  const recognitionRef = useRef<any>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. WRITING & EMAIL ASSISTANT STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [emailInput, setEmailInput] = useState<EmailAssistantInput>({
    recipient: isAr ? 'أ.د. محمود هاشم' : 'Prof. Dr. Mahmoud Hashim',
    purpose: isAr ? 'طلب تمديد موعد تسليم المشروع البحثي' : 'Requesting extension for thesis assignment submission',
    keyPoints: isAr
      ? [
          'إنجاز 80% من التحليل التجريبي للبيانات',
          'الحاجة لثلاثة أيام إضافية لتدقيق الجداول البارزة',
          'التزام تام بتسليم المسودة النهائية يوم الخميس القادم',
        ]
      : [
          'Completed 80% of experimental data collection',
          'Require 3 extra days to finalize accessible figures',
          'Full commitment to submit final version next Thursday',
        ],
    deadlineOrNextStep: isAr ? 'يوم الخميس القادم الساعة الرابعة عصراً' : 'Next Thursday at 4:00 PM',
    tone: 'formal',
    dialect: isAr ? 'msa' : 'english',
    length: 'medium',
  });
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedEmailDraft>(() =>
    generateEmailDraft(emailInput)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. POWERPOINT CREATOR STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [presentationTopic, setPresentationTopic] = useState(
    isAr ? 'الذكاء الاصطناعي والتكنولوجيا المساعدة لذوي الإعاقة' : 'Assistive AI and Inclusive Technologies'
  );
  const [slideCount, setSlideCount] = useState(4);
  const [presentationModel, setPresentationModel] = useState<PresentationModel>(() =>
    createPresentationFromTopic(presentationTopic, 4, langKey)
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExportingPptx, setIsExportingPptx] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. EXCEL ASSISTANT STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const sampleCsvData = isAr
    ? `اسم المقرر,الدرجة,الساعات,المعدل المرجح
برمجة الويب,92,3,276
الذكاء الاصطناعي,88,4,352
تراكيب البيانات,95,3,285
نظم قواعد البيانات,90,3,270`
    : `Course Name,Grade,Credits,Weighted Score
Web Development,92,3,276
Artificial Intelligence,88,4,352
Data Structures,95,3,285
Database Systems,90,3,270`;

  const [spreadsheetModel, setSpreadsheetModel] = useState<SpreadsheetModel>(() =>
    parseCsvOrTsv(sampleCsvData, isAr ? 'سجل الدرجات والمقررات' : 'Grade & Course Registry')
  );
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 1 });
  const [cellEditValue, setCellEditValue] = useState('92');
  const [formulaInput, setFormulaInput] = useState('=AVERAGE(B1:B4)');
  const [evaluatedFormulaResult, setEvaluatedFormulaResult] = useState<ReturnType<
    typeof evaluateSpreadsheetFormula
  > | null>(() => evaluateSpreadsheetFormula('=AVERAGE(B1:B4)', spreadsheetModel));
  const [cellOverwriteWarning, setCellOverwriteWarning] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CHART DESCRIPTION STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [chartModel, setChartModel] = useState<ChartModel>({
    title: isAr ? 'تطور معدل التحصيل الدراسي عبر الفصول' : 'Academic Growth Across Semesters',
    chartType: 'column',
    xAxisTitle: isAr ? 'الفصل الدراسي' : 'Academic Semester',
    yAxisTitle: isAr ? 'نسبة الإنجاز %' : 'Achievement %',
    units: '%',
    dataPoints: [
      { label: isAr ? 'خريف 2024' : 'Fall 2024', value: 74 },
      { label: isAr ? 'ربيع 2025' : 'Spring 2025', value: 82 },
      { label: isAr ? 'خريف 2025' : 'Fall 2025', value: 89 },
      { label: isAr ? 'ربيع 2026' : 'Spring 2026', value: 95 },
    ],
  });

  const chartAnalysis = useMemo(() => describeChartData(chartModel), [chartModel]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. SMART FORM FILLING STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [selectedFormTemplate, setSelectedFormTemplate] = useState<FormSchema>(ACCESSIBLE_FORM_TEMPLATES[0]);
  const [formFieldValues, setFormFieldValues] = useState<Record<string, any>>({
    student_name: profile.name || '',
    student_id: '4201985',
    email: profile.email || 'student@university.edu.eg',
    accommodation_type: 'قارئ شاشة وبرامج ناطقة (Screen Reader)',
    notes: 'أفضل استخدام قارئ الشاشة مع لوحة مفاتيح ميسرة.',
    sensitive_national_id: '',
  });
  const [formValidationErrors, setFormValidationErrors] = useState<Record<string, string>>({});
  const [formIsSubmittedConfirmed, setFormIsSubmittedConfirmed] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // SPEECH & TTS HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const speakText = useCallback(
    (text: string) => {
      cancelSpeech();
      setIsSpeaking(true);
      speak(text, isAr ? 'ar-SA' : 'en-US', {
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [isAr]
  );

  const stopSpeaking = useCallback(() => {
    cancelSpeech();
    setIsSpeaking(false);
  }, []);

  const handleCopy = (text: string, key: string, labelAr: string, labelEn: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    toast.success(localize(profile.language, `Copied ${labelEn}`, `تم نسخ ${labelAr}`));
    speakText(isAr ? `تم نسخ ${labelAr}` : `Copied ${labelEn}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VOICE DICTATION HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleApplyVoiceInput = (rawText: string) => {
    if (!rawText.trim()) return;

    const parsed = parseVoiceInputToCommand(rawText, langKey);

    if (parsed.isClearRequest) {
      const safety = verifyDocumentReplacementSafety(voiceDoc, 0);
      if (safety.requiresConfirmation) {
        setPendingVoiceAction(() => () => {
          setVoiceDoc((prev) => ({
            ...prev,
            blocks: [],
            updatedAt: new Date().toISOString(),
          }));
          toast.info(localize(profile.language, 'Document cleared', 'تم تفريغ المستند'));
          speakText(isAr ? 'تم تفريغ المستند' : 'Document cleared');
        });
        setShowReplacementWarning(true);
        speakText(isAr ? safety.warningAr : safety.warningEn);
        return;
      }
    }

    const newBlock: VoiceDocumentBlock = {
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: parsed.blockType,
      text: parsed.text,
      createdAt: new Date().toISOString(),
    };

    setVoiceDoc((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
      updatedAt: new Date().toISOString(),
    }));

    setDictationInput('');
    toast.success(localize(profile.language, parsed.spokenFeedbackEn, parsed.spokenFeedbackAr));
    speakText(isAr ? parsed.spokenFeedbackAr : parsed.spokenFeedbackEn);
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        localize(
          profile.language,
          'Voice recognition not supported in this browser. Please use keyboard input.',
          'التعرف الصوتي غير مدعوم في هذا المتصفح. يرجى استخدام لوحة المفاتيح.'
        )
      );
      speakText(
        isAr
          ? 'المتصفح لا يدعم التسجيل الصوتي المباشر، يمكنك الكتابة في المربع.'
          : 'Voice recognition unavailable, please type in the text box.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = isAr ? 'ar-EG' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info(localize(profile.language, 'Listening...', 'جارٍ الاستماع لإملائك الصوتي...'));
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleApplyVoiceInput(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      toast.error(localize(profile.language, 'Microphone error', 'تعذر تشغيل الميكروفون'));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PPTX EXPORT HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDownloadPptx = async () => {
    setIsExportingPptx(true);
    try {
      const blob = await generatePptxBlob(presentationModel);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${presentationModel.title.replace(/[\s/\\?%*:|"<>]/g, '_')}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        localize(
          profile.language,
          'Downloaded genuine PowerPoint (.pptx) file',
          'تم تحميل ملف العرض التقديمي (.pptx) المعتمد بنجاح'
        )
      );
      speakText(
        isAr
          ? 'تم إنشاء وتحميل ملف العرض التقديمي باوربوينت بنجاح'
          : 'PowerPoint presentation successfully exported and downloaded'
      );
    } catch (err) {
      toast.error(localize(profile.language, 'Failed to export PPTX', 'فشل تصدير ملف PPTX'));
    } finally {
      setIsExportingPptx(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SPREADSHEET CELL UPDATE WITH CONFIRMATION GUARD
  // ─────────────────────────────────────────────────────────────────────────────
  const handleUpdateCell = (rIdx: number, cIdx: number, val: string | number) => {
    const existingVal = spreadsheetModel.rows[rIdx]?.[cIdx];
    const safety = verifyCellUpdateSafety(existingVal, val, false);

    if (!safety.safeToApplyDirectly && safety.warningAr) {
      setCellOverwriteWarning(isAr ? safety.warningAr : safety.warningEn || '');
      // Keep pending update
      return;
    }

    applyCellUpdate(rIdx, cIdx, val);
  };

  const applyCellUpdate = (rIdx: number, cIdx: number, val: string | number) => {
    const newRows = [...spreadsheetModel.rows.map((row) => [...row])];
    const num = Number(val);
    newRows[rIdx][cIdx] = !isNaN(num) && String(val).trim() !== '' ? num : val;

    const updatedModel = {
      ...spreadsheetModel,
      rows: newRows,
    };
    setSpreadsheetModel(updatedModel);
    setCellOverwriteWarning(null);

    // Re-evaluate current formula if any
    if (formulaInput) {
      setEvaluatedFormulaResult(evaluateSpreadsheetFormula(formulaInput, updatedModel));
    }

    toast.success(localize(profile.language, 'Cell updated', 'تم تحديث الخلية'));
    speakText(isAr ? `تم تحديث الخلية إلى ${val}` : `Cell updated to ${val}`);
  };

  // Tools definition
  const tools: Array<{ id: ProductivityToolId; titleAr: string; titleEn: string; icon: any }> = [
    { id: 'voice_doc', titleAr: 'مستندات صوتية', titleEn: 'Voice Docs', icon: Mic },
    { id: 'writing_assistant', titleAr: 'مساعد الصياغة والبريد', titleEn: 'Writing & Email', icon: Mail },
    { id: 'powerpoint_creator', titleAr: 'صانع عروض PPTX', titleEn: 'PowerPoint PPTX', icon: Presentation },
    { id: 'excel_assistant', titleAr: 'مساعد إكسل والبيانات', titleEn: 'Excel & Data', icon: Table },
    { id: 'chart_describer', titleAr: 'واصف المخططات', titleEn: 'Chart Describer', icon: BarChart3 },
    { id: 'form_filler', titleAr: 'مساعد النماذج', titleEn: 'Form Assistant', icon: CheckSquare },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isDarkMode ? 'bg-[#061A33] text-[#F8FAFC]' : 'bg-[#F5F9FD] text-[#061A33]'
      } font-sans selection:bg-[#1769AA]/30`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ── HEADER & NAVIGATION ── */}
      <header
        role="banner"
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#131E2E]/95 backdrop-blur-md border-b border-[#22354E] shadow-md"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateBack}
            aria-label={localize(profile.language, 'Back to Work & Create Section', 'الرجوع لقسم العمل والإبداع')}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#22354E] transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
          >
            <ArrowLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label={localize(profile.language, 'Open Main Menu', 'فتح القائمة الرئيسية')}
              className="lg:hidden min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#22354E] transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#4B9FE1] uppercase tracking-wider">
                {localize(profile.language, 'Section 3: Work & Create', 'القسم 3: العمل والإبداع')}
              </span>
              <span className="text-[#22354E]">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                {localize(profile.language, 'WCAG 2.2 AA Verified', 'معتمد لإمكانية الوصول')}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-[#F8FAFC]">
              {localize(
                profile.language,
                'Accessible Productivity Workspace & AI Assistant',
                'مساحة الإنتاجية ومساعد العمل والإبداع الذكي'
              )}
            </h1>
          </div>
        </div>

        {/* Global Sound Controls */}
        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <button
              type="button"
              onClick={stopSpeaking}
              aria-label={localize(profile.language, 'Stop Voice Reading', 'إيقاف النطق الصوتي')}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all flex items-center gap-2 text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-400"
            >
              <VolumeX className="w-4 h-4 animate-pulse" />
              <span>{localize(profile.language, 'Stop Audio', 'إيقاف الصوت')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const currentText =
                  activeTool === 'voice_doc'
                    ? exportDocumentToPlainText(voiceDoc)
                    : activeTool === 'writing_assistant'
                    ? generatedDraft.fullDraftText
                    : activeTool === 'powerpoint_creator'
                    ? `الشريحة ${currentSlideIndex + 1}: ${presentationModel.slides[currentSlideIndex]?.title}. ${presentationModel.slides[currentSlideIndex]?.bulletPoints.join('. ')}`
                    : activeTool === 'excel_assistant'
                    ? generateSpreadsheetSummary(spreadsheetModel).summaryTextAr
                    : activeTool === 'chart_describer'
                    ? chartAnalysis.fullAccessibleDescriptionAr
                    : selectedFormTemplate.descriptionAr;
                speakText(currentText);
              }}
              aria-label={localize(profile.language, 'Read Workspace Content Aloud', 'قراءة محتوى مساحة العمل بصوت واضح')}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1769AA]/20 text-[#4B9FE1] border border-[#1769AA]/40 hover:bg-[#1769AA]/30 transition-all flex items-center gap-2 text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">
                {localize(profile.language, 'Read Aloud', 'قراءة صوتية')}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* ── SUB-NAV: 6 ACCESSIBLE PRODUCTIVITY TABS ── */}
      <nav
        aria-label={localize(profile.language, 'Productivity Workspace Tools', 'أدوات مساحة الإنتاجية')}
        className="bg-[#0D4778]/20 border-b border-[#22354E] px-4 sm:px-6 py-2 overflow-x-auto custom-scrollbar scroll-fade-x"
      >
        <div className="flex items-center gap-2 min-w-max">
          {tools.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTool(t.id);
                  speakText(isAr ? t.titleAr : t.titleEn);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA] ${
                  isActive
                    ? 'bg-[#1769AA] text-white shadow-md'
                    : 'bg-[#131E2E] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1A283D] border border-[#22354E]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#4B9FE1]'}`} />
                <span>{localize(profile.language, t.titleEn, t.titleAr)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── MAIN CONTENT AREA ── */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ═════════════════════════════════════════════════════════════════════
            1. VOICE DOCUMENT CREATION TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'voice_doc' && (
          <section
            aria-label={localize(profile.language, 'Voice Document Creation', 'إنشاء المستندات الصوتية')}
            className="space-y-6"
          >
            {/* Action Bar & Dictation Controls */}
            <div className="bg-[#131E2E] border border-[#22354E] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[#1769AA]" />
                    <span>{voiceDoc.title}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {localize(
                      profile.language,
                      'Dictate or type headings, paragraphs, bullet points, and numbers with real-time spoken feedback.',
                      'أملِ أو اكتب العناوين والفقرات والقوائم وعلامات الترقيم بالصوت مع تأكيد صوتي وحماية من الاستبدال.'
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA] ${
                      isListening
                        ? 'bg-red-600 text-white animate-pulse shadow-lg'
                        : 'bg-[#1769AA] hover:bg-[#0D4778] text-white shadow-md'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>
                      {isListening
                        ? localize(profile.language, 'Listening... Stop Mic', 'جارٍ الاستماع... إيقاف')
                        : localize(profile.language, 'Start Dictation', 'تشغيل الإملاء الصوتي')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      downloadNativeDocx({
                        title: voiceDoc.title,
                        summary: isAr
                          ? 'مستند مصاغ عبر مساحة الإنتاجية الصوتية في رفيقي'
                          : 'Drafted via Rafiqi Voice Productivity Workspace',
                        fullText: exportDocumentToPlainText(voiceDoc),
                        lang: isAr ? 'ar' : 'en',
                      });
                      toast.success(localize(profile.language, 'Exported Word (.docx)', 'تم تصدير مستند Word (.docx)'));
                      speakText(isAr ? 'تم تصدير ملف الوورد بنجاح' : 'Exported Word document successfully');
                    }}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#22354E] text-xs font-bold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                  >
                    <Download className="w-4 h-4" />
                    <span>{localize(profile.language, 'Download .DOCX', 'تحميل Word')}</span>
                  </button>

                  {onOpenBookStudio && (
                    <button
                      type="button"
                      onClick={() => onOpenBookStudio(exportDocumentToPlainText(voiceDoc), voiceDoc.title)}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 text-[#F8FAFC] border border-[#22354E] text-xs font-bold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                    >
                      <Layers className="w-4 h-4 text-[#1769AA]" />
                      <span>{localize(profile.language, 'Book Studio', 'استوديو الكتب')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Typed / Voice Command Quick Box */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#22354E]">
                <input
                  type="text"
                  value={dictationInput}
                  onChange={(e) => setDictationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyVoiceInput(dictationInput);
                    }
                  }}
                  placeholder={
                    isAr
                      ? 'اكتب أو أملِ جملتك (مثال: "عنوان رئيسي ملخص الاجتماع" أو "نقطة جديدة مناقشة الميزانية")'
                      : 'Type or dictate (e.g. "Heading 1 Project Roadmap" or "New bullet Review budget")'
                  }
                  className="flex-1 min-h-[44px] px-4 py-2.5 bg-[#061A33] border border-[#22354E] rounded-xl text-sm text-[#F8FAFC] placeholder-[#64748B] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                />
                <button
                  type="button"
                  onClick={() => handleApplyVoiceInput(dictationInput)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                >
                  <Plus className="w-4 h-4" />
                  <span>{localize(profile.language, 'Add Block', 'إضافة للمستند')}</span>
                </button>
              </div>

              {/* Dictation Cheatsheet */}
              <div className="bg-[#1A283D]/60 p-3 rounded-xl border border-[#22354E] text-xs text-[#94A3B8] flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-bold text-[#F8FAFC]">{localize(profile.language, 'Voice Commands:', 'أوامر صوتية سريعة:')}</span>
                <span>{isAr ? '• "عنوان رئيسي [النص]"' : '• "Heading 1 [Text]"'}</span>
                <span>{isAr ? '• "عنوان فرعي [النص]"' : '• "Heading 2 [Text]"'}</span>
                <span>{isAr ? '• "نقطة جديدة [النص]"' : '• "Bullet [Text]"'}</span>
                <span>{isAr ? '• "قائمة مرقمة [النص]"' : '• "Numbered list [Text]"'}</span>
                <span>{isAr ? '• "علامة استفهام"، "نقطة"، "فاصلة"' : '• "Question mark", "Period", "Comma"'}</span>
              </div>
            </div>

            {/* Document Blocks Transcript */}
            <div className="bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#22354E]">
                <span className="text-xs font-bold text-[#94A3B8] uppercase">
                  {localize(
                    profile.language,
                    `Document Content (${voiceDoc.blocks.length} blocks)`,
                    `محتوى المستند (${voiceDoc.blocks.length} فقرات وعناصر)`
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        exportDocumentToMarkdown(voiceDoc),
                        'doc_md',
                        'المستند كـ Markdown',
                        'Document as Markdown'
                      )
                    }
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#1A283D] hover:bg-[#1769AA]/20 text-[#4B9FE1] text-xs font-semibold border border-[#22354E] flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
                  >
                    {copiedKey === 'doc_md' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{localize(profile.language, 'Copy Markdown', 'نسخ Markdown')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const safety = verifyDocumentReplacementSafety(voiceDoc, 0);
                      if (safety.requiresConfirmation) {
                        setPendingVoiceAction(() => () => {
                          setVoiceDoc((prev) => ({ ...prev, blocks: [] }));
                          toast.info(localize(profile.language, 'Document cleared', 'تم تفريغ المستند'));
                        });
                        setShowReplacementWarning(true);
                      } else {
                        setVoiceDoc((prev) => ({ ...prev, blocks: [] }));
                      }
                    }}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{localize(profile.language, 'Clear All', 'مسح الكل')}</span>
                  </button>
                </div>
              </div>

              {voiceDoc.blocks.length === 0 ? (
                <div className="text-center py-12 text-[#94A3B8] space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-[#22354E]" />
                  <p className="font-semibold text-sm">
                    {localize(profile.language, 'Document is empty. Dictate or type above.', 'المستند فارغ حالياً. أملِ أو اكتب أعلاه لبدء العمل.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3" role="feed" aria-label={localize(profile.language, 'Document blocks', 'فقرات المستند')}>
                  {voiceDoc.blocks.map((block, idx) => (
                    <article
                      key={block.id}
                      className="p-4 rounded-xl bg-[#061A33] border border-[#22354E] flex items-start justify-between gap-4 group hover:border-[#1769AA]/50 transition-all"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#1A283D] text-[#4B9FE1] border border-[#22354E]">
                            {block.type}
                          </span>
                          <span className="text-[10px] text-[#64748B]">#{idx + 1}</span>
                        </div>
                        {block.type === 'heading1' && (
                          <h3 className="text-xl font-black text-[#F8FAFC] tracking-tight">{block.text}</h3>
                        )}
                        {block.type === 'heading2' && (
                          <h4 className="text-lg font-bold text-[#4B9FE1]">{block.text}</h4>
                        )}
                        {block.type === 'bullet' && (
                          <p className="text-sm text-[#F8FAFC] flex items-start gap-2">
                            <span className="text-[#1769AA] font-bold">•</span>
                            <span>{block.text}</span>
                          </p>
                        )}
                        {block.type === 'numbered' && (
                          <p className="text-sm text-[#F8FAFC] flex items-start gap-2">
                            <span className="text-[#1769AA] font-bold">{idx + 1}.</span>
                            <span>{block.text}</span>
                          </p>
                        )}
                        {block.type === 'paragraph' && (
                          <p className="text-sm text-[#CBD5E1] leading-relaxed">{block.text}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => speakText(block.text)}
                          aria-label={localize(profile.language, `Read block ${idx + 1}`, `استمع للفقرة ${idx + 1}`)}
                          className="min-h-[36px] min-w-[36px] p-2 rounded-lg bg-[#1A283D] text-[#4B9FE1] hover:bg-[#1769AA]/20 transition-all cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVoiceDoc((prev) => ({
                              ...prev,
                              blocks: prev.blocks.filter((b) => b.id !== block.id),
                            }));
                            speakText(isAr ? 'تم حذف العنصر' : 'Block removed');
                          }}
                          aria-label={localize(profile.language, `Delete block ${idx + 1}`, `حذف الفقرة ${idx + 1}`)}
                          className="min-h-[36px] min-w-[36px] p-2 rounded-lg bg-[#1A283D] text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            2. WRITING & EMAIL ASSISTANT TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'writing_assistant' && (
          <section
            aria-label={localize(profile.language, 'Writing and Email Assistant', 'مساعد الصياغة والبريد الإلكتروني')}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Form Inputs (Left / Top) */}
            <div className="lg:col-span-5 bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg space-y-4">
              <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#1769AA]" />
                <span>{localize(profile.language, 'Draft Parameters & Controls', 'إعدادات الصياغة وضبط النبرة')}</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1">
                    {localize(profile.language, 'Recipient Name / Title', 'اسم أو صفة المستلم')}
                  </label>
                  <input
                    type="text"
                    value={emailInput.recipient}
                    onChange={(e) => setEmailInput({ ...emailInput, recipient: e.target.value })}
                    aria-label={localize(profile.language, 'Recipient Name / Title', 'اسم أو صفة المستلم')}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#061A33] border border-[#22354E] text-[#F8FAFC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1">
                    {localize(profile.language, 'Core Purpose / Subject', 'الغرض الرئيسي من الرسالة')}
                  </label>
                  <input
                    type="text"
                    value={emailInput.purpose}
                    onChange={(e) => setEmailInput({ ...emailInput, purpose: e.target.value })}
                    aria-label={localize(profile.language, 'Core Purpose / Subject', 'الغرض الرئيسي من الرسالة')}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#061A33] border border-[#22354E] text-[#F8FAFC]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1">
                      {localize(profile.language, 'Dialect / Lang', 'اللغة / اللهجة')}
                    </label>
                    <select
                      value={emailInput.dialect}
                      onChange={(e) => setEmailInput({ ...emailInput, dialect: e.target.value as WritingDialect })}
                      className="w-full min-h-[44px] px-2 py-2 rounded-xl bg-[#061A33] border border-[#22354E] text-[#F8FAFC]"
                    >
                      <option value="msa">{isAr ? 'فصحى معتمدة' : 'Formal MSA'}</option>
                      <option value="egyptian">{isAr ? 'عامية مصرية' : 'Egyptian Ammiya'}</option>
                      <option value="english">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1">
                      {localize(profile.language, 'Tone', 'النبرة والأسلوب')}
                    </label>
                    <select
                      value={emailInput.tone}
                      onChange={(e) => setEmailInput({ ...emailInput, tone: e.target.value as WritingTone })}
                      className="w-full min-h-[44px] px-2 py-2 rounded-xl bg-[#061A33] border border-[#22354E] text-[#F8FAFC]"
                    >
                      <option value="formal">{isAr ? 'رسمي' : 'Formal'}</option>
                      <option value="academic">{isAr ? 'أكاديمي' : 'Academic'}</option>
                      <option value="friendly">{isAr ? 'ودي' : 'Friendly'}</option>
                      <option value="concise">{isAr ? 'موجز' : 'Concise'}</option>
                      <option value="empathetic">{isAr ? 'متعاطف' : 'Empathetic'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#94A3B8] mb-1">
                      {localize(profile.language, 'Length', 'الحجم')}
                    </label>
                    <select
                      value={emailInput.length}
                      onChange={(e) => setEmailInput({ ...emailInput, length: e.target.value as WritingLength })}
                      className="w-full min-h-[44px] px-2 py-2 rounded-xl bg-[#061A33] border border-[#22354E] text-[#F8FAFC]"
                    >
                      <option value="short">{isAr ? 'قصير' : 'Short'}</option>
                      <option value="medium">{isAr ? 'متوسط' : 'Medium'}</option>
                      <option value="detailed">{isAr ? 'مفصل' : 'Detailed'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1">
                    {localize(profile.language, 'Key Talking Points (1 per line)', 'النقاط الرئيسية (نقطة لكل سطر)')}
                  </label>
                  <textarea
                    rows={4}
                    value={emailInput.keyPoints.join('\n')}
                    onChange={(e) =>
                      setEmailInput({
                        ...emailInput,
                        keyPoints: e.target.value.split('\n').filter(Boolean),
                      })
                    }
                    className="w-full p-3 rounded-xl bg-[#061A33] border border-[#22354E] text-[#F8FAFC] leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#94A3B8] mb-1">
                    {localize(profile.language, 'Deadline or Desired Action', 'الموعد النهائي أو الإجراء المطلوب')}
                  </label>
                  <input
                    type="text"
                    value={emailInput.deadlineOrNextStep || ''}
                    onChange={(e) => setEmailInput({ ...emailInput, deadlineOrNextStep: e.target.value })}
                    aria-label={localize(profile.language, 'Deadline or Desired Action', 'الموعد النهائي أو الإجراء المطلوب')}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#061A33] border border-[#22354E] text-[#F8FAFC]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const draft = generateEmailDraft(emailInput);
                    setGeneratedDraft(draft);
                    toast.success(localize(profile.language, 'Generated new draft', 'تم إنشاء المسودة الجديدة'));
                    speakText(isAr ? 'تم إنشاء المسودة الجديدة بنجاح' : 'New draft generated successfully');
                  }}
                  className="w-full min-h-[44px] py-3 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{localize(profile.language, 'Generate / Refresh Draft', 'توليد المسودة الميسرة')}</span>
                </button>
              </div>
            </div>

            {/* Generated Review Area (Right / Bottom) */}
            <div className="lg:col-span-7 bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#22354E]">
                  <div>
                    <h3 className="text-base font-bold text-[#F8FAFC]">
                      {localize(profile.language, 'Generated Draft Review', 'مراجعة المسودة الكاملة')}
                    </h3>
                    <span className="text-xs text-[#94A3B8]">
                      {generatedDraft.wordCount} {localize(profile.language, 'words', 'كلمة')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => speakText(generatedDraft.fullDraftText)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#1A283D] text-[#4B9FE1] hover:bg-[#1769AA]/20 text-xs font-bold border border-[#22354E] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{localize(profile.language, 'Listen', 'استماع')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          generatedDraft.fullDraftText,
                          'email_draft',
                          'مسودة البريد',
                          'Email Draft'
                        )
                      }
                      className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {copiedKey === 'email_draft' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{localize(profile.language, 'Copy Draft', 'نسخ المسودة')}</span>
                    </button>
                  </div>
                </div>

                {/* Draft Content Card */}
                <div className="p-4 rounded-xl bg-[#061A33] border border-[#22354E] space-y-3 font-mono text-sm text-[#F8FAFC] leading-relaxed whitespace-pre-wrap select-all">
                  {generatedDraft.fullDraftText}
                </div>
              </div>

              {/* Strict Security Disclaimer */}
              <div
                role="note"
                aria-label={localize(profile.language, 'Privacy notice', 'إشعار الخصوصية والأمان')}
                className="p-3.5 rounded-xl bg-[#1A283D] border border-[#22354E] text-xs text-[#94A3B8] flex items-start gap-2.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{generatedDraft.disclaimer}</p>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            3. POWERPOINT CREATOR TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'powerpoint_creator' && (
          <section
            aria-label={localize(profile.language, 'PowerPoint Presentation Creator', 'صانع العروض التقديمية')}
            className="space-y-6"
          >
            {/* Topic Input & Generation Bar */}
            <div className="bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Presentation className="w-5 h-5 text-[#1769AA]" />
                    <span>{localize(profile.language, 'Presentation Architect', 'مهندس العروض التقديمية الميسرة')}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {localize(
                      profile.language,
                      'Structured slides with titles, bullet points, speaker notes, and tested .pptx binary export.',
                      'شرائح منظمة تحتوي على عناوين ونقاط وملاحظات المتحدث وتصدير معتمد لملفات PowerPoint (.pptx).'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isExportingPptx}
                    onClick={handleDownloadPptx}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isExportingPptx
                        ? localize(profile.language, 'Building .PPTX...', 'جارٍ تجهيز PPTX...')
                        : localize(profile.language, 'Download .PPTX', 'تحميل ملف .PPTX')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const html = exportPresentationToHtmlDeck(presentationModel);
                      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${presentationModel.title.replace(/[\s/\\?%*:|"<>]/g, '_')}_accessible_deck.html`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success(localize(profile.language, 'Exported HTML Deck', 'تم تحميل العرض كصفحة ويب ميسرة'));
                    }}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#22354E] font-bold text-xs flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>{localize(profile.language, 'HTML Deck', 'صفحة HTML ميسرة')}</span>
                  </button>
                </div>
              </div>

              {/* Topic Formulation */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#22354E]">
                <input
                  type="text"
                  value={presentationTopic}
                  onChange={(e) => setPresentationTopic(e.target.value)}
                  placeholder={localize(profile.language, 'Presentation Topic...', 'عنوان أو موضوع العرض التقديمي...')}
                  className="flex-1 min-h-[44px] px-4 py-2 bg-[#061A33] border border-[#22354E] rounded-xl text-sm text-[#F8FAFC]"
                />
                <select
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="min-h-[44px] px-3 py-2 bg-[#061A33] border border-[#22354E] rounded-xl text-xs text-[#F8FAFC]"
                >
                  <option value={3}>{isAr ? '3 شرائح' : '3 Slides'}</option>
                  <option value={4}>{isAr ? '4 شرائح' : '4 Slides'}</option>
                  <option value={5}>{isAr ? '5 شرائح' : '5 Slides'}</option>
                  <option value={6}>{isAr ? '6 شرائح' : '6 Slides'}</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const pres = createPresentationFromTopic(presentationTopic, slideCount, langKey);
                    setPresentationModel(pres);
                    setCurrentSlideIndex(0);
                    toast.success(localize(profile.language, 'Created presentation slides', 'تم إنشاء شرائح العرض'));
                    speakText(isAr ? 'تم تجهيز شرائح العرض التقديمي' : 'Presentation slides prepared');
                  }}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{localize(profile.language, 'Build Presentation', 'توليد العرض')}</span>
                </button>
              </div>
            </div>

            {/* Screen Reader Sequential Slide Navigator */}
            <div className="bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#22354E]">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#4B9FE1]">
                    {localize(
                      profile.language,
                      `Slide ${currentSlideIndex + 1} of ${presentationModel.slides.length}`,
                      `الشريحة ${currentSlideIndex + 1} من إجمالي ${presentationModel.slides.length}`
                    )}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    ({presentationModel.slides[currentSlideIndex]?.layout || 'content'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentSlideIndex === 0}
                    onClick={() => {
                      const newIdx = Math.max(0, currentSlideIndex - 1);
                      setCurrentSlideIndex(newIdx);
                      speakText(
                        `الشريحة ${newIdx + 1}: ${presentationModel.slides[newIdx]?.title}`
                      );
                    }}
                    aria-label={localize(profile.language, 'Previous Slide', 'الشريحة السابقة')}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 disabled:opacity-40 text-[#4B9FE1] border border-[#22354E] flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
                  </button>

                  <button
                    type="button"
                    disabled={currentSlideIndex >= presentationModel.slides.length - 1}
                    onClick={() => {
                      const newIdx = Math.min(presentationModel.slides.length - 1, currentSlideIndex + 1);
                      setCurrentSlideIndex(newIdx);
                      speakText(
                        `الشريحة ${newIdx + 1}: ${presentationModel.slides[newIdx]?.title}`
                      );
                    }}
                    aria-label={localize(profile.language, 'Next Slide', 'الشريحة التالية')}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 disabled:opacity-40 text-[#4B9FE1] border border-[#22354E] flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Active Slide Presentation Canvas */}
              {presentationModel.slides[currentSlideIndex] && (
                <div
                  role="region"
                  aria-label={localize(
                    profile.language,
                    `Slide Content: ${presentationModel.slides[currentSlideIndex].title}`,
                    `محتوى الشريحة: ${presentationModel.slides[currentSlideIndex].title}`
                  )}
                  className="p-6 rounded-2xl bg-[#061A33] border-2 border-[#1769AA]/60 space-y-4 shadow-xl"
                >
                  <h3 className="text-xl sm:text-2xl font-black text-[#F8FAFC] pb-2 border-b border-[#22354E]">
                    {presentationModel.slides[currentSlideIndex].title}
                  </h3>

                  <ul className="space-y-2 py-2">
                    {presentationModel.slides[currentSlideIndex].bulletPoints.map((pt, pIdx) => (
                      <li key={pIdx} className="text-sm sm:text-base text-[#CBD5E1] flex items-start gap-2.5 leading-relaxed">
                        <span className="text-[#1769AA] font-bold text-lg leading-none mt-1">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Speaker Notes Box */}
                  <div
                    role="note"
                    aria-label={localize(profile.language, 'Speaker Notes', 'ملاحظات المتحدث')}
                    className="p-4 rounded-xl bg-[#1A283D] border-s-4 border-[#E5A93C] text-xs text-[#CBD5E1] space-y-1"
                  >
                    <strong className="block text-[#F8FAFC]">
                      {localize(profile.language, 'Speaker Notes & Screen Reader Guide:', 'ملاحظات المتحدث ودليل قارئ الشاشة:')}
                    </strong>
                    <p className="leading-relaxed">{presentationModel.slides[currentSlideIndex].speakerNotes}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            4. EXCEL ASSISTANT & SPREADSHEET ENGINE TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'excel_assistant' && (
          <section
            aria-label={localize(profile.language, 'Excel and Spreadsheet Assistant', 'مساعد الجداول وصيغ إكسل')}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Table className="w-5 h-5 text-[#1769AA]" />
                    <span>{spreadsheetModel.name}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {localize(
                      profile.language,
                      `Dimensions: ${spreadsheetModel.totalColumns} Columns × ${spreadsheetModel.totalRows} Rows (${spreadsheetModel.totalRows * spreadsheetModel.totalColumns} Cells)`,
                      `الأبعاد: ${spreadsheetModel.totalColumns} أعمدة × ${spreadsheetModel.totalRows} صفوف (${spreadsheetModel.totalRows * spreadsheetModel.totalColumns} خلية)`
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sum = generateSpreadsheetSummary(spreadsheetModel);
                      speakText(isAr ? sum.summaryTextAr : sum.summaryTextEn);
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#22354E] text-xs font-bold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{localize(profile.language, 'Verbalize Summary', 'استماع للتحليل الإحصائي')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const csv = exportSpreadsheetToCsv(spreadsheetModel);
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${spreadsheetModel.name.replace(/[\s/\\?%*:|"<>]/g, '_')}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success(localize(profile.language, 'Downloaded .CSV file', 'تم تحميل ملف CSV المعتمد'));
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                  >
                    <Download className="w-4 h-4" />
                    <span>{localize(profile.language, 'Download .CSV', 'تحميل CSV')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const xml = exportSpreadsheetToExcelXml(spreadsheetModel);
                      const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${spreadsheetModel.name.replace(/[\s/\\?%*:|"<>]/g, '_')}.xml`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success(localize(profile.language, 'Downloaded Excel XML file', 'تم تحميل ملف Excel XML'));
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#22354E] text-xs font-bold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>{localize(profile.language, 'Excel XML', 'ملف Excel')}</span>
                  </button>
                </div>
              </div>

              {/* Formula Evaluator Bar */}
              <div className="p-4 rounded-xl bg-[#061A33] border border-[#22354E] space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={formulaInput}
                    onChange={(e) => setFormulaInput(e.target.value)}
                    placeholder="=SUM(B1:B4) or =AVERAGE(B1:B4)"
                    className="flex-1 min-h-[44px] px-4 py-2 font-mono text-sm bg-[#131E2E] border border-[#22354E] rounded-xl text-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const res = evaluateSpreadsheetFormula(formulaInput, spreadsheetModel);
                      setEvaluatedFormulaResult(res);
                      toast.success(localize(profile.language, `Result: ${res.result}`, `النتيجة: ${res.result}`));
                      speakText(isAr ? res.explanationAr : res.explanationEn);
                    }}
                    className="min-h-[44px] px-5 py-2 bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{localize(profile.language, 'Evaluate & Explain', 'حساب وشرح الصيغة')}</span>
                  </button>
                </div>

                {evaluatedFormulaResult && (
                  <div
                    role="status"
                    className="p-3 rounded-lg bg-[#1A283D] border border-[#22354E] text-xs text-[#CBD5E1] space-y-1"
                  >
                    <div className="flex items-center gap-2 font-bold text-[#F8FAFC]">
                      <span>{localize(profile.language, 'Formula Result:', 'ناتج المعادلة:')}</span>
                      <span className="text-base text-emerald-400 font-mono">
                        {String(evaluatedFormulaResult.result)}
                      </span>
                    </div>
                    <p className="leading-relaxed">
                      {isAr ? evaluatedFormulaResult.explanationAr : evaluatedFormulaResult.explanationEn}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Overwrite Safety Alert Modal / Banner */}
            {cellOverwriteWarning && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">{cellOverwriteWarning}</p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => applyCellUpdate(selectedCell.row, selectedCell.col, cellEditValue)}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm"
                  >
                    {localize(profile.language, 'Confirm Overwrite', 'تأكيد الاستبدال')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellOverwriteWarning(null)}
                    className="px-3 py-1.5 rounded-lg bg-[#131E2E] text-[#94A3B8] hover:text-white text-xs cursor-pointer"
                  >
                    {localize(profile.language, 'Cancel', 'إلغاء')}
                  </button>
                </div>
              </div>
            )}

            {/* Accessible Interactive Table */}
            <div className="bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg overflow-x-auto custom-scrollbar">
              <table
                className="w-full text-start border-collapse text-xs"
                aria-label={spreadsheetModel.name}
              >
                <thead>
                  <tr className="border-b border-[#22354E] text-[#94A3B8]">
                    <th scope="col" className="p-3 text-center w-12 font-bold">#</th>
                    {spreadsheetModel.headers.map((h, cIdx) => (
                      <th scope="col" key={cIdx} className="p-3 font-bold text-start text-[#F8FAFC]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spreadsheetModel.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="border-b border-[#22354E]/50 hover:bg-[#1A283D]/60 transition-colors"
                    >
                      <th scope="row" className="p-3 text-center font-bold text-[#64748B]">
                        {rIdx + 1}
                      </th>
                      {row.map((cell, cIdx) => {
                        const isSelected = selectedCell.row === rIdx && selectedCell.col === cIdx;
                        return (
                          <td
                            key={cIdx}
                            tabIndex={0}
                            onClick={() => {
                              setSelectedCell({ row: rIdx, col: cIdx });
                              setCellEditValue(String(cell));
                              speakText(
                                isAr
                                  ? `${spreadsheetModel.headers[cIdx]}، الصف ${rIdx + 1}: ${cell}`
                                  : `${spreadsheetModel.headers[cIdx]}, Row ${rIdx + 1}: ${cell}`
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setSelectedCell({ row: rIdx, col: cIdx });
                                setCellEditValue(String(cell));
                              }
                            }}
                            aria-selected={isSelected}
                            className={`p-3 cursor-pointer font-mono transition-all rounded ${
                              isSelected
                                ? 'bg-[#1769AA]/30 text-white ring-2 ring-[#1769AA] font-bold'
                                : 'text-[#CBD5E1]'
                            }`}
                          >
                            {String(cell)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cell Editor Bar */}
              <div className="mt-4 pt-4 border-t border-[#22354E] flex flex-col sm:flex-row items-center gap-3">
                <span className="text-xs font-bold text-[#4B9FE1] min-w-[120px]">
                  {spreadsheetModel.headers[selectedCell.col]} ({localize(profile.language, `Row ${selectedCell.row + 1}`, `الصف ${selectedCell.row + 1}`)}):
                </span>
                <input
                  type="text"
                  value={cellEditValue}
                  onChange={(e) => setCellEditValue(e.target.value)}
                  aria-label={localize(profile.language, 'Edit selected cell value', 'تعديل قيمة الخلية المحددة')}
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#061A33] border border-[#22354E] text-sm text-[#F8FAFC] font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateCell(selectedCell.row, selectedCell.col, cellEditValue)}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold cursor-pointer"
                >
                  {localize(profile.language, 'Save Cell Value', 'تحديث الخلية')}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            5. CHART DESCRIPTION ENGINE TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'chart_describer' && (
          <section
            aria-label={localize(profile.language, 'Chart and Visual Description', 'واصف الرسوم البيانية')}
            className="space-y-6"
          >
            <div className="bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#1769AA]" />
                    <span>{chartAnalysis.title}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {isAr ? chartAnalysis.chartTypeDescriptionAr : chartAnalysis.chartTypeDescriptionEn}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      speakText(
                        isAr
                          ? chartAnalysis.fullAccessibleDescriptionAr
                          : chartAnalysis.fullAccessibleDescriptionEn
                      )
                    }
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{localize(profile.language, 'Read Complete Description', 'قراءة الوصف الشامل بصوت واضح')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        isAr
                          ? chartAnalysis.fullAccessibleDescriptionAr
                          : chartAnalysis.fullAccessibleDescriptionEn,
                        'chart_desc',
                        'وصف المخطط',
                        'Chart Description'
                      )
                    }
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#1A283D] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#22354E] text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    {copiedKey === 'chart_desc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{localize(profile.language, 'Copy Text', 'نسخ الوصف')}</span>
                  </button>
                </div>
              </div>

              {/* Grounded Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#22354E]">
                <div className="p-3.5 rounded-xl bg-[#061A33] border border-[#22354E]">
                  <span className="block text-[11px] font-bold text-[#94A3B8]">
                    {localize(profile.language, 'Total Sum', 'المجموع الكلي')}
                  </span>
                  <span className="text-lg font-black text-[#F8FAFC]">
                    {chartAnalysis.comparisons.total} {chartModel.units || ''}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#061A33] border border-[#22354E]">
                  <span className="block text-[11px] font-bold text-[#94A3B8]">
                    {localize(profile.language, 'Arithmetic Average', 'المتوسط الحسابي')}
                  </span>
                  <span className="text-lg font-black text-[#4B9FE1]">
                    {chartAnalysis.comparisons.average} {chartModel.units || ''}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#061A33] border border-[#22354E]">
                  <span className="block text-[11px] font-bold text-[#94A3B8]">
                    {localize(profile.language, 'Peak Observation', 'أعلى قيمة مسجلة')}
                  </span>
                  <span className="text-lg font-black text-emerald-400">
                    {chartAnalysis.comparisons.highest.value} ({chartAnalysis.comparisons.highest.label})
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#061A33] border border-[#22354E]">
                  <span className="block text-[11px] font-bold text-[#94A3B8]">
                    {localize(profile.language, 'Lowest Observation', 'أدنى قيمة مسجلة')}
                  </span>
                  <span className="text-lg font-black text-amber-400">
                    {chartAnalysis.comparisons.lowest.value} ({chartAnalysis.comparisons.lowest.label})
                  </span>
                </div>
              </div>
            </div>

            {/* Structured Text Equivalent Table */}
            <div className="bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-[#F8FAFC] pb-2 border-b border-[#22354E]">
                {localize(profile.language, 'Structured Tabular Equivalent', 'الجدول البديل الكامل للمخطط البياني')}
              </h3>

              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#22354E] text-[#94A3B8]">
                    <th scope="col" className="p-3 text-start font-bold">
                      {chartModel.xAxisTitle || localize(profile.language, 'Category', 'الفئة')}
                    </th>
                    <th scope="col" className="p-3 text-start font-bold">
                      {chartModel.yAxisTitle || localize(profile.language, 'Value', 'القيمة')}
                    </th>
                    <th scope="col" className="p-3 text-start font-bold">
                      {localize(profile.language, 'Relative Share', 'النسبة من الإجمالي')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chartAnalysis.tabularEquivalent.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#22354E]/40 hover:bg-[#1A283D]/50">
                      <td className="p-3 font-semibold text-[#F8FAFC]">{row.label}</td>
                      <td className="p-3 font-mono font-bold text-[#4B9FE1]">
                        {row.value} {chartModel.units || ''}
                      </td>
                      <td className="p-3 font-mono text-emerald-400">{row.percentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Disclosures & Limitations */}
              <div className="p-3.5 rounded-xl bg-[#061A33] border border-[#22354E] text-xs text-[#94A3B8] space-y-1">
                <span className="font-bold text-[#F8FAFC]">
                  {localize(profile.language, 'Grounding & Integrity Disclosure:', 'إقرار الشفافية ومنع الهلوسة:')}
                </span>
                <p className="leading-relaxed">
                  {isAr ? chartAnalysis.limitationsAr.join(' ') : chartAnalysis.limitationsEn.join(' ')}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            6. SMART FORM FILLING TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'form_filler' && (
          <section
            aria-label={localize(profile.language, 'Smart Form Assistant', 'مساعد النماذج والاستمارات الذكي')}
            className="space-y-6"
          >
            <div className="bg-[#131E2E] border border-[#22354E] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-[#1769AA]" />
                    <span>{isAr ? selectedFormTemplate.titleAr : selectedFormTemplate.titleEn}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {isAr ? selectedFormTemplate.descriptionAr : selectedFormTemplate.descriptionEn}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedFormTemplate.id}
                    onChange={(e) => {
                      const t = ACCESSIBLE_FORM_TEMPLATES.find((tpl) => tpl.id === e.target.value);
                      if (t) {
                        setSelectedFormTemplate(t);
                        setFormIsSubmittedConfirmed(false);
                      }
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#061A33] border border-[#22354E] text-xs text-[#F8FAFC]"
                  >
                    {ACCESSIBLE_FORM_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {isAr ? tpl.titleAr : tpl.titleEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Fields Guided Walkthrough */}
              <div className="space-y-4 pt-4 border-t border-[#22354E]">
                {selectedFormTemplate.fields.map((field) => {
                  const error = formValidationErrors[field.id];
                  return (
                    <div
                      key={field.id}
                      className="p-4 rounded-xl bg-[#061A33] border border-[#22354E] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`field_${field.id}`}
                          className="font-bold text-xs sm:text-sm text-[#F8FAFC] flex items-center gap-2"
                        >
                          <span>{isAr ? field.labelAr : field.labelEn}</span>
                          {field.required ? (
                            <span className="text-red-400 text-xs font-bold">
                              *{localize(profile.language, 'Required', 'إلزامي')}
                            </span>
                          ) : (
                            <span className="text-[#64748B] text-xs">
                              ({localize(profile.language, 'Optional', 'اختياري')})
                            </span>
                          )}
                        </label>

                        {field.isSensitive && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {localize(profile.language, 'Sensitive Field (Manual Only)', 'بيانات حساسة (إدخال يدوي حصراً)')}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#94A3B8]">
                        {isAr ? field.explanationAr : field.explanationEn}
                      </p>

                      {field.type === 'select' ? (
                        <select
                          id={`field_${field.id}`}
                          value={formFieldValues[field.id] || ''}
                          onChange={(e) =>
                            setFormFieldValues({ ...formFieldValues, [field.id]: e.target.value })
                          }
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#131E2E] border border-[#22354E] text-xs text-[#F8FAFC]"
                        >
                          <option value="">{localize(profile.language, 'Select option...', 'اختر اختياراً...')}</option>
                          {field.options?.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          id={`field_${field.id}`}
                          rows={3}
                          value={formFieldValues[field.id] || ''}
                          onChange={(e) =>
                            setFormFieldValues({ ...formFieldValues, [field.id]: e.target.value })
                          }
                          className="w-full p-3 rounded-xl bg-[#131E2E] border border-[#22354E] text-xs text-[#F8FAFC]"
                        />
                      ) : (
                        <input
                          id={`field_${field.id}`}
                          type={field.type}
                          value={formFieldValues[field.id] || ''}
                          aria-label={isAr ? field.labelAr : field.labelEn}
                          onChange={(e) =>
                            setFormFieldValues({ ...formFieldValues, [field.id]: e.target.value })
                          }
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#131E2E] border border-[#22354E] text-xs text-[#F8FAFC]"
                        />
                      )}

                      {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
                    </div>
                  );
                })}
              </div>

              {/* Form Submission Confirmation Action */}
              <div className="pt-4 border-t border-[#22354E] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? FORM_SECURITY_DISCLAIMER_AR : FORM_SECURITY_DISCLAIMER_EN}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const validation = validateFormValues(selectedFormTemplate, formFieldValues);
                    if (!validation.isValid) {
                      setFormValidationErrors(isAr ? validation.errorsAr : validation.errorsEn);
                      toast.error(
                        localize(
                          profile.language,
                          `Please complete ${validation.missingRequiredCount} required fields`,
                          `يرجى استكمال ${validation.missingRequiredCount} حقول إلزامية أولاً`
                        )
                      );
                      speakText(
                        isAr
                          ? 'يوجد حقول إلزامية ناقصة، يرجى استكمالها.'
                          : 'Required fields are missing, please fill them.'
                      );
                      return;
                    }

                    setFormValidationErrors({});
                    setFormIsSubmittedConfirmed(true);
                    toast.success(
                      localize(
                        profile.language,
                        'Form validated and reviewed successfully',
                        'تم تدقيق واعتماد مراجعة النموذج بنجاح'
                      )
                    );
                    speakText(
                      isAr
                        ? 'تم تدقيق كافة حقول النموذج بنجاح، يمكنك الآن نسخ بياناتك.'
                        : 'Form successfully validated and approved.'
                    );
                  }}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
                >
                  <Check className="w-4 h-4" />
                  <span>{localize(profile.language, 'Review & Validate Form', 'تدقيق ومراجعة الاستمارة')}</span>
                </button>
              </div>

              {formIsSubmittedConfirmed && (
                <div
                  role="status"
                  className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-300 space-y-2 text-xs"
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-200">
                    <Check className="w-4 h-4" />
                    <span>{localize(profile.language, 'Form Ready For Export', 'النموذج جاهز للاستخدام والتصدير')}</span>
                  </div>
                  <pre className="p-3 rounded-lg bg-[#061A33] border border-[#22354E] text-[#F8FAFC] whitespace-pre-wrap font-mono">
                    {JSON.stringify(formFieldValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ── MODAL: DOCUMENT REPLACEMENT CONFIRMATION GUARD ── */}
      <AnimatePresence>
        {showReplacementWarning && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={localize(profile.language, 'Confirm Document Replacement', 'تأكيد استبدال المستند')}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#131E2E] border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-start"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#F8FAFC]">
                    {localize(profile.language, 'Safeguard Document Content', 'حماية محتوى المستند')}
                  </h3>
                  <span className="text-xs text-amber-400 font-bold">
                    {localize(profile.language, 'Action Confirmation Required', 'مطلوب تأكيد صريح لحفظ العمل')}
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                {localize(
                  profile.language,
                  'The current document contains active content. Proceeding will replace or clear these blocks. Do you confirm this action?',
                  'المستند الحالي يحتوي على فقرات وبيانات محفوظة. متابعة هذا الإجراء سيؤدي لاستبدال أو مسح هذه الفقرات. هل تؤكد المتابعة؟'
                )}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#22354E]">
                <button
                  type="button"
                  onClick={() => {
                    setShowReplacementWarning(false);
                    setPendingVoiceAction(null);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1A283D] text-[#94A3B8] hover:text-white text-xs font-bold cursor-pointer"
                >
                  {localize(profile.language, 'Cancel (Keep Data)', 'إلغاء (الحفاظ على المحتوى)')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingVoiceAction) pendingVoiceAction();
                    setShowReplacementWarning(false);
                    setPendingVoiceAction(null);
                  }}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                >
                  {localize(profile.language, 'Yes, Proceed', 'نعم، متابعة الإجراء')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
