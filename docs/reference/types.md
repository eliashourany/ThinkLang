# ThinkLang Type Reference

ThinkLang uses a structural type system that maps directly to JSON Schema for AI interactions. Types constrain the shape of data that the LLM must produce.

---

## Primitive Types

### `string`

Represents text values. Maps to JSON Schema `{ "type": "string" }`.

```thinklang
let name: string = "Alice"
let greeting = think<string>("Say hello")
```

### `int`

Represents whole numbers. Maps to JSON Schema `{ "type": "integer" }`.

```thinklang
let count: int = 42
```

### `float`

Represents decimal numbers. Maps to JSON Schema `{ "type": "number" }`.

```thinklang
let score: float = 0.95
```

### `bool`

Represents boolean values (`true` or `false`). Maps to JSON Schema `{ "type": "boolean" }`.

```thinklang
let active: bool = true
```

### `null`

Represents the null value. Maps to JSON Schema `{ "type": "null" }`.

```thinklang
let nothing: null = null
```

---

## Named Types (User-Defined)

Declared with the `type` keyword. Each named type becomes a JSON Schema object with required fields.

```thinklang
type Person {
  name: string
  age: int
  email: string?
}
```

Generated JSON Schema:

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer" },
    "email": {
      "anyOf": [
        { "type": "string" },
        { "type": "null" }
      ]
    }
  },
  "required": ["name", "age"],
  "additionalProperties": false
}
```

Named types may reference other named types:

```thinklang
type Address {
  street: string
  city: string
  country: string
}

type Person {
  name: string
  address: Address
}
```

---

## Array Types: `T[]`

Represents an ordered list of elements of type `T`. Maps to JSON Schema `{ "type": "array", "items": T }`.

```thinklang
type Report {
  tags: string[]
  scores: float[]
  people: Person[]
}
```

Array types can be combined with other type constructors:

```thinklang
// Array of optional strings
type Data {
  items: string?[]
}

// Optional array
type Data {
  items: string[]?
}
```

---

## Optional Types: `T?`

Indicates a value may be `T` or `null`. Optional fields are not included in the JSON Schema `required` array.

Maps to `{ "anyOf": [T, { "type": "null" }] }`.

```thinklang
type Contact {
  name: string
  phone: string?
  email: string?
}
```

In this example, `name` is required while `phone` and `email` may be `null`.

---

## Union Types: `T | U`

A value that may be one of several types. Maps to `{ "anyOf": [T, U, ...] }`.

```thinklang
type Result {
  status: string
  value: string | int | null
}
```

Parentheses may be used for grouping:

```thinklang
type Container {
  items: (string | int)[]
}
```

---

## `Confident<T>`

Wraps a value with a confidence score and reasoning. When used as a type argument to `think`, `infer`, or `reason`, the LLM must produce all three fields.

```thinklang
let result = think<Confident<Sentiment>>("Analyze sentiment")
  with context: review
```

Generated JSON Schema:

```json
{
  "type": "object",
  "properties": {
    "value": { /* schema for T */ },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "reasoning": { "type": "string" }
  },
  "required": ["value", "confidence", "reasoning"],
  "additionalProperties": false
}
```

The result is an instance of the `Confident<T>` class. See [runtime-api.md](runtime-api.md) for available methods.

`Confident<T>` works with any inner type:

```thinklang
// Confident with a primitive
let result = think<Confident<string>>("Translate this text")

// Confident with a named type
let result = think<Confident<Category>>("Classify this item")

// Confident with an array
let result = think<Confident<string[]>>("List the key topics")
```

---

## Type Annotations

Annotations appear before a field in a type declaration and influence the generated JSON Schema. They guide the LLM to produce values within the specified constraints.

### `@description(text)`

Adds a human-readable description to the field. Maps to the JSON Schema `description` keyword.

```thinklang
type Sentiment {
  @description("positive, negative, or neutral")
  label: string
  @description("Intensity from 1-10")
  intensity: int
}
```

### `@range(min..max)`

Sets numeric minimum and maximum bounds. The value is a string with `..` separating the bounds. Maps to JSON Schema `minimum` and `maximum`.

```thinklang
type Score {
  @range("0..100")
  value: int
  @range("0.0..1.0")
  confidence: float
}
```

### `@minLength(n)`

Sets the minimum string length. Maps to JSON Schema `minLength`.

```thinklang
type Post {
  @minLength(10)
  body: string
}
```

### `@maxLength(n)`

Sets the maximum string length. Maps to JSON Schema `maxLength`.

```thinklang
type Tweet {
  @maxLength(280)
  text: string
}
```

### `@minItems(n)`

Sets the minimum number of items in an array. Maps to JSON Schema `minItems`.

```thinklang
type Analysis {
  @minItems(1)
  keyPoints: string[]
}
```

### `@maxItems(n)`

Sets the maximum number of items in an array. Maps to JSON Schema `maxItems`.

```thinklang
type ExtractionResult {
  @maxItems(10)
  people: Person[]
}
```

### `@pattern(regex)`

Constrains a string to match a regular expression. Maps to JSON Schema `pattern`.

```thinklang
type Contact {
  @pattern("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
  email: string
}
```

### Combining Annotations

Multiple annotations can be applied to a single field:

```thinklang
type Summary {
  @description("A concise one-line headline")
  @maxLength(100)
  headline: string

  @description("Key takeaways from the text")
  @minItems(2)
  @maxItems(5)
  points: string[]
}
```

---

## Type Expression Summary

| Syntax | Category | JSON Schema |
|--------|----------|-------------|
| `string` | Primitive | `{ "type": "string" }` |
| `int` | Primitive | `{ "type": "integer" }` |
| `float` | Primitive | `{ "type": "number" }` |
| `bool` | Primitive | `{ "type": "boolean" }` |
| `null` | Primitive | `{ "type": "null" }` |
| `MyType` | Named | Object schema with fields from `type MyType { ... }` |
| `T[]` | Array | `{ "type": "array", "items": T }` |
| `T?` | Optional | `{ "anyOf": [T, { "type": "null" }] }` |
| `T \| U` | Union | `{ "anyOf": [T, U] }` |
| `Confident<T>` | Confident | Object with `value` (T), `confidence` (number), `reasoning` (string) |
