/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rafiqi (رفيقي) — Phase 10 Mobility & Place Assistance Verification Suite
 * 
 * Comprehensive automated verification test suite for Phase 10:
 * - Section 4 (Move & Explore) Architecture & Feature Registration
 * - Strict Mobility Safety Invariants & Anti-Guarantee Rules
 * - Place Description & Spatial Clock Landmarks (Zero Metric Hallucination)
 * - Sign & Direction Reader (Verbatim Text vs. Inferred Guidance Separation)
 * - Entrance & Door Assistance (Clock positions & unverified physical features)
 * - Public Transport Assistant (Route extraction, uncertainty flags, telemetry guards)
 * - Verified Accessible Places Directory (Egypt provenance & last-updated timestamps)
 * - GPS Accuracy Tiers & External Navigation Provider Deep Links
 * - Indoor Navigation Technical Boundary Disclosures (Zero Fake Coordinates)
 * - Navigation Routing, Breadcrumbs, and Zero #00AEB8 Theme Invariant
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PRODUCT_SECTIONS,
  getProductSection,
} from '../src/lib/sections';
import {
  parseRoute,
  buildHash,
  getRouteTitle,
  VALID_VIEWS,
} from '../src/lib/navigation';
import {
  MOBILITY_SAFETY_DISCLAIMER_AR,
  MOBILITY_SAFETY_DISCLAIMER_EN,
  getMobilitySafetyAdvisory,
  verifySafeMobilityClaims,
  analyzePlaceEnvironment,
  parseDirectionalSign,
  evaluateDoorwayAssistance,
  parseTransitSign,
  VERIFIED_ACCESSIBLE_PLACES,
  evaluateGpsAccuracy,
  buildNavigationProviderUrl,
  getIndoorNavigationBoundary,
} from '../src/lib/mobilityEngine';

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

export async function runPhase10MobilityTests() {
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('    RAFIQI — PHASE 10 MOBILITY ASSISTANCE VERIFICATION SUITE      ');
  console.log('══════════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SECTION 4 (MOVE & EXPLORE) REGISTRATION & ARCHITECTURE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ 1. Section 4 (Move & Explore) Architecture & Registration');
  const moveSection = getProductSection('move_explore');
  assert(!!moveSection, 'Section 4 (move_explore) is defined in sections registry');
  assert(moveSection?.numericOrder === 4, 'Section 4 numericOrder is strictly 4');
  assert(moveSection?.titleAr === 'الحركة والاستكشاف', 'Section 4 Arabic title is "الحركة والاستكشاف"');
  assert(moveSection?.titleEn === 'Move & Explore', 'Section 4 English title is "Move & Explore"');

  // Check Flagship feature
  const flagshipFeat = moveSection?.features.find((f) => f.id === 'feat_mobility_workspace');
  assert(!!flagshipFeat, 'Flagship feature feat_mobility_workspace is registered in Section 4');
  assert(flagshipFeat?.targetView === 'mobility', 'feat_mobility_workspace routes to targetView="mobility"');
  assert(flagshipFeat?.isPrimaryAction === true, 'feat_mobility_workspace is marked as primary flagship action');

  // Check 7 Sub-features
  const subFeatureIds = [
    'feat_place_description',
    'feat_sign_direction_reader',
    'feat_entrance_door_assistant',
    'feat_public_transit_assistant',
    'feat_accessible_places_directory',
    'feat_navigation_gps_integration',
    'feat_indoor_navigation_boundary',
  ];
  for (const id of subFeatureIds) {
    const feat = moveSection?.features.find((f) => f.id === id);
    assert(!!feat, `Move & Explore feature "${id}" is registered`);
    assert(feat?.targetView === 'mobility', `Feature "${id}" targets view="mobility"`);
    assert(!!feat?.targetTab, `Feature "${id}" targets sub-tool tab "${feat?.targetTab}"`);
  }

  // Check Preserved Legacy Features
  const legacySpatial = moveSection?.features.find((f) => f.id === 'feat_spatial_locator');
  assert(!!legacySpatial, 'Legacy feat_spatial_locator is preserved in Section 4');
  const legacyRadar = moveSection?.features.find((f) => f.id === 'feat_ambient_radar');
  assert(!!legacyRadar, 'Legacy feat_ambient_radar is preserved in Section 4');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. STRICT MOBILITY SAFETY INVARIANTS & ANTI-GUARANTEE RULES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 2. Strict Mobility Safety Invariants & Anti-Guarantee Rules');
  assert(
    MOBILITY_SAFETY_DISCLAIMER_AR.includes('العصا البيضاء') && MOBILITY_SAFETY_DISCLAIMER_AR.includes('كلب المرشد'),
    'Arabic disclaimer explicitly mentions white cane and guide dog'
  );
  assert(
    MOBILITY_SAFETY_DISCLAIMER_EN.includes('white cane') && MOBILITY_SAFETY_DISCLAIMER_EN.includes('guide dog'),
    'English disclaimer explicitly mentions white cane and guide dog'
  );
  assert(
    MOBILITY_SAFETY_DISCLAIMER_AR.includes('لا يمكن ضمان') || MOBILITY_SAFETY_DISCLAIMER_AR.includes('لا يضمن'),
    'Arabic disclaimer forbids guaranteed obstacle avoidance claims'
  );

  const advisory = getMobilitySafetyAdvisory('Arabic');
  assert(advisory.safetyLevel === 'high_vigilance', 'Mobility safety advisory has safetyLevel="high_vigilance"');
  assert(advisory.cannotReplaceTools === true, 'Mobility advisory enforces cannotReplaceTools=true');
  assert(advisory.emergencyNoticeAr.length > 20, 'Arabic emergency notice is fully descriptive');

  // Anti-guarantee claim validator checks
  const dangerousClaim1 = verifySafeMobilityClaims('Rafiqi guarantees safe obstacle-free walking');
  assert(dangerousClaim1.isSafe === false, 'Flags dangerous claim: "guarantees safe obstacle-free walking"');
  assert(dangerousClaim1.violations.length > 0, 'Detects safety violations for guaranteed navigation');

  const dangerousClaim2 = verifySafeMobilityClaims('You no longer need a white cane with this app');
  assert(dangerousClaim2.isSafe === false, 'Flags dangerous claim: "no longer need a white cane"');

  const dangerousClaim3 = verifySafeMobilityClaims('The door is exactly 2.34 meters ahead of you');
  assert(dangerousClaim3.isSafe === false, 'Flags dangerous claim: exact decimal metric distance without hardware depth sensor');

  const dangerousClaim4 = verifySafeMobilityClaims('هذا التطبيق يضمن تجنب كل العوائق بنسبة 100%');
  assert(dangerousClaim4.isSafe === false, 'Flags dangerous Arabic claim: يضمن تجنب العوائق بنسبة 100%');

  const safeClaim = verifySafeMobilityClaims('The entrance appears ahead around 12 oclock at midground distance. Use your white cane to confirm.');
  assert(safeClaim.isSafe === true, 'Approves safe guidance using clock positions, qualitative depth, and cane verification');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PLACE DESCRIPTION & CLOCK-FACE SPATIAL LANDMARKS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 3. Place Description & Clock-Face Spatial Landmarks (Zero Metric Hallucination)');
  const sampleDetections = [
    { label: 'information counter', confidence: 0.92, boundingBox: { xMin: 0.4, yMin: 0.3, xMax: 0.6, yMax: 0.7 } },
    { label: 'glass double doors', confidence: 0.88, boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.3, yMax: 0.8 } },
    { label: 'bench', confidence: 0.75, boundingBox: { xMin: 0.75, yMin: 0.5, xMax: 0.95, yMax: 0.9 } },
    { label: 'exit sign', confidence: 0.95, boundingBox: { xMin: 0.45, yMin: 0.05, xMax: 0.55, yMax: 0.2 } },
  ];

  const placeAnalysisAr = analyzePlaceEnvironment(sampleDetections, 'normal', 'Arabic');
  assert(placeAnalysisAr.landmarks.length === 4, 'Correctly extracted 4 visual landmarks');
  assert(placeAnalysisAr.disclaimer.length > 0, 'Arabic place description contains strict disclaimer');
  assert(placeAnalysisAr.lightingCondition === 'normal', 'Lighting condition is accurately recorded');

  // Verify clock-face positions
  const centerLandmark = placeAnalysisAr.landmarks.find((l) => l.labelEn.includes('counter'));
  assert(centerLandmark?.clockPosition === '12_oclock', 'Center landmark mapped to 12 oclock');

  const leftLandmark = placeAnalysisAr.landmarks.find((l) => l.labelEn.includes('glass double doors'));
  assert(leftLandmark?.clockPosition === '9_oclock' || leftLandmark?.clockPosition === '10_oclock', 'Left landmark mapped to 9 or 10 oclock');

  const rightLandmark = placeAnalysisAr.landmarks.find((l) => l.labelEn.includes('bench'));
  assert(rightLandmark?.clockPosition === '2_oclock' || rightLandmark?.clockPosition === '3_oclock', 'Right landmark mapped to 2 or 3 oclock');

  // Verify qualitative distance tiers (no hallucinated exact meters)
  for (const landmark of placeAnalysisAr.landmarks) {
    assert(
      ['near', 'midground', 'far', 'unverified'].includes(landmark.qualitativeDistance),
      `Landmark "${landmark.labelEn}" uses qualitative distance tier: ${landmark.qualitativeDistance}`
    );
  }

  // Low light and obstructed views
  const lowLightAnalysis = analyzePlaceEnvironment(sampleDetections, 'low_light', 'Arabic');
  assert(lowLightAnalysis.uncertaintyNoteAr?.includes('إضاءة منخفضة') || lowLightAnalysis.uncertaintyNoteAr?.includes('ظلام') || lowLightAnalysis.uncertaintyNoteAr?.includes('غير مؤكدة'), 'Low-light scene explains lighting uncertainty in Arabic');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SIGN & DIRECTION READER (VERBATIM TEXT VS. INFERRED GUIDANCE)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 4. Sign & Direction Reader (Verbatim Text vs. Inferred Directions)');
  const ocrLines = [
    'مكتبة طه حسين للمكفوفين',
    'غرفة 304 - قاعة المحاضرات A',
    'Floor 3 - Elevator ->',
    'Emergency Exit / مخرج طوارئ',
  ];

  const signResult = parseDirectionalSign(ocrLines, 'Arabic');
  assert(signResult.detectedLines.length === 4, 'Parsed all 4 detected OCR lines');
  assert(signResult.verbatimText.includes('غرفة 304'), 'Verbatim text accurately contains detected room number');
  assert(signResult.verbatimText.includes('مخرج طوارئ'), 'Verbatim text accurately contains emergency exit');

  // Room numbers and floor labels
  assert(signResult.roomNumbers.includes('304'), 'Extracted room number 304');
  assert(signResult.floorLabels.includes('3'), 'Extracted floor label 3');

  // Strict separation of inferred directions
  assert(signResult.inferredDirections.length > 0, 'Inferred directional guidance is identified');
  assert(signResult.hasEmergencyExit === true, 'Detected emergency exit flag is true');
  assert(
    signResult.guidanceDisclaimerAr.includes('فرضية') || signResult.guidanceDisclaimerAr.includes('غير مضمون') || signResult.guidanceDisclaimerAr.includes('التحقق'),
    'Clear disclaimer distinguishing verbatim text from inferred guidance'
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. ENTRANCE & DOOR ASSISTANCE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 5. Entrance & Door Assistance');
  const doorBoxes = [
    { label: 'glass automatic door', confidence: 0.91, boundingBox: { xMin: 0.42, yMin: 0.2, xMax: 0.58, yMax: 0.85 } },
    { label: 'closed wooden door', confidence: 0.82, boundingBox: { xMin: 0.05, yMin: 0.2, xMax: 0.25, yMax: 0.8 } },
  ];

  const doorEval = evaluateDoorwayAssistance(doorBoxes, 'Arabic');
  assert(doorEval.doorsDetected.length === 2, 'Detected 2 doorways in scene');

  const mainDoor = doorEval.doorsDetected.find((d) => d.doorType === 'automatic');
  assert(!!mainDoor, 'Identified automatic door');
  assert(mainDoor?.clockPosition === '12_oclock', 'Main door positioned at 12 oclock');
  assert(mainDoor?.qualitativeDistance === 'midground' || mainDoor?.qualitativeDistance === 'near', 'Door has qualitative distance tier');
  assert(mainDoor?.unverifiedPhysicalFeatures.includes('threshold_step_height'), 'Explicitly flags threshold step height as unverified');

  const woodenDoor = doorEval.doorsDetected.find((d) => d.doorType === 'standard_hinged');
  assert(!!woodenDoor, 'Identified standard hinged door');
  assert(woodenDoor?.state === 'closed', 'Identified closed door state');
  assert(
    doorEval.safetyAdvisoryAr.includes('العصا') || doorEval.safetyAdvisoryAr.includes('التحقق'),
    'Door assistance includes cane verification advisory'
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. PUBLIC TRANSPORT ASSISTANT (UNCERTAINTY & TELEMETRY GUARDS)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 6. Public Transport Assistant (Uncertainty & Telemetry Guards)');
  const busSignOcr = [
    'خط 1080 - هليوبوليس / التحرير',
    'Bus 1080 to Tahrir Square',
  ];

  const transitResult = parseTransitSign(busSignOcr, 0.92, 'Arabic');
  assert(transitResult.routeNumber === '1080', 'Extracted bus route number 1080');
  assert(transitResult.destinationAr?.includes('التحرير') === true, 'Extracted destination التحرير');
  assert(transitResult.isUncertain === false, 'High confidence (0.92) marked as certain');
  assert(transitResult.liveScheduleTelemetryDisclaimer.includes('لا يقدم هذا التطبيق مواعيد لحظية') || transitResult.liveScheduleTelemetryDisclaimer.includes('live'), 'Forbids fake live arrival schedules');

  // Low confidence transit sign
  const blurryBusSign = parseTransitSign(['10?0 Hel...'], 0.65, 'Arabic');
  assert(blurryBusSign.isUncertain === true, 'Low confidence (0.65) marked with isUncertain=true');
  assert(
    blurryBusSign.uncertaintyWarningAr.includes('غير واضحة') || blurryBusSign.uncertaintyWarningAr.includes('غير مؤكدة'),
    'Arabic warning explains uncertainty of blurred transit sign'
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. VERIFIED ACCESSIBLE PLACES DIRECTORY (EGYPT PROVENANCE)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 7. Verified Accessible Places Directory (Egypt Provenance)');
  assert(VERIFIED_ACCESSIBLE_PLACES.length >= 4, 'Directory contains at least 4 verified accessible places');

  for (const place of VERIFIED_ACCESSIBLE_PLACES) {
    assert(!!place.id, `Place ${place.id} has valid ID`);
    assert(place.country === 'Egypt', `Place ${place.id} is located in Egypt`);
    assert(place.coordinates.latitude > 22 && place.coordinates.latitude < 32, `Place ${place.id} latitude is within Egyptian territory`);
    assert(place.coordinates.longitude > 24 && place.coordinates.longitude < 37, `Place ${place.id} longitude is within Egyptian territory`);
    assert(place.accessibilityFeatures.length > 0, `Place ${place.id} has verified accessibility features`);
    assert(!!place.sourceProvenance && place.sourceProvenance.length > 5, `Place ${place.id} has authentic source provenance`);
    assert(!!place.lastUpdated && place.lastUpdated.startsWith('202'), `Place ${place.id} has valid last-updated timestamp`);
  }

  // Check Taha Hussein Library
  const tahaHussein = VERIFIED_ACCESSIBLE_PLACES.find((p) => p.id === 'eg_taha_hussein_library');
  assert(!!tahaHussein, 'Directory includes Taha Hussein Braille Library');
  assert(tahaHussein?.brailleAvailable === true, 'Taha Hussein Library marks brailleAvailable=true');
  assert(tahaHussein?.screenReaderWorkstations === true, 'Taha Hussein Library marks screenReaderWorkstations=true');

  // Check Sadat Metro Station
  const sadatMetro = VERIFIED_ACCESSIBLE_PLACES.find((p) => p.id === 'eg_cairo_sadat_metro');
  assert(!!sadatMetro, 'Directory includes Sadat/Tahrir Metro Station');
  assert(sadatMetro?.tactilePaving === true, 'Sadat Metro marks tactilePaving=true');
  assert(sadatMetro?.wheelchairAccessible === true, 'Sadat Metro marks wheelchairAccessible=true');

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. GPS ACCURACY & NAVIGATION PROVIDER DEEP LINKS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 8. GPS Accuracy & External Navigation Provider Deep Links');
  const highGps = evaluateGpsAccuracy(12.5, 'Arabic');
  assert(highGps.tier === 'high', '12.5m error evaluated as high accuracy');
  assert(highGps.hasWarning === false, 'High accuracy produces no warning');

  const modGps = evaluateGpsAccuracy(35.0, 'Arabic');
  assert(modGps.tier === 'moderate', '35.0m error evaluated as moderate accuracy');

  const poorGps = evaluateGpsAccuracy(75.0, 'Arabic');
  assert(poorGps.tier === 'low', '75.0m error evaluated as low accuracy');
  assert(poorGps.hasWarning === true, 'Low accuracy (>50m) flags warning');
  assert(poorGps.messageAr.includes('50') || poorGps.messageAr.includes('ضعيفة') || poorGps.messageAr.includes('متر'), 'Warning explains significant GPS inaccuracy in Arabic');

  // Deep Links
  const destCoords = { latitude: 30.0444, longitude: 31.2357 };
  const gmapsWalking = buildNavigationProviderUrl('google_maps', destCoords, 'walking');
  assert(gmapsWalking.includes('google.com/maps/dir/?api=1') && gmapsWalking.includes('travelmode=walking'), 'Generates valid Google Maps walking deep-link');

  const gmapsTransit = buildNavigationProviderUrl('google_maps', destCoords, 'transit');
  assert(gmapsTransit.includes('travelmode=transit'), 'Generates valid Google Maps public transit deep-link');

  const appleMaps = buildNavigationProviderUrl('apple_maps', destCoords, 'walking');
  assert(appleMaps.includes('maps.apple.com/?daddr=') && appleMaps.includes('dirflg=w'), 'Generates valid Apple Maps walking deep-link');

  const waze = buildNavigationProviderUrl('waze', destCoords);
  assert(waze.includes('waze.com/ul?ll='), 'Generates valid Waze deep-link');

  const osm = buildNavigationProviderUrl('openstreetmap', destCoords);
  assert(osm.includes('openstreetmap.org/directions?'), 'Generates valid OpenStreetMap deep-link');

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. INDOOR NAVIGATION TECHNICAL BOUNDARY DISCLOSURE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 9. Indoor Navigation Technical Boundary Disclosure (Zero Fake Coordinates)');
  const indoorBoundaryAr = getIndoorNavigationBoundary('Arabic');
  assert(indoorBoundaryAr.isHardwareGated === true, 'Indoor navigation marks isHardwareGated=true');
  assert(indoorBoundaryAr.supportedTechnologies.includes('ble_beacons'), 'Lists BLE beacons as supported hardware technology');
  assert(indoorBoundaryAr.supportedTechnologies.includes('uwb'), 'Lists UWB as supported hardware technology');
  assert(indoorBoundaryAr.explanationAr.includes('نظام تحديد المواقع') || indoorBoundaryAr.explanationAr.includes('GPS'), 'Explains indoor GPS satellite line-of-sight limitation');
  assert(indoorBoundaryAr.refusalToSimulateAr.includes('لا نقوم بمحاكاة') || indoorBoundaryAr.refusalToSimulateAr.includes('أمان'), 'Refuses to simulate fake indoor positioning');

  const indoorBoundaryEn = getIndoorNavigationBoundary('English');
  assert(indoorBoundaryEn.explanationEn.includes('GPS') && indoorBoundaryEn.explanationEn.includes('satellite'), 'English explanation covers satellite limitation');
  assert(indoorBoundaryEn.refusalToSimulateEn.includes('simulate') || indoorBoundaryEn.refusalToSimulateEn.includes('safety'), 'English explanation refuses to simulate fake indoor coordinates');

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. NAVIGATION ROUTING & DEEP LINKING
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 10. Navigation Routing & Deep Linking');
  assert(VALID_VIEWS.includes('mobility'), 'VALID_VIEWS includes "mobility"');

  const routeClean = parseRoute('#mobility');
  assert(routeClean.view === 'mobility', 'parseRoute("#mobility") returns view="mobility"');

  const routeTool = parseRoute('#mobility/sign_reader');
  assert(routeTool.view === 'mobility', 'parseRoute("#mobility/sign_reader") returns view="mobility"');
  assert(routeTool.tab === 'sign_reader', 'parseRoute("#mobility/sign_reader") returns tab="sign_reader"');
  assert(routeTool.params?.tool === 'sign_reader', 'parseRoute parses params.tool="sign_reader"');

  const hashMobility = buildHash({ view: 'mobility' });
  assert(hashMobility === '#mobility', 'buildHash({ view: "mobility" }) returns "#mobility"');

  const hashMobilityTool = buildHash({ view: 'mobility', tab: 'transit_assistant' as any });
  assert(hashMobilityTool === '#mobility/transit_assistant', 'buildHash with tool returns "#mobility/transit_assistant"');

  const titleAr = getRouteTitle({ view: 'mobility' }, 'Arabic');
  assert(titleAr === 'مساعد الحركة واستكشاف الأماكن', 'getRouteTitle in Arabic returns "مساعد الحركة واستكشاف الأماكن"');

  const titleEn = getRouteTitle({ view: 'mobility' }, 'English');
  assert(titleEn === 'Mobility & Place Assistant', 'getRouteTitle in English returns "Mobility & Place Assistant"');

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. UNIFIED BLUE DESIGN SYSTEM & ZERO #00AEB8 COMPLIANCE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ 11. Unified Blue Design System & Zero #00AEB8 Compliance');
  const engineContent = readFileSync(resolve('src/lib/mobilityEngine.ts'), 'utf8');
  assert(!engineContent.includes('#00AEB8'), 'src/lib/mobilityEngine.ts contains ZERO legacy cyan #00AEB8');

  const viewContent = readFileSync(resolve('src/components/AccessibleMobilityWorkspaceView.tsx'), 'utf8');
  assert(!viewContent.includes('#00AEB8'), 'src/components/AccessibleMobilityWorkspaceView.tsx contains ZERO legacy cyan #00AEB8');
  assert(viewContent.includes('#1769AA'), 'AccessibleMobilityWorkspaceView uses Unified Blue #1769AA primary brand');
  assert(viewContent.includes('#0D4778'), 'AccessibleMobilityWorkspaceView uses Unified Blue #0D4778 navy dark');
  assert(viewContent.includes('#131E2E'), 'AccessibleMobilityWorkspaceView uses Unified Blue #131E2E surface');
  assert(viewContent.includes('#061A33'), 'AccessibleMobilityWorkspaceView uses Unified Blue #061A33 deep background');
  assert(viewContent.includes('role="region"'), 'AccessibleMobilityWorkspaceView provides semantic ARIA regions');
  assert(viewContent.includes('aria-live'), 'AccessibleMobilityWorkspaceView provides aria-live announcements');

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`   PHASE 10 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED    `);
  console.log('══════════════════════════════════════════════════════════════════\n');

  return { passed, failed };
}

// Allow direct CLI execution
if (process.argv[1]?.includes('phase10MobilityAssistanceVerification')) {
  runPhase10MobilityTests()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal Phase 10 test execution error:', err);
      process.exit(1);
    });
}
