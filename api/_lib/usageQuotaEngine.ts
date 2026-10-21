/**
 * Cognify 2.0 - Usage Limits, Quota Accounting & Reliability Engine
 * Phase 8: Senior Backend Engineering Implementation
 *
 * Implements:
 * 1. Differentiated assistive quota categories with generous daily allowances & burst limits.
 * 2. Separate accounting for expensive operations (audio lectures, multi-page OCR).
 * 3. In-flight request deduplication (coalescing concurrent identical requests).
 * 4. User-isolated idempotent result caching (SHA-256 keyed with strict UID scoping).
 * 5. Long-running job progress tracking and recovery for audio & document processing.
 * 6. Accessible, multilingual error messages on provider limit exhaustion.
 */

import crypto from 'crypto';

export type AssistiveQuotaCategory =
  | 'camera_vision'       // Real-time camera frames & scene descriptions
  | 'ocr_reading'         // Sign, document, and screenshot text recognition
  | 'stickers_images'     // WhatsApp stickers and image explainers
  | 'audio_transcription' // Audio lecture speech-to-text
  | 'document_studio'     // Book studio formatting and PDF evidence queries
  | 'general_chat';       // Adaptive tutor conversational messages

export interface QuotaDefinition {
  category: AssistiveQuotaCategory;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  burstPerMinute: number;
  dailyAllowance: number;
  costWeight: number;
  descriptionEn: string;
  descriptionAr: string;
}

export const ASSISTIVE_QUOTAS: Record<AssistiveQuotaCategory, QuotaDefinition> = {
  camera_vision: {
    category: 'camera_vision',
    nameEn: 'Camera & Scene Vision',
    nameAr: 'الرؤية بالكاميرا ووصف المشهد',
    nameFr: 'Vision caméra et description de scène',
    burstPerMinute: 120, // 2 frames/sec burst for active navigation
    dailyAllowance: 1500, // Generous full-day mobility & campus assistance
    costWeight: 1,
    descriptionEn: 'Live scene analysis, obstacle detection, and board descriptions',
    descriptionAr: 'تحليل المشهد المباشر واكتشاف العوائق وتوصيف السبورة',
  },
  ocr_reading: {
    category: 'ocr_reading',
    nameEn: 'Text & Document OCR',
    nameAr: 'قراءة النصوص واللوحات',
    nameFr: 'Lecture de texte et OCR',
    burstPerMinute: 60,
    dailyAllowance: 500,
    costWeight: 1,
    descriptionEn: 'Printed signs, packaging labels, handouts, and slides',
    descriptionAr: 'اللوحات المطبوعة والملصقات والمذكرات وشرائح العرض',
  },
  stickers_images: {
    category: 'stickers_images',
    nameEn: 'Stickers & Image Explainer',
    nameAr: 'ملصقات الواتساب وشرح الصور',
    nameFr: 'Autocollants et explicateur d\'images',
    burstPerMinute: 40,
    dailyAllowance: 300,
    costWeight: 1,
    descriptionEn: 'Visual explanations of WhatsApp stickers, photos, and memes',
    descriptionAr: 'شرح معاني ملصقات الواتساب والميمز والصور المحفوظة',
  },
  audio_transcription: {
    category: 'audio_transcription',
    nameEn: 'Audio Lecture Transcription',
    nameAr: 'تفريغ المحاضرات الصوتية',
    nameFr: 'Transcription de cours audio',
    burstPerMinute: 10,
    dailyAllowance: 30, // 30 university lectures (~150 minutes daily)
    costWeight: 5,
    descriptionEn: 'Speech-to-text for recorded lectures, voice notes, and seminars',
    descriptionAr: 'تحويل التسجيلات والمحاضرات الصوتية الطويلة إلى نصوص وملاحظات',
  },
  document_studio: {
    category: 'document_studio',
    nameEn: 'Educational Book Studio & PDF',
    nameAr: 'استوديو الكتب التعليمية وملفات PDF',
    nameFr: 'Studio de documents et PDF',
    burstPerMinute: 40,
    dailyAllowance: 200,
    costWeight: 2,
    descriptionEn: 'Document formatting, worksheet templates, and PDF evidence Q&A',
    descriptionAr: 'تنسيق الكتب وأوراق العمل والأسئلة المستندة إلى أدلة المستند',
  },
  general_chat: {
    category: 'general_chat',
    nameEn: 'Adaptive Tutor Chat',
    nameAr: 'المحادثة التعليمية التكيفية',
    nameFr: 'Tuteur adaptatif',
    burstPerMinute: 60,
    dailyAllowance: 1000,
    costWeight: 1,
    descriptionEn: 'Interactive tutoring, Socratic dialogue, and concept explanations',
    descriptionAr: 'الحوار الأكاديمي التكيفي وشرح الدروس وحل المسائل',
  },
};

export interface QuotaCheckResult {
  allowed: boolean;
  category: AssistiveQuotaCategory;
  limitType?: 'burst' | 'daily';
  burstRemaining: number;
  burstLimit: number;
  dailyRemaining: number;
  dailyLimit: number;
  resetTimeUtc: string;
  resetInSeconds: number;
  explanation?: {
    en: string;
    ar: string;
    fr: string;
  };
}

interface UserUsageRecord {
  // Sliding window timestamps for burst rate limit (last 60s)
  burstTimestamps: Record<AssistiveQuotaCategory, number[]>;
  // Daily consumption counts (resets at 00:00:00 UTC)
  dailyCounts: Record<AssistiveQuotaCategory, number>;
  dayKey: string; // "YYYY-MM-DD"
}

// In-memory user usage records (production can back with Redis)
const usageStore = new Map<string, UserUsageRecord>();

function getUtcDayKey(d = new Date()): string {
  return d.toISOString().split('T')[0];
}

function getNextMidnightUtc(): Date {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return next;
}

function getOrCreateUserUsage(uid: string): UserUsageRecord {
  const currentDay = getUtcDayKey();
  let record = usageStore.get(uid);

  if (!record || record.dayKey !== currentDay) {
    record = {
      dayKey: currentDay,
      burstTimestamps: {
        camera_vision: [],
        ocr_reading: [],
        stickers_images: [],
        audio_transcription: [],
        document_studio: [],
        general_chat: [],
      },
      dailyCounts: {
        camera_vision: 0,
        ocr_reading: 0,
        stickers_images: 0,
        audio_transcription: 0,
        document_studio: 0,
        general_chat: 0,
      },
    };
    usageStore.set(uid, record);
  }
  return record;
}

/**
 * Check and consume quota for a specific assistive category.
 * Enforces dual-layer limits: 1-minute burst protection + daily fair-use allowance.
 */
export function checkAndConsumeQuota(
  uid: string,
  category: AssistiveQuotaCategory,
  cost = 1
): QuotaCheckResult {
  const def = ASSISTIVE_QUOTAS[category] || ASSISTIVE_QUOTAS.general_chat;
  const record = getOrCreateUserUsage(uid);
  const now = Date.now();
  const windowMs = 60 * 1000;
  const nextMidnight = getNextMidnightUtc();
  const resetInSeconds = Math.max(1, Math.round((nextMidnight.getTime() - now) / 1000));
  const resetTimeUtc = nextMidnight.toISOString();

  // 1. Clean up burst window
  record.burstTimestamps[category] = (record.burstTimestamps[category] || []).filter(
    (t) => now - t < windowMs
  );

  const burstCount = record.burstTimestamps[category].length;
  const dailyCount = record.dailyCounts[category] || 0;

  // 2. Check daily allowance first (primary fair-use allowance)
  if (dailyCount + cost > def.dailyAllowance) {
    const hours = Math.floor(resetInSeconds / 3600);
    const minutes = Math.floor((resetInSeconds % 3600) / 60);
    const timeStrEn = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    const timeStrAr = hours > 0 ? `${hours} ساعة و ${minutes} دقيقة` : `${minutes} دقيقة`;
    const timeStrFr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      allowed: false,
      category,
      limitType: 'daily',
      burstRemaining: Math.max(0, def.burstPerMinute - burstCount),
      burstLimit: def.burstPerMinute,
      dailyRemaining: 0,
      dailyLimit: def.dailyAllowance,
      resetTimeUtc,
      resetInSeconds,
      explanation: {
        en: `You have reached your daily allowance of ${def.dailyAllowance} for ${def.nameEn}. Resets at midnight UTC (in ${timeStrEn}). Other assistive tools remain active.`,
        ar: `لقد استنفدت الحصة اليومية (${def.dailyAllowance}) لـ ${def.nameAr}. تتجدد الحصة عند منتصف الليل بتوقيت UTC (خلال ${timeStrAr}). باقي الأدوات المساعدة تعمل بشكل طبيعي.`,
        fr: `Vous avez atteint votre quota journalier de ${def.dailyAllowance} pour ${def.nameFr}. Réinitialisation à minuit UTC (dans ${timeStrFr}).`,
      },
    };
  }

  // 3. Check 1-minute burst limit (rapid hammering protection)
  if (burstCount + cost > def.burstPerMinute) {
    const oldest = record.burstTimestamps[category][0] || now;
    const burstResetSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return {
      allowed: false,
      category,
      limitType: 'burst',
      burstRemaining: 0,
      burstLimit: def.burstPerMinute,
      dailyRemaining: Math.max(0, def.dailyAllowance - dailyCount),
      dailyLimit: def.dailyAllowance,
      resetTimeUtc,
      resetInSeconds: burstResetSeconds,
      explanation: {
        en: `Burst limit reached for ${def.nameEn}. Please wait ${burstResetSeconds} seconds before sending more requests.`,
        ar: `تم الوصول للحد المؤقت لـ ${def.nameAr}. يرجى الانتظار ${burstResetSeconds} ثانية للمتابعة.`,
        fr: `Limite temporaire atteinte pour ${def.nameFr}. Veuillez patienter ${burstResetSeconds} secondes.`,
      },
    };
  }

  // 4. Consume quota
  for (let i = 0; i < cost; i++) {
    record.burstTimestamps[category].push(now);
  }
  record.dailyCounts[category] = dailyCount + cost;

  return {
    allowed: true,
    category,
    burstRemaining: Math.max(0, def.burstPerMinute - (burstCount + cost)),
    burstLimit: def.burstPerMinute,
    dailyRemaining: Math.max(0, def.dailyAllowance - (dailyCount + cost)),
    dailyLimit: def.dailyAllowance,
    resetTimeUtc,
    resetInSeconds,
  };
}

/**
 * Get snapshot of user's current daily usage across all categories.
 */
export function getUserUsageSnapshot(uid: string): {
  uid: string;
  dayKey: string;
  resetTimeUtc: string;
  resetInSeconds: number;
  categories: Record<
    AssistiveQuotaCategory,
    {
      nameEn: string;
      nameAr: string;
      nameFr: string;
      dailyUsed: number;
      dailyLimit: number;
      dailyRemaining: number;
      percentageUsed: number;
    }
  >;
} {
  const record = getOrCreateUserUsage(uid);
  const now = Date.now();
  const nextMidnight = getNextMidnightUtc();
  const resetInSeconds = Math.max(1, Math.round((nextMidnight.getTime() - now) / 1000));

  const categories = {} as any;
  for (const [catKey, def] of Object.entries(ASSISTIVE_QUOTAS)) {
    const cat = catKey as AssistiveQuotaCategory;
    const used = record.dailyCounts[cat] || 0;
    const limit = def.dailyAllowance;
    const remaining = Math.max(0, limit - used);
    const percentage = Math.min(100, Math.round((used / limit) * 100));

    categories[cat] = {
      nameEn: def.nameEn,
      nameAr: def.nameAr,
      nameFr: def.nameFr,
      dailyUsed: used,
      dailyLimit: limit,
      dailyRemaining: remaining,
      percentageUsed: percentage,
    };
  }

  return {
    uid,
    dayKey: record.dayKey,
    resetTimeUtc: nextMidnight.toISOString(),
    resetInSeconds,
    categories,
  };
}

// ============================================================================
// In-Flight Request Deduplication (Coalescing Concurrent Identical Requests)
// ============================================================================

const inflightPromises = new Map<string, Promise<any>>();

/**
 * Deduplicate concurrent identical requests so duplicate simultaneous triggers
 * (e.g. double-tapping "Describe Scene" or rapid repeated clicks) share one
 * upstream provider call instead of burning multiple quota units.
 */
export async function deduplicateInflight<T>(
  dedupKey: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inflightPromises.get(dedupKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const p = fn().finally(() => {
    inflightPromises.delete(dedupKey);
  });

  inflightPromises.set(dedupKey, p);
  return p;
}

// ============================================================================
// Safe User-Isolated Idempotent Response Cache
// Strictly scoped to the authenticated UID to guarantee zero cross-user leakage.
// ============================================================================

interface CacheEntry {
  result: any;
  timestamp: number;
  category: AssistiveQuotaCategory;
  uid: string;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateUserContentHash(
  uid: string,
  category: AssistiveQuotaCategory,
  contentPayload: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${uid}:${category}:${contentPayload}`)
    .digest('hex');
}

/**
 * Store an idempotent analysis result.
 * Ensures the cache entry is tied immutably to the user's UID.
 */
export function setCachedResult(
  cacheKey: string,
  uid: string,
  category: AssistiveQuotaCategory,
  result: any
): void {
  // Evict if cache exceeds 10,000 entries
  if (responseCache.size > 10000) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }

  responseCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
    category,
    uid,
  });
}

/**
 * Retrieve cached result.
 * STRICT SECURITY INVARIANT: Verifies entry.uid === requestingUid.
 * Never exposes one user's files or generated results to another user.
 */
export function getCachedResult(
  cacheKey: string,
  requestingUid: string
): any | null {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;

  // Enforce zero cross-user exposure
  if (entry.uid !== requestingUid) {
    return null;
  }

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(cacheKey);
    return null;
  }

  return entry.result;
}

// ============================================================================
// Long-Running Job Progress & Recovery Engine
// Supports async progress tracking and network drop recovery for large audio & docs.
// ============================================================================

export interface ProcessingJob {
  jobId: string;
  uid: string;
  category: AssistiveQuotaCategory;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalChunks: number;
  completedChunks: number;
  progressPercent: number;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const jobLedger = new Map<string, ProcessingJob>();

export function createProcessingJob(
  uid: string,
  category: AssistiveQuotaCategory,
  totalChunks = 1
): ProcessingJob {
  const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const job: ProcessingJob = {
    jobId,
    uid,
    category,
    status: 'queued',
    totalChunks: Math.max(1, totalChunks),
    completedChunks: 0,
    progressPercent: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobLedger.set(jobId, job);
  return job;
}

export function updateJobProgress(
  jobId: string,
  completedChunks: number,
  status: 'queued' | 'processing' | 'completed' | 'failed' = 'processing'
): ProcessingJob | null {
  const job = jobLedger.get(jobId);
  if (!job) return null;

  job.completedChunks = Math.min(completedChunks, job.totalChunks);
  job.progressPercent = Math.min(
    100,
    Math.round((job.completedChunks / job.totalChunks) * 100)
  );
  job.status = status;
  job.updatedAt = Date.now();
  return job;
}

export function completeProcessingJob(jobId: string, result: any): ProcessingJob | null {
  const job = jobLedger.get(jobId);
  if (!job) return null;

  job.status = 'completed';
  job.completedChunks = job.totalChunks;
  job.progressPercent = 100;
  job.result = result;
  job.updatedAt = Date.now();
  return job;
}

export function failProcessingJob(jobId: string, errorMessage: string): ProcessingJob | null {
  const job = jobLedger.get(jobId);
  if (!job) return null;

  job.status = 'failed';
  job.error = errorMessage;
  job.updatedAt = Date.now();
  return job;
}

/**
 * Retrieve job status and recovery data.
 * Verifies requesting UID matches job UID.
 */
export function getProcessingJob(jobId: string, requestingUid: string): ProcessingJob | null {
  const job = jobLedger.get(jobId);
  if (!job) return null;
  if (job.uid !== requestingUid) {
    return null; // BOLA protection: user cannot inspect another user's job
  }
  return job;
}

/**
 * Reset test helper.
 */
export function resetUsageEngineForTesting(): void {
  usageStore.clear();
  inflightPromises.clear();
  responseCache.clear();
  jobLedger.clear();
}

/**
 * Test helper to set daily usage count directly without tripping 60-second burst limits.
 */
export function setUserDailyUsageForTesting(
  uid: string,
  category: AssistiveQuotaCategory,
  count: number
): void {
  const record = getOrCreateUserUsage(uid);
  record.dailyCounts[category] = count;
}
