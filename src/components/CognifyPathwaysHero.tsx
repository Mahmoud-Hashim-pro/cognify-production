import React, { useId, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Volume2,
  Eye,
  Target,
  Zap,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Check
} from 'lucide-react';
import { UserProfile, PedagogyStyle } from '../types';
import { isArabicLocale } from '../lib/translations';

interface CognifyPathwaysHeroProps {
  profile: UserProfile;
  activePedagogy: PedagogyStyle | 'voice';
  onSelectPedagogy: (style: PedagogyStyle | 'voice') => void;
  onStartLearning: () => void;
  onOpenAccessibility: () => void;
  isDarkMode?: boolean;
  reduceMotion?: boolean;
  studentName?: string;
  streakDays?: number;
  masteredCount?: number;
}

interface ModalityNode {
  id: PedagogyStyle | 'voice';
  titleAr: string;
  titleEn: string;
  titleFr: string;
  descAr: string;
  descEn: string;
  descFr: string;
  icon: React.ComponentType<{ className?: string }>;
  // Coordinates in SVG 440x380 viewBox
  x: number;
  y: number;
  curveControl: { cx1: number; cy1: number; cx2: number; cy2: number };
  accentColor: string;
}

const MODALITY_NODES: ModalityNode[] = [
  {
    id: 'simplified',
    titleAr: 'الكتاب والقراءة',
    titleEn: 'Text & Reading',
    titleFr: 'Texte & Lecture',
    descAr: 'نصوص واضحة ومباشرة تخلو من التعقيد اللغوي',
    descEn: 'Clear, plain-language text without jargon',
    descFr: 'Textes clairs sans jargon',
    icon: BookOpen,
    x: 90,
    y: 80,
    curveControl: { cx1: 130, cy1: 110, cx2: 170, cy2: 155 },
    accentColor: '#0D9488', // Teal
  },
  {
    id: 'voice',
    titleAr: 'الصوت والاستماع',
    titleEn: 'Voice & Audio',
    titleFr: 'Voix & Audio',
    descAr: 'شرح مسموع بنبرة هادئة وتدفق صوتي طبيعي',
    descEn: 'Auditory narration at a comfortable pace',
    descFr: 'Narration audio calme',
    icon: Volume2,
    x: 350,
    y: 80,
    curveControl: { cx1: 310, cy1: 110, cx2: 270, cy2: 155 },
    accentColor: '#0284C7', // Sky
  },
  {
    id: 'analogies',
    titleAr: 'الرؤية والأنماط',
    titleEn: 'Vision & Patterns',
    titleFr: 'Vision & Modèles',
    descAr: 'نماذج ذهنية وتشبيهات بصرية تقرّب المفاهيم',
    descEn: 'Relatable mental models and visual analogies',
    descFr: 'Modèles mentaux et analogies',
    icon: Eye,
    x: 75,
    y: 300,
    curveControl: { cx1: 120, cy1: 270, cx2: 170, cy2: 225 },
    accentColor: '#F59E0B', // Amber
  },
  {
    id: 'scaffolded',
    titleAr: 'التركيز والتدرج',
    titleEn: 'Focus & Pacing',
    titleFr: 'Focus & Progression',
    descAr: 'تفكيك الفكرة إلى محطات صغيرة ونقاط تحقق',
    descEn: 'Step-by-step sequential checkpoints',
    descFr: 'Progression par petites étapes',
    icon: Target,
    x: 365,
    y: 300,
    curveControl: { cx1: 320, cy1: 270, cx2: 270, cy2: 225 },
    accentColor: '#8B5CF6', // Purple
  },
  {
    id: 'practical',
    titleAr: 'التطبيق والممارسة',
    titleEn: 'Practice & Action',
    titleFr: 'Pratique & Action',
    descAr: 'أمثلة عملية وحالات واقعية توضح التطبيق',
    descEn: 'Concrete worked examples and real applications',
    descFr: 'Cas réels et exemples résolus',
    icon: Zap,
    x: 220,
    y: 45,
    curveControl: { cx1: 220, cy1: 95, cx2: 220, cy2: 145 },
    accentColor: '#10B981', // Emerald
  },
];

export default function CognifyPathwaysHero({
  profile,
  activePedagogy,
  onSelectPedagogy,
  onStartLearning,
  onOpenAccessibility,
  isDarkMode = false,
  reduceMotion = false,
}: CognifyPathwaysHeroProps) {
  const isAr = isArabicLocale(profile.language);
  const isFr = profile.language === 'French';
  const labelId = useId();

  const t = (en: string, ar: string, fr?: string) => {
    if (isAr) return ar;
    if (isFr && fr) return fr;
    return en;
  };

  // Center node of Cognify
  const coreX = 220;
  const coreY = 190;

  // Active node metadata
  const activeNode = useMemo(() => {
    return MODALITY_NODES.find((n) => n.id === activePedagogy) || MODALITY_NODES[0];
  }, [activePedagogy]);

  // Motion variants with respect for prefers-reduced-motion
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: reduceMotion
        ? { duration: 0 }
        : { duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  const nodeVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: reduceMotion
        ? { duration: 0 }
        : { delay: 0.15 + i * 0.08, duration: 0.4, ease: 'easeOut' as const },
    }),
  };

  return (
    <section
      aria-labelledby={labelId}
      className={`relative w-full rounded-[32px] border transition-colors overflow-hidden shadow-sm ${
        isDarkMode
          ? 'bg-[#121B1E] border-stone-800 text-stone-100'
          : 'bg-[#FAF8F5] border-stone-200/90 text-stone-900'
      }`}
    >
      {/* Ambient Radial Mesh (Calm & Non-distracting) */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className={`absolute top-0 end-0 w-[420px] h-[420px] rounded-full blur-[110px] opacity-40 transition-colors duration-700 ${
            isDarkMode ? 'bg-teal-900/30' : 'bg-teal-100/60'
          }`}
        />
        <div
          className={`absolute bottom-0 start-0 w-[380px] h-[380px] rounded-full blur-[100px] opacity-30 transition-colors duration-700 ${
            isDarkMode ? 'bg-emerald-950/40' : 'bg-amber-100/50'
          }`}
        />
      </div>

      <div className="p-6 sm:p-8 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        
        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 1: THE HUMAN EMPOWERING NARRATIVE & ACTION
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 flex flex-col items-start text-start space-y-4 sm:space-y-5">
          
          {/* Subtle Philosophy Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800">
            <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 animate-pulse" />
            <span>{t('Every learner has their own path & rhythm', 'كل متعلم له مساره وإيقاعه', 'Chaque apprenant a son rythme')}</span>
          </div>

          {/* Main Headline */}
          <h1
            id={labelId}
            className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-[1.25] text-stone-900 dark:text-white"
          >
            {t(
              'Learn independently with guidance tailored to your natural senses.',
              'تعلّم باستقلالية كاملة مع تجربة تتكيف مع طريقتك وحواسك.',
              'Apprenez en toute autonomie avec une expérience adaptée à vos sens.'
            )}
          </h1>

          {/* Narrative Body */}
          <p className="text-xs sm:text-sm md:text-base text-stone-600 dark:text-stone-300 leading-relaxed font-normal max-w-xl">
            {t(
              'Cognify is an adaptive, human learning space that respects your unique cognitive pace. Choose your preferred way of understanding below — through clear text, spoken audio, visual models, stepped pacing, or real-world practice.',
              'كوجنيفاي مساحة تعلم ذكية تتكيف مع وتيرتك واستيعابك دون ضغط أو مقارنة. اختر طريقتك المفضلة للفهم — عبر النصوص الميسرة، الاستماع الصوتي، النماذج البصرية، الشرح المتدرج، أو الأمثلة التطبيقية.',
              'Un espace d\'apprentissage calme et respectueux de votre rythme, sans pression ni comparaison.'
            )}
          </p>

          {/* Primary Action Buttons */}
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onStartLearning}
              className="px-6 py-4 rounded-2xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-teal-700/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 min-h-[48px]"
            >
              <Sparkles className="w-4 h-4 text-teal-200 shrink-0" />
              <span>{t('Start learning your way ✦', 'ابدأ التعلّم بطريقتك ✦', 'Commencer à votre façon ✦')}</span>
              {isAr ? <ArrowLeft className="w-4 h-4 shrink-0" /> : <ArrowRight className="w-4 h-4 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={onOpenAccessibility}
              className="px-5 py-4 rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#162327] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 min-h-[48px]"
              title={t('Open accessibility accommodations & settings', 'فتح إعدادات وتسهيلات الوصول', 'Ouvrir les réglages d\'accessibilité')}
            >
              <Sliders className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{t('Accessibility Accommodations', 'إعدادات وتسهيلات الوصول', 'Aménagements')}</span>
            </button>
          </div>

          {/* Quick-Switch Modality Pills (Interactive with the Visual Emblem) */}
          <div className="w-full pt-3 border-t border-stone-200/80 dark:border-stone-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                {t('Active Learning Modality:', 'طريقة الشرح المختارة:', 'Mode actif :')}
              </span>
              <span
                aria-live="polite"
                className="text-xs font-black text-teal-700 dark:text-teal-300 flex items-center gap-1"
              >
                <span>{isAr ? activeNode.titleAr : isFr ? activeNode.titleFr : activeNode.titleEn}</span>
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label={t('Select learning modality', 'اختر طريقة التعلم المناسبة لك', 'Choisir le mode d\'apprentissage')}
              className="flex flex-wrap gap-1.5 sm:gap-2"
            >
              {MODALITY_NODES.map((node) => {
                const isSelected = activePedagogy === node.id;
                const NodeIcon = node.icon;
                const title = isAr ? node.titleAr : isFr ? node.titleFr : node.titleEn;

                return (
                  <button
                    key={node.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSelectPedagogy(node.id)}
                    className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                      isSelected
                        ? 'bg-teal-700 text-white font-black shadow-sm ring-1 ring-teal-700'
                        : isDarkMode
                        ? 'bg-[#162327] text-stone-300 border border-stone-800 hover:text-white hover:border-teal-700'
                        : 'bg-white text-stone-700 border border-stone-200 hover:text-stone-950 hover:border-teal-400'
                    }`}
                  >
                    <NodeIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
                    <span>{title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 2: THE INTERACTIVE CONSTELLATION VISUAL EMBLEM
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative select-none">
          <div
            className={`w-full max-w-[400px] aspect-[440/380] rounded-3xl p-3 sm:p-4 border relative overflow-hidden flex items-center justify-center ${
              isDarkMode
                ? 'bg-gradient-to-b from-[#0E1618] to-[#142024] border-stone-800 shadow-inner'
                : 'bg-gradient-to-b from-stone-50/90 to-teal-50/40 border-stone-200/90 shadow-sm'
            }`}
          >
            {/* SVG Visual Canvas */}
            <svg
              viewBox="0 0 440 380"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label={t(
                'Interactive Cognify learning pathways emblem',
                'رمز مسارات التعلم التفاعلي لمنصة كوجنيفاي',
                'Emblème des voies d\'apprentissage interactives de Cognify'
              )}
            >
              <defs>
                {/* Pathway Glowing Gradients */}
                <linearGradient id="pathGradientActive" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#14B8A6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
                </linearGradient>

                <linearGradient id="pathGradientSubtle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#94A3B8" stopOpacity={isDarkMode ? '0.2' : '0.35'} />
                  <stop offset="100%" stopColor="#0D9488" stopOpacity={isDarkMode ? '0.15' : '0.25'} />
                </linearGradient>

                {/* Core Radial Glow */}
                <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="#0D9488" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background Harmonic Orbits */}
              <ellipse
                cx={coreX}
                cy={coreY}
                rx="145"
                ry="105"
                fill="none"
                stroke={isDarkMode ? '#203338' : '#CBD5E1'}
                strokeWidth="1"
                strokeDasharray="4 6"
                opacity={isDarkMode ? '0.5' : '0.7'}
              />
              <ellipse
                cx={coreX}
                cy={coreY}
                rx="185"
                ry="135"
                fill="none"
                stroke={isDarkMode ? '#203338' : '#E2E8F0'}
                strokeWidth="1"
                strokeDasharray="3 8"
                opacity={isDarkMode ? '0.4' : '0.6'}
              />

              {/* Central Core Ambient Glow */}
              <circle cx={coreX} cy={coreY} r="75" fill="url(#coreGlow)" />

              {/* ── Interconnected Organic Pathways ── */}
              {MODALITY_NODES.map((node) => {
                const isActive = activePedagogy === node.id;
                const pathD = `M ${node.x} ${node.y} C ${node.curveControl.cx1} ${node.curveControl.cy1}, ${node.curveControl.cx2} ${node.curveControl.cy2}, ${coreX} ${coreY}`;

                return (
                  <g key={`path-${node.id}`}>
                    {/* Shadow / Base line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isActive ? 'url(#pathGradientActive)' : 'url(#pathGradientSubtle)'}
                      strokeWidth={isActive ? '3.5' : '1.8'}
                      strokeLinecap="round"
                    />

                    {/* Active Pathway Animated Flow / Glow Pulse */}
                    {isActive && (
                      <motion.path
                        d={pathD}
                        fill="none"
                        stroke="#2DD4BF"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeOpacity="0.4"
                        initial="hidden"
                        animate="visible"
                        variants={pathVariants}
                      />
                    )}

                    {/* Gentle Energy Traveler Dot on active path */}
                    {isActive && !reduceMotion && (
                      <motion.circle
                        r="4"
                        fill="#F59E0B"
                        animate={{
                          offsetDistance: ['0%', '100%'],
                          opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                          duration: 2.8,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        style={{
                          offsetPath: `path('${pathD}')`,
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* ── Central Adaptive Core of Cognify ── */}
              <g
                tabIndex={0}
                role="button"
                aria-label={t(
                  'Cognify Central Adaptive Engine',
                  'مركز التعلم المتكيف لكوجنيفاي',
                  'Moteur adaptatif de Cognify'
                )}
                className="outline-none focus:outline-none group cursor-pointer"
                onClick={onStartLearning}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onStartLearning()}
              >
                {/* Outer Breathing Ring */}
                <circle
                  cx={coreX}
                  cy={coreY}
                  r="32"
                  fill={isDarkMode ? '#162529' : '#F0FDFA'}
                  stroke={isDarkMode ? '#0D9488' : '#0D9488'}
                  strokeWidth="2.5"
                  className="transition-all group-hover:scale-105 group-focus-visible:ring-2"
                />

                {/* Core Center Disk */}
                <circle
                  cx={coreX}
                  cy={coreY}
                  r="24"
                  fill="#0D9488"
                  className="transition-transform group-hover:scale-110"
                />

                {/* Abstract Geometric Star / Crystal Icon */}
                <path
                  d={`M ${coreX} ${coreY - 11} L ${coreX + 4} ${coreY - 4} L ${coreX + 11} ${coreY} L ${coreX + 4} ${coreY + 4} L ${coreX} ${coreY + 11} L ${coreX - 4} ${coreY + 4} L ${coreX - 11} ${coreY} L ${coreX - 4} ${coreY - 4} Z`}
                  fill="#FFFFFF"
                />

                {/* Core Title Below */}
                <text
                  x={coreX}
                  y={coreY + 46}
                  textAnchor="middle"
                  className={`text-[11px] font-black tracking-wider uppercase select-none ${
                    isDarkMode ? 'fill-stone-200' : 'fill-stone-800'
                  }`}
                >
                  COGNIFY
                </text>
              </g>

              {/* ── The 5 Modality Nodes ── */}
              {MODALITY_NODES.map((node, i) => {
                const isSelected = activePedagogy === node.id;
                const NodeIcon = node.icon;
                const title = isAr ? node.titleAr : isFr ? node.titleFr : node.titleEn;

                return (
                  <motion.g
                    key={`node-${node.id}`}
                    custom={i}
                    variants={nodeVariants}
                    initial="hidden"
                    animate="visible"
                    tabIndex={0}
                    role="button"
                    aria-label={`${title} (${t('Click to activate this mode', 'اضغط لتفعيل هذا الأسلوب', 'Cliquer pour activer')})`}
                    aria-pressed={isSelected}
                    onClick={() => onSelectPedagogy(node.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectPedagogy(node.id);
                      }
                    }}
                    className="cursor-pointer outline-none group"
                  >
                    {/* Active Halo */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="28"
                        fill="none"
                        stroke="#0D9488"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        className="animate-spin"
                        style={{ transformOrigin: `${node.x}px ${node.y}px`, animationDuration: '14s' }}
                      />
                    )}

                    {/* Outer Badge */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="20"
                      fill={
                        isSelected
                          ? '#0D9488'
                          : isDarkMode
                          ? '#162327'
                          : '#FFFFFF'
                      }
                      stroke={
                        isSelected
                          ? '#14B8A6'
                          : isDarkMode
                          ? '#2B3E44'
                          : '#CBD5E1'
                      }
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      className="transition-all group-hover:scale-110 group-focus-visible:stroke-teal-400 group-focus-visible:stroke-[3]"
                    />

                    {/* Embedded Vector Icon Center Placeholder */}
                    <foreignObject
                      x={node.x - 11}
                      y={node.y - 11}
                      width="22"
                      height="22"
                      className="pointer-events-none"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <NodeIcon
                          className={`w-3.5 h-3.5 transition-colors ${
                            isSelected
                              ? 'text-white'
                              : isDarkMode
                              ? 'text-teal-400'
                              : 'text-teal-700'
                          }`}
                        />
                      </div>
                    </foreignObject>

                    {/* Node Text Label */}
                    <text
                      x={node.x}
                      y={node.y > coreY ? node.y + 26 : node.y - 18}
                      textAnchor="middle"
                      className={`text-[10px] font-bold select-none transition-colors ${
                        isSelected
                          ? 'fill-teal-700 dark:fill-teal-300 font-black'
                          : isDarkMode
                          ? 'fill-stone-400 group-hover:fill-stone-200'
                          : 'fill-stone-600 group-hover:fill-stone-900'
                      }`}
                    >
                      {title}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </div>

          {/* Active Mode Micro-Description Below Emblem */}
          <div className="mt-3 text-center px-4 max-w-[340px]">
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
              {isAr ? activeNode.descAr : isFr ? activeNode.descFr : activeNode.descEn}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
