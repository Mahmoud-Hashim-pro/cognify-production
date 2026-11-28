/**
 * Reading Support Panel (dyslexia accommodations)
 * ---------------------------------------------------------------------------
 * Wires src/lib/learningDisabilityEngine.ts into the Unified Accessibility
 * Toolkit (Read & Scan category). Offers three evidence-based reading aids
 * on any pasted text, computed entirely on-device:
 *   1. Bionic eye-fixation reading (bold informative word prefixes)
 *   2. Syllable chunking (Arabic/English)
 *   3. Plain-language simplification with key points and glossary
 */
import React, { useMemo, useState } from 'react';
import { L } from '../lib/translations';
import { BookOpenText, Scissors, Sparkles } from 'lucide-react';
import {
  bionicizeText,
  chunkTextPhonetically,
  simplifyAcademicText,
} from '../lib/learningDisabilityEngine';

interface ReadingSupportPanelProps {
  isArabic: boolean;
  isDarkMode: boolean;
}

type ReadingTool = 'bionic' | 'syllables' | 'simplify';

export const ReadingSupportPanel: React.FC<ReadingSupportPanelProps> = ({
  isArabic,
  isDarkMode,
}) => {
  const [inputText, setInputText] = useState('');
  const [tool, setTool] = useState<ReadingTool>('bionic');
  const language: 'Arabic' | 'English' = isArabic ? 'Arabic' : 'English';

  const bionicParagraphs = useMemo(
    () => (tool === 'bionic' && inputText.trim() ? bionicizeText(inputText) : []),
    [tool, inputText]
  );
  const syllableChunks = useMemo(
    () =>
      tool === 'syllables' && inputText.trim()
        ? chunkTextPhonetically(inputText, language)
        : [],
    [tool, inputText, language]
  );
  const simplified = useMemo(
    () =>
      tool === 'simplify' && inputText.trim()
        ? simplifyAcademicText(inputText, language)
        : null,
    [tool, inputText, language]
  );

  const cardCls = isDarkMode ? 'bg-[#121B1E] border-stone-800' : 'bg-white border-stone-200';
  const textCls = isDarkMode ? 'text-stone-100' : 'text-stone-900';
  const subCls = isDarkMode ? 'text-stone-400' : 'text-stone-500';

  const tools: Array<{ id: ReadingTool; icon: React.ReactNode; labelAr: string; labelEn: string }> = [
    {
      id: 'bionic',
      icon: <BookOpenText className="w-4 h-4" aria-hidden="true" />,
      labelAr: 'قراءة التثبيت البصري',
      labelEn: 'Bionic fixation reading',
    },
    {
      id: 'syllables',
      icon: <Scissors className="w-4 h-4" aria-hidden="true" />,
      labelAr: 'تقطيع المقاطع الصوتية',
      labelEn: 'Syllable chunking',
    },
    {
      id: 'simplify',
      icon: <Sparkles className="w-4 h-4" aria-hidden="true" />,
      labelAr: 'التبسيط اللغوي',
      labelEn: 'Plain-language simplify',
    },
  ];

  return (
    <div className={`p-6 rounded-3xl border space-y-4 ${cardCls}`} data-testid="reading-support-panel">
      <h3 className={`text-sm font-black ${textCls}`}>
        {isArabic ? '📖 مساعد القراءة (دعم عسر القراءة)' : L('📖 Reading Support (Dyslexia Aids)')}
      </h3>
      <p className={`text-xs leading-relaxed ${subCls}`}>
        {isArabic
          ? 'الصق أي نص هنا واختر طريقة عرض أسهل: تثبيت بصري على بدايات الكلمات، تقطيع صوتي للمقاطع، أو تبسيط لغوي مع النقاط الأساسية. كل المعالجة تتم على جهازك فقط.'
          : L('Paste any text and pick an easier way to read it: visual fixation on word beginnings, syllable chunking, or plain-language simplification with key points. All processing happens on your device only.')}
      </p>

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={4}
        dir="auto"
        aria-label={isArabic ? 'النص المراد قراءته' : L('Text to read')}
        placeholder={
          isArabic
            ? 'اكتب أو الصق النص هنا...'
            : L('Type or paste the text here...')
        }
        className={`w-full p-3 rounded-2xl border text-sm leading-relaxed resize-y ${
          isDarkMode
            ? 'bg-stone-900 border-stone-700 text-stone-100 placeholder:text-stone-500'
            : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400'
        }`}
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label={isArabic ? 'أدوات القراءة' : L('Reading tools')}>
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            aria-pressed={tool === t.id}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              tool === t.id
                ? 'bg-[#1769AA] text-white'
                : isDarkMode
                  ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {t.icon}
            <span>{isArabic ? t.labelAr : t.labelEn}</span>
          </button>
        ))}
      </div>

      {inputText.trim() && tool === 'bionic' && (
        <div
          className={`p-4 rounded-2xl border text-base leading-loose ${
            isDarkMode ? 'bg-stone-900 border-stone-700' : 'bg-stone-50 border-stone-200'
          }`}
          dir="auto"
          data-testid="bionic-output"
        >
          {bionicParagraphs.map((para, pi) => (
            <p key={pi} className={`mb-3 ${textCls}`}>
              {para.tokens.map((tok, ti) =>
                tok.isWord ? (
                  <span key={ti}>
                    <strong className="font-black">{tok.prefix}</strong>
                    {tok.suffix}
                    {tok.trailingSpace}
                  </span>
                ) : (
                  <span key={ti}>{tok.trailingSpace || tok.prefix}</span>
                )
              )}
            </p>
          ))}
        </div>
      )}

      {inputText.trim() && tool === 'syllables' && (
        <div
          className={`p-4 rounded-2xl border text-base leading-loose ${
            isDarkMode ? 'bg-stone-900 border-stone-700' : 'bg-stone-50 border-stone-200'
          }`}
          dir="auto"
          data-testid="syllable-output"
        >
          <p className={textCls}>
            {syllableChunks.map((chunk, ci) => (
              <span key={ci} className="inline-block mx-0.5">
                {chunk.syllables.map((syl, si) => (
                  <React.Fragment key={si}>
                    <span className={si % 2 === 0 ? 'font-black' : ''}>{syl}</span>
                    {si < chunk.syllables.length - 1 && (
                      <span className="text-[#4B9FE1] font-black">·</span>
                    )}
                  </React.Fragment>
                ))}
              </span>
            ))}
          </p>
        </div>
      )}

      {inputText.trim() && tool === 'simplify' && simplified && (
        <div
          className={`p-4 rounded-2xl border space-y-3 text-sm ${
            isDarkMode ? 'bg-stone-900 border-stone-700' : 'bg-stone-50 border-stone-200'
          }`}
          dir="auto"
          data-testid="simplify-output"
        >
          {simplified.summary && (
            <div>
              <h4 className={`text-xs font-black mb-1 ${textCls}`}>
                {isArabic ? 'الملخص' : L('Summary')}
              </h4>
              <p className={`leading-relaxed ${textCls}`}>{simplified.summary}</p>
            </div>
          )}
          {simplified.keyPoints.length > 0 && (
            <div>
              <h4 className={`text-xs font-black mb-1 ${textCls}`}>
                {isArabic ? 'النقاط الأساسية' : L('Key points')}
              </h4>
              <ul className={`list-disc ps-5 space-y-1 ${subCls}`}>
                {simplified.keyPoints.map((kp, ki) => (
                  <li key={ki}>{kp}</li>
                ))}
              </ul>
            </div>
          )}
          {simplified.difficultGlossary.length > 0 && (
            <div>
              <h4 className={`text-xs font-black mb-1 ${textCls}`}>
                {isArabic ? 'معجم المصطلحات الصعبة' : L('Glossary of difficult terms')}
              </h4>
              <ul className={`space-y-1 ${subCls}`}>
                {simplified.difficultGlossary.map((g, gi) => (
                  <li key={gi}>
                    <strong className={textCls}>{g.term}:</strong> {g.definition}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className={`text-[11px] ${subCls}`}>
            {isArabic
              ? `سهولة القراءة: ${simplified.readingEaseScore}/100 · وقت القراءة التقريبي: ${Math.max(1, Math.round(simplified.estimatedReadingTimeSeconds / 60))} دقيقة`
              : `Reading ease: ${simplified.readingEaseScore}/100 · Approx. reading time: ${Math.max(1, Math.round(simplified.estimatedReadingTimeSeconds / 60))} min`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReadingSupportPanel;
