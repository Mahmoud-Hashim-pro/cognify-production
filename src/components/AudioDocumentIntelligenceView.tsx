/**
 * Rafiqi — Audio & Document Intelligence View (Phase 6)
 *
 * Dedicated accessible learning module belonging to the "Read & Learn" section.
 * Implements:
 * 1. Phase 6.1 — Lecture Intelligence (audio upload, transcription, synchronized transcript reader, grounded summaries, chapters & timestamps, Ask Your Lecture)
 * 2. Phase 6.2 — Document Reader (PDF, DOCX, EPUB real reading, scanned OCR detection, continuous reading, page/chapter nav, reading history)
 * 3. Phase 6.3 — Ask Your Content (grounded Q&A with page citations, definition extraction, question extraction, quiz generator, study notes)
 * 4. Phase 6.4 — Advanced Reading (accessible table reader cell-by-cell nav, math equation verbalizer, dictionary/translation, vocabulary assistant, Braille Unicode translation)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Headphones,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Trash2,
  Copy,
  Search,
  BookMarked,
  Languages,
  Grid,
  Calculator,
  ArrowLeft,
  X,
  Check,
  RefreshCw,
  Eye,
  Sliders,
  Clock,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Save,
  FileQuestion,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '../types';
import { localize, isArabicLocale } from '../lib/translations';
import { speak, cancelSpeech } from '../lib/tts';
import { toast } from './Toast';
import { BrandLogo } from './ui/BrandLogo';
import {
  validateLectureAudioFile,
  detectLectureChapters,
  askLectureQuestion,
  generateStructuredLectureSummary,
  extractTextFromEpub,
  saveDocumentReadingProgress,
  getDocumentReadingHistory,
  removeDocumentReadingHistoryItem,
  clearDocumentReadingHistory,
  askDocumentContent,
  generateContentQuiz,
  parseTableStructure,
  verbalizeMathExpression,
  convertTextToBrailleUnicode,
  saveVocabularyWord,
  getSavedVocabulary,
  removeVocabularyWord,
  markUncertainSpeech,
  updateTranscriptSegment,
  getSegmentPlaybackRange,
  updateLectureChapter,
  getChapterAnnouncement,
  generateStudyNotes,
  lookupVocabularyTerm,
  LectureChapter,
  SmartLectureSummary,
  DocumentReadingHistoryItem,
  GeneratedQuiz,
  ParsedTableData,
  VocabularyWordItem,
  StructuredStudyNotes,
  CLOUD_PROCESSING_PRIVACY_NOTICE_AR,
  CLOUD_PROCESSING_PRIVACY_NOTICE_EN,
} from '../lib/audioDocumentIntelligenceEngine';
import {
  validateUploadFile,
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromTxt,
  AudioTranscriptSegment,
} from '../lib/documentExtractor';
import { transcribeAudioLecture } from '../lib/audioTranscriptionEngine';

export type IntelligenceTab = 'lecture' | 'reader' | 'ask_content' | 'advanced';

interface AudioDocumentIntelligenceViewProps {
  profile: UserProfile;
  onNavigateBack?: () => void;
  onMenuClick?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export default function AudioDocumentIntelligenceView({
  profile,
  onNavigateBack,
  isDarkMode = true,
}: AudioDocumentIntelligenceViewProps) {
  const isAr = isArabicLocale(profile.language);
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('lecture');
  const [announceText, setAnnounceText] = useState<string>('');

  // ─────────────────────────────────────────────────────────────
  // Phase 6.1 State: Lecture Intelligence
  // ─────────────────────────────────────────────────────────────
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioFormat, setAudioFormat] = useState<string>('');
  const [audioSizeFormatted, setAudioSizeFormatted] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);
  const [transcriptionStatusMsg, setTranscriptionStatusMsg] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [segments, setSegments] = useState<AudioTranscriptSegment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [lectureChapters, setLectureChapters] = useState<LectureChapter[]>([]);
  const [lectureSummary, setLectureSummary] = useState<SmartLectureSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [lectureQuestion, setLectureQuestion] = useState<string>('');
  const [lectureAnswer, setLectureAnswer] = useState<{
    answer: string;
    isFound: boolean;
    timestamp?: string;
  } | null>(null);
  const [isAskingLecture, setIsAskingLecture] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────
  // Phase 6.2 State: Document Reader
  // ─────────────────────────────────────────────────────────────
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState<string>('');
  const [docType, setDocType] = useState<'pdf' | 'docx' | 'epub' | 'txt'>('pdf');
  const [docText, setDocText] = useState<string>('');
  const [docPages, setDocPages] = useState<{ pageNum: number; text: string; isScanned?: boolean }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentParagraph, setCurrentParagraph] = useState<number>(0);
  const [readingMode, setReadingMode] = useState<'verbatim' | 'concise' | 'detailed' | 'summary'>('verbatim');
  const [isDocScanned, setIsDocScanned] = useState<boolean>(false);
  const [readingHistory, setReadingHistory] = useState<DocumentReadingHistoryItem[]>([]);
  const [isReadingDocAloud, setIsReadingDocAloud] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────
  // Phase 6.3 State: Ask Your Content & Quizzes
  // ─────────────────────────────────────────────────────────────
  const [contentQuestion, setContentQuestion] = useState<string>('');
  const [contentAnswer, setContentAnswer] = useState<{
    answer: string;
    isFound: boolean;
    citationPage?: number;
  } | null>(null);
  const [isAskingContent, setIsAskingContent] = useState<boolean>(false);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizQuestionCount, setQuizQuestionCount] = useState<number>(3);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [savedNotes, setSavedNotes] = useState<string[]>([]);
  const [newNoteText, setNewNoteText] = useState<string>('');

  // ─────────────────────────────────────────────────────────────
  // Phase 6.4 State: Advanced Reading (Table, Math, Vocab, Braille)
  // ─────────────────────────────────────────────────────────────
  const [sampleTableText, setSampleTableText] = useState<string>(
    '| المادة | الدرجة | التقدير |\n| الحاسب الآلي | 95 | ممتاز |\n| اللغة العربية | 90 | ممتاز |\n| الرياضيات | 88 | جيد جداً |'
  );
  const [parsedTable, setParsedTable] = useState<ParsedTableData | null>(null);
  const [tableSelectedCell, setTableSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [sampleMathText, setSampleMathText] = useState<string>('\\frac{a + b}{c} = \\sqrt{x^2 + y^2}');
  const [verbalizedMath, setVerbalizedMath] = useState<string>('');
  const [lookupWord, setLookupWord] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<{ word: string; definition: string; translation: string } | null>(null);
  const [savedVocabulary, setSavedVocabulary] = useState<VocabularyWordItem[]>([]);
  const [brailleInputText, setBrailleInputText] = useState<string>('مرحباً رفيقي');
  const [brailleOutput, setBrailleOutput] = useState<string>('');

  // Phase 7 State additions
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState<string>('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState<string>('');
  const [readingConsent, setReadingConsent] = useState<boolean>(true);
  const [quizType, setQuizType] = useState<'all' | 'mcq' | 'true_false' | 'short_answer'>('all');
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [revealedShortAnswers, setRevealedShortAnswers] = useState<Record<string, boolean>>({});
  const [structuredNotes, setStructuredNotes] = useState<StructuredStudyNotes | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState<boolean>(false);
  const [isLookingUpVocab, setIsLookingUpVocab] = useState<boolean>(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState<boolean>(false);

  // Audio file ref
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Load reading history and vocabulary on mount
  useEffect(() => {
    setReadingHistory(getDocumentReadingHistory());
    setSavedVocabulary(getSavedVocabulary());
    setParsedTable(parseTableStructure(sampleTableText, isAr ? 'ar' : 'en'));
    setVerbalizedMath(verbalizeMathExpression(sampleMathText, isAr ? 'ar' : 'en'));
    setBrailleOutput(convertTextToBrailleUnicode(brailleInputText));
  }, []);

  // Keyboard accessibility shortcuts: Space (Play/Pause), Escape (Stop speech), R (Replay)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlayingAudio) {
          pauseOrStopAudio();
        } else if (segments.length > 0) {
          playSegment(activeSegmentIndex);
        } else if (docPages.length > 0) {
          readCurrentPageAloud();
        }
      } else if (e.key === 'Escape') {
        pauseOrStopAudio();
      } else if (e.key === 'r' || e.key === 'R') {
        if (segments.length > 0) {
          handleReplaySegment(activeSegmentIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayingAudio, segments, activeSegmentIndex, docPages, currentPage]);

  const announce = (text: string) => {
    setAnnounceText(text);
  };

  // ─────────────────────────────────────────────────────────────
  // Phase 6.1 Handlers: Lecture Intelligence
  // ─────────────────────────────────────────────────────────────
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateLectureAudioFile(file);
    if (!validation.valid) {
      const err = isAr ? validation.errorMessageAr : validation.errorMessageEn;
      toast.error(err || 'Invalid audio file');
      announce(err || 'Invalid audio file');
      return;
    }

    setAudioFile(file);
    setAudioFileName(file.name);
    setAudioFormat(validation.format.toUpperCase());
    setAudioSizeFormatted(validation.sizeFormatted);
    setTranscript('');
    setSegments([]);
    setLectureChapters([]);
    setLectureSummary(null);
    setLectureAnswer(null);

    const msg = isAr
      ? `تم اختيار الملف الصوتي "${file.name}" بصيغة ${validation.format} وحجم ${validation.sizeFormatted}. جاهز للتفريغ.`
      : `Selected audio "${file.name}" (${validation.format}, ${validation.sizeFormatted}). Ready to transcribe.`;
    toast.success(msg);
    announce(msg);
  };

  const startTranscription = async () => {
    if (!audioFile) {
      toast.warning(isAr ? 'يرجى اختيار ملف صوتي أولاً' : 'Please select an audio file first');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionProgress(10);
    setTranscriptionStatusMsg(isAr ? 'بدء معالجة التسجيل...' : 'Starting transcription...');
    announce(isAr ? 'بدء التفريغ الصوتي للمحاضرة عبر Google Gemini...' : 'Transcribing lecture audio via Google Gemini...');

    try {
      const result = await transcribeAudioLecture(audioFile, audioFile.name, {
        language: isAr ? 'ar' : 'en',
        profile,
        onProgress: (pct, msg) => {
          setTranscriptionProgress(pct);
          setTranscriptionStatusMsg(msg);
        },
      });

      const markedTranscript = markUncertainSpeech(result.transcript, isAr ? 'ar' : 'en');
      const markedSegments = result.segments.map((s) => ({
        ...s,
        text: markUncertainSpeech(s.text, isAr ? 'ar' : 'en'),
      }));

      setTranscript(markedTranscript);
      setSegments(markedSegments);
      setActiveSegmentIndex(0);

      // Extract chapters
      const chapters = detectLectureChapters(markedTranscript, markedSegments, isAr ? 'ar' : 'en');
      setLectureChapters(chapters);

      const successMsg = isAr
        ? `اكتمل التفريغ الصوتي بنجاح. تم استخراج ${markedSegments.length} فقرة زمنية و ${chapters.length} فصول مع تمييز المقاطع غير المفهومة بدقة.`
        : `Transcription complete! ${markedSegments.length} timestamped segments and ${chapters.length} chapters identified with uncertain speech marked.`;
      toast.success(successMsg);
      announce(successMsg);
      speak(successMsg, isAr ? 'Arabic' : 'English');
    } catch (err: any) {
      const errMsg = err.message || (isAr ? 'تعذر إتمام التفريغ الصوتي' : 'Transcription failed');
      toast.error(errMsg);
      announce(errMsg);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleResetAudio = () => {
    pauseOrStopAudio();
    setAudioFile(null);
    setAudioFileName('');
    setAudioFormat('');
    setAudioSizeFormatted('');
    setTranscript('');
    setSegments([]);
    setLectureChapters([]);
    setLectureSummary(null);
    setLectureAnswer(null);
    setIsTranscribing(false);
    const msg = isAr ? 'تم إلغاء الملف الصوتي وإعادة ضبط الجلسة.' : 'Audio cancelled and session reset.';
    toast.info(msg);
    announce(msg);
  };

  const handleEditSegment = (segmentId: string, currentText: string) => {
    setEditingSegmentId(segmentId);
    setEditingSegmentText(currentText);
  };

  const handleSaveSegment = (segmentId: string) => {
    const { segments: updatedSegs, fullTranscript } = updateTranscriptSegment(
      segments,
      segmentId,
      editingSegmentText
    );
    setSegments(updatedSegs);
    setTranscript(fullTranscript);
    setEditingSegmentId(null);
    const msg = isAr
      ? 'تم تحديث نص الفقرة بنجاح دون المساس بالتسجيل الأصلي.'
      : 'Segment transcript updated without altering audio.';
    toast.success(msg);
    announce(msg);
  };

  const handleReplaySegment = (index: number) => {
    const range = getSegmentPlaybackRange(segments, index, 2);
    playSegment(index);
    const msg = isAr
      ? `إعادة تشغيل الفقرة [${range.timestamp}] لمدة ${range.durationSeconds} ثانية.`
      : `Replaying segment [${range.timestamp}] for ${range.durationSeconds}s.`;
    announce(msg);
  };

  const handleSelectChapter = (chap: LectureChapter) => {
    const announcement = getChapterAnnouncement(chap, isAr ? 'ar' : 'en');
    announce(announcement);
    speak(announcement, isAr ? 'Arabic' : 'English');
    const matchingSegIdx = segments.findIndex((s) => s.seconds >= chap.startSeconds);
    if (matchingSegIdx !== -1) {
      playSegment(matchingSegIdx);
    }
  };

  const handleEditChapter = (chapterId: string, currentTitle: string) => {
    setEditingChapterId(chapterId);
    setEditingChapterTitle(currentTitle);
  };

  const handleSaveChapter = (chapterId: string) => {
    const updated = updateLectureChapter(lectureChapters, chapterId, { title: editingChapterTitle });
    setLectureChapters(updated);
    setEditingChapterId(null);
    const msg = isAr ? `تم تحديث عنوان الفصل إلى "${editingChapterTitle}".` : `Chapter renamed to "${editingChapterTitle}".`;
    toast.success(msg);
    announce(msg);
  };

  const handleGenerateStudyNotes = async () => {
    const source = transcript || docText;
    if (!source) {
      toast.warning(isAr ? 'يرجى توفير تفريغ محاضرة أو مستند أولاً' : 'Please provide lecture or document text first');
      return;
    }
    setIsGeneratingNotes(true);
    announce(isAr ? 'جارٍ توليد المذكرة الدراسية المنظمة...' : 'Generating structured study notes...');
    try {
      const notes = await generateStudyNotes(source, isAr ? 'ar' : 'en', profile);
      setStructuredNotes(notes);
      const msg = isAr ? `تم إنشاء المذكرة الدراسية بعنوان "${notes.title}".` : `Study notes "${notes.title}" generated.`;
      toast.success(msg);
      announce(msg);
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate study notes');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const handleLookupWord = async () => {
    if (!lookupWord.trim()) return;
    setIsLookingUpVocab(true);
    announce(isAr ? `جارٍ البحث عن شرح "${lookupWord}"...` : `Looking up "${lookupWord}"...`);
    try {
      const item = await lookupVocabularyTerm(lookupWord, undefined, isAr ? 'ar' : 'en', profile);
      saveVocabularyWord(item);
      setSavedVocabulary(getSavedVocabulary());
      setLookupResult({
        word: item.word,
        definition: item.definition,
        translation: item.translation || (isAr ? 'متوفر' : 'Available'),
      });
      const msg = isAr
        ? `تم العثور على شرح "${item.word}" وإضافته إلى قاموس مفرداتك المحفوظة.`
        : `Definition found for "${item.word}" and saved to vocabulary.`;
      toast.success(msg);
      announce(msg);
      speak(`${item.word}: ${item.definition}`, isAr ? 'Arabic' : 'English');
    } catch (e: any) {
      toast.error(e.message || 'Lookup failed');
    } finally {
      setIsLookingUpVocab(false);
    }
  };

  const playSegment = (index: number) => {
    if (!segments[index]) return;
    setActiveSegmentIndex(index);
    setIsPlayingAudio(true);
    const seg = segments[index];
    const textToSpeak = `[${seg.timestamp}] ${seg.text}`;
    announce(textToSpeak);
    speak(seg.text, isAr ? 'Arabic' : 'English', {
      rate: speechRate,
      onEnd: () => {
        if (index < segments.length - 1) {
          playSegment(index + 1);
        } else {
          setIsPlayingAudio(false);
        }
      },
    });
  };

  const pauseOrStopAudio = () => {
    cancelSpeech();
    setIsPlayingAudio(false);
    announce(isAr ? 'تم إيقاف القراءة الصوتية.' : 'Audio stopped.');
  };

  const handleGenerateSummary = async () => {
    if (!transcript) {
      toast.warning(isAr ? 'يرجى تفريغ المحاضرة أولاً لتوليد الملخص' : 'Please transcribe the lecture first');
      return;
    }

    setIsGeneratingSummary(true);
    announce(isAr ? 'جارٍ استخراج الملخص الذكي الموثق من نص المحاضرة...' : 'Generating structured lecture summary...');

    try {
      const summary = await generateStructuredLectureSummary(transcript, isAr ? 'ar' : 'en', profile);
      setLectureSummary(summary);
      const msg = isAr ? 'تم توليد الملخص الدراسي الشامل بنجاح.' : 'Study summary generated successfully.';
      toast.success(msg);
      announce(msg);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAskLecture = async () => {
    if (!lectureQuestion.trim()) return;
    if (!transcript) {
      toast.warning(isAr ? 'يرجى تفريغ المحاضرة أولاً' : 'Please transcribe the lecture first');
      return;
    }

    setIsAskingLecture(true);
    announce(isAr ? 'جارٍ البحث في نص المحاضرة والإجابة...' : 'Searching lecture transcript for answer...');

    try {
      const res = await askLectureQuestion(transcript, lectureQuestion, segments, isAr ? 'ar' : 'en', profile);
      setLectureAnswer({
        answer: res.answer,
        isFound: res.isFoundInLecture,
        timestamp: res.timestampCitation,
      });
      announce(res.answer);
      speak(res.answer, isAr ? 'Arabic' : 'English', { rate: speechRate });
    } catch (err: any) {
      toast.error(err.message || 'Failed to answer question');
    } finally {
      setIsAskingLecture(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Phase 6.2 Handlers: Document Reader
  // ─────────────────────────────────────────────────────────────
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateUploadFile(file);
    if (!validation.valid) {
      const err = isAr ? validation.localizedMessage.ar : validation.localizedMessage.en;
      toast.error(err);
      announce(err);
      return;
    }

    setDocFile(file);
    setDocTitle(file.name);
    announce(isAr ? `جارٍ قراءة المستند "${file.name}"...` : `Reading document "${file.name}"...`);

    const arrayBuf = await file.arrayBuffer();

    if (file.name.toLowerCase().endsWith('.epub')) {
      setDocType('epub');
      const epubRes = await extractTextFromEpub(arrayBuf);
      if (epubRes.valid) {
        setDocText(epubRes.fullText);
        const pages = epubRes.chapters.map((ch, idx) => ({
          pageNum: idx + 1,
          text: ch.content,
        }));
        setDocPages(pages);
        setCurrentPage(1);
        setIsDocScanned(false);

        // Save reading history with user consent
        saveDocumentReadingProgress({
          id: `doc-${Date.now()}`,
          title: file.name,
          fileType: 'epub',
          lastPageNumber: 1,
          lastParagraphIndex: 0,
          lastOpenedTimestamp: Date.now(),
          progressPercentage: 0,
          wordCount: epubRes.wordCount,
        }, readingConsent);
        setReadingHistory(getDocumentReadingHistory());

        const msg = isAr
          ? `تم فتح كتاب EPUB بنجاح: ${epubRes.chapterCount} فصول و ${epubRes.wordCount} كلمة.`
          : `EPUB opened successfully: ${epubRes.chapterCount} chapters, ${epubRes.wordCount} words.`;
        toast.success(msg);
        announce(msg);
      } else {
        toast.error(epubRes.error || 'EPUB parsing failed');
      }
    } else if (file.name.toLowerCase().endsWith('.docx')) {
      setDocType('docx');
      const docxRes = await extractTextFromDocx(arrayBuf);
      if (docxRes.valid) {
        setDocText(docxRes.text);
        const pages = [{ pageNum: 1, text: docxRes.text }];
        setDocPages(pages);
        setCurrentPage(1);
        setIsDocScanned(false);

        saveDocumentReadingProgress({
          id: `doc-${Date.now()}`,
          title: file.name,
          fileType: 'docx',
          lastPageNumber: 1,
          lastParagraphIndex: 0,
          lastOpenedTimestamp: Date.now(),
          progressPercentage: 0,
          wordCount: docxRes.wordCount,
        }, readingConsent);
        setReadingHistory(getDocumentReadingHistory());

        const msg = isAr ? `تم فتح مستند Word بنجاح (${docxRes.wordCount} كلمة).` : `Word document opened (${docxRes.wordCount} words).`;
        toast.success(msg);
        announce(msg);
      }
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      setDocType('pdf');
      const pdfRes = await extractTextFromPdf(arrayBuf);
      if (pdfRes.valid) {
        setDocText(pdfRes.text);
        setDocPages(pdfRes.pages);
        setCurrentPage(1);
        setIsDocScanned(pdfRes.isScanned);

        saveDocumentReadingProgress({
          id: `doc-${Date.now()}`,
          title: file.name,
          fileType: 'pdf',
          lastPageNumber: 1,
          lastParagraphIndex: 0,
          lastOpenedTimestamp: Date.now(),
          progressPercentage: 0,
          wordCount: pdfRes.text.split(/\s+/).length,
        }, readingConsent);
        setReadingHistory(getDocumentReadingHistory());

        if (pdfRes.isScanned) {
          const scanWarn = isAr
            ? 'تنبيه: المستند ممسوح ضوئياً ويحتوي على صور صفحات بدون نصوص قابلة للتحديد مباشرة.'
            : 'Notice: Document contains scanned images requiring OCR extraction.';
          toast.warning(scanWarn);
          announce(scanWarn);
        } else {
          toast.success(isAr ? `تم فتح PDF بنجاح (${pdfRes.pages.length} صفحات).` : `PDF opened (${pdfRes.pages.length} pages).`);
        }
      }
    }
  };

  const readCurrentPageAloud = () => {
    const page = docPages[currentPage - 1];
    if (!page) return;

    setIsReadingDocAloud(true);
    const text = page.text;
    const announceHeader = isAr ? `قراءة الصفحة ${currentPage}: ` : `Reading Page ${currentPage}: `;
    announce(announceHeader + text.slice(0, 100));
    speak(text, isAr ? 'Arabic' : 'English', {
      rate: speechRate,
      onEnd: () => setIsReadingDocAloud(false),
      onError: () => setIsReadingDocAloud(false),
    });
  };

  // ─────────────────────────────────────────────────────────────
  // Phase 6.3 Handlers: Ask Your Content & Quizzes
  // ─────────────────────────────────────────────────────────────
  const handleAskContent = async () => {
    if (!contentQuestion.trim()) return;
    const source = docText || transcript;
    if (!source) {
      toast.warning(isAr ? 'يرجى تحميل مستند أو تفريغ محاضرة أولاً' : 'Please upload a document or lecture first');
      return;
    }

    setIsAskingContent(true);
    announce(isAr ? 'جارٍ البحث في محتوى المستند...' : 'Searching document content...');

    try {
      const res = await askDocumentContent(source, contentQuestion, docPages, isAr ? 'ar' : 'en', profile);
      setContentAnswer({
        answer: res.answer,
        isFound: res.isFound,
        citationPage: res.citationPage,
      });
      announce(res.answer);
      speak(res.answer, isAr ? 'Arabic' : 'English');
    } catch (err: any) {
      toast.error(err.message || 'Failed to search document');
    } finally {
      setIsAskingContent(false);
    }
  };

  const handleGenerateQuiz = async () => {
    const source = docText || transcript;
    if (!source) {
      toast.warning(isAr ? 'يرجى تحميل مستند أو تفريغ محاضرة أولاً' : 'Please upload content first');
      return;
    }

    setIsGeneratingQuiz(true);
    announce(isAr ? 'جارٍ توليد الاختبار الدراسي التفاعلي...' : 'Generating interactive quiz...');

    try {
      const quiz = await generateContentQuiz(source, {
        count: quizQuestionCount,
        difficulty: quizDifficulty,
        type: quizType,
        lang: isAr ? 'ar' : 'en',
        profile,
      });
      setGeneratedQuiz(quiz);
      setQuizAnswers({});
      setShortAnswers({});
      setRevealedShortAnswers({});
      const msg = isAr ? `تم إنشاء الاختبار (${quiz.questions.length} أسئلة).` : `Quiz generated (${quiz.questions.length} questions).`;
      toast.success(msg);
      announce(msg);
    } catch (err: any) {
      toast.error(err.message || 'Quiz generation failed');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Phase 6.4 Handlers: Advanced Reading
  // ─────────────────────────────────────────────────────────────
  const handleNavigateTableCell = (rowDelta: number, colDelta: number) => {
    if (!parsedTable) return;
    const newRow = Math.max(0, Math.min(parsedTable.rowCount - 1, tableSelectedCell.row + rowDelta));
    const newCol = Math.max(0, Math.min(parsedTable.colCount - 1, tableSelectedCell.col + colDelta));
    setTableSelectedCell({ row: newRow, col: newCol });

    const header = parsedTable.headers[newCol] || `عمود ${newCol + 1}`;
    const value = parsedTable.rows[newRow]?.[newCol] || (isAr ? 'فارغ' : 'Empty');
    const cellAnnouncement = isAr
      ? `الصف ${newRow + 1}، ${header}: ${value}`
      : `Row ${newRow + 1}, ${header}: ${value}`;
    announce(cellAnnouncement);
    speak(cellAnnouncement, isAr ? 'Arabic' : 'English');
  };

  const handleVerbalizeMath = () => {
    const verbal = verbalizeMathExpression(sampleMathText, isAr ? 'ar' : 'en');
    setVerbalizedMath(verbal);
    announce(verbal);
    speak(verbal, isAr ? 'Arabic' : 'English');
  };

  const handleConvertBraille = (text: string) => {
    setBrailleInputText(text);
    const converted = convertTextToBrailleUnicode(text);
    setBrailleOutput(converted);
  };

  return (
    <div
      className={`w-full min-w-0 max-w-full overflow-x-hidden min-h-screen flex flex-col ${
        isDarkMode ? 'bg-[#0A2342] text-slate-100' : 'tool-light bg-[#F5F9FD] text-slate-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Hidden Live Region for Screen Readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceText}
      </div>

      {/* Top Header */}
      <header className="px-4 py-3 border-b border-[#1769AA]/30 bg-[#0D2542] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button
              type="button"
              onClick={onNavigateBack}
              aria-label={isAr ? 'الرجوع للقائمة السابقة' : 'Navigate back'}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#17355C] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#24476F] transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
            >
              <ArrowLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
            </button>
          )}
          <span className="hidden"><BrandLogo size="sm" /></span>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Headphones className="w-5 h-5 text-[#4B9FE1]" />
              <span>{isAr ? 'رفيقي — ذكاء الصوت والمستندات' : 'Rafiqi — Audio & Document Intelligence'}</span>
            </h1>
            <p className="hidden text-xs text-[#94A3B8]">
              {isAr ? 'قسم: اقرأ وتعلّم (المرحلة 6)' : 'Section: Read & Learn (Phase 6)'}
            </p>
          </div>
        </div>

        {/* Global Stop Speech Button */}
        <button
          type="button"
          onClick={pauseOrStopAudio}
          aria-label={isAr ? 'إيقاف الصوت فوراً' : 'Stop voice playback immediately'}
          className="px-3 py-1.5 rounded-xl bg-[#C43D4D]/20 hover:bg-[#C43D4D]/40 text-[#FFA4A4] border border-[#C43D4D]/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <VolumeX className="w-4 h-4" />
          <span>{isAr ? 'إيقاف الصوت' : 'Stop Voice'}</span>
        </button>
      </header>

      {/* 4 Accessible Module Navigation Tabs */}
      <nav
        role="tablist"
        aria-label={isAr ? 'أقسام ذكاء الصوت والمستندات' : 'Intelligence subphases'}
        className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-[#112C4F] border-b border-[#24476F]"
      >
        {[
          { id: 'lecture' as const, labelAr: '🎙️ تفريغ ومحاضرات ذكية', labelEn: '🎙️ Lecture Intelligence' },
          { id: 'reader' as const, labelAr: '📄 قارئ المستندات (PDF/Word/EPUB)', labelEn: '📄 Document Reader' },
          { id: 'ask_content' as const, labelAr: '💡 اسأل المحتوى والاختبارات', labelEn: '💡 Ask Your Content' },
          { id: 'advanced' as const, labelAr: '🔬 قراءة الجداول والمعادلات وبرايل', labelEn: '🔬 Advanced Reading' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setActiveTab(tab.id);
                announce(isAr ? tab.labelAr : tab.labelEn);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none justify-center text-center cursor-pointer focus:ring-2 focus:ring-[#1769AA] ${
                isSelected
                  ? 'bg-[#1769AA] text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#24476F]'
              }`}
            >
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          );
        })}
      </nav>

      {/* Main Content Viewport */}
      <main className="flex-1 p-3 sm:p-4 pb-24 max-w-6xl mx-auto w-full space-y-4">

        {/* ═══════════════════════════════════════════════════════════════
            SUBPHASE 6.1: LECTURE INTELLIGENCE
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'lecture' && (
          <div className="space-y-4">
            {/* Audio Upload Card */}
            <section
              aria-labelledby="audio-upload-title"
              className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[#24476F] pb-3">
                <div>
                  <h2 id="audio-upload-title" className="text-sm font-bold text-white flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-[#4B9FE1]" />
                    <span>{isAr ? '1. رفع التسجيل الصوتي للمحاضرة' : '1. Upload Lecture Audio'}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {isAr
                      ? 'يدعم MP3, WAV, M4A, WEBM, OGG, AAC, FLAC بحجم أقصى 50 ميجابايت'
                      : 'Supports MP3, WAV, M4A, WEBM, OGG, AAC, FLAC up to 50 MB'}
                  </p>
                </div>
                <input
                  ref={audioInputRef}
                  type="file"
                  data-testid="lecture-upload-input"
                  accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
                  onChange={handleAudioUpload}
                  className="hidden"
                  id="lecture-audio-file-input"
                  aria-label={isAr ? 'اختر ملفاً صوتياً من جهازك' : 'Select audio file from your device'}
                />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isAr ? 'اختيار ملف صوتي' : 'Choose Audio'}</span>
                </button>
              </div>

              {/* Privacy Notice Disclosure */}
              <div className="p-3 rounded-2xl bg-[#0D2542]/70 border border-[#1769AA]/30 text-xs text-[#94A3B8] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#4B9FE1] shrink-0" />
                  <span className="text-xs leading-relaxed">
                    {isAr ? CLOUD_PROCESSING_PRIVACY_NOTICE_AR : CLOUD_PROCESSING_PRIVACY_NOTICE_EN}
                  </span>
                </div>
              </div>

              {/* Selected File Card */}
              {audioFile && (
                <div className="p-3.5 rounded-2xl bg-[#0D2542] border border-[#1769AA]/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{audioFileName}</span>
                    <span className="text-[#94A3B8]">
                      {audioFormat} · {audioSizeFormatted}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetAudio}
                      aria-label={isAr ? 'إلغاء الملف الصوتي' : 'Cancel audio file'}
                      className="px-3 py-2 rounded-xl bg-[#C43D4D]/20 hover:bg-[#C43D4D]/40 text-[#FFA4A4] border border-[#C43D4D]/40 font-bold transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={startTranscription}
                      disabled={isTranscribing}
                      className="px-4 py-2 rounded-xl bg-[#16845B] hover:bg-[#16845B]/80 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isTranscribing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>{isTranscribing ? (isAr ? 'جارٍ التفريغ...' : 'Transcribing...') : (isAr ? 'بدء التفريغ الصوتي' : 'Start Transcription')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Transcription Progress Banner */}
              {isTranscribing && (
                <div data-testid="processing-status-bar" className="p-3.5 rounded-2xl bg-[#112C4F] border border-[#1769AA] space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#4B9FE1]">
                    <span>{transcriptionStatusMsg}</span>
                    <span>{transcriptionProgress}%</span>
                  </div>
                  <div className="w-full bg-[#0A2342] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#1769AA] h-2 transition-all duration-300"
                      style={{ width: `${transcriptionProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Empty State when no transcript is generated yet */}
              {!transcript && !isTranscribing && (
                <div data-testid="lecture-empty-state" className="p-8 text-center rounded-2xl bg-[#0D2542]/40 border border-dashed border-[#1769AA]/30 space-y-2">
                  <Headphones className="w-8 h-8 text-[#4B9FE1] mx-auto opacity-70" />
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'لا توجد محاضرة مفرغة حالياً' : 'No lecture transcribed yet'}
                  </h3>
                  <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                    {isAr
                      ? 'اختر ملفاً صوتياً من جهازك ثم اضغط "بدء التفريغ الصوتي" لتوليد النص المتزامن والفصول.'
                      : 'Choose an audio file from your device and click "Start Transcription" to generate synchronized transcript and chapters.'}
                  </p>
                </div>
              )}
            </section>

            {/* Transcript Reader & Chapters */}
            {transcript && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chapters List */}
                <section
                  data-testid="chapter-navigation"
                  aria-labelledby="chapters-title"
                  className="p-4 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-3"
                >
                  <h3 id="chapters-title" className="text-xs font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#4B9FE1]" />
                    <span>{isAr ? 'فصول المحاضرة والتوقيتات' : 'Lecture Chapters & Timestamps'}</span>
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                    {lectureChapters.map((chap) => (
                      <div
                        key={chap.id}
                        className="p-2.5 rounded-xl bg-[#0D2542] hover:bg-[#1769AA]/30 border border-[#1769AA]/20 text-start text-xs transition-colors"
                      >
                        <div className="flex items-center justify-between font-bold text-white mb-0.5">
                          <button
                            type="button"
                            onClick={() => handleSelectChapter(chap)}
                            className="flex-1 text-start hover:text-[#4B9FE1] cursor-pointer"
                          >
                            <span>{chap.title}</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <span className="text-[#4B9FE1]">[{chap.startTime}]</span>
                            <button
                              type="button"
                              onClick={() => handleEditChapter(chap.id, chap.title)}
                              aria-label={isAr ? `تعديل عنوان ${chap.title}` : `Rename ${chap.title}`}
                              className="p-1 rounded text-[#94A3B8] hover:text-white cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {editingChapterId === chap.id ? (
                          <div className="mt-2 space-y-1.5">
                            <input
                              type="text"
                              value={editingChapterTitle}
                              onChange={(e) => setEditingChapterTitle(e.target.value)}
                              className="w-full px-2 py-1 rounded-lg bg-[#0A2342] border border-[#1769AA] text-white text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
                              aria-label={isAr ? 'اسم الفصل الجديد' : 'New chapter title'}
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => handleSaveChapter(chap.id)}
                                className="px-2 py-0.5 rounded bg-[#16845B] text-white text-xs font-bold"
                              >
                                {isAr ? 'حفظ' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingChapterId(null)}
                                className="px-2 py-0.5 rounded bg-[#24476F] text-[#94A3B8] text-xs"
                              >
                                {isAr ? 'إلغاء' : 'Cancel'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p onClick={() => handleSelectChapter(chap)} className="text-xs text-[#94A3B8] line-clamp-2 cursor-pointer">{chap.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Synchronized Segments View */}
                <section
                  data-testid="transcript-view"
                  aria-labelledby="transcript-reader-title"
                  className="lg:col-span-2 p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24476F] pb-3">
                    <h3 id="transcript-reader-title" className="text-xs font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#4B9FE1]" />
                      <span>{isAr ? 'قارئ النص المتزامن' : 'Synchronized Transcript Reader'}</span>
                    </h3>

                    {/* Speed Controls */}
                    <div data-testid="audio-playback-controls" className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="text-[#94A3B8] text-xs">{isAr ? 'السرعة:' : 'Speed:'}</span>
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setSpeechRate(rate)}
                          className={`px-2 py-0.5 rounded-lg transition-colors ${
                            speechRate === rate ? 'bg-[#1769AA] text-white' : 'text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Playback Controls Bar */}
                  <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-[#0D2542] border border-[#1769AA]/30">
                    <button
                      type="button"
                      onClick={() => playSegment(Math.max(0, activeSegmentIndex - 1))}
                      aria-label={isAr ? 'الفقرة السابقة' : 'Previous segment'}
                      className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1769AA]/20 cursor-pointer"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => isPlayingAudio ? pauseOrStopAudio() : playSegment(activeSegmentIndex)}
                      aria-label={isPlayingAudio ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تشغيل' : 'Play')}
                      className="p-3 rounded-2xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold shadow-md cursor-pointer"
                    >
                      {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => playSegment(Math.min(segments.length - 1, activeSegmentIndex + 1))}
                      aria-label={isAr ? 'الفقرة التالية' : 'Next segment'}
                      className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1769AA]/20 cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => playSegment(activeSegmentIndex)}
                      aria-label={isAr ? 'إعادة الفقرة الحالية' : 'Replay current segment'}
                      className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1769AA]/20 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Segments Display */}
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar p-1">
                    {segments.map((seg, idx) => {
                      const isActive = activeSegmentIndex === idx;
                      return (
                        <div
                          key={seg.id}
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed transition-all ${
                            isActive
                              ? 'bg-[#1769AA]/30 border-2 border-[#1769AA] text-white shadow-md'
                              : 'bg-[#0A2342] border border-[#24476F] text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-white/5 pb-1">
                            <span className="font-bold text-[#4B9FE1]">[{seg.timestamp}]</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleReplaySegment(idx)}
                                aria-label={isAr ? `إعادة استماع الفقرة [${seg.timestamp}]` : `Replay segment [${seg.timestamp}]`}
                                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1769AA]/30 cursor-pointer"
                                title={isAr ? 'إعادة استماع' : 'Replay'}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditSegment(seg.id, seg.text)}
                                aria-label={isAr ? `تعديل تفريغ الفقرة [${seg.timestamp}]` : `Edit segment text [${seg.timestamp}]`}
                                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1769AA]/30 cursor-pointer"
                                title={isAr ? 'تعديل النص' : 'Edit text'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {editingSegmentId === seg.id ? (
                            <div className="space-y-2 mt-2">
                              <textarea
                                value={editingSegmentText}
                                onChange={(e) => setEditingSegmentText(e.target.value)}
                                className="w-full p-2.5 rounded-xl bg-[#0D2542] border border-[#1769AA] text-white text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-[#1769AA]"
                                rows={3}
                                aria-label={isAr ? 'تعديل نص تفريغ الفقرة' : 'Edit segment transcript text'}
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleSaveSegment(seg.id)}
                                  className="px-3 py-1 rounded-lg bg-[#16845B] text-white font-bold flex items-center gap-1 text-xs cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>{isAr ? 'حفظ' : 'Save'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSegmentId(null)}
                                  className="px-3 py-1 rounded-lg bg-[#C43D4D]/30 text-[#FFA4A4] text-xs cursor-pointer"
                                >
                                  {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p
                              onClick={() => playSegment(idx)}
                              className="cursor-pointer select-text"
                            >
                              {seg.text}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Smart Lecture Summary & Ask Lecture */}
            {transcript && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Summary Generator Card */}
                <section
                  data-testid="lecture-summary"
                  aria-labelledby="lecture-summary-title"
                  className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#24476F] pb-3">
                    <h3 id="lecture-summary-title" className="text-xs font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#4B9FE1]" />
                      <span>{isAr ? 'الملخص الدراسي الذكي الموثق' : 'Smart Grounded Study Summary'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                      className="px-3 py-1.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingSummary ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{isAr ? 'توليد الملخص' : 'Generate Summary'}</span>
                    </button>
                  </div>

                  {lectureSummary && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-2xl bg-[#0D2542] border border-[#1769AA]/30 space-y-1">
                        <span className="font-bold text-white block">{isAr ? 'الزبدة المركزة:' : 'Short Summary:'}</span>
                        <p className="text-[#94A3B8] leading-relaxed">{lectureSummary.shortSummary}</p>
                      </div>

                      {lectureSummary.mainIdeas.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-bold text-white block">{isAr ? 'الأفكار الرئيسية:' : 'Main Ideas:'}</span>
                          <ul className="list-disc list-inside text-[#94A3B8] space-y-0.5">
                            {lectureSummary.mainIdeas.map((idea, i) => (
                              <li key={i}>{idea}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {lectureSummary.definitions.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-bold text-white block">{isAr ? 'التعريفات والمصطلحات:' : 'Key Definitions:'}</span>
                          {lectureSummary.definitions.map((d, i) => (
                            <div key={i} className="text-[#94A3B8]">
                              <strong className="text-[#4B9FE1]">{d.term}:</strong> {d.definition}
                            </div>
                          ))}
                        </div>
                      )}

                      {lectureSummary.datesAndNumbers && lectureSummary.datesAndNumbers.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-bold text-white block">{isAr ? 'التواريخ والأرقام والإحصائيات:' : 'Dates, Numbers & Metrics:'}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {lectureSummary.datesAndNumbers.map((num, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-lg bg-[#0D2542] border border-[#1769AA]/40 text-[#4B9FE1] font-mono">
                                {num}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {lectureSummary.lecturerQuestions && lectureSummary.lecturerQuestions.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-bold text-white block">{isAr ? 'أسئلة طرحها المحاضر أثناء الشرح:' : 'Questions Asked by Lecturer:'}</span>
                          <ul className="list-disc list-inside text-[#94A3B8] space-y-0.5">
                            {lectureSummary.lecturerQuestions.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {lectureSummary.revisionQuestions && lectureSummary.revisionQuestions.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-bold text-white block">{isAr ? 'أسئلة مراجعة مقترحة للامتحان:' : 'Suggested Revision Questions:'}</span>
                          <ul className="list-decimal list-inside text-[#4B9FE1] space-y-0.5">
                            {lectureSummary.revisionQuestions.map((rq, i) => (
                              <li key={i} className="text-[#94A3B8]"><span className="text-white">{rq}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Ask Your Lecture Card */}
                <section
                  aria-labelledby="ask-lecture-title"
                  className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
                >
                  <h3 id="ask-lecture-title" className="text-xs font-bold text-white flex items-center gap-2 border-b border-[#24476F] pb-3">
                    <HelpCircle className="w-4 h-4 text-[#4B9FE1]" />
                    <span>{isAr ? 'اسأل المحاضرة (إجابات موثقة بالتوقيت)' : 'Ask Your Lecture (Timestamp Grounded)'}</span>
                  </h3>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={lectureQuestion}
                      onChange={(e) => setLectureQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskLecture()}
                      placeholder={isAr ? 'ماذا قال المحاضر عن...؟' : 'What did the lecturer say about...?'}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A2342] border border-[#24476F] text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-[#1769AA]"
                    />
                    <button
                      type="button"
                      onClick={handleAskLecture}
                      disabled={isAskingLecture || !lectureQuestion.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isAskingLecture ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                  </div>

                  {lectureAnswer && (
                    <div className="p-3.5 rounded-2xl bg-[#0D2542] border border-[#1769AA]/40 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#4B9FE1] font-bold">
                        <span>{isAr ? 'الإجابة الموثقة:' : 'Grounded Answer:'}</span>
                        {lectureAnswer.timestamp && <span>[{lectureAnswer.timestamp}]</span>}
                      </div>
                      <p className="text-white leading-relaxed">{lectureAnswer.answer}</p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SUBPHASE 6.2: DOCUMENT READER (PDF, DOCX, EPUB)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'reader' && (
          <div className="space-y-4">
            {/* Upload Document Card */}
            <section
              aria-labelledby="doc-upload-title"
              className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#24476F] pb-3">
                <div>
                  <h2 id="doc-upload-title" className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#4B9FE1]" />
                    <span>{isAr ? 'قارئ المستندات الميسر (PDF, DOCX, EPUB)' : 'Accessible Document Reader (PDF, DOCX, EPUB)'}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    {isAr
                      ? 'قراءة نصوص الكتب والملفات بتنسيق منطقي مع الحفاظ على الترتيب الأصلي وقراءة الشاشة'
                      : 'Structured reading preserving reading order and heading semantics'}
                  </p>
                </div>
                <input
                  ref={docInputRef}
                  type="file"
                  data-testid="doc-upload-input"
                  accept=".pdf,.docx,.epub,.txt"
                  onChange={handleDocUpload}
                  className="hidden"
                  id="document-reader-file-input"
                  aria-label={isAr ? 'اختر ملف مستند' : 'Choose document file'}
                />
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isAr ? 'رفع مستند' : 'Upload Document'}</span>
                </button>
              </div>

              {/* Scanned OCR Notice */}
              {isDocScanned && (
                <div className="p-3.5 rounded-2xl bg-[#C17A16]/20 border border-[#C17A16]/40 text-[#FFD188] text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>
                    {isAr
                      ? 'تم رصد صفحات ممسوحة ضوئياً بدون نصوص محددة. تم تفعيل الاستخراج البصري الذكي مع تنبيه المستخدم لاحتمال وجود تباين طفيف في الدقة.'
                      : 'Scanned document detected. Optical extraction active with accuracy disclosure.'}
                  </span>
                </div>
              )}

              {/* Reading Modes & Consent Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0D2542] border border-[#1769AA]/30 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#94A3B8] font-bold text-xs">{isAr ? 'نمط القراءة:' : 'Reading Mode:'}</span>
                  {[
                    { id: 'verbatim' as const, labelAr: 'حرفي', labelEn: 'Verbatim' },
                    { id: 'concise' as const, labelAr: 'موجز', labelEn: 'Concise' },
                    { id: 'detailed' as const, labelAr: 'مفصل', labelEn: 'Detailed' },
                    { id: 'summary' as const, labelAr: 'خلاصة', labelEn: 'Summary' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setReadingMode(mode.id);
                        announce(isAr ? `تم تفعيل نمط القراءة: ${mode.labelAr}` : `Reading mode set to: ${mode.labelEn}`);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        readingMode === mode.id
                          ? 'bg-[#1769AA] text-white shadow-sm'
                          : 'bg-[#0A2342] border border-[#24476F] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {isAr ? mode.labelAr : mode.labelEn}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readingConsent}
                    aria-label={isAr ? 'تذكر موضع القراءة بموافقتي' : 'Remember reading position with my consent'}
                    onChange={(e) => {
                      setReadingConsent(e.target.checked);
                      announce(
                        e.target.checked
                          ? (isAr ? 'تم تفعيل حفظ موضع القراءة بموافقتك.' : 'Reading progress persistence enabled with your consent.')
                          : (isAr ? 'تم إيقاف حفظ موضع القراءة لحماية الخصوصية.' : 'Reading progress persistence disabled for privacy.')
                      );
                    }}
                    className="rounded text-[#1769AA] focus:ring-[#1769AA]"
                  />
                  <span>
                    {isAr ? 'تذكر موضع القراءة بموافقتي' : 'Remember reading position with my consent'}
                  </span>
                </label>
              </div>

              {/* Reading Controls Bar */}
              {docPages.length > 0 && (
                <div data-testid="reading-controls" className="p-4 rounded-2xl bg-[#0D2542] border border-[#1769AA]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      {isAr ? `الصفحة ${currentPage} من ${docPages.length}` : `Page ${currentPage} of ${docPages.length}`}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg bg-[#112C4F] text-white disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= docPages.length}
                      onClick={() => setCurrentPage((p) => Math.min(docPages.length, p + 1))}
                      className="p-1.5 rounded-lg bg-[#112C4F] text-white disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={readCurrentPageAloud}
                      className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{isAr ? 'قراءة الصفحة صوتياً' : 'Read Page Aloud'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={pauseOrStopAudio}
                      aria-label={isAr ? 'إيقاف القراءة الصوتية' : 'Stop audio playback'}
                      className="p-2 rounded-xl bg-[#C43D4D]/20 text-[#FFA4A4] border border-[#C43D4D]/40 cursor-pointer"
                      title={isAr ? 'إيقاف' : 'Stop'}
                    >
                      <VolumeX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Page Content Display */}
              {docPages.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#0A2342] border border-[#24476F] text-xs text-[#94A3B8] leading-relaxed max-h-96 overflow-y-auto custom-scrollbar select-text">
                  <h4 className="text-white font-bold text-sm mb-3">{docTitle} — {isAr ? `صفحة ${currentPage}` : `Page ${currentPage}`}</h4>
                  <p className="whitespace-pre-wrap">{docPages[currentPage - 1]?.text}</p>
                </div>
              )}
            </section>

            {/* Reading History */}
            {readingHistory.length > 0 && (
              <section
                aria-labelledby="reading-history-title"
                className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#24476F] pb-3">
                  <h3 id="reading-history-title" className="text-xs font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#4B9FE1]" />
                    <span>{isAr ? 'سجل القراءة واستئناف الموضع' : 'Reading History & Progress Resume'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      clearDocumentReadingHistory();
                      setReadingHistory([]);
                    }}
                    className="text-xs text-[#C43D4D] hover:underline cursor-pointer"
                  >
                    {isAr ? 'مسح السجل' : 'Clear History'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {readingHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-[#0D2542] border border-[#1769AA]/20 flex flex-col justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block truncate">{item.title}</span>
                        <span className="text-[#94A3B8] text-xs">
                          {item.fileType.toUpperCase()} · {isAr ? `صفحة ${item.lastPageNumber}` : `Page ${item.lastPageNumber}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-[#1769AA]/20">
                        <span className="text-xs text-[#4B9FE1]">{item.wordCount} {isAr ? 'كلمة' : 'words'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            removeDocumentReadingHistoryItem(item.id);
                            setReadingHistory(getDocumentReadingHistory());
                          }}
                          className="text-[#94A3B8] hover:text-[#C43D4D] p-1"
                          title={isAr ? 'حذف' : 'Remove'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SUBPHASE 6.3: ASK YOUR CONTENT & QUIZZES
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ask_content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ask Document Q&A */}
            <section
              data-testid="ask-content-panel"
              aria-labelledby="ask-doc-title"
              className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
            >
              <h2 id="ask-doc-title" className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#24476F] pb-3">
                <HelpCircle className="w-4 h-4 text-[#4B9FE1]" />
                <span>{isAr ? 'اسأل المستند (باستشهاد أرقام الصفحات)' : 'Ask Document (With Page Citations)'}</span>
              </h2>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={contentQuestion}
                  onChange={(e) => setContentQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskContent()}
                  placeholder={isAr ? 'اطرح سؤالاً عن المستند (مثال: ما هي شروط التسجيل؟)...' : 'Ask a question from document...'}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A2342] border border-[#24476F] text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-[#1769AA]"
                />
                <button
                  type="button"
                  onClick={handleAskContent}
                  disabled={isAskingContent || !contentQuestion.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isAskingContent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              {contentAnswer && (
                <div className="p-3.5 rounded-2xl bg-[#0D2542] border border-[#1769AA]/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#4B9FE1] font-bold">
                    <span>{isAr ? 'الإجابة الموثقة:' : 'Grounded Answer:'}</span>
                    {contentAnswer.citationPage && <span>{isAr ? `صفحة ${contentAnswer.citationPage}` : `Page ${contentAnswer.citationPage}`}</span>}
                  </div>
                  <p className="text-white leading-relaxed">{contentAnswer.answer}</p>
                </div>
              )}
            </section>

            {/* Quiz Generator */}
            <section
              data-testid="quiz-notes-panel"
              aria-labelledby="quiz-gen-title"
              className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#24476F] pb-3">
                <h2 id="quiz-gen-title" className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#4B9FE1]" />
                  <span>{isAr ? 'مولد الاختبارات التدريبية الميسرة' : 'Accessible Practice Quiz Generator'}</span>
                </h2>
                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  disabled={isGeneratingQuiz}
                  className="px-3 py-1.5 rounded-xl bg-[#16845B] hover:bg-[#16845B]/80 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingQuiz ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'توليد اختبار' : 'Generate Quiz'}</span>
                </button>
              </div>

              {/* Quiz Settings */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#94A3B8] font-bold text-xs">{isAr ? 'النوع:' : 'Type:'}</span>
                  {[
                    { id: 'all' as const, labelAr: 'شامل', labelEn: 'All' },
                    { id: 'mcq' as const, labelAr: 'اختيار', labelEn: 'MCQ' },
                    { id: 'true_false' as const, labelAr: 'صواب/خطأ', labelEn: 'True/False' },
                    { id: 'short_answer' as const, labelAr: 'إجابة قصيرة', labelEn: 'Short Answer' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setQuizType(t.id)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                        quizType === t.id ? 'bg-[#1769AA] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {isAr ? t.labelAr : t.labelEn}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#94A3B8] font-bold text-xs">{isAr ? 'المستوى:' : 'Difficulty:'}</span>
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setQuizDifficulty(diff)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                        quizDifficulty === diff ? 'bg-[#1769AA] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated Quiz Items */}
              {generatedQuiz && (
                <div className="space-y-4 text-xs">
                  <p className="text-xs text-[#FFA4A4] italic">{generatedQuiz.isAiGeneratedNotice}</p>
                  {generatedQuiz.questions.map((q, qIdx) => (
                    <div key={q.id} className="p-3.5 rounded-2xl bg-[#0D2542] border border-[#1769AA]/30 space-y-2">
                      <p className="font-bold text-white">
                        {qIdx + 1}. {q.question}
                      </p>
                      {q.options && q.type !== 'short_answer' && (
                        <div className="space-y-1.5">
                          {q.options.map((opt, optIdx) => {
                            const isChosen = quizAnswers[q.id] === optIdx;
                            const isCorrect = q.correctOptionIndex === optIdx;
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                                className={`w-full p-2 rounded-xl text-start transition-all cursor-pointer ${
                                  isChosen
                                    ? isCorrect
                                      ? 'bg-[#16845B]/30 border border-[#16845B] text-[#93FFD8]'
                                      : 'bg-[#C43D4D]/30 border border-[#C43D4D] text-[#FFA4A4]'
                                    : 'bg-[#0A2342] border border-[#24476F] text-[#94A3B8] hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'short_answer' && (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={shortAnswers[q.id] || ''}
                            onChange={(e) => setShortAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder={isAr ? 'اكتب إجابتك هنا...' : 'Type your answer here...'}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#0A2342] border border-[#24476F] text-white text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-[#1769AA]"
                            aria-label={isAr ? `إجابة السؤال ${qIdx + 1}` : `Answer for question ${qIdx + 1}`}
                          />
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setRevealedShortAnswers((prev) => ({ ...prev, [q.id]: true }))}
                              className="px-3 py-1 rounded-lg bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold cursor-pointer"
                            >
                              {isAr ? 'عرض الإجابة النموذجية' : 'Show Model Answer'}
                            </button>
                          </div>
                          {revealedShortAnswers[q.id] && (
                            <div className="p-2.5 rounded-xl bg-[#16845B]/20 border border-[#16845B]/40 text-xs space-y-1">
                              <span className="font-bold text-[#93FFD8] block">{isAr ? 'الإجابة النموذجية المستخرجة:' : 'Model Answer:'}</span>
                              <p className="text-white">{q.correctAnswerText}</p>
                              <p className="text-xs text-[#94A3B8] pt-1">{isAr ? 'التفسير المدعوم:' : 'Grounded explanation:'} {q.groundedExplanation}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {quizAnswers[q.id] !== undefined && q.type !== 'short_answer' && (
                        <p className="text-xs text-[#4B9FE1] pt-1">
                          {isAr ? 'التفسير المدعوم:' : 'Grounded explanation:'} {q.groundedExplanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Structured Study Notes Generator */}
            <section
              aria-labelledby="study-notes-title"
              className="lg:col-span-2 p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[#24476F] pb-3">
                <h2 id="study-notes-title" className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4B9FE1]" />
                  <span>{isAr ? 'المذكرة الدراسية المنظمة الميسرة' : 'Structured Study Notes Guide'}</span>
                </h2>
                <button
                  type="button"
                  onClick={handleGenerateStudyNotes}
                  disabled={isGeneratingNotes}
                  className="px-3 py-1.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingNotes ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'توليد مذكرة دراسية' : 'Generate Study Notes'}</span>
                </button>
              </div>

              {structuredNotes && (
                <div className="p-4 rounded-2xl bg-[#0D2542] border border-[#1769AA]/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">{structuredNotes.title}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const content = `${structuredNotes.title}\n\n${structuredNotes.summary}\n\n` +
                          structuredNotes.sections.map((s) => `## ${s.heading}\n${s.points.map((p) => `- ${p}`).join('\n')}`).join('\n\n') +
                          `\n\n### أسئلة المراجعة:\n` + structuredNotes.reviewQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');
                        navigator.clipboard.writeText(content);
                        toast.success(isAr ? 'تم نسخ المذكرة الدراسية' : 'Study notes copied to clipboard');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#112C4F] hover:bg-[#1769AA]/30 text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isAr ? 'نسخ المذكرة' : 'Copy Notes'}</span>
                    </button>
                  </div>

                  <p className="text-[#94A3B8] leading-relaxed border-b border-[#24476F] pb-2">{structuredNotes.summary}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {structuredNotes.sections.map((sec, sIdx) => (
                      <div key={sIdx} className="p-3 rounded-xl bg-[#0A2342] border border-[#24476F] space-y-1.5">
                        <span className="font-bold text-[#4B9FE1] block">{sec.heading}</span>
                        <ul className="list-disc list-inside text-[#94A3B8] space-y-1">
                          {sec.points.map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {structuredNotes.reviewQuestions.length > 0 && (
                    <div className="pt-2 border-t border-[#24476F]">
                      <span className="font-bold text-white block mb-1">{isAr ? 'أسئلة مراجعة وتثبيت المفاهيم:' : 'Concept Review Questions:'}</span>
                      <ol className="list-decimal list-inside text-[#4B9FE1] space-y-0.5">
                        {structuredNotes.reviewQuestions.map((rq, rqIdx) => (
                          <li key={rqIdx} className="text-[#94A3B8]"><span className="text-white">{rq}</span></li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SUBPHASE 6.4: ADVANCED READING (TABLES, MATH, VOCAB, BRAILLE)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Accessible Table Reader */}
              <section
                aria-labelledby="table-reader-title"
                className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#24476F] pb-3">
                  <h2 id="table-reader-title" className="text-sm font-bold text-white flex items-center gap-2">
                    <Grid className="w-4 h-4 text-[#4B9FE1]" />
                    <span>{isAr ? 'قارئ الجداول الميسر خلية بخلية' : 'Accessible Cell-by-Cell Table Reader'}</span>
                  </h2>
                </div>

                {parsedTable && (
                  <div className="space-y-3 text-xs">
                    <p className="text-[#94A3B8] leading-relaxed">{parsedTable.tableSummary}</p>

                    {/* Cell Navigation D-Pad */}
                    <div className="p-3 rounded-2xl bg-[#0D2542] border border-[#1769AA]/30 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleNavigateTableCell(-1, 0)}
                        className="px-3 py-1.5 rounded-xl bg-[#1769AA] text-white font-bold"
                      >
                        {isAr ? 'أعلى' : 'Up'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNavigateTableCell(1, 0)}
                        className="px-3 py-1.5 rounded-xl bg-[#1769AA] text-white font-bold"
                      >
                        {isAr ? 'أسفل' : 'Down'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNavigateTableCell(0, isAr ? 1 : -1)}
                        className="px-3 py-1.5 rounded-xl bg-[#1769AA] text-white font-bold"
                      >
                        {isAr ? 'يمين' : 'Left'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNavigateTableCell(0, isAr ? -1 : 1)}
                        className="px-3 py-1.5 rounded-xl bg-[#1769AA] text-white font-bold"
                      >
                        {isAr ? 'يسار' : 'Right'}
                      </button>
                    </div>

                    {/* Current Cell Announcement */}
                    <div className="p-3 rounded-xl bg-[#0A2342] border border-[#24476F] font-bold text-white">
                      <span>{isAr ? 'الخلية النشطة:' : 'Active Cell:'} </span>
                      <span className="text-[#4B9FE1]">
                        [{parsedTable.headers[tableSelectedCell.col] || `Col ${tableSelectedCell.col + 1}`}]:{' '}
                        {parsedTable.rows[tableSelectedCell.row]?.[tableSelectedCell.col] || '—'}
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {/* Accessible Math Reader */}
              <section
                aria-labelledby="math-reader-title"
                className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
              >
                <h2 id="math-reader-title" className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#24476F] pb-3">
                  <Calculator className="w-4 h-4 text-[#4B9FE1]" />
                  <span>{isAr ? 'قارئ المعادلات الرياضية اللفظي' : 'Accessible Math Equation Verbalizer'}</span>
                </h2>

                <div className="space-y-3 text-xs">
                  <input
                    type="text"
                    value={sampleMathText}
                    onChange={(e) => setSampleMathText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0A2342] border border-[#24476F] text-white font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-[#1769AA]"
                    aria-label={isAr ? 'صيغة المعادلة الرياضية' : 'Mathematical expression formula'}
                  />

                  <button
                    type="button"
                    onClick={handleVerbalizeMath}
                    className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isAr ? 'نطق المعادلة لفظياً' : 'Verbalize Equation Aloud'}</span>
                  </button>

                  {verbalizedMath && (
                    <div className="p-3.5 rounded-2xl bg-[#0D2542] border border-[#1769AA]/40 space-y-1">
                      <span className="text-xs text-[#4B9FE1] font-bold">{isAr ? 'النطق اللفظي الميسر:' : 'Accessible Spoken Form:'}</span>
                      <p className="text-white leading-relaxed">{verbalizedMath}</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Braille Compatibility Exporter */}
            <section
              aria-labelledby="braille-title"
              className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#24476F] pb-3">
                <h2 id="braille-title" className="text-sm font-bold text-white flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-[#4B9FE1]" />
                  <span>{isAr ? 'التوافق مع أجهزة برايل الإلكترونية (Braille Displays)' : 'Refreshable Braille Display Compatibility'}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([brailleOutput], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'rafiqi_braille_text.brf';
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(isAr ? 'تم تنزيل ملف برايل' : 'Braille file downloaded');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تنزيل ملف .BRF' : 'Download .BRF'}</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <input
                  type="text"
                  value={brailleInputText}
                  onChange={(e) => handleConvertBraille(e.target.value)}
                  placeholder={isAr ? 'اكتب نصاً لتحويله إلى رموز برايل...' : 'Type text to convert to Braille...'}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0A2342] border border-[#24476F] text-white text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-[#1769AA]"
                />

                <div className="p-4 rounded-2xl bg-[#0D2542] border border-[#1769AA]/40 text-lg tracking-widest text-[#93FFD8] select-all font-mono">
                  {brailleOutput || '⠀'}
                </div>

                <p className="text-xs text-[#94A3B8]">
                  {isAr
                    ? 'ملاحظة التوافق: يدعم ترميز يونيكود الموحد لبرايل (Grade 1 Unicode). يتم نقل الإشارات لأجهزة برايل المتصلة بالبلوتوث أو الـ USB تلقائياً عبر قارئ الشاشة (NVDA / TalkBack / VoiceOver).'
                    : 'Compatibility notice: Outputs standard Unicode Braille patterns (\u2800-\u28FF) supported by refreshable Braille displays via active screen readers.'}
                </p>
              </div>
            </section>

            {/* Vocabulary & Terminology Assistant */}
            <section
              aria-labelledby="vocab-assistant-title"
              className="p-5 rounded-3xl bg-[#112C4F] border border-[#24476F] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#24476F] pb-3">
                <h2 id="vocab-assistant-title" className="text-sm font-bold text-white flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-[#4B9FE1]" />
                  <span>{isAr ? 'قاموس المفردات والمصطلحات الأكاديمية المحفوظة' : 'Saved Vocabulary & Academic Terminology'}</span>
                </h2>
              </div>

              <div className="flex gap-2 text-xs">
                <input
                  type="text"
                  value={lookupWord}
                  onChange={(e) => setLookupWord(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookupWord()}
                  placeholder={isAr ? 'ابحث عن شرح وترجمة أي كلمة أو مصطلح...' : 'Search term explanation and translation...'}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A2342] border border-[#24476F] text-white text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus:ring-2 focus:ring-[#1769AA]"
                />
                <button
                  type="button"
                  onClick={handleLookupWord}
                  disabled={isLookingUpVocab || !lookupWord.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isLookingUpVocab ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              {lookupResult && (
                <div className="p-3.5 rounded-2xl bg-[#0D2542] border border-[#1769AA]/40 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[#4B9FE1] font-bold">
                    <span>{lookupResult.word}</span>
                    <span className="text-xs text-[#93FFD8]">{lookupResult.translation}</span>
                  </div>
                  <p className="text-white leading-relaxed">{lookupResult.definition}</p>
                </div>
              )}

              {savedVocabulary.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#24476F]">
                  <span className="text-xs font-bold text-white block">{isAr ? 'المفردات المحفوظة:' : 'Saved Terms:'}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {savedVocabulary.map((v) => (
                      <div key={v.id} className="p-2.5 rounded-xl bg-[#0A2342] border border-[#24476F] flex items-center justify-between gap-2">
                        <div>
                          <strong className="text-[#4B9FE1] block">{v.word}</strong>
                          <span className="text-xs text-[#94A3B8] line-clamp-1">{v.definition}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeVocabularyWord(v.id);
                            setSavedVocabulary(getSavedVocabulary());
                          }}
                          className="text-[#94A3B8] hover:text-[#C43D4D] p-1 cursor-pointer"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

      </main>
    </div>
  );
}
