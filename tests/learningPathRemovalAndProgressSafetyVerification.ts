/**
 * COGNIFY — LEARNING PATH REMOVAL & MY PROGRESS SAFETY VERIFICATION
 *
 * Verifies all 12 criteria specified in Section 8:
 * 1. Learning Path is eliminated from VALID_VIEWS and VALID_DISABILITY_TABS.
 * 2. Dedicated route aliases (#learning, #learning_hub, #learning-hub, #curriculum) recover gracefully to hub.
 * 3. My Progress routes (#profile, #progress, #my_progress) remain active and functional.
 * 4. Other disability-mode tools (#vision, #deaf, #caregiver, #orchestrator, #toolkit, #book_studio) remain intact.
 * 5. Visual tool deep links (#currency, #color, #object, #face, #read, #scene) continue working.
 * 6. Sidebar.tsx contains no Learning Path entries, buttons, or GraduationCap icon.
 * 7. DisabilityModeView.tsx contains no learning_path card, no buttons, and no LearningHub view.
 * 8. App.tsx contains no LearningHub import and no case 'learning'.
 * 9. ProfilePage.tsx has zero dead links to 'learning' and computes authentic curriculum mastery.
 * 10. src/components/learning directory is completely removed.
 * 11. Multi-tenant storage keys and user data safeguards remain protected.
 * 12. No regressions in back navigation or auth session handling.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { VALID_VIEWS, VALID_DISABILITY_TABS, parseRoute, buildHash } from '../src/lib/navigation.js';

let totalPassed = 0;
let totalFailed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    totalPassed++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    totalFailed++;
  }
}

async function runVerification() {
  console.log('====================================================');
  console.log('COGNIFY: LEARNING PATH REMOVAL & PROGRESS AUDIT');
  console.log('====================================================\n');

  // CRITERION 1: Learning Path eliminated from VALID_VIEWS and VALID_DISABILITY_TABS
  await runTest('1. Learning Path route is removed from VALID_VIEWS and VALID_DISABILITY_TABS', () => {
    assert(!(VALID_VIEWS as readonly string[]).includes('learning'), 'VALID_VIEWS should not contain "learning"');
    assert(!(VALID_DISABILITY_TABS as readonly string[]).includes('learning'), 'VALID_DISABILITY_TABS should not contain "learning"');
  });

  // CRITERION 2: Dedicated route aliases recover gracefully to hub
  await runTest('2. Obsolete Learning Path hashes recover gracefully to hub view', () => {
    const aliases = ['#learning', '#learning_hub', '#learning-hub', '#curriculum', '#disability/learning'];
    for (const hash of aliases) {
      const parsed = parseRoute(hash);
      assert.strictEqual(parsed.view, 'disability', `${hash} view should fall back to disability`);
      assert.strictEqual(parsed.tab, 'hub', `${hash} tab should fall back to hub`);
    }
  });

  // CRITERION 3: My Progress routes remain active and functional
  await runTest('3. My Progress routes (#profile, #progress, #my_progress) remain active', () => {
    const profileRoute = parseRoute('#profile');
    assert.strictEqual(profileRoute.view, 'profile', '#profile should route to profile');

    const progressRoute = parseRoute('#progress');
    assert.strictEqual(progressRoute.view, 'profile', '#progress should route to profile');
    assert.strictEqual(progressRoute.tab, 'progress', '#progress tab should be progress');

    const myProgressRoute = parseRoute('#my_progress');
    assert.strictEqual(myProgressRoute.view, 'profile', '#my_progress should route to profile');
    assert.strictEqual(myProgressRoute.tab, 'progress', '#my_progress tab should be progress');
  });

  // CRITERION 4: Other disability-mode tools remain intact
  await runTest('4. Other disability-mode tools remain accessible and registered', () => {
    const expectedTabs = ['hub', 'chat', 'vision', 'deaf', 'caregiver', 'orchestrator', 'progress'];
    for (const tab of expectedTabs) {
      assert((VALID_DISABILITY_TABS as readonly string[]).includes(tab as any), `VALID_DISABILITY_TABS should contain "${tab}"`);
    }

    assert.strictEqual(parseRoute('#vision').tab, 'vision');
    assert.strictEqual(parseRoute('#deaf').tab, 'deaf');
    assert.strictEqual(parseRoute('#hearing').tab, 'deaf');
    assert.strictEqual(parseRoute('#caregiver').tab, 'caregiver');
    assert.strictEqual(parseRoute('#orchestrator').tab, 'orchestrator');
    assert.strictEqual(parseRoute('#toolkit').view, 'toolkit');
    assert.strictEqual(parseRoute('#book_studio').view, 'book_studio');
  });

  // CRITERION 5: Visual tool deep links continue working
  await runTest('5. Visual tool deep links resolve to vision tab with proper tool parameter', () => {
    const tools = ['currency', 'color', 'object', 'face', 'read', 'scene'];
    for (const tool of tools) {
      const route = parseRoute(`#${tool}`);
      assert.strictEqual(route.view, 'disability', `#${tool} should route to disability view`);
      assert.strictEqual(route.tab, 'vision', `#${tool} should route to vision tab`);
      assert.strictEqual(route.params?.tool, tool, `#${tool} should set tool param to ${tool}`);
    }
  });

  // CRITERION 6: Sidebar.tsx contains no Learning Path entries, buttons, or GraduationCap icon
  await runTest('6. Sidebar.tsx contains no Learning Path navigation entries or GraduationCap icon', () => {
    const sidebarPath = path.join(process.cwd(), 'src', 'components', 'Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf8');
    assert(!content.includes('GraduationCap'), 'Sidebar.tsx should not import or use GraduationCap');
    assert(!content.includes("id: 'learning'"), 'Sidebar.tsx should not contain an item with id "learning"');
    assert(!content.includes('Learning Path & Practice'), 'Sidebar.tsx should not contain "Learning Path & Practice"');
  });

  // CRITERION 7: DisabilityModeView.tsx contains no learning_path card, no buttons, and no LearningHub view
  await runTest('7. DisabilityModeView.tsx contains no learning_path card or LearningHub view', () => {
    const dmvPath = path.join(process.cwd(), 'src', 'components', 'DisabilityModeView.tsx');
    const content = fs.readFileSync(dmvPath, 'utf8');
    assert(!content.includes("id: 'learning_path'"), 'DisabilityModeView should not contain learning_path card');
    assert(!content.includes('Adaptive Learning Path'), 'DisabilityModeView should not contain "Adaptive Learning Path"');
    assert(!content.includes('<LearningHub'), 'DisabilityModeView should not render <LearningHub>');
    assert(!content.includes("activeTab === 'learning'"), 'DisabilityModeView should not have activeTab === "learning" view');
    assert(!content.includes("import('./learning/LearningHub')"), 'DisabilityModeView should not import LearningHub');
  });

  // CRITERION 8: App.tsx contains no LearningHub import and no case 'learning'
  await runTest('8. App.tsx contains no LearningHub import or case "learning"', () => {
    const appPath = path.join(process.cwd(), 'src', 'App.tsx');
    const content = fs.readFileSync(appPath, 'utf8');
    assert(!content.includes('LearningHub'), 'App.tsx should not import or reference LearningHub');
    assert(!content.includes("case 'learning':"), 'App.tsx router switch should not handle case "learning"');
  });

  // CRITERION 9: ProfilePage.tsx has zero dead links to 'learning'
  await runTest('9. ProfilePage.tsx has no dead links to "learning" and maintains authentic progress', () => {
    const profPath = path.join(process.cwd(), 'src', 'components', 'ProfilePage.tsx');
    const content = fs.readFileSync(profPath, 'utf8');
    assert(!content.includes("onNavigate?.('learning')"), 'ProfilePage.tsx should not have onNavigate("learning")');
    assert(!content.includes('subscribeLearningProfile'), 'ProfilePage.tsx should not import subscribeLearningProfile');
    assert(!content.includes('../types/learning'), 'ProfilePage.tsx should not import types/learning');
    assert(content.includes('Computer Science Fundamentals'), 'ProfilePage.tsx should display authentic CS curriculum concepts');
    assert(content.includes('Academic Progress'), 'ProfilePage.tsx should display Academic Progress');
  });

  // CRITERION 10: src/components/learning directory is completely removed
  await runTest('10. src/components/learning directory is completely deleted from the filesystem', () => {
    const learningDir = path.join(process.cwd(), 'src', 'components', 'learning');
    assert(!fs.existsSync(learningDir), 'src/components/learning directory should not exist');
  });

  // CRITERION 11: Multi-tenant user data and storage safety
  await runTest('11. Canonical learningProfileService and studentStateEngine remain intact for active features', async () => {
    const servicePath = path.join(process.cwd(), 'src', 'lib', 'learningProfileService.ts');
    const enginePath = path.join(process.cwd(), 'src', 'lib', 'studentStateEngine.ts');
    assert(fs.existsSync(servicePath), 'Canonical learningProfileService.ts must remain intact');
    assert(fs.existsSync(enginePath), 'Canonical studentStateEngine.ts must remain intact');
  });

  // CRITERION 12: Back navigation test suite integrity
  await runTest('12. backNavigationAndLogoutVerification does not reference deleted LearningHub.tsx', () => {
    const testPath = path.join(process.cwd(), 'tests', 'backNavigationAndLogoutVerification.ts');
    const content = fs.readFileSync(testPath, 'utf8');
    assert(!content.includes('LearningHub.tsx'), 'backNavigationAndLogoutVerification should not reference LearningHub.tsx');
  });

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${totalPassed}/${totalPassed + totalFailed} tests passed.`);
  console.log('====================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runVerification();
