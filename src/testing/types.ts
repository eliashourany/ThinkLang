export interface TestResult {
  description: string;
  passed: boolean;
  error?: string;
  durationMs: number;
  costUsd?: number;
}

export interface TestSuiteResult {
  file: string;
  tests: TestResult[];
  totalPassed: number;
  totalFailed: number;
  totalDurationMs: number;
  totalCostUsd: number;
}
