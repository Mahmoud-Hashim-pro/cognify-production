import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Copy,
  Download,
  Search,
  BookOpen,
  FileText,
  Sparkles,
  Trash2,
  Bookmark,
  Edit2,
  Check,
  AlertCircle,
  WifiOff,
  Volume2,
  ArrowDown,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  TranscriptSegment,
  CaptionVisualSettings,
  CaptionTheme,
  CaptionTextSize,
  RecognitionState,
  RecognitionError,
  TranscriptSummary,
} from '../types';
import type { Dialect } from '../../types';
import { ConversationEngine } from '../conversationEngine';
import { SpeechRecognitionService } from '../speechRecognitionService';
import { CaptionSettingsModal } from './CaptionSettingsModal';
import { VocabularyModal } from './VocabularyModal';
import { NotesModal } from './NotesModal';

interface CaptionInterfaceProps {
  engine: ConversationEngine;
  language?: string;
  className?: string;
}

export const CaptionInterface: React.FC<CaptionInterfaceProps> = ({
  engine,
  language = 'ar',
  className = '',
}) => {
  const isAr = language === 'ar' || language === 'ar-SA' || language === 'ar-EG';

  // Engine state
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState('');
  const [recognitionState, setRecognitionState] = useState<RecognitionState>('idle');
  const [activeError, setActiveError] = useState<RecognitionError | null>(null);

  // Active settings
  const [visualSettings, setVisualSettings] = useState<CaptionVisualSettings>(engine.getVisualSettings());
  const [selectedDialect, setSelectedDialect] = useState<Dialect>('Arabic');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<TranscriptSummary | null>(null);

  // Editing state
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // UI feedback
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to engine changes
  useEffect(() => {
    const unsubSegments = engine.subscribe((list) => {
      setSegments(list);
    });

    const unsubStream = engine.subscribeStream((text) => {
      setInterimText(text);
    });

    const unsubState = engine.speechService.subscribeState((st, err) => {
      setRecognitionState(st);
      if (err) {
        setActiveError(err);
      } else if (st === 'listening') {
        setActiveError(null);
      }
    });

    return () => {
      unsubSegments();
      unsubStream();
      unsubState();
    };
  }, [engine]);

  // Auto-scroll handler
  useEffect(() => {
    if (!visualSettings.autoScroll || isScrolledUp) return;
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [segments, interimText, visualSettings.autoScroll, isScrolledUp]);

  // Handle scroll listener to detect if user scrolled up
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrolledUp(distanceToBottom > 60);
  };

  const scrollToBottom = () => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      setIsScrolledUp(false);
    }
  };

  // Keyboard Shortcuts: Alt+P (pause/resume), Alt+C (clear), Alt+S (search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyP') {
        e.preventDefault();
        toggleListening();
      } else if (e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        setIsClearConfirmOpen(true);
      } else if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recognitionState]);

  // Start / Pause / Resume controls
  const toggleListening = async () => {
    if (recognitionState === 'listening' || recognitionState === 'processing') {
      engine.pauseListening();
    } else if (recognitionState === 'paused') {
      engine.resumeListening();
    } else {
      await engine.startListening(selectedDialect);
    }
  };

  const handleStop = () => {
    engine.stopListening();
  };

  const handleCopyTranscript = () => {
    const text = engine.exportTranscript('txt');
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleExport = (format: 'txt' | 'markdown' | 'json') => {
    const content = engine.exportTranscript(format);
    const mime = format === 'json' ? 'application/json' : 'text/plain';
    const ext = format === 'markdown' ? 'md' : format;
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rafiqi-transcript-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartEdit = (seg: TranscriptSegment) => {
    setEditingSegmentId(seg.id);
    setEditingText(seg.text);
  };

  const handleSaveEdit = (id: string) => {
    engine.updateSegmentText(id, editingText);
    setEditingSegmentId(null);
  };

  // Theme-specific CSS styling classes
  const getThemeStyles = (theme: CaptionTheme) => {
    switch (theme) {
      case 'dark_high_contrast':
        return {
          containerBg: 'bg-black text-white border-2 border-[#FFE500]',
          itemBg: 'bg-[#121212] border-2 border-[#FFE500]',
          speakerColor: 'text-[#FFE500]',
          interimBg: 'bg-[#1A1A1A] border-2 border-dashed border-[#00F0FF] text-[#00F0FF]',
          accentText: 'text-[#FFE500]',
        };
      case 'light_high_contrast':
        return {
          containerBg: 'bg-white text-[#051329] border-2 border-[#051329]',
          itemBg: 'bg-[#F4F7FB] border-2 border-[#051329]',
          speakerColor: 'text-[#1769AA]',
          interimBg: 'bg-[#E3F2FD] border-2 border-dashed border-[#1769AA] text-[#051329]',
          accentText: 'text-[#1769AA]',
        };
      case 'amber_on_black':
        return {
          containerBg: 'bg-black text-[#FFB800] border-2 border-[#FFB800]',
          itemBg: 'bg-[#111111] border border-[#FFB800]/50',
          speakerColor: 'text-[#FFA000]',
          interimBg: 'bg-[#1C1500] border-2 border-dashed border-[#FFB800] text-[#FFB800]',
          accentText: 'text-[#FFB800]',
        };
      case 'yellow_on_navy':
        return {
          containerBg: 'bg-[#0A192F] text-[#FFFF00] border-2 border-[#FFFF00]',
          itemBg: 'bg-[#071322] border border-[#FFFF00]/40',
          speakerColor: 'text-[#12CFE0]',
          interimBg: 'bg-[#0E2038] border-2 border-dashed border-[#FFFF00] text-[#FFFF00]',
          accentText: 'text-[#FFFF00]',
        };
      case 'blue_companion':
      default:
        return {
          containerBg: 'bg-[#071B33] text-[#F4F7FB] border border-[#12CFE0]/30',
          itemBg: 'bg-[#102D4D]/80 border border-[#12CFE0]/20',
          speakerColor: 'text-[#12CFE0]',
          interimBg: 'bg-[#0D2542] border-2 border-dashed border-[#12CFE0]/60 text-[#12CFE0]',
          accentText: 'text-[#12CFE0]',
        };
    }
  };

  const getTextSizeClass = (size: CaptionTextSize) => {
    switch (size) {
      case 'huge':
        return 'text-2xl sm:text-3xl leading-relaxed';
      case 'extra_large':
        return 'text-xl sm:text-2xl leading-relaxed';
      case 'large':
        return 'text-lg sm:text-xl leading-normal';
      case 'standard':
      default:
        return 'text-base sm:text-lg leading-normal';
    }
  };

  const themeStyle = getThemeStyles(visualSettings.theme);
  const sizeClass = getTextSizeClass(visualSettings.textSize);

  // Filtered segments based on search and bookmarks
  const displayedSegments = segments.filter((s) => {
    if (showBookmarksOnly && !s.isBookmarked) return false;
    if (searchQuery.trim()) {
      return (
        s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.originalText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div
      className={`flex flex-col h-full rounded-2xl shadow-xl overflow-hidden ${themeStyle.containerBg} ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ─── Top Controls & Status Bar ────────────────────────────────────────────── */}
      <header className="p-3 sm:p-4 border-b border-inherit/20 bg-inherit/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Mic Status Indicator & Dialect Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main Action Toggle: Start / Pause / Resume */}
          <button
            type="button"
            onClick={toggleListening}
            aria-label={
              recognitionState === 'listening' || recognitionState === 'processing'
                ? isAr ? 'إيقاف مؤقت للترجمة' : 'Pause captions'
                : isAr ? 'بدء تشغيل الترجمة الفورية' : 'Start live captions'
            }
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md min-h-[44px] min-w-[44px] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12CFE0] ${
              recognitionState === 'listening' || recognitionState === 'processing'
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : recognitionState === 'paused'
                  ? 'bg-amber-500 hover:bg-amber-600 text-black font-extrabold'
                  : 'bg-[#1769AA] hover:bg-[#076D78] text-white'
            }`}
          >
            {recognitionState === 'listening' || recognitionState === 'processing' ? (
              <>
                <Pause className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isAr ? 'إيقاف مؤقت' : 'Pause'}</span>
              </>
            ) : recognitionState === 'paused' ? (
              <>
                <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isAr ? 'استئناف الاستماع' : 'Resume'}</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isAr ? 'تشغيل الترجمة الفورية' : 'Start Captions'}</span>
              </>
            )}
          </button>

          {/* Stop Button (When listening or paused) */}
          {(recognitionState === 'listening' || recognitionState === 'processing' || recognitionState === 'paused') && (
            <button
              type="button"
              onClick={handleStop}
              aria-label={isAr ? 'إنهاء الاستماع' : 'Stop listening'}
              className="p-2.5 rounded-xl bg-inherit/40 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-rose-400"
              title={isAr ? 'إيقاف كامل' : 'Stop completely'}
            >
              <MicOff className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {/* Language Selector */}
          <select
            value={selectedDialect}
            onChange={(e) => {
              const d = e.target.value as Dialect;
              setSelectedDialect(d);
              if (recognitionState === 'listening') {
                engine.startListening(d);
              }
            }}
            disabled={recognitionState === 'listening'}
            aria-label={isAr ? 'اختيار لغة التعرف' : 'Select recognition language'}
            className="bg-[#102D4D] border border-inherit/30 text-xs font-bold rounded-xl px-3 py-2 text-[#F4F7FB] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#12CFE0]"
          >
            <option value="Arabic">العربية الفصحى (ar-SA)</option>
            <option value="Egyptian Ammiya">العامية المصرية (ar-EG)</option>
            <option value="English">English (en-US)</option>
          </select>

          {/* Privacy badge */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400"
            title={isAr ? 'لا يتم تخزين أي صوت خام على الخوادم' : 'Raw audio is never recorded or stored'}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{isAr ? 'صوت غير مسجل' : 'Zero Audio Storage'}</span>
          </div>
        </div>

        {/* Right: Tools & Utilities */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Quick Copy */}
          <button
            type="button"
            onClick={handleCopyTranscript}
            disabled={segments.length === 0}
            aria-label={isAr ? 'نسخ النص المترجم' : 'Copy transcript'}
            className="p-2.5 rounded-xl bg-inherit/40 hover:bg-[#102D4D] text-inherit border border-inherit/25 transition-colors disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
            title={isAr ? 'نسخ النص' : 'Copy text'}
          >
            {copiedNotification ? (
              <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              type="button"
              disabled={segments.length === 0}
              aria-label={isAr ? 'تصدير النص' : 'Export transcript'}
              className="p-2.5 rounded-xl bg-inherit/40 hover:bg-[#102D4D] text-inherit border border-inherit/25 transition-colors disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
              title={isAr ? 'تصدير' : 'Export'}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="hidden group-hover:flex group-focus-within:flex flex-col absolute top-full right-0 mt-1 w-32 bg-[#071B33] border border-[#12CFE0]/40 rounded-xl p-1 shadow-2xl z-20">
              <button
                type="button"
                onClick={() => handleExport('txt')}
                className="px-3 py-2 text-xs font-bold text-left hover:bg-[#102D4D] rounded-lg text-[#F4F7FB]"
              >
                Text (.txt)
              </button>
              <button
                type="button"
                onClick={() => handleExport('markdown')}
                className="px-3 py-2 text-xs font-bold text-left hover:bg-[#102D4D] rounded-lg text-[#F4F7FB]"
              >
                Markdown (.md)
              </button>
              <button
                type="button"
                onClick={() => handleExport('json')}
                className="px-3 py-2 text-xs font-bold text-left hover:bg-[#102D4D] rounded-lg text-[#F4F7FB]"
              >
                JSON (.json)
              </button>
            </div>
          </div>

          {/* Vocabulary Editor */}
          <button
            type="button"
            onClick={() => setIsVocabOpen(true)}
            aria-label={isAr ? 'المفردات المخصصة' : 'Custom vocabulary'}
            className="p-2.5 rounded-xl bg-inherit/40 hover:bg-[#102D4D] text-inherit border border-inherit/25 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
            title={isAr ? 'قاموس المفردات المخصصة' : 'Custom Vocabulary'}
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Notes Modal */}
          <button
            type="button"
            onClick={() => setIsNotesOpen(true)}
            aria-label={isAr ? 'ملاحظات المحادثة' : 'Conversation notes'}
            className="p-2.5 rounded-xl bg-inherit/40 hover:bg-[#102D4D] text-inherit border border-inherit/25 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
            title={isAr ? 'تدوين ملاحظات' : 'Take notes'}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Conversation Summary */}
          <button
            type="button"
            onClick={() => setSummaryData(engine.generateSummary())}
            disabled={segments.length === 0}
            aria-label={isAr ? 'ملخص المحادثة' : 'Conversation summary'}
            className="p-2.5 rounded-xl bg-inherit/40 hover:bg-[#102D4D] text-inherit border border-inherit/25 transition-colors disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
            title={isAr ? 'إنشاء ملخص للمحادثة' : 'Summarize conversation'}
          >
            <Sparkles className="w-4 h-4 text-[#12CFE0]" aria-hidden="true" />
          </button>

          {/* Caption Settings Modal */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label={isAr ? 'إعدادات الخط والتباين والخصوصية' : 'Settings'}
            className="p-2.5 rounded-xl bg-inherit/40 hover:bg-[#102D4D] text-inherit border border-inherit/25 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#12CFE0]"
            title={isAr ? 'إعدادات النص والتباين' : 'Visual & Contrast Settings'}
          >
            <Sliders className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Clear Transcript with confirmation */}
          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            disabled={segments.length === 0}
            aria-label={isAr ? 'مسح المحادثة' : 'Clear transcript'}
            className="p-2.5 rounded-xl bg-inherit/40 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-rose-400"
            title={isAr ? 'مسح كل النصوص' : 'Clear all'}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ─── Search & Bookmark Filter Bar ─────────────────────────────────────────── */}
      <div className="px-3 py-2 border-b border-inherit/15 bg-inherit/60 flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-inherit/50 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في نصوص المحادثة (Alt+S)…' : 'Search transcript (Alt+S)…'}
            className="w-full bg-[#102D4D]/70 border border-inherit/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-inherit placeholder:text-inherit/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:border-[#12CFE0]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label={isAr ? 'مسح البحث' : 'Clear search'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-inherit/60 hover:text-inherit"
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowBookmarksOnly((prev) => !prev)}
          className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all min-h-[36px] ${
            showBookmarksOnly
              ? 'bg-[#1769AA] border-[#12CFE0] text-white shadow-sm'
              : 'bg-inherit/40 border-inherit/20 text-inherit/70 hover:bg-[#102D4D]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isAr ? 'المميزة بنجمة' : 'Starred'}</span>
        </button>
      </div>

      {/* ─── Active Error or Notification Banner ──────────────────────────────────── */}
      {activeError && (
        <div
          role="alert"
          className="p-3 bg-rose-950/80 border-b border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 shrink-0"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-bold">{isAr ? activeError.messageAr : activeError.messageEn}</p>
            <p className="text-xs text-rose-300/80 mt-0.5">
              {isAr ? activeError.suggestedActionAr : activeError.suggestedActionEn}
            </p>
          </div>
          <button
            onClick={() => setActiveError(null)}
            aria-label={isAr ? 'إغلاق التنبيه' : 'Dismiss error'}
            className="p-1 hover:bg-rose-900 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── Scrollable Captions Timeline ─────────────────────────────────────────── */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        role="region"
        aria-live="polite"
        aria-atomic="false"
        aria-label={isAr ? 'نصوص الترجمة الفورية' : 'Live captions transcript region'}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative"
      >
        {displayedSegments.length === 0 && !interimText && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-inherit/50 gap-3">
            <Mic className="w-10 h-10 opacity-40" aria-hidden="true" />
            <h3 className="text-base font-bold text-inherit">
              {isAr ? 'الترجمة الفورية جاهزة للاستماع' : 'Live Captions Ready'}
            </h3>
            <p className="text-xs max-w-sm leading-relaxed">
              {isAr
                ? 'اضغط على زر "تشغيل الترجمة الفورية" بالأعلى للبدء في قراءة الكلام المنطوق في الوقت الفعلي مع ضبط الخط والتباين والخصوصية.'
                : 'Click "Start Captions" above to follow spoken conversation in real time with adjustable contrast, font scaling, and privacy controls.'}
            </p>
          </div>
        )}

        {/* Finalized Segments */}
        {displayedSegments.map((seg) => (
          <article
            key={seg.id}
            dir={seg.direction}
            className={`p-3.5 sm:p-4 rounded-2xl transition-all ${themeStyle.itemBg} ${
              seg.isBookmarked ? 'ring-2 ring-amber-400/50' : ''
            }`}
          >
            {/* Meta Row: Speaker, Time, Actions */}
            <div className="flex items-center justify-between text-xs mb-1.5 opacity-80 gap-2">
              <div className="flex items-center gap-2">
                {visualSettings.showSpeakerLabels && (
                  <span className={`font-extrabold ${themeStyle.speakerColor}`}>
                    {seg.speakerLabel}
                  </span>
                )}
                {visualSettings.showTimestamps && (
                  <span className="text-xs font-mono opacity-60">
                    {new Date(seg.timestamp).toLocaleTimeString()}
                  </span>
                )}
                {seg.isEdited && (
                  <span className="text-xs px-1.5 py-0.2 rounded bg-inherit/50 border border-inherit/20 text-[#12CFE0]">
                    {isAr ? 'معدل' : 'edited'}
                  </span>
                )}
                {seg.isLowConfidence && (
                  <span
                    className="text-xs px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300"
                    title={isAr ? 'دقة السمع منخفضة (يرجى التحقق)' : 'Low audio confidence'}
                  >
                    {isAr ? 'صوت غير واضح' : 'low confidence'}
                  </span>
                )}
              </div>

              {/* Segment Actions */}
              <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                {/* Text-to-Speech Speak */}
                <button
                  type="button"
                  onClick={() => engine.speak(seg.text, seg.dialect)}
                  aria-label={isAr ? 'قراءة النص بصوت عالٍ' : 'Speak text aloud'}
                  className="p-1 rounded hover:bg-inherit/40 text-inherit"
                  title={isAr ? 'نطق' : 'Speak'}
                >
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                {/* Bookmark Toggle */}
                <button
                  type="button"
                  onClick={() => engine.toggleBookmark(seg.id)}
                  aria-label={seg.isBookmarked ? (isAr ? 'إزالة النجمة' : 'Unstar') : (isAr ? 'تمييز بنجمة' : 'Star')}
                  className={`p-1 rounded hover:bg-inherit/40 ${
                    seg.isBookmarked ? 'text-amber-400' : 'text-inherit'
                  }`}
                  title={isAr ? 'تمييز' : 'Star'}
                >
                  <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                {/* Edit Segment Button */}
                <button
                  type="button"
                  onClick={() => handleStartEdit(seg)}
                  aria-label={isAr ? 'تعديل النص' : 'Edit segment'}
                  className="p-1 rounded hover:bg-inherit/40 text-inherit"
                  title={isAr ? 'تعديل' : 'Edit'}
                >
                  <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Segment Content (Display or Inline Edit Form) */}
            {editingSegmentId === seg.id ? (
              <div className="space-y-2 mt-2">
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full bg-[#071B33] border border-[#12CFE0] rounded-xl p-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
                  autoFocus
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setEditingSegmentId(null)}
                    className="px-3 py-1.5 rounded-lg bg-inherit/40 text-inherit"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => handleSaveEdit(seg.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#1769AA] text-white font-bold"
                  >
                    {isAr ? 'حفظ التعديل' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className={`font-semibold tracking-wide ${sizeClass}`}>{seg.text}</p>
            )}
          </article>
        ))}

        {/* Real-Time Live Interim Stream Preview */}
        {interimText && (
          <div
            dir={ConversationEngine.detectDirection(interimText, selectedDialect)}
            className={`p-3.5 sm:p-4 rounded-2xl italic ${themeStyle.interimBg}`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase mb-1 opacity-80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{isAr ? 'جاري الاستماع الآن…' : 'Listening now…'}</span>
            </div>
            <p className={`font-medium ${sizeClass}`}>
              {interimText}
              <span className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse" />
            </p>
          </div>
        )}
      </main>

      {/* Floating "Scroll to Bottom" pill */}
      {isScrolledUp && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            type="button"
            onClick={scrollToBottom}
            className="py-1.5 px-4 rounded-full bg-[#1769AA] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xl border border-[#12CFE0] hover:bg-[#076D78] transition-all"
          >
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isAr ? 'الانتقال إلى أحدث الكلام' : 'Jump to latest'}</span>
          </button>
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────────────────── */}
      <CaptionSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        visualSettings={visualSettings}
        privacySettings={engine.getPrivacySettings()}
        onUpdateVisual={(upd) => {
          engine.updateVisualSettings(upd);
          setVisualSettings(engine.getVisualSettings());
        }}
        onUpdatePrivacy={(policy) => {
          engine.setRetentionPolicy(policy);
        }}
        language={language}
      />

      <VocabularyModal
        isOpen={isVocabOpen}
        onClose={() => setIsVocabOpen(false)}
        items={engine.vocabulary.getItems()}
        onAddItem={(orig, rep, note) => {
          engine.vocabulary.addItem(orig, rep, note);
        }}
        onRemoveItem={(id) => {
          engine.vocabulary.removeItem(id);
        }}
        language={language}
      />

      <NotesModal
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        notes={engine.getNotes()}
        onAddNote={(txt) => engine.addNote(txt)}
        onRemoveNote={(id) => engine.removeNote(id)}
        language={language}
      />

      {/* Clear Confirmation Modal */}
      {isClearConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-[#071B33] border-2 border-rose-500/50 rounded-2xl p-6 shadow-2xl text-[#F4F7FB]">
            <h3 className="text-base font-extrabold text-rose-400 mb-2">
              {isAr ? 'تأكيد مسح نصوص المحادثة' : 'Confirm Clear Transcript'}
            </h3>
            <p className="text-xs text-[#A9BDD3] leading-relaxed mb-5">
              {isAr
                ? 'هل أنت متأكد من مسح جميع النصوص المترجمة والملاحظات المسجلة في هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to clear all transcript segments and notes recorded in this session? This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="py-2 px-4 rounded-xl bg-[#102D4D] text-[#A9BDD3] hover:text-white text-xs font-bold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  engine.clearWithConfirmation(true);
                  setIsClearConfirmOpen(false);
                }}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold"
              >
                {isAr ? 'نعم، امسح الكل' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary View Modal */}
      {summaryData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#071B33] border-2 border-[#12CFE0]/40 rounded-2xl p-6 shadow-2xl text-[#F4F7FB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#12CFE0]/20 mb-4">
              <div className="flex items-center gap-2 text-[#12CFE0]">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-white">{summaryData.title}</h3>
              </div>
              <button onClick={() => setSummaryData(null)} className="p-1 rounded text-[#A9BDD3] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#A9BDD3] mb-4">
              {isAr ? `نطاق التحليل: ${summaryData.topic}` : `Scope: ${summaryData.topic}`}
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-extrabold text-[#12CFE0] uppercase tracking-wider mb-2">
                  {isAr ? 'النقاط الرئيسية المطروحة:' : 'Key Discussed Points:'}
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-[#F4F7FB] leading-relaxed">
                  {summaryData.keyPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>

              {summaryData.actionItems.length > 0 && (
                <div>
                  <h4 className="font-extrabold text-emerald-400 uppercase tracking-wider mb-2">
                    {isAr ? 'المهام ومواعيد المتابعة:' : 'Action Items & Follow-ups:'}
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5 text-emerald-100 leading-relaxed">
                    {summaryData.actionItems.map((ai, i) => (
                      <li key={i}>{ai}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#12CFE0]/20 flex justify-end">
              <button
                type="button"
                onClick={() => setSummaryData(null)}
                className="py-2 px-5 rounded-xl bg-[#1769AA] text-white font-bold text-xs hover:bg-[#076D78]"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
