# Type System

ThinkLang has a structural type system designed for AI-generated data. Types define the shape that AI outputs must conform to.

## Primitive Types

| Type | Description | Example values |
|---|---|---|
| `string` | Text | `"hello"` |
| `int` | Integer | `42` |
| `float` | Floating-point number | `3.14` |
| `bool` | Boolean | `true`, `false` |
| `null` | Null value | `null` |

## Named Types

Define structured types with `type`:

```thinklang
type Person {
  name: string
  age: int
  email: string
}
```

Types compile to JSON schemas that guide the LLM's structured output. The AI is constrained to return data matching your type exactly.

### Field Annotations

Add metadata to fields with annotations. These guide the AI's output:

```thinklang
type Summary {
  @description("One-line headline for the article")
  headline: string
  @description("Key takeaways, maximum 5")
  @maxItems(10)
  keyPoints: string[]
  @description("Overall tone: positive, negative, or neutral")
  tone: string
}
```

## Arrays

Use `T[]` for arrays of any type:

```thinklang
type SearchResult {
  results: string[]
  scores: float[]
  people: Person[]
}
```

## Optional Types

Use `T?` for fields that may be absent:

```thinklang
type Person {
  name: string
  role: string
  company: string?
}
```

Optional fields are not required in the AI's response.

## Union Types

Use `A | B` for values that can be one of several types:

```thinklang
type Response {
  status: string
  data: string | int | null
}
```

## Confident\<T\>

Wrap any type in `Confident<T>` to request confidence metadata from the AI:

```thinklang
type Category {
  name: string
  subcategory: string
}

let result = think<Confident<Category>>("Classify this product")
  with context: item
```

The AI returns an object with `value` (your data), `confidence` (0 to 1), and `reasoning` (explanation). See [Confidence](./confidence.md) for details.

## Type Annotations on Variables

You can annotate variable types explicitly:

```thinklang
let name: string = "Alice"
let scores: float[] = [9.5, 8.2, 7.1]
```

In most cases, types are inferred from the expression on the right-hand side.

## How Types Map to AI Output

When you write `think<MyType>(...)`, ThinkLang:

1. Converts `MyType` to a JSON schema
2. Sends the schema to the LLM as a structured output constraint
3. The LLM returns data conforming to that schema
4. ThinkLang validates and returns the typed result

This means type definitions directly control what the AI produces. Be precise in your type names, field names, and annotations -- they all influence the quality of AI output.
