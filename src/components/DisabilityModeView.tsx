import { localize } from '../lib/translations';
import React, { useState, useEffect } from 'react';
import { UserProfile, AccessibilityMode, Message, LanguagePreference } from '../types';
import { 
  Settings, Eye, Accessibility, Menu, Sparkles, User, Ear, Mic, Brain, 
  ArrowLeft, ArrowRight, MessageSquare, Activity, Globe, Check, 
  LayoutGrid, Building2, Zap, Radio, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanDataForFirestore } from '../lib/firebase';
import { toast } from './Toast';
import SignVideoStudio from './SignVideoStudio';
import HumanCommunicationBridge from './HumanCommunicationBridge';
import MotorEuphoniaView from './MotorEuphoniaView';
import VisionCompanionView from './VisionCompanionView';
import ChatInterface, { ChatInterfaceRef } from './ChatInterface';
import OrgDashboard from './OrgDashboard';
import AmbientSoundRadar from './AmbientSoundRadar';
import NeurodiversityHub from './NeurodiversityHub';
import CaregiverHub from './CaregiverHub';
import AccessibilityPassportModal from './AccessibilityPassportModal';
import { isAccessibilityUser } from '../lib/access';
import { getTranslation } from '../lib/translations';

export type DisabilityTab =
  | 'hub'
  | 'chat'
  | 'settings'
  | 'video'
  | 'bridge'
  | 'org'
  | 'motor'
  | 'vision'
  | 'radar'
  | 'neurodiversity'
  | 'caregiver';

interface DisabilityModeViewProps {
  profile: UserProfile;
  onMenuClick: () => void;
  onNavigate?: (view: 'chat' | 'profile' | 'settings' | 'video' | 'disability') => void;
  onQuestionEvaluated?: (score: number, lastMessageSnippet?: string) => void;
  syncMessages?: (updatedHistory: Message[]) => void;
  externalMessage?: string;
  onStreamingUpdate?: (text: string) => void;
  onSTTStateChange?: (active: boolean) => void;
  onTabChange?: (tab: DisabilityTab) => void;
  setProfile?: (profile: UserProfile) => void;
}

const DisabilityModeView = React.forwardRef<ChatInterfaceRef, DisabilityModeViewProps>(function DisabilityModeView({
  profile,
  onMenuClick,
  onNavigate,
  onQuestionEvaluated,
  syncMessages,
  externalMessage,
  onStreamingUpdate,
  onSTTStateChange,
  onTabChange,
  setProfile
}, ref) {
  // Start on 'hub' launcher by default so user can cleanly pick their desired module without visual clutter
  const [activeTab, setActiveTab] = useState<DisabilityTab>('hub');
  const [showPassportModal, setShowPassportModal] = useState(false);
  
  // Organization staff (e.g. Care Center / NGO) get an extra module scoped to THEIR users.
  const isOrgStaff = !!profile?.isOrgManager && !!(profile?.organization || '').trim();

  // Tell parent which tab is active (hides floating overlay while camera tools are active)
  useEffect(() => { 
    onTabChange?.(activeTab); 
  }, [activeTab, onTabChange]);

  useEffect(() => () => { 
    onTabChange?.('chat'); 
  }, [onTabChange]);

  const SUPPORTED_LANGUAGES: { id: LanguagePreference; label: string; flag: string; nativeName: string }[] = [
    { id: 'French', label: 'French', flag: '🇫🇷', nativeName: 'Français' },
    { id: 'English', label: 'English', flag: '🇬🇧', nativeName: 'English' },
    { id: 'Arabic', label: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
    { id: 'Egyptian Ammiya', label: 'Egyptian Ammiya', flag: '🇪🇬', nativeName: 'مصري' },
    { id: 'Spanish', label: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
    { id: 'German', label: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
    { id: 'Italian', label: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
    { id: 'Portuguese', label: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
    { id: 'Russian', label: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
    { id: 'Chinese', label: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
    { id: 'Japanese', label: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  ];

  const updateLanguage = async (newLang: LanguagePreference) => {
    if (!profile?.uid) return;
    const previousLang = profile.language;
    if (setProfile) setProfile({ ...profile, language: newLang });
    const path = `users/${profile.uid}`;
    try {
      await setDoc(doc(db, path), cleanDataForFirestore({ language: newLang }), { merge: true });
      toast.success(
        localize(newLang, 'Language updated successfully', 'تم تحديث اللغة بنجاح'),
        localize(newLang, 'Language', 'اللغة')
      );
    } catch (err) {
      console.error('Failed to update language:', err);
      if (setProfile) setProfile({ ...profile, language: previousLang });
      toast.error(
        localize(profile?.language, 'Failed to update language. Please check your connection.', 'فشل تحديث اللغة. تحقق من اتصالك.'),
        localize(profile?.language, 'Update Error', 'خطأ في التحديث')
      );
    }
  };

  const updateAccessibilityMode = async (mode: AccessibilityMode) => {
    if (!profile?.uid) return;
    const previousMode = profile.accessibilityMode;
    if (setProfile) setProfile({ ...profile, accessibilityMode: mode });
    const path = `users/${profile.uid}`;
    try {
      await setDoc(doc(db, path), { accessibilityMode: mode }, { merge: true });
      toast.success(
        localize(profile?.language, `Mode set to: ${mode}`, `تم تفعيل نمط: ${mode}`),
        localize(profile?.language, 'Accessibility Mode', 'نمط الوصول')
      );
    } catch (err) {
      console.error('Failed to update accessibility mode:', err);
      if (setProfile) setProfile({ ...profile, accessibilityMode: previousMode });
      toast.error(
        localize(profile?.language, 'Failed to update accessibility mode.', 'فشل تحديث وضع إمكانية الوصول.'),
        localize(profile?.language, 'Update Error', 'خطأ في التحديث')
      );
    }
  };

  const getModeIcon = (mode: AccessibilityMode) => {
    switch (mode) {
      case 'None': return <User className="w-5 h-5" />;
      case 'Speech': return <Mic className="w-5 h-5" />;
      case 'Visual': return <Eye className="w-5 h-5" />;
      case 'Vocal-Deaf': return <Ear className="w-5 h-5" />;
      case 'Sign-Only': return <Accessibility className="w-5 h-5" />;
      case 'Motor-Euphonia': return <Activity className="w-5 h-5 text-amber-500" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  const getModeDescription = (mode: AccessibilityMode) => {
    switch (mode) {
      case 'None': return localize(profile.language, 'Standard cognitive interface without accessibility overlays.', 'واجهة إدراكية قياسية بدون طبقات إمكانية وصول.');
      case 'Speech': return localize(profile.language, 'Activates voice transcription, synthetic speech synthesis, and text-to-speech feedback.', 'يفعل النسخ الصوتي، والتخليق الصوتي، وملاحظات تحويل النص إلى كلام.');
      case 'Visual': return localize(profile.language, 'Enables vision analysis, high contrast, text zooming, and spatial layout modifications.', 'يفعل تحليل الرؤية، والتباين العالي، وتكبير النص، وتعديلات التخطيط المكاني.');
      case 'Vocal-Deaf': return localize(profile.language, 'Enables sign language avatar alongside speech recognition for users who are deaf but can speak.', 'يفعل الصورة الرمزية للغة الإشارة جنباً إلى جنب مع التعرف على الكلام للمستخدمين الصم الذين يمكنهم التحدث.');
      case 'Sign-Only': return localize(profile.language, 'Full sign language interface powered by the avatar and vision-based gesture recognition.', 'واجهة كاملة للغة الإشارة مدعومة بالصورة الرمزية والتعرف على الإيماءات المعتمد على الرؤية.');
      case 'Motor-Euphonia': return localize(profile.language, 'Hands-free control for quadriplegia/motor disability using head pointer, facial expressions, and vocal sound triggers.', 'تحكم كامل بدون لمس لمصابي الشلل الرباعي والتصلب الجانبي عبر حركة الرأس، تعابير الوجه، وهمهمات إيفونيا الصوتية.');
      default: return '';
    }
  };

  // Modules metadata definition
  const MODULES = [
    {
      id: 'motor' as const,
      titleEn: 'Motor & Euphonia Control',
      titleAr: 'التحكم الحركي وإيفونيا',
      shortEn: 'Motor',
      shortAr: 'حركي',
      badgeEn: 'Hands-Free & Speech Impairment',
      badgeAr: 'تحكم بدون لمس وتأكيدات الصوت',
      descEn: 'Full hands-free interaction for quadriplegia, ALS & motor impairments. Head-pointer cursor, eye-blink virtual keyboard, facial triggers, and vocal sound confirmations (Euphonia).',
      descAr: 'تحكم متكامل بدون لمس لمصابي الشلل الرباعي والتصلب الجانبي (ALS). مؤشر بحركة الرأس، لوحة العين والرمش، إشارات الوجه، وهمهمات إيفونيا الصوتية.',
      Icon: Activity,
      accentColor: 'text-amber-400',
      borderGlow: 'hover:border-amber-500/60 border-slate-800',
      bgGlow: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      buttonCls: 'bg-gradient-to-r from-amber-400 via-amber-500 to-rose-400 text-slate-950 shadow-amber-500/20',
      matchingMode: 'Motor-Euphonia',
    },
    {
      id: 'vision' as const,
      titleEn: 'Visual Companion (AI Eyes)',
      titleAr: 'الرفيق البصري الذكي',
      shortEn: 'Visual',
      shortAr: 'بصري',
      badgeEn: 'Blind & Low Vision',
      badgeAr: 'المكفوفين وضعاف البصر',
      descEn: 'Friendly conversational audio description. Straight-to-the-point spoken feedback without robotic noise or asterisks, real-time hazard alerts, and spatial memory ("Where is my stuff?").',
      descAr: 'وصف فوري بالصوت البشري كصديق فوري يقف بجانبك. يبدأ مباشرة بدون أي نجوم أو كلام آلي، مع كشف المخاطر والذاكرة المكانية لتحديد أماكن الأشياء.',
      Icon: Eye,
      accentColor: 'text-emerald-400',
      borderGlow: 'hover:border-emerald-500/60 border-slate-800',
      bgGlow: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      buttonCls: 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 shadow-teal-500/20',
      matchingMode: 'Visual',
    },
    {
      id: 'video' as const,
      titleEn: 'AI 3D Sign Studio',
      titleAr: 'استوديو لغة الإشارة ثلاثي الأبعاد',
      shortEn: '3D Sign',
      shortAr: 'إشارة',
      badgeEn: 'Deaf & Hard of Hearing',
      badgeAr: 'الصم وضعاف السمع',
      descEn: 'Interactive real-time 3D signing avatar with fingerspelling (A-Z, 0-9, Arabic mapping), dictionary gestures, script input, and real-time speech translation into sign language.',
      descAr: 'أفاتار ثلاثي الأبعاد تفاعلي للغة الإشارة، أبجدية الأصابع، قواميس إشارية عربية وعالمية، وتحويل أي نص أو كلام منطوق إلى لغة إشارة حية.',
      Icon: Accessibility,
      accentColor: 'text-indigo-400',
      borderGlow: 'hover:border-indigo-500/60 border-slate-800',
      bgGlow: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      buttonCls: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white shadow-indigo-500/25',
      matchingMode: 'Sign-Only',
    },
    {
      id: 'bridge' as const,
      titleEn: 'Two-Way Human Bridge',
      titleAr: 'جسر التواصل البشري المزدوج',
      shortEn: 'Bridge',
      shortAr: 'جسر',
      badgeEn: 'Live Deaf-Hearing Conversation',
      badgeAr: 'تواصل مباشر وجهاً لوجه',
      descEn: 'Instant face-to-face communication bridge between deaf and hearing people with high-contrast live speech captions and synthetic audio playback.',
      descAr: 'محادثة فورية مباشرة بين الصم والسامعين بنصوص كبيرة وواضحة لقراءة الشفاه، مع زر للنطق الصوتي الفوري باللهجة المصرية والإنجليزية.',
      Icon: Ear,
      accentColor: 'text-cyan-400',
      borderGlow: 'hover:border-cyan-500/60 border-slate-800',
      bgGlow: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      buttonCls: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-cyan-500/20',
      matchingMode: 'Vocal-Deaf',
    },
    {
      id: 'chat' as const,
      titleEn: 'Adaptive Cognitive Chat',
      titleAr: 'محادثة كوجنيفاي الذكية المهيأة',
      shortEn: 'Chat',
      shortAr: 'محادثة',
      badgeEn: 'Cognitive & All Learners',
      badgeAr: 'دعم إدراكي ومساعد تعليمي',
      descEn: 'Pedagogical tutoring assistant tailored to cognitive stage, featuring worked examples, spaced retention reviews, and screen-reader plain text.',
      descAr: 'مساعد تعليمي ذكي يتكيف مع مستواك المعرفي، يقدم أمثلة عملية مبسطة، جداول تثبيت الذاكرة، ومتوافق بالكامل مع تقنيات الوصول المساعدة.',
      Icon: MessageSquare,
      accentColor: 'text-rose-400',
      borderGlow: 'hover:border-rose-500/60 border-slate-800',
      bgGlow: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      buttonCls: 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-rose-500/25',
      matchingMode: 'None',
    },
    {
      id: 'radar' as const,
      titleEn: 'Ambient Sound & Hazard Radar',
      titleAr: 'رادار الأصوات والمخاطر للصم',
      shortEn: 'Radar',
      shortAr: 'رادار',
      badgeEn: 'Deaf Acoustic Awareness',
      badgeAr: 'وعي صوتي فوري للصم',
      descEn: 'Real-time acoustic AI hazard radar detecting sirens, fire alarms, car horns, and doorbells with screen flash strobe and tactile vibrations.',
      descAr: 'كشف صوتي بيئي مباشر لصفارات الإنذار، أجهزة كشف الدخان، كلاكس السيارات، وأجراس الأبواب مع وميض بصري واهتزازات لمسية.',
      Icon: Radio,
      accentColor: 'text-cyan-400',
      borderGlow: 'hover:border-cyan-500/60 border-slate-800',
      bgGlow: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      buttonCls: 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-cyan-500/20',
      matchingMode: 'Deaf',
    },
    {
      id: 'neurodiversity' as const,
      titleEn: 'Neurodiversity & Autism Hub',
      titleAr: 'واحة التوحد والاضطرابات النمائية',
      shortEn: 'Autism',
      shortAr: 'توحد',
      badgeEn: 'Autism, Dyslexia & ADHD',
      badgeAr: 'التوحد، عسر القراءة وتشتت الانتباه',
      descEn: 'Visual PECS communication cards with speech output, daily visual routine schedules, emotion & sensory regulation meter with breathing bubble, and dyslexia reading tools.',
      descAr: 'بطاقات بيكس (PECS) للتواصل البصري المنطوق، جدول الروتين اليومي، مقياس المشاعر وفقاعة التنفس الهادئ، ومسطرة القراءة لعسر القراءة.',
      Icon: Brain,
      accentColor: 'text-purple-400',
      borderGlow: 'hover:border-purple-500/60 border-slate-800',
      bgGlow: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      buttonCls: 'bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 text-white shadow-purple-500/20',
      matchingMode: 'Neurodiversity',
    },
    {
      id: 'caregiver' as const,
      titleEn: 'Caregiver & Specialist Hub',
      titleAr: 'لوحة المرافق والمختص الطبي',
      shortEn: 'Caregiver',
      shortAr: 'مرافق',
      badgeEn: 'Clinical & Family Controls',
      badgeAr: 'إشراف الأسرة والأخصائيين',
      descEn: 'Unified monitoring dashboard, live emergency SOS test, telemetry metrics, and one-click JSON backup & clinical profile migration.',
      descAr: 'لوحة تحكم للمرافق والأخصائي، اختبار نداء الاستغاثة، إحصائيات الذاكرة البصرية والنطق، والنسخ الاحتياطي ونقل الملف الطبي.',
      Icon: Shield,
      accentColor: 'text-rose-400',
      borderGlow: 'hover:border-rose-500/60 border-slate-800',
      bgGlow: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      buttonCls: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-500/20',
      matchingMode: 'Multiple',
    },
    {
      id: 'settings' as const,
      titleEn: 'Preferences & System Dialects',
      titleAr: 'التفضيلات وتخصيص النظام',
      shortEn: 'Settings',
      shortAr: 'إعدادات',
      badgeEn: 'Languages & Accessibility Profiles',
      badgeAr: 'اللغات وأنماط الوصول',
      descEn: 'Choose from 11 supported languages including Egyptian Ammiya, customize accessibility profiles, and adjust high-contrast modes.',
      descAr: 'اختيار لغة النظام واللهجة المصرية المحكية، تفعيل ملفات إمكانية الوصول الخاصة، وضبط التباين العالي بما يلائم احتياجاتك.',
      Icon: Settings,
      accentColor: 'text-slate-300',
      borderGlow: 'hover:border-slate-600 border-slate-800',
      bgGlow: 'bg-slate-800/80 text-slate-300 border-slate-700',
      buttonCls: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
      matchingMode: '',
    },
    ...(isOrgStaff ? [{
      id: 'org' as const,
      titleEn: 'My Organization Hub',
      titleAr: 'لوحة تحكم الجمعية / المؤسسة',
      shortEn: 'Org Hub',
      shortAr: 'المؤسسة',
      badgeEn: 'Charity & NGO Staff Portal',
      badgeAr: 'خاص بمشرفي الجمعيات والمؤسسات',
      descEn: 'Cohort analytics, enrolled special-needs learners, cognitive distributions, and accessibility adoption reports for your registered organization.',
      descAr: 'متابعة وإدارة طلاب الجمعية المسجلين، إحصائيات مستويات الاستيعاب المعرفي، ومعدلات تفعيل تقنيات إمكانية الوصول.',
      Icon: Building2,
      accentColor: 'text-teal-400',
      borderGlow: 'hover:border-teal-500/60 border-slate-800',
      bgGlow: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      buttonCls: 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-teal-500/20',
      matchingMode: '',
    }] : []),
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d101d] text-slate-100 overflow-hidden relative select-none">
      
      {/* ── TOP NAVIGATION BAR ── */}
      <header className="relative z-[9995] px-4 py-2.5 sm:px-6 sm:py-3 shrink-0 flex items-center justify-between border-b border-slate-800 bg-[#121524]/90 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Main App Menu Drawer Button */}
          <button
            onClick={() => {
              if (isAccessibilityUser(profile) || !onNavigate) onMenuClick();
              else onNavigate('chat');
            }}
            aria-label={isAccessibilityUser(profile)
              ? localize(profile.language, 'Open menu', 'افتح القائمة')
              : getTranslation(profile.language, 'back')}
            className="p-2 text-slate-400 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 rounded-xl active:scale-95 transition-all flex items-center gap-1.5"
          >
            {isAccessibilityUser(profile)
              ? <Menu className="w-4 h-4" />
              : <ArrowLeft className={`w-4 h-4 ${localize(profile.language, '', 'rotate-180')}`} />}
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
              {isAccessibilityUser(profile)
                ? localize(profile.language, 'Menu', 'القائمة')
                : getTranslation(profile.language, 'back')}
            </span>
          </button>

          {/* If inside an active module, show clear "Back to Hub" button */}
          {activeTab !== 'hub' ? (
            <button
              onClick={() => setActiveTab('hub')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{localize(profile.language, 'Back to Hub', 'العودة للمركز')}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-white">
              <div className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                <Accessibility className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="font-black text-sm sm:text-base tracking-tight hidden sm:inline">
                {localize(profile.language, 'Accessibility Command Hub', 'مركز إمكانية الوصول وذوي الهمم')}
              </span>
            </div>
          )}
        </div>

        {/* Right Header Status / Active Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* If inside a module, show compact module switcher pills */}
          {activeTab !== 'hub' ? (
            <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl max-w-[280px] sm:max-w-md overflow-x-auto custom-scrollbar">
              {MODULES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveTab(m.id)}
                  title={localize(profile.language, m.titleEn, m.titleAr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === m.id
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <m.Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{localize(profile.language, m.shortEn, m.shortAr)}</span>
                </button>
              ))}
            </div>
          ) : (
            /* On Hub: show active profile status badge */
            <div className="flex items-center gap-2">
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300">
                <span className="text-slate-400">{localize(profile.language, 'Current Mode:', 'الوضع المفعل:')}</span>
                <strong className="text-cyan-400">
                  {profile.accessibilityMode && profile.accessibilityMode !== 'None'
                    ? profile.accessibilityMode
                    : localize(profile.language, 'Standard', 'قياسي')}
                </strong>
              </div>
              <button
                onClick={() => setShowPassportModal(true)}
                title={localize(profile.language, 'Universal Accessibility Passport', 'جواز السفر الميسر الشامل')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/50 transition-all text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <span>🛂</span>
                <span className="hidden sm:inline">{localize(profile.language, 'Passport', 'جواز السفر')}</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                title={localize(profile.language, 'Settings & Languages', 'الإعدادات واللغات')}
                className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">

          {/* ═════════════════════════════════════════════════════════════════════
              VIEW: DISABILITY MODULES HUB & LAUNCHER
             ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'hub' && (
            <motion.div
              key="hub-launcher"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 lg:p-10"
            >
              <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-16">
                
                {/* Hero Introduction Banner */}
                <section className="bg-[#181C2E]/90 border border-slate-800 rounded-[28px] p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
                  <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl text-start">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-800/80 border border-slate-700 text-cyan-400">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{localize(profile.language, 'AI Assistive Learning Suites', 'بيئات الذكاء الاصطناعي التكيفية لذوي الهمم')}</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {localize(profile.language, 'Choose Your Assistive Environment', 'اختر وحدة المساعدة التي تناسبك')}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                        {localize(
                          profile.language,
                          'Dedicated, distraction-free assistive environments designed for seamless accessibility. Each module operates independently with zero clutter.',
                          'أدوات مخصصة ومريحة مصممة بعناية لتوفير تجربة تعليمية وتواصلية بدون أي تشتت أو تعقيد. اختر الوحدة المناسبة للانطلاق فوراً.'
                        )}
                      </p>
                    </div>

                    {/* Quick Open User's Recommended Active Mode */}
                    {profile.accessibilityMode && profile.accessibilityMode !== 'None' && (
                      <div className="shrink-0 w-full md:w-auto">
                        {(() => {
                          const matched = MODULES.find(m => m.matchingMode === profile.accessibilityMode);
                          if (!matched) return null;
                          return (
                            <button
                              onClick={() => setActiveTab(matched.id)}
                              className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/10 active:scale-95 transition-all"
                            >
                              <Zap className="w-4 h-4" />
                              <span>{localize(profile.language, `Launch ${matched.titleEn.split(' ')[0]}`, `تشغيل ${matched.titleAr.split(' ')[0]}`)}</span>
                              <ArrowRight className={`w-4 h-4 ${localize(profile.language, '', 'rotate-180')}`} />
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </section>

                {/* Module Cards Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {MODULES.map((m) => {
                    const isMyCurrentMode =
                      (m.matchingMode === profile.accessibilityMode && profile.accessibilityMode !== 'None') ||
                      (m.id === 'chat' && profile.accessibilityMode === 'Speech');
                    return (
                      <div
                        key={m.id}
                        className={`bg-[#181C2E]/90 border rounded-[26px] p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between transition-all duration-300 relative group overflow-hidden ${
                          isMyCurrentMode
                            ? 'border-cyan-500/60 shadow-cyan-500/10 ring-2 ring-cyan-500/20'
                            : m.borderGlow
                        }`}
                      >
                        {/* Current Active Mode Ribbon */}
                        {isMyCurrentMode && (
                          <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <span>{localize(profile.language, 'Active Mode', 'وضعك المفعل')}</span>
                          </div>
                        )}

                        <div className="space-y-4 text-start">
                          {/* Icon and Category Badge */}
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl border ${m.bgGlow}`}>
                              <m.Icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {localize(profile.language, m.badgeEn, m.badgeAr)}
                            </span>
                          </div>

                          {/* Titles */}
                          <div className="space-y-1">
                            <h3 className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors tracking-tight">
                              {localize(profile.language, m.titleEn, m.titleAr)}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                              {localize(profile.language, m.descEn, m.descAr)}
                            </p>
                          </div>
                        </div>

                        {/* Action Launch Button */}
                        <div className="pt-6 mt-2 border-t border-slate-800/80">
                          <button
                            onClick={() => setActiveTab(m.id)}
                            className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${m.buttonCls}`}
                          >
                            <span>{localize(profile.language, 'Open Module', 'فتح الوحدة')}</span>
                            <ArrowRight className={`w-3.5 h-3.5 ${localize(profile.language, '', 'rotate-180')}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </section>
              </div>
            </motion.div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              ACTIVE MODULE VIEWS (CLEAN & DEDICATED)
             ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'motor' && (
            <motion.div
              key="motor-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <MotorEuphoniaView profile={profile} />
            </motion.div>
          )}

          {activeTab === 'vision' && (
            <motion.div
              key="vision-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <VisionCompanionView profile={profile} setProfile={setProfile} />
            </motion.div>
          )}

          {activeTab === 'radar' && (
            <motion.div
              key="radar-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <AmbientSoundRadar profile={profile} onNavigateBack={() => setActiveTab('hub')} />
            </motion.div>
          )}

          {activeTab === 'neurodiversity' && (
            <motion.div
              key="neurodiversity-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <NeurodiversityHub profile={profile} onNavigateBack={() => setActiveTab('hub')} />
            </motion.div>
          )}

          {activeTab === 'caregiver' && (
            <motion.div
              key="caregiver-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <CaregiverHub
                profile={profile}
                onNavigateBack={() => setActiveTab('hub')}
                setProfile={setProfile}
                onOpenPassport={() => setShowPassportModal(true)}
              />
            </motion.div>
          )}

          {activeTab === 'bridge' && (
            <motion.div
              key="bridge-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <HumanCommunicationBridge profile={profile} />
            </motion.div>
          )}

          {activeTab === 'video' && (
            <motion.div
              key="video-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0"
            >
              <SignVideoStudio profile={profile} onMenuClick={onMenuClick} isEmbedded={true} />
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-0 flex flex-col p-3 sm:p-4 md:p-6 lg:p-8 pb-0"
            >
              <div className="flex-1 min-h-0 bg-[#121524] rounded-t-3xl shadow-2xl border border-slate-800 overflow-hidden relative flex flex-col">
                <ChatInterface
                  ref={ref}
                  profile={profile}
                  onQuestionEvaluated={onQuestionEvaluated || (() => {})}
                  syncMessages={syncMessages || (() => {})}
                  onMenuClick={onMenuClick}
                  externalMessage={externalMessage}
                  onStreamingUpdate={onStreamingUpdate}
                  onSTTStateChange={onSTTStateChange}
                  isEmbedded={true}
                  setProfile={setProfile}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-10"
            >
              <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Language Selection Card */}
                <div className="bg-[#181C2E]/90 border border-slate-800 p-6 sm:p-8 rounded-[28px] shadow-2xl backdrop-blur-xl">
                  <div className="mb-6 text-start">
                    <div className="flex items-center gap-2 text-cyan-400 mb-1">
                      <Globe className="w-5 h-5" />
                      <h2 className="text-xl font-black text-white tracking-tight">
                        {localize(profile.language, 'Language Selection', 'اختيار اللغة')}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400">
                      {localize(
                        profile.language,
                        'Choose your preferred system & AI communication language',
                        'اختر لغة النظام والتواصل مع المساعد الذكي'
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = profile.language === lang.id;
                      return (
                        <button
                          key={lang.id}
                          onClick={() => updateLanguage(lang.id)}
                          className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between transition-all active:scale-95 ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500/15 shadow-sm text-cyan-300 font-bold'
                              : 'border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg shrink-0">{lang.flag}</span>
                            <div className="text-start truncate">
                              <p className="text-xs font-bold leading-none">{lang.nativeName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lang.label}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accessibility Profiles Card */}
                <div className="bg-[#181C2E]/90 border border-slate-800 p-6 sm:p-8 rounded-[28px] shadow-2xl backdrop-blur-xl">
                  <div className="mb-8 text-start">
                    <h2 className="text-xl font-black text-white tracking-tight mb-1">{getTranslation(profile.language, 'accessibilityProfiles')}</h2>
                    <p className="text-xs sm:text-sm text-slate-400">{getTranslation(profile.language, 'accessibilityModeDescription')}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['None', 'Motor-Euphonia', 'Sign-Only', 'Speech', 'Visual', 'Vocal-Deaf'] as AccessibilityMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => updateAccessibilityMode(mode)}
                        className={`text-start p-5 rounded-2xl border transition-all relative ${
                          profile.accessibilityMode === mode 
                            ? 'border-cyan-400 bg-cyan-500/10 shadow-lg' 
                            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-4 relative z-10">
                          <div className={`mt-0.5 p-2 rounded-xl ${
                            profile.accessibilityMode === mode 
                              ? 'bg-cyan-500 text-slate-950 font-black' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {getModeIcon(mode)}
                          </div>
                          <div>
                            <h3 className={`text-sm font-bold mb-1 ${
                              profile.accessibilityMode === mode ? 'text-cyan-400' : 'text-white'
                            }`}>
                              {mode === 'None' ? getTranslation(profile.language, 'standardProtocol')
                                : mode === 'Motor-Euphonia' ? localize(profile.language, 'Motor & Euphonia', 'تحكم حركي وإيفونيا')
                                : mode === 'Speech' ? localize(profile.language, 'Speech', 'النطق')
                                : mode === 'Visual' ? localize(profile.language, 'Visual', 'بصري')
                                : mode === 'Vocal-Deaf' ? localize(profile.language, 'Vocal-Deaf', 'أصمّ ناطق')
                                : mode === 'Sign-Only' ? localize(profile.language, 'Sign-Only', 'إشارة فقط')
                                : mode}
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                              {getModeDescription(mode)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'org' && (
            <motion.div
              key="org-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full"
            >
              <OrgDashboard profile={profile} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Universal Accessibility Passport Modal */}
      <AccessibilityPassportModal
        profile={profile}
        isOpen={showPassportModal}
        onClose={() => setShowPassportModal(false)}
        setProfile={setProfile}
      />
    </div>
  );
});

export default DisabilityModeView;
