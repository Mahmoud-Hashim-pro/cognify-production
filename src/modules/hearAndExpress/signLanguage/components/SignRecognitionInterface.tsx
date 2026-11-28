import React, { useState, useEffect, useRef } from 'react';
import { L } from '../../../../lib/translations';
import {
  Camera,
  CameraOff,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  Layers,
  Activity,
  Sun,
  Eye,
  Hand,
  BookOpen,
} from 'lucide-react';
import { EslPreImplementationGate, type PreImplementationGateAudit } from '../preImplementationGate';
import { EslVocabularyCatalog, type EslVocabularyEntry } from '../vocabularyCatalog';
import { EslRecognitionPipeline, type EslRecognitionResult } from '../recognitionPipeline';
import { EslPerformanceBenchmark, type HardwareAccelerationProfile } from '../performanceBenchmark';

interface SignRecognitionInterfaceProps {
  isArabic?: boolean;
}

export const SignRecognitionInterface: React.FC<SignRecognitionInterfaceProps> = ({
  isArabic = true,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [gateAudit, setGateAudit] = useState<PreImplementationGateAudit>(() =>
    EslPreImplementationGate.evaluateGate()
  );
  const [hardwareProfile, setHardwareProfile] = useState<HardwareAccelerationProfile>(() =>
    EslPerformanceBenchmark.probeHardwareCapabilities()
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [recognitionResult, setRecognitionResult] = useState<EslRecognitionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pipelineRef = useRef<EslRecognitionPipeline | null>(null);

  if (!pipelineRef.current) {
    pipelineRef.current = new EslRecognitionPipeline();
  }

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
      setRecognitionResult(null);
    } else {
      setErrorMessage(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('الكاميرا غير مدعومة في هذا المتصفح.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: 'user',
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);

        // Run pipeline sequence check
        if (pipelineRef.current) {
          const res = await pipelineRef.current.processSequence();
          setRecognitionResult(res);
        }
      } catch (err: any) {
        setErrorMessage(
          isArabic
            ? `تعذر الوصول إلى الكاميرا: ${err.message || 'يرجى التأكد من منح الإذن للمتصفح.'}`
            : `Could not access camera: ${err.message || 'Please check browser permissions.'}`
        );
      }
    }
  };

  const vocabularyList = EslVocabularyCatalog.INITIAL_CORE_VOCABULARY;
  const filteredVocabulary =
    selectedCategory === 'all'
      ? vocabularyList
      : vocabularyList.filter((v) => v.category === selectedCategory);

  return (
    <div
      className="flex flex-col w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Hand className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">
              {isArabic ? 'منظومة التعرف على لغة الإشارة المصرية' : L('Egyptian Sign Language Engine')}
            </h1>
            <p className="text-sm text-slate-400">
              {isArabic
                ? 'أنبوب الاستشعار الحركي والبحث المعجمي المعتمد للصم'
                : L('Kinematic gesture pipeline & certified deaf lexicon foundation')}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleCamera}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg focus:ring-4 ${
            isCameraActive
              ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500/50'
          }`}
        >
          {isCameraActive ? (
            <>
              <CameraOff className="w-5 h-5" />
              <span>{isArabic ? 'إيقاف الكاميرا' : L('Stop Camera')}</span>
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span>{isArabic ? 'تشغيل الكاميرا' : L('Start Camera')}</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Pre-Implementation Gate Status Card */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-base">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>
              {isArabic ? 'بوابة ما قبل التنفيذ (Pre-Implementation Gate)' : L('Pre-Implementation Gate Audit')}
            </span>
          </div>
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {isArabic ? 'مرحلة التأسيس ومواصفات البيانات' : L('Foundation & Schema Phase')}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-slate-300">
          {isArabic ? gateAudit.formalAuditSummaryAr : L(gateAudit.formalAuditSummaryEn)}
        </p>

        {/* Gate Criteria Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
            <span className="text-slate-400 block mb-1">
              {isArabic ? 'مصدر البيانات المرئية' : L('Dataset Source')}
            </span>
            <span className="font-bold text-amber-300">
              {gateAudit.criteria.datasetSource.isSatisfied ? 'متوفر' : isArabic ? 'قيد التجميع الميداني' : L('Pending Field Collection')}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
            <span className="text-slate-400 block mb-1">
              {isArabic ? 'الرخصة القانونية' : L('License Status')}
            </span>
            <span className="font-bold text-amber-300">
              {isArabic ? 'أكاديمية فقط (CC-BY-NC)' : L('Academic Only (Non-Commercial)')}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
            <span className="text-slate-400 block mb-1">
              {isArabic ? 'المعجم الأولي الموثق' : L('Core Vocabulary')}
            </span>
            <span className="font-bold text-emerald-400">
              {isArabic ? '25 إشارة أساسية معتمدة' : L('25 Core Verified Signs')}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
            <span className="text-slate-400 block mb-1">
              {isArabic ? 'تسريع العتاد المتصفحي' : L('Hardware Acceleration')}
            </span>
            <span className="font-bold text-indigo-300">
              {hardwareProfile.preferredInferenceBackend.toUpperCase()} ({hardwareProfile.estimatedMaxFps} FPS)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Camera Viewfinder & Framing Envelope */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
                }`}
              />
              <span className="font-bold text-base text-white">
                {isArabic ? 'مساحة الإشارة (Signing Space Frame)' : L('Active Signing Space Viewfinder')}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {isArabic ? 'تأطير كامل من الخصر للرأس' : L('Hips-to-Head Framing')}
            </span>
          </div>

          {/* Viewfinder Video Element */}
          <div className="relative aspect-video w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {!isCameraActive && (
              <div className="flex flex-col items-center gap-3 text-slate-500 p-6 text-center">
                <Camera className="w-12 h-12 text-slate-600" />
                <span className="text-sm">
                  {isArabic
                    ? 'الكاميرا متوقفة حالياً. انقر على "تشغيل الكاميرا" لبدء الاستشعار.'
                    : L('Camera is currently stopped. Click "Start Camera" to begin.')}
                </span>
              </div>
            )}

            {/* Visual Signing Space Envelope Overlay */}
            {isCameraActive && (
              <div className="absolute inset-4 border-2 border-dashed border-indigo-400/40 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <span className="text-xs text-indigo-300 bg-black/60 px-2 py-0.5 rounded-full w-max">
                  {isArabic ? 'مساحة ملامح الوجه وحركة اليدين' : L('Face & Upper Body Signing Envelope')}
                </span>
                <span className="text-xs text-slate-400 bg-black/60 px-2 py-0.5 rounded-full w-max self-end">
                  720p / 30fps
                </span>
              </div>
            )}
          </div>

          {/* Live Pipeline Status */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/80 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>
                {isArabic ? 'حالة التنبؤ الحركي:' : L('Inference Pipeline Status:')}{' '}
                <strong className="text-amber-300">
                  {recognitionResult?.status === 'recognized'
                    ? isArabic
                      ? 'تم التعرف'
                      : L('Recognized')
                    : isArabic
                    ? 'غير مؤكد / تدقيق'
                    : L('Uncertain / Foundation')}
                </strong>
              </span>
            </div>
            <span className="text-slate-400">
              {isArabic ? 'وقت المعالجة:' : L('Latency:')} {recognitionResult?.latencyMs || 0} ms
            </span>
          </div>
        </div>

        {/* 4. Pipeline Stages & Architectural Disclosure */}
        <div className="lg:col-span-5 flex flex-col p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              {isArabic ? 'مراحل الأنبوب الحركي' : L('Kinematic Pipeline Stages')}
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span>1. {isArabic ? 'معالجة الإطارات واستخراج النقاط' : L('Frame Preprocessing & Keypoints')}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-slate-400">
                {isArabic
                  ? 'استخراج 21 نقطة لكل يد، وتتبع ملامح الوجه (الحاجبين، الفم) للتعبير اللغوي غير اليدوي.'
                  : L('Extracts 21 landmarks per hand, upper body pose, and facial non-manual grammatical cues.')}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span>2. {isArabic ? 'المخزن الزمني المنزلق (32 إطاراً)' : L('Sliding Temporal Window (32 Frames)')}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-slate-400">
                {isArabic
                  ? 'الاحتفاظ بمسار الحركة عبر الزمن (~1.0 ثانية) للتمييز بين الإشارات الثابتة والديناميكية.'
                  : L('Buffers ~1.0s of continuous movement trajectory to distinguish temporal sign dynamics.')}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span>3. {isArabic ? 'مرشح الشك والاستبعاد (OOV & Uncertainty)' : L('OOV & Uncertainty Filter')}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-slate-400">
                {isArabic
                  ? 'استبعاد الإشارات خارج المعجم أو غير المؤكدة (< 65%) منعاً للترجمة الخاطئة الخطرة.'
                  : L('Rejects out-of-vocabulary or low-confidence gestures (< 65%) to prevent dangerous hallucinations.')}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center justify-between font-bold text-amber-300 mb-1">
                <span>4. {isArabic ? 'نموذج الشبكة العصبية المدربة' : L('Trained Sequence Transformer')}</span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-amber-200/90 text-xs">
                {isArabic
                  ? 'معلق امتثالاً للبوابة: لا يتم تدريب النماذج إلا بعد اكتمال تجميع البيانات الميدانية متعددة الإشاريين.'
                  : L('Pending Gate Satisfaction: Neural models will be trained only upon multi-signer empirical corpus completion.')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Documented 25-Sign Initial Core Vocabulary */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              {isArabic ? 'المعجم الأولي المعتمد (25 إشارة أساسية)' : L('Documented Initial Core Lexicon (25 Signs)')}
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['all', 'emergency', 'courtesy', 'needs', 'question_particles', 'directions'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat === 'all'
                  ? isArabic
                    ? 'الكل (25)'
                    : 'All'
                  : cat === 'emergency'
                  ? isArabic
                    ? 'طوارئ'
                    : L('Emergency')
                  : cat === 'courtesy'
                  ? isArabic
                    ? 'تحيات'
                    : L('Courtesy')
                  : cat === 'needs'
                  ? isArabic
                    ? 'احتياجات'
                    : L('Needs')
                  : cat === 'question_particles'
                  ? isArabic
                    ? 'استفهام'
                    : L('Questions')
                  : isArabic
                  ? 'اتجاهات'
                  : L('Directions')}
              </button>
            ))}
          </div>
        </div>

        {/* Vocabulary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredVocabulary.map((entry) => (
            <div
              key={entry.glossId}
              className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/70 hover:border-indigo-500/50 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-white">{entry.arabicGloss}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300">
                  {entry.category}
                </span>
              </div>

              <p className="text-xs text-slate-300">{entry.arabicMeaning}</p>

              <div className="pt-2 border-t border-slate-700/40 text-xs text-slate-400 space-y-1">
                <div>
                  <strong className="text-slate-300">{isArabic ? 'الحركة:' : L('Movement:')}</strong>{' '}
                  {entry.movementDescription}
                </div>
                <div>
                  <strong className="text-slate-300">{isArabic ? 'الملامح:' : L('Facial cue:')}</strong>{' '}
                  {entry.nonManualFacialCue}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
