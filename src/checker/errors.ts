import type { Location } from "../ast/nodes.js";

export interface CheckDiagnostic {
  message: string;
  location?: Location;
  severity: "error" | "warning";
}

export class UncertainAccessError implements CheckDiagnostic {
  severity = "error" as const;
  message: string;
  location?: Location;

  constructor(varName: string, location?: Location) {
    this.message = `Cannot access property on uncertain value '${varName}'. Use .unwrap(), .expect(threshold), or .or(fallback) first.`;
    this.location = location;
  }
}

export class TypeMismatchError implements CheckDiagnostic {
  severity = "error" as const;
  message: string;
  location?: Location;

  constructor(expected: string, got: string, location?: Location) {
    this.message = `Type mismatch: expected ${expected}, got ${got}`;
    this.location = location;
  }
}

export class UndefinedVariableError implements CheckDiagnostic {
  severity = "error" as const;
  message: string;
  location?: Location;

  constructor(name: string, location?: Location) {
    this.message = `Undefined variable '${name}'`;
    this.location = location;
  }
}

export class UndefinedTypeError implements CheckDiagnostic {
  severity = "error" as const;
  message: string;
  location?: Location;

  constructor(name: string, location?: Location) {
    this.message = `Undefined type '${name}'`;
    this.location = location;
  }
}

export class NonExhaustiveMatchWarning implements CheckDiagnostic {
  severity = "warning" as const;
  message: string;
  location?: Location;

  constructor(location?: Location) {
    this.message = `Match expression may not be exhaustive. Consider adding a wildcard (_) arm.`;
    this.location = location;
  }
}
