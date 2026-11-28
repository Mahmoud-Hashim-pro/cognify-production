/**
 * Rafiqi (رفيقي) — Dynamic SEO & Document Metadata Engine
 *
 * Adheres to SOLID Principles:
 * - Single Responsibility Principle (SRP): Dedicated solely to computing and
 *   applying SEO metadata (Title, Meta Description, Open Graph, Twitter Card,
 *   Canonical URL, and HTML lang/dir attributes).
 * - Interface Segregation Principle (ISP): Consumers pass a minimal SeoContext
 *   without coupling to DOM implementation details.
 * - Dependency Inversion Principle (DIP): Accepts an optional DocumentAdapter
 *   so metadata resolution can be verified deterministically in Node/SSR tests
 *   without requiring a browser DOM.
 */
import { L } from './translations';

import { BRAND_CONFIG } from '../config/brand';
import { isArabicLocale } from './translations';

export interface SeoMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonicalUrl: string;
  readonly ogTitle: string;
  readonly ogDescription: string;
  readonly ogLocale: string;
  readonly lang: string;
  readonly dir: 'rtl' | 'ltr';
}

export interface SeoContext {
  readonly view: string;
  readonly subTab?: string;
  readonly language?: string;
}

export interface DocumentAdapter {
  setTitle(title: string): void;
  setMetaContent(selector: string, attribute: 'name' | 'property', key: string, content: string): void;
  setCanonical(href: string): void;
}

interface RouteSeoEntry {
  readonly titleEn: string;
  readonly titleAr: string;
  readonly titleFr: string;
  readonly descEn: string;
  readonly descAr: string;
  readonly descFr: string;
}

const ROUTE_SEO_REGISTRY: Record<string, RouteSeoEntry> = {
  chat: {
    titleEn: 'Rafiqi (رفيقي) — Inclusive AI Tutor & Assistive Learning Platform',
    titleAr: 'رفيقي (Rafiqi) — المعلم الذكي ومنصة التعلّم الشامل لذوي الهمم',
    titleFr: 'Rafiqi — Tuteur IA Inclusif & Plateforme d’Accessibilité',
    descEn: BRAND_CONFIG.descriptionEn,
    descAr: BRAND_CONFIG.descriptionAr,
    descFr: 'Rafiqi est une plateforme d’apprentissage inclusif et de technologies d’assistance pour tous les apprenants.',
  },
  disability: {
    titleEn: 'Rafiqi (رفيقي) — Inclusive Learning & Assistive Technology Platform',
    titleAr: 'رفيقي (Rafiqi) — منصة التعلّم الشامل والتقنيات المساندة لذوي الهمم',
    titleFr: 'Rafiqi — Centre d’Accessibilité Universelle & Technologies d’Assistance',
    descEn:
      'Explore Rafiqi’s universal accessibility suite featuring real-time AI visual companion, 3D sign language interpreter, live captions, and motor/Euphonia voice control.',
    descAr:
      'استكشف منظومة رفيقي الشاملة لذوي الهمم: المساعد البصري الذكي للمكفوفين، مترجم لغة الإشارة ثلاثي الأبعاد للصم، والتحكم الصوتي الحركي.',
    descFr:
      'Découvrez la suite d’accessibilité Rafiqi : compagnon visuel IA, interprète en langue des signes 3D et contrôle vocal.',
  },
  vision: {
    titleEn: 'Rafiqi Visual Companion — Real-Time AI Scene, OCR, Currency & Hazard Assistant',
    titleAr: 'رفيقي البصري (Rafiqi) — المساعد الذكي للمكفوفين وضعاف البصر',
    titleFr: 'Rafiqi Compagnon Visuel — Assistant IA en Temps Réel',
    descEn:
      'Real-time AI camera perception for blind and low-vision users: scene description, Egyptian currency reader, instant text OCR, color identifier, and spatial memory.',
    descAr:
      'مساعد بصري فوري بالذكاء الاصطناعي للمكفوفين وضعاف البصر: وصف المشهد، قراءة العملات، قراءة النصوص، تمييز الألوان، والذاكرة المكانية.',
    descFr:
      'Perception caméra IA en temps réel pour les utilisateurs aveugles et malvoyants : description de scène, OCR et mémoire spatiale.',
  },
  deaf: {
    titleEn: 'Rafiqi Deaf & Hearing Center — 3D Sign Avatar, ArSL/ASL & Live Captions',
    titleAr: 'رفيقي للصم وضعاف السمع — مترجم لغة الإشارة 3D والتسميات الحية',
    titleFr: 'Rafiqi Centre Auditif — Avatar Langue des Signes 3D & Sous-titres',
    descEn:
      'Two-way communication bridge for Deaf and Hard-of-Hearing learners with 3D Arabic & American Sign Language avatars and live speech transcription.',
    descAr:
      'منظومة تواصل ثنائية الاتجاه للصم وضعاف السمع مع مترجم لغة الإشارة ثلاثي الأبعاد (العربية والأمريكية) وتحويل الكلام إلى نص حي.',
    descFr:
      'Passerelle de communication bidirectionnelle avec avatar 3D en langue des signes et transcription vocale en direct.',
  },
  academics: {
    titleEn: 'Rafiqi Academic Cockpit — GPA Calculator, Planner & Attendance Tracker',
    titleAr: 'رفيقي الأكاديمي — حاسبة المعدل، المخطط الدراسي، ومتابعة الحضور',
    titleFr: 'Rafiqi Cockpit Académique — Calculateur GPA, Planificateur & Assiduité',
    descEn:
      'Manage your university courses, cumulative GPA simulations, assignment deadlines, and attendance deprivation alerts with Rafiqi.',
    descAr:
      'أدر مقرراتك الجامعية، وحساب المعدل التراكمي، والمهام الدراسية، وتنبيهات نسب الحضور بذكاء عبر منصة رفيقي.',
    descFr:
      'Gérez vos cours universitaires, votre moyenne cumulative, vos échéances et votre assiduité avec Rafiqi.',
  },
  gym: {
    titleEn: 'Rafiqi Cognitive Gym — Daily Reasoning, Logic & Working Memory Workouts',
    titleAr: 'نادي رفيقي المعرفي — تدريبات يومية للمنطق والذاكرة وسرعة البديهة',
    titleFr: 'Rafiqi Gymnastique Cognitive — Entraînements Mentaux Quotidiens',
    descEn:
      'Sharpen fluid reasoning, quantitative logic, working memory, and processing speed with Rafiqi’s daily 3-minute cognitive workouts.',
    descAr:
      'نمِّ مهارات الاستدلال المنطقي والذاكرة العاملة وسرعة المعالجة الذهنية مع تمارين رفيقي المعرفية اليومية.',
    descFr:
      'Entraînez votre raisonnement fluide, votre logique quantitative et votre mémoire de travail avec Rafiqi.',
  },
  france: {
    titleEn: 'Rafiqi France Travel & Spoken French Voice Companion',
    titleAr: 'رفيقي للسفر إلى فرنسا — المساعد الصوتي والمترجم الفوري للفرنسية',
    titleFr: 'Rafiqi Compagnon Vocal de Voyage en France',
    descEn:
      'Real-time French voice interpreter, phonetic pronunciation mentor, and situational travel assistant powered by Rafiqi AI.',
    descAr:
      'مترجم صوتي فوري ومساعد ذكي لتعلم النطق الفرنسي ومواقف السفر اليومية في فرنسا عبر منصة رفيقي.',
    descFr:
      'Interprète vocal français en temps réel, guide phonétique et assistant de voyage propulsé par Rafiqi IA.',
  },
  profile: {
    titleEn: 'Rafiqi — Personal Learning Profile & Accessibility Passport',
    titleAr: 'رفيقي — الملف الشخصي وجواز الإتاحة الذكي',
    titleFr: 'Rafiqi — Profil d’Apprentissage & Passeport d’Accessibilité',
    descEn:
      'Customize your Rafiqi learning profile, cognitive calibration, language preferences, and portable accessibility passport.',
    descAr:
      'خصص ملفك التعليمي في رفيقي، وإعدادات اللغة، ومعايرة الأسلوب المعرفي، وجواز الإتاحة الخاص بك.',
    descFr:
      'Personnalisez votre profil d’apprentissage Rafiqi, vos préférences linguistiques et votre passeport d’accessibilité.',
  },
  settings: {
    titleEn: 'Rafiqi Settings — Language, Accessibility, Voice & AI Preferences',
    titleAr: 'إعدادات رفيقي — اللغة، الإتاحة، الصوت، وتفضيلات الذكاء الاصطناعي',
    titleFr: 'Paramètres Rafiqi — Langue, Accessibilité, Voix & IA',
    descEn:
      'Configure Rafiqi theme, font scaling, screen reader speech rate, Arabic dialect, and adaptive AI parameters.',
    descAr:
      'اضبط مظهر منصة رفيقي، وحجم الخط، وسرعة القراءة الصوتية، واللهجة العربية، وإعدادات الذكاء الاصطناعي.',
    descFr:
      'Configurez le thème Rafiqi, la taille de police, la synthèse vocale et les paramètres IA.',
  },
  support: {
    titleEn: 'Rafiqi Support Center — Accessible Help & Documentation',
    titleAr: 'مركز دعم رفيقي — المساعدة الميسرة والأسئلة الشائعة',
    titleFr: 'Centre d’Assistance Rafiqi — Aide Accessible & FAQ',
    descEn:
      'Get help with Rafiqi’s adaptive study tools, visual companion, sign language studio, and accessibility features.',
    descAr:
      'احصل على الدعم والمساعدة حول أدوات رفيقي التعليمية، والمساعد البصري، واستوديو لغة الإشارة.',
    descFr:
      'Obtenez de l’aide sur les outils d’étude adaptatifs et les fonctionnalités d’accessibilité de Rafiqi.',
  },
  login: {
    titleEn: 'Sign In to Rafiqi (رفيقي) — Inclusive AI Learning & Accessibility Platform',
    titleAr: 'تسجيل الدخول إلى رفيقي (Rafiqi) — منصة التعلم الشامل والمساعد الذكي',
    titleFr: 'Connexion à Rafiqi — Plateforme d’Apprentissage IA Inclusive & Accessible',
    descEn: BRAND_CONFIG.descriptionEn,
    descAr: BRAND_CONFIG.descriptionAr,
    descFr: 'Connectez-vous à Rafiqi pour accéder à votre mentor IA adaptatif et vos outils d’accessibilité.',
  },
};

/**
 * Pure function that resolves complete SEO metadata for a given view and locale.
 */
export function resolveSeoMetadata(context: SeoContext): SeoMetadata {
  const effectiveKey =
    context.view === 'disability' && context.subTab && ROUTE_SEO_REGISTRY[context.subTab]
      ? context.subTab
      : context.view;

  const entry = ROUTE_SEO_REGISTRY[effectiveKey] || ROUTE_SEO_REGISTRY.chat;
  const isAr = isArabicLocale(context.language);
  const isFr = context.language === 'French' || context.language === 'fr';

  const title = isAr ? entry.titleAr : isFr ? entry.titleFr : L(entry.titleEn);
  const description = isAr ? entry.descAr : isFr ? entry.descFr : L(entry.descEn);
  const ogLocale = isAr ? 'ar_EG' : isFr ? 'fr_FR' : 'en_US';
  const lang = isAr ? 'ar' : isFr ? 'fr' : 'en';
  const dir: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';

  const pathSuffix =
    context.view && context.view !== 'chat' && context.view !== 'login'
      ? `/#${context.view}${context.subTab ? `/${context.subTab}` : ''}`
      : '/';

  return {
    title,
    description,
    canonicalUrl: `${BRAND_CONFIG.canonicalUrl}${pathSuffix}`,
    ogTitle: title,
    ogDescription: description,
    ogLocale,
    lang,
    dir,
  };
}

const browserDocumentAdapter: DocumentAdapter = {
  setTitle(title: string) {
    if (typeof document !== 'undefined') {
      document.title = title;
    }
  },
  setMetaContent(selector: string, attribute: 'name' | 'property', key: string, content: string) {
    if (typeof document === 'undefined') return;
    let el = document.querySelector<HTMLMetaElement>(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attribute, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  },
  setCanonical(href: string) {
    if (typeof document === 'undefined') return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  },
};

/**
 * Applies resolved SEO metadata to the active document head.
 */
export function applySeoMetadata(
  context: SeoContext,
  adapter: DocumentAdapter = browserDocumentAdapter
): SeoMetadata {
  const meta = resolveSeoMetadata(context);

  adapter.setTitle(meta.title);
  adapter.setMetaContent('meta[name="description"]', 'name', 'description', meta.description);
  adapter.setMetaContent('meta[property="og:title"]', 'property', 'og:title', meta.ogTitle);
  adapter.setMetaContent('meta[property="og:description"]', 'property', 'og:description', meta.ogDescription);
  adapter.setMetaContent('meta[property="og:locale"]', 'property', 'og:locale', meta.ogLocale);
  adapter.setMetaContent('meta[name="twitter:title"]', 'name', 'twitter:title', meta.ogTitle);
  adapter.setMetaContent('meta[name="twitter:description"]', 'name', 'twitter:description', meta.ogDescription);
  adapter.setCanonical(meta.canonicalUrl);

  return meta;
}
