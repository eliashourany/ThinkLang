# Pipeline

The pipeline operator `|>` chains operations so that the output of one stage flows into the next. This is useful for building multi-step AI workflows.

## Syntax

```thinklang
expr |> expr |> expr
```

Each stage receives the result of the previous stage. The final stage's result is the value of the entire pipeline expression.

## Basic Example

```thinklang
type Keywords {
  words: string[]
}

type Report {
  summary: string
  themes: string[]
}

let text = "Machine learning is transforming healthcare through early disease detection."

let result = text
  |> think<Keywords>("Extract key terms") with context: text
  |> think<Report>("Write a brief report from these keywords")
```

## Multi-Step Processing

Pipelines are ideal for workflows where each step builds on the previous one:

```thinklang
type Entities {
  technologies: string[]
  applications: string[]
}

type Analysis {
  assessment: string
  opportunities: string[]
  risks: string[]
}

let report = "Quantum computing is advancing rapidly..."

let result = report
  |> think<Entities>("Extract technologies and applications") with context: report
  |> think<Analysis>("Analyze the technology landscape") with context: report
```

## When to Use Pipelines

Pipelines work best when:

- You have a clear sequence of transformations
- Each step produces data the next step needs
- You want to express a data flow concisely

For more complex workflows where steps need to reference multiple earlier results, use explicit `let` bindings with `with context` blocks instead:

```thinklang
let entities = think<Entities>("Extract entities") with context: report
let analysis = think<Analysis>("Analyze landscape")
  with context: {
    entities,
    report,
  }
```

Both approaches are valid. Pipelines are more concise; explicit bindings give you more control over context.
