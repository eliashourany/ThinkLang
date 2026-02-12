# ThinkLang Error Catalog

ThinkLang produces two categories of errors: **runtime errors** (thrown during execution) and **static errors** (reported during type checking/parsing).

---

## Runtime Errors

All runtime errors extend `ThinkError`, which extends the built-in JavaScript `Error`. They can be caught in ThinkLang using `try`/`catch` blocks.

### ThinkError

Base class for all ThinkLang runtime errors. Not typically thrown directly.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | `"ThinkError"` |
| `message` | `string` | Error description |

---

### SchemaViolation

Thrown when the LLM output does not match the expected JSON Schema.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | `"SchemaViolation"` |
| `expected` | `string` | Description of the expected type |
| `got` | `unknown` | The actual value received from the LLM |

**Message format:** `Schema violation: expected <expected>, got <got>`

**Common causes:**
- The LLM returned a string when an object was expected
- A required field is missing from the output
- A field has the wrong type (e.g., string instead of number)

**ThinkLang catch syntax:**

```thinklang
try {
  let result = think<MyType>("prompt")
} catch SchemaViolation (e) {
  print "Schema mismatch"
}
```

---

### ConfidenceTooLow

Thrown when calling `.unwrap(threshold)` or `.expect(threshold)` on a `Confident<T>` value whose confidence falls below the specified threshold.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | `"ConfidenceTooLow"` |
| `threshold` | `number` | The required minimum confidence |
| `actual` | `number` | The actual confidence value |

**Message format:** `Confidence too low: expected >= <threshold>, got <actual>`

**Common causes:**
- Calling `.expect(0.9)` on a result with confidence 0.6
- Calling `.unwrap(0.5)` when the model is uncertain
- Ambiguous input that the model cannot classify with high confidence

**ThinkLang catch syntax:**

```thinklang
try {
  let value = result.expect(0.9)
} catch ConfidenceTooLow (e) {
  print "Model was not confident enough"
}
```

---

### GuardFailed

Thrown when a guard rule constraint is violated.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | `"GuardFailed"` |
| `guardName` | `string` | Name of the failed guard rule (e.g., `"length"`, `"contains_none"`) |
| `guardValue` | `unknown` | The actual value that failed validation |
| `constraint` | `string` | Description of the constraint (e.g., `"5..500"`) |

**Message format:** `Guard '<guardName>' failed: <constraint> (got <value>)`

**Common causes:**
- Output text is too short or too long for a `length` guard
- Output contains a forbidden term checked by `contains_none`
- A custom `passes` validator returned `false` or threw an error
- A numeric value fell outside a range guard

**ThinkLang catch syntax:**

```thinklang
try {
  let result = think<Translation>("Translate")
    with context: text
    guard { length: 10..500 }
} catch GuardFailed (e) {
  print "Guard validation failed"
}
```

**Mitigation:** Use `on_fail: retry(n)` to automatically retry when guards fail:

```thinklang
let result = think<Translation>("Translate")
  with context: text
  guard { length: 10..500 }
  on_fail: retry(3)
```

---

### TokenBudgetExceeded

Thrown when an operation exceeds the configured token budget.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | `"TokenBudgetExceeded"` |
| `budget` | `number` | The configured token budget |
| `required` | `number` | The number of tokens actually needed |

**Message format:** `Token budget exceeded: budget=<budget>, required=<required>`

**Common causes:**
- Very large context data exceeding the token limit
- Extremely detailed prompts combined with large schemas

---

### ModelUnavailable

Thrown when the specified model cannot be reached or is not available.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | `"ModelUnavailable"` |
| `model` | `string` | The model identifier that was requested |

**Message format:** `Model unavailable: <model>`

**Common causes:**
- Invalid model name in `THINKLANG_MODEL`
- Anthropic API outage
- Model deprecated or not yet available

---

### Timeout

Thrown when an operation exceeds its time limit.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | `"Timeout"` |
| `durationMs` | `number` | The duration in milliseconds before timeout |

**Message format:** `Operation timed out after <durationMs>ms`

**Common causes:**
- Slow network connection to the AI provider's API
- Very large prompts requiring long processing time

---

### AgentMaxTurnsError

Thrown when an agent reaches its maximum turn limit without producing a final answer.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | `"AgentMaxTurnsError"` |
| `maxTurns` | `number` | The configured maximum turns |
| `actualTurns` | `number` | The number of turns actually taken |

**Message format:** `Agent reached maximum turns limit: <actualTurns>/<maxTurns>`

**Common causes:**
- The task is too complex for the number of allowed turns
- Tools are not providing useful enough information for the agent to converge
- The `max turns` limit is too low for the task

**ThinkLang catch syntax:**

```thinklang
try {
  let result = agent<Report>("Research this topic")
    with tools: searchDocs
    max turns: 3
} catch AgentMaxTurnsError (e) {
  print "Agent could not finish in time"
}
```

**Mitigation:** Increase `max turns`, improve tool descriptions, or simplify the task.

---

### ToolExecutionError

Thrown when a tool throws an error during execution.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | `"ToolExecutionError"` |
| `toolName` | `string` | Name of the tool that failed |
| `cause` | `unknown` | The original error thrown by the tool |

**Message format:** `Tool "<toolName>" failed: <cause message>`

**Common causes:**
- A tool's `execute` function threw an error (network failure, invalid input, etc.)
- An external API called by the tool returned an error
- The tool received unexpected input from the LLM

**ThinkLang catch syntax:**

```thinklang
try {
  let result = agent<Report>("Research this topic")
    with tools: searchDocs
    max turns: 5
} catch ToolExecutionError (e) {
  print "A tool failed during execution"
}
```

---

## Error Hierarchy

```
Error
  └── ThinkError
        ├── SchemaViolation
        ├── ConfidenceTooLow
        ├── GuardFailed
        ├── TokenBudgetExceeded
        ├── ModelUnavailable
        ├── Timeout
        ├── AgentMaxTurnsError
        └── ToolExecutionError
```

---

## Parse Errors

Parse errors occur when the source code does not conform to the ThinkLang grammar. These are reported at compile time and prevent execution.

**Common parse error causes:**

| Cause | Example |
|-------|---------|
| Missing closing brace | `type Foo { name: string` |
| Invalid type expression | `let x: unknownPrimitive = ...` |
| Missing expression after `=` | `let x =` |
| Unterminated string | `let x = "hello` |
| Invalid guard syntax | `guard { length 5 }` (missing `:` and range) |
| Missing parentheses in think | `think<string> "prompt"` |

Parse errors include location information (line and column) when available.

---

## Type Check Errors

Type check errors are reported by the checker during compilation. They are instances of `CheckDiagnostic` and include a severity (`"error"` or `"warning"`) and optional source location.

### UncertainAccessError

**Severity:** error

Raised when code attempts to access a property on an `uncertain` variable without first unwrapping it.

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error description |
| `location` | `Location?` | Source location |

**Message format:** `Cannot access property on uncertain value '<name>'. Use .unwrap(), .expect(threshold), or .or(fallback) first.`

**Example of invalid code:**

```thinklang
let uncertain result = think<Category>("Classify")
  with context: text
// Error: cannot access .name on uncertain value
print result.name
```

**Fix:**

```thinklang
let uncertain result = think<Category>("Classify")
  with context: text
let safe = result.unwrap()
print safe.name
```

---

### TypeMismatchError

**Severity:** error

Raised when an expression's type does not match the expected type.

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error description |
| `location` | `Location?` | Source location |

**Message format:** `Type mismatch: expected <expected>, got <got>`

---

### UndefinedVariableError

**Severity:** error

Raised when code references a variable that has not been declared.

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error description |
| `location` | `Location?` | Source location |

**Message format:** `Undefined variable '<name>'`

**Example:**

```thinklang
// Error: 'data' is not defined
print data.field
```

---

### UndefinedTypeError

**Severity:** error

Raised when code references a type name that has not been declared.

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error description |
| `location` | `Location?` | Source location |

**Message format:** `Undefined type '<name>'`

**Example:**

```thinklang
// Error: type 'UnknownType' is not defined
let result = think<UnknownType>("prompt")
```

---

### NonExhaustiveMatchWarning

**Severity:** warning

Raised when a `match` expression may not cover all possible cases.

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Warning description |
| `location` | `Location?` | Source location |

**Message format:** `Match expression may not be exhaustive. Consider adding a wildcard (_) arm.`

**Example of code that triggers this warning:**

```thinklang
let response = match sentiment {
  { confidence: >= 0.9 } => "High"
  { confidence: >= 0.5 } => "Medium"
  // Warning: no wildcard arm for values below 0.5
}
```

**Fix:**

```thinklang
let response = match sentiment {
  { confidence: >= 0.9 } => "High"
  { confidence: >= 0.5 } => "Medium"
  _ => "Low"
}
```

---

## Error Summary Table

| Error | Category | Severity | Catchable at runtime |
|-------|----------|----------|---------------------|
| `SchemaViolation` | Runtime | Error | Yes |
| `ConfidenceTooLow` | Runtime | Error | Yes |
| `GuardFailed` | Runtime | Error | Yes |
| `TokenBudgetExceeded` | Runtime | Error | Yes |
| `ModelUnavailable` | Runtime | Error | Yes |
| `Timeout` | Runtime | Error | Yes |
| `AgentMaxTurnsError` | Runtime | Error | Yes |
| `ToolExecutionError` | Runtime | Error | Yes |
| Parse error | Compile-time | Error | No |
| `UncertainAccessError` | Type check | Error | No |
| `TypeMismatchError` | Type check | Error | No |
| `UndefinedVariableError` | Type check | Error | No |
| `UndefinedTypeError` | Type check | Error | No |
| `NonExhaustiveMatchWarning` | Type check | Warning | No |
