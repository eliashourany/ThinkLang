export class ThinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThinkError";
  }
}

export class SchemaViolation extends ThinkError {
  readonly expected: string;
  readonly got: unknown;

  constructor(expected: string, got: unknown) {
    super(`Schema violation: expected ${expected}, got ${JSON.stringify(got)}`);
    this.name = "SchemaViolation";
    this.expected = expected;
    this.got = got;
  }
}

export class ConfidenceTooLow extends ThinkError {
  readonly threshold: number;
  readonly actual: number;

  constructor(threshold: number, actual: number) {
    super(`Confidence too low: expected >= ${threshold}, got ${actual}`);
    this.name = "ConfidenceTooLow";
    this.threshold = threshold;
    this.actual = actual;
  }
}

export class GuardFailed extends ThinkError {
  readonly guardName: string;
  readonly guardValue: unknown;
  readonly constraint: string;

  constructor(guardName: string, value: unknown, constraint: string) {
    super(`Guard '${guardName}' failed: ${constraint} (got ${JSON.stringify(value)})`);
    this.name = "GuardFailed";
    this.guardName = guardName;
    this.guardValue = value;
    this.constraint = constraint;
  }
}

export class TokenBudgetExceeded extends ThinkError {
  readonly budget: number;
  readonly required: number;

  constructor(budget: number, required: number) {
    super(`Token budget exceeded: budget=${budget}, required=${required}`);
    this.name = "TokenBudgetExceeded";
    this.budget = budget;
    this.required = required;
  }
}

export class ModelUnavailable extends ThinkError {
  readonly model: string;

  constructor(model: string) {
    super(`Model unavailable: ${model}`);
    this.name = "ModelUnavailable";
    this.model = model;
  }
}

export class Timeout extends ThinkError {
  readonly durationMs: number;

  constructor(durationMs: number) {
    super(`Operation timed out after ${durationMs}ms`);
    this.name = "Timeout";
    this.durationMs = durationMs;
  }
}
