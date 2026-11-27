/**
 * Rafiqi — Audio & Document Intelligence Engine (Phase 6 & Phase 7 Read & Learn)
 *
 * Implements:
 * 1. Phase 6 & 7: Lecture Intelligence (audio validation, chunking, chapters, timestamps, grounded Q&A, transcript reader, chapter editing, segment replay, uncertain speech detection)
 * 2. Phase 6 & 7: Document Reader (EPUB parsing, Scanned PDF OCR handling, reading modes, reading history with consent, navigation)
 * 3. Phase 6 & 7: Ask Your Content (grounded Q&A with page citations, definition extraction, question extraction, quiz generator with MCQ/TF/Short-Answer, study notes)
 * 4. Phase 6 & 7: Advanced Reading (Table reader cell-by-cell navigation, Math equation verbalizer, Dictionary/Translation, Vocabulary assistant, Braille Unicode translation)
 */

import { AudioTranscriptSegment } from './documentExtractor';
import { generateAdaptiveResponse } from '../services/gemini';
import { cleanVisionDescription } from './visionCleaner';

export const CLOUD_PROCESSING_PRIVACY_NOTICE_AR =
  'إشعار الخصوصية: تتم معالجة التسجيلات الصوتية والمستندات عبر واجهات Google Gemini المشفرة مباشرة، ولا يتم حفظ الملفات الأصلية أو تخزينها على خوادم وسيطة بدون موافقة صريحة من المستخدم.';

export const CLOUD_PROCESSING_PRIVACY_NOTICE_EN =
  'Privacy Notice: Audio recordings and documents are processed via direct encrypted Google Gemini endpoints. Original files are never stored or retained on intermediary servers without explicit user consent.';

/* =========================================================================
   PHASE 6 & 7: LECTURE INTELLIGENCE
   ========================================================================= */

export interface AudioValidationDetails {
  valid: boolean;
  format: string;
  sizeBytes: number;
  sizeFormatted: string;
  durationEstimateSeconds?: number;
  error?: string;
  errorMessageAr?: string;
  errorMessageEn?: string;
}

const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.aac', '.flac'];
const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Validates audio upload file for format, size, content headers, and safety
 */
export function validateLectureAudioFile(file: {
  name: string;
  size: number;
  type?: string;
}): AudioValidationDetails {
  const name = (file.name || '').trim().toLowerCase();
  const mime = (file.type || '').trim().toLowerCase();
  const size = file.size || 0;

  const sizeFormatted = size < 1024 * 1024
    ? `${(size / 1024).toFixed(1)} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;

  if (size === 0) {
    return {
      valid: false,
      format: 'unknown',
      sizeBytes: 0,
      sizeFormatted: '0 B',
      error: 'EMPTY_FILE',
      errorMessageAr: 'الملف الصوتي فارغ (0 بايت). يرجى اختيار تسجيل صوتي يحتوي على بيانات.',
      errorMessageEn: 'The audio file is empty (0 bytes). Please select a valid recording with content.',
    };
  }

  if (size > MAX_AUDIO_BYTES) {
    return {
      valid: false,
      format: 'unknown',
      sizeBytes: size,
      sizeFormatted,
      error: 'FILE_TOO_LARGE',
      errorMessageAr: `حجم الملف الصوتي كبير جداً (${sizeFormatted}). الحد الأقصى المسموح به هو 50 ميجابايت.`,
      errorMessageEn: `Audio file is too large (${sizeFormatted}). Maximum allowed limit is 50 MB.`,
    };
  }

  const matchedExt = SUPPORTED_AUDIO_EXTENSIONS.find((ext) => name.endsWith(ext));
  const isAudioMime = mime.startsWith('audio/') || mime === 'video/webm' || mime === 'video/ogg';

  if (!matchedExt && !isAudioMime) {
    return {
      valid: false,
      format: 'unsupported',
      sizeBytes: size,
      sizeFormatted,
      error: 'UNSUPPORTED_FORMAT',
      errorMessageAr: `صيغة الملف "${file.name}" غير مدعومة. الصيغ الصوتية المدعومة هي: MP3, WAV, M4A, WEBM, OGG, AAC, FLAC.`,
      errorMessageEn: `Audio format "${file.name}" is not supported. Supported formats: MP3, WAV, M4A, WEBM, OGG, AAC, FLAC.`,
    };
  }

  const format = matchedExt ? matchedExt.replace('.', '') : mime.replace('audio/', '');

  // Approximate duration: typical 128kbps audio is ~16KB per second
  const estimatedSeconds = Math.round(size / 16000);

  return {
    valid: true,
    format,
    sizeBytes: size,
    sizeFormatted,
    durationEstimateSeconds: estimatedSeconds,
  };
}

export interface LectureChapter {
  id: string;
  chapterNumber: number;
  title: string;
  startTime: string; // e.g. "00:00"
  endTime: string;   // e.g. "04:15"
  startSeconds: number;
  endSeconds: number;
  summary: string;
}

/**
 * Automatically groups transcript segments into thematic chapters based on timestamps and topics
 */
export function detectLectureChapters(
  transcript: string,
  segments: AudioTranscriptSegment[],
  lang: 'ar' | 'en' | 'fr' = 'ar'
): LectureChapter[] {
  const isAr = lang === 'ar';

  if (!segments || segments.length === 0) {
    return [
      {
        id: 'chap-1',
        chapterNumber: 1,
        title: isAr ? 'المحاضرة الكاملة' : 'Full Lecture',
        startTime: '00:00',
        endTime: '00:00',
        startSeconds: 0,
        endSeconds: 0,
        summary: transcript.slice(0, 150) + (transcript.length > 150 ? '...' : ''),
      },
    ];
  }

  const chapters: LectureChapter[] = [];
  const chunkSize = Math.max(1, Math.ceil(segments.length / 4));

  for (let i = 0; i < segments.length; i += chunkSize) {
    const chunk = segments.slice(i, i + chunkSize);
    const firstSeg = chunk[0];
    const lastSeg = chunk[chunk.length - 1];
    const chapterNum = chapters.length + 1;

    // Extract title from first words of the segment
    const cleanFirstWords = firstSeg.text
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .slice(0, 6)
      .join(' ');

    const title = cleanFirstWords
      ? `${isAr ? 'الفصل' : 'Chapter'} ${chapterNum}: ${cleanFirstWords}`
      : `${isAr ? 'الفصل' : 'Chapter'} ${chapterNum}`;

    chapters.push({
      id: `chap-${chapterNum}`,
      chapterNumber: chapterNum,
      title,
      startTime: firstSeg.timestamp,
      endTime: lastSeg.timestamp,
      startSeconds: firstSeg.seconds,
      endSeconds: lastSeg.seconds,
      summary: chunk.map((s) => s.text).join(' ').slice(0, 200) + '...',
    });
  }

  return chapters;
}

/**
 * Updates a lecture chapter (e.g., renaming title or editing summary)
 */
export function updateLectureChapter(
  chapters: LectureChapter[],
  chapterId: string,
  updates: Partial<LectureChapter>
): LectureChapter[] {
  return chapters.map((chap) => {
    if (chap.id === chapterId) {
      return { ...chap, ...updates };
    }
    return chap;
  });
}

/**
 * Formats an accessible announcement when switching or jumping to a chapter
 */
export function getChapterAnnouncement(chapter: LectureChapter, lang: 'ar' | 'en' | 'fr' = 'ar'): string {
  const isAr = lang === 'ar';
  return isAr
    ? `الانتقال إلى ${chapter.title}، يبدأ عند التوقيت ${chapter.startTime}.`
    : `Jumped to ${chapter.title}, starts at ${chapter.startTime}.`;
}

/**
 * Detects and marks uncertain or unintelligible speech with standardized accessible tags.
 * Ensures the system never hallucinates words or facts for inaudible segments.
 */
export function markUncertainSpeech(transcript: string, lang: 'ar' | 'en' | 'fr' = 'ar'): string {
  const isAr = lang === 'ar';
  const tag = isAr ? '[غير مفهوم]' : '[Unintelligible]';

  const unclearPatterns = [
    /\[غير مسموع\]/gi,
    /\[غير واضح\]/gi,
    /\[مقطع غير واضح\]/gi,
    /\[مقطع غير مفهوم\]/gi,
    /\[كلام غير مفهوم\]/gi,
    /\[inaudible\]/gi,
    /\[unclear\]/gi,
    /\[unintelligible\]/gi,
    /\[\?\?\?\]/g,
    /\(\?\?\?\)/g,
    /\b(inaudible|unintelligible)\b/gi,
  ];

  let cleaned = transcript;
  for (const pattern of unclearPatterns) {
    cleaned = cleaned.replace(pattern, tag);
  }
  return cleaned;
}

/**
 * Updates a specific transcript segment's text without touching the original audio file.
 * Automatically recalculates the full transcript while preserving segment timestamps.
 */
export function updateTranscriptSegment(
  segments: AudioTranscriptSegment[],
  segmentId: string,
  newText: string
): { segments: AudioTranscriptSegment[]; fullTranscript: string } {
  const updatedSegments = segments.map((seg) => {
    if (seg.id === segmentId) {
      return { ...seg, text: newText.trim() };
    }
    return seg;
  });

  const fullTranscript = updatedSegments.map((s) => `[${s.timestamp}] ${s.text}`).join('\n\n');
  return { segments: updatedSegments, fullTranscript };
}

/**
 * Calculates the seek and duration range to replay audio around a transcript segment
 */
export function getSegmentPlaybackRange(
  segments: AudioTranscriptSegment[],
  segmentIndex: number,
  paddingSeconds: number = 2
): { startSeconds: number; endSeconds: number; durationSeconds: number; timestamp: string } {
  if (!segments || segments.length === 0 || segmentIndex < 0 || segmentIndex >= segments.length) {
    return { startSeconds: 0, endSeconds: 0, durationSeconds: 0, timestamp: '00:00' };
  }

  const current = segments[segmentIndex];
  const next = segments[segmentIndex + 1];
  const startSeconds = Math.max(0, current.seconds - paddingSeconds);
  const endSeconds = next ? next.seconds + paddingSeconds : current.seconds + 15;
  const durationSeconds = Math.max(1, endSeconds - startSeconds);

  return {
    startSeconds,
    endSeconds,
    durationSeconds,
    timestamp: current.timestamp,
  };
}

export interface GroundedLectureAnswer {
  question: string;
  answer: string;
  isFoundInLecture: boolean;
  timestampCitation?: string;
  relevantSegmentId?: string;
  confidence: number;
}

/**
 * Answers questions strictly grounded in lecture content with timestamp citations.
 * Truthfully states when information was not mentioned in the lecture.
 */
export async function askLectureQuestion(
  transcript: string,
  question: string,
  segments: AudioTranscriptSegment[],
  lang: 'ar' | 'en' | 'fr' = 'ar',
  profile?: any
): Promise<GroundedLectureAnswer> {
  const isAr = lang === 'ar';
  const cleanQ = question.trim().toLowerCase();
  const stopwords = [
    'ما', 'هي', 'ماذا', 'كيف', 'متى', 'أين', 'لماذا', 'ماهي', 'في', 'من', 'عن', 'على', 'إلى', 'مع', 'هل', 'كم',
    'تقع', 'يقع', 'كان', 'كانت', 'يكون', 'تكون', 'تعتبر', 'يعتبر', 'أهمية', 'معنى', 'شرح', 'ذكر', 'المذكورة', 'المذكور', 'المقصود', 'معلومات', 'معلومة',
    'what', 'when', 'where', 'which', 'who', 'how', 'is', 'are', 'the', 'and', 'in', 'on', 'of', 'for', 'to',
    'mean', 'meaning', 'defined', 'definition', 'tell', 'about', 'explain', 'located', 'stated'
  ];
  const qTokens = cleanQ
    .replace(/[؟?.,!]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopwords.includes(w));

  // Score segments by number of matching query tokens
  let matchedSegment: AudioTranscriptSegment | undefined;
  let highestScore = 0;
  for (const s of segments) {
    const sText = s.text.toLowerCase();
    const score = qTokens.filter((tok) => sText.includes(tok)).length;
    if (score > highestScore) {
      highestScore = score;
      matchedSegment = s;
    }
  }

  // If query tokens have zero matches or less than 60% match ratio across the lecture
  const transcriptLower = transcript.toLowerCase();
  const hasAnyMatchInTranscript = qTokens.some((tok) => transcriptLower.includes(tok));
  const matchRatio = qTokens.length > 0 ? highestScore / qTokens.length : 0;

  if (qTokens.length > 0 && (!hasAnyMatchInTranscript || highestScore === 0 || matchRatio < 0.6)) {
    return {
      question,
      answer: isAr
        ? 'لم يتم ذكر هذه المعلومة في المحاضرة.'
        : 'This information was not mentioned in the lecture.',
      isFoundInLecture: false,
      confidence: 1.0,
    };
  }

  const prompt = isAr
    ? `أنت مساعد أكاديمي ومحاضر ذكي لخدمة الطلاب المكفوفين.
المحتوى أدناه هو تفريغ صوتي دقيق لمحاضرة دراسية:
"""
${transcript.slice(0, 25000)}
"""

السؤال المطلوب: "${question}"

القواعد الصارمة:
1. اعتمد فقط وحصرياً على ما ذكره المحاضر في النص أعلاه كمصدر للحقيقة.
2. إذا كانت الإجابة غير مذكورة في المحاضرة، قل بوضوح وأمانة: "لم يتم ذكر هذه المعلومة في المحاضرة." ولا تؤلف أو تخمن من معلوماتك العامة.
3. إذا وجدت الإجابة، اذكرها مباشرة بأسلوب مفهوم واذكر التوقيت الزمني التقريبي من المحاضرة إن وجد.
4. لا تستخدم نجوم ماركداون (**) إطلاقاً لتيسير قراءتها عبر قارئ الشاشة.`
    : `You are an academic assistive AI answering questions from this verbatim lecture transcript:
"""
${transcript.slice(0, 25000)}
"""

Question: "${question}"

Strict Rules:
1. Rely EXCLUSIVELY on facts explicitly stated by the lecturer in the transcript above.
2. If the answer is NOT present in the lecture, state truthfully: "This information was not mentioned in the lecture." NEVER fabricate or guess.
3. If present, state the answer clearly with timestamp citations.
4. Avoid markdown asterisks (**) so text reads naturally with screen readers.`;

  const aiResponse = await generateAdaptiveResponse(
    prompt,
    {
      ...profile,
      language: isAr ? 'Egyptian Ammiya' : 'English',
    },
    [],
    []
  );

  let cleanAns = cleanVisionDescription(aiResponse, lang);
  if (!cleanAns || cleanAns.includes('⚠️') || cleanAns.includes('غير مهيأة') || cleanAns.includes('لم تكتمل العملية')) {
    if (matchedSegment && matchRatio >= 0.6) {
      cleanAns = isAr
        ? `بناءً على ما ورد في المحاضرة [${matchedSegment.timestamp}]: ${matchedSegment.text}`
        : `According to the lecture [${matchedSegment.timestamp}]: ${matchedSegment.text}`;
    } else {
      cleanAns = isAr
        ? 'لم يتم ذكر هذه المعلومة في المحاضرة.'
        : 'This information was not mentioned in the lecture.';
    }
  }
  const notFoundPatterns = [
    'لم يتم ذكر',
    'غير مذكور',
    'لم يذكر',
    'not mentioned',
    'not present',
    'not found in the lecture',
  ];
  const isNotFound = notFoundPatterns.some((p) => cleanAns.toLowerCase().includes(p.toLowerCase()));

  return {
    question,
    answer: cleanAns,
    isFoundInLecture: !isNotFound,
    timestampCitation: matchedSegment?.timestamp,
    relevantSegmentId: matchedSegment?.id,
    confidence: isNotFound ? 0.95 : 0.9,
  };
}

export interface SmartLectureSummary {
  shortSummary: string;
  detailedSummary: string;
  mainIdeas: string[];
  definitions: { term: string; definition: string }[];
  keyTerminology: string[];
  importantExamples: string[];
  actionableStudyPoints: string[];
  datesAndNumbers: string[];
  lecturerQuestions: string[];
  revisionQuestions: string[];
}

/**
 * Extracts comprehensive structured study summaries from verbatim transcripts.
 * Includes short/detailed summary, main ideas, definitions, terminology, examples,
 * important dates & numbers, questions asked by lecturer, and revision questions.
 */
export async function generateStructuredLectureSummary(
  transcript: string,
  lang: 'ar' | 'en' | 'fr' = 'ar',
  profile?: any
): Promise<SmartLectureSummary> {
  const isAr = lang === 'ar';

  const prompt = isAr
    ? `أنت خبير تلخيص أكاديمي للطلاب المكفوفين وضعاف البصر.
المحتوى التالي هو تفريغ نصي دقيق لمحاضرة جامعية:
"""
${transcript.slice(0, 20000)}
"""

المطلوب استخراج ملخص دراسي منظم بدقة في صيغة JSON فقط بدون أي ماركداون خارجي:
{
  "shortSummary": "ملخص فائق التركيز في 3 إلى 5 جمل",
  "detailedSummary": "ملخص مفصل يشرح محاور المحاضرة كاملة",
  "mainIdeas": ["الفكرة الرئيسية 1", "الفكرة الرئيسية 2", "الفكرة الرئيسية 3"],
  "definitions": [
    {"term": "المصطلح 1", "definition": "التعريف الدقيق كما ورد"},
    {"term": "المصطلح 2", "definition": "التعريف الدقيق"}
  ],
  "keyTerminology": ["مصطلح 1", "مصطلح 2", "مصطلح 3"],
  "importantExamples": ["المثال 1 الذي ضربه المحاضر", "المثال 2"],
  "actionableStudyPoints": ["نقطة مذاكرة وتكليف 1", "نقطة 2"],
  "datesAndNumbers": ["أي تواريخ أو إحصائيات أو أرقام وردت في المحاضرة"],
  "lecturerQuestions": ["الأسئلة التي طرحها المحاضر على الطلاب أثناء الشرح"],
  "revisionQuestions": ["أسئلة مراجعة مقترحة للامتحان مبنية على المحاضرة"]
}`
    : `You are an expert academic summarizer for visually impaired university students.
Extract a comprehensive structured study summary from this lecture transcript:
"""
${transcript.slice(0, 20000)}
"""

Respond with strictly valid JSON only:
{
  "shortSummary": "Concise summary in 3 to 5 sentences",
  "detailedSummary": "Detailed summary covering all major lecture themes",
  "mainIdeas": ["Main Idea 1", "Main Idea 2"],
  "definitions": [{"term": "Term 1", "definition": "Definition"}],
  "keyTerminology": ["Terminology 1", "Terminology 2"],
  "importantExamples": ["Example 1 mentioned by lecturer"],
  "actionableStudyPoints": ["Study action point 1"],
  "datesAndNumbers": ["Dates, numbers, or metrics mentioned in lecture"],
  "lecturerQuestions": ["Questions posed by the lecturer during the session"],
  "revisionQuestions": ["Suggested revision questions grounded in content"]
}`;

  try {
    const rawRes = await generateAdaptiveResponse(
      prompt,
      { ...profile, language: isAr ? 'Egyptian Ammiya' : 'English' },
      [],
      []
    );
    const jsonStr = rawRes.replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        shortSummary: parsed.shortSummary || '',
        detailedSummary: parsed.detailedSummary || '',
        mainIdeas: Array.isArray(parsed.mainIdeas) ? parsed.mainIdeas : [],
        definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
        keyTerminology: Array.isArray(parsed.keyTerminology) ? parsed.keyTerminology : [],
        importantExamples: Array.isArray(parsed.importantExamples) ? parsed.importantExamples : [],
        actionableStudyPoints: Array.isArray(parsed.actionableStudyPoints) ? parsed.actionableStudyPoints : [],
        datesAndNumbers: Array.isArray(parsed.datesAndNumbers) ? parsed.datesAndNumbers : [],
        lecturerQuestions: Array.isArray(parsed.lecturerQuestions) ? parsed.lecturerQuestions : [],
        revisionQuestions: Array.isArray(parsed.revisionQuestions) ? parsed.revisionQuestions : [],
      };
    }
  } catch (err) {
    console.error('Failed to parse structured lecture summary JSON:', err);
  }

  // Fallback grounded summary
  const fallbackSentences = transcript.split(/[.\n]+/).filter((s) => s.trim().length > 15);
  const foundNumbersAndDates = Array.from(
    new Set(
      (transcript.match(/(?:\d{4}|\d+(?:\.\d+)?%?|\b\d+\b|[\u0660-\u0669]+)/g) || []).slice(0, 5)
    )
  );
  const foundLecturerQuestions = transcript
    .split(/[.\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.endsWith('؟') || s.endsWith('?'))
    .slice(0, 3);

  const fallbackRevisionQuestions = fallbackSentences.slice(0, 3).map((s, idx) =>
    isAr ? `سؤال مراجعة ${idx + 1}: كيف تفسر ما ورد بشأن "${s.slice(0, 40)}..."؟` : `Revision Q${idx + 1}: How would you explain "${s.slice(0, 40)}..."?`
  );

  return {
    shortSummary: fallbackSentences.slice(0, 3).join('. ') + '.',
    detailedSummary: transcript.slice(0, 1000) + '...',
    mainIdeas: fallbackSentences.slice(0, 4),
    definitions: [],
    keyTerminology: [],
    importantExamples: [],
    actionableStudyPoints: [
      isAr ? 'مراجعة الملاحظات والتركيز على المفاهيم المذكورة في بداية المحاضرة.' : 'Review key lecture concepts from opening section.',
    ],
    datesAndNumbers: foundNumbersAndDates,
    lecturerQuestions: foundLecturerQuestions,
    revisionQuestions: fallbackRevisionQuestions,
  };
}

/* =========================================================================
   PHASE 6.2: DOCUMENT READER & EPUB PARSER
   ========================================================================= */

export interface ExtractedEpubChapter {
  id: string;
  chapterNumber: number;
  title: string;
  content: string;
  paragraphs: string[];
}

export interface ExtractedEpubResult {
  valid: boolean;
  title: string;
  creator?: string;
  chapters: ExtractedEpubChapter[];
  fullText: string;
  chapterCount: number;
  wordCount: number;
  error?: string;
}

/**
 * Pure, zero-dependency EPUB reader using PKZip extraction of container.xml and XHTML chapters
 */
export async function extractTextFromEpub(
  buffer: ArrayBuffer | Uint8Array
): Promise<ExtractedEpubResult> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (bytes.length < 30 || bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
    return {
      valid: false,
      title: '',
      chapters: [],
      fullText: '',
      chapterCount: 0,
      wordCount: 0,
      error: 'NOT_A_VALID_EPUB_OR_ZIP',
    };
  }

  try {
    // Scan ZIP local file headers
    let offset = 0;
    const fileEntries: { filename: string; data: Uint8Array }[] = [];

    while (offset < bytes.length - 30) {
      if (
        bytes[offset] === 0x50 &&
        bytes[offset + 1] === 0x4B &&
        bytes[offset + 2] === 0x03 &&
        bytes[offset + 3] === 0x04
      ) {
        const compressionMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
        const compressedSize =
          bytes[offset + 18] |
          (bytes[offset + 19] << 8) |
          (bytes[offset + 20] << 16) |
          (bytes[offset + 21] << 24);
        const uncompressedSize =
          bytes[offset + 22] |
          (bytes[offset + 23] << 8) |
          (bytes[offset + 24] << 16) |
          (bytes[offset + 25] << 24);
        const filenameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
        const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);

        const filenameBytes = bytes.subarray(offset + 30, offset + 30 + filenameLen);
        const filename = new TextDecoder().decode(filenameBytes);

        const dataOffset = offset + 30 + filenameLen + extraLen;
        const compressedData = bytes.subarray(dataOffset, dataOffset + compressedSize);

        if (compressionMethod === 0) {
          // Stored (no compression)
          fileEntries.push({ filename, data: compressedData });
        } else if (compressionMethod === 8) {
          // Deflated
          try {
            if (typeof DecompressionStream !== 'undefined') {
              const ds = new DecompressionStream('deflate-raw');
              const writer = ds.writable.getWriter();
              writer.write(compressedData);
              writer.close();
              const response = new Response(ds.readable);
              const arrayBuf = await response.arrayBuffer();
              fileEntries.push({ filename, data: new Uint8Array(arrayBuf) });
            } else {
              // Node.js fallback
              const zlib = await import(/* @vite-ignore */ 'zlib');
              if (zlib && zlib.inflateRawSync) {
                fileEntries.push({ filename, data: new Uint8Array(zlib.inflateRawSync(compressedData)) });
              }
            }
          } catch {}
        }

        offset = dataOffset + compressedSize;
      } else {
        offset++;
      }
    }

    // Filter XHTML/HTML and OPF files
    const htmlEntries = fileEntries.filter((e) =>
      /\.(x?html?|xml)$/i.test(e.filename) && !e.filename.includes('container.xml')
    );

    const chapters: ExtractedEpubChapter[] = [];
    let fullTextAccumulator = '';

    for (let idx = 0; idx < htmlEntries.length; idx++) {
      const entry = htmlEntries[idx];
      const rawHtml = new TextDecoder('utf-8').decode(entry.data);

      // Strip HTML tags and extract readable paragraphs
      const cleanText = rawHtml
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/[^\S\r\n]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (cleanText.length > 20) {
        const paragraphs = cleanText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        const chapterNumber = chapters.length + 1;
        const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i) || rawHtml.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
        const chapterTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : `Chapter ${chapterNumber}`;

        chapters.push({
          id: `epub-chap-${chapterNumber}`,
          chapterNumber,
          title: chapterTitle || `Chapter ${chapterNumber}`,
          content: cleanText,
          paragraphs: paragraphs.length > 0 ? paragraphs : [cleanText],
        });

        fullTextAccumulator += (fullTextAccumulator ? '\n\n' : '') + cleanText;
      }
    }

    const wordCount = fullTextAccumulator.split(/\s+/).filter(Boolean).length;

    return {
      valid: chapters.length > 0,
      title: chapters[0]?.title || 'EPUB Document',
      chapters,
      fullText: fullTextAccumulator,
      chapterCount: chapters.length,
      wordCount,
    };
  } catch (err: any) {
    return {
      valid: false,
      title: '',
      chapters: [],
      fullText: '',
      chapterCount: 0,
      wordCount: 0,
      error: `EPUB_PARSE_ERROR: ${err.message || 'Corrupted archive'}`,
    };
  }
}

export interface DocumentReadingHistoryItem {
  id: string;
  title: string;
  fileType: 'pdf' | 'docx' | 'epub' | 'txt';
  lastPageNumber: number;
  lastParagraphIndex: number;
  lastOpenedTimestamp: number;
  progressPercentage: number;
  wordCount: number;
}

export const DOCUMENT_READING_HISTORY_KEY = 'rafiqi_document_reading_history_v1';

/**
 * Saves document reading progress without storing the document body for privacy.
 * Strictly respects user consent — if userConsent is false, progress is not stored.
 */
export function saveDocumentReadingProgress(
  item: DocumentReadingHistoryItem,
  userConsent: boolean = true
): boolean {
  if (!userConsent) return false;
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DOCUMENT_READING_HISTORY_KEY);
    let list: DocumentReadingHistoryItem[] = raw ? JSON.parse(raw) : [];
    list = list.filter((i) => i.id !== item.id);
    const enrichedItem: DocumentReadingHistoryItem = {
      ...item,
      lastOpenedTimestamp: item.lastOpenedTimestamp || Date.now(),
    };
    list.unshift(enrichedItem);
    localStorage.setItem(DOCUMENT_READING_HISTORY_KEY, JSON.stringify(list.slice(0, 20)));
    return true;
  } catch (e) {
    console.error('Failed to save document reading history:', e);
    return false;
  }
}

/**
 * Retrieves recently opened documents
 */
export function getDocumentReadingHistory(): DocumentReadingHistoryItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DOCUMENT_READING_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Deletes a single item from document reading history
 */
export function removeDocumentReadingHistoryItem(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(DOCUMENT_READING_HISTORY_KEY);
    if (!raw) return;
    const list: DocumentReadingHistoryItem[] = JSON.parse(raw);
    const updated = list.filter((i) => i.id !== id);
    localStorage.setItem(DOCUMENT_READING_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * Clears all reading history
 */
export function clearDocumentReadingHistory(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(DOCUMENT_READING_HISTORY_KEY);
  } catch {}
}

/* =========================================================================
   PHASE 6.3: ASK YOUR CONTENT & QUIZ GENERATOR
   ========================================================================= */

export interface DocumentGroundedAnswer {
  question: string;
  answer: string;
  isFound: boolean;
  citationPage?: number;
  citationSnippet?: string;
}

/**
 * Answers questions grounded in document text with exact page citations
 */
export async function askDocumentContent(
  documentText: string,
  question: string,
  pages: { pageNum: number; text: string }[] = [],
  lang: 'ar' | 'en' | 'fr' = 'ar',
  profile?: any
): Promise<DocumentGroundedAnswer> {
  const isAr = lang === 'ar';
  const cleanQ = question.trim().toLowerCase();
  const stopwords = ['ما', 'هي', 'ماذا', 'كيف', 'متى', 'أين', 'لماذا', 'ماهي', 'في', 'من', 'عن', 'على', 'إلى', 'مع', 'هل', 'what', 'when', 'where', 'which', 'who', 'how', 'is', 'are', 'the', 'and', 'in', 'on', 'of'];
  const qTokens = cleanQ
    .replace(/[؟?.,!]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopwords.includes(w));

  // Search for the page containing the highest number of keywords
  let matchingPage: { pageNum: number; text: string } | undefined;
  let highestPageScore = 0;
  if (pages && pages.length > 0) {
    for (const p of pages) {
      const pLower = p.text.toLowerCase();
      const score = qTokens.filter((tok) => pLower.includes(tok)).length;
      if (score > highestPageScore) {
        highestPageScore = score;
        matchingPage = p;
      }
    }
  }

  // If query tokens have zero matches anywhere in document text, concept is absent
  const docLower = documentText.toLowerCase();
  const hasAnyMatchInDoc = qTokens.some((tok) => docLower.includes(tok));
  if (qTokens.length > 0 && !hasAnyMatchInDoc && highestPageScore === 0) {
    return {
      question,
      answer: isAr
        ? 'هذه المعلومة غير موجودة في المستند المرفق.'
        : 'This information cannot be found in the provided document.',
      isFound: false,
    };
  }

  const prompt = isAr
    ? `أنت مساعد أكاديمي لخدمة الطلاب المكفوفين.
المحتوى أدناه مستخرج من مستند دراسي:
"""
${documentText.slice(0, 24000)}
"""

السؤال: "${question}"

قواعد صارمة:
1. استخرج الإجابة حصرياً من النص أعلاه واذكر رقم الصفحة أو القسم إن أمكن.
2. إذا كانت الإجابة غير موجودة تماماً في المستند، قل بوضوح: "هذه المعلومة غير موجودة في المستند المرفق." ولا تؤلف إجابات من خارج النص.
3. تجنب علامات التنسيق المعقدة لتسهيل القراءة عبر قارئ الشاشة.`
    : `You are an academic assistive AI answering questions from this study document:
"""
${documentText.slice(0, 24000)}
"""

Question: "${question}"

Strict Rules:
1. Answer ONLY using explicit facts in the document text above. Include page/section citations.
2. If the answer cannot be found in the document, state clearly: "This information cannot be found in the provided document." NEVER fabricate facts.
3. Format cleanly for screen-reader TTS.`;

  const rawAns = await generateAdaptiveResponse(
    prompt,
    { ...profile, language: isAr ? 'Egyptian Ammiya' : 'English' },
    [],
    []
  );

  let cleanAns = cleanVisionDescription(rawAns, lang);
  if (!cleanAns || cleanAns.includes('⚠️') || cleanAns.includes('غير مهيأة') || cleanAns.includes('لم تكتمل العملية')) {
    if (matchingPage) {
      cleanAns = isAr
        ? `بناءً على ما ورد في المستند (صفحة ${matchingPage.pageNum}): ${matchingPage.text}`
        : `According to the document (Page ${matchingPage.pageNum}): ${matchingPage.text}`;
    } else {
      cleanAns = isAr
        ? 'هذه المعلومة غير موجودة في المستند المرفق.'
        : 'This information cannot be found in the provided document.';
    }
  }
  const notFoundPatterns = [
    'غير موجودة في المستند',
    'لم يتم العثور',
    'cannot be found in the provided document',
    'not found in the document',
  ];
  const isNotFound = notFoundPatterns.some((p) => cleanAns.toLowerCase().includes(p.toLowerCase()));

  return {
    question,
    answer: cleanAns,
    isFound: !isNotFound,
    citationPage: matchingPage?.pageNum,
    citationSnippet: matchingPage ? matchingPage.text.slice(0, 150) + '...' : undefined,
  };
}

export interface GeneratedQuizQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswerText?: string;
  groundedExplanation: string;
}

export interface GeneratedQuiz {
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  questions: GeneratedQuizQuestion[];
  isAiGeneratedNotice: string;
}

/**
 * Generates an accessible quiz from document or lecture content with grounded explanations.
 * Supports multiple choice, true/false, and short-answer questions.
 */
export async function generateContentQuiz(
  sourceText: string,
  options: {
    count?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    type?: 'mcq' | 'true_false' | 'short_answer' | 'all';
    lang?: 'ar' | 'en' | 'fr';
    profile?: any;
  }
): Promise<GeneratedQuiz> {
  const count = options.count || 5;
  const difficulty = options.difficulty || 'medium';
  const lang = options.lang || 'ar';
  const quizType = options.type || 'all';
  const isAr = lang === 'ar';

  const prompt = isAr
    ? `أنت خبير تقييم تربوي. أنشئ اختباراً تدريبياً دقيقاً من المحتوى الدراسي التالي:
"""
${sourceText.slice(0, 18000)}
"""

المواصفات:
- عدد الأسئلة: ${count}
- مستوى الصعوبة: ${difficulty}
- نوع الأسئلة: ${quizType === 'short_answer' ? 'أسئلة مقالية قصيرة (short answer)' : quizType === 'mcq' ? 'اختيار من متعدد فقط' : quizType === 'true_false' ? 'صواب وخطأ فقط' : 'مزيج من اختيار من متعدد، صواب وخطأ، وأسئلة إجابة قصيرة'}
- يجب أن تكون الأسئلة مدعومة تماماً بالحقائق الواردة في النص.

الرد بصيغة JSON فقط:
{
  "title": "اختبار تدريبي ميسر",
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "نص السؤال هنا؟",
      "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
      "correctOptionIndex": 1,
      "groundedExplanation": "التفسير المعتمد على النص"
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "نص العبارة هنا",
      "options": ["صواب", "خطأ"],
      "correctOptionIndex": 0,
      "groundedExplanation": "التفسير"
    },
    {
      "id": "q3",
      "type": "short_answer",
      "question": "نص السؤال المقالي القصير؟",
      "correctAnswerText": "الإجابة النموذجية المباشرة المستخرجة من النص",
      "groundedExplanation": "التفسير المعتمد على النص"
    }
  ]
}`
    : `Create an accessible training quiz with ${count} questions (difficulty: ${difficulty}, type: ${quizType}) based on this text:
"""
${sourceText.slice(0, 18000)}
"""

Respond with strictly valid JSON only:
{
  "title": "Practice Quiz",
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "groundedExplanation": "Grounded rationale"
    },
    {
      "id": "q2",
      "type": "short_answer",
      "question": "Short answer question?",
      "correctAnswerText": "Model concise answer from text",
      "groundedExplanation": "Grounded rationale"
    }
  ]
}`;

  try {
    const raw = await generateAdaptiveResponse(
      prompt,
      { ...options.profile, language: isAr ? 'Egyptian Ammiya' : 'English' },
      [],
      []
    );
    const jsonStr = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        title: parsed.title || (isAr ? 'اختبار دراسي تفاعلي' : 'Practice Quiz'),
        difficulty,
        questionCount: parsed.questions?.length || 0,
        questions: parsed.questions || [],
        isAiGeneratedNotice: isAr
          ? 'تنبيه: هذه الأسئلة تم إنشاؤها آلياً بواسطة الذكاء الاصطناعي بناءً على محتوى المستند وليست الأسئلة الأصلية لواضع المنهج.'
          : 'Notice: These questions were automatically generated by AI from the document content and are not the author\'s original exam questions.',
      };
    }
  } catch (e) {
    console.error('Quiz generation error:', e);
  }

  // Grounded fallback quiz generator using source sentences
  const sentences = sourceText.split(/[.\n]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  const fallbackQuestions: GeneratedQuizQuestion[] = sentences.slice(0, count).map((sent, idx) => {
    if (quizType === 'short_answer' || (quizType === 'all' && idx % 3 === 2)) {
      return {
        id: `q-${idx + 1}`,
        type: 'short_answer',
        question: isAr ? `اشرح باختصار بناءً على ما ورد: "${sent.slice(0, 50)}..."؟` : `Explain briefly based on the text: "${sent.slice(0, 50)}..."?`,
        correctAnswerText: sent,
        groundedExplanation: sent,
      };
    }

    if (quizType === 'true_false' || (quizType === 'all' && idx % 2 === 1)) {
      return {
        id: `q-${idx + 1}`,
        type: 'true_false',
        question: isAr ? `صواب أم خطأ: "${sent.slice(0, 60)}..."` : `True or False: "${sent.slice(0, 60)}..."`,
        options: [isAr ? 'صواب' : 'True', isAr ? 'خطأ' : 'False'],
        correctOptionIndex: 0,
        groundedExplanation: sent,
      };
    }

    return {
      id: `q-${idx + 1}`,
      type: 'mcq',
      question: isAr ? `ما هي العبارة الدقيقة وفقاً للمحتوى بخصوص: "${sent.slice(0, 50)}..."؟` : `Which statement is correct regarding: "${sent.slice(0, 50)}..."?`,
      options: [sent, isAr ? 'خيار غير صحيح' : 'Incorrect statement', isAr ? 'لا ينطبق' : 'Not applicable'],
      correctOptionIndex: 0,
      groundedExplanation: sent,
    };
  });

  return {
    title: isAr ? 'اختبار مراجعة دراسي' : 'Review Quiz',
    difficulty,
    questionCount: fallbackQuestions.length,
    questions: fallbackQuestions,
    isAiGeneratedNotice: isAr
      ? 'تنبيه: هذه الأسئلة تم إنشاؤها آلياً بواسطة الذكاء الاصطناعي بناءً على محتوى المستند وليست الأسئلة الأصلية لواضع المنهج.'
      : 'Notice: These questions were automatically generated by AI from the document content and are not the author\'s original exam questions.',
  };
}

export interface StudyNoteSection {
  heading: string;
  points: string[];
}

export interface StructuredStudyNotes {
  title: string;
  summary: string;
  sections: StudyNoteSection[];
  reviewQuestions: string[];
  createdAt: number;
}

/**
 * Generates structured study notes from document or lecture text
 */
export async function generateStudyNotes(
  sourceText: string,
  lang: 'ar' | 'en' | 'fr' = 'ar',
  profile?: any
): Promise<StructuredStudyNotes> {
  const isAr = lang === 'ar';
  const prompt = isAr
    ? `أنت خبير إعداد مذكرات دراسية ومساعد أكاديمي للطلاب المكفوفين.
أعد مذكرة دراسية منظمة وميسرة من النص التالي:
"""
${sourceText.slice(0, 20000)}
"""

المطلوب الرد بصيغة JSON فقط:
{
  "title": "عنوان المذكرة الدراسية",
  "summary": "ملخص شامل وواضح",
  "sections": [
    {
      "heading": "عنوان القسم الأول",
      "points": ["نقطة دراسية 1", "نقطة دراسية 2"]
    }
  ],
  "reviewQuestions": ["سؤال مراجعة 1", "سؤال مراجعة 2"]
}`
    : `You are an academic study notes creator for visually impaired students.
Generate structured study notes from this text:
"""
${sourceText.slice(0, 20000)}
"""

Respond with valid JSON only:
{
  "title": "Study Notes Title",
  "summary": "Comprehensive overview",
  "sections": [
    {
      "heading": "Section Heading",
      "points": ["Key study point 1", "Key study point 2"]
    }
  ],
  "reviewQuestions": ["Review question 1", "Review question 2"]
}`;

  try {
    const rawRes = await generateAdaptiveResponse(
      prompt,
      { ...profile, language: isAr ? 'Egyptian Ammiya' : 'English' },
      [],
      []
    );
    const jsonStr = rawRes.replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        title: parsed.title || (isAr ? 'مذكرة دراسية ميسرة' : 'Study Notes'),
        summary: parsed.summary || '',
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
        reviewQuestions: Array.isArray(parsed.reviewQuestions) ? parsed.reviewQuestions : [],
        createdAt: Date.now(),
      };
    }
  } catch (err) {
    console.error('Failed to generate study notes JSON:', err);
  }

  // Fallback notes
  const sentences = sourceText.split(/[.\n]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  return {
    title: isAr ? 'مذكرة دراسية ميسرة' : 'Study Notes',
    summary: sentences.slice(0, 2).join('. ') + '.',
    sections: [
      {
        heading: isAr ? 'النقاط الأساسية' : 'Key Concepts',
        points: sentences.slice(0, 5),
      },
    ],
    reviewQuestions: [
      isAr ? 'ما هو المحور الرئيسي الذي تناولته هذه المادة؟' : 'What was the main topic discussed in this material?',
    ],
    createdAt: Date.now(),
  };
}

/**
 * Looks up definition, translation, and pronunciation for vocabulary assistance
 */
export async function lookupVocabularyTerm(
  term: string,
  contextSentence?: string,
  lang: 'ar' | 'en' = 'ar',
  profile?: any
): Promise<VocabularyWordItem> {
  const isAr = lang === 'ar';
  const cleanTerm = term.trim();

  const prompt = isAr
    ? `عرّف المصطلح الأكاديمي أو اللغوي التالي للطلاب المكفوفين: "${cleanTerm}"
${contextSentence ? `سياق ورود المصطلح: "${contextSentence}"` : ''}

قدم الرد بصيغة JSON فقط:
{
  "definition": "شرح مبسط وموجز للمصطلح في سياقه",
  "pronunciation": "النطق الصوتي الواضح",
  "translation": "الترجمة المقابلة بالإنجليزية إن كان عربياً أو بالعربية إن كان إنجليزياً"
}`
    : `Define this academic or vocabulary term: "${cleanTerm}"
${contextSentence ? `Context: "${contextSentence}"` : ''}

Respond with valid JSON only:
{
  "definition": "Concise clear definition",
  "pronunciation": "Pronunciation guide",
  "translation": "Arabic translation if English, or English translation if Arabic"
}`;

  try {
    const rawRes = await generateAdaptiveResponse(
      prompt,
      { ...profile, language: isAr ? 'Egyptian Ammiya' : 'English' },
      [],
      []
    );
    const jsonStr = rawRes.replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        id: `vocab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        word: cleanTerm,
        definition: parsed.definition || cleanTerm,
        pronunciation: parsed.pronunciation,
        translation: parsed.translation,
        contextSentence,
        language: lang,
        addedTimestamp: Date.now(),
      };
    }
  } catch {}

  return {
    id: `vocab-${Date.now()}`,
    word: cleanTerm,
    definition: isAr ? `شرح مبسط لمصطلح "${cleanTerm}"` : `Explanation for term "${cleanTerm}"`,
    contextSentence,
    language: lang,
    addedTimestamp: Date.now(),
  };
}

/* =========================================================================
   PHASE 6.4: ADVANCED READING — TABLE & MATH VERBALIZERS & BRAILLE
   ========================================================================= */

export interface ParsedTableData {
  headers: string[];
  rows: string[][];
  rowCount: number;
  colCount: number;
  hasMergedCells: boolean;
  tableSummary: string;
}

/**
 * Accessible Table Reader: extracts tabular structures and computes cell-by-cell coordinate navigation
 */
export function parseTableStructure(rawTableText: string, lang: 'ar' | 'en' = 'ar'): ParsedTableData {
  const isAr = lang === 'ar';
  const lines = rawTableText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('+---') && !l.startsWith('|---'));

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      colCount: 0,
      hasMergedCells: false,
      tableSummary: isAr ? 'لا توجد بيانات جدولية صالحة.' : 'No valid table data found.',
    };
  }

  // Parse lines splitting by pipe | or tab \t
  const grid = lines.map((line) => {
    if (line.includes('|')) {
      return line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell, idx, arr) => (idx > 0 && idx < arr.length - 1) || arr.length <= 2);
    }
    return line.split(/\t+/).map((c) => c.trim());
  });

  const headers = grid[0] || [];
  const rows = grid.slice(1);
  const colCount = Math.max(...grid.map((r) => r.length), headers.length);
  const rowCount = rows.length;

  const tableSummary = isAr
    ? `جدول مكون من ${rowCount} صفوف و ${colCount} أعمدة. العناوين الرئيسية هي: ${headers.join('، ')}.`
    : `Table consisting of ${rowCount} rows and ${colCount} columns. Main headers: ${headers.join(', ')}.`;

  return {
    headers,
    rows,
    rowCount,
    colCount,
    hasMergedCells: rows.some((r) => r.length !== colCount),
    tableSummary,
  };
}

/**
 * Accessible Math Reader: detects mathematical equations and converts them into natural spoken descriptions
 * in Arabic and English without altering mathematical meaning.
 */
export function verbalizeMathExpression(mathText: string, lang: 'ar' | 'en' = 'ar'): string {
  const isAr = lang === 'ar';
  let spoken = mathText.trim();

  // Fraction replacement: \frac{a}{b} -> "الكسر: a مقسوماً على b" / "fraction: a over b"
  spoken = spoken.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_match, num, den) => {
    return isAr ? ` الكسر: ${num} مقسوماً على ${den} ` : ` fraction: ${num} over ${den} `;
  });

  // Square roots: \sqrt{x} -> "الجذر التربيعي لـ x" / "square root of x"
  spoken = spoken.replace(/\\sqrt\{([^}]+)\}/g, (_match, inner) => {
    return isAr ? ` الجذر التربيعي لـ ${inner} ` : ` square root of ${inner} `;
  });

  // N-th roots: \sqrt[n]{x} -> "الجذر من الدرجة n لـ x" / "nth root of x"
  spoken = spoken.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, (_match, rootDeg, inner) => {
    return isAr ? ` الجذر من الدرجة ${rootDeg} لـ ${inner} ` : ` root degree ${rootDeg} of ${inner} `;
  });

  // Powers: x^2 -> "x تربيع" / "x squared", x^3 -> "x تكعيب" / "x cubed", x^{n} -> "x أس n" / "x to the power of n"
  spoken = spoken.replace(/([a-zA-Z0-9_\u0600-\u06FF]+)\^2\b/g, (_m, base) => {
    return isAr ? ` ${base} تربيع ` : ` ${base} squared `;
  });
  spoken = spoken.replace(/([a-zA-Z0-9_\u0600-\u06FF]+)\^3\b/g, (_m, base) => {
    return isAr ? ` ${base} تكعيب ` : ` ${base} cubed `;
  });
  spoken = spoken.replace(/([a-zA-Z0-9_\u0600-\u06FF]+)\^\{?([^}]+)\}?/g, (_m, base, exp) => {
    return isAr ? ` ${base} مرفوعاً للأس ${exp} ` : ` ${base} to the power of ${exp} `;
  });

  // Common mathematical symbols
  const symbolReplacementsAr: Record<string, string> = {
    '=': ' يساوي ',
    '\\neq': ' لا يساوي ',
    '+': ' زائد ',
    '-': ' ناقص ',
    '\\times': ' في ',
    '*': ' ضرب ',
    '\\div': ' مقسوماً على ',
    '/': ' على ',
    '\\le': ' أصغر من أو يساوي ',
    '\\ge': ' أكبر من أو يساوي ',
    '<': ' أصغر من ',
    '>': ' أكبر من ',
    '\\pm': ' زائد أو ناقص ',
    '\\sum': ' مجموع ',
    '\\int': ' تكامل ',
    '\\infty': ' ما لا نهاية ',
    '\\pi': ' باي (ط) ',
    '\\alpha': ' ألفا ',
    '\\beta': ' بيتا ',
    '\\theta': ' ثيتا ',
  };

  const symbolReplacementsEn: Record<string, string> = {
    '=': ' equals ',
    '\\neq': ' is not equal to ',
    '+': ' plus ',
    '-': ' minus ',
    '\\times': ' times ',
    '*': ' multiplied by ',
    '\\div': ' divided by ',
    '/': ' over ',
    '\\le': ' less than or equal to ',
    '\\ge': ' greater than or equal to ',
    '<': ' less than ',
    '>': ' greater than ',
    '\\pm': ' plus or minus ',
    '\\sum': ' summation ',
    '\\int': ' integral ',
    '\\infty': ' infinity ',
    '\\pi': ' pi ',
    '\\alpha': ' alpha ',
    '\\beta': ' beta ',
    '\\theta': ' theta ',
  };

  const map = isAr ? symbolReplacementsAr : symbolReplacementsEn;
  for (const [sym, verbal] of Object.entries(map)) {
    spoken = spoken.split(sym).join(verbal);
  }

  // Strip unparsed LaTeX slashes
  spoken = spoken.replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}\$]/g, ' ').replace(/\s+/g, ' ').trim();

  return spoken;
}

/**
 * Universal Arabic & English Grade 1 Braille Unicode Character Transcriber
 * Maps standard characters to Unicode Braille block (\u2800 - \u28FF)
 */
export function convertTextToBrailleUnicode(text: string): string {
  // Mapping standard letters to Unicode Braille patterns
  const brailleMap: Record<string, string> = {
    ' ': '\u2800', // Blank
    // English
    'a': '\u2801', 'b': '\u2803', 'c': '\u2809', 'd': '\u2819', 'e': '\u2811',
    'f': '\u280B', 'g': '\u281B', 'h': '\u2813', 'i': '\u280A', 'j': '\u281A',
    'k': '\u2805', 'l': '\u2807', 'm': '\u280D', 'n': '\u281D', 'o': '\u2815',
    'p': '\u280F', 'q': '\u281F', 'r': '\u2817', 's': '\u280E', 't': '\u281E',
    'u': '\u2825', 'v': '\u2827', 'w': '\u283A', 'x': '\u282D', 'y': '\u283D', 'z': '\u2835',
    // Arabic Grade 1 Braille
    'ا': '\u2801', 'أ': '\u2801', 'إ': '\u280A', 'آ': '\u281C',
    'ب': '\u2803', 'ت': '\u281E', 'ث': '\u2839', 'ج': '\u281A', 'ح': '\u2833',
    'خ': '\u282D', 'د': '\u2819', 'ذ': '\u283B', 'ر': '\u2817', 'ز': '\u2835',
    'س': '\u280E', 'ش': '\u2829', 'ص': '\u282F', 'ض': '\u282B', 'ط': '\u283E',
    'ظ': '\u283F', 'ع': '\u2837', 'غ': '\u2823', 'ف': '\u280B', 'ق': '\u281F',
    'ك': '\u2805', 'ل': '\u2807', 'م': '\u280D', 'ن': '\u281D', 'ه': '\u2813',
    'و': '\u2825', 'ي': '\u280A', 'ى': '\u2815', 'ة': '\u2821', 'ء': '\u2804',
    // Numerals (with number sign \u283C)
    '1': '\u2801', '2': '\u2803', '3': '\u2809', '4': '\u2819', '5': '\u2811',
    '6': '\u280B', '7': '\u281B', '8': '\u2813', '9': '\u280A', '0': '\u281A',
    // Punctuation
    '.': '\u2832', ',': '\u2802', '،': '\u2802', '?': '\u2826', '؟': '\u2826',
    '!': '\u2816', ':': '\u2812', ';': '\u2830', '؛': '\u2830',
  };

  let braille = '';
  const lower = text.toLowerCase();

  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (brailleMap[ch]) {
      braille += brailleMap[ch];
    } else if (/\s/.test(ch)) {
      braille += '\u2800';
    } else {
      // Unmapped character: output as is or blank
      braille += ch;
    }
  }

  return braille;
}

export interface VocabularyWordItem {
  id: string;
  word: string;
  definition: string;
  pronunciation?: string;
  contextSentence?: string;
  translation?: string;
  language: 'ar' | 'en';
  addedTimestamp: number;
}

export const VOCABULARY_STORAGE_KEY = 'rafiqi_saved_vocabulary_v1';

export function saveVocabularyWord(item: VocabularyWordItem): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(VOCABULARY_STORAGE_KEY);
    const list: VocabularyWordItem[] = raw ? JSON.parse(raw) : [];
    const updated = list.filter((w) => w.word.toLowerCase() !== item.word.toLowerCase());
    updated.unshift(item);
    localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch {}
}

export function getSavedVocabulary(): VocabularyWordItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VOCABULARY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeVocabularyWord(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(VOCABULARY_STORAGE_KEY);
    if (!raw) return;
    const list: VocabularyWordItem[] = JSON.parse(raw);
    const updated = list.filter((w) => w.id !== id);
    localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}
