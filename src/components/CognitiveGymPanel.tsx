/**
 * Cognitive Gym & Thinking-Style Preview
 * ---------------------------------------------------------------------------
 * Wires src/lib/iqAssessment.ts into the Unified Accessibility Toolkit.
 * Two honest activities:
 *   1. Daily 3-minute brain workout (one puzzle per day).
 *   2. A 12-question exploratory thinking-style preview whose result is
 *      framed as a Cognitive Style Index for AI personalization, NOT a
 *      clinical IQ score - the engine's own bilingual disclaimer is shown
 *      before starting and again with the results. A cooldown between
 *      attempts (stored locally) keeps the preview exploratory.
 */
import React, { useMemo, useRef, useState } from 'react';
import { Brain, Dumbbell, Grid3x3, ListChecks, Palette, RotateCcw, ShieldAlert, Sigma, TrendingUp, Volume2, VolumeX } from 'lucide-react';
import { compareQuizzes, type QuizComparisonResult } from '../lib/evaluationEngine';
import {
  ambientNoise,
  buildTenFrame,
  CUISENAIRE_RODS,
  generateConcreteMathProblem,
  generateMemoryGridSequence,
  evaluateMemoryGridAnswer,
  generateStroopTrial,
  sliceTaskIntoMicroSteps,
  type MemoryGridRound,
  type NoiseType,
  type StroopTrial,
  type TaskSlicerDecomposition,
  type VisualArithmeticProblem,
} from '../lib/cognitiveEngine';
import {
  COGNITIVE_ASSESSMENT_DISCLAIMER_EN,
  COGNITIVE_ASSESSMENT_DISCLAIMER_AR,
  IQ_QUESTION_BATTERY,
  calculateStandardizedIq,
  checkIqCooldownEligibility,
  getDailyGymWorkout,
} from '../lib/iqAssessment';
import type { CognitiveDomainScores } from '../types';

interface CognitiveGymPanelProps {
  isArabic: boolean;
  isDarkMode: boolean;
}

const HISTORY_KEY = 'rafiqi_cognitive_preview_history';

interface PreviewHistory {
  count: number;
  lastDateIso?: string;
}

function loadHistory(): PreviewHistory {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as PreviewHistory;
  } catch {
    /* storage unavailable */
  }
  return { count: 0 };
}

function saveHistory(h: PreviewHistory) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* storage unavailable */
  }
}

type Stage = 'hub' | 'preview_running' | 'preview_results';

export const CognitiveGymPanel: React.FC<CognitiveGymPanelProps> = ({ isArabic, isDarkMode }) => {
  const [stage, setStage] = useState<Stage>('hub');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<{
    styleIndex: number;
    domainScores: CognitiveDomainScores;
    persona: 'Foundational' | 'Balanced' | 'Socratic';
  } | null>(null);
  const [history, setHistory] = useState<PreviewHistory>(() => loadHistory());
  const startTimeRef = useRef<number>(0);

  // Daily workout state
  const workout = useMemo(() => getDailyGymWorkout(), []);

  React.useEffect(() => {
    return () => {
      ambientNoise.stop();
    };
  }, []);
  const [workoutAnswer, setWorkoutAnswer] = useState<number | null>(null);

  const eligibility = checkIqCooldownEligibility(history.count, history.lastDateIso);

  // Task slicer state
  const [taskInput, setTaskInput] = useState('');
  const [slicedTask, setSlicedTask] = useState<TaskSlicerDecomposition | null>(null);
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});

  // Memory grid game state
  const [gridRound, setGridRound] = useState<MemoryGridRound | null>(null);
  const [gridPhase, setGridPhase] = useState<'idle' | 'showing' | 'input' | 'result'>('idle');
  const [gridHighlight, setGridHighlight] = useState<number | null>(null);
  const [gridUserTaps, setGridUserTaps] = useState<number[]>([]);
  const [gridSpan, setGridSpan] = useState(3);
  const [gridBestSpan, setGridBestSpan] = useState(0);
  const [gridResult, setGridResult] = useState<{ isCorrect: boolean; matchedCount: number; maxSpan: number } | null>(null);
  const gridTimers = useRef<number[]>([]);

  const clearGridTimers = () => {
    gridTimers.current.forEach((t) => window.clearTimeout(t));
    gridTimers.current = [];
  };

  const startGridRound = (span: number) => {
    clearGridTimers();
    const round = generateMemoryGridSequence(span, 3, false);
    setGridRound(round);
    setGridUserTaps([]);
    setGridResult(null);
    setGridPhase('showing');
    round.sequence.forEach((cellIdx, i) => {
      gridTimers.current.push(window.setTimeout(() => setGridHighlight(cellIdx), i * 700));
      gridTimers.current.push(window.setTimeout(() => setGridHighlight(null), i * 700 + 450));
    });
    gridTimers.current.push(
      window.setTimeout(() => setGridPhase('input'), round.sequence.length * 700 + 200)
    );
  };

  const tapGridCell = (idx: number) => {
    if (gridPhase !== 'input' || !gridRound) return;
    const taps = [...gridUserTaps, idx];
    setGridUserTaps(taps);
    if (taps.length === gridRound.sequence.length) {
      const result = evaluateMemoryGridAnswer(gridRound, taps);
      setGridResult(result);
      setGridPhase('result');
      if (result.isCorrect) {
        setGridBestSpan((b) => Math.max(b, gridRound.sequence.length));
      }
    }
  };

  React.useEffect(() => {
    return () => clearGridTimers();
  }, []);

  // Stroop attention game state
  const [stroopTrial, setStroopTrial] = useState<StroopTrial | null>(null);
  const [stroopScore, setStroopScore] = useState({ correct: 0, total: 0 });
  const [stroopFeedback, setStroopFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Concrete math visuals state
  const [mathProblem, setMathProblem] = useState<VisualArithmeticProblem | null>(null);
  const [mathRevealed, setMathRevealed] = useState(false);

  const stroopOptions: Array<{ name: 'red' | 'blue' | 'green' | 'yellow'; hex: string; labelAr: string; labelEn: string }> = [
    { name: 'red', hex: '#ef4444', labelAr: 'أحمر', labelEn: 'Red' },
    { name: 'blue', hex: '#3b82f6', labelAr: 'أزرق', labelEn: 'Blue' },
    { name: 'green', hex: '#10b981', labelAr: 'أخضر', labelEn: 'Green' },
    { name: 'yellow', hex: '#f59e0b', labelAr: 'أصفر', labelEn: 'Yellow' },
  ];

  const answerStroop = (colorName: 'red' | 'blue' | 'green' | 'yellow') => {
    if (!stroopTrial) return;
    const correct = colorName === stroopTrial.colorName;
    setStroopScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
    setStroopFeedback(correct ? 'correct' : 'wrong');
    window.setTimeout(() => {
      setStroopFeedback(null);
      setStroopTrial(generateStroopTrial());
    }, 700);
  };

  // Learning-gain calculator state
  const [preScoreInput, setPreScoreInput] = useState('');
  const [postScoreInput, setPostScoreInput] = useState('');
  const [gainResult, setGainResult] = useState<QuizComparisonResult | null>(null);
  const [gainError, setGainError] = useState<string | null>(null);

  // Focus noise state
  const [activeNoise, setActiveNoise] = useState<NoiseType | null>(null);
  const toggleNoise = (type: NoiseType) => {
    if (activeNoise === type) {
      ambientNoise.stop();
      setActiveNoise(null);
    } else {
      ambientNoise.play(type, 0.25);
      setActiveNoise(type);
    }
  };

  const cardCls = isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200';
  const innerCls = isDarkMode ? 'bg-stone-900 border-stone-700' : 'bg-stone-50 border-stone-200';
  const textCls = isDarkMode ? 'text-stone-100' : 'text-stone-900';
  const subCls = isDarkMode ? 'text-stone-400' : 'text-stone-500';

  const disclaimer = isArabic ? COGNITIVE_ASSESSMENT_DISCLAIMER_AR : COGNITIVE_ASSESSMENT_DISCLAIMER_EN;

  const startPreview = () => {
    setAnswers({});
    setQuestionIndex(0);
    setResults(null);
    startTimeRef.current = Date.now();
    setStage('preview_running');
  };

  const answerQuestion = (questionId: string, optionId: string) => {
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    if (questionIndex + 1 < IQ_QUESTION_BATTERY.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      const scored = calculateStandardizedIq(next, elapsedSeconds);
      setResults({
        styleIndex: scored.iqScore,
        domainScores: scored.domainScores,
        persona: scored.recommendedPersona,
      });
      const newHistory: PreviewHistory = {
        count: history.count + 1,
        lastDateIso: new Date().toISOString(),
      };
      saveHistory(newHistory);
      setHistory(newHistory);
      setStage('preview_results');
    }
  };

  const domainLabels: Array<{ key: keyof CognitiveDomainScores; labelAr: string; labelEn: string }> = [
    { key: 'fluidReasoning', labelAr: 'الاستدلال المرن', labelEn: 'Fluid reasoning' },
    { key: 'quantitativeLogic', labelAr: 'المنطق الكمي', labelEn: 'Quantitative logic' },
    { key: 'workingMemory', labelAr: 'الذاكرة العاملة', labelEn: 'Working memory' },
    { key: 'processingSpeed', labelAr: 'سرعة المعالجة', labelEn: 'Processing speed' },
  ];

  const personaCopy: Record<string, { labelAr: string; labelEn: string; descAr: string; descEn: string }> = {
    Foundational: {
      labelAr: 'أسلوب البناء التدريجي',
      labelEn: 'Foundational style',
      descAr: 'تفضل الشرح المنظم خطوة بخطوة مع أمثلة محلولة قبل التحدي.',
      descEn: 'You prefer structured step-by-step explanations with worked examples before challenges.',
    },
    Balanced: {
      labelAr: 'أسلوب متوازن',
      labelEn: 'Balanced style',
      descAr: 'تتوازن بين الشرح الموجه والاستكشاف الذاتي.',
      descEn: 'You balance guided explanation with self-directed exploration.',
    },
    Socratic: {
      labelAr: 'أسلوب الاستقصاء السقراطي',
      labelEn: 'Socratic style',
      descAr: 'تفضل الأسئلة المفتوحة والتحديات العميقة التي تقودك للاكتشاف بنفسك.',
      descEn: 'You prefer open questions and deeper challenges that lead you to discover answers yourself.',
    },
  };

  const currentQuestion = IQ_QUESTION_BATTERY[questionIndex];

  return (
    <div className="space-y-4" data-testid="cognitive-gym-panel">
      {/* ── Daily workout card ── */}
      <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`}>
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <h3 className={`text-sm font-black ${textCls}`}>
            {isArabic ? `تمرين اليوم: ${workout.titleAr}` : `Today's workout: ${workout.titleEn}`}
          </h3>
        </div>
        <p className={`text-xs leading-relaxed ${textCls}`} dir="auto">
          {workout.question}
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {workout.options.map((opt, oi) => {
            const answered = workoutAnswer !== null;
            const isCorrect = oi === workout.correctIndex;
            const isChosen = oi === workoutAnswer;
            return (
              <button
                key={oi}
                type="button"
                disabled={answered}
                onClick={() => setWorkoutAnswer(oi)}
                className={`p-3 rounded-2xl border text-xs font-bold text-start transition-all cursor-pointer ${
                  answered && isCorrect
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : answered && isChosen
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                      : isDarkMode
                        ? 'bg-stone-800 border-stone-700 text-stone-200 hover:border-[#1769AA]'
                        : 'bg-stone-100 border-stone-300 text-stone-700 hover:border-[#1769AA]'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {workoutAnswer !== null && (
          <p className={`text-xs leading-relaxed ${subCls}`} dir="auto">
            {workoutAnswer === workout.correctIndex
              ? isArabic
                ? '✓ إجابة صحيحة! '
                : '✓ Correct! '
              : isArabic
                ? '✗ إجابة غير صحيحة. '
                : '✗ Not quite. '}
            {workout.explanation}
          </p>
        )}
      </div>

      {/* ── Thinking-style preview ── */}
      {stage === 'hub' && (
        <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`}>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-400" aria-hidden="true" />
            <h3 className={`text-sm font-black ${textCls}`}>
              {isArabic ? 'استكشاف أسلوب التفكير (12 سؤالاً)' : 'Thinking-style preview (12 questions)'}
            </h3>
          </div>
          <div
            className={`p-3 rounded-2xl border text-[11px] leading-relaxed flex items-start gap-2 ${
              isDarkMode ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}
            role="note"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{disclaimer}</span>
          </div>
          {!eligibility.isEligible ? (
            <p className={`text-xs font-bold ${subCls}`}>
              {isArabic
                ? `يمكنك إعادة الاستكشاف بعد ${eligibility.daysRemaining} يوم - الفاصل الزمني يحافظ على طبيعته الاستكشافية.`
                : `You can retake the preview in ${eligibility.daysRemaining} days - the interval keeps it exploratory.`}
            </p>
          ) : (
            <button
              type="button"
              onClick={startPreview}
              className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isArabic ? 'ابدأ الاستكشاف' : 'Start the preview'}
            </button>
          )}
        </div>
      )}

      {stage === 'preview_running' && currentQuestion && (
        <div className={`p-5 rounded-3xl border space-y-4 ${cardCls}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-black ${subCls}`}>
              {isArabic
                ? `سؤال ${questionIndex + 1} من ${IQ_QUESTION_BATTERY.length}`
                : `Question ${questionIndex + 1} of ${IQ_QUESTION_BATTERY.length}`}
            </p>
            <div
              className="h-1.5 w-32 rounded-full bg-stone-700/40 overflow-hidden"
              role="progressbar"
              aria-valuenow={questionIndex + 1}
              aria-valuemin={1}
              aria-valuemax={IQ_QUESTION_BATTERY.length}
            >
              <div
                className="h-full bg-[#4B9FE1] transition-all"
                style={{ width: `${((questionIndex + 1) / IQ_QUESTION_BATTERY.length) * 100}%` }}
              />
            </div>
          </div>
          <p className={`text-sm font-bold leading-relaxed ${textCls}`} dir="auto">
            {isArabic ? currentQuestion.promptAr : currentQuestion.promptEn}
          </p>
          {currentQuestion.matrixData && (
            <div className="grid grid-cols-3 gap-1.5 max-w-[220px]" aria-hidden="true">
              {currentQuestion.matrixData.grid.flatMap((row, ri) =>
                row.map((cell, ci) => {
                  const isMissing =
                    currentQuestion.matrixData!.missingCell[0] === ri &&
                    currentQuestion.matrixData!.missingCell[1] === ci;
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      className={`aspect-square rounded-xl border flex items-center justify-center text-lg ${
                        isMissing
                          ? 'border-[#4B9FE1] bg-[#1769AA]/20 text-[#4B9FE1] font-black'
                          : `${innerCls} ${textCls}`
                      }`}
                    >
                      {isMissing ? '؟' : cell}
                    </div>
                  );
                })
              )}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-2">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => answerQuestion(currentQuestion.id, opt.id)}
                className={`p-3 rounded-2xl border text-xs font-bold text-start transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-stone-800 border-stone-700 text-stone-200 hover:border-[#4B9FE1] hover:bg-[#1769AA]/20'
                    : 'bg-stone-100 border-stone-300 text-stone-700 hover:border-[#1769AA]'
                }`}
              >
                {opt.symbol && <span className="me-1.5">{opt.symbol}</span>}
                {isArabic ? opt.labelAr : opt.labelEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'preview_results' && results && (
        <div className={`p-5 rounded-3xl border space-y-4 ${cardCls}`} data-testid="cognitive-preview-results">
          <h3 className={`text-sm font-black ${textCls}`}>
            {isArabic ? 'نتيجة الاستكشاف' : 'Preview results'}
          </h3>
          <div className={`p-4 rounded-2xl border text-center ${innerCls}`}>
            <p className={`text-[11px] font-bold ${subCls}`}>
              {isArabic ? 'مؤشر أسلوب التفكير (استكشافي)' : 'Cognitive Style Index (exploratory)'}
            </p>
            <p className="text-3xl font-black text-[#4B9FE1]">{results.styleIndex}</p>
          </div>
          <div className="space-y-2">
            {domainLabels.map((d) => (
              <div key={d.key}>
                <div className="flex justify-between text-[11px] font-bold mb-0.5">
                  <span className={textCls}>{isArabic ? d.labelAr : d.labelEn}</span>
                  <span className={subCls}>{results.domainScores[d.key]}/100</span>
                </div>
                <div className="h-2 rounded-full bg-stone-700/40 overflow-hidden">
                  <div
                    className="h-full bg-[#1769AA]"
                    style={{ width: `${results.domainScores[d.key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className={`p-3 rounded-2xl border ${innerCls}`}>
            <p className={`text-xs font-black mb-1 ${textCls}`}>
              {isArabic
                ? `أسلوب التعلم المقترح: ${personaCopy[results.persona].labelAr}`
                : `Suggested learning style: ${personaCopy[results.persona].labelEn}`}
            </p>
            <p className={`text-[11px] leading-relaxed ${subCls}`}>
              {isArabic ? personaCopy[results.persona].descAr : personaCopy[results.persona].descEn}
            </p>
          </div>
          <p className={`text-[11px] leading-relaxed ${subCls}`}>{disclaimer}</p>
          <button
            type="button"
            onClick={() => setStage('hub')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              isDarkMode ? 'bg-stone-800 text-stone-200 hover:bg-stone-700' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            {isArabic ? 'عودة' : 'Back'}
          </button>
        </div>
      )}

      {/* ── Working-memory grid trainer ── */}
      <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`} data-testid="memory-grid-trainer">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-violet-400" aria-hidden="true" />
            <h3 className={`text-sm font-black ${textCls}`}>
              {isArabic ? 'مدرب الذاكرة العاملة (الشبكة)' : 'Working-memory grid trainer'}
            </h3>
          </div>
          {gridBestSpan > 0 && (
            <span className={`text-[11px] font-bold ${subCls}`}>
              {isArabic ? `أفضل سلسلة: ${gridBestSpan}` : `Best span: ${gridBestSpan}`}
            </span>
          )}
        </div>
        <p className={`text-[11px] leading-relaxed ${subCls}`}>
          {isArabic
            ? 'شاهد الخلايا وهي تضيء بالترتيب، ثم اضغط عليها بنفس الترتيب. كل نجاح يزيد طول السلسلة.'
            : 'Watch the cells light up in order, then tap them in the same order. Each success grows the sequence.'}
        </p>
        {gridPhase === 'idle' && (
          <button
            type="button"
            onClick={() => startGridRound(gridSpan)}
            className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isArabic ? `ابدأ (سلسلة من ${gridSpan})` : `Start (span of ${gridSpan})`}
          </button>
        )}
        {gridPhase !== 'idle' && gridRound && (
          <div className="space-y-3">
            <div
              className="grid grid-cols-3 gap-1.5 max-w-[220px]"
              role="group"
              aria-label={isArabic ? 'شبكة الذاكرة' : 'Memory grid'}
            >
              {Array.from({ length: gridRound.gridSize * gridRound.gridSize }, (_, idx) => {
                const isHighlighted = gridHighlight === idx;
                const wasTapped = gridUserTaps.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={gridPhase !== 'input'}
                    onClick={() => tapGridCell(idx)}
                    aria-label={`${isArabic ? 'خلية' : 'Cell'} ${idx + 1}`}
                    className={`aspect-square rounded-xl border transition-all cursor-pointer ${
                      isHighlighted
                        ? 'bg-violet-500 border-violet-400 scale-105'
                        : wasTapped
                          ? 'bg-[#1769AA]/40 border-[#4B9FE1]'
                          : isDarkMode
                            ? 'bg-stone-800 border-stone-700'
                            : 'bg-stone-100 border-stone-300'
                    } ${gridPhase === 'input' ? 'hover:border-violet-400' : ''}`}
                  />
                );
              })}
            </div>
            {gridPhase === 'showing' && (
              <p className={`text-[11px] font-bold ${subCls}`}>
                {isArabic ? 'شاهد الترتيب...' : 'Watch the sequence...'}
              </p>
            )}
            {gridPhase === 'input' && (
              <p className={`text-[11px] font-bold ${textCls}`}>
                {isArabic
                  ? `دورك: اضغط ${gridRound.sequence.length} خلايا بالترتيب (${gridUserTaps.length}/${gridRound.sequence.length})`
                  : `Your turn: tap ${gridRound.sequence.length} cells in order (${gridUserTaps.length}/${gridRound.sequence.length})`}
              </p>
            )}
            {gridPhase === 'result' && gridResult && (
              <div className="space-y-2">
                <p className={`text-xs font-black ${gridResult.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {gridResult.isCorrect
                    ? isArabic
                      ? `✓ ممتاز! تذكرت السلسلة كاملة (${gridResult.maxSpan} خلايا).`
                      : `✓ Great! You recalled the full ${gridResult.maxSpan}-cell sequence.`
                    : isArabic
                      ? `✗ وصلت إلى ${gridResult.matchedCount} من ${gridResult.maxSpan} بالترتيب الصحيح.`
                      : `✗ You matched ${gridResult.matchedCount} of ${gridResult.maxSpan} in the right order.`}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextSpan = gridResult.isCorrect
                        ? Math.min(8, gridRound.sequence.length + 1)
                        : Math.max(2, gridRound.sequence.length - 1);
                      setGridSpan(nextSpan);
                      startGridRound(nextSpan);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {gridResult.isCorrect
                      ? isArabic ? 'الجولة التالية (أصعب)' : 'Next round (harder)'
                      : isArabic ? 'حاول مجدداً (أسهل)' : 'Try again (easier)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearGridTimers();
                      setGridPhase('idle');
                      setGridRound(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      isDarkMode ? 'bg-stone-800 text-stone-200 hover:bg-stone-700' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {isArabic ? 'إيقاف' : 'Stop'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Task slicer (executive-function support) ── */}
      <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`} data-testid="task-slicer">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-sky-400" aria-hidden="true" />
          <h3 className={`text-sm font-black ${textCls}`}>
            {isArabic ? 'مقطّع المهام الكبيرة' : 'Big-task slicer'}
          </h3>
        </div>
        <p className={`text-[11px] leading-relaxed ${subCls}`}>
          {isArabic
            ? 'اكتب مهمة تبدو ثقيلة (بحث، شيت مسائل، قراءة فصل) وسنحولها لخطوات صغيرة لا تتجاوز 3 دقائق لتسهيل البدء.'
            : 'Write a task that feels heavy (essay, problem sheet, chapter reading) and we turn it into tiny steps under 3 minutes each to make starting easier.'}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            dir="auto"
            aria-label={isArabic ? 'المهمة المراد تقسيمها' : 'Task to slice'}
            placeholder={isArabic ? 'مثال: كتابة بحث عن الطاقة الشمسية' : 'e.g., Write an essay about solar energy'}
            className={`flex-1 p-3 rounded-2xl border text-xs ${
              isDarkMode ? 'bg-stone-900 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              if (!taskInput.trim()) return;
              setSlicedTask(sliceTaskIntoMicroSteps(taskInput));
              setDoneSteps({});
            }}
            className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isArabic ? 'قسّم' : 'Slice'}
          </button>
        </div>
        {slicedTask && (
          <div className="space-y-2">
            <p className={`text-[11px] font-bold ${subCls}`}>
              {isArabic
                ? `${slicedTask.steps.length} خطوات · حوالي ${slicedTask.totalEstMinutes} دقائق`
                : `${slicedTask.steps.length} steps · about ${slicedTask.totalEstMinutes} minutes`}
            </p>
            {slicedTask.steps.map((step, si) => {
              const done = !!doneSteps[step.id];
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setDoneSteps((prev) => ({ ...prev, [step.id]: !prev[step.id] }))}
                  aria-pressed={done}
                  className={`w-full p-3 rounded-2xl border text-start text-xs font-bold flex items-start gap-2 transition-all cursor-pointer ${
                    done
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 line-through'
                      : isDarkMode
                        ? 'bg-stone-800 border-stone-700 text-stone-200 hover:border-[#4B9FE1]'
                        : 'bg-stone-100 border-stone-300 text-stone-700 hover:border-[#1769AA]'
                  }`}
                >
                  <span aria-hidden="true">{done ? '✅' : `${si + 1}.`}</span>
                  <span className="flex-1">{isArabic ? step.titleAr : step.titleEn}</span>
                  <span className={`shrink-0 text-[10px] ${subCls}`}>~{step.estMinutes}m</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Stroop attention trainer ── */}
      <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`} data-testid="stroop-trainer">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-rose-400" aria-hidden="true" />
            <h3 className={`text-sm font-black ${textCls}`}>
              {isArabic ? 'مدرب الانتباه (ستروب)' : 'Attention trainer (Stroop)'}
            </h3>
          </div>
          {stroopScore.total > 0 && (
            <span className={`text-[11px] font-bold ${subCls}`}>
              {isArabic ? `النتيجة: ${stroopScore.correct}/${stroopScore.total}` : `Score: ${stroopScore.correct}/${stroopScore.total}`}
            </span>
          )}
        </div>
        <p className={`text-[11px] leading-relaxed ${subCls}`}>
          {isArabic
            ? 'ستظهر كلمة لون مكتوبة بحبر ملون. تجاهل معنى الكلمة واختر لون الحبر فقط - تمرين كلاسيكي للتركيز وكبح الاستجابة التلقائية.'
            : 'A color word appears in colored ink. Ignore the word meaning and pick the INK color only - a classic focus and impulse-control exercise.'}
        </p>
        {!stroopTrial ? (
          <button
            type="button"
            onClick={() => {
              setStroopScore({ correct: 0, total: 0 });
              setStroopTrial(generateStroopTrial());
            }}
            className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isArabic ? 'ابدأ' : 'Start'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className={`p-6 rounded-2xl border text-center ${innerCls}`}>
              <span className="text-4xl font-black" style={{ color: stroopTrial.inkColorHex }}>
                {stroopTrial.wordText}
              </span>
            </div>
            {stroopFeedback && (
              <p className={`text-xs font-black ${stroopFeedback === 'correct' ? 'text-emerald-400' : 'text-rose-400'}`} role="status">
                {stroopFeedback === 'correct'
                  ? isArabic ? '✓ صحيح!' : '✓ Correct!'
                  : isArabic ? '✗ لون الحبر هو المطلوب، ليس معنى الكلمة' : '✗ Pick the ink color, not the word meaning'}
              </p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {stroopOptions.map((opt) => (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => answerStroop(opt.name)}
                  aria-label={isArabic ? `لون الحبر ${opt.labelAr}` : `Ink color ${opt.labelEn}`}
                  className="p-3 rounded-2xl border-2 font-black text-xs transition-all active:scale-95 cursor-pointer"
                  style={{ borderColor: opt.hex, color: opt.hex }}
                >
                  {isArabic ? opt.labelAr : opt.labelEn}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStroopTrial(null)}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                isDarkMode ? 'bg-stone-800 text-stone-200 hover:bg-stone-700' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {isArabic ? 'إيقاف' : 'Stop'}
            </button>
          </div>
        )}
      </div>

      {/* ── Concrete math visuals (ten-frame + Cuisenaire rods) ── */}
      <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`} data-testid="math-visuals">
        <div className="flex items-center gap-2">
          <Sigma className="w-5 h-5 text-sky-400" aria-hidden="true" />
          <h3 className={`text-sm font-black ${textCls}`}>
            {isArabic ? 'الرياضيات بالصور (إطار العشرة والقضبان)' : 'Picture math (ten-frame & rods)'}
          </h3>
        </div>
        <p className={`text-[11px] leading-relaxed ${subCls}`}>
          {isArabic
            ? 'مسألة جمع أو طرح بسيطة معروضة بصرياً بإطار العشرة وقضبان كويزنير - طريقة ملموسة لفهم الأعداد لمن يجد صعوبة في الحساب.'
            : 'A simple addition or subtraction problem shown visually with a ten-frame and Cuisenaire rods - a concrete way to understand numbers for anyone who finds arithmetic hard.'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMathProblem(generateConcreteMathProblem());
              setMathRevealed(false);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {mathProblem
              ? isArabic ? 'مسألة جديدة' : 'New problem'
              : isArabic ? 'اعرض مسألة' : 'Show a problem'}
          </button>
          {mathProblem && !mathRevealed && (
            <button
              type="button"
              onClick={() => setMathRevealed(true)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                isDarkMode ? 'bg-stone-800 text-stone-200 hover:bg-stone-700' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {isArabic ? 'اعرض الحل' : 'Show answer'}
            </button>
          )}
        </div>
        {mathProblem && (
          <div className="space-y-3">
            <p className={`text-xl font-black text-center ${textCls}`} dir="ltr">
              {mathProblem.a} {mathProblem.operator} {mathProblem.b} = {mathRevealed ? mathProblem.result : '؟'}
            </p>
            {/* Ten-frame for the first operand */}
            <div className="space-y-1">
              <p className={`text-[11px] font-bold ${subCls}`}>
                {isArabic ? `إطار العشرة للعدد ${mathProblem.a}:` : `Ten-frame for ${mathProblem.a}:`}
              </p>
              <div className="grid grid-cols-10 gap-1 max-w-[340px]" aria-hidden="true">
                {buildTenFrame(mathProblem.a).firstFrame.map((filled, i) => (
                  <div
                    key={`f${i}`}
                    className={`aspect-square rounded-full border ${
                      filled ? 'bg-[#4B9FE1] border-[#4B9FE1]' : isDarkMode ? 'border-stone-600' : 'border-stone-300'
                    }`}
                  />
                ))}
              </div>
              {mathProblem.a > 10 && (
                <div className="grid grid-cols-10 gap-1 max-w-[340px]" aria-hidden="true">
                  {buildTenFrame(mathProblem.a).secondFrame.map((filled, i) => (
                    <div
                      key={`s${i}`}
                      className={`aspect-square rounded-full border ${
                        filled ? 'bg-[#1769AA] border-[#1769AA]' : isDarkMode ? 'border-stone-600' : 'border-stone-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Cuisenaire rods for both operands */}
            <div className="space-y-1">
              <p className={`text-[11px] font-bold ${subCls}`}>
                {isArabic ? 'قضبان كويزنير:' : 'Cuisenaire rods:'}
              </p>
              {[mathProblem.a, mathProblem.b].map((v, vi) => {
                const rod = CUISENAIRE_RODS[Math.min(10, Math.max(1, v))];
                if (!rod) return null;
                return (
                  <div key={vi} className="flex items-center gap-2" aria-hidden="true">
                    <div
                      className="h-4 rounded-md"
                      style={{ width: `${rod.widthPercent}%`, backgroundColor: rod.colorHex, maxWidth: '260px' }}
                    />
                    <span className={`text-[10px] font-bold ${subCls}`}>{v}</span>
                  </div>
                );
              })}
            </div>
            {mathRevealed && (
              <p className={`text-[11px] leading-relaxed ${textCls}`} dir="auto">
                {isArabic ? mathProblem.friendlyDecompositionAr : mathProblem.friendlyDecompositionEn}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Learning-gain calculator (pre/post quiz) ── */}
      <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`} data-testid="gain-calculator">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <h3 className={`text-sm font-black ${textCls}`}>
            {isArabic ? 'حاسبة مكاسب التعلم' : 'Learning-gain calculator'}
          </h3>
        </div>
        <p className={`text-[11px] leading-relaxed ${subCls}`}>
          {isArabic
            ? 'أدخل درجتك في الاختبار القبلي والبعدي (من 100) لترى مقدار ما تعلمته فعلاً بمعيار Hake للتحصيل المعياري.'
            : "Enter your pre-quiz and post-quiz scores (out of 100) to see how much you actually learned, using Hake's normalized gain standard."}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            value={preScoreInput}
            onChange={(e) => setPreScoreInput(e.target.value)}
            min={0}
            max={100}
            aria-label={isArabic ? 'درجة الاختبار القبلي' : 'Pre-quiz score'}
            placeholder={isArabic ? 'الدرجة القبلية' : 'Pre-quiz score'}
            className={`w-32 p-3 rounded-2xl border text-xs ${
              isDarkMode ? 'bg-stone-900 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400'
            }`}
          />
          <input
            type="number"
            value={postScoreInput}
            onChange={(e) => setPostScoreInput(e.target.value)}
            min={0}
            max={100}
            aria-label={isArabic ? 'درجة الاختبار البعدي' : 'Post-quiz score'}
            placeholder={isArabic ? 'الدرجة البعدية' : 'Post-quiz score'}
            className={`w-32 p-3 rounded-2xl border text-xs ${
              isDarkMode ? 'bg-stone-900 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              const pre = Number(preScoreInput);
              const post = Number(postScoreInput);
              if (
                preScoreInput === '' || postScoreInput === '' ||
                Number.isNaN(pre) || Number.isNaN(post) ||
                pre < 0 || pre > 100 || post < 0 || post > 100
              ) {
                setGainResult(null);
                setGainError(
                  isArabic
                    ? 'أدخل درجتين صحيحتين بين 0 و 100.'
                    : 'Enter two valid scores between 0 and 100.'
                );
                return;
              }
              setGainError(null);
              setGainResult(compareQuizzes(pre, post));
            }}
            className="px-4 py-2.5 rounded-xl bg-[#1769AA] hover:bg-[#0D4778] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isArabic ? 'احسب' : 'Calculate'}
          </button>
        </div>
        {gainError && (
          <p className="text-xs text-rose-400" role="alert">
            {gainError}
          </p>
        )}
        {gainResult && (
          <div className={`p-4 rounded-2xl border space-y-2 ${innerCls}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-black text-[#4B9FE1]">
                g = {gainResult.normalizedGain.toFixed(2)}
              </span>
              <span className={`px-3 py-1 rounded-full border text-[11px] font-black ${gainResult.categoryInfo.colorClass}`}>
                {isArabic ? gainResult.categoryInfo.labelAr : gainResult.categoryInfo.labelEn}
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${subCls}`}>
              {isArabic ? gainResult.categoryInfo.descriptionAr : gainResult.categoryInfo.descriptionEn}
            </p>
            <p className={`text-[11px] font-bold ${textCls}`}>
              {gainResult.isImprovement
                ? isArabic
                  ? `تحسنت درجتك بمقدار ${gainResult.scoreDifference} درجة.`
                  : `Your score improved by ${gainResult.scoreDifference} points.`
                : isArabic
                  ? `انخفضت درجتك بمقدار ${Math.abs(gainResult.scoreDifference)} درجة - راجع المفاهيم وحاول مجدداً.`
                  : `Your score dropped by ${Math.abs(gainResult.scoreDifference)} points - review the concepts and try again.`}
            </p>
          </div>
        )}
      </div>

      {/* ── Focus noise generator (Web Audio, on-device) ── */}
      <div className={`p-5 rounded-3xl border space-y-3 ${cardCls}`} data-testid="focus-noise">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <h3 className={`text-sm font-black ${textCls}`}>
            {isArabic ? 'ضوضاء التركيز الهادئة' : 'Calm focus noise'}
          </h3>
        </div>
        <p className={`text-[11px] leading-relaxed ${subCls}`}>
          {isArabic
            ? 'خلفية صوتية ثابتة تُولَّد على جهازك للمساعدة على التركيز وتغطية الأصوات المشتتة. اضغط مرة للتشغيل ومرة أخرى للإيقاف.'
            : 'A steady sound background generated on your device to help focus and mask distracting sounds. Tap once to play, again to stop.'}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={isArabic ? 'أنواع الضوضاء' : 'Noise types'}>
          {(['brown', 'pink', 'white'] as NoiseType[]).map((type) => {
            const active = activeNoise === type;
            const label = isArabic
              ? type === 'brown' ? 'بنية (عميقة)' : type === 'pink' ? 'وردية (متوازنة)' : 'بيضاء (خفيفة)'
              : type === 'brown' ? 'Brown (deep)' : type === 'pink' ? 'Pink (balanced)' : 'White (light)';
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleNoise(type)}
                aria-pressed={active}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                    : isDarkMode
                      ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {active ? <VolumeX className="w-3.5 h-3.5" aria-hidden="true" /> : <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CognitiveGymPanel;
