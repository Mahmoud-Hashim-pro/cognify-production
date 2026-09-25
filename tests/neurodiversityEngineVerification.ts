/**
 * Neurodiversity Engine, PECS, Visual Routine, and Meltdown Alert Verification Suite.
 */

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
  loadVisualComfortSettings,
  saveVisualComfortSettings,
  INITIAL_PECS_CARDS,
  INITIAL_SCHEDULE,
  VisualScheduleItem,
} from '../src/lib/neurodiversityEngine.js';
import { PECSCard } from '../src/types.js';

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

  // Test 5: Dyslexia & Visual Comfort Persistence
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

  console.log(`\n  Neurodiversity Verification: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}
