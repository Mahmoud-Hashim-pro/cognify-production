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
import { Brain, Dumbbell, ListChecks, RotateCcw, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import {
  ambientNoise,
  sliceTaskIntoMicroSteps,
  type NoiseType,
  type TaskSlicerDecomposition,
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
