import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  X,
  Volume2,
  VolumeX,
  FileUp,
  Download,
  Languages,
  History,
  MessageSquare,
  Send,
  Mic,
  MicOff,
  GraduationCap,
  BookOpen,
  Loader2,
  Trash2,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Play,
  Pause,
  FastForward,
  Rewind,
  Music,
  Radio,
  Accessibility,
  Printer,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Headphones,
  FileDown,
  Layers,
} from 'lucide-react';
import { UserProfile } from '../types';
import { generateAdaptiveResponse } from '../services/gemini';
import { speak, cancelSpeech, unlockSpeechSynthesis } from '../lib/tts';
import { toast } from './Toast';
import { cleanVisionDescription } from '../lib/visionCleaner';
import { downloadNativeDocx, detectQuestionPatterns, DocxQuestionItem } from '../lib/docxExport';
import {
  validateUploadFile,
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromTxt,
  formatBytes,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_AUDIO_SIZE_BYTES,
  AudioTranscriptSegment,
} from '../lib/documentExtractor';
import {
  transcribeAudioLecture,
  generateLectureSummary,
  exportTranscriptToDocx,
  exportSummaryToDocx,
  exportTranscriptToTxt,
  AudioLectureState,
  INITIAL_AUDIO_LECTURE_STATE,
  SummaryType,
} from '../lib/audioTranscriptionEngine';

const SignAvatar3D = React.lazy(() => import('./SignAvatar3D'));

export interface SavedDocItem {
  id: string;
  title: string;
  sourceType: 'pdf' | 'image' | 'audio' | 'speech';
  summary: string;
  fullText?: string;
  targetLang: 'ar' | 'en' | 'fr';
  createdAt: string;
}

export interface DocChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DocQuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  selectedOption?: number;
}

export interface DocFlashcard {
  front: string;
  back: string;
  flipped?: boolean;
}

export const DOC_HISTORY_KEY = 'cognify_vision_doc_history';

export function downloadTextAsWavFile(text: string, filename: string) {
  if (typeof window === 'undefined') return;
  const sampleRate = 16000;
  const numChannels = 1;
  const duration = Math.min(Math.max(text.length * 0.05, 2), 60);
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const tone = 260 + 30 * Math.sin(2 * Math.PI * 1.2 * t);
    const sample = Math.sin(2 * Math.PI * tone * t) * 0.3 * Math.min(1, Math.exp(-t / (duration * 0.8)));
    view.setInt16(44 + i * 2, Math.floor(sample * 32767), true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (filename || 'lecture-audio').replace(/[^\w\u0600-\u06FF-]/g, '_');
  a.download = `${safeName}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToWordDocument(
  title: string,
  summary: string,
  fullText?: string,
  lang: 'ar' | 'en' | 'fr' = 'ar',
  quiz?: DocQuizQuestion[],
  flashcards?: DocFlashcard[]
) {
  if (typeof window === 'undefined') return;
  // Trigger modern native docx file generation via docx package
  downloadNativeDocx({
    title,
    summary,
    fullText,
    lang,
    quiz,
    flashcards,
  }).catch((err) => {
    console.warn('Native docx export failed, falling back to legacy format:', err);
    legacyExportToWordDocument(title, summary, fullText, lang, quiz, flashcards);
  });
}

export function printAccessibleDocument(
  title: string,
  summary: string,
  fullText?: string,
  lang: 'ar' | 'en' | 'fr' = 'ar',
  quiz?: DocQuizQuestion[],
  flashcards?: DocFlashcard[]
) {
  if (typeof window === 'undefined') return;
  const isAr = lang === 'ar';
  const cleanSummary = (summary || '').replace(/\*\*/g, '').replace(/###/g, '');
  const cleanFull = (fullText || '').replace(/\*\*/g, '').replace(/###/g, '');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <title>${title || (isAr ? 'مستند كوجنيفاي التعليمي' : 'Cognify Educational Document')}</title>
      <style>
        @page { margin: 20mm; size: A4; }
        body {
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          direction: ${isAr ? 'rtl' : 'ltr'};
          text-align: ${isAr ? 'right' : 'left'};
          line-height: 1.8;
          color: #0f172a;
          margin: 0;
          padding: 24px;
        }
        h1 { font-size: 20pt; color: #1e1b4b; border-bottom: 3px solid #4338ca; padding-bottom: 8px; margin-bottom: 16px; }
        h2 { font-size: 14pt; color: #312e81; margin-top: 24px; margin-bottom: 10px; }
        .meta { color: #64748b; font-size: 10pt; margin-bottom: 20px; }
        .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
        .q-box { border-right: ${isAr ? '4px solid #16a34a' : 'none'}; border-left: ${isAr ? 'none' : '4px solid #16a34a'}; background: #f0fdf4; padding: 12px; margin-bottom: 12px; }
        .fc-box { border: 1px solid #e9d5ff; background: #faf5ff; padding: 10px; margin-bottom: 10px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h1>${title || (isAr ? 'مستند كوجنيفاي التعليمي' : 'Cognify Educational Document')}</h1>
      <div class="meta">${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')} • ${isAr ? 'منصة كوجنيفاي التعليمية الميسرة' : 'Cognify Inclusive Learning Platform'}</div>
      <h2>${isAr ? '📌 الزبدة وخلاصة المحتوى' : '📌 Core Takeaways'}</h2>
      <div class="box">${cleanSummary.replace(/\n/g, '<br/>')}</div>
      ${quiz && quiz.length > 0 ? `
        <h2>${isAr ? '📝 بنك الأسئلة والتدريبات' : '📝 Practice Questions'}</h2>
        ${quiz.map((q, i) => `
          <div class="q-box">
            <b>${isAr ? 'سؤال' : 'Question'} ${i + 1}: ${q.question}</b><br/>
            ${q.options.map((opt, oi) => `&bull; ${opt} ${oi === q.answerIndex ? '<b>(الإجابة الصحيحة ✅)</b>' : ''}`).join('<br/>')}<br/>
            <span style="color:#4338ca; font-size:10pt;">💡 ${isAr ? 'التوضيح' : 'Explanation'}: ${q.explanation}</span>
          </div>
        `).join('')}
      ` : ''}
      ${flashcards && flashcards.length > 0 ? `
        <h2>${isAr ? '🗂️ بطاقات المراجعة السريعة' : '🗂️ Flashcards'}</h2>
        ${flashcards.map((f, i) => `
          <div class="fc-box">
            <b>${isAr ? 'بطاقة' : 'Card'} ${i + 1}:</b> ${f.front}<br/>
            <b>${isAr ? 'المفهوم / الإجابة:' : 'Answer / Concept:'}</b> ${f.back}
          </div>
        `).join('')}
      ` : ''}
      ${cleanFull ? `
        <h2>${isAr ? '📝 النص الكامل المستخرج' : '📝 Full Extracted Content'}</h2>
        <div class="box" style="white-space: pre-wrap; font-size: 11pt;">${cleanFull}</div>
      ` : ''}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

function legacyExportToWordDocument(
  title: string,
  summary: string,
  fullText?: string,
  lang: 'ar' | 'en' | 'fr' = 'ar',
  quiz?: DocQuizQuestion[],
  flashcards?: DocFlashcard[]
) {
  if (typeof window === 'undefined') return;
  const isAr = lang === 'ar';
  const cleanSummary = (summary || '').replace(/\*\*/g, '').replace(/###/g, '');
  const cleanFull = (fullText || '').replace(/\*\*/g, '').replace(/###/g, '');

  const html = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'}; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>${cleanSummary.replace(/\n/g, '<br/>')}</p>
      ${cleanFull ? `<hr/><pre>${cleanFull}</pre>` : ''}
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (title || 'cognify-document').replace(/[^\w\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '_');
  a.download = `${safeTitle || 'cognify-document'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface DocumentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  companionLang: 'ar' | 'en' | 'fr';
  onAnnounce?: (msg: string) => void;
}

export default function DocumentStudioModal({
  isOpen,
  onClose,
  profile,
  companionLang,
  onAnnounce,
}: DocumentStudioModalProps) {
  const [docStudioTab, setDocStudioTab] = useState<'pdf' | 'audio-rec' | 'speech-to-text' | 'history'>('pdf');
  const [docLoading, setDocLoading] = useState(false);
  const [docStatusText, setDocStatusText] = useState('');

  const [currentDoc, setCurrentDoc] = useState<SavedDocItem & { fileBase64?: string; fileMime?: string } | null>(null);
  const [docTargetLang, setDocTargetLang] = useState<'ar' | 'en' | 'fr'>(() => companionLang || 'ar');
  const [docViewMode, setDocViewMode] = useState<'summary' | 'full' | 'quiz' | 'flashcards'>('summary');
  const [docQuiz, setDocQuiz] = useState<DocQuizQuestion[]>([]);
  const [docFlashcards, setDocFlashcards] = useState<DocFlashcard[]>([]);
  const [isGeneratingStudyKit, setIsGeneratingStudyKit] = useState(false);

  // Audio Scrubbing & Playback Speed
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1.0);
  const [currentParagraphIdx, setCurrentParagraphIdx] = useState<number>(0);

  // Hands-free Voice Commands
  const [isVoiceCommandActive, setIsVoiceCommandActive] = useState(false);
  const voiceCommandRecRef = useRef<any>(null);

  // 3D Sign Avatar Integration
  const [showSignAvatarInDoc, setShowSignAvatarInDoc] = useState(false);
  const [isAvatarSigningDoc, setIsAvatarSigningDoc] = useState(false);
  const [avatarSigningWords, setAvatarSigningWords] = useState<string[]>([]);

  const [docChatMessages, setDocChatMessages] = useState<DocChatMessage[]>([]);
  const [docChatInput, setDocChatInput] = useState('');
  const [isDocChatAnswering, setIsDocChatAnswering] = useState(false);

  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordDuration, setAudioRecordDuration] = useState(0);
  const [liveSpeechTranscript, setLiveSpeechTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const speechRecRef = useRef<any>(null);

  const [isSpeakingDoc, setIsSpeakingDoc] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [textToReadAloud, setTextToReadAloud] = useState('');

  // Robust Document Processing & Retry State
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const [extractedDocMeta, setExtractedDocMeta] = useState<{
    pageCount?: number;
    isScanned?: boolean;
    needsOcr?: boolean;
    wordCount?: number;
    hasTables?: boolean;
  } | null>(null);

  // Audio Lecture Engine State — rehydrate from session cache if available
  const [audioLectureState, setAudioLectureState] = useState<AudioLectureState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('cognify_doc_audio_lecture_draft');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.transcript || parsed.summaries)) {
            return {
              ...INITIAL_AUDIO_LECTURE_STATE,
              ...parsed,
            };
          }
        }
      } catch {}
    }
    return INITIAL_AUDIO_LECTURE_STATE;
  });

  // Auto-persist audio lecture transcript & summaries across tab switches
  useEffect(() => {
    try {
      if (audioLectureState.transcript || audioLectureState.summaries?.short || audioLectureState.summaries?.detailed) {
        sessionStorage.setItem('cognify_doc_audio_lecture_draft', JSON.stringify({
          status: audioLectureState.status,
          file: audioLectureState.file,
          transcript: audioLectureState.transcript,
          summaries: audioLectureState.summaries,
          segments: audioLectureState.segments,
        }));
      }
    } catch {}
  }, [audioLectureState]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isGeneratingAudioSummary, setIsGeneratingAudioSummary] = useState(false);
  const [isCopiedTranscript, setIsCopiedTranscript] = useState(false);
  const audioFileRef = useRef<File | Blob | null>(null);
  const audioAbortControllerRef = useRef<AbortController | null>(null);

  const [docHistory, setDocHistory] = useState<SavedDocItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(DOC_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const saveDocToHistory = useCallback((item: SavedDocItem) => {
    setDocHistory((prev) => {
      const filtered = prev.filter((d) => d.id !== item.id);
      const updated = [item, ...filtered].slice(0, 30);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DOC_HISTORY_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const deleteDocFromHistory = useCallback((id: string) => {
    setDocHistory((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DOC_HISTORY_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const processAudioLectureFile = async (file: File | Blob, customName?: string) => {
    const fileName = customName || (file as File).name || `audio_lecture_${Date.now()}.webm`;
    const isAr = docTargetLang === 'ar';
    const isFr = docTargetLang === 'fr';

    const validation = validateUploadFile({
      name: fileName,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      const errorMsg = validation.localizedMessage[docTargetLang] || validation.localizedMessage.ar;
      toast.error(errorMsg);
      speak(errorMsg, isAr ? 'Arabic' : isFr ? 'French' : 'English');
      setAudioLectureState((prev) => ({
        ...prev,
        status: 'error',
        error: { code: validation.error || 'INVALID_FILE', message: errorMsg, canRetry: false },
      }));
      return;
    }

    const audioUrl = URL.createObjectURL(file);
    audioFileRef.current = file;

    setAudioLectureState({
      file: {
        name: fileName,
        size: file.size,
        type: file.type || 'audio/webm',
        url: audioUrl,
      },
      status: 'transcribing',
      progressPct: 10,
      statusMessage: isAr ? 'جاري بدء التفريغ الصوتي للمحاضرة...' : 'Starting lecture transcription...',
      transcript: '',
      segments: [],
      currentPlaybackTime: 0,
      summaries: {},
      activeSummaryTab: 'short',
      error: undefined,
    });

    try {
      const abortCtrl = new AbortController();
      audioAbortControllerRef.current = abortCtrl;

      const result = await transcribeAudioLecture(file, fileName, {
        language: docTargetLang,
        profile,
        signal: abortCtrl.signal,
        onProgress: (pct, msg) => {
          setAudioLectureState((prev) => ({
            ...prev,
            progressPct: pct,
            statusMessage: msg,
          }));
        },
      });

      setAudioLectureState((prev) => ({
        ...prev,
        status: 'ready',
        progressPct: 100,
        statusMessage: isAr ? 'اكتمل التفريغ الصوتي بنجاح!' : 'Transcription complete!',
        transcript: result.transcript,
        segments: result.segments,
      }));

      // Automatically generate initial concise summary
      try {
        const shortSummary = await generateLectureSummary(result.transcript, 'short', docTargetLang, profile);
        setAudioLectureState((prev) => ({
          ...prev,
          summaries: { ...prev.summaries, short: shortSummary },
        }));

        const docItem: SavedDocItem = {
          id: `audio_lecture_${Date.now()}`,
          title: fileName.replace(/\.[^/.]+$/, ''),
          sourceType: 'audio',
          summary: shortSummary,
          fullText: result.transcript,
          targetLang: docTargetLang,
          createdAt: new Date().toISOString(),
        };
        saveDocToHistory(docItem);
      } catch (sumErr) {
        console.warn('Auto-summary generation warning:', sumErr);
      }

      const readyMsg = isAr
        ? `اكتمل تفريغ المحاضرة بنجاح! تم استخراج ${result.segments.length} فقرة زمنية.`
        : `Lecture transcript ready! Extracted ${result.segments.length} timestamped segments.`;
      toast.success(readyMsg);
      onAnnounce?.(readyMsg);
      speak(readyMsg, isAr ? 'Arabic' : isFr ? 'French' : 'English');
    } catch (err: any) {
      if (err?.message === 'ABORTED') return;
      console.error('Audio transcription error:', err);
      const errMsg = isAr
        ? 'تعذر تفريغ المحاضرة الصوتية. يرجى التأكد من جودة الملف والمحاولة مرة أخرى.'
        : 'Failed to transcribe audio lecture. Please check the file and try again.';
      toast.error(errMsg);
      speak(errMsg, isAr ? 'Arabic' : isFr ? 'French' : 'English');
      setAudioLectureState((prev) => ({
        ...prev,
        status: 'error',
        error: { code: 'TRANSCRIPTION_FAILED', message: errMsg, canRetry: true },
      }));
    }
  };

  const retryAudioTranscription = () => {
    if (audioFileRef.current) {
      processAudioLectureFile(audioFileRef.current, audioLectureState.file?.name);
    }
  };

  const handleSelectSummaryTab = async (tab: SummaryType) => {
    setAudioLectureState((prev) => ({ ...prev, activeSummaryTab: tab }));
    if (!audioLectureState.summaries[tab] && audioLectureState.transcript) {
      setIsGeneratingAudioSummary(true);
      try {
        const summaryText = await generateLectureSummary(
          audioLectureState.transcript,
          tab,
          docTargetLang,
          profile
        );
        setAudioLectureState((prev) => ({
          ...prev,
          summaries: {
            ...prev.summaries,
            [tab]: summaryText,
          },
        }));
      } catch {
        toast.error(docTargetLang === 'ar' ? 'تعذر توليد الملخص المطلوب.' : 'Failed to generate summary.');
      } finally {
        setIsGeneratingAudioSummary(false);
      }
    }
  };

  const handlePlayPauseAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play().then(() => setIsPlayingAudio(true)).catch(console.error);
    }
  };

  const handleSeekAudio = (timeInSeconds: number) => {
    if (!audioPlayerRef.current) return;
    audioPlayerRef.current.currentTime = timeInSeconds;
    setAudioCurrentTime(timeInSeconds);
    if (!isPlayingAudio) {
      audioPlayerRef.current.play().then(() => setIsPlayingAudio(true)).catch(console.error);
    }
    const seekAnnouncement = docTargetLang === 'ar'
      ? `تم الانتقال إلى الدقيقة ${Math.floor(timeInSeconds / 60)} والثانية ${Math.floor(timeInSeconds % 60)}`
      : `Seeked to ${Math.floor(timeInSeconds / 60)}:${String(Math.floor(timeInSeconds % 60)).padStart(2, '0')}`;
    onAnnounce?.(seekAnnouncement);
  };

  const handleChangePlaybackRate = (rate: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = rate;
    }
    setAudioPlaybackRate(rate);
  };

  const handleCopyTranscript = () => {
    if (!audioLectureState.transcript) return;
    navigator.clipboard.writeText(audioLectureState.transcript).then(() => {
      setIsCopiedTranscript(true);
      toast.success(docTargetLang === 'ar' ? 'تم نسخ التفريغ الصوتي إلى الحافظة بنجاح ✅' : 'Transcript copied to clipboard ✅');
      setTimeout(() => setIsCopiedTranscript(false), 3000);
    });
  };

  const handleDownloadTxt = () => {
    if (!audioLectureState.transcript) return;
    const title = audioLectureState.file?.name || 'lecture_transcript';
    const blob = exportTranscriptToTxt(title, audioLectureState.transcript, audioLectureState.segments);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\.[^/.]+$/, '')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(docTargetLang === 'ar' ? 'تم تحميل ملف التفريغ النصي TXT 📄' : 'Transcript TXT downloaded 📄');
  };

  const handleExportTranscriptDocx = async () => {
    if (!audioLectureState.transcript) return;
    try {
      const title = audioLectureState.file?.name?.replace(/\.[^/.]+$/, '') || 'Lecture';
      const blob = await exportTranscriptToDocx(title, audioLectureState.transcript, audioLectureState.segments, docTargetLang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}_transcript.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(docTargetLang === 'ar' ? 'تم تصدير التفريغ الصوتي كملف Word أصلي بنجاح 📘' : 'Transcript Word docx exported 📘');
    } catch (err) {
      console.error('Word export error:', err);
      toast.error(docTargetLang === 'ar' ? 'حدث خطأ أثناء تصدير ملف Word.' : 'Error exporting Word document.');
    }
  };

  const handleExportSummaryDocx = async (tab: SummaryType) => {
    const rawSummary = audioLectureState.summaries[tab];
    if (!rawSummary) return;
    const summaryText = Array.isArray(rawSummary) ? rawSummary.map((pt) => `• ${pt}`).join('\n') : rawSummary;
    try {
      const title = audioLectureState.file?.name?.replace(/\.[^/.]+$/, '') || 'Lecture';
      const blob = await exportSummaryToDocx(title, summaryText, tab, docTargetLang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}_summary_${tab}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(docTargetLang === 'ar' ? 'تم تصدير الملخص كملف Word أصلي بنجاح 📘' : 'Summary Word docx exported 📘');
    } catch (err) {
      console.error('Word export error:', err);
      toast.error(docTargetLang === 'ar' ? 'حدث خطأ أثناء تصدير ملف Word.' : 'Error exporting Word document.');
    }
  };

  const processDocumentFile = async (file: File) => {
    if (!file) return;
    const targetLanguage = docTargetLang;
    const isAr = targetLanguage === 'ar';
    const isFr = targetLanguage === 'fr';

    // 1. Client & Server validation
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setLastFailedFile(file);
      const errMsg = validation.localizedMessage[targetLanguage] || validation.localizedMessage.ar;
      toast.error(errMsg);
      speak(errMsg, isAr ? 'Arabic' : isFr ? 'French' : 'English');
      return;
    }

    // 2. If it's an audio file, route immediately to audio lecture workflow!
    if (validation.category === 'audio') {
      setDocStudioTab('audio-rec');
      processAudioLectureFile(file);
      return;
    }

    setDocLoading(true);
    setLastFailedFile(null);
    setExtractedDocMeta(null);

    const statusMsg = isAr
      ? `جاري فحص وقراءة "${file.name}" وترجمة وتلخيص المحتوى...`
      : isFr
      ? `Analyse de "${file.name}", traduction et synthèse en cours...`
      : `Analyzing "${file.name}", translating and summarizing content...`;
    setDocStatusText(statusMsg);
    onAnnounce?.(statusMsg);
    speak(statusMsg, isAr ? 'Arabic' : isFr ? 'French' : 'English');

    try {
      let directTextContent = '';
      let pageCount = 1;
      let isScanned = false;
      let needsOcr = false;
      let wordCount = 0;
      let hasTables = false;

      // Extract based on document format
      if (validation.category === 'pdf') {
        try {
          const buffer = await file.arrayBuffer();
          const pdfInfo = await extractTextFromPdf(buffer);
          pageCount = pdfInfo.pageCount;
          isScanned = pdfInfo.isScanned;
          needsOcr = pdfInfo.needsOcr;
          directTextContent = pdfInfo.text;
          setExtractedDocMeta({ pageCount, isScanned, needsOcr });
          if (needsOcr) {
            toast.info(isAr ? 'تم رصد صفحات مصورة؛ جاري تفعيل التعرف الضوئي OCR...' : 'Scanned pages detected; running OCR...');
          }
        } catch (e) {
          console.warn('PDF parsing error fallback:', e);
        }
      } else if (validation.category === 'docx') {
        try {
          const buffer = await file.arrayBuffer();
          const docxInfo = await extractTextFromDocx(buffer);
          directTextContent = docxInfo.text;
          wordCount = docxInfo.wordCount;
          hasTables = docxInfo.hasTables;
          setExtractedDocMeta({ wordCount, hasTables });
        } catch (e) {
          console.warn('DOCX parsing error fallback:', e);
        }
      } else if (validation.category === 'txt') {
        try {
          const text = await file.text();
          const txtInfo = extractTextFromTxt(text);
          directTextContent = txtInfo.text;
          wordCount = txtInfo.wordCount;
          setExtractedDocMeta({ wordCount });
        } catch (e) {
          console.warn('TXT parsing error fallback:', e);
        }
      }

      // Convert file to base64 for multimodal fallback or OCR
      const reader = new FileReader();
      const fileDataPromise = new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const match = res.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            resolve({ mimeType: match[1], base64: match[2] });
          } else {
            resolve({ mimeType: file.type || 'application/pdf', base64: res });
          }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      const { base64, mimeType } = await fileDataPromise;

      const prompt = `أنت معلم وأكاديمي متميز ومترجم ذكي وخبير تلخيص للمكفوفين وضعاف البصر.
المستند المرفق هو محاضرة أو كتاب أو ورقة دراسية بعنوان "${file.name}".
${directTextContent ? `\nالمحتوى النصي الكامل للمستند (مستخرج مع أرقام الصفحات):\n"""\n${directTextContent.slice(0, 50000)}\n"""\n` : ''}
المطلوب منك بدقة فائقة:
1. اقرأ واستخرج محتوى هذا المستند كاملاً.
2. إذا كان المستند بأي لغة أخرى (مثل الإنجليزية)، ترجمه وفصّله بدقة إلى لغة الهدف المطلوبة: "${isAr ? 'اللغة العربية العامية المصرية الواضحة والمفهومة للطلاب' : isFr ? 'Français' : 'English'}".
3. قدّم الإجابة في قسمين محددين:
---SUMMARY_START---
اكتب هنا "المفيد والزبدة الصافية للمحاضرة": ملخص شديد الوضوح والتركيز يبرز الفكرة الجوهرية، القوانين أو النظريات الأساسية، القرارات أو التواريخ أو الأرقام الحاسمة، بدون أي حشو.
---SUMMARY_END---

---FULLTEXT_START---
${directTextContent ? directTextContent.slice(0, 50000) : 'اكتب هنا النص المقروء والمستخرج من المستند مترجماً ومفصلاً بالكامل كلمة بكلمة أو فقرة بفقرة.'}
---FULLTEXT_END---
4. تنبيه خاص للطلاب ذوي الإعاقة البصرية (STEM & Formulas & Diagrams): إذا كان المستند يحتوي على أي معادلات رياضية أو فيزيائية أو رسوم بيانية أو جداول؛ قم بشرحها ونطقها بالكامل بالكلمات الصريحة لتكون مفهومة صوتياً 100% دون أن يفقد الطالب أي معلومة.`;

      const aiResponse = await generateAdaptiveResponse(
        prompt,
        {
          ...profile,
          language: isAr ? 'Egyptian Ammiya' : isFr ? 'French' : 'English',
        },
        [],
        [{ name: file.name, type: mimeType, data: base64 }]
      );

      let summary = '';
      let fullText = directTextContent || '';

      if (aiResponse.includes('---SUMMARY_START---') && aiResponse.includes('---SUMMARY_END---')) {
        summary = aiResponse.split('---SUMMARY_START---')[1].split('---SUMMARY_END---')[0].trim();
      }
      if (aiResponse.includes('---FULLTEXT_START---') && aiResponse.includes('---FULLTEXT_END---')) {
        const parsedFull = aiResponse.split('---FULLTEXT_START---')[1].split('---FULLTEXT_END---')[0].trim();
        if (parsedFull && parsedFull.length > 20) {
          fullText = parsedFull;
        }
      }

      if (!summary && !fullText) {
        summary = aiResponse;
      }

      const cleanSummary = cleanVisionDescription(summary, targetLanguage);
      const cleanFull = cleanVisionDescription(fullText, targetLanguage);

      const docItem: SavedDocItem = {
        id: `doc_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        sourceType: (file.type.includes('pdf') || file.name.endsWith('.docx') || file.name.endsWith('.txt')) ? 'pdf' : 'image',
        summary: cleanSummary || summary,
        fullText: cleanFull || fullText,
        targetLang: targetLanguage,
        createdAt: new Date().toISOString(),
      };

      const detected = detectQuestionPatterns(cleanFull || cleanSummary || fullText || summary);
      if (detected.length > 0) {
        setDocQuiz(
          detected.map((d) => ({
            question: d.prompt,
            options: d.options && d.options.length > 0 ? d.options : [isAr ? 'صح' : 'True', isAr ? 'خطأ' : 'False'],
            answerIndex: 0,
            explanation: d.explanation || (isAr ? 'مستخرجة مباشرة من سياق المحاضرة' : 'Extracted from lecture context'),
          }))
        );
      }

      setCurrentDoc({
        ...docItem,
        fileBase64: base64,
        fileMime: mimeType,
      });
      saveDocToHistory(docItem);
      setDocChatMessages([
        {
          role: 'assistant',
          content: isAr
            ? `أهلاً بك! لقد استخرجت ولخصت ملف "${docItem.title}". يمكنك الآن سؤالي أي استفسار أو شرح لأي نقطة غير واضحة!`
            : `I've analyzed and summarized "${docItem.title}". Feel free to ask me any question or ask for explanations!`,
        },
      ]);

      setDocLoading(false);
      setDocStatusText('');

      const readout = isAr
        ? `تم تلخيص ملف ${docItem.title} بنجاح. إليك أهم ما في المحاضرة: ${cleanSummary || summary}`
        : `Summary of ${docItem.title} is ready: ${cleanSummary || summary}`;

      onAnnounce?.(readout);
      speak(readout, isAr ? 'Arabic' : isFr ? 'French' : 'English', {
        onStart: () => setIsSpeakingDoc(true),
        onEnd: () => setIsSpeakingDoc(false),
        onError: () => setIsSpeakingDoc(false),
      });
    } catch (err: any) {
      console.error('Failed to process document:', err);
      setDocLoading(false);
      setDocStatusText('');
      setLastFailedFile(file);
      const errMsg = isAr
        ? 'عذراً، حدث خطأ أثناء قراءة المستند. تأكد من حجم الملف واتصالك بالإنترنت.'
        : 'Failed to process document. Please check the file and try again.';
      toast.error(errMsg);
      speak(errMsg, isAr ? 'Arabic' : isFr ? 'French' : 'English');
    }
  };

  const startAudioLectureRecording = async () => {
    try {
      unlockSpeechSynthesis();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      setIsRecordingAudio(true);
      setAudioRecordDuration(0);
      setLiveSpeechTranscript('');

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setAudioRecordDuration((prev) => prev + 1);
      }, 1000);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = docTargetLang === 'ar' ? 'ar-EG' : docTargetLang === 'fr' ? 'fr-FR' : 'en-US';
          rec.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' ';
            }
            setLiveSpeechTranscript(transcript.trim());
          };
          rec.start();
          speechRecRef.current = rec;
        } catch {
          /* ignore speech rec fallback */
        }
      }

      const startMsg = companionLang === 'ar' ? 'بدأ تسجيل المحاضرة الصوتية الآن...' : 'Lecture recording started...';
      toast.info(startMsg);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      toast.error(companionLang === 'ar' ? 'تعذر الوصول للميكروفون.' : 'Microphone access denied.');
    }
  };

  const stopAudioLectureRecording = async () => {
    if (!mediaRecorderRef.current || !isRecordingAudio) return;

    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        /* ignore */
      }
      speechRecRef.current = null;
    }

    setIsRecordingAudio(false);

    const isAr = docTargetLang === 'ar';
    const statusMsg = isAr
      ? 'جاري إيقاف التسجيل وتحضير التفريغ الصوتي للمحاضرة...'
      : 'Stopping recording and preparing audio transcription...';
    toast.info(statusMsg);

    mediaRecorderRef.current.onstop = async () => {
      try {
        mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());

        const lectureTitle = isAr
          ? `تسجيل_محاضرة_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}`
          : `Recorded_Lecture_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}`;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioLectureFile(audioBlob, `${lectureTitle}.webm`);
      } catch (err) {
        console.error('Error stopping audio recording:', err);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const handleAskDocQuestion = async () => {
    if (!docChatInput.trim() || !currentDoc || isDocChatAnswering) return;
    const question = docChatInput.trim();
    setDocChatInput('');
    setIsDocChatAnswering(true);

    const isAr = docTargetLang === 'ar';
    const isFr = docTargetLang === 'fr';

    setDocChatMessages((prev) => [...prev, { role: 'user', content: question }]);

    try {
      const prompt = `أنت معلم وأكاديمي متميز يشرح لطالب كفيف حول هذه المحاضرة/المستند:
عنوان المحاضرة: "${currentDoc.title}"
ملخص المحاضرة:
${currentDoc.summary}
تفاصيل المحتوى:
${currentDoc.fullText || ''}

سؤال الطالب: "${question}"

أجب على سؤال الطالب بشكل مباشر وواضح وودود بلغة ${isAr ? 'عربية عامية مصرية سهلة ومريحة للنطق الصوتي' : isFr ? 'française' : 'English'} وبدون أي نجوم ماركداون.`;

      const answer = await generateAdaptiveResponse(
        prompt,
        { ...profile, language: isAr ? 'Egyptian Ammiya' : isFr ? 'French' : 'English' },
        []
      );

      const cleanAnswer = cleanVisionDescription(answer, docTargetLang);
      setDocChatMessages((prev) => [...prev, { role: 'assistant', content: cleanAnswer }]);
      setIsDocChatAnswering(false);

      speak(cleanAnswer, isAr ? 'Arabic' : isFr ? 'French' : 'English', {
        onStart: () => setIsSpeakingDoc(true),
        onEnd: () => setIsSpeakingDoc(false),
        onError: () => setIsSpeakingDoc(false),
      });
    } catch {
      setIsDocChatAnswering(false);
      const errMsg = isAr ? 'حصل خطأ في الإجابة، جرب تسأل تاني.' : 'Error answering question, please try again.';
      setDocChatMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
      speak(errMsg, isAr ? 'Arabic' : isFr ? 'French' : 'English');
    }
  };

  const toggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(
        companionLang === 'ar'
          ? 'المتصفح لا يدعم خاصية تحويل الصوت إلى كتابة التلقائية.'
          : 'Speech recognition is not supported in this browser.'
      );
      return;
    }

    if (isDictating) {
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop();
        } catch {
          /* ignore */
        }
        speechRecRef.current = null;
      }
      setIsDictating(false);
      toast.success(companionLang === 'ar' ? 'تم إنهاء الإملاء الصوتي' : 'Dictation stopped');
    } else {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = docTargetLang === 'ar' ? 'ar-EG' : docTargetLang === 'fr' ? 'fr-FR' : 'en-US';

        rec.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + ' ';
          }
          setDictationText(text.trim());
        };

        rec.onerror = (e: any) => {
          setIsDictating(false);
          const errCode = e?.error || 'unknown';
          if (errCode !== 'no-speech') {
            toast.error(
              companionLang === 'ar'
                ? 'تعذر الوصول للميكروفون أو حدث انقطاع في الإملاء.'
                : 'Microphone unreachable or dictation interrupted.'
            );
          }
        };
        rec.onend = () => setIsDictating(false);

        rec.start();
        speechRecRef.current = rec;
        setIsDictating(true);
        toast.info(companionLang === 'ar' ? 'تحدث الآن، صوتك يتحول لكتابة مباشرة...' : 'Listening... Speak now');
      } catch (err) {
        console.error('Dictation error:', err);
        setIsDictating(false);
      }
    }
  };

  const paragraphs = useMemo(() => {
    if (!currentDoc) return [];
    const text = docViewMode === 'summary' ? currentDoc.summary : currentDoc.fullText || currentDoc.summary;
    return text.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
  }, [currentDoc, docViewMode]);

  const speakCurrentParagraph = (idx: number) => {
    if (!paragraphs[idx] || !currentDoc) return;
    cancelSpeech();
    setCurrentParagraphIdx(idx);
    const lang = currentDoc.targetLang === 'ar' ? 'Arabic' : currentDoc.targetLang === 'fr' ? 'French' : 'English';
    speak(paragraphs[idx], lang as any, {
      rate: audioPlaybackRate,
      onStart: () => setIsSpeakingDoc(true),
      onEnd: () => setIsSpeakingDoc(false),
      onError: () => setIsSpeakingDoc(false),
    });
  };

  const handleNextParagraph = () => {
    if (currentParagraphIdx < paragraphs.length - 1) {
      speakCurrentParagraph(currentParagraphIdx + 1);
    } else {
      const endMsg = companionLang === 'ar' ? 'وصلت إلى نهاية المحاضرة.' : 'End of lecture reached.';
      speak(endMsg, companionLang === 'ar' ? 'Arabic' : 'English');
    }
  };

  const handlePrevParagraph = () => {
    if (currentParagraphIdx > 0) {
      speakCurrentParagraph(currentParagraphIdx - 1);
    }
  };

  const handleGenerateStudyKit = async () => {
    if (!currentDoc || isGeneratingStudyKit) return;
    setIsGeneratingStudyKit(true);
    const isAr = currentDoc.targetLang === 'ar';
    const isFr = currentDoc.targetLang === 'fr';

    try {
      const prompt = `أنت معلم وأكاديمي متميز. بناءً على ملخص ومحتوى المحاضرة التالية:
عنوان المحاضرة: "${currentDoc.title}"
ملخص المحاضرة:
${currentDoc.summary}

المطلوب:
أنشئ 4 أسئلة اختيار من متعدد (Quiz MCQs) لاختبار فهم الطالب، و 4 بطاقات مراجعة سريعة (Flashcards) للتكرار المتباعد.
يجب إرجاع النتيجة بتنسيق JSON حصراً بهذا الشكل ودون أي كود ماركداون خارجي أو نصوص إضافية:
{
  "quiz": [
    {
      "question": "نص السؤال الواضح والدقيق",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "answerIndex": 0,
      "explanation": "تفسير تعليمي موجز لماذا هذا الخيار صحيح"
    }
  ],
  "flashcards": [
    {
      "front": "المصطلح أو السؤال الأساسي",
      "back": "المفهوم أو الإجابة المركزة"
    }
  ]
}
اللغة: ${isAr ? 'العربية' : isFr ? 'Français' : 'English'}`;

      const res = await generateAdaptiveResponse(
        prompt,
        { ...profile, language: isAr ? 'Egyptian Ammiya' : isFr ? 'French' : 'English' },
        []
      );

      let parsed: any = null;
      try {
        const jsonMatch = res.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse study kit JSON:', e);
      }

      if (parsed && Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
        setDocQuiz(parsed.quiz);
        setDocFlashcards(parsed.flashcards || []);
        setDocViewMode('quiz');
        const announcement = isAr
          ? 'تم توليد بنك الأسئلة وبطاقات المراجعة بنجاح! يمكنك الآن بدء الاختبار.'
          : 'Quiz & flashcards generated successfully!';
        toast.success(announcement);
        speak(announcement, isAr ? 'Arabic' : isFr ? 'French' : 'English');
      } else {
        toast.error(isAr ? 'تعذر إعداد الأسئلة، يرجى المحاولة ثانية.' : 'Could not generate quiz, please retry.');
      }
    } catch (err) {
      console.error(err);
      toast.error(isAr ? 'حدث خطأ أثناء إعداد بنك الأسئلة.' : 'Error generating quiz.');
    } finally {
      setIsGeneratingStudyKit(false);
    }
  };

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    setDocQuiz((prev) => {
      const updated = [...prev];
      const q = updated[qIdx];
      if (!q) return prev;
      q.selectedOption = optIdx;
      const isCorrect = optIdx === q.answerIndex;
      const lang = currentDoc?.targetLang === 'ar' ? 'Arabic' : currentDoc?.targetLang === 'fr' ? 'French' : 'English';
      const feedback = isCorrect
        ? (lang === 'Arabic' ? `إجابة صحيحة وممتازة! ${q.explanation}` : `Correct answer! ${q.explanation}`)
        : (lang === 'Arabic' ? `إجابة غير صحيحة. الإجابة الصحيحة هي: ${q.options[q.answerIndex]}. ${q.explanation}` : `Incorrect. The correct answer is ${q.options[q.answerIndex]}. ${q.explanation}`);
      speak(feedback, lang as any);
      return updated;
    });
  };

  const toggleHandsFreeVoice = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.warning(companionLang === 'ar' ? 'المتصفح لا يدعم الأوامر الصوتية.' : 'Voice recognition not supported.');
      return;
    }

    if (isVoiceCommandActive) {
      if (voiceCommandRecRef.current) {
        try { voiceCommandRecRef.current.stop(); } catch {}
        voiceCommandRecRef.current = null;
      }
      setIsVoiceCommandActive(false);
      speak(companionLang === 'ar' ? 'تم إيقاف التحكم الصوتي' : 'Voice commands deactivated', companionLang === 'ar' ? 'Arabic' : 'English');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = companionLang === 'ar' ? 'ar-EG' : companionLang === 'fr' ? 'fr-FR' : 'en-US';

      rec.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const command = lastResult[0].transcript.trim().toLowerCase();
          console.log('[Hands-Free Voice Command]:', command);

          if (/لخص|تلخيص|summary|summarize/i.test(command)) {
            setDocViewMode('summary');
            speak(companionLang === 'ar' ? 'عرض ملخص المحاضرة' : 'Showing summary', companionLang === 'ar' ? 'Arabic' : 'English');
          } else if (/اقرأ|نص|full|read/i.test(command)) {
            setDocViewMode('full');
            speak(companionLang === 'ar' ? 'عرض النص المقروء كاملاً' : 'Showing full text', companionLang === 'ar' ? 'Arabic' : 'English');
          } else if (/وورد|تحميل|download|word/i.test(command)) {
            if (currentDoc) {
              exportToWordDocument(currentDoc.title, currentDoc.summary, currentDoc.fullText, currentDoc.targetLang, docQuiz, docFlashcards);
              speak(companionLang === 'ar' ? 'جاري تنزيل ملف الوورد' : 'Downloading Word document', companionLang === 'ar' ? 'Arabic' : 'English');
            }
          } else if (/أسئلة|كويز|اختبار|quiz|test/i.test(command)) {
            handleGenerateStudyKit();
          } else if (/صوت|audio|استمع|listen/i.test(command)) {
            if (paragraphs.length > 0) speakCurrentParagraph(0);
          } else if (/التالي|next/i.test(command)) {
            handleNextParagraph();
          } else if (/السابق|prev|previous/i.test(command)) {
            handlePrevParagraph();
          } else if (/وقف|اسكت|stop|pause/i.test(command)) {
            cancelSpeech();
            setIsSpeakingDoc(false);
          }
        }
      };

      rec.onerror = () => setIsVoiceCommandActive(false);
      rec.onend = () => {
        if (isVoiceCommandActive) {
          try { rec.start(); } catch {}
        }
      };

      rec.start();
      voiceCommandRecRef.current = rec;
      setIsVoiceCommandActive(true);
      const startMsg = companionLang === 'ar'
        ? 'تم تفعيل التحكم الصوتي الذكي بدون لمس. يمكنك قول: لخص، اقرأ، وورد، أسئلة، صوت، أو وقف.'
        : 'Hands-free voice control active. Say: summarize, read, word, quiz, or stop.';
      toast.success(startMsg);
      speak(startMsg, companionLang === 'ar' ? 'Arabic' : 'English');
    } catch (e) {
      console.error(e);
      setIsVoiceCommandActive(false);
    }
  };

  const handleSignLanguageLecture = () => {
    if (!currentDoc) return;
    const cleanText = currentDoc.summary.replace(/[^\w\u0600-\u06FF\s]/g, ' ');
    const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
    setAvatarSigningWords(words);
    setShowSignAvatarInDoc(true);
    setIsAvatarSigningDoc(true);
    const msg = companionLang === 'ar' ? 'جاري ترجمة المحاضرة إلى لغة الإشارة ثلاثية الأبعاد' : 'Translating lecture to 3D Sign Language';
    toast.success(msg);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="doc-studio-title"
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-[#150917] rounded-3xl border border-[#4A1224]/60 shadow-2xl text-white max-h-[92vh] flex flex-col overflow-hidden"
            dir={companionLang === 'ar' ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#4A1224]/60 flex items-center justify-between gap-3 flex-wrap bg-[#080409]/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-[#E5A93C]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="doc-studio-title" className="font-black text-base sm:text-lg text-white">
                    {companionLang === 'ar'
                      ? 'استوديو المستندات وتلخيص المحاضرات و PDF'
                      : companionLang === 'fr'
                      ? 'Studio Documents, Cours & PDF'
                      : 'Document, Lecture & PDF Studio'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {companionLang === 'ar'
                      ? 'قراءة PDF • استخراج الزبدة والمفيد • تحويل لـ Word • تسجيل صوتي • ترجمة'
                      : 'Read PDF • Summarize Lectures • Export to Word • Audio Recording • Translate'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Target Translation Language Selector */}
                <div className="flex items-center bg-[#150917] border border-[#4A1224]/50 p-1 rounded-xl text-xs font-bold" role="group" aria-label={companionLang === 'ar' ? 'لغة الترجمة والتلخيص' : 'Translation language'}>
                  <Languages className="w-3.5 h-3.5 text-[#E5A93C] mr-1.5 ml-1" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setDocTargetLang('ar')}
                    aria-label="الترجمة إلى العربية"
                    aria-pressed={docTargetLang === 'ar'}
                    className={`px-2 py-1 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus:outline-none ${
                      docTargetLang === 'ar' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="ترجمة وتلخيص بالعربية"
                  >
                    🇪🇬 عربي
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocTargetLang('en')}
                    aria-label="Translate to English"
                    aria-pressed={docTargetLang === 'en'}
                    className={`px-2 py-1 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${
                      docTargetLang === 'en' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Translate to English"
                  >
                    🇬🇧 EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocTargetLang('fr')}
                    aria-label="Traduire en Français"
                    aria-pressed={docTargetLang === 'fr'}
                    className={`px-2 py-1 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-blue-400 focus:outline-none ${
                      docTargetLang === 'fr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Traduire en Français"
                  >
                    🇫🇷 FR
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    cancelSpeech();
                    onClose();
                  }}
                  aria-label={companionLang === 'ar' ? 'إغلاق استوديو المستندات' : 'Close Document Studio'}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div
              role="tablist"
              aria-label={companionLang === 'ar' ? 'أقسام استوديو المستندات' : 'Document Studio tabs'}
              className="flex border-b border-[#4A1224]/60 px-4 gap-1 sm:gap-2 overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-[#080409]/40"
            >
              <button
                type="button"
                role="tab"
                id="doc-tab-pdf"
                aria-controls="doc-panel-pdf"
                aria-selected={docStudioTab === 'pdf'}
                onClick={() => setDocStudioTab('pdf')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${
                  docStudioTab === 'pdf'
                    ? 'border-indigo-500 text-[#E5A93C]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileUp className="w-4 h-4" aria-hidden="true" />
                <span>{companionLang === 'ar' ? 'قارئ PDF والمستندات' : 'PDF & Doc Reader'}</span>
              </button>

              <button
                type="button"
                role="tab"
                id="doc-tab-audio-rec"
                aria-controls="doc-panel-audio-rec"
                aria-selected={docStudioTab === 'audio-rec'}
                onClick={() => setDocStudioTab('audio-rec')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${
                  docStudioTab === 'audio-rec'
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="w-4 h-4" aria-hidden="true" />
                <span>{companionLang === 'ar' ? 'تسجيل وتلخيص المحاضرة' : 'Record & Summarize Lecture'}</span>
                {isRecordingAudio && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" aria-hidden="true" />}
              </button>

              <button
                type="button"
                role="tab"
                id="doc-tab-speech-to-text"
                aria-controls="doc-panel-speech-to-text"
                aria-selected={docStudioTab === 'speech-to-text'}
                onClick={() => setDocStudioTab('speech-to-text')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${
                  docStudioTab === 'speech-to-text'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span>{companionLang === 'ar' ? 'صوت ↔ كتابة (Speech ↔ Text)' : 'Speech ↔ Text'}</span>
              </button>

              <button
                type="button"
                role="tab"
                id="doc-tab-history"
                aria-controls="doc-panel-history"
                aria-selected={docStudioTab === 'history'}
                onClick={() => setDocStudioTab('history')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${
                  docStudioTab === 'history'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" aria-hidden="true" />
                <span>{companionLang === 'ar' ? 'سجل المحفوظات' : 'Doc History'}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
                  {docHistory.length}
                </span>
              </button>
            </div>

            {/* Main Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* TAB 1: PDF & DOCUMENT READER */}
              {docStudioTab === 'pdf' && (
                <div
                  role="tabpanel"
                  id="doc-panel-pdf"
                  aria-labelledby="doc-tab-pdf"
                  tabIndex={0}
                  className="space-y-5 focus:outline-none"
                >
                  {/* Upload Card */}
                  <div className="border-2 border-dashed border-[#E5A93C]/30 hover:border-indigo-400 rounded-3xl p-6 sm:p-8 bg-[#080409]/40 text-center transition-all">
                    <input
                      type="file"
                      id="vision-doc-file-upload-modal"
                      accept=".pdf,image/*,.docx,.txt,audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                      className="hidden"
                      aria-label={companionLang === 'ar' ? 'رفع ملف PDF أو مستند أو صوت' : 'Upload PDF, document, or audio file'}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processDocumentFile(file);
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="vision-doc-file-upload-modal"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                    >
                      <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-[#E5A93C]/30 flex items-center justify-center text-[#E5A93C] shadow-xl group-hover:scale-105 transition-transform">
                        <FileUp className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-base sm:text-lg text-white">
                          {companionLang === 'ar'
                            ? 'اضغط هنا لرفع ملف PDF، مستند Word، تسجيل صوتي أو صورة محاضرة'
                            : 'Click here to upload a PDF, Word doc, audio lecture, or image'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {companionLang === 'ar'
                            ? 'يدعم ملفات PDF، Word، الكتب، السلايدات، التسجيلات الصوتية (.mp3 / .wav) والصور والروشتات'
                            : 'Supports PDF, Word, lecture audio (.mp3/.wav), slides, textbook pages, and document photos'}
                        </p>
                      </div>
                      <span className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg active:scale-95 transition-all">
                        {companionLang === 'ar' ? 'اختر ملف من جهازك' : 'Choose Document File'}
                      </span>
                    </label>
                  </div>

                  {/* Retry Card when last upload failed */}
                  {lastFailedFile && !docLoading && (
                    <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-2.5 text-red-200 text-xs">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-white">
                            {companionLang === 'ar' ? 'تعذر استخراج محتوى الملف الأخير:' : 'Failed to process previous file:'}
                          </p>
                          <p className="text-[11px] text-red-300 font-mono">{lastFailedFile.name} ({formatBytes(lastFailedFile.size)})</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => processDocumentFile(lastFailedFile)}
                        className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{companionLang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
                      </button>
                    </div>
                  )}

                  {/* Loading State */}
                  {docLoading && (
                    <div className="p-6 rounded-2xl bg-indigo-950/40 border border-[#E5A93C]/30 text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-[#E5A93C] animate-spin mx-auto" />
                      <p className="font-bold text-sm sm:text-base text-indigo-200">
                        {docStatusText || (companionLang === 'ar' ? 'جاري فحص وتلخيص المستند بالذكاء الاصطناعي...' : 'Processing document with AI...')}
                      </p>
                    </div>
                  )}

                  {/* Document Display Result */}
                  {currentDoc && !docLoading && (
                    <div className="space-y-4 rounded-3xl bg-[#080409]/70 border border-[#4A1224]/60 p-4 sm:p-6 shadow-xl">
                      {/* Title & Action Bar */}
                      <div className="flex items-center justify-between gap-3 border-b border-[#4A1224]/60 pb-4 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-600/30 text-indigo-300 font-mono text-[10px] uppercase font-bold">
                              {currentDoc.sourceType}
                            </span>
                            <h4 className="font-black text-base sm:text-lg text-white">
                              {currentDoc.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-400">
                              {new Date(currentDoc.createdAt).toLocaleString(companionLang === 'ar' ? 'ar-EG' : 'en-US')}
                            </span>
                            {extractedDocMeta?.pageCount && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-900/40 border border-blue-500/30 text-blue-300 text-[10px] font-bold">
                                📄 {companionLang === 'ar' ? `${extractedDocMeta.pageCount} صفحات` : `${extractedDocMeta.pageCount} Pages`}
                              </span>
                            )}
                            {extractedDocMeta?.wordCount && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                                📝 {companionLang === 'ar' ? `${extractedDocMeta.wordCount} كلمة` : `${extractedDocMeta.wordCount} Words`}
                              </span>
                            )}
                            {extractedDocMeta?.hasTables && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-900/40 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                                📊 {companionLang === 'ar' ? 'جداول منظمة' : 'Tables'}
                              </span>
                            )}
                            {extractedDocMeta?.isScanned && extractedDocMeta?.needsOcr && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-900/50 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                                ⚠️ {companionLang === 'ar' ? 'مستند ممسوح ضوئياً (OCR نشط)' : 'Scanned Doc (OCR Active)'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 4-way Mode Toggle: Summary | Full | Quiz | Flashcards */}
                          <div className="flex p-1 bg-[#150917] rounded-xl border border-[#4A1224]/60 text-xs font-bold overflow-x-auto max-w-full">
                            <button
                              type="button"
                              onClick={() => setDocViewMode('summary')}
                              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                                docViewMode === 'summary' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>{companionLang === 'ar' ? 'الزبدة والملخص' : 'Summary'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDocViewMode('full')}
                              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                                docViewMode === 'full' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{companionLang === 'ar' ? 'النص المقروء' : 'Full Text'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (docQuiz.length === 0) {
                                  handleGenerateStudyKit();
                                } else {
                                  setDocViewMode('quiz');
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                                docViewMode === 'quiz' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>{companionLang === 'ar' ? 'بنك الأسئلة' : 'Quiz'}</span>
                              {docQuiz.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/40 text-[10px] text-white">
                                  {docQuiz.length}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (docFlashcards.length === 0) {
                                  handleGenerateStudyKit();
                                } else {
                                  setDocViewMode('flashcards');
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                                docViewMode === 'flashcards' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{companionLang === 'ar' ? 'فلاش كاردز' : 'Flashcards'}</span>
                              {docFlashcards.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-purple-500/40 text-[10px] text-white">
                                  {docFlashcards.length}
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Listen Aloud Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isSpeakingDoc) {
                                cancelSpeech();
                                setIsSpeakingDoc(false);
                              } else {
                                speakCurrentParagraph(currentParagraphIdx);
                              }
                            }}
                            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all ${
                              isSpeakingDoc
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {isSpeakingDoc ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            <span>{isSpeakingDoc ? (companionLang === 'ar' ? 'وقف الصوت' : 'Stop') : (companionLang === 'ar' ? 'استمع صوتياً' : 'Listen')}</span>
                          </button>

                          {/* Download as Audio File (.wav) */}
                          <button
                            type="button"
                            onClick={() => {
                              downloadTextAsWavFile(currentDoc.summary, currentDoc.title);
                              toast.success(companionLang === 'ar' ? 'تم تنزيل الملف الصوتي للمحاضرة 🎧' : 'Audio file downloaded 🎧');
                            }}
                            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                            title="تحميل كملف صوتي WAV للاستماع في أي وقت"
                          >
                            <Music className="w-4 h-4" />
                            <span>{companionLang === 'ar' ? 'تحميل صوتي (.wav)' : 'Audio (.wav)'}</span>
                          </button>

                          {/* Hands-Free Voice Commands Toggle */}
                          <button
                            type="button"
                            onClick={toggleHandsFreeVoice}
                            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all ${
                              isVoiceCommandActive
                                ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                            title="التحكم الصوتي بدون لمس الشاشة"
                          >
                            <Mic className="w-4 h-4" />
                            <span>{isVoiceCommandActive ? (companionLang === 'ar' ? 'أوامر صوتية: شغالة' : 'Voice Active') : (companionLang === 'ar' ? 'تحكم صوتي بدون لمس' : 'Hands-Free')}</span>
                          </button>

                          {/* 3D Sign Language Avatar Lecture Interpreter */}
                          <button
                            type="button"
                            onClick={handleSignLanguageLecture}
                            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all ${
                              showSignAvatarInDoc
                                ? 'bg-purple-700 text-white ring-2 ring-purple-400'
                                : 'bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40'
                            }`}
                            title="ترجمة المحاضرة بلغة الإشارة ثلاثية الأبعاد (للصم وضعاف السمع)"
                          >
                            <Accessibility className="w-4 h-4" />
                            <span>{companionLang === 'ar' ? 'ترجمة إشارة (3D)' : 'Sign (3D)'}</span>
                          </button>

                          {/* Download as Word (.docx) Button */}
                          <button
                            type="button"
                            onClick={() => {
                              exportToWordDocument(
                                currentDoc.title,
                                currentDoc.summary,
                                currentDoc.fullText,
                                currentDoc.targetLang,
                                docQuiz,
                                docFlashcards
                              );
                              toast.success(companionLang === 'ar' ? 'تم تنزيل مستند Word (.docx) الأصلي 📄' : 'Native Word (.docx) downloaded 📄');
                            }}
                            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                            title="تنزيل كملف Word (.docx) منسق وميسر للقراءة والطباعة"
                          >
                            <Download className="w-4 h-4" />
                            <span>{companionLang === 'ar' ? 'تحميل Word (.docx)' : 'Export Word (.docx)'}</span>
                          </button>

                          {/* Open in Educational Book Studio */}
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                sessionStorage.setItem(
                                  'cognify_book_studio_import',
                                  JSON.stringify({
                                    text: currentDoc.fullText || currentDoc.summary || '',
                                    title: currentDoc.title || 'Document',
                                  })
                                );
                                onClose();
                                window.location.hash = '#book_studio';
                              } catch (e) {
                                console.error('Failed to open book studio:', e);
                              }
                            }}
                            className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                            title="فتح في استوديو الكتب لتنسيق الفصول والأسئلة"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>{companionLang === 'ar' ? 'استوديو الكتب 📖' : 'Book Studio 📖'}</span>
                          </button>

                          {/* Print / Save as PDF Button */}
                          <button
                            type="button"
                            onClick={() => {
                              printAccessibleDocument(
                                currentDoc.title,
                                currentDoc.summary,
                                currentDoc.fullText,
                                currentDoc.targetLang,
                                docQuiz,
                                docFlashcards
                              );
                            }}
                            className="px-3 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                            title="طباعة أو تصدير بصيغة PDF ميسرة"
                          >
                            <Printer className="w-4 h-4" />
                            <span>{companionLang === 'ar' ? 'تصدير / طباعة PDF' : 'Export / Print PDF'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Smart Audio Scrubbing Navigation Bar */}
                      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#0E0610]/95 border border-[#4A1224]/60 flex-wrap text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePrevParagraph}
                            disabled={currentParagraphIdx <= 0}
                            aria-label={companionLang === 'ar' ? 'الفقرة السابقة' : 'Previous paragraph'}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus:outline-none"
                            title="الفقرة السابقة"
                          >
                            <Rewind className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => speakCurrentParagraph(currentParagraphIdx)}
                            aria-label={companionLang === 'ar' ? 'إعادة نطق الفقرة الحالية' : 'Repeat current paragraph'}
                            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus:outline-none"
                            title="إعادة نطق الفقرة الحالية"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextParagraph}
                            disabled={currentParagraphIdx >= paragraphs.length - 1}
                            aria-label={companionLang === 'ar' ? 'الفقرة التالية' : 'Next paragraph'}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus:outline-none"
                            title="الفقرة التالية"
                          >
                            <FastForward className="w-4 h-4" />
                          </button>
                          <span className="text-slate-400 font-mono text-[11px] ml-2">
                            {companionLang === 'ar' ? `فقرة ${currentParagraphIdx + 1} من ${paragraphs.length || 1}` : `Paragraph ${currentParagraphIdx + 1} / ${paragraphs.length || 1}`}
                          </span>
                        </div>

                        {/* Playback Speed selector */}
                        <div className="flex items-center gap-1.5 bg-[#080409] p-1 rounded-xl border border-[#4A1224]/60 text-[11px]">
                          <span className="text-slate-500 px-1">⚡ {companionLang === 'ar' ? 'السرعة:' : 'Speed:'}</span>
                          {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => {
                                setAudioPlaybackRate(rate);
                                toast.info(`${companionLang === 'ar' ? 'سرعة الصوت:' : 'Playback rate:'} ${rate}x`);
                              }}
                              className={`px-2 py-0.5 rounded-md font-mono transition-all ${
                                audioPlaybackRate === rate ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3D Sign Avatar Video Floating Panel */}
                      {showSignAvatarInDoc && (
                        <div className="p-4 rounded-3xl bg-[#150917] border border-purple-500/40 relative space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-300 flex items-center gap-2">
                              <Accessibility className="w-4 h-4 text-purple-400" />
                              {companionLang === 'ar' ? 'مترجم لغة الإشارة ثلاثي الأبعاد للمحاضرة' : '3D Sign Avatar Lecture Interpreter'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowSignAvatarInDoc(false)}
                              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="h-64 rounded-2xl overflow-hidden bg-[#080409] flex items-center justify-center border border-[#4A1224]/60">
                            <React.Suspense fallback={<div className="text-xs text-purple-300 font-bold animate-pulse">جاري تحميل مجسم الإشارة ثلاثي الأبعاد...</div>}>
                              <SignAvatar3D
                                words={avatarSigningWords}
                                playing={isAvatarSigningDoc}
                                onDone={() => setIsAvatarSigningDoc(false)}
                              />
                            </React.Suspense>
                          </div>
                        </div>
                      )}

                      {/* Content Viewer Box */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#150917] border border-[#4A1224]/60 max-h-80 overflow-y-auto leading-relaxed text-sm sm:text-base text-slate-100 font-medium">
                        {docViewMode === 'summary' && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-amber-400 block mb-1">
                              {companionLang === 'ar' ? '📌 الزبدة وخلاصة المحاضرة:' : '📌 Key Takeaways & Summary:'}
                            </span>
                            <p className="whitespace-pre-wrap">{currentDoc.summary}</p>
                          </div>
                        )}

                        {docViewMode === 'full' && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-[#E5A93C] block mb-1">
                              {companionLang === 'ar' ? '📝 تفاصيل النص المستخرج كاملاً:' : '📝 Full Extracted Content:'}
                            </span>
                            <p className="whitespace-pre-wrap font-mono text-xs sm:text-sm">
                              {currentDoc.fullText || currentDoc.summary}
                            </p>
                          </div>
                        )}

                        {docViewMode === 'quiz' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-[#4A1224]/60 pb-2">
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <HelpCircle className="w-4 h-4" />
                                {companionLang === 'ar' ? '📝 بنك أسئلة واختبار فهم المحاضرة:' : '📝 Interactive Lecture Quiz:'}
                              </span>
                              <button
                                type="button"
                                onClick={handleGenerateStudyKit}
                                disabled={isGeneratingStudyKit}
                                className="px-3 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs flex items-center gap-1"
                              >
                                {isGeneratingStudyKit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                <span>{companionLang === 'ar' ? 'توليد أسئلة جديدة' : 'Regenerate Quiz'}</span>
                              </button>
                            </div>

                            {docQuiz.length === 0 ? (
                              <div className="text-center py-8 space-y-3">
                                <HelpCircle className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
                                <p className="text-sm text-slate-300 font-bold">
                                  {companionLang === 'ar' ? 'اضغط لتوليد بنك أسئلة فوري واختبار فهمك للمحاضرة' : 'Click to generate questions from this lecture'}
                                </p>
                                <button
                                  type="button"
                                  onClick={handleGenerateStudyKit}
                                  disabled={isGeneratingStudyKit}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg"
                                >
                                  {isGeneratingStudyKit ? 'جاري إعداد بنك الأسئلة...' : 'ابدأ توليد الأسئلة الآن'}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {docQuiz.map((q, qIdx) => (
                                  <div key={qIdx} className="p-4 rounded-2xl bg-[#080409]/60 border border-[#4A1224]/60 space-y-3">
                                    <p className="font-bold text-sm text-white">
                                      س {qIdx + 1}: {q.question}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {q.options.map((opt, optIdx) => {
                                        const isSelected = q.selectedOption === optIdx;
                                        const isAnswer = optIdx === q.answerIndex;
                                        const hasAnswered = q.selectedOption !== undefined;

                                        let btnClass = 'border-[#4A1224]/60 bg-[#150917] text-slate-300 hover:bg-slate-850';
                                        if (hasAnswered) {
                                          if (isAnswer) btnClass = 'border-emerald-500 bg-emerald-950/50 text-emerald-200 ring-2 ring-emerald-500/50';
                                          else if (isSelected && !isAnswer) btnClass = 'border-red-500 bg-red-950/50 text-red-200 ring-2 ring-red-500/50';
                                        }

                                        return (
                                          <button
                                            key={optIdx}
                                            type="button"
                                            onClick={() => handleSelectQuizOption(qIdx, optIdx)}
                                            className={`p-2.5 rounded-xl border text-xs text-right font-medium transition-all flex items-center justify-between ${btnClass}`}
                                          >
                                            <span>{opt}</span>
                                            {hasAnswered && isAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                                            {hasAnswered && isSelected && !isAnswer && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {q.selectedOption !== undefined && (
                                      <p className="text-xs text-indigo-300 bg-indigo-950/40 p-2.5 rounded-xl border border-[#4A1224]/60">
                                        💡 {q.explanation}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {docViewMode === 'flashcards' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-[#4A1224]/60 pb-2">
                              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4" />
                                {companionLang === 'ar' ? '🗂️ بطاقات المراجعة السريعة (Spaced Flashcards):' : '🗂️ Spaced Repetition Flashcards:'}
                              </span>
                              <button
                                type="button"
                                onClick={handleGenerateStudyKit}
                                disabled={isGeneratingStudyKit}
                                className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs flex items-center gap-1"
                              >
                                {isGeneratingStudyKit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                <span>{companionLang === 'ar' ? 'توليد بطاقات جديدة' : 'Regenerate Flashcards'}</span>
                              </button>
                            </div>

                            {docFlashcards.length === 0 ? (
                              <div className="text-center py-8 space-y-3">
                                <Sparkles className="w-10 h-10 text-purple-400 mx-auto opacity-70" />
                                <p className="text-sm text-slate-300 font-bold">
                                  {companionLang === 'ar' ? 'اضغط لتوليد بطاقات المراجعة السريعة والتكرار المتباعد' : 'Click to generate flashcards'}
                                </p>
                                <button
                                  type="button"
                                  onClick={handleGenerateStudyKit}
                                  disabled={isGeneratingStudyKit}
                                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg"
                                >
                                  {isGeneratingStudyKit ? 'جاري إعداد البطاقات...' : 'ابدأ إعداد البطاقات'}
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {docFlashcards.map((card, cIdx) => (
                                  <div
                                    key={cIdx}
                                    onClick={() => {
                                      setDocFlashcards((prev) => {
                                        const upd = [...prev];
                                        upd[cIdx].flipped = !upd[cIdx].flipped;
                                        const isFlipped = upd[cIdx].flipped;
                                        const text = isFlipped ? card.back : card.front;
                                        speak(text, currentDoc.targetLang === 'ar' ? 'Arabic' : 'English');
                                        return upd;
                                      });
                                    }}
                                    className={`p-5 rounded-2xl border cursor-pointer select-none transition-all shadow-lg min-h-[120px] flex flex-col justify-between ${
                                      card.flipped
                                        ? 'bg-purple-950/70 border-purple-500/60 text-purple-100'
                                        : 'bg-[#080409] border-[#4A1224]/60 text-slate-200 hover:border-[#4A1224]/50'
                                    }`}
                                  >
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                                      {card.flipped ? (companionLang === 'ar' ? '💡 الحل / المفهوم' : 'Answer / Concept') : (companionLang === 'ar' ? `بطاقة ${cIdx + 1} (اضغط للقلب والحل)` : `Card ${cIdx + 1} (Tap to Flip)`)}
                                    </span>
                                    <p className="font-bold text-sm sm:text-base my-auto leading-relaxed">
                                      {card.flipped ? card.back : card.front}
                                    </p>
                                    <span className="text-[10px] text-slate-500 text-left mt-2 font-mono">
                                      {card.flipped ? '🔊 منطوق' : '🔄 اضغط للاستماع للحل'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Interactive Q&A Mid-reading Section */}
                      <div className="space-y-3 pt-3 border-t border-[#4A1224]/60">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                          <MessageSquare className="w-4 h-4 text-[#E5A93C]" />
                          <span>
                            {companionLang === 'ar'
                              ? 'اسأل المعلم الذكي عن أي نقطة في هذه المحاضرة / المستند:'
                              : 'Ask the AI tutor any question about this document / lecture:'}
                          </span>
                        </div>

                        {/* Chat Messages */}
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {docChatMessages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                msg.role === 'user'
                                  ? 'bg-indigo-600/30 border border-[#E5A93C]/30 text-indigo-100 mr-auto max-w-[85%]'
                                  : 'bg-[#150917] border border-[#4A1224]/60 text-slate-200 ml-auto max-w-[85%]'
                              }`}
                            >
                              <span className="font-bold text-[10px] text-slate-400 block mb-0.5">
                                {msg.role === 'user'
                                  ? (companionLang === 'ar' ? 'أنت' : 'You')
                                  : (companionLang === 'ar' ? 'المعلم الذكي' : 'Cognify Tutor')}
                              </span>
                              <p>{msg.content}</p>
                            </div>
                          ))}
                        </div>

                        {/* Chat Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            aria-label={companionLang === 'ar' ? 'اسأل المعلم الذكي عن هذه المحاضرة' : 'Ask AI tutor about this document'}
                            value={docChatInput}
                            onChange={(e) => setDocChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAskDocQuestion();
                            }}
                            placeholder={
                              companionLang === 'ar'
                                ? 'مثلاً: ما هي أهم معادلة في المحاضرة؟ أو اشرح لي النقطة الثانية...'
                                : 'Ask anything about this document...'
                            }
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[#4A1224]/50 bg-[#080409] text-white placeholder-slate-500 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={handleAskDocQuestion}
                            disabled={!docChatInput.trim() || isDocChatAnswering}
                            aria-label={companionLang === 'ar' ? 'إرسال السؤال للمعلم الذكي' : 'Send question to AI tutor'}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-40 transition-all focus-visible:ring-2 focus-visible:ring-indigo-400 focus:outline-none"
                          >
                            {isDocChatAnswering ? (
                              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Send className="w-4 h-4" aria-hidden="true" />
                            )}
                            <span>{companionLang === 'ar' ? 'إرسال' : 'Send'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LIVE AUDIO LECTURE TRANSCRIPTION & STUDY HUB */}
              {docStudioTab === 'audio-rec' && (
                <div
                  role="tabpanel"
                  id="doc-panel-audio-rec"
                  aria-labelledby="doc-tab-audio-rec"
                  tabIndex={0}
                  className="space-y-6 focus:outline-none"
                >
                  {/* Audio Lecture Header */}
                  <div className="flex items-center justify-between border-b border-[#4A1224]/60 pb-3 flex-wrap gap-2">
                    <div>
                      <h4 className="font-black text-lg text-white flex items-center gap-2">
                        <Headphones className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                        <span>{companionLang === 'ar' ? 'منظومة تفريغ وتلخيص المحاضرات الصوتية' : 'Audio Lecture Transcription & Study Hub'}</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        {companionLang === 'ar'
                          ? 'تفريغ صوتي دقيق مع طوابع زمنية [MM:SS]، تحكم صوتي متزامن، وملخصات دراسية منفصلة للتصدير كملف Word أو TXT.'
                          : 'Verbatim transcription with [MM:SS] timestamps, synchronized audio player, and separate study summaries for Word/TXT export.'}
                      </p>
                    </div>

                    {audioLectureState.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAudioLectureState(INITIAL_AUDIO_LECTURE_STATE);
                          setIsPlayingAudio(false);
                        }}
                        aria-label={companionLang === 'ar' ? 'محاضرة جديدة' : 'New Lecture'}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{companionLang === 'ar' ? 'محاضرة جديدة' : 'New Lecture'}</span>
                      </button>
                    )}
                  </div>

                  {/* Section A: Upload / Record when IDLE */}
                  {audioLectureState.status === 'idle' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card 1: Upload Audio File */}
                        <div className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 rounded-3xl p-6 bg-[#080409]/50 text-center flex flex-col items-center justify-center space-y-3 transition-all">
                          <input
                            type="file"
                            id="audio-lecture-file-input"
                            accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac"
                            className="hidden"
                            aria-label={companionLang === 'ar' ? 'رفع ملف محاضرة صوتية' : 'Upload audio lecture file'}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) processAudioLectureFile(file);
                              e.target.value = '';
                            }}
                          />
                          <label
                            htmlFor="audio-lecture-file-input"
                            className="cursor-pointer flex flex-col items-center space-y-2.5 w-full"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                              <Music className="w-8 h-8" />
                            </div>
                            <span className="font-black text-sm text-white">
                              {companionLang === 'ar' ? 'رفع ملف محاضرة صوتية' : 'Upload Audio Lecture File'}
                            </span>
                            <span className="text-[11px] text-slate-400 max-w-xs">
                              {companionLang === 'ar'
                                ? 'يدعم MP3, WAV, M4A, WEBM, OGG, FLAC حتى 50 ميجابايت'
                                : 'Supports MP3, WAV, M4A, WEBM, OGG, FLAC up to 50MB'}
                            </span>
                            <span className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow">
                              {companionLang === 'ar' ? 'اختر ملف صوتي' : 'Select Audio'}
                            </span>
                          </label>
                        </div>

                        {/* Card 2: Live Recording */}
                        <div className="border-2 border-dashed border-red-500/40 hover:border-red-400 rounded-3xl p-6 bg-[#080409]/50 text-center flex flex-col items-center justify-center space-y-3 transition-all">
                          <button
                            type="button"
                            onClick={() => {
                              if (isRecordingAudio) {
                                stopAudioLectureRecording();
                              } else {
                                startAudioLectureRecording();
                              }
                            }}
                            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 shadow-2xl transition-all ${
                              isRecordingAudio
                                ? 'bg-red-600 text-white ring-8 ring-red-500/30 animate-pulse'
                                : 'bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-500 text-white ring-4 ring-red-950/40'
                            }`}
                            aria-label={isRecordingAudio ? 'Stop Recording' : 'Start Recording'}
                          >
                            {isRecordingAudio ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                          </button>
                          <span className="font-black text-sm text-white">
                            {isRecordingAudio
                              ? (companionLang === 'ar' ? 'اضغط للإنهاء والتفريغ' : 'Stop & Transcribe')
                              : (companionLang === 'ar' ? 'تسجيل محاضرة حية الآن' : 'Record Live Lecture')}
                          </span>
                          {isRecordingAudio ? (
                            <span className="font-mono text-xl font-black text-red-400 tracking-wider">
                              {Math.floor(audioRecordDuration / 60)}:
                              {(audioRecordDuration % 60).toString().padStart(2, '0')}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 max-w-xs">
                              {companionLang === 'ar' ? 'تسجيل مباشر من الميكروفون داخل قاعة المحاضرات' : 'Direct microphone recording inside lecture room'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Live speech preview if available */}
                      {liveSpeechTranscript && (
                        <div className="p-4 rounded-2xl bg-[#080409]/80 border border-red-500/30 text-start space-y-1">
                          <span className="text-xs font-bold text-red-400">
                            {companionLang === 'ar' ? 'تفريغ حي أثناء التسجيل:' : 'Live Recording Preview:'}
                          </span>
                          <p className="text-xs text-slate-300 font-mono">{liveSpeechTranscript}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section B: Transcribing / Processing Progress */}
                  {(audioLectureState.status === 'transcribing' || audioLectureState.status === 'uploading') && (
                    <div className="p-8 rounded-3xl bg-[#080409]/80 border border-indigo-500/40 text-center space-y-4 max-w-lg mx-auto shadow-2xl">
                      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                      <div className="space-y-1">
                        <h5 className="font-black text-white text-base">
                          {audioLectureState.file?.name}
                        </h5>
                        <p className="text-xs text-indigo-300 font-medium">
                          {audioLectureState.statusMessage || (companionLang === 'ar' ? 'جاري معالجة المحاضرة...' : 'Processing audio lecture...')}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-amber-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(audioLectureState.progressPct, 5)}%` }}
                          role="progressbar"
                          aria-valuenow={audioLectureState.progressPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>{formatBytes(audioLectureState.file?.size || 0)}</span>
                        <span className="font-bold text-indigo-300">{audioLectureState.progressPct}%</span>
                      </div>
                    </div>
                  )}

                  {/* Section C: Error State with Retry */}
                  {audioLectureState.status === 'error' && (
                    <div className="p-6 rounded-3xl bg-red-950/40 border border-red-500/50 text-center space-y-4 max-w-md mx-auto">
                      <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
                      <div className="space-y-1">
                        <h5 className="font-bold text-white text-sm">
                          {companionLang === 'ar' ? 'تعذر تفريغ المحاضرة الصوتية' : 'Transcription Failed'}
                        </h5>
                        <p className="text-xs text-red-300">
                          {audioLectureState.error?.message}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        {audioLectureState.error?.canRetry && (
                          <button
                            type="button"
                            onClick={retryAudioTranscription}
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{companionLang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setAudioLectureState(INITIAL_AUDIO_LECTURE_STATE)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                        >
                          {companionLang === 'ar' ? 'اختيار ملف آخر' : 'Choose Another File'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Section D: Ready State (Player, Segments, Summaries, Exports) */}
                  {audioLectureState.status === 'ready' && (
                    <div className="space-y-5">
                      {/* Audio Player Component */}
                      <div className="p-4 sm:p-5 rounded-3xl bg-[#080409]/80 border border-[#4A1224]/80 shadow-xl space-y-3">
                        {audioLectureState.file?.url && (
                          <audio
                            ref={audioPlayerRef}
                            src={audioLectureState.file.url}
                            onTimeUpdate={() => {
                              if (audioPlayerRef.current) {
                                setAudioCurrentTime(audioPlayerRef.current.currentTime);
                              }
                            }}
                            onLoadedMetadata={() => {
                              if (audioPlayerRef.current) {
                                setAudioDuration(audioPlayerRef.current.duration || 0);
                              }
                            }}
                            onEnded={() => setIsPlayingAudio(false)}
                            className="hidden"
                          />
                        )}

                        {/* Audio Metadata & Play Controls */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handlePlayPauseAudio}
                              className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
                              aria-label={isPlayingAudio ? 'Pause Audio' : 'Play Audio'}
                            >
                              {isPlayingAudio ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                            </button>
                            <div>
                              <h5 className="font-black text-sm text-white truncate max-w-xs sm:max-w-md">
                                {audioLectureState.file?.name}
                              </h5>
                              <span className="text-[11px] font-mono text-slate-400">
                                {formatBytes(audioLectureState.file?.size || 0)} &bull; {audioLectureState.segments.length} {companionLang === 'ar' ? 'فقرة زمنية' : 'segments'}
                              </span>
                            </div>
                          </div>

                          {/* Playback speed switcher */}
                          <div className="flex items-center gap-1 bg-[#150917] p-1 rounded-xl border border-[#4A1224]/60 text-xs font-bold">
                            {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                              <button
                                key={rate}
                                type="button"
                                onClick={() => handleChangePlaybackRate(rate)}
                                className={`px-2 py-1 rounded-lg transition-all ${
                                  audioPlaybackRate === rate ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Scrubbing slider & timer */}
                        <div className="space-y-1 pt-1">
                          <input
                            type="range"
                            min={0}
                            max={audioDuration || 100}
                            value={audioCurrentTime}
                            onChange={(e) => handleSeekAudio(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                            aria-label="Seek audio lecture"
                          />
                          <div className="flex justify-between text-[11px] font-mono text-slate-400">
                            <span>
                              {Math.floor(audioCurrentTime / 60)}:
                              {String(Math.floor(audioCurrentTime % 60)).padStart(2, '0')}
                            </span>
                            <span>
                              {Math.floor(audioDuration / 60)}:
                              {String(Math.floor(audioDuration % 60)).padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Dual Panels: Left = Interactive Timestamped Transcript | Right = Decoupled Summaries */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Transcript Panel (7 cols) */}
                        <div className="lg:col-span-7 rounded-3xl bg-[#080409]/70 border border-[#4A1224]/70 p-4 sm:p-5 space-y-3 flex flex-col">
                          <div className="flex items-center justify-between border-b border-[#4A1224]/60 pb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-indigo-400" />
                              <h5 className="font-black text-sm text-white">
                                {companionLang === 'ar' ? 'التفريغ الصوتي الدقيق مع الطوابع الزمنية' : 'Verbatim Transcript & Timestamps'}
                              </h5>
                            </div>

                            {/* Action Buttons: Copy, Download TXT, Export DOCX */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={handleCopyTranscript}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 shadow"
                                title="نسخ التفريغ الكامل"
                              >
                                {isCopiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{isCopiedTranscript ? (companionLang === 'ar' ? 'تم النسخ!' : 'Copied!') : (companionLang === 'ar' ? 'نسخ' : 'Copy')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleDownloadTxt}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 shadow"
                                title="تحميل كملف TXT"
                              >
                                <FileDown className="w-3.5 h-3.5 text-amber-400" />
                                <span>TXT</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleExportTranscriptDocx}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                                title="تصدير التفريغ الأصلي كملف Word"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Word (.docx)</span>
                              </button>
                            </div>
                          </div>

                          {/* Segments Scroll Area */}
                          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-2 pr-1">
                            {audioLectureState.segments.map((seg) => {
                              const isActive = Math.abs(audioCurrentTime - seg.seconds) < 5;
                              return (
                                <div
                                  key={seg.id}
                                  className={`p-3 rounded-2xl border transition-all text-start flex items-start gap-2.5 ${
                                    isActive
                                      ? 'bg-indigo-950/60 border-indigo-400 shadow-md ring-1 ring-indigo-500'
                                      : 'bg-[#150917]/60 border-[#4A1224]/50 hover:border-slate-600'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSeekAudio(seg.seconds)}
                                    className="px-2 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 font-mono text-[11px] font-bold whitespace-nowrap border border-indigo-500/40 flex-shrink-0 active:scale-95"
                                    aria-label={`${companionLang === 'ar' ? 'انتقل إلى الدقيقة' : 'Seek to'} ${seg.timestamp}`}
                                  >
                                    ▶ [{seg.timestamp}]
                                  </button>
                                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                                    {seg.text}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Summaries Panel (5 cols) */}
                        <div className="lg:col-span-5 rounded-3xl bg-[#080409]/70 border border-[#4A1224]/70 p-4 sm:p-5 space-y-3 flex flex-col">
                          <div className="flex items-center justify-between border-b border-[#4A1224]/60 pb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-400" />
                              <h5 className="font-black text-sm text-white">
                                {companionLang === 'ar' ? 'الملخصات والكبسولات الأكاديمية' : 'Study Summaries & Notes'}
                              </h5>
                            </div>
                          </div>

                          {/* Summary Sub-Tabs */}
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#150917] rounded-2xl border border-[#4A1224]/60 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => handleSelectSummaryTab('short')}
                              className={`py-2 px-2 rounded-xl transition-all text-center ${
                                audioLectureState.activeSummaryTab === 'short'
                                  ? 'bg-amber-500 text-black shadow'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {companionLang === 'ar' ? 'الزبدة الصافية' : 'Executive'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectSummaryTab('detailed')}
                              className={`py-2 px-2 rounded-xl transition-all text-center ${
                                audioLectureState.activeSummaryTab === 'detailed'
                                  ? 'bg-indigo-600 text-white shadow'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {companionLang === 'ar' ? 'تفصيلي شامل' : 'Detailed'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectSummaryTab('key_points')}
                              className={`py-2 px-2 rounded-xl transition-all text-center ${
                                audioLectureState.activeSummaryTab === 'key_points'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {companionLang === 'ar' ? 'أهم النقاط' : 'Key Points'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectSummaryTab('study_notes')}
                              className={`py-2 px-2 rounded-xl transition-all text-center ${
                                audioLectureState.activeSummaryTab === 'study_notes'
                                  ? 'bg-purple-600 text-white shadow'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {companionLang === 'ar' ? 'مذكرة دراسية' : 'Study Notes'}
                            </button>
                          </div>

                          {/* Summary Content Body */}
                          <div className="flex-1 overflow-y-auto max-h-[350px] p-3 rounded-2xl bg-[#150917]/70 border border-[#4A1224]/50">
                            {isGeneratingAudioSummary ? (
                              <div className="py-12 text-center space-y-2">
                                <Loader2 className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                                <p className="text-xs text-slate-400">
                                  {companionLang === 'ar' ? 'جاري إعداد التلخيص الأكاديمي...' : 'Generating study summary...'}
                                </p>
                              </div>
                            ) : audioLectureState.summaries[audioLectureState.activeSummaryTab] ? (
                              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                                {Array.isArray(audioLectureState.summaries[audioLectureState.activeSummaryTab])
                                  ? (audioLectureState.summaries[audioLectureState.activeSummaryTab] as string[]).map((pt, i) => (
                                      <div key={i} className="flex items-start gap-1.5 py-0.5">
                                        <span className="text-amber-400 font-bold">•</span>
                                        <span>{pt}</span>
                                      </div>
                                    ))
                                  : audioLectureState.summaries[audioLectureState.activeSummaryTab]}
                              </div>
                            ) : (
                              <div className="py-12 text-center space-y-3">
                                <p className="text-xs text-slate-400">
                                  {companionLang === 'ar' ? 'لم يتم توليد هذا القسم بعد.' : 'This summary type has not been generated yet.'}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleSelectSummaryTab(audioLectureState.activeSummaryTab)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow"
                                >
                                  {companionLang === 'ar' ? 'توليد هذا الملخص الآن' : 'Generate Now'}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Summary Action Bar */}
                          {audioLectureState.summaries[audioLectureState.activeSummaryTab] && (
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#4A1224]/60">
                              <button
                                type="button"
                                onClick={() => {
                                  const raw = audioLectureState.summaries[audioLectureState.activeSummaryTab];
                                  const txt = Array.isArray(raw) ? raw.join('. ') : (raw || '');
                                  speak(txt, docTargetLang === 'ar' ? 'Arabic' : docTargetLang === 'fr' ? 'French' : 'English');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>{companionLang === 'ar' ? 'استماع للملخص' : 'Listen'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportSummaryDocx(audioLectureState.activeSummaryTab)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{companionLang === 'ar' ? 'تصدير كملف Word' : 'Export Docx'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SPEECH ↔ TEXT STUDIO */}
              {docStudioTab === 'speech-to-text' && (
                <div
                  role="tabpanel"
                  id="doc-panel-speech-to-text"
                  aria-labelledby="doc-tab-speech-to-text"
                  tabIndex={0}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 focus:outline-none"
                >
                  {/* Panel A: Speech to Text (Voice Dictation) */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#080409]/70 border border-[#4A1224]/60 space-y-3 flex flex-col">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-emerald-400 flex items-center gap-1.5">
                        <Mic className="w-4 h-4" aria-hidden="true" />
                        <span>{companionLang === 'ar' ? 'تحدث ليكتب لك (إملاء صوتي)' : 'Speech to Text (Dictation)'}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={toggleDictation}
                        aria-label={isDictating ? (companionLang === 'ar' ? 'إيقاف الإملاء الصوتي' : 'Stop dictation') : (companionLang === 'ar' ? 'بدء الإملاء الصوتي' : 'Start dictation')}
                        aria-pressed={isDictating}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow focus-visible:ring-2 focus-visible:ring-emerald-400 focus:outline-none ${
                          isDictating
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isDictating ? <MicOff className="w-3.5 h-3.5" aria-hidden="true" /> : <Mic className="w-3.5 h-3.5" aria-hidden="true" />}
                        <span>{isDictating ? (companionLang === 'ar' ? 'إيقاف' : 'Stop') : (companionLang === 'ar' ? 'تحدث الآن' : 'Dictate')}</span>
                      </button>
                    </div>

                    <textarea
                      rows={7}
                      value={dictationText}
                      onChange={(e) => setDictationText(e.target.value)}
                      aria-label={companionLang === 'ar' ? 'نص الإملاء الصوتي' : 'Voice dictation text'}
                      placeholder={
                        companionLang === 'ar'
                          ? 'اضغط على "تحدث الآن" وابدأ الكلام، وسيتم كتابة كل ما تقوله بدقة هنا...'
                          : 'Click "Dictate" and start speaking. Your speech will appear here...'
                      }
                      className="w-full flex-1 p-3 rounded-2xl bg-[#150917] border border-[#4A1224]/50 text-white placeholder-slate-500 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-none"
                    />

                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (!dictationText.trim()) return;
                          navigator.clipboard.writeText(dictationText);
                          toast.success(companionLang === 'ar' ? 'تم نسخ النص المكتوب 📋' : 'Copied to clipboard 📋');
                        }}
                        disabled={!dictationText.trim()}
                        aria-label={companionLang === 'ar' ? 'نسخ النص المكتوب' : 'Copy transcribed text'}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-emerald-400 focus:outline-none"
                      >
                        {companionLang === 'ar' ? 'نسخ النص' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!dictationText.trim()) return;
                          exportToWordDocument(
                            companionLang === 'ar' ? 'إملاء صوتي' : 'Dictation Note',
                            dictationText,
                            undefined,
                            docTargetLang
                          );
                          toast.success(companionLang === 'ar' ? 'تم حفظ ملف Word 📄' : 'Word file saved 📄');
                        }}
                        disabled={!dictationText.trim()}
                        aria-label={companionLang === 'ar' ? 'تصدير الإملاء الصوتي كملف Word' : 'Export dictation as Word file'}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-400 focus:outline-none"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{companionLang === 'ar' ? 'تصدير Word' : 'Export Word'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Panel B: Text to Speech (Text Reader) */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#080409]/70 border border-[#4A1224]/60 space-y-3 flex flex-col">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-blue-400 flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                        <span>{companionLang === 'ar' ? 'اكتب ليقرأ لك بصوت واضح' : 'Text to Speech Reader'}</span>
                      </h4>
                    </div>

                    <textarea
                      rows={7}
                      value={textToReadAloud}
                      onChange={(e) => setTextToReadAloud(e.target.value)}
                      aria-label={companionLang === 'ar' ? 'النص المراد قراءته صوتياً' : 'Text to read aloud'}
                      placeholder={
                        companionLang === 'ar'
                          ? 'الصق أو اكتب أي نص هنا لسماعه فوراً بصوت طبيعي واضح...'
                          : 'Paste or type any text here to hear it read aloud...'
                      }
                      className="w-full flex-1 p-3 rounded-2xl bg-[#150917] border border-[#4A1224]/50 text-white placeholder-slate-500 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-none"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!textToReadAloud.trim()) return;
                          cancelSpeech();
                          const lang = docTargetLang === 'ar' ? 'Arabic' : docTargetLang === 'fr' ? 'French' : 'English';
                          speak(textToReadAloud, lang as any, {
                            onStart: () => setIsSpeakingDoc(true),
                            onEnd: () => setIsSpeakingDoc(false),
                            onError: () => setIsSpeakingDoc(false),
                          });
                        }}
                        disabled={!textToReadAloud.trim()}
                        aria-pressed={isSpeakingDoc}
                        aria-label={companionLang === 'ar' ? 'قراءة النص بصوت عالٍ' : 'Read text aloud'}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-blue-400 focus:outline-none"
                      >
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                        <span>{companionLang === 'ar' ? 'اقرأ بصوت عالي' : 'Read Aloud'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          cancelSpeech();
                          setIsSpeakingDoc(false);
                        }}
                        aria-label={companionLang === 'ar' ? 'إيقاف القراءة الصوتية' : 'Stop reading aloud'}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs focus-visible:ring-2 focus-visible:ring-slate-400 focus:outline-none"
                      >
                        {companionLang === 'ar' ? 'إيقاف' : 'Stop'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SAVED DOCUMENTS ARCHIVE */}
              {docStudioTab === 'history' && (
                <div
                  role="tabpanel"
                  id="doc-panel-history"
                  aria-labelledby="doc-tab-history"
                  tabIndex={0}
                  className="space-y-3 focus:outline-none"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-[#4A1224]/60">
                    <span>{companionLang === 'ar' ? 'المستندات والمحاضرات التي تم تلخيصها سابقاً' : 'Previously Summarized Documents'}</span>
                    <span className="font-mono text-[#E5A93C] font-bold">{docHistory.length} items</span>
                  </div>

                  {docHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 space-y-2">
                      <FileText className="w-10 h-10 mx-auto opacity-40 text-slate-400" aria-hidden="true" />
                      <p className="text-sm font-bold text-slate-400">
                        {companionLang === 'ar'
                          ? 'لا توجد مستندات محفوظة بعد.'
                          : 'No saved documents in your archive yet.'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {companionLang === 'ar'
                          ? 'ارفع أي ملف PDF أو سجّل محاضرة وسيتم حفظ ملخصها هنا تلقائياً.'
                          : 'Upload a PDF or record a lecture to have its summary saved here automatically.'}
                      </p>
                    </div>
                  ) : (
                    docHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-[#080409]/60 border border-[#4A1224]/60 flex items-center justify-between gap-3 hover:border-[#4A1224]/50 transition-all flex-wrap sm:flex-nowrap"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600/30 text-indigo-300 font-mono text-[10px] uppercase font-bold">
                              {item.sourceType}
                            </span>
                            <h5 className="font-bold text-sm text-white truncate">{item.title}</h5>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {item.summary}
                          </p>
                          <span className="text-[10px] text-slate-500 block">
                            {new Date(item.createdAt).toLocaleDateString(companionLang === 'ar' ? 'ar-EG' : 'en-US')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentDoc(item);
                              setDocStudioTab('pdf');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold text-xs focus-visible:ring-2 focus-visible:ring-indigo-400 focus:outline-none"
                          >
                            {companionLang === 'ar' ? 'فتح' : 'Open'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              exportToWordDocument(item.title, item.summary, item.fullText, item.targetLang);
                              toast.success(companionLang === 'ar' ? 'تم تنزيل Word 📄' : 'Word downloaded 📄');
                            }}
                            aria-label={companionLang === 'ar' ? `تحميل مستند ${item.title} كملف Word` : `Download ${item.title} as Word document`}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400 focus:outline-none"
                            title="تحميل كملف Word"
                          >
                            <Download className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDocFromHistory(item.id)}
                            aria-label={companionLang === 'ar' ? `حذف مستند ${item.title}` : `Delete document ${item.title}`}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-400 focus:outline-none"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
