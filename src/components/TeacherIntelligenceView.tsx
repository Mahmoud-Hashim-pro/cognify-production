import React, { useState, useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  Layers,
  ChevronRight,
  TrendingUp,
  Brain,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react';
import type { StudentState } from '../types/studentState';
import type {
  ConceptStruggleCluster,
  DifferentiatedInstructionGroup,
  ClassInterventionEfficacy,
  TeacherActionRecommendation,
  TeacherDashboardData,
} from '../types/teacher';
import { compileTeacherDashboard } from '../lib/teacherIntelligence';

interface TeacherIntelligenceViewProps {
  students?: StudentState[];
  classId?: string;
  className?: string;
  lang?: 'en' | 'ar' | 'fr';
  onBack?: () => void;
}

export const TeacherIntelligenceView: React.FC<TeacherIntelligenceViewProps> = ({
  students,
  classId = 'CS101-SEC-A',
  className = 'CS101: Data Structures & Algorithms',
  lang = 'ar',
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'clusters' | 'groups' | 'efficacy' | 'actions'>('clusters');

  // Generate mock cohort if not provided to guarantee seamless educator preview
  const studentCohort = useMemo(() => {
    if (students && students.length > 0) return students;

    const mock: StudentState[] = [];
    // 12 struggling students
    for (let i = 1; i <= 12; i++) {
      mock.push({
        uid: `std_0${i}`,
        cognitiveStage: 'foundational',
        activePedagogy: 'worked_example',
        conceptMastery: {
          pointers: {
            conceptId: 'pointers',
            accuracy: 0.42,
            attempts: 7,
            correct: 3,
            confidence: 0.4,
            consecutiveCorrect: 0,
            consecutiveIncorrect: 4,
            lastTested: Date.now(),
            mistakeTypes: ['unhandled_edge_case'],
          },
          dynamic_memory: {
            conceptId: 'dynamic_memory',
            accuracy: 0.35,
            attempts: 5,
            correct: 1,
            confidence: 0.3,
            consecutiveCorrect: 0,
            consecutiveIncorrect: 3,
            lastTested: Date.now(),
            mistakeTypes: ['memory_leak'],
          },
          trees: {
            conceptId: 'trees',
            accuracy: 0.50,
            attempts: 4,
            correct: 2,
            confidence: 0.5,
            consecutiveCorrect: 1,
            consecutiveIncorrect: 2,
            lastTested: Date.now(),
            mistakeTypes: ['recursion_overflow'],
          },
        },
        learningStrain: {
          possibleStruggle: 0.72,
          confidence: 0.8,
          signals: ['repeated_errors'],
        },
        struggleSignal: 0.72,
        cognitiveLoadScore: 0.72,
        pedagogyEffectiveness: {
          worked_example: { score: 0.82, helpfulCount: 5, unhelpfulCount: 1 },
          socratic: { score: 0.30, helpfulCount: 1, unhelpfulCount: 4 },
          scaffolded: { score: 0.65, helpfulCount: 4, unhelpfulCount: 2 },
          analogies: { score: 0.55, helpfulCount: 2, unhelpfulCount: 2 },
          advanced_rigor: { score: 0.20, helpfulCount: 0, unhelpfulCount: 2 },
        },
        retentionSchedules: {},
        activeInterventions: {},
        totalExercisesCompleted: 16,
        lastActiveTimestamp: Date.now(),
      });
    }
    // 8 high-performing students
    for (let i = 13; i <= 20; i++) {
      mock.push({
        uid: `std_${i}`,
        cognitiveStage: 'advanced',
        activePedagogy: 'socratic',
        conceptMastery: {
          pointers: {
            conceptId: 'pointers',
            accuracy: 0.94,
            attempts: 8,
            correct: 7,
            confidence: 0.9,
            consecutiveCorrect: 5,
            consecutiveIncorrect: 0,
            lastTested: Date.now(),
            mistakeTypes: [],
          },
          dynamic_memory: {
            conceptId: 'dynamic_memory',
            accuracy: 0.88,
            attempts: 6,
            correct: 5,
            confidence: 0.85,
            consecutiveCorrect: 4,
            consecutiveIncorrect: 0,
            lastTested: Date.now(),
            mistakeTypes: [],
          },
          trees: {
            conceptId: 'trees',
            accuracy: 0.82,
            attempts: 5,
            correct: 4,
            confidence: 0.8,
            consecutiveCorrect: 3,
            consecutiveIncorrect: 0,
            lastTested: Date.now(),
            mistakeTypes: [],
          },
        },
        learningStrain: {
          possibleStruggle: 0.18,
          confidence: 0.7,
          signals: [],
        },
        struggleSignal: 0.18,
        cognitiveLoadScore: 0.18,
        pedagogyEffectiveness: {
          worked_example: { score: 0.70, helpfulCount: 3, unhelpfulCount: 1 },
          socratic: { score: 0.94, helpfulCount: 7, unhelpfulCount: 0 },
          scaffolded: { score: 0.78, helpfulCount: 4, unhelpfulCount: 1 },
          analogies: { score: 0.68, helpfulCount: 3, unhelpfulCount: 1 },
          advanced_rigor: { score: 0.88, helpfulCount: 4, unhelpfulCount: 1 },
        },
        retentionSchedules: {},
        activeInterventions: {},
        totalExercisesCompleted: 26,
        lastActiveTimestamp: Date.now(),
      });
    }
    return mock;
  }, [students]);

  const dashboardData: TeacherDashboardData = useMemo(() => {
    return compileTeacherDashboard(classId, className, studentCohort);
  }, [classId, className, studentCohort]);

  return (
    <div className="min-h-screen bg-[#0A0C14] text-slate-100 p-4 sm:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121524]/90 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 rounded-2xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition"
                aria-label="Back"
              >
                <ArrowRight className={`w-5 h-5 ${isAr ? '' : 'rotate-180'}`} />
              </button>
            )}
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {classId}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {isAr ? 'مركز ذكاء المعلم والمقرر' : 'Teacher Learning Intelligence'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {className}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">{dashboardData.totalStudents}</span>
              <span className="text-xs text-slate-400">{isAr ? 'طالباً مسجلاً' : 'Students'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">{dashboardData.struggleClusters.length}</span>
              <span className="text-xs text-slate-400">{isAr ? 'بؤر تعثر' : 'Struggle Clusters'}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#121524] border border-slate-800/80 w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab('clusters')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'clusters'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{isAr ? 'بؤر التعثر المعرفي' : 'Struggle Clusters'}</span>
            <span className="ml-1 text-xs px-1.5 py-0.5 rounded-md bg-white/20">
              {dashboardData.struggleClusters.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'groups'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isAr ? 'المجموعات المتباينة' : 'Differentiated Groups'}</span>
            <span className="ml-1 text-xs px-1.5 py-0.5 rounded-md bg-white/20">
              {dashboardData.differentiatedGroups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('efficacy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'efficacy'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{isAr ? 'كفاءة الاستراتيجيات' : 'Pedagogy Efficacy'}</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'actions'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>{isAr ? 'توصيات المحاضرة' : 'Lecture Recommendations'}</span>
            <span className="ml-1 text-xs px-1.5 py-0.5 rounded-md bg-white/20">
              {dashboardData.actionRecommendations.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Struggle Clusters */}
        {activeTab === 'clusters' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dashboardData.struggleClusters.map((cluster) => {
                const title = isAr ? cluster.conceptTitleAr : cluster.conceptTitleEn;
                const isCritical = cluster.struggleRatePercentage >= 50;

                return (
                  <div
                    key={cluster.conceptId}
                    className="flex flex-col justify-between bg-[#121524]/90 border border-slate-800/80 hover:border-slate-700 rounded-3xl p-6 backdrop-blur-xl shadow-xl transition"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                            {cluster.conceptId}
                          </span>
                          <h3 className="text-xl font-bold text-white mt-1">{title}</h3>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {cluster.struggleRatePercentage}% {isAr ? 'نسبة التعثر' : 'Struggle'}
                        </span>
                      </div>

                      {/* Struggle Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{isAr ? 'الطلاب المتعثرون' : 'Struggling Students'}</span>
                          <span className="font-semibold text-slate-200">
                            {cluster.strugglingStudentCount} / {cluster.totalStudentsAssessed}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isCritical ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${cluster.struggleRatePercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Diagnosed Prerequisite Gap Alert */}
                      {cluster.diagnosedPrerequisiteGap && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{isAr ? 'الفجوة الجذرية في المتطلب السابق:' : 'Root Prerequisite Gap:'}</span>
                          </div>
                          <p className="text-sm font-semibold text-amber-200">
                            {isAr
                              ? cluster.diagnosedPrerequisiteGap.prerequisiteTitleAr
                              : cluster.diagnosedPrerequisiteGap.prerequisiteTitleEn}
                          </p>
                          <p className="text-xs text-amber-400/80">
                            {isAr
                              ? 'التعثر في هذا المفهوم ناتج عن ضعف أساسي في هذا المتطلب.'
                              : 'Struggles stem from fundamental gaps in this prerequisite.'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 mt-4">
                      <span>{isAr ? 'متوسط الدقة' : 'Average Accuracy'}:</span>
                      <span className="font-bold text-white">
                        {Math.round(cluster.averageAccuracy * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Differentiated Instruction Groups */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
              <p className="text-sm text-indigo-200">
                {isAr
                  ? 'تم تقسيم الصف تلقائياً استناداً إلى إتقان المفاهيم ومستويات الإجهاد الذهني لتمكين التدريس المتباين الفعّال.'
                  : 'Class partitioned automatically based on concept mastery and cognitive strain to enable targeted differentiated instruction.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {dashboardData.differentiatedGroups.map((group) => {
                const isFoundational = group.id.includes('foundational');
                const isAdvanced = group.id.includes('advanced');

                return (
                  <div
                    key={group.id}
                    className="flex flex-col justify-between bg-[#121524]/90 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                            {group.students.length} {isAr ? 'طلاب' : 'students'}
                          </span>
                          <h3 className="text-lg font-bold text-white mt-1.5">
                            {isAr ? group.groupNameAr : group.groupNameEn}
                          </h3>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                            isFoundational
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isAdvanced
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {group.recommendedPedagogy.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {isAr ? group.pedagogicalRationaleAr : group.pedagogicalRationaleEn}
                      </p>

                      {/* Student Chips */}
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-medium text-slate-400">
                          {isAr ? 'أعضاء المجموعة:' : 'Group Members:'}
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {group.students.map((st) => (
                            <span
                              key={st.uid}
                              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200"
                            >
                              {st.name} ({Math.round(st.accuracy * 100)}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-300">
                      <span>{isAr ? 'الأسلوب الموصى به' : 'Recommended Pedagogy'}:</span>
                      <span className="font-bold uppercase tracking-wider">{group.recommendedPedagogy}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Pedagogical Strategy Efficacy */}
        {activeTab === 'efficacy' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Object.entries(dashboardData.interventionEfficacy).map(([stratKey, eff]) => {
                const winRate = Math.round(eff.efficacyRate * 100);

                return (
                  <div
                    key={stratKey}
                    className="bg-[#121524]/90 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        {eff.strategy.replace('_', ' ')}
                      </span>
                      {eff.isCalibrated ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {isAr ? 'مُعاير ومؤكد' : 'Calibrated'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {isAr ? 'عينة غير كافية' : 'N < 3'}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-3xl font-extrabold text-white">{winRate}%</div>
                      <span className="text-xs text-slate-400">{isAr ? 'نسبة نجاح الاستراتيجية' : 'Class Efficacy Rate'}</span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                      <div className="flex justify-between">
                        <span>{isAr ? 'عدد المحاولات' : 'Attempts'}:</span>
                        <span className="font-semibold text-slate-200">{eff.attemptsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isAr ? 'التطبيقات الناجحة' : 'Helpful'}:</span>
                        <span className="font-semibold text-emerald-400">{eff.helpfulCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isAr ? 'التطبيقات غير المجدية' : 'Unhelpful'}:</span>
                        <span className="font-semibold text-rose-400">{eff.unhelpfulCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Action Recommendations */}
        {activeTab === 'actions' && (
          <div className="space-y-4">
            {dashboardData.actionRecommendations.map((rec) => {
              const isUrgent = rec.priority === 'urgent';

              return (
                <div
                  key={rec.id}
                  className="bg-[#121524]/90 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-2xl shrink-0 ${
                        isUrgent
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      }`}
                    >
                      {isUrgent ? <AlertTriangle className="w-6 h-6" /> : <Lightbulb className="w-6 h-6" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isUrgent ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'
                          }`}
                        >
                          {rec.priority.toUpperCase()}
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {isAr ? rec.titleAr : rec.titleEn}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                        {isAr ? rec.actionPromptAr : rec.actionPromptEn}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
