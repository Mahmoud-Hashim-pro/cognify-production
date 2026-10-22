/**
 * Milestone 30: Cognify Comprehensive Accessibility & Screen-Reader Audit Verification
 * WCAG 2.2 AA Compliance, Accessible Names, Semantic Roles, Live Regions & ARIA States
 */

import fs from 'fs';
import path from 'path';
import { localize } from '../src/lib/translations.js';

export async function runAccessibilityAuditVerification(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  console.log('\n[61] Accessibility & Screen-Reader Verification (WCAG 2.2 AA)');

  const componentsDir = path.resolve(process.cwd(), 'src/components');

  function walk(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) results = results.concat(walk(fullPath));
      else if (file.endsWith('.tsx')) results.push(fullPath);
    });
    return results;
  }

  const allComponentFiles = walk(componentsDir);

  // 1. Icon-Only Buttons Accessible Name Audit
  {
    let trulyUnlabeledCount = 0;
    const unlabeledList: string[] = [];

    allComponentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const regex = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const attrs = match[1];
        const body = match[2];

        // Check if attributes contain aria-label or aria-labelledby
        const hasAria = /aria-label\s*=|aria-labelledby\s*=/i.test(attrs);
        if (hasAria) continue;

        // Remove all HTML/JSX tags from body
        const withoutTags = body.replace(/<[^>]+>/g, '').trim();

        // Check if what remains has actual words or strings
        const hasVisibleString = /[\u0600-\u06FFa-zA-Z0-9]/.test(withoutTags);

        if (!hasVisibleString) {
          trulyUnlabeledCount++;
          unlabeledList.push(`${path.basename(file)}: ${match[0].slice(0, 80)}`);
        }
      }
    });

    assert(
      trulyUnlabeledCount === 0,
      `Zero unlabeled icon-only buttons across all components in src/components (found ${trulyUnlabeledCount})`
    );
  }

  // 2. Dialog Semantics & ARIA Modal Attributes
  {
    const modalFiles = [
      'DocumentStudioModal.tsx',
      'AccessibilityPassportModal.tsx',
      'AccessibilityPreferencesModal.tsx',
      'ParentalConsentModal.tsx',
      'VisualComfortModal.tsx',
      'AdminPasswordResetModal.tsx',
      'AdminUserDetailModal.tsx',
    ];

    modalFiles.forEach(file => {
      const filePath = path.join(componentsDir, file);
      const exists = fs.existsSync(filePath) || fs.existsSync(path.join(componentsDir, 'admin', file));
      const targetPath = fs.existsSync(filePath) ? filePath : path.join(componentsDir, 'admin', file);
      assert(exists, `Modal component ${file} exists`);

      if (exists) {
        const content = fs.readFileSync(targetPath, 'utf8');
        assert(
          content.includes('role="dialog"') || content.includes("role='dialog'"),
          `${file} declares role="dialog"`
        );
        assert(
          content.includes('aria-modal="true"'),
          `${file} declares aria-modal="true"`
        );
        assert(
          content.includes('aria-labelledby='),
          `${file} binds aria-labelledby to dialog title`
        );
      }
    });
  }

  // 3. Tablist & Tab Navigation Semantics
  {
    const docStudioPath = path.join(componentsDir, 'DocumentStudioModal.tsx');
    assert(fs.existsSync(docStudioPath), 'DocumentStudioModal.tsx exists');
    const docContent = fs.readFileSync(docStudioPath, 'utf8');

    assert(
      docContent.includes('role="tablist"'),
      'DocumentStudioModal navigation declares role="tablist"'
    );
    assert(
      docContent.includes('role="tab"') && docContent.includes('aria-selected='),
      'DocumentStudioModal tab items expose role="tab" with aria-selected'
    );
    assert(
      docContent.includes('role="tabpanel"'),
      'DocumentStudioModal content areas expose role="tabpanel"'
    );
    assert(
      docContent.includes('aria-controls=') && docContent.includes('aria-labelledby='),
      'DocumentStudioModal binds tabs to tabpanels via aria-controls and aria-labelledby'
    );

    // Vision Companion memory type switcher tablist
    const visionPath = path.join(componentsDir, 'VisionCompanionView.tsx');
    assert(fs.existsSync(visionPath), 'VisionCompanionView.tsx exists');
    const visionContent = fs.readFileSync(visionPath, 'utf8');
    assert(
      visionContent.includes('role="tablist"') && visionContent.includes('role="tab"'),
      'VisionCompanionView memory item switcher declares role="tablist" and role="tab"'
    );
  }

  // 4. Toggle Controls & Semantic States (role="switch", aria-checked, aria-pressed)
  {
    const hearingPath = path.join(componentsDir, 'UnifiedHearingCenter.tsx');
    assert(fs.existsSync(hearingPath), 'UnifiedHearingCenter.tsx exists');
    const hearingContent = fs.readFileSync(hearingPath, 'utf8');

    assert(
      hearingContent.includes('aria-pressed={isAvatarPlaying}'),
      'UnifiedHearingCenter 3D avatar play/pause button exposes boolean aria-pressed'
    );
    assert(
      hearingContent.includes('aria-pressed={isCameraActive}'),
      'UnifiedHearingCenter camera sign recognition toggle exposes boolean aria-pressed'
    );
    assert(
      hearingContent.includes('aria-pressed={isQuestionVoiceActive}'),
      'UnifiedHearingCenter speech dictate button exposes boolean aria-pressed'
    );

    const visualComfortPath = path.join(componentsDir, 'VisualComfortModal.tsx');
    assert(fs.existsSync(visualComfortPath), 'VisualComfortModal.tsx exists');
    const comfortContent = fs.readFileSync(visualComfortPath, 'utf8');
    assert(
      comfortContent.includes('role="switch"') && comfortContent.includes('aria-checked={settings.isDyslexiaFont}'),
      'VisualComfortModal dyslexia font toggle exposes role="switch" and aria-checked'
    );
    assert(
      comfortContent.includes('aria-checked={settings.showReadingRuler}'),
      'VisualComfortModal reading ruler toggle exposes role="switch" and aria-checked'
    );
  }

  // 5. Radiogroups & Radio Options
  {
    const passportPath = path.join(componentsDir, 'AccessibilityPassportModal.tsx');
    assert(fs.existsSync(passportPath), 'AccessibilityPassportModal.tsx exists');
    const passportContent = fs.readFileSync(passportPath, 'utf8');

    assert(
      passportContent.includes('role="radiogroup"'),
      'AccessibilityPassportModal declares role="radiogroup"'
    );
    assert(
      passportContent.includes('role="radio"') && passportContent.includes('aria-checked='),
      'AccessibilityPassportModal options declare role="radio" with aria-checked'
    );

    const parentalPath = path.join(componentsDir, 'ParentalConsentModal.tsx');
    assert(fs.existsSync(parentalPath), 'ParentalConsentModal.tsx exists');
    const parentalContent = fs.readFileSync(parentalPath, 'utf8');
    assert(
      parentalContent.includes('role="radiogroup"') && parentalContent.includes('role="radio"'),
      'ParentalConsentModal legal relationship declares role="radiogroup" and role="radio"'
    );
  }

  // 6. Focus Ring Visible Indicators (WCAG 2.2 Criterion 2.4.7 / 2.4.11)
  {
    const sidebarPath = path.join(componentsDir, 'Sidebar.tsx');
    assert(fs.existsSync(sidebarPath), 'Sidebar.tsx exists');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

    assert(
      sidebarContent.includes('focus-visible:ring-2'),
      'Sidebar interactive buttons include focus-visible:ring-2 keyboard focus rings'
    );

    const hearingContent = fs.readFileSync(path.join(componentsDir, 'UnifiedHearingCenter.tsx'), 'utf8');
    assert(
      hearingContent.includes('focus-visible:ring-2'),
      'UnifiedHearingCenter includes focus-visible:ring-2 keyboard focus rings'
    );

    const docContent = fs.readFileSync(path.join(componentsDir, 'DocumentStudioModal.tsx'), 'utf8');
    assert(
      docContent.includes('focus-visible:ring-2'),
      'DocumentStudioModal interactive buttons include focus-visible:ring-2'
    );
  }

  // 7. Decorative Icons Hidden from Screen Readers (WCAG 1.1.1)
  {
    const hearingContent = fs.readFileSync(path.join(componentsDir, 'UnifiedHearingCenter.tsx'), 'utf8');
    assert(
      hearingContent.includes('aria-hidden="true"'),
      'UnifiedHearingCenter hides decorative icons with aria-hidden="true"'
    );

    const sidebarContent = fs.readFileSync(path.join(componentsDir, 'Sidebar.tsx'), 'utf8');
    assert(
      sidebarContent.includes('aria-hidden="true"'),
      'Sidebar hides decorative icons with aria-hidden="true"'
    );
  }

  // 8. Screen Reader Live Regions & Announcement Assertions
  {
    const visionContent = fs.readFileSync(path.join(componentsDir, 'VisionCompanionView.tsx'), 'utf8');
    assert(
      visionContent.includes('role="status"') && visionContent.includes('aria-live='),
      'VisionCompanionView includes live region (role="status" aria-live) for blind user announcements'
    );

    const chatContent = fs.readFileSync(path.join(componentsDir, 'ChatInterface.tsx'), 'utf8');
    assert(
      chatContent.includes('role="status"') || chatContent.includes('aria-live='),
      'ChatInterface includes live status regions for streaming and completion feedback'
    );
  }

  // 9. Multilingual Accessible Label Integrity (Arabic & English)
  {
    const enLabel = localize('English', 'Back to Hub', 'رجوع للرئيسية');
    assert(enLabel === 'Back to Hub', 'English accessible label renders correctly');

    const arLabel = localize('Arabic', 'Back to Hub', 'رجوع للرئيسية');
    assert(arLabel === 'رجوع للرئيسية', 'Arabic accessible label renders correctly');

    const egLabel = localize('Egyptian Ammiya', 'Back to Hub', 'رجوع للرئيسية');
    assert(egLabel === 'رجوع للرئيسية', 'Egyptian Ammiya accessible label renders correctly');
  }

  // 10. Motion Reduction & Font Scaling Accessibility Tokens
  {
    const passportContent = fs.readFileSync(path.join(componentsDir, 'AccessibilityPassportModal.tsx'), 'utf8');
    assert(
      passportContent.includes('cognify_font_scale'),
      'AccessibilityPassportModal persists font scale preference'
    );
    assert(
      passportContent.includes('cognify_reduce_motion'),
      'AccessibilityPassportModal persists reduce motion preference'
    );
  }

  return { passed, failed };
}
