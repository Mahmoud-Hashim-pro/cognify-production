/**
 * Cognify 2.0 Test Report Generator
 * 
 * Executes the test suite, parses/captures total tests, passed, failed, duration,
 * and environment, and outputs structured test-report.json in the project root.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export interface TestFailure {
  suite?: string;
  testName: string;
  message?: string;
}

export interface TestReport {
  timestamp: string;
  reportDate: string;
  status: 'PASSED' | 'FAILED';
  command: string;
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    osType: string;
    osRelease: string;
    osPlatform: string;
    cpuCount: number;
    cpuModel: string;
    totalMemoryMb: number;
    freeMemoryMb: number;
    cwd: string;
    nodeEnv: string;
  };
  totalTests: number;
  passed: number;
  failed: number;
  passRate: string;
  durationMs: number;
  durationSeconds: number;
  failures: TestFailure[];
  suitesSummary: {
    name: string;
    passed: number;
    failed: number;
  }[];
}

async function runTestSuite(testCmd: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}> {
  const startTime = Date.now();

  console.log(`============================================================`);
  console.log(`🧪 COGNIFY 2.0 AUTOMATED TEST REPORT GENERATOR`);
  console.log(`⚙️ Executing command: ${testCmd}`);
  console.log(`📁 Project Root: ${projectRoot}`);
  console.log(`============================================================\n`);

  return new Promise((resolve) => {
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const child = spawn(testCmd, [], {
      cwd: projectRoot,
      shell: true,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdoutBuffer += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderrBuffer += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      resolve({
        exitCode: code ?? 0,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        durationMs,
      });
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      stderrBuffer += `\nProcess error: ${err.message}\n`;
      resolve({
        exitCode: 1,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        durationMs,
      });
    });
  });
}

function parseTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  durationMs: number,
  command: string
): TestReport {
  const lines = stdout.split('\n');
  let passedCount = 0;
  let failedCount = 0;
  const failures: TestFailure[] = [];

  const suitesSummary: { name: string; passed: number; failed: number }[] = [];
  let currentSuite = 'General';
  let currentSuitePassed = 0;
  let currentSuiteFailed = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Detect suite headings
    const suiteMatch = line.match(/(?:Running Suite \d+:|RUNNING|--- Running|VERIFYING)\s*(.+?)(?:---|===|$)/i);
    if (suiteMatch) {
      if (currentSuitePassed > 0 || currentSuiteFailed > 0) {
        suitesSummary.push({
          name: currentSuite,
          passed: currentSuitePassed,
          failed: currentSuiteFailed,
        });
      }
      currentSuite = suiteMatch[1].trim();
      currentSuitePassed = 0;
      currentSuiteFailed = 0;
    }

    // Match assertion passes
    const passMatch = line.match(/^(?:\[PASS\]|[✅✓]\s*PASS:?)\s*(.*)/i);
    if (passMatch) {
      passedCount++;
      currentSuitePassed++;
      continue;
    }

    // Match assertion failures
    const failMatch = line.match(/^(?:\[FAIL\]|[❌✗]\s*FAIL:?)\s*(.*)/i);
    if (failMatch) {
      failedCount++;
      currentSuiteFailed++;
      failures.push({
        suite: currentSuite,
        testName: failMatch[1] || 'Unnamed failing test',
      });
      continue;
    }
  }

  // Push final suite
  if (currentSuitePassed > 0 || currentSuiteFailed > 0) {
    suitesSummary.push({
      name: currentSuite,
      passed: currentSuitePassed,
      failed: currentSuiteFailed,
    });
  }

  // If process exited with failure but no individual test failures were parsed, capture stderr as failure
  if (exitCode !== 0 && failedCount === 0) {
    failedCount = 1;
    failures.push({
      suite: currentSuite,
      testName: 'Process Execution Failure',
      message: stderr.trim() || `Process exited with code ${exitCode}`,
    });
  }

  const totalTests = passedCount + failedCount;
  const passRate = totalTests > 0 ? `${((passedCount / totalTests) * 100).toFixed(1)}%` : '0%';
  const durationSeconds = Number((durationMs / 1000).toFixed(2));

  return {
    timestamp: new Date().toISOString(),
    reportDate: new Date().toLocaleString(),
    status: exitCode === 0 && failedCount === 0 ? 'PASSED' : 'FAILED',
    command,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      osType: os.type(),
      osRelease: os.release(),
      osPlatform: os.platform(),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'unknown',
      totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
      cwd: projectRoot,
      nodeEnv: process.env.NODE_ENV || 'test',
    },
    totalTests,
    passed: passedCount,
    failed: failedCount,
    passRate,
    durationMs,
    durationSeconds,
    failures,
    suitesSummary,
  };
}

async function main() {
  const isWindows = process.platform === 'win32';
  const defaultCmd = isWindows ? 'npm.cmd test' : 'npm test';
  const testCmd = process.argv[2] || process.env.TEST_COMMAND || defaultCmd;

  const { exitCode, stdout, stderr, durationMs } = await runTestSuite(testCmd);
  const report = parseTestOutput(stdout, stderr, exitCode, durationMs, testCmd);

  const reportFilePath = path.resolve(projectRoot, 'test-report.json');
  fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n============================================================`);
  console.log(`📊 TEST SUITE REPORT GENERATED SUCCESSFULLY`);
  console.log(`============================================================`);
  console.log(`📄 Output File: ${reportFilePath}`);
  console.log(`🏁 Overall Status: ${report.status}`);
  console.log(`📈 Total Assertions: ${report.totalTests}`);
  console.log(`✅ Passed: ${report.passed}`);
  console.log(`❌ Failed: ${report.failed}`);
  console.log(`💯 Pass Rate: ${report.passRate}`);
  console.log(`⏱️ Duration: ${report.durationSeconds}s (${report.durationMs}ms)`);
  console.log(`💻 Environment: Node ${report.environment.nodeVersion} (${report.environment.osType} ${report.environment.arch})`);
  console.log(`============================================================\n`);

  if (report.status === 'FAILED') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error in generateTestReport:', err);
  process.exit(1);
});
