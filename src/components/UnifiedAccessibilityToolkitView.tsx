/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cognify Unified Accessibility Toolkit View
 * (Phase 7: Integrated Visual Assistant, Document Scanner, PDF Evidence Assistant & Sticker Explainer)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye,
  Camera,
  FileText,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  Search,
  BookOpen,
  Headphones,
  SlidersHorizontal,
  Layers,
  FileUp,
  HelpCircle,
  Clock,
  Trash2,
  Share2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  X,
} from 'lucide-react';
import { UserProfile } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { toast } from './Toast';
import { Breadcrumbs } from './ui/Breadcrumbs';
import { getRouteBreadcrumbs } from '../lib/navigation';
import { speak, cancelSpeech } from '../lib/tts';
import {
  fetchUserUsageQuota,
  UserUsageSnapshot,
  ASSISTIVE_QUOTAS,
} from '../lib/usageQuotaEngine';
import {
  ToolkitCategory,
  ScannedPageItem,
  DocumentEvidenceResult,
  StickerAnalysisResult,
  ToolkitActivityItem,
  detectWebpAnimation,
  analyzeImageOrSticker,
  detectDocumentBounds,
  applyScanFilter,
  combinePagesIntoPdf,
  queryPdfWithEvidence,
  saveToolkitActivity,
  getToolkitActivities,
  deleteToolkitActivity,
  clearToolkitActivities,
} from '../lib/accessibilityToolkitEngine';
import { extractTextFromPdf, extractTextFromDocx, extractTextFromTxt } from '../lib/documentExtractor';

interface UnifiedAccessibilityToolkitViewProps {
  profile: UserProfile;
  onNavigateBack?: () => void;
  onMenuClick?: () => void;
  onOpenBookStudio?: (content?: string, title?: string) => void;
  isDarkMode?: boolean;
}

export default function UnifiedAccessibilityToolkitView({
  profile,
  onNavigateBack,
  onMenuClick,
  onOpenBookStudio,
  isDarkMode = true,
}: UnifiedAccessibilityToolkitViewProps) {
  const isAr = isArabicLocale(profile.language);
  const [activeCategory, setActiveCategory] = useState<ToolkitCategory>('see_understand');

  // Screen-reader live announcement region
  const [announcement, setAnnouncement] = useState('');
  const announceToScreenReader = useCallback((msg: string) => {
    setAnnouncement(msg);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. WHATSAPP STICKER & IMAGE EXPLAINER STATE
  // ─────────────────────────────────────────────────────────────────────────
  const [stickerFile, setStickerFile] = useState<File | null>(null);
  const [stickerDataUrl, setStickerDataUrl] = useState<string | null>(null);
  const [isAnalyzingSticker, setIsAnalyzingSticker] = useState(false);
  const [stickerResult, setStickerResult] = useState<StickerAnalysisResult | null>(null);
  const [stickerVerbosity, setStickerVerbosity] = useState<'concise' | 'detailed'>('detailed');
  const stickerInputRef = useRef<HTMLInputElement>(null);

  // Handle pasted image from clipboard (e.g. copied WhatsApp sticker)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessStickerFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [stickerVerbosity]);

  const handleProcessStickerFile = async (file: File) => {
    setStickerFile(file);
    setIsAnalyzingSticker(true);
    setStickerResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { isAnimated, format } = detectWebpAnimation(arrayBuffer);

      // Read as Data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setStickerDataUrl(dataUrl);

        const result = await analyzeImageOrSticker(dataUrl, {
          verbosity: stickerVerbosity,
          lang: isAr ? 'ar' : 'en',
          isSticker: file.name.endsWith('.webp') || file.type.includes('webp'),
          isAnimated,
        });

        setStickerResult(result);
        setIsAnalyzingSticker(false);

        // Save to persistent activity
        saveToolkitActivity({
          type: 'sticker_image',
          title: file.name.replace(/\.[^/.]+$/, '') || (isAr ? 'ملصق صورة' : 'Image Sticker'),
          snippet: result.summary,
          fullContent: result.detailedDescription,
          mediaUrl: dataUrl,
          metadata: { isAnimated, vibe: result.emotionOrVibe, text: result.inscribedText },
        });

        // Announce and auto-read concise summary
        announceToScreenReader(result.summary);
        speak(result.summary, isAr ? 'Arabic' : 'English');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Failed to process sticker file:', err);
      setIsAnalyzingSticker(false);
      toast.error(isAr ? 'فشل فحص الملصق' : 'Failed to analyze sticker');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 2. DOCUMENT SCANNER STATE (Multi-Page Camera & Filter)
  // ─────────────────────────────────────────────────────────────────────────
  const [scannedPages, setScannedPages] = useState<ScannedPageItem[]>([]);
  const [selectedScanFilter, setSelectedScanFilter] = useState<'color' | 'grayscale' | 'high_contrast' | 'binarize'>('high_contrast');
  const [isCapturingPage, setIsCapturingPage] = useState(false);
  const [isCompilingPdf, setIsCompilingPdf] = useState(false);
  const scanVideoRef = useRef<HTMLVideoElement>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Start / Stop Scanner Camera
  const startScannerCamera = async () => {
    try {
      if (scanStreamRef.current) {
        scanStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      scanStreamRef.current = stream;
      if (scanVideoRef.current) {
        scanVideoRef.current.srcObject = stream;
        await scanVideoRef.current.play();
      }
      setIsCameraActive(true);
      announceToScreenReader(isAr ? 'تم تشغيل كاميرا مسح المستندات' : 'Document scanner camera ready');
    } catch (err: any) {
      console.error('Camera access denied:', err);
      toast.error(isAr ? 'تعذر الوصول للكاميرا' : 'Camera access denied');
    }
  };

  const stopScannerCamera = () => {
    if (scanStreamRef.current) {
      scanStreamRef.current.getTracks().forEach((t) => t.stop());
      scanStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture Page from Video Stream
  const handleCapturePage = () => {
    if (!scanVideoRef.current || !scanCanvasRef.current) return;
    setIsCapturingPage(true);

    const video = scanVideoRef.current;
    const canvas = scanCanvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply document contrast/binarization filter
    applyScanFilter(ctx, canvas.width, canvas.height, selectedScanFilter);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const newPage: ScannedPageItem = {
      id: `page-${Date.now()}-${scannedPages.length + 1}`,
      pageNumber: scannedPages.length + 1,
      dataUrl,
      thumbnailUrl: dataUrl,
      width: canvas.width,
      height: canvas.height,
      filter: selectedScanFilter,
      capturedAt: Date.now(),
    };

    setScannedPages((prev) => [...prev, newPage]);
    setIsCapturingPage(false);

    const msg = isAr ? `تم التقاط الصفحة ${newPage.pageNumber}` : `Page ${newPage.pageNumber} captured`;
    toast.success(msg);
    announceToScreenReader(msg);
  };

  // Compile Scanned Pages into PDF
  const handleExportScannedPdf = async () => {
    if (scannedPages.length === 0) return;
    setIsCompilingPdf(true);

    try {
      const pdfBlob = await combinePagesIntoPdf(
        scannedPages.map((p) => ({
          dataUrl: p.dataUrl,
          width: p.width,
          height: p.height,
          pageNumber: p.pageNumber,
        })),
        isAr ? 'مستند ممسوح ضوئياً - كوجنيفاي' : 'Cognify Scanned Document'
      );

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cognify_Scan_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(isAr ? 'تم تصدير ملف PDF بنجاح 📄' : 'PDF exported successfully 📄');

      // Save to Activity Store
      saveToolkitActivity({
        type: 'scan',
        title: isAr ? `مسح ضوئي (${scannedPages.length} صفحة)` : `Document Scan (${scannedPages.length} Pages)`,
        snippet: isAr ? `تم دمج ${scannedPages.length} صفحة في مستند PDF قابل للطباعة.` : `Combined ${scannedPages.length} pages into PDF.`,
        metadata: { pageCount: scannedPages.length },
      });
    } catch (err: any) {
      console.error('Failed to compile PDF:', err);
      toast.error(isAr ? 'فشل تصدير ملف PDF' : 'Failed to export PDF');
    } finally {
      setIsCompilingPdf(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 3. PDF EVIDENCE ASSISTANT STATE
  // ─────────────────────────────────────────────────────────────────────────
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfTextContent, setPdfTextContent] = useState<string>('');
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfQuery, setPdfQuery] = useState('');
  const [isSearchingEvidence, setIsSearchingEvidence] = useState(false);
  const [evidenceResult, setEvidenceResult] = useState<DocumentEvidenceResult | null>(null);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    setEvidenceResult(null);

    try {
      const buffer = await file.arrayBuffer();
      if (file.name.endsWith('.pdf')) {
        const res = await extractTextFromPdf(buffer);
        if (res.valid && res.text) {
          setPdfTextContent(res.text);
          setPdfPages((res.pages || []).map((p: any) => typeof p === 'string' ? p : p.text || ''));
          toast.success(isAr ? `تم تحميل ${res.pageCount} صفحة بنجاح!` : `Loaded ${res.pageCount} pages!`);
          announceToScreenReader(isAr ? `تم فتح مستند ${file.name}` : `Opened document ${file.name}`);
        } else {
          toast.error(res.errorMessage || (isAr ? 'تعذر قراءة ملف PDF' : 'Failed to read PDF'));
        }
      } else if (file.name.endsWith('.docx')) {
        const res = await extractTextFromDocx(buffer);
        if (res.valid) {
          setPdfTextContent(res.text);
          setPdfPages([res.text]);
          toast.success(isAr ? 'تم استخراج نصوص المستند' : 'Document text extracted');
        }
      }
    } catch (err: any) {
      console.error('Failed to load PDF for evidence assistant:', err);
      toast.error(isAr ? 'فشل معالجة المستند' : 'Failed to process document');
    }
  };

  const handleAskEvidence = async () => {
    if (!pdfQuery.trim() || !pdfTextContent.trim()) return;
    setIsSearchingEvidence(true);

    try {
      const result = await queryPdfWithEvidence(pdfTextContent, pdfPages, pdfQuery, isAr ? 'ar' : 'en');
      setEvidenceResult(result);
      setIsSearchingEvidence(false);

      // Announce answer and quote
      const speakText = `${result.answer}. ${isAr ? 'الدليل من صفحة' : 'Evidence from page'} ${result.pageNumber}: ${result.evidenceQuote}`;
      announceToScreenReader(speakText);
      speak(speakText, isAr ? 'Arabic' : 'English');

      // Save activity
      saveToolkitActivity({
        type: 'pdf_doc',
        title: `${pdfFileName || 'Document'}: ${pdfQuery.substring(0, 30)}`,
        snippet: result.answer,
        fullContent: `[Evidence Quote - Page ${result.pageNumber}]: ${result.evidenceQuote}\n\n[Answer]: ${result.answer}`,
        metadata: { page: result.pageNumber, confidence: result.confidence },
      });
    } catch (err: any) {
      console.error('Evidence query error:', err);
      setIsSearchingEvidence(false);
      toast.error(isAr ? 'فشل البحث عن الدليل' : 'Failed to search evidence');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 4. UNIFIED ACTIVITY STORE & RECENT RESULTS
  // ─────────────────────────────────────────────────────────────────────────
  const [activityList, setActivityList] = useState<ToolkitActivityItem[]>([]);
  const loadActivities = () => {
    setActivityList(getToolkitActivities());
  };

  useEffect(() => {
    loadActivities();
  }, [activeCategory]);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. TRANSPARENT USAGE & QUOTA ALLOWANCES (PHASE 8)
  // ─────────────────────────────────────────────────────────────────────────
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageSnapshot, setUsageSnapshot] = useState<UserUsageSnapshot | null>(null);

  const loadUsageQuota = async () => {
    const snap = await fetchUserUsageQuota();
    setUsageSnapshot(snap);
  };

  useEffect(() => {
    if (showUsageModal) {
      loadUsageQuota();
    }
  }, [showUsageModal]);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0E1416] text-stone-100' : 'bg-[#FAF8F5] text-stone-900'
      }`}
    >
      {/* Hidden screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* ── TOP HEADER ── */}
      <header
        className={`px-4 py-3 shrink-0 flex items-center justify-between border-b transition-colors ${
          isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <Breadcrumbs
            items={getRouteBreadcrumbs({ view: 'toolkit' }, profile?.language)}
            onNavigate={(v) => {
              if (v === 'disability' && onNavigateBack) onNavigateBack();
            }}
            onNavigateBack={onNavigateBack}
            backLabel={isAr ? 'لوحة الميزات' : 'Hub'}
            isDarkMode={isDarkMode}
          />

          <div className="flex items-center gap-2.5 hidden md:flex">
            <div className="w-9 h-9 rounded-xl bg-teal-600/20 border border-teal-500/40 text-teal-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black leading-tight">
                {localize(profile.language, 'Integrated Accessibility Toolkit', 'منظومة الوصول المتكاملة والمساعد البصري')}
              </h1>
              <p className="text-[11px] text-stone-400">
                {localize(profile.language, 'Unified Vision, Document Scanner, PDF Assistant & Sticker Explainer', 'الرؤية، الماسح الضوئي، ومساعد المستندات وشرح الملصقات')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUsageModal(true)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-stone-800/80 hover:bg-stone-800 border-stone-700 text-teal-400'
                : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-800'
            }`}
            aria-label={localize(profile.language, 'View daily usage allowances and quota status', 'عرض حدود وحصص الاستخدام اليومية')}
          >
            <Gauge className="w-4 h-4" />
            <span className="hidden sm:inline">
              {localize(profile.language, 'Usage & Quotas', 'حصص الاستخدام')}
            </span>
          </button>
        </div>
      </header>

      {/* ── 5 UNIFIED CATEGORIES TABLIST ── */}
      <nav
        role="tablist"
        aria-label={localize(profile.language, 'Toolkit Categories', 'أقسام المنظومة الميسرة')}
        className={`px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
          isDarkMode ? 'bg-[#141F23] border-stone-800' : 'bg-stone-50 border-stone-200'
        }`}
      >
        {[
          { id: 'see_understand' as const, labelAr: '👁️ شاهد وافهم (ملصقات ومشاهد)', labelEn: '👁️ See & Understand (Stickers & Scene)' },
          { id: 'read_scan' as const, labelAr: '📄 اقرأ وامسح (سكانر و PDF)', labelEn: '📄 Read & Scan (Scanner & PDF)' },
          { id: 'listen_transcribe' as const, labelAr: '🎙️ استمع وفرّغ (المحاضرات)', labelEn: '🎙️ Listen & Transcribe' },
          { id: 'format_edu' as const, labelAr: '📖 استوديو الكتب والامتحانات', labelEn: '📖 Educational Book Studio' },
          { id: 'saved_activity' as const, labelAr: '🕒 السجل والنتائج المحفوظة', labelEn: '🕒 Saved Results & Activity' },
        ].map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setActiveCategory(cat.id);
                announceToScreenReader(localize(profile.language, cat.labelEn, cat.labelAr));
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-teal-700 text-white shadow-sm font-black'
                  : isDarkMode
                  ? 'text-stone-300 hover:text-white hover:bg-stone-800/60'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200'
              }`}
            >
              <span>{localize(profile.language, cat.labelEn, cat.labelAr)}</span>
            </button>
          );
        })}
      </nav>

      {/* ── TAB CONTENT REGION ── */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ═════════════════════════════════════════════════════════════════
              CATEGORY 1: SEE AND UNDERSTAND (IMAGES, WHATSAPP STICKERS & SCENES)
             ═════════════════════════════════════════════════════════════════ */}
          {activeCategory === 'see_understand' && (
            <div className="space-y-6">
              <div
                className={`p-6 rounded-3xl border ${
                  isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200'
                } shadow-sm space-y-4`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-stone-200 dark:border-stone-800">
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
                      <Sparkles className="w-5 h-5" />
                      <span>{localize(profile.language, 'WhatsApp Sticker & Image Explainer', 'شارح الملصقات (Stickers) والصور للمكفوفين')}</span>
                    </h2>
                    <p className="text-xs text-stone-400 mt-1">
                      {localize(
                        profile.language,
                        'Upload or paste any image/sticker (Ctrl+V). Describes emotions, characters, inscribed text, and cultural memes.',
                        'ارفع أي صورة أو ملصق واتساب أو الصقه مباشرة (Ctrl+V). يشرح المشاعر، والنص المكتوب، وتعبيرات الوجه.'
                      )}
                    </p>
                  </div>

                  {/* Concise / Detailed Toggle */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setStickerVerbosity('concise')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        stickerVerbosity === 'concise' ? 'bg-teal-700 text-white shadow-sm' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      {localize(profile.language, 'Concise', 'موجز')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStickerVerbosity('detailed')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        stickerVerbosity === 'detailed' ? 'bg-teal-700 text-white shadow-sm' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      {localize(profile.language, 'Detailed', 'تفصيلي')}
                    </button>
                  </div>
                </div>

                {/* Upload & Paste Dropzone */}
                <input
                  ref={stickerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleProcessStickerFile(f);
                  }}
                />

                <div
                  onClick={() => stickerInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDarkMode
                      ? 'border-stone-700 bg-stone-900/40 hover:border-teal-500/60 hover:bg-stone-900/70'
                      : 'border-stone-300 bg-stone-50 hover:border-teal-500/60 hover:bg-stone-100'
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={localize(profile.language, 'Upload or drop WhatsApp sticker or image file', 'رفع أو إفلات ملصق واتساب أو صورة')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      stickerInputRef.current?.click();
                    }
                  }}
                >
                  <Upload className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-pulse" />
                  <div>
                    <span className="text-sm font-bold block">
                      {localize(profile.language, 'Click to upload Sticker / Image or Paste (Ctrl+V)', 'اضغط لرفع الملصق أو ألصقه هنا مباشرة (Ctrl+V)')}
                    </span>
                    <span className="text-xs text-stone-400 mt-1 block">
                      {localize(profile.language, 'Supports WebP WhatsApp stickers, PNG, JPEG, and GIF', 'يدعم ملصقات WebP للواتساب، وصور PNG و JPEG')}
                    </span>
                  </div>
                </div>

                {/* Loading State */}
                {isAnalyzingSticker && (
                  <div className="flex items-center justify-center gap-3 py-6 text-teal-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-bold">
                      {localize(profile.language, 'Analyzing visual emotions and inscribed text...', 'جارٍ فحص تعبيرات الملصق والنص المكتوب...')}
                    </span>
                  </div>
                )}

                {/* Sticker Analysis Output */}
                {stickerResult && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-start gap-4">
                      {stickerDataUrl && (
                        <img
                          src={stickerDataUrl}
                          alt={localize(profile.language, 'Analyzed sticker preview', 'معاينة الملصق المفحوص')}
                          className="w-24 h-24 rounded-2xl object-contain bg-black/40 border border-stone-700 p-1 shrink-0"
                        />
                      )}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 text-xs font-bold">
                            {localize(profile.language, 'Tone / Emotion', 'المشاعر والنبرة')}: {stickerResult.emotionOrVibe || (isAr ? 'عفوية' : 'Neutral')}
                          </span>
                          {stickerResult.inscribedText && (
                            <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
                              {localize(profile.language, 'Inscribed Text', 'النص')}: "{stickerResult.inscribedText}"
                            </span>
                          )}
                          {stickerResult.isAnimated && (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                              {localize(profile.language, 'Animated WebP (Frame 1 analyzed)', 'ملصق متحرك (فُحص الإطار الأول)')}
                            </span>
                          )}
                        </div>

                        {/* Summary & Details */}
                        <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-[#162327]' : 'bg-stone-100'} space-y-2`}>
                          <p className="text-sm font-bold text-teal-600 dark:text-teal-400">{stickerResult.summary}</p>
                          <p className="text-xs text-stone-300 whitespace-pre-wrap leading-relaxed">
                            {stickerResult.detailedDescription}
                          </p>
                        </div>

                        {/* Actions: Speak Aloud, Copy, Repeat */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => speak(stickerResult.detailedDescription, isAr ? 'Arabic' : 'English')}
                            className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{localize(profile.language, 'Read Aloud', 'قراءة صوتية')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(stickerResult.detailedDescription);
                              toast.success(isAr ? 'تم نسخ الوصف' : 'Description copied');
                            }}
                            className="px-3 py-1.5 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-300 font-bold text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{localize(profile.language, 'Copy Text', 'نسخ الوصف')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              CATEGORY 2: READ AND SCAN (MULTI-PAGE SCANNER & PDF CREATOR)
             ═════════════════════════════════════════════════════════════════ */}
          {activeCategory === 'read_scan' && (
            <div className="space-y-6">
              <div
                className={`p-6 rounded-3xl border ${
                  isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200'
                } shadow-sm space-y-5`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-stone-200 dark:border-stone-800">
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
                      <Camera className="w-5 h-5" />
                      <span>{localize(profile.language, 'Multi-Page Document Scanner & PDF Creator', 'الماسح الضوئي متعدد الصفحات وصانع الـ PDF')}</span>
                    </h2>
                    <p className="text-xs text-stone-400 mt-1">
                      {localize(
                        profile.language,
                        'Capture pages using camera, enhance readability with high-contrast filters, and combine into a multi-page PDF.',
                        'التقط صفحات مستندك بالكاميرا، وحسّن وضوح الحروف بفلاتر التباين، واجمعها في ملف PDF أصلي.'
                      )}
                    </p>
                  </div>

                  {/* Filter selector */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-bold">
                    {(['high_contrast', 'binarize', 'grayscale', 'color'] as const).map((flt) => (
                      <button
                        key={flt}
                        type="button"
                        onClick={() => setSelectedScanFilter(flt)}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          selectedScanFilter === flt ? 'bg-teal-700 text-white shadow-sm' : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        {flt === 'high_contrast'
                          ? localize(profile.language, 'High Contrast', 'تباين عالي')
                          : flt === 'binarize'
                          ? localize(profile.language, 'Black & White', 'أبيض وأسود')
                          : flt === 'grayscale'
                          ? localize(profile.language, 'Grayscale', 'رمادي')
                          : localize(profile.language, 'Color', 'ألوان')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Camera Viewport or Start Button */}
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={scanVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                  />
                  <canvas ref={scanCanvasRef} className="hidden" />

                  {!isCameraActive ? (
                    <button
                      type="button"
                      onClick={startScannerCamera}
                      className="px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span>{localize(profile.language, 'Start Document Scanner Camera', 'تشغيل كاميرا الماسح الضوئي')}</span>
                    </button>
                  ) : (
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleCapturePage}
                        disabled={isCapturingPage}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black text-sm flex items-center gap-2 shadow-xl active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{localize(profile.language, 'Capture Page', 'التقاط الصفحة')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopScannerCamera}
                        className="p-3 rounded-2xl bg-stone-900/80 hover:bg-stone-900 text-white font-bold text-sm border border-stone-700 cursor-pointer"
                        aria-label={localize(profile.language, 'Stop Camera', 'إيقاف الكاميرا')}
                        title={localize(profile.language, 'Stop Camera', 'إيقاف الكاميرا')}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Captured Pages Gallery */}
                {scannedPages.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-stone-400">
                        {localize(profile.language, 'Scanned Pages', 'الصفحات الملتقطة')} ({scannedPages.length})
                      </h3>
                      <button
                        type="button"
                        onClick={handleExportScannedPdf}
                        disabled={isCompilingPdf}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          {isCompilingPdf
                            ? localize(profile.language, 'Compiling PDF...', 'جارٍ دمج الـ PDF...')
                            : localize(profile.language, 'Combine & Download PDF', 'دمج وتنزيل كملف PDF')}
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {scannedPages.map((p, idx) => (
                        <div
                          key={p.id}
                          className="relative rounded-2xl overflow-hidden border border-stone-700 group bg-black/40"
                        >
                          <img src={p.thumbnailUrl} alt={`Page ${idx + 1}`} className="w-full h-32 object-cover" />
                          <div className="absolute top-2 start-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-bold">
                            #{idx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => setScannedPages((prev) => prev.filter((item) => item.id !== p.id))}
                            className="absolute top-2 end-2 p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-opacity cursor-pointer"
                            title={localize(profile.language, 'Delete Page', 'حذف الصفحة')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Evidence Assistant inside Read & Scan */}
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#162327] border-stone-800' : 'bg-stone-50 border-stone-200'} space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-400">
                      <FileText className="w-4 h-4" />
                      <span>{localize(profile.language, 'PDF Evidence Q&A Assistant', 'مساعد البحث والاستشهاد بأدلة PDF')}</span>
                    </h3>
                    <label className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm">
                      <FileUp className="w-3.5 h-3.5" />
                      <span>{localize(profile.language, 'Upload PDF / DOCX', 'رفع مستند')}</span>
                      <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handlePdfUpload} />
                    </label>
                  </div>

                  {pdfFileName && (
                    <div className="text-xs text-stone-400">
                      {localize(profile.language, 'Loaded document', 'المستند الحالي')}: <span className="text-white font-bold">{pdfFileName}</span>
                    </div>
                  )}

                  {pdfTextContent && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pdfQuery}
                          onChange={(e) => setPdfQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAskEvidence()}
                          placeholder={localize(
                            profile.language,
                            'Ask any question (e.g. "What is the passing grade according to page 2?")...',
                            'اطرح سؤالاً عن المستند (مثال: ما هي شروط النجاح وفقاً للصفحة 2؟)...'
                          )}
                          className={`flex-1 px-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDarkMode ? 'bg-[#121B1E] border-stone-700 text-white' : 'bg-white border-stone-300 text-stone-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleAskEvidence}
                          disabled={isSearchingEvidence || !pdfQuery.trim()}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          {isSearchingEvidence ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          <span>{localize(profile.language, 'Find Evidence', 'استخراج الدليل')}</span>
                        </button>
                      </div>

                      {evidenceResult && (
                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-[#1A262B]' : 'bg-white border border-stone-200'} space-y-2`}>
                          <p className="text-sm font-bold text-white">{evidenceResult.answer}</p>
                          {evidenceResult.evidenceQuote && (
                            <blockquote className="border-s-2 border-indigo-500 ps-3 text-xs italic text-stone-300 my-2">
                              "{evidenceResult.evidenceQuote}"
                            </blockquote>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-stone-400">
                            <span>
                              {localize(profile.language, 'Page', 'الصفحة')}: <strong className="text-indigo-400">{evidenceResult.pageNumber}</strong>
                            </span>
                            {evidenceResult.sectionHeading && (
                              <span>
                                {localize(profile.language, 'Section', 'القسم')}: <strong>{evidenceResult.sectionHeading}</strong>
                              </span>
                            )}
                            <span>
                              {localize(profile.language, 'Certainty', 'الدقة')}: {evidenceResult.confidence}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              CATEGORY 3: LISTEN AND TRANSCRIBE (AUDIO LECTURES & SPEECH)
             ═════════════════════════════════════════════════════════════════ */}
          {activeCategory === 'listen_transcribe' && (
            <div className="space-y-6">
              <div
                className={`p-6 rounded-3xl border ${
                  isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200'
                } shadow-sm space-y-4`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-stone-800">
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
                      <Headphones className="w-5 h-5" />
                      <span>{localize(profile.language, 'Accessible Lecture & Audio Transcriber', 'تفريغ المحاضرات الصوتية الميسر')}</span>
                    </h2>
                    <p className="text-xs text-stone-400 mt-1">
                      {localize(
                        profile.language,
                        'Upload voice lectures, generate searchable paragraphs, and replay synchronized audio segments.',
                        'ارفع تسجيلات المحاضرات واستخرج نصوصاً دقيقة قابلة للبحث وقراءة الفقرات صوتياً.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-center py-8 space-y-3">
                  <p className="text-sm font-bold text-stone-300">
                    {localize(
                      profile.language,
                      'Integrated with Cognify Audio Transcription Engine (Phase 3). Fully accessible with screen readers.',
                      'مدمج بالكامل مع محرك تفريغ المحاضرات الصوتي المطور في المرحلة الثالثة.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenBookStudio) onOpenBookStudio('', 'Lecture Notes');
                      else window.location.hash = '#book_studio';
                    }}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{localize(profile.language, 'Format Transcripts in Book Studio', 'تنسيق المحاضرة في استوديو الكتب')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              CATEGORY 4: FORMAT EDUCATIONAL DOCUMENTS (BOOK STUDIO LINK)
             ═════════════════════════════════════════════════════════════════ */}
          {activeCategory === 'format_edu' && (
            <div className="space-y-6">
              <div
                className={`p-6 rounded-3xl border ${
                  isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200'
                } shadow-sm space-y-4`}
              >
                <div className="border-b pb-4 border-stone-200 dark:border-stone-800">
                  <h2 className="text-base font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
                    <BookOpen className="w-5 h-5" />
                    <span>{localize(profile.language, 'Accessible Educational Book Studio', 'استوديو الكتب والمستندات الميسرة')}</span>
                  </h2>
                  <p className="text-xs text-stone-400 mt-1">
                    {localize(
                      profile.language,
                      '8 Educational Presets, Real Word (.docx) styles, TOC, cover page, and question recognition.',
                      '8 قوالب تعليمية، وتنسيق Word (.docx) أصلي، وفهرس محتويات، والتعرف على الأسئلة لقارئات الشاشة.'
                    )}
                  </p>
                </div>

                <div className="text-center py-8 space-y-4">
                  <p className="text-sm font-bold text-stone-300">
                    {localize(
                      profile.language,
                      'Launch the dedicated Accessible Book Studio for non-visual editing and native DOCX generation.',
                      'انتقل إلى استوديو الكتب التعليمية لتنسيق الفصول والأسئلة وتصدير ملفات DOCX الأصلية.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenBookStudio) onOpenBookStudio();
                      else window.location.hash = '#book_studio';
                    }}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm inline-flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>{localize(profile.language, 'Open Book Studio Now', 'فتح استوديو الكتب الآن 📖')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              CATEGORY 5: SAVED RESULTS AND RECENT ACTIVITY HUB
             ═════════════════════════════════════════════════════════════════ */}
          {activeCategory === 'saved_activity' && (
            <div className="space-y-6">
              <div
                className={`p-6 rounded-3xl border ${
                  isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200'
                } shadow-sm space-y-4`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-stone-800">
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
                      <Clock className="w-5 h-5" />
                      <span>{localize(profile.language, 'Saved Results & Recent Activity', 'النتائج المحفوظة وسجل النشاط')}</span>
                    </h2>
                    <p className="text-xs text-stone-400 mt-1">
                      {localize(
                        profile.language,
                        'Instant audio replay, re-export, and review of all your past scans, sticker analyses, and OCR notes.',
                        'إعادة استماع صوتية، وتصدير ومراجعة لكافة عمليات المسح وتحليل الملصقات والملاحظات السابقة.'
                      )}
                    </p>
                  </div>

                  {activityList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        clearToolkitActivities();
                        setActivityList([]);
                        toast.info(isAr ? 'تم مسح السجل' : 'Activity cleared');
                      }}
                      className="px-3 py-1.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold cursor-pointer"
                    >
                      {localize(profile.language, 'Clear All', 'مسح الكل')}
                    </button>
                  )}
                </div>

                {activityList.length === 0 ? (
                  <div className="text-center py-10 text-stone-400 text-sm">
                    {localize(profile.language, 'No saved activity yet. Analyze a sticker or scan a document to see results here.', 'لا توجد نتائج محفوظة بعد. قم بفحص ملصق أو مسح مستند ليظهر هنا.')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityList.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border ${
                          isDarkMode ? 'bg-[#162327] border-stone-800' : 'bg-stone-50 border-stone-200'
                        } flex items-start justify-between gap-3`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-400 text-[10px] font-bold uppercase">
                              {item.type}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-white">{item.title}</h4>
                            <span className="text-[10px] text-stone-400">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-stone-300 line-clamp-2">{item.snippet}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => speak(item.snippet, isAr ? 'Arabic' : 'English')}
                            className="p-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white cursor-pointer"
                            aria-label={localize(profile.language, 'Read Aloud', 'قراءة صوتية')}
                            title={localize(profile.language, 'Read Aloud', 'قراءة صوتية')}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.fullContent || item.snippet);
                              toast.success(isAr ? 'تم النسخ' : 'Copied');
                            }}
                            className="p-2 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-300 cursor-pointer"
                            aria-label={localize(profile.language, 'Copy Text', 'نسخ النص')}
                            title={localize(profile.language, 'Copy Text', 'نسخ النص')}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              deleteToolkitActivity(item.id);
                              loadActivities();
                            }}
                            className="p-2 rounded-xl border border-red-500/40 hover:bg-red-500/20 text-red-400 cursor-pointer"
                            aria-label={localize(profile.language, 'Delete', 'حذف')}
                            title={localize(profile.language, 'Delete', 'حذف')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── USAGE & QUOTAS ACCESSIBLE MODAL (PHASE 8) ── */}
      <AnimatePresence>
        {showUsageModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usage-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-xl rounded-3xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
                isDarkMode ? 'bg-[#121B1E] border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-700/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center">
                    <Gauge className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h2 id="usage-modal-title" className="text-base font-black">
                      {localize(profile.language, 'Daily Assistive Allowances', 'الحصص وحدود الاستخدام اليومية')}
                    </h2>
                    <p className="text-xs text-stone-400">
                      {usageSnapshot
                        ? localize(
                            profile.language,
                            `Resets every day at 00:00 UTC (in ~${Math.ceil(usageSnapshot.resetInSeconds / 3600)} hours)`,
                            `تتجدد تلقائياً يومياً عند منتصف الليل بتوقيت UTC (خلال ~${Math.ceil(usageSnapshot.resetInSeconds / 3600)} ساعة)`
                          )
                        : localize(profile.language, 'Calculating allowances...', 'جاري حساب الحصص...')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="p-2 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
                  aria-label={localize(profile.language, 'Close Usage Dialog', 'إغلاق نافذة الحصص')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 pt-4">
                {Object.entries(ASSISTIVE_QUOTAS).map(([key, def]) => {
                  const catUsage = usageSnapshot?.categories?.[key as any] || {
                    dailyUsed: 0,
                    dailyLimit: def.dailyAllowance,
                    dailyRemaining: def.dailyAllowance,
                    percentageUsed: 0,
                  };
                  const pct = Math.min(100, Math.round((catUsage.dailyUsed / catUsage.dailyLimit) * 100));

                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-2xl border ${
                        isDarkMode ? 'bg-stone-900/40 border-stone-800' : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold">
                          {localize(profile.language, def.nameEn, def.nameAr)}
                        </span>
                        <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                          {catUsage.dailyRemaining} {localize(profile.language, 'remaining', 'متبقي')} / {catUsage.dailyLimit}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mb-2.5">
                        {localize(profile.language, def.descriptionEn, def.descriptionAr)}
                      </p>
                      <div
                        className="w-full bg-stone-700/30 rounded-full h-2 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={localize(profile.language, `${def.nameEn} usage progress: ${pct}%`, `نسبة استهلاك ${def.nameAr}: ${pct}%`)}
                      >
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            pct >= 90 ? 'bg-amber-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-700 dark:text-teal-300">
                <p className="leading-relaxed">
                  {localize(
                    profile.language,
                    '💡 Cognify allowances are generous and designed for intensive university lectures, homework, and continuous navigation. If any single quota is reached, other assistive tools continue to work uninterrupted.',
                    '💡 حصص كوجنيفاي سخية ومصممة لدعم المحاضرات الجامعية اليومية، والمذاكرة، والتنقل المستمر. إذا اكتملت حصة أي ميزة، تظل باقي الأدوات المساعدة تعمل دون توقف.'
                  )}
                </p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer"
                  aria-label={localize(profile.language, 'Done', 'تم')}
                >
                  {localize(profile.language, 'Done', 'تم')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
