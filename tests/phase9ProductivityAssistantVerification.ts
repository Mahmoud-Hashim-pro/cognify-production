/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi (رفيقي) — Phase 9 Productivity Assistant Verification Suite
 * 
 * Comprehensive automated verification test suite for Phase 9:
 * - Section 3 (Work & Create) Architecture & Feature Registration
 * - Voice Document Creation & Dictation (punctuation, commands, replacement guards)
 * - Writing & Email Assistant (MSA, Egyptian, English, tones, lengths, security guards)
 * - PowerPoint Creator & OpenXML PPTX Generator (slide review, speaker notes, ZIP binary)
 * - Excel Assistant (CSV/TSV parsing, table summary, formula evaluator, overwrite protection)
 * - Chart Description Engine (grounded metrics, trends, comparisons, tabular equivalent)
 * - Smart Form Assistant (required/optional, sensitive data guards, validation, safe review)
 * - Navigation, Deep Linking, and Zero #00AEB8 Theme Invariant
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  PRODUCT_SECTIONS,
  getProductSection,
} from '../src/lib/sections';
import {
  parseRoute,
  buildHash,
  getRouteTitle,
  getRouteAnnouncement,
  getRouteBreadcrumbs,
  VALID_VIEWS,
} from '../src/lib/navigation';
import {
  normalizeSpokenPunctuation,
  parseVoiceInputToCommand,
  verifyDocumentReplacementSafety,
  exportDocumentToMarkdown,
  exportDocumentToPlainText,
  generateEmailDraft,
  canSendEmailDirectly,
  createPresentationFromTopic,
  createPresentationFromOutline,
  generatePptxBlob,
  exportPresentationToHtmlDeck,
  parseCsvOrTsv,
  generateSpreadsheetSummary,
  evaluateSpreadsheetFormula,
  verifyCellUpdateSafety,
  exportSpreadsheetToCsv,
  exportSpreadsheetToTsv,
  exportSpreadsheetToExcelXml,
  describeChartData,
  isSensitiveFormField,
  canSubmitFormDirectly,
  ACCESSIBLE_FORM_TEMPLATES,
  validateFormValues,
} from '../src/lib/productivityEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

export async function runPhase9ProductivityTests() {
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('   RAFIQI — PHASE 9 PRODUCTIVITY ASSISTANT VERIFICATION SUITE    ');
  console.log('══════════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SECTION 3 (WORK & CREATE) REGISTRATION & ARCHITECTURE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ 1. Section 3 (Work & Create) Architecture & Registration');
  const workCreateSection = getProductSection('work_create');
  assert(!!workCreateSection, 'Section 3 (work_create) exists in PRODUCT_SECTIONS');
  assert(workCreateSection?.numericOrder === 3, 'Section 3 has numericOrder === 3');
  assert(workCreateSection?.titleEn === 'Work & Create', 'Section 3 English title is "Work & Create"');
  assert(workCreateSection?.titleAr === 'العمل والإبداع', 'Section 3 Arabic title is "العمل والإبداع"');

  const primaryFeature = workCreateSection?.features.find((f) => f.isPrimaryAction);
  assert(!!primaryFeature, 'Section 3 has a designated primaryAction feature');
  assert(primaryFeature?.id === 'feat_productivity_workspace', 'Primary action is feat_productivity_workspace');
  assert(primaryFeature?.targetView === 'productivity', 'Primary action targets view "productivity"');

  const featureIds = workCreateSection?.features.map((f) => f.id) || [];
  assert(featureIds.includes('feat_voice_doc_creation'), 'Features include voice document creation');
  assert(featureIds.includes('feat_writing_email_assistant'), 'Features include writing and email assistant');
  assert(featureIds.includes('feat_powerpoint_creator'), 'Features include PowerPoint creator');
  assert(featureIds.includes('feat_excel_assistant'), 'Features include Excel & data spreadsheet assistant');
  assert(featureIds.includes('feat_chart_describer'), 'Features include chart describer');
  assert(featureIds.includes('feat_smart_form_filler'), 'Features include smart form filler');
  assert(featureIds.includes('feat_academic_planner'), 'Preserves feat_academic_planner');
  assert(featureIds.includes('feat_goals_gpa'), 'Preserves feat_goals_gpa');
  assert(featureIds.includes('feat_cognitive_gym'), 'Preserves feat_cognitive_gym');
  assert(featureIds.includes('feat_analytics'), 'Preserves feat_analytics');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. VOICE DOCUMENT CREATION & DICTATION COMMANDS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 2. Voice Document Creation & Punctuation Normalization');
  const arPunc1 = normalizeSpokenPunctuation('هل نلتقي غدا علامة استفهام نعم بالتأكيد نقطة', 'ar');
  assert(arPunc1.includes('؟'), 'Normalizes Arabic "علامة استفهام" to "؟"');
  assert(arPunc1.includes('.'), 'Normalizes Arabic "نقطة" to "."');

  const arPunc2 = normalizeSpokenPunctuation('الموضوع الأول فاصلة والموضوع الثاني نقطتان الشرح', 'ar');
  assert(arPunc2.includes('،'), 'Normalizes Arabic "فاصلة" to "،"');
  assert(arPunc2.includes(':'), 'Normalizes Arabic "نقطتان" to ":"');

  const enPunc = normalizeSpokenPunctuation('Are we ready question mark Yes period Next item comma please', 'en');
  assert(enPunc.includes('?'), 'Normalizes English "question mark" to "?"');
  assert(enPunc.includes('.'), 'Normalizes English "period" to "."');
  assert(enPunc.includes(','), 'Normalizes English "comma" to ","');

  // Command parsing
  const cmdH1 = parseVoiceInputToCommand('عنوان رئيسي خطة المشروع', 'ar');
  assert(cmdH1.isStructuralCommand && cmdH1.blockType === 'heading1', 'Parses Arabic "عنوان رئيسي" as heading1');
  assert(cmdH1.text === 'خطة المشروع', 'Extracts heading1 content correctly');
  assert(cmdH1.spokenFeedbackAr.includes('خطة المشروع'), 'Produces spoken audio confirmation');

  const cmdH2 = parseVoiceInputToCommand('عنوان فرعي المتطلبات الفنية', 'ar');
  assert(cmdH2.isStructuralCommand && cmdH2.blockType === 'heading2', 'Parses Arabic "عنوان فرعي" as heading2');

  const cmdBullet = parseVoiceInputToCommand('نقطة جديدة مراجعة الميزانية السنوية', 'ar');
  assert(cmdBullet.isStructuralCommand && cmdBullet.blockType === 'bullet', 'Parses Arabic "نقطة جديدة" as bullet');

  const cmdNumbered = parseVoiceInputToCommand('قائمة مرقمة إرسال المستند للعميد', 'ar');
  assert(cmdNumbered.isStructuralCommand && cmdNumbered.blockType === 'numbered', 'Parses Arabic "قائمة مرقمة" as numbered');

  const cmdEnH1 = parseVoiceInputToCommand('Heading 1 Annual Executive Report', 'en');
  assert(cmdEnH1.isStructuralCommand && cmdEnH1.blockType === 'heading1', 'Parses English "Heading 1" as heading1');

  const cmdEnBullet = parseVoiceInputToCommand('New bullet Review laboratory equipment', 'en');
  assert(cmdEnBullet.isStructuralCommand && cmdEnBullet.blockType === 'bullet', 'Parses English "New bullet" as bullet');

  // Clear request and replacement safety guard
  const cmdClear = parseVoiceInputToCommand('مسح الكل', 'ar');
  assert(cmdClear.isClearRequest === true, 'Detects clear document request');

  const sampleDoc = {
    id: 'doc_test',
    title: 'Test Doc',
    blocks: [
      { id: 'b1', type: 'heading1' as const, text: 'Title', createdAt: '' },
      { id: 'b2', type: 'paragraph' as const, text: 'Active content text here', createdAt: '' },
    ],
    language: 'ar' as const,
    updatedAt: '',
  };
  const safetyCheck = verifyDocumentReplacementSafety(sampleDoc, 0);
  assert(safetyCheck.requiresConfirmation === true, 'Guards against overwriting document without confirmation');
  assert(safetyCheck.existingWordCount > 0, 'Reports existing word count');

  const emptyDoc = { id: 'empty', title: '', blocks: [], language: 'ar' as const, updatedAt: '' };
  assert(verifyDocumentReplacementSafety(emptyDoc, 0).requiresConfirmation === false, 'Allows replacement on empty doc without friction');

  const mdExport = exportDocumentToMarkdown(sampleDoc);
  assert(mdExport.includes('# Title'), 'Exports heading1 to markdown');
  assert(mdExport.includes('Active content text here'), 'Exports paragraph to markdown');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. WRITING & EMAIL ASSISTANT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 3. Writing and Email Assistant');
  assert(canSendEmailDirectly() === false, 'Strict security: canSendEmailDirectly() returns false');

  // Formal MSA draft
  const msaDraft = generateEmailDraft({
    recipient: 'د. أحمد خالد',
    purpose: 'طلب تمديد موعد التكليف',
    keyPoints: ['إنجاز 70% من البحث', 'الحاجة ليومين إضافيين'],
    deadlineOrNextStep: 'الخميس القادم',
    tone: 'formal',
    dialect: 'msa',
    length: 'medium',
  });
  assert(msaDraft.subject.includes('طلب تمديد موعد التكليف'), 'Generates relevant subject line in MSA');
  assert(msaDraft.salutation.includes('سعادة الأستاذ / د. أحمد خالد'), 'Generates formal Arabic salutation');
  assert(msaDraft.fullDraftText.includes('الخميس القادم'), 'Includes deadline in call to action');
  assert(msaDraft.signOff.includes('وتفضلوا بقبول فائق الاحترام'), 'Includes formal Arabic sign-off');
  assert(msaDraft.disclaimer.includes('رفيقي لا يرسل البريد'), 'Includes privacy disclosure');

  // Egyptian Ammiya draft
  const egyDraft = generateEmailDraft({
    recipient: 'كريم',
    purpose: 'ترتيب ميعاد مراجعة المشروع',
    keyPoints: ['خلصنا الجزء الأول', 'محتاجين نقعد نص ساعة'],
    tone: 'friendly',
    dialect: 'egyptian',
    length: 'short',
  });
  assert(egyDraft.salutation.includes('أهلاً بك يا كريم'), 'Generates friendly Egyptian salutation');
  assert(egyDraft.fullDraftText.includes('حبيت أتواصل مع حضرتك'), 'Uses natural Egyptian conversational phrasing');
  assert(egyDraft.signOff.includes('مع خالص الود والشكر'), 'Includes friendly sign-off');

  // English draft
  const enDraft = generateEmailDraft({
    recipient: 'Dr. Sarah Connor',
    purpose: 'Lab Access Approval',
    keyPoints: ['Conducting computer vision experiment', 'Safety protocols reviewed'],
    tone: 'academic',
    dialect: 'english',
    length: 'medium',
  });
  assert(enDraft.salutation.includes('Dear Professor Dr. Sarah Connor'), 'Generates English academic salutation');
  assert(enDraft.fullDraftText.includes('Lab Access Approval'), 'Includes English purpose');
  assert(enDraft.signOff.includes('Sincerely'), 'Includes professional English sign-off');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. POWERPOINT CREATOR & OPENXML PPTX GENERATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 4. PowerPoint Creator & PPTX Generation');
  const pres = createPresentationFromTopic('تطبيقات الذكاء الاصطناعي في التعليم', 4, 'ar');
  assert(pres.slides.length === 4, 'Generates requested number of slides (4)');
  assert(pres.slides[0].layout === 'title', 'First slide has title layout');
  assert(pres.slides[0].title.includes('الذكاء الاصطناعي'), 'First slide title matches topic');
  assert(pres.slides[0].bulletPoints.length > 0, 'Slide contains structured bullet points');
  assert(!!pres.slides[0].speakerNotes, 'Slide contains non-visual speaker notes for screen reader');

  const presFromOutline = createPresentationFromOutline(`
# مقدمة عن التكنولوجيا
- تعريف التقنية الحديثة
- أثرها على الاستقلالية
Notes: نرحب بالحضور ونوضح أهمية التقنيات الحديثة.
# الحلول الميسرة
- قارئات الشاشة الذكية
- التوجيه الصوتي الفوري
Notes: شرح تفصيلي لأدوات الوصول.
  `, 'ar');
  assert(presFromOutline.slides.length >= 2, 'Parses outline into multiple slides');
  assert(presFromOutline.slides[0].speakerNotes.includes('نرحب بالحضور'), 'Extracts speaker notes from outline');

  // Test OpenXML PPTX binary creation
  const pptxBlob = await generatePptxBlob(pres);
  assert(pptxBlob instanceof Blob, 'generatePptxBlob returns a genuine Blob');
  assert(pptxBlob.size > 1000, `Generated .pptx blob has valid non-zero size (${pptxBlob.size} bytes)`);

  const htmlDeck = exportPresentationToHtmlDeck(pres);
  assert(htmlDeck.includes('<!DOCTYPE html>'), 'Exports presentation to accessible HTML deck');
  assert(htmlDeck.includes('ملاحظات المتحدث'), 'Includes accessible speaker notes in HTML deck');

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. EXCEL ASSISTANT & SPREADSHEET ENGINE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 5. Excel Assistant & Spreadsheet Engine');
  const csvData = `المادة,الدرجة,الساعات
البرمجة,90,3
الذكاء الاصطناعي,85,4
الشبكات,95,3`;
  const sheet = parseCsvOrTsv(csvData, 'سجل الدرجات');
  assert(sheet.totalRows === 3, 'Correctly parsed 3 data rows');
  assert(sheet.totalColumns === 3, 'Correctly parsed 3 columns');
  assert(sheet.headers[0] === 'المادة', 'Header 0 is "المادة"');
  assert(sheet.headers[1] === 'الدرجة', 'Header 1 is "الدرجة"');

  const summary = generateSpreadsheetSummary(sheet);
  assert(summary.numericColumns.includes('الدرجة'), 'Identifies "الدرجة" as numeric column');
  assert(summary.statistics['الدرجة'].sum === 270, 'Calculates correct sum of grades: 90+85+95 = 270');
  assert(summary.statistics['الدرجة'].average === 90, 'Calculates correct average: 270/3 = 90');
  assert(summary.statistics['الدرجة'].min === 85, 'Calculates correct min: 85');
  assert(summary.statistics['الدرجة'].max === 95, 'Calculates correct max: 95');
  assert(summary.summaryTextAr.includes('270'), 'Arabic summary mentions total sum 270');

  // Formula evaluation
  const sumFormula = evaluateSpreadsheetFormula('=SUM(B1:B3)', sheet);
  assert(sumFormula.isValid === true, 'SUM formula is valid');
  assert(sumFormula.result === 270, 'SUM(B1:B3) evaluates to 270');
  assert(sumFormula.explanationAr.includes('تجمع 3 خلايا'), 'SUM explanation mentions 3 cells');

  const avgFormula = evaluateSpreadsheetFormula('=AVERAGE(B1:B3)', sheet);
  assert(avgFormula.result === 90, 'AVERAGE(B1:B3) evaluates to 90');

  const minFormula = evaluateSpreadsheetFormula('=MIN(B1:B3)', sheet);
  assert(minFormula.result === 85, 'MIN(B1:B3) evaluates to 85');

  const maxFormula = evaluateSpreadsheetFormula('=MAX(B1:B3)', sheet);
  assert(maxFormula.result === 95, 'MAX(B1:B3) evaluates to 95');

  const ifFormula = evaluateSpreadsheetFormula('=IF(B1>=90, "ممتاز", "جيد")', sheet);
  assert(ifFormula.result === 'ممتاز', 'IF formula evaluates true condition to "ممتاز"');

  const arithFormula = evaluateSpreadsheetFormula('=B1+B2', sheet);
  assert(arithFormula.result === 175, 'Arithmetic B1+B2 (90+85) evaluates to 175');

  const divZeroFormula = evaluateSpreadsheetFormula('=B1/0', sheet);
  assert(divZeroFormula.result === '#DIV/0!', 'Guards against division by zero (#DIV/0!)');

  // Overwrite safety guard
  assert(verifyCellUpdateSafety('', 'new').safeToApplyDirectly === true, 'Allows setting empty cell without warning');
  assert(verifyCellUpdateSafety('oldVal', 'newVal', false).safeToApplyDirectly === false, 'Flags overwrite on cell with existing value');
  const formulaGuard = verifyCellUpdateSafety('=SUM(A1:A5)', 100, true);
  assert(formulaGuard.safeToApplyDirectly === false, 'Flags overwrite on cell containing formula');
  assert(formulaGuard.warningAr?.includes('صيغة حسابية'), 'Warns specifically about formula loss');

  // Export formats
  const csvExport = exportSpreadsheetToCsv(sheet);
  assert(csvExport.includes('البرمجة,90,3'), 'Exports standard CSV format');

  const tsvExport = exportSpreadsheetToTsv(sheet);
  assert(tsvExport.includes('البرمجة\t90\t3'), 'Exports standard TSV format');

  const xmlExport = exportSpreadsheetToExcelXml(sheet);
  assert(xmlExport.includes('urn:schemas-microsoft-com:office:spreadsheet'), 'Exports genuine Excel SpreadsheetML XML');

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. CHART DESCRIPTION ENGINE (ZERO HALLUCINATION)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 6. Chart Description Engine');
  const chartData = {
    title: 'تطور نسبة النجاح الأكاديمي',
    chartType: 'column' as const,
    xAxisTitle: 'السنوات',
    yAxisTitle: 'النسبة المئوية',
    units: '%',
    dataPoints: [
      { label: '2023', value: 70 },
      { label: '2024', value: 80 },
      { label: '2025', value: 90 },
    ],
  };

  const chartAnalysis = describeChartData(chartData);
  assert(chartAnalysis.comparisons.total === 240, 'Calculates exact total sum: 70+80+90 = 240');
  assert(chartAnalysis.comparisons.average === 80, 'Calculates exact average: 80%');
  assert(chartAnalysis.comparisons.highest.label === '2025' && chartAnalysis.comparisons.highest.value === 90, 'Identifies peak at 2025 (90%)');
  assert(chartAnalysis.comparisons.lowest.label === '2023' && chartAnalysis.comparisons.lowest.value === 70, 'Identifies lowest at 2023 (70%)');
  assert(chartAnalysis.comparisons.range === 20, 'Calculates exact range (90 - 70 = 20)');

  assert(chartAnalysis.keyTrendsAr.some((t) => t.includes('تصاعدياً مستمراً')), 'Accurately detects strictly upward trend');
  assert(chartAnalysis.tabularEquivalent.length === 3, 'Produces complete 3-row tabular equivalent');
  assert(chartAnalysis.limitationsAr.some((l) => l.includes('3 نقاط قياس محددة')), 'Includes sample size limitation disclosure');
  assert(chartAnalysis.limitationsAr.some((l) => l.includes('دون افتعال')), 'Includes anti-hallucination disclosure');

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. SMART FORM FILLING (PRIVACY & CONFIRMATION GUARDS)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 7. Smart Form Filling & Sensitive Data Safeguards');
  assert(canSubmitFormDirectly() === false, 'Strict security: canSubmitFormDirectly() returns false');

  // Sensitive field detection
  assert(isSensitiveFormField('national_id', 'الرقم القومي') === true, 'Detects national_id as sensitive');
  assert(isSensitiveFormField('password', 'كلمة المرور') === true, 'Detects password as sensitive');
  assert(isSensitiveFormField('credit_card', 'بطاقة الائتمان') === true, 'Detects credit_card as sensitive');
  assert(isSensitiveFormField('student_name', 'اسم الطالب') === false, 'Non-sensitive field is not flagged');

  const formTpl = ACCESSIBLE_FORM_TEMPLATES[0];
  assert(!!formTpl, 'Standard accessible accommodation form template exists');
  const sensitiveField = formTpl.fields.find((f) => f.isSensitive);
  assert(!!sensitiveField, 'Accommodation template designates sensitive field (National ID)');

  // Form validation
  const invalidValues = { student_name: '', email: 'not-an-email' };
  const valResult = validateFormValues(formTpl, invalidValues);
  assert(valResult.isValid === false, 'Flags invalid form missing required fields');
  assert(valResult.missingRequiredCount > 0, 'Reports count of missing required fields');
  assert(!!valResult.errorsAr['email'], 'Catches invalid email format');

  const validValues = {
    student_name: 'علي حسن',
    student_id: '123456',
    email: 'ali@uni.edu.eg',
    accommodation_type: 'Screen Reader',
    sensitive_national_id: '29901010123456',
  };
  const valResultValid = validateFormValues(formTpl, validValues);
  assert(valResultValid.isValid === true, 'Validates completed form successfully');

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. NAVIGATION, ROUTING & DEEP LINKING
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 8. Navigation & Deep Linking');
  assert(VALID_VIEWS.includes('productivity'), 'VALID_VIEWS includes "productivity"');

  const parsedProd = parseRoute('#productivity');
  assert(parsedProd.view === 'productivity', '#productivity parses to view "productivity"');

  const parsedProdVoice = parseRoute('#productivity/voice_doc');
  assert(parsedProdVoice.view === 'productivity' && parsedProdVoice.tab === 'voice_doc', '#productivity/voice_doc parses tool');

  const parsedWorkCreate = parseRoute('#work_create');
  assert(parsedWorkCreate.view === 'disability' && parsedWorkCreate.section === 'work_create', '#work_create parses to section "work_create"');

  const hashBuilt = buildHash({ view: 'productivity' });
  assert(hashBuilt === '#productivity', 'buildHash produces #productivity');

  const titleAr = getRouteTitle({ view: 'productivity' }, 'ar');
  assert(titleAr.includes('الإنتاجية'), 'getRouteTitle in Arabic mentions الإنتاجية');

  const breadcrumbs = getRouteBreadcrumbs({ view: 'productivity' }, 'ar');
  assert(breadcrumbs.length >= 2, 'Produces structured breadcrumbs for productivity view');

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. DESIGN SYSTEM INVARIANT: ZERO #00AEB8 COMPLIANCE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 9. Design System Invariant: Zero Legacy Cyan (#00AEB8)');
  const engineSource = readFileSync(join(process.cwd(), 'src/lib/productivityEngine.ts'), 'utf-8');
  assert(!engineSource.includes('#00AEB8') && !engineSource.includes('#00aeb8'), 'productivityEngine.ts has ZERO #00AEB8 instances');

  const viewSource = readFileSync(join(process.cwd(), 'src/components/AccessibleProductivityWorkspaceView.tsx'), 'utf-8');
  assert(!viewSource.includes('#00AEB8') && !viewSource.includes('#00aeb8'), 'AccessibleProductivityWorkspaceView.tsx has ZERO #00AEB8 instances');

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`   PHASE 9 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('══════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`Phase 9 Verification Failed with ${failed} failing assertions`);
  }

  return { passed, failed };
}

// Execute directly if run as script
if (process.argv[1]?.includes('phase9ProductivityAssistantVerification')) {
  runPhase9ProductivityTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
