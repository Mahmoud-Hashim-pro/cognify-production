// Fails when api/ would deploy more serverless functions than the Vercel Hobby
// plan allows (12). Files or folders starting with "_" are helpers, not functions.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT = 12;
const found = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|js|mjs|cjs)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) found.push(full);
  }
}

walk('api');

if (found.length > LIMIT) {
  console.error(`\nToo many serverless functions: ${found.length} in api/ (Vercel Hobby limit is ${LIMIT}).`);
  console.error('Merge routes into an existing function (see api/mobility.ts for the pattern) or move helpers into api/_lib.\n');
  for (const f of found.sort()) console.error('  ' + f);
  process.exit(1);
}
console.log(`Function count OK: ${found.length}/${LIMIT}`);
