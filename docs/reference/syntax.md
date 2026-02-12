# ThinkLang Syntax Reference

This document covers every syntax construct in the ThinkLang language.

---

## Program Structure

A ThinkLang program consists of optional import declarations followed by a sequence of statements. Files use the `.tl` extension.

```thinklang
// A minimal program
let greeting = think<string>("Say hello")
print greeting
```

Imports must appear before all statements:

```thinklang
import { Sentiment } from "./types.tl"
import { analyze } from "./helpers.tl"

let result = analyze("Great product!")
print result
```

---

## Imports

### `import` -- Import Declaration

Imports types and functions from another `.tl` file. All top-level `type` and `fn` declarations in the target file are importable -- no `export` keyword is needed.

```thinklang
import { Sentiment, Review } from "./types.tl"
import { analyzeSentiment } from "./helpers.tl"
```

| Part | Required | Description |
|------|----------|-------------|
| Names | Yes | Comma-separated identifiers in `{ }` |
| Path | Yes | Double- or single-quoted relative path |

Rules:
- Imports must appear before all statements
- The `.tl` extension is auto-appended if missing
- Paths are resolved relative to the importing file
- Circular imports are detected and produce an error
- Imported files are parsed but not executed -- only type and function declarations are extracted
- No transitive re-export: if A imports from B, and B imports from C, A does not get C's exports

---

## Statements

### `type` -- Type Declaration

Declares a named structured type with fields and optional annotations.

```thinklang
type Person {
  name: string
  age: int
  email: string?
}
```

Fields may carry annotations (see [Type Annotations](#type-annotations)).

```thinklang
type Product {
  @description("The product name")
  name: string
  @range("0..1000")
  price: float
  @maxItems(20)
  tags: string[]
}
```

### `fn` -- Function Declaration

Declares a named function with typed parameters and an optional return type.

```thinklang
fn greet(name: string): string {
  let msg = think<string>("Generate a greeting for this person")
    with context: name
  print msg
}
```

| Part | Required | Description |
|------|----------|-------------|
| Name | Yes | Function identifier |
| Parameters | Yes (may be empty) | Comma-separated `name: Type` pairs |
| Return type | No | `: Type` after the parameter list |
| Body | Yes | Block of statements in `{ }` |

### `let` -- Variable Declaration

Binds a value to a name. Optionally marks the binding as `uncertain`.

```thinklang
let x = 42
let name: string = "Alice"
let uncertain category = think<Category>("Classify this item")
```

| Modifier | Effect |
|----------|--------|
| *(none)* | Normal binding |
| `uncertain` | Wraps in `Confident<T>`; the checker enforces `.unwrap()`, `.expect()`, or `.or()` before property access |

An optional type annotation may follow the name:

```thinklang
let count: int = 10
```

### `print`

Prints an expression to standard output.

```thinklang
print "hello"
print result.label
```

### `try` / `catch`

Catches runtime errors by error type. One or more `catch` clauses are required.

```thinklang
try {
  let result = think<Summary>("Summarize this text")
    with context: text
  print result
} catch SchemaViolation (e) {
  print "Schema error occurred"
} catch ConfidenceTooLow (e) {
  print "Confidence too low"
}
```

Each `catch` clause specifies an error type name and a binding variable.

Catchable error types: `SchemaViolation`, `ConfidenceTooLow`, `GuardFailed`, `TokenBudgetExceeded`, `ModelUnavailable`, `Timeout`, `AgentMaxTurnsError`, `ToolExecutionError`.

### `if` / `else`

Conditional execution. The `else` branch is optional.

```thinklang
if score >= 0.8 {
  print "High confidence"
} else {
  print "Low confidence"
}
```

### `test`

Declares a test block (used with `thinklang test`).

```thinklang
test "classification produces a valid category" {
  let result = think<Category>("Classify as food or drink")
    with context: "orange juice"
  assert result.name == "drink"
}
```

An optional `mode` clause controls replay behavior:

```thinklang
test mode: snapshot("classification") "classification test" {
  let result = think<Category>("Classify")
    with context: "coffee"
  assert result.name == "drink"
}
```

### `assert`

Two forms:

| Form | Syntax | Description |
|------|--------|-------------|
| Value assert | `assert <expression>` | Fails if the expression is falsy |
| Semantic assert | `assert.semantic(<subject>, <criteria>)` | Uses the AI to judge whether the subject satisfies the criteria |

```thinklang
assert count > 0
assert.semantic(summary, "mentions key financial metrics")
```

### `tool` -- Tool Declaration

Declares a tool that an AI agent can call. Tools have typed parameters, a return type, a description annotation, and a body.

```thinklang
tool getWeather(city: string): string @description("Get current weather for a city") {
  let data = fetchWeatherAPI(city)
  return data
}
```

| Part | Required | Description |
|------|----------|-------------|
| Name | Yes | Tool identifier |
| Parameters | Yes (may be empty) | Comma-separated `name: Type` pairs |
| Return type | Yes | `: Type` after the parameter list |
| `@description` | No (recommended) | Annotation that helps the AI understand when to use the tool |
| Body | Yes | Block of statements in `{ }` |

Tools compile into `defineTool()` calls at runtime and are made available to `agent` expressions.

### Expression Statement

Any expression may appear as a standalone statement.

```thinklang
myFunction("arg")
```

---

## Type Expressions

| Syntax | Name | JSON Schema mapping |
|--------|------|---------------------|
| `string` | String | `{ "type": "string" }` |
| `int` | Integer | `{ "type": "integer" }` |
| `float` | Float | `{ "type": "number" }` |
| `bool` | Boolean | `{ "type": "boolean" }` |
| `null` | Null | `{ "type": "null" }` |
| `MyType` | Named type | Object schema from `type MyType { ... }` |
| `T[]` | Array | `{ "type": "array", "items": ... }` |
| `T?` | Optional | `{ "anyOf": [T, { "type": "null" }] }` |
| `T \| U` | Union | `{ "anyOf": [T, U] }` |
| `Confident<T>` | Confident wrapper | Object with `value`, `confidence`, `reasoning` |

Parentheses may be used for grouping: `(string | int)[]`.

See [types.md](types.md) for full details.

### Type Annotations

Annotations appear before a field in a type declaration.

| Annotation | Value type | Effect |
|------------|-----------|--------|
| `@description("...")` | string | Sets the JSON Schema `description` |
| `@range("min..max")` | string | Sets `minimum` and `maximum` |
| `@minLength(n)` | number | Sets `minLength` |
| `@maxLength(n)` | number | Sets `maxLength` |
| `@minItems(n)` | number | Sets `minItems` on arrays |
| `@maxItems(n)` | number | Sets `maxItems` on arrays |
| `@pattern("regex")` | string | Sets a regex `pattern` |

---

## Expressions

### `think<T>(prompt)`

The core AI expression. Sends a prompt to the LLM and returns a value conforming to type `T`.

```thinklang
let answer = think<string>("What is the capital of France?")

let result = think<Analysis>("Analyze this report")
  with context: report
  guard {
    length: 10..500
  }
  on_fail: retry(3)
```

Optional clauses (must appear in this order when present):

1. `with context: <expr>` -- provides context data
2. `without context: <expr>` -- excludes specific keys from context
3. `guard { ... }` -- validation rules
4. `on_fail: retry(n)` -- retry strategy

### `infer<T>(value, hint?)`

Lightweight inference. Transforms or classifies a value without a full prompt.

```thinklang
let lang = infer<string>("Bonjour le monde", "Detect the language")
let priority = infer<string>("server down!", "Classify priority")
```

The second argument (hint) is optional.

### `reason<T> { ... }`

Multi-step reasoning block. Guides the LLM through numbered steps toward a goal.

```thinklang
let analysis = reason<InvestmentAnalysis> {
  goal: "Analyze the portfolio and recommend changes"
  steps:
    1. "Evaluate current allocation"
    2. "Assess market conditions"
    3. "Identify risks and opportunities"
    4. "Formulate recommendation"
  with context: {
    portfolio,
    marketConditions,
  }
}
```

| Clause | Required | Description |
|--------|----------|-------------|
| `goal:` | Yes | A string describing the reasoning objective |
| `steps:` | Yes | Numbered steps (`N. "description"`) |
| `with context:` | No | Context data |
| `without context:` | No | Keys to exclude |
| `guard { ... }` | No | Guard rules |
| `on_fail:` | No | Retry/fallback strategy |

### `match`

Pattern matching on a value. Arms are evaluated top to bottom.

```thinklang
let response = match sentiment {
  { confidence: >= 0.9 } => "High confidence"
  { confidence: >= 0.5 } => "Moderate confidence"
  _ => "Low confidence"
}
```

#### Pattern Types

| Pattern | Syntax | Description |
|---------|--------|-------------|
| Object pattern | `{ field: constraint, ... }` | Matches object fields |
| Literal pattern | `"value"`, `42`, `true`, `null` | Exact value match |
| Wildcard | `_` | Matches anything (catch-all) |

#### Object Pattern Constraints

| Constraint | Example | Description |
|------------|---------|-------------|
| `>= value` | `{ score: >= 0.8 }` | Greater than or equal |
| `<= value` | `{ score: <= 0.5 }` | Less than or equal |
| `== value` | `{ label: == "positive" }` | Equality |
| `!= value` | `{ label: != "unknown" }` | Inequality |
| Literal | `{ label: "positive" }` | Literal equality |

### `agent<T>(prompt)`

Agentic loop expression. Sends a prompt to the LLM, which calls tools as needed until it produces a final answer conforming to type `T`.

```thinklang
let answer = agent<WeatherReport>("What is the weather in Tokyo?")
  with tools: getWeather
  max turns: 5
```

Full syntax with all optional clauses:

```thinklang
let plan = agent<TripPlan>("Plan a trip to Barcelona")
  with tools: getWeather, searchPlaces, getFlightPrice
  with context: userPreferences
  max turns: 8
  guard { length: 50..1000 }
  on_fail: retry(2)
```

| Clause | Required | Description |
|--------|----------|-------------|
| `with tools:` | Yes | Comma-separated list of tool names the agent can call |
| `with context:` | No | Context data |
| `without context:` | No | Keys to exclude |
| `max turns: N` | No | Maximum loop iterations (default: 10) |
| `guard { ... }` | No | Guard rules for the final output |
| `on_fail:` | No | Retry/fallback strategy |

### Pipeline `|>`

Chains expressions left to right.

```thinklang
let result = inputData
  |> think<Summary>("Summarize this")
  |> think<Translation>("Translate to French")
```

### Binary Operators

| Precedence | Operators | Description |
|------------|-----------|-------------|
| 1 (lowest) | `\|\|` | Logical OR |
| 2 | `&&` | Logical AND |
| 3 | `==`, `!=` | Equality |
| 4 | `>=`, `<=`, `>`, `<` | Comparison |
| 5 | `+`, `-` | Additive |
| 6 (highest) | `*`, `/` | Multiplicative |

### Unary Operators

| Operator | Description |
|----------|-------------|
| `!` | Logical NOT |
| `-` | Numeric negation |

### Range Expression

```thinklang
5..500
```

Used primarily inside guard clauses to express numeric ranges.

### Function Calls

```thinklang
myFunction(arg1, arg2)
result.method()
```

### Member Access

Dot notation to access object properties or call methods.

```thinklang
result.label
confident.unwrap()
obj.nested.field
```

### Literals

| Literal | Examples |
|---------|----------|
| String | `"hello"`, `'world'` |
| Number (int) | `42`, `0` |
| Number (float) | `3.14`, `0.5` |
| Boolean | `true`, `false` |
| Null | `null` |
| Array | `[1, 2, 3]`, `["a", "b"]` |
| Object | `{ key: "value", count: 42 }` |

String literals support escape sequences: `\\`, `\"`, `\'`, `\n`, `\t`.

---

## Context Clauses

### `with context:`

Provides data to the AI call. Accepts a single expression or a block of identifiers.

```thinklang
// Single variable
let result = think<T>("prompt")
  with context: myData

// Multiple variables
let result = think<T>("prompt")
  with context: {
    userData,
    settings,
    history,
  }

// Member expressions
let result = think<T>("prompt")
  with context: config.database
```

### `without context:`

Excludes specific keys from the context before sending to the AI. Useful for removing sensitive data.

```thinklang
let result = think<Recommendation>("Suggest products")
  with context: {
    profile,
    sensitiveData,
  }
  without context: sensitiveData
```

---

## Guards

Guard clauses validate AI output against constraints. If a guard fails, a `GuardFailed` error is thrown (or retried if `on_fail` is specified).

```thinklang
let result = think<Translation>("Translate to Spanish")
  with context: sourceText
  guard {
    length: 5..500
  }
  on_fail: retry(3)
```

### Built-in Guard Rules

| Guard | Syntax | Description |
|-------|--------|-------------|
| `length` | `length: min..max` | Validates string length is within range |
| `contains_none` | `contains_none: ["word1", "word2"]` | Ensures output does not contain forbidden terms |
| `passes` | `passes: validatorFn` | Custom validator function |
| *(generic)* | `name: min..max` | Generic numeric range check |

### `on_fail` Clause

Controls what happens when a guard fails.

```thinklang
on_fail: retry(3)
on_fail: retry(2) then fallback("default value")
```

| Option | Description |
|--------|-------------|
| `retry(n)` | Retry the AI call up to `n` times with exponential backoff |
| `then fallback(expr)` | After all retries are exhausted, return this fallback value |

---

## Comments

```thinklang
// Single-line comment

/* Multi-line
   comment */
```

---

## Identifiers and Reserved Words

Identifiers start with a letter or underscore, followed by letters, digits, or underscores: `[a-zA-Z_][a-zA-Z0-9_]*`.

### Reserved Words

The following words cannot be used as identifiers:

| | | | | |
|---|---|---|---|---|
| `type` | `fn` | `let` | `print` | `think` |
| `infer` | `reason` | `match` | `try` | `catch` |
| `if` | `else` | `true` | `false` | `null` |
| `Confident` | `string` | `int` | `float` | `bool` |
| `test` | `assert` | `import` | `from` | `tool` |
| `agent` | | | | |
