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
  readonly section?: string;
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
      'Explore Rafiqi’s universal accessibility suite featuring real-time AI visual companion, 3D sign language interpreter, live captions, and accessible document studio.',
    descAr:
      'استكشف منظومة رفيقي الشاملة لذوي الهمم: المساعد البصري الذكي للمكفوفين، مترجم لغة الإشارة ثلاثي الأبعاد للصم، واستوديو المستندات الميسرة.',
    descFr:
      'Découvrez la suite d’accessibilité Rafiqi : compagnon visuel IA, interprète en langue des signes 3D et studio de lecture accessible.',
  },
  see_understand: {
    titleEn: 'Rafiqi | See & Understand — Real-Time Visual Companion & Object Finder',
    titleAr: 'رفيقي | الرؤية والفهم — المساعد البصري الذكي وقارئ النصوص والعملات',
    titleFr: 'Rafiqi | Voir & Comprendre — Compagnon Visuel IA en Temps Réel',
    descEn:
      'Describe surroundings, read signs and Egyptian banknotes, detect colors, scan products, and locate personal items with Rafiqi Visual Companion.',
    descAr:
      'وصف فوري للمشهد المحيط، قراءة النصوص واللافتات والعملات، تمييز الألوان، وفحص المنتجات والبحث عن الأغراض عبر المساعد البصري في رفيقي.',
    descFr:
      'Décrivez votre environnement, lisez des textes et billets, identifiez les couleurs et retrouvez vos objets avec Rafiqi.',
  },
  read_learn: {
    titleEn: 'Rafiqi | Read & Learn — Accessible Books, Audio & Document Intelligence',
    titleAr: 'رفيقي | القراءة والتعلّم — الكتب الميسرة، استوديو المستندات، والصوتيات',
    titleFr: 'Rafiqi | Lire & Apprendre — Livres Accessibles & Intelligence Documentaire',
    descEn:
      'Convert PDFs, Word files, and lecture recordings into clear accessible study material with smart bookmarks, summaries, and Q&A.',
    descAr:
      'حوّل ملفات PDF وWord والمحاضرات الصوتية إلى محتوى تعليمي ميسر مع التلخيص والأسئلة الصوتية واستوديو الكتب الميسرة في رفيقي.',
    descFr:
      'Transformez vos documents et cours audio en supports d’étude accessibles avec résumés et questions-réponses.',
  },
  work_create: {
    titleEn: 'Rafiqi | Work & Create — Accessible Productivity & Task Workspace',
    titleAr: 'رفيقي | العمل والإبداع — مساحة الإنتاجية وتنظيم المهام الميسرة',
    titleFr: 'Rafiqi | Travailler & Créer — Espace de Productivité Accessible',
    descEn:
      'Draft accessible documents, organize structured study workflows, and execute daily productivity tasks with adaptive AI guidance.',
    descAr:
      'أنشئ مستنداتك ونظم مهامك الدراسية والمهنية بسهولة كاملة بدعم الذكاء الاصطناعي الميسر في رفيقي.',
    descFr:
      'Rédigez des documents accessibles et organisez vos tâches quotidiennes avec l’assistance IA de Rafiqi.',
  },
  move_explore: {
    titleEn: 'Rafiqi | Move & Explore — Safe Mobility, Transit & Route Guidance',
    titleAr: 'رفيقي | الحركة والاستكشاف — إرشادات التنقل الآمن والمواصلات والمكان',
    titleFr: 'Rafiqi | Se Déplacer & Explorer — Assistance Mobilité & Transport',
    descEn:
      'Accessible route planning, public transit navigation hints, hazard cues, and nearby landmark orientation built for independent mobility.',
    descAr:
      'دعم التوجّه في الأماكن العامة والمواصلات وتنبيهات العوائق لتعزيز استقلالية الحركة بأمان مع رفيقي.',
    descFr:
      'Planification d’itinéraires accessibles, repères urbains et guidance sécurisée pour une mobilité autonome.',
  },
  communicate: {
    titleEn: 'Rafiqi | Communicate & Express — Hear & Express, Sign Language & AAC',
    titleAr: 'رفيقي | التواصل والتعبير — التفريغ المباشر، لغة الإشارة، والتواصل البديل',
    titleFr: 'Rafiqi | Communiquer & S’Exprimer — Sous-titres, LSF/ArSL & CAA',
    descEn:
      'Two-way accessible communication hub uniting live captions, sound awareness radar, Egyptian Sign Language resources, and AAC boards.',
    descAr:
      'مركز التواصل الميسر: تفريغ فوري للكلام، تنبيهات الأصوات المحيطة، قاموس لغة الإشارة، ولوحة التواصل البديل AAC.',
    descFr:
      'Centre de communication bidirectionnelle réunissant sous-titres en direct, détection sonore et tableaux CAA.',
  },
  personalize: {
    titleEn: 'Rafiqi | Personalize — Accessibility Profile & Accommodation Passport',
    titleAr: 'رفيقي | التخصيص والإعدادات — الملف الشخصي وجواز الإتاحة الموحد',
    titleFr: 'Rafiqi | Personnaliser — Profil d’Accessibilité & Passeport d’Accueil',
    descEn:
      'Configure visual, auditory, motor, and cognitive accommodations and generate your portable Rafiqi Accessibility Passport.',
    descAr:
      'اضبط تفضيلات اللغة والصوت والتباين والحجم، وأصدر جواز الإتاحة الموحد الخاص بك في منصة رفيقي.',
    descFr:
      'Configurez vos préférences d’accessibilité et générez votre Passeport d’Accessibilité Rafiqi.',
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
    titleEn: 'Rafiqi Hear & Express — Sign Language, Sound Awareness & Live Captions',
    titleAr: 'رفيقي للصم وضعاف السمع — التفريغ النصي الحي ولغة الإشارة والتنبيهات الصوتية',
    titleFr: 'Rafiqi Centre Auditif — Sous-titres Live, Signes & Conscience Sonore',
    descEn:
      'Two-way communication bridge for Deaf and Hard-of-Hearing learners with live speech transcription, sound alerts, and AAC communication.',
    descAr:
      'منظومة تواصل متكاملة للصم وضعاف السمع تشمل التفريغ المباشر للكلام، وتنبيهات الأصوات، ولوحة التواصل ولغة الإشارة.',
    descFr:
      'Passerelle de communication bidirectionnelle avec transcription vocale en direct et alertes sonores.',
  },
  toolkit: {
    titleEn: 'Rafiqi | Document & Audio Intelligence — Smart Extraction & Q&A',
    titleAr: 'رفيقي | ذكاء المستندات والصوتيات — القراءة والتحليل الصوتي الذكي',
    titleFr: 'Rafiqi | Intelligence Documentaire & Audio',
    descEn:
      'Upload documents and audio lectures for accessible transcription, structured formatting, and evidence-grounded Q&A.',
    descAr:
      'استخرج وحلّل ملفاتك التعليمية والملفات الصوتية بأعلى معايير الإتاحة عبر منصة رفيقي.',
    descFr: 'Extrayez et analysez vos documents et fichiers audio de façon accessible.',
  },
  book_studio: {
    titleEn: 'Rafiqi | Accessible Book Studio — Formatted Study Material & DOCX Export',
    titleAr: 'رفيقي | استوديو الكتب الميسرة — تجهيز الكتب وتصدير Word الميسر',
    titleFr: 'Rafiqi | Studio Livres Accessibles & Export DOCX',
    descEn:
      'Build screen-reader friendly textbooks and accessible exams with customizable spacing, headings, and instant Word/HTML export.',
    descAr:
      'حوّل المقررات الدراسية إلى كتب واختبارات متوافقة مع قارئات الشاشة بتصدير مباشر إلى Word وHTML.',
    descFr: 'Créez des manuels et examens compatibles avec les lecteurs d’écran.',
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
    titleEn: 'Sign In to Rafiqi (رفيقي) — Inclusive Learning & Assistive Technology Platform',
    titleAr: 'تسجيل الدخول إلى رفيقي (Rafiqi) — منصة التعلم الشامل والتقنيات المساندة',
    titleFr: 'Connexion à Rafiqi — Plateforme d’Apprentissage IA Inclusive & Accessible',
    descEn: BRAND_CONFIG.descriptionEn,
    descAr: BRAND_CONFIG.descriptionAr,
    descFr: 'Connectez-vous à Rafiqi pour accéder à vos outils d’apprentissage inclusif et d’accessibilité.',
  },
};

/**
 * Pure function that resolves complete SEO metadata for a given view, section, and locale.
 */
export function resolveSeoMetadata(context: SeoContext): SeoMetadata {
  const effectiveKey =
    context.section && ROUTE_SEO_REGISTRY[context.section]
      ? context.section
      : context.view === 'disability' && context.subTab && ROUTE_SEO_REGISTRY[context.subTab]
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

  let pathSuffix = '/';
  if (context.section && ROUTE_SEO_REGISTRY[context.section]) {
    pathSuffix = `/#${context.section}`;
  } else if (context.view && context.view !== 'chat' && context.view !== 'login') {
    pathSuffix = `/#${context.view}${context.subTab ? `/${context.subTab}` : ''}`;
  }

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
