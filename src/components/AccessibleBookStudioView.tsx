/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cognify Accessible Educational Book & Document Studio View
 * (Phase 6: Dedicated Accessible Studio for Transforming Rough Content into Professional DOCX/PDF)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  FileText,
  Award,
  FileCheck,
  HelpCircle,
  Bookmark,
  Layers,
  GraduationCap,
  ArrowLeft,
  Download,
  Printer,
  Sparkles,
  Undo2,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  Settings2,
  FileUp,
  History,
  AlignRight,
  AlignLeft,
  ListOrdered,
  Type,
  Maximize2,
  Minimize2,
  Info,
  Menu,
  Moon,
  Sun,
  AlertCircle,
} from 'lucide-react';
import {
  BookTemplateType,
  QuestionType,
  AnswerSpaceStyle,
  StudioLanguage,
  RecognizedQuestion,
  DocumentSection,
  BookStudioMetadata,
  SavedBookStudioItem,
  TEMPLATE_PRESETS,
  BOOK_STUDIO_STORAGE_KEY,
  recognizeEducationalQuestions,
  parseDocumentStructure,
  buildAccessibleBookDocx,
  buildPrintableHtmlDocument,
} from '../lib/bookStudioEngine';
import { extractTextFromDocx } from '../lib/documentExtractor';
import { UserProfile } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { toast } from './Toast';
import { Breadcrumbs } from './ui/Breadcrumbs';
import { getRouteBreadcrumbs } from '../lib/navigation';

interface AccessibleBookStudioViewProps {
  profile: UserProfile;
  onNavigateBack?: () => void;
  onMenuClick?: () => void;
  initialContent?: string;
  initialTitle?: string;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export default function AccessibleBookStudioView({
  profile,
  onNavigateBack,
  onMenuClick,
  initialContent = '',
  initialTitle = '',
  isDarkMode = true,
  toggleTheme,
}: AccessibleBookStudioViewProps) {
  const isArLocale = isArabicLocale(profile?.language);

  // Active Wizard Step: 1 = Content, 2 = Template & Layout, 3 = Outline & Questions, 4 = Export
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Source text state with undo history
  const [rawContent, setRawContent] = useState<string>(() => {
    if (initialContent) return initialContent;
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('cognify_book_studio_active_source');
        if (cached) return cached;
      } catch {}
    }
    return '';
  });

  const [rawSourceHistory, setRawSourceHistory] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Metadata & Layout Settings
  const [metadata, setMetadata] = useState<BookStudioMetadata>(() => {
    return {
      title: initialTitle || (isArLocale ? 'كتاب العلوم التطبيقية الشامل' : 'Applied Science Comprehensive Textbook'),
      subtitle: isArLocale ? 'الوحدة الدراسية الأولى: الطاقة والحركة' : 'Unit 1: Energy & Motion',
      author: profile?.name || 'الأستاذ الدكتور / المشرف الأكاديمي',
      subject: profile?.field || (isArLocale ? 'العلوم الطبيعية والفيزياء' : 'Physics & Natural Science'),
      gradeLevel: profile?.educationLevel || (isArLocale ? 'المرحلة الثانوية / الجامعية' : 'High School / University'),
      institution: profile?.organization || (isArLocale ? 'منصة كوجنيفاي للتعليم الميسر' : 'Cognify Inclusive Learning Platform'),
      date: new Date().toLocaleDateString(isArLocale ? 'ar-EG' : 'en-US'),
      language: isArLocale ? 'ar' : 'en',
      template: 'textbook',
      answerSpaceStyle: 'dots',
      includeCoverPage: true,
      includeTableOfContents: true,
      includeAnswerKey: true,
      fontFamily: isArLocale ? 'Segoe UI' : 'Calibri',
      fontSizeScale: 'normal',
      lineSpacing: 280,
    };
  });

  // Parsed sections and questions
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyItems, setHistoryItems] = useState<SavedBookStudioItem[]>([]);

  // Auto-parse document structure when rawContent changes
  useEffect(() => {
    if (rawContent && rawContent.trim()) {
      const parsed = parseDocumentStructure(rawContent);
      setSections(parsed);
      try {
        sessionStorage.setItem('cognify_book_studio_active_source', rawContent);
      } catch {}
    } else {
      setSections([]);
    }
  }, [rawContent]);

  // Load document history and handle pending import from Document Reader
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(BOOK_STUDIO_STORAGE_KEY);
        if (raw) setHistoryItems(JSON.parse(raw));

        const pendingImport = sessionStorage.getItem('cognify_book_studio_import');
        if (pendingImport) {
          const parsed = JSON.parse(pendingImport);
          if (parsed.text) {
            setRawContent(parsed.text);
            if (parsed.title) {
              setMetadata((prev) => ({ ...prev, title: parsed.title }));
            }
          }
          sessionStorage.removeItem('cognify_book_studio_import');
        }
      } catch {}
    }
  }, []);

  // Update template preset defaults when template changes
  const handleSelectTemplate = (template: BookTemplateType) => {
    const preset = TEMPLATE_PRESETS[template];
    setMetadata((prev) => ({
      ...prev,
      template,
      includeCoverPage: preset.defaultCover,
      includeTableOfContents: preset.defaultToc,
      answerSpaceStyle: preset.defaultAnswerStyle,
    }));
  };

  // Safe Undo Formatting to Raw Source
  const handleRevertToOriginal = () => {
    if (rawSourceHistory.length > 0) {
      const previous = rawSourceHistory[rawSourceHistory.length - 1];
      setRawSourceHistory((prev) => prev.slice(0, -1));
      setRawContent(previous);
      toast.info(
        isArLocale ? 'تم استرجاع النص الأولي قبل التنسيق.' : 'Reverted content to previous state.',
        isArLocale ? 'تراجع عن التنسيق' : 'Undo'
      );
    } else {
      toast.warning(
        isArLocale ? 'لا يوجد نص سابق محفوظ للتراجع عنه.' : 'No earlier draft to undo.',
        isArLocale ? 'تنبيه' : 'Notice'
      );
    }
  };

  // DOCX file import handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      if (rawContent) {
        setRawSourceHistory((prev) => [...prev, rawContent]);
      }

      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const extracted = await extractTextFromDocx(arrayBuffer);
        if (extracted.valid && extracted.text) {
          setRawContent(extracted.text);
          setMetadata((prev) => ({
            ...prev,
            title: extracted.title || file.name.replace(/\.docx$/i, ''),
          }));
          toast.success(
            isArLocale ? `تم استخراج ${extracted.wordCount} كلمة من ملف Word بنجاح!` : `Extracted ${extracted.wordCount} words from DOCX!`,
            isArLocale ? 'استيراد ناجح' : 'Import Successful'
          );
        } else {
          toast.error(
            isArLocale ? 'تعذر استخراج النصوص من ملف Word.' : 'Failed to extract text from DOCX.',
            isArLocale ? 'خطأ' : 'Error'
          );
        }
      } else {
        const text = await file.text();
        setRawContent(text);
        setMetadata((prev) => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, ''),
        }));
        toast.success(
          isArLocale ? 'تم استيراد الملف النصي بنجاح!' : 'Imported text file successfully!',
          isArLocale ? 'استيراد' : 'Import'
        );
      }
    } catch (err) {
      console.error('File import error:', err);
      toast.error(
        isArLocale ? 'حدث خطأ أثناء قراءة الملف.' : 'Error reading document file.',
        isArLocale ? 'خطأ' : 'Error'
      );
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load extracted text from Cognify File Reader session
  const handleImportFromFileReader = () => {
    if (typeof window === 'undefined') return;
    try {
      const draft = sessionStorage.getItem('cognify_doc_audio_lecture_draft');
      const visionObs = sessionStorage.getItem('cognify_vision_last_observation');

      let imported = '';
      if (draft) {
        const parsed = JSON.parse(draft);
        imported = parsed.transcript || parsed.summary || '';
      }
      if (!imported && visionObs) {
        const parsed = JSON.parse(visionObs);
        imported = parsed.description || '';
      }

      if (imported) {
        if (rawContent) setRawSourceHistory((prev) => [...prev, rawContent]);
        setRawContent(imported);
        toast.success(
          isArLocale ? 'تم استيراد المحتوى المستخرج من قارئ المستندات!' : 'Imported text from Cognify Document Reader!',
          isArLocale ? 'استيراد' : 'Import'
        );
      } else {
        toast.info(
          isArLocale ? 'لم يتم العثور على مستندات مستخرجة حديثاً في الجلسة.' : 'No recent extracted documents found in current session.',
          isArLocale ? 'لا يوجد محتوى' : 'No Content'
        );
      }
    } catch {
      toast.error(isArLocale ? 'فشل استيراد المحتوى.' : 'Failed to import session content.');
    }
  };

  // Generate & Download Native Word (.docx)
  const handleDownloadDocx = async () => {
    if (!sections.length && !rawContent.trim()) {
      toast.warning(
        isArLocale ? 'يرجى إدخال محتوى تعليمي أولاً قبل تصدير المستند.' : 'Please provide educational content before export.',
        isArLocale ? 'تنبيه' : 'Notice'
      );
      return;
    }

    setIsGeneratingDocx(true);
    try {
      const activeSections = sections.length > 0 ? sections : parseDocumentStructure(rawContent);
      const blob = await buildAccessibleBookDocx(activeSections, metadata);

      // Trigger native download
      const cleanFileName = (metadata.title || 'Cognify_Educational_Document')
        .replace(/[\/\\:*?"<>|]/g, '_')
        .substring(0, 60);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanFileName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save to document history
      saveToHistory(metadata.title, rawContent, activeSections);

      toast.success(
        isArLocale ? 'تم إنشاء وتنزيل مستند Word الميسر بنجاح!' : 'Accessible Word (.docx) document generated and downloaded!',
        isArLocale ? 'تم التصدير' : 'Export Complete'
      );
    } catch (err) {
      console.error('DOCX Export error:', err);
      toast.error(
        isArLocale ? 'حدث خطأ أثناء إنشاء ملف Word.' : 'Error generating Word document.',
        isArLocale ? 'فشل التصدير' : 'Export Failed'
      );
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // Print / Save as PDF
  const handlePrintPdf = () => {
    if (!sections.length && !rawContent.trim()) return;
    const activeSections = sections.length > 0 ? sections : parseDocumentStructure(rawContent);
    const htmlContent = buildPrintableHtmlDocument(activeSections, metadata);

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error(isArLocale ? 'تم حظر النافذة المنبثقة من المتصفح.' : 'Popup was blocked by browser.');
      return;
    }
    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 500);
  };

  // Save document item to history
  const saveToHistory = (title: string, raw: string, parsedSecs: DocumentSection[]) => {
    if (typeof window === 'undefined') return;
    try {
      const totalQ = parsedSecs.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
      const words = raw.split(/\s+/).filter(Boolean).length;
      const newItem: SavedBookStudioItem = {
        id: `book-${Date.now()}`,
        title: title || 'Educational Document',
        template: metadata.template,
        language: metadata.language,
        updatedAt: new Date().toISOString(),
        rawSource: raw,
        metadata: { ...metadata },
        sectionsCount: parsedSecs.length,
        questionsCount: totalQ,
        wordCount: words,
      };

      const existing = historyItems.filter((i) => i.title !== newItem.title);
      const updated = [newItem, ...existing].slice(0, 20);
      setHistoryItems(updated);
      localStorage.setItem(BOOK_STUDIO_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Reopen saved book item
  const handleReopenHistoryItem = (item: SavedBookStudioItem) => {
    if (rawContent) setRawSourceHistory((prev) => [...prev, rawContent]);
    setRawContent(item.rawSource);
    setMetadata(item.metadata);
    setShowHistoryModal(false);
    setActiveStep(3); // Jump straight to outline and questions
    toast.success(
      isArLocale ? `تم استرجاع المستند: ${item.title}` : `Reopened document: ${item.title}`,
      isArLocale ? 'استرجاع' : 'Loaded'
    );
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const words = rawContent.split(/\s+/).filter(Boolean).length;
    const paras = rawContent.split(/\n+/).filter(Boolean).length;
    const questionsCount = sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
    return { words, paras, questionsCount, sectionsCount: sections.length };
  }, [rawContent, sections]);

  return (
    <div
      dir={metadata.language === 'ar' || metadata.language === 'mixed' ? 'rtl' : 'ltr'}
      className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-cognify-bg-dark text-stone-100' : 'bg-cognify-bg-light text-stone-900'
      }`}
    >
      {/* ── TOP HEADER ── */}
      <header
        className={`px-4 py-2.5 sm:px-6 sm:py-3 border-b backdrop-blur-xl flex items-center justify-between gap-3 shrink-0 z-20 transition-colors duration-300 ${
          isDarkMode
            ? 'border-stone-800 bg-cognify-bg-dark/95 text-white'
            : 'border-stone-200/90 bg-white/95 text-stone-900 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Breadcrumbs
            items={getRouteBreadcrumbs({ view: 'book_studio' }, profile?.language)}
            onNavigate={(v) => {
              if (v === 'disability' && onNavigateBack) onNavigateBack();
            }}
            onNavigateBack={onNavigateBack}
            backLabel={isArLocale ? 'لوحة الميزات' : 'Hub'}
            isDarkMode={isDarkMode}
          />

          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white shadow-md shrink-0 hidden md:flex">
            <BookOpen className="w-5 h-5" />
          </div>

          <div className="min-w-0 hidden lg:block">
            <h1 className="font-black text-sm sm:text-base leading-tight truncate">
              {localize(profile?.language, 'Accessible Book & Document Studio', 'استوديو الكتب والمستندات التعليمية الميسرة')}
            </h1>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate">
              {localize(
                profile?.language,
                'Transform rough educational notes into structured Word (.docx) & PDF documents',
                'تحويل المذكرات والملازم إلى كتب وامتحانات رسمية منسقة بملفات Word وPDF'
              )}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {rawSourceHistory.length > 0 && (
            <button
              type="button"
              onClick={handleRevertToOriginal}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                isDarkMode
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/60'
                  : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
              }`}
              title={isArLocale ? 'تراجع عن التنسيق واسترجاع النص الأصلي' : 'Undo changes'}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isArLocale ? 'تراجع' : 'Undo'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              isDarkMode
                ? 'bg-cognify-surface-dark border-stone-800 text-stone-300 hover:text-white'
                : 'bg-stone-100 border-stone-200 text-stone-700 hover:text-stone-950'
            }`}
            title={isArLocale ? 'أرشيف الكتب المحفوظة' : 'Document History'}
            aria-label={isArLocale ? 'أرشيف الكتب المحفوظة' : 'Document History'}
          >
            <History className="w-4 h-4" />
          </button>

          {toggleTheme && (
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                isDarkMode
                  ? 'bg-cognify-surface-dark border-stone-800 text-amber-400'
                  : 'bg-stone-100 border-stone-200 text-stone-700'
              }`}
              title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className={`p-2 rounded-xl border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                isDarkMode
                  ? 'bg-cognify-surface-dark border-stone-800 text-stone-300 hover:text-white'
                  : 'bg-stone-100 border-stone-200 text-stone-700 hover:text-stone-950'
              }`}
              aria-label="Toggle menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── WORKFLOW STEP NAVIGATOR (Screen-reader Accessible Tablist) ── */}
      <nav
        aria-label={isArLocale ? 'خطوات استوديو الكتب التعليمية' : 'Book Studio Steps'}
        className={`px-4 py-2 border-b shrink-0 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar ${
          isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-stone-100 border-stone-200'
        }`}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          {[
            { step: 1 as const, labelAr: '1. المصدر والمحتوى', labelEn: '1. Content & Source', icon: FileUp },
            { step: 2 as const, labelAr: '2. القالب والتنسيق', labelEn: '2. Template & Layout', icon: Settings2 },
            { step: 3 as const, labelAr: '3. الهيكل والأسئلة', labelEn: '3. Outline & Questions', icon: ListOrdered },
            { step: 4 as const, labelAr: '4. التصدير النهائي', labelEn: '4. Export & Download', icon: Download },
          ].map((item) => {
            const isActive = activeStep === item.step;
            const Icon = item.icon;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStep(item.step)}
                aria-current={isActive ? 'step' : undefined}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer outline-none shrink-0 ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm font-black'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/80'
                } focus-visible:ring-2 focus-visible:ring-teal-600`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{isArLocale ? item.labelAr : item.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Word & Question Counter Badge */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 font-bold shrink-0">
          <span>{stats.words} {isArLocale ? 'كلمة' : 'words'}</span>
          <span>•</span>
          <span>{stats.questionsCount} {isArLocale ? 'سؤال مكتشف' : 'questions'}</span>
        </div>
      </nav>

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6 pb-20">

          {/* ═════════════════════════════════════════════════════════════════
              STEP 1: INPUT, IMPORT & EDUCATIONAL METADATA
             ═════════════════════════════════════════════════════════════════ */}
          {activeStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Top Action Import Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="book-studio-file-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className={`p-4 rounded-2xl border text-start flex items-center gap-3 transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isDarkMode
                      ? 'bg-cognify-surface-dark border-stone-800 hover:border-teal-700 text-stone-200'
                      : 'bg-white border-stone-200 hover:border-teal-600 text-stone-800 shadow-sm'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm truncate">
                      {isArLocale ? 'رفع ملف Word أو TXT' : 'Upload DOCX or TXT'}
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {isArLocale ? 'استيراد فوري واستخراج النصوص' : 'Instant pure extraction'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleImportFromFileReader}
                  className={`p-4 rounded-2xl border text-start flex items-center gap-3 transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isDarkMode
                      ? 'bg-cognify-surface-dark border-stone-800 hover:border-indigo-700 text-stone-200'
                      : 'bg-white border-stone-200 hover:border-indigo-600 text-stone-800 shadow-sm'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm truncate">
                      {isArLocale ? 'استيراد من قارئ المستندات' : 'Import from File Reader'}
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {isArLocale ? 'المحاضرات أو النصوص المستخرجة' : 'Lecture notes or PDF scans'}
                    </div>
                  </div>
                </button>

                <div
                  className={`p-4 rounded-2xl border flex items-center gap-3 ${
                    isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-stone-300' : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm truncate">
                      {isArLocale ? 'حفظ الأصول وإمكانية التراجع' : 'Non-destructive Formatting'}
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {isArLocale ? 'النص الأصلي محفوظ ومحمي دائماً' : 'Original text is never altered'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Educational Metadata Form Card */}
              <div
                className={`p-5 sm:p-6 rounded-3xl border space-y-4 ${
                  isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs sm:text-sm">
                  <Bookmark className="w-4 h-4" />
                  <span>{isArLocale ? 'بيانات وهوية الكتاب / الوثيقة التعليمية' : 'Document Identity & Metadata'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                      {isArLocale ? 'عنوان الكتاب أو المستند *' : 'Document Title *'}
                    </label>
                    <input
                      type="text"
                      value={metadata.title}
                      onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-teal-600 transition-colors ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                      placeholder={isArLocale ? 'مثال: كتاب الفيزياء الحيوية' : 'e.g. Biophysics Lecture Notes'}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                      {isArLocale ? 'العنوان الفرعي أو الوحدة' : 'Subtitle or Unit'}
                    </label>
                    <input
                      type="text"
                      value={metadata.subtitle || ''}
                      onChange={(e) => setMetadata({ ...metadata, subtitle: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-teal-600 transition-colors ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                      placeholder={isArLocale ? 'مثال: الوحدة الأولى: الميكانيكا' : 'e.g. Unit 1: Mechanics'}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                      {isArLocale ? 'المؤلف / المعلم' : 'Author / Teacher'}
                    </label>
                    <input
                      type="text"
                      value={metadata.author}
                      onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-teal-600 transition-colors ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                      {isArLocale ? 'المادة التخصصية' : 'Subject'}
                    </label>
                    <input
                      type="text"
                      value={metadata.subject}
                      onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-teal-600 transition-colors ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                      {isArLocale ? 'المرحلة / الصف الدراسي' : 'Grade / Educational Level'}
                    </label>
                    <input
                      type="text"
                      value={metadata.gradeLevel}
                      onChange={(e) => setMetadata({ ...metadata, gradeLevel: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-teal-600 transition-colors ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                      {isArLocale ? 'لغة المحتوى والتنسيق' : 'Content Language'}
                    </label>
                    <select
                      value={metadata.language}
                      onChange={(e) => setMetadata({ ...metadata, language: e.target.value as StudioLanguage })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-teal-600 transition-colors cursor-pointer ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    >
                      <option value="ar">{isArLocale ? 'العربية (RTL من اليمين لليسار)' : 'Arabic (RTL)'}</option>
                      <option value="en">{isArLocale ? 'الإنجليزية (LTR)' : 'English (LTR)'}</option>
                      <option value="mixed">{isArLocale ? 'ثنائي اللغة (عربي ومصطلحات إنجليزية)' : 'Bilingual (Arabic & English)'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rough Content Editor Textarea */}
              <div
                className={`p-5 sm:p-6 rounded-3xl border space-y-3 ${
                  isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs sm:text-sm">
                    <FileText className="w-4 h-4" />
                    <span>{isArLocale ? 'محرر المحتوى والنصوص التعليمية' : 'Educational Content Source'}</span>
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {stats.words} {isArLocale ? 'كلمة' : 'words'} • {stats.paras} {isArLocale ? 'فقرة' : 'paragraphs'}
                  </span>
                </div>

                <textarea
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  rows={14}
                  className={`w-full p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed font-sans outline-none focus:border-teal-600 transition-colors custom-scrollbar ${
                    isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                  placeholder={
                    isArLocale
                      ? 'الصق هنا محتوى الدرس، الشرح، الأسئلة والتدريبات، أو الفصول التعليمية...\nمثال:\nالفصل الأول: الحركة الموجية\nتعتبر الأمواج من أهم الظواهر الفيزيائية الطبيعية...\nس 1: عرف التردد وسعة الموجة؟\nس 2: اختر الإجابة الصحيحة:\n[A] التردد يقاس بالهرتز\n[B] السرعة تقاس بالنيوتن'
                      : 'Paste lecture content, chapters, review exercises, or questions here...'
                  }
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {isArLocale
                      ? 'يمكنك الانتقال للخطوة التالية لاختيار القالب والتحكم بالهيكل الأكاديمي'
                      : 'Proceed to Step 2 to select templates and formatting presets'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    disabled={!rawContent.trim()}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <span>{isArLocale ? 'متابعة: اختيار القالب والتنسيق' : 'Next: Template & Layout'}</span>
                    <ChevronRight className={`w-4 h-4 ${isArLocale ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              STEP 2: DOCUMENT TEMPLATES & PROFESSIONAL WORD PRESETS
             ═════════════════════════════════════════════════════════════════ */}
          {activeStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="text-start">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {isArLocale ? 'اختر قالب المستند الأكاديمي المناسب' : 'Choose Academic Document Template'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {isArLocale
                    ? 'يقوم الاستوديو بتطبيق الأنماط الهيكلية الاحترافية (عناوين Word، مساحات الإجابة، والغلاف) وفق الغرض التعليمي'
                    : 'Applies real Word styles, TOC, cover page, and answer spaces according to educational purpose'}
                </p>
              </div>

              {/* 8 Document Template Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(TEMPLATE_PRESETS) as BookTemplateType[]).map((tmplKey) => {
                  const preset = TEMPLATE_PRESETS[tmplKey];
                  const isSelected = metadata.template === tmplKey;
                  return (
                    <button
                      key={tmplKey}
                      type="button"
                      onClick={() => handleSelectTemplate(tmplKey)}
                      className={`p-4 rounded-2xl border text-start flex flex-col justify-between transition-all active:scale-95 cursor-pointer outline-none ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600 shadow-md'
                          : isDarkMode
                          ? 'border-stone-800 bg-cognify-surface-dark hover:border-teal-700/60'
                          : 'border-stone-200 bg-white hover:border-teal-600/40 shadow-sm'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-teal-700 text-white' : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                          }`}>
                            <BookOpen className="w-4 h-4" />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                        </div>
                        <h3 className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-teal-900 dark:text-teal-200' : ''}`}>
                          {isArLocale ? preset.labelAr : preset.labelEn}
                        </h3>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed">
                          {isArLocale ? preset.descriptionAr : preset.descriptionEn}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-stone-200 dark:border-stone-800/80 mt-3 flex items-center justify-between text-[9px] text-stone-400 font-bold">
                        <span>{preset.defaultCover ? (isArLocale ? '✓ غلاف' : '✓ Cover') : (isArLocale ? 'ترويسة' : 'Header')}</span>
                        <span>{preset.defaultToc ? (isArLocale ? '✓ فهرس' : '✓ TOC') : ''}</span>
                        <span>{preset.defaultAnswerStyle !== 'none' ? (isArLocale ? '✓ مساحات حل' : '✓ Answers') : ''}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Formatting & Layout Customizer Card */}
              <div
                className={`p-5 sm:p-6 rounded-3xl border space-y-5 ${
                  isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs sm:text-sm">
                  <Settings2 className="w-4 h-4" />
                  <span>{isArLocale ? 'تخصيص خيارات التنسيق والطباعة' : 'Layout & Formatting Settings'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Answer Space Style */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                      {isArLocale ? 'نمط مساحات الإجابة للأسئلة' : 'Answer Space Style'}
                    </label>
                    <select
                      value={metadata.answerSpaceStyle}
                      onChange={(e) => setMetadata({ ...metadata, answerSpaceStyle: e.target.value as AnswerSpaceStyle })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-teal-600 transition-colors cursor-pointer ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    >
                      <option value="dots">{isArLocale ? 'نقاط متباعدة (..................)' : 'Dot leaders (......)'}</option>
                      <option value="lines">{isArLocale ? 'أسطر مسطرة (خطوط إجابة)' : 'Ruled lines'}</option>
                      <option value="box">{isArLocale ? 'صندوق إجابة محدد [ للحل والشرح ]' : 'Bordered response box'}</option>
                      <option value="none">{isArLocale ? 'بدون مساحات إجابة (مضغوط)' : 'None (compact layout)'}</option>
                    </select>
                  </div>

                  {/* Typography Font */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                      {isArLocale ? 'خط العناوين والنصوص' : 'Typography Font'}
                    </label>
                    <select
                      value={metadata.fontFamily}
                      onChange={(e) => setMetadata({ ...metadata, fontFamily: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-teal-600 transition-colors cursor-pointer ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    >
                      <option value="Segoe UI">Segoe UI (موصى به للواجهات العربية المودرن)</option>
                      <option value="Amiri">Amiri (خط عربي أكاديمي أنيق)</option>
                      <option value="Arial">Arial (واضح وعالي التباين لقارئات الشاشة)</option>
                      <option value="Calibri">Calibri (الخط القياسي الأكاديمي لـ Word)</option>
                      <option value="Times New Roman">Times New Roman (الخط التقليدي للبحوث)</option>
                    </select>
                  </div>

                  {/* Font Size Scaling (Low Vision Accommodation) */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1">
                      {isArLocale ? 'مقياس حجم الخط (لتيسير القراءة)' : 'Font Size Scale (Low-Vision)'}
                    </label>
                    <select
                      value={metadata.fontSizeScale}
                      onChange={(e) => setMetadata({ ...metadata, fontSizeScale: e.target.value as any })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-teal-600 transition-colors cursor-pointer ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    >
                      <option value="normal">{isArLocale ? 'حجم طبيعي (Standard 11pt/16pt)' : 'Normal (11pt/16pt)'}</option>
                      <option value="large">{isArLocale ? 'حجم كبير (Large 13pt/21pt)' : 'Large (13pt/21pt)'}</option>
                      <option value="extralarge">{isArLocale ? 'حجم فائق لضعاف البصر (15pt/24pt)' : 'Extra Large Low-Vision (15pt/24pt)'}</option>
                    </select>
                  </div>
                </div>

                {/* Toggles: Cover, TOC, Answer Key */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={metadata.includeCoverPage}
                      onChange={(e) => setMetadata({ ...metadata, includeCoverPage: e.target.checked })}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold">
                      {isArLocale ? 'إدراج صفحة غلاف كاملة (Cover Page)' : 'Include Title Cover Page'}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={metadata.includeTableOfContents}
                      onChange={(e) => setMetadata({ ...metadata, includeTableOfContents: e.target.checked })}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold">
                      {isArLocale ? 'إدراج فهرس محتويات (Table of Contents)' : 'Include Table of Contents'}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={metadata.includeAnswerKey}
                      onChange={(e) => setMetadata({ ...metadata, includeAnswerKey: e.target.checked })}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold">
                      {isArLocale ? 'إدراج ملحق نموذج الإجابة (Answer Key)' : 'Include Answer Key Appendix'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode ? 'border-stone-800 text-stone-300' : 'border-stone-200 text-stone-700'
                    }`}
                  >
                    {isArLocale ? 'الرجوع للمحتوى' : 'Back to Content'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <span>{isArLocale ? 'متابعة: مراجعة الهيكل والأسئلة' : 'Next: Outline & Questions'}</span>
                    <ChevronRight className={`w-4 h-4 ${isArLocale ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              STEP 3: STRUCTURED OUTLINE & EDUCATIONAL QUESTION INSPECTOR
             ═════════════════════════════════════════════════════════════════ */}
          {activeStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight">
                    {isArLocale ? 'الهيكل الأكاديمي وبنك الأسئلة المكتشفة' : 'Structured Outline & Question Inspector'}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {isArLocale
                      ? 'يمكنك فحص العناوين، تصحيح نوع السؤال (اختيار من متعدد / صح وخطأ / مقالي)، وتعديل الدرجات ومساحات الحل'
                      : 'Inspect sections, review recognized question types, and fine-tune response spaces'}
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  {stats.sectionsCount} {isArLocale ? 'أبواب وأقسام' : 'sections'} • {stats.questionsCount} {isArLocale ? 'سؤال' : 'questions'}
                </span>
              </div>

              {/* Sections & Questions Tree */}
              <div className="space-y-4">
                {sections.map((sec, sIdx) => {
                  return (
                    <div
                      key={sec.id}
                      className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                        isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            sec.level === 1
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {sec.isChapter ? (isArLocale ? 'فصل رئيسي' : 'Chapter') : `H${sec.level}`}
                          </span>
                          <h3 className="font-bold text-xs sm:text-sm truncate">{sec.title}</h3>
                        </div>

                        <span className="text-[10px] text-stone-400 shrink-0">
                          {sec.questions?.length || 0} {isArLocale ? 'أسئلة' : 'questions'}
                        </span>
                      </div>

                      {/* Section Text Summary */}
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        {sec.content.join(' ') || (isArLocale ? 'لا يوجد نص تمهيدي' : 'No introductory text')}
                      </p>

                      {/* Questions List for this Section */}
                      {sec.questions && sec.questions.length > 0 && (
                        <div className="space-y-2.5 pt-2">
                          <h4 className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>{isArLocale ? 'الأسئلة والتمارين المكتشفة بهذا القسم:' : 'Recognized Questions in this section:'}</span>
                          </h4>

                          {sec.questions.map((q, qIdx) => (
                            <div
                              key={q.id}
                              className={`p-3 rounded-xl border text-xs space-y-2 ${
                                isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-stone-50 border-stone-200'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-teal-600 dark:text-teal-400">
                                    {isArLocale ? `س ${qIdx + 1}:` : `Q ${qIdx + 1}:`}
                                  </span>
                                  {/* Question Type Selector */}
                                  <select
                                    value={q.type}
                                    onChange={(e) => {
                                      const newType = e.target.value as QuestionType;
                                      setSections((prev) =>
                                        prev.map((s) => ({
                                          ...s,
                                          questions: s.questions?.map((item) =>
                                            item.id === q.id ? { ...item, type: newType } : item
                                          ),
                                        }))
                                      );
                                    }}
                                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold outline-none cursor-pointer ${
                                      isDarkMode ? 'bg-cognify-surface-dark border-stone-700 text-stone-200' : 'bg-white border-stone-300 text-stone-800'
                                    }`}
                                  >
                                    <option value="mcq">{isArLocale ? 'اختيار من متعدد (MCQ)' : 'Multiple Choice'}</option>
                                    <option value="true_false">{isArLocale ? 'صح أم خطأ (True/False)' : 'True / False'}</option>
                                    <option value="fill_blank">{isArLocale ? 'أكمل الفراغات (Fill Blank)' : 'Fill in Blank'}</option>
                                    <option value="short_answer">{isArLocale ? 'سؤال قصير وإجابة' : 'Short Answer'}</option>
                                    <option value="essay">{isArLocale ? 'سؤال مقالي وشرح' : 'Essay Question'}</option>
                                    <option value="matching">{isArLocale ? 'توصيل ومطابقة' : 'Matching Exercise'}</option>
                                  </select>
                                </div>

                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="text-stone-400">{isArLocale ? 'الدرجات:' : 'Marks:'}</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={q.points || 1}
                                    onChange={(e) => {
                                      const pts = parseInt(e.target.value, 10) || 1;
                                      setSections((prev) =>
                                        prev.map((s) => ({
                                          ...s,
                                          questions: s.questions?.map((item) =>
                                            item.id === q.id ? { ...item, points: pts } : item
                                          ),
                                        }))
                                      );
                                    }}
                                    className={`w-12 px-1.5 py-0.5 rounded border text-center font-bold outline-none ${
                                      isDarkMode ? 'bg-cognify-surface-dark border-stone-700 text-white' : 'bg-white border-stone-300 text-stone-900'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Question Prompt */}
                              <p className="font-semibold text-stone-800 dark:text-stone-200 leading-relaxed">
                                {q.prompt}
                              </p>

                              {/* MCQ Options Display */}
                              {q.type === 'mcq' && q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-stone-600 dark:text-stone-400">
                                  {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="truncate">
                                      [   ] {opt}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Model Answer preview if present */}
                              {q.correctAnswer && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                                  {isArLocale ? `الإجابة المسجلة: ${q.correctAnswer}` : `Answer Key: ${q.correctAnswer}`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isDarkMode ? 'border-stone-800 text-stone-300' : 'border-stone-200 text-stone-700'
                  }`}
                >
                  {isArLocale ? 'الرجوع للقوالب' : 'Back to Templates'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <span>{isArLocale ? 'متابعة: التصدير والمعاينة النهائية' : 'Next: Export & Download'}</span>
                  <ChevronRight className={`w-4 h-4 ${isArLocale ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              STEP 4: STUDIO EXPORT, WORD (.DOCX), PDF & HISTORY
             ═════════════════════════════════════════════════════════════════ */}
          {activeStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Document Overview Summary Banner */}
              <div
                className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${
                  isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                      {isArLocale ? 'جاهز للتصدير الأكاديمي' : 'Ready for Academic Export'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">{metadata.title}</h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {metadata.subtitle || metadata.subject} • {metadata.author} • {metadata.gradeLevel}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadDocx}
                      disabled={isGeneratingDocx}
                      className="px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingDocx ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>{isArLocale ? 'تنزيل ملف Word (.docx)' : 'Download Word (.docx)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintPdf}
                      className={`px-4 py-3 rounded-2xl border font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-cognify-surface-dark border-stone-800 text-stone-200 hover:text-white'
                          : 'bg-stone-100 border-stone-200 text-stone-800 hover:text-stone-950'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                      <span>{isArLocale ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}</span>
                    </button>
                  </div>
                </div>

                {/* Document Properties Review Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-stone-200 dark:border-stone-800 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[10px]">{isArLocale ? 'نوع القالب:' : 'Template:'}</span>
                    <span className="font-bold">{TEMPLATE_PRESETS[metadata.template].labelAr}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">{isArLocale ? 'الأبواب والأقسام:' : 'Sections:'}</span>
                    <span className="font-bold">{stats.sectionsCount} {isArLocale ? 'أقسام' : 'sections'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">{isArLocale ? 'بنك الأسئلة:' : 'Questions:'}</span>
                    <span className="font-bold">{stats.questionsCount} {isArLocale ? 'سؤال' : 'questions'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">{isArLocale ? 'مساحات الحل:' : 'Answer Spaces:'}</span>
                    <span className="font-bold">
                      {metadata.answerSpaceStyle === 'dots'
                        ? isArLocale ? 'نقاط' : 'Dots'
                        : metadata.answerSpaceStyle === 'lines'
                        ? isArLocale ? 'أسطر مسطرة' : 'Ruled'
                        : metadata.answerSpaceStyle === 'box'
                        ? isArLocale ? 'صندوق حل' : 'Box'
                        : isArLocale ? 'بدون' : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Accessible Document Content Inspector (Screen-Reader Friendly) */}
              <div
                className={`p-6 rounded-3xl border space-y-4 ${
                  isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs sm:text-sm">
                    <Eye className="w-4 h-4" />
                    <span>{isArLocale ? 'مراجعة هيكل المستند والمحتوى الفعلي' : 'Document Content Inspector'}</span>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    {isArLocale ? 'قراءة متسقة بالكامل لقارئات الشاشة (Screen Readers)' : 'Accessible reading order verified'}
                  </span>
                </div>

                <div
                  className={`p-4 rounded-2xl border max-h-[380px] overflow-y-auto custom-scrollbar text-xs leading-relaxed space-y-4 ${
                    isDarkMode ? 'bg-cognify-bg-dark border-stone-800' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  {sections.map((sec, idx) => (
                    <article key={idx} className="space-y-1.5">
                      <h3 className="font-black text-sm text-teal-600 dark:text-teal-400">
                        {sec.title}
                      </h3>
                      {sec.content.map((p, pIdx) => (
                        <p key={pIdx} className="text-stone-700 dark:text-stone-300">
                          {p}
                        </p>
                      ))}
                      {sec.questions && sec.questions.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-1 my-2">
                          <span className="font-bold text-[10px] text-teal-600 dark:text-teal-400 uppercase">
                            {isArLocale ? `[ ${sec.questions.length} أسئلة مصنفة في هذا الباب ]` : `[ ${sec.questions.length} Questions ]`}
                          </span>
                          {sec.questions.map((q, qIndex) => (
                            <div key={qIndex} className="text-[11px] font-medium">
                              • <b>{isArLocale ? `س ${qIndex + 1}:` : `Q ${qIndex + 1}:`}</b> {q.prompt}
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode ? 'border-stone-800 text-stone-300' : 'border-stone-200 text-stone-700'
                    }`}
                  >
                    {isArLocale ? 'الرجوع للهيكل' : 'Back to Outline'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDocx}
                    className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isArLocale ? 'تحميل المستند الآن (.docx)' : 'Download Document Now (.docx)'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </main>

      {/* ── SAVED DOCUMENT HISTORY MODAL ── */}
      {showHistoryModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isArLocale ? 'أرشيف الكتب والمستندات السابقة' : 'Book Studio History'}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            className={`max-w-2xl w-full max-h-[85vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
              isDarkMode ? 'bg-cognify-surface-dark border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-black text-sm sm:text-base">
                  {isArLocale ? 'أرشيف المستندات والكتب السابقة' : 'Saved Book Studio Documents'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5">
              {historyItems.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  {isArLocale ? 'لا توجد مستندات محفوظة حتى الآن.' : 'No saved documents in history.'}
                </div>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                      isDarkMode ? 'bg-cognify-surface-dark border-stone-800 hover:border-teal-700' : 'bg-stone-50 border-stone-200 hover:border-teal-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm truncate">{item.title}</h4>
                      <p className="text-[10px] text-stone-400">
                        {TEMPLATE_PRESETS[item.template]?.labelAr || item.template} • {item.wordCount} {isArLocale ? 'كلمة' : 'words'} • {item.questionsCount} {isArLocale ? 'سؤال' : 'questions'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReopenHistoryItem(item)}
                      className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shrink-0 active:scale-95 transition-all cursor-pointer"
                    >
                      {isArLocale ? 'فتح وتعديل' : 'Reopen'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
