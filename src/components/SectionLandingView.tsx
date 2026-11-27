/**
 * Rafiqi (رفيقي) — Premium Six Product Section Experiences (UI Phase 4)
 *
 * Implements the shared section landing page pattern across all six official product sections:
 * 1. See & Understand (الرؤية والفهم)
 * 2. Read & Learn (القراءة والتعلّم)
 * 3. Work & Create (العمل والإبداع)
 * 4. Move & Explore (الحركة والاستكشاف)
 * 5. Communicate (التواصل والتعبير) - including Hear & Express
 * 6. Personalize (التخصيص والإعدادات)
 *
 * Core Invariants:
 * - Exactly six product sections preserved.
 * - Dynamic breadcrumb (Home > Section {num}: {Title}).
 * - Order badge (Section {num} of 6).
 * - Dominant primary action button.
 * - Organized feature groups (distinct logical clusters per domain).
 * - Section-specific highlight banners (Fidelity guarantee, Safety notice, ESL boundary, Universal access).
 * - Real recent activity with honest, actionable empty states (zero fabricated data).
 * - Full WCAG 2.1 AA keyboard navigation and screen reader support.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Info,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Shield,
  BookOpen,
  Eye,
  Briefcase,
  Compass,
  MessageSquare,
  Settings,
  Mic,
  Headphones,
  Volume2,
  FileText,
  Upload,
  Play,
  Clock,
  Layers,
  Sparkle,
  Radio,
  Ear,
  ScanLine,
  Navigation,
} from 'lucide-react';
import { UserProfile } from '../types';
import { isArabicLocale } from '../lib/translations';
import {
  ProductSectionId,
  getProductSection,
  getSectionIconComponent,
  SectionFeatureItem,
} from '../lib/sections';
import { FEATURE_SHORT_NAMES, GROUP_SHORT_NAMES } from '../lib/sectionShortNames';

export interface SectionLandingViewProps {
  sectionId: ProductSectionId;
  profile: UserProfile;
  onNavigateBack: () => void;
  onSelectFeature: (feature: SectionFeatureItem) => void;
  isDarkMode?: boolean;
}

interface FeatureGroupDefinition {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: React.ComponentType<{ className?: string }>;
  featureIds: string[];
}

export default function SectionLandingView({
  sectionId,
  profile,
  onNavigateBack,
  onSelectFeature,
  isDarkMode = true,
}: SectionLandingViewProps) {
  const isAr = isArabicLocale(profile.language);
  const section = getProductSection(sectionId);

  // Keyboard navigation focus state
  const [activeHelpModal, setActiveHelpModal] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Real recent activity loaded from local storage (no fabricated data)
  const [recentItems, setRecentItems] = useState<Array<{ id: string; label: string; timestamp: string; featureId?: string }>>([]);

  useEffect(() => {
    try {
      const storageKey = `rafiqi_recent_activity_${sectionId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentItems(parsed.slice(0, 4));
        } else {
          setRecentItems([]);
        }
      } else {
        setRecentItems([]);
      }
    } catch {
      setRecentItems([]);
    }
  }, [sectionId]);

  if (!section) {
    return (
      <div className={`p-8 text-center space-y-4 ${isDarkMode ? 'bg-[#0A2342] text-slate-100' : 'bg-[#F5F9FD] text-slate-900'}`}>
        <p className="text-sm text-slate-400">
          {isAr ? 'القسم المطلوب غير موجود.' : 'Section not found.'}
        </p>
        <button
          type="button"
          onClick={onNavigateBack}
          className="px-5 py-2.5 bg-rafiqi-primary hover:bg-rafiqi-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md"
        >
          {isAr ? 'الرجوع إلى لوحة التحكم' : 'Return to Dashboard Hub'}
        </button>
      </div>
    );
  }

  const SectionIcon = getSectionIconComponent(section.iconName);
  const primaryFeature = section.features.find((f) => f.isPrimaryAction) || section.features[0];

  // Groupings specific to each section for logical clustering
  const getFeatureGroups = (): FeatureGroupDefinition[] => {
    switch (sectionId) {
      case 'see_understand':
        return [
          {
            id: 'grp_live_camera',
            titleEn: 'Live Camera & Scene Understanding',
            titleAr: 'الكاميرا الحية ووصف المشاهد',
            descEn: 'Continuous real-time scene descriptions, obstacle proximity, and direction guidance.',
            descAr: 'وصف مباشر ومستمر للمشاهد، رصد العوائق، والتوجيه بنظام ساعة الاتجاهات.',
            icon: Eye,
            featureIds: ['feat_visual_assistant', 'feat_text_reader'],
          },
          {
            id: 'grp_objects_currency',
            titleEn: 'Object & Currency Verification',
            titleAr: 'كشف المقتنيات وقراءة العملات',
            descEn: 'Find everyday essentials and verify banknotes with honest certainty disclosure.',
            descAr: 'البحث عن المفاتيح والنظارات وقراءة فئات النقود مع بيان مستوى التيقن.',
            icon: ScanLine,
            featureIds: ['feat_object_finder', 'feat_currency_reader'],
          },
          {
            id: 'grp_products_labels',
            titleEn: 'Products, Labels & Expiration',
            titleAr: 'المنتجات والملصقات وتواريخ الصلاحية',
            descEn: 'Barcode scanning, packaging details, and verification of production/expiry dates.',
            descAr: 'مسح الباركود، قراءة بطاقات العبوات، وفحص تواريخ الإنتاج والصلاحية بدقة.',
            icon: CheckCircle2,
            featureIds: ['feat_product_scanner'],
          },
          {
            id: 'grp_people_apparel',
            titleEn: 'People & Apparel Matching',
            titleAr: 'التعرف على الأشخاص وتنسيق الألوان',
            descEn: 'Enrolled face recognition and color harmony analysis for garments and items.',
            descAr: 'التعرف على الوجوه المسجلة مسبقاً وتنسيق ألوان الملابس والمقتنيات.',
            icon: Sparkles,
            featureIds: ['feat_color_matcher', 'feat_person_recognition'],
          },
        ];

      case 'read_learn':
        return [
          {
            id: 'grp_audio_lectures',
            titleEn: 'Audio Lecture Transcription & Intelligence',
            titleAr: 'تفريغ المحاضرات الصوتية والذكاء التعليمي',
            descEn: 'Speech-to-text lecture processing, timestamps, chapters, and grounded question answering.',
            descAr: 'تفريغ تسجيلات المحاضرات، علامات التوقف الزمنية، والأسئلة المدعومة بالمحتوى الأصلي.',
            icon: Headphones,
            featureIds: ['feat_audio_doc_intelligence'],
          },
          {
            id: 'grp_digital_books',
            titleEn: 'Digital Books & Study Companions',
            titleAr: 'الكتب الرقمية والمساعد الأكاديمي',
            descEn: 'Curriculum textbook conversion into accessible digital formats with step-by-step tutoring.',
            descAr: 'تحويل المناهج إلى كتب رقمية مهيأة لقارئات الشاشة مع شروحات أكاديمية واضحة.',
            icon: BookOpen,
            featureIds: ['feat_book_studio', 'feat_accessible_tutor'],
          },
          {
            id: 'grp_math_braille',
            titleEn: 'Accessible Math, Tables & Braille Transcription',
            titleAr: 'الرياضيات والجداول الميسرة ونصوص برايل',
            descEn: 'Cell-by-cell table traversal, spoken LaTeX formulas, and Unicode Braille with .BRF export.',
            descAr: 'تصفح الجداول خلية بخلية، نطق معادلات LaTeX لفظياً، وتصدير ملفات برايل BRF الحقيقية.',
            icon: Layers,
            featureIds: ['feat_math_table_reader', 'feat_braille_transcriber'],
          },
        ];

      case 'work_create':
        return [
          {
            id: 'grp_formatting_studio',
            titleEn: 'Word Book Formatting Studio & Voice Dictation',
            titleAr: 'استوديو تنسيق الكتب والمستندات والإملاء الصوتي',
            descEn: 'Professional document formatting preserving source text verbatim, and hands-free voice drafting.',
            descAr: 'تنسيق الكتب والمستندات مع أمانة النقل الحرفي دون تعديل المعنى، والإملاء الصوتي الذكي.',
            icon: FileText,
            featureIds: ['feat_productivity_workspace', 'feat_voice_doc_creation'],
          },
          {
            id: 'grp_office_assistants',
            titleEn: 'Office & Communication Drafting Assistants',
            titleAr: 'مساعدات العمل المكتبي وصياغة المراسلات',
            descEn: 'Formal & dialectal email drafting, accessible PowerPoint presentations, and safe formula auditing.',
            descAr: 'صياغة الرسائل، عروض PowerPoint التقديمية الميسرة، وفحص معادلات إكسل بأمان.',
            icon: Briefcase,
            featureIds: ['feat_writing_email_assistant', 'feat_powerpoint_creator', 'feat_excel_assistant'],
          },
          {
            id: 'grp_visual_data_forms',
            titleEn: 'Visual Data Analysis & Smart Form Filling',
            titleAr: 'تحليل البيانات البصرية وتعبئة الاستمارات',
            descEn: 'Full text equivalents for graphs and step-by-step guided form entry with zero guessing.',
            descAr: 'بدائل نصية كاملة للرسوم البيانية وتعبئة الاستمارات خطوة بخطوة مع مراجعة الحقول الإلزامية.',
            icon: Sparkles,
            featureIds: ['feat_chart_describer', 'feat_smart_form_filler'],
          },
          {
            id: 'grp_executive_tracking',
            titleEn: 'Academic Planning, Goals & Cognitive Functions',
            titleAr: 'الجدول الأكاديمي وتتبع الأهداف والذاكرة',
            descEn: 'Auditory deadline alerts, high-contrast GPA simulations, and working memory exercises.',
            descAr: 'تنبيهات صوتية بالمواعيد، محاكاة المعدل التراكمي، وتمارين الذاكرة العاملة والتركيز.',
            icon: Clock,
            featureIds: ['feat_academic_planner', 'feat_goals_gpa', 'feat_cognitive_gym', 'feat_analytics'],
          },
        ];

      case 'move_explore':
        return [
          {
            id: 'grp_spatial_orientation',
            titleEn: 'Spatial Orientation & Landmark Exploration',
            titleAr: 'التوجه المكاني واستكشاف المعالم',
            descEn: 'Qualitative clock-face directions for rooms, counters, and doors without metric hallucination.',
            descAr: 'توجيهات اتجاهية بساعة الاتجاهات للمداخل والأروقة دون افتعال مسافات رقمية وهمية.',
            icon: Compass,
            featureIds: ['feat_mobility_workspace', 'feat_place_description', 'feat_entrance_door_assistant'],
          },
          {
            id: 'grp_signs_indoor',
            titleEn: 'Sign OCR & Indoor Boundary Architecture',
            titleAr: 'قراءة اللافتات والحدود الموثقة للملاحة الداخلية',
            descEn: 'Distinguish verbatim sign text from inferred advice, and honest beacon infrastructure status.',
            descAr: 'الفصل بين النص الحرفي والاتجاه المستنتج، وإيضاح حقيقة متطلبات البنية التحتية الداخلية.',
            icon: Eye,
            featureIds: ['feat_sign_direction_reader', 'feat_indoor_navigation_boundary'],
          },
          {
            id: 'grp_transit_maps',
            titleEn: 'Transit Identification & Verified Accessible Places',
            titleAr: 'وسائل النقل العام ودليل الأماكن الميسرة',
            descEn: 'Bus route reader with uncertainty warnings, verified directory, and official GPS integration.',
            descAr: 'قراءة أرقام الحافلات، دليل المنشآت الميسرة الموثقة، وتكامل الخرائط المعتمدة بتصريح مسبق.',
            icon: Navigation,
            featureIds: ['feat_public_transit_assistant', 'feat_accessible_places_directory', 'feat_navigation_gps_integration'],
          },
          {
            id: 'grp_hazard_radar',
            titleEn: 'Hazard Pulses & Ambient Sound Radar',
            titleAr: 'تنبيه العوائق ورادار الأصوات المحيطة',
            descEn: 'Haptic vibration alerts for steps/drop-offs and visual radar for environmental sounds.',
            descAr: 'نبضات اهتزاز لمسية فورية عند السلالم ورادار بصري للأصوات المحيطة لتأمين الحركة.',
            icon: Radio,
            featureIds: ['feat_spatial_locator', 'feat_hazard_pulse', 'feat_ambient_radar'],
          },
        ];

      case 'communicate':
        return [
          {
            id: 'grp_human_assistance',
            titleEn: 'Human Assistance & Live Stream Sharing',
            titleAr: 'المساعدة البشرية المباشرة والبث الحي',
            descEn: 'Verified sighted companions and direct live stream with active sharing badge and kill switch.',
            descAr: 'اتصال مباشر بمرافق مبصر معتمد مع مؤشر بث نشط وإمكانية الإنهاء الفوري بضغطة زر.',
            icon: MessageSquare,
            featureIds: ['feat_accessible_communication_workspace', 'feat_human_assistance', 'feat_live_video_assist'],
          },
          {
            id: 'grp_notes_prescriptions',
            titleEn: 'Handwriting, Voice Notes & Social Messaging',
            titleAr: 'الخط اليدوي والرسائل الصوتية والمحادثات',
            descEn: 'Prescription OCR, voice note summaries, and social image descriptions with draft review.',
            descAr: 'قراءة الروشتات الطبية، تفريغ الرسائل الصوتية، ووصف صور المحادثات مع مراجعة الردود.',
            icon: FileText,
            featureIds: [
              'feat_handwriting_reader',
              'feat_form_communication_assistant',
              'feat_voice_message_transcription',
              'feat_social_message_describer',
              'feat_payment_currency_guidance',
            ],
          },
          {
            id: 'grp_hear_express',
            titleEn: 'Hear & Express Subgroup (Deaf, Hard of Hearing & Non-Speaking)',
            titleAr: 'منظومة السمع والتعبير (للصم وضعاف السمع وغير الناطقين)',
            descEn: 'Live STT captions, customizable AAC boards, two-way bridge, and validated sign dictionary.',
            descAr: 'تفريغ فوري للكلام، لوحات تواصل رمزي AAC، جسر المحادثة المزدوج، وقاموس لغة الإشارة المعتمد.',
            icon: Ear,
            featureIds: [
              'feat_hear_express',
              'feat_live_captions',
              'feat_aac_boards',
              'feat_two_way_bridge',
              'feat_egyptian_sign_avatar',
            ],
          },
        ];

      case 'personalize':
        return [
          {
            id: 'grp_passport_system',
            titleEn: 'Accessibility Passport & Speech Configuration',
            titleAr: 'جواز التيسير وتخصيص الصوت والنطق',
            descEn: 'Universal accessibility profile, speech rate/pitch tuning, and description verbosity.',
            descAr: 'جواز التيسير الشامل، ضبط سرعة ونبرة الصوت، وتحديد عمق الشرح البصري والعملة.',
            icon: ShieldCheck,
            featureIds: [
              'feat_accessibility_passport',
              'feat_voice_audio_preferences',
              'feat_description_reading_preferences',
            ],
          },
          {
            id: 'grp_navigation_history',
            titleEn: 'Keyboards, Bookmarks & Learning Records',
            titleAr: 'مصفوفة الاختصارات وسجل القراءة والتقدم',
            descEn: 'Conflict-free keyboard navigation, reading bookmark resume, and study identity passport.',
            descAr: 'اختصارات لوحة المفاتيح دون تعارض، استئناف الكتب والمحاضرات، وسجل الإنجاز التعليمي.',
            icon: Clock,
            featureIds: [
              'feat_shortcuts_commands',
              'feat_reading_history_manager',
              'feat_student_profile',
            ],
          },
          {
            id: 'grp_privacy_offline',
            titleEn: 'Privacy Controls, Assistant Memory & Offline Status',
            titleAr: 'الخصوصية وأمان البيانات وذاكرة المساعد وحالة الاتصال',
            descEn: 'Strict opt-in assistant memory, zero-knowledge encryption, and genuine offline capability matrix.',
            descAr: 'ذاكرة باشتراك صريح، إدارة الأذونات، وتوضيح صادق للأدوات التي تعمل دون إنترنت.',
            icon: Shield,
            featureIds: [
              'feat_assistant_memory_privacy',
              'feat_offline_connectivity_status',
              'feat_privacy_security',
              'feat_caregiver_support',
            ],
          },
        ];

      default:
        return [];
    }
  };

  const featureGroups = getFeatureGroups();
  // Big sections (more than 8 tools in 2+ groups) show one group at a time as tabs
  const tabGroups = featureGroups
    .map((g) => ({
      id: g.id,
      titleEn: g.titleEn,
      titleAr: g.titleAr,
      icon: g.icon,
      count: section ? section.features.filter((f) => g.featureIds.includes(f.id)).length : 0,
    }))
    .filter((g) => g.count > 0);
  // Tabs replaced by a plain icon grid (kept in code, switched off).
  const useTabs = false as boolean;
  const hideGroupHeaders = !!section && section.features.length <= 7;
  const currentGroupId =
    activeGroupId && tabGroups.some((g) => g.id === activeGroupId) ? activeGroupId : tabGroups[0]?.id ?? null;

  return (
    <div
      className={`min-h-full flex flex-col p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 select-none transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0A2342] text-slate-100' : 'bg-[#F5F9FD] text-slate-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ── BREADCRUMB NAVIGATION & ACTIONS ── */}
      <nav
        aria-label={isAr ? 'مسار التنقل التفصيلي' : 'Breadcrumb navigation'}
        className="hidden"
      >
        <div className="flex items-center gap-2 text-slate-400 font-medium">
          <button
            type="button"
            onClick={onNavigateBack}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'hover:text-white hover:bg-[#17355C]'
                : 'hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            <span>{isAr ? 'الرئيسية' : 'Home'}</span>
          </button>

          <span className="text-slate-600">/</span>

          <span className="font-bold text-rafiqi-primary dark:text-[#4B9FE1] flex items-center gap-1">
            <span>
              {isAr
                ? `القسم ${section.numericOrder}: ${section.titleAr}`
                : `Section ${section.numericOrder}: ${section.titleEn}`}
            </span>
          </span>
        </div>

        {/* Accessible Keyboard Help Trigger */}
        <button
          type="button"
          onClick={() => setActiveHelpModal(!activeHelpModal)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
            isDarkMode
              ? 'bg-[#112C4F] border-[#24476F] text-slate-300 hover:text-white hover:border-rafiqi-primary'
              : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-rafiqi-primary'
          }`}
          aria-expanded={activeHelpModal}
          aria-label={isAr ? 'عرض إرشادات لوحة المفاتيح والإتاحة' : 'Toggle accessibility & keyboard tips'}
        >
          <HelpCircle className="w-3.5 h-3.5 text-rafiqi-primary" />
          <span>{isAr ? 'إرشادات الاستخدام الميسر' : 'Accessibility Tips'}</span>
        </button>
      </nav>

      {/* ── 1. SECTION HERO & DOMINANT PRIMARY ACTION ── */}
      <section
        aria-labelledby="section-hero-title"
        className="relative" data-testid="section-header"
      >
        <div className="flex items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={onNavigateBack}
            data-testid="section-back"
            aria-label={isAr ? 'رجوع' : 'Back'}
            className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rafiqi-primary ${
              isDarkMode ? 'bg-[#112C4F] border-[#24476F] text-white' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div className="space-y-1 flex-1 min-w-0 text-start">
            {/* Top Order Badge */}
            <div className="hidden items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black tracking-wide bg-rafiqi-primary/15 text-rafiqi-primary dark:text-[#4B9FE1] border border-rafiqi-primary/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isAr
                    ? `القسم ${section.numericOrder} من 6`
                    : `Section ${section.numericOrder} of 6`}
                </span>
              </span>
            </div>

            {/* Title */}
            <h1
              id="section-hero-title"
              className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-3 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-rafiqi-primary/20 border border-rafiqi-primary/30 flex items-center justify-center text-rafiqi-primary dark:text-[#4B9FE1] shrink-0 shadow-sm">
                <SectionIcon className="w-6 h-6" />
              </div>
              <span>{isAr ? section.titleAr : section.titleEn}</span>
            </h1>

            {/* Short Explanation */}
            <p className={`hidden text-sm sm:text-base leading-snug font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              {isAr ? section.shortExplanationAr : section.shortExplanationEn}
            </p>

            {/* Detailed Purpose */}
            <p className={`hidden text-xs leading-relaxed max-w-2xl line-clamp-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {isAr ? section.detailedPurposeAr : section.detailedPurposeEn}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveHelpModal(!activeHelpModal)}
            data-testid="section-info-button"
            aria-expanded={activeHelpModal}
            aria-label={isAr ? 'معلومات وإرشادات عن هذا القسم' : 'Notes and tips about this section'}
            className={`w-11 h-11 shrink-0 rounded-full border flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rafiqi-primary text-rafiqi-primary ${
              isDarkMode ? 'bg-[#112C4F] border-[#24476F]' : 'bg-white border-slate-300'
            }`}
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Primary Quick Start Action (now the blue first card in the grid) */}
          {primaryFeature && (
            <div className="hidden w-full lg:w-72 xl:w-80 max-w-full min-w-0 lg:shrink-0 flex flex-col items-stretch gap-1.5">
              <button
                type="button"
                onClick={() => onSelectFeature(primaryFeature)}
                aria-label={`${isAr ? 'تشغيل الميزة الأساسية للقسم:' : 'Launch primary feature:'} ${
                  isAr ? primaryFeature.titleAr : primaryFeature.titleEn
                }`}
                className="w-full max-w-full min-h-[52px] px-4 py-2.5 rounded-xl bg-rafiqi-primary hover:bg-rafiqi-primary-dark active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-rafiqi-primary/30 flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 focus-visible:ring-4 focus-visible:ring-rafiqi-primary/50"
              >
                <div className="text-start min-w-0">
                  <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                    {isAr ? 'الميزة الأساسية' : 'Primary Quick Start'}
                  </div>
                  <div className="text-sm font-bold line-clamp-2 break-words">
                    {isAr ? primaryFeature.titleAr : primaryFeature.titleEn}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  {isAr ? (
                    <ArrowLeft className="w-5 h-5 text-white" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-white" />
                  )}
                </div>
              </button>

              <p className="hidden lg:block text-xs text-center text-slate-400">
                {isAr ? 'اضغط Enter أو المس لتشغيل الأداة فوراً' : 'Press Enter or click to launch instantly'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION NOTICES: collapsed behind the (i) button ── */}
      <div className={activeHelpModal ? 'space-y-3' : 'hidden'} data-testid="section-info-panel">
      {sectionId === 'see_understand' && (
        <section
          aria-label={isAr ? 'تنبيه إرشادات الكاميرا الحية' : 'Live Camera Guidance'}
          className={`p-3 rounded-xl border flex items-start gap-3 ${
            isDarkMode
              ? 'bg-[#102035] border-[#1769AA]/40 text-blue-100'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}
        >
          <div className="p-2 rounded-xl bg-rafiqi-primary/20 text-rafiqi-primary dark:text-[#4B9FE1] shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-start">
            <h2 className="text-xs sm:text-sm font-bold">
              {isAr ? 'المساعد البصري الذكي: توجيه فوري للمشهد بدون هلوسة' : 'AI Visual Companion: Real-Time Hallucination-Free Vision'}
            </h2>
            <p className="text-xs leading-snug opacity-90 line-clamp-2">
              {isAr
                ? 'يعتمد النظام على تحليل الإطارات الحية للكاميرا بنظام ساعة الاتجاهات لتحديد العوائق والمقتنيات بدقة وأمانة، مع الاعتراف الفوري عند عدم وضوح الرؤية.'
                : 'Operates on live camera frame analysis with directional clock coordinates. Unambiguously reports optical ambiguity and low certainty without fabricating surroundings.'}
            </p>
          </div>
        </section>
      )}

      {sectionId === 'read_learn' && (
        <section
          aria-label={isAr ? 'إجراءات التعلم السريعة' : 'Quick Learning Actions'}
          className={`p-3 rounded-xl border ${
            isDarkMode ? 'bg-[#112C4F] border-[#24476F]' : 'bg-white border-slate-200'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                const bookFeat = section.features.find((f) => f.id === 'feat_book_studio') || primaryFeature;
                onSelectFeature(bookFeat);
              }}
              className={`min-h-[48px] p-2.5 rounded-xl border flex items-center gap-3 text-start transition-all ${
                isDarkMode
                  ? 'bg-[#17355C] border-[#24476F] hover:border-rafiqi-primary text-white'
                  : 'bg-slate-50 border-slate-200 hover:border-rafiqi-primary text-slate-900'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Play className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">{isAr ? 'استئناف القراءة' : 'Resume Reading'}</div>
                <div className="text-xs text-slate-400">{isAr ? 'متابعة الكتاب الحالي' : 'Continue current book'}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const lectureFeat = section.features.find((f) => f.id === 'feat_audio_doc_intelligence') || primaryFeature;
                onSelectFeature(lectureFeat);
              }}
              className={`min-h-[48px] p-2.5 rounded-xl border flex items-center gap-3 text-start transition-all ${
                isDarkMode
                  ? 'bg-[#17355C] border-[#24476F] hover:border-rafiqi-primary text-white'
                  : 'bg-slate-50 border-slate-200 hover:border-rafiqi-primary text-slate-900'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">{isAr ? 'رفع محاضرة صوتية' : 'Upload Lecture'}</div>
                <div className="text-xs text-slate-400">{isAr ? 'تفريغ وتلخيص ذكي' : 'Transcribe & summarize'}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const tutorFeat = section.features.find((f) => f.id === 'feat_accessible_tutor') || primaryFeature;
                onSelectFeature(tutorFeat);
              }}
              className={`min-h-[48px] p-2.5 rounded-xl border flex items-center gap-3 text-start transition-all ${
                isDarkMode
                  ? 'bg-[#17355C] border-[#24476F] hover:border-rafiqi-primary text-white'
                  : 'bg-slate-50 border-slate-200 hover:border-rafiqi-primary text-slate-900'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">{isAr ? 'مواصلة التعلّم' : 'Continue Learning'}</div>
                <div className="text-xs text-slate-400">{isAr ? 'معلم الذكاء الاصطناعي' : 'Adaptive AI tutor'}</div>
              </div>
            </button>
          </div>
        </section>
      )}

      {sectionId === 'work_create' && (
        <section
          aria-label={isAr ? 'ضمان أمانة النص الأصلي' : 'Verbatim Source Text Preservation Guarantee'}
          className={`p-3 rounded-xl border flex items-start gap-3 ${
            isDarkMode
              ? 'bg-[#0F231D] border-emerald-500/40 text-emerald-100'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-start">
            <h2 className="text-sm font-bold">
              {isAr ? 'ضمان أمانة النص الأصلي والتنسيق الحرفي' : 'Source Text Preservation Guarantee'}
            </h2>
            <p className="text-xs leading-snug opacity-90 line-clamp-2">
              {isAr
                ? 'في استوديو تنسيق الكتب والمستندات: عند طلب التنسيق فقط، يلتزم رفيقي بالحفاظ على النص الأصلي حرفياً دون أي تعديل أو إعادة صياغة أو حذف.'
                : 'In Word Book Formatting Studio: when formatting only is requested, Rafiqi guarantees the exact source text is preserved verbatim without alteration or omission.'}
            </p>
          </div>
        </section>
      )}

      {sectionId === 'move_explore' && (
        <section
          aria-label={isAr ? 'تنبيه أمان الحركة والملاحة' : 'Critical Mobility and Road Safety Notice'}
          className={`p-3 rounded-xl border flex items-start gap-3 ${
            isDarkMode
              ? 'bg-[#29160F] border-amber-500/40 text-amber-100'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-start">
            <h2 className="text-sm font-bold">
              {isAr ? 'تنبيه أمان وإخلاء مسؤولية الحركة في الطرقات' : 'Road Safety Notice: Does Not Replace Mobility Aids'}
            </h2>
            <p className="text-xs leading-snug opacity-90 line-clamp-2">
              {isAr
                ? 'أدوات الاستكشاف تقدم توجيهاً نوعياً للمحيط والمداخل والمعالم، ولكنها لا تضمن السلامة المطلقة في الطرقات ولا تحل بديلاً عن العصا البيضاء أو كلب الإرشاد أو الانتباه الشخصي.'
                : 'Rafiqi orientation tools provide qualitative spatial cues and entrance descriptions, but never guarantee road safety or replace a white cane, guide dog, or physical mobility aids.'}
            </p>
          </div>
        </section>
      )}

      {sectionId === 'communicate' && (
        <section
          aria-label={isAr ? 'حدود لغة الإشارة المعتمدة' : 'Verified Sign Language Boundary'}
          className={`p-3 rounded-xl border flex items-start gap-3 ${
            isDarkMode
              ? 'bg-[#151D2A] border-[#24476F] text-slate-200'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="p-2 rounded-xl bg-rafiqi-primary/20 text-rafiqi-primary dark:text-[#4B9FE1] shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-start">
            <h2 className="text-sm font-bold">
              {isAr ? 'منظومة السمع والتعبير: اعتماد القاموس الإشاري الموثق' : 'Verified Egyptian Sign Language & Honest Validation Boundary'}
            </h2>
            <p className="text-xs leading-snug opacity-90 line-clamp-2">
              {isAr
                ? 'استوديو لغة الإشارة يعتمد على القاموس المنهجي المعتمد. لا ندعي اكتمال الترجمة الإشارية الحرة غير الموثقة، ونوضح بدقة الحدود التقنية الحالية.'
                : 'Sign Language features are powered by verified educational dictionaries. We do not claim complete or unvalidated open translation without verified data provenance.'}
            </p>
          </div>
        </section>
      )}

      {sectionId === 'personalize' && (
        <section
          aria-label={isAr ? 'إتاحة شاملة دون شروط إفصاح' : 'Universal Accessibility Guarantee'}
          className={`p-3 rounded-xl border flex items-start gap-3 ${
            isDarkMode
              ? 'bg-[#142338] border-rafiqi-primary/40 text-blue-100'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}
        >
          <div className="p-2 rounded-xl bg-rafiqi-primary/20 text-rafiqi-primary dark:text-[#4B9FE1] shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-start">
            <h2 className="text-sm font-bold">
              {isAr ? 'إتاحة شاملة ومفتوحة لجميع المستخدمين بدون إفصاح طبي' : 'Universal Accessibility: No Disability Disclosure Required'}
            </h2>
            <p className="text-xs leading-snug opacity-90 line-clamp-2">
              {isAr
                ? 'جميع أدوات التيسير وجواز الإتاحة متاحة لك بحرية تامة دون اشتراط تقديم أي تقارير طبية أو تصنيف إعاقة مسبق.'
                : 'All accessibility tools and customization features are freely accessible to every user without requiring any medical disclosure or disability categorization.'}
            </p>
          </div>
        </section>
      )}

      </div>

      {/* ── 2. FEATURE GROUPS WITH DISTINCTIVE CLUSTERS ── */}
      <section className="space-y-3" aria-label={isAr ? 'مجموعات ميزات القسم' : 'Feature Groups'}>
        {useTabs && (
          <div
            role="tablist"
            aria-label={isAr ? 'مجموعات الأدوات' : 'Tool groups'}
            data-testid="section-group-tabs"
            className="flex flex-wrap gap-2"
          >
            {tabGroups.map((g) => {
              const selected = g.id === currentGroupId;
              const TabIcon = g.icon;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveGroupId(g.id)}
                  className={`min-h-[44px] px-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rafiqi-primary text-start ${
                    selected
                      ? 'bg-rafiqi-primary text-white border-rafiqi-primary'
                      : isDarkMode
                      ? 'bg-[#112C4F] border-[#24476F] text-slate-200 hover:border-rafiqi-primary'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-rafiqi-primary'
                  }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="line-clamp-2 break-words">{isAr ? g.titleAr : g.titleEn}</span>
                  <span className="opacity-70 text-xs shrink-0">{g.count}</span>
                </button>
              );
            })}
          </div>
        )}
        {featureGroups.map((group) => {
          const GroupIcon = group.icon;
          const groupFeatures = section.features.filter((f) => group.featureIds.includes(f.id));

          if (groupFeatures.length === 0) return null;
          if (useTabs && group.id !== currentGroupId) return null;

          return (
            <div key={group.id} className="space-y-2">
              {/* Group Header */}
              <div className={`${useTabs || hideGroupHeaders ? 'hidden ' : ''}flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-slate-200 dark:border-[#24476F]`}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-rafiqi-primary/15 text-rafiqi-primary dark:text-[#4B9FE1] flex items-center justify-center shrink-0">
                    <GroupIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {isAr ? (GROUP_SHORT_NAMES[group.id]?.[1] ?? group.titleAr) : (GROUP_SHORT_NAMES[group.id]?.[0] ?? group.titleEn)}
                    </h2>
                    <p className={`hidden text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isAr ? group.descAr : group.descEn}
                    </p>
                  </div>
                </div>

                <span className="hidden text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/50 dark:bg-[#17355C] text-slate-600 dark:text-slate-400 self-center">
                  {isAr ? `${groupFeatures.length} أدوات` : `${groupFeatures.length} features`}
                </span>
              </div>

              {/* Group Features Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {groupFeatures.map((feature) => {
                  const FeatIcon = getSectionIconComponent(feature.iconName);
                  const isReady = feature.status === 'ready';

                  return (
                    <div
                      key={feature.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectFeature(feature)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectFeature(feature);
                        }
                      }}
                      aria-label={`${isAr ? feature.titleAr : feature.titleEn} — ${
                        isAr ? feature.statusLabelAr : feature.statusLabelEn
                      }`}
                      className={`group relative flex flex-col items-center justify-center text-center min-h-[96px] p-3 rounded-xl border min-w-0 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-rafiqi-primary ${
                        feature.id === primaryFeature?.id
                          ? 'bg-rafiqi-primary border-rafiqi-primary text-white hover:bg-rafiqi-primary-dark'
                          : isDarkMode
                          ? 'bg-[#17355C] border-[#24476F] hover:border-rafiqi-primary hover:bg-[#1E2F48]'
                          : 'bg-white border-slate-200 hover:border-rafiqi-primary hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 min-w-0">
                        {/* Top: Icon + Status Badge */}
                        <div className="flex items-center justify-center">
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 shadow-xs ${
                              isDarkMode
                                ? 'bg-[#112C4F] border-[#24476F] text-[#4B9FE1] group-hover:bg-rafiqi-primary group-hover:text-white'
                                : 'bg-slate-100 border-slate-200 text-rafiqi-primary group-hover:bg-rafiqi-primary group-hover:text-white'
                            }`}
                          >
                            <FeatIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`hidden items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isReady
                                ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isReady && <CheckCircle2 className="w-3 h-3" />}
                            <span>{isAr ? feature.statusLabelAr : feature.statusLabelEn}</span>
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          className={`text-sm font-bold transition-colors leading-snug line-clamp-2 break-words ${
                            feature.id === primaryFeature?.id
                              ? '!text-white'
                              : isDarkMode
                              ? 'text-white group-hover:text-[#4B9FE1]'
                              : 'text-slate-900 group-hover:text-rafiqi-primary'
                          }`}
                        >
                          {isAr ? (FEATURE_SHORT_NAMES[feature.id]?.[1] ?? feature.titleAr) : (FEATURE_SHORT_NAMES[feature.id]?.[0] ?? feature.titleEn)}
                        </h3>

                        {/* Description */}
                        <p
                          className={`hidden text-xs leading-snug ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {isAr ? feature.descAr : feature.descEn}
                        </p>

                        {/* Tags */}
                        <div className="hidden flex-wrap gap-1.5 pt-0.5">
                          {(isAr ? feature.tagsAr : feature.tagsEn).map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className={`px-2 py-0.5 rounded-md text-xs border ${
                                isDarkMode
                                  ? 'bg-[#112C4F] text-slate-400 border-[#24476F]'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Action Hint */}
                      <div className="hidden pt-4 mt-4 border-t border-slate-200 dark:border-[#24476F] items-center justify-between text-xs font-bold text-rafiqi-primary dark:text-[#4B9FE1]">
                        <span>{isAr ? 'فتح الأداة مباشرة' : 'Launch Feature'}</span>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isAr ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── 3. REAL RECENT ACTIVITY & HONEST EMPTY STATE ── */}
      <section
        aria-labelledby="recent-activity-heading"
        className={`hidden p-3 rounded-xl border ${
          isDarkMode ? 'bg-[#112C4F] border-[#24476F]' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rafiqi-primary dark:text-[#4B9FE1]" />
            <h2 id="recent-activity-heading" className="text-sm font-bold">
              {isAr ? 'النشاط الأخير في هذا القسم' : 'Recent Section Activity'}
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {recentItems.length > 0
              ? isAr
                ? `${recentItems.length} سجلات نشطة`
                : `${recentItems.length} recorded items`
              : isAr
              ? 'سجل نظيف'
              : 'No activity recorded'}
          </span>
        </div>

        {recentItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`p-3 rounded-xl border flex flex-col justify-between text-start ${
                  isDarkMode ? 'bg-[#17355C] border-[#24476F]' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs font-bold truncate mb-1">{item.label}</div>
                <div className="text-xs text-slate-400">{item.timestamp}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-2 px-4 space-y-2">
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {sectionId === 'see_understand' &&
                (isAr
                  ? 'لا توجد عمليات فحص بصري سابقة. ابدأ بتوجيه الكاميرا نحو أي مشهد أو مستند للبدء.'
                  : 'No visual scans yet. Point your camera at any object or printed text to get started.')}
              {sectionId === 'read_learn' &&
                (isAr
                  ? 'لا توجد كتب أو تسجيلات مفتوحة حالياً. ارفع محاضرة صوتية أو اختر كتاباً رقمياً للبدء.'
                  : 'No active documents. Upload an audio lecture or open an educational textbook to begin.')}
              {sectionId === 'work_create' &&
                (isAr
                  ? 'لا توجد مستندات جاري العمل عليها. ابدأ بإملاء مستند جديد أو فحص تنسيق ملف وورد.'
                  : 'No working documents. Start voice dictation or inspect Word book formatting now.')}
              {sectionId === 'move_explore' &&
                (isAr
                  ? 'لا توجد أماكن أو معالم مسجلة مؤخراً. استكشف دليل الأماكن الميسرة أو ابدأ استكشاف المحيط.'
                  : 'No recent places explored. Browse verified accessible amenities or start room orientation.')}
              {sectionId === 'communicate' &&
                (isAr
                  ? 'لا توجد محادثات نشطة. ابدأ جلسة تفريغ فوري أو استخدم لوحة التواصل الرمزي AAC.'
                  : 'No recent messages. Start a live caption session or open an AAC symbol board.')}
              {sectionId === 'personalize' &&
                (isAr
                  ? 'إعدادات التيسير وجواز الوصول محدثة وتعمل بكفاءة. يمكنك تخصيص نبرة الصوت والخط في أي وقت.'
                  : 'Preferences are up to date. You can fine-tune speech rate, contrast, and shortcuts anytime.')}
            </p>
            {primaryFeature && (
              <button
                type="button"
                onClick={() => onSelectFeature(primaryFeature)}
                className="px-4 py-2 bg-rafiqi-primary/15 hover:bg-rafiqi-primary/25 text-rafiqi-primary dark:text-[#4B9FE1] rounded-xl text-xs font-bold border border-rafiqi-primary/30 transition-all cursor-pointer"
              >
                {isAr ? 'بدء النشاط الأول الآن' : 'Start First Session'}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── 4. ACCESSIBLE KEYBOARD & NAVIGATION GUIDE ── */}
      {activeHelpModal && (
      <section
        data-testid="section-quick-tips"
        aria-label={isAr ? 'إرشادات الوصول السريع والتنقل' : 'Accessibility and Keyboard Tips'}
        className={`p-5 rounded-2xl border space-y-2.5 transition-all ${
          isDarkMode ? 'bg-[#112C4F] border-[#24476F]' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 text-rafiqi-primary dark:text-[#4B9FE1]">
          <Info className="w-4 h-4 shrink-0" />
          <h3 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {isAr ? 'إرشادات الوصول السريع والتنقل الميسر' : 'Accessibility & Keyboard Shortcuts'}
          </h3>
        </div>

        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {isAr
            ? 'يمكنك التنقل بين هذه الأدوات باستخدام لوحة المفاتيح عبر زر Tab والتنقل العكسي بـ Shift+Tab والضغط على Enter لتشغيل الأداة مباشرة. تدعم جميع الأدوات التوجيه الصوتي وتكبير الخط وقارئات الشاشة (NVDA / TalkBack / VoiceOver).'
            : 'Navigate between features using Tab, reverse with Shift+Tab, and press Enter to launch. All tools support screen readers (NVDA, TalkBack, VoiceOver), spoken prompts, high-contrast themes, and dynamic font scaling.'}
        </p>
      </section>
      )}
    </div>
  );
}
