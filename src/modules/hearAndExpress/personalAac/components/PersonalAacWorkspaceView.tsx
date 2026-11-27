import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  Trash2,
  Edit3,
  Download,
  Upload,
  Settings,
  Sliders,
  Check,
  X,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Home,
  Utensils,
  Smile,
  MessageSquare,
  Bus,
  GraduationCap,
  Briefcase,
  Layers,
  Heart,
  ArrowRight,
  ArrowLeft,
  Keyboard,
  Info,
} from 'lucide-react';
import {
  PersonalAacEngine,
  DEFAULT_CATEGORY_METADATA,
} from '../aacEngine';
import type {
  AacCategory,
  AacBoard,
  AacPreferences,
  CategoryMetadata,
} from '../types';
import type { AacSymbol, Dialect } from '../../types';

interface PersonalAacWorkspaceViewProps {
  isArabic?: boolean;
}

export const PersonalAacWorkspaceView: React.FC<PersonalAacWorkspaceViewProps> = ({
  isArabic = true,
}) => {
  const engineRef = useRef<PersonalAacEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new PersonalAacEngine();
  }
  const engine = engineRef.current;

  // ─── Reactive State ────────────────────────────────────────────────────────
  const [activeBoard, setActiveBoard] = useState<AacBoard>(engine.getActiveBoard());
  const [allBoards, setAllBoards] = useState<AacBoard[]>(engine.getBoards());
  const [selectedCategory, setSelectedCategory] = useState<AacCategory>('emergencies');
  const [categoryCatalog, setCategoryCatalog] = useState<CategoryMetadata[]>(
    engine.getCategoryMetadataCatalog()
  );
  const [symbols, setSymbols] = useState<AacSymbol[]>(engine.getSymbols('emergencies'));
  const [sentenceSymbols, setSentenceSymbols] = useState<AacSymbol[]>([]);
  const [sentenceText, setSentenceText] = useState<string>('');
  const [preferences, setPreferences] = useState<AacPreferences>(engine.getPreferences());
  const [favoritePhrases, setFavoritePhrases] = useState(engine.getFavoritePhrases());

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const [scanGroup, setScanGroup] = useState<'categories' | 'symbols' | 'sentence_bar'>('categories');

  // Modals & Panels
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showAddSymbolModal, setShowAddSymbolModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [confirmSpeakDialogOpen, setConfirmSpeakDialogOpen] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Form Inputs
  const [newBoardNameAr, setNewBoardNameAr] = useState('');
  const [newBoardNameEn, setNewBoardNameEn] = useState('');
  const [newSymLabelAr, setNewSymLabelAr] = useState('');
  const [newSymLabelEn, setNewSymLabelEn] = useState('');
  const [newSymSpokenAr, setNewSymSpokenAr] = useState('');
  const [newSymSpokenEn, setNewSymSpokenEn] = useState('');
  const [newSymCategory, setNewSymCategory] = useState<AacCategory>('home');

  // Subscribe to sentence builder changes
  useEffect(() => {
    const unsub = engine.subscribeSentence((sent) => {
      setSentenceSymbols(sent.symbols);
      setSentenceText(isArabic ? sent.textAr : sent.textEn);
    });
    return () => unsub();
  }, [isArabic, engine]);

  // Update symbols when category or board changes
  useEffect(() => {
    const syms = engine.getSymbols(selectedCategory);
    setSymbols(syms);
    if (isScanning && scanGroup === 'symbols') {
      engine.getSwitchScanningEngine().setTargetCount(syms.length, 'symbols');
    }
  }, [selectedCategory, activeBoard, isScanning, scanGroup, engine]);

  // Subscribe to Switch Scanner
  useEffect(() => {
    const switchEngine = engine.getSwitchScanningEngine();
    const unsub = switchEngine.subscribe((st) => {
      setIsScanning(st.isActive);
      setScanIndex(st.currentElementIndex);
      setScanGroup(st.activeGroup);
    });

    switchEngine.setOnSelectCallback((group, idx) => {
      if (group === 'categories') {
        const cat = categoryCatalog[idx];
        if (cat) {
          setSelectedCategory(cat.id);
          switchEngine.setTargetCount(engine.getSymbols(cat.id).length, 'symbols');
          setLiveAnnouncement(isArabic ? `تم اختيار فئة: ${cat.labelAr}` : `Selected category: ${cat.labelEn}`);
        }
      } else if (group === 'symbols') {
        const sym = symbols[idx];
        if (sym) {
          handleSelectSymbol(sym);
        }
      }
    });

    return () => unsub();
  }, [categoryCatalog, symbols, isArabic, engine]);

  // Keyboard shortcut listener for Switch Scanning emulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // don't hijack typing in inputs
      }

      if (e.code === 'Space') {
        e.preventDefault();
        engine.getSwitchScanningEngine().triggerSwitchStep();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        engine.getSwitchScanningEngine().triggerSwitchSelect();
      } else if (e.code === 'Escape') {
        handleClearSentence();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleSelectSymbol = (symbol: AacSymbol) => {
    engine.addSymbolToSentence(symbol);
    setLiveAnnouncement(
      isArabic
        ? `أُضيفت إشارة: ${symbol.labelAr}`
        : `Added symbol: ${symbol.labelEn}`
    );
  };

  const handleRemoveToken = (idx: number) => {
    engine.removeSymbolFromSentence(idx);
    setLiveAnnouncement(isArabic ? 'تم حذف العنصر' : 'Removed item');
  };

  const handleClearSentence = () => {
    engine.clearSentence();
    setLiveAnnouncement(isArabic ? 'تم مسح اللوحة' : 'Sentence cleared');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSentenceText(val);
    engine.updateSentenceText(isArabic ? val : '', isArabic ? '' : val);
  };

  const handleSpeak = (confirmed: boolean = false) => {
    const dialect: Dialect = isArabic ? 'Arabic' : 'English';
    const spoken = engine.speakCurrentSentence(dialect, {
      confirmedByUser: confirmed,
      speechRate: preferences.speechRate,
      voiceId: preferences.preferredVoiceId || undefined,
    });

    if (!spoken && preferences.confirmBeforeSpeaking) {
      setConfirmSpeakDialogOpen(true);
      return;
    }

    setLiveAnnouncement(isArabic ? 'جارٍ نطق الرسالة' : 'Speaking message');
    if (confirmSpeakDialogOpen) {
      setConfirmSpeakDialogOpen(false);
    }
  };

  const handleCreateBoard = () => {
    if (!newBoardNameAr.trim()) return;
    const b = engine.createBoard(newBoardNameAr, newBoardNameEn || newBoardNameAr);
    setAllBoards(engine.getBoards());
    setActiveBoard(b);
    engine.setActiveBoard(b.id);
    setShowNewBoardModal(false);
    setNewBoardNameAr('');
    setNewBoardNameEn('');
    setLiveAnnouncement(isArabic ? 'تم إنشاء اللوحة الجديدة' : 'Created new board');
  };

  const handleAddCustomSymbol = () => {
    if (!newSymLabelAr.trim()) return;
    const s = engine.addCustomSymbol({
      labelAr: newSymLabelAr,
      labelEn: newSymLabelEn || newSymLabelAr,
      spokenTextAr: newSymSpokenAr || newSymLabelAr,
      spokenTextEn: newSymSpokenEn || newSymLabelEn || newSymLabelAr,
      category: newSymCategory,
      icon: 'Sparkles',
    });
    setSymbols(engine.getSymbols(selectedCategory));
    setShowAddSymbolModal(false);
    setNewSymLabelAr('');
    setNewSymLabelEn('');
    setNewSymSpokenAr('');
    setNewSymSpokenEn('');
    setLiveAnnouncement(isArabic ? `تمت إضافة الرمز: ${s.labelAr}` : `Added symbol: ${s.labelEn}`);
  };

  const handleSaveFavorite = () => {
    if (!sentenceText.trim()) return;
    engine.addFavoritePhrase(sentenceText, sentenceText, selectedCategory as string);
    setFavoritePhrases(engine.getFavoritePhrases());
    setLiveAnnouncement(isArabic ? 'حُفظت في الرسائل المفضلة' : 'Saved to favorites');
  };

  const handleExportData = () => {
    const payload = engine.exportData();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `rafiqi_aac_boards_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const res = engine.importData(parsed);
        if (res.success) {
          setAllBoards(engine.getBoards());
          setActiveBoard(engine.getActiveBoard());
          setCategoryCatalog(engine.getCategoryMetadataCatalog());
          setSymbols(engine.getSymbols(selectedCategory));
          setFavoritePhrases(engine.getFavoritePhrases());
          setLiveAnnouncement(isArabic ? 'تم استيراد البيانات بنجاح' : 'Import successful');
        } else {
          alert(res.error);
        }
      } catch (err) {
        alert(isArabic ? 'ملف غير صالح' : 'Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  const toggleSwitchScan = () => {
    const switchEng = engine.getSwitchScanningEngine();
    if (isScanning) {
      switchEng.stopAutoScan();
    } else {
      switchEng.setTargetCount(categoryCatalog.length, 'categories');
      switchEng.startAutoScan();
    }
  };

  // Category Icon Resolver
  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'emergencies':
      case 'emergency':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'healthcare':
      case 'medical':
        return <HeartPulse className="w-5 h-5 text-rose-500" />;
      case 'home':
      case 'daily':
        return <Home className="w-5 h-5 text-blue-500" />;
      case 'food_and_drink':
        return <Utensils className="w-5 h-5 text-amber-500" />;
      case 'emotions':
        return <Smile className="w-5 h-5 text-yellow-500" />;
      case 'social_communication':
        return <MessageSquare className="w-5 h-5 text-emerald-500" />;
      case 'transportation':
        return <Bus className="w-5 h-5 text-indigo-500" />;
      case 'school':
      case 'academic':
        return <GraduationCap className="w-5 h-5 text-purple-500" />;
      case 'work':
        return <Briefcase className="w-5 h-5 text-teal-500" />;
      default:
        return <Layers className="w-5 h-5 text-gray-500" />;
    }
  };

  // Font sizing style mapping
  const getTextSizeClass = () => {
    switch (preferences.textSize) {
      case 'small':
        return 'text-sm';
      case 'medium':
        return 'text-base';
      case 'extra-large':
        return 'text-2xl font-bold';
      case 'large':
      default:
        return 'text-lg font-semibold';
    }
  };

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`min-h-screen p-4 sm:p-6 transition-colors duration-200 ${
        preferences.highContrastMode
          ? 'bg-black text-yellow-300'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
      }`}
    >
      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Top Header & Bar Selector */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            {isArabic ? 'نظام التواصل البديل والمعزز (AAC)' : 'Personal AAC Communication System'}
          </h1>
          <p className="text-sm opacity-80 mt-1">
            {isArabic
              ? 'لوحات تواصل شخصية مخصصة، تركيب جمل، نطق صوتي، ودعم الوصول الحركي المتقدم'
              : 'Customizable AAC boards, sentence composition, text-to-speech & motor access'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active Board Selector */}
          <select
            value={activeBoard.id}
            onChange={(e) => {
              const bId = e.target.value;
              engine.setActiveBoard(bId);
              setActiveBoard(engine.getActiveBoard());
              setLiveAnnouncement(isArabic ? 'تم تغيير اللوحة النشطة' : 'Active board switched');
            }}
            aria-label={isArabic ? 'اختر لوحة التواصل' : 'Select AAC Board'}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-indigo-500"
          >
            {allBoards.map((b) => (
              <option key={b.id} value={b.id}>
                {isArabic ? b.nameAr : b.nameEn}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNewBoardModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isArabic ? 'لوحة جديدة' : 'New Board'}
          </button>

          {/* Switch Scan Mode Toggle */}
          <button
            onClick={toggleSwitchScan}
            aria-pressed={isScanning}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
              isScanning
                ? 'bg-amber-500 text-black border-amber-600 font-bold shadow-md animate-pulse'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            {isScanning
              ? isArabic
                ? 'المسح التلقائي مفعل'
                : 'Scanning Active'
              : isArabic
              ? 'تفعيل المسح (مفتاح)'
              : 'Enable Switch Scan'}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            aria-label={isArabic ? 'إعدادات الوصول والصوت' : 'Accessibility & Voice Settings'}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ─── Top Sentence Builder & Text Input Bar ────────────────────────── */}
      <section
        aria-label={isArabic ? 'شريط تركيب وقراءة الجملة' : 'Sentence Composition & Speech Bar'}
        className={`mb-6 p-4 rounded-2xl border transition-all ${
          preferences.highContrastMode
            ? 'border-yellow-400 bg-black'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider font-bold opacity-70">
            {isArabic ? 'الرسالة المجمعة / النص المقروء' : 'Composed Message / Spoken Text'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveFavorite}
              disabled={!sentenceText.trim()}
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 disabled:opacity-40"
            >
              <Heart className="w-3.5 h-3.5" />
              {isArabic ? 'حفظ كمفضلة' : 'Save Favorite'}
            </button>
            <button
              onClick={handleClearSentence}
              disabled={sentenceSymbols.length === 0 && !sentenceText.trim()}
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isArabic ? 'مسح الكل (Esc)' : 'Clear (Esc)'}
            </button>
          </div>
        </div>

        {/* Visual Tokens Strip */}
        {sentenceSymbols.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
            {sentenceSymbols.map((sym, idx) => (
              <span
                key={`${sym.id}_${idx}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700 text-sm font-bold shadow-xs"
              >
                {sym.labelAr}
                <button
                  onClick={() => handleRemoveToken(idx)}
                  aria-label={isArabic ? `حذف ${sym.labelAr}` : `Remove ${sym.labelEn}`}
                  className="hover:text-red-600 transition-colors p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Editable Message Text Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <textarea
            rows={2}
            value={sentenceText}
            onChange={handleTextChange}
            placeholder={
              isArabic
                ? 'انقر على الرموز لتأليف الجملة، أو اكتب مباشرة هنا...'
                : 'Click symbols to construct sentence, or type directly here...'
            }
            aria-label={isArabic ? 'نص الرسالة للتعديل والنطق' : 'Message text to speak'}
            className={`flex-1 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none ${getTextSizeClass()}`}
          />

          {/* Large Speak Button */}
          <button
            onClick={() => handleSpeak(false)}
            disabled={!sentenceText.trim()}
            aria-label={isArabic ? 'انطق الرسالة صوتياً' : 'Speak Message Aloud'}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Volume2 className="w-6 h-6" />
            {isArabic ? 'انطق (Enter)' : 'Speak (Enter)'}
          </button>
        </div>
      </section>

      {/* ─── Category Selection Tabs (Large Touch Targets >= 56px) ────────── */}
      <nav aria-label={isArabic ? 'فئات لوحة التواصل' : 'AAC Board Categories'} className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider font-bold opacity-70">
            {isArabic ? 'الفئات الأساسية (9 فئات معتمدة)' : 'Default Categories (9 Approved)'}
          </span>
          <button
            onClick={() => setShowReorderModal(true)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            {isArabic ? 'إعادة ترتيب الفئات' : 'Reorder Categories'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {categoryCatalog.map((cat, idx) => {
            const isSelected = selectedCategory === cat.id;
            const isScanFocused = isScanning && scanGroup === 'categories' && scanIndex === idx;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                aria-selected={isSelected}
                className={`min-h-[48px] p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-center font-bold text-xs border transition-all ${
                  isScanFocused
                    ? 'ring-4 ring-yellow-400 scale-105 z-10 shadow-lg'
                    : ''
                } ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span className="truncate w-full">{isArabic ? cat.labelAr : cat.labelEn}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── Symbols Grid (Spacious Touch Targets >= 64px) ─────────────────── */}
      <main aria-label={isArabic ? 'رموز وبطاقات الفئة' : 'Category Symbol Cards'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {isArabic
                ? categoryCatalog.find((c) => c.id === selectedCategory)?.labelAr
                : categoryCatalog.find((c) => c.id === selectedCategory)?.labelEn}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 font-medium">
              {symbols.length} {isArabic ? 'رمز' : 'symbols'}
            </span>
          </div>

          <button
            onClick={() => setShowAddSymbolModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100"
          >
            <Plus className="w-3.5 h-3.5" />
            {isArabic ? 'إضافة بطاقة مخصصة' : 'Add Custom Symbol'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {symbols.map((sym, idx) => {
            const isScanFocused = isScanning && scanGroup === 'symbols' && scanIndex === idx;

            return (
              <div
                key={sym.id}
                className={`relative group rounded-2xl border p-3 flex flex-col justify-between items-center text-center transition-all bg-white dark:bg-slate-900 ${
                  isScanFocused
                    ? 'ring-4 ring-yellow-400 scale-105 z-10 shadow-xl'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md'
                }`}
              >
                {/* Main Card Click: Add to sentence */}
                <button
                  onClick={() => handleSelectSymbol(sym)}
                  className="w-full flex flex-col items-center gap-2 py-2 focus:outline-none"
                  aria-label={isArabic ? `إضافة ${sym.labelAr}` : `Add ${sym.labelEn}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    {getCategoryIcon(sym.category)}
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base leading-tight">
                      {isArabic ? sym.labelAr : sym.labelEn}
                    </div>
                    <div className="text-[11px] opacity-60 mt-0.5 line-clamp-1">
                      {isArabic ? sym.labelEn : sym.labelAr}
                    </div>
                  </div>
                </button>

                {/* Card Sub-actions: Speak immediately */}
                <div className="w-full pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      engine.speakSymbol(sym, isArabic ? 'Arabic' : 'English');
                    }}
                    aria-label={isArabic ? `نطق فوري لـ ${sym.labelAr}` : `Speak immediately`}
                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  {sym.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        engine.deleteCustomSymbol(sym.id);
                        setSymbols(engine.getSymbols(selectedCategory));
                      }}
                      aria-label={isArabic ? 'حذف البطاقة المخصصة' : 'Delete Custom Symbol'}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ─── Quick Phrases & Personal Shortcuts Drawer ─────────────────────── */}
      <section
        aria-label={isArabic ? 'الردود السريعة والعبارات الشائعة' : 'Quick Responses'}
        className="mt-8 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {isArabic ? 'الردود السريعة والعبارات المفضلة' : 'Quick Responses & Favorite Phrases'}
        </h2>

        <div className="flex flex-wrap gap-2">
          {favoritePhrases.map((phrase, i) => (
            <button
              key={i}
              onClick={() => {
                setSentenceText(isArabic ? phrase.textAr : phrase.textEn);
                engine.updateSentenceText(
                  isArabic ? phrase.textAr : '',
                  isArabic ? '' : phrase.textEn
                );
                engine.speakCurrentSentence(isArabic ? 'Arabic' : 'English', {
                  confirmedByUser: true,
                });
                setLiveAnnouncement(
                  isArabic ? `تم نطق: ${phrase.textAr}` : `Spoken: ${phrase.textEn}`
                );
              }}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-95"
            >
              {isArabic ? phrase.textAr : phrase.textEn}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Motor Switch Access Footnote & Offline Integrity Disclosure ─────── */}
      <footer className="mt-8 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs space-y-1">
        <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            {isArabic
              ? 'إفصاح إتاحة الوصول الحركي والعمل دون اتصال'
              : 'Motor Access & Offline Operational Disclosure'}
          </span>
        </div>
        <p className="text-blue-800 dark:text-blue-300/80 leading-relaxed">
          {isArabic
            ? 'يدعم النظام مفاتيح الوصول الحركية البرمجية عبر واجهات HID القياسية (مفتاح المسافة Space للمسح، ومفتاح الإدخال Enter للتأكيد). جميع اللوحات والرموز وحفظ البيانات تعمل دون إنترنت 100%. نطق الأصوات (TTS) يعتمد دون إنترنت على الأصوات المثبتة محلياً بنظام التشغيل.'
            : 'Supports software switch scanning via standard HID keyboard interfaces (Space for scan, Enter for select). All boards, symbols, and local storage operate 100% offline. Offline TTS relies strictly on locally installed OS speech synthesis voices.'}
        </p>
      </footer>

      {/* ─── Modal: Confirm Speak Before Speaking ──────────────────────────── */}
      {confirmSpeakDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold">
                {isArabic ? 'تأكيد نطق الرسالة' : 'Confirm Speaking Message'}
              </h3>
            </div>
            <p className="text-sm opacity-80 mb-4">
              {isArabic
                ? 'تحتوي الرسالة على تنبيه طارئ أو نص معدل يدوياً. نرجو مراجعة النص قبل إخراجه صوتياً منعاً لأي تغيير في المعنى المقصود:'
                : 'This message contains emergency alerts or modified text. Please confirm the exact wording before voicing aloud:'}
            </p>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 font-bold mb-6 text-sm">
              "{sentenceText}"
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmSpeakDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleSpeak(true)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md"
              >
                {isArabic ? 'تأكيد ونطق الآن' : 'Confirm & Speak Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Settings & Personalization ─────────────────────────────── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                {isArabic ? 'إعدادات الإتاحة وتخصيص الصوت' : 'Accessibility & Voice Settings'}
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Text Size */}
              <div>
                <label className="font-semibold block mb-1">
                  {isArabic ? 'حجم النص على البطاقات:' : 'Text Size on Cards:'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['small', 'medium', 'large', 'extra-large'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => {
                        const updated = engine.updatePreferences({ textSize: sz });
                        setPreferences(updated);
                      }}
                      className={`p-2 rounded-xl border text-xs font-bold capitalize ${
                        preferences.textSize === sz
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* High Contrast Mode */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold">
                  {isArabic ? 'وضع التباين العالي (High Contrast):' : 'High Contrast Mode:'}
                </span>
                <input
                  type="checkbox"
                  checked={preferences.highContrastMode}
                  onChange={(e) => {
                    const updated = engine.updatePreferences({ highContrastMode: e.target.checked });
                    setPreferences(updated);
                  }}
                  className="w-5 h-5 rounded text-indigo-600"
                />
              </div>

              {/* Confirm Before Speaking */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-semibold block">
                    {isArabic ? 'تأكيد الرسائل الحرجة قبل النطق:' : 'Confirm Critical Messages Before Speaking:'}
                  </span>
                  <span className="text-xs opacity-70">
                    {isArabic
                      ? 'يمنع النطق الخاطئ في نداءات الطوارئ والنصوص المعدلة'
                      : 'Prevents unintended transmission of modified messages'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.confirmBeforeSpeaking}
                  onChange={(e) => {
                    const updated = engine.updatePreferences({ confirmBeforeSpeaking: e.target.checked });
                    setPreferences(updated);
                  }}
                  className="w-5 h-5 rounded text-indigo-600"
                />
              </div>

              {/* Speech Rate */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between font-semibold mb-1">
                  <span>{isArabic ? 'سرعة النطق الصوتي:' : 'Speech Speed (Rate):'}</span>
                  <span>{preferences.speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={preferences.speechRate}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value);
                    const updated = engine.updatePreferences({ speechRate: rate });
                    setPreferences(updated);
                  }}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Switch Scan Speed */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between font-semibold mb-1">
                  <span>{isArabic ? 'سرعة المسح التلقائي للمفتاح:' : 'Switch Scan Interval:'}</span>
                  <span>{preferences.switchScanSpeedMs / 1000}s</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="3500"
                  step="250"
                  value={preferences.switchScanSpeedMs}
                  onChange={(e) => {
                    const speed = parseInt(e.target.value);
                    const updated = engine.updatePreferences({ switchScanSpeedMs: speed });
                    setPreferences(updated);
                  }}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Export / Import & Data Management */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold text-xs"
                >
                  <Download className="w-4 h-4" />
                  {isArabic ? 'تصدير اللوحات (JSON)' : 'Export Boards (JSON)'}
                </button>

                <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold text-xs cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {isArabic ? 'استيراد لوحات' : 'Import Boards'}
                  <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                </label>

                <button
                  onClick={() => {
                    if (confirm(isArabic ? 'هل أنت متأكد من مسح البيانات المحلية واستعادة الإعدادات الافتراضية؟' : 'Reset all local AAC data?')) {
                      engine.clearAllLocalData();
                      setAllBoards(engine.getBoards());
                      setActiveBoard(engine.getActiveBoard());
                      setCategoryCatalog(engine.getCategoryMetadataCatalog());
                      setSymbols(engine.getSymbols(selectedCategory));
                      setPreferences(engine.getPreferences());
                      setFavoritePhrases(engine.getFavoritePhrases());
                      setShowSettingsModal(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold text-xs ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  {isArabic ? 'استعادة الافتراضي' : 'Reset to Factory'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Create New Board ───────────────────────────────────────── */}
      {showNewBoardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              {isArabic ? 'إنشاء لوحة تواصل مخصصة' : 'Create Custom Board'}
            </h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isArabic ? 'اسم اللوحة (بالعربية):' : 'Board Name (Arabic):'}
                </label>
                <input
                  type="text"
                  value={newBoardNameAr}
                  onChange={(e) => setNewBoardNameAr(e.target.value)}
                  placeholder={isArabic ? 'مثال: زيارة الطبيب' : 'e.g., Doctor Visit'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isArabic ? 'اسم اللوحة (بالإنجليزية - اختياري):' : 'Board Name (English - Optional):'}
                </label>
                <input
                  type="text"
                  value={newBoardNameEn}
                  onChange={(e) => setNewBoardNameEn(e.target.value)}
                  placeholder="e.g. Doctor Visit"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewBoardModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardNameAr.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-40"
              >
                {isArabic ? 'حفظ وإنشاء' : 'Save & Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Add Custom Symbol ──────────────────────────────────────── */}
      {showAddSymbolModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              {isArabic ? 'إضافة بطاقة / رمز تواصل مخصص' : 'Add Custom Symbol Card'}
            </h3>
            <div className="space-y-3 mb-6 text-sm">
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isArabic ? 'الاسم الظاهر (بالعربية):' : 'Card Label (Arabic):'}
                </label>
                <input
                  type="text"
                  value={newSymLabelAr}
                  onChange={(e) => setNewSymLabelAr(e.target.value)}
                  placeholder={isArabic ? 'مثال: عصير برتقال' : 'e.g. Orange Juice'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isArabic ? 'الجملة المنطوقة (بالعربية):' : 'Spoken Text (Arabic):'}
                </label>
                <input
                  type="text"
                  value={newSymSpokenAr}
                  onChange={(e) => setNewSymSpokenAr(e.target.value)}
                  placeholder={isArabic ? 'أود شرب كوب من عصير البرتقال من فضلك' : 'I would like orange juice please'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isArabic ? 'الفئة:' : 'Category:'}
                </label>
                <select
                  value={newSymCategory}
                  onChange={(e) => setNewSymCategory(e.target.value as AacCategory)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {categoryCatalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isArabic ? c.labelAr : c.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddSymbolModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleAddCustomSymbol}
                disabled={!newSymLabelAr.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40"
              >
                {isArabic ? 'إضافة الرمز' : 'Add Symbol'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Reorder Categories ─────────────────────────────────────── */}
      {showReorderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              {isArabic ? 'إعادة ترتيب فئات لوحة التواصل' : 'Reorder Categories'}
            </h3>
            <p className="text-xs opacity-70 mb-4">
              {isArabic
                ? 'استخدم الأسهم لتحريك الفئات الأكثر أهمية للأعلى لتسهيل الوصول إليها:'
                : 'Use arrows to move frequently needed categories higher for faster access:'}
            </p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto mb-6">
              {categoryCatalog.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(c.id)}
                    <span>{isArabic ? c.labelAr : c.labelEn}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={i === 0}
                      onClick={() => {
                        const copy = [...categoryCatalog];
                        const temp = copy[i - 1];
                        copy[i - 1] = copy[i];
                        copy[i] = temp;
                        engine.reorderCategories(copy.map((cat) => cat.id));
                        setCategoryCatalog(engine.getCategoryMetadataCatalog());
                      }}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-800 disabled:opacity-30"
                      aria-label={isArabic ? 'تحريك للأعلى' : 'Move up'}
                    >
                      ↑
                    </button>
                    <button
                      disabled={i === categoryCatalog.length - 1}
                      onClick={() => {
                        const copy = [...categoryCatalog];
                        const temp = copy[i + 1];
                        copy[i + 1] = copy[i];
                        copy[i] = temp;
                        engine.reorderCategories(copy.map((cat) => cat.id));
                        setCategoryCatalog(engine.getCategoryMetadataCatalog());
                      }}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-800 disabled:opacity-30"
                      aria-label={isArabic ? 'تحريك للأسفل' : 'Move down'}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowReorderModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm"
              >
                {isArabic ? 'تم' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
