/**
 * Neurodiversity Engine, PECS, Visual Routine, and Meltdown Alert Verification Suite.
 */

import fs from 'fs';
import path from 'path';
import {
  loadPecsCards,
  savePecsCards,
  addCustomPecsCard,
  deletePecsCard,
  loadVisualSchedule,
  saveVisualSchedule,
  addScheduleItem,
  toggleScheduleItemDone,
  deleteScheduleItem,
  recordSensoryLog,
  getRecentSensoryLogs,
  dispatchMeltdownCaregiverAlert,
  analyzeSensoryPatterns,
  loadVisualComfortSettings,
  saveVisualComfortSettings,
  INITIAL_PECS_CARDS,
  INITIAL_SCHEDULE,
  VisualScheduleItem,
} from '../src/lib/neurodiversityEngine.js';
import { PECSCard, SensoryEmotionLog } from '../src/types.js';

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

export async function runNeurodiversityEngineVerification() {
  console.log('\n[24] Neurodiversity & Autism Engine Verification');

  // Test 1: PECS Cards initial state
  {
    const initial = await loadPecsCards('test-user-autism-1');
    assert(Array.isArray(initial) && initial.length >= 12, 'Default PECS cards loaded with at least 12 foundational cards');
    assert(initial.some((c) => c.category === 'food' && c.icon === '💧'), 'Water PECS card is present in food category');
    assert(initial.some((c) => c.category === 'feelings' && c.phraseAr.includes('صوت عالي')), 'Sensory overload PECS card is present');
  }

  // Test 2: Adding and Deleting Custom PECS Cards
  {
    const customCard: PECSCard = {
      id: 'pecs-custom-test-1',
      labelAr: 'عصير برتقال',
      labelEn: 'Orange Juice',
      phraseAr: 'أنا عايز عصير برتقال لو سمحت.',
      phraseEn: 'I want orange juice please.',
      category: 'food',
      icon: '🍊',
      color: 'bg-orange-500/20 text-orange-300',
    };

    const afterAdd = await addCustomPecsCard('test-user-autism-1', customCard);
    assert(afterAdd.some((c) => c.id === 'pecs-custom-test-1'), 'Custom PECS card added successfully to the deck');
    assert(afterAdd[0].id === 'pecs-custom-test-1', 'Custom PECS card appears at the front of the deck for quick access');

    const afterDelete = await deletePecsCard('test-user-autism-1', 'pecs-custom-test-1');
    assert(!afterDelete.some((c) => c.id === 'pecs-custom-test-1'), 'Custom PECS card deleted cleanly from the deck');
  }

  // Test 3: Visual Predictability Schedule Management
  {
    const schedule = await loadVisualSchedule('test-user-autism-1');
    assert(Array.isArray(schedule) && schedule.length >= 6, 'Default visual predictability schedule loaded with 6 routine milestones');

    const newTask: VisualScheduleItem = {
      id: 'sch-custom-therapy-1',
      time: '03:00 PM',
      titleAr: 'جلسة التكامل الحسي والتخاطب',
      titleEn: 'Speech & Sensory Integration Therapy',
      titleFr: 'Orthophonie et intégration sensorielle',
      icon: '🧠',
      done: false,
      category: 'therapy',
    };

    const withNewTask = await addScheduleItem('test-user-autism-1', newTask);
    assert(withNewTask.some((t) => t.id === 'sch-custom-therapy-1'), 'Therapy routine task added to visual schedule');

    const toggled = await toggleScheduleItemDone('test-user-autism-1', 'sch-custom-therapy-1');
    const item = toggled.find((t) => t.id === 'sch-custom-therapy-1');
    assert(item?.done === true, 'Visual schedule task marked as completed (done: true)');

    const untoggled = await toggleScheduleItemDone('test-user-autism-1', 'sch-custom-therapy-1');
    const item2 = untoggled.find((t) => t.id === 'sch-custom-therapy-1');
    assert(item2?.done === false, 'Visual schedule task toggled back to undone (done: false)');

    const afterDelete = await deleteScheduleItem('test-user-autism-1', 'sch-custom-therapy-1');
    assert(!afterDelete.some((t) => t.id === 'sch-custom-therapy-1'), 'Visual schedule item removed cleanly');
  }

  // Test 4: Sensory Regulation & Meltdown Logging
  {
    const calmLog = await recordSensoryLog(
      'test-user-autism-1',
      {
        level: 'calm',
        intensity: 1,
        sensoryTrigger: 'بيئة هادئة ومستقرة',
      },
      'سارة'
    );
    assert(calmLog.intensity === 1 && calmLog.level === 'calm', 'Calm sensory log created with intensity 1');
    assert(Boolean(calmLog.timestamp) && Boolean(calmLog.id), 'Sensory log assigned ISO timestamp and unique ID');

    const meltdownLog = await recordSensoryLog(
      'test-user-autism-1',
      {
        level: 'overwhelmed',
        intensity: 5,
        sensoryTrigger: 'إجهاد حسي مفرط وضوضاء عالية',
        comfortActivityUsed: 'فقاعة التنفس الهادئ',
      },
      'سارة'
    );
    assert(meltdownLog.intensity === 5 && meltdownLog.level === 'overwhelmed', 'Meltdown log recorded with maximum intensity 5');
    assert(meltdownLog.comfortActivityUsed === 'فقاعة التنفس الهادئ', 'Comfort intervention linked to sensory record');

    const recent = await getRecentSensoryLogs('test-user-autism-1', 10);
    assert(recent.length >= 2, 'Recent sensory logs retrieved for Caregiver Hub telemetry');
    assert(recent[0].intensity === 5, 'Most recent high-intensity meltdown log appears first in Caregiver feed');
  }

  // Test 5: Universal Dyslexia & Visual Comfort Persistence
  {
    const defaultComfort = loadVisualComfortSettings();
    assert(typeof defaultComfort.isDyslexiaFont === 'boolean', 'Visual comfort settings initialized with dyslexia font flag');

    saveVisualComfortSettings({
      isDyslexiaFont: true,
      showReadingRuler: true,
      tintColor: 'cream',
    });

    const updatedComfort = loadVisualComfortSettings();
    assert(updatedComfort.isDyslexiaFont === true, 'Dyslexia font preference persisted correctly');
    assert(updatedComfort.showReadingRuler === true, 'Reading ruler preference persisted correctly');
    assert(updatedComfort.tintColor === 'cream', 'Warm cream tint background persisted correctly');
  }

  // Test 6: Server-Side Meltdown Caregiver Alert Dispatch (Non-Interactive / Fail-Closed)
  {
    const result = await dispatchMeltdownCaregiverAlert('سارة', 'ضوضاء عالية في الفصل', 'test-user-autism-1');
    assert(typeof result.success === 'boolean', 'Server meltdown alert dispatch returns deterministic boolean result');
    assert(Boolean(result.message), 'Server meltdown alert dispatch includes human-readable response message');
    assert(
      result.success === true || result.fallbackDirectCall === true,
      'Server meltdown alert safely succeeds or gracefully engages fail-closed fallback without client popup'
    );
  }

  // Test 7: Clinical ABA & OT Sensory Pattern Analytics & Routine Correlation
  {
    const mockSchedule: VisualScheduleItem[] = [
      { id: 'sch-1', time: '08:00 AM', titleAr: 'الاستيقاظ والروتين الصباحي', titleEn: 'Morning Routine', titleFr: 'Matin', icon: '🪥', done: true },
      { id: 'sch-2', time: '10:00 AM', titleAr: 'جلسة التعلم والقراءة الممتعة', titleEn: 'Learning Session', titleFr: 'Étude', icon: '📚', done: false },
      { id: 'sch-3', time: '01:00 PM', titleAr: 'وجبة الغداء', titleEn: 'Lunch', titleFr: 'Déjeuner', icon: '🍲', done: false },
    ];

    const mockSensoryLogs: SensoryEmotionLog[] = [
      { id: 'l-1', timestamp: '2026-09-26T10:45:00.000Z', level: 'overwhelmed', intensity: 5, sensoryTrigger: 'ضوضاء محيطة مفرطة' },
      { id: 'l-2', timestamp: '2026-09-26T11:15:00.000Z', level: 'anxious', intensity: 4, sensoryTrigger: 'إجهاد بعد جلسة القراءة' },
      { id: 'l-3', timestamp: '2026-09-26T11:45:00.000Z', level: 'overwhelmed', intensity: 5, sensoryTrigger: 'ضوضاء محيطة مفرطة' },
      { id: 'l-4', timestamp: '2026-09-26T14:30:00.000Z', level: 'calm', intensity: 1, sensoryTrigger: 'بيئة هادئة' },
      { id: 'l-5', timestamp: '2026-09-26T18:00:00.000Z', level: 'happy', intensity: 2 },
    ];

    const analysis = analyzeSensoryPatterns(mockSensoryLogs, mockSchedule);

    assert(analysis.totalMeltdowns === 3, 'Calculates exact count of meltdowns/overloads (3 episodes >= 4)');
    assert(analysis.timeOfDayDistribution.morning === 3, 'Correctly groups morning episodes into 06:00 - 12:00 window');
    assert(analysis.topTriggers[0].trigger === 'ضوضاء محيطة مفرطة', 'Identifies top recurring sensory trigger');
    assert(analysis.topTriggers[0].count === 2, 'Computes correct frequency count for top trigger');
    assert(analysis.scheduleCorrelation !== null, 'Successfully correlates meltdown cluster with scheduled routine');
    assert(
      analysis.scheduleCorrelation?.correlatedTaskTitle === 'جلسة التعلم والقراءة الممتعة',
      'Correlates morning meltdowns with preceding 10:00 AM Learning Session'
    );
    assert(
      analysis.scheduleCorrelation?.clinicalRecommendation.includes('ABA'),
      'Generates actionable clinical ABA/OT sensory break recommendation'
    );
  }

  // Test 8: Anti-Regression Security Invariant (Zero-Client-Popup Meltdown Dispatch)
  {
    const engineFilePath = path.resolve(process.cwd(), 'src/lib/neurodiversityEngine.ts');
    assert(fs.existsSync(engineFilePath), 'neurodiversityEngine.ts source file exists on disk');
    const engineCode = fs.readFileSync(engineFilePath, 'utf-8');

    assert(
      !engineCode.includes('sendWhatsAppMessage('),
      'neurodiversityEngine does NOT call sendWhatsAppMessage (eliminates wa.me popup during acute meltdown)'
    );
    assert(
      !engineCode.includes('api.whatsapp.com') && !engineCode.includes('https://wa.me'),
      'neurodiversityEngine contains 0 references to external WhatsApp web links'
    );
    assert(
      engineCode.includes('dispatchServerEmergencySOS'),
      'Meltdown alerts flow directly through hardened server-side dispatchServerEmergencySOS'
    );
  }

  console.log(`\n  Neurodiversity Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}
