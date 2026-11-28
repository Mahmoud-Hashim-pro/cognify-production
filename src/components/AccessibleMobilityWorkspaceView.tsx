/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi (رفيقي) — Phase 10: Move & Explore — Mobility and Place Assistance Workspace
 * 
 * Accessible, safety-first mobility assistant for blind and visually impaired users:
 * 1. Place Description: Environment overview, relative clock-face landmarks, uncertainty disclosures, follow-up Q&A.
 * 2. Sign & Direction Reader: Verbatim OCR text separated from inferred directions, room/floor/exit signage.
 * 3. Entrance & Door Assistance: Door locations with clock angles, qualitative distances, verified accessibility notes.
 * 4. Public Transport Assistant: Route & destination reader, uncertainty warnings, live telemetry disclosures.
 * 5. Accessible Places Directory: Filterable directory of verified accessible facilities with data provenance.
 * 6. Navigation Integration: GPS permission handling, accuracy evaluation, and external navigation app launch (Google Maps, Apple Maps, Waze, OSM).
 * 7. Indoor Navigation Boundary: Transparent infrastructure boundary disclosures without fake positioning.
 */

import HeaderMenu, { ToolSwitcherSlot } from './HeaderMenu';
import { ClampedNotice } from './ui/ClampedNotice';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Eye,
  MapPin,
  Navigation,
  Bus,
  Signpost,
  DoorOpen,
  Building,
  Volume2,
  VolumeX,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Menu,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Phone,
  Clock,
  Layers,
  ChevronRight,
  Radio,
  Search,
  Check,
} from 'lucide-react';
import { UserProfile } from '../types';
import { localize, isArabicLocale, L } from '../lib/translations';
import { speak, cancelSpeech } from '../lib/tts';
import { toast } from './Toast';
import {
  getMobilitySafetyAdvisory,
  MOBILITY_SAFETY_DISCLAIMER_AR,
  MOBILITY_SAFETY_DISCLAIMER_EN,
  analyzePlaceEnvironment,
  PlaceLandmark,
  RelativeClockPosition,
  formatClockPosition,
  parseDirectionalSign,
  ParsedSignResult,
  evaluateDoorwayAssistance,
  DoorAssistanceResult,
  parseTransitSign,
  TransitMatchResult,
  VERIFIED_ACCESSIBLE_PLACES,
  AccessiblePlaceItem,
  evaluateGpsAccuracy,
  buildNavigationProviderUrl,
  getIndoorNavigationBoundary,
} from '../lib/mobilityEngine';

export type MobilityToolId =
  | 'place_desc'
  | 'sign_reader'
  | 'entrance_door'
  | 'transit_assistant'
  | 'places_directory'
  | 'gps_nav'
  | 'indoor_boundary';

const VALID_MOBILITY_TOOLS: readonly MobilityToolId[] = ['place_desc', 'sign_reader', 'entrance_door', 'transit_assistant', 'places_directory', 'gps_nav', 'indoor_boundary'];


interface AccessibleMobilityWorkspaceViewProps {
  profile: UserProfile;
  onNavigateBack: () => void;
  onMenuClick?: () => void;
  initialTool?: MobilityToolId;
  isDarkMode?: boolean;
}

export default function AccessibleMobilityWorkspaceView({
  profile,
  onNavigateBack,
  onMenuClick,
  initialTool = 'place_desc',
  isDarkMode = true,
}: AccessibleMobilityWorkspaceViewProps) {
  const isAr = isArabicLocale(profile.language);
  const langKey = isAr ? 'ar' : 'en';

  const [activeTool, setActiveTool] = useState<MobilityToolId>(() =>
    VALID_MOBILITY_TOOLS.includes(initialTool) ? initialTool : 'place_desc'
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PLACE & SCENE DESCRIPTION STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [sceneInputText, setSceneInputText] = useState(
    isAr
      ? 'مدخل رئيسي واسع أمامي، مكتب استعلامات على اليمين، درج سلالم، ومصعد كهربائي على اليسار.'
      : L('Spacious main entrance straight ahead, information counter to the right, staircase, and elevator to the left.')
  );
  const [visibilityQuality, setVisibilityQuality] = useState<'clear' | 'glare' | 'low_light' | 'partially_obstructed'>('clear');
  const [placeAnalysis, setPlaceAnalysis] = useState(() =>
    analyzePlaceEnvironment(sceneInputText, visibilityQuality)
  );
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SIGN & DIRECTION READER STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [signInputText, setSignInputText] = useState(
    isAr ? 'قاعة 304 — قسم الحاسب الآلي' : L('Room 304 — Computer Science Dept')
  );
  const [parsedSign, setParsedSign] = useState<ParsedSignResult>(() =>
    parseDirectionalSign(signInputText)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ENTRANCE & DOOR ASSISTANCE STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [doorTypeInput, setDoorTypeInput] = useState(isAr ? 'الباب الزجاجي الرئيسي' : L('Main Glass Door'));
  const [doorClockPos, setDoorClockPos] = useState<RelativeClockPosition>('12_oclock');
  const [doorwayResult, setDoorwayResult] = useState<DoorAssistanceResult>(() =>
    evaluateDoorwayAssistance(doorTypeInput, doorClockPos, false)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PUBLIC TRANSPORT ASSISTANT STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [transitSignInput, setTransitSignInput] = useState(isAr ? 'أتوبيس 104 — التحرير' : L('Bus 104 — Tahrir'));
  const [transitConfidence, setTransitConfidence] = useState(0.8);
  const [transitResult, setTransitResult] = useState<TransitMatchResult>(() =>
    parseTransitSign(transitSignInput, transitConfidence)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. ACCESSIBLE PLACES DIRECTORY STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [directorySearch, setDirectorySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredPlaces = useMemo(() => {
    return VERIFIED_ACCESSIBLE_PLACES.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = directorySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nameAr.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.addressAr.toLowerCase().includes(q) ||
        p.addressEn.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, directorySearch]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. GEOLOCATION & NAVIGATION INTEGRATION STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [gpsErrorState, setGpsErrorState] = useState<string | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [selectedNavigationApp, setSelectedNavigationApp] = useState<'google_maps' | 'apple_maps' | 'waze' | 'osm'>('google_maps');

  // ─────────────────────────────────────────────────────────────────────────────
  // SPEECH & TTS HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const speakText = useCallback(
    (text: string) => {
      cancelSpeech();
      setIsSpeaking(true);
      speak(text, isAr ? 'ar-SA' : 'en-US', {
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [isAr]
  );

  const stopSpeaking = useCallback(() => {
    cancelSpeech();
    setIsSpeaking(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // GPS HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      const err = isAr
        ? 'خاصية تحديد الموقع الجغرافي (GPS) غير مدعومة في هذا المتصفح.'
        : L('Geolocation API is not supported in this browser.');
      setGpsErrorState(err);
      toast.error(err);
      speakText(err);
      return;
    }

    setIsLocatingGps(true);
    setGpsErrorState(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsAccuracyMeters(pos.coords.accuracy);

        const evalResult = evaluateGpsAccuracy(pos.coords.accuracy);
        toast.success(localize(profile.language, 'Location acquired', 'تم تحديد الموقع'));
        speakText(isAr ? evalResult.warningAr : L(evalResult.warningEn));
      },
      (err) => {
        setIsLocatingGps(false);
        let messageAr = 'تعذر الحصول على الموقع الجغرافي.';
        let messageEn = 'Unable to acquire geographic location.';
        if (err.code === err.PERMISSION_DENIED) {
          messageAr = 'تم رفض إذن الوصول للموقع الجغرافي. يمكنك منح الإذن من إعدادات المتصفح للاستفادة من الملاحة.';
          messageEn = 'Location access permission was denied. You can grant access in browser settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          messageAr = 'إشارة GPS غير متوفرة حالياً في موقعك.';
          messageEn = 'GPS signal currently unavailable at your location.';
        } else if (err.code === err.TIMEOUT) {
          messageAr = 'انتهت مهلة انتظار استجابة إشارة الأقمار الصناعية.';
          messageEn = 'GPS satellite response request timed out.';
        }
        setGpsErrorState(isAr ? messageAr : messageEn);
        toast.error(isAr ? messageAr : messageEn);
        speakText(isAr ? messageAr : messageEn);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE FOLLOW-UP QUESTION HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSceneFollowUp = (q: string) => {
    if (!q.trim()) return;
    const cleanQ = q.toLowerCase();

    let ansAr = '';
    let ansEn = '';

    if (cleanQ.includes('استقبال') || cleanQ.includes('counter') || cleanQ.includes('reception')) {
      ansAr = 'مكتب الاستقبال يقع في اتجاه الساعة 2 في الأمام جهة اليمين، وهو قريب منك نسبياً.';
      ansEn = 'The information counter is at approximately 2 o\'clock (front right), in the near ground.';
    } else if (cleanQ.includes('درج') || cleanQ.includes('سلم') || cleanQ.includes('stairs')) {
      ansAr = 'يوجد درج سلالم في اتجاه الساعة 3 إلى يمينك مباشرة. يرجى توخي الحذر واستكشاف أول درجة بالعصا البيضاء.';
      ansEn = 'Staircase is located at 3 o\'clock directly to your right. Please verify the edge carefully with your cane.';
    } else if (cleanQ.includes('مصعد') || cleanQ.includes('elevator') || cleanQ.includes('lift')) {
      ansAr = 'المصعد الكهربائي يقع في اتجاه الساعة 10 في الأمام جهة اليسار.';
      ansEn = 'The elevator is located at approximately 10 o\'clock (front left).';
    } else if (cleanQ.includes('باب') || cleanQ.includes('مدخل') || cleanQ.includes('door') || cleanQ.includes('entrance')) {
      ansAr = 'المدخل الرئيسي يقع أمامك مباشرة في اتجاه الساعة 12 في المسافة المتوسطة.';
      ansEn = 'The main entrance is straight ahead at 12 o\'clock in the mid-ground.';
    } else {
      ansAr = `بناءً على المشهد المرصود: تظهر معالم المكان (مدخل، مكتب، درج، مصعد). تفاصيل سؤالك (${q}) لم يتم رصدها بوضوح في الإطار الحالي.`;
      ansEn = `Based on current view: landmarks include entrance, counter, stairs, and lift. Specific details for (${q}) are not clearly identified.`;
    }

    setFollowUpAnswer(isAr ? ansAr : ansEn);
    speakText(isAr ? ansAr : ansEn);
  };

  // Tools definition
  const tools: Array<{ id: MobilityToolId; titleAr: string; titleEn: string; icon: any }> = [
    { id: 'place_desc', titleAr: 'وصف المكان والمعالم', titleEn: 'Place & Landmarks', icon: Compass },
    { id: 'sign_reader', titleAr: 'قارئ اللافتات واللوحات', titleEn: 'Sign Reader', icon: Signpost },
    { id: 'entrance_door', titleAr: 'مرشد المداخل والأبواب', titleEn: 'Entrances & Doors', icon: DoorOpen },
    { id: 'transit_assistant', titleAr: 'مساعد النقل والمواصلات', titleEn: 'Transit Assistant', icon: Bus },
    { id: 'places_directory', titleAr: 'دليل الأماكن المهيأة', titleEn: 'Places Directory', icon: Building },
    { id: 'gps_nav', titleAr: 'الملاحة وتكامل الخرائط', titleEn: 'Navigation GPS', icon: Navigation },
    { id: 'indoor_boundary', titleAr: 'الملاحة الداخلية ونقاط الاستدلال', titleEn: 'Indoor Boundary', icon: Layers },
  ];

  const safetyAdvisory = getMobilitySafetyAdvisory();
  const indoorBoundary = getIndoorNavigationBoundary();

  return (
    <div
      className={`w-full min-w-0 max-w-full overflow-x-hidden min-h-screen flex flex-col ${
        isDarkMode ? 'bg-[#0A2342] text-[#F8FAFC]' : 'tool-light bg-[#F5F9FD] text-[#0A2342]'
      } font-sans selection:bg-[#1769AA]/30`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Screen reader live announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isSpeaking ? (isAr ? 'جاري القراءة الصوتية للإرشادات...' : L('Speaking orientation guidance...')) : ''}
        {followUpAnswer || ''}
      </div>

      {/* ── HEADER ── */}
      <header
        role="banner"
        className="sticky top-0 z-30 flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 bg-[#112C4F]/95 backdrop-blur-md border-b border-[#24476F] shadow-md"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onNavigateBack}
            aria-label={localize(profile.language, 'Back to Move & Explore Section', 'الرجوع لقسم الحركة والاستكشاف')}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#17355C] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#24476F] transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
          >
            <ArrowLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label={localize(profile.language, 'Open Main Menu', 'فتح القائمة الرئيسية')}
              className="hidden min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#17355C] hover:bg-[#1769AA]/20 text-[#4B9FE1] border border-[#24476F] transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA]"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0">
            <div className="hidden items-center gap-2">
              <span className="text-xs font-bold text-[#4B9FE1] uppercase tracking-wider">
                {localize(profile.language, 'Section 4: Move & Explore', 'القسم 4: الحركة والاستكشاف')}
              </span>
              <span className="text-[#24476F]">•</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <ShieldAlert className="w-3 h-3" />
                {localize(profile.language, 'Safety Critical Zone', 'منطقة حساسة للأمان')}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-[#F8FAFC] truncate">
              <span>{localize(profile.language, 'Mobility & Places', 'الحركة والأماكن')}</span>
              <span className="hidden">
                {localize(
                  profile.language,
                  'Mobility, Places & Public Transport Assistant',
                  'مساعد الحركة واستكشاف الأماكن والنقل الميسر'
                )}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ToolSwitcherSlot />
          <HeaderMenu
            ariaLabel={localize(profile.language, 'More actions', 'المزيد')}
            isDarkMode={isDarkMode}
            items={[
              {
                key: 'safety',
                label: localize(profile.language, 'Safety Rules', 'تعليمات الأمان'),
                ariaLabel: localize(profile.language, 'View Safety Advisory', 'عرض تعليمات الأمان والسلامة'),
                icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
                onSelect: () => setShowSafetyModal(true),
              },
              isSpeaking
                ? {
                    key: 'stop',
                    label: localize(profile.language, 'Stop Audio', 'إيقاف'),
                    ariaLabel: localize(profile.language, 'Stop Voice Reading', 'إيقاف النطق الصوتي'),
                    icon: <VolumeX className="w-4 h-4" />,
                    danger: true,
                    onSelect: stopSpeaking,
                  }
                : {
                    key: 'read',
                    label: localize(profile.language, 'Read Aloud', 'قراءة صوتية'),
                    ariaLabel: localize(profile.language, 'Read content aloud', 'قراءة المحتوى بصوت واضح'),
                    icon: <Volume2 className="w-4 h-4" />,
                    onSelect: () => {
                const textToRead =
                  activeTool === 'place_desc'
                    ? placeAnalysis.spokenSummaryAr
                    : activeTool === 'sign_reader'
                    ? parsedSign.inferredDirectionGuidanceAr
                    : activeTool === 'entrance_door'
                    ? doorwayResult.spokenWarningAr
                    : activeTool === 'transit_assistant'
                    ? transitResult.spokenTextAr
                    : activeTool === 'places_directory'
                    ? `دليل الأماكن المهيأة يحتوي على ${filteredPlaces.length} موقع موثق.`
                    : activeTool === 'gps_nav'
                    ? (userCoords ? `إحداثياتك الحالية محددة بدقة ${gpsAccuracyMeters} متراً.` : 'يرجى تفعيل زر تحديد الموقع.')
                    : indoorBoundary.disclaimerAr;
                speakText(textToRead);
                    },
                  },
            ]}
          />
        </div>
      </header>

      {/* ── PROMINENT SAFETY BANNER (MANDATORY INVARIANT) ── */}
      <aside
        role="alert"
        aria-label={localize(profile.language, 'Orientation & Mobility Safety Advisory', 'إشعار السلامة والأمان الحركي')}
        className="bg-amber-500/10 border-b border-amber-500/30 px-4 sm:px-6 py-2.5 text-xs text-amber-200"
      >
        <div className="max-w-7xl mx-auto flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <ClampedNotice isAr={isAr}>
            <p className="leading-relaxed font-semibold">
              {isAr ? MOBILITY_SAFETY_DISCLAIMER_AR : MOBILITY_SAFETY_DISCLAIMER_EN}
            </p>
          </ClampedNotice>
        </div>
      </aside>

      {/* ── SUB-NAV: 7 ACCESSIBLE MOBILITY TABS ── */}
      <nav
        aria-label={localize(profile.language, 'Mobility Assistant Tools', 'أدوات مساعد الحركة والاستكشاف')}
        className="bg-[#0D2542] border-b border-[#24476F] px-3 sm:px-6 py-2"
      >
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar">
          {tools.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTool(t.id);
                  speakText(isAr ? t.titleAr : L(t.titleEn));
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`shrink-0 whitespace-nowrap min-h-[44px] px-3 py-2.5 justify-center rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1769AA] ${
                  isActive
                    ? 'bg-[#1769AA] text-white shadow-md'
                    : 'bg-[#112C4F] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#17355C] border border-[#24476F]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#4B9FE1]'}`} />
                <span>{localize(profile.language, t.titleEn, t.titleAr)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-5 pb-24 space-y-4">
        {/* ═════════════════════════════════════════════════════════════════════
            1. PLACE & SCENE DESCRIPTION TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'place_desc' && (
          <section
            aria-label={localize(profile.language, 'Place and Landmark Description', 'وصف المكان والمعالم المحيطة')}
            className="space-y-4"
          >
            <div className="bg-[#112C4F] border border-[#24476F] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Compass className="w-5 h-5 text-[#1769AA]" />
                    <span>{localize(profile.language, 'Visible Environment & Landmarks', 'وصف البيئة المحيطة والمعالم البارزة')}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {localize(
                      profile.language,
                      'Identifies entrances, counters, stairs, and doors using qualitative clock-face orientation.',
                      'رصد المداخل والأبواب ومكاتب الاستقبال بنظام اتجاهات الساعة النوعي دون افتعال مسافات رقمية.'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={visibilityQuality}
                    onChange={(e) => {
                      const v = e.target.value as any;
                      setVisibilityQuality(v);
                      setPlaceAnalysis(analyzePlaceEnvironment(sceneInputText, v));
                    }}
                    className="min-h-[44px] px-3 py-2 bg-[#0A2342] border border-[#24476F] rounded-xl text-xs text-[#F8FAFC]"
                  >
                    <option value="clear">{isAr ? 'رؤية واضحة' : L('Clear View')}</option>
                    <option value="glare">{isAr ? 'وهج / انعكاس ضوء' : L('Direct Glare')}</option>
                    <option value="low_light">{isAr ? 'إضاءة خافتة' : L('Low Light')}</option>
                    <option value="partially_obstructed">{isAr ? 'حجب جزئي للرؤية' : L('Partially Obstructed')}</option>
                  </select>
                </div>
              </div>

              {/* Spoken Overview Summary Card */}
              <div
                role="region"
                aria-label={localize(profile.language, 'Scene summary', 'ملخص المشهد')}
                className="p-4 rounded-xl bg-[#0A2342] border border-[#24476F] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4B9FE1] uppercase">
                    {localize(profile.language, 'Auditory Orientation Summary', 'الملخص التوجيهي للمشهد')}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(placeAnalysis.spokenSummaryAr)}
                    className="text-xs text-[#4B9FE1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{localize(profile.language, 'Listen', 'استماع')}</span>
                  </button>
                </div>
                <p className="text-sm text-[#F8FAFC] leading-relaxed">
                  {isAr ? placeAnalysis.overviewAr : L(placeAnalysis.overviewEn)}
                </p>
                {placeAnalysis.uncertaintyNotesAr && (
                  <p className="text-xs text-amber-400 font-bold">
                    {isAr ? placeAnalysis.uncertaintyNotesAr : L(placeAnalysis.uncertaintyNotesEn)}
                  </p>
                )}
              </div>

              {/* Detected Landmarks Grid */}
              <div className="space-y-3 pt-2 border-t border-[#24476F]">
                <h3 className="text-xs font-bold text-[#94A3B8] uppercase">
                  {localize(profile.language, 'Identified Orientation Landmarks', 'المعالم التي تم رصدها واتجاهاتها')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {placeAnalysis.landmarks.map((lm) => (
                    <article
                      key={lm.id}
                      className="p-4 rounded-xl bg-[#0A2342] border border-[#24476F] space-y-2 hover:border-[#1769AA]/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#F8FAFC]">
                          {isAr ? lm.labelAr : L(lm.labelEn)}
                        </span>
                        <span className="text-xs font-bold text-[#4B9FE1] bg-[#1769AA]/15 px-2.5 py-0.5 rounded-full border border-[#1769AA]/30">
                          {isAr ? lm.positionTextAr : L(lm.positionTextEn)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                        <span>{localize(profile.language, 'Distance:', 'المسافة النوعية:')}</span>
                        <span className="text-[#CBD5E1] font-semibold">
                          {lm.distanceTier === 'near'
                            ? (isAr ? 'قريب منك' : L('Near'))
                            : (isAr ? 'في المسافة المتوسطة' : L('Mid-ground'))}
                        </span>
                      </div>
                      {lm.accessibilityNotesAr && (
                        <p className="text-xs text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                          {isAr ? lm.accessibilityNotesAr : L(lm.accessibilityNotesEn)}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>

              {/* Conversational Follow-up Q&A */}
              <div className="p-4 rounded-xl bg-[#17355C]/60 border border-[#24476F] space-y-3 pt-4">
                <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#4B9FE1]" />
                  <span>{localize(profile.language, 'Ask a follow-up question about this place:', 'اسأل سؤالاً توضيحياً عن هذا المكان:')}</span>
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={followUpQuestion}
                    onChange={(e) => setFollowUpQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSceneFollowUp(followUpQuestion);
                    }}
                    placeholder={
                      isAr
                        ? 'مثال: "أين مكتب الاستقبال؟" أو "هل يوجد درج على يميني؟"'
                        : L('e.g. "Where is the counter?" or "Are there stairs near me?"')
                    }
                    className="flex-1 min-h-[44px] px-4 py-2 bg-[#0A2342] border border-[#24476F] rounded-xl text-xs text-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSceneFollowUp(followUpQuestion)}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold cursor-pointer"
                  >
                    {localize(profile.language, 'Ask Assistant', 'إرسال السؤال')}
                  </button>
                </div>

                {followUpAnswer && (
                  <div role="status" className="p-3 rounded-lg bg-[#0A2342] border border-[#24476F] text-xs text-[#CBD5E1] space-y-1">
                    <span className="font-bold text-emerald-400 block">
                      {localize(profile.language, 'Assistant Answer:', 'إجابة المساعد:')}
                    </span>
                    <p className="leading-relaxed">{followUpAnswer}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            2. SIGN & DIRECTION READER TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'sign_reader' && (
          <section
            aria-label={localize(profile.language, 'Signs and Direction Reader', 'قارئ اللافتات واللوحات')}
            className="space-y-4"
          >
            <div className="bg-[#112C4F] border border-[#24476F] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Signpost className="w-5 h-5 text-[#1769AA]" />
                    <span>{localize(profile.language, 'Sign & Direction Optical Reader', 'قارئ اللافتات واللوحات الإرشادية')}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {localize(
                      profile.language,
                      'Strictly separates verbatim OCR text from inferred directional advice.',
                      'يفصل النص الحرفي المكتوب على اللافتة بدقة عن أي تفسيرات أو إرشادات اتجاهية مستنتجة.'
                    )}
                  </p>
                </div>
              </div>

              {/* Sign Input Box */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#24476F]">
                <input
                  type="text"
                  value={signInputText}
                  onChange={(e) => setSignInputText(e.target.value)}
                  placeholder={
                    isAr
                      ? 'أدخل النص المقروء من اللافتة (مثال: "قاعة 304" أو "مخرج طوارئ ←" أو "الدور الثاني")'
                      : L('Enter sign text (e.g. "Room 304", "Emergency Exit ->", or "Floor 2")')
                  }
                  className="flex-1 min-h-[44px] px-4 py-2.5 bg-[#0A2342] border border-[#24476F] rounded-xl text-sm text-[#F8FAFC]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const res = parseDirectionalSign(signInputText);
                    setParsedSign(res);
                    toast.success(localize(profile.language, 'Sign parsed', 'تم فحص اللافتة'));
                    speakText(isAr ? res.inferredDirectionGuidanceAr : L(res.inferredDirectionGuidanceEn));
                  }}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold cursor-pointer"
                >
                  {localize(profile.language, 'Analyze Sign', 'تحليل اللافتة')}
                </button>
              </div>

              {/* Analysis Result Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* 1. Verbatim Detected Text Card */}
                <div className="p-4 rounded-xl bg-[#0A2342] border border-[#24476F] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      {localize(profile.language, 'Verbatim Detected Text (OCR)', 'النص المكتوب على اللافتة حرفياً')}
                    </span>
                    <span className="text-xs font-bold text-[#94A3B8] bg-[#17355C] px-2 py-0.5 rounded">
                      {parsedSign.signType}
                    </span>
                  </div>
                  <p className="text-xl font-black text-[#F8FAFC] tracking-tight p-3 bg-[#112C4F] rounded-lg border border-[#24476F]">
                    {parsedSign.rawDetectedText}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {localize(
                      profile.language,
                      'This is the exact string identified on the physical sign.',
                      'هذا هو النص المطابق لما هو مكتوب فعلياً على اللافتة دون أي تأويل.'
                    )}
                  </p>
                </div>

                {/* 2. Inferred Direction Guidance Card */}
                <div className="p-4 rounded-xl bg-[#0A2342] border border-[#24476F] space-y-2">
                  <span className="text-xs font-bold text-[#4B9FE1] uppercase tracking-wide">
                    {localize(profile.language, 'Directional Guidance & Caveats', 'الإرشادات والتنبيهات الاتجاهية المستنتجة')}
                  </span>
                  <div className="p-3 bg-[#112C4F] rounded-lg border border-[#24476F] text-xs text-[#CBD5E1] leading-relaxed">
                    {isAr ? parsedSign.inferredDirectionGuidanceAr : L(parsedSign.inferredDirectionGuidanceEn)}
                  </div>
                  <p className="text-xs text-amber-300/90 font-medium">
                    {localize(
                      profile.language,
                      'Notice: Inferred directions are AI interpretations; verify with tactile navigation markers.',
                      'تنبيه: التوجيه المستنتج هو قراءة تحليلية مساعدة؛ يرجى فحص المسار بالعصا دائماً.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            3. ENTRANCE & DOOR ASSISTANCE TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'entrance_door' && (
          <section
            aria-label={localize(profile.language, 'Entrance and Door Assistance', 'مرشد المداخل والأبواب')}
            className="space-y-4"
          >
            <div className="bg-[#112C4F] border border-[#24476F] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-[#1769AA]" />
                    <span>{localize(profile.language, 'Entrance & Doorway Assistant', 'مرشد المداخل والأبواب الميسر')}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {localize(
                      profile.language,
                      'Relative direction without false claims of safety or unverified metric depth.',
                      'تحديد موقع المداخل بالساعة النوعية دون ادعاء أمان مسبق أو تخمين مسافات بالأمتار.'
                    )}
                  </p>
                </div>
              </div>

              {/* Door Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#24476F]">
                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                    {localize(profile.language, 'Observed Door / Entrance Type', 'نوع الباب / المدخل المرصود')}
                  </label>
                  <input
                    type="text"
                    value={doorTypeInput}
                    onChange={(e) => setDoorTypeInput(e.target.value)}
                    aria-label={localize(profile.language, 'Observed Door / Entrance Type', 'نوع الباب / المدخل المرصود')}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0A2342] border border-[#24476F] text-xs text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                    {localize(profile.language, 'Clock-Face Relative Direction', 'الاتجاه النسبي بالساعة')}
                  </label>
                  <select
                    value={doorClockPos}
                    onChange={(e) => {
                      const pos = e.target.value as RelativeClockPosition;
                      setDoorClockPos(pos);
                      setDoorwayResult(evaluateDoorwayAssistance(doorTypeInput, pos, false));
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0A2342] border border-[#24476F] text-xs text-[#F8FAFC]"
                  >
                    <option value="12_oclock">{formatClockPosition('12_oclock', langKey)}</option>
                    <option value="1_oclock">{formatClockPosition('1_oclock', langKey)}</option>
                    <option value="2_oclock">{formatClockPosition('2_oclock', langKey)}</option>
                    <option value="3_oclock">{formatClockPosition('3_oclock', langKey)}</option>
                    <option value="9_oclock">{formatClockPosition('9_oclock', langKey)}</option>
                    <option value="10_oclock">{formatClockPosition('10_oclock', langKey)}</option>
                    <option value="11_oclock">{formatClockPosition('11_oclock', langKey)}</option>
                  </select>
                </div>
              </div>

              {/* Door Result Card */}
              <div className="p-5 rounded-2xl bg-[#0A2342] border-2 border-[#1769AA]/50 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg text-[#F8FAFC]">{doorwayResult.labelAr}</h3>
                  <span className="text-xs font-bold text-[#4B9FE1] bg-[#1769AA]/20 px-3 py-1 rounded-full border border-[#1769AA]/40">
                    {isAr ? doorwayResult.relativeOrientationAr : L(doorwayResult.relativeOrientationEn)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#112C4F] border border-[#24476F] text-xs text-[#CBD5E1] space-y-1">
                  <span className="font-bold text-amber-400 block">
                    {localize(profile.language, 'Accessibility Feature Verification:', 'حالة فحص ميزات الإتاحة:')}
                  </span>
                  <p className="leading-relaxed">
                    {isAr ? doorwayResult.accessibilityStateAr : L(doorwayResult.accessibilityStateEn)}
                  </p>
                </div>

                <p className="text-xs text-amber-200 font-bold bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                  {isAr ? doorwayResult.spokenWarningAr : L(doorwayResult.spokenWarningEn)}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            4. PUBLIC TRANSPORT ASSISTANT TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'transit_assistant' && (
          <section
            aria-label={localize(profile.language, 'Public Transport Assistant', 'مساعد وسائل النقل والمواصلات')}
            className="space-y-4"
          >
            <div className="bg-[#112C4F] border border-[#24476F] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Bus className="w-5 h-5 text-[#1769AA]" />
                    <span>{localize(profile.language, 'Bus & Transit Sign Reader', 'قارئ خطوط الحافلات ووسائل النقل')}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {localize(
                      profile.language,
                      'Reads bus numbers and destination boards with honest uncertainty disclosures.',
                      'قراءة أرقام خطوط الحافلات والوجهات مع إعلان صريح لعدم التيقن ومنع تلفيق مواعيد الوصول.'
                    )}
                  </p>
                </div>
              </div>

              {/* Transit Input Form */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-[#24476F]">
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    value={transitSignInput}
                    onChange={(e) => setTransitSignInput(e.target.value)}
                    placeholder={
                      isAr
                        ? 'أدخل لافتة الحافلة (مثال: "أتوبيس 104 — التحرير" أو "خط 25")'
                        : L('Enter bus sign (e.g. "Bus 104 — Tahrir" or "Route 25")')
                    }
                    className="w-full min-h-[44px] px-4 py-2 bg-[#0A2342] border border-[#24476F] rounded-xl text-xs text-[#F8FAFC]"
                  />
                </div>
                <div className="sm:col-span-4 flex gap-2">
                  <select
                    value={transitConfidence}
                    onChange={(e) => {
                      const c = Number(e.target.value);
                      setTransitConfidence(c);
                      setTransitResult(parseTransitSign(transitSignInput, c));
                    }}
                    className="flex-1 min-h-[44px] px-2 py-2 bg-[#0A2342] border border-[#24476F] rounded-xl text-xs text-[#F8FAFC]"
                  >
                    <option value={0.95}>{isAr ? 'وضوح عالي (95%)' : L('High Clarity (95%)')}</option>
                    <option value={0.7}>{isAr ? 'وضوح متوسط/ضبابي (70%)' : L('Blurry/Uncertain (70%)')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const res = parseTransitSign(transitSignInput, transitConfidence);
                      setTransitResult(res);
                      speakText(isAr ? res.spokenTextAr : L(res.spokenTextEn));
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold cursor-pointer"
                  >
                    {localize(profile.language, 'Parse', 'فحص')}
                  </button>
                </div>
              </div>

              {/* Recognition Result Card */}
              <div className="p-5 rounded-2xl bg-[#0A2342] border-2 border-[#1769AA]/50 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#F8FAFC]">
                      {transitResult.routeNumber
                        ? `${isAr ? 'خط رقم' : L('Route')}: ${transitResult.routeNumber}`
                        : localize(profile.language, 'Route unverified', 'الرقم غير محدد')}
                    </span>
                    {transitResult.destinationDetected && (
                      <span className="text-xs text-[#4B9FE1]">
                        — {transitResult.destinationDetected}
                      </span>
                    )}
                  </div>
                  {transitResult.isUncertain ? (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {localize(profile.language, 'Uncertain Match', 'مطابقة غير مؤكدة')}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {localize(profile.language, 'Clear Sign', 'لافتة واضحة')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#CBD5E1] leading-relaxed bg-[#112C4F] p-3.5 rounded-xl border border-[#24476F]">
                  {isAr ? transitResult.guidanceTextAr : L(transitResult.guidanceTextEn)}
                </p>

                {/* Telemetry disclosure */}
                <div className="p-3 rounded-xl bg-[#17355C] border border-[#24476F] text-xs text-[#94A3B8]">
                  <p>{isAr ? transitResult.telemetryNoticeAr : L(transitResult.telemetryNoticeEn)}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            5. ACCESSIBLE PLACES DIRECTORY TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'places_directory' && (
          <section
            aria-label={localize(profile.language, 'Accessible Places Directory', 'دليل الأماكن والخدمات المهيأة')}
            className="space-y-4"
          >
            <div className="bg-[#112C4F] border border-[#24476F] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Building className="w-5 h-5 text-[#1769AA]" />
                    <span>{localize(profile.language, 'Verified Accessible Places Directory', 'دليل الأماكن والمنشآت المهيأة المعتمدة')}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {localize(
                      profile.language,
                      'Honest directory with verified accessibility notes and clear source provenance.',
                      'دليل موثق بمواصفات الإتاحة الواقعية دون أماكن وهمية ومع إقرار مصدر البيانات.'
                    )}
                  </p>
                </div>
              </div>

              {/* Search & Category Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#24476F]">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-[#64748B] absolute top-3.5 start-3" />
                  <input
                    type="text"
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    placeholder={localize(profile.language, 'Search verified places...', 'بحث في الأماكن والمنشآت الموثقة...')}
                    className="w-full min-h-[44px] ps-9 pe-4 py-2 bg-[#0A2342] border border-[#24476F] rounded-xl text-xs text-[#F8FAFC]"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="min-h-[44px] px-3 py-2 bg-[#0A2342] border border-[#24476F] rounded-xl text-xs text-[#F8FAFC]"
                >
                  <option value="all">{isAr ? 'كافة الفئات' : L('All Categories')}</option>
                  <option value="university">{isAr ? 'جامعات وتعليم' : L('University')}</option>
                  <option value="transit">{isAr ? 'محطات ومواصلات' : L('Transit')}</option>
                  <option value="library">{isAr ? 'مكتبات وبرايل' : L('Libraries')}</option>
                  <option value="medical">{isAr ? 'مستشفيات ورعاية' : L('Medical')}</option>
                </select>
              </div>

              {/* Places List */}
              <div className="space-y-4 pt-2">
                {filteredPlaces.map((place) => (
                  <article
                    key={place.id}
                    className="p-5 rounded-2xl bg-[#0A2342] border border-[#24476F] hover:border-[#1769AA]/60 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="font-bold text-base text-[#F8FAFC]">
                        {isAr ? place.nameAr : L(place.nameEn)}
                      </h3>
                      <span className="text-xs font-bold uppercase text-[#4B9FE1] bg-[#17355C] px-2.5 py-1 rounded-full border border-[#24476F] self-start sm:self-auto">
                        {place.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                      <MapPin className="w-3.5 h-3.5 text-[#1769AA] shrink-0" />
                      <span>{isAr ? place.addressAr : L(place.addressEn)}</span>
                    </div>

                    {/* Features checklist */}
                    <div className="p-3 rounded-xl bg-[#112C4F] border border-[#24476F] space-y-1.5">
                      <span className="text-xs font-bold text-emerald-400 block">
                        {localize(profile.language, 'Documented Accessibility Features:', 'مواصفات التيسير والإتاحة الموثقة:')}
                      </span>
                      <ul className="space-y-1 text-xs text-[#CBD5E1]">
                        {(isAr ? place.accessibilityFeaturesAr : place.accessibilityFeaturesEn).map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Provenance & Action Footer */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs text-[#64748B] border-t border-[#24476F]">
                      <div>
                        <span>{localize(profile.language, 'Source: ', 'المصدر: ')}</span>
                        <span className="text-[#94A3B8] font-semibold">{place.verifiedSource}</span>
                        <span className="mx-2">•</span>
                        <span>{place.lastUpdated}</span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <a
                          href={buildNavigationProviderUrl(
                            { lat: place.coordinates.lat, lng: place.coordinates.lng, title: place.nameEn },
                            selectedNavigationApp
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold text-xs flex items-center gap-1.5"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>{localize(profile.language, 'Navigate via Maps', 'توجيه في الخرائط')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            6. NAVIGATION & EXTERNAL GPS TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'gps_nav' && (
          <section
            aria-label={localize(profile.language, 'Navigation and GPS Integration', 'الملاحة وتكامل الخرائط')}
            className="space-y-4"
          >
            <div className="bg-[#112C4F] border border-[#24476F] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-[#1769AA]" />
                    <span>{localize(profile.language, 'Accessible GPS & Navigation Providers', 'الملاحة عبر الأقمار الصناعية ومزودي الخرائط')}</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {localize(
                      profile.language,
                      'Integrates with proven navigation apps (Google Maps, Apple Maps, Waze, OSM) with permission guards.',
                      'التكامل مع تطبيقات الملاحة المعتمدة مع طلب الإذن الصريح وتوضيح دقة الموقع.'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={isLocatingGps}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <MapPin className="w-4 h-4" />
                  <span>
                    {isLocatingGps
                      ? localize(profile.language, 'Acquiring GPS...', 'جارٍ الاتصال بالأقمار الصناعية...')
                      : localize(profile.language, 'Get Current Location', 'تحديد موقعي الحالي')}
                  </span>
                </button>
              </div>

              {/* GPS Telemetry Result */}
              {userCoords && gpsAccuracyMeters !== null && (
                <div className="p-4 rounded-xl bg-[#0A2342] border border-[#24476F] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      {localize(profile.language, 'GPS Telemetry Active', 'إشارة الموقع نشطة')}
                    </span>
                    <span className="text-xs font-mono text-[#94A3B8]">
                      ±{Math.round(gpsAccuracyMeters)} {localize(profile.language, 'meters accuracy', 'متراً دقة')}
                    </span>
                  </div>

                  <p className="text-xs text-[#CBD5E1]">
                    {isAr
                      ? evaluateGpsAccuracy(gpsAccuracyMeters).warningAr
                      : evaluateGpsAccuracy(gpsAccuracyMeters).warningEn}
                  </p>
                </div>
              )}

              {gpsErrorState && (
                <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  <p className="font-bold">{gpsErrorState}</p>
                </div>
              )}

              {/* Provider Selection & Launch */}
              <div className="p-5 rounded-xl bg-[#0A2342] border border-[#24476F] space-y-4">
                <h3 className="text-xs font-bold text-[#F8FAFC]">
                  {localize(profile.language, 'Select Preferred Navigation Provider:', 'اختر تطبيق الملاحة المفضل:')}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'google_maps', label: 'Google Maps' },
                    { id: 'apple_maps', label: 'Apple Maps' },
                    { id: 'waze', label: 'Waze' },
                    { id: 'osm', label: 'OpenStreetMap' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedNavigationApp(p.id as any)}
                      className={`min-h-[44px] p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedNavigationApp === p.id
                          ? 'bg-[#1769AA] text-white border-[#1769AA]'
                          : 'bg-[#112C4F] text-[#94A3B8] border-[#24476F] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-[#64748B] leading-relaxed">
                  {localize(
                    profile.language,
                    'Rafiqi passes your chosen destination to your device\'s tested navigation client for full turn-by-turn voice guidance.',
                    'يقوم رفيقي بفتح الوجهة المحددة مباشرة في تطبيق الملاحة المعتمد بهاتفك لضمان الحصول على إرشادات منعطف بمنعطف مجربة.'
                  )}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            7. INDOOR NAVIGATION BOUNDARY TAB
           ═════════════════════════════════════════════════════════════════════ */}
        {activeTool === 'indoor_boundary' && (
          <section
            aria-label={localize(profile.language, 'Indoor Navigation Technical Boundary', 'حدود الملاحة الداخلية')}
            className="space-y-4"
          >
            <div className="bg-[#112C4F] border border-[#24476F] rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#1769AA]/20 text-[#4B9FE1]">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC]">
                    {localize(profile.language, 'Indoor Positioning Architecture & Boundary', 'بنية وحدود الملاحة الداخلية')}
                  </h2>
                  <span className="text-xs text-amber-400 font-semibold">
                    {localize(profile.language, 'Future Infrastructure Integration Boundary', 'حدود تكامل البنية التحتية المستقبلية')}
                  </span>
                </div>
              </div>

              {/* Transparent Disclosure */}
              <div className="p-4 rounded-xl bg-[#0A2342] border border-[#24476F] space-y-3 text-xs text-[#CBD5E1]">
                <p className="leading-relaxed font-semibold text-amber-200">
                  {isAr ? indoorBoundary.disclaimerAr : L(indoorBoundary.disclaimerEn)}
                </p>

                <div className="space-y-2 pt-2 border-t border-[#24476F]">
                  <span className="font-bold text-[#F8FAFC] block">
                    {localize(profile.language, 'Required Physical Infrastructure Standards:', 'معايير البنية التحتية الفيزيائية المطلوبة:')}
                  </span>
                  <ul className="space-y-1">
                    {indoorBoundary.technologySupported.map((tech, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-[#1769AA] font-bold">•</span>
                        <span>{tech}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#17355C] border border-[#24476F] text-xs text-[#94A3B8] leading-relaxed">
                {localize(
                  profile.language,
                  'Currently operational in Rafiqi: Optical landmark reading, room sign recognition, and qualitative entrance orientation. No simulated or fictional indoor coordinates are presented.',
                  'يعتمد رفيقي حالياً على: قراءة اللافتات والمعالم البصرية، وتحديد اتجاهات المداخل بالساعة الإرشادية. لا يتم عرض أي إحداثيات داخلية مصطنعة حمايةً لأمانك.'
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── SAFETY MODAL ── */}
      <AnimatePresence>
        {showSafetyModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={safetyAdvisory.titleAr}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#112C4F] border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-start"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#F8FAFC]">
                    {isAr ? safetyAdvisory.titleAr : L(safetyAdvisory.titleEn)}
                  </h3>
                  <span className="text-xs text-amber-400 font-bold">
                    {localize(profile.language, 'Strict Orientation & Mobility Guidelines', 'إرشادات الحركة والتوجه الإلزامية')}
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-[#CBD5E1] leading-relaxed">
                {(isAr ? safetyAdvisory.pointsAr : safetyAdvisory.pointsEn).map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-amber-400 font-bold text-sm leading-none mt-0.5">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              <div className="p-3.5 rounded-xl bg-[#0A2342] border border-amber-500/30 text-xs font-semibold text-amber-200 leading-relaxed">
                {isAr ? safetyAdvisory.fullAdvisoryAr : L(safetyAdvisory.fullAdvisoryEn)}
              </div>

              <div className="flex justify-end pt-2 border-t border-[#24476F]">
                <button
                  type="button"
                  onClick={() => setShowSafetyModal(false)}
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                >
                  {localize(profile.language, 'I Understand & Agree', 'فهمت وأوافق على التعليمات')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
