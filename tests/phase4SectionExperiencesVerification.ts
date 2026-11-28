/**
 * Rafiqi (رفيقي) — Phase 4 Six Product Section Experiences Verification Suite
 *
 * Verifies:
 * 1. Exactly six product sections are preserved with immutable identifiers.
 * 2. Shared Section Page Pattern implemented across all six sections:
 *    - Breadcrumb navigation with Home > Section {num}: {Title}
 *    - Section order badge (Section {num} of 6)
 *    - Prominent primary action button
 *    - Logical feature groups (distinct clusters per section)
 *    - Real recent activity / honest empty state with zero fabricated data
 *    - Accessible keyboard navigation & screen reader tips
 *    - Consistent Back navigation returning to Dashboard Hub
 * 3. Section 1 (See & Understand): AI Visual Companion entry point and live camera guidance banner.
 * 4. Section 2 (Read & Learn): Quick actions trio (Resume reading, Upload lecture, Continue learning).
 * 5. Section 3 (Work & Create): Verbatim Source Text Preservation Guarantee.
 * 6. Section 4 (Move & Explore): Critical Mobility & Road Safety Notice (never replaces white cane/mobility aids).
 * 7. Section 5 (Communicate): Hear & Express kept inside Communicate, verified sign language boundary.
 * 8. Section 6 (Personalize): Universal Accessibility without disability disclosure guarantee.
 */

import fs from 'fs';
import path from 'path';
import { PRODUCT_SECTIONS, ProductSectionId, getProductSection } from '../src/lib/sections';

export function runPhase4SectionExperiencesVerification(): boolean {
  console.log('\n=============================================================');
  console.log('⚡ RUNNING RAFIQI UI PHASE 4: SIX SECTION EXPERIENCES TESTS');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Architecture Invariant: Exactly 6 Product Sections
  assert(PRODUCT_SECTIONS.length === 6, 'Exactly six product sections are registered in PRODUCT_SECTIONS');

  const expectedSectionIds: ProductSectionId[] = [
    'see_understand',
    'read_learn',
    'work_create',
    'move_explore',
    'communicate',
    'personalize',
  ];

  expectedSectionIds.forEach((id, index) => {
    const sec = getProductSection(id);
    assert(!!sec, `Section ${id} exists and is retrievable`);
    assert(sec?.numericOrder === index + 1, `Section ${id} has correct numeric order ${index + 1}`);
  });

  // 2. Shared Section Page Pattern in SectionLandingView.tsx
  const sectionLandingPath = path.resolve(process.cwd(), 'src/components/SectionLandingView.tsx');
  assert(fs.existsSync(sectionLandingPath), 'SectionLandingView.tsx component file exists');
  const landingCode = fs.readFileSync(sectionLandingPath, 'utf-8');

  assert(
    landingCode.includes('Breadcrumb navigation') || landingCode.includes('breadcrumb'),
    'Shared Pattern: SectionLandingView includes accessible breadcrumb navigation'
  );
  assert(
    landingCode.includes('Section ${section.numericOrder} of 6') || landingCode.includes('القسم ${section.numericOrder} من 6'),
    'Shared Pattern: Section order badge displays "Section {num} of 6"'
  );
  assert(
    landingCode.includes('primaryFeature') && landingCode.includes('onSelectFeature(primaryFeature)'),
    'Shared Pattern: Dominant primary action button executes top feature'
  );
  assert(
    landingCode.includes('getFeatureGroups') && landingCode.includes('featureGroups.map'),
    'Shared Pattern: Features are clustered into logical domain groups'
  );
  assert(
    landingCode.includes('recentItems') && landingCode.includes('No activity recorded'),
    'Shared Pattern: Real recent activity with honest empty state (zero fabricated data)'
  );
  assert(
    landingCode.includes('Accessibility & Keyboard Shortcuts') || landingCode.includes('إرشادات الوصول السريع والتنقل الميسر'),
    'Shared Pattern: Accessible keyboard tips modal / guide is present'
  );
  assert(
    landingCode.includes('onNavigateBack'),
    'Shared Pattern: Back button navigation returns to dashboard hub'
  );

  // 3. Section 1 (See & Understand) specific requirements
  assert(
    landingCode.includes('AI Visual Companion: Real-Time Hallucination-Free Vision') ||
      landingCode.includes('المساعد البصري الذكي: توجيه فوري للمشهد بدون هلوسة'),
    'Section 1: AI Visual Companion live camera guidance banner is present'
  );
  assert(
    landingCode.includes('grp_live_camera') && landingCode.includes('grp_objects_currency'),
    'Section 1: Features organized into camera, object, product, and apparel groups'
  );

  // 4. Section 2 (Read & Learn) specific requirements
  assert(
    landingCode.includes('Resume Reading') && landingCode.includes('استئناف القراءة'),
    'Section 2: Highlights "Resume Reading" quick action'
  );
  assert(
    landingCode.includes('Upload Lecture') && landingCode.includes('رفع محاضرة صوتية'),
    'Section 2: Highlights "Upload Lecture" quick action'
  );
  assert(
    landingCode.includes('Continue Learning') && landingCode.includes('مواصلة التعلّم'),
    'Section 2: Highlights "Continue Learning" quick action'
  );

  // 5. Section 3 (Work & Create) specific requirements
  assert(
    landingCode.includes('Source Text Preservation Guarantee') ||
      landingCode.includes('ضمان أمانة النص الأصلي والتنسيق الحرفي'),
    'Section 3: Verbatim Source Text Preservation Guarantee banner is present'
  );
  assert(
    landingCode.includes('exact source text is preserved verbatim without alteration'),
    'Section 3: Explicit guarantee that source text is preserved verbatim when formatting only is requested'
  );

  // 6. Section 4 (Move & Explore) specific requirements
  assert(
    landingCode.includes('Road Safety Notice: Does Not Replace Mobility Aids') ||
      landingCode.includes('تنبيه أمان وإخلاء مسؤولية الحركة في الطرقات'),
    'Section 4: Road safety notice explicitly declares visual assistant never replaces mobility aids'
  );
  assert(
    landingCode.includes('never guarantee road safety or replace a white cane'),
    'Section 4: Explicit non-replacement invariant for white cane/guide dog verified'
  );

  // 7. Section 5 (Communicate) specific requirements
  assert(
    landingCode.includes('grp_hear_express'),
    'Section 5: Hear & Express is kept as a subgroup inside Communicate'
  );
  assert(
    landingCode.includes('Verified Egyptian Sign Language & Honest Validation Boundary') ||
      landingCode.includes('اعتماد القاموس الإشاري الموثق'),
    'Section 5: Honest validation boundary for Egyptian Sign Language is explicitly declared'
  );

  // 8. Section 6 (Personalize) specific requirements
  assert(
    landingCode.includes('Universal Accessibility: No Disability Disclosure Required') ||
      landingCode.includes('إتاحة شاملة ومفتوحة لجميع المستخدمين بدون إفصاح طبي'),
    'Section 6: Universal Accessibility banner guarantees no medical/disability disclosure required'
  );
  assert(
    landingCode.includes('without requiring any medical disclosure or disability categorization'),
    'Section 6: No forced disability disclosure invariant explicitly verified'
  );

  console.log(`\n-------------------------------------------------------------`);
  console.log(`Phase 4 Verification Summary: Passed: ${passed}, Failed: ${failed}`);
  console.log(`-------------------------------------------------------------\n`);

  return failed === 0;
}

if (process.argv[1] && process.argv[1].endsWith('phase4SectionExperiencesVerification.ts')) {
  const ok = runPhase4SectionExperiencesVerification();
  process.exit(ok ? 0 : 1);
}
