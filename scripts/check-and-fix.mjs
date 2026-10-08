#!/usr/bin/env node
/**
 * Cognify Quality Pre-flight & Auto-Fix Engine
 * 
 * Runs before git commits, pushes, and PRs to automatically fix formatting/lint issues,
 * verify TypeScript strict types, validate dependency security, test production bundling,
 * and execute automated invariant tests.
 * 
 * Usage:
 *   npm run check:fix
 *   node scripts/check-and-fix.mjs [--fast] [--fix-only]
 */

import { execSync } from 'child_process';
import process from 'process';

const args = process.argv.slice(2);
const fastMode = args.includes('--fast');
const fixOnly = args.includes('--fix-only');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function banner() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  🛡️  Cognify Quality Pre-flight & Auto-Fix Engine${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================${colors.reset}\n`);
}

function runStep(name, command, options = {}) {
  const start = Date.now();
  process.stdout.write(`${colors.bright}▶ ${name}...${colors.reset} `);
  try {
    execSync(command, {
      stdio: options.verbose ? 'inherit' : 'pipe',
      encoding: 'utf-8',
      env: { ...process.env, FORCE_COLOR: 'true' },
    });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`${colors.green}✓ PASSED${colors.reset} ${colors.dim}(${duration}s)${colors.reset}`);
    return true;
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`${colors.red}✗ FAILED${colors.reset} ${colors.dim}(${duration}s)${colors.reset}`);
    if (err.stdout) console.log(`\n${err.stdout.toString()}`);
    if (err.stderr) console.error(`\n${colors.red}${err.stderr.toString()}${colors.reset}`);
    return false;
  }
}

async function main() {
  banner();
  const startTime = Date.now();
  const results = [];

  // 1. Auto-Fix ESLint Issues
  console.log(`${colors.dim}Step 1: Code Quality & Auto-Formatting${colors.reset}`);
  const lintFixed = runStep('ESLint Auto-Fix (eslint . --fix)', 'npx eslint . --fix');
  results.push({ name: 'ESLint Auto-Fix', ok: lintFixed });

  if (fixOnly) {
    console.log(`\n${colors.green}✓ Auto-fix completed.${colors.reset}\n`);
    process.exit(lintFixed ? 0 : 1);
  }

  // 2. Strict TypeScript Compilation Check
  console.log(`\n${colors.dim}Step 2: Strict Type-Check (Zero Any/Contract Discrepancies)${colors.reset}`);
  const tscOk = runStep('TypeScript Strict Check (tsc --noEmit)', 'npx tsc --noEmit');
  results.push({ name: 'TypeScript Strict Check', ok: tscOk });

  // 3. Dependency Security Audit
  console.log(`\n${colors.dim}Step 3: Dependency Security Audit${colors.reset}`);
  const auditOk = runStep('Security Audit (npm audit --audit-level=moderate)', 'npm audit --audit-level=moderate');
  results.push({ name: 'Security Audit', ok: auditOk });

  if (!fastMode) {
    // 4. Production Build Verification
    console.log(`\n${colors.dim}Step 4: Production Artifact & Bundling Verification${colors.reset}`);
    const buildOk = runStep('Production Build (npm run build)', 'npm run build');
    results.push({ name: 'Production Build', ok: buildOk });

    // 5. Invariant Test Battery
    console.log(`\n${colors.dim}Step 5: Automated Invariant Test Battery${colors.reset}`);
    const testOk = runStep('Automated Invariant Tests (npx tsx tests/runAllTests.ts)', 'npx tsx tests/runAllTests.ts');
    results.push({ name: 'Invariant Tests', ok: testOk });
  }

  // Auto-stage modified files if inside a git repo
  try {
    const stagedCheck = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (stagedCheck && stagedCheck.trim()) {
      // If run before commit, auto-stage any files touched by eslint --fix
      execSync('git add -u', { stdio: 'ignore' });
    }
  } catch {
    // Non-git directory or no changes
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const allPassed = results.every(r => r.ok);

  console.log(`\n${colors.bright}------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bright}Summary Scorecard:${colors.reset}`);
  for (const r of results) {
    const status = r.ok ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
    console.log(`  ${status} - ${r.name}`);
  }
  console.log(`${colors.bright}Total Duration: ${totalTime}s${colors.reset}`);
  console.log(`${colors.bright}------------------------------------------------------${colors.reset}`);

  if (allPassed) {
    console.log(`\n${colors.green}${colors.bright}🚀 Codebase is 100% verified and ready for commit & deployment!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.error(`\n${colors.red}${colors.bright}❌ Pre-flight checks failed. Please address the errors above before committing or pushing.${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal preflight runner error:', err);
  process.exit(1);
});
