# Pattern Matching

ThinkLang's `match` expression lets you branch on the shape and values of data, which is especially useful for handling AI results with varying confidence levels or categories.

## Syntax

```thinklang
match subject {
  pattern => result
  pattern => result
  _ => default_result
}
```

## Object Patterns

Match on object fields with comparison operators:

```thinklang
let sentiment = think<Confident<Sentiment>>("Analyze sentiment") with context: review

let response = match sentiment {
  { confidence: >= 0.9 } => "High confidence result"
  { confidence: >= 0.5 } => "Moderate confidence result"
  _ => "Low confidence — manual review needed"
}

print response
```

Supported comparison operators: `>=`, `<=`, `==`, `!=`.

## Literal Patterns

Match against exact values:

```thinklang
let category = infer<string>(message, "Classify as info, warning, or error")

let icon = match category {
  "error" => "[ERROR]"
  "warning" => "[WARN]"
  "info" => "[INFO]"
  _ => "[?]"
}

print icon
```

## Multiple Field Patterns

Match on several fields at once:

```thinklang
type Analysis {
  risk: string
  score: float
}

let action = match analysis {
  { risk: "high", score: >= 0.8 } => "Immediate action required"
  { risk: "medium" } => "Monitor closely"
  { risk: "low" } => "No action needed"
  _ => "Unclassified"
}
```

All field conditions in a pattern must be satisfied for the arm to match.

## Wildcard

The `_` pattern matches anything. Place it last as a catch-all:

```thinklang
let result = match value {
  { status: "ok" } => "Success"
  _ => "Something else"
}
```

## Match is an Expression

`match` returns a value, so you can assign its result to a variable or use it inline:

```thinklang
let label = match score {
  { value: >= 90 } => "A"
  { value: >= 80 } => "B"
  { value: >= 70 } => "C"
  _ => "F"
}

print label
```

## Note for JS/TS Users

`match` is a language-level construct with no direct library equivalent. In JavaScript/TypeScript, use standard `if`/`else` or `switch` statements for the same branching logic:

```typescript
if (sentiment.confidence >= 0.9) {
  console.log("High confidence result");
} else if (sentiment.confidence >= 0.5) {
  console.log("Moderate confidence result");
} else {
  console.log("Low confidence — manual review needed");
}
```
