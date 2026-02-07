import type { TestResult, TestSuiteResult } from "./types.js";

export function formatTestResult(result: TestResult): string {
  const status = result.passed ? "PASS" : "FAIL";
  const icon = result.passed ? "+" : "-";
  let line = `  ${icon} ${status}: ${result.description} (${result.durationMs}ms)`;
  if (result.error) {
    line += `\n      ${result.error}`;
  }
  return line;
}

export function formatSuiteResult(suite: TestSuiteResult): string {
  const lines: string[] = [];
  lines.push(`\n${suite.file}`);

  for (const test of suite.tests) {
    lines.push(formatTestResult(test));
  }

  lines.push(`\n  ${suite.totalPassed} passed, ${suite.totalFailed} failed (${suite.totalDurationMs}ms)`);
  if (suite.totalCostUsd > 0) {
    lines.push(`  Cost: $${suite.totalCostUsd.toFixed(6)}`);
  }

  return lines.join("\n");
}

export function formatSummary(suites: TestSuiteResult[]): string {
  const totalPassed = suites.reduce((sum, s) => sum + s.totalPassed, 0);
  const totalFailed = suites.reduce((sum, s) => sum + s.totalFailed, 0);
  const totalDuration = suites.reduce((sum, s) => sum + s.totalDurationMs, 0);
  const totalCost = suites.reduce((sum, s) => sum + s.totalCostUsd, 0);

  const lines: string[] = [];
  lines.push("\n--- Test Summary ---");
  lines.push(`Tests: ${totalPassed} passed, ${totalFailed} failed, ${totalPassed + totalFailed} total`);
  lines.push(`Time:  ${totalDuration}ms`);
  if (totalCost > 0) {
    lines.push(`Cost:  $${totalCost.toFixed(6)}`);
  }

  return lines.join("\n");
}
