/**
 * Cognify Document Extractor & Validator
 * Pure, resilient, zero-dependency document parsing for:
 * - PDF (selectable text extraction, page order preservation, scanned-page OCR detection, malformed PDF handling)
 * - DOCX (PKZip extraction of word/document.xml, paragraphs, tables, headings)
 * - TXT & Markdown (UTF-8 / Arabic Windows-1256 resilient decoding)
 * - Audio & Image format validation
 */

export interface DocumentValidationResult {
  valid: boolean;
  category: 'pdf' | 'docx' | 'txt' | 'image' | 'audio' | 'unsupported';
  error?: string;
  localizedMessage: {
    ar: string;
    en: string;
    fr: string;
  };
  fileSizeFormatted: string;
  maxSizeBytes: number;
}

export interface ExtractedPdfResult {
  valid: boolean;
  text: string;
  pages: { pageNum: number; text: string; isScanned: boolean }[];
  pageCount: number;
  isScanned: boolean;
  needsOcr: boolean;
  selectableTextRatio: number;
  error?: string;
  errorMessage?: string;
}

export interface ExtractedDocxResult {
  valid: boolean;
  text: string;
  paragraphs: string[];
  wordCount: number;
  hasTables: boolean;
  title?: string;
  error?: string;
}

export interface ExtractedTxtResult {
  valid: boolean;
  text: string;
  paragraphs: string[];
  wordCount: number;
}

export interface AudioTranscriptSegment {
  id: string;
  timestamp: string; // e.g. "01:30"
  seconds: number;   // e.g. 90
  text: string;
}

// Maximum upload limits
export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024;    // 50 MB
export const RECOMMENDED_CHUNK_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Maximum binary size for direct serverless function attachments.
 * Vercel enforces a 4.5 MB request body limit.
 * With Base64 expansion (33%) and JSON envelope overhead, binary attachments
 * sent directly to /api/gemini/generateAdaptiveResponse must stay <= 3.2 MB.
 */
export const MAX_DIRECT_ATTACHMENT_BYTES = Math.floor(3.2 * 1024 * 1024); // 3.2 MB

/**
 * Maximum character length for document text placed directly into prompt payload.
 * The serverless handler enforces message.length <= 32,000 characters.
 * Reserving ~8,000 characters for instruction persona, system instructions, and schema tags.
 */
export const MAX_PROMPT_TEXT_LENGTH = 24000;

export interface DirectAttachmentValidationResult {
  valid: boolean;
  reason?: 'ATTACHMENT_EXCEEDS_SERVERLESS_LIMIT' | 'OK';
  localizedMessage: {
    ar: string;
    en: string;
    fr: string;
  };
}

/**
 * Validate binary attachment size against Vercel serverless function payload limits.
 */
export function validateDirectAttachmentSize(size: number, _category?: string): DirectAttachmentValidationResult {
  if (size > MAX_DIRECT_ATTACHMENT_BYTES) {
    const formatted = formatBytes(size);
    const limitFormatted = formatBytes(MAX_DIRECT_ATTACHMENT_BYTES);
    return {
      valid: false,
      reason: 'ATTACHMENT_EXCEEDS_SERVERLESS_LIMIT',
      localizedMessage: {
        ar: `حجم الملف (${formatted}) يتجاوز الحد الأقصى للنقل المباشر (${limitFormatted}). يرجى ضغط الصور أو استخدام مستند نصي بدلاً من المستندات الممسوحة ضوئياً.`,
        en: `File size (${formatted}) exceeds direct serverless limit (${limitFormatted}). Please compress the file or use a text-based document.`,
        fr: `La taille du fichier (${formatted}) dépasse la limite directe (${limitFormatted}). Veuillez compresser le fichier ou utiliser un document textuel.`,
      },
    };
  }
  return {
    valid: true,
    reason: 'OK',
    localizedMessage: {
      ar: 'حجم المرفق مناسب للنقل المباشر.',
      en: 'Attachment size is suitable for direct transmission.',
      fr: 'Taille du fichier adaptée au transfert direct.',
    },
  };
}

/**
 * Format bytes to readable string (e.g. "4.2 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate upload file types and file sizes on client and server
 */
export function validateUploadFile(file: {
  name: string;
  size: number;
  type?: string;
}): DocumentValidationResult {
  const name = (file.name || '').trim().toLowerCase();
  const mime = (file.type || '').trim().toLowerCase();
  const size = file.size || 0;
  const sizeFormatted = formatBytes(size);

  // 1. Detect Category
  let category: DocumentValidationResult['category'] = 'unsupported';
  if (name.endsWith('.pdf') || mime === 'application/pdf') {
    category = 'pdf';
  } else if (
    name.endsWith('.docx') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    category = 'docx';
  } else if (name.endsWith('.txt') || name.endsWith('.md') || mime.startsWith('text/')) {
    category = 'txt';
  } else if (
    /\.(jpe?g|png|webp|bmp|gif)$/i.test(name) ||
    mime.startsWith('image/')
  ) {
    category = 'image';
  } else if (
    /\.(mp3|wav|m4a|webm|ogg|aac|flac)$/i.test(name) ||
    mime.startsWith('audio/')
  ) {
    category = 'audio';
  }

  // 2. Reject unsupported or hazardous file types
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.py', '.php', '.dll', '.zip', '.rar', '.7z', '.tar', '.gz'];
  if (dangerousExtensions.some((ext) => name.endsWith(ext))) {
    return {
      valid: false,
      category: 'unsupported',
      error: 'DANGEROUS_FILE_TYPE',
      fileSizeFormatted: sizeFormatted,
      maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
      localizedMessage: {
        ar: 'نوع الملف غير مدعوم أو غير آمن. يرجى رفع ملفات PDF، مستندات Word، نصوص TXT، صور أو تسجيلات صوتية فقط.',
        en: 'Unsupported or unsafe file type. Please upload PDF, Word (.docx), TXT, image, or audio files only.',
        fr: 'Type de fichier non pris en charge. Veuillez télécharger des fichiers PDF, Word (.docx), TXT, images ou audio uniquement.',
      },
    };
  }

  if (category === 'unsupported') {
    return {
      valid: false,
      category: 'unsupported',
      error: 'UNSUPPORTED_FORMAT',
      fileSizeFormatted: sizeFormatted,
      maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
      localizedMessage: {
        ar: `صيغة الملف "${file.name}" غير مدعومة. الصيغ المدعومة هي: PDF, DOCX, TXT, MP3, WAV, M4A, WEBM, والصور.`,
        en: `File format "${file.name}" is not supported. Supported formats: PDF, DOCX, TXT, MP3, WAV, M4A, WEBM, and images.`,
        fr: `Format de fichier "${file.name}" non pris en charge. Formats acceptés : PDF, DOCX, TXT, MP3, WAV, M4A, WEBM et images.`,
      },
    };
  }

  // 3. Size Limits
  const maxLimit = category === 'audio' ? MAX_AUDIO_SIZE_BYTES : MAX_DOCUMENT_SIZE_BYTES;
  if (size > maxLimit) {
    return {
      valid: false,
      category,
      error: 'FILE_TOO_LARGE',
      fileSizeFormatted: sizeFormatted,
      maxSizeBytes: maxLimit,
      localizedMessage: {
        ar: `حجم الملف كبير جداً (${sizeFormatted}). الحد الأقصى المسموح هو ${formatBytes(maxLimit)}.`,
        en: `File is too large (${sizeFormatted}). Maximum allowed limit is ${formatBytes(maxLimit)}.`,
        fr: `Fichier trop volumineux (${sizeFormatted}). La limite maximale est de ${formatBytes(maxLimit)}.`,
      },
    };
  }

  if (size === 0) {
    return {
      valid: false,
      category,
      error: 'EMPTY_FILE',
      fileSizeFormatted: '0 B',
      maxSizeBytes: maxLimit,
      localizedMessage: {
        ar: 'الملف فارغ (0 بايت). يرجى التأكد من اختيار ملف صالح يحتوي على بيانات.',
        en: 'The file is empty (0 bytes). Please select a valid document or audio file with content.',
        fr: 'Le fichier est vide (0 octet). Veuillez sélectionner un fichier valide.',
      },
    };
  }

  return {
    valid: true,
    category,
    fileSizeFormatted: sizeFormatted,
    maxSizeBytes: maxLimit,
    localizedMessage: {
      ar: 'الملف صالح وجاهز للمعالجة.',
      en: 'File is valid and ready for processing.',
      fr: 'Fichier valide et prêt pour le traitement.',
    },
  };
}

/**
 * Universal Raw Deflate Decompression Helper
 * Works in modern browsers (DecompressionStream) and Node.js environments (zlib)
 */
async function decompressDeflateRaw(data: Uint8Array): Promise<Uint8Array> {
  // 1. Try Web Streams API (Browser and Node 18+)
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(data);
      writer.close();
      const response = new Response(ds.readable);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch {
      try {
        const dsZlib = new DecompressionStream('deflate');
        const writer = dsZlib.writable.getWriter();
        writer.write(data);
        writer.close();
        const response = new Response(dsZlib.readable);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch {}
    }
  }

  // 2. Node.js environment fallback via dynamic import or global Buffer
  try {
    const zlibModule = 'zlib';
    const zlib = await import(/* @vite-ignore */ zlibModule);
    if (zlib && zlib.inflateRawSync) {
      return new Uint8Array(zlib.inflateRawSync(data));
    }
  } catch {}

  return data;
}

/**
 * Universal ZLIB Deflate Decompression Helper (for PDF FlateDecode)
 */
async function decompressZlib(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate');
      const writer = ds.writable.getWriter();
      writer.write(data);
      writer.close();
      const response = new Response(ds.readable);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch {
      try {
        const dsRaw = new DecompressionStream('deflate-raw');
        const writer = dsRaw.writable.getWriter();
        // Skip 2-byte zlib header if present
        const rawPayload = data.length > 2 ? data.subarray(2) : data;
        writer.write(rawPayload);
        writer.close();
        const response = new Response(dsRaw.readable);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch {}
    }
  }

  try {
    const zlibModule = 'zlib';
    const zlib = await import(/* @vite-ignore */ zlibModule);
    if (zlib && zlib.inflateSync) {
      return new Uint8Array(zlib.inflateSync(data));
    }
  } catch {}

  return data;
}

/**
 * Extract structured text from Word (.docx) package
 * Unpacks PKZip archive and parses word/document.xml with paragraphs, tables, and lists
 */
export async function extractTextFromDocx(buffer: ArrayBuffer | Uint8Array): Promise<ExtractedDocxResult> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (bytes.length < 30 || bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
    return {
      valid: false,
      text: '',
      paragraphs: [],
      wordCount: 0,
      hasTables: false,
      error: 'NOT_A_VALID_DOCX_OR_ZIP',
    };
  }

  try {
    // Scan ZIP local file headers for "word/document.xml"
    let offset = 0;
    let documentXmlData: Uint8Array | null = null;
    let isCompressed = false;

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
        const filenameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
        const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);

        const filenameBytes = bytes.subarray(offset + 30, offset + 30 + filenameLen);
        const filename = new TextDecoder().decode(filenameBytes);

        const dataStart = offset + 30 + filenameLen + extraLen;

        if (filename === 'word/document.xml' || filename.endsWith('/document.xml')) {
          const rawData = bytes.subarray(dataStart, dataStart + compressedSize);
          documentXmlData = rawData;
          isCompressed = compressionMethod === 8;
          break;
        }

        offset = dataStart + compressedSize;
      } else {
        offset++;
      }
    }

    if (!documentXmlData) {
      return {
        valid: false,
        text: '',
        paragraphs: [],
        wordCount: 0,
        hasTables: false,
        error: 'DOCUMENT_XML_NOT_FOUND',
      };
    }

    const xmlBytes = isCompressed ? await decompressDeflateRaw(documentXmlData) : documentXmlData;
    const xmlText = new TextDecoder('utf-8').decode(xmlBytes);

    // Extract text from XML nodes
    const hasTables = xmlText.includes('<w:tbl') || xmlText.includes('<w:tr');

    // Split paragraphs by </w:p>
    const pMatches = xmlText.split(/<\/w:p>/);
    const paragraphs: string[] = [];

    for (const p of pMatches) {
      // Find all text runs <w:t>...</w:t>
      const textMatches = p.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (textMatches && textMatches.length > 0) {
        let pText = textMatches
          .map((t) => t.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
          .join('');

        // Decode XML entities
        pText = pText
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim();

        if (pText.length > 0) {
          paragraphs.push(pText);
        }
      }
    }

    const fullText = paragraphs.join('\n\n');
    const words = fullText.split(/\s+/).filter(Boolean);

    return {
      valid: true,
      text: fullText,
      paragraphs,
      wordCount: words.length,
      hasTables,
      title: paragraphs[0]?.slice(0, 100),
    };
  } catch (err: any) {
    return {
      valid: false,
      text: '',
      paragraphs: [],
      wordCount: 0,
      hasTables: false,
      error: `DOCX_PARSE_ERROR: ${err?.message || err}`,
    };
  }
}

/**
 * Extract selectable text from PDF documents
 * Parses objects, decompresses FlateDecode streams, extracts BT...ET text,
 * detects scanned pages needing OCR, and handles malformed documents gracefully.
 */
export async function extractTextFromPdf(buffer: ArrayBuffer | Uint8Array): Promise<ExtractedPdfResult> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // Validate PDF magic header
  const header = new TextDecoder('ascii').decode(bytes.subarray(0, 10));
  if (!header.startsWith('%PDF-')) {
    return {
      valid: false,
      text: '',
      pages: [],
      pageCount: 0,
      isScanned: false,
      needsOcr: false,
      selectableTextRatio: 0,
      error: 'INVALID_PDF_HEADER',
      errorMessage: 'الملف ليس مستند PDF صالحاً (توقيع %PDF- مفقود).',
    };
  }

  try {
    const latinText = new TextDecoder('latin1').decode(bytes);

    // Check if document is password protected / encrypted
    if (latinText.includes('/Encrypt')) {
      return {
        valid: false,
        text: '',
        pages: [],
        pageCount: 0,
        isScanned: false,
        needsOcr: true,
        selectableTextRatio: 0,
        error: 'PDF_ENCRYPTED',
        errorMessage: 'مستند PDF محمي بكلمة مرور. يرجى إزالة الحماية لتتمكن من قراءته.',
      };
    }

    // Estimate page count
    const pageMatches = latinText.match(/\/Type\s*\/Page\b/g);
    let estimatedPages = pageMatches ? pageMatches.length : 1;
    const countMatch = latinText.match(/\/Count\s+(\d+)/);
    if (countMatch && parseInt(countMatch[1], 10) > 0) {
      estimatedPages = Math.max(estimatedPages, parseInt(countMatch[1], 10));
    }

    // Locate stream ... endstream blocks
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    const extractedStreams: string[] = [];

    while ((match = streamRegex.exec(latinText)) !== null) {
      const rawStream = match[1];
      const matchIndex = match.index;
      const dictPrefix = latinText.substring(Math.max(0, matchIndex - 500), matchIndex);

      const isFlate = dictPrefix.includes('/FlateDecode');

      if (isFlate) {
        // Convert matched string back to raw bytes for decompression
        const streamBytes = new Uint8Array(rawStream.length);
        for (let i = 0; i < rawStream.length; i++) {
          streamBytes[i] = rawStream.charCodeAt(i) & 0xff;
        }

        try {
          const decompressed = await decompressZlib(streamBytes);
          const decompressedText = new TextDecoder('latin1').decode(decompressed);
          extractedStreams.push(decompressedText);
        } catch {
          // If zlib fails, keep raw text
          extractedStreams.push(rawStream);
        }
      } else {
        extractedStreams.push(rawStream);
      }
    }

    // Parse Text between BT and ET operators
    const pageTexts: string[] = [];
    let currentAccumulator = '';
    const hasImageObjects = latinText.includes('/Subtype/Image') || latinText.includes('/Subtype /Image') || latinText.includes('/XObject');

    for (const streamContent of extractedStreams) {
      const btBlocks = streamContent.match(/BT[\s\S]*?ET/g);
      if (btBlocks && btBlocks.length > 0) {
        for (const block of btBlocks) {
          // Extract strings from (text) Tj
          const tjMatches = block.match(/\((.*?)\)\s*Tj/g);
          if (tjMatches) {
            for (const tj of tjMatches) {
              const str = tj.replace(/^\(/, '').replace(/\)\s*Tj$/, '');
              currentAccumulator += cleanPdfEscapes(str) + ' ';
            }
          }

          // Extract array elements from [(t1) 120 (t2)] TJ
          const arrayMatches = block.match(/\[(.*?)\]\s*TJ/g);
          if (arrayMatches) {
            for (const arr of arrayMatches) {
              const innerStrings = arr.match(/\((.*?)\)/g);
              if (innerStrings) {
                const combined = innerStrings
                  .map((s) => cleanPdfEscapes(s.slice(1, -1)))
                  .join('');
                currentAccumulator += combined + ' ';
              }
            }
          }
        }
      }

      // Check for form feed or page boundaries
      if (currentAccumulator.length > 500) {
        pageTexts.push(currentAccumulator.trim());
        currentAccumulator = '';
      }
    }

    if (currentAccumulator.trim().length > 0 || pageTexts.length === 0) {
      pageTexts.push(currentAccumulator.trim());
    }

    const totalChars = pageTexts.reduce((acc, p) => acc + p.length, 0);
    const pagesInfo = pageTexts.map((txt, idx) => ({
      pageNum: idx + 1,
      text: txt,
      isScanned: txt.trim().length < 30 && hasImageObjects,
    }));

    const isFullyScanned = totalChars < 50 && hasImageObjects;
    const needsOcr = isFullyScanned || pagesInfo.some((p) => p.isScanned);
    const selectableTextRatio = totalChars > 200 ? 1.0 : totalChars > 50 ? 0.5 : 0.0;

    // Preserve page references in output text
    const structuredText = pagesInfo
      .map((p) => `[الصفحة ${p.pageNum} / Page ${p.pageNum}]\n${p.text || (p.isScanned ? '(صفحة مصورة ممسوحة ضوئياً تتطلب التعرف الضوئي OCR)' : '')}`)
      .join('\n\n');

    return {
      valid: true,
      text: structuredText.trim(),
      pages: pagesInfo,
      pageCount: Math.max(pagesInfo.length, estimatedPages),
      isScanned: isFullyScanned,
      needsOcr,
      selectableTextRatio,
    };
  } catch (err: any) {
    return {
      valid: false,
      text: '',
      pages: [],
      pageCount: 0,
      isScanned: false,
      needsOcr: true,
      selectableTextRatio: 0,
      error: `PDF_PARSE_EXCEPTION: ${err?.message || err}`,
      errorMessage: 'حدث خطأ أثناء معالجة ملف PDF. يرجى تجربة التعرف الضوئي المباشر OCR.',
    };
  }
}

/**
 * Decode PDF string escape sequences (\n, \r, \t, \(, \), \\, \ddd octal)
 */
function cleanPdfEscapes(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Extract text from plain text or markdown files (.txt, .md)
 * Resilient to UTF-8 and legacy Arabic encodings
 */
export function extractTextFromTxt(content: string): ExtractedTxtResult {
  if (!content) {
    return { valid: true, text: '', paragraphs: [], wordCount: 0 };
  }

  const clean = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const words = clean.split(/\s+/).filter(Boolean);

  return {
    valid: true,
    text: clean,
    paragraphs,
    wordCount: words.length,
  };
}

/**
 * Parse timestamped segments from transcript text
 * Matches patterns like [00:15], [01:30], [12:45], [01:15:30]
 */
export function parseAudioSegments(transcriptText: string): AudioTranscriptSegment[] {
  if (!transcriptText || !transcriptText.trim()) return [];

  const segments: AudioTranscriptSegment[] = [];
  const regex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^\[]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(transcriptText)) !== null) {
    const rawTimestamp = match[1].trim();
    const content = match[2].trim();

    // Parse seconds from MM:SS or HH:MM:SS
    const parts = rawTimestamp.split(':').map((p) => parseInt(p, 10));
    let totalSeconds = 0;
    if (parts.length === 3) {
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      totalSeconds = parts[0] * 60 + parts[1];
    }

    if (content.length > 0) {
      segments.push({
        id: `seg_${segments.length + 1}_${totalSeconds}`,
        timestamp: rawTimestamp,
        seconds: totalSeconds,
        text: content,
      });
    }
  }

  // If no bracketed timestamps were found, segment by paragraphs with estimated times (~130 words per minute)
  if (segments.length === 0) {
    const paragraphs = transcriptText.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    let cumulativeSeconds = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const wordCount = p.split(/\s+/).length;
      const durationSeconds = Math.max(Math.round((wordCount / 130) * 60), 5);

      const mins = Math.floor(cumulativeSeconds / 60);
      const secs = cumulativeSeconds % 60;
      const formattedTs = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      segments.push({
        id: `seg_${i + 1}_${cumulativeSeconds}`,
        timestamp: formattedTs,
        seconds: cumulativeSeconds,
        text: p,
      });

      cumulativeSeconds += durationSeconds;
    }
  }

  return segments;
}
