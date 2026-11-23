/**
 * Personal AAC (Augmentative and Alternative Communication) Engine
 *
 * Implements comprehensive customizable AAC communication boards,
 * symbol-to-sentence composition, typed communication, motor-accessible
 * switch scanning, offline persistence, and ethical safety confirmation.
 */

import type { AacSymbol, Dialect } from '../types';
import type {
  AacCategory,
  DefaultAacCategory,
  CategoryMetadata,
  AacSentence,
  AacSentenceListener,
  AacBoard,
  AacPreferences,
  AacExportPayload,
  OfflineAacAuditReport,
} from './types';
import { SwitchScanningEngine } from './switchScanningEngine';

export const DEFAULT_CATEGORY_METADATA: CategoryMetadata[] = [
  {
    id: 'emergencies',
    labelAr: 'الطوارئ والسلامة',
    labelEn: 'Emergencies & Safety',
    icon: 'AlertTriangle',
    descriptionAr: 'رسائل الاستغاثة والإنقاذ والحالات الحرجة',
    descriptionEn: 'Urgent rescue and life-safety alerts',
    isEmergency: true,
  },
  {
    id: 'healthcare',
    labelAr: 'الرعاية الصحية',
    labelEn: 'Healthcare & Wellbeing',
    icon: 'HeartPulse',
    descriptionAr: 'الأعراض الطبية، الأدوية، والتواصل مع الأطباء',
    descriptionEn: 'Medical symptoms, medication, and doctor visits',
  },
  {
    id: 'home',
    labelAr: 'المنزل',
    labelEn: 'Home & Living',
    icon: 'Home',
    descriptionAr: 'الأنشطة اليومية والاحتياجات المنزلية',
    descriptionEn: 'Daily household needs and domestic activities',
  },
  {
    id: 'food_and_drink',
    labelAr: 'الطعام والشراب',
    labelEn: 'Food & Drink',
    icon: 'Utensils',
    descriptionAr: 'الوجبات، المشروبات، الجوع، والعطش',
    descriptionEn: 'Meals, beverages, hunger, and thirst',
  },
  {
    id: 'emotions',
    labelAr: 'المشاعر والأحاسيس',
    labelEn: 'Emotions & Feelings',
    icon: 'Smile',
    descriptionAr: 'التعبير عن المشاعر والحالة النفسية',
    descriptionEn: 'Expressing emotional states and comfort levels',
  },
  {
    id: 'social_communication',
    labelAr: 'التواصل الاجتماعي',
    labelEn: 'Social Communication',
    icon: 'MessageSquare',
    descriptionAr: 'التحيات، الردود السريعة، وآداب الحديث',
    descriptionEn: 'Greetings, quick conversational replies, and courtesy',
  },
  {
    id: 'transportation',
    labelAr: 'المواصلات',
    labelEn: 'Transportation',
    icon: 'Bus',
    descriptionAr: 'التنقل، الحافلات، المترو، والسيارات',
    descriptionEn: 'Commuting, buses, metro, and navigation requests',
  },
  {
    id: 'school',
    labelAr: 'المدرسة والتعليم',
    labelEn: 'School & Learning',
    icon: 'GraduationCap',
    descriptionAr: 'الفصول الدراسية، المناهج، والأسئلة الأكاديمية',
    descriptionEn: 'Classrooms, academic questions, and lessons',
  },
  {
    id: 'work',
    labelAr: 'العمل والمكتب',
    labelEn: 'Work & Professional',
    icon: 'Briefcase',
    descriptionAr: 'الاجتماعات، المهام المهنية، والبريد الإلكتروني',
    descriptionEn: 'Professional meetings, tasks, and collaboration',
  },
];

export const DEFAULT_AAC_SYMBOLS: AacSymbol[] = [
  // ─── Emergencies (Safety Critical) ──────────────────────────
  {
    id: 'aac_em_help',
    labelAr: 'مساعدة',
    labelEn: 'Help',
    icon: 'AlertCircle',
    category: 'emergencies',
    spokenTextAr: 'أحتاج إلى مساعدة عاجلة من فضلكم!',
    spokenTextEn: 'I need urgent help, please!',
    shortcutKey: '1',
  },
  {
    id: 'aac_em_pain',
    labelAr: 'ألم شديد',
    labelEn: 'Severe Pain',
    icon: 'Activity',
    category: 'emergencies',
    spokenTextAr: 'أشعر بألم شديد.',
    spokenTextEn: 'I feel severe pain.',
    shortcutKey: '2',
  },
  {
    id: 'aac_em_doctor',
    labelAr: 'طبيب',
    labelEn: 'Doctor',
    icon: 'Cross',
    category: 'emergencies',
    spokenTextAr: 'أريد رؤية الطبيب حالاً.',
    spokenTextEn: 'I need to see a doctor immediately.',
    shortcutKey: '3',
  },
  {
    id: 'aac_em_fire',
    labelAr: 'حريق / طوارئ',
    labelEn: 'Fire / Emergency',
    icon: 'Flame',
    category: 'emergencies',
    spokenTextAr: 'هناك حالة طوارئ أو حريق!',
    spokenTextEn: 'There is a fire or emergency!',
    shortcutKey: '4',
  },
  {
    id: 'aac_em_breathe',
    labelAr: 'صعوبة تنفس',
    labelEn: 'Cannot Breathe',
    icon: 'Wind',
    category: 'emergencies',
    spokenTextAr: 'أواجه صعوبة بالغة في التنفس، أحتاج أكسجين.',
    spokenTextEn: 'I am having severe difficulty breathing, I need oxygen.',
  },
  {
    id: 'aac_em_police',
    labelAr: 'شرطة / نجدة',
    labelEn: 'Call Police',
    icon: 'ShieldAlert',
    category: 'emergencies',
    spokenTextAr: 'أرجو الاتصال بشرطة النجدة فوراً.',
    spokenTextEn: 'Please call emergency police immediately.',
  },

  // ─── Healthcare & Wellbeing ─────────────────────────────────
  {
    id: 'aac_med_medicine',
    labelAr: 'دواء',
    labelEn: 'Medicine',
    icon: 'Pill',
    category: 'healthcare',
    spokenTextAr: 'حان موعد دوائي.',
    spokenTextEn: 'It is time for my medicine.',
  },
  {
    id: 'aac_med_dizzy',
    labelAr: 'دوخة',
    labelEn: 'Dizzy',
    icon: 'RefreshCw',
    category: 'healthcare',
    spokenTextAr: 'أشعر بالدوار وعدم الاتزان.',
    spokenTextEn: 'I feel dizzy and unbalanced.',
  },
  {
    id: 'aac_med_allergy',
    labelAr: 'حساسية',
    labelEn: 'Allergy',
    icon: 'ShieldAlert',
    category: 'healthcare',
    spokenTextAr: 'لدي حساسية من هذا الشيء.',
    spokenTextEn: 'I have an allergic reaction to this.',
  },
  {
    id: 'aac_med_rest',
    labelAr: 'راحة',
    labelEn: 'Rest',
    icon: 'Moon',
    category: 'healthcare',
    spokenTextAr: 'أحتاج إلى أخذ قسط من الراحة.',
    spokenTextEn: 'I need to take some rest.',
  },
  {
    id: 'aac_med_nurse',
    labelAr: 'ممرض',
    labelEn: 'Nurse',
    icon: 'UserCheck',
    category: 'healthcare',
    spokenTextAr: 'أرجو استدعاء طاقم التمريض.',
    spokenTextEn: 'Please call the nurse.',
  },

  // ─── Home & Living ──────────────────────────────────────────
  {
    id: 'aac_home_bed',
    labelAr: 'سرير / نوم',
    labelEn: 'Bed / Sleep',
    icon: 'Bed',
    category: 'home',
    spokenTextAr: 'أريد الذهاب إلى السرير لأنام.',
    spokenTextEn: 'I want to go to bed to sleep.',
  },
  {
    id: 'aac_home_restroom',
    labelAr: 'دورة مياه',
    labelEn: 'Restroom',
    icon: 'DoorClosed',
    category: 'home',
    spokenTextAr: 'أحتاج إلى استخدام دورة المياه من فضلكم.',
    spokenTextEn: 'I need to use the restroom, please.',
  },
  {
    id: 'aac_home_clean',
    labelAr: 'تنظيف',
    labelEn: 'Clean',
    icon: 'Sparkles',
    category: 'home',
    spokenTextAr: 'أحتاج إلى غسل وتطهير هذا الشيء.',
    spokenTextEn: 'I need to wash and clean this.',
  },
  {
    id: 'aac_home_family',
    labelAr: 'عائلتي',
    labelEn: 'Family',
    icon: 'Users',
    category: 'home',
    spokenTextAr: 'أريد التحدث مع عائلتي.',
    spokenTextEn: 'I want to speak with my family.',
  },

  // ─── Food & Drink ───────────────────────────────────────────
  {
    id: 'aac_day_water',
    labelAr: 'ماء',
    labelEn: 'Water',
    icon: 'Droplet',
    category: 'food_and_drink',
    spokenTextAr: 'أريد أن أشرب ماء بارداً.',
    spokenTextEn: 'I want water to drink.',
  },
  {
    id: 'aac_day_food',
    labelAr: 'طعام',
    labelEn: 'Food',
    icon: 'Utensils',
    category: 'food_and_drink',
    spokenTextAr: 'أنا جائع وأريد طعاماً.',
    spokenTextEn: 'I am hungry and would like food.',
  },
  {
    id: 'aac_food_hot_drink',
    labelAr: 'شاي / قهوة',
    labelEn: 'Hot Drink',
    icon: 'Coffee',
    category: 'food_and_drink',
    spokenTextAr: 'أود تناول مشروب ساخن.',
    spokenTextEn: 'I would like a hot beverage.',
  },
  {
    id: 'aac_food_full',
    labelAr: 'شبعت',
    labelEn: 'Full / Satisfied',
    icon: 'CheckCircle',
    category: 'food_and_drink',
    spokenTextAr: 'شكراً، لقد شبعت واكتفيت من الطعام.',
    spokenTextEn: 'Thank you, I am full and satisfied.',
  },

  // ─── Emotions & Feelings ────────────────────────────────────
  {
    id: 'aac_emo_happy',
    labelAr: 'سعيد',
    labelEn: 'Happy',
    icon: 'Smile',
    category: 'emotions',
    spokenTextAr: 'أشعر بالسعادة والراحة اليوم.',
    spokenTextEn: 'I feel happy and content today.',
  },
  {
    id: 'aac_emo_tired',
    labelAr: 'متعب',
    labelEn: 'Tired',
    icon: 'BatteryLow',
    category: 'emotions',
    spokenTextAr: 'أشعر بالإرهاق والتعب.',
    spokenTextEn: 'I feel exhausted and fatigued.',
  },
  {
    id: 'aac_emo_anxious',
    labelAr: 'قلق / متوتر',
    labelEn: 'Anxious',
    icon: 'AlertCircle',
    category: 'emotions',
    spokenTextAr: 'أشعر ببعض القلق والتوتر الآن.',
    spokenTextEn: 'I feel somewhat anxious and uneasy right now.',
  },
  {
    id: 'aac_emo_calm',
    labelAr: 'مطمئن / هادئ',
    labelEn: 'Calm',
    icon: 'Heart',
    category: 'emotions',
    spokenTextAr: 'أنا هادئ ومطمئن تماماً.',
    spokenTextEn: 'I am feeling calm and peaceful.',
  },

  // ─── Social Communication ───────────────────────────────────
  {
    id: 'aac_day_yes',
    labelAr: 'نعم',
    labelEn: 'Yes',
    icon: 'Check',
    category: 'social_communication',
    spokenTextAr: 'نعم، أوافق على ذلك.',
    spokenTextEn: 'Yes, I agree.',
  },
  {
    id: 'aac_day_no',
    labelAr: 'لا',
    labelEn: 'No',
    icon: 'X',
    category: 'social_communication',
    spokenTextAr: 'لا، لا أرغب بذلك.',
    spokenTextEn: 'No, thank you.',
  },
  {
    id: 'aac_day_thanks',
    labelAr: 'شكراً',
    labelEn: 'Thank You',
    icon: 'Heart',
    category: 'social_communication',
    spokenTextAr: 'شكراً جزيلاً لكم على مساعدتكم.',
    spokenTextEn: 'Thank you very much for your help.',
  },
  {
    id: 'aac_soc_aac_notice',
    labelAr: 'لوحة تواصل',
    labelEn: 'I Use AAC',
    icon: 'MessageSquare',
    category: 'social_communication',
    spokenTextAr: 'أنا أستخدم لوحة تواصل مساعدة للتحدث، يرجى التمهل ومنحي بعض الوقت.',
    spokenTextEn: 'I use an AAC communication board to speak, please bear with me and give me a moment.',
  },
  {
    id: 'aac_soc_pardon',
    labelAr: 'عفواً / كرر',
    labelEn: 'Pardon / Repeat',
    icon: 'RotateCcw',
    category: 'social_communication',
    spokenTextAr: 'من فضلك، هل يمكنك تكرار ما قلت بهدوء؟',
    spokenTextEn: 'Could you please repeat what you said slowly?',
  },

  // ─── Transportation ─────────────────────────────────────────
  {
    id: 'aac_trans_car',
    labelAr: 'سيارة / تاكسي',
    labelEn: 'Car / Taxi',
    icon: 'Car',
    category: 'transportation',
    spokenTextAr: 'أحتاج إلى ركوب سيارة أو تاكسي.',
    spokenTextEn: 'I need to take a car or taxi.',
  },
  {
    id: 'aac_trans_bus',
    labelAr: 'حافلة / باص',
    labelEn: 'Bus',
    icon: 'Bus',
    category: 'transportation',
    spokenTextAr: 'أين محطة الحافلات القادمة؟',
    spokenTextEn: 'Where is the next bus stop?',
  },
  {
    id: 'aac_trans_stop',
    labelAr: 'توقف هنا',
    labelEn: 'Stop Here',
    icon: 'Octagon',
    category: 'transportation',
    spokenTextAr: 'من فضلك توقف هنا على جانب الطريق.',
    spokenTextEn: 'Please pull over and stop here.',
  },

  // ─── School & Learning ──────────────────────────────────────
  {
    id: 'aac_acad_question',
    labelAr: 'سؤال',
    labelEn: 'Question',
    icon: 'HelpCircle',
    category: 'school',
    spokenTextAr: 'لدي سؤال من فضلك يا معلمي.',
    spokenTextEn: 'I have a question, please.',
  },
  {
    id: 'aac_acad_understand',
    labelAr: 'فهمت',
    labelEn: 'Understood',
    icon: 'CheckCircle',
    category: 'school',
    spokenTextAr: 'نعم، لقد فهمت الشرح جيداً.',
    spokenTextEn: 'Yes, I understand the explanation.',
  },
  {
    id: 'aac_acad_repeat',
    labelAr: 'أعد الشرح',
    labelEn: 'Repeat Lesson',
    icon: 'RotateCcw',
    category: 'school',
    spokenTextAr: 'هل يمكن إعادة شرح النقطة السابقة؟',
    spokenTextEn: 'Could you please repeat that point?',
  },
  {
    id: 'aac_acad_book',
    labelAr: 'كتاب / دفتر',
    labelEn: 'Book / Notebook',
    icon: 'BookOpen',
    category: 'school',
    spokenTextAr: 'أحتاج إلى فتح الكتاب ومتابعة الدرس.',
    spokenTextEn: 'I need to open the book and follow the lesson.',
  },

  // ─── Work & Professional ────────────────────────────────────
  {
    id: 'aac_work_meeting',
    labelAr: 'اجتماع عمل',
    labelEn: 'Meeting',
    icon: 'Users',
    category: 'work',
    spokenTextAr: 'حان موعد الاجتماع المهني المقرر.',
    spokenTextEn: 'It is time for the scheduled professional meeting.',
  },
  {
    id: 'aac_work_computer',
    labelAr: 'حاسوب / بريد',
    labelEn: 'Computer / Email',
    icon: 'Laptop',
    category: 'work',
    spokenTextAr: 'سأرسل لك الرد عبر البريد الإلكتروني.',
    spokenTextEn: 'I will send you the response via email.',
  },
  {
    id: 'aac_work_break',
    labelAr: 'استراحة عمل',
    labelEn: 'Work Break',
    icon: 'Coffee',
    category: 'work',
    spokenTextAr: 'أحتاج إلى استراحة عمل قصيرة لمدة 10 دقائق.',
    spokenTextEn: 'I need a short 10-minute work break.',
  },
];

export const DEFAULT_QUICK_RESPONSES = [
  { textAr: 'نعم، بالتأكيد.', textEn: 'Yes, definitely.' },
  { textAr: 'لا، شكراً لك.', textEn: 'No, thank you.' },
  { textAr: 'شكراً جزيلاً.', textEn: 'Thank you very much.' },
  { textAr: 'أنا أستخدم لوحة تواصل مساعدة للتعبير عن نفسي.', textEn: 'I use an assistive AAC board to express myself.' },
  { textAr: 'أرجو الانتظار لحظة واحدة.', textEn: 'Please wait one moment.' },
  { textAr: 'أحتاج إلى مساعدة عاجلة.', textEn: 'I need urgent assistance.' },
];

export class PersonalAacEngine {
  private symbols: AacSymbol[] = [];
  private currentSentence: AacSymbol[] = [];
  private manualSentenceTextAr: string = '';
  private manualSentenceTextEn: string = '';
  private boards: AacBoard[] = [];
  private activeBoardId: string = 'board_standard';
  private categoryOrder: AacCategory[] = [];
  private favoritePhrases: { textAr: string; textEn: string; category: string }[] = [];
  private preferences: AacPreferences;
  private switchEngine: SwitchScanningEngine;
  private listeners: Set<AacSentenceListener> = new Set();

  constructor() {
    this.preferences = {
      speechRate: 0.95,
      speechPitch: 1.0,
      preferredVoiceId: null,
      textSize: 'large',
      highContrastMode: false,
      confirmBeforeSpeaking: true, // Ethical safety guard
      switchScanningEnabled: false,
      switchScanSpeedMs: 1500,
      switchScanMode: 'auto',
    };

    this.switchEngine = new SwitchScanningEngine(this.preferences.switchScanSpeedMs);
    this.initializeDefaultState();
    this.loadFromStorage();
  }

  private initializeDefaultState(): void {
    this.symbols = [...DEFAULT_AAC_SYMBOLS];
    this.categoryOrder = DEFAULT_CATEGORY_METADATA.map((c) => c.id);

    this.boards = [
      {
        id: 'board_standard',
        nameAr: 'لوحة التواصل الشاملة الأساسية',
        nameEn: 'Standard Comprehensive Board',
        descriptionAr: 'تحتوي على كافة فئات التواصل اليومي والطوارئ والرعاية والعمل',
        descriptionEn: 'Full set of daily, emergency, healthcare, and work categories',
        categoryOrder: [...this.categoryOrder],
        symbolIds: this.symbols.map((s) => s.id),
        isDefault: true,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
      {
        id: 'board_emergency_medical',
        nameAr: 'لوحة الطوارئ والصحة السريعة',
        nameEn: 'Emergency & Medical Quick Board',
        descriptionAr: 'لوحة مخصصة للحالات الحرجة والتواصل مع الأطباء والمستشفيات',
        descriptionEn: 'Dedicated board for urgent medical and emergency encounters',
        categoryOrder: ['emergencies', 'healthcare', 'emotions'],
        symbolIds: this.symbols
          .filter((s) => s.category === 'emergencies' || s.category === 'healthcare' || s.category === 'emotions')
          .map((s) => s.id),
        isDefault: false,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ];

    this.favoritePhrases = [...DEFAULT_QUICK_RESPONSES.map((q) => ({ ...q, category: 'social_communication' }))];
  }

  // ─── Persistence & Recovery ───────────────────────────────────────────
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      // 1. Custom Symbols
      const storedCustom = localStorage.getItem('rafiqi_custom_aac_symbols');
      if (storedCustom) {
        const parsed = JSON.parse(storedCustom);
        if (Array.isArray(parsed)) {
          // Merge custom symbols avoiding duplicates
          for (const item of parsed) {
            if (!this.symbols.some((s) => s.id === item.id)) {
              this.symbols.push(item);
            }
          }
        }
      }

      // 2. Boards
      const storedBoards = localStorage.getItem('rafiqi_aac_personal_boards_v2');
      if (storedBoards) {
        const parsedBoards = JSON.parse(storedBoards);
        if (Array.isArray(parsedBoards) && parsedBoards.length > 0) {
          this.boards = parsedBoards;
        }
      }

      // 3. Category Order
      const storedCatOrder = localStorage.getItem('rafiqi_aac_category_order');
      if (storedCatOrder) {
        const parsedOrder = JSON.parse(storedCatOrder);
        if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
          this.categoryOrder = parsedOrder;
        }
      }

      // 4. Preferences
      const storedPrefs = localStorage.getItem('rafiqi_aac_user_preferences');
      if (storedPrefs) {
        const parsedPrefs = JSON.parse(storedPrefs);
        this.preferences = { ...this.preferences, ...parsedPrefs };
        this.switchEngine.setScanSpeed(this.preferences.switchScanSpeedMs);
      }

      // 5. Favorite Phrases
      const storedFavorites = localStorage.getItem('rafiqi_aac_favorite_phrases');
      if (storedFavorites) {
        const parsedFavs = JSON.parse(storedFavorites);
        if (Array.isArray(parsedFavs)) {
          this.favoritePhrases = parsedFavs;
        }
      }
    } catch (e) {
      console.warn('[PersonalAacEngine] Error loading stored AAC state, restoring factory defaults safely:', e);
      this.initializeDefaultState();
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const customOnly = this.symbols.filter((s) => s.id.startsWith('aac_custom_'));
      localStorage.setItem('rafiqi_custom_aac_symbols', JSON.stringify(customOnly));
      localStorage.setItem('rafiqi_aac_personal_boards_v2', JSON.stringify(this.boards));
      localStorage.setItem('rafiqi_aac_category_order', JSON.stringify(this.categoryOrder));
      localStorage.setItem('rafiqi_aac_user_preferences', JSON.stringify(this.preferences));
      localStorage.setItem('rafiqi_aac_favorite_phrases', JSON.stringify(this.favoritePhrases));
    } catch {
      // ignore quota errors
    }
  }

  // ─── Category Mapping & Backward Compatibility ────────────────────────
  private normalizeCategoryQuery(category?: AacCategory): string[] {
    if (!category) return [];
    // Legacy aliases support:
    switch (category) {
      case 'emergency':
        return ['emergency', 'emergencies'];
      case 'medical':
        return ['medical', 'healthcare'];
      case 'daily':
        return ['daily', 'home', 'food_and_drink'];
      case 'academic':
        return ['academic', 'school'];
      case 'emergencies':
        return ['emergencies', 'emergency'];
      case 'healthcare':
        return ['healthcare', 'medical'];
      case 'school':
        return ['school', 'academic'];
      default:
        return [category];
    }
  }

  public getSymbols(category?: AacCategory): AacSymbol[] {
    if (!category) return [...this.symbols];
    const matchingCategories = this.normalizeCategoryQuery(category);
    return this.symbols.filter((s) => matchingCategories.includes(s.category));
  }

  public getCategories(): AacCategory[] {
    // Return unique combination of current categories + legacy identifiers for test compatibility
    const current = [...this.categoryOrder];
    const legacy = ['emergency', 'medical', 'daily', 'academic'];
    return Array.from(new Set([...current, ...legacy]));
  }

  public getCategoryMetadataCatalog(): CategoryMetadata[] {
    return DEFAULT_CATEGORY_METADATA.slice().sort((a, b) => {
      const idxA = this.categoryOrder.indexOf(a.id);
      const idxB = this.categoryOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }

  public reorderCategories(newOrder: AacCategory[]): void {
    if (!Array.isArray(newOrder) || newOrder.length === 0) return;
    this.categoryOrder = [...newOrder];
    this.saveToStorage();
  }

  // ─── Custom Symbol Authoring ──────────────────────────────────────────
  public addCustomSymbol(symbol: Omit<AacSymbol, 'id'>): AacSymbol {
    const newSymbol: AacSymbol = {
      ...symbol,
      id: `aac_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      isCustom: true,
      usageCount: 0,
    };
    this.symbols.push(newSymbol);

    // Also link to active board if not already present
    const activeBoard = this.getActiveBoard();
    if (activeBoard && !activeBoard.symbolIds.includes(newSymbol.id)) {
      activeBoard.symbolIds.push(newSymbol.id);
      activeBoard.updatedAt = Date.now();
    }

    this.saveToStorage();
    return newSymbol;
  }

  public editSymbol(symbolId: string, updates: Partial<Omit<AacSymbol, 'id'>>): boolean {
    const sym = this.symbols.find((s) => s.id === symbolId);
    if (!sym) return false;
    Object.assign(sym, updates);
    this.saveToStorage();
    return true;
  }

  public deleteCustomSymbol(symbolId: string): boolean {
    if (!symbolId.startsWith('aac_custom_')) return false; // Prevent deleting core life-safety symbols
    this.symbols = this.symbols.filter((s) => s.id !== symbolId);
    for (const b of this.boards) {
      b.symbolIds = b.symbolIds.filter((id) => id !== symbolId);
    }
    this.saveToStorage();
    return true;
  }

  // ─── Personal Board Management ────────────────────────────────────────
  public getBoards(): AacBoard[] {
    return [...this.boards];
  }

  public getActiveBoard(): AacBoard {
    return this.boards.find((b) => b.id === this.activeBoardId) || this.boards[0];
  }

  public setActiveBoard(boardId: string): boolean {
    const exists = this.boards.some((b) => b.id === boardId);
    if (exists) {
      this.activeBoardId = boardId;
      return true;
    }
    return false;
  }

  public createBoard(
    nameAr: string,
    nameEn: string,
    categoryOrder?: AacCategory[],
    initialSymbolIds?: string[]
  ): AacBoard {
    const newBoard: AacBoard = {
      id: `board_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nameAr: nameAr.trim() || 'لوحة تواصل مخصصة',
      nameEn: nameEn.trim() || 'Custom AAC Board',
      categoryOrder: categoryOrder && categoryOrder.length > 0 ? categoryOrder : [...this.categoryOrder],
      symbolIds: initialSymbolIds || this.symbols.map((s) => s.id),
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.boards.push(newBoard);
    this.saveToStorage();
    return newBoard;
  }

  public updateBoard(board: AacBoard): boolean {
    const index = this.boards.findIndex((b) => b.id === board.id);
    if (index === -1) return false;
    this.boards[index] = { ...board, updatedAt: Date.now() };
    this.saveToStorage();
    return true;
  }

  public deleteBoard(boardId: string): boolean {
    if (this.boards.length <= 1) return false; // Cannot delete last board
    const target = this.boards.find((b) => b.id === boardId);
    if (!target || target.isDefault) return false; // Protect default board
    this.boards = this.boards.filter((b) => b.id !== boardId);
    if (this.activeBoardId === boardId) {
      this.activeBoardId = this.boards[0].id;
    }
    this.saveToStorage();
    return true;
  }

  // ─── Sentence Composition & Builder ───────────────────────────────────
  public addSymbolToSentence(symbol: AacSymbol): AacSentence {
    this.currentSentence.push(symbol);
    this.manualSentenceTextAr = '';
    this.manualSentenceTextEn = '';
    const result = this.getCurrentSentence();
    this.notify();
    return result;
  }

  public removeSymbolFromSentence(index: number): AacSentence {
    if (index >= 0 && index < this.currentSentence.length) {
      this.currentSentence.splice(index, 1);
    }
    this.manualSentenceTextAr = '';
    this.manualSentenceTextEn = '';
    const result = this.getCurrentSentence();
    this.notify();
    return result;
  }

  public clearSentence(): void {
    this.currentSentence = [];
    this.manualSentenceTextAr = '';
    this.manualSentenceTextEn = '';
    this.notify();
  }

  public updateSentenceText(textAr: string, textEn: string): void {
    this.manualSentenceTextAr = textAr;
    this.manualSentenceTextEn = textEn;
    this.notify();
  }

  public getCurrentSentence(): AacSentence {
    const textAr =
      this.manualSentenceTextAr.trim() ||
      this.currentSentence.map((s) => s.spokenTextAr || s.labelAr).join(' ');
    const textEn =
      this.manualSentenceTextEn.trim() ||
      this.currentSentence.map((s) => s.spokenTextEn || s.labelEn).join(' ');

    return {
      symbols: [...this.currentSentence],
      textAr,
      textEn,
    };
  }

  public subscribeSentence(listener: AacSentenceListener): () => void {
    this.listeners.add(listener);
    listener(this.getCurrentSentence());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const sentence = this.getCurrentSentence();
    this.listeners.forEach((l) => l(sentence));
  }

  // ─── Text-to-Speech & Confirmation Guard ──────────────────────────────
  /**
   * Speaks the current sentence.
   * Enforces ethical invariant:
   * "Never automatically send or speak a message without user confirmation when it could materially change the intended meaning."
   * Returns true if spoken, false if blocked by confirmation requirement.
   */
  public speakCurrentSentence(
    dialect: Dialect = 'Arabic',
    options?: { confirmedByUser?: boolean; speechRate?: number; voiceId?: string }
  ): boolean {
    const sentence = this.getCurrentSentence();
    const text = dialect === 'English' ? sentence.textEn : sentence.textAr;
    if (!text.trim()) return false;

    // Ethical confirmation check:
    // If the sentence was manually modified or contains emergency alerts, and confirmBeforeSpeaking is active,
    // require explicit confirmedByUser flag.
    const isAltered = this.manualSentenceTextAr.trim().length > 0;
    const isEmergency = this.currentSentence.some((s) => s.category === 'emergencies' || s.category === 'emergency');
    if (this.preferences.confirmBeforeSpeaking && (isAltered || isEmergency) && !options?.confirmedByUser) {
      console.warn('[PersonalAacEngine] Confirmation required before speaking altered or critical emergency text.');
      return false;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = dialect === 'Egyptian Ammiya' ? 'ar-EG' : dialect === 'Arabic' ? 'ar-SA' : 'en-US';
        utterance.rate = options?.speechRate || this.preferences.speechRate || 0.95;
        utterance.pitch = this.preferences.speechPitch || 1.0;

        if (options?.voiceId || this.preferences.preferredVoiceId) {
          const targetId = options?.voiceId || this.preferences.preferredVoiceId;
          const voices = window.speechSynthesis.getVoices();
          const match = voices.find((v) => v.voiceURI === targetId || v.name === targetId);
          if (match) utterance.voice = match;
        }

        window.speechSynthesis.speak(utterance);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  public speakSymbol(symbol: AacSymbol, dialect: Dialect = 'Arabic'): void {
    const text = dialect === 'English' ? symbol.spokenTextEn : symbol.spokenTextAr;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = dialect === 'Egyptian Ammiya' ? 'ar-EG' : dialect === 'Arabic' ? 'ar-SA' : 'en-US';
        utterance.rate = this.preferences.speechRate || 0.95;
        utterance.pitch = this.preferences.speechPitch || 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {
        // ignore
      }
    }
  }

  // ─── Favorite Phrases & Shortcuts ────────────────────────────────────
  public getFavoritePhrases(): { textAr: string; textEn: string; category: string }[] {
    return [...this.favoritePhrases];
  }

  public addFavoritePhrase(textAr: string, textEn: string, category: string = 'social_communication'): void {
    if (!textAr.trim()) return;
    const exists = this.favoritePhrases.some((p) => p.textAr === textAr.trim());
    if (!exists) {
      this.favoritePhrases.push({
        textAr: textAr.trim(),
        textEn: textEn.trim() || textAr.trim(),
        category,
      });
      this.saveToStorage();
    }
  }

  public removeFavoritePhrase(textAr: string): void {
    this.favoritePhrases = this.favoritePhrases.filter((p) => p.textAr !== textAr);
    this.saveToStorage();
  }

  // ─── Switch Scanning Engine Access ────────────────────────────────────
  public getSwitchScanningEngine(): SwitchScanningEngine {
    return this.switchEngine;
  }

  // ─── Preferences ──────────────────────────────────────────────────────
  public getPreferences(): AacPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(partial: Partial<AacPreferences>): AacPreferences {
    this.preferences = { ...this.preferences, ...partial };
    if (partial.switchScanSpeedMs !== undefined) {
      this.switchEngine.setScanSpeed(partial.switchScanSpeedMs);
    }
    this.saveToStorage();
    return this.getPreferences();
  }

  // ─── Data Export / Import & Privacy Controls ──────────────────────────
  public exportData(): AacExportPayload {
    return {
      version: '1.0',
      exportedAt: Date.now(),
      boards: [...this.boards],
      customSymbols: this.symbols.filter((s) => s.id.startsWith('aac_custom_')),
      favoritePhrases: [...this.favoritePhrases],
      categoryOrder: [...this.categoryOrder],
      preferences: { ...this.preferences },
    };
  }

  public importData(payload: AacExportPayload): { success: boolean; error?: string } {
    if (!payload || payload.version !== '1.0' || !Array.isArray(payload.boards)) {
      return { success: false, error: 'Invalid AAC data schema. Required version 1.0 with valid boards array.' };
    }

    try {
      if (payload.boards.length > 0) {
        this.boards = payload.boards;
      }
      if (Array.isArray(payload.customSymbols)) {
        for (const sym of payload.customSymbols) {
          if (!this.symbols.some((s) => s.id === sym.id)) {
            this.symbols.push(sym);
          }
        }
      }
      if (Array.isArray(payload.favoritePhrases)) {
        this.favoritePhrases = payload.favoritePhrases;
      }
      if (Array.isArray(payload.categoryOrder) && payload.categoryOrder.length > 0) {
        this.categoryOrder = payload.categoryOrder;
      }
      if (payload.preferences) {
        this.preferences = { ...this.preferences, ...payload.preferences };
      }

      this.saveToStorage();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to parse import payload.' };
    }
  }

  public clearAllLocalData(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('rafiqi_custom_aac_symbols');
        localStorage.removeItem('rafiqi_aac_personal_boards_v2');
        localStorage.removeItem('rafiqi_aac_category_order');
        localStorage.removeItem('rafiqi_aac_user_preferences');
        localStorage.removeItem('rafiqi_aac_favorite_phrases');
      } catch {
        // ignore
      }
    }
    this.initializeDefaultState();
  }

  // ─── Offline Capability Audit ─────────────────────────────────────────
  public getOfflineCapabilities(): OfflineAacAuditReport {
    return {
      isFullyOfflineCapable: true,
      boardStorageOffline: true,
      symbolNavigationOffline: true,
      sentenceCompositionOffline: true,
      ttsOfflineStatus: 'native_os_voices_supported_offline',
      ttsOfflineExplanationAr:
        'تعمل لوحات التواصل، وتأليف الجمل، وحفظ البيانات محلياً بلا إنترنت بنسبة 100%. أما تحويل النص إلى كلام (TTS) فيعمل بلا إنترنت فقط للأصوات المثبتة محلياً على نظام التشغيل (مثل Windows SAPI / OneCore أو أصوات الأجهزة)، بينما تتطلب أصوات الويب السحابية اتصالاً بالإنترنت.',
      ttsOfflineExplanationEn:
        'Communication boards, sentence building, and local persistence operate 100% offline. Text-to-Speech operates offline exclusively when local OS voices (e.g. SAPI/OneCore) are installed; cloud-synthesized voices require active internet connectivity.',
    };
  }
}
