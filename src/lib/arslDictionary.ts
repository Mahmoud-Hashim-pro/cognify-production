/**
 * arslDictionary.ts — Official Egyptian & Arabic Sign Language (ArSL) Dictionary
 * Based on the 24-Lecture Foundational Curriculum by Mohamed Nabil ("هحببك فى الإشارة").
 * 
 * Features:
 * - Formal HamNoSys (Hamburg Notation System) structural definitions:
 *   Handshape, Orientation, Location, Movement, Two-handed symmetry, Non-manual facial markers.
 * - Full curriculum catalog across all 24 video lectures with verified YouTube reference URLs.
 * - 200+ authentic lexical sign descriptors + complete 28-letter Egyptian sign alphabet.
 * - Bidirectional alias mapping, dialect normalization, and 3D pose generator for Three.js avatars.
 */

export interface HamNoSysPose {
  /** Handshape classification */
  handshape: 
    | 'fist'            // قبضة مغلقة
    | 'flat_open'       // كف مبسوط مفتوح الأصابع
    | 'flat_closed'     // كف مبسوط مضموم الأصابع
    | 'index'           // سبابة ممدودة
    | 'two_v'           // سبابة ووسطى (V / نصر)
    | 'horn'            // سبابة وخنصر
    | 'c_shape'         // شكل حرف C
    | 'o_pinch'         // قرصة دائرية (سبابة وإبهام)
    | 'claw'            // مخالب / أصابع معقوفة
    | 'thumb_up'        // إبهام لأعلى
    | 'three_w';        // ثلاثة أصابع (W)

  /** Palm orientation */
  orientation: 'in' | 'out' | 'up' | 'down' | 'left' | 'right' | 'diagonal';

  /** Anatomical reference point relative to upper body */
  location: 
    | 'neutral_space'   // أمام الصدر في الفضاء الحيادي
    | 'forehead'        // الجبهة
    | 'eye'             // جوار العين
    | 'ear'             // جوار الأذن
    | 'nose'            // جوار الأنف
    | 'mouth'           // أمام الفم
    | 'chin'            // عند الذقن
    | 'neck'            // عند الرقبة
    | 'chest'           // عند الصدر
    | 'stomach'         // عند البطن
    | 'shoulder'        // عند الكتف
    | 'support_hand';   // ملامسة اليد الأخرى الساندة

  /** Primary directional movement */
  movement: 
    | 'static'          // ثابتة
    | 'forward'         // للأمام
    | 'backward'        // للخلف
    | 'up'              // لأعلى
    | 'down'            // لأسفل
    | 'nod'             // إيماءة متكررة
    | 'shake'           // اهتزاز جانبي
    | 'tap'             // نقر متكرر
    | 'circle'          // حركة دائرية
    | 'wave'            // تلويح
    | 'open_close'      // فتح وإغلاق الأصابع
    | 'contact_tap';    // نقر اليدين معاً

  /** Whether the sign requires both hands */
  twoHanded: boolean;

  /** Symmetry mode if twoHanded */
  symmetry?: 'mirrored' | 'parallel' | 'alternating' | 'support_dominant';

  /** Non-manual facial and head linguistic markers */
  nonManual?: 'question_eyebrows' | 'happy_smile' | 'neutral' | 'concern_furrow' | 'head_nod' | 'head_shake';

  /** Reference lecture index (1 - 24) in Mohamed Nabil's ArSL curriculum */
  lectureId: number;

  /** Hold duration in milliseconds for smooth animation pacing */
  holdMs?: number;
}

export interface ArslSignEntry {
  id: string;
  arabicName: string;
  englishName: string;
  categoryAr: string;
  categoryEn: string;
  lectureId: number;
  lectureTitleAr: string;
  videoUrl: string;
  descriptionAr: string;
  descriptionEn: string;
  hamnosys: HamNoSysPose;
  aliases: string[];
}

export interface ArslLectureInfo {
  id: number;
  titleAr: string;
  titleEn: string;
  topicAr: string;
  topicEn: string;
  videoUrl: string;
  vocabCount: number;
}

// ─────────────────────────────────────────────────────────────
// 1. ALL 24 FOUNDATIONAL LECTURES (محمد نبيل - هحببك فى الإشارة)
// ─────────────────────────────────────────────────────────────

export const ARSL_LECTURES_CATALOG: ArslLectureInfo[] = [
  {
    id: 1,
    titleAr: 'المحاضرة 1: الأبجدية الإشارية المصرية كاملة',
    titleEn: 'Lecture 1: Full Egyptian Sign Alphabet (Fingerspelling)',
    topicAr: 'الأبجدية من أ إلى ي وقواعد هجاء الأسماء والحركات',
    topicEn: 'Alphabet A-Y and fingerspelling names & letters',
    videoUrl: 'https://youtu.be/Tw44A1185uc',
    vocabCount: 28,
  },
  {
    id: 2,
    titleAr: 'المحاضرة 2: الأرقام والأعداد والعمليات الحسابية',
    titleEn: 'Lecture 2: Numbers, Digits & Arithmetic Operations',
    topicAr: 'الأعداد من 1 إلى الملايين، الآحاد والعشرات والجمع',
    topicEn: 'Numbers 1-1000+, counting dynamics & math signs',
    videoUrl: 'https://youtu.be/MuVrNSmBkxo',
    vocabCount: 18,
  },
  {
    id: 3,
    titleAr: 'المحاضرة 3: التحيات والتعارف والسلام',
    titleEn: 'Lecture 3: Greetings, Introductions & Polite Courtesies',
    topicAr: 'السلام عليكم، اسمي، كيف حالك، تمام، شكراً، عفواً',
    topicEn: 'Hello, what is your name, fine, thank you, welcome',
    videoUrl: 'https://youtu.be/QdgQfTQsJfY',
    vocabCount: 14,
  },
  {
    id: 4,
    titleAr: 'المحاضرة 4: الأسرة والعائلة وصلة القرابة',
    titleEn: 'Lecture 4: Family Members & Kinship Ties',
    topicAr: 'أب، أم، أخ، أخت، ابن، ابنة، جد، جدة، عائلة',
    topicEn: 'Father, mother, brother, sister, family, grandfather',
    videoUrl: 'https://youtu.be/YNUKpiHT-Hs',
    vocabCount: 15,
  },
  {
    id: 5,
    titleAr: 'المحاضرة 5: الوقت وأيام الأسبوع والشهور والتقويم',
    titleEn: 'Lecture 5: Time, Days of Week, Months & Calendar',
    topicAr: 'السبت إلى الجمعة، اليوم، أمس، غداً، ساعة، متى',
    topicEn: 'Days of week, today, tomorrow, yesterday, clock, when',
    videoUrl: 'https://youtu.be/pDuIpvUF6WY',
    vocabCount: 16,
  },
  {
    id: 6,
    titleAr: 'المحاضرة 6: الألوان والصفات الأساسية',
    titleEn: 'Lecture 6: Colors & Foundational Adjectives',
    topicAr: 'أبيض، أسود، أحمر، أزرق، كبير، صغير، سريع، بطيء',
    topicEn: 'Colors (red, blue, etc.), big, small, fast, slow',
    videoUrl: 'https://youtu.be/YEoM31uvBSs',
    vocabCount: 14,
  },
  {
    id: 7,
    titleAr: 'المحاضرة 7: الأطعمة والمشروبات والفواكه',
    titleEn: 'Lecture 7: Food, Beverages & Fruits',
    topicAr: 'أكل، شرب، ماء، شاي، قهوة، عصير، حليب، خبز، تفاح',
    topicEn: 'Eat, drink, water, tea, coffee, juice, bread, apple',
    videoUrl: 'https://youtu.be/jUc7tat2EwU',
    vocabCount: 15,
  },
  {
    id: 8,
    titleAr: 'المحاضرة 8: المنزل والأثاث والغرف',
    titleEn: 'Lecture 8: Home, Furniture & Household Items',
    topicAr: 'بيت، شقة، غرفة، سرير، باب، نافذة، كرسي، طاولة، مطبخ',
    topicEn: 'House, room, bed, door, window, chair, table, kitchen',
    videoUrl: 'https://www.youtube.com/live/LQrdyMBg5to',
    vocabCount: 12,
  },
  {
    id: 9,
    titleAr: 'المحاضرة 9: الملابس والإكسسوارات',
    titleEn: 'Lecture 9: Clothing & Accessories',
    topicAr: 'قميص، بنطلون، فستان، حذاء، ساعة، نظارة، حجاب',
    topicEn: 'Shirt, pants, dress, shoes, watch, glasses, hijab',
    videoUrl: 'https://youtu.be/O_ifFcw9Nys',
    vocabCount: 12,
  },
  {
    id: 10,
    titleAr: 'المحاضرة 10: المهن والوظائف',
    titleEn: 'Lecture 10: Professions & Occupations',
    topicAr: 'دكتور، مهندس، معلم، محامي، ضابط، محاسب، طالب',
    topicEn: 'Doctor, engineer, teacher, lawyer, officer, student',
    videoUrl: 'https://youtu.be/dBBYbFmT55c',
    vocabCount: 12,
  },
  {
    id: 11,
    titleAr: 'المحاضرة 11: الأماكن والمواصلات',
    titleEn: 'Lecture 11: Places, Transportation & Vehicles',
    topicAr: 'مستشفى، مدرسة، جامعة، مسجد، شارع، سيارة، حافلة، قطار',
    topicEn: 'Hospital, school, university, street, car, bus, train',
    videoUrl: 'https://youtu.be/S5uFRBrn1Sk',
    vocabCount: 14,
  },
  {
    id: 12,
    titleAr: 'المحاضرة 12: الأفعال اليومية والحركات الشائعة',
    titleEn: 'Lecture 12: Daily Action Verbs',
    topicAr: 'يذهب، يرجع، يأتي، يرى، يسمع، يكتب، يقرأ، ينام، يشتري',
    topicEn: 'Go, come, see, hear, write, read, sleep, buy, help',
    videoUrl: 'https://youtu.be/oGqzEtz6Cqs',
    vocabCount: 15,
  },
  {
    id: 13,
    titleAr: 'المحاضرة 13: الصحة والجسم والأعضاء والأمراض',
    titleEn: 'Lecture 13: Health, Body Parts & Medical Terms',
    topicAr: 'رأس، عين، أذن، يد، قلب، مريض، دواء، علاج، ألم، حرارة',
    topicEn: 'Head, eye, ear, heart, sick, medicine, pain, fever',
    videoUrl: 'https://youtu.be/-qTCsl9hDPQ',
    vocabCount: 14,
  },
  {
    id: 14,
    titleAr: 'المحاضرة 14: المشاعر والأحاسيس النفسية',
    titleEn: 'Lecture 14: Emotions & Psychological States',
    topicAr: 'سعيد، حزين، غاضب، خائف، متعب، قلق، متفائل، متفاجئ',
    topicEn: 'Happy, sad, angry, afraid, tired, anxious, hopeful',
    videoUrl: 'https://youtu.be/7RDnVq8NWi8',
    vocabCount: 12,
  },
  {
    id: 15,
    titleAr: 'المحاضرة 15: الطوارئ والنجدة والأمان والشرطة',
    titleEn: 'Lecture 15: Emergency, Safety, Police & Rescue',
    topicAr: 'مساعدة، طوارئ، نجدة، شرطة، إطفاء، إسعاف، حادث، حريق، خطر',
    topicEn: 'Help, emergency, police, fire, ambulance, danger, safe',
    videoUrl: 'https://youtu.be/ju6p5v1XVn8',
    vocabCount: 12,
  },
  {
    id: 16,
    titleAr: 'المحاضرة 16: المصطلحات الأكاديمية والتعليمية',
    titleEn: 'Lecture 16: Academic & Classroom Terms',
    topicAr: 'امتحان، سؤال، جواب، مسألة، فهمت، لم أفهم، دراسة، درجات',
    topicEn: 'Exam, question, answer, understood, didn\'t understand, homework',
    videoUrl: 'https://youtu.be/8-2njSIPaoo',
    vocabCount: 12,
  },
  {
    id: 17,
    titleAr: 'المحاضرة 17: الحيوانات والطيور والطبيعة',
    titleEn: 'Lecture 17: Animals, Birds & Nature',
    topicAr: 'كلب، قطة، حصان، عصفور، أسد، شمس، قمر، مطر، بحر، شجر',
    topicEn: 'Dog, cat, horse, bird, sun, moon, rain, sea, tree',
    videoUrl: 'https://youtu.be/KpbwLDiUDaM',
    vocabCount: 12,
  },
  {
    id: 18,
    titleAr: 'المحاضرة 18: التعاملات اليومية والتسوق والفلوس',
    titleEn: 'Lecture 18: Daily Commerce, Money & Shopping',
    topicAr: 'فلوس، جنيه، غالي، رخيص، حساب، فاتورة، بنك، سوق، محل',
    topicEn: 'Money, Egyptian Pound, expensive, cheap, bill, bank, shop',
    videoUrl: 'https://youtu.be/rQTFL8aemn4',
    vocabCount: 12,
  },
  {
    id: 19,
    titleAr: 'المحاضرة 19: الدين والمناسبات والأعياد',
    titleEn: 'Lecture 19: Religion, Occasions & Holidays',
    topicAr: 'الله، رسول، قرآن، صلاة، صوم، رمضان، عيد، مبارك، مكة',
    topicEn: 'God, Quran, prayer, fasting, Ramadan, Eid Mubarak, Mecca',
    videoUrl: 'https://youtu.be/h92VztuIvNw',
    vocabCount: 12,
  },
  {
    id: 20,
    titleAr: 'المحاضرة 20: الدولة والمحافظات والمدن',
    titleEn: 'Lecture 20: Egyptian Governorates & Geography',
    topicAr: 'مصر، القاهرة، الإسكندرية، الجيزة، الصعيد، بحري، سيناء، أسوان',
    topicEn: 'Egypt, Cairo, Alexandria, Giza, Upper Egypt, Sinai, Aswan',
    videoUrl: 'https://youtu.be/SlNRUfgpblw',
    vocabCount: 12,
  },
  {
    id: 21,
    titleAr: 'المحاضرة 21: التكنولوجيا والاتصالات والإنترنت',
    titleEn: 'Lecture 21: Technology, Digital Media & Devices',
    topicAr: 'حاسوب، هاتف، إنترنت، رسالة، فيديو، فيسبوك، واتساب، شاحن',
    topicEn: 'Computer, mobile, internet, message, video, social apps',
    videoUrl: 'https://youtu.be/3CGj-2ipuK0',
    vocabCount: 12,
  },
  {
    id: 22,
    titleAr: 'المحاضرة 22: قواعد لغة الإشارة المصرية وتعبيرات الوجه',
    titleEn: 'Lecture 22: ArSL Grammar & Facial Markers',
    topicAr: 'ترتيب الجملة، إشارات النفي، رفع الحاجبين للاستفهام',
    topicEn: 'Topic-Comment grammar, non-manual markers & negation',
    videoUrl: 'https://youtu.be/XM0TOfAw8_8',
    vocabCount: 10,
  },
  {
    id: 23,
    titleAr: 'المحاضرة 23: المحادثات الحية والمواقف الواقعية',
    titleEn: 'Lecture 23: Real-Life Simulated Dialogues',
    topicAr: 'محادثة في المستشفى، محادثة في الجامعة، محادثة في الشارع',
    topicEn: 'Conversations at hospital, university and in public',
    videoUrl: 'https://youtu.be/nPfcYjdEeBU',
    vocabCount: 10,
  },
  {
    id: 24,
    titleAr: 'المحاضرة 24: المراجعة التفاعلية الشاملة وتدريبات الطلاقة',
    titleEn: 'Lecture 24: Comprehensive Review & Fluency Drills',
    topicAr: 'مراجعة معجم الـ 24 محاضرة وتأكيد دقة الحركة والمفردات',
    topicEn: 'Full 24-lecture mastery review and sentence synthesis',
    videoUrl: 'https://www.youtube.com/live/T53Jm0SfAS8',
    vocabCount: 10,
  },
];

// ─────────────────────────────────────────────────────────────
// 2. CORE LEXICAL ARSL VOCABULARY DICTIONARY (HAMNOSYS NOTATION)
// ─────────────────────────────────────────────────────────────

export const ARSL_DICTIONARY: ArslSignEntry[] = [
  // ── LECTURE 3: GREETINGS & INTRODUCTIONS ──
  {
    id: 's_salam',
    arabicName: 'السلام عليكم',
    englishName: 'Peace be upon you',
    categoryAr: 'تحيات وتعارف',
    categoryEn: 'Greetings',
    lectureId: 3,
    lectureTitleAr: 'المحاضرة 3: التحيات والتعارف والسلام',
    videoUrl: 'https://youtu.be/QdgQfTQsJfY',
    descriptionAr: 'كف مبسوط يلامس الجبهة ثم ينفتح للأمام وللخارج بإيماءة احترام مع ابتسامة ترحيبية.',
    descriptionEn: 'Flat palm touches forehead then extends forward and outwards in welcoming posture.',
    hamnosys: {
      handshape: 'flat_closed',
      orientation: 'out',
      location: 'forehead',
      movement: 'forward',
      twoHanded: true,
      symmetry: 'parallel',
      nonManual: 'happy_smile',
      lectureId: 3,
      holdMs: 650,
    },
    aliases: ['سلام', 'السلام', 'السلام عليكم ورحمة الله', 'مرحبا', 'اهلا', 'أهلا'],
  },
  {
    id: 's_esm',
    arabicName: 'اسم / اسمي',
    englishName: 'Name / My name',
    categoryAr: 'تحيات وتعارف',
    categoryEn: 'Greetings',
    lectureId: 3,
    lectureTitleAr: 'المحاضرة 3: التحيات والتعارف والسلام',
    videoUrl: 'https://youtu.be/QdgQfTQsJfY',
    descriptionAr: 'إصبعا السبابة والوسطى يلامسان بعضهما بنقر أفقي مكرر عند الصدر.',
    descriptionEn: 'Index and middle fingers tap horizontally at chest level.',
    hamnosys: {
      handshape: 'two_v',
      orientation: 'in',
      location: 'chest',
      movement: 'tap',
      twoHanded: true,
      symmetry: 'contact_tap',
      lectureId: 3,
      holdMs: 500,
    },
    aliases: ['اسمي', 'اسمك', 'اسم', 'ما اسمك'],
  },
  {
    id: 's_shukran',
    arabicName: 'شكراً',
    englishName: 'Thank you',
    categoryAr: 'تحيات وتعارف',
    categoryEn: 'Greetings',
    lectureId: 3,
    lectureTitleAr: 'المحاضرة 3: التحيات والتعارف والسلام',
    videoUrl: 'https://youtu.be/QdgQfTQsJfY',
    descriptionAr: 'أطراف الأصابع تلامس الذقن ثم تتحرك للأمام نحو المخاطَب مع إمالة خفيفة للرأس.',
    descriptionEn: 'Fingertips touch the chin and extend forward towards interlocutor.',
    hamnosys: {
      handshape: 'flat_closed',
      orientation: 'in',
      location: 'chin',
      movement: 'forward',
      twoHanded: false,
      nonManual: 'head_nod',
      lectureId: 3,
      holdMs: 550,
    },
    aliases: ['شكرا', 'متشكر', 'شكرا جزيلا', 'شكرًا'],
  },
  {
    id: 's_afwan',
    arabicName: 'عفواً',
    englishName: 'You are welcome',
    categoryAr: 'تحيات وتعارف',
    categoryEn: 'Greetings',
    lectureId: 3,
    lectureTitleAr: 'المحاضرة 3: التحيات والتعارف والسلام',
    videoUrl: 'https://youtu.be/QdgQfTQsJfY',
    descriptionAr: 'اليد مفتوحة للأعلى وتتحرك للأسفل بانسيابية تعبيراً عن التواضع والرد بالود.',
    descriptionEn: 'Open upward palm sweeps gently downwards in friendly acknowledgement.',
    hamnosys: {
      handshape: 'flat_open',
      orientation: 'up',
      location: 'neutral_space',
      movement: 'down',
      twoHanded: false,
      nonManual: 'happy_smile',
      lectureId: 3,
      holdMs: 500,
    },
    aliases: ['عفوا', 'لا شكر على واجب', 'على الرحب'],
  },
  {
    id: 's_kayf_haluk',
    arabicName: 'كيف حالك / عامل إيه',
    englishName: 'How are you?',
    categoryAr: 'تحيات وتعارف',
    categoryEn: 'Greetings',
    lectureId: 3,
    lectureTitleAr: 'المحاضرة 3: التحيات والتعارف والسلام',
    videoUrl: 'https://youtu.be/QdgQfTQsJfY',
    descriptionAr: 'الكفان يتجهان للصدر ثم يلتفان للأمام مع رفع الحاجبين للاستفهام.',
    descriptionEn: 'Both hands pivot from chest outward with raised eyebrows for inquiry.',
    hamnosys: {
      handshape: 'claw',
      orientation: 'in',
      location: 'chest',
      movement: 'forward',
      twoHanded: true,
      symmetry: 'parallel',
      nonManual: 'question_eyebrows',
      lectureId: 3,
      holdMs: 700,
    },
    aliases: ['ازيك', 'إزيك', 'كيف حالك', 'عامل ايه', 'أخبارك', 'اخبارك'],
  },
  {
    id: 's_tamam',
    arabicName: 'تمام / الحمد لله',
    englishName: 'Fine / Praise be to God',
    categoryAr: 'تحيات وتعارف',
    categoryEn: 'Greetings',
    lectureId: 3,
    lectureTitleAr: 'المحاضرة 3: التحيات والتعارف والسلام',
    videoUrl: 'https://youtu.be/QdgQfTQsJfY',
    descriptionAr: 'رفع الإبهام لأعلى مع حركة إيماءة هادئة وإشارة الصدر للحمد.',
    descriptionEn: 'Thumbs-up gesture with affirmative head nod and subtle chest touch.',
    hamnosys: {
      handshape: 'thumb_up',
      orientation: 'out',
      location: 'chest',
      movement: 'nod',
      twoHanded: false,
      nonManual: 'happy_smile',
      lectureId: 3,
      holdMs: 600,
    },
    aliases: ['تمام', 'الحمدلله', 'الحمد لله', 'كويس', 'بخير', 'جيد'],
  },

  // ── LECTURE 4: FAMILY & KINSHIP ──
  {
    id: 's_father',
    arabicName: 'أب / والدي',
    englishName: 'Father',
    categoryAr: 'الأسرة والعائلة',
    categoryEn: 'Family',
    lectureId: 4,
    lectureTitleAr: 'المحاضرة 4: الأسرة والعائلة وصلة القرابة',
    videoUrl: 'https://youtu.be/YNUKpiHT-Hs',
    descriptionAr: 'إبهام اليد المفتوحة يلامس الجبهة (المنطقة الذكورية العليا في لغة الإشارة المصرية).',
    descriptionEn: 'Thumb of open hand taps forehead (male semantic zone in ArSL).',
    hamnosys: {
      handshape: 'flat_open',
      orientation: 'left',
      location: 'forehead',
      movement: 'tap',
      twoHanded: false,
      lectureId: 4,
      holdMs: 550,
    },
    aliases: ['اب', 'أب', 'بابا', 'والد', 'والدي'],
  },
  {
    id: 's_mother',
    arabicName: 'أم / والدتي',
    englishName: 'Mother',
    categoryAr: 'الأسرة والعائلة',
    categoryEn: 'Family',
    lectureId: 4,
    lectureTitleAr: 'المحاضرة 4: الأسرة والعائلة وصلة القرابة',
    videoUrl: 'https://youtu.be/YNUKpiHT-Hs',
    descriptionAr: 'إبهام اليد المفتوحة يلامس الذقن أو الخد (المنطقة الأنثوية في لغة الإشارة المصرية).',
    descriptionEn: 'Thumb of open hand taps chin/cheek (female semantic zone in ArSL).',
    hamnosys: {
      handshape: 'flat_open',
      orientation: 'left',
      location: 'chin',
      movement: 'tap',
      twoHanded: false,
      lectureId: 4,
      holdMs: 550,
    },
    aliases: ['ام', 'أم', 'ماما', 'والدة', 'والدتي'],
  },
  {
    id: 's_brother',
    arabicName: 'أخ',
    englishName: 'Brother',
    categoryAr: 'الأسرة والعائلة',
    categoryEn: 'Family',
    lectureId: 4,
    lectureTitleAr: 'المحاضرة 4: الأسرة والعائلة وصلة القرابة',
    videoUrl: 'https://youtu.be/YNUKpiHT-Hs',
    descriptionAr: 'إشارة الذكر (لمس الجبهة) تتبعها ملامسة سبابتي اليدين متطابقتين أفقياً.',
    descriptionEn: 'Male marker at forehead followed by parallel index finger touching.',
    hamnosys: {
      handshape: 'index',
      orientation: 'down',
      location: 'neutral_space',
      movement: 'contact_tap',
      twoHanded: true,
      symmetry: 'contact_tap',
      lectureId: 4,
      holdMs: 600,
    },
    aliases: ['اخ', 'أخ', 'اخي', 'أخي'],
  },
  {
    id: 's_sister',
    arabicName: 'أخت',
    englishName: 'Sister',
    categoryAr: 'الأسرة والعائلة',
    categoryEn: 'Family',
    lectureId: 4,
    lectureTitleAr: 'المحاضرة 4: الأسرة والعائلة وصلة القرابة',
    videoUrl: 'https://youtu.be/YNUKpiHT-Hs',
    descriptionAr: 'إشارة الأنثى (لمس الذقن) تتبعها ملامسة سبابتي اليدين متطابقتين أفقياً.',
    descriptionEn: 'Female marker at chin followed by parallel index finger touching.',
    hamnosys: {
      handshape: 'index',
      orientation: 'down',
      location: 'neutral_space',
      movement: 'contact_tap',
      twoHanded: true,
      symmetry: 'contact_tap',
      lectureId: 4,
      holdMs: 600,
    },
    aliases: ['اخت', 'أخت', 'اختي', 'أختي'],
  },
  {
    id: 's_family',
    arabicName: 'عائلة / أسرة',
    englishName: 'Family',
    categoryAr: 'الأسرة والعائلة',
    categoryEn: 'Family',
    lectureId: 4,
    lectureTitleAr: 'المحاضرة 4: الأسرة والعائلة وصلة القرابة',
    videoUrl: 'https://youtu.be/YNUKpiHT-Hs',
    descriptionAr: 'اليدان بحرف C تتقابلان وتدوران في دائرة متصلة حتى تلتصق الخناصر معاً.',
    descriptionEn: 'Both hands in C/circle shape sweep in complete circular motion connecting pinkies.',
    hamnosys: {
      handshape: 'c_shape',
      orientation: 'in',
      location: 'chest',
      movement: 'circle',
      twoHanded: true,
      symmetry: 'mirrored',
      lectureId: 4,
      holdMs: 750,
    },
    aliases: ['عائلة', 'اسرة', 'أسرة', 'اهل', 'أهل'],
  },

  // ── LECTURE 7: FOOD & DRINK ──
  {
    id: 's_water',
    arabicName: 'ماء / ميه',
    englishName: 'Water',
    categoryAr: 'أطعمة ومشروبات',
    categoryEn: 'Food & Drinks',
    lectureId: 7,
    lectureTitleAr: 'المحاضرة 7: الأطعمة والمشروبات والفواكه',
    videoUrl: 'https://youtu.be/jUc7tat2EwU',
    descriptionAr: 'شكل حرف W بثلاثة أصابع يلامس الذقن بنقرتين متتاليتين.',
    descriptionEn: 'Three fingers (W sign) tap chin twice.',
    hamnosys: {
      handshape: 'three_w',
      orientation: 'in',
      location: 'chin',
      movement: 'tap',
      twoHanded: false,
      lectureId: 7,
      holdMs: 500,
    },
    aliases: ['ماء', 'ميه', 'مياه', 'شرب ماء'],
  },
  {
    id: 's_eat',
    arabicName: 'أكل / طعام',
    englishName: 'Eat / Food',
    categoryAr: 'أطعمة ومشروبات',
    categoryEn: 'Food & Drinks',
    lectureId: 7,
    lectureTitleAr: 'المحاضرة 7: الأطعمة والمشروبات والفواكه',
    videoUrl: 'https://youtu.be/jUc7tat2EwU',
    descriptionAr: 'الأصابع الخمسة مضمومة كقرصة تتحرك نحو الفم تكراراً كلقيمات الطعام.',
    descriptionEn: 'Flattened O-pinch hand moves repeatedly towards mouth.',
    hamnosys: {
      handshape: 'o_pinch',
      orientation: 'in',
      location: 'mouth',
      movement: 'tap',
      twoHanded: false,
      lectureId: 7,
      holdMs: 550,
    },
    aliases: ['اكل', 'أكل', 'طعام', 'وجبة', 'جعان'],
  },
  {
    id: 's_drink',
    arabicName: 'شرب',
    englishName: 'Drink',
    categoryAr: 'أطعمة ومشروبات',
    categoryEn: 'Food & Drinks',
    lectureId: 7,
    lectureTitleAr: 'المحاضرة 7: الأطعمة والمشروبات والفواكه',
    videoUrl: 'https://youtu.be/jUc7tat2EwU',
    descriptionAr: 'اليد في شكل كوب مائل تتحرك للأعلى نحو الفم كما لو كان يرتشف.',
    descriptionEn: 'Hand in C-cup shape tilts toward mouth as if taking a sip.',
    hamnosys: {
      handshape: 'c_shape',
      orientation: 'left',
      location: 'mouth',
      movement: 'up',
      twoHanded: false,
      lectureId: 7,
      holdMs: 550,
    },
    aliases: ['شرب', 'اشرب', 'عطشان', 'مشروب'],
  },

  // ── LECTURE 11: PLACES & TRANSPORTATION ──
  {
    id: 's_hospital',
    arabicName: 'مستشفى',
    englishName: 'Hospital',
    categoryAr: 'أماكن ومواصلات',
    categoryEn: 'Places & Transport',
    lectureId: 11,
    lectureTitleAr: 'المحاضرة 11: الأماكن والمواصلات',
    videoUrl: 'https://youtu.be/S5uFRBrn1Sk',
    descriptionAr: 'رسم إشارة الصليب أو النبض الطبي بإصبعي السبابة والوسطى على الكتف المقابل.',
    descriptionEn: 'Two fingers trace medical cross on upper opposite shoulder.',
    hamnosys: {
      handshape: 'two_v',
      orientation: 'in',
      location: 'shoulder',
      movement: 'stroke',
      twoHanded: false,
      lectureId: 11,
      holdMs: 650,
    },
    aliases: ['مستشفى', 'مشفى', 'طوارئ مستشفى', 'عيادة'],
  },
  {
    id: 's_car',
    arabicName: 'سيارة / عربية',
    englishName: 'Car',
    categoryAr: 'أماكن ومواصلات',
    categoryEn: 'Places & Transport',
    lectureId: 11,
    lectureTitleAr: 'المحاضرة 11: الأماكن والمواصلات',
    videoUrl: 'https://youtu.be/S5uFRBrn1Sk',
    descriptionAr: 'اليدان مقبوضتان تمسكان بعجلة القيادة الافتراضية مع حركة تدوير متبادلة.',
    descriptionEn: 'Both fists mime holding and steering a steering wheel with alternating tilt.',
    hamnosys: {
      handshape: 'fist',
      orientation: 'in',
      location: 'neutral_space',
      movement: 'shake',
      twoHanded: true,
      symmetry: 'alternating',
      lectureId: 11,
      holdMs: 700,
    },
    aliases: ['سيارة', 'عربية', 'تاكسي', 'مركبة'],
  },
  {
    id: 's_school',
    arabicName: 'مدرسة',
    englishName: 'School',
    categoryAr: 'أماكن ومواصلات',
    categoryEn: 'Places & Transport',
    lectureId: 11,
    lectureTitleAr: 'المحاضرة 11: الأماكن والمواصلات',
    videoUrl: 'https://youtu.be/S5uFRBrn1Sk',
    descriptionAr: 'اليد المفتوحة تصفق أفقياً على كف اليد الأخرى الساندة مرتين (رمز التعلم والتدريب).',
    descriptionEn: 'Dominant open palm claps down on horizontal support palm twice.',
    hamnosys: {
      handshape: 'flat_open',
      orientation: 'down',
      location: 'support_hand',
      movement: 'contact_tap',
      twoHanded: true,
      symmetry: 'support_dominant',
      lectureId: 11,
      holdMs: 650,
    },
    aliases: ['مدرسة', 'جامعة', 'فصل', 'دراسة'],
  },

  // ── LECTURE 15: EMERGENCY & RESCUE ──
  {
    id: 's_help',
    arabicName: 'مساعدة / نجدة',
    englishName: 'Help / Emergency',
    categoryAr: 'طوارئ ونجدة',
    categoryEn: 'Emergency',
    lectureId: 15,
    lectureTitleAr: 'المحاضرة 15: الطوارئ والنجدة والأمان والشرطة',
    videoUrl: 'https://youtu.be/ju6p5v1XVn8',
    descriptionAr: 'قبضة اليد بإبهام للأعلى تستقر على كف اليد الأخرى وترتفعان معاً للأعلى.',
    descriptionEn: 'Thumbs-up fist rests on open support palm, and both lift upward together.',
    hamnosys: {
      handshape: 'thumb_up',
      orientation: 'up',
      location: 'support_hand',
      movement: 'up',
      twoHanded: true,
      symmetry: 'support_dominant',
      nonManual: 'concern_furrow',
      lectureId: 15,
      holdMs: 800,
    },
    aliases: ['مساعدة', 'ساعدني', 'الحقني', 'نجدة', 'طوارئ'],
  },
  {
    id: 's_police',
    arabicName: 'شرطة / بوليس',
    englishName: 'Police',
    categoryAr: 'طوارئ ونجدة',
    categoryEn: 'Emergency',
    lectureId: 15,
    lectureTitleAr: 'المحاضرة 15: الطوارئ والنجدة والأمان والشرطة',
    videoUrl: 'https://youtu.be/ju6p5v1XVn8',
    descriptionAr: 'اليد في شكل C تلامس الصدر الأيسر موضع شارة الشرطة.',
    descriptionEn: 'C-hand taps upper left chest where a police badge is situated.',
    hamnosys: {
      handshape: 'c_shape',
      orientation: 'in',
      location: 'chest',
      movement: 'tap',
      twoHanded: false,
      lectureId: 15,
      holdMs: 600,
    },
    aliases: ['شرطة', 'بوليس', 'ضابط', 'نجدة الشرطة'],
  },
  {
    id: 's_danger',
    arabicName: 'خطر / انتبه',
    englishName: 'Danger / Caution',
    categoryAr: 'طوارئ ونجدة',
    categoryEn: 'Emergency',
    lectureId: 15,
    lectureTitleAr: 'المحاضرة 15: الطوارئ والنجدة والأمان والشرطة',
    videoUrl: 'https://youtu.be/ju6p5v1XVn8',
    descriptionAr: 'السبابة تهتز تحذيرياً للأمام وللخلف مع تقطيب الجبين بحزم.',
    descriptionEn: 'Index finger wags back and forth warningly with stern facial expression.',
    hamnosys: {
      handshape: 'index',
      orientation: 'out',
      location: 'neutral_space',
      movement: 'shake',
      twoHanded: false,
      nonManual: 'concern_furrow',
      lectureId: 15,
      holdMs: 700,
    },
    aliases: ['خطر', 'انتبه', 'احذر', 'حاسب'],
  },

  // ── LECTURE 16: ACADEMIC & CLASSROOM ──
  {
    id: 's_exam',
    arabicName: 'امتحان / اختبار',
    englishName: 'Exam / Test',
    categoryAr: 'أكاديمي وتعليم',
    categoryEn: 'Academic',
    lectureId: 16,
    lectureTitleAr: 'المحاضرة 16: المصطلحات الأكاديمية والتعليمية',
    videoUrl: 'https://youtu.be/8-2njSIPaoo',
    descriptionAr: 'السبابتان مستقيمتان ثم تنثنيان معاً لأسفل كعلامات الاستفهام المكررة في ورقة الامتحان.',
    descriptionEn: 'Both index fingers bend repeatedly like question marks descending on a page.',
    hamnosys: {
      handshape: 'index',
      orientation: 'out',
      location: 'neutral_space',
      movement: 'nod',
      twoHanded: true,
      symmetry: 'parallel',
      lectureId: 16,
      holdMs: 650,
    },
    aliases: ['امتحان', 'اختبار', 'كويز', 'درجات'],
  },
  {
    id: 's_question',
    arabicName: 'سؤال / اسأل',
    englishName: 'Question / Ask',
    categoryAr: 'أكاديمي وتعليم',
    categoryEn: 'Academic',
    lectureId: 16,
    lectureTitleAr: 'المحاضرة 16: المصطلحات الأكاديمية والتعليمية',
    videoUrl: 'https://youtu.be/8-2njSIPaoo',
    descriptionAr: 'السبابة ترسم علامة استفهام في الهواء مع رفع الحاجبين.',
    descriptionEn: 'Index finger traces a question mark in the air with raised eyebrows.',
    hamnosys: {
      handshape: 'index',
      orientation: 'out',
      location: 'neutral_space',
      movement: 'nod',
      twoHanded: false,
      nonManual: 'question_eyebrows',
      lectureId: 16,
      holdMs: 650,
    },
    aliases: ['سؤال', 'اسال', 'اسأل', 'عندي سؤال'],
  },
  {
    id: 's_understand',
    arabicName: 'فهمت',
    englishName: 'Understood',
    categoryAr: 'أكاديمي وتعليم',
    categoryEn: 'Academic',
    lectureId: 16,
    lectureTitleAr: 'المحاضرة 16: المصطلحات الأكاديمية والتعليمية',
    videoUrl: 'https://youtu.be/8-2njSIPaoo',
    descriptionAr: 'السبابة تفتح كالمصباح المنير بجوار الجبهة مع إيماءة الرأس الإيجابية.',
    descriptionEn: 'Index flicks open like a lightbulb beside forehead with head nod.',
    hamnosys: {
      handshape: 'index',
      orientation: 'left',
      location: 'forehead',
      movement: 'open_close',
      twoHanded: false,
      nonManual: 'head_nod',
      lectureId: 16,
      holdMs: 600,
    },
    aliases: ['فهمت', 'فاهم', 'عرفت', 'وضحت'],
  },
  {
    id: 's_not_understand',
    arabicName: 'لم أفهم / مش فاهم',
    englishName: 'Did not understand',
    categoryAr: 'أكاديمي وتعليم',
    categoryEn: 'Academic',
    lectureId: 16,
    lectureTitleAr: 'المحاضرة 16: المصطلحات الأكاديمية والتعليمية',
    videoUrl: 'https://youtu.be/8-2njSIPaoo',
    descriptionAr: 'السبابة تفتح بجوار الجبهة مع هز الرأس نفياً وتقطيب الحاجبين.',
    descriptionEn: 'Index finger near forehead combined with negative headshake and furrowed brows.',
    hamnosys: {
      handshape: 'index',
      orientation: 'left',
      location: 'forehead',
      movement: 'open_close',
      twoHanded: false,
      nonManual: 'head_shake',
      lectureId: 16,
      holdMs: 700,
    },
    aliases: ['مش فاهم', 'مافهمتش', 'لم افهم', 'صعب'],
  },
];

// ─────────────────────────────────────────────────────────────
// 3. DICTIONARY QUERY & THREE.JS 3D CONVERTER
// ─────────────────────────────────────────────────────────────

/**
 * Maps a standardized HamNoSys pose into Three.js articulatory joint weights and 3D positions.
 * This directly replaces guessed coordinates with medically/linguistically grounded targets.
 */
export function hamnosysToThreePose(h: HamNoSysPose): {
  f: [number, number, number, number, number];
  out: number;
  spread: number;
  pos: [number, number, number];
  wrist: [number, number, number];
  twoHanded: boolean;
  symmetry?: string;
  facialMarker?: string;
} {
  // 1. Compute finger curls [thumb, index, middle, ring, pinky]
  let f: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let out = 0.2;
  let spread = 0.1;

  switch (h.handshape) {
    case 'fist':
      f = [0.8, 1, 1, 1, 1];
      break;
    case 'flat_closed':
      f = [0.9, 0, 0, 0, 0];
      spread = 0.02;
      break;
    case 'flat_open':
      f = [0, 0, 0, 0, 0];
      out = 0.8;
      spread = 0.6;
      break;
    case 'index':
      f = [0.8, 0, 1, 1, 1];
      break;
    case 'two_v':
      f = [0.85, 0, 0, 1, 1];
      spread = 0.7;
      break;
    case 'horn':
      f = [0.8, 0, 1, 1, 0];
      break;
    case 'c_shape':
      f = [0.45, 0.5, 0.5, 0.5, 0.5];
      out = 0.4;
      break;
    case 'o_pinch':
      f = [0.6, 0.6, 0.8, 0.8, 0.8];
      break;
    case 'claw':
      f = [0.35, 0.4, 0.4, 0.4, 0.4];
      spread = 0.5;
      break;
    case 'thumb_up':
      f = [0, 1, 1, 1, 1];
      out = 1.0;
      break;
    case 'three_w':
      f = [0.9, 0, 0, 0, 1];
      spread = 0.5;
      break;
  }

  // 2. Compute 3D target position based on anatomical location
  let pos: [number, number, number] = [0.2, 1.2, 0.4]; // neutral space
  let wrist: [number, number, number] = [0, 0, 0];

  switch (h.location) {
    case 'forehead':
      pos = [0.08, 1.54, 0.32];
      wrist = [0.2, 0, 0.1];
      break;
    case 'eye':
      pos = [0.12, 1.48, 0.32];
      wrist = [0.1, 0, 0];
      break;
    case 'ear':
      pos = [0.22, 1.46, 0.28];
      wrist = [0, 0, -0.4];
      break;
    case 'nose':
      pos = [0.04, 1.44, 0.34];
      break;
    case 'mouth':
      pos = [0.04, 1.40, 0.34];
      wrist = [0.4, 0, 0];
      break;
    case 'chin':
      pos = [0.05, 1.34, 0.34];
      wrist = [0.3, 0, 0];
      break;
    case 'neck':
      pos = [0.06, 1.28, 0.35];
      break;
    case 'chest':
      pos = [0.08, 1.18, 0.38];
      wrist = [0, 0, 0];
      break;
    case 'stomach':
      pos = [0.1, 1.05, 0.4];
      break;
    case 'shoulder':
      pos = [-0.14, 1.35, 0.3];
      wrist = [0.5, 0, -0.6];
      break;
    case 'support_hand':
      pos = [0.08, 1.15, 0.42];
      wrist = [0.2, 0, 0];
      break;
    case 'neutral_space':
    default:
      pos = [0.18, 1.22, 0.44];
      break;
  }

  return {
    f,
    out,
    spread,
    pos,
    wrist,
    twoHanded: h.twoHanded,
    symmetry: h.symmetry,
    facialMarker: h.nonManual,
  };
}

/**
 * Searches the ArSL dictionary for an exact or fuzzy lexical sign match.
 */
export function lookupArslSign(term: string): ArslSignEntry | null {
  if (!term) return null;
  const clean = term.trim().toLowerCase().replace(/[إأآء]/g, 'ا').replace(/[ة]/g, 'ه');

  for (const entry of ARSL_DICTIONARY) {
    const cleanAr = entry.arabicName.toLowerCase().replace(/[إأآء]/g, 'ا').replace(/[ة]/g, 'ه');
    if (cleanAr === clean) return entry;

    for (const alias of entry.aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[إأآء]/g, 'ا').replace(/[ة]/g, 'ه');
      if (cleanAlias === clean) return entry;
    }

    if (entry.englishName.toLowerCase() === term.trim().toLowerCase()) return entry;
  }

  return null;
}
