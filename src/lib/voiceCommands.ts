/**
 * Global voice command parser for Rafiqi (Egyptian Arabic first, English secondary).
 *
 * Maps short spoken utterances to app intents so a blind user can operate the
 * whole app by voice: open any vision tool, navigate, go back, read the screen,
 * repeat, stop, control speech speed, and trigger the emergency SOS.
 */

export type VisionToolTarget = 'scene' | 'read' | 'currency' | 'product' | 'color' | 'object' | 'face';

export type VoiceIntent =
  | { type: 'open_vision'; tool: VisionToolTarget }
  | { type: 'open_navigation' }
  | { type: 'open_daily_aids' }
  | { type: 'open_known_people' }
  | { type: 'go_back' }
  | { type: 'go_home' }
  | { type: 'read_screen' }
  | { type: 'repeat' }
  | { type: 'stop' }
  | { type: 'speech_rate'; direction: 'up' | 'down' }
  | { type: 'sos' }
  | { type: 'where_am_i' }
  | { type: 'whats_around' }
  | { type: 'street_name' }
  | { type: 'time' }
  | { type: 'date' }
  | { type: 'battery' }
  | { type: 'weather' }
  | { type: 'help' };

/** Normalize Arabic text for matching: strip diacritics/tatweel, unify alef/hamza/ya/taa marbuta. */
export function normalizeArabic(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));

/** Parse one spoken utterance into an intent. Returns null when nothing matches. */
export function parseVoiceCommand(rawText: string): VoiceIntent | null {
  const t = normalizeArabic(rawText);
  if (!t) return null;

  // Emergency first: must never be shadowed by another keyword.
  if (has(t, 'ساعدوني', 'ساعدني', 'النجده', 'نجده', 'طوارئ', 'استغاثه', 'انقذوني', 'انقذني', 'خطر', 'emergency', 'help me', 'sos')) {
    return { type: 'sos' };
  }

  if (has(t, 'وقف', 'قف', 'اسكت', 'بطل كلام', 'كفايه', 'stop', 'quiet', 'silence')) {
    return { type: 'stop' };
  }
  if (has(t, 'اعد', 'كرر', 'تاني', 'repeat', 'again', 'say again')) {
    return { type: 'repeat' };
  }

  // Speed control (also covers "علي الصوت"/"وطي الصوت" which web apps map to speech rate).
  if (has(t, 'علي الصوت', 'عالي الصوت', 'اسرع', 'بسرعه', 'سرعه اكتر', 'زود السرعه', 'faster', 'speed up', 'louder')) {
    return { type: 'speech_rate', direction: 'up' };
  }
  if (has(t, 'وطي الصوت', 'ابطء', 'ابطا', 'ببطء', 'قلل السرعه', 'slower', 'slow down', 'softer')) {
    return { type: 'speech_rate', direction: 'down' };
  }

  // Location awareness.
  if (has(t, 'انا فين', 'فين انا', 'مكاني', 'where am i')) return { type: 'where_am_i' };
  if (has(t, 'ايه حواليا', 'ايه اللي حواليا', 'حواليا ايه', 'حوالي', 'around me', "what's around")) return { type: 'whats_around' };
  if (has(t, 'اسم الشارع', 'الشارع اسمه ايه', 'شارع ايه', 'street name', 'what street')) return { type: 'street_name' };

  // Quick daily answers.
  if (has(t, 'الوقت', 'الساعه', 'الساعة', 'كام الساعه', 'what time')) return { type: 'time' };
  if (has(t, 'التاريخ', 'اليوم كام', 'النهارده', 'النهاردة', 'what date', 'what day')) return { type: 'date' };
  if (has(t, 'البطاريه', 'البطارية', 'الشحن', 'battery')) return { type: 'battery' };
  if (has(t, 'الطقس', 'الجو', 'درجه الحراره', 'weather')) return { type: 'weather' };

  // Navigation tools.
  if (has(t, 'تنقل', 'خدني', 'عايز اروح', 'عايزه اروح', 'طريق', 'مشي', 'navigate', 'navigation', 'directions', 'walk')) {
    return { type: 'open_navigation' };
  }
  if (has(t, 'تذكير', 'دوايا', 'الدوا', 'منبه', 'مواعيد', 'reminder', 'medicine reminder', 'alarm')) {
    return { type: 'open_daily_aids' };
  }
  if (has(t, 'مين ده', 'مين دي', 'مين قدامي', 'عرف مين', 'اشخاص', 'who is this', 'people')) {
    return { type: 'open_known_people' };
  }

  // Vision tools.
  if (has(t, 'العمله', 'عمله', 'الفلوس', 'فلوس', 'الورقه دي بكام', 'بكام', 'currency', 'money', 'banknote', 'cash')) {
    return { type: 'open_vision', tool: 'currency' };
  }
  if (has(t, 'باركود', 'المنتج', 'منتج', 'العلبه', 'barcode', 'product')) {
    return { type: 'open_vision', tool: 'product' };
  }
  if (has(t, 'اقرايلي', 'اقرا', 'اقرالي', 'قراءه', 'النص', 'نص', 'read text', 'read this', 'read')) {
    return { type: 'open_vision', tool: 'read' };
  }
  if (has(t, 'اللون', 'لون', 'color', 'colour')) {
    return { type: 'open_vision', tool: 'color' };
  }
  if (has(t, 'لاقيلي', 'دورلي', 'فين ال', 'find', 'locate')) {
    return { type: 'open_vision', tool: 'object' };
  }
  if (has(t, 'الكاميرا', 'وصف المشهد', 'شوفلي', 'شوف', 'اوصف', 'اللي قدامي', 'قدامي ايه', 'camera', 'describe', 'scene', 'see')) {
    return { type: 'open_vision', tool: 'scene' };
  }

  // App navigation.
  if (has(t, 'ارجع', 'رجوع', 'ورا', 'go back', 'back')) return { type: 'go_back' };
  if (has(t, 'الرئيسيه', 'البيت', 'home', 'main screen')) return { type: 'go_home' };
  if (has(t, 'اقرا الشاشه', 'الشاشه', 'read screen', 'read the screen', 'screen')) return { type: 'read_screen' };

  if (has(t, 'مساعده', 'الاوامر', 'ايه الاوامر', 'help', 'commands')) return { type: 'help' };

  return null;
}

/** Spoken cheat-sheet of the available commands. */
export function voiceCommandsHelp(isArabic: boolean): string {
  return isArabic
    ? 'تقدر تقول: افتح الكاميرا، اقرالي نص، العملة دي بكام، الباركود، تنقل، أنا فين، إيه حواليا، اسم الشارع، الوقت، الطقس، تذكيراتي، ارجع، اقرا الشاشة، اعد، وقف، وأسرع أو أبطئ الصوت. وللطوارئ قول ساعدوني.'
    : 'You can say: open the camera, read text, what banknote is this, barcode, navigate, where am I, what is around me, street name, time, weather, my reminders, go back, read the screen, repeat, stop, faster or slower speech. For an emergency say help me.';
}
