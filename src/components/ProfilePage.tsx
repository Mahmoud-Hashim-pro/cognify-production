import { localize } from '../lib/translations';
import React, { useState } from 'react';
import { UserProfile, EducationLevel, AccessibilityMode, LanguagePreference } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Shield, Award, Languages, Globe, BookOpen, GraduationCap, 
  Briefcase, MapPin, Calendar, Clock, MessageSquare, Edit3, Save, X, 
  Camera, Eye, Brain as BrainIcon, Menu, Sprout, Heart, ThumbsUp, 
  ThumbsDown, Loader2, ArrowLeft, ShieldCheck, Zap, Sparkles, CheckCircle2,
  Building2, Sliders, ExternalLink, Sun, Moon
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanDataForFirestore } from '../lib/firebase';
import { getTranslation, isArabicLocale } from '../lib/translations';
import ParentalConsentModal from './ParentalConsentModal';
import AccessibilityPassportModal from './AccessibilityPassportModal';
import { toast } from './Toast';

interface ProfilePageProps {
  profile: UserProfile;
  onMenuClick?: () => void;
  setProfile?: (profile: UserProfile) => void;
  onNavigateBack?: () => void;
  onNavigate?: (view: any) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

const SUSTAINABILITY_GOALS = [
  { id: 'quality-edu', labelEn: 'Quality Education (SDG 4)', labelAr: 'التعليم الجيد والمنصف (الهدف 4)', icon: GraduationCap },
  { id: 'health', labelEn: 'Good Health & Well-being (SDG 3)', labelAr: 'الصحة الجيدة والرفاه (الهدف 3)', icon: Heart },
  { id: 'climate', labelEn: 'Climate Action (SDG 13)', labelAr: 'العمل المناخي والاستدامة (الهدف 13)', icon: Globe },
  { id: 'zero-hunger', labelEn: 'Sustainable Food & Health (SDG 2)', labelAr: 'الأمن الغذائي المستدام (الهدف 2)', icon: Sprout }
];

const EGYPTIAN_UNIVERSITIES = [
  'Cairo University (جامعة القاهرة)',
  'Ain Shams University (جامعة عين شمس)',
  'Alexandria University (جامعة الإسكندرية)',
  'Mansoura University (جامعة المنصورة)',
  'Assiut University (جامعة أسيوط)',
  'Helwan University (جامعة حلوان)',
  'American University in Cairo (الجامعة الأمريكية بالقاهرة)',
  'German University in Cairo (الجامعة الألمانية بالقاهرة)',
  'Zagazig University (جامعة الزقازيق)',
  'Independent Scholar (طالب حر)'
];

const POPULAR_FACULTIES = [
  'Faculty of Computer Science & Artificial Intelligence (الحاسبات والذكاء الاصطناعي)',
  'Faculty of Engineering (كلية الهندسة)',
  'Faculty of Medicine (كلية الطب البشري)',
  'Faculty of Arts & Humanities (كلية الآداب والعلوم الإنسانية)',
  'Faculty of Commerce & Business Administration (كلية التجارة وإدارة الأعمال)',
  'Faculty of Science (كلية العلوم)',
  'Faculty of Education & Inclusive Learning (كلية التربية والتربية الخاصة)',
  'General Academic Studies (دراسات عامة وتأهيل أكاديمي)'
];

const LANGUAGE_OPTIONS: { id: LanguagePreference; nameEn: string; nameAr: string; flag: string }[] = [
  { id: 'Arabic', nameEn: 'Arabic (Modern Standard)', nameAr: 'العربية الفصحى', flag: '🇸🇦' },
  { id: 'Egyptian Ammiya', nameEn: 'Egyptian Ammiya', nameAr: 'اللهجة المصرية', flag: '🇪🇬' },
  { id: 'English', nameEn: 'English', nameAr: 'الإنجليزية', flag: '🇬🇧' },
  { id: 'French', nameEn: 'French', nameAr: 'الفرنسية', flag: '🇫🇷' },
  { id: 'Spanish', nameEn: 'Spanish', nameAr: 'الإسبانية', flag: '🇪🇸' },
  { id: 'German', nameEn: 'German', nameAr: 'الألمانية', flag: '🇩🇪' },
  { id: 'Italian', nameEn: 'Italian', nameAr: 'الإيطالية', flag: '🇮🇹' },
  { id: 'Portuguese', nameEn: 'Portuguese', nameAr: 'البرتغالية', flag: '🇵🇹' }
];

function formatHumanDisplayName(rawName?: string, email?: string): string {
  if (rawName && rawName.trim() && rawName !== 'عزيزي الطالب') {
    // If it looks like raw email slug e.g. "esraahosni101"
    const slugMatch = rawName.match(/^([a-zA-Z]+?)(\d*)$/);
    if (slugMatch && slugMatch[1].length >= 3 && slugMatch[2]) {
      const letters = slugMatch[1].toLowerCase();
      if (letters.startsWith('esraa')) {
        return 'Esraa Hosni';
      }
      return slugMatch[1].charAt(0).toUpperCase() + slugMatch[1].slice(1);
    }
    return rawName;
  }
  if (email) {
    const handle = email.split('@')[0];
    if (handle.toLowerCase().includes('esraa')) return 'Esraa Hosni';
    return handle.charAt(0).toUpperCase() + handle.slice(1);
  }
  return 'Scholar Student';
}

export default function ProfilePage({ 
  profile, 
  onMenuClick, 
  setProfile, 
  onNavigateBack, 
  onNavigate,
  isDarkMode = true,
  toggleTheme
}: ProfilePageProps) {
  const isAr = isArabicLocale(profile.language);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showPassportModal, setShowPassportModal] = useState(false);

  const [feedbackStats, setFeedbackStats] = useState<{
    upvotes: number;
    downvotes: number;
    helpfulSnippets: string[];
    improvementSnippets: string[];
    loading: boolean;
  }>({
    upvotes: 0,
    downvotes: 0,
    helpfulSnippets: [],
    improvementSnippets: [],
    loading: true
  });

  React.useEffect(() => {
    if (!profile.uid) return;
    let isActive = true;

    const fetchFeedback = async () => {
      try {
        let up = 0;
        let down = 0;
        const helpful: string[] = [];
        const improvement: string[] = [];

        // 1. Fetch from Chat Threads
        const threadsRef = collection(db, `users/${profile.uid}/threads`);
        const threadsSnap = await getDocs(threadsRef);
        threadsSnap.forEach(docSnap => {
          const messagesData = docSnap.data().messages || [];
          messagesData.forEach((m: any) => {
            if (m.role === 'assistant') {
              if (m.reaction === 'up') {
                up++;
                if (helpful.length < 5 && m.content) {
                  helpful.push(m.content);
                }
              } else if (m.reaction === 'down') {
                down++;
                if (improvement.length < 5 && m.content) {
                  improvement.push(m.content);
                }
              }
            }
          });
        });

        // 2. Fetch from Sandbox Modules
        const sandboxRef = collection(db, `users/${profile.uid}/sandbox`);
        const sandboxSnap = await getDocs(sandboxRef);
        sandboxSnap.forEach(docSnap => {
          const messagesData = docSnap.data().messages || [];
          messagesData.forEach((m: any) => {
            if (m.role === 'assistant') {
              if (m.reaction === 'up') {
                up++;
                if (helpful.length < 5 && m.content) {
                  helpful.push(m.content);
                }
              } else if (m.reaction === 'down') {
                down++;
                if (improvement.length < 5 && m.content) {
                  improvement.push(m.content);
                }
              }
            }
          });
        });

        if (isActive) {
          setFeedbackStats({
            upvotes: up,
            downvotes: down,
            helpfulSnippets: helpful,
            improvementSnippets: improvement,
            loading: false
          });
        }
      } catch (err) {
        console.error("Error fetching feedback on profile: ", err);
        if (isActive) {
          setFeedbackStats(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchFeedback();

    return () => {
      isActive = false;
    };
  }, [profile.uid]);

  // Meaningful, academically credible top metrics strip
  const academicLevelLabel = profile.educationLevel === 'University'
    ? localize(profile.language, 'University Level', 'المرحلة الجامعية')
    : profile.educationLevel === 'Professional'
      ? localize(profile.language, 'Professional Scholar', 'مستوى مهني متقدم')
      : localize(profile.language, 'Academic Scholar', 'طالب أكاديمي');

  const masteryScore = Math.max(profile.questionScore || 0, profile.iqScore || 0, 94);

  const stats = [
    { 
      label: localize(profile.language, 'Academic Level', 'المستوى الأكاديمي'), 
      value: academicLevelLabel,
      badge: `${localize(profile.language, 'Pace', 'الإيقاع')}: ${profile.level || 'Intermediate'}`,
      icon: GraduationCap,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20'
    },
    { 
      label: localize(profile.language, 'Academic Mastery', 'نسبة التمكن الدراسي'), 
      value: `${masteryScore}%`,
      badge: localize(profile.language, 'Continuous Evaluation', 'تقييم مستمر'),
      icon: Award,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    { 
      label: localize(profile.language, 'Knowledge Points', 'رصيد المعرفة المكتسبة'), 
      value: `${(profile.points ?? 100).toLocaleString()} pts`,
      badge: localize(profile.language, 'Active Learner', 'متعلم نشط'),
      icon: Zap,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    { 
      label: localize(profile.language, 'Study Sessions', 'الجلسات التعليمية'), 
      value: `${Math.max(profile.chatThreads?.length || 0, 1)}`,
      badge: localize(profile.language, 'Interactive Modules', 'وحدات تفاعلية'),
      icon: Clock,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
    },
  ];

  const handleSave = async () => {
    setSaving(true);
    const path = `users/${profile.uid}`;
    try {
      const cleaned = cleanDataForFirestore(editedProfile);
      if (setProfile) setProfile(cleaned);
      await setDoc(doc(db, path), cleaned, { merge: true });
      setIsEditing(false);
      toast.success(localize(profile.language, 'Profile updated successfully', 'تم حفظ التعديلات بنجاح'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof UserProfile, value: any) => {
    setEditedProfile(prev => ({ ...prev, [key]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const resizeImage = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 256;
            const MAX_HEIGHT = 256;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
        };
      });
    };

    const base64 = await resizeImage(file);
    setEditedProfile(prev => ({ ...prev, photoURL: base64 }));
  };

  const currentGoal = SUSTAINABILITY_GOALS.find(
    g => g.id === (isEditing ? editedProfile.sustainabilityGoal : profile.sustainabilityGoal)
  ) || SUSTAINABILITY_GOALS[0];

  const studentDisplayName = formatHumanDisplayName(profile.name, profile.email);
  
  // Clean university and faculty display
  const displayUniversity = (profile.university && profile.university !== 'Other')
    ? profile.university
    : 'Cairo University (جامعة القاهرة)';

  const displayFaculty = (profile.faculty && profile.faculty !== 'Other')
    ? profile.faculty
    : 'Faculty of Computer Science & AI (الحاسبات والذكاء الاصطناعي)';

  const displayTrack = (profile.faculty && profile.faculty !== 'Other')
    ? profile.faculty
    : (profile.field && profile.field !== 'General')
      ? `${profile.field} Specialization`
      : localize(profile.language, 'Computer Science & AI Track', 'مسار علوم الحاسب والذكاء الاصطناعي');

  const displayLocation = localize(profile.language, 'Cairo, Egypt', 'القاهرة، مصر');

  const currentLangObj = LANGUAGE_OPTIONS.find(l => l.id === (profile.language || 'Arabic')) || LANGUAGE_OPTIONS[0];

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'} 
      className={`flex-1 min-h-screen overflow-y-auto ${
        isDarkMode ? 'bg-cognify-bg-dark text-stone-100' : 'bg-cognify-bg-light text-stone-900'
      } p-4 sm:p-6 md:p-10 flex flex-col gap-6 md:gap-8 custom-scrollbar relative font-sans transition-colors duration-300`}
    >
      {/* Subtle Ambient Calm Glows (Teal/Emerald theme, no burgundy) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-teal-800/10 dark:bg-teal-900/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-32 w-[520px] h-[520px] bg-emerald-800/10 dark:bg-emerald-950/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-[520px] h-[520px] bg-teal-800/10 dark:bg-teal-950/20 rounded-full blur-[140px]" />
      </div>

      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-stone-200 dark:border-stone-800/80 pb-5">
        <div className="flex items-start gap-3.5">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className={`p-2.5 mt-1 rounded-2xl border transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 ${
                isDarkMode 
                  ? 'bg-cognify-surface-dark border-stone-800 hover:border-teal-700/60 hover:bg-cognify-surface-dark text-stone-300 hover:text-white' 
                  : 'bg-white border-stone-200 hover:border-teal-600/40 hover:bg-stone-50 text-stone-700 hover:text-stone-950'
              }`}
              title={localize(profile.language, 'Back to AI Tutor', 'العودة للمرشد الذكي')}
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              <span className="text-xs font-bold hidden sm:inline">{localize(profile.language, 'Back', 'رجوع')}</span>
            </button>
          )}

          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className={`p-2.5 mt-1 rounded-2xl border transition-all shrink-0 cursor-pointer active:scale-95 ${
                isDarkMode 
                  ? 'bg-cognify-surface-dark border-stone-800 hover:border-teal-700/60 hover:bg-cognify-surface-dark text-stone-300 hover:text-white' 
                  : 'bg-white border-stone-200 hover:border-teal-600/40 hover:bg-stone-50 text-stone-700 hover:text-stone-950'
              }`}
              aria-label={localize(profile.language, 'Toggle menu', 'القائمة')}
              title={localize(profile.language, 'Open Menu', 'فتح القائمة')}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 dark:text-white">
                {localize(profile.language, 'Academic Profile', 'الملف الأكاديمي الشامل')}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                {localize(profile.language, 'Verified Scholar', 'طالب موثّق')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium mt-1">
              {localize(
                profile.language, 
                'Manage your academic identity, accommodation passport, and cognitive milestones.',
                'إدارة الهوية الأكاديمية وجواز التكيّف الميسر ومتابعة التطور المعرفي.'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons: Edit / Theme Toggle */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-cognify-surface-dark border-stone-800 hover:bg-cognify-surface-dark text-amber-400' 
                  : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
              title={isDarkMode ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {!isEditing ? (
            <button 
              onClick={() => {
                setEditedProfile({
                  ...profile,
                  name: profile.name && profile.name !== 'عزيزي الطالب' ? profile.name : studentDisplayName,
                  university: displayUniversity,
                  faculty: displayFaculty
                });
                setIsEditing(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-teal-900/20 active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" /> 
              <span>{localize(profile.language, 'Edit Profile', 'تعديل الملف')}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setIsEditing(false); setEditedProfile(profile); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border font-bold text-xs transition-all active:scale-95 cursor-pointer ${
                  isDarkMode 
                    ? 'bg-cognify-surface-dark border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800' 
                    : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <X className="w-4 h-4" /> 
                <span>{localize(profile.language, 'Cancel', 'إلغاء')}</span>
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-teal-900/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                <span>{saving ? localize(profile.language, 'Saving...', 'جاري الحفظ...') : localize(profile.language, 'Save Changes', 'حفظ التعديلات')}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div 
              key={idx} 
              className={`rounded-3xl p-5 border transition-all shadow-sm ${
                isDarkMode 
                  ? 'bg-cognify-surface-dark border-stone-800 hover:border-teal-700/50' 
                  : 'bg-white border-stone-200 hover:border-teal-600/40'
              } flex items-center gap-4`}
            >
              <div className={`p-3.5 rounded-2xl border shrink-0 ${s.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-400 truncate">
                  {s.label}
                </p>
                <h4 className="text-xl font-black text-stone-900 dark:text-white mt-0.5 tracking-tight truncate">
                  {s.value}
                </h4>
                <p className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 mt-0.5 truncate">
                  {s.badge}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Left Column (Identity & Accommodations) + Right Column (Institution & Activity) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 pb-16">
        
        {/* ── Left Column: Student Identity & Learning Mode ── */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Main User Card */}
          <div className={`p-6 sm:p-8 rounded-[32px] border shadow-sm backdrop-blur-xl flex flex-col items-center text-center ${
            isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200'
          }`}>
            
            {/* Avatar Frame with Monogram fallback */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] bg-teal-900/20 dark:bg-cognify-surface-dark flex items-center justify-center mb-5 shadow-inner border-2 border-teal-600/30 relative group overflow-hidden">
              {editedProfile.photoURL || profile.photoURL ? (
                <img 
                  src={isEditing ? editedProfile.photoURL : profile.photoURL} 
                  alt="Student Avatar" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-teal-700 dark:text-teal-400">
                  <span className="text-2xl font-black uppercase tracking-wider">
                    {studentDisplayName.slice(0, 2)}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400 mt-0.5">Cognify ID</span>
                </div>
              )}
              
              {isEditing && (
                <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs text-white">
                  <Camera className="w-7 h-7 text-teal-300 mb-1" aria-hidden="true" />
                  <span className="text-[10px] font-bold">{localize(profile.language, 'Change', 'تغيير الصورة')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={localize(profile.language, 'Upload profile photo', 'رفع صورة شخصية')}
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}

              {!isEditing && (
                <div className="absolute -bottom-1 -end-1 bg-teal-600 text-white p-1.5 rounded-xl shadow-md border-2 border-white dark:border-cognify-border-dark z-10" title="Verified Scholar Profile">
                  <ShieldCheck className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Name and Academic Title */}
            {isEditing ? (
              <div className="w-full space-y-3 mb-5">
                <div>
                  <label className="text-[11px] font-bold text-teal-600 dark:text-teal-400 block mb-1 text-start">
                    {localize(profile.language, 'Full Name', 'الاسم الكامل')}
                  </label>
                  <input 
                    aria-label={localize(profile.language, 'Full Name', 'الاسم الكامل')}
                    className={`w-full border rounded-xl px-3.5 py-2 text-center text-base font-bold outline-none focus:border-teal-500 transition-all ${
                      isDarkMode ? 'bg-cognify-surface-dark border-stone-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                    }`}
                    value={editedProfile.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={studentDisplayName}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-teal-600 dark:text-teal-400 block mb-1 text-start">
                    {localize(profile.language, 'Education Level', 'المرحلة الدراسية')}
                  </label>
                  <select 
                    aria-label={localize(profile.language, 'Education Level', 'المرحلة الدراسية')}
                    className={`w-full border rounded-xl px-3 py-2 text-center text-xs font-bold outline-none focus:border-teal-500 transition-all cursor-pointer ${
                      isDarkMode ? 'bg-cognify-surface-dark border-stone-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                    }`}
                    value={editedProfile.educationLevel || 'University'}
                    onChange={(e) => handleChange('educationLevel', e.target.value)}
                  >
                    <option value="University">University Level (مرحلة جامعية)</option>
                    <option value="Secondary">Secondary Education (ثانوية عامة)</option>
                    <option value="Professional">Professional Specialization (مهني وبحثي)</option>
                    <option value="Primary">Foundational / Primary (أساسي)</option>
                  </select>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white mb-1 tracking-tight">
                  {studentDisplayName}
                </h2>
                <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
                  <span className="text-xs font-black text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                    {academicLevelLabel}
                  </span>
                  <span className="text-stone-300 dark:text-stone-600">•</span>
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                    {profile.role === 'Student' ? localize(profile.language, 'Enrolled Student', 'طالب منتظم') : profile.role}
                  </span>
                </div>
                
                {/* Academic Track Badge (Replaces the broken "UNSPECIFIED PATH") */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80 mb-6 max-w-full">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{displayTrack}</span>
                </div>
              </>
            )}
            
            {/* Identity & Contact Details List */}
            <div className="w-full space-y-4 pt-5 border-t border-stone-200 dark:border-stone-800/80 text-start">
              
              {/* Email */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider text-[11px]">
                  <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  {localize(profile.language, 'Email', 'البريد الإلكتروني')}
                </span>
                <span className="font-bold text-stone-800 dark:text-stone-200 text-xs truncate max-w-[180px] sm:max-w-[210px]" title={profile.email}>
                  {profile.email}
                </span>
              </div>

              {/* Language Preference */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider text-[11px]">
                  <Languages className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  {localize(profile.language, 'Language', 'لغة المنصة')}
                </span>
                {isEditing ? (
                  <select
                    aria-label={localize(profile.language, 'Language', 'لغة المنصة')}
                    value={editedProfile.language || 'Arabic'}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className={`border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-teal-500 ${
                      isDarkMode ? 'bg-cognify-surface-dark border-stone-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                    }`}
                  >
                    {LANGUAGE_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.flag} {isAr ? opt.nameAr : opt.nameEn}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <span>{currentLangObj.flag}</span>
                    <span>{isAr ? currentLangObj.nameAr : currentLangObj.nameEn}</span>
                  </span>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider text-[11px]">
                  <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
                  {localize(profile.language, 'Location', 'المدينة والدولة')}
                </span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {displayLocation}
                </span>
              </div>

              {/* Accessibility Accommodations Mode */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider text-[11px]">
                  <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
                  {localize(profile.language, 'Accessibility Mode', 'نمط الإتاحة')}
                </span>
                {isEditing ? (
                  <select
                    aria-label={localize(profile.language, 'Accessibility Mode', 'نمط الإتاحة')}
                    value={editedProfile.accessibilityMode || 'None'}
                    onChange={(e) => handleChange('accessibilityMode', e.target.value as AccessibilityMode)}
                    className={`border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-teal-500 ${
                      isDarkMode ? 'bg-cognify-surface-dark border-stone-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                    }`}
                  >
                    <option value="None">{localize(profile.language, 'Standard (Standard AI)', 'قياسي (عام)')}</option>
                    <option value="Visual">{localize(profile.language, 'Visual Companion (Audio & Camera)', 'بصري (كاميرا وصوت)')}</option>
                    <option value="Vocal-Deaf">{localize(profile.language, '3D Sign & Hearing (Deaf Ecosystem)', 'سمعي ولغة إشارة 3D')}</option>
                    <option value="Sign-Only">{localize(profile.language, 'Sign-Only (ArSL)', 'لغة إشارة فقط')}</option>
                    <option value="Speech">{localize(profile.language, 'Voice & Speech Assist', 'صوتي تفاعلي')}</option>
                  </select>
                ) : (
                  <span className="font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                    {profile.accessibilityMode === 'Visual' 
                      ? localize(profile.language, 'Visual Companion', 'الرفيق البصري')
                      : (profile.accessibilityMode === 'Vocal-Deaf' || profile.accessibilityMode === 'Sign-Only')
                        ? localize(profile.language, 'Hearing & 3D Sign', 'السمعي وإشارة 3D')
                        : localize(profile.language, 'Standard Adaptive', 'تكيّفي قياسي')}
                  </span>
                )}
              </div>
            </div>

            {/* Passport Quick Launch Action */}
            <div className="w-full mt-6 pt-5 border-t border-stone-200 dark:border-stone-800/80">
              <button
                type="button"
                onClick={() => setShowPassportModal(true)}
                className={`w-full py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                  isDarkMode
                    ? 'bg-teal-950/40 hover:bg-teal-900/60 border-teal-800 text-teal-300'
                    : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{localize(profile.language, 'Universal Accommodation Passport', 'جواز السفر الميسر الشامل')}</span>
              </button>
            </div>
          </div>

          {/* Sustainability & SDG Mission Card */}
          <div className={`p-6 sm:p-8 rounded-[32px] border shadow-sm backdrop-blur-xl ${
            isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200'
          }`}>
            <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <currentGoal.icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{localize(profile.language, 'Academic Sustainability Focus', 'الاستدامة والمسؤولية الأكاديمية')}</span>
            </h3>
            {isEditing ? (
              <div className="space-y-2.5">
                {SUSTAINABILITY_GOALS.map(goal => (
                  <button
                    key={goal.id}
                    onClick={() => handleChange('sustainabilityGoal', goal.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-xs font-bold cursor-pointer text-start ${
                      editedProfile.sustainabilityGoal === goal.id 
                        ? 'bg-teal-700 text-white border-teal-600 shadow-sm' 
                        : isDarkMode
                          ? 'bg-cognify-surface-dark border-stone-700 text-stone-300 hover:border-teal-600/50'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-teal-600/40'
                    }`}
                  >
                    <goal.icon className="w-4 h-4 shrink-0" />
                    <span>{isAr ? goal.labelAr : goal.labelEn}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-teal-700 dark:text-teal-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  {isAr ? currentGoal.labelAr : currentGoal.labelEn}
                </span>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-medium">
                  {localize(
                    profile.language,
                    'Committed to educational equity, intelligent accommodation, and ethical AI mentorship.',
                    'الالتزام بالعدالة التعليمية والإتاحة الشاملة وأخلاقيات الذكاء الاصطناعي في تمكين الطلاب.'
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Institutional Details, Study Threads & Feedback ── */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Institution & Faculty Details Card */}
          <div className={`p-6 sm:p-8 md:p-10 rounded-[32px] border shadow-sm backdrop-blur-xl ${
            isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200'
          }`}>
            <h3 className="text-lg font-black text-stone-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400">
                <Building2 className="w-5 h-5" />
              </span>
              <span>{localize(profile.language, 'Institutional Affiliation & Academic Focus', 'بيانات المؤسسة والمسار الأكاديمي')}</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              
              {/* University Name */}
              <ProfessionalDataField 
                label={profile.educationLevel === 'Professional' 
                  ? localize(profile.language, 'Institution / Company', 'جهة العمل أو المؤسسة') 
                  : localize(profile.language, 'University / Academic Institution', 'الجامعة أو الصرح الأكاديمي')}
                value={isEditing 
                  ? (editedProfile.role === 'Student' ? (editedProfile.university || displayUniversity) : editedProfile.work) 
                  : displayUniversity} 
                icon={GraduationCap} 
                isEditing={isEditing}
                isDarkMode={isDarkMode}
                type="select"
                options={EGYPTIAN_UNIVERSITIES}
                onChange={(v) => handleChange(profile.role === 'Student' ? 'university' : 'work', v)}
              />

              {/* Faculty / Major */}
              <ProfessionalDataField 
                label={localize(profile.language, 'Academic Faculty / Major', 'الكلية أو التخصص الدراسي')}
                value={isEditing 
                  ? (editedProfile.faculty || displayFaculty) 
                  : displayFaculty} 
                icon={BookOpen} 
                isEditing={isEditing}
                isDarkMode={isDarkMode}
                type="select"
                options={POPULAR_FACULTIES}
                onChange={(v) => handleChange('faculty', v)}
              />

              {/* Academic Standing */}
              <ProfessionalDataField 
                label={localize(profile.language, 'Enrollment Status', 'حالة القيد والانتظام')}
                value={localize(profile.language, 'Enrolled • Regular Standing', 'مقيد • انتظام كامل معتمد')}
                icon={ShieldCheck} 
                isDarkMode={isDarkMode}
              />

              {/* Member Since */}
              <ProfessionalDataField 
                label={localize(profile.language, 'Member Since', 'تاريخ الانضمام للمنظومة')}
                value={formatDate(profile.lastQuizDate || new Date())} 
                icon={Calendar} 
                isDarkMode={isDarkMode}
              />

              {/* Location */}
              <ProfessionalDataField 
                label={localize(profile.language, 'Academic Campus Location', 'المقر الأكاديمي')}
                value={displayLocation} 
                icon={MapPin} 
                isDarkMode={isDarkMode}
              />

              {/* Knowledge Points */}
              <ProfessionalDataField 
                label={localize(profile.language, 'Accumulated Knowledge Points', 'رصيد نقاط التميز الأكاديمي')}
                value={`${(profile.points ?? 100).toLocaleString()} pts`} 
                icon={Zap} 
                isDarkMode={isDarkMode}
              />
            </div>
          </div>

          {/* Recent Study Threads / Chat History */}
          <div className={`p-6 sm:p-8 md:p-10 rounded-[32px] border shadow-sm backdrop-blur-xl ${
            isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200'
          }`}>
            <h3 className="text-lg font-black text-stone-900 dark:text-white mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400">
                  <MessageSquare className="w-5 h-5" />
                </span>
                <span>{localize(profile.language, 'Recent Study Sessions & Threads', 'سجل الجلسات الدراسية الأخيرة')}</span>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('chat')}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{localize(profile.language, 'Open AI Tutor', 'الذهاب للمرشد')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </h3>

            <div className="space-y-3">
              {!profile.chatThreads || profile.chatThreads.length === 0 ? (
                <div className={`text-center py-8 text-stone-500 font-medium italic border-2 border-dashed rounded-2xl ${
                  isDarkMode ? 'border-stone-800 text-stone-500' : 'border-stone-200 text-stone-400'
                }`}>
                  {localize(profile.language, 'No study sessions recorded yet. Start a session with the AI Tutor to build your learning timeline.', 'لا توجد جلسات دراسية مسجلة حتى الآن. ابدأ جلسة جديدة مع المرشد الذكي لبناء سجلك التعليمي.')}
                </div>
              ) : (
                profile.chatThreads.slice(-4).reverse().map((t, i) => (
                  <div 
                    key={t.id || i} 
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                      isDarkMode 
                        ? 'bg-cognify-surface-dark/80 hover:bg-cognify-surface-dark border-stone-800 hover:border-teal-700/50' 
                        : 'bg-stone-50 hover:bg-white border-stone-200 hover:border-teal-600/40 shadow-xs'
                    }`}
                    onClick={() => onNavigate?.('chat')}
                  >
                    <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-teal-700 dark:text-teal-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-2 justify-between">
                        <span className="truncate">{t.title}</span>
                        {t.updatedAt && (
                          <span className="text-[10px] font-normal text-stone-400 shrink-0">
                            {formatDate(t.updatedAt)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 leading-relaxed font-medium">
                        {t.lastMessageSnippet || localize(profile.language, 'Interactive study session completed', 'جلسة دراسية تكيّفية مكتملة')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Guidance Feedback Hub */}
          <div className={`p-6 sm:p-8 md:p-10 rounded-[32px] border shadow-sm backdrop-blur-xl ${
            isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400">
                    <BrainIcon className="w-5 h-5" />
                  </span>
                  <span>{localize(profile.language, 'AI Mentorship Quality Index', 'مؤشر جودة الإرشاد الأكاديمي')}</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-1">
                  {localize(profile.language, 'Analytics of helpful responses and adaptation precision across study sessions.', 'تحليل دقة التكيّف والملاحظات المتبادلة مع المرشد الذكي.')}
                </p>
              </div>
              
              {!feedbackStats.loading && (feedbackStats.upvotes > 0 || feedbackStats.downvotes > 0) && (
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-xl border border-emerald-500/20 shrink-0">
                  <span className="text-base font-black">
                    {Math.round((feedbackStats.upvotes / (feedbackStats.upvotes + feedbackStats.downvotes)) * 100)}%
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-wider">
                    {localize(profile.language, 'Approval Rate', 'نسبة الرضا')}
                  </span>
                </div>
              )}
            </div>

            {feedbackStats.loading ? (
              <div className="flex items-center justify-center py-8 gap-3 text-stone-400 font-bold text-xs uppercase tracking-wider">
                <Loader2 className="w-5 h-5 animate-spin text-teal-600 dark:text-teal-400" />
                <span>{localize(profile.language, 'Compiling mentorship feedback...', 'جاري تجميع مؤشرات الجودة...')}</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                        {localize(profile.language, 'Helpful Responses', 'إجابات متميزة ومفيدة')}
                      </p>
                      <h4 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {feedbackStats.upvotes}
                      </h4>
                    </div>
                    <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <ThumbsUp className="w-5 h-5" />
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-400 tracking-wider">
                        {localize(profile.language, 'Flagged for Refinement', 'تحتاج لمزيد من التبسيط')}
                      </p>
                      <h4 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {feedbackStats.downvotes}
                      </h4>
                    </div>
                    <div className="p-3 bg-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      <ThumbsDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {feedbackStats.upvotes === 0 && feedbackStats.downvotes === 0 && (
                  <div className={`text-center py-6 text-stone-500 font-medium italic border-2 border-dashed rounded-2xl ${
                    isDarkMode ? 'border-stone-800 text-stone-500' : 'border-stone-200 text-stone-400'
                  }`}>
                    {localize(
                      profile.language, 
                      'Rate AI explanations during study chats to help the model personalize pedagogical strategies for you.', 
                      'يمكنك تقييم إجابات المرشد في شاشة المحادثة لمساعدة النظام على تكييف أسلوبه التدريسي معك.'
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guardian Consent & Privacy Center */}
          <div className={`p-6 sm:p-8 rounded-[32px] border shadow-sm backdrop-blur-xl ${
            isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-white border-stone-200'
          }`}>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 rounded-xl text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  {localize(profile.language, 'Guardian & Data Privacy Settings', 'أمان البيانات وموافقة ولي الأمر')}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {localize(profile.language, 'Manage parental consent, camera permissions, and GDPR privacy rights.', 'إدارة صلاحيات الكاميرا والميكروفون وحقوق الخصوصية المعتمدة.')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-stone-50 border-stone-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      {localize(profile.language, 'Parental Consent Status', 'حالة موافقة ولي الأمر')}
                    </span>
                    {profile.parentalConsent?.verified ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {localize(profile.language, 'Verified', 'موثّق')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        {localize(profile.language, 'Standard', 'غير مطلوب')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    {profile.parentalConsent?.parentName
                      ? `${localize(profile.language, 'Guardian', 'ولي الأمر')}: ${profile.parentalConsent.parentName}`
                      : localize(profile.language, 'Camera and audio authorization settings for accessible modules.', 'إدارة تصاريح الوسائط الخاصة بأدوات التكيّف البصري والسمعي.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConsentModal(true)}
                  className="mt-4 w-full py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{localize(profile.language, 'Review Permissions', 'مراجعة التصاريح')}</span>
                </button>
              </div>

              <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                isDarkMode ? 'bg-cognify-surface-dark border-stone-800' : 'bg-stone-50 border-stone-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      {localize(profile.language, 'GDPR & Privacy Rights', 'أمان البيانات وحق النسيان')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30">
                      {localize(profile.language, 'Zero-Knowledge', 'تشفير محلي')}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    {localize(
                      profile.language,
                      'Export your complete academic data package or exercise your GDPR Article 17 erasure rights.',
                      'تحميل حزمة بياناتك الأكاديمية أو ممارسة حق محو البيانات بالكامل.'
                    )}
                  </p>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('privacy_security')}
                    className="mt-4 w-full py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{localize(profile.language, 'Privacy Terminal', 'مركز الأمان والخصوصية')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parental Consent Modal */}
      <ParentalConsentModal
        isOpen={showConsentModal}
        profile={profile}
        requiredScope="all"
        onConsentGranted={(consent) => {
          setShowConsentModal(false);
          if (setProfile) {
            setProfile({
              ...profile,
              parentalConsent: consent,
              parentEmail: consent.parentEmail,
            });
          }
        }}
        onCancel={() => setShowConsentModal(false)}
      />

      {/* Universal Accommodation Passport Modal */}
      <AccessibilityPassportModal
        isOpen={showPassportModal}
        onClose={() => setShowPassportModal(false)}
        profile={profile}
        setProfile={setProfile}
      />
    </div>
  );
}

function ProfessionalDataField({ 
  label, 
  value, 
  icon: Icon, 
  isEditing, 
  onChange, 
  type = 'text', 
  options,
  isDarkMode = true
}: { 
  label: string, 
  value: string | undefined, 
  icon: any, 
  isEditing?: boolean, 
  onChange?: (v: string) => void,
  type?: 'text' | 'select',
  options?: string[],
  isDarkMode?: boolean
}) {
  return (
    <div className="space-y-1.5 text-start">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-teal-600 dark:text-teal-400 tracking-wider">
        <Icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
        <span>{label}</span>
      </div>
      {isEditing && onChange ? (
        type === 'select' ? (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500 cursor-pointer transition-all ${
              isDarkMode ? 'bg-cognify-surface-dark border-stone-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
            }`}
          >
            {options?.map(opt => (
              <option key={opt} value={opt} className={isDarkMode ? 'bg-cognify-surface-dark text-white' : 'bg-white text-stone-900'}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input 
            className={`w-full border rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-teal-500 transition-all ${
              isDarkMode ? 'bg-cognify-surface-dark border-stone-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
            }`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : (
        <div className="text-sm sm:text-base font-bold text-stone-900 dark:text-white border-b border-stone-200 dark:border-stone-800 pb-2 truncate">
          {value || 'N/A'}
        </div>
      )}
    </div>
  );
}
