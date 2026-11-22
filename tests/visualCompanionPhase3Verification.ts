/**
 * Rafiqi — Phase 3: Real-World Visual Assistance Verification Test Suite
 *
 * Verifies:
 * 1. Smart Text Reader: Arabic RTL & English LTR OCR, Continuous Reading, Truncation/Blur Detection, No Word Fabrication
 * 2. Object Finder: Target Item Grounding, Clock & Relative Direction, Camera Reposition Guidance, No Fake Metric Distances
 * 3. Product Assistant: Packaging Inspection, Brand, Price, Quantity, Expiry Date Honesty, Detected vs Inferred Info
 * 4. Currency Recognition: Denomination Parsing, Confidence/Uncertainty, Counterfeit Disclaimers
 * 5. Contextual Scene Conversation: Frame-bound Multi-turn Turns, Invalidation on Scene Change, Anti-hallucination Guards
 * 6. Accessibility, UX, Voice Controls & Safety Invariants
 */

import assert from 'node:assert';
import {
  createVisualCompanionSession,
  buildCompanionPrompt,
  detectTextLimitations,
  segmentDocumentForContinuousReading,
  getRepositionAdvice,
  parseObjectFinderResult,
  parseProductInformation,
  parseCurrencyResult,
  detectUncertainty,
  detectSceneChange,
  SAFETY_DISCLAIMER_AR,
  SAFETY_DISCLAIMER_EN,
  CURRENCY_COUNTERFEIT_DISCLAIMER_AR,
  CURRENCY_COUNTERFEIT_DISCLAIMER_EN,
  QUICK_VQA_PRESETS,
} from '../src/lib/visualCompanionEngine.js';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err?.message || err}`);
    failed++;
  }
}

export function runVisualCompanionPhase3Verification() {
  console.log('\n--- [Phase 3: Real-World Visual Assistance Verification] ---');

  // ==========================================
  // 1. Smart Text Reader Tests
  // ==========================================
  console.log('\n  [Requirement 1: Smart Text Reader]');

  runTest('Smart Text Reader: Segments multi-paragraph documents into clean chunks', () => {
    const doc = `جامعة القاهرة - كلية الحاسبات والذكاء الاصطناعي\n\nجدول محاضرات الفصل الدراسي الثاني لعام 2026.\n\nالمحاضرة الأولى: الرؤية الحاسوبية المتقدمة تبدأ الساعة 10:00 صباحاً بقاعة 204.\n\nالمحاضرة الثانية: معالجة اللغات الطبيعية تبدأ الساعة 12:30 ظهراً بالمعمل المركزي.`;
    const chunks = segmentDocumentForContinuousReading(doc);
    assert.strictEqual(chunks.length, 4, 'Should segment into 4 logical paragraphs');
    assert.ok(chunks[0].includes('جامعة القاهرة'));
    assert.ok(chunks[2].includes('الرؤية الحاسوبية'));
  });

  runTest('Smart Text Reader: Session continuous reading controller steps forward and back correctly', () => {
    const session = createVisualCompanionSession();
    const doc = `Paragraph 1: Executive overview.\n\nParagraph 2: Implementation details.\n\nParagraph 3: Verification results.`;
    const chunks = session.initContinuousReading(doc);
    assert.strictEqual(chunks.length, 3);
    assert.strictEqual(session.isContinuousReadingActive(), true);

    const first = session.getCurrentReadingChunk();
    assert.ok(first);
    assert.strictEqual(first?.index, 0);
    assert.ok(first?.text.includes('Paragraph 1'));

    const step2 = session.nextReadingChunk();
    assert.strictEqual(step2.isFinished, false);
    assert.strictEqual(step2.chunk?.index, 1);
    assert.ok(step2.chunk?.text.includes('Paragraph 2'));

    const stepBack = session.prevReadingChunk();
    assert.strictEqual(stepBack?.index, 0);
    assert.ok(stepBack?.text.includes('Paragraph 1'));

    session.nextReadingChunk(); // to index 1
    session.nextReadingChunk(); // to index 2
    const finalStep = session.nextReadingChunk();
    assert.strictEqual(finalStep.isFinished, true);
    assert.strictEqual(session.isContinuousReadingActive(), false);
  });

  runTest('Smart Text Reader: Detects truncated or cut-off text at page edges', () => {
    const truncatedText = 'النص مقطوع عند الحافة السفلية للورقة وغير مكتمل.';
    const limit = detectTextLimitations(truncatedText, 'ar');
    assert.strictEqual(limit.hasLimitations, true);
    assert.strictEqual(limit.isTruncated, true);
    assert.ok(limit.reason?.includes('مقطوع'));
  });

  runTest('Smart Text Reader: Detects blurry or poor lighting conditions', () => {
    const blurryText = 'The bottom paragraph is blurry and unreadable due to low lighting.';
    const limit = detectTextLimitations(blurryText, 'en');
    assert.strictEqual(limit.hasLimitations, true);
    assert.strictEqual(limit.isBlurry, true);
    assert.ok(limit.reason?.toLowerCase().includes('clarity') || limit.reason?.toLowerCase().includes('text'));
  });

  runTest('Smart Text Reader: Prompt strictly forbids fabricating missing words', () => {
    const promptAr = buildCompanionPrompt({
      tool: 'read',
      queryType: 'ocr',
      detailLevel: 'detailed',
      lang: 'ar',
      readAction: 'read',
    });
    assert.ok(promptAr.includes('لا تخترع كلمات مفقودة أبداً'));
    assert.ok(promptAr.includes('من اليمين لليسار للسطور العربية'));

    const promptEn = buildCompanionPrompt({
      tool: 'read',
      queryType: 'ocr',
      detailLevel: 'detailed',
      lang: 'en',
      readAction: 'read',
    });
    assert.ok(promptEn.includes('NEVER fabricate missing words'));
    assert.ok(promptEn.includes('preserving natural reading order'));
  });

  runTest('Smart Text Reader: Concise mode requests executive summary while detailed mode requests verbatim reading', () => {
    const concise = buildCompanionPrompt({
      tool: 'read',
      queryType: 'ocr',
      detailLevel: 'concise',
      lang: 'ar',
      readAction: 'summarize',
    });
    assert.ok(concise.includes('نمط القراءة الموجز') || concise.includes('لخص الرسالة الأساسية'));

    const detailed = buildCompanionPrompt({
      tool: 'read',
      queryType: 'ocr',
      detailLevel: 'detailed',
      lang: 'ar',
      readAction: 'read',
    });
    assert.ok(detailed.includes('نمط القراءة التفصيلي') || detailed.includes('اقرأ النص المكتوب كاملاً حرفياً'));
  });

  // ==========================================
  // 2. Object Finder Tests
  // ==========================================
  console.log('\n  [Requirement 2: Object Finder]');

  runTest('Object Finder: Embeds user-targeted query and clock-face relative positioning mandate', () => {
    const prompt = buildCompanionPrompt({
      tool: 'object',
      queryType: 'object',
      targetItemQuery: 'كوب الماء',
      detailLevel: 'standard',
      lang: 'ar',
    });
    assert.ok(prompt.includes('كوب الماء'));
    assert.ok(prompt.includes('الساعة 1 إلى 12'));
    assert.ok(prompt.includes('لا تخترع مسافات مترية'));
  });

  runTest('Object Finder: Successfully parses grounded relative position when item is found', () => {
    const response = 'تم العثور على كوب الماء عند الساعة 2 على يمينك أمامك في متناول اليد والمسار سالك.';
    const result = parseObjectFinderResult(response, 'كوب الماء', 'ar');
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.clockPosition, 2);
    assert.strictEqual(result.pathClear, true);
  });

  runTest('Object Finder: Detects when requested object is not in view and generates camera reposition guidance', () => {
    const response = 'لم أتمكن من العثور على الهاتف في هذه اللقطة، الغرض غير مرئي في هذا الإطار.';
    const result = parseObjectFinderResult(response, 'الهاتف', 'ar');
    assert.strictEqual(result.found, false);
    assert.ok(result.movementSuggestion?.includes('تحريك الكاميرا'));
    assert.ok(result.movementSuggestion?.includes('الهاتف'));
  });

  runTest('Object Finder: Reposition advice in English suggests panning or tilting', () => {
    const advice = getRepositionAdvice('phone', 'en');
    assert.ok(advice.includes('panning'));
    assert.ok(advice.includes('phone'));
  });

  runTest('Object Finder: Never invents fake metric distances (grounded qualitative relations)', () => {
    const prompt = buildCompanionPrompt({
      tool: 'object',
      queryType: 'object',
      targetItemQuery: 'my keys',
      detailLevel: 'standard',
      lang: 'en',
    });
    assert.ok(prompt.includes('NEVER invent exact metric distances'));
    assert.ok(prompt.includes('within arm\'s reach'));
  });

  // ==========================================
  // 3. Product Assistant Tests
  // ==========================================
  console.log('\n  [Requirement 3: Product Assistant]');

  runTest('Product Assistant: Prompt enforces packaging inspection, price, quantity, and expiry date honesty', () => {
    const prompt = buildCompanionPrompt({
      tool: 'read',
      queryType: 'product',
      detailLevel: 'standard',
      lang: 'ar',
    });
    assert.ok(prompt.includes('عبوات المنتجات الاستهلاكية'));
    assert.ok(prompt.includes('تاريخ الصلاحية'));
    assert.ok(prompt.includes('الفصل بين النصوص المكتوبة والمعلومات المستنتجة'));
    assert.ok(prompt.includes('لا تخترع أبداً مكونات'));
  });

  runTest('Product Assistant: Parses price, quantity, and verified legible expiry date', () => {
    const aiOutput = `المعلومات المكتوبة: حليب المراعي كامل الدسم، الحجم 1 لتر، السعر 45 جنيه، تاريخ الصلاحية: 15/12/2026.
المعلومات المستنتجة: عبوة حليب طازج معقم معدة للاستهلاك اليومي.`;
    const info = parseProductInformation(aiOutput, 'ar');
    assert.strictEqual(info.isExpiryLegible, true);
    assert.strictEqual(info.expiryDate, '15/12/2026');
    assert.ok(info.price?.includes('45'));
    assert.ok(info.quantity?.includes('1 لتر'));
  });

  runTest('Product Assistant: Flags when expiry date is not clearly visible on package side', () => {
    const aiOutput = `المعلومات المكتوبة: عبوة شاي العروسة وزن 250 جم، تاريخ الصلاحية غير واضح أو غير ظاهر في هذا الجانب من العبوة.
المعلومات المستنتجة: شاي أسود مصري ناعم.`;
    const info = parseProductInformation(aiOutput, 'ar');
    assert.strictEqual(info.isExpiryLegible, false);
    assert.strictEqual(info.hasUncertainty, true);
  });

  runTest('Product Assistant: Clearly differentiates detected text from inferred product information', () => {
    const aiOutput = `Detected Text: Brand ABC Orange Juice 500 ml, Price 30 EGP.
Inferred Product Information: Sweetened citrus fruit beverage packaged in a plastic bottle.`;
    const info = parseProductInformation(aiOutput, 'en');
    assert.ok(info.detectedText.includes('ABC Orange Juice'));
    assert.ok(info.inferredInfo.includes('citrus fruit beverage'));
  });

  // ==========================================
  // 4. Currency Recognition Tests
  // ==========================================
  console.log('\n  [Requirement 4: Currency Recognition]');

  runTest('Currency Recognition: Recognizes denomination and currency correctly', () => {
    const response = 'العملة الظاهرة هي مئتا جنيه مصري 200 جنيه بحالة جيدة.';
    const parsed = parseCurrencyResult(response, 'ar');
    assert.strictEqual(parsed.denomination, '200');
    assert.strictEqual(parsed.currency, 'جنيه مصري');
    assert.strictEqual(parsed.confidence, 'high');
    assert.strictEqual(parsed.needsBetterImage, false);
  });

  runTest('Currency Recognition: Requests a better image when note is folded or dimly lit', () => {
    const response = 'الورقة غير واضحة ومطوية، يبدو كأنه 50 جنيه ولكن لا يمكن التأكد.';
    const parsed = parseCurrencyResult(response, 'ar');
    assert.strictEqual(parsed.confidence, 'uncertain');
    assert.strictEqual(parsed.needsBetterImage, true);
    assert.ok(parsed.guidanceMessage?.includes('فرد الورقة'));
  });

  runTest('Currency Recognition: Attaches counterfeit disclaimer in Arabic and English', () => {
    assert.ok(CURRENCY_COUNTERFEIT_DISCLAIMER_AR.includes('لا يمكنه التحقق من أمان الورقة أو كشف العملات المزيفة'));
    assert.ok(CURRENCY_COUNTERFEIT_DISCLAIMER_EN.includes('cannot verify banknote security features or detect counterfeit currency'));
  });

  // ==========================================
  // 5. Contextual Scene Conversation Tests
  // ==========================================
  console.log('\n  [Requirement 5: Contextual Scene Conversation]');

  runTest('Scene Conversation: Multi-turn history is stored and retrieved for active frame', () => {
    const session = createVisualCompanionSession();
    const frame = session.createFrameRecord({ dataUrl: 'data:image/jpeg;base64,123', width: 640, height: 480 });

    session.addSceneConversationTurn({ role: 'user', text: 'ماذا يوجد على الطاولة؟', frameId: frame.frameId });
    session.addSceneConversationTurn({ role: 'assistant', text: 'يوجد كوب وكتاب.', frameId: frame.frameId });

    const ctx = session.getSceneConversation(frame.frameId);
    assert.strictEqual(ctx.turns.length, 2);
    assert.strictEqual(ctx.turns[0].text, 'ماذا يوجد على الطاولة؟');
    assert.strictEqual(ctx.turns[1].text, 'يوجد كوب وكتاب.');
    assert.strictEqual(ctx.isCurrent, true);
  });

  runTest('Scene Conversation: Material scene change automatically invalidates prior scene conversation context', () => {
    const session = createVisualCompanionSession();
    const frame1 = session.createFrameRecord({ dataUrl: 'data:image/jpeg;base64,111', width: 640, height: 480 });
    const req1 = session.createAnalysisRequest({ frame: frame1, tool: 'scene', question: 'ما هذا؟' });
    session.registerInFlight(req1);
    session.commitSceneResult({ request: req1, rawAiResponse: 'غرفة نوم بها سرير ودولاب خشب على اليمين.' });

    // Verify conversation was attached
    const ctx1 = session.getSceneConversation(frame1.frameId);
    assert.ok(ctx1.turns.length >= 2);

    // Frame 2 is a completely different scene (kitchen / kitchen appliances)
    const frame2 = session.createFrameRecord({ dataUrl: 'data:image/jpeg;base64,222', width: 640, height: 480 });
    const req2 = session.createAnalysisRequest({ frame: frame2, tool: 'scene' });
    session.registerInFlight(req2);
    session.commitSceneResult({ request: req2, rawAiResponse: 'مطبخ كامل به ثلاجة وبوتاجاز وحوض غسيل أواني.' });

    // Scene conversation context should have been invalidated and reset
    const ctxAfterChange = session.getSceneConversation(frame1.frameId);
    assert.strictEqual(ctxAfterChange.turns.length, 0, 'Old scene conversation context must be invalidated');
  });

  runTest('Scene Conversation: VQA prompt warns against hallucinating from previous conversational turns', () => {
    const prompt = buildCompanionPrompt({
      tool: 'scene',
      queryType: 'vqa',
      question: 'أين الكتاب الآن؟',
      detailLevel: 'standard',
      lang: 'ar',
      conversationTurns: [
        { role: 'user', text: 'ماذا على الطاولة؟', timestamp: Date.now() - 1000 },
        { role: 'assistant', text: 'كوب وكتاب.', timestamp: Date.now() - 500 },
      ],
    });
    assert.ok(prompt.includes('سياق المحادثة المباشرة لنفس هذا المشهد'));
    assert.ok(prompt.includes('لا تفترض وجود أشياء من سياق الأسئلة السابقة إلا إذا كانت مرئية ومؤكدة'));
  });

  // ==========================================
  // 6. Accessibility & UX Invariants
  // ==========================================
  console.log('\n  [Requirement 6: Accessibility, UX & Presets]');

  runTest('UX Presets: Includes Product Inspection preset in QUICK_VQA_PRESETS', () => {
    const productPreset = QUICK_VQA_PRESETS.find((p) => p.id === 'product_inspect');
    assert.ok(productPreset, 'QUICK_VQA_PRESETS must include product_inspect preset');
    assert.ok(productPreset?.queryAr.includes('المنتج'));
    assert.ok(productPreset?.queryEn.includes('product'));
  });

  runTest('Safety Disclaimers: Navigation safety disclaimers are preserved in both languages', () => {
    assert.ok(SAFETY_DISCLAIMER_AR.includes('لا يضمن الأمان التام'));
    assert.ok(SAFETY_DISCLAIMER_EN.includes('cannot guarantee navigational safety'));
  });

  runTest('UI View Verification: Ensure VisionCompanionView renders Phase 3 assistive features', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const viewPath = path.resolve(process.cwd(), 'src', 'components', 'VisionCompanionView.tsx');
    const viewCode = fs.readFileSync(viewPath, 'utf8');

    assert.ok(viewCode.includes('toggleContinuousReading'), 'Must have continuous reading toggle');
    assert.ok(viewCode.includes('isContinuousReadingActive'), 'Must have continuous reading state');
    assert.ok(viewCode.includes('Product Assistant'), 'Must render Product Assistant action');
    assert.ok(viewCode.includes('CURRENCY_COUNTERFEIT_DISCLAIMER_AR'), 'Must render currency counterfeit disclaimer');
    assert.ok(viewCode.includes('objectSearchTarget'), 'Must render Object Finder target input');
    assert.ok(viewCode.includes('productInfo'), 'Must render Product Assistant info card');
  });

  console.log(`\nPhase 3 Real-World Visual Assistance Summary: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

// Auto-run when executed directly
if (process.argv[1]?.includes('visualCompanionPhase3Verification')) {
  Promise.resolve(runVisualCompanionPhase3Verification())
    .then(({ failed }) => {
      if (failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
