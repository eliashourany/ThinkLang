import { GuardFailed } from "./errors.js";

export interface GuardRule {
  name: string;
  constraint: unknown;
  rangeEnd?: unknown;
}

export interface GuardResult {
  passed: boolean;
  failures: GuardFailure[];
}

export interface GuardFailure {
  guardName: string;
  constraint: string;
  actualValue: unknown;
}

export function evaluateGuards(value: unknown, rules: GuardRule[]): GuardResult {
  const failures: GuardFailure[] = [];

  for (const rule of rules) {
    switch (rule.name) {
      case "length": {
        const str = typeof value === "string" ? value : JSON.stringify(value);
        const len = str.length;
        const min = typeof rule.constraint === "number" ? rule.constraint : 0;
        const max = typeof rule.rangeEnd === "number" ? rule.rangeEnd : Infinity;

        if (len < min || len > max) {
          failures.push({
            guardName: "length",
            constraint: `${min}..${max}`,
            actualValue: len,
          });
        }
        break;
      }

      case "contains_none": {
        const str = typeof value === "string" ? value : JSON.stringify(value);
        const forbidden = Array.isArray(rule.constraint) ? rule.constraint : [rule.constraint];

        for (const term of forbidden) {
          if (typeof term === "string" && str.includes(term)) {
            failures.push({
              guardName: "contains_none",
              constraint: `must not contain "${term}"`,
              actualValue: str,
            });
          }
        }
        break;
      }

      case "passes": {
        if (typeof rule.constraint === "function") {
          try {
            const result = rule.constraint(value);
            if (!result) {
              failures.push({
                guardName: "passes",
                constraint: "custom validator returned false",
                actualValue: value,
              });
            }
          } catch (err: any) {
            failures.push({
              guardName: "passes",
              constraint: `custom validator threw: ${err.message}`,
              actualValue: value,
            });
          }
        }
        break;
      }

      default: {
        // Treat as a generic comparison guard
        if (rule.rangeEnd !== undefined) {
          const numValue = typeof value === "number" ? value : Number(value);
          const min = Number(rule.constraint);
          const max = Number(rule.rangeEnd);
          if (isNaN(numValue) || numValue < min || numValue > max) {
            failures.push({
              guardName: rule.name,
              constraint: `${min}..${max}`,
              actualValue: numValue,
            });
          }
        }
        break;
      }
    }
  }

  if (failures.length > 0) {
    const first = failures[0];
    throw new GuardFailed(first.guardName, first.actualValue, first.constraint);
  }

  return { passed: true, failures: [] };
}
