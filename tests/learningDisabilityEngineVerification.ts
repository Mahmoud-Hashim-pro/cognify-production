/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Milestone 27: Specific Learning Disabilities (SLD) & Assistive Engine Verification
 * Comprehensive automated test suite for Dyslexia Bionic fixation, syllable chunking,
 * voice-to-essay scaffolding, and cognitive text simplification.
 */

import {
  calculateFixationLength,
  bionicizeWord,
  bionicizeText,
  chunkEnglishWord,
  chunkArabicWord,
  chunkTextPhonetically,
  structureSpokenThoughtsIntoEssay,
  simplifyAcademicText,
  ACADEMIC_SAMPLES,
} from '../src/lib/learningDisabilityEngine.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

export async function runLearningDisabilityEngineVerification(): Promise<{ passed: number; failed: number }> {
  console.log('\n[27] Specific Learning Disabilities (SLD) & Assistive Engine Verification');

  // ── 1. Bionic Fixation Length Logic ──
  assert(calculateFixationLength(0, 2) === 0, 'Zero length returns 0 fixation');
  assert(calculateFixationLength(1, 2) === 1, 'Single character word returns 1 fixation');
  assert(calculateFixationLength(2, 1) === 1, '2-char word with low intensity fixes 1 char');
  assert(calculateFixationLength(3, 2) === 2, '3-char word with normal intensity fixes 2 chars');
  assert(calculateFixationLength(6, 2) === 3, '6-char word with normal intensity fixes 3 chars');
  assert(calculateFixationLength(10, 1) < calculateFixationLength(10, 3), 'Higher intensity yields higher fixation length');
  assert(calculateFixationLength(10, 3) <= 10, 'Fixation never exceeds word length');

  // ── 2. Bionic Word Tokenizer ──
  const englishWordToken = bionicizeWord('Neuroscience', 2);
  assert(englishWordToken.isWord === true, 'Recognizes regular word as isWord: true');
  assert(englishWordToken.prefix.length > 0, 'Generates non-empty prefix');
  assert(englishWordToken.prefix + englishWordToken.suffix === 'Neuroscience', 'Prefix + suffix reconstructs original word');

  const punctuationToken = bionicizeWord('...', 2);
  assert(punctuationToken.isWord === false, 'Recognizes pure punctuation as isWord: false');

  const quotedWordToken = bionicizeWord('"Cognify"', 2);
  assert(quotedWordToken.isWord === true, 'Punctuation-wrapped word parsed properly');
  assert(quotedWordToken.prefix.startsWith('"'), 'Leading punctuation preserved in prefix');
  assert(quotedWordToken.trailingSpace === '"', 'Trailing punctuation preserved in trailingSpace');

  const arabicToken = bionicizeWord('الاستيعاب', 2);
  assert(arabicToken.isWord === true, 'Arabic word processed cleanly');
  assert(arabicToken.prefix.length >= 2, 'Arabic word receives at least 2 fixated chars');

  // ── 3. Bionic Paragraph Formatter ──
  const samplePara = 'First paragraph text here.\n\nSecond paragraph text follows.';
  const bionicParas = bionicizeText(samplePara, 2);
  assert(bionicParas.length === 2, 'Splits into exactly 2 paragraphs across double newlines');
  assert(bionicParas[0].tokens.length === 4, 'First paragraph tokenizes all 4 words');
  assert(bionicParas[1].tokens.length === 4, 'Second paragraph tokenizes all 4 words');
  assert(bionicizeText('', 2).length === 0, 'Empty text returns empty paragraph array');

  // ── 4. Syllable Chunking (English & Arabic) ──
  const enChunks = chunkEnglishWord('understanding');
  assert(enChunks.length >= 2, 'English word "understanding" splits into at least 2 syllables');
  assert(enChunks.join('') === 'understanding', 'Syllable chunks reconstruct original English word');

  const shortEn = chunkEnglishWord('cat');
  assert(shortEn.length === 1 && shortEn[0] === 'cat', 'Short word "cat" remains a single chunk');

  const arChunks = chunkArabicWord('الاستيعاب');
  assert(arChunks.length >= 2, 'Arabic word "الاستيعاب" splits into at least 2 syllables');
  assert(arChunks[0] === 'الـ', 'Arabic prefix "الـ" cleanly segmented');

  const sentenceChunks = chunkTextPhonetically('العقل البشري يحلل الكلمات', 'Arabic');
  assert(sentenceChunks.length === 4, 'Processes all 4 words in Arabic sentence');
  assert(sentenceChunks[0].phoneticHints !== undefined, 'Generates human-readable bullet hints');

  // ── 5. Voice-to-Essay Scaffold Generator ──
  const rawThoughtsAr = 'الذكاء الاصطناعي يحدث ثورة في التعليم الجامعي. يجب على الجامعات تبني أدوات المساعدة للطلاب ذوي الإعاقة. أولاً توفير قارئات الشاشة والترجمة الفورية. ثانياً تدريب الأساتذة على التعامل مع التنوع العصبي. ثالثاً دمج التقنيات في الاختبارات الرسمية. المعارضون يخشون من الغش والاتكالية لكن الحوكمة الرشيدة تمنع ذلك. الخاتمة تدعو إلى بيئة تعليمية شاملة وميسرة للجميع.';
  const essayScaffold = structureSpokenThoughtsIntoEssay(rawThoughtsAr, 'argumentative', 'Arabic');

  assert(essayScaffold.sections.length === 7, 'Generates standard 7-section academic essay scaffold');
  assert(essayScaffold.sections[0].id === 'hook', 'First section is hook');
  assert(essayScaffold.sections[1].id === 'thesis', 'Second section is thesis');
  assert(essayScaffold.sections[2].id === 'point_1', 'Third section is point_1');
  assert(essayScaffold.sections[3].id === 'point_2', 'Fourth section is point_2');
  assert(essayScaffold.sections[4].id === 'point_3', 'Fifth section is point_3');
  assert(essayScaffold.sections[5].id === 'counter_argument', 'Sixth section is counter_argument');
  assert(essayScaffold.sections[6].id === 'conclusion', 'Seventh section is conclusion');
  assert(essayScaffold.totalWordCount > 20, 'Total word count is calculated and positive');
  assert(essayScaffold.sections[0].suggestedTransitionsAr.length > 0, 'Provides Arabic academic transition phrases');
  assert(essayScaffold.executiveTipsAr.length === 3, 'Provides 3 executive functioning tips for ADHD/Dysgraphia');

  // English essay scaffold test
  const rawThoughtsEn = 'Higher education requires digital accessibility. Screen readers must be supported natively across all courseware. Empirical studies prove multi-sensory tools boost retention. Additionally faculty need neurodiversity pedagogical training. Critics cite financial overhead however open-source solutions mitigate costs. In conclusion universal design elevates institutional outcomes.';
  const enScaffold = structureSpokenThoughtsIntoEssay(rawThoughtsEn, 'argumentative', 'English');
  assert(enScaffold.sections.length === 7, 'Generates 7 sections for English essay scaffold');
  assert(enScaffold.sections[0].suggestedTransitionsEn.length > 0, 'Provides English academic transition phrases');

  // ── 6. Cognitive Text Simplifier ──
  const denseAcademicText = 'تعتمد المرونة العصبية والوظائف التنفيذية على كفاءة الذاكرة العاملة في معالجة المدخلات الحسية المتزامنة دون إجهاد معرفي زائد، مما يسهم في رفع جودة الاستيعاب الأكاديمي لدى الطلاب.';
  const simplified = simplifyAcademicText(denseAcademicText, 'Arabic');

  assert(simplified.keyPoints.length >= 1, 'Generates key bullet points from dense paragraph');
  assert(simplified.readingEaseScore >= 15 && simplified.readingEaseScore <= 95, 'Reading ease score within valid range [15, 95]');
  assert(simplified.estimatedReadingTimeSeconds > 0, 'Calculates positive estimated reading time');
  assert(simplified.difficultGlossary.length >= 1, 'Detects and glosses at least 1 academic jargon term');
  assert(simplified.difficultGlossary.some((g) => g.term === 'المرونة العصبية' || g.term === 'الوظائف التنفيذية' || g.term === 'الذاكرة العاملة'), 'Correctly identifies core target jargon');
  assert(simplified.plainExplanation.length > 15, 'Generates plain-language narrative explanation');

  // English simplifier test
  const denseEn = 'Synaptic neuroplasticity interacts dynamically with cognitive load and executive control during multi-modal instruction.';
  const simplifiedEn = simplifyAcademicText(denseEn, 'English');
  assert(simplifiedEn.keyPoints.length >= 1, 'English simplification generates key points');
  assert(simplifiedEn.difficultGlossary.some((g) => g.term === 'neuroplasticity' || g.term === 'cognitive load'), 'Identifies English jargon terms');

  // ── 7. Academic Samples Catalog ──
  assert(ACADEMIC_SAMPLES.length >= 2, 'At least 2 academic sample articles cataloged');
  assert(ACADEMIC_SAMPLES[0].contentAr.length > 50, 'First sample contains rich Arabic content');
  assert(ACADEMIC_SAMPLES[0].contentEn.length > 50, 'First sample contains rich English content');

  console.log(`\n  Learning Disabilities Engine Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').includes('learningDisabilityEngineVerification')) {
  runLearningDisabilityEngineVerification().then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
