import fs from 'fs';
const src = fs.readFileSync('src/components/GlobalVoiceControls.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const checks: Array<[string, boolean]> = [
  ['hold-to-talk pointer handlers kept', /onPointerDown=\{handlePressStart\}/.test(src) && /onPointerUp=\{handlePressEnd\}/.test(src)],
  ['triple-tap SOS kept', /tapTimesRef\.current\.length >= 3/.test(src) && /triggerEmergencySOS\('button'\)/.test(src)],
  ['shake SOS kept', /addEventListener\('devicemotion'/.test(src)],
  ['keyboard / screen reader click toggles', /e\.detail !== 0/.test(src) && /onClick=\{handleClick\}/.test(src)],
  ['aria-pressed present', /aria-pressed=/.test(src)],
  ['aria-label mentions tap mode', /tap once to start/.test(src)],
  ['mic is in a fixed dock, not floating', /data-voice-dock/.test(src) && !/fixed bottom-4 end-4 z-\[70\]/.test(src)],
  ['dock mounted inside the layout column after main', /<\/main>\s*\{\/\* Global blind-first controls/.test(app)],
  ['minimum 56px target kept', /minWidth: 56, minHeight: 56/.test(src)],
];
let failed = 0;
for (const [n, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} voice dock: ${n}`); if (!ok) failed++; }
console.log(`Voice dock verification: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
