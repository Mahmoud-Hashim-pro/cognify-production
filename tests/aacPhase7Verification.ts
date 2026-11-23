/**
 * Personal AAC Communication System — Phase 7 Verification Suite
 *
 * Verifies:
 * 1. Personal Communication Boards (creation, editing, reordering, deletion protection)
 * 2. 9 Default Categories & Category Reordering
 * 3. Symbol-to-Sentence Composition & Editing Before Speaking
 * 4. Text-to-Speech & Ethical Confirmation Guard
 * 5. Quick Responses & Favorite Messages
 * 6. Alternative Motor Access & Switch Scanning Controller
 * 7. Offline Integrity, Export/Import, & Local Persistence Recovery
 */

import {
  PersonalAacEngine,
  DEFAULT_CATEGORY_METADATA,
} from '../src/modules/hearAndExpress/personalAac/aacEngine';
import { SwitchScanningEngine } from '../src/modules/hearAndExpress/personalAac/switchScanningEngine';
import type { AacExportPayload } from '../src/modules/hearAndExpress/personalAac/types';

export async function runAacPhase7Verification(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      failed++;
      errors.push(message);
      console.error(`  ❌ FAILED: ${message}`);
    }
  }

  console.log('\n================================================================');
  console.log('--- Rafiqi Phase 7: Personal AAC Communication System ---');
  console.log('================================================================\n');

  const engine = new PersonalAacEngine();

  // ----------------------------------------------------
  // SECTION 1: Personal Communication Boards & CRUD
  // ----------------------------------------------------
  console.log('--- [Section 1] Personal Communication Boards & CRUD ---');

  const initialBoards = engine.getBoards();
  assert(initialBoards.length >= 2, `Initializes default boards catalog (count: ${initialBoards.length} >= 2)`);

  const activeBoard = engine.getActiveBoard();
  assert(activeBoard.id === 'board_standard' && activeBoard.isDefault === true, 'Default active board is "board_standard"');

  // Create custom board
  const newBoard = engine.createBoard('لوحة العمل والمكتب المخصص', 'Custom Work & Office Board', [
    'work',
    'social_communication',
    'food_and_drink',
  ]);
  assert(newBoard.id.startsWith('board_user_'), 'Generates unique user board identifier');
  assert(engine.getBoards().length === initialBoards.length + 1, 'Board count increments after creation');

  // Switch active board
  const switchSuccess = engine.setActiveBoard(newBoard.id);
  assert(switchSuccess === true, 'Successfully switched active board to new custom board');
  assert(engine.getActiveBoard().id === newBoard.id, 'Active board updated in engine');

  // Update board metadata
  const updateSuccess = engine.updateBoard({
    ...newBoard,
    nameAr: 'لوحة العمل المحدثة',
  });
  assert(updateSuccess === true, 'Successfully updated board metadata');
  assert(engine.getActiveBoard().nameAr === 'لوحة العمل المحدثة', 'Board updates persist in memory');

  // Deletion protection: Cannot delete default board
  const deleteDefaultResult = engine.deleteBoard('board_standard');
  assert(deleteDefaultResult === false, 'Strict protection: Default system board cannot be deleted');

  // Delete custom board
  const deleteCustomResult = engine.deleteBoard(newBoard.id);
  assert(deleteCustomResult === true, 'Custom board can be safely deleted');
  assert(engine.getActiveBoard().id === 'board_standard', 'Active board safely falls back to default board');

  // ----------------------------------------------------
  // SECTION 2: 9 Default Categories & Category Catalog
  // ----------------------------------------------------
  console.log('\n--- [Section 2] Default Categories & Catalog Reordering ---');

  const requiredCategories = [
    'home',
    'school',
    'work',
    'healthcare',
    'transportation',
    'food_and_drink',
    'emotions',
    'social_communication',
    'emergencies',
  ];

  const catalog = engine.getCategoryMetadataCatalog();
  const catalogIds = catalog.map((c) => c.id);

  let missingCategoryCount = 0;
  for (const reqCat of requiredCategories) {
    if (!catalogIds.includes(reqCat)) {
      missingCategoryCount++;
    }
  }
  assert(missingCategoryCount === 0, `Includes all 9 required default categories (missing: ${missingCategoryCount})`);

  // Verify emergencies category has life-safety priority
  const emergencyCat = catalog.find((c) => c.id === 'emergencies');
  assert(
    emergencyCat !== undefined && emergencyCat.isEmergency === true,
    'Emergencies category is flagged with life-safety priority'
  );

  // Test category reordering
  const customOrder = ['work', 'school', 'home', ...catalogIds.filter((id) => !['work', 'school', 'home'].includes(id))];
  engine.reorderCategories(customOrder);
  const reorderedCatalog = engine.getCategoryMetadataCatalog();
  assert(reorderedCatalog[0].id === 'work', 'Category reordering places "work" first');
  assert(reorderedCatalog[1].id === 'school', 'Category reordering places "school" second');

  // ----------------------------------------------------
  // SECTION 3: Symbols & User-Defined Vocabulary
  // ----------------------------------------------------
  console.log('\n--- [Section 3] Symbols & User-Defined Vocabulary ---');

  const allSymbols = engine.getSymbols();
  assert(allSymbols.length >= 30, `Comprehensive initial symbol set contains ${allSymbols.length} cards (expected >= 30)`);

  // Test category-filtered retrieval
  const foodSymbols = engine.getSymbols('food_and_drink');
  assert(foodSymbols.length >= 4, `Food and drink category contains ${foodSymbols.length} cards`);
  assert(foodSymbols.some((s) => s.id === 'aac_day_water'), 'Includes water symbol');

  const emotionSymbols = engine.getSymbols('emotions');
  assert(emotionSymbols.length >= 4, `Emotions category contains ${emotionSymbols.length} cards`);

  // Test custom symbol authoring
  const customCard = engine.addCustomSymbol({
    labelAr: 'نظارة القراءة',
    labelEn: 'Reading Glasses',
    icon: 'Glasses',
    category: 'home',
    spokenTextAr: 'أحتاج نظارة القراءة الطبية الخاصة بي.',
    spokenTextEn: 'I need my reading glasses.',
  });
  assert(customCard.id.startsWith('aac_custom_'), 'Generates unique custom symbol ID');
  assert(customCard.isCustom === true, 'Symbol is tagged as custom');

  // Verify symbol lookup
  const homeSymbolsWithCustom = engine.getSymbols('home');
  assert(homeSymbolsWithCustom.some((s) => s.id === customCard.id), 'Custom symbol is retrievable within its category');

  // Edit custom symbol
  const editSuccess = engine.editSymbol(customCard.id, {
    labelAr: 'نظارتي الطبية',
  });
  assert(editSuccess === true, 'Allows editing custom symbol attributes');
  assert(engine.getSymbols('home').find((s) => s.id === customCard.id)?.labelAr === 'نظارتي الطبية', 'Edited label is saved');

  // Delete custom symbol
  const deleteSymSuccess = engine.deleteCustomSymbol(customCard.id);
  assert(deleteSymSuccess === true, 'Allows deleting custom symbol');
  assert(!engine.getSymbols('home').some((s) => s.id === customCard.id), 'Custom symbol is removed');

  // Core system symbols cannot be deleted
  const deleteCoreSymSuccess = engine.deleteCustomSymbol('aac_em_help');
  assert(deleteCoreSymSuccess === false, 'Strict protection: Core emergency symbols cannot be deleted');

  // ----------------------------------------------------
  // SECTION 4: Sentence Composition & Message Editing
  // ----------------------------------------------------
  console.log('\n--- [Section 4] Sentence Composition & Editing Before Speaking ---');

  engine.clearSentence();
  assert(engine.getCurrentSentence().symbols.length === 0, 'Sentence buffer starts empty');

  const helpCard = engine.getSymbols('emergencies').find((s) => s.id === 'aac_em_help')!;
  const waterCard = engine.getSymbols('food_and_drink').find((s) => s.id === 'aac_day_water')!;

  engine.addSymbolToSentence(helpCard);
  engine.addSymbolToSentence(waterCard);

  let currentSent = engine.getCurrentSentence();
  assert(currentSent.symbols.length === 2, 'Sentence builder combines 2 symbols');
  assert(currentSent.textAr.includes('مساعدة') && currentSent.textAr.includes('ماء'), 'Generates combined Arabic spoken text');

  // Edit composed sentence text before speaking (manual editing feature)
  engine.updateSentenceText('أحتاج مساعدة عاجلة لإحضار كوب ماء من فضلكم.', 'I need urgent help getting water please.');
  currentSent = engine.getCurrentSentence();
  assert(
    currentSent.textAr === 'أحتاج مساعدة عاجلة لإحضار كوب ماء من فضلكم.',
    'Allows user to manually edit and refine sentence wording before speaking'
  );

  // Remove symbol token
  engine.removeSymbolFromSentence(1);
  assert(engine.getCurrentSentence().symbols.length === 1, 'Allows removing individual symbol token from buffer');

  // Clear sentence
  engine.clearSentence();
  assert(engine.getCurrentSentence().symbols.length === 0 && engine.getCurrentSentence().textAr === '', 'Clears buffer completely');

  // ----------------------------------------------------
  // SECTION 5: Text-to-Speech & Confirmation Guard
  // ----------------------------------------------------
  console.log('\n--- [Section 5] Text-to-Speech & Confirmation Guard ---');

  // Set up an altered emergency message
  engine.addSymbolToSentence(helpCard);
  engine.updateSentenceText('طوارئ قصوى: حريق في المبنى!', 'Extreme emergency: Fire in building!');

  // Attempt to speak without explicit confirmation when confirmBeforeSpeaking is active
  engine.updatePreferences({ confirmBeforeSpeaking: true });
  const unconfirmedSpeakResult = engine.speakCurrentSentence('Arabic', { confirmedByUser: false });
  assert(
    unconfirmedSpeakResult === false,
    'Ethical safety guard: Blocked speaking altered emergency message without explicit user confirmation'
  );

  // Speak with explicit user confirmation
  const confirmedSpeakResult = engine.speakCurrentSentence('Arabic', { confirmedByUser: true });
  assert(
    confirmedSpeakResult === true,
    'Allows speaking message once user explicitly confirms intended meaning'
  );

  // ----------------------------------------------------
  // SECTION 6: Quick Responses & Favorite Phrases
  // ----------------------------------------------------
  console.log('\n--- [Section 6] Quick Responses & Favorite Messages ---');

  const favPhrases = engine.getFavoritePhrases();
  assert(favPhrases.length >= 4, `Provides pre-loaded quick responses (count: ${favPhrases.length} >= 4)`);
  assert(
    favPhrases.some((p) => p.textAr.includes('لوحة تواصل') || p.textAr.includes('نعم')),
    'Includes essential barrier-free quick phrases'
  );

  // Add custom favorite phrase
  engine.addFavoritePhrase('أنا هنا لمقابلة العمل المقررة', 'I am here for the scheduled interview', 'work');
  assert(
    engine.getFavoritePhrases().some((p) => p.textAr === 'أنا هنا لمقابلة العمل المقررة'),
    'Successfully saves custom favorite phrase'
  );

  // Remove favorite phrase
  engine.removeFavoritePhrase('أنا هنا لمقابلة العمل المقررة');
  assert(
    !engine.getFavoritePhrases().some((p) => p.textAr === 'أنا هنا لمقابلة العمل المقررة'),
    'Successfully removes favorite phrase'
  );

  // ----------------------------------------------------
  // SECTION 7: Alternative Motor Access & Switch Scanning
  // ----------------------------------------------------
  console.log('\n--- [Section 7] Alternative Motor Access & Switch Scanning ---');

  const switchEngine = new SwitchScanningEngine(1200);
  assert(switchEngine.getState().scanSpeedMs === 1200, 'Initializes switch scanning engine with 1200ms interval');

  // Test target count setting
  switchEngine.setTargetCount(5, 'categories');
  assert(switchEngine.getState().totalElements === 5, 'Sets scan target element count');
  assert(switchEngine.getState().currentElementIndex === 0, 'Scan index starts at 0');

  // Test Switch 1 (Step / Advance)
  switchEngine.triggerSwitchStep();
  assert(switchEngine.getState().currentElementIndex === 1, 'Switch 1 advances scan index to 1');

  switchEngine.triggerSwitchStep();
  switchEngine.triggerSwitchStep();
  switchEngine.triggerSwitchStep();
  switchEngine.triggerSwitchStep(); // Index wraps around modulo totalElements
  assert(switchEngine.getState().currentElementIndex === 0, 'Switch 1 wraps around after reaching last element');

  // Test Switch 2 (Select / Activate)
  let selectedGroup = '';
  let selectedIndex = -1;
  switchEngine.setOnSelectCallback((group, idx) => {
    selectedGroup = group;
    selectedIndex = idx;
  });

  switchEngine.triggerSwitchStep(); // Index is now 1
  switchEngine.triggerSwitchSelect();
  assert(selectedGroup === 'categories' && selectedIndex === 1, 'Switch 2 correctly activates focused element (index 1)');

  // Test scan speed adjustment
  switchEngine.setScanSpeed(2000);
  assert(switchEngine.getState().scanSpeedMs === 2000, 'Adjusts scan speed interval to 2000ms');

  // ----------------------------------------------------
  // SECTION 8: Offline Capabilities & Data Export/Import
  // ----------------------------------------------------
  console.log('\n--- [Section 8] Offline Capabilities & Data Export/Import ---');

  const offlineReport = engine.getOfflineCapabilities();
  assert(offlineReport.isFullyOfflineCapable === true, 'AAC core system is 100% offline capable');
  assert(offlineReport.boardStorageOffline === true, 'Board storage works offline');
  assert(offlineReport.sentenceCompositionOffline === true, 'Sentence composition works offline');
  assert(
    offlineReport.ttsOfflineExplanationAr.includes('محلياً بنظام التشغيل') ||
    offlineReport.ttsOfflineExplanationAr.includes('نظام التشغيل'),
    'Accurately explains that offline TTS depends on local operating system voices'
  );

  // Test Data Export
  const exportData = engine.exportData();
  assert(exportData.version === '1.0', 'Export payload has valid schema version 1.0');
  assert(Array.isArray(exportData.boards) && exportData.boards.length > 0, 'Export includes boards array');
  assert(exportData.preferences.confirmBeforeSpeaking !== undefined, 'Export includes user accessibility preferences');

  // Test Data Import
  const modifiedPayload: AacExportPayload = {
    ...exportData,
    boards: [
      ...exportData.boards,
      {
        id: 'board_imported_test',
        nameAr: 'لوحة مستوردة اختبارية',
        nameEn: 'Imported Test Board',
        categoryOrder: ['home', 'food_and_drink'],
        symbolIds: ['aac_day_water'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
  };

  const importResult = engine.importData(modifiedPayload);
  assert(importResult.success === true, 'Successfully imports valid AAC JSON data');
  assert(engine.getBoards().some((b) => b.id === 'board_imported_test'), 'Imported board is added to registry');

  // Test Malformed Import Handling
  const malformedResult = engine.importData({} as any);
  assert(malformedResult.success === false, 'Gracefully rejects malformed import payload without throwing error');

  console.log('\n================================================================');
  console.log(`Phase 7 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  return { passed, failed, errors };
}

// Direct execution when run via tsx
if (process.argv[1]?.includes('aacPhase7Verification')) {
  runAacPhase7Verification()
    .then((result) => {
      if (result.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
