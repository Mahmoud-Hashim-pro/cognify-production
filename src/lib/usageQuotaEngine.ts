/**
 * Cognify 2.0 - Client Usage Limits & Accessibility Quota Engine
 * Phase 8: Accessible Transparent Quota UI, Local Deduplication, and Client-Side Estimation
 */

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
    burstPerMinute: 120,
    dailyAllowance: 1500,
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
    dailyAllowance: 30,
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

export interface UserUsageSnapshot {
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
}

// Client-side in-flight deduplication cache
const clientInflightMap = new Map<string, Promise<any>>();

export async function clientDeduplicate<T>(key: string, producer: () => Promise<T>): Promise<T> {
  const existing = clientInflightMap.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const p = producer().finally(() => {
    clientInflightMap.delete(key);
  });

  clientInflightMap.set(key, p);
  return p;
}

/**
 * Fetch real user usage quota snapshot from the backend.
 * Gracefully falls back to optimistic local snapshot if offline or unauthenticated.
 */
export async function fetchUserUsageQuota(
  getAuthHeaders?: () => Promise<Record<string, string>>
): Promise<UserUsageSnapshot> {
  try {
    const headers = getAuthHeaders ? await getAuthHeaders() : {};
    const res = await fetch('/api/usage/quota', {
      method: 'GET',
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.categories) {
        return data as UserUsageSnapshot;
      }
    }
  } catch (err) {
    console.warn('[UsageQuotaEngine] Could not reach /api/usage/quota, using local estimation:', err);
  }

  // Fallback optimistic snapshot
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const resetInSeconds = Math.max(1, Math.round((nextMidnight.getTime() - now.getTime()) / 1000));

  const categories = {} as any;
  for (const [key, def] of Object.entries(ASSISTIVE_QUOTAS)) {
    categories[key as AssistiveQuotaCategory] = {
      nameEn: def.nameEn,
      nameAr: def.nameAr,
      nameFr: def.nameFr,
      dailyUsed: 0,
      dailyLimit: def.dailyAllowance,
      dailyRemaining: def.dailyAllowance,
      percentageUsed: 0,
    };
  }

  return {
    uid: 'local-guest',
    dayKey: now.toISOString().split('T')[0],
    resetTimeUtc: nextMidnight.toISOString(),
    resetInSeconds,
    categories,
  };
}

/**
 * Format screen reader announcement for a quota category.
 */
export function formatScreenReaderQuota(
  cat: AssistiveQuotaCategory,
  usage: { dailyUsed: number; dailyLimit: number; dailyRemaining: number },
  lang: string = 'en'
): string {
  const def = ASSISTIVE_QUOTAS[cat] || ASSISTIVE_QUOTAS.camera_vision;
  const isArabic = lang === 'ar' || lang === 'Arabic' || lang === 'Egyptian Ammiya';
  const isFrench = lang === 'fr' || lang === 'French';

  if (isArabic) {
    return `${def.nameAr}: تم استخدام ${usage.dailyUsed} من أصل ${usage.dailyLimit}. المتبقي لك اليوم: ${usage.dailyRemaining}.`;
  }
  if (isFrench) {
    return `${def.nameFr} : ${usage.dailyUsed} utilisé sur ${usage.dailyLimit}. Restant aujourd'hui : ${usage.dailyRemaining}.`;
  }
  return `${def.nameEn}: ${usage.dailyUsed} used out of ${usage.dailyLimit}. Remaining today: ${usage.dailyRemaining}.`;
}
