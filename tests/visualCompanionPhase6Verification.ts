/**
 * Rafiqi — Phase 6: See & Understand — Advanced Visual Intelligence Verification Suite
 *
 * Verifies all 8 Advanced Visual Intelligence capabilities:
 * 1. Smart Scene Memory (Session-scoped memory, contextual Q&A, invalidation, zero unsanctioned persistence)
 * 2. Color & Pattern Detector (Solid, striped, plaid, floral, polka dots, dim-lighting uncertainty warnings)
 * 3. Clothing Assistant (Garment categories, outfit pairing suggestions, cut-off warnings, zero demographic judgments)
 * 4. Barcode & Label Scanner (Barcode detection, visible label text OCR, product database honesty disclosure)
 * 5. Expiry Date Reader (Expiry vs production vs batch number, safety disclaimer, reposition guidance)
 * 6. Structured Document Understanding (Headings, tables, forms, lists, invoices, literal vs interpretation)
 * 7. Cluttered Object Finder (Clock positions 1-12, relative positions, landmarks, occlusion explanation, no metric hallucinations)
 * 8. Uploaded Image Validation (MIME types, 10MB limit, empty file checks, bilingual feedback)
 */

import {
  createVisualCompanionSession,
  parseColorPatternResult,
  parseClothingAnalysisResult,
  parseBarcodeScannerResult,
  parseExpiryDateResult,
  parseStructuredDocument,
  parseClutteredObjectFinderResult,
  validateUploadedImageFile,
  buildCompanionPrompt,
  parseVoiceCommand,
  QUICK_VQA_PRESETS,
} from '../src/lib/visualCompanionEngine.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[AssertionFailed] ${message}`);
  }
}

export function runVisualCompanionPhase6Verification(): { passed: number; failed: number } {
  console.log('\n======================================================');
  console.log('👁️ Section 76: Rafiqi Phase 6 See & Understand Visual Intelligence');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void) {
    try {
      fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Smart Scene Memory
  // ─────────────────────────────────────────────────────────────
  console.log('--- Capability A: Smart Scene Memory ---');

  runTest('Smart Scene Memory records observation and stores session-scoped history', () => {
    const session = createVisualCompanionSession();

    session.recordSceneObservation({
      detectedObjects: ['مفاتيح', 'كوب قهوة', 'دفتر'],
      adjacency: [{ itemA: 'مفاتيح', itemB: 'كوب قهوة', relation: 'بجانب' }],
      colors: ['أزرق', 'فضي'],
      textSnippets: ['ملاحظات'],
      rawSummary: 'طاولة خشبية عليها مفاتيح زرقاء بجوار كوب قهوة فضي ودفتر ملاحظات',
    });

    const recent = session.getRecentSceneObservations();
    assert(recent.length === 1, 'Expected 1 recent scene observation');
    assert(recent[0].detectedObjects.some(o => o.name === 'مفاتيح'), 'Expected detectedObjects to contain keys');
    assert(recent[0].isCurrent === true, 'Most recent observation must be current');
  });

  runTest('Smart Scene Memory answers "Where did I last see keys?" with relative time and context', () => {
    const session = createVisualCompanionSession();

    session.recordSceneObservation({
      detectedObjects: ['مفاتيح', 'طاولة'],
      adjacency: [{ itemA: 'مفاتيح', itemB: 'طاولة', relation: 'على' }],
      colors: ['أسود'],
      description: 'مفاتيح سوداء موضوعة على الطاولة قرب حافة المكتب.',
      cleanSpokenText: 'مفاتيح سوداء موضوعة على الطاولة قرب حافة المكتب.',
    });

    const queryRes = session.querySceneMemory('أين رأيت المفاتيح آخر مرة؟');
    assert(queryRes.confidence !== 'uncertain', 'Keys should be recognized with confidence');
    assert(queryRes.answerAr.includes('مفاتيح'), 'Answer should mention the keys');
    assert(queryRes.answerAr.includes('طاولة') || queryRes.answerAr.includes('المشهد') || queryRes.answerAr.includes('موجودة'), 'Answer should cite location');
    assert(typeof queryRes.relativeTimeAgoAr === 'string', 'Should produce relative time description');
  });

  runTest('Smart Scene Memory answers "What was next to the cup?" correctly', () => {
    const session = createVisualCompanionSession();

    session.recordSceneObservation({
      detectedObjects: ['كوب قهوة', 'قلم', 'نظارة'],
      adjacency: [
        { itemA: 'قلم', itemB: 'كوب قهوة', relation: 'يمين' },
        { itemA: 'نظارة', itemB: 'كوب قهوة', relation: 'يسار' },
      ],
      colors: ['أبيض', 'أزرق'],
      description: 'كوب قهوة أبيض، على يمينه قلم وعلى يساره نظارة.',
    });

    const queryRes = session.querySceneMemory('ماذا كان بجوار كوب قهوة؟');
    assert(queryRes.confidence !== 'uncertain', 'Cup context should be recognized');
    assert(queryRes.answerAr.includes('قلم') || queryRes.answerAr.includes('نظارة'), 'Answer should mention neighboring items');
  });

  runTest('Smart Scene Memory answers "Has anything changed?" distinguishing past from current frame', () => {
    const session = createVisualCompanionSession();

    // Observation 1: 2 items
    session.recordSceneObservation({
      detectedObjects: ['هاتف', 'شاحن'],
      description: 'هاتف وشاحن على السرير.',
    });

    // Observation 2 (current): 1 item
    session.recordSceneObservation({
      detectedObjects: ['هاتف'],
      description: 'هاتف بمفرده على السرير.',
    });

    const changeQuery = session.querySceneMemory('هل تغير أي شيء؟');
    assert(changeQuery.answerAr.includes('شاحن') || changeQuery.answerAr.includes('تغيير') || changeQuery.answerAr.includes('تغير'), 'Should report that charger is no longer visible or scene changed');
  });

  runTest('Smart Scene Memory invalidates context on material scene change', () => {
    const session = createVisualCompanionSession();

    session.recordSceneObservation({
      detectedObjects: ['حقيبة'],
      description: 'حقيبة سفر رمادية.',
    });

    assert(session.getRecentSceneObservations()[0].isCurrent === true, 'Observation must start current');
    session.invalidateSceneContext();
    assert(session.getRecentSceneObservations()[0].isCurrent === false, 'Previous observation must be marked not current');
  });

  runTest('Smart Scene Memory handles missing context and uncertainty gracefully', () => {
    const session = createVisualCompanionSession();

    const missingQueryAr = session.querySceneMemory('أين ساعتي؟');
    assert(missingQueryAr.confidence === 'uncertain', 'Non-existent item should have uncertain confidence');
    assert(missingQueryAr.groundedInCurrent === false, 'Non-existent item is not currently visible');
    assert(missingQueryAr.answerAr.includes('لم أرصد') || missingQueryAr.answerAr.includes('غير متوفر'), 'Should communicate missing context honestly in Arabic');

    const missingQueryEn = session.querySceneMemory('Where is my watch?');
    assert(missingQueryEn.confidence === 'uncertain', 'Non-existent item should have uncertain confidence in English');
    assert(missingQueryEn.answerEn.includes('not detected') || missingQueryEn.answerEn.includes('contains no observations'), 'Should communicate missing context honestly in English');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Color & Pattern Detector
  // ─────────────────────────────────────────────────────────────
  console.log('--- Capability B: Color & Pattern Detector ---');

  runTest('Color & Pattern Detector identifies dominant colors and pattern types (striped, plaid, floral)', () => {
    const stripedText = 'القميص مقلم بخطوط طولية بيضاء وزرقاء داكنة كحلي متناسقة.';
    const stripedRes = parseColorPatternResult(stripedText, 'ar');
    assert(stripedRes.pattern === 'striped', `Expected pattern 'striped', got ${stripedRes.pattern}`);
    assert(stripedRes.dominantColors.length >= 2, 'Expected at least 2 dominant colors');
    assert(stripedRes.dominantColors.includes('أبيض'), 'Expected white color');
    assert(stripedRes.dominantColors.includes('أزرق') || stripedRes.dominantColors.includes('كحلي داكن'), 'Expected blue color');

    const floralText = 'This dress has a vibrant floral pattern with red and green roses.';
    const floralRes = parseColorPatternResult(floralText, 'en');
    assert(floralRes.pattern === 'floral', `Expected pattern 'floral', got ${floralRes.pattern}`);
    assert(floralRes.dominantColors.includes('Red'), 'Expected red color');
    assert(floralRes.dominantColors.includes('Green'), 'Expected green color');

    const plaidText = 'قميص كاروهات مربعات بنية وبيج كلاسيكية.';
    const plaidRes = parseColorPatternResult(plaidText, 'ar');
    assert(plaidRes.pattern === 'plaid', `Expected pattern 'plaid', got ${plaidRes.pattern}`);
  });

  runTest('Color & Pattern Detector issues lighting uncertainty warning when lighting is dim or low', () => {
    const dimLightingText = 'الإضاءة خافتة وضعيفة، يبدو القميص رمادياً أو كحلياً داكناً لكن قد تتأثر الألوان بالظل.';
    const dimRes = parseColorPatternResult(dimLightingText, 'ar');
    assert(dimRes.lightingConfidence === 'low', 'Expected low lighting confidence');
    assert(dimRes.lightingWarningAr !== undefined && dimRes.lightingWarningAr.length > 0, 'Expected lighting warning for user safety');
  });

  runTest('Color & Pattern Detector produces understandable Arabic and English color descriptions', () => {
    const descText = 'وشاح حريري ناعم سادة باللون الأزرق الفاتح السماوي ناصع ومتناسق.';
    const descRes = parseColorPatternResult(descText, 'ar');
    assert(descRes.pattern === 'solid', `Expected 'solid', got ${descRes.pattern}`);
    assert(descRes.relationshipsAr.length > 0, 'Should have descriptive relationships text');
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Clothing Assistant
  // ─────────────────────────────────────────────────────────────
  console.log('--- Capability C: Clothing Assistant ---');

  runTest('Clothing Assistant extracts garments, colors, and outfit matching suggestions', () => {
    const outfitText = `
ترتدي قميصاً أبيض ناصعاً بأزرار، وبنطال جينز كحلي داكن.
اقتراح التنسيق: القميص الأبيض مع بنطال الجينز الكحلي يعتبر تنسيقاً كلاسيكياً متناسقاً جداً ومناسباً للعمل اليومي.
`;
    const clothingRes = parseClothingAnalysisResult(outfitText, 'ar');
    assert(clothingRes.items.length >= 2, 'Expected at least 2 garments parsed');
    assert(clothingRes.items.some(i => i.category.includes('قميص')), 'Expected shirt category');
    assert(clothingRes.items.some(i => i.category.includes('بنطال')), 'Expected pants category');
    assert(clothingRes.pairingSuggestionsAr.length > 0, 'Expected outfit pairing suggestions');
  });

  runTest('Clothing Assistant flags cut-off garments outside camera frame clearly', () => {
    const cutOffText = `
يظهر قميص أخضر قطني. الحذاء وبقية البنطال خارج الإطار ومقطوع عند الحافة وغير ظاهر بالكامل.
`;
    const cutOffRes = parseClothingAnalysisResult(cutOffText, 'ar');
    assert(cutOffRes.hasCutOffGarments === true, 'Expected hasCutOffGarments flag');
    assert(cutOffRes.cutOffNoticeAr !== undefined, 'Expected cut-off notice');
    assert(cutOffRes.cutOffNoticeAr?.includes('خارج الإطار') || cutOffRes.cutOffNoticeAr?.includes('حافة الكاميرا'), 'Cut-off notice must clearly state items are outside frame');
  });

  runTest('Clothing Assistant strictly avoids personal demographic inferences or judgments', () => {
    const neutralText = 'قميص أسود ومعطف رمادي شتوي صوف.';
    const neutralRes = parseClothingAnalysisResult(neutralText, 'ar');
    assert(neutralRes.rawDescription.includes('قميص أسود'), 'Description should be objective');
    assert(!neutralRes.rawDescription.includes('عمرك') && !neutralRes.rawDescription.includes('جنسك'), 'No age or gender demographic claims');
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Barcode & Label Scanner
  // ─────────────────────────────────────────────────────────────
  console.log('--- Capability D: Barcode & Label Scanner ---');

  runTest('Barcode & Label Scanner extracts barcode digits, visible OCR text, and AI interpretation', () => {
    const rawAiText = `
الباركود: 6221155001234
النص المقروء على العبوة: لبن كامل الدسم مبستر 1 لتر، جهينة، يحفظ مبرداً.
الاستنتاج: عبوة حليب سائل طبيعي معبأة محلياً.
`;
    const scannerRes = parseBarcodeScannerResult(rawAiText, '6221155001234', 'ar');
    assert(scannerRes.barcodeValue === '6221155001234', 'Barcode raw digits must be preserved');
    assert(scannerRes.visibleLabelText.includes('لبن كامل الدسم'), 'Visible label text must be extracted');
    assert(scannerRes.hasBarcode === true, 'hasBarcode flag must be true');
  });

  runTest('Barcode & Label Scanner includes honest disclaimer regarding commercial database limits', () => {
    const scannerResAr = parseBarcodeScannerResult('علبة شاي أسود 100 كيس', undefined, 'ar');
    assert(scannerResAr.databaseDisclaimerAr.includes('لا تتوفر قاعدة بيانات تجارية'), 'Arabic honesty disclaimer required');

    const scannerResEn = parseBarcodeScannerResult('Black tea box 100 bags', undefined, 'en');
    assert(scannerResEn.databaseDisclaimerEn.includes('no offline commercial product catalog'), 'English honesty disclaimer required');
  });

  runTest('Barcode & Label Scanner distinguishes raw scanned data from AI generated interpretation', () => {
    const scannerRes = parseBarcodeScannerResult(
      'النص المقروء: ماء نقي معبأ صفا 500 مل. الاستنتاج: زجاجة مياه صالحة للشرب.',
      '012345678905',
      'ar'
    );
    assert(scannerRes.barcodeValue !== scannerRes.interpretation, 'Raw scanned data and interpretation must not be conflated');
    assert(scannerRes.hasBarcode === true, 'Should indicate barcode is detected');
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Expiry Date Reader
  // ─────────────────────────────────────────────────────────────
  console.log('--- Capability E: Expiry Date Reader ---');

  runTest('Expiry Date Reader extracts expiry date, production date, and batch number', () => {
    const dateText = `
PROD: 15/03/2026
EXP: 15/09/2026
BATCH: L402
`;
    const expiryRes = parseExpiryDateResult(dateText, 'ar');
    assert(expiryRes.expiryDate === '15/09/2026', `Expiry date must match, got ${expiryRes.expiryDate}`);
    assert(expiryRes.productionDate === '15/03/2026', `Production date must match, got ${expiryRes.productionDate}`);
    assert(expiryRes.batchNumber === 'L402', `Batch number must match, got ${expiryRes.batchNumber}`);
    assert(expiryRes.isLegible === true, 'isLegible flag must be true');
  });

  runTest('Expiry Date Reader attaches mandatory safety disclaimer (cannot declare product safe solely on OCR)', () => {
    const dateText = 'تاريخ الانتهاء: 20/12/2026';
    const expiryResAr = parseExpiryDateResult(dateText, 'ar');
    assert(expiryResAr.safetyDisclaimerAr.includes('تنبيه سلامة'), 'Mandatory Arabic safety disclaimer required');
    assert(expiryResAr.safetyDisclaimerAr.includes('الرائحة'), 'Must mention smell / storage');

    const expiryResEn = parseExpiryDateResult('EXP: 20/12/2026', 'en');
    assert(expiryResEn.safetyDisclaimerEn.includes('Safety Notice'), 'Mandatory English safety disclaimer required');
  });

  runTest('Expiry Date Reader offers camera reposition guidance when date is blurry or cropped', () => {
    const blurryText = 'تاريخ الصلاحية غير واضح أو مقطوع عند الحافة.';
    const expiryRes = parseExpiryDateResult(blurryText, 'ar');
    assert(expiryRes.repositionGuidanceAr !== undefined, 'Reposition guidance must be provided for unreadable date');
    assert(expiryRes.repositionGuidanceAr?.includes('تقريب الكاميرا') || expiryRes.repositionGuidanceAr?.includes('تدوير العبوة'), 'Guidance should instruct user on camera movement');
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Structured Document Understanding
  // ─────────────────────────────────────────────────────────────
  console.log('--- Capability F: Structured Document Understanding ---');

  runTest('Structured Document Understanding parses headings, paragraphs, and list items', () => {
    const docText = `
# عنوان المستند: عقد إيجار شقة سكنية
## البند الأول: الأطراف المتعاقدة
المؤجر هو أحمد السيد والمستأجر هو محمود علي.

## البند الثاني: الشروط المالية
- القيمة الإيجارية الشهرية 4000 جنيه مصري.
- مدة العقد سنة تبدأ من أول الشهر.
- التأمين مسترد عند الإخلاء.
`;
    const docRes = parseStructuredDocument(docText, 'ar');
    assert(docRes.headings.some(h => h.includes('عقد إيجار')), 'Title heading should be extracted');
    assert(docRes.headings.length >= 2, 'Headings should be detected');
    assert(docRes.lists.length >= 1, 'Lists should be parsed');
    assert(docRes.lists[0].length === 3, 'Expected 3 list items');
  });

  runTest('Structured Document Understanding parses structured invoice data and tables', () => {
    const invoiceText = `
فاتورة ضريبية مبسطة
رقم الفاتورة: INV-2026-990
التاريخ: 15/10/2026
المورد: شركة الأمل للتقنية
المجموع الكلي: 1710 ج.م

| البند | الكمية | السعر |
| كابل شاحن | 2 | 200 |
| فأرة لاسلكية | 1 | 300 |
`;
    const docRes = parseStructuredDocument(invoiceText, 'ar');
    assert(docRes.documentType === 'invoice_receipt', `Expected invoice_receipt, got ${docRes.documentType}`);
    assert(docRes.invoiceData !== undefined, 'Invoice data must be populated');
    assert(docRes.invoiceData?.invoiceNumber === 'INV-2026-990', 'Invoice number must be correct');
    assert(docRes.invoiceData?.total?.includes('1710'), 'Total amount must match');
    assert(docRes.tables.length >= 1, 'Tables should be parsed');
    assert(docRes.tables[0].headers.includes('البند'), 'Table header should contain item column');
  });

  runTest('Structured Document Understanding strictly separates literal text from AI interpretation', () => {
    const text = 'نص الخطاب: نود إحاطتكم علماً بموعد الاجتماع يوم الأحد القادم في العاشرة صباحاً.';
    const docRes = parseStructuredDocument(text, 'ar');
    assert(docRes.literalOcrText.length > 0, 'Literal text must be preserved');
    assert(docRes.summaryAr.length > 0, 'Audio summary must be ready for speech');
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Object Finder in Cluttered Scenes
  // ─────────────────────────────────────────────────────────────
  console.log('--- Capability G: Cluttered Object Finder ---');

  runTest('Cluttered Object Finder calculates clock position and relative spatial relationships', () => {
    const clutterText = `
المفاتيح موجودة في اتجاه الساعة 2 بالنسبة لمنتصف الطاولة.
الموقع: على يمين كوب الشاي وخلف الحاسوب المحمول مباشرة.
`;
    const clutterRes = parseClutteredObjectFinderResult(clutterText, 'المفاتيح', 'ar');
    assert(clutterRes.found === true, 'Object should be found');
    assert(clutterRes.clockPosition === 2, `Expected clock position 2, got ${clutterRes.clockPosition}`);
    assert(clutterRes.relativePosition === 'right', `Expected relative position right, got ${clutterRes.relativePosition}`);
    assert(clutterRes.landmarkReference !== undefined, 'Should reference landmark items');
  });

  runTest('Cluttered Object Finder explains occlusion and overlapping items without fake metric distances', () => {
    const occlusionText = `
المفاتيح موجودة جزئياً ومحجوبة أسفل كومة من الأوراق والمجلات في اتجاه الساعة 11.
`;
    const clutterRes = parseClutteredObjectFinderResult(occlusionText, 'keys', 'ar');
    assert(clutterRes.isOccludedOrOverlapping === true, 'Occlusion flag must be set');
    assert(clutterRes.occlusionExplanationAr !== undefined, 'Occlusion explanation must be generated');
    assert(!clutterRes.cleanDescription.includes('34.2 سنتيمتر'), 'No hallucinated exact metric distances');
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Uploaded Image Validation
  // ─────────────────────────────────────────────────────────────
  console.log('--- Capability H: Uploaded Image Validation ---');

  runTest('Uploaded Image Validator accepts valid formats (JPEG, PNG, WebP) within size limit', () => {
    const mockValidFile = {
      name: 'receipt.jpg',
      type: 'image/jpeg',
      size: 2 * 1024 * 1024, // 2MB
    } as File;

    const res = validateUploadedImageFile(mockValidFile);
    assert(res.isValid === true, 'Valid 2MB JPEG should pass validation');
    assert(res.fileDetails?.sizeBytes === 2 * 1024 * 1024, 'File size bytes must be recorded');
  });

  runTest('Uploaded Image Validator rejects oversized images exceeding 10MB limit with bilingual messages', () => {
    const mockLargeFile = {
      name: 'large_photo.png',
      type: 'image/png',
      size: 15 * 1024 * 1024, // 15MB
    } as File;

    const res = validateUploadedImageFile(mockLargeFile);
    assert(res.isValid === false, '15MB file must be rejected');
    assert(res.errorMessageAr?.includes('10 ميجابايت'), 'Arabic message must specify 10MB limit');
    assert(res.errorMessageEn?.includes('10MB'), 'English message must specify 10MB limit');
  });

  runTest('Uploaded Image Validator rejects unsupported MIME types and empty files', () => {
    const mockPdfFile = {
      name: 'document.pdf',
      type: 'application/pdf',
      size: 1024,
    } as File;

    const pdfRes = validateUploadedImageFile(mockPdfFile);
    assert(pdfRes.isValid === false, 'PDF must be rejected in image validator');
    assert(pdfRes.errorMessageAr?.includes('صيغة الملف غير مدعومة'), 'Arabic error must specify unsupported image format');

    const mockEmptyFile = {
      name: 'empty.png',
      type: 'image/png',
      size: 0,
    } as File;

    const emptyRes = validateUploadedImageFile(mockEmptyFile);
    assert(emptyRes.isValid === false, '0-byte file must be rejected');
    assert(emptyRes.errorMessageAr?.includes('فارغ'), 'Arabic error must specify empty file');
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Prompt Engineering & Voice Command Parsing Integration
  // ─────────────────────────────────────────────────────────────
  console.log('--- Phase 6 Prompts & Voice Commands ---');

  runTest('buildCompanionPrompt contains instructions for barcode, expiry, clothing, and document tools', () => {
    const barcodePrompt = buildCompanionPrompt({ tool: 'product', queryType: 'barcode', detailLevel: 'standard', lang: 'ar' });
    assert(barcodePrompt.includes('باركود') || barcodePrompt.includes('BARCODE'), 'Barcode prompt must contain barcode instructions');

    const expiryPrompt = buildCompanionPrompt({ tool: 'product', queryType: 'expiry', detailLevel: 'standard', lang: 'ar' });
    assert(expiryPrompt.includes('صلاحية') || expiryPrompt.includes('EXPIRY'), 'Expiry prompt must contain expiry instructions');

    const clothingPrompt = buildCompanionPrompt({ tool: 'color', queryType: 'clothing', detailLevel: 'standard', lang: 'ar' });
    assert(clothingPrompt.includes('ملابس') || clothingPrompt.includes('CLOTHING'), 'Clothing prompt must contain clothing instructions');

    const docPrompt = buildCompanionPrompt({ tool: 'read', queryType: 'document', detailLevel: 'standard', lang: 'ar' });
    assert(docPrompt.includes('مستند') || docPrompt.includes('DOCUMENT'), 'Document prompt must contain document structure instructions');
  });

  runTest('parseVoiceCommand recognizes Phase 6 voice commands for barcode, expiry, clothing, and memory', () => {
    const cmdBarcode = parseVoiceCommand('امسح الباركود');
    assert(cmdBarcode.command === 'barcode', `Expected 'barcode', got ${cmdBarcode.command}`);

    const cmdExpiry = parseVoiceCommand('تاريخ الصلاحية');
    assert(cmdExpiry.command === 'expiry', `Expected 'expiry', got ${cmdExpiry.command}`);

    const cmdClothing = parseVoiceCommand('تنسيق الملابس');
    assert(cmdClothing.command === 'clothing', `Expected 'clothing', got ${cmdClothing.command}`);

    const cmdMemory = parseVoiceCommand('أين رأيت المفاتيح؟');
    assert(cmdMemory.command === 'memory', `Expected 'memory', got ${cmdMemory.command}`);
  });

  runTest('QUICK_VQA_PRESETS contains Phase 6 presets for memory, barcode, expiry, clothing, and document', () => {
    const presetIds = QUICK_VQA_PRESETS.map(p => p.id);
    assert(presetIds.includes('scene_memory_change'), 'Should contain scene_memory_change preset');
    assert(presetIds.includes('scene_memory_keys'), 'Should contain scene_memory_keys preset');
    assert(presetIds.includes('barcode_scan'), 'Should contain barcode_scan preset');
    assert(presetIds.includes('expiry_read'), 'Should contain expiry_read preset');
    assert(presetIds.includes('clothing_outfit'), 'Should contain clothing_outfit preset');
    assert(presetIds.includes('document_structure'), 'Should contain document_structure preset');
  });

  console.log(`\n======================================================`);
  console.log(`Phase 6 Visual Intelligence Results: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    throw new Error(`Visual Companion Phase 6 Verification failed with ${failed} errors.`);
  }

  return { passed, failed };
}

// Direct execution support
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('visualCompanionPhase6Verification')) {
  try {
    const res = runVisualCompanionPhase6Verification();
    process.exit(res.failed > 0 ? 1 : 0);
  } catch (e) {
    console.error('Fatal execution error:', e);
    process.exit(1);
  }
}
