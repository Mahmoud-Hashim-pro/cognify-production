/**
 * arslCurriculumAndModelVerification.ts — Automated Verification Suite for ArSL 24 Lectures & ML Model
 */

import {
  ARSL_LECTURES_CATALOG,
  ARSL_DICTIONARY,
  ARSL_OFFICIAL_BOOK_CHAPTERS,
  ARSL_OFFICIAL_BOOK_CATALOG,
  ARSL_OFFICIAL_SIGNS,
  lookupArslSign,
  searchArslDictionary,
  hamnosysToThreePose,
  normalizeHandLandmarks,
  Point3D,
} from '../src/lib/arslDictionary.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

export async function runArslCurriculumAndModelVerification() {
  console.log('\n[25] ArSL Thematic Dictionary & In-Browser ML Pipeline Verification (Synthetic Benchmark)');

  // Test 1: Full 24 Thematic Modules Integrity
  {
    assert(ARSL_LECTURES_CATALOG.length === 24, 'All 24 thematic vocabulary modules are cataloged');
    
    // Check all IDs 1 to 24 are present in order
    const idsPresent = ARSL_LECTURES_CATALOG.every((l, idx) => l.id === idx + 1);
    assert(idsPresent, 'Thematic modules 1 through 24 have sequential and continuous IDs');

    // Check title and topic presence
    const allHaveTopics = ARSL_LECTURES_CATALOG.every((l) => Boolean(l.titleAr) && Boolean(l.topicAr));
    assert(allHaveTopics, 'All 24 modules define bilingual title and lexical topic boundaries');

    // Check specific landmark modules
    const lec1 = ARSL_LECTURES_CATALOG.find((l) => l.id === 1);
    assert(lec1?.titleAr.includes('الأبجدية'), 'Module 1 covers the complete sign alphabet');

    const lec24 = ARSL_LECTURES_CATALOG.find((l) => l.id === 24);
    assert(lec24?.titleAr.includes('المراجعة'), 'Module 24 covers comprehensive review & fluency');
  }

  // Test 2: HamNoSys Dictionary Structure & Anatomical Grounding
  {
    assert(ARSL_DICTIONARY.length >= 18, 'Core ArSL dictionary initialized with foundational lexical signs');

    const salam = lookupArslSign('السلام عليكم');
    assert(salam !== null, 'Finds exact greeting "السلام عليكم"');
    assert(salam?.hamnosys.handshape === 'flat_closed', 'Assigned correct HamNoSys handshape (flat_closed)');
    assert(salam?.hamnosys.twoHanded === true, 'Greeting is properly flagged as two-handed gesture');

    const threePose = hamnosysToThreePose(salam!.hamnosys);
    assert(threePose.f.length === 5, 'Converts HamNoSys to 5-finger articulatory curl array');
    assert(threePose.pos.length === 3, 'Calculates 3D world target position [x, y, z]');
  }

  // Test 3: Robust Multilingual & Dialect Alias Lookup
  {
    const fromAmmiya = lookupArslSign('ازيك');
    assert(fromAmmiya?.arabicName.includes('كيف حالك'), 'Dialect alias "ازيك" maps to formal "كيف حالك"');

    const fromEnglish = lookupArslSign('hospital');
    assert(fromEnglish?.id === 's_hospital', 'English term "hospital" maps to "مستشفى"');

    const fromFingerspelling = lookupArslSign('غير_موجود_في_المعجم');
    assert(fromFingerspelling === null, 'Unknown phrases return null to trigger letter fingerspelling fallback');
  }

  // Test 3b: Official Unified Arabic Sign Language Dictionary (1,418 Pages, 28 Chapters, 1,413 Signs)
  {
    assert(ARSL_OFFICIAL_BOOK_CHAPTERS.length === 28, 'All 28 official chapters from the ArSL dictionary are cataloged');
    assert(ARSL_OFFICIAL_BOOK_CATALOG.length === 28, 'Book catalog defines 28 structured chapters with Arabic/English metadata');
    assert(ARSL_OFFICIAL_SIGNS.length === 1413, 'Extracted exactly 1,413 official signs from the 1,418-page dictionary');
    assert(ARSL_DICTIONARY.length >= 1413, 'Master dictionary integrates all 1,413 official signs with conversational vocabulary');

    // Page boundaries validation
    const firstChapter = ARSL_OFFICIAL_BOOK_CHAPTERS[0];
    const lastChapter = ARSL_OFFICIAL_BOOK_CHAPTERS[27];
    assert(firstChapter.start === 6, 'First chapter starts at page 6 (following front matter)');
    assert(lastChapter.end === 1418, 'Last chapter covers up to page 1418');

    // Every chapter has vocabulary
    const allChaptersPopulated = ARSL_OFFICIAL_BOOK_CHAPTERS.every((ch) => ch.vocabCount > 0);
    assert(allChaptersPopulated, 'Every one of the 28 chapters contains valid lexical vocabulary signs');

    // Look up signs from different chapters
    const familySign = lookupArslSign('أب');
    assert(familySign !== null, 'Looked up family sign (أب) successfully');

    const techSign = lookupArslSign('حاسوب') || lookupArslSign('كمبيوتر');
    assert(techSign !== null, 'Looked up IT / computer sign from chapter 26');

    // Search dictionary function
    const searchResults = searchArslDictionary('صلاة');
    assert(searchResults.length > 0, 'Full-text search finds Islamic religious terms (صلاة)');

    // 3D pose verification for official sign
    const officialPose = hamnosysToThreePose(familySign!.hamnosys);
    assert(officialPose.f.length === 5, 'Converts official book sign HamNoSys into 3D finger pose curls');
    assert(officialPose.pos.length === 3, 'Calculates 3D world coordinates for official book sign');
  }

  // Test 4: Invariant 3D Landmark Normalization
  {
    const mockHandLandmarks: Point3D[] = [];
    for (let i = 0; i < 21; i++) {
      mockHandLandmarks.push({ x: 100 + i * 2, y: 200 + i * 3, z: 50 + i });
    }

    const normalized = normalizeHandLandmarks(mockHandLandmarks);
    assert(normalized.length === 63, 'Normalizes 21 landmarks into 63 coordinates (x, y, z)');
    assert(normalized[0] === 0 && normalized[1] === 0 && normalized[2] === 0, 'Wrist (landmark 0) is translated to origin (0, 0, 0)');

    // Missing hand test
    const emptyNorm = normalizeHandLandmarks(null);
    assert(emptyNorm.length === 63 && emptyNorm.every((v) => v === 0), 'Null hands return zeroed baseline vector');
  }

  console.log(`\n  ArSL Curriculum & Lexicon Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

if (process.argv[1] && process.argv[1].includes('arslCurriculumAndModelVerification')) {
  runArslCurriculumAndModelVerification()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
